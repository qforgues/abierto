const express = require('express');
const db = require('../db/database');
const { getAuthUser } = require('../middleware/auth');

const router = express.Router();

function requireCoordinatorOrAdmin(req, res) {
  const user = getAuthUser(req);
  if (!user) { res.status(401).json({ error: 'Unauthorized.' }); return null; }
  if (user.role !== 'coordinator' && user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden.' }); return null;
  }
  return user;
}

function parseEvents(rows) {
  return rows.map(e => ({ ...e, recurrence: e.recurrence ? JSON.parse(e.recurrence) : null }));
}

// GET /api/events?island=vieques  — public upcoming events
router.get('/', async (req, res) => {
  try {
    const { island } = req.query;
    const today = new Date().toISOString().split('T')[0];
    const rows = await db.all(`
      SELECT e.*, ec.name AS coordinator_name
      FROM events e
      JOIN event_coordinators ec ON ec.id = e.coordinator_id
      WHERE e.is_active = 1
        AND (e.is_recurring = 1 OR e.start_date >= ?)
        ${island ? 'AND e.island = ?' : ''}
      ORDER BY e.start_date ASC, e.start_time ASC
    `, island ? [today, island] : [today]);
    res.json(parseEvents(rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/mine  — coordinator's own events (all, including past)
router.get('/mine', async (req, res) => {
  const user = requireCoordinatorOrAdmin(req, res);
  if (!user) return;
  try {
    const coordinatorId = user.role === 'coordinator' ? user.coordinatorId : null;
    const rows = coordinatorId
      ? await db.all('SELECT * FROM events WHERE coordinator_id = ? AND is_active = 1 ORDER BY start_date DESC', [coordinatorId])
      : await db.all('SELECT e.*, ec.name AS coordinator_name FROM events e JOIN event_coordinators ec ON ec.id = e.coordinator_id WHERE e.is_active = 1 ORDER BY e.start_date DESC');
    res.json(parseEvents(rows));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events
router.post('/', async (req, res) => {
  const user = requireCoordinatorOrAdmin(req, res);
  if (!user) return;
  const { title, description, location_name, lat, lon, island, start_date, start_time, end_time, is_recurring, recurrence, recurrence_end } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required.' });
  if (!start_date) return res.status(400).json({ error: 'Start date required.' });
  const coordinatorId = user.role === 'coordinator' ? user.coordinatorId : req.body.coordinator_id;
  if (!coordinatorId) return res.status(400).json({ error: 'Coordinator required.' });
  try {
    const result = await db.run(
      `INSERT INTO events (coordinator_id, title, description, location_name, lat, lon, island, start_date, start_time, end_time, is_recurring, recurrence, recurrence_end)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [coordinatorId, title, description || null, location_name || null, lat || null, lon || null,
       island || 'vieques', start_date, start_time || null, end_time || null,
       is_recurring ? 1 : 0, recurrence ? JSON.stringify(recurrence) : null, recurrence_end || null]
    );
    const event = await db.get('SELECT * FROM events WHERE id = ?', [result.lastID]);
    res.status(201).json({ ...event, recurrence: event.recurrence ? JSON.parse(event.recurrence) : null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/events/:id
router.patch('/:id', async (req, res) => {
  const user = requireCoordinatorOrAdmin(req, res);
  if (!user) return;
  try {
    const event = await db.get('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (!event) return res.status(404).json({ error: 'Not found.' });
    if (user.role === 'coordinator' && event.coordinator_id !== user.coordinatorId) return res.status(403).json({ error: 'Forbidden.' });
    const { title, description, location_name, lat, lon, island, start_date, start_time, end_time, is_recurring, recurrence, recurrence_end } = req.body;
    await db.run(
      `UPDATE events SET title=?, description=?, location_name=?, lat=?, lon=?, island=?, start_date=?, start_time=?, end_time=?, is_recurring=?, recurrence=?, recurrence_end=? WHERE id=?`,
      [title ?? event.title, description ?? null, location_name ?? null, lat ?? null, lon ?? null,
       island ?? event.island, start_date ?? event.start_date, start_time ?? null, end_time ?? null,
       is_recurring !== undefined ? (is_recurring ? 1 : 0) : event.is_recurring,
       recurrence ? JSON.stringify(recurrence) : null, recurrence_end ?? null,
       req.params.id]
    );
    const updated = await db.get('SELECT * FROM events WHERE id = ?', [req.params.id]);
    res.json({ ...updated, recurrence: updated.recurrence ? JSON.parse(updated.recurrence) : null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/events/:id  — soft delete
router.delete('/:id', async (req, res) => {
  const user = requireCoordinatorOrAdmin(req, res);
  if (!user) return;
  try {
    const event = await db.get('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (!event) return res.status(404).json({ error: 'Not found.' });
    if (user.role === 'coordinator' && event.coordinator_id !== user.coordinatorId) return res.status(403).json({ error: 'Forbidden.' });
    await db.run('UPDATE events SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
