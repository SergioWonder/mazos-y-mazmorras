import type { EspacioConjuro } from './types.ts';

export const NIVEL_MAX_CONJURO = 3;

/**
 * Construye la pirámide de espacios de conjuro a partir del total acumulado.
 * Los espacios aparecen SIEMPRE en este orden de nivel conforme se añaden:
 *
 *   1, 1, 2, 1, 2, 3   → completa la pirámide [3,2,1]
 *
 * y, a partir del sexto, todos los espacios extra son de nivel 1 (los niveles
 * 2 y 3 quedan topados en 2 y 1 respectivamente). Así:
 *
 *   1 → [1]            5 → [3,2]
 *   2 → [2]            6 → [3,2,1]   pirámide completa
 *   3 → [2,1]          7 → [4,2,1]
 *   4 → [3,1]          8 → [5,2,1] …
 */
const ORDEN_NIVELES = [1, 1, 2, 1, 2, 3]; // nivel de cada espacio según se añade

export function piramideConjuros(total: number): number[] {
  const cuenta = [0, 0, 0]; // índice 0 = nivel 1
  for (let i = 0; i < total; i++) {
    const nivel = ORDEN_NIVELES[i] ?? 1; // a partir del sexto, todos nivel 1
    cuenta[nivel - 1]++;
  }
  return cuenta;
}

/** Lista de espacios (sin gastar) derivada del total, ordenada por nivel. */
export function crearEspacios(total: number): EspacioConjuro[] {
  const cuenta = piramideConjuros(total);
  const espacios: EspacioConjuro[] = [];
  cuenta.forEach((n, i) => {
    for (let j = 0; j < n; j++) espacios.push({ nivel: i + 1, gastado: false });
  });
  return espacios;
}
