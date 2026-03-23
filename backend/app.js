require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust Render's proxy so express-rate-limit can read the real client IP
app.set('trust proxy', 1);

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5200',
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
].filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Uploaded files ────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Ping (no DB) ─────────────────────────────────────────────────────────────
app.get('/api/ping', (req, res) => {
  res.json({ ok: true, ts: Date.now(), node: process.version, env: process.env.NODE_ENV });
});

// ── Debug endpoint ───────────────────────────────────────────────────────────
app.get('/api/debug', async (req, res) => {
  const info = {
    node: process.version,
    env: process.env.NODE_ENV,
    turso_url: process.env.TURSO_DATABASE_URL ? process.env.TURSO_DATABASE_URL.replace(/\/\/.*@/, '//***@') : 'NOT SET',
    turso_token: process.env.TURSO_AUTH_TOKEN ? 'SET' : 'NOT SET',
    steps: [],
  };
  try {
    info.steps.push('connecting to db...');
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
    info.steps.push('connected');
    info.tables = tables.map(t => t.name);
    const bizCount = await db.get('SELECT COUNT(*) as c FROM businesses');
    info.business_count = bizCount?.c ?? 0;
    info.steps.push('queries ok');
    res.json({ ok: true, ...info });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message, stack: err.stack, ...info });
  }
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',                  require('./routes/apiAuth'));
app.use('/api/businesses',            require('./routes/businesses'));
app.use('/api/businesses/:id/status', require('./routes/status'));
app.use('/api/businesses/:id/photos', require('./routes/photos'));
app.use('/api/businesses/:id/hours',  require('./routes/hours'));
app.use('/api/analytics',             require('./routes/analytics'));
app.use('/api/notifications',         require('./routes/notifications'));
app.use('/api/contact',               require('./routes/contact'));
app.use('/api/settings',              require('./routes/settings'));
app.use('/api/subscriptions',         require('./routes/subscriptions'));
app.use('/api/webhooks',              require('./routes/webhooks'));

// ── Serve frontend build ──────────────────────────────────────────────────────
const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendBuildPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ── Schema init + server start ────────────────────────────────────────────────
async function initAndStart() {
  // Create all tables if they don't exist
  const schema = [
    `CREATE TABLE IF NOT EXISTS businesses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      description TEXT,
      category    TEXT,
      lat         REAL,
      lon         REAL,
      code        TEXT NOT NULL UNIQUE,
      is_active   INTEGER NOT NULL DEFAULT 1,
      phone       TEXT,
      password_hash TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS business_status (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      status      TEXT NOT NULL DEFAULT 'Closed',
      note        TEXT,
      return_time TEXT,
      return_date TEXT,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS business_photos (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      filename    TEXT NOT NULL,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS business_hours (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL,
      open_time   TEXT,
      close_time  TEXT,
      is_closed   INTEGER NOT NULL DEFAULT 0,
      UNIQUE(business_id, day_of_week)
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      type        TEXT NOT NULL,
      business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
      message     TEXT NOT NULL,
      is_read     INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS admin (
      id            INTEGER PRIMARY KEY DEFAULT 1,
      username      TEXT NOT NULL DEFAULT 'admin',
      password_hash TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS subscriptions (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id    INTEGER NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
      monthly_amount REAL NOT NULL DEFAULT 20.00
    )`,
    `CREATE TABLE IF NOT EXISTS subscription_payments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      year        INTEGER NOT NULL,
      month       INTEGER NOT NULL,
      amount_paid REAL NOT NULL DEFAULT 0,
      paid_at     TEXT,
      note        TEXT,
      UNIQUE(business_id, year, month)
    )`,
    `CREATE TABLE IF NOT EXISTS guest_codes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      code        TEXT UNIQUE NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  ];

  for (const sql of schema) {
    await db.run(sql);
  }

  // Seed admin user if table is empty
  const adminRow = await db.get('SELECT COUNT(*) as count FROM admin');
  if (adminRow.count === 0) {
    const rawPassword = process.env.ADMIN_PASSWORD || 'changeme123';
    const hash = await bcrypt.hash(rawPassword, 10);
    await db.run('INSERT INTO admin (username, password_hash) VALUES (?, ?)', ['admin', hash]);
    console.log('Admin user seeded. Set ADMIN_PASSWORD env var to control the password.');
  }

  app.listen(PORT, () => {
    console.log(`Abierto backend running on port ${PORT}`);
  });
}

initAndStart().catch(err => {
  console.error('Failed to init DB (server still starting):', err);
  // Don't exit — let the server start so /api/debug can report the error
  app.listen(PORT, () => {
    console.log(`Abierto backend running on port ${PORT} (DB INIT FAILED: ${err.message})`);
  });
});

module.exports = app;
