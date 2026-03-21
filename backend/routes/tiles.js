const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const tilesDir = path.join(__dirname, '../tiles');

// GET /tiles/:z/:x/:y.png
router.get('/:z/:x/:y.png', (req, res) => {
  const { z, x, y } = req.params;
  const filePath = path.join(tilesDir, z, x, `${y}.png`);

  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=604800');
    return res.sendFile(filePath);
  }

  // Fall back to live OSM tile if not cached
  res.redirect(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`);
});

module.exports = router;
