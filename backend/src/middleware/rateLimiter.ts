import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for login attempts
 * - Max 5 attempts per 15 minutes per IP
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Rate limiter for business creation
 * - Max 1 business per hour per IP
 */
export const businessCreationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1, // 1 request per windowMs
  message: 'You can only create one business per hour.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
});

/**
 * Rate limiter for file uploads
 * - Max 5 files per business per 24 hours
 */
export const fileUploadRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5, // 5 requests per windowMs
  message: 'You have reached the maximum number of file uploads (5) per 24 hours.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use business ID from request params or body
    const businessId = (req as any).businessId || (req.body as any).businessId || 'unknown';
    return `${req.ip || req.socket.remoteAddress || 'unknown'}-${businessId}`;
  },
});
