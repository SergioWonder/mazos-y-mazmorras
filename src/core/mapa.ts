import type { NodoMapa, TipoNodo } from './types.ts';
import { elegir } from './rng.ts';

/**
 * Genera el mapa de un capítulo: un grafo de 10 filas que sube hasta el jefe,
 * al estilo Slay the Spire, con hueco para eventos y hogueras.
 */
export function generarMapa(rng: () => number): NodoMapa[] {
  const nodos: NodoMapa[] = [];
  let id = 0;

  const tiposPorFila: Array<() => TipoNodo> = [
    () => 'combate',
    () => 'combate',
    () => (rng() < 0.35 ? 'evento' : rng() < 0.2 ? 'descanso' : 'combate'),
    () => (rng() < 0.3 ? 'cofre' : rng() < 0.4 ? 'evento' : 'combate'),
    () => (rng() < 0.35 ? 'elite' : rng() < 0.45 ? 'descanso' : 'combate'),
    () => (rng() < 0.4 ? 'evento' : rng() < 0.25 ? 'descanso' : 'combate'),
    () => (rng() < 0.35 ? 'elite' : rng() < 0.45 ? 'descanso' : 'combate'),
    () => (rng() < 0.3 ? 'cofre' : rng() < 0.4 ? 'evento' : rng() < 0.25 ? 'descanso' : 'combate'),
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
  // Garantías: élite, cofre y al menos 2 eventos en el tramo medio
  if (!nodos.some((n) => n.tipo === 'elite')) elegir(rng, filas[6]).tipo = 'elite';
  if (!nodos.some((n) => n.tipo === 'cofre')) elegir(rng, filas[7]).tipo = 'cofre';
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
  return nodos;
}

/** Nodos a los que se puede viajar ahora mismo. */
export function nodosDisponibles(mapa: NodoMapa[], nodoActual: number): NodoMapa[] {
  if (nodoActual === -1) return mapa.filter((n) => n.fila === 0);
  const actual = mapa.find((n) => n.id === nodoActual)!;
  return mapa.filter((n) => actual.siguientes.includes(n.id));
}
