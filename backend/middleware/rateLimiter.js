const rateLimit = require('express-rate-limit');

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const businessCreationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1,
  message: 'You can only create one business per hour.',
  standardHeaders: true,
  legacyHeaders: false,
});

const fileUploadRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5,
  message: 'You have reached the maximum number of file uploads (5) per 24 hours.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => {
    const businessId = req.params.id || req.body.businessId || 'unknown';
    return `${req.ip || req.socket.remoteAddress || 'unknown'}-${businessId}`;
  },
});

module.exports = { loginRateLimiter, businessCreationRateLimiter, fileUploadRateLimiter };
