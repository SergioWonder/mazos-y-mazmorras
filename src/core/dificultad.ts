// Difficulty of the normal fights, by how many enemies there are and how far
// into the act the fight comes. Pure: the combat applies it to the enemies' HP,
// to the damage of the attacks they announce and, in groups of three or more,
// to who attacks each round (they take turns, so they never all hit at once).
// Elites and bosses are tuned one by one and are left as they are.

/** What kind of fight this is and, for normal fights, its place in the act (0 = the first). */
export interface ContextoEncuentro {
  tipo: 'normal' | 'elite' | 'jefe';
  orden?: number;
}

export interface AjusteEncuentro {
  /** Multiplier of each enemy's HP. */
  pv: number;
  /** Multiplier of the base damage of every attack they announce. */
  dano: number;
  /** In groups of three or more, they take turns to attack. */
  alternan: boolean;
}

/** Normal fights of each act that are gentler than the rest. */
export const PRIMEROS_FACILES = 3;

const NEUTRO: AjusteEncuentro = { pv: 1, dano: 1, alternan: false };
/** A lone enemy has nobody to share the hits with: it is tougher and hits harder. */
const SOLO: AjusteEncuentro = { pv: 1.4, dano: 1.25, alternan: false };
/** Three or more take turns to attack (at most half of them each round; the rest
 *  guard or prepare) and hit a little softer. */
const GRUPO: AjusteEncuentro = { pv: 1, dano: 0.9, alternan: true };
/** The first fights of an act ease you into it. */
const SUAVE = { pv: 0.85, dano: 0.8 };

const redondea = (x: number) => Math.round(x * 100) / 100;

export function ajusteEncuentro(ctx: ContextoEncuentro | undefined, enemigos: number): AjusteEncuentro {
  if (!ctx || ctx.tipo !== 'normal') return NEUTRO;
  const base = enemigos === 1 ? SOLO : enemigos >= 3 ? GRUPO : NEUTRO;
  if ((ctx.orden ?? PRIMEROS_FACILES) >= PRIMEROS_FACILES) return base;
  return { pv: redondea(base.pv * SUAVE.pv), dano: redondea(base.dano * SUAVE.dano), alternan: base.alternan };
}
