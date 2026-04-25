const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../db/abierto.db');

// Confirm before deleting
if (process.env.NODE_ENV === 'production') {
    console.error('❌ Cannot reset database in production environment!');
    process.exit(1);
}

if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('✓ Database file deleted:', dbPath);
} else {
    console.log('Database file does not exist:', dbPath);
}

// Run init script
const initScript = path.join(__dirname, 'initDatabase.js');
require(initScript);
