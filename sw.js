const CACHE_NAME = 'turnex-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './css/responsive.css',
  './js/app.js',
  './js/api.js',
  './js/auth.js',
  './js/booking.js',
  './js/calendar.js',
  './js/utils.js',
  './assets/images/logo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k === CACHE_NAME ? null : caches.delete(k))))
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // Bypass non-GET
  if (req.method !== 'GET') return;

  // For same-origin navigations and static assets: cache-first
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
    return;
  }

  // For API calls: network-first, fallback to cache if available
  if (/\/api\//.test(url.pathname)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
  }
});
