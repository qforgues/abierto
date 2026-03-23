const express = require('express');
const router = express.Router();

// Health check endpoint - returns basic status
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

module.exports = router;
