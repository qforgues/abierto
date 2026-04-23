const express = require('express');
const db = require('../db/database');
const { getAuthUser, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ── Owner routes ──────────────────────────────────────────────────────────────

function ownerAuth(req, res) {
  const user = getAuthUser(req);
  if (!user || user.role !== 'owner') {
    res.status(401).json({ error: 'Unauthorized.' });
    return null;
  }
  return user;
}

// GET /api/messages/unread  — unread count (admin replies owner hasn't seen)
router.get('/unread', (req, res, next) => {
  if (req.path !== '/unread') return next();
  const user = ownerAuth(req, res);
  if (!user) return;
  db.get(
    'SELECT COUNT(*) as count FROM messages WHERE business_id = ? AND from_admin = 1 AND is_read = 0',
    [user.businessId]
  )
    .then(row => res.json({ count: row?.count || 0 }))
    .catch(err => res.status(500).json({ error: err.message }));
});

// GET /api/messages  — owner's full thread (also marks admin replies as read)
router.get('/', async (req, res) => {
  const user = ownerAuth(req, res);
  if (!user) return;
  try {
    const messages = await db.all(
      'SELECT * FROM messages WHERE business_id = ? ORDER BY created_at ASC',
      [user.businessId]
    );
    await db.run(
      'UPDATE messages SET is_read = 1 WHERE business_id = ? AND from_admin = 1 AND is_read = 0',
      [user.businessId]
    );
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages  — owner sends a message
router.post('/', async (req, res) => {
  const user = ownerAuth(req, res);
  if (!user) return;
  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'Message body required.' });
  try {
    await db.run(
      `INSERT INTO messages (business_id, from_admin, body, is_read, created_at)
       VALUES (?, 0, ?, 0, datetime('now'))`,
      [user.businessId, body.trim()]
    );
    const messages = await db.all(
      'SELECT * FROM messages WHERE business_id = ? ORDER BY created_at ASC',
      [user.businessId]
    );
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin routes ──────────────────────────────────────────────────────────────

// GET /api/messages/admin/unread  — total unread count across all businesses
router.get('/admin/unread', requireAdmin, async (req, res) => {
  try {
    const row = await db.get(
      'SELECT COUNT(*) as count FROM messages WHERE from_admin = 0 AND is_read = 0'
    );
    res.json({ count: row?.count || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/admin  — all threads with unread counts
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const threads = await db.all(`
      SELECT b.id, b.name, b.code,
             COUNT(m.id) as total,
             SUM(CASE WHEN m.from_admin = 0 AND m.is_read = 0 THEN 1 ELSE 0 END) as unread,
             MAX(m.created_at) as last_message_at,
             (SELECT body FROM messages WHERE business_id = b.id ORDER BY created_at DESC LIMIT 1) as last_body
      FROM businesses b
      JOIN messages m ON m.business_id = b.id
      WHERE b.is_active = 1
      GROUP BY b.id
      ORDER BY unread DESC, last_message_at DESC
    `);
    res.json(threads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/admin/:businessId  — full thread (marks owner msgs as read)
router.get('/admin/:businessId', requireAdmin, async (req, res) => {
  try {
    const messages = await db.all(
      'SELECT * FROM messages WHERE business_id = ? ORDER BY created_at ASC',
      [req.params.businessId]
    );
    await db.run(
      'UPDATE messages SET is_read = 1 WHERE business_id = ? AND from_admin = 0 AND is_read = 0',
      [req.params.businessId]
    );
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages/admin/:businessId  — admin reply
router.post('/admin/:businessId', requireAdmin, async (req, res) => {
  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'Message body required.' });
  try {
    await db.run(
      `INSERT INTO messages (business_id, from_admin, body, is_read, created_at)
       VALUES (?, 1, ?, 0, datetime('now'))`,
      [req.params.businessId, body.trim()]
    );
    const messages = await db.all(
      'SELECT * FROM messages WHERE business_id = ? ORDER BY created_at ASC',
      [req.params.businessId]
    );
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
