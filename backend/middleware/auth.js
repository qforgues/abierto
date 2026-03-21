const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'abierto-dev-secret-2024';

const verifyToken = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

const requireAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
  });
};

const requireOwner = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user?.role !== 'owner' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Owner access required.' });
    }
    next();
  });
};

module.exports = { verifyToken, requireAdmin, requireOwner, JWT_SECRET };
