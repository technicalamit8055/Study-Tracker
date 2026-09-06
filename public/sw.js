/**
 * ExamRoadmap Service Worker
 *
 * Strategy:
 *   - App shell & scripts: stale-while-revalidate (instant load, fresh next time)
 *   - Exam roadmap JSON:   stale-while-revalidate (study offline)
 *   - Auth & progress API: network only (never cache a student's private state)
 */
const VERSION = 'v2';
const SHELL_CACHE = 'examroadmap-shell-' + VERSION;
const DATA_CACHE = 'examroadmap-data-' + VERSION;

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/state.js',
  '/src/roadmap-renderer.js',
  '/src/study-drawer.js',
  '/src/catalog-modal.js',
  '/src/timer.js',
  '/src/app.js',
  '/data/exams-catalog.json',
  '/data/exams/bihar-stet-psychology.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      // Cache each asset individually so one 404 cannot abort the install.
      .then(cache => Promise.all(
        SHELL_ASSETS.map(url => cache.add(url).catch(err => {
          console.warn('[sw] skipped caching', url, err.message);
        }))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== SHELL_CACHE && k !== DATA_CACHE)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function staleWhileRevalidate(request, cacheName) {
  return caches.open(cacheName).then(cache =>
    cache.match(request).then(cached => {
      const network = fetch(request).then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          cache.put(request, res.clone());
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Private, user-specific data must always come from the network.
  if (url.pathname.startsWith('/api/progress') ||
      url.pathname.startsWith('/api/auth') ||
      url.pathname.startsWith('/api/health')) {
    return;
  }

  // Exam roadmaps: serve cached copies so study works offline.
  if (url.pathname.startsWith('/api/exams') || url.pathname.startsWith('/data/')) {
    event.respondWith(staleWhileRevalidate(req, DATA_CACHE));
    return;
  }

  // Navigations: fall back to the cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then(c => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html').then(r => r || caches.match('/')))
    );
    return;
  }

  event.respondWith(staleWhileRevalidate(req, SHELL_CACHE));
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
