const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const apiRoutes = require('./routes');

// Mount API routes
app.use('/api', apiRoutes);

// Health check endpoint (direct mount for immediate availability)
app.get('/health', (req, res) => {
  try {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred during the health check',
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    status: err.status || 500,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `The requested endpoint ${req.method} ${req.path} does not exist`,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  console.log(`API health check available at http://localhost:${PORT}/api/health`);
});

module.exports = app;
