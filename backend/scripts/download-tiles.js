/**
 * Downloads OSM tiles for Vieques, PR for offline use.
 * Run once: node scripts/download-tiles.js
 * Tiles saved to backend/tiles/{z}/{x}/{y}.png
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const BOUNDS = { minLat: 17.9, maxLat: 18.2, minLon: -65.65, maxLon: -65.20 };
const MIN_ZOOM = 10;
const MAX_ZOOM = 15;
const DELAY_MS = 250; // be polite to OSM tile server
const TILES_DIR = path.join(__dirname, '../tiles');

function latLonToTile(lat, lon, z) {
  const n = Math.pow(2, z);
  const x = Math.floor((lon + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = https.get(url, { headers: { 'User-Agent': 'AbiertApp/2.0 (vieques-local)' } }, (res) => {
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    });
    req.on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  let total = 0;
  let skipped = 0;
  let downloaded = 0;
  let errors = 0;

  for (let z = MIN_ZOOM; z <= MAX_ZOOM; z++) {
    const { x: xMin, y: yMax } = latLonToTile(BOUNDS.minLat, BOUNDS.minLon, z);
    const { x: xMax, y: yMin } = latLonToTile(BOUNDS.maxLat, BOUNDS.maxLon, z);

    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        total++;
        const dir = path.join(TILES_DIR, String(z), String(x));
        const dest = path.join(dir, `${y}.png`);

        if (fs.existsSync(dest)) { skipped++; continue; }

        fs.mkdirSync(dir, { recursive: true });
        const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

        try {
          await download(url, dest);
          downloaded++;
          process.stdout.write(`\rDownloaded ${downloaded} tiles (${errors} errors, ${skipped} skipped)...`);
          await sleep(DELAY_MS);
        } catch (err) {
          errors++;
          console.error(`\nFailed: ${url} — ${err.message}`);
        }
      }
    }
  }

  console.log(`\nDone! Total: ${total}, Downloaded: ${downloaded}, Skipped: ${skipped}, Errors: ${errors}`);
}

main().catch(console.error);
