const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

const DAYS = 7;

function authCheck(req, res, businessId) {
  const header = req.headers.authorization;
  if (!header) return null;
  try {
    const user = jwt.verify(header.slice(7), JWT_SECRET);
    if (user.role !== 'admin' && user.businessId !== parseInt(businessId)) return null;
    return user;
  } catch { return null; }
}

// GET /api/businesses/:id/hours
router.get('/', async (req, res) => {
  try {
    const hours = await db.all(
      'SELECT * FROM business_hours WHERE business_id = ? ORDER BY day_of_week ASC',
      [req.params.id]
    );
    res.json(hours);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/businesses/:id/hours
// Body: array of { day_of_week (0-6), open_time, close_time, is_closed }
router.put('/', async (req, res) => {
  const user = authCheck(req, res, req.params.id);
  if (!user) return res.status(401).json({ error: 'Unauthorized.' });

  const { hours } = req.body;
  if (!Array.isArray(hours) || hours.length !== DAYS) {
    return res.status(400).json({ error: 'Must provide exactly 7 days.' });
  }

  try {
    for (const day of hours) {
      await db.run(
        `INSERT INTO business_hours (business_id, day_of_week, open_time, close_time, is_closed)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(business_id, day_of_week) DO UPDATE SET
           open_time = excluded.open_time,
           close_time = excluded.close_time,
           is_closed = excluded.is_closed`,
        [req.params.id, day.day_of_week, day.open_time || null, day.close_time || null, day.is_closed ? 1 : 0]
      );
    }
    const updated = await db.all(
      'SELECT * FROM business_hours WHERE business_id = ? ORDER BY day_of_week ASC',
      [req.params.id]
    );
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
