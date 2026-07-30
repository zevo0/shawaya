/**
 * sw.js — Minimal offline app-shell cache so the menu stays browsable
 * even on a weak connection.
 *
 * IMPORTANT: this only caches same-origin static shell files (HTML/CSS/JS/
 * logo/hero). It must NEVER cache cross-origin requests (Supabase REST API,
 * Realtime, or Storage) — those always need a real network hit, otherwise
 * newly uploaded images and menu/price updates get served stale forever
 * to any visitor who already has the old response cached.
 *
 * Strategy:
 *  - navigation + shell assets: network-first, cache as a fallback for
 *    offline use (so a new deploy reaches visitors on their very next
 *    load instead of being stuck behind an old cached copy).
 *  - anything cross-origin (supabase.co, wa.me, etc.): always network,
 *    never touched by the cache.
 */
const CACHE = 'shawaya-shell-v2';
const SHELL = [
  './',
  './index.html',
  './config.js',
  './css/style.css',
  './css/components.css',
  './css/animations.css',
  './css/responsive.css',
  './js/icons.js',
  './js/supabase.js',
  './js/menu.js',
  './js/modal.js',
  './js/cart.js',
  './js/whatsapp.js',
  './js/app.js',
  './assets/images/logo.webp',
  './assets/images/hero.webp',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Cross-origin (Supabase REST/Realtime/Storage, WhatsApp, etc.): always
  // go to the network, never read from or write to the cache. This is
  // what keeps admin-panel uploads, price/menu edits, and open/closed
  // status showing up immediately for every visitor.
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // Same-origin static assets: network-first so code/asset updates reach
  // visitors on their next load; cache is only a fallback when offline.
  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(request))
  );
});
