const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'abierto.db');
const _db = new sqlite3.Database(dbPath);

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    _db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    _db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    _db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

const initializeDatabase = async () => {
  await run(`CREATE TABLE IF NOT EXISTS businesses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT,
    category    TEXT,
    lat         REAL,
    lon         REAL,
    phone       TEXT,
    code        TEXT NOT NULL UNIQUE,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  // Add phone column to existing databases
  try { await run(`ALTER TABLE businesses ADD COLUMN phone TEXT`); } catch (_) {}

  await run(`CREATE TABLE IF NOT EXISTS business_status (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    status      TEXT NOT NULL DEFAULT 'Closed',
    note        TEXT,
    return_time TEXT,
    return_date TEXT,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  // Migrations for existing databases
  try { await run(`ALTER TABLE business_status ADD COLUMN return_time TEXT`); } catch (_) {}
  try { await run(`ALTER TABLE business_status ADD COLUMN return_date TEXT`); } catch (_) {}

  await run(`CREATE TABLE IF NOT EXISTS business_photos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    filename    TEXT NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  await run(`CREATE TABLE IF NOT EXISTS notifications (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    type        TEXT NOT NULL,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    message     TEXT NOT NULL,
    is_read     INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  await run(`CREATE TABLE IF NOT EXISTS business_hours (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id  INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    day_of_week  INTEGER NOT NULL,
    open_time    TEXT,
    close_time   TEXT,
    is_closed    INTEGER NOT NULL DEFAULT 0,
    UNIQUE(business_id, day_of_week)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS subscriptions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id    INTEGER NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
    monthly_amount REAL NOT NULL DEFAULT 20.00
  )`);

  await run(`CREATE TABLE IF NOT EXISTS subscription_payments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    year        INTEGER NOT NULL,
    month       INTEGER NOT NULL,
    amount_paid REAL NOT NULL DEFAULT 0,
    paid_at     TEXT,
    note        TEXT,
    UNIQUE(business_id, year, month)
  )`);

  // v1.1: owner password field on businesses
  try { await run(`ALTER TABLE businesses ADD COLUMN password_hash TEXT`); } catch (_) {}

  await run(`CREATE TABLE IF NOT EXISTS guest_codes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    code        TEXT UNIQUE NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  await run(`CREATE TABLE IF NOT EXISTS admin (
    id            INTEGER PRIMARY KEY DEFAULT 1,
    username      TEXT NOT NULL DEFAULT 'admin',
    password_hash TEXT NOT NULL
  )`);

  const existing = await get('SELECT id FROM admin WHERE id = 1');
  if (!existing) {
    const defaultPassword = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? null : 'Abierto1!');
    if (!defaultPassword) {
      throw new Error('ADMIN_PASSWORD is required to bootstrap the first admin account in production.');
    }
    const hash = await bcrypt.hash(defaultPassword, 10);
    await run(
      `INSERT INTO admin (id, username, password_hash) VALUES (1, 'admin', ?)`,
      [hash]
    );
    if (process.env.NODE_ENV === 'production') {
      console.log('Admin account created from ADMIN_PASSWORD.');
    } else {
      console.log('Admin account created — local dev password: Abierto1!');
    }
  }

  console.log('Database ready.');
};

module.exports = { initializeDatabase, get, all, run };
