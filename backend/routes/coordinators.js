const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

async function makeUniqueCode() {
  for (let i = 0; i < 50; i++) {
    const code = 'EC' + String(Math.floor(Math.random() * 100)).padStart(2, '0');
    const exists = await db.get('SELECT id FROM event_coordinators WHERE code = ?', [code]);
    if (!exists) return code;
  }
  throw new Error('Could not generate unique code.');
}

// GET /api/coordinators  — admin only
router.get('/', requireAdmin, async (req, res) => {
  try {
    const rows = await db.all('SELECT id, name, code, island, is_active, created_at FROM event_coordinators ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/coordinators  — admin creates coordinator
router.post('/', requireAdmin, async (req, res) => {
  const { name, password, island } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required.' });
  if (!password) return res.status(400).json({ error: 'Password required.' });
  try {
    const code = await makeUniqueCode();
    const hash = await bcrypt.hash(password, 10);
    const result = await db.run(
      'INSERT INTO event_coordinators (name, code, password_hash, island) VALUES (?, ?, ?, ?)',
      [name, code, hash, island || 'vieques']
    );
    res.status(201).json({ id: result.lastID, name, code, island: island || 'vieques', is_active: 1 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/coordinators/:id  — admin updates/deactivates
router.patch('/:id', requireAdmin, async (req, res) => {
  const { is_active, name, password } = req.body;
  try {
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await db.run('UPDATE event_coordinators SET password_hash = ? WHERE id = ?', [hash, req.params.id]);
    }
    if (name !== undefined) await db.run('UPDATE event_coordinators SET name = ? WHERE id = ?', [name, req.params.id]);
    if (is_active !== undefined) await db.run('UPDATE event_coordinators SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, req.params.id]);
    const updated = await db.get('SELECT id, name, code, island, is_active, created_at FROM event_coordinators WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
