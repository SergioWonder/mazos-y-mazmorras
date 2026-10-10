import type { NodoMapa, TipoNodo } from './types.ts';
import { elegir } from './rng.ts';

/**
 * Genera el mapa de un capítulo: un grafo de 13 filas que sube hasta el jefe,
 * al estilo Slay the Spire, con hueco para eventos, hogueras y tabernas.
 * Casi siempre 3 caminos por fila (a veces 2 o 4), poco enlazados entre sí,
 * para que elegir ruta pese.
 */
export function generarMapa(rng: () => number): NodoMapa[] {
  const nodos: NodoMapa[] = [];
  let id = 0;

  const tiposPorFila: Array<() => TipoNodo> = [
    () => 'combate',
    () => 'combate',
    () => (rng() < 0.35 ? 'evento' : rng() < 0.2 ? 'descanso' : 'combate'),
    () => (rng() < 0.35 ? 'evento' : rng() < 0.2 ? 'descanso' : 'combate'),
    () => (rng() < 0.4 ? 'evento' : rng() < 0.2 ? 'descanso' : 'combate'),
    () => (rng() < 0.15 ? 'elite' : rng() < 0.35 ? 'evento' : 'combate'),
    () => 'cofre', // central row: the chapter's only row of chests
    () => (rng() < 0.25 ? 'elite' : rng() < 0.4 ? 'evento' : rng() < 0.25 ? 'descanso' : 'combate'),
    () => (rng() < 0.3 ? 'elite' : rng() < 0.3 ? 'evento' : rng() < 0.3 ? 'descanso' : 'combate'),
    () => (rng() < 0.35 ? 'elite' : rng() < 0.45 ? 'descanso' : 'combate'),
    () => (rng() < 0.4 ? 'evento' : rng() < 0.25 ? 'descanso' : 'combate'),
    () => 'descanso',
    () => 'jefe',
  ];
  // mostly three choices per level, sometimes two or four; the chest row and the
  // last campfire stay at three, and the boss alone at the top
  const ancho = () => { const r = rng(); return r < 0.22 ? 2 : r < 0.78 ? 3 : 4; };
  const anchoPorFila = tiposPorFila.map((_, f) =>
    f === tiposPorFila.length - 1 ? 1 : f === 6 || f === tiposPorFila.length - 2 ? 3 : ancho());
  const numFilas = anchoPorFila.length;
  /** Rows the guarantees below may touch: between the opening fights and the last campfire. */
  const MEDIO = { desde: 2, hasta: numFilas - 3 };
  const DESCANSO_JEFE = numFilas - 2;

  const filas: NodoMapa[][] = [];
  for (let f = 0; f < numFilas; f++) {
    const fila: NodoMapa[] = [];
    for (let c = 0; c < anchoPorFila[f]; c++) {
      const nodo: NodoMapa = {
        id: id++, fila: f, col: c, tipo: tiposPorFila[f](),
        siguientes: [], visitado: false,
      };
      fila.push(nodo);
      nodos.push(nodo);
    }
    filas.push(fila);
  }
  // Garantías: élite y al menos 3 eventos en el tramo medio (los cofres ya
  // ocupan entera la fila central)
  if (!nodos.some((n) => n.tipo === 'elite')) elegir(rng, filas[9]).tipo = 'elite';
  let intentos = 0;
  while (nodos.filter((n) => n.tipo === 'evento').length < 3 && intentos++ < 60) {
    const fila = filas[MEDIO.desde + Math.floor(rng() * (MEDIO.hasta - MEDIO.desde + 1))];
    const candidatos = fila.filter((n) => n.tipo === 'combate');
    if (candidatos.length === 0) continue;
    elegir(rng, candidatos).tipo = 'evento';
  }
  // … y al menos 2 hogueras en el tramo medio (además de la fila fija ante el jefe)
  intentos = 0;
  while (
    nodos.filter((n) => n.tipo === 'descanso' && n.fila < DESCANSO_JEFE).length < 2 &&
    intentos++ < 60
  ) {
    const fila = filas[3 + Math.floor(rng() * (MEDIO.hasta - 2))];
    const candidatos = fila.filter((n) => n.tipo === 'combate');
    if (candidatos.length === 0) continue;
    elegir(rng, candidatos).tipo = 'descanso';
  }

  // Conexiones: cada nodo enlaza con el nodo más cercano de la fila superior y, a
  // veces, con el siguiente más cercano (pocas bifurcaciones: rutas más separadas)
  for (let f = 0; f < numFilas - 1; f++) {
    const actual = filas[f];
    const arriba = filas[f + 1];
    for (const n of actual) {
      const pos = (n.col + 0.5) / actual.length;
      const orden = [...arriba].sort(
        (a, b) =>
          Math.abs((a.col + 0.5) / arriba.length - pos) -
          Math.abs((b.col + 0.5) / arriba.length - pos),
      );
      n.siguientes.push(orden[0].id);
      if (orden.length > 1 && rng() < 0.3) n.siguientes.push(orden[1].id);
    }
    // Asegura que todos los nodos de arriba son alcanzables
    for (const arr of arriba) {
      if (!actual.some((n) => n.siguientes.includes(arr.id))) {
        const cercano = [...actual].sort(
          (a, b) =>
            Math.abs((a.col + 0.5) / actual.length - (arr.col + 0.5) / arriba.length) -
            Math.abs((b.col + 0.5) / actual.length - (arr.col + 0.5) / arriba.length),
        )[0];
        cercano.siguientes.push(arr.id);
      }
    }
  }
  colocarTabernas(nodos, rng);
  return nodos;
}

