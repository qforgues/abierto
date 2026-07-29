#!/usr/bin/env node
/**
 * generate-qr.js — mechanically generate Abierto campaign QR codes.
 *
 * QR codes are generated deterministically by the `qrcode` library (Reed-Solomon, per the
 * ISO/IEC 18004 spec). Never draw one by hand or with an image model — the same input
 * must always produce the same, provably-scannable code.
 *
 *   npm run qr                    regenerate every campaign
 *   npm run qr -- ceiba-ferry     regenerate one campaign
 *   npm run qr -- --list          list campaigns without writing anything
 *
 * Campaign slugs come from backend/config/appLinks.js — that registry is the single
 * source of truth, so a QR code can never encode a campaign the server doesn't know.
 *
 * Output → marketing/qr/<campaign>/
 *   abierto-<campaign>.svg          vector, for print (send this to the printer)
 *   abierto-<campaign>-1024.png     web / preview
 *   abierto-<campaign>-2048.png     high-resolution raster fallback
 *
 * Verify what you generated before printing:  npm run qr:verify
 */

const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const { CAMPAIGNS } = require('../backend/config/appLinks');

// The permanent, Abierto-controlled base. Never a store URL.
const BASE_URL = (process.env.QR_BASE_URL || 'https://abierto.app').replace(/\/+$/, '');
const OUT_ROOT = path.join(__dirname, '..', 'marketing', 'qr');

// ── Print settings ────────────────────────────────────────────────────────────
const QR_OPTIONS = {
  // 'Q' = 25% error correction. Enough for scuffed, sun-faded, salt-sprayed ferry-terminal
  // print (and for centring a logo later) without inflating the module count so much that
  // the code gets hard to scan from a distance.
  errorCorrectionLevel: 'Q',
  // 4 modules is the ISO-mandated minimum quiet zone. Printers crop; do not go lower.
  margin: 4,
  // Pure black on pure white. Brand-coloured QR codes scan measurably worse under bad
  // lighting — the logo goes next to the code on the poster, not inside it.
  color: { dark: '#000000ff', light: '#ffffffff' },
};

const PNG_SIZES = [1024, 2048];

/** The URL a campaign's QR code encodes. Short path form keeps the code low-density. */
function campaignUrl(slug) {
  return `${BASE_URL}/go/${slug}`;
}

async function generate(slug) {
  const url = campaignUrl(slug);
  const dir = path.join(OUT_ROOT, slug);
  fs.mkdirSync(dir, { recursive: true });

  const files = [];

  const svgPath = path.join(dir, `abierto-${slug}.svg`);
  fs.writeFileSync(svgPath, await QRCode.toString(url, { ...QR_OPTIONS, type: 'svg' }));
  files.push(path.relative(path.join(__dirname, '..'), svgPath));

  for (const width of PNG_SIZES) {
    const pngPath = path.join(dir, `abierto-${slug}-${width}.png`);
    await QRCode.toFile(pngPath, url, { ...QR_OPTIONS, type: 'png', width });
    files.push(path.relative(path.join(__dirname, '..'), pngPath));
  }

  // Symbol metadata, so the manifest records exactly what was printed.
  const symbol = QRCode.create(url, { errorCorrectionLevel: QR_OPTIONS.errorCorrectionLevel });

  return {
    campaign: slug,
    label: CAMPAIGNS[slug]?.label || slug,
    url,
    qrVersion: symbol.version,
    modules: symbol.modules.size,
    errorCorrectionLevel: QR_OPTIONS.errorCorrectionLevel,
    quietZoneModules: QR_OPTIONS.margin,
    files,
  };
}

async function main() {
  const args = process.argv.slice(2).filter(a => a !== '--');

  if (args.includes('--list')) {
    console.log('\nAbierto campaigns\n');
    for (const [slug, meta] of Object.entries(CAMPAIGNS)) {
      console.log(`  ${slug.padEnd(16)} ${campaignUrl(slug).padEnd(40)} ${meta.label}`);
    }
    console.log('');
    return;
  }

  const requested = args.filter(a => !a.startsWith('-'));
  const unknown = requested.filter(s => !Object.hasOwn(CAMPAIGNS, s));
  if (unknown.length) {
    console.error(`\n✗ Unknown campaign(s): ${unknown.join(', ')}`);
    console.error(`  Add them to backend/config/appLinks.js first, then re-run.`);
    console.error(`  Known: ${Object.keys(CAMPAIGNS).join(', ')}\n`);
    process.exit(1);
  }

  // 'direct' is the fallback bucket for untagged traffic — it has no printed artefact.
  const targets = requested.length
    ? requested
    : Object.keys(CAMPAIGNS).filter(s => s !== 'direct');

  console.log(`\nGenerating QR codes → ${BASE_URL}\n`);

  const results = [];
  for (const slug of targets) {
    const result = await generate(slug);
    results.push(result);
    console.log(
      `  ✓ ${slug.padEnd(16)} ${result.url.padEnd(40)} v${result.qrVersion} (${result.modules}×${result.modules} modules)`
    );
  }

  fs.mkdirSync(OUT_ROOT, { recursive: true });
  const manifestPath = path.join(OUT_ROOT, 'manifest.json');

  // Merge with any existing manifest so regenerating one campaign doesn't drop the rest.
  let existing = [];
  try {
    const prev = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    existing = prev.codes || [];
    if (prev.baseUrl && prev.baseUrl !== BASE_URL) {
      console.log(
        `\n  ⚠ Base URL changed: ${prev.baseUrl} → ${BASE_URL}\n` +
        `    ${existing.filter(e => !results.some(r => r.campaign === e.campaign)).length} untouched code(s) still point at the old base.\n` +
        `    Run "npm run qr" with no arguments to regenerate everything.`
      );
    }
  } catch (_) {}
  const merged = [
    ...existing.filter(e => !results.some(r => r.campaign === e.campaign)),
    ...results,
  ].sort((a, b) => a.campaign.localeCompare(b.campaign));

  fs.writeFileSync(
    manifestPath,
    JSON.stringify({ baseUrl: BASE_URL, codes: merged }, null, 2) + '\n'
  );

  console.log(`\n  ${results.length} code(s) written to marketing/qr/`);
  console.log(`  Manifest: marketing/qr/manifest.json`);
  console.log(`\n  Next: npm run qr:verify        (decode check)`);
  console.log(`        npm run qr:verify -- --live  (also check the live redirects)\n`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
