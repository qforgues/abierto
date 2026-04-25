const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../db/abierto.db');
const schemaPath = path.join(__dirname, '../db/schema.sql');

// Create db directory if it doesn't exist
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    } else {
        console.log('Connected to SQLite database at:', dbPath);
    }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON', (err) => {
    if (err) {
        console.error('Error enabling foreign keys:', err.message);
        process.exit(1);
    }
});

// Read and execute schema
fs.readFile(schemaPath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading schema file:', err.message);
        process.exit(1);
    }

    // Split schema into individual statements
    const statements = data.split(';').filter(stmt => stmt.trim());

    let completed = 0;
    statements.forEach((statement, index) => {
        db.run(statement + ';', (err) => {
            if (err) {
                console.error(`Error executing statement ${index + 1}:`, err.message);
                process.exit(1);
            }
            completed++;
            if (completed === statements.length) {
                console.log('✓ Database schema initialized successfully!');
                db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err.message);
                        process.exit(1);
                    }
                    process.exit(0);
                });
            }
        });
    });
});
