const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const { requireBusinessAccess } = require('../middleware/auth');
const { fileUploadRateLimiter } = require('../middleware/rateLimiter');

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
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type. Only JPEG and PNG images allowed.'));
  },
});

function authCheck(req, res, businessId, next) {
  const user = requireBusinessAccess(req, res, businessId);
  if (!user) return null;
  return next(user);
}

// POST /api/businesses/:id/photos
router.post('/', fileUploadRateLimiter, (req, res) => {
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

// PATCH /api/businesses/:id/photos/:photoId/main
router.patch('/:photoId/main', (req, res) => {
  authCheck(req, res, req.params.id, async () => {
    try {
      const photos = await db.all(
        'SELECT id FROM business_photos WHERE business_id = ? ORDER BY sort_order ASC',
        [req.params.id]
      );
      const photoId = parseInt(req.params.photoId);
      const ordered = [photoId, ...photos.map(p => p.id).filter(id => id !== photoId)];
      for (let i = 0; i < ordered.length; i++) {
        await db.run('UPDATE business_photos SET sort_order = ? WHERE id = ?', [i, ordered[i]]);
      }
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Server error.' });
    }
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
      res.status(500).json({ error: err.message || 'Server error.' });
    }
  });
});

module.exports = router;
