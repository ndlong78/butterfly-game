const CACHE_VERSION = 'butterfly-game-v2026-04-27-1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './js/main.js',
  './js/config.js',
  './js/state.js',
  './js/background.js',
  './js/canvas-utils.js',
  './js/butterfly.js',
  './js/input.js',
  './js/gameplay.js',
  './js/camera.js',
  './js/voice.js',
  './js/report.js',
  './js/screens.js',
  './js/viewport.js',
  './assets/icons/icon-192.svg',
  './assets/icons/icon-512.svg',
  './assets/icons/apple-touch-icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== CACHE_VERSION)
        .map((key) => caches.delete(key)),
    )),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const isNavigate = event.request.mode === 'navigate';
  if (isNavigate) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(async () => {
          const cachedIndex = await caches.match('./index.html');
          if (cachedIndex) {
            return cachedIndex;
          }
          return caches.match('./');
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseClone = response.clone();
        caches.open(CACHE_VERSION).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      });
    }),
  );
});
