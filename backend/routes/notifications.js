const express = require('express');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/notifications/report — public, no auth — wrong info report on a business
router.post('/report', async (req, res) => {
  const { business_id, business_name, issue, note } = req.body;
  if (!business_id || !issue) return res.status(400).json({ error: 'business_id and issue required.' });
  try {
    const msg = `⚑ WRONG INFO REPORT — ${business_name || `Business #${business_id}`}\nIssue: ${issue}${note ? `\nNote: ${note}` : ''}`;
    await db.run(
      `INSERT INTO notifications (type, business_id, message) VALUES ('report', ?, ?)`,
      [business_id, msg.slice(0, 1000)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// POST /api/notifications/feedback — public, no auth
router.post('/feedback', async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ error: 'Message required.' });
  try {
    await db.run(
      `INSERT INTO notifications (type, message) VALUES ('feedback', ?)`,
      [message.trim().slice(0, 1000)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// GET /api/notifications
router.get('/', requireAdmin, async (req, res) => {
  try {
    const notifications = await db.all(
      'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100'
    );
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', requireAdmin, async (req, res) => {
  try {
    const row = await db.get('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0');
    res.json({ count: row.count });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', requireAdmin, async (req, res) => {
  try {
    await db.run('UPDATE notifications SET is_read = 1');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', requireAdmin, async (req, res) => {
  try {
    await db.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

module.exports = router;
