// Hero and druid-form puppets (backlit silhouette style). The engine lives in
// puppet.ts; this module holds the rigs and keeps the id-based API used by the
// combat screen and the smoke test.

import type { ClaseId } from '../core/types.ts';
import {
  C, E, P, L, puppetBones, puppetPose, puppetEffects, puppetImpact,
  type ActionProgress, type BoneId, type EffectGeometry, type Effects, type Matrix, type Pose, type PuppetRig, type Shape,
} from './puppet.ts';

export {
  ACTION_DURATION, EMISSIVE, EYES, activeAction, applyMatrix,
  type Action, type ActionProgress, type ActionType, type BoneId, type EffectGeometry, type Effects, type Matrix,
  type Pose, type Shape,
} from './puppet.ts';
export type HeroRig = PuppetRig;

export const HERO_RIGS: Record<ClaseId, HeroRig> = {
  druida: {
    accent: '#7dba4e', style: 'magic', phase: 0.0, focus: [70, 52],
    palette: { hoodD: '#2f4f27', hood: '#4f7d35', leaf: '#8cc152', robe: '#7a5634', robeD: '#5a3d25', boots: '#4a3322', belt: '#c19a52', skin: '#e2b48c', eye: '#1b140f', antler: '#c9a77a', wood: '#7b5530', gem: '#b6ff7a' },
    pivots: { weapon: [68, 97] },
    headScale: 0.82,
    rest: { armF: -15, weapon: 15, armB: 10, torso: 2, head: 5 },
    windup: { rootX: -3, torso: -6, head: -4, armF: -60, weapon: 40, armB: 25 },
    strike: { rootX: 6, torso: 8, head: 4, armF: -100, weapon: 55, armB: -20, legF: -8, legB: 5 },
    shapes: [
      P('cape', 'hoodD', [[49, 73], [62, 73], [62, 100], [59, 124], [55, 118], [51, 127], [46, 118], [40, 125], [37, 111], [42, 96]]),
      L('legB', 'robeD', 54, 100, 52, 121, 8), E('legB', 'boots', 51, 125, 6, 3.8),
      L('legF', 'robeD', 62, 100, 65, 121, 8), E('legF', 'boots', 67, 125, 6.5, 3.8),
      L('armB', 'hood', 52, 78, 49, 95, 8), C('armB', 'skin', 49, 97, 3.8),
      P('torso', 'robe', [[50, 75], [67, 75], [72, 114], [45, 114]]),
      P('torso', 'robeD', [[57, 98], [61, 98], [62, 114], [56, 114]]),
      P('torso', 'belt', [[48, 94], [69, 94], [69.7, 99], [47.4, 99]]),
      P('torso', 'hood', [[46, 71], [72, 71], [75, 82], [60, 87], [44, 82]]),
      C('torso', 'leaf', 48, 82, 3.2), C('torso', 'leaf', 55, 86, 3.2), C('torso', 'leaf', 63, 86, 3.2), C('torso', 'leaf', 71, 82, 3.2),
      C('head', 'hoodD', 59, 56, 18.5), C('head', 'skin', 63, 59, 12.5),
      P('head', 'hood', [[41, 58], [44, 43], [56, 35], [70, 38], [79, 48], [78, 54], [70, 46], [59, 44], [51, 50], [48, 68]]),
      L('head', 'antler', 51, 40, 45, 26, 3), L('head', 'antler', 48, 33, 41, 30, 2.5),
      L('head', 'antler', 63, 37, 67, 23, 3), L('head', 'antler', 65, 29, 72, 27, 2.5),
      C('head', 'eye', 69, 58, 2.2),
      L('armF', 'hood', 65, 78, 68, 95, 8),
      L('weapon', 'wood', 70, 62, 70, 127, 3.8), C('weapon', 'wood', 70, 57, 5),
      E('weapon', 'leaf', 64, 59, 4.5, 2.2), E('weapon', 'leaf', 76, 57, 4.5, 2.2),
      C('weapon', 'gem', 70, 52, 3.6),
      C('armF', 'skin', 68, 97, 4),
    ],
  },
  barbaro: {
    accent: '#d65a3a', style: 'melee', phase: 1.1, focus: [72, 99], slash: [26, 44],
    palette: { hair: '#c4532b', skin: '#c98a5e', fur: '#9b7b55', pants: '#5b3b26', boots: '#3e2a1d', steel: '#c3ced6', wood: '#6e4a2c', paint: '#3f7fc4', eye: '#1b140f', belt: '#8a5a2e', strap: '#6b3f22' },
    pivots: { armF: [68, 78], armB: [50, 78], weapon: [72, 99] },
    headScale: 0.84,
    rest: { armF: -25, weapon: 60, armB: 15, torso: 5, head: 6 },
    windup: { rootX: -5, torso: -10, head: -6, armF: 150, weapon: 190, armB: 120, legF: -6, legB: 6 },
    strike: { rootX: 12, torso: 14, head: 6, armF: 290, weapon: 190, armB: -40, legF: -14, legB: 10 },
    shapes: [
      P('cape', 'fur', [[46, 73], [61, 71], [58, 100], [53, 114], [49, 107], [44, 116], [40, 104], [38, 90]]),
      L('legB', 'pants', 54, 100, 50, 121, 10), E('legB', 'boots', 50, 125, 7, 4.5),
      L('legF', 'pants', 63, 100, 68, 121, 10), E('legF', 'boots', 70, 125, 7.5, 4.5),
      L('armB', 'skin', 50, 78, 45, 97, 10), L('armB', 'strap', 46, 90, 45, 95, 10.8), C('armB', 'skin', 45, 99, 5.5),
      P('torso', 'skin', [[45, 75], [73, 75], [70, 103], [48, 103]]),
      L('torso', 'strap', 49, 78, 69, 99, 4),
      P('torso', 'belt', [[47, 97], [71, 97], [71, 103], [47, 103]]),
      C('torso', 'steel', 59, 100, 2.6),
      P('torso', 'fur', [[54, 103], [66, 103], [65, 113], [55, 113]]),
      E('torso', 'fur', 49, 76, 10, 6), E('torso', 'fur', 69, 76, 9, 6),
      E('head', 'hair', 55, 58, 17, 18), C('head', 'skin', 62, 59, 13.5),
      P('head', 'hair', [[51, 62], [75, 62], [73, 74], [63, 83], [54, 74]]),
      L('head', 'hair', 60, 80, 60, 90, 4), C('head', 'belt', 60, 90, 2.4),
      P('head', 'hair', [[46, 52], [50, 42], [62, 39], [74, 44], [76, 52], [66, 48], [56, 50]]),
      L('head', 'strap', 47, 49, 75, 49, 3.4),
      L('head', 'paint', 64, 59.5, 73, 59.5, 2.2),
      C('head', 'eye', 69, 56, 2.2), L('head', 'hair', 65, 52.5, 72, 53.5, 2),
      L('armF', 'skin', 68, 78, 72, 97, 10.5), L('armF', 'strap', 71, 90, 72, 95, 11),
      L('weapon', 'wood', 72, 118, 72, 54, 4),
      P('weapon', 'steel', [[72, 54], [84, 46], [90, 58], [86, 72], [72, 66]]),
      P('weapon', 'steel', [[72, 57], [64, 59], [72, 63]]),
      L('weapon', 'strap', 72, 60, 72, 64, 5),
      C('armF', 'skin', 72, 99, 5.8),
    ],
  },
  mago: {
    accent: '#8a7ae0', style: 'magic', phase: 2.3, focus: [70, 55],
    palette: { robe: '#5d4bc9', robeD: '#3d3190', hat: '#4a3cae', star: '#ffd166', beard: '#eef0f5', skin: '#f0c49a', eye: '#1b140f', wood: '#8a5a32', orb: '#cbbcff', belt: '#d9a93f', boots: '#4a3450' },
    pivots: { weapon: [68, 97] },
    headScale: 0.84,
    rest: { armF: -12, weapon: 12, armB: 5, torso: 3, head: 6 },
    windup: { rootX: -3, torso: -5, head: -5, armF: -150, weapon: 150, armB: 30 },
    strike: { rootX: 5, torso: 10, head: 6, armF: -85, weapon: 55, armB: -30 },
    shapes: [
      P('cape', 'robeD', [[48, 76], [60, 72], [58, 104], [55, 121], [51, 115], [47, 124], [43, 112], [42, 94]]),
      E('legB', 'boots', 52, 126, 6, 3.5), E('legF', 'boots', 66, 126, 6.5, 3.5),
      L('armB', 'robeD', 52, 78, 48, 94, 9), C('armB', 'skin', 48, 97, 3.8),
      P('torso', 'robe', [[50, 75], [67, 75], [74, 122], [71, 127], [67, 123], [63, 128], [58, 123], [53, 128], [49, 123], [44, 126]]),
      P('torso', 'robeD', [[57, 77], [61, 77], [63, 126], [56, 126]]),
      P('torso', 'belt', [[49, 95], [69, 95], [69.7, 99.5], [48.3, 99.5]]),
      C('head', 'skin', 62, 60, 13),
      P('head', 'beard', [[51, 61], [74, 61], [71, 78], [62, 93], [55, 80]]),
      E('head', 'beard', 67, 64, 7, 3), C('head', 'skin', 74, 60.5, 3),
      C('head', 'eye', 68, 57, 2.2), L('head', 'beard', 64.5, 53, 71.5, 53, 2.4),
      E('head', 'hat', 60, 48, 21, 5),
      P('head', 'hat', [[45, 47], [75, 47], [66, 30], [57, 16], [43, 9], [52, 24]]),
      P('head', 'star', [[46, 43.5], [74, 43.5], [75, 47.5], [45, 47.5]]),
      C('head', 'star', 61, 34, 2.6),
      L('armF', 'robe', 64, 78, 68, 94, 9.5),
      L('weapon', 'wood', 70, 61, 70, 126, 3.6), C('weapon', 'wood', 70, 61, 3.8),
      C('weapon', 'orb', 70, 55, 5.5),
      C('armF', 'skin', 68, 97, 4),
    ],
  },
  picaro: {
    accent: '#4fb0a0', style: 'melee', phase: 3.4, focus: [71, 95], slash: [20, 32],
    palette: { scarf: '#4fb0a0', hood: '#2f4d49', hoodD: '#1f3431', leather: '#5a4636', leatherD: '#3a2d24', boots: '#2a2320', belt: '#8a6a44', skin: '#d9a882', mask: '#1c2626', eye: '#1b140f', steel: '#cfd8de' },
    pivots: { armF: [64, 78], weapon: [71, 95], offhand: [43, 95] },
    headScale: 0.84,
    rest: { torso: 8, head: 3, armF: -35, weapon: 20, armB: 25 },
    windup: { rootX: -4, torso: -4, head: -4, armF: 30, weapon: -10, armB: -30 },
    strike: { rootX: 18, torso: 18, head: 8, armF: -95, weapon: 15, armB: 60, legF: -18, legB: 14 },
    shapes: [
      P('cape', 'hoodD', [[50, 74], [60, 72], [58, 98], [55, 115], [51, 109], [47, 117], [43, 106], [44, 88]]),
      P('cape', 'scarf', [[57, 72], [50, 74], [36, 80], [30, 76], [38, 71], [52, 69]]),
      P('cape', 'scarf', [[52, 76], [40, 86], [34, 84], [46, 74]]),
      L('legB', 'leatherD', 54, 100, 46, 120, 8.5), E('legB', 'boots', 45, 124.5, 6.5, 4),
      L('legF', 'leatherD', 63, 100, 72, 119, 8.5), E('legF', 'boots', 74, 124.5, 7, 4.2),
      L('armB', 'hood', 52, 78, 44, 93, 7.5),
      L('offhand', 'leatherD', 43, 91, 43, 96, 2.8), P('offhand', 'steel', [[41.5, 97], [44.5, 97], [43, 111]]),
      C('armB', 'skin', 43, 95, 3.6),
      P('torso', 'leather', [[50, 75], [68, 75], [69, 101], [49, 101]]),
      L('torso', 'belt', 51, 77, 67, 99, 2.6),
      P('torso', 'belt', [[48.5, 96], [69.5, 96], [69.5, 100.5], [48.5, 100.5]]),
      E('torso', 'hood', 59, 76, 12, 5),
      C('head', 'hoodD', 58, 57, 18), C('head', 'skin', 63, 59, 12),
      P('head', 'mask', [[52, 60], [76, 60], [74, 68], [61, 72], [52, 68]]),
      P('head', 'hood', [[40, 62], [43, 45], [56, 37], [70, 39], [79, 48], [77, 53], [68, 46], [57, 45], [50, 52], [49, 72]]),
      C('head', 'eye', 69, 56.5, 2.2),
      L('armF', 'hood', 64, 78, 70, 93, 7.5),
      L('weapon', 'leatherD', 67, 95, 73, 95, 2.8), L('weapon', 'belt', 73, 91.5, 73, 98.5, 2),
      P('weapon', 'steel', [[74, 93], [90, 95], [74, 97]]),
      C('armF', 'skin', 71, 95, 3.8),
    ],
  },
  brujo: {
    accent: '#a15ce0', style: 'magic', phase: 4.6, focus: [73, 86],
    palette: { cloak: '#2e1b48', cloakD: '#1d1130', lining: '#7a2f9a', boots: '#231a2c', skin: '#cdbfd9', hair: '#1c1424', horn: '#5a4a62', eyeGlow: '#f0a0ff', tome: '#6b2130', gold: '#b9924a', flame: '#d68cff', flameCore: '#fff0ff' },
    pivots: { weapon: [69, 97] },
    headScale: 0.84,
    rest: { armF: -40, weapon: 40, armB: 10, torso: 2, head: 6 },
    windup: { rootX: -4, torso: -8, head: -6, armF: 10, weapon: -10, armB: 30 },
    strike: { rootX: 6, torso: 10, head: 8, armF: -92, weapon: 92, armB: -10 },
    shapes: [
      P('cape', 'cloakD', [[46, 74], [66, 74], [70, 120], [66, 126], [62, 120], [57, 127], [52, 120], [46, 127], [42, 119], [38, 126], [40, 104]]),
      P('cape', 'lining', [[45, 80], [49, 78], [45, 122], [39, 124]]),
      E('legB', 'boots', 52, 126, 6, 3.5), E('legF', 'boots', 67, 126, 6.5, 3.5),
      L('armB', 'cloak', 52, 78, 47, 94, 8.5),
      P('armB', 'tome', [[40, 94], [51, 92], [52, 104], [41, 106]]),
      L('armB', 'gold', 40.5, 94.5, 51, 92.5, 1.6),
      C('armB', 'skin', 47, 96, 3.8),
      P('torso', 'cloak', [[50, 75], [68, 75], [73, 126], [45, 126]]),
      P('torso', 'lining', [[58, 77], [61, 77], [62, 126], [57, 126]]),
      L('torso', 'cloakD', 49, 98, 70, 98, 3.5), C('torso', 'gold', 59.5, 98, 3),
      P('torso', 'cloak', [[48, 79], [45, 63], [53, 70], [58, 74], [66, 74], [73, 65], [71, 80]]),
      P('torso', 'lining', [[50, 77], [47, 67], [54, 72]]),
      C('head', 'hair', 58, 57, 15), C('head', 'skin', 63, 60, 12.5),
      P('head', 'hair', [[47, 54], [53, 44], [66, 42], [75, 48], [77, 54], [68, 50], [60, 52], [52, 62]]),
      P('head', 'horn', [[52, 47], [48, 38], [41, 33], [47, 33], [53, 39], [57, 45]]),
      P('head', 'horn', [[62, 44], [63, 35], [58, 28], [65, 31], [69, 39], [68, 46]]),
      C('head', 'eyeGlow', 69, 59, 2.4),
      L('armF', 'cloak', 65, 78, 69, 95, 8.5),
      C('armF', 'skin', 69, 97, 4),
      E('weapon', 'flame', 73, 86, 5, 7.5), P('weapon', 'flame', [[69.5, 84], [73, 73], [77, 84]]),
      E('weapon', 'flameCore', 73, 88, 2.4, 3.6),
    ],
  },
};

