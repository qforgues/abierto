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

// ── Well-known assets (e.g. assetlinks.json for App Links) ──────────────────────
app.use('/.well-known', express.static(path.join(__dirname, 'public', '.well-known')));

// ── Privacy policy ───────────────────────────────────────────────────────────
app.get('/privacy', (req, res) => {
  res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Privacy Policy – Abierto</title><style>body{font-family:sans-serif;max-width:700px;margin:40px auto;padding:0 20px;color:#333;line-height:1.6}h1{color:#1a1a1a}</style></head><body><h1>Privacy Policy</h1><p><strong>Last updated: April 2026</strong></p><p>Abierto ("the app") is a business directory for Vieques, Puerto Rico. This policy explains how we handle your information.</p><h2>Information We Collect</h2><ul><li><strong>Camera:</strong> Used only to let business owners upload photos. Photos are uploaded to our server and stored securely. We do not access your camera without your action.</li><li><strong>Location:</strong> Used to show nearby businesses on the map. Location is not stored or shared.</li><li><strong>Account info:</strong> Email and password (hashed) for business owner accounts.</li></ul><h2>How We Use Your Information</h2><p>We use collected information solely to operate the Abierto directory. We do not sell, share, or use your data for advertising.</p><h2>Data Storage</h2><p>Data is stored on secure servers. Photos uploaded by business owners are stored and displayed publicly in the app.</p><h2>Contact</h2><p>Questions? Email us at <a href="mailto:hello@abierto.app">hello@abierto.app</a>.</p></body></html>`);
});

// ── Delete account page ──────────────────────────────────────────────────────
app.get('/delete-account', (req, res) => {
  res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Delete Account – Abierto Vieques</title><style>body{font-family:sans-serif;max-width:700px;margin:40px auto;padding:0 20px;color:#333;line-height:1.6}h1{color:#1a1a1a}ol li{margin-bottom:8px}.note{background:#f5f5f5;padding:12px 16px;border-radius:6px;font-size:0.95em}</style></head><body><h1>Delete Your Abierto Vieques Account</h1><p>If you would like to delete your Abierto Vieques account and all associated data, follow the steps below.</p><h2>How to Request Account Deletion</h2><ol><li>Send an email to <a href="mailto:hello@abierto.app">hello@abierto.app</a> from the email address associated with your account.</li><li>Use the subject line: <strong>Delete My Account</strong></li><li>We will process your request within 7 business days and send a confirmation email when complete.</li></ol><h2>What Gets Deleted</h2><ul><li>Your account and login credentials</li><li>Your business profile and all associated information</li><li>All photos you have uploaded</li></ul><h2>What May Be Retained</h2><p class="note">We do not retain any personal data after account deletion. Backups are purged within 30 days.</p><h2>Questions?</h2><p>Contact us at <a href="mailto:hello@abierto.app">hello@abierto.app</a>.</p></body></html>`);
});

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
    const cols = await db.all("PRAGMA table_info(businesses)");
    info.businesses_columns = cols.map(c => c.name);
    const islandSample = await db.all("SELECT DISTINCT island FROM businesses LIMIT 10");
    info.island_values = islandSample.map(r => r.island);
    info.steps.push('queries ok');
    res.json({ ok: true, ...info });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message, stack: err.stack, ...info });
  }
});

// ── Cron: clear manual status overrides ──────────────────────────────────────
// Call this on a schedule (e.g. every hour via Render cron or external service).
// Clearing quick_override lets hours-based status resume on the next request.
app.post('/api/cron/status-reset', async (req, res) => {
  const secret = req.headers['x-cron-secret'] || req.body?.secret;
  if (!secret || secret !== (process.env.CRON_SECRET || 'abierto-cron')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const result = await db.run(
      'UPDATE business_status SET quick_override = 0 WHERE quick_override = 1'
    );
    res.json({ ok: true, cleared: result.changes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',                  require('./routes/apiAuth'));
app.use('/api/integrity',             require('./routes/integrity'));
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
app.use('/api/messages',              require('./routes/messages'));

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
      island      TEXT NOT NULL DEFAULT 'vieques',
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
    `CREATE TABLE IF NOT EXISTS messages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      from_admin  INTEGER NOT NULL DEFAULT 0,
      body        TEXT NOT NULL,
      is_read     INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  ];

  for (const sql of schema) {
    await db.run(sql);
  }

  // Migrations — silently ignored if column already exists
  try { await db.run('ALTER TABLE businesses ADD COLUMN name_es TEXT'); } catch (e) {}
  try { await db.run('ALTER TABLE businesses ADD COLUMN description_es TEXT'); } catch (e) {}
  try { await db.run('ALTER TABLE business_status ADD COLUMN quick_override INTEGER NOT NULL DEFAULT 0'); } catch (e) {}
  try { await db.run("ALTER TABLE businesses ADD COLUMN island TEXT DEFAULT 'vieques'"); } catch (e) {}
  // Back-fill any rows where island is null (pre-migration rows)
  try { await db.run("UPDATE businesses SET island = 'vieques' WHERE island IS NULL"); } catch (e) {}

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
