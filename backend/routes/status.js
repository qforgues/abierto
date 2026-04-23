const express = require('express');
const db = require('../db/database');
const { requireBusinessAccess } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

const VALID_STATUSES = ['Open', 'Closed', 'Out to Lunch', 'Closed for the Season'];

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
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// POST /api/businesses/:id/status/quick-toggle
router.post('/quick-toggle', async (req, res) => {
  const businessId = parseInt(req.params.id);
  const user = requireBusinessAccess(req, res, req.params.id);
  if (!user) return;

  try {
    const current = await db.get(
      'SELECT status FROM business_status WHERE business_id = ?',
      [businessId]
    );
    const isOpen = current && ['Open', 'Open 24 Hours'].includes(current.status);
    const newStatus = isOpen ? 'Closed' : 'Open';

    await db.run(
      `UPDATE business_status
       SET status = ?, quick_override = 1, note = NULL, return_time = NULL, return_date = NULL, updated_at = datetime('now')
       WHERE business_id = ?`,
      [newStatus, businessId]
    );

    const updated = await db.get(
      'SELECT * FROM business_status WHERE business_id = ?',
      [businessId]
    );
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// PUT /api/businesses/:id/status
router.put('/', async (req, res) => {
  const { status, note, return_time, return_date } = req.body;
  const businessId = parseInt(req.params.id);

  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  const user = requireBusinessAccess(req, res, req.params.id);
  if (!user) return;

  try {

    // Only keep return_time for Out to Lunch, return_date for Closed for the Season
    const rtVal = status === 'Out to Lunch' ? (return_time || null) : null;
    const rdVal = status === 'Closed for the Season' ? (return_date || null) : null;
    // Clear note for override statuses — the return time/date is the info
    const noteVal = ['Out to Lunch', 'Closed for the Season'].includes(status) ? null : (note || null);

    await db.run(
      `UPDATE business_status
       SET status = ?, note = ?, return_time = ?, return_date = ?, quick_override = 0, updated_at = datetime('now')
       WHERE business_id = ?`,
      [status, noteVal, rtVal, rdVal, businessId]
    );

    const updated = await db.get(
      'SELECT * FROM business_status WHERE business_id = ?',
      [businessId]
    );
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

module.exports = router;