export type FormId = 'lobo' | 'oso' | 'aguila' | 'enjambre' | 'lunar' | 'estelar';
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

// Quadrupeds: armF/armB are the near/far front legs (they follow the body when it
// rears up), legF/legB the near/far hind legs, cape the tail.
function wolfShapes(lunar: boolean): Shape[] {
  const out: Shape[] = [
    P('cape', 'fur', [[37, 90], [22, 84], [11, 91], [20, 95], [36, 98]]),
    L('armB', 'fur', 76, 100, 78, 125, 6), E('armB', 'fur', 79, 126.5, 5, 2.5),
    L('legB', 'fur', 42, 100, 40, 125, 6), E('legB', 'fur', 41, 126.5, 5, 2.5),
    E('torso', 'fur', 58, 96, 26, 12),
    P('torso', 'fur', [[70, 86], [84, 84], [88, 98], [78, 108], [68, 104]]),
    P('torso', 'fur', [[44, 87], [52, 80], [58, 84], [64, 79], [70, 86], [56, 90]]),
    E('legF', 'fur', 46, 101, 9, 11), L('legF', 'fur', 46, 106, 44, 125, 6.5), E('legF', 'fur', 46, 126.5, 5.5, 2.8),
    L('armF', 'fur', 80, 100, 83, 125, 6.5), E('armF', 'fur', 85, 126.5, 5.5, 2.8),
    E('head', 'fur', 90, 78, 11, 9),
    P('head', 'fur', [[96, 73], [113, 78], [112, 83], [97, 86]]),
    P('head', 'fur', [[95, 84], [110, 84], [104, 90], [95, 90]]),
    P('head', 'fur', [[83, 73], [85, 58], [92, 70]]),
    P('head', 'fur', [[89, 71], [94, 59], [97, 72]]),
    C('head', 'eye', 96, 76, 1.9),
  ];
  if (lunar) {
    // bigger mane and a glowing crescent on the brow
    out.splice(6, 0, P('torso', 'fur', [[66, 80], [72, 66], [76, 78], [82, 68], [84, 82], [90, 76], [88, 92], [70, 92]]));
    out.push(P('head', 'moonGlow', [[88, 66], [92, 62], [97, 63], [93, 64], [90, 68]]));
  }
  return out;
}

