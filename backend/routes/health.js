const express = require('express');
const router = express.Router();

/**
 * Health Check Endpoint
 * GET /api/health
 * 
 * Returns the operational status of the server.
 * This endpoint is accessible without authentication and is used for
 * monitoring and health checks by external services.
 * 
 * @returns {Object} JSON object with status field
 * @returns {string} status - Server status indicator ("OK" when healthy)
 * @example
 * GET /api/health
 * Response: { "status": "OK" }
 */
router.get('/health', (req, res) => {
  try {
    res.status(200).json({ status: 'OK' });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * Error handling middleware for health routes
 * Catches any unexpected errors and returns a 500 status code
 */
router.use((err, req, res, next) => {
  console.error('Health route error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = router;
