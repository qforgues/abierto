const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Verify JWT from Authorization: Bearer <token> header (or cookie fallback).
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.slice(7) : req.cookies?.token;

  if (!token) return res.status(401).json({ error: 'No token provided. Please log in.' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token. Please log in again.' });
  }
};

/**
 * Require admin role — reads Bearer token from Authorization header.
 */
const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized.' });

  try {
    const user = jwt.verify(authHeader.slice(7), JWT_SECRET);
    if (user.role !== 'admin') return res.status(403).json({ error: 'Forbidden.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

module.exports = { verifyToken, requireAdmin, JWT_SECRET };
