#!/usr/bin/env node
/**
 * verify-qr.js — prove a generated QR code will actually work before anyone prints it.
 *
 *   npm run qr:verify              decode every PNG, check it against the manifest
 *   npm run qr:verify -- --live    ALSO hit the live URL and check where it redirects
 *
 * This is the repeatable pre-print check. Run it every time codes are regenerated, and
 * again before sending anything to a printer. A QR code that ships wrong costs a reprint.
 *
 * Checks per campaign:
 *   1. PNG decodes (jsQR, a real scanner implementation) to EXACTLY the expected URL
 *   2. SVG has the module count the symbol should have — catches a stale/mismatched vector
 *   3. --live: the URL is reachable, Android gets a 302 to Google Play carrying the
 *      campaign, and desktop gets the Abierto landing page (never a dead store link)
 */

const fs = require('fs');
const path = require('path');
const jsQR = require('jsqr');
const { PNG } = require('pngjs');

const ROOT = path.join(__dirname, '..');
const OUT_ROOT = path.join(ROOT, 'marketing', 'qr');
const MANIFEST = path.join(OUT_ROOT, 'manifest.json');

const UA_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const UA_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const UA_DESKTOP =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// Tells the server not to log these as real scans — a pre-print check must not
// write fake campaign data into production. See trackClick() in routes/download.js.
const NO_TRACK = { 'X-Abierto-Check': '1' };

let failures = 0;
const pass = (msg) => console.log(`    ✓ ${msg}`);
const fail = (msg) => { failures++; console.log(`    ✗ ${msg}`); };

/** Decode a PNG QR code the way a phone camera would. */
function decodePng(file) {
  const png = PNG.sync.read(fs.readFileSync(file));
  const result = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  return result ? result.data : null;
}

/** Module count encoded in the SVG's viewBox (symbol size + both quiet zones). */
function svgModules(file) {
  const svg = fs.readFileSync(file, 'utf-8');
  const m = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  return m ? parseInt(m[1], 10) : null;
}

async function checkLive(entry) {
  const expectAndroid = async () => {
    const res = await fetch(entry.url, {
      redirect: 'manual',
      headers: { 'User-Agent': UA_ANDROID, ...NO_TRACK },
    });
    const loc = res.headers.get('location') || '';
    if (res.status !== 302) return fail(`live/android: expected 302, got ${res.status}`);
    if (!loc.includes('play.google.com')) return fail(`live/android: not sent to Play (${loc})`);
    if (!loc.includes(encodeURIComponent(`utm_campaign=${entry.campaign}`)))
      return fail(`live/android: campaign "${entry.campaign}" missing from Play referrer`);
    pass(`live/android → Google Play, attributed to "${entry.campaign}"`);
  };

  const expectIphone = async () => {
    const res = await fetch(entry.url, {
      redirect: 'manual',
      headers: { 'User-Agent': UA_IPHONE, ...NO_TRACK },
    });
    if (res.status === 302) {
      const loc = res.headers.get('location') || '';
      if (!loc.includes('apps.apple.com'))
        return fail(`live/iphone: redirected somewhere unexpected (${loc})`);
      return pass(`live/iphone → App Store`);
    }
    if (res.status !== 200) return fail(`live/iphone: expected 200 or 302, got ${res.status}`);
    const body = await res.text();
    if (body.includes('apps.apple.com'))
      return fail(`live/iphone: page contains an App Store link but no iOS app exists`);
    if (!/iPhone/i.test(body)) return fail(`live/iphone: not the iPhone page`);
    pass(`live/iphone → Abierto "coming soon" page (no dead store link)`);
  };

  const expectDesktop = async () => {
    const res = await fetch(entry.url, {
      redirect: 'manual',
      headers: { 'User-Agent': UA_DESKTOP, ...NO_TRACK },
    });
    if (res.status !== 200) return fail(`live/desktop: expected 200, got ${res.status}`);
    const body = await res.text();
    if (!body.includes('/download/android'))
      return fail(`live/desktop: landing page missing the Android option`);
    pass(`live/desktop → landing page`);
  };

  try {
    await expectAndroid();
    await expectIphone();
    await expectDesktop();
  } catch (err) {
    fail(`live: request failed — ${err.message}`);
  }
}

async function main() {
  const live = process.argv.includes('--live');

  if (!fs.existsSync(MANIFEST)) {
    console.error(`\n✗ No manifest at marketing/qr/manifest.json — run "npm run qr" first.\n`);
    process.exit(1);
  }

  const { baseUrl, codes } = JSON.parse(fs.readFileSync(MANIFEST, 'utf-8'));
  console.log(`\nVerifying ${codes.length} QR code(s) against ${baseUrl}`);
  if (live) console.log(`Live redirect checks: ON`);
  console.log('');

  for (const entry of codes) {
    console.log(`  ${entry.campaign}  (${entry.url})`);

    // 0. A code left over from a different base URL is the worst kind of print bug —
    //    it decodes perfectly and points at the wrong host.
    if (!entry.url.startsWith(baseUrl + '/')) {
      fail(`encodes a DIFFERENT base URL than the manifest (${baseUrl}) — regenerate`);
    }

    // 1. Every PNG must decode to exactly the expected URL.
    const pngs = entry.files.filter(f => f.endsWith('.png'));
    if (!pngs.length) fail('no PNG files listed in the manifest');
    for (const rel of pngs) {
      const file = path.join(ROOT, rel);
      if (!fs.existsSync(file)) { fail(`missing file: ${rel}`); continue; }
      let decoded;
      try {
        decoded = decodePng(file);
      } catch (err) {
        fail(`${path.basename(rel)}: could not read PNG — ${err.message}`);
        continue;
      }
      if (decoded === null) fail(`${path.basename(rel)}: DID NOT SCAN`);
      else if (decoded !== entry.url) fail(`${path.basename(rel)}: decodes to "${decoded}", expected "${entry.url}"`);
      else pass(`${path.basename(rel)} decodes to the correct URL`);
    }

    // 2. The vector (the file that actually goes to the printer) must match the symbol.
    const svgRel = entry.files.find(f => f.endsWith('.svg'));
    if (!svgRel) fail('no SVG file listed in the manifest');
    else {
      const svgFile = path.join(ROOT, svgRel);
      if (!fs.existsSync(svgFile)) fail(`missing file: ${svgRel}`);
      else {
        const expected = entry.modules + entry.quietZoneModules * 2;
        const actual = svgModules(svgFile);
        if (actual !== expected)
          fail(`${path.basename(svgRel)}: viewBox is ${actual} modules, expected ${expected} — regenerate`);
        else pass(`${path.basename(svgRel)} matches the symbol (${entry.modules}×${entry.modules} + ${entry.quietZoneModules}-module quiet zone)`);
      }
    }

    if (live) await checkLive(entry);
    console.log('');
  }

  if (failures) {
    console.log(`✗ ${failures} check(s) FAILED — do not print these.\n`);
    process.exit(1);
  }
  console.log(`✓ All checks passed. Safe to print.\n`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
