// Prodigious Spell VFX: every cast draws a random spell effect, and the bigger
// the spell, the grander the repertoire it draws from (plain spells, rare cards'
// sequences, unique cards' sequences and, at the top, the Dungeon Master's ray).
// Pure: the combat screen calls it when the card starts resolving.

import { cartaPorId } from '../core/cartas.ts';
import { CARD_FX, cardSpellKey } from '../fx/card-spells.ts';
import { SPELLS } from '../fx/spell-fx.ts';

export type ProdigiousTier = 'basic' | 'rare' | 'unique' | 'dm';

/** Damage from which each tier starts. */
export const PRODIGIOUS_THRESHOLDS = { rare: 30, unique: 50, dm: 80 } as const;

/** Plain magic effects that land on the target (no physical hits, enemy moves or status-only looks). */
const BASIC = ['estrellas', 'divino', 'ola', 'luna', 'abisal', 'oscuridad', 'tierra', 'hojas', 'sangre', 'condena'];
/** Card sequences that would read as something else on an enemy (a charm, a volley dart). */
const EXCLUDED_CARDS = new Set(['seducir', 'proyectil-magico', 'explosion-sobrenatural']);

export function prodigiousTier(damage: number): ProdigiousTier {
  if (damage >= PRODIGIOUS_THRESHOLDS.dm) return 'dm';
  if (damage >= PRODIGIOUS_THRESHOLDS.unique) return 'unique';
  if (damage >= PRODIGIOUS_THRESHOLDS.rare) return 'rare';
  return 'basic';
}

/** Card sequences of the given rarity that land on the target. */
function cardSequences(rareza: 'rara' | 'especial'): string[] {
  return Object.keys(CARD_FX)
    .filter((id) => !EXCLUDED_CARDS.has(id) && cartaPorId(id)?.rareza === rareza)
    .map((id) => cardSpellKey(id))
    .filter((key) => SPELLS[key]?.anchor === 'target');
}

/** Spell keys a tier picks from. */
export function prodigiousPool(tier: ProdigiousTier): string[] {
  if (tier === 'dm') return ['rayoDM'];
  if (tier === 'unique') return cardSequences('especial');
  if (tier === 'rare') return cardSequences('rara');
  return BASIC.filter((key) => !!SPELLS[key]);
}

/** Random spell effect for a Prodigious Spell dealing `damage`. */
export function prodigiousSpell(damage: number, rng: () => number = Math.random): string {
  const pool = prodigiousPool(prodigiousTier(damage));
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}
