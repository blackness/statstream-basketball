// StatStream Service Worker — offline support + notifications
const CACHE_NAME = 'statstream-v2';

// App shell — these get cached on install
const APP_SHELL = [
  '/',
  '/index.html',
];

// ── Install — cache app shell ─────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ── Activate — clean old caches ───────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch — cache-first for assets, network-first for API ────────────────────
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Never intercept Supabase API calls — let them fail naturally when offline
  if (url.hostname.includes('supabase.co')) return;

  // Network-first for navigation (HTML pages)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match('/') || caches.match('/index.html'))
    );
    return;
  }

  // Cache-first for static assets (JS, CSS, fonts, images)
  if (
    url.pathname.match(/\.(js|css|woff2?|png|jpg|svg|ico)$/) ||
    url.pathname.startsWith('/assets/')
  ) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        });
      })
    );
    return;
  }
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow('/');
    })
  );
});

// ── Messages from app ─────────────────────────────────────────────────────────
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SCORE_UPDATE') {
    const { homeTeam, awayTeam, homeScore, awayScore, period, scorer, points } = e.data;
    self.registration.showNotification(
      `${homeTeam} ${homeScore} — ${awayScore} ${awayTeam}`, {
        body: `${scorer} +${points}  ·  Q${period}`,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        tag: 'score-update',
        renotify: true,
        silent: false,
        vibrate: [100, 50, 100],
        data: { url: '/' },
      }
    );
  }

  // Force cache refresh
  if (e.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
