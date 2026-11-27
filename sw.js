// שומר את קבצי האפליקציה כדי שתיפתח מהר גם בחיבור חלש
const CACHE = 'chavruta-v24';
const FILES = ['./', 'index.html', 'app.js', 'ui.js', 'games.js', 'video.js', 'topics.js', 'welfare.js', 'ice.js', 'extras.js', 'i18n.js', 'assistant.js', 'more.js', 'board.js', 'coplay.js', 'group.js', 'quick.js', 'config.js', 'manifest.json', 'logo.svg', 'privacy.html', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // קודם מהרשת (כדי לקבל עדכונים), ואם אין רשת – מהזיכרון
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
