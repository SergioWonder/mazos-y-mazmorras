// Badge of the paladin's prepared Smite: element icon, a short number for the
// badge beside the hero and the full description for its tooltip. Pure.

import type { CastigoPreparado, ElementoCastigo } from '../core/types.ts';

const ICONO: Record<ElementoCastigo, string> = {
  divino: '🌟', trueno: '🌩️', cegador: '😵', fuego: '🔥', resplandor: '✨', destierro: '🌀',
};

export interface ResumenCastigo { icono: string; corto: string; texto: string }

/** What the prepared Smite will do, in short (badge) and in full (tooltip). */
export function resumenCastigo(c: CastigoPreparado): ResumenCastigo {
  const partes: string[] = [];
  const corto: string[] = [];
  if (c.dano) { partes.push(`inflige ${c.dano} de daño más`); corto.push(`+${c.dano}`); }
  if (c.vulnerable) { partes.push(`aplica ${c.vulnerable} de Vulnerable`); corto.push(`🎯${c.vulnerable}`); }
  if (c.debil) { partes.push(`aplica ${c.debil} de Débil`); corto.push(`💧${c.debil}`); }
  if (c.salpicadura) { partes.push(`inflige ${c.salpicadura} a TODOS los enemigos`); corto.push(`💥${c.salpicadura}`); }
  if (c.destierro) { partes.push(`destierra al enemigo si queda con ${c.destierro} PV o menos`); corto.push(`≤${c.destierro}`); }
  if (c.bloqueoPorDano) partes.push('te da bloqueo igual al daño que haga');
  const lista = partes.length > 1 ? `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}` : partes[0] ?? '';
  return {
    icono: ICONO[c.elemento],
    corto: corto.join(' '),
    texto: `Tu próximo ataque ${lista}.`,
  };
}
