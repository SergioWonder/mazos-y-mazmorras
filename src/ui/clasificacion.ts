// Leaderboard panel: best run of each player, by class. Opens from the title screen.

import { nube, type EntradaClasificacion } from '../core/nube.ts';
import { el } from './util.ts';
import { NOMBRE_CLASE } from './nube-juego.ts';
import '../estilos/nube.css';

const CLASES = ['druida', 'barbaro', 'mago', 'picaro', 'brujo', 'paladin'] as const;

function fila(e: EntradaClasificacion, posicion: number, propia: boolean): HTMLElement {
  const f = el('li', `clasif-fila${propia ? ' clasif-propia' : ''}`);
  f.appendChild(el('span', 'clasif-pos', String(posicion)));
  const nombre = el('span', 'clasif-nombre');
  nombre.textContent = e.displayName || 'Aventurero anónimo';
  if (!e.displayName) nombre.classList.add('clasif-anonimo');
  f.appendChild(nombre);
  // the true ending outranks any other victory: the Dungeon Master himself fell
  const [icono, texto] = e.dmDefeated ? ['🎲', 'Derrotó al Dungeon Master']
    : e.result === 'victory' ? ['🏆', 'Victoria'] : ['💀', 'Derrota'];
  const res = el('span', 'clasif-resultado', icono);
  res.title = texto;
  f.appendChild(res);
  f.appendChild(el('span', 'clasif-avance', `Cap. ${e.chapter + 1} · piso ${e.floor}`));
  f.appendChild(el('span', 'clasif-turnos', `${e.turns} turnos`));
  return f;
}

/** Opens the leaderboard. Resolves when the player closes it. */
export function pantallaClasificacion(): Promise<void> {
  return new Promise((resolver) => {
    let clase: string = nube.ultimaClase() ?? 'paladin';
    if (!(CLASES as readonly string[]).includes(clase)) clase = 'paladin';
    let peticion = 0;

    const capa = el('div', 'confirmar-fondo clasif-fondo');
    capa.setAttribute('role', 'dialog');
    capa.setAttribute('aria-label', 'Clasificación');
    const panel = el('div', 'clasif-panel');
    const cab = el('div', 'clasif-cab');
    cab.appendChild(el('h2', '', '🏆 Clasificación'));
    const cerrarBoton = el('button', 'menu-ajustes-cerrar', '✕') as HTMLButtonElement;
    cerrarBoton.setAttribute('aria-label', 'Cerrar');
    cab.appendChild(cerrarBoton);
    const selector = el('div', 'clasif-clases');
    selector.setAttribute('role', 'tablist');
    const lista = el('div', 'clasif-lista');
    panel.append(cab, selector, lista);
    capa.appendChild(panel);
    document.body.appendChild(capa);

    const aviso = (texto: string) => { lista.replaceChildren(el('p', 'clasif-vacio', texto)); };

    async function cargar() {
      const mia = ++peticion;
      aviso('Cargando…');
      const entradas = await nube.clasificacion(clase, 20);
      if (mia !== peticion) return; // the player already picked another class
      if (entradas === null) return aviso('Sin conexión: no se pudo cargar la clasificación.');
      if (entradas.length === 0) return aviso('Nadie ha terminado una partida con esta clase todavía. ¡Sé el primero!');
      const yo = nube.usuario()?.id;
      const ol = el('ol', 'clasif-tabla');
      entradas.forEach((e, i) => ol.appendChild(fila(e, i + 1, e.userId === yo)));
      lista.replaceChildren(ol);
      if (!nube.haySesion()) {
        lista.appendChild(el('p', 'clasif-pista', 'Crea una cuenta en ⚙️ Ajustes para aparecer aquí.'));
      }
    }

    const botones = CLASES.map((c) => {
      const b = el('button', 'clasif-clase', NOMBRE_CLASE[c]) as HTMLButtonElement;
      b.setAttribute('role', 'tab');
      b.addEventListener('click', () => { clase = c; marcar(); void cargar(); });
      selector.appendChild(b);
      return b;
    });
    const marcar = () => botones.forEach((b, i) => {
      const activa = CLASES[i] === clase;
      b.classList.toggle('clasif-clase-activa', activa);
      b.setAttribute('aria-selected', String(activa));
    });

    const cerrar = () => {
      window.removeEventListener('keydown', teclado, true);
      peticion++;
      capa.remove();
      resolver();
    };
    // capture phase: no key reaches the title underneath; Escape closes
    const teclado = (ev: KeyboardEvent) => {
      if (ev.code === 'Escape') { ev.preventDefault(); ev.stopImmediatePropagation(); cerrar(); }
      else if (!(ev.target instanceof HTMLButtonElement)) ev.stopImmediatePropagation();
    };
    window.addEventListener('keydown', teclado, true);
    cerrarBoton.addEventListener('click', cerrar);
    capa.addEventListener('click', (ev) => { if (ev.target === capa) cerrar(); });
    marcar();
    void cargar();
  });
}
