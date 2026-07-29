const express = require('express');
const db = require('../db/database');
const router = express.Router();

/**
 * GET /api/health (and /health) — LIVENESS.
 *
 * Deliberately does NOT touch the database. This is what the Dockerfile HEALTHCHECK and
 * Render's platform probe call: it answers "is this process alive and serving?". If it
 * queried Turso, a transient database blip would be read as a dead container and trigger
 * a restart loop — restarting the app cannot fix someone else's database.
 *
 * Mounted in app.js BEFORE the SPA fallback. If it isn't, these paths return index.html
 * with a 200 and the health check passes even when the app is completely broken.
 * See docs/HEALTH_CHECK.md.
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/health/ready (and /health/ready) — READINESS.
 *
 * Actually exercises the database with a trivial query, and reports latency. Returns 503
 * when the database is unreachable, so this is the endpoint to point real monitoring at.
 */
router.get('/health/ready', async (req, res) => {
  const started = Date.now();
  try {
    // Cheap but real: proves the connection works and the schema is present, without
    // scanning anything.
    await db.get('SELECT 1 AS ok');
    const latencyMs = Date.now() - started;
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      database: { connected: true, latencyMs },
    });
  } catch (err) {
    res.status(503).json({
      status: 'unavailable',
      timestamp: new Date().toISOString(),
      database: { connected: false, error: err.message },
    });
  }
});

module.exports = router;
