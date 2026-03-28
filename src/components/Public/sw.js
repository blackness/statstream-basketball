// StatStream Service Worker
const CACHE_NAME = 'statstream-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Handle notification click — open/focus the app
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});

// Handle messages from the app — show notifications
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SCORE_UPDATE') {
    const { homeTeam, awayTeam, homeScore, awayScore, period, scorer, points } = e.data;
    self.registration.showNotification(`${homeTeam} ${homeScore} — ${awayScore} ${awayTeam}`, {
      body: `${scorer} +${points}  ·  Q${period}`,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: 'score-update',        // replaces previous notification instead of stacking
      renotify: true,
      silent: false,
      vibrate: [100, 50, 100],
      data: { url: '/' },
    });
  }
});
