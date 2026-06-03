// Minimal service worker — present ONLY so the app meets PWA installability
// criteria (manifest + HTTPS + a registered SW with a fetch handler). It is
// deliberately a no-op: it never caches responses and never serves anything
// from cache, so the installed home-screen app behaves byte-for-byte like the
// site in a normal browser tab with full functionality.
//
// History: an earlier caching service worker served stale JS chunks after auth
// state changes (sign-in/out), causing "module factory is not available"
// crashes. We avoid that class of bug entirely by NOT intercepting requests.
// Do not add caching here without a network-first strategy for HTML/JS and an
// exclusion list for /api and all authed/tenant-scoped data.

self.addEventListener('install', () => {
  // Don't wait for old tabs to close — take over as soon as this version loads.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Proactively delete caches left behind by any older SW version so
      // returning users self-heal on first load after this deploys.
      if ('caches' in self) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      await self.clients.claim();
    })()
  );
});

// An empty fetch handler (no respondWith) is enough to satisfy the "has a fetch
// handler" installability heuristic on Android/Chrome, while letting the
// browser handle every request normally — i.e. exactly like the browser.
self.addEventListener('fetch', () => {});
