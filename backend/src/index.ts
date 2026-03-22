import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import { createApp } from './app';
import { initializeSchema } from './database/schema';

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, '../data/abierto.db');

// Initialize database
const db = new sqlite3.Database(DB_PATH, (err: Error | null) => {
  if (err) {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

// Initialize schema
initializeSchema(db)
  .then(() => {
    console.log('Database schema initialized');

    // Create Express app
    const app = createApp(db);

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database schema:', err);
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  db.close((err: Error | null) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});
