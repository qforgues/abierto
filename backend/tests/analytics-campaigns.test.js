/**
 * Campaign analytics integrity tests.
 *
 * The panel is only worth having if every number on it is defensible, so this covers both
 * failure directions:
 *   - synthetic pre-launch traffic must NOT be counted
 *   - real traffic must NOT be hidden  ← the bug that made a genuine acceptance-test scan
 *                                        invisible when exclusion was by whole date
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../middleware/auth');
const analyticsRouter = require('../routes/analytics');
const { SYNTHETIC_CUTOFF } = require('../config/appLinks');
const db = require('../db/database');

const app = express();
app.use(express.json());
app.use(require('cookie-parser')());
app.use('/api/analytics', analyticsRouter);

const adminToken = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
const getCampaigns = () =>
  request(app).get('/api/analytics/campaigns').set('Authorization', `Bearer ${adminToken}`);

// Timestamps either side of the cutoff, and today's date for the window filters.
const BEFORE = '2026-07-29 18:00:00';
const AFTER  = '2026-07-29 23:00:00';
const today  = new Date(Date.now() - 4 * 3600000).toISOString().slice(0, 10);

async function insert({ campaign, platform, destination, date, created_at, ip }) {
  await db.run(
    `INSERT INTO download_clicks (campaign, platform, destination, date, ip_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [campaign, platform, destination, date, ip, created_at]
  );
}

// File-scope setup: every describe below shares this fixture. Keep it out of an individual
// describe — its afterAll would tear the data down before later describes run.
beforeAll(async () => {
  {
    await db.run(`CREATE TABLE IF NOT EXISTS download_clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, campaign TEXT NOT NULL, platform TEXT NOT NULL,
      destination TEXT NOT NULL, date TEXT NOT NULL, ip_hash TEXT, referer TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')))`);
    await db.run('DELETE FROM download_clicks');

    // Pre-launch verification traffic — must never be reported.
    await insert({ campaign: 'ceiba-ferry', platform: 'android', destination: 'play',    date: today, created_at: BEFORE, ip: 'synth1' });
    await insert({ campaign: 'ceiba-ferry', platform: 'ios',     destination: 'ios_coming_soon', date: today, created_at: BEFORE, ip: 'synth1' });
    await insert({ campaign: 'social',      platform: 'desktop', destination: 'landing', date: today, created_at: BEFORE, ip: 'synth2' });

    // A real acceptance-test scan, same calendar day, after the cutoff — must be reported.
    await insert({ campaign: 'ceiba-ferry', platform: 'android', destination: 'play',    date: today, created_at: AFTER,  ip: 'realdev1' });
    // A genuine installed-app user.
    await insert({ campaign: 'ceiba-ferry', platform: 'twa',     destination: 'already_installed', date: today, created_at: AFTER, ip: 'realdev2' });
    // A bot.
    await insert({ campaign: 'social',      platform: 'bot',     destination: 'landing', date: today, created_at: AFTER,  ip: 'crawler' });
  }
});

afterAll(async () => {
  await db.run('DELETE FROM download_clicks');
  await db.close();
});

describe('campaign analytics integrity', () => {
  test('requires an admin session', async () => {
    expect((await request(app).get('/api/analytics/campaigns')).status).toBe(401);
  });

  test('a REAL scan on the same day as launch is still reported', async () => {
    // The regression: excluding the whole of 2026-07-29 hid this row.
    const { body } = await getCampaigns();
    expect(body.devices.android.scans).toBe(1);
    expect(body.totals.allTime).toBe(2);   // the android scan + the twa scan
    expect(body.totals.today).toBe(2);
  });

  test('pre-cutoff verification traffic is excluded', async () => {
    const { body } = await getCampaigns();
    expect(body.exclusions.rowsBeforeCutoff).toBe(3);
    expect(body.exclusions.syntheticCutoff).toBe(SYNTHETIC_CUTOFF);
    // Excluded, not deleted.
    const stored = await db.get('SELECT COUNT(*) AS c FROM download_clicks');
    expect(stored.c).toBe(6);
    expect(body.totals.storedRows).toBe(6);
  });

  test('bots are excluded from headline numbers but still counted', async () => {
    const { body } = await getCampaigns();
    expect(body.totals.bots).toBe(1);
    expect(body.byPlatform.find(p => p.platform === 'bot')).toBeUndefined();
  });

  test('"Already Had Abierto" is never counted as an Android acquisition', async () => {
    const { body } = await getCampaigns();
    expect(body.devices.alreadyHadApp.scans).toBe(1);
    expect(body.devices.android.scans).toBe(1);
    expect(body.googlePlayRedirects).toBe(1);   // only the real Android scan
  });

  test('every reported figure is a count of stored rows, never an estimate', async () => {
    const { body } = await getCampaigns();
    const sum = Object.values(body.devices).reduce((n, d) => n + d.scans, 0);
    expect(sum).toBe(body.totals.allTime);
    expect(body.byCampaign.reduce((n, c) => n + c.scans, 0)).toBe(body.totals.allTime);
  });

  test('unique devices counts distinct devices, not scans', async () => {
    const { body } = await getCampaigns();
    const ceiba = body.byCampaign.find(c => c.campaign === 'ceiba-ferry');
    expect(ceiba.scans).toBe(2);
    expect(ceiba.unique_devices).toBe(2);
  });

  test('the daily series excludes pre-cutoff rows', async () => {
    const { body } = await getCampaigns();
    const total = body.daily.reduce((n, d) => n + d.scans, 0);
    expect(total).toBe(2);
  });
});

describe('interactive range filtering', () => {
  test('defaults to 30 days', async () => {
    const { body } = await getCampaigns();
    expect(body.range.days).toBe(30);
    expect(body.range.label).toBe('Last 30 days');
  });

  test.each([[7], [30], [90], [365], [0]])('accepts ?days=%s', async (d) => {
    const res = await request(app).get(`/api/analytics/campaigns?days=${d}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.range.days).toBe(d);
  });

  test.each([['999'], ['-1'], ['abc'], ["1; DROP TABLE download_clicks"], ['']])(
    'falls back to the default for junk ?days=%s', async (bad) => {
      const res = await request(app).get(`/api/analytics/campaigns?days=${encodeURIComponent(bad)}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.range.days).toBe(30);
      // The table is still there — the value never reached the query.
      const stored = await db.get('SELECT COUNT(*) AS c FROM download_clicks');
      expect(stored.c).toBe(6);
    }
  );

  test('the four summary cards ignore the range, so they stay a stable reference', async () => {
    const a = (await request(app).get('/api/analytics/campaigns?days=7').set('Authorization', `Bearer ${adminToken}`)).body;
    const b = (await request(app).get('/api/analytics/campaigns?days=0').set('Authorization', `Bearer ${adminToken}`)).body;
    expect(a.totals).toEqual(b.totals);
  });

  test('each campaign carries its own device / destination / daily breakdown', async () => {
    const { body } = await getCampaigns();
    const ceiba = body.byCampaign.find(c => c.campaign === 'ceiba-ferry');
    expect(ceiba.devices.map(d => d.platform).sort()).toEqual(['android', 'twa']);
    expect(ceiba.destinations.map(d => d.destination).sort()).toEqual(['already_installed', 'play']);
    expect(ceiba.daily.reduce((n, d) => n + d.scans, 0)).toBe(2);
    expect(ceiba.usage).toMatch(/Ceiba ferry terminal/i);
  });

  test('per-campaign breakdowns sum to that campaign total', async () => {
    const { body } = await getCampaigns();
    for (const c of body.byCampaign) {
      expect(c.devices.reduce((n, d) => n + d.scans, 0)).toBe(c.scans);
      expect(c.destinations.reduce((n, d) => n + d.scans, 0)).toBe(c.scans);
    }
  });
});
