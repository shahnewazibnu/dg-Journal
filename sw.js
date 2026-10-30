// Offline support when the app is served from a web address (not used for file://).
const CACHE = 'journal-v9';
const SHELL = ['./', './index.html', './styles.css', './core.js', './app.js', './lib/qrcode.js', './manifest.webmanifest', './icons/icon.svg', './lib/leaflet/leaflet.js', './lib/leaflet/leaflet.css', './lib/html-to-image.js', './lib/fonts-embed.js', './fonts/literata-latin-opsz-normal.woff2', './fonts/manrope-latin-wght-normal.woff2', './fonts/playfair-display-latin-wght-normal.woff2', './fonts/caveat-latin-wght-normal.woff2', './fonts/dancing-script-latin-wght-normal.woff2', './fonts/special-elite-latin-400-normal.woff2', './fonts/patrick-hand-latin-400-normal.woff2', './fonts/abril-fatface-latin-400-normal.woff2', './fonts/pacifico-latin-400-normal.woff2'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  if (new URL(e.request.url).pathname.includes('/phone/')) return; // the phone app has its own
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res.ok && (new URL(e.request.url).origin === location.origin)) {
        const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});
