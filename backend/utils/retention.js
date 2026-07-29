/**
 * retention.js — analytics data retention.
 *
 * page_views and download_clicks are append-only and would otherwise grow forever. Both
 * hold a salted IP hash, so this is a privacy boundary as much as a size one.
 *
 * Extracted from app.js so it can be tested directly — a bug here silently destroys
 * campaign history, which is exactly the kind of thing that must not be untested.
 */

const DEFAULT_RETENTION_DAYS = 400;   // ≈13 months
const MINIMUM_RETENTION_DAYS = 30;    // floor; anything lower is treated as a mistake

const ANALYTICS_TABLES = ['page_views', 'download_clicks'];

/**
 * Resolve the configured retention window.
 *
 * A typo like ANALYTICS_RETENTION_DAYS=1 (or =0, or "abc") must never mass-delete
 * campaign history, so anything unparseable or below the floor is REJECTED outright and
 * the prune is skipped entirely — we do not silently fall back to the default, because
 * that would hide a misconfiguration the operator needs to see.
 *
 * @returns {{ days: number, valid: boolean, reason?: string }}
 */
function resolveRetentionDays(raw) {
  if (raw === undefined || raw === null || raw === '') {
    return { days: DEFAULT_RETENTION_DAYS, valid: true };
  }
  const days = Number(raw);
  if (!Number.isFinite(days) || !Number.isInteger(days)) {
    return { days: 0, valid: false, reason: `"${raw}" is not a whole number` };
  }
  if (days < MINIMUM_RETENTION_DAYS) {
    return { days, valid: false, reason: `${days} is below the ${MINIMUM_RETENTION_DAYS}-day minimum` };
  }
  return { days, valid: true };
}

/** The date on/after which rows are kept, as YYYY-MM-DD. */
function cutoffDate(days, now = Date.now()) {
  return new Date(now - days * 86400000).toISOString().slice(0, 10);
}

/**
 * Delete analytics rows older than the retention window.
 * Never throws — a retention failure must not stop the server from booting.
 *
 * @returns {Promise<{ skipped: boolean, reason?: string, days?: number, cutoff?: string,
 *                     pruned?: Record<string, number> }>}
 */
async function pruneAnalytics(db, { env = process.env, now = Date.now(), logger = console } = {}) {
  const { days, valid, reason } = resolveRetentionDays(env.ANALYTICS_RETENTION_DAYS);

  if (!valid) {
    logger.warn?.(
      `Retention: REFUSING to prune — ANALYTICS_RETENTION_DAYS ${reason}. ` +
      `Fix it or unset it (default ${DEFAULT_RETENTION_DAYS} days). No rows were deleted.`
    );
    return { skipped: true, reason };
  }

  const cutoff = cutoffDate(days, now);
  const pruned = {};

  for (const table of ANALYTICS_TABLES) {
    try {
      const r = await db.run(`DELETE FROM ${table} WHERE date < ?`, [cutoff]);
      pruned[table] = r?.changes || 0;
      if (pruned[table] > 0) {
        logger.log?.(`Retention: pruned ${pruned[table]} ${table} row(s) older than ${cutoff}.`);
      }
    } catch (e) {
      // Table may not exist yet on a brand-new database — not an error worth failing on.
      pruned[table] = 0;
    }
  }

  return { skipped: false, days, cutoff, pruned };
}

module.exports = {
  DEFAULT_RETENTION_DAYS,
  MINIMUM_RETENTION_DAYS,
  ANALYTICS_TABLES,
  resolveRetentionDays,
  cutoffDate,
  pruneAnalytics,
};
