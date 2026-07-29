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
  'ceiba-ferry': {
    label: 'Ceiba Ferry Terminal',
    usage: 'The large advertisement at the Ceiba ferry terminal, where passengers wait to sail to Vieques.',
    note: 'Highest-intent placement — people are about to arrive and want to know what is open.',
    roadmapStep: 2, printable: true,
  },
  'vieques-ferry': {
    label: 'Vieques Ferry Arrival',
    usage: 'The advertisement passengers see immediately after arriving in Vieques.',
    note: 'The arrival moment. Keep it large — people scan while walking off the ferry.',
    roadmapStep: 4, printable: true,
  },
  'ferry-wifi': {
    label: 'Abierto Free Ferry Wi-Fi',
    usage: 'The Wi-Fi splash/landing card for the free ferry Wi-Fi service.',
    note: 'Shown on a phone screen as well as print — the SVG scales for both.',
    roadmapStep: 3, printable: true,
  },
  'business': {
    label: 'Participating Business',
    usage: 'Window clings and counter cards at businesses listed on Abierto.',
    note: 'One shared code for all participating businesses.',
    roadmapStep: 5, printable: true,
  },
  'business-card': {
    label: 'Business Card',
    usage: 'The back of Abierto business cards handed out in person.',
    note: 'Print at least 2 cm / 0.8 in square so it scans at close range.',
    roadmapStep: 5, printable: true,
  },
  'lodging': {
    label: 'Lodging / Airbnb / Guesthouse',
    usage: 'Welcome binders, room cards and check-in packets at hotels, guesthouses and Airbnbs.',
    note: 'Guests scan on arrival, when they are deciding where to eat.',
    roadmapStep: 6, printable: true,
  },
  'transport': {
    label: 'Rental / Taxi Partner',
    usage: 'Golf cart and car rental counters, taxi seat-backs and público vehicles.',
    note: 'Often scanned in motion — do not print this one small.',
    roadmapStep: 6, printable: true,
  },
  'social': {
    label: 'Social / General',
    usage: 'Instagram and Facebook posts, stories, and any general-purpose link.',
    note: 'Also the right code for anything that does not fit another campaign.',
    roadmapStep: 8, printable: true,
  },
  'direct': {
    label: 'Direct (no campaign tag)',
    usage: 'Not printed. This is the bucket for visits to /download with no campaign attached.',
    note: 'Appears in reporting only; there is no QR code for it.',
    roadmapStep: null, printable: false,
  },
};

// ── Contaminated reporting dates ──────────────────────────────────────────────
// Dates whose download_clicks rows are known to be test traffic and are excluded from
// campaign reporting by default. Rows are NEVER deleted — only filtered — because we
// cannot prove with certainty that every row on such a date is synthetic.
//
// 2026-07-29: launch day. The /download system was deployed and verified with
// scripts/verify-qr.js --live BEFORE the X-Abierto-Check exclusion header existed, so
// this date holds roughly 30 synthetic scans. No printed QR code existed yet, so there
// was no way for a real member of the public to have scanned one.
const CONTAMINATED_DATES = ['2026-07-29'];

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

// The Android package of our own TWA. Chrome sends `X-Requested-With: <package>` on
// navigations made inside a Trusted Web Activity / Custom Tab, which is how we tell
// "someone who already installed Abierto" apart from "a new Android download".
const ANDROID_PACKAGE = 'com.abierto.app';

/**
 * True when the request came from inside the installed Abierto Android app.
 * Requires no app rebuild — the header is sent by Chrome, not by our code.
 * Newer Chrome builds have narrowed when this header is sent, so treat it as a
 * high-confidence positive signal, never as a reliable negative.
 */
function isAbiertoApp(requestedWith) {
  if (typeof requestedWith !== 'string') return false;
  return requestedWith.trim().toLowerCase() === ANDROID_PACKAGE;
}

/**
 * Classify a request into a platform bucket.
 * Note: iPadOS 13+ reports itself as "Macintosh" and is indistinguishable from a Mac
 * server-side. Those land on the desktop page, which offers the iPhone option anyway.
 * @param {string} userAgent
 * @param {string} [requestedWith] the X-Requested-With header
 * @returns {'twa'|'android'|'ios'|'desktop'|'bot'|'other'}
 */
function detectPlatform(userAgent, requestedWith) {
  // Checked before everything else: someone already inside the app is never a new
  // acquisition, whatever their User-Agent claims.
  if (isAbiertoApp(requestedWith)) return 'twa';

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
  ANDROID_PACKAGE,
  CAMPAIGNS,
  CONTAMINATED_DATES,
  DEFAULT_CAMPAIGN,
  CAMPAIGN_RE,
  normalizeCampaign,
  detectPlatform,
  isAbiertoApp,
  androidUrlFor,
  iosUrlFor,
  iosAppExists: () => !!IOS_STORE_URL,
};
