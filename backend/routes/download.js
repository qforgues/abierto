/**
 * download.js — the permanent Abierto acquisition endpoint.
 *
 * Printed QR codes point HERE (never at Google Play / the App Store directly), so
 * destinations and tracking can change forever without reprinting physical material.
 *
 *   GET /download            canonical, campaign via ?src=
 *   GET /go/:campaign        short print-friendly form  (abierto.app/go/ceiba-ferry)
 *   GET /go, /app, /get      aliases of /download
 *   GET /download/android    explicit "I have Android" choice from the landing page
 *   GET /download/ios        explicit "I have iPhone" choice
 *   GET /download/web        explicit "just use the website" choice
 *
 * Mounted at the app root in app.js BEFORE express.static + the SPA `*` fallback,
 * otherwise React Router would swallow these paths and render the 404 page.
 */

const express = require('express');
const crypto = require('crypto');
const db = require('../db/database');
const {
  CAMPAIGNS,
  WEB_APP_URL,
  normalizeCampaign,
  detectPlatform,
  androidUrlFor,
  iosUrlFor,
  iosAppExists,
} = require('../config/appLinks');

const router = express.Router();

// ── Tracking ──────────────────────────────────────────────────────────────────

/** Vieques is AST (UTC-4) year-round — no DST. Matches routes/analytics.js. */
function getViequesDate() {
  return new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * Record one download-endpoint hit. Fire-and-forget by design: this is called AFTER the
 * response is already sent, and it swallows every error. A tracking problem must never
 * be able to break somebody's download.
 */
async function trackClick({ campaign, platform, destination, req }) {
  try {
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      '';
    const salt = process.env.JWT_SECRET || 'abierto-analytics-salt';
    const ipHash = crypto.createHash('sha256').update(ip + salt).digest('hex').slice(0, 16);

    // Referrer without its query string — we want "where from", not what they searched.
    let referer = req.headers.referer || req.headers.referrer || null;
    if (typeof referer === 'string') referer = referer.split('?')[0].slice(0, 200);
    else referer = null;

    await db.run(
      `INSERT INTO download_clicks (campaign, platform, destination, date, ip_hash, referer)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [campaign, platform, destination, getViequesDate(), ipHash, referer]
    );
  } catch (_) {
    // Intentionally silent.
  }
}

// ── Response helpers ──────────────────────────────────────────────────────────

/**
 * The same URL returns different things per device, and the destination must be
 * changeable at any moment. `no-store` + `Vary` keeps Cloudflare, the browser and any
 * middlebox from pinning an answer. 302 (never 301) for the same reason.
 */
function noCache(res) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.set('Vary', 'User-Agent');
}

function redirectTo(res, url) {
  noCache(res);
  res.redirect(302, url);
}

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// ── Shared page shell ─────────────────────────────────────────────────────────
// Deliberately server-rendered, self-contained and tiny: these pages get opened on
// ferry wifi and hotel wifi, so they must paint before React could ever boot.

function page({ title, body }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="theme-color" content="#0d9488">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" href="/icon-192.png">
<style>
  :root{--ocean:#0d9488;--turquoise:#2dd4bf;--dark:#134e4a;--mid:#64748b}
  *{box-sizing:border-box}
  body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
    background:linear-gradient(170deg,#f0fdfa 0%,#ffffff 55%);color:var(--dark);
    min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .wrap{width:100%;max-width:420px;text-align:center}
  .logo{width:96px;height:auto;margin:0 auto 18px}
  h1{font-size:1.5rem;line-height:1.25;margin:0 0 8px}
  p{color:var(--mid);line-height:1.55;margin:0 0 18px;font-size:0.98rem}
  .btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;
    padding:15px 18px;border-radius:14px;font-size:1rem;font-weight:700;
    text-decoration:none;margin-bottom:11px;border:2px solid transparent;
    -webkit-tap-highlight-color:transparent}
  .btn-primary{background:var(--ocean);color:#fff;box-shadow:0 6px 18px rgba(13,148,136,.28)}
  .btn-secondary{background:#fff;color:var(--dark);border-color:#cbd5e1}
  .btn svg{flex-shrink:0}
  .note{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px 16px;
    text-align:left;font-size:0.88rem;color:var(--mid);line-height:1.5;margin-bottom:11px}
  .note strong{color:var(--dark)}
  .foot{margin-top:22px;font-size:0.78rem;color:#94a3b8}
  .foot a{color:#94a3b8}
</style>
</head>
<body><div class="wrap">
<img class="logo" src="/logo-solo.png" alt="Abierto">
${body}
<div class="foot"><a href="/privacy">Privacy</a> &middot; abierto.app</div>
</div></body></html>`;
}

const ANDROID_ICON =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 20.5v-9a1.5 1.5 0 013 0v9a1.5 1.5 0 01-3 0zm15 0v-9a1.5 1.5 0 013 0v9a1.5 1.5 0 01-3 0zM6.5 8.5h11v10a1.5 1.5 0 01-1.5 1.5h-1v2a1.5 1.5 0 01-3 0v-2h-1v2a1.5 1.5 0 01-3 0v-2H8a1.5 1.5 0 01-1.5-1.5v-10zM8.9 3.2l-.9-1.5a.4.4 0 01.7-.4l.9 1.6a7 7 0 014.8 0l.9-1.6a.4.4 0 01.7.4l-.9 1.5A5.6 5.6 0 0117.5 7.5h-11A5.6 5.6 0 018.9 3.2zM9.5 5.4a.6.6 0 100 1.2.6.6 0 000-1.2zm5 0a.6.6 0 100 1.2.6.6 0 000-1.2z"/></svg>';

const APPLE_ICON =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.4 12.7c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.6.9-.8 0-1.9-.9-3.1-.8-1.6 0-3.1.9-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.5.8 1.1 1.7 2.4 3 2.4 1.2 0 1.6-.8 3.1-.8 1.4 0 1.8.8 3.1.7 1.3 0 2.1-1.1 2.9-2.3.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.6-1-2.6-3.7zM14 4.9c.7-.8 1.1-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z"/></svg>';

const GLOBE_ICON =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18"/></svg>';

const q = (campaign) => `?src=${encodeURIComponent(campaign)}`;

/** Desktop / unknown-device landing page. */
function landingPage(campaign) {
  const iosLive = iosAppExists();
  return page({
    title: "Get Abierto — What's Open in Vieques",
    body: `
<h1>Get Abierto</h1>
<p>See which businesses on Vieques are <strong>open right now</strong>.</p>
<a class="btn btn-primary" href="/download/android${q(campaign)}">${ANDROID_ICON} Download for Android</a>
${
  iosLive
    ? `<a class="btn btn-secondary" href="/download/ios${q(campaign)}">${APPLE_ICON} Download for iPhone</a>`
    : `<div class="note"><strong>iPhone —</strong> the App Store version is on the way. In the meantime, open abierto.app in Safari and tap <strong>Share &rarr; Add to Home Screen</strong> to get the app icon on your phone.</div>`
}
<a class="btn btn-secondary" href="/download/web${q(campaign)}">${GLOBE_ICON} Use Abierto on the web</a>`,
  });
}

/** iPhone visitors, while there is no iOS app. Never a dead App Store link. */
function iosComingSoonPage(campaign) {
  return page({
    title: 'Abierto for iPhone',
    body: `
<h1>Abierto for iPhone is coming</h1>
<p>The App Store version isn't out yet — but Abierto works on your iPhone right now, and you can add it to your home screen so it opens just like an app.</p>
<div class="note">
  <strong>Add it to your home screen</strong><br>
  1. Tap the <strong>Share</strong> button at the bottom of Safari<br>
  2. Choose <strong>Add to Home Screen</strong><br>
  3. Tap <strong>Add</strong>
</div>
<a class="btn btn-primary" href="/download/web${q(campaign)}">${GLOBE_ICON} Open Abierto now</a>
<a class="btn btn-secondary" href="/download/android${q(campaign)}">${ANDROID_ICON} I have an Android instead</a>`,
  });
}

// ── Core handler ──────────────────────────────────────────────────────────────

/**
 * Route a visitor by device, then record what happened.
 * @param {string} forced - force a destination regardless of device ('android'|'ios'|'web')
 */
function handleDownload(req, res, { campaignOverride, forced } = {}) {
  const { campaign } = normalizeCampaign(
    campaignOverride ?? req.query.src ?? req.query.utm_source
  );
  const platform = detectPlatform(req.headers['user-agent']);
  // A forced route means they tapped a button on our landing page, not scanned a code.
  const medium = forced ? 'web' : 'qr';

  let destination;
  let send;

  const target = forced || platform;

  if (target === 'android') {
    destination = forced ? 'play_manual' : 'play';
    send = () => redirectTo(res, androidUrlFor(campaign, medium));
  } else if (target === 'ios') {
    const iosUrl = iosUrlFor(campaign);
    if (iosUrl) {
      destination = forced ? 'ios_store_manual' : 'ios_store';
      send = () => redirectTo(res, iosUrl);
    } else {
      destination = 'ios_coming_soon';
      send = () => {
        noCache(res);
        res.status(200).type('html').send(iosComingSoonPage(campaign));
      };
    }
  } else if (target === 'web') {
    destination = 'web_app';
    send = () => redirectTo(res, WEB_APP_URL);
  } else {
    // desktop, other, and bots all get the landing page — a bot following the redirect
    // to Google Play would otherwise pollute Play's referrer attribution.
    destination = 'landing';
    send = () => {
      noCache(res);
      res.status(200).type('html').send(landingPage(campaign));
    };
  }

  send();

  // Response is already out the door — tracking happens after, and can't affect it.
  trackClick({ campaign, platform, destination, req });
}

// ── Routes ────────────────────────────────────────────────────────────────────

// Canonical + aliases. All the same handler (no extra redirect hop for the visitor).
router.get(['/download', '/app', '/get', '/go'], (req, res) => handleDownload(req, res));

// Short print form: abierto.app/go/ceiba-ferry
router.get('/go/:campaign', (req, res) =>
  handleDownload(req, res, { campaignOverride: req.params.campaign })
);

// Explicit choices from the landing page.
const forcedRoute = (forced) => (req, res) => {
  res.set('X-Robots-Tag', 'noindex');
  handleDownload(req, res, { forced });
};
router.get('/download/android', forcedRoute('android'));
router.get('/download/ios', forcedRoute('ios'));
router.get('/download/web', forcedRoute('web'));

/**
 * GET /download/status — public, no auth: what would this endpoint do right now?
 * Used by scripts/verify-qr.js and handy for a quick production sanity check.
 */
router.get('/download/status', (req, res) => {
  noCache(res);
  res.json({
    ok: true,
    androidDestination: androidUrlFor('status-check'),
    iosAppExists: iosAppExists(),
    iosDestination: iosUrlFor('status-check'),
    webDestination: WEB_APP_URL,
    campaigns: Object.keys(CAMPAIGNS),
  });
});

module.exports = router;
module.exports.trackClick = trackClick;
module.exports.getViequesDate = getViequesDate;
