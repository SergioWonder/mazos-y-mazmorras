// Hero and druid-form puppets (backlit silhouette style). The engine lives in
// puppet.ts; each character's rig lives in its own file under fx/heroes/ (the
// druid file also holds the six forms). This module gathers them and keeps the
// id-based API used by the combat screen and the smoke test.

import type { ClaseId } from '../core/types.ts';
import {
  puppetBones, puppetPose, puppetEffects, puppetImpact,
  type ActionProgress, type BoneId, type EffectGeometry, type Effects, type Matrix, type Pose, type PuppetRig,
} from './puppet.ts';
import { BARBARO_RIG } from './heroes/barbaro.ts';
import { DRUIDA_RIG, FORM_RIGS, type FormId } from './heroes/druida.ts';
import { MAGO_RIG } from './heroes/mago.ts';
import { PICARO_RIG } from './heroes/picaro.ts';
import { BRUJO_RIG } from './heroes/brujo.ts';
import { PALADIN_RIG } from './heroes/paladin.ts';

export {
  ACTION_DURATION, EMISSIVE, EYES, activeAction, applyMatrix,
  type Action, type ActionProgress, type ActionType, type BoneId, type EffectGeometry, type Effects, type Matrix,
  type Pose, type Shape,
} from './puppet.ts';
export type HeroRig = PuppetRig;

export const HERO_RIGS: Record<ClaseId, HeroRig> = {
  druida: DRUIDA_RIG, barbaro: BARBARO_RIG, mago: MAGO_RIG, picaro: PICARO_RIG, brujo: BRUJO_RIG,
  paladin: PALADIN_RIG,
};
export { FORM_RIGS, type FormId };

export type RigId = ClaseId | FormId;

const FORM_LABELS: Record<string, FormId> = {
  'Forma de Lobo': 'lobo', 'Forma de Oso': 'oso', 'Forma de Águila': 'aguila',
  'Forma de Enjambre': 'enjambre', 'Forma Lunar': 'lunar', 'Forma Estelar': 'estelar',
};
/** Form silhouette for a temporary-effect label, or null if it is not a form. */
export function formFromLabel(label: string): FormId | null {
  return FORM_LABELS[label] ?? null;
}

/** Form to show among the active effects: the most recently cast one wins
 *  (effects are appended in casting order). */
export function currentForm(effects: { etiqueta: string }[]): FormId | null {
  for (let i = effects.length - 1; i >= 0; i--) {
    const f = formFromLabel(effects[i].etiqueta);
    if (f) return f;
  }
  return null;
}

export const rigOf = (id: RigId): HeroRig => (HERO_RIGS as Record<string, HeroRig>)[id] ?? FORM_RIGS[id as FormId];

/** World matrix of every bone for a pose. */
export const heroBones = (id: RigId, p: Pose): Record<BoneId, Matrix> => puppetBones(rigOf(id), p);
/** Pose and effects of a hero or form at time t (seconds), optionally mid-action. */
export const heroPose = (id: RigId, t: number, action: ActionProgress | null): { p: Pose; fx: Effects } =>
  puppetPose(rigOf(id), t, action);
/** World-space geometry of the slash arc, spell ring and projectile. */
export const heroEffects = (id: RigId, bones: Record<BoneId, Matrix>, fx: Effects): EffectGeometry =>
  puppetEffects(rigOf(id), bones, fx);
/** Fraction of an attack at which the blow lands (to sync damage numbers). */
export const impactFraction = (id: RigId): number => puppetImpact(rigOf(id));
