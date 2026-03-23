const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initializeDatabase } = require('./db/database');
const { abuseLoggingMiddleware } = require('./middleware/abuseLogging');
const { payloadSizeLimitMiddleware } = require('./middleware/payloadSizeLimit');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5200' }));
app.use(payloadSizeLimitMiddleware);
app.use(abuseLoggingMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/businesses', require('./routes/businesses'));
app.use('/api/businesses/:id/status', require('./routes/status'));
app.use('/api/businesses/:id/photos', require('./routes/photos'));
app.use('/api/businesses/:id/hours', require('./routes/hours'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/tiles', require('./routes/tiles'));

const frontendDistPath = path.resolve(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/tiles')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => console.log(`Abierto backend running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
