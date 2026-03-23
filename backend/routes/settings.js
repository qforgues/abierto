const express = require('express');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/settings — public (frontend needs this without auth)
router.get('/', async (req, res) => {
  try {
    const rows = await db.all('SELECT key, value FROM app_settings', []);
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value === '1';
    }
    res.json({ pwa_enabled: true, ...settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PATCH /api/settings — admin only
router.patch('/', requireAdmin, async (req, res) => {
  try {
    const allowed = ['pwa_enabled'];
    for (const key of allowed) {
      if (key in req.body) {
        await db.run(
          `INSERT INTO app_settings (key, value) VALUES (?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          [key, req.body[key] ? '1' : '0']
        );
      }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
