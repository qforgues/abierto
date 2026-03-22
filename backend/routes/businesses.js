const express = require('express');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

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

// GET /api/businesses — all active businesses with current status
router.get('/', async (req, res) => {
  try {
    const businesses = await db.all(`
      SELECT b.id, b.name, b.description, b.category, b.lat, b.lon, b.created_at,
             s.status, s.note, s.updated_at AS status_updated_at,
             (SELECT filename FROM business_photos WHERE business_id = b.id ORDER BY sort_order ASC LIMIT 1) AS cover_photo
      FROM businesses b
      LEFT JOIN business_status s ON s.business_id = b.id
      WHERE b.is_active = 1
      ORDER BY b.name ASC
    `);
    res.json(businesses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/businesses/admin/all — all businesses including inactive (admin only)
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const businesses = await db.all(`
      SELECT b.*, s.status, s.note, s.updated_at AS status_updated_at
      FROM businesses b
      LEFT JOIN business_status s ON s.business_id = b.id
      ORDER BY b.created_at DESC
    `);
    res.json(businesses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/businesses/:id — single business with photos
router.get('/:id', async (req, res) => {
  try {
    const business = await db.get(`
      SELECT b.id, b.name, b.description, b.category, b.lat, b.lon, b.phone, b.created_at,
             s.status, s.note, s.updated_at AS status_updated_at
      FROM businesses b
      LEFT JOIN business_status s ON s.business_id = b.id
      WHERE b.id = ? AND b.is_active = 1
    `, [req.params.id]);

    if (!business) return res.status(404).json({ error: 'Business not found.' });

    const photos = await db.all(
      'SELECT id, filename, sort_order FROM business_photos WHERE business_id = ? ORDER BY sort_order ASC',
      [req.params.id]
    );

    res.json({ ...business, photos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/businesses/register — public registration
router.post('/register', async (req, res) => {
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
    res.status(500).json({ error: 'Server error.' });
  }
});

// PATCH /api/businesses/:id — update business info (owner or admin)
router.patch('/:id', async (req, res) => {
  const { name, description, category, lat, lon, phone } = req.body;
  const { id } = req.params;

  // Auth check: must be owner of this business or admin
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized.' });

  try {
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../middleware/auth');
    const user = jwt.verify(authHeader.slice(7), JWT_SECRET);

    if (user.role !== 'admin' && user.businessId !== parseInt(id)) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

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
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token.' });
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/businesses/:id — soft delete (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await db.run('UPDATE businesses SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PATCH /api/businesses/:id/restore — re-activate (admin only)
router.patch('/:id/restore', requireAdmin, async (req, res) => {
  try {
    await db.run('UPDATE businesses SET is_active = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
