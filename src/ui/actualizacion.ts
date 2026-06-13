import { registerSW } from 'virtual:pwa-register';
import { VERSION, CHANGELOG, type EntradaCambios } from '../version.ts';
import { el } from './util.ts';

const CLAVE_VERSION = 'mazmorra-version-vista';
const INTERVALO_COMPROBACION = 60 * 1000; // busca versión nueva cada minuto

/**
 * Gestión de actualizaciones de la PWA:
 *  1. El service worker avisa cuando hay una versión nueva descargada → banner
 *     «Actualizar» que aplica el nuevo SW y recarga.
 *  2. Tras recargar (o en cualquier arranque con versión distinta a la última
 *     vista), muestra una ventanita con las novedades de la versión actual.
 */
export function iniciarActualizaciones() {
  const actualizar = registerSW({
    onNeedRefresh() {
      mostrarAvisoActualizar(() => void actualizar(true));
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // El SW solo busca versión nueva al navegar; forzamos comprobaciones
      // periódicas y al recuperar el foco para que el aviso no dependa de
      // la caché ni de cerrar y reabrir la app.
      const comprobar = () => void registration.update().catch(() => {});
      setInterval(comprobar, INTERVALO_COMPROBACION);
      window.addEventListener('focus', comprobar);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') comprobar();
      });
    },
  });
  mostrarNovedadesSiNuevo();
}

/** Muestra las novedades una sola vez cuando la versión instalada cambia. */
function mostrarNovedadesSiNuevo() {
  let previa: string | null = null;
  try {
    previa = localStorage.getItem(CLAVE_VERSION);
    localStorage.setItem(CLAVE_VERSION, VERSION);
  } catch {
    return; // sin almacenamiento: no insistimos
  }
  // primera ejecución (previa === null): no molestamos con el changelog
  if (previa && previa !== VERSION) mostrarNovedades();
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
  aviso.querySelector('.btn-actualizar')!.addEventListener('click', alActualizar);
  aviso.querySelector('.btn-cerrar-aviso')!.addEventListener('click', () => {
    aviso.classList.add('aviso-fuera');
    setTimeout(() => aviso.remove(), 400);
  });
}

/** Ventana centrada con el registro de cambios de la versión actual. */
export function mostrarNovedades() {
  const entrada: EntradaCambios = CHANGELOG.find((e) => e.version === VERSION) ?? CHANGELOG[0];
  if (!entrada) return;

  const fondo = el('div', 'novedades-fondo');
  const panel = el('div', 'novedades');
  panel.innerHTML = `
    <h2 class="novedades-titulo">📜 Novedades</h2>
    <p class="novedades-version">Versión ${entrada.version}</p>
    <ul class="novedades-lista">
      ${entrada.cambios.map((c) => `<li>${c}</li>`).join('')}
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
