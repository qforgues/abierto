const express = require('express');
const router = express.Router();

/**
 * Health Check Endpoint
 * GET /api/health
 * 
 * Returns the current health status of the application.
 * This endpoint is used for monitoring and verifying that the application
 * is running correctly, especially when deployed on cloud services.
 * 
 * @returns {Object} JSON object with status and timestamp
 * @returns {string} status - The health status of the application ('healthy')
 * @returns {string} timestamp - ISO 8601 formatted timestamp of the check
 */
router.get('/', (req, res) => {
  try {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Log the error for debugging purposes
    console.error('Health check error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred during the health check',
    });
  }
});

module.exports = router;
