/**
 * sw.js — Caches static assets (JS/CSS/images) for a snappier repeat visit
 * and light offline resilience. Deliberately does NOT intercept navigation
 * (the actual page/HTML request) — that's what previously risked the site
 * hanging or failing to open for some visitors. Service workers that
 * intercept navigation are a well-known source of "site won't load" bugs
 * across browsers (Safari/WebKit in particular has had real, documented
 * issues where a navigation-intercepting fetch handler — especially during
 * an SW update via skipWaiting()/clients.claim() — can hang a tab
 * indefinitely waiting on the SW's response). Letting the browser load the
 * HTML page 100% natively removes the SW from that critical path entirely:
 * worst case with this file, an asset falls back to a normal network
 * request — the page itself can never be blocked by the SW.
 *
 * IMPORTANT: never cache cross-origin requests (Supabase REST API,
 * Realtime, or Storage) — those always need a real network hit, otherwise
 * newly uploaded images and menu/price updates get served stale forever
 * to any visitor who already has the old response cached.
 */
const CACHE = 'shawaya-assets-v3';
const SHELL = [
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

// Network calls made by this SW are always time-boxed — an asset request
// that never settles falls back to cache (or is simply left to fail)
// rather than hanging anything.
function fetchWithTimeout(request, ms = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('sw-fetch-timeout')), ms);
    fetch(request).then(
      (res) => { clearTimeout(timer); resolve(res); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

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
  if (request.mode === 'navigate') return; // never touch page navigation — let the browser handle it natively

  const url = new URL(request.url);

  // Cross-origin (Supabase REST/Realtime/Storage, WhatsApp, etc.): always
  // go straight to the network, untouched by the cache.
  if (url.origin !== self.location.origin) return;

  // Same-origin static assets: network-first (time-boxed) so updates reach
  // visitors on their next load; cache is only a fallback.
  event.respondWith(
    fetchWithTimeout(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(request))
  );
});
