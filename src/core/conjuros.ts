import type { EspacioConjuro } from './types.ts';

export const NIVEL_MAX_CONJURO = 3;

/**
 * Construye la pirámide de espacios de conjuro a partir del total acumulado.
 * Cada espacio nuevo se coloca en el nivel MÁS ALTO posible, con la condición
 * de que cada nivel siempre tenga menos espacios que el nivel inferior:
 *
 *   1 → [1]            (1 de nivel 1)
 *   2 → [2]            (2 de nivel 1)
 *   3 → [2,1]          (2 de nivel 1, 1 de nivel 2)
 *   4 → [3,1]
 *   5 → [3,2]
 *   6 → [3,2,1]        pirámide completa
 *   7 → [4,2,1] …
 */
export function piramideConjuros(total: number): number[] {
  const cuenta = [0, 0, 0]; // índice 0 = nivel 1
  for (let i = 0; i < total; i++) {
    let nivel = 1;
    for (let k = 2; k <= NIVEL_MAX_CONJURO; k++) {
      if (cuenta[k - 1] + 1 < cuenta[k - 2]) nivel = k;
    }
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
