// Virorah Vantage — Service Worker (minimal)
// Prevents 404. No caching — Clerk auth requires uninterrupted network access.
self.addEventListener('install', function() { self.skipWaiting(); });
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});
self.addEventListener('fetch', function() { /* pass-through */ });
