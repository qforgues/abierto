const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const rateLimit = require('express-rate-limit');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per windowMs
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for general API requests
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// Database initialization
const dbPath = process.env.DB_PATH || path.join(__dirname, 'abierto.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    initializeDatabase();
  }
});

// Initialize database schema
function initializeDatabase() {
  db.serialize(() => {
    // Businesses table
    db.run(`
      CREATE TABLE IF NOT EXISTS businesses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Guest codes table
    db.run(`
      CREATE TABLE IF NOT EXISTS guest_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id INTEGER NOT NULL,
        guest_code TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        FOREIGN KEY (business_id) REFERENCES businesses(id)
      )
    `);

    // Photos table
    db.run(`
      CREATE TABLE IF NOT EXISTS photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id)
      )
    `);
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Helper function to generate business code
function generateBusinessCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  const length = Math.floor(Math.random() * 3) + 6; // 6-8 characters
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Helper function to generate guest code
function generateGuestCode() {
  const chars = '0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Helper function to verify JWT token
function verifyToken(req, res, next) {
  const token = req.cookies.authToken;
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.businessId = decoded.businessId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Create a new business
app.post('/api/businesses', async (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ error: 'Name and password are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  try {
    const businessCode = generateBusinessCode();
    const passwordHash = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO businesses (business_code, name, password_hash) VALUES (?, ?, ?)',
      [businessCode, name, passwordHash],
      function (err) {
        if (err) {
          console.error('Error creating business:', err);
          return res.status(500).json({ error: 'Failed to create business' });
        }

        const businessId = this.lastID;
        const token = jwt.sign({ businessId }, JWT_SECRET, { expiresIn: '7d' });

        res.cookie('authToken', token, {
          httpOnly: true,
          secure: NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.status(201).json({
          businessId,
          businessCode,
          name,
          message: 'Business created successfully',
        });
      }
    );
  } catch (err) {
    console.error('Error creating business:', err);
    res.status(500).json({ error: 'Failed to create business' });
  }
});

// Owner login
app.post('/api/login', loginLimiter, (req, res) => {
  const { businessCode, password } = req.body;

  if (!businessCode || !password) {
    return res.status(400).json({ error: 'Business code and password are required' });
  }

  db.get(
    'SELECT id, password_hash, name FROM businesses WHERE business_code = ?',
    [businessCode],
    async (err, row) => {
      if (err) {
        console.error('Error querying database:', err);
        return res.status(500).json({ error: 'Failed to authenticate' });
      }

      if (!row) {
        return res.status(401).json({ error: 'Invalid business code or password' });
      }

      try {
        const passwordMatch = await bcrypt.compare(password, row.password_hash);
        if (!passwordMatch) {
          return res.status(401).json({ error: 'Invalid business code or password' });
        }

        const token = jwt.sign({ businessId: row.id }, JWT_SECRET, { expiresIn: '7d' });

        res.cookie('authToken', token, {
          httpOnly: true,
          secure: NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.status(200).json({
          businessId: row.id,
          businessCode,
          name: row.name,
          message: 'Login successful',
        });
      } catch (err) {
        console.error('Error during authentication:', err);
        res.status(500).json({ error: 'Failed to authenticate' });
      }
    }
  );
});

// Generate guest code
app.post('/api/guest-codes', verifyToken, (req, res) => {
  const businessId = req.businessId;
  const guestCode = generateGuestCode();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  db.run(
    'INSERT INTO guest_codes (business_id, guest_code, expires_at) VALUES (?, ?, ?)',
    [businessId, guestCode, expiresAt.toISOString()],
    function (err) {
      if (err) {
        console.error('Error creating guest code:', err);
        return res.status(500).json({ error: 'Failed to create guest code' });
      }

      res.status(201).json({
        guestCode,
        expiresAt,
        message: 'Guest code created successfully',
      });
    }
  );
});

// Logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('authToken');
  res.status(200).json({ message: 'Logged out successfully' });
});

// Serve static files from the frontend build
const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendBuildPath));

// Fallback to index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});

module.exports = app;
