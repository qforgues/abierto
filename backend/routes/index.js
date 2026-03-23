const express = require('express');
const router = express.Router();

// Import route modules
const healthRouter = require('./health');

/**
 * Health Check Routes
 * Mounted at /api/health
 */
router.use('/health', healthRouter);

module.exports = router;
