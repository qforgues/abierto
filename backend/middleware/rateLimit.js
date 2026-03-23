const rateLimit = require('express-rate-limit');

/**
 * Login rate limiter middleware
 * Limits login attempts to 5 per minute per IP address
 */
const loginRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute window
    max: 5, // Limit each IP to 5 login attempts per windowMs
    message: { error: 'Too many login attempts, please try again later.' },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Skip successful requests from counting towards the limit
    skip: (req, res) => res.statusCode < 400,
    // Custom key generator to use IP address
    keyGenerator: (req, res) => {
        return req.ip || req.connection.remoteAddress;
    }
});

module.exports = loginRateLimiter;
