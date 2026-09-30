// Order of the deck viewer: attacks, skills, powers and curses; within each,
// by cost and name, with the upgraded copy after the plain one. Pure.

import type { CartaInstancia, TipoCarta } from '../core/types.ts';
import { defDe } from '../core/cartas.ts';

const ORDEN_TIPO: Record<TipoCarta, number> = { ataque: 0, habilidad: 1, poder: 2, maldicion: 3 };

/** A sorted copy of `cartas` for the viewer (the deck itself is left untouched). */
export function ordenarParaVisor(cartas: CartaInstancia[]): CartaInstancia[] {
  return [...cartas].sort((a, b) => {
    const da = defDe(a), db = defDe(b);
    return ORDEN_TIPO[da.tipo] - ORDEN_TIPO[db.tipo]
      || da.coste - db.coste
      || a.def.nombre.localeCompare(b.def.nombre, 'es')
      || Number(a.mejorada) - Number(b.mejorada);
  });
}
