const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5200' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/businesses', require('./routes/businesses'));
app.use('/api/businesses/:id/status', require('./routes/status'));
app.use('/api/businesses/:id/photos', require('./routes/photos'));
app.use('/api/businesses/:id/hours', require('./routes/hours'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/tiles', require('./routes/tiles'));

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => console.log(`Abierto backend running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
