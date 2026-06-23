const CACHE = "khutwati-v13";
const ASSETS = [
  "./",
  "index.html",
  "css/index.css",
  "js/index.js",
  "manifest.webmanifest",
  "icons/app-icon-192.png",
  "icons/app-icon-512.png",
  "icons/app-icon-1024.png",
  "icons/apple-touch-icon.png",
  "images/exercises/treadmill.png",
  "images/exercises/bike-bands.png",
  "images/exercises/mat-ball.png",
  "images/exercises/stretch.png",
  "images/exercises/resistance-row.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const shouldPreferNetwork = event.request.mode === "navigate"
    || [".html", ".js", ".css"].some(extension => url.pathname.endsWith(extension));

  if (shouldPreferNetwork) {
    event.respondWith(
      fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match(event.request).then(cached => cached || caches.match("index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match("index.html")))
  );
});
