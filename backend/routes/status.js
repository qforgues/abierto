const express = require('express');
const db = require('../db/database');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

const VALID_STATUSES = ['Open', 'Closed', 'Opening Late', 'Back Soon', 'Sold Out'];

// GET /api/businesses/:id/status
router.get('/', async (req, res) => {
  try {
    const status = await db.get(
      'SELECT * FROM business_status WHERE business_id = ?',
      [req.params.id]
    );
    if (!status) return res.status(404).json({ error: 'Status not found.' });
    res.json(status);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/businesses/:id/status
router.put('/', async (req, res) => {
  const { status, note } = req.body;
  const businessId = parseInt(req.params.id);

  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized.' });

  try {
    const user = jwt.verify(authHeader.slice(7), JWT_SECRET);
    if (user.role !== 'admin' && user.businessId !== businessId) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    await db.run(
      `UPDATE business_status SET status = ?, note = ?, updated_at = datetime('now')
       WHERE business_id = ?`,
      [status, note || null, businessId]
    );

    const updated = await db.get(
      'SELECT * FROM business_status WHERE business_id = ?',
      [businessId]
    );
    res.json(updated);
  } catch (err) {
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token.' });
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
