/**
 * backend/server.js
 *
 * Main Express server entry point.
 * Restored from last known good state (pre-cleanup-run).
 *
 * Includes:
 *  - Environment configuration
 *  - Middleware stack (CORS, JSON body parsing, request logging)
 *  - SQLite database connection
 *  - Route registrations (auth, users, items, health)
 *  - Global error handler
 */

'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// ---------------------------------------------------------------------------
// App & configuration
// ---------------------------------------------------------------------------
const app = express();
const PORT = process.env.PORT || 5000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'abierto.sqlite');

// ---------------------------------------------------------------------------
// Database connection
// ---------------------------------------------------------------------------
let db;
try {
  db = new Database(DB_PATH, { verbose: process.env.NODE_ENV === 'development' ? console.log : null });
  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
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

// CORS — allow requests from the frontend dev server
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);

// Parse incoming JSON bodies
app.use(express.json());

// Parse URL-encoded bodies (form submissions)
app.use(express.urlencoded({ extended: true }));

// Simple request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ---------------------------------------------------------------------------
// Route registrations
// ---------------------------------------------------------------------------

// Health check — lightweight ping used by load balancers / CI
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API base path
const API = '/api';

// Auth routes  (login, register, logout, refresh-token)
try {
  const authRouter = require('./routes/auth');
  app.use(`${API}/auth`, authRouter);
  console.log('[routes] /api/auth registered');
} catch (e) {
  console.warn('[routes] Could not load auth router:', e.message);
}

// User routes  (profile, list, update, delete)
try {
  const usersRouter = require('./routes/users');
  app.use(`${API}/users`, usersRouter);
  console.log('[routes] /api/users registered');
} catch (e) {
  console.warn('[routes] Could not load users router:', e.message);
}

// Items / listings routes
try {
  const itemsRouter = require('./routes/items');
  app.use(`${API}/items`, itemsRouter);
  console.log('[routes] /api/items registered');
} catch (e) {
  console.warn('[routes] Could not load items router:', e.message);
}

// Categories routes
try {
  const categoriesRouter = require('./routes/categories');
  app.use(`${API}/categories`, categoriesRouter);
  console.log('[routes] /api/categories registered');
} catch (e) {
  console.warn('[routes] Could not load categories router:', e.message);
}

// ---------------------------------------------------------------------------
// 404 handler — must come after all route registrations
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred.',
  });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const server = app.listen(PORT, () => {
  console.log(`[server] Abierto API listening on http://localhost:${PORT}`);
  console.log(`[server] Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`[server] Received ${signal}. Shutting down gracefully…`);
  server.close(() => {
    if (db) {
      db.close();
      console.log('[db] Database connection closed.');
    }
    console.log('[server] HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = { app, db };
