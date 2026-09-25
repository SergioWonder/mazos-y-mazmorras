import { registerSW } from 'virtual:pwa-register';
import { VERSION, CHANGELOG } from '../version.ts';
import { isMajorUpgrade, majorChangelog, shouldNotifyMajor } from '../core/versions.ts';
import { el } from './util.ts';

const CLAVE_VERSION = 'mazmorra-version-vista';
const INTERVALO_COMPROBACION = 60 * 1000; // busca versión nueva cada minuto
// shared with public/sw-avisos.js through CacheStorage
const META = 'mazmorra-meta';
const CLAVE_AVISOS = 'mazmorra-avisos-mayores';
let registro: ServiceWorkerRegistration | undefined;

/**
 * Gestión de actualizaciones de la PWA:
 *  1. El service worker avisa cuando hay una versión nueva descargada → banner
 *     «Actualizar» que aplica el nuevo SW y recarga.
 *  2. Solo cuando se estrena una versión MAYOR (3.x → 4.0) muestra la ventana
 *     de novedades de esa versión mayor.
 *  3. Si el jugador activó los avisos, notifica con el sistema cuando detecta
 *     una versión mayor nueva publicada (version.json).
 */
export function iniciarActualizaciones() {
  const actualizar = registerSW({
    onNeedRefresh() {
      mostrarAvisoActualizar(() => void actualizar(true));
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      registro = registration;
      void guardarMeta('instalada', VERSION);
      void comprobarVersionMayor();
      // El SW solo busca versión nueva al navegar; forzamos comprobaciones
      // periódicas y al recuperar el foco para que el aviso no dependa de
      // la caché ni de cerrar y reabrir la app.
      const comprobar = () => {
        void registration.update().catch(() => {});
        void comprobarVersionMayor();
      };
      setInterval(comprobar, INTERVALO_COMPROBACION);
      window.addEventListener('focus', comprobar);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') comprobar();
      });
    },
  });
  mostrarNovedadesSiNuevo();
}

/** Muestra las novedades una sola vez, y solo al estrenar una versión mayor. */
function mostrarNovedadesSiNuevo() {
  let previa: string | null = null;
  try {
    previa = localStorage.getItem(CLAVE_VERSION);
    localStorage.setItem(CLAVE_VERSION, VERSION);
  } catch {
    return; // sin almacenamiento: no insistimos
  }
  // primera ejecución (previa === null) o versión menor/parche: sin ventana
  if (isMajorUpgrade(previa, VERSION)) mostrarNovedades();
}

// ── Avisos de versiones mayores (notificaciones del sistema, sin servidor) ──

async function guardarMeta(clave: string, valor: string) {
  try { await (await caches.open(META)).put(clave, new Response(valor)); } catch { /* sin CacheStorage */ }
}
async function leerMeta(clave: string): Promise<string | null> {
  try { const r = await (await caches.open(META)).match(clave); return r ? await r.text() : null; } catch { return null; }
}

/** El navegador permite notificaciones en esta instalación. */
export const avisosDisponibles = () => 'Notification' in window && 'serviceWorker' in navigator;

export function avisosActivados(): boolean {
  try { return localStorage.getItem(CLAVE_AVISOS) === '1' && Notification.permission === 'granted'; } catch { return false; }
}

/** Activa o desactiva los avisos. Pide permiso al navegador (necesita un clic). */
export async function cambiarAvisos(activar: boolean): Promise<boolean> {
  if (activar) {
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') return false;
  }
  try { localStorage.setItem(CLAVE_AVISOS, activar ? '1' : '0'); } catch { /* sin almacenamiento */ }
  await guardarMeta('avisos', activar ? '1' : '0');
  // background checks where supported (Chrome/Android with the app installed)
  const sync = (registro as ServiceWorkerRegistration & { periodicSync?: { register(t: string, o: object): Promise<void>; unregister(t: string): Promise<void> } } | undefined)?.periodicSync;
  try {
    if (sync && activar) await sync.register('version-mayor', { minInterval: 12 * 60 * 60 * 1000 });
    else if (sync) await sync.unregister('version-mayor');
  } catch { /* periodic sync not granted: checks run when the game is open */ }
  return activar;
}

