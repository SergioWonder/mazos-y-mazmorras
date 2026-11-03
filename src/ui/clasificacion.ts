// Leaderboard panel: best run of each player, by class. Opens from the title screen.

import { nube, type EntradaClasificacion, type EntradaClasificacionDuo } from '../core/nube.ts';
import type { ClaseId } from '../core/types.ts';
import { menosParticulas } from '../fx/particulas.ts';
import { el } from './util.ts';
import { NOMBRE_CLASE } from './nube-juego.ts';
import '../estilos/nube.css';

const CLASES = ['druida', 'barbaro', 'mago', 'picaro', 'brujo', 'paladin'] as const;
/** The multiplayer tab, next to the six classes. */
const TAB_DUO = 'duo';
const SECRETO_DM = 'Ha derrotado al Dungeon Master';
const CHISPAS_DM = 6;
type MostrarGlobo = (ancla: HTMLElement, texto?: string) => void;

export interface OpcionesClasificacion {
  /** Replays the true ending (only offered on the title screen). */
  repetirFinal?: (clase: ClaseId) => void;
}

/** Bubble with the DM secret. It lives in the dialog layer, not in the scrolling list,
 *  so the list never clips it; it opens above the medal, or below when there is no room. */
function globoDM(capa: HTMLElement) {
  const globo = el('span', 'clasif-dm-globo', SECRETO_DM);
  globo.setAttribute('role', 'status');
  capa.appendChild(globo);
  let ocultar: number | undefined;
  return (ancla: HTMLElement, texto = SECRETO_DM) => {
    globo.textContent = texto;
    const r = ancla.getBoundingClientRect();
    globo.classList.add('clasif-dm-abierto');
    const g = globo.getBoundingClientRect();
    const margen = 6;
    const arriba = r.top - g.height - margen >= margen;
    const x = Math.min(Math.max(r.left + r.width / 2 - g.width / 2, margen), window.innerWidth - g.width - margen);
    globo.style.left = `${x}px`;
    globo.style.top = `${arriba ? r.top - g.height - margen : r.bottom + margen}px`;
    window.clearTimeout(ocultar);
    ocultar = window.setTimeout(() => globo.classList.remove('clasif-dm-abierto'), 2600);
  };
}

/** The Dungeon Master's face with sparks around it. A click tells what it means (never how);
 *  a triple click on the player's own row replays the true ending. */
function medallonDM(propia: boolean, repetir: (() => void) | null, mostrarGlobo: MostrarGlobo): HTMLElement {
  const medallon = el('button', 'clasif-dm') as HTMLButtonElement;
  medallon.type = 'button';
  medallon.setAttribute('aria-label', SECRETO_DM);
  const cara = el('img', 'clasif-dm-cara') as HTMLImageElement;
  cara.src = `${import.meta.env.BASE_URL}icono-dm-192.png`;
  cara.alt = '';
  const marco = el('span', 'clasif-dm-marco'); // round window on the hooded face; the sparks fly outside it
  marco.appendChild(cara);
  medallon.appendChild(marco);
  if (!menosParticulas()) {
    for (let i = 0; i < CHISPAS_DM; i++) {
      const chispa = el('span', 'clasif-dm-chispa');
      chispa.style.setProperty('--i', String(i));
      medallon.appendChild(chispa);
    }
  }
  medallon.addEventListener('click', (ev) => {
    ev.stopPropagation();
    if (ev.detail >= 3 && propia && repetir) { repetir(); return; }
    mostrarGlobo(medallon);
  });
  return medallon;
}

function iconoResultado(
  e: { dmDefeated?: boolean; result: 'victory' | 'defeat'; killer?: string | null; finalBoss?: string | null },
  propia: boolean, repetir: (() => void) | null, mostrarGlobo: MostrarGlobo,
): HTMLElement {
  // the true ending outranks any other victory: the Dungeon Master himself fell
  if (e.dmDefeated) return medallonDM(propia, repetir, mostrarGlobo);
  // the icon tells, on click/tap, which final boss fell or who killed the hero
  const victoria = e.result === 'victory';
  const texto = victoria
    ? (e.finalBoss ? `Derrotó a ${e.finalBoss}` : 'Victoria')
    : (e.killer ? `Cayó ante ${e.killer}` : 'Derrota');
  const res = el('button', 'clasif-resultado', victoria ? '🏆' : '💀') as HTMLButtonElement;
  res.type = 'button';
  res.setAttribute('aria-label', texto);
  res.title = texto;
  res.addEventListener('click', (ev) => { ev.stopPropagation(); mostrarGlobo(res, texto); });
  return res;
}

