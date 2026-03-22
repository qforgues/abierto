const jwt = require('jsonwebtoken');
const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || (isProduction ? null : 'abierto-dev-secret-local-only');

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production.');
}

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
