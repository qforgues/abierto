// Minimal service worker — enables PWA installability on Android/Chrome
// Does not cache anything; all requests go straight to the network.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
