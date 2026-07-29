/**
 * sw.js — Minimal offline app-shell cache so the menu stays browsable
 * even on a weak connection. Network-first for HTML, cache-first for
 * static assets. Safe no-op if registration fails (progressive enhancement).
 */
const CACHE = 'shawaya-shell-v1';
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

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
      return res;
    }).catch(() => cached))
  );
});
