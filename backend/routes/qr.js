/**
 * qr.js — admin-facing QR Code Library.
 *
 * The generated codes live in marketing/qr/ in the repo, which is fine for engineers and
 * useless for anyone else. This exposes them in the admin dashboard with plain-language
 * names, where each code is meant to be used, and one-click downloads.
 *
 * Downloads are renamed to something a human can file: abierto-qr-ceiba-ferry.svg.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireAdmin } = require('../middleware/auth');
const { CAMPAIGNS, androidUrlFor, iosAppExists } = require('../config/appLinks');

const router = express.Router();

const QR_ROOT = path.join(__dirname, '..', '..', 'marketing', 'qr');
const BASE_URL = (process.env.PUBLIC_BASE_URL || 'https://abierto.app').replace(/\/+$/, '');

/** Files on disk for one campaign, if they've been generated. */
function assetsFor(slug) {
  const dir = path.join(QR_ROOT, slug);
  const svg = path.join(dir, `abierto-${slug}.svg`);
  const png1024 = path.join(dir, `abierto-${slug}-1024.png`);
  const png2048 = path.join(dir, `abierto-${slug}-2048.png`);
  return {
    svg:     fs.existsSync(svg)     ? svg     : null,
    png1024: fs.existsSync(png1024) ? png1024 : null,
    png2048: fs.existsSync(png2048) ? png2048 : null,
  };
}

/** What a scan of this code does right now, in plain language. */
function behaviour() {
  return {
    android: 'Google Play (campaign attribution attached)',
    ios: iosAppExists()
      ? 'Apple App Store'
      : 'Abierto “iPhone version coming” page — never a dead App Store link',
    desktop: 'Abierto download landing page',
    alreadyHadApp: 'Opens straight into Abierto — not counted as a new download',
  };
}

/**
 * GET /api/qr — admin only. Everything the library UI needs.
 */
router.get('/', requireAdmin, (req, res) => {
  let manifest = {};
  try {
    const m = JSON.parse(fs.readFileSync(path.join(QR_ROOT, 'manifest.json'), 'utf-8'));
    for (const c of m.codes || []) manifest[c.campaign] = c;
  } catch (_) {}

  const codes = Object.entries(CAMPAIGNS)
    .filter(([, meta]) => meta.printable !== false)
    .map(([slug, meta]) => {
      const files = assetsFor(slug);
      const spec = manifest[slug];
      return {
        campaign: slug,
        label: meta.label,
        usage: meta.usage,
        note: meta.note,
        url: `${BASE_URL}/go/${slug}`,
        playUrl: androidUrlFor(slug),
        behaviour: behaviour(),
        downloads: {
          svg:     files.svg     ? `/api/qr/${slug}/svg`     : null,
          png1024: files.png1024 ? `/api/qr/${slug}/png1024` : null,
          png2048: files.png2048 ? `/api/qr/${slug}/png2048` : null,
        },
        filenames: {
          svg:     `abierto-qr-${slug}.svg`,
          png1024: `abierto-qr-${slug}-1024.png`,
          png2048: `abierto-qr-${slug}-2048.png`,
        },
        spec: spec
          ? {
              qrVersion: spec.qrVersion,
              modules: spec.modules,
              errorCorrectionLevel: spec.errorCorrectionLevel,
              quietZoneModules: spec.quietZoneModules,
            }
          : null,
        generated: !!files.svg,
      };
    });

  res.json({ baseUrl: BASE_URL, iosAppExists: iosAppExists(), codes });
});

const FORMATS = {
  svg:     { suffix: '.svg',      type: 'image/svg+xml' },
  png1024: { suffix: '-1024.png', type: 'image/png' },
  png2048: { suffix: '-2048.png', type: 'image/png' },
};

/**
 * GET /api/qr/:campaign/:format — admin only, downloads one asset.
 *
 * Both path segments are validated against fixed allow-lists (the campaign registry and
 * FORMATS) before touching the filesystem, so neither can be used to walk out of
 * marketing/qr/ — a `..` or an absolute path simply isn't a known campaign.
 */
router.get('/:campaign/:format', requireAdmin, (req, res) => {
  const { campaign, format } = req.params;

  if (!Object.hasOwn(CAMPAIGNS, campaign) || CAMPAIGNS[campaign].printable === false) {
    return res.status(404).json({ error: 'Unknown campaign.' });
  }
  if (!Object.hasOwn(FORMATS, format)) {
    return res.status(404).json({ error: 'Unknown format.' });
  }

  const { suffix, type } = FORMATS[format];
  const file = path.join(QR_ROOT, campaign, `abierto-${campaign}${suffix}`);
  if (!fs.existsSync(file)) {
    return res.status(404).json({ error: 'Not generated yet — run "npm run qr".' });
  }

  // Human-readable download name, not the repo's internal one.
  const downloadName = `abierto-qr-${campaign}${suffix === '.svg' ? '.svg' : suffix}`;
  res.type(type);
  res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
  res.sendFile(file);
});

module.exports = router;
