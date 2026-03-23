const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const loginRateLimiter = require('../middleware/rateLimit');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * POST /api/auth/business/login
 * Owner login — just the 3-character business code, no password.
 * Returns { token } with role: 'owner', businessId in payload.
 */
router.post('/business/login', loginRateLimiter, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Business code required.' });

    const business = await db.get(
      'SELECT * FROM businesses WHERE UPPER(code) = ? AND is_active = 1',
      [code.trim().toUpperCase()]
    );

    if (!business) return res.status(401).json({ error: 'Invalid code.' });

    const token = jwt.sign(
      { role: 'owner', businessId: business.id, id: business.id },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({ token });
  } catch (err) {
    console.error('Business login error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * POST /api/auth/admin/login
 * Admin login with username + password.
 * Returns { token } with role: 'admin' in payload.
 */
router.post('/admin/login', loginRateLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required.' });
    }

    const admin = await db.get('SELECT * FROM admin WHERE username = ?', [username.trim()]);
    if (!admin) return res.status(401).json({ error: 'Invalid credentials.' });

    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

    const token = jwt.sign(
      { role: 'admin', id: admin.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({ token });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