/** Consulta version.json y avisa (una vez) si hay una versión mayor nueva. */
async function comprobarVersionMayor() {
  if (!registro || !avisosActivados()) return;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const { version, headline } = await res.json() as { version: string; headline?: string };
    if (!shouldNotifyMajor(VERSION, version, await leerMeta('avisada'))) return;
    await guardarMeta('avisada', version);
    await registro.showNotification(`Mazo y Mazmorra ${version}`, {
      body: headline || '¡Hay una nueva versión mayor del juego!',
      icon: `${import.meta.env.BASE_URL}icono-192.png`,
      badge: `${import.meta.env.BASE_URL}icono-192.png`,
      tag: 'version-mayor',
    });
  } catch { /* offline: next check */ }
}

/** Banner inferior cuando el SW tiene una versión nueva lista. */
function mostrarAvisoActualizar(alActualizar: () => void) {
  if (document.querySelector('.aviso-actualizar')) return;
  const aviso = el('div', 'aviso-actualizar');
  aviso.innerHTML = `
    <span class="aviso-texto">✨ <strong>Nueva versión disponible</strong></span>
    <button class="btn-actualizar">Actualizar</button>
    <button class="btn-cerrar-aviso" aria-label="Cerrar">✕</button>
  `;
  document.body.appendChild(aviso);

  const btn = aviso.querySelector('.btn-actualizar') as HTMLButtonElement;
  const cerrarBtn = aviso.querySelector('.btn-cerrar-aviso') as HTMLButtonElement;
  let actualizando = false;

  btn.addEventListener('click', () => {
    if (actualizando) return;
    actualizando = true;
    // Estado de carga: el SW puede tardar en activarse y recargar la página
    aviso.classList.add('actualizando');
    btn.disabled = true;
    cerrarBtn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>Actualizando…';
    alActualizar();
    // Fallback: si en 8 s el nuevo service worker no ha recargado, recarga a mano
    setTimeout(() => location.reload(), 8000);
  });

  cerrarBtn.addEventListener('click', () => {
    if (actualizando) return;
    aviso.classList.add('aviso-fuera');
    setTimeout(() => aviso.remove(), 400);
  });
}

/** Ventana centrada con las novedades de la versión mayor actual. */
export function mostrarNovedades() {
  const entradas = majorChangelog(CHANGELOG, VERSION);
  const entrada = entradas[entradas.length - 1] ?? CHANGELOG[0];
  if (!entrada) return;
  // the X.0.0 entry headlines the window; later minors of the line are appended
  const cambios = [...entrada.cambios, ...entradas.slice(0, -1).reverse().flatMap((e) => e.cambios)];

  const fondo = el('div', 'novedades-fondo');
  const panel = el('div', 'novedades');
  panel.innerHTML = `
    <h2 class="novedades-titulo">📜 Novedades</h2>
    <p class="novedades-version">Versión ${VERSION}</p>
    <ul class="novedades-lista">
      ${cambios.map((c) => `<li>${c}</li>`).join('')}
    </ul>
    <button class="btn-tomar btn-novedades-ok">¡A la mazmorra!</button>
  `;
  fondo.appendChild(panel);
  document.body.appendChild(fondo);

  const cerrar = () => {
    fondo.classList.add('novedades-fuera');
    setTimeout(() => fondo.remove(), 300);
    window.removeEventListener('keydown', alPulsar);
  };
  const alPulsar = (ev: KeyboardEvent) => {
    if (ev.code === 'Enter' || ev.code === 'Escape' || ev.code === 'Space') {
      ev.preventDefault();
      cerrar();
    }
  };
  panel.querySelector('.btn-novedades-ok')!.addEventListener('click', cerrar);
  fondo.addEventListener('click', (e) => {
    if (e.target === fondo) cerrar();
  });
  window.addEventListener('keydown', alPulsar);
}
