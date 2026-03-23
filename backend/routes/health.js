const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Health check endpoint
router.get('/', (req, res) => {
  try {
    // Return successful health status
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Log the error to the logs directory
    const errorMessage = `[${new Date().toISOString()}] Health check error: ${error.message}\n${error.stack}\n`;
    const logFilePath = path.join(logsDir, 'health.log');
    
    fs.appendFile(logFilePath, errorMessage, (writeErr) => {
      if (writeErr) {
        console.error('Failed to write to health.log:', writeErr);
      }
    });
    
    // Also log to console for immediate visibility
    console.error('Health check error:', error);
    
    // Return error response
    res.status(500).json({
      status: 'error',
      message: 'Service unavailable',
    });
  }
});

module.exports = router;
