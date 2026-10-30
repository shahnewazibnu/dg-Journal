// Offline support for the phone app: the app opens without internet, and entries wait in the outbox.
const CACHE = 'journal-phone-v1';
const SHELL = ['./', './index.html', './phone.css', './phone.js', '../core.js', './manifest.webmanifest', './icon-192.png', '../fonts/literata-latin-opsz-normal.woff2', '../fonts/manrope-latin-wght-normal.woff2', '../fonts/caveat-latin-wght-normal.woff2'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('journal-phone') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});
