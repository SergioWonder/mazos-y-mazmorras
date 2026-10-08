// Heroes seen from behind: the puppets that walk into the chapter openings,
// painted 'backlit' (ui/puppet-sprite.ts) over the empty scenario. One rig per
// class in fx/heroes/espalda/. Same engine and viewBox as the side views
// (140×135), but the figure faces away from us: centred on the feet at
// BACK_FEET, both legs and arms visible, the back read through LIT_EDGES lines.

import type { ClaseId } from '../core/types.ts';
import type { PuppetRig } from './puppet.ts';
import { BARBARO_BACK_RIG } from './heroes/espalda/barbaro.ts';
import { BRUJO_BACK_RIG } from './heroes/espalda/brujo.ts';
import { DRUIDA_BACK_RIG } from './heroes/espalda/druida.ts';
import { MAGO_BACK_RIG } from './heroes/espalda/mago.ts';
import { PALADIN_BACK_RIG } from './heroes/espalda/paladin.ts';
import { PICARO_BACK_RIG } from './heroes/espalda/picaro.ts';

/** Point between the feet, on the ground line (viewBox units). */
export const BACK_FEET: [number, number] = [58, 128];
/** Height of a standard hero from the feet to the top of the head (viewBox units):
 *  the chapter layers size the puppet by it. */
export const BACK_FIGURE_HEIGHT = 80;

export const HERO_BACK_RIGS: Record<ClaseId, PuppetRig> = {
  druida: DRUIDA_BACK_RIG, barbaro: BARBARO_BACK_RIG, mago: MAGO_BACK_RIG, picaro: PICARO_BACK_RIG,
  brujo: BRUJO_BACK_RIG, paladin: PALADIN_BACK_RIG,
};
