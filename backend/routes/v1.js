// Public, versioned read API — the contract other products (e.g. Vieques Room
// Service) consume. Field names here are stable; don't rename without a version bump.
const express = require('express');
const db = require('../db/database');
const { getViequesNow, computeStatus, deriveIsOpen } = require('../utils/status');

const router = express.Router();

// Absolute base for photo URLs (uploads are served from the same host at /uploads).
const BASE = (process.env.FRONTEND_URL || 'https://abierto.app').replace(/\/+$/, '');
const absPhoto = (filename) => (filename ? `${BASE}/uploads/${filename}` : null);

// SQLite stores datetimes as 'YYYY-MM-DD HH:MM:SS' in UTC → ISO 8601 with Z.
const toIso = (dt) => (dt ? dt.replace(' ', 'T') + 'Z' : null);

function shape(b, hoursRows, timeStr, todayHoursForStatus) {
  const status = computeStatus(b.stored_status, b.return_time, todayHoursForStatus, timeStr, b.quick_override);
  return {
    id: b.id,
    name: b.name,
    name_es: b.name_es || null,
    category: b.category || null,
    status,
    is_open: deriveIsOpen(status),
    status_updated_at: toIso(b.status_updated_at),
    return_time: b.return_time || null,
    hours: (hoursRows || []).map(h => ({
      day: h.day_of_week,
      open: h.open_time || null,
      close: h.close_time || null,
      closed: !!h.is_closed,
    })),
    lat: b.lat != null ? Number(b.lat) : null,
    lon: b.lon != null ? Number(b.lon) : null,
    island: b.island || 'vieques',
    description: b.description || null,
    description_es: b.description_es || null,
    cover_photo: absPhoto(b.cover_photo),
  };
}

const SELECT = `
  SELECT b.id, b.name, b.name_es, b.description, b.description_es, b.category, b.lat, b.lon, b.island,
         s.status AS stored_status, s.return_time, s.updated_at AS status_updated_at, s.quick_override,
         (SELECT filename FROM business_photos WHERE business_id = b.id ORDER BY sort_order ASC LIMIT 1) AS cover_photo
  FROM businesses b
  LEFT JOIN business_status s ON s.business_id = b.id
`;

// Status changes intraday → short shared cache + let CDNs revalidate cheaply (ETag added by Express).
router.use((req, res, next) => {
  res.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
  next();
});

// GET /api/v1/businesses — all active businesses
router.get('/businesses', async (req, res) => {
  try {
    const { dayOfWeek, timeStr } = getViequesNow();
    const rows = await db.all(`${SELECT} WHERE b.is_active = 1 ORDER BY b.id ASC`);
    const allHours = await db.all(
      'SELECT business_id, day_of_week, open_time, close_time, is_closed FROM business_hours ORDER BY day_of_week ASC'
    );
    const hoursByBiz = {};
    const todayByBiz = {};
    for (const h of allHours) {
      (hoursByBiz[h.business_id] || (hoursByBiz[h.business_id] = [])).push(h);
      if (h.day_of_week === dayOfWeek) todayByBiz[h.business_id] = h;
    }
    res.json(rows.map(b => shape(b, hoursByBiz[b.id], timeStr, todayByBiz[b.id] || null)));
  } catch (err) {
    console.error('GET /api/v1/businesses error:', err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// GET /api/v1/businesses/:id — one business
router.get('/businesses/:id', async (req, res) => {
  try {
    const { dayOfWeek, timeStr } = getViequesNow();
    const b = await db.get(`${SELECT} WHERE b.id = ? AND b.is_active = 1`, [req.params.id]);
    if (!b) return res.status(404).json({ error: 'Business not found.' });
    const hoursRows = await db.all(
      'SELECT business_id, day_of_week, open_time, close_time, is_closed FROM business_hours WHERE business_id = ? ORDER BY day_of_week ASC',
      [req.params.id]
    );
    const todayHours = hoursRows.find(h => h.day_of_week === dayOfWeek) || null;
    res.json(shape(b, hoursRows, timeStr, todayHours));
  } catch (err) {
    console.error('GET /api/v1/businesses/:id error:', err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

module.exports = router;
