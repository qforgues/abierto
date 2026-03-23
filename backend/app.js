require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// ── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5200',          // Vite dev server
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
].filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));

// ── Body / cookie parsing ────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Uploaded files ───────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── API routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',                  require('./routes/apiAuth'));
app.use('/api/businesses',            require('./routes/businesses'));
app.use('/api/businesses/:id/status', require('./routes/status'));
app.use('/api/businesses/:id/photos', require('./routes/photos'));
app.use('/api/businesses/:id/hours',  require('./routes/hours'));
app.use('/api/analytics',             require('./routes/analytics'));
app.use('/api/notifications',         require('./routes/notifications'));
app.use('/api/contact',               require('./routes/contact'));
app.use('/api/settings',              require('./routes/settings'));
app.use('/api/subscriptions',         require('./routes/subscriptions'));
app.use('/api/webhooks',              require('./routes/webhooks'));

// ── Serve frontend build ─────────────────────────────────────────────────────
const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendBuildPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

// ── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`Abierto backend running on port ${PORT}`);
});

module.exports = app;
