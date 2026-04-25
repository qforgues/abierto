const express = require('express');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

async function ensureSubscription(businessId) {
  await db.run(
    `INSERT OR IGNORE INTO subscriptions (business_id, monthly_amount) VALUES (?, 5.00)`,
    [businessId]
  );
}

// GET /api/subscriptions
router.get('/', requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // All active businesses with current-month payment
    const businesses = await db.all(`
      SELECT b.id, b.name, b.category, b.created_at,
             COALESCE(s.monthly_amount, 5.00) AS monthly_amount,
             p.amount_paid, p.paid_at, p.note
      FROM businesses b
      LEFT JOIN subscriptions s ON s.business_id = b.id
      LEFT JOIN subscription_payments p
             ON p.business_id = b.id AND p.year = ? AND p.month = ?
      WHERE b.is_active = 1
      ORDER BY b.name ASC
    `, [year, month]);

    // Fetch paid months for the last 3 months across all businesses in one query
    const lookback = new Date(year, month - 4, 1);
    const lookbackYear = lookback.getFullYear();
    const lookbackMonth = lookback.getMonth() + 1;

    const recentPayments = await db.all(`
      SELECT business_id, year, month
      FROM subscription_payments
      WHERE (amount_paid > 0 OR forgiven = 1)
        AND (year > ? OR (year = ? AND month >= ?))
    `, [lookbackYear, lookbackYear, lookbackMonth]);

    const paidSet = new Set(recentPayments.map(p => `${p.business_id}-${p.year}-${p.month}`));

    // Calculate consecutive unpaid months for each business
    const toInactivate = [];
    for (const b of businesses) {
      const created = new Date(b.created_at.replace(' ', 'T') + (b.created_at.includes('Z') ? '' : 'Z'));
      const createdMonthStart = new Date(created.getFullYear(), created.getMonth(), 1);

      let unpaid = 0;
      for (let i = 0; i < 3; i++) {
        const checkDate = new Date(year, month - 1 - i, 1);
        if (checkDate < createdMonthStart) break; // don't penalize for months before registration
        if (!paidSet.has(`${b.id}-${checkDate.getFullYear()}-${checkDate.getMonth() + 1}`)) {
          unpaid++;
        } else {
          break; // hit a paid month — stop counting back
        }
      }
      b.months_unpaid = unpaid;
      if (unpaid >= 3) toInactivate.push(b.id);
    }

    // Auto-inactivate and notify
    for (const id of toInactivate) {
      await db.run('UPDATE businesses SET is_active = 0 WHERE id = ?', [id]);
      const biz = businesses.find(b => b.id === id);
      await db.run(
        `INSERT INTO notifications (type, business_id, message) VALUES ('subscription', ?, ?)`,
        [id, `"${biz.name}" was automatically deactivated after 3 months of non-payment.`]
      );
    }

    res.json({
      year,
      month,
      businesses: businesses.filter(b => !toInactivate.includes(b.id)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// GET /api/subscriptions/:businessId/history
router.get('/:businessId/history', requireAdmin, async (req, res) => {
  try {
    const payments = await db.all(`
      SELECT year, month, amount_paid, paid_at, note, forgiven
      FROM subscription_payments
      WHERE business_id = ?
      ORDER BY year DESC, month DESC
    `, [req.params.businessId]);
    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// PATCH /api/subscriptions/:businessId/amount
router.patch('/:businessId/amount', requireAdmin, async (req, res) => {
  const { monthly_amount } = req.body;
  if (monthly_amount == null || isNaN(monthly_amount) || monthly_amount < 0) {
    return res.status(400).json({ error: 'Invalid amount.' });
  }
  try {
    await ensureSubscription(req.params.businessId);
    await db.run(
      `UPDATE subscriptions SET monthly_amount = ? WHERE business_id = ?`,
      [parseFloat(monthly_amount), req.params.businessId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// POST /api/subscriptions/:businessId/payment
router.post('/:businessId/payment', requireAdmin, async (req, res) => {
  const { year, month, amount_paid, note } = req.body;
  if (!year || !month || amount_paid == null || isNaN(amount_paid)) {
    return res.status(400).json({ error: 'year, month, and amount_paid are required.' });
  }
  try {
    await ensureSubscription(req.params.businessId);
    await db.run(`
      INSERT INTO subscription_payments (business_id, year, month, amount_paid, paid_at, note)
      VALUES (?, ?, ?, ?, datetime('now'), ?)
      ON CONFLICT(business_id, year, month)
      DO UPDATE SET amount_paid = excluded.amount_paid,
                    paid_at     = excluded.paid_at,
                    note        = excluded.note
    `, [req.params.businessId, year, month, parseFloat(amount_paid), note || null]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// POST /api/subscriptions/:businessId/forgive
router.post('/:businessId/forgive', requireAdmin, async (req, res) => {
  const { year, month } = req.body;
  if (!year || !month) {
    return res.status(400).json({ error: 'year and month are required.' });
  }
  try {
    await ensureSubscription(req.params.businessId);
    await db.run(`
      INSERT INTO subscription_payments (business_id, year, month, amount_paid, paid_at, note, forgiven)
      VALUES (?, ?, ?, 0, datetime('now'), 'Forgiven', 1)
      ON CONFLICT(business_id, year, month)
      DO UPDATE SET forgiven  = 1,
                    amount_paid = 0,
                    paid_at   = excluded.paid_at,
                    note      = 'Forgiven'
    `, [req.params.businessId, year, month]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

module.exports = router;
