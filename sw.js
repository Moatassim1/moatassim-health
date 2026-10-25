// Offline support + push notifications.
// Network first (so updates arrive straight away), cache as a fallback.
const CACHE = 'mh-v2.0.36';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'api-web.js', 'scanner.js', 'config.js', 'foods.js', 'syncmodel.js', 'charts.js', 'game.js', 'photos.js', 'countries.js', 'vendor/html5-qrcode.min.js', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/cp-96.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin) return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data && e.data.text() }; }
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => l.forEach(c => c.postMessage({ type: 'mh-push' })));
  e.waitUntil(self.registration.showNotification(d.title || 'GG Gains', {
    body: d.body || '', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: d.tag || undefined, data: { url: d.url || './' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) { c.navigate && c.navigate(url).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
