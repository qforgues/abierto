const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, and WebP images allowed.'));
  },
});

function authCheck(req, res, businessId, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized.' });
  try {
    const user = jwt.verify(authHeader.slice(7), JWT_SECRET);
    if (user.role !== 'admin' && user.businessId !== parseInt(businessId)) {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    next(user);
  } catch {
    res.status(401).json({ error: 'Invalid token.' });
  }
}

// POST /api/businesses/:id/photos
router.post('/', (req, res) => {
  authCheck(req, res, req.params.id, async () => {
    const count = await db.get(
      'SELECT COUNT(*) as c FROM business_photos WHERE business_id = ?',
      [req.params.id]
    );
    if (count.c >= 3) {
      return res.status(400).json({ error: 'Maximum 3 photos per business.' });
    }

    upload.single('photo')(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

      const result = await db.run(
        'INSERT INTO business_photos (business_id, filename, sort_order) VALUES (?, ?, ?)',
        [req.params.id, req.file.filename, count.c]
      );

      res.status(201).json({
        id: result.lastID,
        filename: req.file.filename,
        sort_order: count.c,
      });
    });
  });
});

// DELETE /api/businesses/:id/photos/:photoId
router.delete('/:photoId', (req, res) => {
  authCheck(req, res, req.params.id, async () => {
    try {
      const photo = await db.get(
        'SELECT * FROM business_photos WHERE id = ? AND business_id = ?',
        [req.params.photoId, req.params.id]
      );
      if (!photo) return res.status(404).json({ error: 'Photo not found.' });

      const filePath = path.join(uploadDir, photo.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      await db.run('DELETE FROM business_photos WHERE id = ?', [req.params.photoId]);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error.' });
    }
  });
});

module.exports = router;
