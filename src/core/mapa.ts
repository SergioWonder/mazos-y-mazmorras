import type { NodoMapa, TipoNodo } from './types.ts';
import { elegir } from './rng.ts';

/**
 * Genera el mapa de un capítulo: un grafo de 10 filas que sube hasta el jefe,
 * al estilo Slay the Spire, con hueco para eventos, hogueras y tabernas.
 */
export function generarMapa(rng: () => number): NodoMapa[] {
  const nodos: NodoMapa[] = [];
  let id = 0;

  const tiposPorFila: Array<() => TipoNodo> = [
    () => 'combate',
    () => 'combate',
    () => (rng() < 0.35 ? 'evento' : rng() < 0.2 ? 'descanso' : 'combate'),
    () => (rng() < 0.4 ? 'evento' : rng() < 0.2 ? 'descanso' : 'combate'),
    () => 'cofre', // central row: the chapter's only row of chests
    () => (rng() < 0.25 ? 'elite' : rng() < 0.4 ? 'evento' : rng() < 0.25 ? 'descanso' : 'combate'),
    () => (rng() < 0.35 ? 'elite' : rng() < 0.45 ? 'descanso' : 'combate'),
    () => (rng() < 0.4 ? 'evento' : rng() < 0.25 ? 'descanso' : 'combate'),
    () => 'descanso',
    () => 'jefe',
  ];
  const anchoPorFila = [2, 3, 3, 3, 2, 3, 3, 2, 2, 1];
  const numFilas = anchoPorFila.length;

  const filas: NodoMapa[][] = [];
  for (let f = 0; f < numFilas; f++) {
    const ancho = anchoPorFila[f];
    const fila: NodoMapa[] = [];
    for (let c = 0; c < ancho; c++) {
      const nodo: NodoMapa = {
        id: id++, fila: f, col: c, tipo: tiposPorFila[f](),
        siguientes: [], visitado: false,
      };
      fila.push(nodo);
      nodos.push(nodo);
    }
    filas.push(fila);
  }
  // Garantías: élite y al menos 2 eventos en el tramo medio (los cofres ya
  // ocupan entera la fila central, la 4)
  if (!nodos.some((n) => n.tipo === 'elite')) elegir(rng, filas[6]).tipo = 'elite';
  let intentos = 0;
  while (nodos.filter((n) => n.tipo === 'evento').length < 2 && intentos++ < 50) {
    const fila = filas[2 + Math.floor(rng() * 6)];
    const candidatos = fila.filter((n) => n.tipo === 'combate');
    if (candidatos.length === 0) continue;
    elegir(rng, candidatos).tipo = 'evento';
  }
  // … y al menos 2 hogueras en el tramo medio (además de la fija ante el jefe)
  intentos = 0;
  while (
    nodos.filter((n) => n.tipo === 'descanso' && n.fila < 8).length < 2 &&
    intentos++ < 50
  ) {
    const fila = filas[3 + Math.floor(rng() * 5)];
    const candidatos = fila.filter((n) => n.tipo === 'combate');
    if (candidatos.length === 0) continue;
    elegir(rng, candidatos).tipo = 'descanso';
  }

  // Conexiones: cada nodo enlaza con los 1-2 nodos más cercanos de la fila superior
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
      if (orden.length > 1 && rng() < 0.55) n.siguientes.push(orden[1].id);
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

/** Turns 1–2 fights into taverns (rows 1–5: never the first row nor next to the
 *  boss), only where a quest target 2–4 rows ahead exists. Only fights are
 *  converted, so the event/campfire/elite/chest guarantees stay intact. */
function colocarTabernas(nodos: NodoMapa[], rng: () => number) {
  const cuantas = rng() < 0.45 ? 2 : 1;
  const tabernas: NodoMapa[] = [];
  for (let i = 0; i < cuantas; i++) {
    const posibles = nodos.filter((n) => {
      if (n.tipo !== 'combate' || n.fila < 1 || n.fila > 5) return false;
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
