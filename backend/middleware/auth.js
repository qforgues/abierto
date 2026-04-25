const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const AUTH_COOKIE_NAME = 'authToken';
const LEGACY_COOKIE_NAME = 'token';

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };
}

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return req.cookies?.[AUTH_COOKIE_NAME] || req.cookies?.[LEGACY_COOKIE_NAME] || null;
}

function getAuthUser(req) {
  const token = getTokenFromRequest(req);
  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    if (err?.name === 'TokenExpiredError') return null;
    return null;
  }
}

function setAuthCookie(res, token, maxAgeMs) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: maxAgeMs,
  });
}

function clearAuthCookie(res) {
  const options = cookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, options);
  res.clearCookie(LEGACY_COOKIE_NAME, options);
}

/**
 * Verify JWT from the session cookie, with a narrow header fallback for legacy clients.
 */
const verifyToken = (req, res, next) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'No valid session found. Please log in.' });
  req.user = user;
  next();
};

/**
 * Require admin role using the shared cookie-backed session.
 */
const requireAdmin = (req, res, next) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized.' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Forbidden.' });
  req.user = user;
  next();
};

function requireBusinessAccess(req, res, businessId) {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return null;
  }

  if (user.role !== 'admin' && user.businessId !== parseInt(businessId, 10)) {
    res.status(403).json({ error: 'Forbidden.' });
    return null;
  }

  req.user = user;
  return user;
}

module.exports = {
  AUTH_COOKIE_NAME,
  JWT_SECRET,
  clearAuthCookie,
  getAuthUser,
  requireAdmin,
  requireBusinessAccess,
  setAuthCookie,
  verifyToken,
};