/** Deterministic 0..1 noise for a node (its id and the map's size as the seed). */
function ruido(id: number, sal: number, k: number): number {
  let h = Math.imul(id + 1, 0x9e3779b1) ^ Math.imul(sal + 7, 0x85ebca6b) ^ Math.imul(k + 3, 0xc2b2ae35);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

/** Width (% of the map) of the central band the paths use: the parchment's sides
 *  are drawn (a road, a river, buildings), and the icons must keep clear of them. */
export const ANCHO_MAPA = 62;

/**
 * Where a node is drawn on the map, in % of the map (row 0 at the bottom). The
 * grid is nudged so it looks drawn by hand: each row leans a little to one side
 * and each node moves a little, never so much that two nodes touch or a level
 * slips below the previous one. Stable: the same map always looks the same.
 */
export function posicionNodo(mapa: NodoMapa[], n: NodoMapa): { x: number; y: number } {
  const filas = Math.max(...mapa.map((m) => m.fila)) + 1;
  const enFila = mapa.filter((m) => m.fila === n.fila).length;
  const sal = mapa.length;
  const margen = (100 - ANCHO_MAPA) / 2;
  const paso = ANCHO_MAPA / enFila;               // room between paths in this row
  const salto = 82 / Math.max(1, filas - 1);      // room between levels
  const jefe = enFila === 1 && n.fila === filas - 1;
  const inclinacion = jefe ? 0 : (ruido(n.fila, sal, 1) - 0.5) * Math.min(8, paso * 0.4);
  const dx = jefe ? 0 : (ruido(n.id, sal, 2) - 0.5) * paso * 0.42;
  // levels are close together: a small vertical nudge, so neighbours never touch
  const dy = jefe ? 0 : (ruido(n.id, sal, 3) - 0.5) * salto * 0.17;
  const x = ((n.col + 0.5) / enFila) * ANCHO_MAPA + margen + inclinacion + dx;
  const y = 90 - n.fila * salto + dy;
  return { x: Math.min(100 - margen + 2, Math.max(margen - 2, x)), y };
}

/** Node types a tavern rumour can point at. */
export const TIPOS_MISION: TipoNodo[] = ['combate', 'elite', 'evento', 'cofre'];
/** Row distance (min/max) between a tavern and the node its rumour marks. */
export const DISTANCIA_MISION = { min: 2, max: 4 };

/** Ids of every node reachable from `desde` by following the paths (itself excluded). */
export function alcanzablesDesde(mapa: NodoMapa[], desde: number): Set<number> {
  const porId = new Map(mapa.map((n) => [n.id, n]));
  const cola = desde === -1
    ? mapa.filter((n) => n.fila === 0).map((n) => n.id)
    : [...(porId.get(desde)?.siguientes ?? [])];
  const vistos = new Set<number>();
  while (cola.length) {
    const id = cola.pop()!;
    if (vistos.has(id)) continue;
    vistos.add(id);
    cola.push(...(porId.get(id)?.siguientes ?? []));
  }
  return vistos;
}

/** true if `objetivo` can still be reached from `desde`. */
export function esAlcanzable(mapa: NodoMapa[], desde: number, objetivo: number): boolean {
  return alcanzablesDesde(mapa, desde).has(objetivo);
}

/** Unvisited nodes a tavern at `desde` can send you to: reachable, 2–4 rows
 *  ahead and of a quest-worthy type (fight, elite, event or chest). */
export function candidatosMision(mapa: NodoMapa[], desde: number): NodoMapa[] {
  const origen = mapa.find((n) => n.id === desde);
  if (!origen) return [];
  const alcanzables = alcanzablesDesde(mapa, desde);
  return mapa.filter((n) => {
    const d = n.fila - origen.fila;
    return alcanzables.has(n.id) && !n.visitado && TIPOS_MISION.includes(n.tipo)
      && d >= DISTANCIA_MISION.min && d <= DISTANCIA_MISION.max;
  });
}

/** Turns 1–2 fights into taverns (rows 1–8: never the first row nor near the
 *  boss), only where a quest target 2–4 rows ahead exists. Only fights are
 *  converted, so the event/campfire/elite/chest guarantees stay intact. */
function colocarTabernas(nodos: NodoMapa[], rng: () => number) {
  const cuantas = rng() < 0.45 ? 2 : 1;
  const tabernas: NodoMapa[] = [];
  for (let i = 0; i < cuantas; i++) {
    const posibles = nodos.filter((n) => {
      if (n.tipo !== 'combate' || n.fila < 1 || n.fila > 8) return false;
      if (tabernas.some((t) => t.fila === n.fila)) return false;
      if (candidatosMision(nodos, n.id).length === 0) return false;
      // converting it must not leave an earlier tavern without a target
      n.tipo = 'taberna';
      const ok = tabernas.every((t) => candidatosMision(nodos, t.id).length > 0);
      n.tipo = 'combate';
      return ok;
    });
    if (posibles.length === 0) break;
    const elegida = elegir(rng, posibles);
    elegida.tipo = 'taberna';
    tabernas.push(elegida);
  }
}

/** Nodos a los que se puede viajar ahora mismo. */
export function nodosDisponibles(mapa: NodoMapa[], nodoActual: number): NodoMapa[] {
  if (nodoActual === -1) return mapa.filter((n) => n.fila === 0);
  const actual = mapa.find((n) => n.id === nodoActual)!;
  return mapa.filter((n) => actual.siguientes.includes(n.id));
}
