const express = require('express');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

/**
 * GET /api/health
 * Health check endpoint to verify service status
 * Returns 200 OK with a status message
 * Protected by rate limiting middleware
 */
router.get('/', rateLimit, (req, res) => {
    res.status(200).json({ message: 'Service is up and running' });
});

module.exports = router;
