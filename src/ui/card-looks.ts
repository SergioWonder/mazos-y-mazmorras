// Which cards are drawn full art, and the glow colour of each card (class colour,
// with a couple of cards that have their own).

import type { CartaDef } from '../core/types.ts';

/** Portrait full-art cards: the unique class cards and the two d20 cards. */
const FULL_ART = new Set(['tormenta-venganza', 'furia-indomita', 'maestria-conjuros', 'danza-mortal', 'pacto-final', 'seducir', 'deseo']);
export const hasFullArt = (def: CartaDef) => FULL_ART.has(def.id);

const CLASS_GLOW: Record<CartaDef['clase'], string> = {
  druida: '#a8e070', barbaro: '#ff9a50', mago: '#a896ff', picaro: '#72e0cc', brujo: '#c98bff', neutral: '#ffe0a0',
};
const CARD_GLOW: Record<string, string> = { seducir: '#ff7ab0', deseo: '#ffd86a' };

/** Glow colour of a card (frame pulse and particles of full-art cards). */
export const lookOf = (def: CartaDef) => ({ glow: CARD_GLOW[def.id] ?? CLASS_GLOW[def.clase] });
