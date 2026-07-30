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
    // Defaults for keys that have never been written. billing_enabled is OFF: listing a
    // business is free until it's deliberately switched on, so the launch push isn't
    // asking anyone for $20/month.
    res.json({ pwa_enabled: true, billing_enabled: false, ...settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// PATCH /api/settings — admin only
router.patch('/', requireAdmin, async (req, res) => {
  try {
    const allowed = ['pwa_enabled', 'billing_enabled'];
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
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

module.exports = router;
