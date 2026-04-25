const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const loginRateLimiter = require('../middleware/rateLimit');
const {
  JWT_SECRET,
  clearAuthCookie,
  getAuthUser,
  setAuthCookie,
} = require('../middleware/auth');

const router = express.Router();
const OWNER_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const ADMIN_SESSION_MS = 7 * 24 * 60 * 60 * 1000;

function toOwnerSession(business) {
  return {
    role: 'owner',
    businessId: business.id,
    id: business.id,
    businessCode: business.code,
    name: business.name,
  };
}

function toAdminSession(admin) {
  return {
    role: 'admin',
    id: admin.id,
    username: admin.username,
  };
}

function toSessionFromToken(user) {
  if (!user) return null;
  if (user.role === 'owner') {
    return {
      role: 'owner',
      id: user.id,
      businessId: user.businessId,
      businessCode: user.businessCode,
    };
  }
  if (user.role === 'admin') {
    return {
      role: 'admin',
      id: user.id,
      username: user.username,
    };
  }
  if (user.role === 'coordinator') {
    return {
      role: 'coordinator',
      id: user.id,
      coordinatorId: user.coordinatorId,
      name: user.name,
      island: user.island,
    };
  }
  return null;
}

/**
 * POST /api/auth/business/login
 * Owner login — just the 3-character business code, no password.
 * Sets the shared auth cookie and returns the resolved user session.
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
      { role: 'owner', businessId: business.id, id: business.id, businessCode: business.code },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    clearAuthCookie(res);
    setAuthCookie(res, token, OWNER_SESSION_MS);
    return res.json({ user: toOwnerSession(business) });
  } catch (err) {
    console.error('Business login error:', err);
    return res.status(500).json({ error: err.message || 'Server error.' });
  }
});

/**
 * POST /api/auth/admin/login
 * Admin login with username + password.
 * Sets the shared auth cookie and returns the resolved user session.
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
      { role: 'admin', id: admin.id, username: admin.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    clearAuthCookie(res);
    setAuthCookie(res, token, ADMIN_SESSION_MS);
    return res.json({ user: toAdminSession(admin) });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ error: err.message || 'Server error.' });
  }
});

/**
 * POST /api/auth/logout
 * Clears the shared auth cookie.
 */
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  return res.json({ message: 'Logout successful.' });
});

/**
 * GET /api/auth/me
 * Returns the current authenticated user from the cookie session.
 */
router.get('/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated.' });
  const session = toSessionFromToken(user);
  if (!session) return res.status(401).json({ error: 'Not authenticated.' });
  return res.json({ user: session });
});

// POST /api/auth/coordinator/login
router.post('/coordinator/login', loginRateLimiter, async (req, res) => {
  try {
    const { code, password } = req.body;
    if (!code || !password) return res.status(400).json({ error: 'Code and password required.' });
    const coordinator = await db.get(
      'SELECT * FROM event_coordinators WHERE UPPER(code) = ? AND is_active = 1',
      [code.trim().toUpperCase()]
    );
    if (!coordinator || !coordinator.password_hash) return res.status(401).json({ error: 'Invalid credentials.' });
    const match = await bcrypt.compare(password, coordinator.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials.' });
    const token = jwt.sign(
      { role: 'coordinator', coordinatorId: coordinator.id, id: coordinator.id, name: coordinator.name, island: coordinator.island },
      JWT_SECRET, { expiresIn: '30d' }
    );
    clearAuthCookie(res);
    setAuthCookie(res, token, 30 * 24 * 60 * 60 * 1000);
    return res.json({ user: { role: 'coordinator', coordinatorId: coordinator.id, id: coordinator.id, name: coordinator.name, island: coordinator.island } });
  } catch (err) {
    console.error('Coordinator login error:', err);
    return res.status(500).json({ error: err.message || 'Server error.' });
  }
});

module.exports = router;
