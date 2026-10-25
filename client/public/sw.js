/* TCG Manager service worker — Web Push delivery for the installed PWA.
   Kept intentionally small: it only receives push notifications and routes
   taps back into the app. No offline caching, so the app always loads fresh. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
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
