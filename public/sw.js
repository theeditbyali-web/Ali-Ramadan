// Minimal service worker — exists only so the browser considers this app
// installable. Deliberately does no caching: this app's data (orders,
// stock, balances) must always come from the network, never a stale copy.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // No-op: let the browser handle every request normally.
});
