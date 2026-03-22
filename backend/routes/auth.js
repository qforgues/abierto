const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/admin/login
router.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required.' });
  }
  try {
    const admin = await db.get('SELECT * FROM admin WHERE username = ?', [username]);
    if (!admin) return res.status(401).json({ error: 'Invalid credentials.' });

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });

    const token = jwt.sign({ role: 'admin', sub: admin.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, role: 'admin' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/auth/business/login
router.post('/business/login', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Business code required.' });
  const normalizedCode = String(code).trim().toUpperCase();

  try {
    const business = await db.get(
      'SELECT * FROM businesses WHERE code = ? AND is_active = 1',
      [normalizedCode]
    );
    if (!business) return res.status(401).json({ error: 'Invalid business code.' });

    const token = jwt.sign(
      { role: 'owner', sub: business.id, businessId: business.id, businessName: business.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, role: 'owner', businessId: business.id, businessName: business.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
