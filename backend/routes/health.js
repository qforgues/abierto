const express = require('express');
const router = express.Router();

// Health check endpoint — see docs/HEALTH_CHECK.md for the response contract.
// Mounted in app.js at BOTH /api/health and /health, before the SPA fallback. If it
// isn't mounted ahead of that fallback, these paths return index.html with a 200 and
// the Dockerfile HEALTHCHECK silently passes even when the app is broken.
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
