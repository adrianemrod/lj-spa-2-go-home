// Minimal service worker for the therapist PWA (spec section 37: cache
// today's schedule, work on poor connectivity, never claim a sync
// happened when it didn't). Deliberately simple — no precache manifest,
// no Workbox — this only needs to keep the last-known schedule readable
// offline, not run the whole app offline.
const CACHE_NAME = "lj-spa-therapist-v1";
const SCHEDULE_URL = "/api/therapists/me/schedule";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Network-first for the schedule endpoint, falling back to the last
// successful response when offline. Every other request passes through
// untouched — we are not trying to run the whole app offline.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname !== SCHEDULE_URL || event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
