const CACHE_NAME = 'lexitrilingue-pro-v2';
const ASSETS = [
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Fallback si hors ligne et requête externe (ex: MyMemory API)
        if (event.request.url.includes('translated.net')) {
          return new Response(JSON.stringify({ responseData: { translatedText: "Mode hors-ligne actif (Traduction locale indisponible)" } }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      });
    })
  );
});
