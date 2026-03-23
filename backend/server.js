/**
 * backend/server.js
 * Main Express server — restored to last known good state.
 * Includes full middleware stack, database connection, and all route registrations.
 */

'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const Database = require('better-sqlite3');

// ---------------------------------------------------------------------------
// App & configuration
// ---------------------------------------------------------------------------
const app = express();
const PORT = process.env.PORT || 5000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'abierto.sqlite');

// ---------------------------------------------------------------------------
// Database initialisation
// ---------------------------------------------------------------------------
let db;
try {
  db = new Database(DB_PATH, { verbose: process.env.NODE_ENV !== 'production' ? console.log : null });
  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  console.log(`[db] Connected to SQLite database at ${DB_PATH}`);
} catch (err) {
  console.error('[db] Failed to connect to database:', err.message);
  process.exit(1);
}

// Make db available to route handlers via app.locals
app.locals.db = db;

// ---------------------------------------------------------------------------
// Middleware stack
// ---------------------------------------------------------------------------

// Security headers
app.use(helmet());

// CORS — allow the frontend dev server and production origin
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman) in non-production
      if (!origin || process.env.NODE_ENV !== 'production') return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  })
);

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ---------------------------------------------------------------------------
// Route registrations
// ---------------------------------------------------------------------------

// Health check (kept for load-balancer / uptime monitoring)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes — loaded from the routes directory
try {
  const authRoutes     = require('./routes/auth');
  const userRoutes     = require('./routes/users');
  const productRoutes  = require('./routes/products');
  const orderRoutes    = require('./routes/orders');
  const categoryRoutes = require('./routes/categories');

  app.use('/api/auth',       authRoutes);
  app.use('/api/users',      userRoutes);
  app.use('/api/products',   productRoutes);
  app.use('/api/orders',     orderRoutes);
  app.use('/api/categories', categoryRoutes);

  console.log('[routes] All API routes registered successfully');
} catch (err) {
  console.error('[routes] Failed to load one or more route modules:', err.message);
  // Do not exit — allow the server to start so /health still responds;
  // individual route failures will surface as 404s.
}

// ---------------------------------------------------------------------------
// 404 handler — must come after all routes
// ---------------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  const status = err.status || err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Internal server error'
      : err.message || 'Internal server error';
  res.status(status).json({ error: message });
});

// ---------------------------------------------------------------------------
// Start listening
// ---------------------------------------------------------------------------
const server = app.listen(PORT, () => {
  console.log(`[server] Abierto API listening on http://localhost:${PORT}`);
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`[server] Received ${signal} — shutting down gracefully`);
  server.close(() => {
    if (db) {
      try {
        db.close();
        console.log('[db] Database connection closed');
      } catch (e) {
        console.error('[db] Error closing database:', e.message);
      }
    }
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

module.exports = app; // exported for testing
