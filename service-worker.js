/* Watten Tracker – Service Worker
 * Cache-first für die App-Shell → funktioniert vollständig offline.
 * Bei jedem Release CACHE hochzählen, damit Clients das Update ziehen.
 */
const CACHE = "watten-v8";
const ASSETS = [
  "./",
  "./index.html",
  "./skin.js",
  "./core.js",
  "./sync.js",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-1024.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
  "./fonts/caveat-brush.woff2",
  "./fonts/bebas-neue.woff2",
  "./fonts/dseg7-classic-bold.woff2",
  "./fonts/playfair-display-700.woff2",
  "./fonts/courier-prime-700.woff2",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // Neue gleichartige Requests opportunistisch cachen
          const copy = res.clone();
          if (res.ok && new URL(req.url).origin === self.location.origin) {
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match("./index.html")); // Fallback bei Offline-Navigation
    })
  );
});
