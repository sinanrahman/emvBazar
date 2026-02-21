const CACHE_NAME = "emvBazar-cache-v1";
const urlsToCache = [
    "/",
    "/manifest.json",
    "/image/icon-192x192.png",
    "/image/icon-512x512.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((resp) => {
            return resp || fetch(event.request);
        })
    );
});
