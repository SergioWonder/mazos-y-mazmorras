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
  await self.registration.showNotification(`Mazo y Mazmorra ${version}`, {
    body: headline || '¡Hay una nueva versión mayor del juego!',
    icon: 'icono-192.png',
    badge: 'icono-192.png',
    tag: 'version-mayor',
  });
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'version-mayor') event.waitUntil(checkMajorVersion());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) =>
      wins.length ? wins[0].focus() : self.clients.openWindow(self.registration.scope),
    ),
  );
});
