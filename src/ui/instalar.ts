import { el } from './util.ts';

const CLAVE = 'mazo-y-mazmorra/aviso-instalar';

/**
 * Aviso de instalación como app: aparece al abrir el juego desde el navegador
 * de un móvil (no cuando ya está instalada). En Android usa el prompt nativo
 * si el navegador lo ofrece; en iOS explica los pasos.
 */
export function avisoInstalacion() {
  const ua = navigator.userAgent;
  const esMovil = /android|iphone|ipad|ipod/i.test(ua);
  const esIOS = /iphone|ipad|ipod/i.test(ua);
  const instalada =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;

  if (!esMovil || instalada) return;
  try {
    if (localStorage.getItem(CLAVE)) return;
  } catch {
    return;
  }

  // Android/Chrome: captura el evento para poder lanzar el prompt nativo
  let promptNativo: { prompt: () => Promise<void> } | null = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    promptNativo = e as unknown as { prompt: () => Promise<void> };
    const btn = document.querySelector('.aviso-instalar .btn-instalar') as HTMLElement | null;
    if (btn) btn.hidden = false;
  });

  const aviso = el('div', 'aviso-instalar');
  aviso.innerHTML = `
    <span class="aviso-texto">📲 <strong>Juega como app:</strong> ${
      esIOS
        ? 'pulsa <strong>Compartir</strong> y «Añadir a pantalla de inicio»'
        : 'menú <strong>⋮</strong> → «Añadir a pantalla de inicio»'
    }</span>
    <button class="btn-instalar" hidden>Instalar</button>
    <button class="btn-cerrar-aviso" aria-label="Cerrar">✕</button>
  `;
  document.body.appendChild(aviso);

  const cerrar = () => {
    try {
      localStorage.setItem(CLAVE, '1');
    } catch { /* sin almacenamiento */ }
    aviso.classList.add('aviso-fuera');
    setTimeout(() => aviso.remove(), 400);
  };

  aviso.querySelector('.btn-cerrar-aviso')!.addEventListener('click', cerrar);
  aviso.querySelector('.btn-instalar')!.addEventListener('click', async () => {
    await promptNativo?.prompt();
    cerrar();
  });
  setTimeout(cerrar, 20000); // se retira solo a los 20 s
}
