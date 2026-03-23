const express = require('express');
const router = express.Router();

/**
 * Health Check Route
 * GET /api/health
 * 
 * Returns the health status of the application.
 * This endpoint is used for monitoring and automated health checks.
 */
router.get('/', (req, res) => {
  try {
    // Log the health check request
    console.log(`[${new Date().toISOString()}] Health check request received`);
    
    // Return healthy status
    res.status(200).json({ 
      message: 'Service is healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Log the error
    console.error(`[${new Date().toISOString()}] Health check error:`, error.message);
    
    // Return unhealthy status
    res.status(500).json({ 
      error: 'Service is unhealthy',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
