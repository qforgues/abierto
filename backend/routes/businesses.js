const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { requireAdmin, requireBusinessAccess } = require('../middleware/auth');
const { businessCreationRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Puerto Rico / Vieques is UTC-4 year-round (no DST)
function getViequesNow() {
  const now = new Date();
  const local = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const dayOfWeek = local.getUTCDay();
  const timeStr = `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`;
  return { dayOfWeek, timeStr };
}

// Compute what status to show publicly.
// todayHours: { open_time, close_time, is_closed } or null if no hours configured
function computeStatus(stored, returnTime, todayHours, timeStr) {
  // Permanent overrides — stay until owner changes them
  if (stored === 'Closed for the Season') return stored;
  if (stored === 'Open 24 Hours') return stored;

  // Out to Lunch auto-expires when return_time passes
  if (stored === 'Out to Lunch') {
    if (!returnTime || timeStr < returnTime) return 'Out to Lunch';
    // return time has passed — fall through to hours or manual
  }

  // No hours configured → honour manual Open/Closed
  if (!todayHours) return stored || 'Closed';

  // Hours configured for today but marked closed
  if (todayHours.is_closed) return 'Closed';

  // Hours incomplete — fall back to stored
  if (!todayHours.open_time || !todayHours.close_time) return stored || 'Closed';

  // Time-based (handle overnight ranges where close < open)
  const isOpen = todayHours.close_time <= todayHours.open_time
    ? (timeStr >= todayHours.open_time || timeStr < todayHours.close_time)  // overnight
    : (timeStr >= todayHours.open_time && timeStr < todayHours.close_time); // same day
  return isOpen ? 'Open' : 'Closed';
}

function generateCode() {
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const nums = String(Math.floor(Math.random() * 100)).padStart(2, '0');
  return letter + nums;
}

async function makeUniqueCode() {
  for (let i = 0; i < 50; i++) {
    const code = generateCode();
    const existing = await db.get('SELECT id FROM businesses WHERE code = ?', [code]);
    if (!existing) return code;
  }
  throw new Error('Could not generate unique code.');
}

// GET /api/businesses — all active businesses with computed status
router.get('/', async (req, res) => {
  try {
    const { dayOfWeek, timeStr } = getViequesNow();

    const businesses = await db.all(`
      SELECT b.id, b.name, b.description, b.category, b.lat, b.lon, b.created_at,
             s.status AS stored_status, s.note, s.return_time, s.return_date,
             s.updated_at AS status_updated_at,
             (SELECT filename FROM business_photos WHERE business_id = b.id ORDER BY sort_order ASC LIMIT 1) AS cover_photo
      FROM businesses b
      LEFT JOIN business_status s ON s.business_id = b.id
      WHERE b.is_active = 1
      ORDER BY b.name ASC
    `);

    // Fetch today's hours for all businesses in one query
    const todayHoursRows = await db.all(
      'SELECT business_id, open_time, close_time, is_closed FROM business_hours WHERE day_of_week = ?',
      [dayOfWeek]
    );
    const hoursMap = {};
    for (const row of todayHoursRows) hoursMap[row.business_id] = row;

    const result = businesses.map(b => {
      const { stored_status, ...rest } = b;
      return {
        ...rest,
        status: computeStatus(stored_status, b.return_time, hoursMap[b.id] || null, timeStr),
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// GET /api/businesses/admin/all — all businesses including inactive (admin only)
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const { dayOfWeek, timeStr } = getViequesNow();

    const businesses = await db.all(`
      SELECT b.*, s.status AS stored_status, s.note, s.return_time, s.return_date,
             s.updated_at AS status_updated_at
      FROM businesses b
      LEFT JOIN business_status s ON s.business_id = b.id
      ORDER BY b.created_at DESC
    `);

    const todayHoursRows = await db.all(
      'SELECT business_id, open_time, close_time, is_closed FROM business_hours WHERE day_of_week = ?',
      [dayOfWeek]
    );
    const hoursMap = {};
    for (const row of todayHoursRows) hoursMap[row.business_id] = row;

    const result = businesses.map(b => {
      const { stored_status, ...rest } = b;
      return {
        ...rest,
        status: computeStatus(stored_status, b.return_time, hoursMap[b.id] || null, timeStr),
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// GET /api/businesses/:id — single business with computed status
router.get('/:id', async (req, res) => {
  try {
    const business = await db.get(`
      SELECT b.id, b.name, b.description, b.category, b.lat, b.lon, b.phone, b.created_at,
             s.status AS stored_status, s.note, s.return_time, s.return_date,
             s.updated_at AS status_updated_at
      FROM businesses b
      LEFT JOIN business_status s ON s.business_id = b.id
      WHERE b.id = ? AND b.is_active = 1
    `, [req.params.id]);

    if (!business) return res.status(404).json({ error: 'Business not found.' });

    const hours = await db.all(
      'SELECT * FROM business_hours WHERE business_id = ? ORDER BY day_of_week ASC',
      [req.params.id]
    );

    const photos = await db.all(
      'SELECT id, filename, sort_order FROM business_photos WHERE business_id = ? ORDER BY sort_order ASC',
      [req.params.id]
    );

    const { dayOfWeek, timeStr } = getViequesNow();
    const todayHours = hours.find(h => h.day_of_week === dayOfWeek) || null;

    const { stored_status, ...rest } = business;
    res.json({
      ...rest,
      status: computeStatus(stored_status, business.return_time, todayHours, timeStr),
      has_hours: hours.length > 0,
      photos,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// POST /api/businesses/register — public registration
router.post('/register', businessCreationRateLimiter, async (req, res) => {
  const { name, description, category, lat, lon } = req.body;
  if (!name) return res.status(400).json({ error: 'Business name required.' });

  try {
    const code = await makeUniqueCode();

    const result = await db.run(
      `INSERT INTO businesses (name, description, category, lat, lon, code)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, description || null, category || null, lat || null, lon || null, code]
    );

    const businessId = result.lastID;

    await db.run(
      `INSERT INTO business_status (business_id, status) VALUES (?, 'Closed')`,
      [businessId]
    );

    await db.run(
      `INSERT INTO notifications (type, business_id, message) VALUES ('new_registration', ?, ?)`,
      [businessId, `New business registered: "${name}" (code: ${code})`]
    );

    const business = await db.get('SELECT * FROM businesses WHERE id = ?', [businessId]);
    res.status(201).json({ business, code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// PATCH /api/businesses/:id — update business info (owner or admin)
router.patch('/:id', async (req, res) => {
  const { name, description, category, lat, lon, phone } = req.body;
  const { id } = req.params;

  const user = requireBusinessAccess(req, res, id);
  if (!user) return;

  try {

    await db.run(
      `UPDATE businesses SET name = COALESCE(?, name), description = COALESCE(?, description),
       category = COALESCE(?, category), lat = COALESCE(?, lat), lon = COALESCE(?, lon),
       phone = COALESCE(?, phone)
       WHERE id = ?`,
      [name || null, description || null, category || null, lat || null, lon || null, phone || null, id]
    );

    const updated = await db.get('SELECT * FROM businesses WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// DELETE /api/businesses/:id — soft delete (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await db.run('UPDATE businesses SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// PATCH /api/businesses/:id/restore — re-activate (admin only)
router.patch('/:id/restore', requireAdmin, async (req, res) => {
  try {
    await db.run('UPDATE businesses SET is_active = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

module.exports = router;
