// Extra service-worker handlers, imported by the Workbox service worker.
// Checks version.json for a new MAJOR version (periodic background sync where
// the browser supports it) and shows a system notification once per version.
// The page stores the installed version and the player's choice in the
// 'mazmorra-meta' cache (see src/ui/actualizacion.ts).

const META = 'mazmorra-meta';
const majorOf = (v) => parseInt(v, 10) || 0;

async function readMeta(key) {
  const cache = await caches.open(META);
  const res = await cache.match(key);
  return res ? res.text() : null;
}

async function writeMeta(key, value) {
  const cache = await caches.open(META);
  await cache.put(key, new Response(value));
}

async function checkMajorVersion() {
  if ((await readMeta('avisos')) !== '1') return;
  const installed = await readMeta('instalada');
  if (!installed) return;
  const res = await fetch(new URL('version.json', self.registration.scope).href + '?t=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) return;
  const { version, headline } = await res.json();
  const notified = await readMeta('avisada');
  if (majorOf(version) <= majorOf(installed) || notified === version) return;
  await writeMeta('avisada', version);
  await self.registration.showNotification(`Dracs & Rogues ${version}`, {
    body: headline || '¡Hay una nueva versión mayor del juego!',
    icon: 'icono-dm-192.png',
    badge: 'icono-dm-192.png',
    tag: 'version-mayor',
  });
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'version-mayor') event.waitUntil(checkMajorVersion());
});

// Multiplayer: a Web Push from the server (invitation, «resume» request, partner waiting in the room).
// Payload: { title, body, url, tag } — `url` is the game address with `?sala=<id>`.
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* not JSON: show the generic text */ }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Dracs & Rogues', {
      body: data.body || 'Tienes un aviso de tu partida multijugador.',
      icon: 'icono-dm-192.png',
      badge: 'icono-dm-192.png',
      tag: data.tag || 'multijugador',
      data: { url: data.url || null },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (wins) => {
      if (!wins.length) return self.clients.openWindow(url || self.registration.scope);
      const win = wins[0];
      // An open game lands on the lobby of that game (`?sala=`) by navigating; if the browser refuses, open a new window
      if (url) {
        try { return await (await win.navigate(url)).focus(); } catch { return self.clients.openWindow(url); }
      }
      return win.focus();
    }),
  );
});
