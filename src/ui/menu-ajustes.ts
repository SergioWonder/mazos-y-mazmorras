// Settings menu: a ⚙️ button fixed at the top right of every screen that opens a
// panel with the sound (music and effects, each with its volume) and performance
// options. Every change is saved and applied at once (core/ajustes.ts). It also
// toggles the new-version notifications and, while the main menu is showing, gives
// the shortcuts to the card compendium and the sprite gallery.

import { ajustes, alCambiarAjustes, cambiarAjuste, type Ajustes } from '../core/ajustes.ts';
import { el } from './util.ts';
import { audio } from '../fx/audio.ts';
import { avisosDisponibles, avisosActivados, cambiarAvisos } from './actualizacion.ts';

type Interruptor = { tipo: 'interruptor'; clave: keyof Ajustes; etiqueta: string; ayuda?: string };
type Deslizador = { tipo: 'volumen'; clave: 'volumenMusica' | 'volumenSonidos'; etiqueta: string; depende: 'musica' | 'sonidos' };
type Opcion = Interruptor | Deslizador;

const SECCIONES: { titulo: string; opciones: Opcion[] }[] = [
  {
    titulo: '🔊 Sonido',
    opciones: [
      { tipo: 'interruptor', clave: 'musica', etiqueta: 'Música' },
      { tipo: 'volumen', clave: 'volumenMusica', etiqueta: 'Volumen de la música', depende: 'musica' },
      { tipo: 'interruptor', clave: 'sonidos', etiqueta: 'Efectos de sonido' },
      { tipo: 'volumen', clave: 'volumenSonidos', etiqueta: 'Volumen de los efectos', depende: 'sonidos' },
    ],
  },
  {
    titulo: '⚡ Rendimiento',
    opciones: [
      { tipo: 'interruptor', clave: 'reducirParticulas', etiqueta: 'Reducir partículas', ayuda: 'Menos chispas, llamas y ambiente: va más fluido en móviles modestos.' },
      { tipo: 'interruptor', clave: 'resolucionBaja', etiqueta: 'Resolución reducida', ayuda: 'Dibuja personajes y efectos a menos resolución en pantallas de alta densidad.' },
      { tipo: 'interruptor', clave: 'sacudidas', etiqueta: 'Sacudidas de pantalla', ayuda: 'Los golpes fuertes hacen temblar la pantalla.' },
      { tipo: 'interruptor', clave: 'mostrarFps', etiqueta: 'Mostrar FPS', ayuda: 'Contador de fotogramas por segundo en la esquina.' },
    ],
  },
];

let boton: HTMLButtonElement | null = null;

/** Shortcuts only the main menu offers (it pauses its own keyboard while they are open). */
export type AccesosMenuPrincipal = { compendio: () => void; galeria: () => void };
let accesos: AccesosMenuPrincipal | null = null;

/** The title screen registers its shortcuts on mount and clears them (null) on leaving. */
export function registrarAccesosMenuPrincipal(nuevos: AccesosMenuPrincipal | null) {
  accesos = nuevos;
}

/** Mounts the ⚙️ button (once). */
export function crearMenuAjustes() {
  if (boton) return;
  boton = el('button', 'boton-ajustes') as HTMLButtonElement;
  boton.textContent = '⚙️';
  boton.setAttribute('aria-label', 'Ajustes');
  boton.title = 'Ajustes';
  boton.addEventListener('click', (ev) => { ev.stopPropagation(); abrirMenuAjustes(); });
  document.body.appendChild(boton);
}

