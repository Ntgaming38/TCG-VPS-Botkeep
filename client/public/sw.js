/* TCG Manager service worker.
   Two jobs:
   1. Web Push delivery for the installed PWA (push + notificationclick).
   2. Offline app shell: cache the SPA shell and its hashed assets so the app
      still opens with no network. API calls (/api/*) are NEVER cached —
      offline data comes from the app's own on-device snapshots, so the
      worker can never serve stale business data as if it were live.
   Bump APP_SHELL_CACHE when the caching strategy changes to drop old caches. */

const APP_SHELL_CACHE = "tcg-app-shell-v1";
const APP_SHELL_FILES = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/favicon-32.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE);
      // Settle individually: one missing file must not fail the whole install.
      await Promise.allSettled(APP_SHELL_FILES.map((file) => cache.add(file)));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== APP_SHELL_CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // Network only — never cached.

  // Page navigations: fresh when possible, cached shell when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(APP_SHELL_CACHE);
          await cache.put("/index.html", fresh.clone());
          return fresh;
        } catch (error) {
          const cache = await caches.open(APP_SHELL_CACHE);
          const fallback = await cache.match("/index.html");
          return fallback || Response.error();
        }
      })()
    );
    return;
  }

  // Build assets are content-hashed, so cache-first is safe for them.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(APP_SHELL_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        const fresh = await fetch(request);
        if (fresh.ok) await cache.put(request, fresh.clone());
        return fresh;
      })()
    );
    return;
  }

  // Other static files (icons, product images): network-first so updated
  // images win, with the cache as the offline fallback.
  if (/\.(?:png|jpg|jpeg|svg|webp|ico|webmanifest|css|js|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(APP_SHELL_CACHE);
        try {
          const fresh = await fetch(request);
          if (fresh.ok) await cache.put(request, fresh.clone());
          return fresh;
        } catch (error) {
          const cached = await cache.match(request);
          return cached || Response.error();
        }
      })()
    );
  }
});

self.addEventListener("push", (event) => {
  let data = { title: "TCG Manager", body: "", url: "/", tag: undefined };
  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch (error) {
      data.body = event.data.text();
    }
  }
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || undefined,
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(data.title || "TCG Manager", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windowClients) {
        if (client.url.includes(target) && "focus" in client) return client.focus();
      }
      if (windowClients.length > 0 && "navigate" in windowClients[0]) {
        await windowClients[0].navigate(target);
        return windowClients[0].focus();
      }
      return self.clients.openWindow(target);
    })()
  );
});
