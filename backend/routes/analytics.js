const express = require('express');
const crypto = require('crypto');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

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
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
