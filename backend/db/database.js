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
    code        TEXT NOT NULL UNIQUE,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  await run(`CREATE TABLE IF NOT EXISTS business_status (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    status      TEXT NOT NULL DEFAULT 'Closed',
    note        TEXT,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

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

  await run(`CREATE TABLE IF NOT EXISTS admin (
    id            INTEGER PRIMARY KEY DEFAULT 1,
    username      TEXT NOT NULL DEFAULT 'admin',
    password_hash TEXT NOT NULL
  )`);

  const existing = await get('SELECT id FROM admin WHERE id = 1');
  if (!existing) {
    const hash = await bcrypt.hash('Abierto1!', 10);
    await run(
      `INSERT INTO admin (id, username, password_hash) VALUES (1, 'admin', ?)`,
      [hash]
    );
    console.log('Admin account created — default password: Abierto1!');
  }

  console.log('Database ready.');
};

module.exports = { initializeDatabase, get, all, run };
