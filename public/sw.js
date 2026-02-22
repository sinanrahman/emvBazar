const CACHE_NAME = "emvBazar-cache-v2";
const urlsToCache = [
    "/manifest.json",
    "/image/icon-192x192.png",
    "/image/icon-512x512.png",
    "/favicon.ico"
];

// Install event - caching basic assets
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
});

// Activate event - cleaning up old caches
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event - handling requests
self.addEventListener("fetch", (event) => {
    // Only handle same-origin GET requests
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            // For navigation requests not in cache, we let the browser handle redirects
            if (event.request.mode === 'navigate') {
                return fetch(event.request);
            }

            return fetch(event.request).then((response) => {
                return response;
            }).catch(() => {
                // Return a fallback if network fails
                return caches.match("/favicon.ico");
            });
        })
    );
});
