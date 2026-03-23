const express = require('express');
const router = express.Router();

/**
 * Health check endpoint
 * GET /api/health
 * 
 * Returns the current status of the application and a timestamp.
 * This endpoint is used by monitoring services and users to verify
 * that the application is running correctly.
 */
router.get('/', (req, res) => {
  try {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Log the error for debugging purposes
    console.error('Health check error:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error',
    });
  }
});

module.exports = router;
