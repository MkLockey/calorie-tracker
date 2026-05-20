const CACHE_NAME = 'calorie-tracker-v9';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/storage.js',
  './js/calc.js',
  './js/parser.js',
  './js/ocr.js',
  './js/foods.js',
  './js/profile.js',
  './js/ui.js',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
];

// CDN resources (cached separately, might be large)
const CDN_CACHE = 'calorie-tracker-cdn-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== CDN_CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Only handle http/https requests
  if (!url.protocol.startsWith('http')) return;

  // CDN resources - network first, cache fallback
  if (url.hostname.includes('jsdelivr.net') || url.hostname.includes('cdn.jsdelivr.net')) {
    e.respondWith(
      caches.open(CDN_CACHE).then(cache =>
        fetch(e.request).then(res => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(() => cache.match(e.request))
      )
    );
    return;
  }

  // Local assets - cache first, network fallback
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      })
    )
  );
});
