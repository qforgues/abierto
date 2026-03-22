const express = require('express');
const db = require('../db/database');

const router = express.Router();

// POST /api/contact — public, no auth required
router.post('/', async (req, res) => {
  const { businessName, message } = req.body;
  if (!businessName || !businessName.trim()) {
    return res.status(400).json({ error: 'Business name is required.' });
  }
  try {
    const msg = message?.trim() ? ` — "${message.trim()}"` : '';
    await db.run(
      `INSERT INTO notifications (type, message) VALUES ('contact', ?)`,
      [`🔒 Owner locked out: "${businessName.trim()}"${msg}`]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
