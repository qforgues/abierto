const express = require('express');
const router = express.Router();

/**
 * Health check endpoint
 * Returns the application status and current timestamp
 * Used for monitoring and deployment verification
 */
router.get('/', (req, res) => {
  try {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Log the error for debugging purposes
    console.error('Health check endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error'
    });
  }
});

module.exports = router;
