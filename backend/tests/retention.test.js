/**
 * Analytics retention tests.
 *
 * A bug here silently destroys campaign history, so the guard rails get tested harder
 * than the happy path. Uses a fake db so nothing real is ever deleted.
 */

const {
  DEFAULT_RETENTION_DAYS,
  MINIMUM_RETENTION_DAYS,
  resolveRetentionDays,
  cutoffDate,
  pruneAnalytics,
} = require('../utils/retention');

/** Records every DELETE instead of running one. */
function fakeDb(changesPerTable = {}) {
  const calls = [];
  return {
    calls,
    run: async (sql, params) => {
      calls.push({ sql, params });
      const table = sql.match(/DELETE FROM (\w+)/)?.[1];
      return { changes: changesPerTable[table] ?? 0 };
    },
  };
}

const silent = { warn: () => {}, log: () => {} };

describe('resolveRetentionDays', () => {
  test('defaults to 400 days when unset', () => {
    expect(DEFAULT_RETENTION_DAYS).toBe(400);
    expect(resolveRetentionDays(undefined)).toEqual({ days: 400, valid: true });
    expect(resolveRetentionDays('')).toEqual({ days: 400, valid: true });
    expect(resolveRetentionDays(null)).toEqual({ days: 400, valid: true });
  });

  test('accepts a valid override', () => {
    expect(resolveRetentionDays('90')).toEqual({ days: 90, valid: true });
    expect(resolveRetentionDays('30')).toEqual({ days: 30, valid: true });
  });

  test.each([['1'], ['0'], ['-5'], ['29']])('rejects %s as below the minimum', (v) => {
    const out = resolveRetentionDays(v);
    expect(out.valid).toBe(false);
    expect(out.reason).toMatch(/minimum/);
  });

  test.each([['abc'], ['30days'], ['1.5'], ['Infinity'], ['NaN']])('rejects non-integer %s', (v) => {
    expect(resolveRetentionDays(v).valid).toBe(false);
  });

  test('the minimum is 30 days', () => {
    expect(MINIMUM_RETENTION_DAYS).toBe(30);
  });
});

describe('cutoffDate', () => {
  test('is retention days before now, as YYYY-MM-DD', () => {
    const now = Date.parse('2026-07-29T12:00:00Z');
    expect(cutoffDate(400, now)).toBe('2025-06-24');
    expect(cutoffDate(30, now)).toBe('2026-06-29');
  });
});

describe('pruneAnalytics', () => {
  test('prunes both analytics tables at the default window', async () => {
    const db = fakeDb({ page_views: 3, download_clicks: 7 });
    const result = await pruneAnalytics(db, { env: {}, now: Date.parse('2026-07-29T12:00:00Z'), logger: silent });

    expect(result.skipped).toBe(false);
    expect(result.days).toBe(400);
    expect(result.cutoff).toBe('2025-06-24');
    expect(result.pruned).toEqual({ page_views: 3, download_clicks: 7 });
    expect(db.calls.map(c => c.sql.match(/DELETE FROM (\w+)/)[1])).toEqual([
      'page_views', 'download_clicks',
    ]);
    // Only rows strictly older than the cutoff.
    db.calls.forEach(c => {
      expect(c.sql).toMatch(/WHERE date < \?/);
      expect(c.params).toEqual(['2025-06-24']);
    });
  });

  test('honours ANALYTICS_RETENTION_DAYS', async () => {
    const db = fakeDb();
    const result = await pruneAnalytics(db, {
      env: { ANALYTICS_RETENTION_DAYS: '60' },
      now: Date.parse('2026-07-29T12:00:00Z'),
      logger: silent,
    });
    expect(result.days).toBe(60);
    expect(result.cutoff).toBe('2026-05-30');
  });

  test.each([['1'], ['0'], ['-1'], ['abc'], ['29']])(
    'DELETES NOTHING when misconfigured as %s',
    async (bad) => {
      const db = fakeDb({ page_views: 9999, download_clicks: 9999 });
      const warns = [];
      const result = await pruneAnalytics(db, {
        env: { ANALYTICS_RETENTION_DAYS: bad },
        logger: { warn: m => warns.push(m), log: () => {} },
      });

      expect(result.skipped).toBe(true);
      expect(db.calls).toHaveLength(0);          // ← the whole point: no DELETE ran at all
      expect(warns.join(' ')).toMatch(/REFUSING to prune/);
    }
  );

  test('a typo cannot purge campaign history', async () => {
    // The realistic accident: someone means 400 and types 4.
    const db = fakeDb({ download_clicks: 50000 });
    const result = await pruneAnalytics(db, {
      env: { ANALYTICS_RETENTION_DAYS: '4' }, logger: silent,
    });
    expect(result.skipped).toBe(true);
    expect(db.calls).toHaveLength(0);
  });

  test('survives a table that does not exist yet', async () => {
    const db = { run: async () => { throw new Error('no such table: download_clicks'); } };
    await expect(pruneAnalytics(db, { env: {}, logger: silent })).resolves.toMatchObject({
      skipped: false,
      pruned: { page_views: 0, download_clicks: 0 },
    });
  });
});