function swarmShapes(): Shape[] {
  // deterministic scatter of insects in drifting clusters
  const clusters: [BoneId, number, number, number, number][] = [
    ['cape', 44, 96, 9, 7], ['legB', 52, 108, 8, 6], ['armB', 52, 82, 8, 7], ['torso', 62, 94, 11, 9],
    ['legF', 68, 106, 8, 6], ['armF', 74, 86, 8, 7], ['head', 84, 78, 7, 6],
  ];
  const out: Shape[] = [];
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const [bone, cx, cy, rx, ry] of clusters) {
    for (let i = 0; i < 11; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd());
      out.push(E(bone, 'bug', cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, 3, 2));
    }
    out.push(C(bone, 'eye', cx + (rnd() - 0.5) * rx, cy + (rnd() - 0.5) * ry, 0.9));
  }
  return out;
}

export const FORM_RIGS: Record<FormId, HeroRig> = {
  lobo: {
    accent: '#7dba4e', style: 'melee', phase: 0.4, focus: [96, 78], focusBone: 'head', slash: [18, 32],
    palette: { fur: '#3a3a3a', eye: '#1b140f' },
    pivots: { torso: [42, 100], head: [82, 86], cape: [37, 93], armF: [80, 100], armB: [76, 100], legF: [46, 100], legB: [42, 100] },
    rest: { head: 10, torso: 2 },
    windup: { rootX: -6, torso: -6, head: -10, armF: -15, legF: 10 },
    strike: { rootX: 16, torso: 6, head: 12, armF: -45, armB: -30, legF: 30, legB: 25, cape: -15 },
    shapes: wolfShapes(false),
  },
  oso: {
    accent: '#7dba4e', style: 'melee', phase: 1.2, focus: [108, 84], focusBone: 'head', slash: [22, 38],
    palette: { fur: '#3a2a20', eye: '#1b140f' },
    pivots: { torso: [40, 104], head: [86, 84], cape: [26, 88], armF: [82, 98], armB: [78, 98], legF: [44, 100], legB: [40, 100] },
    rest: { head: 9 },
    windup: { rootX: -4, torso: -24, head: -14, armF: -100, armB: -70 },
    strike: { rootX: 10, torso: 6, head: 10, armF: -30, armB: -10, legF: 8 },
    shapes: [
      E('cape', 'fur', 24, 88, 4, 3),
      L('armB', 'fur', 78, 98, 80, 124, 11), E('armB', 'fur', 81, 126.5, 7, 3),
      L('legB', 'fur', 40, 100, 38, 124, 11), E('legB', 'fur', 39, 126.5, 7, 3),
      E('torso', 'fur', 56, 92, 32, 19), E('torso', 'fur', 64, 76, 16, 9), E('torso', 'fur', 34, 92, 12, 15),
      P('torso', 'fur', [[46, 76], [52, 68], [56, 74], [61, 64], [66, 72], [72, 65], [74, 76]]),
      E('legF', 'fur', 44, 100, 12, 14), L('legF', 'fur', 44, 108, 42, 124, 12), E('legF', 'fur', 44, 126.5, 8, 3.5),
      L('armF', 'fur', 82, 96, 85, 124, 12), E('armF', 'fur', 87, 126.5, 8, 3.5),
      E('head', 'fur', 96, 82, 13, 11), E('head', 'fur', 108, 86, 8, 6),
      C('head', 'fur', 88, 71, 4.5), C('head', 'fur', 97, 70, 4),
      C('head', 'eye', 102, 79, 1.9),
    ],
  },
  aguila: {
    accent: '#7dba4e', style: 'melee', phase: 2.0, focus: [60, 104], focusBone: 'torso', slash: [16, 30], flap: 22,
    palette: { feather: '#4a3a2a', eye: '#1b140f' },
    pivots: { torso: [60, 82], head: [70, 76], cape: [46, 86], armF: [62, 76], armB: [56, 74] },
    rest: {},
    windup: { rootX: -6, torsoY: -8, torso: -15, armF: -30, armB: -30 },
    strike: { rootX: 18, torsoY: 10, torso: 25, head: 10, armF: 35, armB: 35 },
    shapes: [
      P('armB', 'feather', [[56, 74], [48, 52], [42, 34], [52, 42], [54, 34], [60, 46], [64, 40], [64, 56], [64, 76]]),
      P('cape', 'feather', [[48, 82], [26, 90], [24, 98], [30, 96], [34, 101], [48, 92]]),
      E('torso', 'feather', 58, 85, 17, 10), E('torso', 'feather', 67, 83, 10, 11),
      L('torso', 'feather', 56, 94, 54, 106, 3), L('torso', 'feather', 62, 94, 63, 106, 3),
      P('torso', 'feather', [[50, 105], [59, 106], [53, 111]]), P('torso', 'feather', [[59, 105], [68, 106], [62, 111]]),
      C('head', 'feather', 76, 71, 8), P('head', 'feather', [[82, 67], [93, 70], [85, 77]]),
      P('head', 'feather', [[70, 66], [62, 63], [70, 71]]),
      C('head', 'eye', 79, 69, 1.7),
      P('armF', 'feather', [[62, 76], [54, 52], [50, 30], [60, 40], [63, 32], [68, 45], [73, 38], [74, 56], [72, 78]]),
    ],
  },
  enjambre: {
    accent: '#7dba4e', style: 'melee', phase: 2.7, focus: [86, 76], focusBone: 'head', slash: [16, 30], flap: 10,
    palette: { bug: '#2a2a2a', eye: '#1b140f' },
    pivots: { torso: [62, 96], head: [80, 84], cape: [52, 96], armF: [70, 90], armB: [56, 88], legF: [64, 104], legB: [54, 104] },
    rest: {},
    windup: { rootX: -6, torso: -10, head: -14, armF: -20, armB: -20 },
    strike: { rootX: 20, torso: 12, head: 16, armF: 25, armB: 20, legF: -15, legB: -10 },
    shapes: swarmShapes(),
  },
  lunar: {
    accent: '#b9c8ff', style: 'melee', phase: 3.3, focus: [96, 78], focusBone: 'head', slash: [20, 36],
    palette: { fur: '#2a2c38', eye: '#1b140f', moonGlow: '#e6ecff' },
    pivots: { torso: [42, 100], head: [82, 86], cape: [37, 93], armF: [80, 100], armB: [76, 100], legF: [46, 100], legB: [42, 100] },
    rest: { head: 8, torso: 2 },
    windup: { rootX: -6, torso: -10, head: -22, armF: -25, legF: 10 },
    strike: { rootX: 18, torso: 8, head: 14, armF: -50, armB: -35, legF: 32, legB: 26, cape: -18 },
    shapes: wolfShapes(true),
  },
  estelar: {
    accent: '#ffe39a', style: 'magic', phase: 4.1, focus: [86, 36], focusBone: 'head',
    palette: { hide: '#4a3a2c', eye: '#1b140f', starGlow: '#fff4c8' },
    pivots: { torso: [44, 96], head: [78, 84], cape: [34, 84], armF: [78, 94], armB: [74, 94], legF: [46, 94], legB: [42, 94] },
    rest: {},
    windup: { rootX: -5, torso: -10, head: -16 },
    strike: { rootX: 8, torso: 4, head: 10, armF: -20, legF: 12 },
    shapes: [
      E('cape', 'hide', 33, 83, 4, 3),
      L('armB', 'hide', 74, 94, 76, 125, 4.5), E('armB', 'hide', 77, 126.5, 3.5, 2),
      L('legB', 'hide', 42, 94, 40, 125, 4.5), E('legB', 'hide', 41, 126.5, 3.5, 2),
      E('torso', 'hide', 58, 88, 24, 11), E('torso', 'hide', 74, 86, 9, 10),
      L('legF', 'hide', 46, 94, 44, 125, 5), E('legF', 'hide', 45, 126.5, 3.8, 2.2),
      L('armF', 'hide', 78, 94, 81, 125, 5), E('armF', 'hide', 82, 126.5, 3.8, 2.2),
      P('head', 'hide', [[73, 88], [79, 66], [88, 66], [85, 90]]),
      P('head', 'hide', [[81, 59], [95, 61], [100, 66], [89, 70], [81, 67]]),
      P('head', 'hide', [[82, 61], [75, 56], [82, 65]]),
      L('head', 'hide', 84, 59, 78, 40, 2), L('head', 'hide', 80, 48, 72, 44, 1.8), L('head', 'hide', 79, 42, 82, 30, 1.8),
      L('head', 'hide', 87, 58, 92, 40, 2), L('head', 'hide', 90, 47, 98, 42, 1.8), L('head', 'hide', 91, 42, 90, 30, 1.8),
      C('head', 'starGlow', 72, 44, 1.9), C('head', 'starGlow', 82, 30, 1.9), C('head', 'starGlow', 98, 42, 1.9),
      C('head', 'starGlow', 90, 30, 1.9), C('head', 'starGlow', 78, 40, 1.4),
      C('head', 'eye', 90, 63, 1.5),
    ],
  },
};

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
