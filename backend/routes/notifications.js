const express = require('express');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications
router.get('/', requireAdmin, async (req, res) => {
  try {
    const notifications = await db.all(
      'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100'
    );
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', requireAdmin, async (req, res) => {
  try {
    const row = await db.get('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0');
    res.json({ count: row.count });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', requireAdmin, async (req, res) => {
  try {
    await db.run('UPDATE notifications SET is_read = 1');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', requireAdmin, async (req, res) => {
  try {
    await db.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
