require('dotenv').config();
const { createClient } = require('@libsql/client');
const bcrypt = require('bcrypt');
const path = require('path');

// Use Turso in production, local SQLite file in dev
const url = process.env.TURSO_DATABASE_URL
  || `file:${path.join(__dirname, 'abierto.db')}`;
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

const client = createClient({ url, authToken });

console.log('DB:', url.startsWith('file:') ? 'local SQLite' : 'Turso cloud');

// Convert a libsql Row (array-like) to a plain JS object
function toObj(row, columns) {
  const obj = {};
  for (let i = 0; i < columns.length; i++) {
    obj[columns[i]] = row[i];
  }
  return obj;
}

const database = {
  run: async (sql, params = []) => {
    const result = await client.execute({ sql, args: params });
    return {
      id:      Number(result.lastInsertRowid ?? 0),
      lastID:  Number(result.lastInsertRowid ?? 0),
      changes: result.rowsAffected ?? 0,
    };
  },

  get: async (sql, params = []) => {
    const result = await client.execute({ sql, args: params });
    if (!result.rows || result.rows.length === 0) return null;
    return toObj(result.rows[0], result.columns);
  },

  all: async (sql, params = []) => {
    const result = await client.execute({ sql, args: params });
    if (!result.rows) return [];
    return result.rows.map(row => toObj(row, result.columns));
  },

  getOwnerByBusinessCode: async (businessCode) =>
    database.get('SELECT * FROM owners WHERE business_code = ? LIMIT 1', [businessCode.toUpperCase()]),

  getOwnerById: async (id) =>
    database.get('SELECT * FROM owners WHERE id = ? LIMIT 1', [id]),

  createOwner: async (businessCode, password) => {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await database.run(
      `INSERT INTO owners (business_code, password_hash, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))`,
      [businessCode.toUpperCase(), passwordHash]
    );
    return { id: result.id, businessCode: businessCode.toUpperCase() };
  },

  updateOwnerPassword: async (ownerId, newPassword) => {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    return database.run(`UPDATE owners SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`, [passwordHash, ownerId]);
  },

  getBusinessesByOwnerId: async (ownerId) =>
    database.all('SELECT * FROM businesses WHERE owner_id = ? ORDER BY created_at DESC', [ownerId]),

  getBusinessById: async (businessId) =>
    database.get('SELECT * FROM businesses WHERE id = ? LIMIT 1', [businessId]),

  createBusiness: async (ownerId, businessData) => {
    const { name, description, category } = businessData;
    const result = await database.run(
      `INSERT INTO businesses (owner_id, name, description, category, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [ownerId, name, description || null, category || null]
    );
    return { id: result.id, ...businessData };
  },

  close: async () => client.close(),
};

module.exports = database;