/** Opens the settings panel (keys and clicks never reach the screen underneath). */
export function abrirMenuAjustes() {
  if (document.querySelector('.menu-ajustes')) return;
  audio.desbloquear();
  const capa = el('div', 'menu-ajustes');
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-label', 'Ajustes');
  const panel = el('div', 'menu-ajustes-panel');
  panel.innerHTML = `
    <div class="menu-ajustes-cabecera">
      <h2>⚙️ Ajustes</h2>
      <button class="menu-ajustes-cerrar" aria-label="Cerrar">✕</button>
    </div>`;
  const pintar: Array<(a: Ajustes) => void> = [];
  for (const sec of SECCIONES) {
    const bloque = el('section', 'menu-ajustes-seccion');
    bloque.appendChild(el('h3', '', sec.titulo));
    for (const op of sec.opciones) {
      const fila = el('label', `menu-ajustes-fila ajuste-${op.tipo}`);
      fila.dataset.ajuste = op.clave;
      if (op.tipo === 'interruptor') {
        const input = el('input') as HTMLInputElement;
        input.type = 'checkbox';
        input.addEventListener('change', () => cambiarAjuste(op.clave, input.checked as never));
        fila.innerHTML = `<span class="ajuste-texto"><span class="ajuste-etiqueta">${op.etiqueta}</span>${op.ayuda ? `<small>${op.ayuda}</small>` : ''}</span>`;
        fila.appendChild(input);
        fila.appendChild(el('span', 'ajuste-conmutador'));
        pintar.push((a) => { input.checked = a[op.clave] as boolean; });
      } else {
        const input = el('input') as HTMLInputElement;
        input.type = 'range';
        input.min = '0'; input.max = '100'; input.step = '5';
        const valor = el('span', 'ajuste-valor');
        input.addEventListener('input', () => {
          cambiarAjuste(op.clave, Number(input.value) / 100);
          if (op.clave === 'volumenSonidos') audio.sfx('ui'); // hear the new level
        });
        fila.innerHTML = `<span class="ajuste-etiqueta">${op.etiqueta}</span>`;
        fila.appendChild(input);
        fila.appendChild(valor);
        pintar.push((a) => {
          input.value = String(Math.round(a[op.clave] * 100));
          valor.textContent = `${Math.round(a[op.clave] * 100)} %`;
          input.disabled = !a[op.depende];
          fila.classList.toggle('ajuste-apagado', !a[op.depende]);
        });
      }
      bloque.appendChild(fila);
    }
    panel.appendChild(bloque);
  }

  // New major-version notifications (the browser asks for permission on this click)
  if (avisosDisponibles()) {
    const bloque = el('section', 'menu-ajustes-seccion');
    bloque.appendChild(el('h3', '', '🔔 Avisos'));
    const fila = el('label', 'menu-ajustes-fila ajuste-interruptor');
    fila.dataset.ajuste = 'avisos';
    fila.innerHTML = `<span class="ajuste-texto"><span class="ajuste-etiqueta">Notificar nuevas versiones</span><small></small></span>`;
    const input = el('input') as HTMLInputElement;
    input.type = 'checkbox';
    fila.appendChild(input);
    fila.appendChild(el('span', 'ajuste-conmutador'));
    const ayuda = fila.querySelector('small')!;
    const pintarAvisos = () => {
      const bloqueados = Notification.permission === 'denied';
      input.checked = avisosActivados();
      input.disabled = bloqueados;
      fila.classList.toggle('ajuste-apagado', bloqueados);
      ayuda.textContent = bloqueados
        ? 'Bloqueados en el navegador: permítelos en los ajustes del sitio.'
        : 'Una notificación del sistema cuando salga una versión mayor del juego.';
    };
    input.addEventListener('change', async () => {
      input.disabled = true;
      await cambiarAvisos(input.checked);
      pintarAvisos();
    });
    pintarAvisos();
    bloque.appendChild(fila);
    panel.appendChild(bloque);
  }

  // Main-menu shortcuts: close the panel and hand over to the title screen
  if (accesos) {
    const disponibles = accesos;
    const bloque = el('section', 'menu-ajustes-seccion');
    bloque.appendChild(el('h3', '', '📚 Extras'));
    const enlaces = el('div', 'menu-ajustes-enlaces');
    const enlace = (texto: string, abrir: () => void) => {
      const b = el('button', 'btn-tomar', texto) as HTMLButtonElement;
      b.addEventListener('click', () => { cerrar(); abrir(); });
      enlaces.appendChild(b);
    };
    enlace('📖 Compendio de cartas', disponibles.compendio);
    enlace('🎭 Galería de sprites', disponibles.galeria);
    bloque.appendChild(enlaces);
    panel.appendChild(bloque);
  }
  capa.appendChild(panel);
  document.body.appendChild(capa);
  const repintar = (a: Ajustes) => pintar.forEach((f) => f(a));
  repintar(ajustes());
  const dejarDeOir = alCambiarAjustes(repintar);

  const cerrar = () => {
    window.removeEventListener('keydown', teclado, true);
    dejarDeOir();
    capa.remove();
  };
  // capture phase: the keys never reach the map, the combat or the title underneath
  const teclado = (ev: KeyboardEvent) => {
    ev.stopImmediatePropagation();
    if (ev.code === 'Escape') { ev.preventDefault(); cerrar(); }
  };
  window.addEventListener('keydown', teclado, true);
  panel.querySelector('.menu-ajustes-cerrar')!.addEventListener('click', cerrar);
  capa.addEventListener('click', (ev) => { if (ev.target === capa) cerrar(); });
}