function fila(e: EntradaClasificacion, posicion: number, propia: boolean, repetir: (() => void) | null,
  mostrarGlobo: MostrarGlobo): HTMLElement {
  const f = el('li', `clasif-fila${propia ? ' clasif-propia' : ''}`);
  f.appendChild(el('span', 'clasif-pos', String(posicion)));
  const nombre = el('span', 'clasif-nombre');
  nombre.textContent = e.displayName || 'Aventurero anónimo';
  if (!e.displayName) nombre.classList.add('clasif-anonimo');
  f.appendChild(nombre);
  f.appendChild(iconoResultado(e, propia, repetir, mostrarGlobo));
  f.appendChild(el('span', 'clasif-avance', `Cap. ${e.chapter + 1} · piso ${e.floor}`));
  f.appendChild(el('span', 'clasif-turnos', `${e.turns} turnos`));
  return f;
}

/** Multiplayer row: both players with their class on the same line («Ana · Druida + Bea · Mago»). */
function filaDuo(e: EntradaClasificacionDuo, posicion: number, propia: boolean,
  mostrarGlobo: MostrarGlobo): HTMLElement {
  const f = el('li', `clasif-fila clasif-fila-duo${propia ? ' clasif-propia' : ''}`);
  f.appendChild(el('span', 'clasif-pos', String(posicion)));
  const nombre = el('span', 'clasif-nombre');
  nombre.textContent = e.players
    .map((p) => `${p.displayName || 'Aventurero anónimo'} · ${NOMBRE_CLASE[p.heroClass] ?? p.heroClass}`)
    .join(' + ');
  nombre.title = nombre.textContent;
  f.appendChild(nombre);
  f.appendChild(iconoResultado(e, false, null, mostrarGlobo));
  f.appendChild(el('span', 'clasif-avance', `Cap. ${e.chapter + 1} · piso ${e.floor}`));
  f.appendChild(el('span', 'clasif-turnos', `${e.turns} turnos`));
  return f;
}

/** Opens the leaderboard. Resolves when the player closes it. */
export function pantallaClasificacion(opciones: OpcionesClasificacion = {}): Promise<void> {
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
    const mostrarGlobo = globoDM(capa);

    const aviso = (texto: string) => { lista.replaceChildren(el('p', 'clasif-vacio', texto)); };

    async function cargar() {
      const mia = ++peticion;
      aviso('Cargando…');
      const yo = nube.usuario()?.id;
      if (clase === TAB_DUO) {
        const entradas = await nube.clasificacionDuo(20);
        if (mia !== peticion) return;
        if (entradas === null) return aviso('Sin conexión: no se pudo cargar la clasificación.');
        if (entradas.length === 0) return aviso('Nadie ha terminado una partida en dúo todavía. ¡Sed los primeros!');
        const ol = el('ol', 'clasif-tabla');
        entradas.forEach((e, i) => ol.appendChild(filaDuo(e, i + 1, e.players.some((p) => p.userId === yo), mostrarGlobo)));
        lista.replaceChildren(ol);
        return;
      }
      const entradas = await nube.clasificacion(clase, 20);
      if (mia !== peticion) return; // the player already picked another class
      if (entradas === null) return aviso('Sin conexión: no se pudo cargar la clasificación.');
      if (entradas.length === 0) return aviso('Nadie ha terminado una partida con esta clase todavía. ¡Sé el primero!');
      const ol = el('ol', 'clasif-tabla');
      const repetirCon = (e: EntradaClasificacion) => opciones.repetirFinal
        ? () => { cerrar(); opciones.repetirFinal!(e.heroClass as ClaseId); }
        : null;
      entradas.forEach((e, i) => ol.appendChild(fila(e, i + 1, e.userId === yo, repetirCon(e), mostrarGlobo)));
      lista.replaceChildren(ol);
      if (!nube.haySesion()) {
        lista.appendChild(el('p', 'clasif-pista', 'Crea una cuenta en ⚙️ Ajustes para aparecer aquí.'));
      }
    }

    const pestanas = [...CLASES, TAB_DUO] as const;
    const botones = pestanas.map((c) => {
      const b = el('button', 'clasif-clase', c === TAB_DUO ? '👥 Dúo' : NOMBRE_CLASE[c]) as HTMLButtonElement;
      b.setAttribute('role', 'tab');
      b.addEventListener('click', () => { clase = c; marcar(); void cargar(); });
      selector.appendChild(b);
      return b;
    });
    const marcar = () => botones.forEach((b, i) => {
      const activa = pestanas[i] === clase;
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
