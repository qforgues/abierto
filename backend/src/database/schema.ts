import { Database } from 'sqlite3';

/**
 * Initialize database schema
 * @param db - SQLite database instance
 */
export function initializeSchema(db: Database): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create businesses table
      db.run(
        `CREATE TABLE IF NOT EXISTS businesses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          code TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        (err: Error | null) => {
          if (err) reject(err);
        }
      );

      // Create guest_codes table
      db.run(
        `CREATE TABLE IF NOT EXISTS guest_codes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          business_id INTEGER NOT NULL,
          code TEXT UNIQUE NOT NULL,
          created_at DATETIME NOT NULL,
          FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
        )`,
        (err: Error | null) => {
          if (err) reject(err);
        }
      );

      // Create photos table
      db.run(
        `CREATE TABLE IF NOT EXISTS photos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          business_id INTEGER NOT NULL,
          file_name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
        )`,
        (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  });
}
