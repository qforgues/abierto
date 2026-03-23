/**
 * sqlite3-compat.js
 * Drop-in replacement for the `sqlite3` module using `sql.js` (pure JS).
 * Provides the same callback-based API that server.js expects:
 *   new Database(path, cb), db.serialize(fn), db.run(), db.get(), db.close()
 */
const initSqlJs = require('sql.js');
const fs = require('fs');

class Database {
  constructor(dbPath, callback) {
    this._dbPath = dbPath;
    this._db = null;
    this._ready = false;

    initSqlJs().then((SQL) => {
      try {
        let buffer = null;
        if (fs.existsSync(dbPath)) {
          buffer = fs.readFileSync(dbPath);
        }
        this._db = buffer ? new SQL.Database(buffer) : new SQL.Database();
        this._ready = true;
        if (callback) callback(null);
      } catch (err) {
        if (callback) callback(err);
      }
    }).catch((err) => {
      if (callback) callback(err);
    });
  }

  _persist() {
    if (this._db && this._dbPath) {
      try {
        const data = this._db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(this._dbPath, buffer);
      } catch (e) {
        console.error('Error persisting database:', e);
      }
    }
  }

  serialize(fn) {
    // sql.js is synchronous, so serialize is just "run it now"
    if (fn) fn();
  }

  run(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    params = params || [];

    try {
      this._db.run(sql, params);
      // Emulate `this.lastID` and `this.changes` for the callback context
      const lastID = this._db.exec("SELECT last_insert_rowid() as id")[0]?.values[0]?.[0] || 0;
      const changes = this._db.getRowsModified();
      this._persist();
      if (callback) callback.call({ lastID, changes }, null);
    } catch (err) {
      if (callback) callback.call({}, err);
    }
  }

  get(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    params = params || [];

    try {
      const stmt = this._db.prepare(sql);
      stmt.bind(params);
      let row = null;
      if (stmt.step()) {
        const cols = stmt.getColumnNames();
        const vals = stmt.get();
        row = {};
        cols.forEach((col, i) => { row[col] = vals[i]; });
      }
      stmt.free();
      if (callback) callback(null, row);
    } catch (err) {
      if (callback) callback(err, null);
    }
  }

  all(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    params = params || [];

    try {
      const results = this._db.exec(sql);
      const rows = [];
      if (results.length > 0) {
        const cols = results[0].columns;
        for (const vals of results[0].values) {
          const row = {};
          cols.forEach((col, i) => { row[col] = vals[i]; });
          rows.push(row);
        }
      }
      if (callback) callback(null, rows);
    } catch (err) {
      if (callback) callback(err, []);
    }
  }

  close(callback) {
    try {
      if (this._db) {
        this._persist();
        this._db.close();
      }
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }
}

module.exports = { Database, verbose: () => ({ Database }) };
