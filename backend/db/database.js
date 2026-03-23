require('dotenv').config();
const bcrypt = require('bcrypt');
const path = require('path');

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

// ── Turso HTTP API (production) ───────────────────────────────────────────────
const httpUrl = TURSO_URL
  ? TURSO_URL.replace(/^libsql:\/\//, 'https://') + '/v2/pipeline'
  : null;

function toArg(v) {
  if (v === null || v === undefined) return { type: 'null' };
  if (typeof v === 'boolean') return { type: 'integer', value: v ? '1' : '0' };
  if (typeof v === 'number') return Number.isInteger(v) ? { type: 'integer', value: String(v) } : { type: 'float', value: String(v) };
  return { type: 'text', value: String(v) };
}

function parseRows(result) {
  const { cols, rows } = result;
  return rows.map(row => {
    const obj = {};
    cols.forEach((col, i) => {
      const cell = row[i];
      if (!cell || cell.type === 'null') obj[col.name] = null;
      else if (cell.type === 'integer') obj[col.name] = parseInt(cell.value, 10);
      else if (cell.type === 'float') obj[col.name] = parseFloat(cell.value);
      else obj[col.name] = cell.value;
    });
    return obj;
  });
}

async function tursoExec(sql, args = []) {
  const res = await fetch(httpUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TURSO_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [
        { type: 'execute', stmt: { sql, args: args.map(toArg) } },
        { type: 'close' },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Turso ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const r = data.results[0];
  if (r.type === 'error') throw new Error(r.error.message);
  return r.response.result;
}

// ── sqlite3 fallback (local dev) ──────────────────────────────────────────────
let localDb = null;
function getLocalDb() {
  if (!localDb) {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.join(__dirname, 'abierto.db');
    localDb = new sqlite3.Database(dbPath);
    localDb.run('PRAGMA foreign_keys = ON');
    console.log('DB: local SQLite at', dbPath);
  }
  return localDb;
}

function localRun(sql, params) {
  return new Promise((resolve, reject) => {
    getLocalDb().run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, lastID: this.lastID, changes: this.changes });
    });
  });
}
function localGet(sql, params) {
  return new Promise((resolve, reject) => {
    getLocalDb().get(sql, params, (err, row) => err ? reject(err) : resolve(row ?? null));
  });
}
function localAll(sql, params) {
  return new Promise((resolve, reject) => {
    getLocalDb().all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []));
  });
}

// ── Public interface ──────────────────────────────────────────────────────────
const useTurso = !!(TURSO_URL && TURSO_TOKEN);
console.log('DB:', useTurso ? 'Turso cloud (' + TURSO_URL + ')' : 'local SQLite');

const database = {
  run: async (sql, params = []) => {
    if (useTurso) {
      const r = await tursoExec(sql, params);
      const id = parseInt(r.last_insert_rowid || '0', 10);
      return { id, lastID: id, changes: r.affected_row_count || 0 };
    }
    return localRun(sql, params);
  },

  get: async (sql, params = []) => {
    if (useTurso) {
      const r = await tursoExec(sql, params);
      return parseRows(r)[0] ?? null;
    }
    return localGet(sql, params);
  },

  all: async (sql, params = []) => {
    if (useTurso) {
      const r = await tursoExec(sql, params);
      return parseRows(r);
    }
    return localAll(sql, params);
  },

  getOwnerByBusinessCode: (code) =>
    database.get('SELECT * FROM owners WHERE business_code = ? LIMIT 1', [code.toUpperCase()]),

  getOwnerById: (id) =>
    database.get('SELECT * FROM owners WHERE id = ? LIMIT 1', [id]),

  createOwner: async (businessCode, password) => {
    const hash = await bcrypt.hash(password, 10);
    const r = await database.run(
      `INSERT INTO owners (business_code, password_hash, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))`,
      [businessCode.toUpperCase(), hash]
    );
    return { id: r.id, businessCode: businessCode.toUpperCase() };
  },

  updateOwnerPassword: async (ownerId, newPassword) => {
    const hash = await bcrypt.hash(newPassword, 10);
    return database.run(`UPDATE owners SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`, [hash, ownerId]);
  },

  getBusinessesByOwnerId: (ownerId) =>
    database.all('SELECT * FROM businesses WHERE owner_id = ? ORDER BY created_at DESC', [ownerId]),

  getBusinessById: (id) =>
    database.get('SELECT * FROM businesses WHERE id = ? LIMIT 1', [id]),

  close: () => localDb ? new Promise(r => localDb.close(r)) : Promise.resolve(),
};

module.exports = database;
