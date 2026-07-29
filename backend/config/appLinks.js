/**
 * appLinks.js — SINGLE SOURCE OF TRUTH for where /download sends people.
 *
 * The whole point of the /download system is that **printed QR codes never point at a
 * store URL**. They point at abierto.app, and this file decides where that goes. When the
 * iPhone app ships, change ONE value here (or set the IOS_APP_STORE_URL env var on Render)
 * and every QR code already in the wild starts working — no reprinting.
 */

// ── Store destinations ────────────────────────────────────────────────────────
// Env vars win so a destination can change on Render without a code deploy.

const ANDROID_STORE_URL =
  process.env.ANDROID_PLAY_URL ||
  'https://play.google.com/store/apps/details?id=com.abierto.app';

// ⬇⬇ THE ONE VALUE TO CHANGE WHEN THE iPHONE APP LAUNCHES ⬇⬇
// Leave null while there is no iOS app — null makes /download show the Abierto-controlled
// "iPhone version coming" page instead of a dead App Store link.
// When the app is live, set it to e.g. 'https://apps.apple.com/us/app/abierto/id0000000000'
// (or just set IOS_APP_STORE_URL on Render and restart).
const IOS_STORE_URL = process.env.IOS_APP_STORE_URL || null;

// Where "just use the web app" sends people.
const WEB_APP_URL = process.env.WEB_APP_URL || '/vieques';

// ── Campaign registry ─────────────────────────────────────────────────────────
// Known campaigns get a human label in the admin dashboard and a generated QR code.
// Unknown-but-valid slugs are still tracked (so a new poster works before this list is
// updated) — they're just flagged as unregistered.

const CAMPAIGNS = {
  'ceiba-ferry':   { label: 'Ceiba Ferry Terminal',        roadmapStep: 2 },
  'vieques-ferry': { label: 'Vieques Ferry Arrival',       roadmapStep: 4 },
  'ferry-wifi':    { label: 'Abierto Free Ferry Wi-Fi',    roadmapStep: 3 },
  'business':      { label: 'Participating Business',      roadmapStep: 5 },
  'business-card': { label: 'Business Card',               roadmapStep: 5 },
  'lodging':       { label: 'Lodging / Airbnb / Guesthouse', roadmapStep: 6 },
  'transport':     { label: 'Rental / Taxi Partner',       roadmapStep: 6 },
  'social':        { label: 'Social / General',            roadmapStep: 8 },
  'direct':        { label: 'Direct (no campaign tag)',    roadmapStep: null },
};

const DEFAULT_CAMPAIGN = 'direct';

// ── Campaign sanitising ───────────────────────────────────────────────────────
// Anything arriving from a URL is hostile until proven otherwise. Everything is
// parameterised at the SQL layer too, but we still bound charset + length so garbage
// can never reach the database or get reflected into HTML.

const CAMPAIGN_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/;

/**
 * Normalise a raw ?src= value into a safe campaign slug.
 * @returns {{ campaign: string, known: boolean, rejected: boolean }}
 */
function normalizeCampaign(raw) {
  if (raw === undefined || raw === null || raw === '') {
    return { campaign: DEFAULT_CAMPAIGN, known: true, rejected: false };
  }
  // Express gives an array if the param is repeated (?src=a&src=b) — take the first.
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (typeof first !== 'string') {
    return { campaign: 'invalid', known: false, rejected: true };
  }
  const slug = first.trim().toLowerCase();
  if (!CAMPAIGN_RE.test(slug)) {
    return { campaign: 'invalid', known: false, rejected: true };
  }
  return { campaign: slug, known: Object.hasOwn(CAMPAIGNS, slug), rejected: false };
}

// ── Platform detection ────────────────────────────────────────────────────────

const BOT_RE = /bot|crawler|spider|crawling|facebookexternalhit|whatsapp|slackbot|telegrambot|discordbot|twitterbot|linkedinbot|embedly|preview|curl\/|wget|python-requests|headless|lighthouse|pingdom|uptimerobot/i;
const ANDROID_RE = /android/i;
const IOS_RE = /iphone|ipad|ipod/i;
const DESKTOP_RE = /windows nt|macintosh|mac os x|x11|linux|cros/i;

/**
 * Classify a User-Agent into a platform bucket.
 * Note: iPadOS 13+ reports itself as "Macintosh" and is indistinguishable from a Mac
 * server-side. Those land on the desktop page, which offers the iPhone option anyway.
 * @returns {'android'|'ios'|'desktop'|'bot'|'other'}
 */
function detectPlatform(userAgent) {
  const ua = typeof userAgent === 'string' ? userAgent : '';
  if (!ua) return 'other';
  if (BOT_RE.test(ua)) return 'bot';
  // Order matters: Android tablets/phones often also match nothing else, and some
  // Android UAs contain "Linux" which would otherwise read as desktop.
  if (ANDROID_RE.test(ua) && !/windows phone/i.test(ua)) return 'android';
  if (IOS_RE.test(ua)) return 'ios';
  if (DESKTOP_RE.test(ua)) return 'desktop';
  return 'other';
}

// ── Play Store install attribution ────────────────────────────────────────────

/**
 * Append Google Play's `referrer` parameter so installs are attributable per campaign
 * in Play Console (and readable in-app via the Install Referrer API).
 */
function androidUrlFor(campaign, medium = 'qr') {
  const referrer = `utm_source=abierto&utm_medium=${medium}&utm_campaign=${campaign}`;
  const sep = ANDROID_STORE_URL.includes('?') ? '&' : '?';
  return `${ANDROID_STORE_URL}${sep}referrer=${encodeURIComponent(referrer)}`;
}

/** @returns {string|null} App Store URL, or null while no iOS app exists. */
function iosUrlFor(campaign) {
  if (!IOS_STORE_URL) return null;
  const sep = IOS_STORE_URL.includes('?') ? '&' : '?';
  return `${IOS_STORE_URL}${sep}ct=${encodeURIComponent(campaign)}&pt=abierto`;
}

module.exports = {
  ANDROID_STORE_URL,
  IOS_STORE_URL,
  WEB_APP_URL,
  CAMPAIGNS,
  DEFAULT_CAMPAIGN,
  CAMPAIGN_RE,
  normalizeCampaign,
  detectPlatform,
  androidUrlFor,
  iosUrlFor,
  iosAppExists: () => !!IOS_STORE_URL,
};
