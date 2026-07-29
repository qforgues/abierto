const express = require('express');
const crypto = require('crypto');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');
const { CAMPAIGNS, CONTAMINATED_DATES } = require('../config/appLinks');

const router = express.Router();

function getViequesDate() {
  const now = new Date();
  const local = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

// POST /api/analytics/hit — public, lightweight page view tracker
router.post('/hit', async (req, res) => {
  res.json({ ok: true }); // respond immediately, don't block the client
  try {
    const { path } = req.body;
    if (!path || typeof path !== 'string') return;

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
    const salt = process.env.JWT_SECRET || 'abierto-analytics-salt';
    const ipHash = crypto.createHash('sha256').update(ip + salt).digest('hex').slice(0, 16);
    const date = getViequesDate();

    await db.run(
      `INSERT INTO page_views (path, ip_hash, date) VALUES (?, ?, ?)`,
      [path.slice(0, 200), ipHash, date]
    );
  } catch (_) {}
});

// GET /api/analytics/summary — admin only
router.get('/summary', requireAdmin, async (req, res) => {
  try {
    const today = getViequesDate();
    const d7  = new Date(Date.now() -  7 * 86400000).toISOString().slice(0, 10);
    const d14 = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
    const d30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const [
      todayRow, uniqueTodayRow,
      weekRow,  uniqueWeekRow,
      monthRow, uniqueMonthRow,
      allTimeRow,
      daily,
      topPages,
      homeRow,
    ] = await Promise.all([
      db.get(`SELECT COUNT(*) as c FROM page_views WHERE date = ?`, [today]),
      db.get(`SELECT COUNT(DISTINCT ip_hash) as c FROM page_views WHERE date = ?`, [today]),
      db.get(`SELECT COUNT(*) as c FROM page_views WHERE date >= ?`, [d7]),
      db.get(`SELECT COUNT(DISTINCT ip_hash) as c FROM page_views WHERE date >= ?`, [d7]),
      db.get(`SELECT COUNT(*) as c FROM page_views WHERE date >= ?`, [d30]),
      db.get(`SELECT COUNT(DISTINCT ip_hash) as c FROM page_views WHERE date >= ?`, [d30]),
      db.get(`SELECT COUNT(*) as c FROM page_views`, []),
      db.all(
        `SELECT date, COUNT(*) as visits, COUNT(DISTINCT ip_hash) as unique_visitors
         FROM page_views WHERE date >= ? GROUP BY date ORDER BY date ASC`, [d14]
      ),
      db.all(
        `SELECT path, COUNT(*) as visits FROM page_views
         WHERE path LIKE '/business/%' GROUP BY path ORDER BY visits DESC LIMIT 10`, []
      ),
      db.get(`SELECT COUNT(*) as c FROM page_views WHERE path = '/'`, []),
    ]);

    // Resolve business names for top pages
    const topWithNames = await Promise.all(
      topPages.map(async (p) => {
        const match = p.path.match(/^\/business\/(\d+)$/);
        if (!match) return { ...p, name: p.path };
        const biz = await db.get(`SELECT name FROM businesses WHERE id = ?`, [match[1]]);
        return { ...p, name: biz?.name || p.path };
      })
    );

    res.json({
      summary: {
        today:   { visits: todayRow?.c  || 0, unique: uniqueTodayRow?.c  || 0 },
        week:    { visits: weekRow?.c   || 0, unique: uniqueWeekRow?.c   || 0 },
        month:   { visits: monthRow?.c  || 0, unique: uniqueMonthRow?.c  || 0 },
        allTime: allTimeRow?.c || 0,
        homeVisits: homeRow?.c || 0,
      },
      daily,
      topPages: topWithNames,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// GET /api/analytics/campaigns — admin only
// Where /download traffic comes from, what device it was on, and where it went.
// Bot/link-preview hits are counted separately so headline numbers stay honest.
router.get('/campaigns', requireAdmin, async (req, res) => {
  try {
    const today = getViequesDate();
    const d7  = new Date(Date.now() -  7 * 86400000).toISOString().slice(0, 10);
    const d30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const d14 = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);

    // ── What counts as a reportable scan ──────────────────────────────────────
    // Excluded from every figure below:
    //   platform 'bot'  — link-preview fetchers and crawlers (still stored, see totals.bots)
    //   contaminated dates — days known to hold pre-launch verification traffic.
    // Rows are only ever FILTERED, never deleted: we cannot prove every row on a
    // contaminated date is synthetic, so we exclude by default and report it openly.
    // Automated pre-print checks (X-Abierto-Check) are never written in the first place.
    const dateExclusion = CONTAMINATED_DATES.length
      ? ` AND date NOT IN (${CONTAMINATED_DATES.map(() => '?').join(',')})`
      : '';
    const HUMAN = `platform != 'bot'${dateExclusion}`;
    // Every query below interpolates HUMAN, so each needs the excluded dates bound too.
    const X = CONTAMINATED_DATES;

    const [totals, byCampaign, byPlatform, byDestination, daily, excluded] = await Promise.all([
      // SUM(CASE …) rather than COUNT(*) FILTER — portable across every SQLite/libSQL
      // build we might ever run on. Each CASE repeats HUMAN, so the excluded dates are
      // bound once per occurrence, in the order the placeholders appear.
      db.get(
        `SELECT
           SUM(CASE WHEN ${HUMAN}                 THEN 1 ELSE 0 END) AS all_time,
           SUM(CASE WHEN ${HUMAN} AND date =  ?   THEN 1 ELSE 0 END) AS today,
           SUM(CASE WHEN ${HUMAN} AND date >= ?   THEN 1 ELSE 0 END) AS week,
           SUM(CASE WHEN ${HUMAN} AND date >= ?   THEN 1 ELSE 0 END) AS month,
           SUM(CASE WHEN platform = 'bot'         THEN 1 ELSE 0 END) AS bots,
           COUNT(*)                                                  AS stored_rows
         FROM download_clicks`,
        [...X, ...X, today, ...X, d7, ...X, d30]
      ),
      db.all(
        `SELECT campaign,
                COUNT(*)                        AS scans,
                COUNT(DISTINCT ip_hash)         AS unique_devices,
                MAX(created_at)                 AS last_seen
         FROM download_clicks WHERE ${HUMAN}
         GROUP BY campaign ORDER BY scans DESC`,
        [...X]
      ),
      db.all(
        `SELECT platform, COUNT(*) AS scans, COUNT(DISTINCT ip_hash) AS unique_devices
         FROM download_clicks
         WHERE ${HUMAN} GROUP BY platform ORDER BY scans DESC`,
        [...X]
      ),
      db.all(
        `SELECT destination, COUNT(*) AS scans FROM download_clicks
         WHERE ${HUMAN} GROUP BY destination ORDER BY scans DESC`,
        [...X]
      ),
      db.all(
        `SELECT date, COUNT(*) AS scans FROM download_clicks
         WHERE ${HUMAN} AND date >= ? GROUP BY date ORDER BY date ASC`,
        [...X, d14]
      ),
      // How many rows the exclusions are holding back, so the panel can say so out loud
      // rather than silently under-reporting.
      CONTAMINATED_DATES.length
        ? db.get(
            `SELECT COUNT(*) AS c FROM download_clicks
             WHERE date IN (${CONTAMINATED_DATES.map(() => '?').join(',')})`,
            [...X]
          )
        : Promise.resolve({ c: 0 }),
    ]);

    const uniqueOf = (p) => byPlatform.find(r => r.platform === p)?.unique_devices || 0;
    const scansOf  = (p) => byPlatform.find(r => r.platform === p)?.scans || 0;

    res.json({
      // Every number here is a real stored row. Nothing is seeded, estimated or projected.
      totals: {
        today:   totals?.today    || 0,
        week:    totals?.week     || 0,
        month:   totals?.month    || 0,
        allTime: totals?.all_time || 0,
        bots:    totals?.bots     || 0,
        storedRows: totals?.stored_rows || 0,
      },
      // Platform split, broken out explicitly so "Already Had Abierto" can never be
      // read as a new Android acquisition.
      devices: {
        android:        { scans: scansOf('android'), uniqueDevices: uniqueOf('android') },
        ios:            { scans: scansOf('ios'),     uniqueDevices: uniqueOf('ios') },
        desktop:        { scans: scansOf('desktop'), uniqueDevices: uniqueOf('desktop') },
        alreadyHadApp:  { scans: scansOf('twa'),     uniqueDevices: uniqueOf('twa') },
        other:          { scans: scansOf('other'),   uniqueDevices: uniqueOf('other') },
      },
      // Of the Android scans, how many actually got sent to the Play Store listing.
      googlePlayRedirects:
        (byDestination.find(r => r.destination === 'play')?.scans || 0) +
        (byDestination.find(r => r.destination === 'play_manual')?.scans || 0),
      byCampaign: byCampaign.map(r => ({
        ...r,
        label: CAMPAIGNS[r.campaign]?.label || r.campaign,
        registered: Object.hasOwn(CAMPAIGNS, r.campaign),
      })),
      byPlatform,
      byDestination,
      daily,
      // Disclosed, not hidden.
      exclusions: {
        contaminatedDates: CONTAMINATED_DATES,
        rowsExcludedByDate: excluded?.c || 0,
        botsExcluded: totals?.bots || 0,
        note: 'Verification traffic (X-Abierto-Check) is never recorded. Contaminated dates are filtered from reporting, never deleted.',
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

module.exports = router;
