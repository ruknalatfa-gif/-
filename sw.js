/* رُكن الأطفال — service worker for safe offline use */
const CACHE_PREFIX = 'rukn-alatfal-pwa-';
const CACHE_NAME = CACHE_PREFIX + 'v16';
const BASE = self.registration.scope;
const ROOT_URL = new URL('./', BASE).href;
const APP_URL = new URL('index.html', BASE).href;
const REQUIRED_URLS = [ROOT_URL, APP_URL];
const OPTIONAL_URLS = [
  new URL('manifest.webmanifest', BASE).href,
  new URL('icons/icon-192.png', BASE).href,
  new URL('icons/icon-512.png', BASE).href,
  new URL('icons/icon-maskable-512.png', BASE).href,
  new URL('icons/apple-touch-icon.png', BASE).href,
  new URL('favicon.ico', BASE).href,
  new URL('fonts/cairo-arabic-400-normal.woff2', BASE).href,
  new URL('fonts/cairo-arabic-600-normal.woff2', BASE).href,
  new URL('fonts/cairo-arabic-700-normal.woff2', BASE).href,
  new URL('fonts/cairo-arabic-900-normal.woff2', BASE).href,
  new URL('fonts/amiri-arabic-700-normal.woff2', BASE).href
];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const url of REQUIRED_URLS) {
      const response = await fetch(url, {cache:'reload'});
      if (!response.ok) throw new Error('Required app file could not be cached: ' + url);
      await cache.put(url, response);
    }
    const results = await Promise.allSettled(OPTIONAL_URLS.map(async url => {
      const response = await fetch(url, {cache:'reload'});
      if (!response.ok) throw new Error('Optional asset missing: ' + url);
      await cache.put(url, response);
    }));
    const failed = results.filter(result => result.status === 'rejected');
    if (failed.length) console.warn('Some optional assets were not cached:', failed.length);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    }).catch(async () => (await caches.match(request, {ignoreSearch:true})) || (await caches.match(url.pathname.endsWith('/index.html') ? APP_URL : ROOT_URL)) || Response.error()));
    return;
  }
  event.respondWith(caches.match(request).then(cached => {
    if (cached) return cached;
    return fetch(request).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    });
  }));
});
