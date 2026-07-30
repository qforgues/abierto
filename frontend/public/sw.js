/**
 * Abierto service worker — offline support for patchy island connectivity.
 *
 * The problem this solves: someone installs Abierto at the Ceiba ferry terminal where there's
 * good signal, sails to Vieques where there often isn't, opens the app — and gets nothing.
 * That's the acquisition campaign failing at the exact moment it should pay off.
 *
 * The tension: Abierto's whole promise is "open RIGHT NOW". Serving a cached "Open" for a
 * place that shut an hour ago is worse than admitting we're offline — someone drives across
 * the island for nothing. So cached API data is served ONLY as a fallback when the network
 * genuinely fails, and it is always tagged with the time it was captured so the UI can say
 * how old it is (see components/OfflineNotice.jsx). Cached data is never shown as live.
 *
 * Strategies:
 *   /assets/*     cache-first    — content-hashed by Vite, so immutable
 *   /uploads/*    cache-first    — business photos: large and rarely changing
 *   GET /api/*    network-first  — fall back to cache, stamped with its age
 *   navigations   network-first  — fall back to the cached shell so the SPA can boot
 * Everything else (writes, /api/analytics, /tiles, /download, cross-origin) is left alone.
 */

const VERSION = 'v1';
const SHELL_CACHE = `abierto-shell-${VERSION}`;
const ASSET_CACHE = `abierto-assets-${VERSION}`;
const DATA_CACHE  = `abierto-data-${VERSION}`;
const PHOTO_CACHE = `abierto-photos-${VERSION}`;

const SHELL_URLS = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png', '/logo-solo.png'];

// Headers the app reads to know it's looking at cached data, and how old it is.
const FROM_CACHE = 'X-Abierto-From-Cache';
const CACHED_AT  = 'X-Abierto-Cached-At';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      // Added individually so one 404 can't abort the whole install.
      .then((c) => Promise.allSettled(SHELL_URLS.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const keep = [SHELL_CACHE, ASSET_CACHE, DATA_CACHE, PHOTO_CACHE];
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => !keep.includes(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

/** Re-serve a cached response, flagged with how stale it is. */
async function stamped(cached) {
  const at = cached.headers.get(CACHED_AT) || new Date(0).toISOString();
  const body = await cached.blob();
  const headers = new Headers(cached.headers);
  headers.set(FROM_CACHE, '1');
  headers.set(CACHED_AT, at);
  return new Response(body, { status: cached.status, statusText: cached.statusText, headers });
}

/** Store a response, recording when it was captured. */
async function put(cacheName, request, response) {
  const body = await response.clone().blob();
  const headers = new Headers(response.headers);
  headers.set(CACHED_AT, new Date().toISOString());
  const cache = await caches.open(cacheName);
  await cache.put(request, new Response(body, {
    status: response.status, statusText: response.statusText, headers,
  }));
}

async function cacheFirst(cacheName, request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) await put(cacheName, request, res);
  return res;
}

async function networkFirst(cacheName, request, { stampFallback = false } = {}) {
  try {
    const res = await fetch(request);
    if (res.ok) await put(cacheName, request, res);
    return res;
  } catch (err) {
    const hit = await caches.match(request);
    if (hit) return stampFallback ? stamped(hit) : hit;
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;   // Google Maps, fonts — leave alone
  if (url.pathname.startsWith('/tiles')) return;

  // Never cache analytics or the download redirector: the first must not be replayed
  // offline, and the second must always reach the server so its destination stays
  // changeable — that indirection is the whole point of the printed QR codes.
  if (url.pathname.startsWith('/api/analytics')) return;
  if (url.pathname.startsWith('/download') || url.pathname.startsWith('/go')) return;

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(ASSET_CACHE, request));
    return;
  }

  if (url.pathname.startsWith('/uploads/')) {
    event.respondWith(cacheFirst(PHOTO_CACHE, request));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(DATA_CACHE, request, { stampFallback: true }));
    return;
  }

  // Navigations: try the network, fall back to the cached shell so the SPA can boot
  // offline and render whatever cached data it has.
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(SHELL_CACHE, request).catch(() =>
        caches.match('/').then((hit) => hit || Response.error())
      )
    );
    return;
  }

  if (SHELL_URLS.includes(url.pathname)) {
    event.respondWith(cacheFirst(SHELL_CACHE, request));
  }
});
