// Illustrated puppets for enemies (normal, elite and bosses) and invocations. Rigs are built
// from parametric archetypes (biped, quadruped, floating, blob) so the whole
// bestiary shares proportions, pivots and animations; each enemy only picks its
// build, head, weapon, clothing and palette. Bosses add bespoke pieces,
// particle emitters and per-action bursts on top.

import {
  C, E, P, L, slitEye, actionHold, CHAIN_BONES,
  type ActionProgress, type BoneId, type Burst, type Emitter, type PartialPose, type Pose, type PuppetRig, type Shape,
} from './puppet.ts';
import { buildWings, type WingSpec } from './wing.ts';
import { strandShapes, type ChainSpec } from './chains.ts';
import { EASE } from './motion.ts';
import { mimicChest, mimicChair, mimicDoor, type RigDraft } from './mimic-rigs.ts';

type Pt = [number, number];

const DEFAULT_PALETTE: Record<string, string> = {
  skin: '#8a7a66', body: '#5b4a3a', legs: '#4a3b2e', boots: '#2e241c', belt: '#5a4230', armor: '#6c7074',
  metal: '#8d9297', edge: '#c9cdd1', wood: '#5a4030', cloak: '#3a3530', robe: '#4a3c3a', cloth: '#6a3b2a',
  hair: '#2e2a22', teeth: '#d8d0b0', eye: '#140d0a', eyeGlow: '#ffd75a', socket: '#18130f', bone: '#cdc3a6',
  hood: '#3a3632', mask: '#24262a', band: '#7a2a22', hat: '#3a2c22', horn: '#d8c7a0', gold: '#b9924a',
  magic: '#9fe8ff', poison: '#8fe36a', lava: '#ff8a3a', rock: '#4a4440', leather: '#56422f', sclera: '#d9d2c0',
  flesh: '#8a5a5a', slime: '#6f9a5a', water: '#4a7aa0', fire: '#ff9a3a', wing: '#3e1715', fur: '#6e6a62',
  furD: '#4f4b45', mane: '#5a564f', belly: '#a39c8e', scale: '#7a2c22', scaleD: '#5e2019', bark: '#5a4632',
  leaf: '#5f7a3a', wind: '#9fb4c7', ink: '#140d0a',
};

function phaseOf(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 1000;
  return (h / 1000) * 6.28;
}

function finish(id: string, rig: Omit<PuppetRig, 'phase' | 'palette'> & { palette: Record<string, string> }): PuppetRig {
  const palette = { ...DEFAULT_PALETTE, ...rig.palette };
  return { ...rig, palette, phase: phaseOf(id), accent: rig.accent ?? palette.eyeGlow };
}

// ── Heads (local frame: centre 0,0, radius ≈10, facing right) ────────────────
export type HeadType =
  | 'goblin' | 'orc' | 'ogre' | 'skull' | 'zombie' | 'ghoul' | 'hood' | 'mask' | 'human' | 'kobold'
  | 'imp' | 'demon' | 'tentacle' | 'mummy' | 'helm' | 'rock' | 'capirote' | 'bark' | 'fiend'
  | 'dragonborn';

/** Class headwear of the skeletal adventurers (drawn on a 'skull' head). */
type SkullGear = 'nasal' | 'wizard' | 'mitre' | 'hoodMask' | 'horned' | 'winged' | 'hood' | 'cowl' | 'plume';

interface HeadOpts {
  beard?: boolean; bandana?: boolean; hat?: boolean; bald?: boolean; crown?: boolean; hornCrown?: boolean; scar?: boolean;
  /** Skull: class headwear. */
  gear?: SkullGear;
  /** Goblin: feathers stuck in the hair (war-crier). */
  feathers?: boolean;
  /** Fiend: long hair flowing down the back. */
  longHair?: boolean;
}

type HeadDraw = {
  P: (k: string, pts: Pt[]) => Shape;
  L: (k: string, x1: number, y1: number, x2: number, y2: number, w: number) => Shape;
  C: (k: string, x: number, y: number, r: number) => Shape;
};

/** Headwear of a skull (local head frame): `back` goes behind the skull, `over` on top of it. */
function skullGear(gear: SkullGear, { P: hP, L: hL, C: hC }: HeadDraw): { back: Shape[]; over: Shape[] } {
  const hoodBack = [
    hP('hood', [[-13, 9], [-13, -4], [-6, -13], [5, -13], [12, -6], [13, 2], [4, -4], [-4, 2], [-6, 13]]),
    hP('hood', [[-11, -6], [-19, -1], [-12, 1]]),
  ];
  const hoodBrim = hP('hood', [[-11, -2], [-9, -10], [0, -14], [9, -11], [14, -3], [10, -5], [2, -8], [-6, -6], [-9, 1]]);
  switch (gear) {
    case 'nasal': // warrior: dome helm with a nose guard and a mail aventail
      return {
        back: [hP('mail', [[-11, -2], [-6, 0], [-5, 10], [-8, 8], [-10, 12], [-12, 8]])],
        over: [
          hP('metal', [[-11, -1], [-9, -9], [-2, -13], [6, -12], [11, -6], [11, -3], [-10, 0]]),
          hL('ink', -10, -1, 11, -4, 0.8), hL('ink', 0, -12.5, 1, -3, 0.5), hL('metal', 8.5, -4, 9.5, 4, 1.8),
        ],
      };
    case 'wizard': // mage: crooked pointy hat with a glowing rune
      return {
        back: [],
        over: [
          hP('hat', [[-9, -5], [-7, -14], [-10, -22], [-17, -29], [-4, -20], [2, -12], [8, -6]]),
          hP('hat', [[-16, -4], [15, -7], [12, -3], [-13, -1]]),
          hL('band', -8, -6, 8, -7, 1.5), hC('magic', -2, -13, 1.2),
        ],
      };
    case 'mitre': // cleric: tall mitre with a gold cross and lappets
      return {
        back: [hL('hat', -7, -3, -10, 9, 2)],
        over: [
          hP('hat', [[-8, -4], [-8, -14], [-1, -24], [7, -15], [8, -5]]),
          hL('gold', -0.5, -21, 0, -5, 1.4), hL('gold', -6, -11, 6, -11, 1.2), hL('gold', -8, -5, 8, -5.5, 1.3),
        ],
      };
    case 'hoodMask': // rogue: hood and a scarf over the jaw
      return { back: hoodBack, over: [hoodBrim, hP('band', [[-6, 5], [9, 3], [11, 9], [3, 13], [-5, 11]]), hL('ink', -4, 8, 9, 6.5, 0.5)] };
    case 'hood': // ranger: plain hood
      return { back: hoodBack, over: [hoodBrim, hL('ink', -6, -6, 8, -9, 0.5)] };
    case 'cowl': // warlock: hood pierced by two small horns, an eldritch rune on the brow
      return {
        back: [hP('horn', [[-6, -10], [-13, -18], [-15, -25], [-9, -18], [-2, -12]]), ...hoodBack],
        over: [hoodBrim, hP('horn', [[2, -12], [3, -20], [0, -26], [6, -20], [6, -11]]), hC('magic', 7, -6.5, 1)],
      };
    case 'horned': // barbarian: fur cap with two horns
      return {
        back: [hP('horn', [[-4, -10], [-10, -12], [-13, -15], [-14, -22], [-16.5, -13], [-12, -8], [-6, -6]])],
        over: [
          hP('fur', [[-11, 0], [-12, -6], [-8, -11], [-2, -13], [5, -12], [10, -8], [12, -3], [8, -4], [0, -6], [-8, -3]]),
          hL('ink', -9, -5, -6, -9, 0.5), hL('ink', -3, -7, 0, -11, 0.5), hL('ink', 3, -7, 6, -10, 0.5),
          hP('horn', [[4, -10], [10, -12], [14, -16], [15, -23], [17.5, -15], [14, -9], [7, -6]]),
        ],
      };
    case 'winged': // paladin: open-faced helm with gold wings and a holy glow
      return {
        back: [hP('gold', [[-7, -7], [-17, -17], [-14, -11], [-20, -11], [-14, -6], [-18, -3], [-10, -2]])],
        over: [
          hP('metal', [[-11, 3], [-10, -7], [-3, -13], [6, -12], [11, -6], [11, -3], [3, -5], [-5, -3], [-7, 4]]),
          hL('gold', -10, -3, 11, -4.5, 1.1), hC('magic', 7, -8.5, 1.3),
        ],
      };
    case 'plume': // bard: wide-brimmed hat with a long feather
      return {
        back: [hP('plume', [[-4, -11], [-12, -19], [-24, -24], [-16, -15], [-6, -8]]), hL('ink', -5, -10, -20, -21.5, 0.5)],
        over: [
          hP('hat', [[-8, -5], [-7, -12], [0, -14], [7, -12], [8, -6]]),
          hP('hat', [[-16, -4], [-6, -7], [16, -9], [12, -4], [-12, -1]]),
          hL('band', -7, -7, 7, -8, 1.6),
        ],
      };
  }
}

function head(type: HeadType, hc: Pt, s: number, o: HeadOpts = {}): Shape[] {
  const X = (x: number) => hc[0] + x * s, Y = (y: number) => hc[1] + y * s;
  const hC = (k: string, x: number, y: number, r: number) => C('head', k, X(x), Y(y), r * s);
  const hE = (k: string, x: number, y: number, rx: number, ry: number) => E('head', k, X(x), Y(y), rx * s, ry * s);
  const hP = (k: string, pts: Pt[]) => P('head', k, pts.map(([x, y]) => [X(x), Y(y)] as Pt));
  const hL = (k: string, x1: number, y1: number, x2: number, y2: number, w: number) => L('head', k, X(x1), Y(y1), X(x2), Y(y2), w * s);
  switch (type) {
    case 'goblin':
      return [
        hP('skin', [[-9, -3], [-26, -14], [-20, -5], [-11, 4]]), hL('ink', -21, -9, -11, -1, 0.7),
        hP('skin', [[-10, -5], [-2, -11], [8, -9], [14, -1], [12, 7], [4, 11], [-6, 9], [-11, 3]]),
        hP('skin', [[10, -4], [21, 1], [12, 5]]),
        hP('hair', [[-10, -6], [-14, -15], [-8, -9], [-6, -16], [-3, -9]]),
        ...(o.feathers ? [hP('plume', [[-7, -9], [-13, -25], [-4, -11]]), hP('band', [[-4, -10], [0, -23], [0, -9]]), hL('ink', -6, -10, -11, -22, 0.4)] : []),
        hP('skin', [[0, 7], [13, 5], [11, 11], [2, 12]]),
        hP('teeth', [[3, 7], [4, 10], [5, 7]]), hP('teeth', [[7.5, 6.5], [8.5, 9.5], [9.5, 6.5]]),
        hL('ink', 1, 7.2, 13, 5.6, 0.9), hL('ink', -1, -4.5, 10, -3.2, 1.1),
        ...(o.scar ? [hL('ink', -5, -8, -1, 0, 0.6)] : []),
        hC('eyeGlow', 6, -1.2, 1.6),
      ];
    case 'orc':
      return [
        hP('skin', [[-7, -3], [-15, -6], [-8, 2]]),
        hE('skin', 1, 0, 11, 10.5),
        hP('hair', [[-8, -8], [-4, -16], [2, -12], [-2, -8]]),
        hP('skin', [[-2, 4], [12, 3], [11, 11], [0, 12]]),
        hP('skin', [[10, -2], [14, 2], [10, 3]]),
        hP('teeth', [[4, 5], [5, -0.5], [7, 5]]), hP('teeth', [[9, 4.5], [10, -0.5], [11.5, 4]]),
        hL('ink', 0, -3, 11, -2, 1.3), hL('ink', 1, 7, 11, 6.5, 0.7),
        ...(o.scar ? [hL('ink', 3, -8, 7, 2, 0.6)] : []),
        hC('eyeGlow', 7, -1, 1.6),
      ];
    case 'ogre':
      return [
        hC('skin', -8, 1, 3),
        hE('skin', 0, 0, 11, 11),
        hP('skin', [[-2, -4], [13, -4], [12, -1], [-2, -1]]),
        hP('skin', [[-4, 3], [14, 3], [13, 13], [-2, 14]]),
        hC('skin', 13, 1, 2.6),
        hP('teeth', [[6, 3], [7, -1], [8, 3]]), hP('teeth', [[11, 3], [12, -0.5], [13, 3]]),
        hL('ink', -1, 8, 12, 8, 0.8), hL('ink', -3, -7, 3, -9, 0.6),
        hC('eyeGlow', 8, -2, 1.3),
      ];
    case 'skull': {
      const gear = o.gear ? skullGear(o.gear, { P: hP, L: hL, C: hC }) : { back: [], over: [] };
      return [
        ...gear.back,
        hC('bone', 0, 0, 10),
        hP('bone', [[-6, 6], [8, 4], [9, 12], [-2, 14], [-6, 10]]),
        hC('socket', 4, 0, 3), hP('socket', [[8, 3], [10.5, 6.5], [7, 6.5]]),
        hL('ink', -1, 8.2, 8.5, 7, 0.7), hL('ink', 1, 6.5, 1, 9.5, 0.6), hL('ink', 4, 6, 4, 9, 0.6), hL('ink', 6.5, 5.6, 6.5, 8.4, 0.6),
        hL('ink', -5, -7, -1, -1.5, 0.7),
        ...(o.hat ? [hP('metal', [[-11, -1], [-8, -11], [0, -14], [8, -12], [11, -6], [0, -7], [-10, 1]]), hL('ink', -10, -1, 11, -6, 0.9)] : []),
        ...gear.over,
        hC('eyeGlow', 4.5, 0, 1.3),
      ];
    }
    case 'zombie':
      return [
        hC('skin', 0, 0, 9.8),
        hP('skin', [[-3, 5], [9, 4], [8, 13], [0, 13]]),
        hP('socket', [[1, 6], [8, 5.5], [7, 10], [2, 10]]),
        hP('hair', [[-9, -4], [-7, -11], [2, -11], [-2, -7], [-6, -2]]),
        hC('socket', 4.5, -1, 2.6),
        hL('ink', -6, -6, 2, -2, 0.7), hL('ink', -4, -5, -3, -3, 0.6), hL('ink', -1, -4, 0, -2, 0.6),
        hC('eyeGlow', 4.8, -1, 1.2),
      ];
    case 'ghoul':
      return [
        hP('skin', [[-6, -4], [-14, -10], [-8, 0]]),
        hP('skin', [[-9, -4], [0, -10], [10, -6], [14, 2], [10, 9], [-2, 10], [-9, 4]]),
        hP('teeth', [[6, 6], [7, 10], [8, 6]]), hP('teeth', [[10, 5], [11, 8.5], [12, 5]]),
        hL('ink', 4, 5.5, 13, 4.5, 0.8), hL('ink', 0, -3, 8, -2, 0.9),
        hC('eyeGlow', 6, -1.5, 1.5),
      ];
    case 'hood':
      return [
        hC('hood', -2, 0, 11),
        hE('socket', 4, 1, 7, 8),
        hP('hood', [[-12, 4], [-10, -8], [-2, -13], [8, -11], [14, -3], [12, 2], [8, -5], [0, -6], [-4, 0], [-4, 10]]),
        hP('hood', [[-10, -8], [-17, -4], [-11, -2]]),
        ...(o.hornCrown ? [hP('horn', [[-4, -11], [-10, -22], [-1, -13]]), hP('horn', [[3, -12], [4, -24], [8, -11]]), hP('gold', [[-8, -10], [10, -9], [9, -7], [-7, -8]])] : []),
        hC('eyeGlow', 5, -0.5, 1.3), hC('eyeGlow', 8.6, 0, 1.1),
      ];
    case 'mask':
      return [
        hL('band', -8, -4, -19, 3, 2.2), hL('band', -8, -4, -17, 7, 1.8),
        hC('mask', 0, 0, 9.8),
        hP('skin', [[1, -3.5], [11.5, -3.5], [11, 0], [1, 0]]),
        hC('band', -8, -4, 2),
        hC('eyeGlow', 7, -1.8, 1.1),
      ];
    case 'human': {
      const out: Shape[] = [];
      out.push(hE('skin', 1.5, 0, 9.5, 10));
      if (!o.bald) out.push(hP('hair', [[-9, -2], [-8, -9], [0, -12], [9, -9], [11, -4], [4, -6], [-3, -4], [-6, 4]]));
      out.push(hP('skin', [[9, -1], [13, 3], [9, 4]]), hC('skin', -3, 1, 2.2));
      if (o.beard) out.push(hP('hair', [[-2, 3], [10, 3], [8, 11], [1, 12]]));
      if (o.bandana) out.push(hP('band', [[-9, -5], [-7, -11], [3, -12.5], [10, -7], [10, -4], [-9, -3]]), hL('band', -9, -4, -16, 2, 2));
      if (o.hat) out.push(hP('hat', [[-8, -6], [-6, -15], [6, -16], [9, -6]]), hP('hat', [[-15, -6], [16, -7], [12, -3], [-12, -3]]), hL('gold', -6, -7, 8, -7.5, 1.2));
      out.push(hL('ink', 3, -3.5, 9.5, -3, 1), hL('ink', 5, 6.5, 10, 6, 0.7));
      if (o.scar) out.push(hL('ink', 2, -6, 6, 3, 0.6));
      out.push(hC('eye', 6, -1, 1.3));
      return out;
    }
    case 'kobold':
      return [
        hP('skin', [[-8, -2], [-15, 2], [-8, 4]]),
        hP('skin', [[-8, -4], [0, -8], [8, -6], [18, -1], [18, 3], [8, 6], [-4, 6], [-8, 2]]),
        hP('skin', [[4, 4], [17, 3], [15, 7], [5, 8]]),
        hP('horn', [[-4, -6], [-12, -13], [-6, -5]]), hP('horn', [[0, -7], [-4, -15], [3, -7]]),
        hP('teeth', [[10, 3.5], [11, 5.5], [12, 3.5]]),
        hL('ink', 4, 4, 17, 3, 0.7), hC('ink', 16, 0, 0.6), hL('ink', -3, 0, 5, 1, 0.5),
        hC('eyeGlow', 6, -3, 1.4),
      ];
    case 'imp':
    case 'demon': {
      const big = type === 'demon' ? 1.5 : 1;
      return [
        hP('skin', [[-6, -1], [-17, -6], [-8, 4]]),
        hC('skin', 0, 0, 9.2),
        hP('horn', [[-4, -7], [-8 * big, -10 - 7 * big], [0, -8]]), hP('horn', [[3, -8], [5 * big, -10 - 8 * big], [8, -7]]),
        hP('skin', [[8, -1], [12, 1], [8, 2]]),
        hP('teeth', [[3, 5], [12, 4], [11, 7], [4, 8]]), hL('ink', 3, 5.3, 12, 4.3, 0.7),
        hL('ink', 1, -3.5, 9, -2.5, 1),
        hC('eyeGlow', 5, -1.5, 1.6),
      ];
    }
    case 'tentacle':
      return [
        hP('skin', [[-10, -2], [-8, -11], [2, -14], [10, -9], [12, 0], [8, 4], [-6, 5]]),
        hL('ink', -6, -8, 4, -11, 0.6), hL('ink', -8, -3, 0, -6, 0.6),
        hL('skin', 5, 4, 6, 15, 2.4), hL('skin', 8, 4, 12, 14, 2.2), hL('skin', 2, 4, 0, 14, 2.2), hL('skin', 10, 2, 16, 10, 2),
        hC('eyeGlow', 7, -3, 1.8),
      ];
    case 'mummy':
      return [
        hC('cloth', 0, 0, 9.6),
        hL('ink', -9, -5, 9, -7, 0.7), hL('ink', -9, 0, 10, -2, 0.7), hL('ink', -8, 5, 9, 3, 0.7), hL('ink', -6, -9, 5, -10, 0.6),
        hP('socket', [[2, -3], [11, -4], [11, -1], [2, 0]]),
        ...(o.crown ? [hP('gold', [[-8, -8], [-6, -16], [-2, -10], [1, -17], [4, -10], [8, -16], [9, -8]]), hC('magic', 1, -12, 1.1)] : []),
        hC('eyeGlow', 7, -2, 1.3),
      ];
    case 'helm':
      return [
        hP('cloth', [[-8, -10], [-16, -17], [-10, -7]]),
        hP('metal', [[-10, 4], [-10, -6], [-4, -12], [6, -12], [12, -5], [12, 6], [4, 9], [-6, 9]]),
        hL('socket', 2, -2, 12, -2, 1.8), hL('ink', 1, 3, 1, 8, 0.6), hC('ink', -6, 2, 0.7), hC('ink', -6, -4, 0.7),
        hC('eyeGlow', 8, -2, 1.2),
      ];
    case 'rock':
      return [
        hP('rock', [[-9, -4], [-4, -11], [7, -10], [12, -2], [9, 7], [-3, 8], [-9, 3]]),
        hL('lava', -2, -6, 3, 2, 1.2), hL('lava', 3, 2, 8, 5, 1),
        hP('lava', [[3, 4], [10, 3], [9, 6]]),
        hC('eyeGlow', 6, -2.5, 1.8),
      ];
    case 'dragonborn': // long scaled snout, swept-back horns, neck frill and fangs
      return [
        hP('horn', [[-3, -7], [-19, -15], [-24, -13], [-7, -3]]),
        hP('skin', [[-7, 0], [-17, 3], [-14, 6], [-8, 7]]),
        hP('skin', [[-9, -5], [-3, -10], [6, -9.5], [12, -5.5], [22, -3.5], [23.5, 0.5], [14, 3], [6, 9], [-4, 10], [-10, 4]]),
        hP('skin', [[3, 3.5], [21, 2.6], [19, 7], [7, 10]]),
        hP('teeth', [[9, 3.3], [10, 6.4], [11, 3.2]]), hP('teeth', [[15.5, 3], [16.4, 5.6], [17.3, 2.9]]),
        hP('horn', [[1, -9], [-11, -20], [-15, -19.5], [-3, -6]]),
        hP('horn', [[14, -5], [16.5, -9], [18, -4.5]]),
        hL('ink', 6, 3.1, 21.5, 2.3, 0.8), hL('ink', 2, -4.8, 12.5, -3.8, 1.2),
        hL('ink', -6, -4, -3, 4, 0.6), hL('ink', -2, 3, 3, 8, 0.6), hL('ink', 8, -8, 15, -5.5, 0.5),
        hC('ink', 21, -1.6, 0.6),
        hC('eyeGlow', 8, -1.8, 1.5),
      ];
    case 'capirote':
      return [
        hP('hood', [[-9, 7], [-8, -6], [-2, -27], [4, -7], [11, -3], [12, 8]]),
        hL('ink', -2, -24, -3, -4, 0.6),
        hC('eyeGlow', 5, -2, 1.3), hC('eyeGlow', 8.6, -1.5, 1.1),
      ];
    case 'bark':
      return [
        hP('bark', [[-9, 6], [-10, -6], [-4, -12], [6, -12], [11, -4], [10, 7], [2, 10]]),
        hC('leaf', -6, -13, 5), hC('leaf', 2, -15, 5.5), hC('leaf', 9, -10, 4.5), hC('leaf', -11, -7, 4),
        hL('ink', -4, -4, -2, 6, 0.7), hL('ink', 4, 2, 6, 8, 0.6),
        hC('eyeGlow', 6, -2, 1.5),
      ];
    case 'fiend': // seductive demon: fine features, swept-back horns, pointed ear, a sly smile
      return [
        ...(o.longHair ? [hP('hair', [[-8, -8], [-13, 0], [-15, 12], [-12, 22], [-8, 16], [-5, 22], [-3, 8], [-3, 0]])] : []),
        hP('horn', [[-3, -8], [-9, -15], [-18, -16], [-11, -12], [-6, -5]]),
        hE('skin', 1.5, 0, 9, 10),
        hP('skin', [[9, -1], [12.5, 3], [9, 4]]),
        hP('hair', [[-9, -1], [-8, -9], [0, -12], [9, -9], [11, -5], [4, -7], [-3, -5], [-6, 4]]),
        hP('skin', [[-5, -1], [-14, -6], [-6, 4]]),
        hP('horn', [[2, -9], [0, -17], [-6, -23], [-2, -15], [-2, -8]]),
        ...(o.beard ? [hP('hair', [[5, 7], [10, 6], [8, 12]])] : []),
        hL('ink', 3, -4.5, 10, -2.5, 1), hL('ink', 5, 6, 10, 4.8, 0.7),
        hC('eyeGlow', 6.5, -1, 1.4),
      ];
  }
}

// ── Weapons and off-hand items (relative to the hand, bind pose pointing up) ──
export type WeaponType =
  | 'cleaver' | 'sword' | 'katana' | 'axe' | 'club' | 'flail' | 'spear' | 'dagger' | 'poisonDagger'
  | 'staff' | 'skullStaff' | 'dragonStaff' | 'bow' | 'crossbow' | 'orb' | 'claws' | 'fists'
  | 'halberd'
  | 'hatchet' | 'totem' | 'mace' | 'greataxe' | 'warhammer' | 'rapier' | 'talons';
type OffhandType = 'tower' | 'shield' | 'kite' | 'dagger' | 'book' | 'lantern' | 'orb' | 'vial' | 'drum' | 'holySymbol' | 'heater' | 'lute' | 'none';

type Grip = 'swing' | 'thrust' | 'cast' | 'castHand' | 'shoot' | 'crossbow';
const GRIP: Record<WeaponType, Grip> = {
  cleaver: 'swing', sword: 'swing', katana: 'swing', axe: 'swing', club: 'swing', flail: 'swing', claws: 'swing', fists: 'swing',
  halberd: 'swing',
  hatchet: 'swing', totem: 'swing', mace: 'swing', greataxe: 'swing', warhammer: 'swing', talons: 'swing',
  spear: 'thrust', dagger: 'thrust', poisonDagger: 'thrust', rapier: 'thrust',
  staff: 'cast', skullStaff: 'cast', dragonStaff: 'cast', orb: 'castHand', bow: 'shoot', crossbow: 'crossbow',
};

function weapon(type: WeaponType, [hx, hy]: Pt): { shapes: Shape[]; focus: Pt } {
  const W = (k: string, x1: number, y1: number, x2: number, y2: number, w: number) => L('weapon', k, hx + x1, hy + y1, hx + x2, hy + y2, w);
  const WP = (k: string, pts: Pt[]) => P('weapon', k, pts.map(([x, y]) => [hx + x, hy + y] as Pt));
  const WC = (k: string, x: number, y: number, r: number) => C('weapon', k, hx + x, hy + y, r);
  const WE = (k: string, x: number, y: number, rx: number, ry: number) => E('weapon', k, hx + x, hy + y, rx, ry);
  switch (type) {
    case 'halberd': // long pole with an axe blade, a back hook and a top spike
      return { focus: [hx + 7, hy - 40], shapes: [
        W('wood', 0, 22, 0, -52, 2.6),
        WP('metal', [[0.5, -47], [9, -51], [12.5, -43], [12, -34], [9, -29], [0.5, -35]]),
        W('edge', 10.4, -49.6, 12.2, -31, 0.8), W('ink', 4, -46, 4, -36, 0.5),
        WP('metal', [[-0.5, -45], [-7, -42], [-8.5, -38], [-0.5, -40]]),
        WP('metal', [[-1.6, -52], [0, -63], [1.6, -52]]),
        WP('band', [[-2, -52], [2, -52], [2.6, -48], [-2.6, -48]]),
      ] };
    case 'cleaver':
      return { focus: [hx + 6, hy - 14], shapes: [
        W('wood', 0, 5, 0, -4, 2.6),
        WP('metal', [[-3, -4], [-3, -22], [12, -26], [14, -20], [4, -4]]),
        W('edge', -2, -21, 12, -25, 1), WC('rust', 6, -15, 1.9), WC('ink', 0.5, -18, 1.3),
      ] };
    case 'sword':
      return { focus: [hx, hy - 30], shapes: [
        W('leather', 0, 4, 0, -2, 2.4), W('metal', -4.5, -3, 4.5, -3, 2),
        WP('metal', [[-1.6, -3], [1.6, -3], [1.2, -36], [0, -40], [-1.2, -36]]),
        W('ink', 0, -5, 0, -33, 0.5),
      ] };
    case 'katana':
      return { focus: [hx, hy - 30], shapes: [
        W('band', 0, 6, 0, -2, 2.2), WC('metal', 0, -3, 2),
        WP('metal', [[-1.2, -3], [1.2, -3], [3.4, -38], [1.2, -41]]),
        W('edge', 1.6, -6, 3.2, -36, 0.5),
      ] };
    case 'axe':
      return { focus: [hx + 6, hy - 26], shapes: [
        W('wood', 0, 8, 0, -30, 2.8),
        WP('metal', [[0, -30], [9, -35], [12, -25], [9, -16], [0, -21]]),
        W('edge', 9.5, -34, 11.5, -17, 0.8),
      ] };
    case 'club':
      return { focus: [hx + 2, hy - 24], shapes: [
        W('wood', 0, 4, 2, -24, 5), WE('wood', 2, -27, 5, 6),
        WC('ink', 0, -26, 0.7), WC('ink', 4, -29, 0.7), WC('ink', 3, -23, 0.7), W('leather', -0.5, 1, 0.5, -3, 5.6),
      ] };
    case 'flail':
      return { focus: [hx + 5, hy - 23], shapes: [
        W('wood', 0, 4, 0, -10, 2.4), W('metal', 0, -10, 4, -19, 1),
        WP('metal', [[5, -30], [7, -26], [11, -24], [7, -21], [5, -16], [3, -21], [-1, -23], [3, -26]]),
        WC('metal', 5, -23, 4.2),
      ] };
    case 'spear':
      return { focus: [hx, hy - 44], shapes: [
        W('wood', 0, 20, 0, -40, 2), WP('metal', [[-2.4, -38], [0, -49], [2.4, -38]]),
        WP('band', [[-2, -37], [2, -37], [3, -31], [-3, -31]]),
      ] };
    case 'dagger':
    case 'poisonDagger':
      return { focus: [hx, hy - 12], shapes: [
        W('leather', 0, 3, 0, -2, 2.2), W('metal', -3, -2.5, 3, -2.5, 1.5),
        WP('metal', [[-1.4, -2.5], [1.4, -2.5], [0, -15]]),
        ...(type === 'poisonDagger' ? [W('poison', 0, -4, 0, -13, 0.8)] : []),
      ] };
    case 'staff':
    case 'skullStaff':
    case 'dragonStaff': {
      const top: Shape[] = type === 'skullStaff'
        ? [WC('bone', 2, -39, 4.2), WC('socket', 3.5, -39.5, 1.2), WP('band', [[-1, -35], [5, -35], [7, -29], [-3, -29]]), WC('magic', 2, -45, 2.2)]
        : type === 'dragonStaff'
          ? [WP('bone', [[-2, -34], [3, -44], [10, -41], [12, -37], [5, -35]]), WP('horn', [[1, -42], [-4, -50], [3, -44]]), WC('magic', 7, -39, 2)]
          : [WP('wood', [[-1, -34], [2, -40], [5, -34], [3, -36]]), WC('magic', 2, -40, 3.4)];
      return { focus: [hx + 2, hy - 40], shapes: [W('wood', 2, 26, 2, -34, 3.2), ...top] };
    }
    case 'orb':
      return { focus: [hx + 3, hy - 7], shapes: [WC('magic', 3, -7, 3.6)] };
    case 'bow':
      return { focus: [hx + 6, hy], shapes: [
        W('ink', 0, -22, 0, 22, 0.5),
        WP('wood', [[0, -23], [6, -14], [8, 0], [6, 14], [0, 23], [2.5, 14], [4.5, 0], [2.5, -14]]),
        W('leather', 3, -3, 5, 3, 3.6),
      ] };
    case 'crossbow':
      return { focus: [hx + 15, hy - 1], shapes: [
        W('wood', -6, 0, 12, 0, 3),
        WP('metal', [[10, -9], [13, 0], [10, 9], [11.5, 0]]),
        W('ink', 10.5, -8.5, 6, 0, 0.5), W('ink', 6, 0, 10.5, 8.5, 0.5),
        W('wood', 4, -1.8, 15, -1.8, 1),
      ] };
    case 'claws':
      return { focus: [hx + 4, hy + 2], shapes: [
        WP('teeth', [[1, 0], [7, 2], [2, 2.5]]), WP('teeth', [[0, 2], [6, 5], [1, 4]]), WP('teeth', [[-1, 3], [4, 7], [-1, 5]]),
      ] };
    case 'fists':
      return { focus: [hx + 3, hy], shapes: [WC('metal', 1.5, 0, 2.2)] };
    case 'hatchet': // short rusty hand axe
      return { focus: [hx + 6, hy - 12], shapes: [
        W('wood', 0, 5, 0, -18, 2.6),
        WP('metal', [[-1, -18], [8, -22], [12, -14], [9, -5], [-1, -11]]),
        W('edge', 9.2, -21, 11.2, -6, 0.8), WC('rust', 4.5, -13.5, 2),
      ] };
    case 'totem': // pole topped with a skull and dangling feathers
      return { focus: [hx + 1, hy - 25], shapes: [
        W('wood', 0, 18, 0, -21, 2.4),
        WP('plume', [[-1, -21], [-9, -15], [-4, -22]]), WP('plume', [[0, -19], [-6, -9], [-2, -18]]),
        W('band', -1.8, -18, 1.8, -18, 1.6),
        WC('bone', 1, -25.5, 4.2), WP('bone', [[-1, -23], [5, -23], [4.5, -19.5], [0, -20]]), WC('socket', 2.6, -26, 1.2),
      ] };
    case 'mace': // flanged mace
      return { focus: [hx, hy - 21], shapes: [
        W('wood', 0, 5, 0, -18, 2.4),
        WP('metal', [[-1.6, -24], [0, -29], [1.6, -24]]), WP('metal', [[2.5, -23.5], [7, -21], [2.5, -18.5]]), WP('metal', [[-2.5, -23.5], [-7, -21], [-2.5, -18.5]]),
        WC('metal', 0, -21, 4), W('ink', -2.5, -21, 2.5, -21, 0.5),
      ] };
    case 'greataxe': // long-hafted double-bitted axe
      return { focus: [hx + 6, hy - 30], shapes: [
        W('wood', 0, 14, 0, -34, 3),
        WP('metal', [[1, -36], [10, -42], [13.5, -31], [10, -20], [1, -26]]),
        WP('metal', [[-1, -36], [-8.5, -40], [-11, -31], [-8.5, -22], [-1, -26]]),
        W('edge', 10.6, -41, 13, -21, 0.8), WP('metal', [[-1.3, -36], [0, -41], [1.3, -36]]),
      ] };
    case 'warhammer': // blessed war hammer with a back spike
      return { focus: [hx + 3, hy - 32], shapes: [
        W('wood', 0, 10, 0, -29, 2.6),
        WP('metal', [[-5, -37], [6.5, -37], [6.5, -28], [-5, -28]]), WP('metal', [[-5, -35], [-11, -32.5], [-5, -30]]),
        W('gold', -4.5, -32.5, 6, -32.5, 1.1), WP('metal', [[-1.2, -37], [0.6, -41], [2.4, -37]]),
      ] };
    case 'rapier': // slender blade with a swept gold guard
      return { focus: [hx, hy - 34], shapes: [
        W('leather', 0, 4, 0, -2, 2), W('gold', -3.5, -2, 3.5, -2, 1.2), W('gold', 3.5, -2, 2.8, 4.5, 0.9),
        WP('metal', [[-0.9, -2], [0.9, -2], [0.3, -43], [-0.3, -43]]),
      ] };
    case 'talons': // long, slender claws
      return { focus: [hx + 6, hy + 2], shapes: [
        WP('teeth', [[1, -1], [12, -1], [2, 1.5]]), WP('teeth', [[0, 1.5], [11, 4], [1, 3.5]]), WP('teeth', [[-1, 3], [8, 8], [-1, 5]]),
      ] };
  }
}

function offhand(type: OffhandType, [bx, by]: Pt): Shape[] {
  const O = (k: string, x1: number, y1: number, x2: number, y2: number, w: number) => L('offhand', k, bx + x1, by + y1, bx + x2, by + y2, w);
  const OP = (k: string, pts: Pt[]) => P('offhand', k, pts.map(([x, y]) => [bx + x, by + y] as Pt));
  const OC = (k: string, x: number, y: number, r: number) => C('offhand', k, bx + x, by + y, r);
  const OE = (k: string, x: number, y: number, rx: number, ry: number) => E('offhand', k, bx + x, by + y, rx, ry);
  switch (type) {
    case 'tower': // tall bronze-rimmed tower shield with a dragon crest, held in front of the body
      return [
        OP('armor', [[-2.5, -21.5], [7, -23.5], [16, -21.5], [17.5, -1], [16, 18], [7, 20.5], [-2.5, 18], [-4, -1]]),
        OP('wood', [[-1, -19.8], [7, -21.6], [14.5, -19.8], [15.8, -1], [14.5, 16.4], [7, 18.6], [-1, 16.4], [-2.3, -1]]),
        OP('band', [[3.6, -21], [10.4, -21], [10.4, 18], [3.6, 18]]),
        O('ink', 3.6, -20.4, 3.6, 17.6, 0.5), O('ink', 10.4, -20.4, 10.4, 17.6, 0.5),
        OP('gold', [[3, -9], [8, -14], [12.5, -11], [9.5, -9.5], [12, -5], [9, -6], [10, -1], [7, -3.5], [4.5, 0], [5.5, -5.5]]),
        OC('armor', 7, 6, 2.6), OC('ink', 7, 6, 0.8),
        OC('ink', 0, -17, 0.6), OC('ink', 14, -17, 0.6), OC('ink', 0, 14, 0.6), OC('ink', 14, 14, 0.6),
      ];
    case 'shield':
      return [OE('metal', 0, -1, 10, 12), OE('wood', 0, -1, 8.4, 10.4), O('ink', -4, -11, -4, 9, 0.7), O('ink', 4, -11, 4, 9, 0.7), O('ink', -7, -6, -1, 5, 0.8), OC('metal', 0, -1, 2.8)];
    case 'kite':
      return [OP('metal', [[-8, -12], [8, -12], [8, 0], [0, 12], [-8, 0]]), OP('wood', [[-6.5, -10.5], [6.5, -10.5], [6.5, -0.5], [0, 9.5], [-6.5, -0.5]]), O('band', 0, -10, 0, 8, 2.2)];
    case 'dagger':
      return [O('leather', 0, -4, 0, 1, 2.2), OP('metal', [[-1.4, 1.5], [1.4, 1.5], [0, 13]])];
    case 'book':
      return [OP('leather', [[-7, -3], [4, -5], [5, 7], [-6, 9]]), O('gold', -6.5, -2.5, 4, -4.5, 1.3), OC('magic', -1, 2, 1.4)];
    case 'lantern':
      return [O('metal', 0, -2, 0, 4, 1), OP('metal', [[-3.5, 4], [3.5, 4], [4, 13], [-4, 13]]), OE('magic', 0, 8.5, 2.6, 3.6)];
    case 'orb':
      return [OC('magic', 0, -5, 3.4)];
    case 'vial':
      return [OP('sclera', [[-2, -2], [2, -2], [3.5, 6], [-3.5, 6]]), OE('poison', 0, 3.5, 3, 2.5), O('wood', 0, -4, 0, -1.5, 2)];
    case 'drum': // war drum held by its rim
      return [
        OP('wood', [[-6.5, 0], [6.5, 0], [5.5, 11], [-5.5, 11]]), OE('hide', 0, 0, 6.5, 2.2),
        O('ink', -5.5, 1.5, -2, 10, 0.5), O('ink', -2, 10, 1.5, 1.5, 0.5), O('ink', 1.5, 1.5, 5, 10, 0.5),
        O('band', -6, 7.5, 6, 7.5, 1.2),
      ];
    case 'holySymbol': // sun amulet dangling from its chain
      return [
        O('gold', 0, 0, 0, 5, 0.6),
        OP('gold', [[0, 3.5], [1.5, 6.5], [4.5, 5.5], [3.5, 8.5], [6.5, 10], [3.5, 11.5], [4.5, 14.5], [1.5, 13.5], [0, 16.5], [-1.5, 13.5], [-4.5, 14.5], [-3.5, 11.5], [-6.5, 10], [-3.5, 8.5], [-4.5, 5.5], [-1.5, 6.5]]),
        OC('magic', 0, 10, 2.4),
      ];
    case 'heater': // heater shield with a holy sigil
      return [
        OP('metal', [[-9, -12], [9, -12], [9, -2], [4.5, 7], [0, 12], [-4.5, 7], [-9, -2]]),
        OP('heraldry', [[-7.5, -10.5], [7.5, -10.5], [7.5, -2.2], [3.6, 5.8], [0, 10], [-3.6, 5.8], [-7.5, -2.2]]),
        O('gold', 0, -8.5, 0, 6.5, 1.8), O('gold', -5, -4, 5, -4, 1.8), OC('magic', 0, -4, 1.3),
      ];
    case 'lute': // lute held by the neck, hanging at the side
      return [
        O('wood', 0, -8, 0, 7, 1.6), O('wood', 0, -8, -3, -11.5, 2),
        OE('wood', 0, 12.5, 5.6, 7.5), OC('ink', 0, 12, 1.6), O('ink', -2.5, 16.5, 2.5, 16.5, 0.6), O('edge', 0, -7, 0, 16.5, 0.35),
      ];
    case 'none':
      return [];
  }
}

// ── Biped archetype ──────────────────────────────────────────────────────────
type Build = 'small' | 'thin' | 'normal' | 'hulking';
const BUILDS: Record<Build, { sw: number; ww: number; lw: number; aw: number; hr: number; art: number }> = {
  small: { sw: 7.5, ww: 6.5, lw: 5.2, aw: 4.3, hr: 10.5, art: 1.25 },
  thin: { sw: 7.5, ww: 5, lw: 3.2, aw: 2.9, hr: 9.5, art: 1.35 },
  normal: { sw: 8.5, ww: 7, lw: 5.6, aw: 4.6, hr: 9.2, art: 1.3 },
  hulking: { sw: 13, ww: 10.5, lw: 8, aw: 7.2, hr: 8.8, art: 1.28 },
};

interface BipedOpts {
  build: Build;
  head: HeadType;
  headOpts?: HeadOpts;
  weapon: WeaponType;
  offhand?: OffhandType;
  palette: Record<string, string>;
  accent?: string;
  /** Arms painted with this key (default: 'skin' when bare, else 'body'). */
  arms?: string;
  legs?: string;
  cloak?: boolean;
  robe?: boolean;
  armor?: boolean;
  belt?: boolean;
  loincloth?: boolean;
  ribs?: boolean;
  wings?: boolean;
  tail?: boolean;
  quiver?: boolean;
  /** The off-hand item goes over the body (just under the head) instead of behind it: a tower shield. */
  shieldFront?: boolean;
  /** Ragged tunic, tabard or mail shirt over the torso, painted with this palette key. */
  tabard?: string;
  /** Cross emblem on the chest (over the tabard), painted with this palette key. */
  sigil?: string;
  /** Extra torso details (trims, sashes, necklaces), drawn over the clothing. */
  torsoDetail?: Shape[];
  /** Extra forward stoop at rest (degrees). */
  hunch?: number;
  art?: number;
}

function biped(id: string, o: BipedOpts): PuppetRig {
  const b = BUILDS[o.build];
  const hip: Pt = [58, 100];
  const sy = 77;
  const armKey = o.arms ?? 'body', legKey = o.legs ?? 'legs';
  const shB: Pt = [58 - b.sw + 1.5, 79], shF: Pt = [58 + b.sw - 1.5, 79];
  const handB: Pt = [shB[0] - 2, shB[1] + 21], handF: Pt = [shF[0] + 4, shF[1] + 21];
  const hipB: Pt = [58 - b.ww * 0.45, 100], hipF: Pt = [58 + b.ww * 0.45, 100];
  const neck: Pt = [59, 76];
  const hc: Pt = [61, 76 - b.hr * 1.25];
  const shapes: Shape[] = [];

  // back layers
  if (o.cloak) shapes.push(P('cape', 'cloak', [[52, 75], [64, 73], [62, 100], [59, 122], [55, 116], [51, 124], [47, 115], [43, 121], [42, 104], [46, 88]]));
  if (o.quiver) shapes.push(P('cape', 'leather', [[46, 76], [52, 74], [50, 98], [44, 99]]), L('cape', 'wood', 47, 74, 44, 66, 1), L('cape', 'wood', 50, 74, 49, 65, 1), P('cape', 'band', [[42, 64], [46, 66], [44, 69]]));
  if (o.tail) shapes.push(L('cape', 'skin', 52, 100, 38, 112, 2.6), L('cape', 'skin', 38, 112, 30, 106, 2), P('cape', 'skin', [[28, 108], [27, 101], [33, 105]]));
  // bat wings: shoulder, forearm and three fingers with a membrane panel each
  const wings = o.wings ? buildWings(
    { side: 'B', shoulder: [56, 84], elbow: [47, 75], wrist: [44.5, 66], tips: [[36, 56], [28, 66], [26, 80]], root: [40, 90], bone: 'skin', width: 1.1 },
    { side: 'F', shoulder: [62, 84], elbow: [65, 73], wrist: [57.5, 62], tips: [[56, 50], [70, 52], [78, 64]], root: [72, 86], bone: 'skin', width: 1.1 },
  ) : null;
  if (wings) shapes.push(...wings.back);
  // back arm + off-hand
  shapes.push(L('armB', armKey, shB[0], shB[1], shB[0] - 3, shB[1] + 11, b.aw), L('armB', armKey, shB[0] - 3, shB[1] + 11, handB[0], handB[1], b.aw * 0.9));
  const held = offhand(o.offhand ?? 'none', handB);
  if (!o.shieldFront) shapes.push(...held);
  shapes.push(C('armB', o.weapon === 'claws' ? 'skin' : 'skin', handB[0], handB[1], b.aw * 0.62));
  // legs
  const leg = (bone: BoneId, [px, py]: Pt, kx: number, fx: number) => {
    const knee: Pt = [px + kx, py + 14], foot: Pt = [px + fx, 126];
    if (!o.robe) shapes.push(L(bone, legKey, px, py, knee[0], knee[1], b.lw), L(bone, legKey, knee[0], knee[1], foot[0], foot[1], b.lw * 0.9));
    shapes.push(E(bone, 'boots', foot[0] + 1.5, 127, b.lw * 1.05, 2.6));
  };
  leg('legB', hipB, -2, -1);
  leg('legF', hipF, 3, 2);
  // torso
  const torso: Pt[] = [[58 - b.sw, sy], [58 + b.sw, sy], [58 + b.ww, 100], [58 - b.ww, 100]];
  if (o.robe) {
    shapes.push(P('torso', 'robe', [[58 - b.sw, sy], [58 + b.sw, sy], [58 + b.ww + 7, 122], [58 + b.ww + 4, 127], [62, 123], [58, 128], [54, 123], [50, 128], [58 - b.ww - 5, 124]]));
    shapes.push(L('torso', 'ink', 59, 80, 60, 124, 0.6));
  } else {
    shapes.push(P('torso', 'body', torso));
    if (o.build === 'hulking') shapes.push(E('torso', 'body', 60, 93, b.ww, 8));
  }
  if (o.head === 'rock') shapes.push(L('torso', 'lava', 54, 80, 58, 92, 1.4), L('torso', 'lava', 58, 92, 64, 97, 1.2), L('torso', 'lava', 63, 82, 60, 88, 1));
  if (o.ribs) shapes.push(L('torso', 'ink', 56, 84, 63, 83, 0.7), L('torso', 'ink', 56, 87.5, 64, 86.5, 0.7), L('torso', 'ink', 57, 91, 63, 90, 0.7));
  if (o.armor) {
    shapes.push(P('torso', 'armor', [[58 - b.sw + 1.5, sy + 1], [58 + b.sw - 1, sy + 1], [58 + b.ww - 1, 95], [58 - b.ww + 1, 95]]));
    shapes.push(L('torso', 'ink', 59, sy + 3, 59, 94, 0.6), L('torso', 'ink', 58 - b.ww + 2, 88, 58 + b.ww - 2, 88, 0.6));
  }
  if (o.tabard) {
    shapes.push(P('torso', o.tabard, [[58 - b.sw + 1.5, sy + 1], [58 + b.sw - 1.5, sy + 1], [58 + b.ww + 1, 104], [63.5, 101], [61, 108], [57, 102], [54, 106.5], [58 - b.ww - 1, 102]]));
  }
  if (o.sigil) shapes.push(L('torso', o.sigil, 59.5, 82, 59.5, 93, 1.4), L('torso', o.sigil, 55.5, 85.5, 63.5, 85.5, 1.4));
  if (o.torsoDetail) shapes.push(...o.torsoDetail);
  if (o.belt || o.loincloth) shapes.push(L('torso', 'belt', 58 - b.ww, 98, 58 + b.ww, 97.5, 3), C('torso', 'metal', 60, 97.7, 1.5));
  if (o.loincloth) shapes.push(P('torso', 'cloth', [[56, 99], [66, 98.5], [65, 112], [62, 108], [59, 113]]));
  // near wing over the body but always behind the head (it hangs from the back)
  if (wings) shapes.push(...wings.front);
  // head
  if (o.shieldFront) shapes.push(...held);
  shapes.push(...head(o.head, hc, b.hr / 10, o.headOpts));
  // front arm, weapon, hand
  if (o.armor) shapes.push(E('armF', 'armor', shF[0], shF[1] + 1, b.aw * 0.95, b.aw * 0.8));
  shapes.push(L('armF', armKey, shF[0], shF[1], shF[0] + 2, shF[1] + 11, b.aw), L('armF', armKey, shF[0] + 2, shF[1] + 11, handF[0], handF[1], b.aw * 0.9));
  const w = weapon(o.weapon, handF);
  shapes.push(...w.shapes);
  shapes.push(C('armF', 'skin', handF[0], handF[1], b.aw * 0.62));

  const grip = GRIP[o.weapon];
  const hunch = o.hunch ?? 0;
  const poses: Record<Grip, { rest: PartialPose; windup: PartialPose; strike: PartialPose }> = {
    swing: {
      rest: { armF: -20, weapon: 15, armB: 15 },
      windup: { rootX: -4, torso: -8, head: -6, armF: 150, weapon: 190, armB: 60, legF: -6, legB: 6 },
      strike: { rootX: 13, torso: 14, head: 6, armF: 290, weapon: 190, armB: -30, legF: -14, legB: 10 },
    },
    thrust: {
      rest: { armF: -35, weapon: 95, armB: 20 },
      windup: { rootX: -5, torso: -6, head: -4, armF: 5, weapon: 80, armB: 30 },
      strike: { rootX: 16, torso: 12, head: 6, armF: -80, weapon: 170, armB: -20, legF: -14, legB: 10 },
    },
    cast: {
      rest: { armF: -12, weapon: 12, armB: 5 },
      windup: { rootX: -3, torso: -5, head: -5, armF: -150, weapon: 150, armB: 30 },
      strike: { rootX: 5, torso: 10, head: 6, armF: -85, weapon: 55, armB: -30 },
    },
    castHand: {
      rest: { armF: -40, weapon: 40, armB: 10 },
      windup: { rootX: -4, torso: -8, head: -6, armF: 10, weapon: -10, armB: 30 },
      strike: { rootX: 6, torso: 10, head: 8, armF: -92, weapon: 92, armB: -10 },
    },
    shoot: {
      rest: { armF: -40, weapon: 40, armB: 5 },
      windup: { rootX: -2, torso: -4, armF: -85, weapon: 85, armB: -80 },
      strike: { rootX: -3, torso: -3, armF: -88, weapon: 88, armB: -55 },
    },
    crossbow: {
      rest: { armF: -45, weapon: 45, armB: -30 },
      windup: { rootX: -1, torso: -2, armF: -80, weapon: 80, armB: -60 },
      strike: { rootX: -4, torso: -5, armF: -84, weapon: 76, armB: -55 },
    },
  };
  const pose = poses[grip];
  const magic = grip === 'cast' || grip === 'castHand' || grip === 'shoot' || grip === 'crossbow';
  return finish(id, {
    accent: o.accent ?? o.palette.eyeGlow ?? DEFAULT_PALETTE.eyeGlow,
    style: magic ? 'magic' : 'melee',
    focus: w.focus,
    projectile: grip === 'shoot' || grip === 'crossbow' ? 'arrow' : 'orb',
    slash: grip === 'thrust' ? [16, 30] : [20, 36],
    art: o.art ?? b.art,
    palette: o.palette,
    pivots: { torso: hip, head: neck, armB: shB, armF: shF, legB: hipB, legF: hipF, weapon: handF, offhand: handB, cape: [56, 76], wingB: [56, 84], wingF: [62, 84], ...wings?.pivots },
    ...(wings ? { wings: wings.joints, flap: o.build === 'small' ? 11 : 7, flapBones: 'wings' as const } : {}),
    rest: { ...pose.rest, torso: (pose.rest.torso ?? 0) + hunch, head: (pose.rest.head ?? 0) + Math.min(6, hunch / 2) },
    windup: pose.windup,
    strike: pose.strike,
    shapes,
  });
}

// ── Quadruped archetypes ─────────────────────────────────────────────────────
interface CanineOpts { palette: Record<string, string>; collar?: boolean; flames?: boolean; scars?: boolean; art?: number }

function canine(id: string, o: CanineOpts): PuppetRig {
  const shapes: Shape[] = [
    P('cape', 'fur', [[37, 90], [24, 83], [11, 90], [16, 93], [12, 97], [22, 96], [36, 99]]),
    L('cape', 'ink', 30, 88, 16, 92, 0.6), L('cape', 'ink', 32, 93, 18, 95, 0.6),
    L('armB', 'furD', 76, 100, 78, 125, 6), E('armB', 'furD', 79, 126.5, 5, 2.5),
    L('legB', 'furD', 42, 100, 40, 125, 6), E('legB', 'furD', 41, 126.5, 5, 2.5),
    E('torso', 'fur', 58, 96, 26, 12),
    P('torso', 'belly', [[48, 103], [74, 101], [70, 108], [54, 108]]),
    P('torso', 'fur', [[70, 85], [84, 83], [89, 98], [78, 109], [68, 104]]),
    P('torso', o.flames ? 'fire' : 'mane', [[44, 87], [50, 78], [56, 84], [61, 74], [66, 83], [71, 76], [76, 87], [58, 91]]),
    L('torso', 'ink', 50, 92, 58, 90, 0.6), L('torso', 'ink', 56, 96, 64, 94, 0.6), L('torso', 'ink', 76, 92, 82, 96, 0.6),
    ...(o.scars ? [L('torso', 'ink', 60, 88, 66, 98, 0.7), L('torso', 'ink', 63, 87, 69, 96, 0.7)] : []),
    E('legF', 'fur', 46, 101, 9, 11), L('legF', 'fur', 46, 106, 44, 125, 6.5), E('legF', 'fur', 46, 126.5, 5.5, 2.8),
    L('legF', 'ink', 43, 99, 48, 106, 0.6),
    L('armF', 'fur', 80, 100, 83, 125, 6.5), E('armF', 'fur', 85, 126.5, 5.5, 2.8),
    ...(o.collar ? [L('torso', 'leather', 78, 82, 84, 97, 3.4), P('torso', 'metal', [[80, 83], [77, 79], [82, 82]]), P('torso', 'metal', [[82, 89], [80, 85], [85, 88]])] : []),
    E('head', 'fur', 90, 78, 11, 9),
    P('head', 'fur', [[96, 73], [113, 78], [112, 83], [97, 86]]),
    P('head', 'belly', [[95, 84], [110, 84], [104, 90], [95, 90]]),
    P('head', 'teeth', [[100, 84], [101, 86.5], [102, 84]]), P('head', 'teeth', [[105, 84], [106, 86], [107, 84]]),
    L('head', 'ink', 96, 84, 111, 83.5, 0.7),
    P('head', 'fur', [[83, 73], [85, 58], [92, 70]]), P('head', 'furD', [[89, 71], [94, 59], [97, 72]]),
    L('head', 'ink', 86, 64, 88, 71, 0.6),
    C('head', 'ink', 112.3, 79.5, 1.3), L('head', 'ink', 92, 74, 99, 74.5, 0.8),
    C('head', 'eyeGlow', 96.5, 76.5, 1.7),
  ];
  return finish(id, {
    accent: o.palette.eyeGlow ?? DEFAULT_PALETTE.eyeGlow, style: 'melee', focus: [96, 78], focusBone: 'head', slash: [18, 32],
    art: o.art ?? 1.05, palette: o.palette,
    pivots: { torso: [42, 100], head: [82, 86], cape: [37, 93], armF: [80, 100], armB: [76, 100], legF: [46, 100], legB: [42, 100] },
    rest: { head: 8, torso: 2 },
    windup: { rootX: -6, torso: -6, head: -10, armF: -15, legF: 10 },
    strike: { rootX: 16, torso: 6, head: 12, armF: -45, armB: -30, legF: 30, legB: 25, cape: -15 },
    shapes,
  });
}

function bear(id: string, palette: Record<string, string>): PuppetRig {
  return finish(id, {
    accent: palette.eyeGlow ?? DEFAULT_PALETTE.eyeGlow, style: 'melee', focus: [108, 84], focusBone: 'head', slash: [22, 38], art: 1,
    palette,
    pivots: { torso: [40, 104], head: [86, 84], cape: [26, 88], armF: [82, 98], armB: [78, 98], legF: [44, 100], legB: [40, 100] },
    rest: { head: 9 },
    windup: { rootX: -4, torso: -24, head: -14, armF: -100, armB: -70 },
    strike: { rootX: 10, torso: 6, head: 10, armF: -30, armB: -10, legF: 8 },
    shapes: [
      E('cape', 'fur', 24, 88, 4, 3),
      L('armB', 'furD', 78, 98, 80, 124, 11), E('armB', 'furD', 81, 126.5, 7, 3),
      L('legB', 'furD', 40, 100, 38, 124, 11), E('legB', 'furD', 39, 126.5, 7, 3),
      E('torso', 'fur', 56, 92, 32, 19), E('torso', 'fur', 64, 76, 16, 9), E('torso', 'fur', 34, 92, 12, 15),
      P('torso', 'mane', [[46, 76], [52, 68], [56, 74], [61, 64], [66, 72], [72, 65], [74, 76]]),
      P('torso', 'belly', [[36, 104], [78, 104], [74, 110], [40, 110]]),
      L('torso', 'ink', 44, 88, 54, 84, 0.6), L('torso', 'ink', 58, 90, 68, 86, 0.6), L('torso', 'ink', 38, 96, 46, 94, 0.6),
      E('legF', 'fur', 44, 100, 12, 14), L('legF', 'fur', 44, 108, 42, 124, 12), E('legF', 'fur', 44, 126.5, 8, 3.5),
      L('armF', 'fur', 82, 96, 85, 124, 12), E('armF', 'fur', 87, 126.5, 8, 3.5),
      P('armF', 'teeth', [[92, 125], [96, 127], [92, 128]]), P('armF', 'teeth', [[91, 127.5], [95, 129.5], [91, 130]]),
      E('head', 'fur', 96, 82, 13, 11), E('head', 'belly', 108, 86, 8, 6),
      C('head', 'fur', 88, 71, 4.5), C('head', 'furD', 97, 70, 4),
      C('head', 'ink', 115, 84.5, 1.8), L('head', 'ink', 104, 90, 113, 89, 0.7), L('head', 'ink', 97, 76, 104, 77, 0.8),
      C('head', 'eyeGlow', 102, 79, 1.8),
    ],
  });
}

/** Wing landmarks of the drakes (young and veteran); Ignifax brings its own, bigger. */
const DRAKE_WINGS: [WingSpec, WingSpec] = [
  { side: 'B', shoulder: [56, 86], elbow: [48, 72], wrist: [48.5, 58], tips: [[42, 44], [30, 54], [24, 71]], root: [36, 86], bone: 'scaleD', width: 1.3 },
  { side: 'F', shoulder: [62, 86], elbow: [67, 73], wrist: [59, 60], tips: [[58, 42], [73, 49], [82, 61]], root: [75, 83], bone: 'scaleD', width: 1.3 },
];

function drake(id: string, palette: Record<string, string>, veteran: boolean, wingSpecs: [WingSpec, WingSpec] = DRAKE_WINGS): PuppetRig {
  const wings = buildWings(...wingSpecs);
  const extra: Shape[] = veteran
    ? [P('head', 'horn', [[80, 72], [66, 64], [76, 70]]), L('torso', 'ink', 50, 92, 58, 100, 0.8), L('torso', 'ink', 62, 90, 66, 99, 0.8), P('torso', 'horn', [[38, 92], [40, 85], [44, 91]])]
    : [];
  return finish(id, {
    accent: palette.eyeGlow ?? '#ffcf5a', style: 'melee', focus: [96, 74], focusBone: 'head', slash: [10, 22], slashAt: ['head', [98, 76]],
    flap: 14, flapBones: 'wings', art: 1.15, palette,
    pivots: { torso: [44, 100], head: [76, 92], cape: [40, 97], armF: [78, 100], armB: [74, 100], legF: [48, 100], legB: [44, 100], ...wings.pivots },
    wings: wings.joints,
    rest: {},
    // wings spread wide in the windup and beat down with the bite (the back wing opens backwards)
    windup: { rootX: -6, torso: -10, head: -22, wingF: 6, wingB: -10, armF: -10 },
    strike: { rootX: 16, torso: 6, head: 18, armF: -35, legF: 20, wingF: 16, wingB: -20 },
    shapes: [
      ...wings.back,
      P('cape', 'scale', [[41, 94], [27, 96], [14, 104], [6, 112], [10, 114], [20, 108], [32, 104], [42, 102]]),
      P('cape', 'scale', [[7, 111], [1, 105], [3, 117], [12, 116]]),
      P('cape', 'horn', [[25, 96], [27, 91], [30, 96]]), P('cape', 'horn', [[16, 103], [17, 98], [21, 102]]),
      L('legB', 'scaleD', 44, 100, 40, 114, 6), L('legB', 'scaleD', 40, 114, 44, 126, 5), E('legB', 'scaleD', 46, 127, 5, 2.2),
      L('armB', 'scaleD', 74, 100, 72, 114, 5), L('armB', 'scaleD', 72, 114, 76, 126, 4.5), E('armB', 'scaleD', 78, 127, 4.5, 2),
      E('torso', 'scale', 58, 98, 22, 11),
      P('torso', 'belly', [[42, 102], [76, 100], [72, 108.5], [48, 108.5]]),
      L('torso', 'ink', 52, 103, 52, 108.5, 0.7), L('torso', 'ink', 58, 102.5, 58, 108.8, 0.7), L('torso', 'ink', 64, 102, 64, 108.6, 0.7), L('torso', 'ink', 70, 101.5, 69.6, 107.5, 0.7),
      P('torso', 'horn', [[46, 88.5], [49, 82], [52, 88]]), P('torso', 'horn', [[54, 87.5], [57, 80], [60, 87.2]]), P('torso', 'horn', [[62, 87.8], [65, 82], [68, 88.4]]),
      L('torso', 'ink', 48, 94, 54, 92, 0.6), L('torso', 'ink', 60, 93, 66, 92, 0.6), L('torso', 'ink', 54, 97, 60, 96, 0.6),
      E('legF', 'scale', 48, 102, 8, 9), L('legF', 'scale', 48, 106, 44, 116, 5.5), L('legF', 'scale', 44, 116, 48, 126, 5), E('legF', 'scale', 50, 127, 5.5, 2.4),
      P('legF', 'horn', [[54, 126], [57, 127.5], [54, 129]]),
      // near wing over the body, under the neck and the head in every pose
      ...wings.front,
      P('head', 'scale', [[72, 97], [74, 82], [80, 72], [87, 74], [84, 87], [81, 99]]),
      P('head', 'belly', [[79, 97], [82, 85], [86, 76], [84.5, 87], [82, 98]]),
      L('head', 'ink', 80.5, 92, 83.5, 92.5, 0.6), L('head', 'ink', 82, 86, 85, 86.5, 0.6), L('head', 'ink', 83.5, 80, 86, 80.5, 0.6),
      P('head', 'wing', [[80, 72], [73, 69], [77, 77]]),
      P('head', 'scale', [[80, 70], [88, 64], [100, 66], [107, 71], [102, 76], [90, 78], [82, 77]]),
      P('head', 'scale', [[88, 76], [102, 76], [98, 80.5], [90, 80.5]]),
      P('head', 'teeth', [[92, 76], [93, 78.6], [94, 76]]), P('head', 'teeth', [[97, 76], [98, 78.3], [99, 76]]),
      L('head', 'ink', 88, 76.2, 103, 76, 0.8),
      P('head', 'horn', [[84, 66], [73, 55], [78, 64], [82, 70]]), P('head', 'horn', [[88, 64], [84, 51], [90, 62]]),
      ...extra,
      C('head', 'ink', 103.5, 71, 0.8), L('head', 'ink', 90, 67, 97.5, 68, 0.9),
      C('head', 'eyeGlow', 94, 69.6, 1.5),
      L('armF', 'scale', 78, 100, 80, 114, 5.5), L('armF', 'scale', 80, 114, 78, 126, 5), E('armF', 'scale', 80, 127, 5.5, 2.4),
      P('armF', 'horn', [[85, 126], [88, 127.5], [85, 129]]),
    ],
  });
}

function crawler(id: string, palette: Record<string, string>): PuppetRig {
  const legs = (bone: BoneId, xs: number[], k: string) => xs.flatMap((x) => [L(bone, k, x, 104, x - 3, 118, 2), L(bone, k, x - 3, 118, x + 1, 127, 1.8)]);
  return finish(id, {
    accent: palette.eyeGlow ?? '#e8e070', style: 'melee', focus: [96, 90], focusBone: 'head', slash: [14, 26], slashAt: ['head', [100, 94]], art: 1.1,
    palette,
    pivots: { torso: [40, 104], head: [80, 100], cape: [30, 100], armF: [70, 104], armB: [60, 104], legF: [50, 104], legB: [40, 104] },
    rest: { head: 4 },
    windup: { rootX: -5, torso: -8, head: -20 },
    strike: { rootX: 16, torso: 6, head: 16 },
    shapes: [
      P('cape', 'scaleD', [[36, 100], [20, 104], [12, 112], [22, 112], [36, 108]]),
      ...legs('legB', [36, 48], 'scaleD'), ...legs('armB', [60, 70], 'scaleD'),
      E('torso', 'scale', 34, 102, 10, 8), E('torso', 'scale', 48, 100, 11, 9), E('torso', 'scale', 62, 99, 11, 9.5), E('torso', 'scale', 75, 99, 9, 9),
      L('torso', 'ink', 41, 94, 41, 109, 0.8), L('torso', 'ink', 55, 92, 55, 108, 0.8), L('torso', 'ink', 69, 91, 69, 108, 0.8),
      P('torso', 'horn', [[44, 92], [47, 86], [50, 92]]), P('torso', 'horn', [[58, 91], [61, 84], [64, 91]]),
      ...legs('legF', [42, 54], 'scale'), ...legs('armF', [66, 76], 'scale'),
      E('head', 'scale', 88, 98, 9, 8),
      L('head', 'flesh', 92, 102, 100, 112, 1.6), L('head', 'flesh', 95, 101, 104, 108, 1.6), L('head', 'flesh', 90, 103, 94, 114, 1.6), L('head', 'flesh', 96, 99, 106, 102, 1.4),
      P('head', 'teeth', [[94, 100], [98, 99], [96, 103]]),
      C('head', 'eyeGlow', 91, 95, 1.3), C('head', 'eyeGlow', 94.5, 95.5, 1.1),
    ],
  });
}

/**
 * Mangy sewer rat: arched back, pointed snout with buck teeth and venomous
 * drool, and a long naked tail on a spring chain. `giant` makes the swarm's
 * queen: scarred, torn ear, spikier back and glowing pustules.
 */
function rodent(id: string, o: { palette: Record<string, string>; giant?: boolean; art?: number }): PuppetRig {
  const tail: ChainSpec = {
    slot: 'A', parent: 'torso', joints: o.giant ? [[34, 112], [19, 119], [5, 116], [-4, 103]] : [[34, 112], [21, 118], [9, 115], [1, 106]],
    freq: 2.2, damping: 0.25, taper: 0.5, sag: 1.2, sway: 2.2,
  };
  const g = o.giant;
  return finish(id, {
    accent: o.palette.eyeGlow ?? '#b6ff5a', style: 'melee', focus: [100, 108], focusBone: 'head', slash: [12, 24], slashAt: ['head', [100, 110]],
    art: o.art ?? 1.15,
    palette: { fur: '#5a5048', furD: '#3e3630', mane: '#3a332d', belly: '#7a6e62', paw: '#c08a88', tail: '#b0827e', mange: '#9a6a64', teeth: '#d8c890', eyeGlow: '#b6ff5a', poison: '#8fe36a', ...o.palette },
    pivots: { torso: [44, 114], head: [74, 108], legB: [42, 114], legF: [41, 112], armB: [72, 114], armF: [72, 113], cape: [34, 112] },
    chains: [tail],
    rest: { head: 4 },
    windup: { rootX: -6, torso: -6, head: -12, armF: -15, legF: 10 },
    strike: { rootX: 16, torso: 6, head: 14, armF: -40, armB: -25, legF: 25, legB: 20 },
    shapes: [
      ...strandShapes(tail, 'tail', g ? [4, 2.8, 1.6, 0.5] : [3.4, 2.4, 1.4, 0.5]),
      L('legB', 'furD', 42, 114, 46, 120, 4), L('legB', 'furD', 46, 120, 42, 125, 3.2), E('legB', 'paw', 45, 126.8, 4, 1.6),
      L('armB', 'furD', 72, 114, 74, 125, 3.2), E('armB', 'paw', 76, 126.8, 3.2, 1.5),
      P('torso', 'fur', [[30, 113], [33, 103], [43, 96], [56, 95.5], [68, 99], [76, 106], [76, 114], [67, 121], [44, 122.5], [33, 120]]),
      P('torso', 'mane', g
        ? [[33, 102], [35, 92], [40, 98], [43, 88], [48, 96], [52, 87], [56, 96], [61, 90], [63, 99], [70, 96], [68, 103], [48, 101]]
        : [[33, 103], [36, 96], [40, 99], [44, 93], [48, 98], [52, 94], [56, 99], [61, 97], [64, 101], [70, 100], [66, 104], [48, 102]]),
      E('torso', 'belly', 56, 119, 13, 3.2),
      E('torso', 'mange', 60, 109, 4, 2.4), C('torso', 'mange', 36, 110, 2),
      L('torso', 'ink', 48, 106, 54, 105, 0.6), L('torso', 'ink', 62, 113, 68, 112, 0.6), L('torso', 'ink', 52, 114, 57, 113, 0.6),
      ...(g ? [
        L('torso', 'ink', 50, 101, 57, 111, 0.8), L('torso', 'ink', 54, 100, 60, 108, 0.7),
        C('torso', 'poison', 44, 100, 1.5), C('torso', 'poison', 66, 104, 1.2), C('torso', 'poison', 58, 101, 1),
      ] : []),
      E('legF', 'fur', 41, 112, 7.5, 8.5), L('legF', 'fur', 40, 116, 44, 121, 4.2), L('legF', 'fur', 44, 121, 40, 125.5, 3.4), E('legF', 'paw', 43, 126.8, 4.5, 1.7),
      C('head', 'furD', 73, 96, 4.2),
      P('head', 'fur', [[67, 101], [76, 96], [86, 98], [96, 104], [103, 107.5], [101.5, 111.5], [90, 115], [76, 116], [67, 112]]),
      P('head', 'fur', g ? [[75, 98], [74, 92], [77, 88.5], [80, 91], [82, 89], [84, 93], [83, 98]] : [[75, 98], [74, 92], [78, 89], [83, 91], [84, 98]]),
      P('head', 'paw', [[77, 96.5], [77, 92.5], [79.5, 91], [82, 93.5], [82, 96.5]]),
      C('head', 'paw', 103, 108.8, 1.7),
      P('head', 'teeth', g ? [[95, 112.5], [99.5, 112], [97, 118]] : [[96, 112.4], [99, 112], [97.6, 116]]),
      L('head', 'ink', 89, 112.6, 100.5, 111.6, 0.6),
      P('head', 'poison', [[92.5, 113.5], [95, 113.5], [94.2, 119], [93.6, 119]]), C('head', 'poison', 93.9, 120, 1),
      L('head', 'ink', 99, 107, 109, 103.5, 0.35), L('head', 'ink', 99, 109.2, 110, 109, 0.35),
      ...(g ? [L('head', 'ink', 84, 100, 92, 106, 0.7)] : []),
      C('head', 'eyeGlow', 89, 103, g ? 1.8 : 1.6),
      L('armF', 'fur', 72, 113, 77, 124, 3.8), E('armF', 'paw', 79, 126.8, 3.6, 1.6),
    ],
  });
}

// ── Floating and amorphous archetypes ────────────────────────────────────────
function spectre(id: string, palette: Record<string, string>): PuppetRig {
  return finish(id, {
    accent: palette.eyeGlow ?? '#bfe9ff', style: 'melee', focus: [80, 96], slash: [18, 32], hover: 3, art: 1.3, palette,
    pivots: { torso: [58, 96], head: [59, 74], armB: [52, 79], armF: [65, 79], cape: [56, 76] },
    rest: { armF: -40, armB: -20, torso: 6, head: 6 },
    windup: { rootX: -4, torso: -8, head: -8, armF: 140, armB: 120 },
    strike: { rootX: 14, torso: 16, head: 8, armF: 280, armB: 250 },
    shapes: [
      P('cape', 'cloak', [[50, 76], [62, 74], [60, 100], [52, 116], [46, 108], [40, 118], [40, 96]]),
      L('armB', 'robe', 52, 79, 46, 92, 3.6), L('armB', 'robe', 46, 92, 48, 104, 3), P('armB', 'bone', [[46, 104], [50, 110], [47, 111]]), P('armB', 'bone', [[48, 104], [53, 109], [50, 110]]),
      P('torso', 'robe', [[50, 76], [67, 76], [72, 98], [66, 106], [62, 102], [58, 114], [54, 104], [48, 110], [46, 96]]),
      L('torso', 'ink', 58, 80, 59, 104, 0.6), L('torso', 'ink', 53, 84, 52, 100, 0.5),
      ...head('hood', [61, 64.5], 0.95),
      L('armF', 'robe', 65, 79, 68, 91, 3.6), L('armF', 'robe', 68, 91, 70, 101, 3),
      P('weapon', 'bone', [[69, 101], [76, 104], [70, 104]]), P('weapon', 'bone', [[70, 102], [75, 108], [69, 105]]),
    ],
  });
}

function floatingEye(id: string, palette: Record<string, string>, stalks: number): PuppetRig {
  const stalk = (bone: BoneId, x1: number, y1: number, x2: number, y2: number): Shape[] => [
    L(bone, 'flesh', x1, y1, x2, y2, 2), C(bone, 'sclera', x2, y2, 2.8), C(bone, 'eyeGlow', x2 + 0.8, y2, 1.2),
  ];
  const tops: Shape[] = [
    ...stalk('armB', 52, 70, 44, 54), ...stalk('head', 60, 66, 60, 48),
    ...(stalks > 2 ? [...stalk('armF', 68, 70, 78, 54), ...stalk('cape', 48, 78, 36, 66)] : [...stalk('armF', 68, 70, 76, 56)]),
  ];
  return finish(id, {
    accent: palette.magic ?? '#d98bff', style: 'magic', focus: [74, 84], focusBone: 'torso', hover: 4, art: 1.2, palette,
    pivots: { torso: [60, 84], head: [60, 68], armB: [52, 70], armF: [68, 70], cape: [48, 78] },
    rest: {},
    windup: { rootX: -4, torso: -10 },
    strike: { rootX: 6, torso: 8 },
    shapes: [
      ...tops,
      C('torso', 'flesh', 60, 84, 17),
      L('torso', 'ink', 46, 78, 52, 72, 0.6), L('torso', 'ink', 48, 92, 54, 97, 0.6),
      P('torso', 'socket', [[52, 94], [70, 93], [66, 99], [56, 99]]),
      P('torso', 'teeth', [[55, 94], [56.5, 97], [58, 94]]), P('torso', 'teeth', [[61, 93.8], [62.5, 96.8], [64, 93.8]]), P('torso', 'teeth', [[66, 93.5], [67, 96], [68, 93.5]]),
      E('torso', 'sclera', 66, 82, 8, 7.5),
      C('torso', 'magic', 69, 82, 4),
      C('torso', 'ink', 70, 82, 1.8),
    ],
  });
}

// ── Serpentine appendages (eye stalks, tentacles) ────────────────────────────
// A chain of 2-3 bones (a generic chain slot, a wing chain or arm → hand) with
// one tapering capsule per segment. The rig's `animate` drives it with a wave
// that travels from the root to the tip, so it writhes like a snake.
type PoseBone = Extract<BoneId, keyof Pose>;
interface Appendage {
  bones: PoseBone[];
  /** Root pivot followed by the end of each segment (bind pose). */
  joints: Pt[];
  /** Screen direction of the root segment (degrees, y down). */
  dir: number;
}

const round2 = (v: number) => Math.round(v * 100) / 100;
const smoothRamp = (x: number) => { const u = Math.min(1, Math.max(0, x)); return u * u * (3 - 2 * u); };
/** 0 → 1 → 1 → 0 over an action fraction q, with the given corners. */
const envelope = (q: number, a: number, b: number, c: number, d: number) =>
  q <= a || q >= d ? 0 : q < b ? smoothRamp((q - a) / (b - a)) : q <= c ? 1 : smoothRamp((d - q) / (d - c));

/** An appendage growing from `root` towards `dir`, each segment turning `curl` degrees more. */
function appendage(bones: PoseBone[], root: Pt, dir: number, lens: number[], curl: number): Appendage {
  const joints: Pt[] = [root];
  let [x, y] = root;
  lens.forEach((l, k) => {
    const a = ((dir + curl * (k - 0.4)) * Math.PI) / 180;
    x += l * Math.cos(a); y += l * Math.sin(a);
    joints.push([round2(x), round2(y)]);
  });
  return { bones, joints, dir };
}

/** Pivots of an appendage's bones: each one turns around its own root joint. */
const appendagePivots = (list: Appendage[]) =>
  Object.fromEntries(list.flatMap((a) => a.bones.map((b, k) => [b, a.joints[k]]))) as Partial<Record<BoneId, Pt>>;

/** Tapering capsules, one per segment, each on its own bone. */
const segments = (a: Appendage, key: string, widths: number[]): Shape[] =>
  a.bones.map((b, k) => L(b, key, a.joints[k][0], a.joints[k][1], a.joints[k + 1][0], a.joints[k + 1][1], widths[k]));

/** Travelling wave: every joint swings like the previous one, `lag` radians later. */
function writhe(p: Pose, a: Appendage, t: number, hz: number, phase: number, amps: number[], lag: number, gain: number) {
  a.bones.forEach((b, k) => { p[b] += amps[k] * gain * Math.sin(2 * Math.PI * hz * t + phase - k * lag); });
}

/** Action envelopes shared by the writhing monsters: fury (attack/spell), flinch (hit) and death. */
function actionMoods(action: ActionProgress | null) {
  const q = action?.p ?? 0, type = action?.type;
  return {
    fury: type === 'attack' || type === 'spell' ? envelope(q, 0.02, 0.28, 0.78, 1) : 0,
    flinch: type === 'hit' ? envelope(q, 0, 0.08, 0.3, 1) : 0,
    dead: type === 'death' ? smoothRamp((q - 0.05) / 0.5) : 0,
  };
}

function brain(id: string, palette: Record<string, string>): PuppetRig {
  const phase = phaseOf(id);
  // the brain mass: a core with two throbbing hemispheres on top
  const core = { x: 60, y: 76, rx: 24, ry: 17 };
  const under = (x: number): Pt => [x, round2(core.y + core.ry * Math.sqrt(1 - ((x - core.x) / core.rx) ** 2) - 3)];
  const grow = (bones: PoseBone[], x: number, dir: number, curl: number) => appendage(bones, under(x), dir, [12, 11, 10], curl);
  // tentacles hanging from the underside, four behind the core and four in front
  const behind = [
    grow(['wingB', 'wingBArm', 'wingBF1'], 41, 114, -12),
    grow(['chA1', 'chA2', 'chA3'], 51, 101, 12),
    grow(['chC1', 'chC2', 'chC3'], 68, 84, -12),
    grow(['wingF', 'wingFArm', 'wingFF1'], 79, 68, 12),
  ];
  const front = [
    grow(['chB1', 'chB2', 'chB3'], 46, 106, 14),
    grow(['chD1', 'chD2', 'chD3'], 57, 93, -10),
    grow(['chE1', 'chE2', 'chE3'], 65, 86, 12),
    grow(['chF1', 'chF2', 'chF3'], 74, 76, -14),
  ];
  const tentacles = [...behind, ...front];
  const sucker = (a: Appendage): Shape => {
    const [p, q] = [a.joints[1], a.joints[2]];
    return C(a.bones[1], 'sucker', round2((p[0] + q[0]) / 2 + 1.1), round2((p[1] + q[1]) / 2), 0.9);
  };
  // sunken glowing eyes: a dark pit with an angry slit inside
  const pitEye = (b: BoneId, x: number, y: number, s: number): Shape[] =>
    [E(b, 'socket', x, y, 3.4 * s, 2.3 * s), slitEye(b, 'eyeGlow', [x - 2.6 * s, y - 0.9 * s], [x + 2.4 * s, y + 0.4 * s], 1.5 * s)];
  // a bulging, outlined fold of the cortex along a short polyline
  const fold = (b: BoneId, pts: Pt[]): Shape[] => pts.slice(1).map((q, i) => L(b, 'fold', pts[i][0], pts[i][1], q[0], q[1], 5.2));
  return finish(id, {
    accent: palette.magic ?? '#c77dff', style: 'magic', focus: [80, 73], focusBone: 'head', hover: 3, art: 1.5,
    palette: { tentacle: '#5e3f58', sucker: '#cdb6a4', fleshD: '#5a3a4c', fold: '#b39496', ...palette },
    pivots: { torso: [60, 84], head: [60, 88], cape: [60, 88], ...appendagePivots(tentacles) },
    rest: {},
    windup: { rootX: -4, torso: -12 },
    strike: { rootX: 6, torso: 10 },
    emitters: [{ bone: 'torso', at: [60, 60], effect: 'arcana', rate: 1.5, spread: 16 }],
    animate: (p, t, action) => {
      const { fury, flinch, dead } = actionMoods(action);
      tentacles.forEach((a, i) => {
        for (const b of a.bones) p[b] = 0;
        writhe(p, a, t, 0.42 + 0.06 * (i % 3), phase + i * 1.7, [7, 10, 14], 0.85, (1 + 0.5 * fury) * (1 - 0.7 * dead));
        writhe(p, a, t, 1.9 + 0.2 * (i % 2), phase + i * 1.3, [5, 8, 11], 1.1, fury);
        // lash at the hero, recoil when hit, hang limp when dying
        a.bones.forEach((b, k) => { p[b] += -10 * fury * ((k + 1) / 3) + 8 * flinch - (a.dir - 90) * 0.25 * dead; });
      });
      // the hemispheres throb like a heart (a double beat), opening and closing the fissure
      const beat = t * 0.9 + phase / 6.28, c = beat - Math.floor(beat);
      const throb = Math.exp(-((c - 0.1) ** 2) / 0.004) + 0.6 * Math.exp(-((c - 0.3) ** 2) / 0.004);
      const swell = throb * (1 + 1.5 * fury) * (1 - dead);
      p.head = 3 * swell - 2 * flinch;
      p.cape = -3 * swell + 2 * flinch;
    },
    shapes: [
      ...behind.flatMap((a) => segments(a, 'tentacle', [4.6, 3.5, 2.3])),
      P('torso', 'fleshD', [[53, 86], [67, 86], [65, 99], [60, 104], [55, 99]]),
      L('torso', 'magic', 58, 90, 61, 101, 0.9), L('torso', 'magic', 63, 89, 62, 97, 0.8),
      E('torso', 'flesh', core.x, core.y, core.rx, core.ry),
      E('torso', 'fleshD', 50, 88, 11, 5.5),
      // psionic light leaks through the fissure when the lobes part
      L('torso', 'magic', 61, 56, 60, 82, 1.4),
      // far hemisphere: coiled folds (gyri) over a darker mass, the grooves glowing
      E('cape', 'flesh', 48, 71, 17, 15.5),
      L('cape', 'magic', 38, 76, 50, 72, 0.9),
      ...fold('cape', [[36, 64], [42, 58.5], [51, 57.5]]), ...fold('cape', [[33.5, 72], [40, 67.5], [49, 66.5]]),
      ...fold('cape', [[36.5, 80], [45, 77], [54, 76.5]]), ...fold('cape', [[54, 61], [57, 68]]), ...fold('cape', [[43, 86], [52, 84.5]]),
      ...pitEye('cape', 46, 72, 0.8),
      // near hemisphere, crowded with eyes
      E('head', 'flesh', 72, 70, 17.5, 16.5),
      L('head', 'magic', 66, 74, 80, 79, 0.9),
      ...fold('head', [[60.5, 62], [67, 56.5], [76, 56.5]]), ...fold('head', [[79.5, 57], [86, 62.5]]),
      ...fold('head', [[62.5, 70], [70, 65.5], [78.5, 66.5]]), ...fold('head', [[82.5, 68], [88, 73.5]]),
      ...fold('head', [[63.5, 79], [72, 76.5], [80, 79]]), ...fold('head', [[83, 80], [86.5, 84]]),
      ...pitEye('head', 79, 72.5, 1.5), ...pitEye('head', 70, 62, 0.9), ...pitEye('head', 84, 62.5, 0.8),
      L('torso', 'magic', 46, 84, 56, 88, 0.8),
      // a lamprey maw on the underside
      E('torso', 'socket', 69, 89, 6.5, 3),
      ...[64.5, 67.5, 70.5, 73.5].map((x): Shape => P('torso', 'teeth', [[x - 1, 86.8], [x + 0.3, 89.6], [x + 1, 86.8]])),
      ...front.flatMap((a) => [...segments(a, 'tentacle', [5.2, 3.9, 2.5]), sucker(a)]),
    ],
  });
}

function horror(id: string, palette: Record<string, string>): PuppetRig {
  const arm = (bone: BoneId, x: number, y: number, pts: Pt[]): Shape[] => {
    const out: Shape[] = [];
    let prev: Pt = [x, y];
    pts.forEach(([px, py], i) => { out.push(L(bone, 'flesh', prev[0], prev[1], px, py, 5 - i * 1.2)); prev = [px, py]; });
    return out;
  };
  return finish(id, {
    accent: palette.eyeGlow ?? '#e8e070', style: 'melee', focus: [84, 90], slash: [20, 36], art: 1.15, palette,
    pivots: { torso: [58, 110], head: [60, 92], armB: [48, 100], armF: [72, 100], legB: [50, 112], legF: [68, 112], cape: [44, 104] },
    rest: {},
    windup: { rootX: -4, torso: -10, armF: 60, armB: 40 },
    strike: { rootX: 12, torso: 10, armF: -60, armB: -40 },
    shapes: [
      ...arm('cape', 44, 104, [[30, 96], [22, 104], [18, 96]]),
      ...arm('armB', 48, 100, [[40, 84], [44, 70], [50, 64]]),
      ...arm('legB', 50, 112, [[40, 122], [30, 126], [24, 122]]),
      P('torso', 'flesh', [[40, 124], [42, 104], [50, 92], [66, 90], [78, 100], [80, 124]]),
      L('torso', 'ink', 50, 100, 56, 118, 0.7), L('torso', 'ink', 64, 98, 70, 118, 0.7),
      C('head', 'flesh', 62, 94, 12),
      E('head', 'sclera', 66, 92, 7, 6), C('head', 'eyeGlow', 68, 92, 3), C('head', 'ink', 68.6, 92, 1.3),
      P('head', 'socket', [[56, 102], [72, 101], [68, 106], [58, 106]]), P('head', 'teeth', [[59, 102], [60.5, 105], [62, 102]]), P('head', 'teeth', [[65, 101.6], [66.5, 104.5], [68, 101.6]]),
      ...arm('legF', 68, 112, [[80, 122], [92, 126], [98, 120]]),
      ...arm('armF', 72, 100, [[84, 90], [92, 80], [98, 84]]),
    ],
  });
}

function cube(id: string, palette: Record<string, string>): PuppetRig {
  return finish(id, {
    accent: palette.eyeGlow ?? '#c8f07a', style: 'melee', focus: [84, 100], slash: [20, 36], slashAt: ['torso', [70, 96]], art: 1.05, palette,
    pivots: { torso: [58, 128], head: [58, 100] },
    rest: {},
    windup: { rootX: -6, torso: -8 },
    strike: { rootX: 14, torso: 8 },
    shapes: [
      P('torso', 'slime', [[30, 128], [30, 76], [42, 66], [92, 66], [92, 118], [84, 128]]),
      P('torso', 'belly', [[30, 76], [42, 66], [92, 66], [80, 76]]),
      L('torso', 'ink', 80, 76, 80, 128, 0.7), L('torso', 'ink', 80, 76, 92, 66, 0.7),
      C('head', 'bone', 56, 96, 7), P('head', 'bone', [[52, 101], [61, 100], [60, 106], [53, 106]]), C('head', 'socket', 59, 95, 2), C('head', 'eyeGlow', 59.3, 95, 0.8),
      L('head', 'bone', 44, 112, 58, 118, 2.4), L('head', 'bone', 64, 110, 72, 120, 2), C('head', 'metal', 70, 84, 3), L('head', 'metal', 38, 86, 46, 80, 1.6),
      P('torso', 'slime', [[40, 128], [42, 124], [44, 128]]), P('torso', 'slime', [[66, 128], [68, 123], [71, 128]]),
      C('torso', 'belly', 86, 72, 2.2), C('torso', 'belly', 38, 90, 1.6), C('torso', 'belly', 50, 118, 1.4),
    ],
  });
}

function elemental(id: string, kind: 'fire' | 'water' | 'wind', palette: Record<string, string>): PuppetRig {
  const body = kind === 'fire' ? 'fire' : kind === 'water' ? 'water' : 'wind';
  const detail: Shape[] = kind === 'fire'
    ? [P('torso', 'flameCore', [[54, 104], [58, 84], [62, 92], [66, 80], [68, 104]])]
    : kind === 'water'
      ? [L('torso', 'ink', 52, 90, 60, 88, 0.6), L('torso', 'ink', 56, 98, 66, 96, 0.6), L('torso', 'ink', 50, 106, 58, 104, 0.6), C('torso', 'belly', 64, 86, 2)]
      : [L('torso', 'ink', 48, 92, 66, 86, 0.7), L('torso', 'ink', 50, 100, 70, 94, 0.7), L('torso', 'ink', 54, 108, 68, 104, 0.7)];
  return finish(id, {
    accent: palette.eyeGlow ?? '#ffe08a', style: 'magic', focus: [76, 86], focusBone: 'armF', hover: 3, art: 1.2,
    palette: { flameCore: '#ffe6a8', ...palette },
    pivots: { torso: [58, 104], head: [60, 78], armB: [51, 84], armF: [66, 84], cape: [54, 100] },
    rest: { armF: -30, armB: 10 },
    windup: { rootX: -4, torso: -8, armF: 20, armB: 30 },
    strike: { rootX: 6, torso: 10, armF: -90, armB: -20 },
    shapes: [
      P('cape', body, [[52, 104], [44, 116], [40, 126], [50, 120], [54, 128], [58, 118], [62, 126], [64, 112]]),
      L('armB', body, 51, 84, 44, 96, 5), C('armB', body, 43, 99, 4),
      P('torso', body, [[48, 80], [70, 80], [72, 96], [64, 110], [52, 110], [46, 96]]),
      ...detail,
      P('head', body, [[50, 76], [54, 60], [60, 66], [62, 54], [68, 64], [72, 70], [70, 80], [52, 82]]),
      C('head', 'eyeGlow', 64, 71, 1.6), C('head', 'eyeGlow', 68, 71.5, 1.3),
      L('armF', body, 66, 84, 72, 96, 5), C('armF', body, 74, 98, 4),
    ],
  });
}

/**
 * Fire elemental bound to the dragonborn guards: a swirling pillar of living flame
 * (no rock, unlike the magma elemental) with a white-hot core, ember eyes in a dark
 * face and flame arms. Its crown, shoulders and tail are flame tongues on their own
 * bones that flicker out of step; glowing rune bands, like links of a fiery chain,
 * ring its waist and wrists.
 */
function fireElemental(id: string, palette: Record<string, string>): PuppetRig {
  const phase = phaseOf(id);
  /** A flame tongue standing on (x, y), `h` tall, its tip leaning `lean` units. */
  const lick = (b: BoneId, k: string, x: number, y: number, h: number, w: number, lean: number): Shape =>
    P(b, k, [[x - w, y], [round2(x - w * 0.5 + lean * 0.3), round2(y - h * 0.5)], [x + lean, y - h], [round2(x + w * 0.4 + lean * 0.4), round2(y - h * 0.45)], [x + w, y]]);
  // [bone, base, height, half width, lean]
  const tongues: [PoseBone, Pt, number, number, number][] = [
    ['chA1', [56, 63], 17, 4.5, -7], ['chB1', [50, 81], 12, 3.6, -6], ['chF1', [52, 106], 11, 3.4, -9],
    ['chC1', [61.5, 60], 19, 4.6, -3], ['chD1', [67, 61], 13, 3.6, -1], ['chE1', [71, 81], 10, 3.2, -4],
  ];
  const flame = (i: number): Shape[] => {
    const [b, [x, y], h, w, lean] = tongues[i];
    return [lick(b, 'flameD', x, y, h, w, lean), lick(b, 'fire', x + 0.3, y, h * 0.62, w * 0.5, lean * 0.6)];
  };
  // a ring of runes around the waist, its far half behind the body
  const band = { x: 59, y: 100, rx: 17, ry: 4.4 };
  const rune = (deg: number): Shape => {
    const at = (a: number): Pt => [round2(band.x + band.rx * Math.cos((a * Math.PI) / 180)), round2(band.y + band.ry * Math.sin((a * Math.PI) / 180))];
    const [a, b] = [at(deg - 10), at(deg + 10)];
    return L('torso', 'magic', a[0], a[1], b[0], b[1], 1.4);
  };
  const shackle = (b: BoneId, x: number, y: number, dx: number, dy: number): Shape[] =>
    [L(b, 'magic', x - dx, y - dy, x + dx, y + dy, 1.3), L(b, 'magic', x - dx + 1.6, y - dy + 2.2, x + dx + 1.6, y + dy + 2.2, 1.2)];
  const flames = tongues.map(([b]) => b);
  return finish(id, {
    accent: palette.fire ?? '#ff8a2a', style: 'magic', focus: [81, 100], focusBone: 'armF', hover: 3.5, art: 1.3,
    palette,
    pivots: {
      torso: [58, 102], head: [61, 76], armB: [52, 82], armF: [68, 82], cape: [58, 102],
      ...Object.fromEntries(tongues.map(([b, at]) => [b, at])),
    },
    rest: { armF: -30, armB: 10 },
    windup: { rootX: -4, torso: -8, armF: 20, armB: 30 },
    strike: { rootX: 6, torso: 10, armF: -90, armB: -20 },
    emitters: [
      { bone: 'chC1', at: [59, 44], effect: 'llama', rate: 1.6, spread: 4 },
      { bone: 'torso', at: [58, 98], effect: 'ascua', rate: 2.5, spread: 12 },
    ],
    animate: (p, t, action) => {
      const { fury, flinch, dead } = actionMoods(action);
      // every flame tongue flickers at its own pace, wilder when it attacks
      flames.forEach((b, i) => {
        const f = 1.5 + 0.23 * i, ph = phase + i * 1.9;
        const flicker = Math.sin(2 * Math.PI * f * t + ph) + 0.45 * Math.sin(2 * Math.PI * 2.6 * f * t + 2 * ph);
        p[b] = (6 + 6 * fury) * flicker * (1 - 0.6 * dead) + 10 * flinch - 30 * dead;
      });
      // the vortex under it swirls; the head stays on the body so the crown follows it
      p.cape = 5 * (1 + fury) * Math.sin(2 * Math.PI * 0.9 * t + phase) - 6 * flinch;
      p.head = 0;
    },
    shapes: [
      // — behind: far crown and shoulder flames, far arm and the far half of the rune band —
      ...flame(0), ...flame(1),
      P('armB', 'flameD', [[49, 80], [55, 83], [51, 93], [46, 102], [41, 106], [42.5, 98], [45.5, 89]]),
      P('armB', 'fire', [[50, 84], [52.5, 85], [48.5, 94], [44, 101], [46, 93]]),
      ...shackle('armB', 44.5, 98.5, 2.6, 1.2),
      ...[200, 235, 270, 305, 340].map(rune),
      // — the swirling vortex it stands on —
      P('cape', 'flameD', [[46, 100], [70, 100], [69, 107], [64, 113], [60, 119], [57, 126], [55.5, 119], [51, 112], [47, 106]]),
      P('cape', 'fire', [[50, 102], [66, 102], [62, 109], [58.5, 116], [56.5, 122], [55, 113], [51, 107]]),
      L('cape', 'ink', 51, 106, 63, 104, 0.6), L('cape', 'ink', 54, 112, 62, 109, 0.5),
      ...flame(2),
      // — the body: flame over a white-hot core —
      P('torso', 'flameD', [[47, 79], [54, 75], [61, 73], [68, 75], [74, 80], [76, 88], [73, 97], [70, 103], [48, 103], [44, 96], [44, 87]]),
      P('torso', 'fire', [[50, 81], [60, 76.5], [70, 81], [72, 89], [68, 99], [52, 99], [47, 90]]),
      L('torso', 'ink', 45.5, 91, 49.5, 97, 0.6), L('torso', 'ink', 74, 84, 71.5, 91, 0.6), L('torso', 'ink', 52, 77.5, 57, 75.5, 0.5),
      E('torso', 'flame', 60, 89, 7, 8),
      C('torso', 'flameCore', 60, 89, 4),
      ...[20, 55, 90, 125, 160].map(rune),
      // — the head: a dark face in the flame, ember eyes and a burning mouth —
      P('head', 'flameD', [[53, 78], [52, 70], [54, 63], [58, 59.5], [64, 58.5], [69, 61], [71, 67], [71, 74], [68, 79]]),
      P('head', 'fire', [[55, 76], [55, 68], [59, 62.5], [65, 62.5], [68, 67], [68, 74], [66, 77]]),
      P('head', 'socket', [[59.6, 67], [63, 66.2], [66.4, 68.4], [65.8, 70.8], [61.6, 70.4]]),
      P('head', 'socket', [[66.4, 66.6], [70.8, 66.2], [71, 69], [68.2, 70]]),
      slitEye('head', 'eyeGlow', [60.6, 67.4], [65.2, 69.2], 1.6), slitEye('head', 'eyeGlow', [66.8, 67.2], [70.2, 68.6], 1.3),
      P('head', 'flameCore', [[62, 73.6], [69.4, 73], [68, 75.4], [65, 74.6], [63, 75.6]]),
      ...flame(3), ...flame(4), ...flame(5),
      // — the near arm, a flame claw bound by a rune shackle —
      P('armF', 'flameD', [[65.5, 79.5], [72, 82], [76, 90], [79, 97], [83, 102], [77.5, 101.5], [72, 94], [66.5, 88]]),
      P('armF', 'fire', [[68, 83], [71.5, 85], [75, 92], [78.5, 99], [74.5, 95], [69.5, 89]]),
      P('armF', 'flame', [[77, 99], [85, 98.5], [80.5, 101.5], [84, 104], [77.5, 102.5]]),
      ...shackle('armF', 75, 94.5, 2.2, -1.6),
    ],
  });
}

/** Dragonborn guard: a biped with a dragon head, bronze armour and a halberd, behind a
 *  tower shield held over its body; the shield barely moves when it strikes and goes
 *  up when it covers its comrades (the generic 'spell' raises the back arm). */
function dragonbornGuard(id: string, palette: Record<string, string>): PuppetRig {
  const rig = biped(id, {
    build: 'normal', head: 'dragonborn', weapon: 'halberd', offhand: 'tower', shieldFront: true,
    palette, arms: 'armor', armor: true, belt: true, cloak: true, art: 1.28,
  });
  // at rest the halberd stands upright at arm's length, clear of the snout; it is cocked
  // back over the shoulder and chopped down in front, never through the floor
  return {
    ...rig,
    rest: { armF: -50, weapon: 50, armB: -4 },
    windup: { rootX: -4, torso: -8, head: -6, armF: -150, weapon: 120, armB: 4, legF: -6, legB: 6 },
    strike: { rootX: 13, torso: 12, head: 6, armF: -70, weapon: 175, armB: -12, legF: -14, legB: 10 },
  };
}

/** Mimic rigs (mimic-rigs.ts) get the default palette and their phase here. */
const mimic = (id: string, build: (phase: number) => RigDraft) => finish(id, build(phaseOf(id)));

// ── Bosses ───────────────────────────────────────────────────────────────────
interface BossExtras {
  back?: Shape[];
  /** Drawn just before the head: over the body and the wings, under the face (a far horn). */
  underHead?: Shape[];
  front?: Shape[];
  emitters: Emitter[];
  bursts: Partial<Record<'attack' | 'spell' | 'hit' | 'death', Burst[]>>;
  aura?: string;
  flap?: number;
  flapBones?: 'arms' | 'wings';
  hover?: number;
  art?: number;
}
function boss(base: PuppetRig, x: BossExtras): PuppetRig {
  const headAt = base.shapes.findIndex((s) => s.b === 'head');
  const body = x.underHead && headAt >= 0
    ? [...base.shapes.slice(0, headAt), ...x.underHead, ...base.shapes.slice(headAt)]
    : [...(x.underHead ?? []), ...base.shapes];
  return {
    ...base,
    shapes: [...(x.back ?? []), ...body, ...(x.front ?? [])],
    // bosses are meant to be busy: every emitter runs 40% hotter than written
    emitters: x.emitters.map((e) => ({ ...e, rate: e.rate * 1.4 })), bursts: x.bursts, aura: x.aura,
    flap: x.flap ?? base.flap, flapBones: x.flapBones ?? base.flapBones, hover: x.hover ?? base.hover, art: x.art ?? base.art,
  };
}
const card = (bone: BoneId, x: number, y: number): Shape[] => [
  P(bone, 'card', [[x - 3, y - 4.5], [x + 3, y - 4.5], [x + 3, y + 4.5], [x - 3, y + 4.5]]),
  L(bone, 'ink', x - 2, y - 3.5, x + 2, y - 3.5, 0.4), C(bone, 'magic', x, y, 1.1),
];
const candle = (bone: BoneId, x: number, y: number): Shape[] => [
  L(bone, 'bone', x, y, x, y + 8, 2.4), P(bone, 'fire', [[x - 1.3, y], [x, y - 4.2], [x + 1.3, y]]),
];

/** Height of a polyline at x (linear between its vertices, clamped at the ends). */
function heightAt(line: Pt[], x: number): number {
  if (x <= line[0][0]) return line[0][1];
  for (let i = 1; i < line.length; i++) {
    const [x0, y0] = line[i - 1], [x1, y1] = line[i];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return line[line.length - 1][1];
}

/**
 * The Beholder: a heavy chitin-plated orb with a gaping, fanged maw on a hinged
 * jaw, one huge bloodshot eye (slit pupil, darting saccades, a glaring lid under
 * a horned brow) and ten eye stalks. Eight stalks are 3-segment chains and two
 * are 2-segment ones; a wave travels down each of them, out of phase with the
 * others, and turns into a frantic writhing when it attacks.
 */
function beholder(id: string, palette: Record<string, string>): PuppetRig {
  const phase = phaseOf(id);
  const cx = 60, cy = 80, R = 25;
  const polar = (deg: number, r: number): Pt => [round2(cx + r * Math.cos((deg * Math.PI) / 180)), round2(cy + r * Math.sin((deg * Math.PI) / 180))];
  const LONG = [9.5, 8.5, 7.5], SHORT = [9, 8];
  const grow = (bones: PoseBone[], dir: number, curl: number, r = 19) => appendage(bones, polar(dir, r), dir, bones.length === 3 ? LONG : SHORT, curl);
  // stalks sprouting from behind the orb, and two in front rooted on the carapace
  const behind = [
    grow(['chA1', 'chA2', 'chA3'], -168, 14),
    grow(['chB1', 'chB2', 'chB3'], -146, -12),
    grow(['chC1', 'chC2', 'chC3'], -124, 16),
    grow(['chD1', 'chD2', 'chD3'], -62, -14),
    grow(['chE1', 'chE2', 'chE3'], -38, 12),
    grow(['chF1', 'chF2', 'chF3'], -14, -16),
    grow(['armB', 'offhand'], 165, 18),
    grow(['armF', 'weapon'], 10, -18),
  ];
  const inFront = [grow(['wingB', 'wingBArm', 'wingBF1'], -104, -12, 21), grow(['wingF', 'wingFArm', 'wingFF1'], -83, 14, 21)];
  const stalks = [...behind, ...inFront];
  const stalkShapes = (a: Appendage): Shape[] => {
    const long = a.bones.length === 3, r = long ? 3.6 : 3.2, last = a.bones[a.bones.length - 1];
    const tip = a.joints[a.joints.length - 1], prev = a.joints[a.joints.length - 2];
    // each eye looks out along its stalk, leaning towards the hero
    let dx = tip[0] - prev[0], dy = tip[1] - prev[1];
    const l = Math.hypot(dx, dy) || 1;
    dx = dx / l + 0.9; dy /= l;
    const k = Math.hypot(dx, dy) || 1;
    const at = (f: number): [number, number] => [round2(tip[0] + (dx / k) * r * f), round2(tip[1] + (dy / k) * r * f)];
    return [
      ...segments(a, 'flesh', long ? [3.8, 3.1, 2.5] : [3.4, 2.7]),
      C(last, 'sclera', tip[0], tip[1], r), C(last, 'eyeGlow', ...at(0.35), r * 0.5), C(last, 'eye', ...at(0.5), r * 0.22),
    ];
  };
  // carapace: chitin plates along the dome, standing a little proud of the flesh
  const plate = (a0: number, a1: number): Shape =>
    P('torso', 'chitin', [polar(a0, R + 1.5), polar((a0 + a1) / 2, R + 2.6), polar(a1, R + 1.5), polar(a1, 18), polar((a0 + a1) / 2, 18.5), polar(a0, 18)]);
  // the maw: upper lip line, the jaw's lip line and the fangs along them
  const lip: Pt[] = [[36, 94], [48, 97.5], [62, 98.5], [76, 95.5], [88, 89]];
  const jawLip: Pt[] = [[35, 104], [44, 108.5], [58, 110.5], [72, 109], [83, 103], [88, 97]];
  const fang = (b: BoneId, x: number, h: number, up: boolean): Shape => {
    const y0 = heightAt(up ? jawLip : lip, x) + (up ? 0.6 : -0.6), s = up ? -1 : 1, w = h >= 8 ? 2.2 : 1.6, hook = h >= 8 ? 0.9 : 0.3;
    return P(b, 'teeth', [[x - w, y0], [x + w, y0], [round2(x + 0.3 - hook * 0.4), round2(y0 + s * h * 0.62)], [round2(x - hook), round2(y0 + s * h)], [round2(x - w * 0.55 - hook * 0.4), round2(y0 + s * h * 0.5)]]);
  };
  const upper: [number, number][] = [[40, 4.5], [45, 11], [51, 5], [56, 5.5], [61, 8.5], [66, 5], [71, 5], [77, 11], [83, 4.5]];
  const lower: [number, number][] = [[42, 4], [48, 9], [55, 4.5], [62, 5], [68, 9.5], [75, 4.5], [81, 4]];
  // bloodshot veins on the lower half of the eye (the lid hides the top)
  const eye = { x: 70, y: 76, rx: 12.5, ry: 11.5 };
  const vein = (deg: number): Shape => {
    const a = (deg * Math.PI) / 180, b = ((deg + 10) * Math.PI) / 180;
    return L('torso', 'vein', round2(eye.x + 12.1 * Math.cos(a)), round2(eye.y + 11.1 * Math.sin(a)), round2(eye.x + 7.4 * Math.cos(b)), round2(eye.y + 6.8 * Math.sin(b)), 0.55);
  };
  // hash of an integer to 0..1, for the eye's saccade targets
  const pick = (n: number) => { const v = Math.sin(n * 12.9898 + phase) * 43758.5453; return v - Math.floor(v); };
  return finish(id, {
    accent: palette.magic, style: 'magic', focus: [72, 76], focusBone: 'torso', hover: 3.5, art: 1.3,
    palette,
    pivots: {
      torso: [60, 84], head: [70, 130], cape: [55, 70], legF: [33, 104],
      ...appendagePivots(stalks),
    },
    rest: {},
    windup: { rootX: -5, torso: -12 },
    strike: { rootX: 8, torso: 10 },
    animate: (p, t, action) => {
      const { fury, flinch, dead } = actionMoods(action);
      stalks.forEach((a, i) => {
        for (const b of a.bones) p[b] = 0;
        const amps = a.bones.length === 3 ? [8, 11, 14] : [9, 13];
        // slow serpentine wave, each stalk at its own pace and phase…
        writhe(p, a, t, 0.5 + 0.07 * (i % 4), phase + i * 1.9, amps, 0.9, (1 + 0.4 * fury) * (1 - 0.8 * dead));
        // …and a frantic writhing on top of it while it attacks
        writhe(p, a, t, 2.2 + 0.15 * (i % 3), phase * 1.3 + i * 2.6, amps, 1.2, 0.85 * fury);
        // flinch back when hit, droop towards the ground when dying
        const down = Math.cos((a.dir * Math.PI) / 180) >= 0 ? 1 : -1;
        a.bones.forEach((b, k) => { p[b] += -14 * flinch * (k ? 0.6 : 1) + down * 24 * dead; });
      });
      // the great eye darts from one spot to another, and locks on the hero to attack
      const s = t / 0.85, slot = Math.floor(s);
      const from = -3 + 5.5 * pick(slot - 1), to = -3 + 5.5 * pick(slot);
      const look = from + (to - from) * smoothRamp((s - slot) / 0.12);
      p.head = look * (1 - fury) + 2.6 * fury - 3.5 * dead + 1.6 * Math.sin(t * 37) * flinch;
      // heavy upper lid: a glaring squint that opens wide to attack and shuts when it dies
      p.cape = 1.5 + 1.2 * Math.sin(t * 0.9 + phase) - 8 * fury + 9 * flinch + 14 * dead;
      // the jaw chews slowly, gapes on the attack and hangs slack in death
      p.legF = 2 + 1.5 * Math.sin(t * 2.3 + phase) + 13 * fury + 6 * flinch + 16 * dead;
    },
    shapes: [
      ...behind.flatMap(stalkShapes),
      C('torso', 'flesh', cx, cy, R),
      plate(-176, -156), plate(-153, -133), plate(-130, -110), plate(-107, -87), plate(-84, -66),
      // old wounds, one of them stitched shut
      L('torso', 'scar', 39, 70, 46, 88, 2.2), L('torso', 'ink', 40.4, 76.4, 44.4, 75, 0.55), L('torso', 'ink', 42.6, 82.4, 46.6, 81, 0.55),
      L('torso', 'scar', 46, 60, 55, 69, 2), L('torso', 'ink', 48.6, 66.2, 52.2, 62.8, 0.55),
      // the maw: throat, tongue, gums, fangs and the hinged lower jaw
      P('torso', 'socket', [[36, 94], [48, 97.5], [62, 98.5], [76, 95.5], [88, 89], [89.5, 100], [85, 111], [74, 118], [56, 120], [40, 115], [34, 106]]),
      E('legF', 'tongue', 60, 107.5, 10, 3.2),
      L('torso', 'gum', 37, 94.2, 48, 97.6, 2.4), L('torso', 'gum', 48, 97.6, 62, 98.6, 2.4), L('torso', 'gum', 62, 98.6, 87, 89.4, 2.4),
      ...upper.map(([x, h]) => fang('torso', x, h, false)),
      P('legF', 'flesh', [...jawLip, [89, 103], [85, 112], [75, 120], [60, 124], [46, 122], [37, 115], [33, 108]]),
      ...lower.map(([x, h]) => fang('legF', x, h, true)),
      // the great eye
      E('torso', 'sclera', eye.x, eye.y, eye.rx, eye.ry),
      ...[205, 160, 118, 68, 24].map(vein),
      C('head', 'ink', eye.x, eye.y, 6.9), C('head', 'iris', eye.x, eye.y, 6.1),
      P('head', 'pupil', [[70, 70.2], [71.3, 73.5], [71.6, 76], [71.3, 78.5], [70, 81.8], [68.7, 78.5], [68.4, 76], [68.7, 73.5]]),
      C('head', 'glint', 67.4, 73.2, 1.3),
      P('cape', 'flesh', [[54, 70], [56, 64], [62, 59.5], [71, 58.5], [80, 60], [85.5, 64.5], [86.5, 71], [83, 72.8], [76, 71], [68, 70.4], [60, 71]]),
      P('torso', 'chitin', [[55, 69], [58, 62], [65, 57], [75, 55.5], [85, 57.5], [93, 62.5], [90, 66], [83, 63.5], [75, 62.5], [66, 64], [60, 69]]),
      L('torso', 'scar', 80, 55.5, 85.5, 64.5, 1.8),
      // the two front stalks grow out of rings in the carapace
      ...inFront.flatMap((a) => [C('torso', 'chitin', a.joints[0][0], a.joints[0][1], 3.6), ...stalkShapes(a)]),
    ],
  });
}

/** One 'ojo' particle source on each stalk eye of a rig. */
const stalkEyeEmitters = (rig: PuppetRig): Emitter[] => rig.shapes.flatMap((s): Emitter[] =>
  s.t === 'c' && s.k === 'sclera' && s.b !== 'torso' ? [{ bone: s.b, at: [s.x, s.y], effect: 'ojo', rate: 1 }] : []);
const BEHOLDER = beholder('contemplador', {
  flesh: '#56304a', chitin: '#2a1824', scar: '#a8707e', socket: '#12050b', gum: '#5e0e22', tongue: '#8a2238', teeth: '#d8cca4',
  sclera: '#d2c48a', vein: '#e0203c', iris: '#ff3a6e', pupil: '#070205', glint: '#fff6ee', magic: '#ff4ad0', eyeGlow: '#ffb43a',
});
/** Tip of the front-right stalk (spell beam). */
const BEHOLDER_TOP = BEHOLDER.shapes.find((s) => s.b === 'wingFF1' && s.k === 'sclera') as Extract<Shape, { t: 'c' }>;

/**
 * Vol'guth's phylactery: a levitating reliquary of blackened silver held by a
 * skeletal hand, with a glass bulb wrapped in a chain and padlock. Inside, the
 * lich's soul (a crowned spectral skull with two trailing wisps) throbs like a
 * heart. The glass is four shards, one per bone, that meet along jagged seams:
 * a hit pops them apart for a moment, and the death bursts them open like petals
 * while the lid blows off, the urn sinks and the soul rises out and fades.
 * The soul hangs from a pivot far to the left, so its tiny rotations are
 * effectively a vertical translation (the only way a bone can slide).
 */
function phylactery(id: string): PuppetRig {
  const phase = phaseOf(id);
  const bulb = { x: 60, y: 88, rx: 19, ry: 18 };
  const rim = (deg: number): Pt => {
    const a = (deg * Math.PI) / 180;
    return [round2(bulb.x + bulb.rx * Math.cos(a)), round2(bulb.y + bulb.ry * Math.sin(a))];
  };
  // seams radiating from an off-centre crack origin; angles increase clockwise (y down)
  const origin: Pt = [58.5, 85];
  const seams = [200, 285, 375, 480, 560];
  const jags = [1.6, -1.4, 1.2, -1.8, 1.6];
  const shardBones = ['armB', 'armF', 'wingF', 'wingB'] as const;
  /** Two jagged points of the seam at `deg`, from the origin outwards (rim excluded). */
  const seam = (deg: number, jag: number): Pt[] => {
    const [ex, ey] = rim(deg), dx = ex - origin[0], dy = ey - origin[1], len = Math.hypot(dx, dy);
    const nx = -dy / len, ny = dx / len;
    return [
      [round2(origin[0] + dx * 0.36 + nx * jag), round2(origin[1] + dy * 0.36 + ny * jag)],
      [round2(origin[0] + dx * 0.7 - nx * jag * 0.8), round2(origin[1] + dy * 0.7 - ny * jag * 0.8)],
    ];
  };
  const shard = (i: number): Shape => {
    const a0 = seams[i], a1 = seams[i + 1], n = Math.ceil((a1 - a0) / 15) - 1;
    const arc = Array.from({ length: n }, (_, k) => rim(a0 + ((k + 1) * (a1 - a0)) / (n + 1)));
    return P(shardBones[i], 'glass', [origin, ...seam(a0, jags[i]), rim(a0), ...arc, rim(a1), ...seam(a1, jags[i + 1]).reverse()]);
  };
  /** Shard bone covering a point of the bulb (chain links and the padlock break with it). */
  const shardAt = (x: number, y: number): BoneId => {
    let a = (Math.atan2(y - origin[1], x - origin[0]) * 180) / Math.PI;
    while (a < seams[0]) a += 360;
    return shardBones[Math.max(0, seams.findIndex((s, k) => a >= s && a < seams[k + 1]))];
  };
  /** Fine craquelure: one branch from each shard's first seam towards its rim. */
  const branch = (i: number): Shape => {
    const [sx, sy] = seam(seams[i], jags[i])[0], [ex, ey] = rim((seams[i] + seams[i + 1]) / 2);
    return L(shardBones[i], 'ink', sx, sy, round2(sx + (ex - sx) * 0.6), round2(sy + (ey - sy) * 0.55), 0.5);
  };
  // the chain wrapped diagonally across the glass: ring and side-on links alternate
  const [ax, ay] = [43, 94.5], [bx, by] = [77, 88.5];
  const len = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / len, uy = (by - ay) / len;
  const wrap: Shape[] = Array.from({ length: 7 }, (_, k): Shape[] => {
    const cx = ax + (bx - ax) * ((k + 0.5) / 7), cy = ay + (by - ay) * ((k + 0.5) / 7), b = shardAt(cx, cy);
    const seg = (h: number, key: string, w: number) => L(b, key, round2(cx - ux * h), round2(cy - uy * h), round2(cx + ux * h), round2(cy + uy * h), w);
    return k % 2 === 0 ? [seg(2.1, 'iron', 3.2), seg(0.85, 'ink', 0.9)] : [seg(2.4, 'iron', 1.4)];
  }).flat();
  // the padlock hangs from the third link; a broken chain dangles from it
  const lockX = 52.5, lockBone = shardAt(lockX, 96);
  // soul wisps curling up the sides (they trail when the soul moves)
  const tailA: ChainSpec = { slot: 'A', parent: 'head', joints: [[56.5, 98], [53, 100.5], [49.5, 100], [47, 97.5]], freq: 1.6, damping: 0.2, sag: 0.2, sway: 1.6, limit: 70 };
  const tailB: ChainSpec = { slot: 'B', parent: 'head', joints: [[63.5, 98], [67, 100.5], [70.5, 100], [73, 97.5]], freq: 1.8, damping: 0.2, sag: 0.2, sway: 1.4, limit: 70 };
  const hanging: ChainSpec = {
    slot: 'E', parent: lockBone, joints: [[lockX, 100.4], [lockX - 0.3, 104], [lockX - 0.6, 107.6], [lockX - 0.9, 111.2]],
    freq: 2.4, damping: 0.25, sag: 1, sway: 0.8, limit: 60,
  };
  const dangling = (c: ChainSpec): Shape[] => {
    const [b1, b2, b3] = CHAIN_BONES[c.slot], j = c.joints;
    const mid = (k: number): Pt => [round2((j[k][0] + j[k + 1][0]) / 2), round2((j[k][1] + j[k + 1][1]) / 2)];
    const ring = (b: BoneId, [x, y]: Pt): Shape[] => [E(b, 'iron', x, y, 1.4, 2.1), E(b, 'ink', x, y, 0.5, 1.1)];
    return [
      ...ring(b1, mid(0)), L(b2, 'iron', j[1][0], j[1][1] - 0.6, j[2][0], j[2][1] + 0.6, 1.3), ...ring(b3, mid(2)),
      L(b3, 'iron', j[3][0] - 0.2, j[3][1] - 0.4, j[3][0] + 1.4, j[3][1] + 1, 1.1), // the broken, open link
    ];
  };
  /** A bony finger of the hand cradling the bulb: phalanges and knuckles. */
  const finger = (pts: Pt[], widths: number[], claw = false): Shape[] => {
    const [tx, ty] = pts[pts.length - 1], [px, py] = pts[pts.length - 2], d = Math.hypot(tx - px, ty - py), w = widths[widths.length - 1] / 2;
    const fx = (tx - px) / d, fy = (ty - py) / d;
    return [
      ...pts.slice(1).map((q, k) => L('torso', 'bone', pts[k][0], pts[k][1], q[0], q[1], widths[k])),
      ...pts.slice(1, -1).map(([x, y], k) => C('torso', 'bone', x, y, widths[k] * 0.62)),
      // a hooked claw at the fingertip, bent towards the glass
      ...(claw ? [P('torso', 'bone', [[round2(tx - fy * w), round2(ty + fx * w)], [round2(tx + fx * 3.2 + (60 - tx) * 0.08), round2(ty + fy * 3.2)], [round2(tx + fy * w), round2(ty - fx * w)]])] : []),
    ];
  };
  const mirror = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [120 - x, y]);
  const outer: Pt[] = [[50, 108.5], [43.6, 101.6], [41.4, 92.4], [43, 84.6]], inner: Pt[] = [[55, 109], [51.2, 103], [50.2, 96.6]];
  // the soul's far pivot: rotating `head` by liftDeg(dy) slides the soul dy units vertically
  const soulPivot: Pt = [-3000, 84], reach = 60 - soulPivot[0];
  const liftDeg = (dy: number) => (Math.asin(Math.max(-1, Math.min(1, dy / reach))) * 180) / Math.PI;
  /** Lub-dub heartbeat, 0..~1, every 1.35 s. */
  const heartbeat = (t: number) => {
    const c = (((t + phase) / 1.35) % 1 + 1) % 1;
    const thump = (c0: number, w: number) => { const u = (c - c0) / w; return u > 0 && u < 1 ? Math.sin(u * Math.PI) ** 2 : 0; };
    return thump(0, 0.13) + 0.6 * thump(0.19, 0.13);
  };
  return finish(id, {
    accent: '#7affc8', style: 'magic', focus: [60, 83], focusBone: 'head', hover: 2, art: 1.3,
    palette: {
      silver: '#5b6266', iron: '#3c3f44', bone: '#cfc6a8', glass: '#30544a', hollow: '#0d1b17', gold: '#8c7442', socket: '#141010',
      soul: '#2c8a66', greenFire: '#0e3226', magic: '#c2f7dc', eyeGlow: '#f2fff8', glint: '#a9d6c4', gem: '#6dfcc0', sparkle: '#dff5b8',
    },
    pivots: {
      torso: [60, 110], head: soulPivot, cape: [51, 60.5],
      armB: rim(200), armF: rim(375), wingF: rim(100), wingB: rim(125),
    },
    chains: [tailA, tailB, hanging],
    rest: {},
    windup: { torso: -3, torsoY: 1.5 },
    strike: { torso: 2, torsoY: -3 },
    actions: {
      hit: {
        keys: [[0, {}], [0.08, { rootX: -5, torso: -7, torsoY: 1.5 }, EASE.expoOut], [0.3, { rootX: -1, torso: 2.5 }], [0.55, { torso: -0.8 }], [1, {}]],
      },
      death: {
        // shudders under the blow, bursts open and, with no magic left to hold it, sinks to the floor
        keys: [
          [0, {}], [0.05, { rootX: -3, torso: -5 }, EASE.expoOut], [0.1, { rootX: 2.5, torso: 4 }], [0.16, { rootX: -1, torso: -2, torsoY: -2 }],
          [0.42, { rootX: 0, torso: -1, torsoY: 8 }, EASE.easeIn], [0.5, { torso: 0.5, torsoY: 7 }], [1, { torso: 0, torsoY: 8 }],
        ],
      },
    },
    animate: (p, t, action) => {
      const q = action?.p ?? 0, type = action?.type;
      const beat = heartbeat(t) * (1 - 0.6 * actionHold(action));
      // the whole reliquary throbs with the soul's heartbeat
      p.squash += 0.022 * beat;
      let lift = Math.sin(t * 2 * Math.PI * 0.7 + phase) * 1.3 - beat * 1.2, lid = 0, crack = 0;
      if (type === 'spell') {
        // bringing Vol'guth back: the lid swings open and the soul surges up, trembling
        const e = envelope(q, 0.08, 0.38, 0.7, 0.96);
        lid = -65 * e; lift -= 14 * e; crack = e * (1.2 + Math.sin(t * 2 * Math.PI * 13));
      } else if (type === 'hit') {
        const k = envelope(q, 0, 0.06, 0.12, 0.7);
        crack = k * (8 + Math.sin(q * 38) * 1.5); lift += 2.5 * k; lid = -7 * k;
      } else if (type === 'death') {
        const shudder = q < 0.16 ? Math.sin(q * 140) * (q / 0.16) * 2 : 0;
        crack = shudder + 70 * EASE.easeOut(Math.min(1, Math.max(0, (q - 0.15) / 0.35)));
        lid = -80 * EASE.easeOut(Math.min(1, Math.max(0, (q - 0.14) / 0.3)));
        lift -= 60 * smoothRamp((q - 0.16) / 0.6);
      }
      // the soul and the lid own their bones: no generic breathing on them
      p.head = liftDeg(lift);
      p.cape = lid;
      p.armB = -crack; p.armF = crack; p.wingB = -crack * 0.7; p.wingF = crack * 0.7;
      p.weapon = 0; p.offhand = 0;
      // the wisps whip on every beat
      p.chA1 -= beat * 9; p.chB1 += beat * 9;
    },
    shapes: [
      // — the hollow inside, seen only through the opening shards —
      E('torso', 'hollow', bulb.x, bulb.y, bulb.rx - 0.6, bulb.ry - 0.6),
      // — glass shards and their craquelure —
      ...[0, 1, 2, 3].map(shard), ...[0, 1, 2, 3].map(branch),
      // — the soul: halo, wisps, body and the crowned spectral skull —
      E('head', 'greenFire', 60, 88, 11.5, 13.5),
      ...strandShapes(tailA, 'soul', [4.6, 3.2, 1.8, 0.4]), ...strandShapes(tailB, 'soul', [4.6, 3.2, 1.8, 0.4]),
      P('head', 'soul', [[60, 73], [65, 74.6], [68, 79.6], [68.4, 86.6], [66.6, 93], [63.6, 98.6], [60, 101.4], [56.4, 98.6], [53.4, 93], [51.6, 86.6], [52, 79.6], [55, 74.6]]),
      C('head', 'magic', 60, 83, 5), P('head', 'magic', [[56.8, 86], [63.2, 86], [62.3, 90.2], [57.7, 90.2]]),
      P('head', 'sparkle', [[55.6, 79.6], [56, 76.4], [57.7, 78.1], [60, 75.2], [62.3, 78.1], [64, 76.4], [64.4, 79.6]]),
      E('head', 'ink', 57.9, 83.2, 1.75, 1.95), E('head', 'ink', 62.1, 83.2, 1.75, 1.95),
      P('head', 'ink', [[59.3, 86.3], [60.7, 86.3], [60, 85]]), L('head', 'ink', 57.7, 88.4, 62.3, 88.4, 0.5),
      C('head', 'eyeGlow', 58, 83.4, 0.8), C('head', 'eyeGlow', 62, 83.4, 0.8),
      // — glints on the glass (they break with their shard) —
      L(shardAt(46, 80), 'glint', 44.6, 84.6, 49, 76.6, 1.3), C(shardAt(46, 88), 'glint', 44.8, 88.6, 0.7), L(shardAt(75, 84), 'glint', 75.4, 80.6, 76, 86, 0.9),
      // — the chain across the glass and its padlock —
      ...wrap,
      E(lockBone, 'iron', lockX, 94, 1.9, 2), E(lockBone, 'ink', lockX, 94.2, 1, 1.15),
      P(lockBone, 'iron', [[49.7, 95.4], [55.3, 95.4], [55.7, 100.6], [49.3, 100.6]]), C(lockBone, 'gem', lockX, 97.8, 0.75),
      // — the skeletal hand cradling the bulb from below —
      ...finger(outer, [3.2, 2.7, 2.2], true), ...finger(mirror(outer), [3.2, 2.7, 2.2], true),
      ...finger(inner, [3, 2.4]), ...finger(mirror(inner), [3, 2.4]),
      // — the foot: stem, round plinth with a skull and glowing runes —
      P('torso', 'silver', [[53, 105.5], [67, 105.5], [65.4, 111], [54.6, 111]]),
      P('torso', 'silver', [[47, 116.4], [50, 113.2], [55, 111.2], [65, 111.2], [70, 113.2], [73, 116.4], [71, 119.2], [49, 119.2]]),
      P('torso', 'iron', [[48, 118.4], [72, 118.4], [70.6, 121], [49.4, 121]]),
      C('torso', 'bone', 60, 114.6, 3.6), P('torso', 'bone', [[57.6, 116.4], [62.4, 116.4], [61.8, 119.6], [58.2, 119.6]]),
      C('torso', 'socket', 58.6, 114.6, 1.05), C('torso', 'socket', 61.4, 114.6, 1.05), L('torso', 'ink', 58.2, 118.2, 61.8, 118.2, 0.4),
      C('torso', 'magic', 58.6, 114.7, 0.45), C('torso', 'magic', 61.4, 114.7, 0.45),
      L('torso', 'gem', 51.4, 117.4, 52.6, 115, 0.6), L('torso', 'gem', 68.6, 115, 67.4, 117.4, 0.6),
      // — shoulder, neck and lip (the soul slips behind them on its way out) —
      P('torso', 'silver', [[49.4, 74], [52, 70], [68, 70], [70.6, 74], [66, 75.6], [54, 75.6]]),
      P('torso', 'silver', [[53.6, 62], [66.4, 62], [67, 71], [53, 71]]), L('torso', 'ink', 53.4, 66.6, 66.6, 66.6, 0.5),
      L('torso', 'gem', 55.6, 69.6, 56.6, 67.6, 0.6), L('torso', 'gem', 59.5, 67.6, 60.5, 69.6, 0.6), L('torso', 'gem', 63.4, 69.6, 64.4, 67.6, 0.6),
      P('torso', 'silver', [[50.6, 60.2], [69.4, 60.2], [68, 63.6], [52, 63.6]]),
      // — the lid: a dome with a tarnished band and a soul gem held in silver prongs —
      P('cape', 'silver', [[51, 60.6], [69, 60.6], [68, 57], [64.6, 54.2], [60, 53.4], [55.4, 54.2], [52, 57]]),
      P('cape', 'gold', [[51.6, 58], [68.4, 58], [69, 60.6], [51, 60.6]]),
      C('cape', 'gem', 56, 59.3, 0.55), C('cape', 'gem', 64, 59.3, 0.55), L('cape', 'ink', 60, 54, 60, 58, 0.5),
      E('cape', 'silver', 60, 53.6, 3.2, 1.6),
      P('cape', 'gem', [[60, 40], [62.6, 44.4], [60, 49.6], [57.4, 44.4]]),
      L('cape', 'silver', 57.4, 53, 57.6, 45.6, 1.4), L('cape', 'silver', 62.6, 53, 62.4, 45.6, 1.4),
      // — the broken chain dangling from the padlock, in front of everything —
      ...dangling(hanging),
    ],
  });
}
const PHYLACTERY = phylactery('filacteria-volguth');

const BOSSES: Record<string, PuppetRig> = {
  'jefe-ogro': boss(biped('jefe-ogro', {
    build: 'hulking', head: 'ogre', weapon: 'club', cloak: true, loincloth: true, arms: 'skin', hunch: 4,
    palette: { skin: '#76784a', body: '#76784a', legs: '#4a3a28', cloth: '#5a3020', cloak: '#4a3a2a', band: '#a02a1a', eyeGlow: '#ff8a3a', bone: '#d8ccaa' },
  }), {
    art: 1.4,
    front: [
      P('head', 'bone', [[52, 58], [53, 49], [56, 56], [59, 47], [61, 55], [64, 46], [66, 55], [69, 48], [70, 58]]),
      L('head', 'band', 63, 62.5, 70, 63.2, 1.3), L('head', 'band', 62, 66, 68, 66.6, 1.1),
      C('torso', 'bone', 53, 101, 2.6), C('torso', 'bone', 60, 102, 2.8), C('torso', 'bone', 67, 101, 2.5),
      C('torso', 'socket', 53.8, 100.6, 0.8), C('torso', 'socket', 60.9, 101.5, 0.9), C('torso', 'socket', 67.8, 100.6, 0.8),
      P('weapon', 'metal', [[71, 70], [66, 68], [71, 74]]), P('weapon', 'metal', [[80, 70], [85, 67], [80, 74]]), P('weapon', 'metal', [[74, 65], [75.5, 58], [77, 65]]),
    ],
    emitters: [
      { bone: 'root', at: [58, 127], effect: 'polvo', rate: 3, spread: 14 },
      { bone: 'head', at: [61, 50], effect: 'ascua', rate: 2.5, spread: 6 },
      { bone: 'torso', at: [50, 72], effect: 'humo', rate: 1.2, spread: 8 },
    ],
    bursts: {
      attack: [{ bone: 'weapon', at: [75.5, 73], effect: 'impacto', scale: 1.2 }],
      spell: [{ bone: 'head', at: [61, 60], effect: 'furia' }],
      death: [{ bone: 'torso', at: [60, 90], effect: 'muerte', scale: 2 }, { bone: 'torso', at: [60, 90], effect: 'impacto' }],
    },
  }),
  'embaucador-arcano': boss(biped('embaucador-arcano', {
    build: 'thin', head: 'mask', weapon: 'dagger', offhand: 'dagger', cloak: true, belt: true, hunch: 4,
    palette: { mask: '#2a1e3a', body: '#3a2450', legs: '#2a1e3a', arms: '#3a2450', cloak: '#4a1e5a', band: '#c9a040', skin: '#c8b0a0', eyeGlow: '#e8b8ff', magic: '#c98bff', card: '#e8dcc0' },
  }), {
    art: 1.45, flap: 14, flapBones: 'wings', aura: '#9a5ae0',
    back: [...card('wingB', 40, 60), ...card('wingB', 32, 80)],
    front: [
      P('torso', 'band', [[50, 77], [53, 72.5], [56, 77], [59, 71.5], [62, 77], [65, 72.5], [68, 77], [66, 80.5], [52, 80.5]]),
      ...card('wingF', 84, 58), ...card('wingF', 90, 82),
    ],
    emitters: [
      { bone: 'wingB', at: [40, 60], effect: 'arcana', rate: 2.5 },
      { bone: 'wingF', at: [84, 58], effect: 'arcana', rate: 2.5 },
      { bone: 'torso', at: [58, 88], effect: 'arcana', rate: 3, spread: 16 },
    ],
    bursts: {
      attack: [{ bone: 'weapon', at: [68, 88], effect: 'abisal' }],
      spell: [{ bone: 'torso', at: [58, 86], effect: 'abisal', scale: 1.2 }, { bone: 'torso', at: [58, 86], effect: 'arcana', scale: 25 }],
      death: [{ bone: 'torso', at: [58, 88], effect: 'abisal', scale: 2 }, { bone: 'torso', at: [58, 88], effect: 'arcana', scale: 40 }],
    },
  }),
  'senor-cripta': boss(biped('senor-cripta', {
    build: 'normal', head: 'skull', weapon: 'skullStaff', offhand: 'orb', robe: true, cloak: true, arms: 'bone',
    palette: { bone: '#d8d0b8', robe: '#1e2a2e', cloak: '#141e22', body: '#1e2a2e', eyeGlow: '#7affc8', magic: '#7affc8', band: '#2e4a44', gold: '#b9924a' },
  }), {
    art: 1.45, hover: 2.5, aura: '#3ab890',
    back: [P('cape', 'cloak', [[44, 76], [40, 60], [46, 70], [48, 58], [52, 72]])],
    front: [
      P('head', 'gold', [[52, 57], [53, 49], [56, 54], [59, 46], [62, 53], [65, 46], [68, 54], [71, 49], [71, 58]]),
      C('head', 'magic', 61.5, 51.5, 1.3),
      L('torso', 'band', 54, 104, 52, 124, 1.2), L('torso', 'band', 64, 104, 67, 124, 1.2),
    ],
    emitters: [
      { bone: 'torso', at: [58, 122], effect: 'alma', rate: 5, spread: 12 },
      { bone: 'weapon', at: [71, 58], effect: 'alma', rate: 2.5 },
      { bone: 'offhand', at: [49, 95], effect: 'escarcha', rate: 2 },
    ],
    bursts: {
      attack: [{ bone: 'weapon', at: [71, 58], effect: 'condena', scale: 0.8 }],
      spell: [{ bone: 'torso', at: [58, 90], effect: 'luna' }, { bone: 'torso', at: [58, 110], effect: 'alma', scale: 30 }],
      death: [{ bone: 'torso', at: [58, 90], effect: 'muerte', scale: 2 }, { bone: 'torso', at: [58, 100], effect: 'alma', scale: 40 }],
    },
  }),
  // his phylactery takes his place when he falls
  'filacteria-volguth': boss(PHYLACTERY, {
    aura: '#22735a',
    emitters: [
      { bone: 'head', at: [60, 88], effect: 'alma', rate: 2.5, spread: 7 },
      { bone: 'cape', at: [60, 42], effect: 'alma', rate: 1.2, spread: 1.5 },
      { bone: 'torso', at: [60, 119], effect: 'escarcha', rate: 1, spread: 12 },
    ],
    bursts: {
      attack: [{ bone: 'head', at: [60, 84], effect: 'alma', scale: 20 }, { bone: 'head', at: [60, 84], effect: 'condena', scale: 0.6 }],
      spell: [{ bone: 'head', at: [60, 84], effect: 'almaLiberada', scale: 0.8 }, { bone: 'torso', at: [60, 88], effect: 'alma', scale: 30 }],
      hit: [{ bone: 'torso', at: [60, 88], effect: 'cristalRoto', scale: 0.4 }],
      death: [
        { bone: 'torso', at: [60, 88], effect: 'cristalRoto', scale: 1.3 },
        { bone: 'head', at: [60, 84], effect: 'almaLiberada', scale: 1.2 },
        { bone: 'torso', at: [60, 88], effect: 'muerte', scale: 0.8 },
      ],
    },
  }),
  'heraldo-culto': boss(biped('heraldo-culto', {
    build: 'normal', head: 'capirote', weapon: 'dagger', offhand: 'lantern', robe: true, cloak: true,
    palette: { hood: '#2a0a10', robe: '#3a0e14', body: '#3a0e14', cloak: '#24080c', eyeGlow: '#ff4a3a', magic: '#ff5a3a', gold: '#c9a040', bone: '#e8dcc0', fire: '#ffb347' },
  }), {
    art: 1.5, flap: 5, flapBones: 'wings', aura: '#b0201a',
    back: [...candle('wingB', 38, 64), ...candle('wingB', 30, 84)],
    front: [
      P('torso', 'gold', [[57, 78], [61, 78], [62.5, 122], [55.5, 122]]),
      L('torso', 'ink', 58, 86, 60.5, 86, 0.6), L('torso', 'ink', 58.2, 94, 60.8, 96, 0.6), L('torso', 'ink', 58.5, 104, 61, 102, 0.6), L('torso', 'ink', 58.6, 112, 61.2, 114, 0.6),
      ...candle('wingF', 84, 60), ...candle('wingF', 92, 82),
    ],
    emitters: [
      { bone: 'offhand', at: [49, 110], effect: 'humo', rate: 2.5 },
      { bone: 'offhand', at: [49, 108], effect: 'ascua', rate: 2 },
      { bone: 'wingB', at: [38, 60], effect: 'llama', rate: 2 },
      { bone: 'wingF', at: [84, 56], effect: 'llama', rate: 2 },
    ],
    bursts: {
      attack: [{ bone: 'weapon', at: [69, 88], effect: 'sangre' }],
      spell: [{ bone: 'torso', at: [58, 88], effect: 'condena', scale: 1.2 }],
      death: [{ bone: 'torso', at: [58, 90], effect: 'abisal', scale: 1.5 }, { bone: 'torso', at: [58, 90], effect: 'muerte', scale: 1.5 }],
    },
  }),
  'demonio-mayor': boss(biped('demonio-mayor', {
    build: 'hulking', head: 'demon', weapon: 'sword', wings: true, tail: true, arms: 'skin', hunch: 4,
    palette: { skin: '#5a1410', body: '#5a1410', legs: '#3a0c0a', boots: '#1a0605', horn: '#1a1210', wing: '#2a0806', eyeGlow: '#ffb347', fire: '#ff7a1a', lava: '#ff6a1a', metal: '#3a3436' },
  }), {
    art: 1.45, aura: '#ff4a1a',
    // the far horn sits over the wings but under the face
    underHead: [P('head', 'horn', [[54, 58], [40, 48], [33, 33], [44, 43], [56, 54]])],
    front: [
      P('head', 'horn', [[64, 56], [70, 42], [66, 29], [75, 40], [70, 58]]),
      L('torso', 'lava', 52, 82, 58, 94, 1.3), L('torso', 'lava', 66, 82, 62, 92, 1.3), L('torso', 'lava', 56, 96, 64, 98, 1),
      P('armF', 'horn', [[66, 76], [70, 67], [74, 77]]),
      L('weapon', 'fire', 73.5, 96, 73.5, 62, 1.6), P('weapon', 'fire', [[71, 72], [73.5, 56], [76, 72]]),
    ],
    emitters: [
      { bone: 'torso', at: [60, 90], effect: 'ascua', rate: 7, spread: 16 },
      { bone: 'weapon', at: [73.5, 72], effect: 'llama', rate: 6, spread: 6 },
      { bone: 'torso', at: [58, 74], effect: 'humo', rate: 2, spread: 10 },
      { bone: 'wingFF1', at: [56.5, 52], effect: 'ascua', rate: 2 },
    ],
    bursts: {
      attack: [{ bone: 'weapon', at: [73.5, 60], effect: 'aliento', scale: 0.5 }],
      spell: [{ bone: 'head', at: [61, 60], effect: 'furia', scale: 1.5 }],
      death: [{ bone: 'torso', at: [60, 90], effect: 'aliento' }, { bone: 'torso', at: [60, 90], effect: 'muerte', scale: 2 }],
    },
  }),
  ignifax: boss(drake('ignifax', { scale: '#8a1e14', scaleD: '#5e120c', belly: '#c89048', wing: '#3a0806', horn: '#e0cfa0', eyeGlow: '#ffd75a', lava: '#ff7a1a', fire: '#ffb347' }, true, [
    { side: 'B', shoulder: [56, 86], elbow: [45, 70], wrist: [44, 52], tips: [[30, 22], [15, 39], [7, 64]], root: [24, 86], bone: 'scaleD', width: 1.7, sag: 0.2 },
    { side: 'F', shoulder: [62, 86], elbow: [70, 68], wrist: [60, 52], tips: [[64, 20], [82, 30], [96, 50]], root: [80, 86], bone: 'scaleD', width: 1.7, sag: 0.2 },
  ]), {
    art: 1.3, flap: 15, aura: '#ff5a1a',
    front: [
      E('torso', 'lava', 66, 100, 6.5, 4.5),
      L('torso', 'lava', 50, 104, 58, 101, 1), L('torso', 'lava', 58, 106, 64, 103, 0.9), L('torso', 'lava', 70, 102, 74, 105, 0.9),
      P('head', 'horn', [[76, 86], [71, 82], [77, 83]]), P('head', 'horn', [[78, 79], [73, 74], [79, 76]]), P('head', 'horn', [[80, 73], [76, 67], [81, 70]]),
      P('head', 'horn', [[84, 66], [66, 46], [80, 62]]),
      P('head', 'fire', [[90, 77.5], [103, 77.5], [98, 80.5]]),
    ],
    emitters: [
      { bone: 'torso', at: [60, 96], effect: 'ascua', rate: 14, spread: 20 },
      { bone: 'head', at: [104, 70], effect: 'humo', rate: 4 },
      { bone: 'head', at: [97, 79], effect: 'llama', rate: 6, spread: 2 },
      { bone: 'torso', at: [64, 106], effect: 'gota', rate: 3, spread: 8 },
      { bone: 'wingFF1', at: [64, 24], effect: 'ascua', rate: 4, spread: 4 },
      { bone: 'wingBF1', at: [30, 26], effect: 'ascua', rate: 3, spread: 4 },
      { bone: 'torso', at: [66, 100], effect: 'llama', rate: 3, spread: 3 },
    ],
    bursts: {
      attack: [{ bone: 'head', at: [100, 78], effect: 'alientoChorro' }],
      spell: [{ bone: 'head', at: [96, 72], effect: 'furia', scale: 1.5 }, { bone: 'torso', at: [60, 96], effect: 'aliento', scale: 0.4 }],
      hit: [{ bone: 'torso', at: [60, 96], effect: 'ascua', scale: 20 }],
      death: [{ bone: 'torso', at: [60, 96], effect: 'aliento', scale: 1.5 }, { bone: 'torso', at: [60, 96], effect: 'muerte', scale: 2 }, { bone: 'torso', at: [60, 96], effect: 'ascua', scale: 40 }],
    },
  }),
  contemplador: boss(BEHOLDER, {
    aura: '#a0208a',
    emitters: [
      { bone: 'torso', at: [70, 76], effect: 'arcana', rate: 8, spread: 10 },
      { bone: 'torso', at: [60, 82], effect: 'arcana', rate: 4, spread: 28 },
      { bone: 'legF', at: [62, 108], effect: 'vacio', rate: 3, spread: 9 },
      ...stalkEyeEmitters(BEHOLDER),
    ],
    bursts: {
      attack: [{ bone: 'head', at: [70, 76], effect: 'rayo', scale: 1.5 }, { bone: 'head', at: [70, 76], effect: 'abisal' }],
      spell: [{ bone: 'torso', at: [66, 78], effect: 'abisal', scale: 1.3 }, { bone: 'wingFF1', at: [BEHOLDER_TOP.x, BEHOLDER_TOP.y], effect: 'rayo' }],
      death: [{ bone: 'torso', at: [60, 84], effect: 'abisal', scale: 2 }, { bone: 'torso', at: [60, 84], effect: 'muerte', scale: 2 }, { bone: 'torso', at: [60, 84], effect: 'arcana', scale: 40 }],
    },
  }),
};

// ── The Dungeon Master (final joke scene) ────────────────────────────────────
// An illustrated DM screen with a backlit hooded figure behind it: only the hood
// and two steepled hands at the chin show. The fingers hang from the wing-finger
// bones (the DM has no wings), whose chains copy the arm rotations every frame,
// so they follow the hands and can drum on their own.
function dungeonMaster(id: string): PuppetRig {
  const cx = 62;
  const mx = (x: number) => 2 * cx - x; // mirror around the centre line
  // left hand (armB, viewer's left): knuckles and fingertips; the right one mirrors it
  const knuckles: Pt[] = [[59.4, 57.6], [60, 59.6], [60.4, 61.6]];
  const tips: Pt[] = [[62.4, 50.6], [62.7, 53.2], [62.8, 56]];
  const fingerB = ['wingBF1', 'wingBF2', 'wingBF3'] as const;
  const fingerF = ['wingFF1', 'wingFF2', 'wingFF3'] as const;
  const pivots: Partial<Record<BoneId, Pt>> = {
    root: [cx, 128], torso: [cx, 96], head: [cx, 60], cape: [cx, 58],
    armB: [44, 82], armF: [mx(44), 82], wingB: [44, 82], wingF: [mx(44), 82], wingBArm: [44, 82], wingFArm: [mx(44), 82],
  };
  knuckles.forEach((k, i) => { pivots[fingerB[i]] = k; pivots[fingerF[i]] = [mx(k[0]), k[1]]; });
  // steepled fingertips part and meet again, one after another, hand after hand
  const tap = (t: number, i: number, hand: number) => {
    const c = (t * 1.25 + i * 0.09 + hand * 0.5) % 1;
    return c < 0.16 ? Math.sin((c / 0.16) * Math.PI) : 0;
  };
  const board = (pts: Pt[]) => P('root', 'board', pts);
  const parch = (pts: Pt[]) => P('root', 'parch', pts);
  const hinge = (x: number, y: number): Shape[] => [P('root', 'hinge', [[x - 1.7, y - 3], [x + 1.7, y - 3], [x + 1.7, y + 3], [x - 1.7, y + 3]]), C('root', 'ink', x, y, 0.5)];
  const lines = (x0: number, x1: number, y0: number, n: number, dy: number, tilt: number): Shape[] =>
    Array.from({ length: n }, (_, i) => L('root', 'ink', x0, y0 + i * dy, x1 - (i % 3 === 2 ? 5 : 0), y0 + i * dy + tilt, 0.55));
  return finish(id, {
    accent: '#ffb45a', style: 'magic', focus: [66, 60], focusBone: 'armF', art: 1.12,
    palette: {
      robe: '#0b0910', hand: '#1f1828', eyeGlow: '#ff4a3a',
      board: '#6a2a22', parch: '#dccb9e', trim: '#c9a04a', hinge: '#a4a9ae', emblem: '#9a2a22',
      die: '#b3202e', dieLight: '#e2485a', bone: '#e6dcc0', fire: '#ffc46a',
    },
    backlit: ['robe', 'hand'],
    pivots,
    rest: {},
    // the hands part, then one is flung at the hero while the other rises
    windup: { torso: -3, head: -6, armB: -38, armF: 38, wingBF1: -18, wingBF3: 14, wingFF1: 18, wingFF3: -14 },
    strike: { torso: 4, head: 5, armB: -55, armF: 88, wingBF1: -30, wingBF2: -8, wingBF3: 20, wingFF1: 34, wingFF2: 10, wingFF3: -22 },
    animate: (p, t, action) => {
      // the finger chains copy the arms, so the fingers stay on the hands
      p.wingB = p.armB; p.wingF = p.armF; p.wingBArm = 0; p.wingFArm = 0;
      const k = action ? 0.2 : 1;
      fingerB.forEach((b, i) => { p[b] -= 24 * k * tap(t, i, 0); });
      fingerF.forEach((b, i) => { p[b] += 24 * k * tap(t, i, 1); });
      // slow, heavy breathing under the hood
      const breath = Math.sin((t * 2 * Math.PI) / 3.4);
      p.torsoY += breath * 0.9; p.head -= breath * 1.2;
    },
    bursts: {
      attack: [{ bone: 'armF', at: [66, 60], effect: 'divino', scale: 0.8 }, { bone: 'armB', at: [58, 60], effect: 'arcana', scale: 12 }],
      spell: [{ bone: 'armF', at: [66, 60], effect: 'arcana', scale: 14 }, { bone: 'armB', at: [58, 60], effect: 'arcana', scale: 14 }],
      hit: [{ bone: 'root', at: [cx, 96], effect: 'bloqueo', scale: 1.2 }],
    },
    shapes: [
      // — the hooded figure behind the screen (backlit) —
      P('torso', 'robe', [[34, 64], [48, 55], [76, 55], [90, 64], [100, 80], [104, 100], [20, 100], [24, 80]]),
      P('head', 'robe', [[cx, 15], [70, 18.5], [77, 26], [81.5, 37], [82.5, 49], [79, 59], [45, 59], [41.5, 49], [42.5, 37], [47, 26], [54, 18.5]]),
      P('head', 'robe', [[cx, 15], [66, 11], [64, 17]]), // the hood's drooping tip
      E('head', 'eyeGlow', 56.4, 42, 2.5, 1.3), E('head', 'eyeGlow', 67.6, 42, 2.5, 1.3),
      // sleeves, forearms and palms
      L('armB', 'robe', 41, 90, 51, 71, 11), L('armF', 'robe', mx(41), 90, mx(51), 71, 11),
      L('armB', 'hand', 51, 71, 56.5, 63.5, 5.4), L('armF', 'hand', mx(51), 71, mx(56.5), 63.5, 5.4),
      E('armB', 'hand', 58, 60.6, 3.4, 4.6), E('armF', 'hand', mx(58), 60.6, 3.4, 4.6),
      L('armB', 'hand', 57.6, 64.4, 61.2, 62, 2.2), L('armF', 'hand', mx(57.6), 64.4, mx(61.2), 62, 2.2),
      ...knuckles.flatMap(([x, y], i): Shape[] => [
        L(fingerB[i], 'hand', x, y, tips[i][0], tips[i][1], 2.1),
        L(fingerF[i], 'hand', mx(x), y, mx(tips[i][0]), tips[i][1], 2.1),
      ]),
      // — the DM screen (illustrated): three panels, hinges, notes and a d20 —
      board([[6, 85], [38, 78], [38, 128], [8, 126]]),
      board([[38, 78], [86, 78], [86, 128], [38, 128]]),
      board([[86, 78], [118, 85], [116, 126], [86, 128]]),
      parch([[11, 89.5], [34.5, 84], [34.5, 122], [12, 120.5]]),
      parch([[42, 83], [82, 83], [82, 123], [42, 123]]),
      parch([[89.5, 84], [113, 89.5], [112, 120.5], [89.5, 122]]),
      ...lines(14, 32, 94, 7, 3.6, -1.2), ...lines(92, 110, 92.5, 7, 3.6, 1.2),
      P('root', 'emblem', [[92, 113], [98, 113], [98, 118], [92, 118]]), L('root', 'ink', 92, 115.5, 98, 115.5, 0.5),
      C('root', 'emblem', cx, 100, 12), C('root', 'trim', cx, 100, 9.2),
      P('root', 'emblem', [[cx, 91.5], [cx + 7.4, 104.5], [cx - 7.4, 104.5]]),
      L('root', 'ink', cx, 91.5, cx, 104.5, 0.6), L('root', 'ink', cx - 7.4, 104.5, cx, 99.5, 0.6), L('root', 'ink', cx + 7.4, 104.5, cx, 99.5, 0.6),
      L('root', 'trim', 50, 117.5, 74, 117.5, 1.4), L('root', 'trim', 50, 88, 74, 88, 1.4),
      L('root', 'trim', 6, 85, 38, 78, 1.8), L('root', 'trim', 38, 78, 86, 78, 1.8), L('root', 'trim', 86, 78, 118, 85, 1.8),
      ...[[6, 85], [38, 78], [86, 78], [118, 85]].map(([x, y]): Shape => C('root', 'trim', x, y, 1.6)),
      ...hinge(38, 86), ...hinge(38, 119), ...hinge(86, 86), ...hinge(86, 119),
      ...candle('root', 20, 73),
      // the d20 resting on the right panel
      P('root', 'die', [[101, 67], [107.5, 70.8], [107.5, 78.2], [101, 82], [94.5, 78.2], [94.5, 70.8]]),
      P('root', 'dieLight', [[101, 69.6], [105.4, 77.2], [96.6, 77.2]]),
      L('root', 'ink', 101, 69.6, 101, 67, 0.5), L('root', 'ink', 96.6, 77.2, 94.5, 78.2, 0.5), L('root', 'ink', 105.4, 77.2, 107.5, 78.2, 0.5),
      L('root', 'ink', 96.6, 77.2, 101, 82, 0.5), L('root', 'ink', 105.4, 77.2, 101, 82, 0.5),
    ],
  });
}

// ── Enemy catalogue ──────────────────────────────────────────────────────────
const G = { skin: '#6f7d4a', leather: '#56422f', cloth: '#6a3b2a', hair: '#2e2a22', eyeGlow: '#ffd75a', body: '#56422f', legs: '#6f7d4a', boots: '#3e2e20' };
const BONE = { skin: '#cdc3a6', bone: '#cdc3a6', body: '#cdc3a6', legs: '#cdc3a6', boots: '#cdc3a6', arms: '#cdc3a6', eyeGlow: '#9fe8ff', cloth: '#3e4a52', metal: '#7f858a', rust: '#6b4a34' };
const KOBOLD = { skin: '#7a5a3a', body: '#5a3a2a', legs: '#7a5a3a', boots: '#4a3322', horn: '#d8c7a0', eyeGlow: '#ffb347' };
/** Skeletal adventurers (La Cripta): bones plus the tattered gear of their class. */
const ADV = { ...BONE, mail: '#6a7076', leather: '#4a3a2c', hide: '#d8c8a0', heraldry: '#e8e0cc', plume: '#b02a2a', fur: '#6a5040', gold: '#c9a040', edge: '#e8e0c8' };
const adventurer = (id: string, o: Omit<BipedOpts, 'head' | 'build' | 'palette'> & { gear: SkullGear; palette: Record<string, string>; build?: Build }) =>
  biped(id, { build: 'thin', head: 'skull', arms: 'bone', legs: 'bone', ribs: true, ...o, headOpts: { gear: o.gear }, palette: { ...ADV, ...o.palette } });

export const ENEMY_RIGS: Record<string, PuppetRig> = {
  // Act I · Asentamiento Ogro
  'goblin-cortador': biped('goblin-cortador', { build: 'small', head: 'goblin', weapon: 'cleaver', palette: G, arms: 'skin', belt: true, loincloth: true, hunch: 6 }),
  'goblin-arquero': biped('goblin-arquero', { build: 'small', head: 'goblin', weapon: 'bow', palette: { ...G, skin: '#66744a', body: '#4a5236', legs: '#66744a' }, arms: 'skin', belt: true, quiver: true, hunch: 4 }),
  'goblin-chaman': biped('goblin-chaman', { build: 'small', head: 'goblin', headOpts: { scar: true }, weapon: 'skullStaff', palette: { ...G, robe: '#4a3a30', magic: '#9dff6a', eyeGlow: '#9dff6a', band: '#8a3a2a' }, arms: 'skin', robe: true, hunch: 8 }),
  worg: canine('worg', { palette: { fur: '#3e3a36', furD: '#2c2926', mane: '#2a2724', belly: '#6a625a', eyeGlow: '#ff5a3a' }, scars: true, art: 1.12 }),
  hobgoblin: biped('hobgoblin', { build: 'normal', head: 'orc', headOpts: { scar: true }, weapon: 'sword', offhand: 'shield', palette: { skin: '#9a5a3a', body: '#6a2a22', armor: '#6c7074', legs: '#3e3230', cloak: '#5a1e1a', eyeGlow: '#ffb347' }, armor: true, belt: true, cloak: true }),
  'ogro-joven': biped('ogro-joven', { build: 'hulking', head: 'ogre', weapon: 'club', palette: { skin: '#8a8a5a', body: '#8a8a5a', legs: '#5a4630', cloth: '#5a4630', eyeGlow: '#ffd75a' }, arms: 'skin', loincloth: true, hunch: 6 }),
  'goblin-famelico': biped('goblin-famelico', { build: 'small', head: 'goblin', weapon: 'claws', palette: { ...G, skin: '#7d8660', body: '#7d8660', legs: '#7d8660', cloth: '#4a3a30' }, arms: 'skin', ribs: true, loincloth: true, hunch: 12, art: 1.15 }),
  // Act I · Guarida de los Contrabandistas
  'ladron-furtivo': biped('ladron-furtivo', { build: 'normal', head: 'hood', weapon: 'dagger', offhand: 'dagger', palette: { hood: '#2e3a3a', body: '#3a322a', legs: '#2e2822', cloak: '#26302e', eyeGlow: '#e8e0a0' }, cloak: true, belt: true, hunch: 8 }),
  'bandido-ballestero': biped('bandido-ballestero', { build: 'normal', head: 'human', headOpts: { bandana: true, beard: true }, weapon: 'crossbow', palette: { skin: '#b08466', body: '#5a4632', legs: '#3e3228', band: '#7a2a22', hair: '#3a2a1e' }, belt: true, quiver: true }),
  maton: biped('maton', { build: 'hulking', head: 'human', headOpts: { bald: true, scar: true }, weapon: 'fists', palette: { skin: '#b08466', body: '#4a3a2e', legs: '#3a3028' }, arms: 'skin', belt: true }),
  'ninja-sombras': biped('ninja-sombras', { build: 'thin', head: 'mask', weapon: 'katana', palette: { skin: '#b08466', mask: '#1e2226', body: '#22262a', legs: '#1e2226', arms: '#22262a', band: '#3a4a5a', eyeGlow: '#bfe9ff' }, belt: true, hunch: 6, art: 1.3 }),
  'picaro-envenenador': biped('picaro-envenenador', { build: 'normal', head: 'hood', weapon: 'poisonDagger', offhand: 'vial', palette: { hood: '#34402a', body: '#3a3a2a', legs: '#2e2a22', cloak: '#2a3322', eyeGlow: '#8fe36a' }, cloak: true, belt: true, hunch: 6 }),
  'sabueso-contrabando': canine('sabueso-contrabando', { palette: { fur: '#6a4a32', furD: '#4a3322', mane: '#5a3e2a', belly: '#9a7a5a', eyeGlow: '#ffd75a' }, collar: true, art: 1 }),
  'capitan-bandido': biped('capitan-bandido', { build: 'normal', head: 'human', headOpts: { hat: true, beard: true, scar: true }, weapon: 'sword', palette: { skin: '#b08466', body: '#5a1e1a', legs: '#2e2822', cloak: '#3a1a18', hat: '#2a2220', hair: '#2a2018' }, cloak: true, belt: true, armor: false }),
  'maestro-ninja': biped('maestro-ninja', { build: 'thin', head: 'mask', weapon: 'katana', offhand: 'dagger', palette: { skin: '#b08466', mask: '#1a1c20', body: '#1e2024', legs: '#1a1c20', arms: '#1e2024', band: '#8a1e1a', cloak: '#5a1414', eyeGlow: '#ff8a6a' }, cloak: true, belt: true, hunch: 4, art: 1.35 }),
  'imagen-ilusoria': biped('imagen-ilusoria', { build: 'normal', head: 'hood', weapon: 'orb', palette: { hood: '#5a4a8a', body: '#4a3e7a', legs: '#3e3468', robe: '#4a3e7a', magic: '#d9b8ff', eyeGlow: '#e8d8ff' }, robe: true }),
  // Act II · La Cripta
  'esqueleto-guerrero': biped('esqueleto-guerrero', { build: 'thin', head: 'skull', headOpts: { hat: true }, weapon: 'sword', offhand: 'shield', palette: { ...BONE, cloak: '#3e4a52' }, arms: 'bone', legs: 'bone', ribs: true, cloak: true, belt: true }),
  'esqueleto-arquero': biped('esqueleto-arquero', { build: 'thin', head: 'skull', weapon: 'bow', palette: { ...BONE, cloak: '#3a3a3e' }, arms: 'bone', legs: 'bone', ribs: true, quiver: true }),
  zombi: biped('zombi', { build: 'normal', head: 'zombie', weapon: 'claws', palette: { skin: '#7a8a6a', body: '#4a4238', legs: '#3a342e', hair: '#2a2620', eyeGlow: '#c8f07a' }, arms: 'skin', belt: true, hunch: 14 }),
  espectro: spectre('espectro', { robe: '#5a6a78', cloak: '#3a4652', hood: '#4a5866', bone: '#b8c4cc', eyeGlow: '#bfe9ff' }),
  necrofago: biped('necrofago', { build: 'thin', head: 'ghoul', weapon: 'claws', palette: { skin: '#8a8a7a', body: '#8a8a7a', legs: '#8a8a7a', cloth: '#3a3430', eyeGlow: '#ff6a5a' }, arms: 'skin', ribs: true, loincloth: true, hunch: 16, art: 1.3 }),
  'caballero-tumbario': biped('caballero-tumbario', { build: 'normal', head: 'helm', weapon: 'sword', offhand: 'kite', palette: { metal: '#5f656a', armor: '#5f656a', body: '#3a3e44', legs: '#4a4e54', arms: '#4a4e54', boots: '#3a3e44', cloak: '#2e2a3a', cloth: '#4a2a3a', band: '#4a2a3a', eyeGlow: '#9fe8ff' }, armor: true, cloak: true, belt: true }),
  'momia-real': biped('momia-real', { build: 'normal', head: 'mummy', headOpts: { crown: true }, weapon: 'claws', palette: { cloth: '#b8a888', skin: '#b8a888', body: '#b8a888', legs: '#b8a888', boots: '#8a7a60', gold: '#c9a040', magic: '#5ae0c8', eyeGlow: '#5ae0c8', belt: '#c9a040' }, arms: 'skin', belt: true, ribs: true, hunch: 6 }),
  // Act II · Templo Oscuro
  'acolito-velado': biped('acolito-velado', { build: 'normal', head: 'hood', weapon: 'dagger', offhand: 'book', palette: { hood: '#3a2230', robe: '#3a2230', body: '#3a2230', eyeGlow: '#ff6a8a', magic: '#ff6a8a' }, robe: true, hunch: 6 }),
  'lanzador-vacio': biped('lanzador-vacio', { build: 'normal', head: 'hood', weapon: 'orb', offhand: 'orb', palette: { hood: '#241a3a', robe: '#241a3a', body: '#241a3a', eyeGlow: '#b98bff', magic: '#b98bff' }, robe: true }),
  diablillo: biped('diablillo', { build: 'small', head: 'imp', weapon: 'claws', palette: { skin: '#8a3a2a', body: '#8a3a2a', legs: '#8a3a2a', boots: '#5a221a', horn: '#2a1e1a', wing: '#4a1a18', eyeGlow: '#ffd75a' }, arms: 'skin', wings: true, tail: true, hunch: 6, art: 1.1 }),
  'sabueso-infernal': canine('sabueso-infernal', { palette: { fur: '#2a2220', furD: '#1e1816', mane: '#2a2220', belly: '#4a3a32', fire: '#ff7a2a', eyeGlow: '#ffb347' }, flames: true, scars: true, art: 1.12 }),
  poseido: biped('poseido', { build: 'normal', head: 'human', headOpts: { scar: true }, weapon: 'claws', palette: { skin: '#9a8a7a', body: '#4a3e36', legs: '#3a322c', hair: '#2a2622', eye: '#ff5a8a' }, arms: 'skin', belt: true, hunch: 16 }),
  flagelante: biped('flagelante', { build: 'normal', head: 'human', headOpts: { bald: true, scar: true }, weapon: 'flail', palette: { skin: '#a88466', body: '#a88466', legs: '#3a2a26', cloth: '#5a1e1a' }, arms: 'skin', ribs: true, loincloth: true, hunch: 8 }),
  'demonio-menor': biped('demonio-menor', { build: 'hulking', head: 'demon', weapon: 'claws', palette: { skin: '#7a2a22', body: '#7a2a22', legs: '#5a1e1a', boots: '#2a1210', horn: '#2a1e1a', wing: '#3a1412', eyeGlow: '#ffb347' }, arms: 'skin', wings: true, tail: true, hunch: 6 }),
  'inquisidor-oscuro': biped('inquisidor-oscuro', { build: 'normal', head: 'capirote', weapon: 'sword', offhand: 'lantern', palette: { hood: '#1e1a1e', body: '#2a2226', armor: '#4a4448', legs: '#1e1a1e', cloak: '#3a1418', magic: '#ffd07a', eyeGlow: '#ffd07a' }, armor: true, cloak: true, belt: true }),
  // Act II · Templo Oscuro: incubus and succubus (elegant, menacing seducers)
  incubo: biped('incubo', {
    build: 'normal', head: 'fiend', headOpts: { beard: true }, weapon: 'claws', wings: true, tail: true, cloak: true, belt: true,
    palette: { skin: '#8a5a7a', hair: '#1a1020', horn: '#2a1a24', body: '#2a1a2e', legs: '#1e1424', boots: '#140c14', cloak: '#3a0e2a', wing: '#3a1030', belt: '#3a2a30', teeth: '#e8dcc8', gold: '#c9a040', magic: '#e070ff', eyeGlow: '#e070ff' },
    torsoDetail: [L('torso', 'gold', 52, 78, 59, 88, 0.9), L('torso', 'gold', 66, 78, 59, 88, 0.9), C('torso', 'magic', 59, 88.5, 1.3)],
  }),
  sucubo: biped('sucubo', {
    build: 'thin', head: 'fiend', headOpts: { longHair: true }, weapon: 'talons', wings: true, tail: true, robe: true, arms: 'skin',
    palette: { skin: '#b07a94', hair: '#2a0e1e', horn: '#1e1218', robe: '#3a0e24', body: '#3a0e24', boots: '#1a0610', wing: '#4a1030', teeth: '#f0e4d8', gold: '#c9a040', magic: '#ff6ab0', eyeGlow: '#ff6ab0' },
    torsoDetail: [L('torso', 'gold', 53.5, 79, 65, 79, 0.8), C('torso', 'magic', 59.5, 81, 1.2), L('torso', 'gold', 52, 97, 66, 95, 1.2)],
  }),
  // Act I · Asentamiento Ogro: the goblin horde (raiders and war-criers)
  'goblin-saqueador': biped('goblin-saqueador', {
    build: 'small', head: 'goblin', headOpts: { scar: true }, weapon: 'hatchet', offhand: 'dagger', arms: 'skin', tabard: 'cloth', belt: true, hunch: 10,
    palette: { ...G, skin: '#6a7a46', legs: '#6a7a46', cloth: '#5a3a26', rust: '#7a4a2a', eyeGlow: '#ff8a3a' },
  }),
  'goblin-jaleador': biped('goblin-jaleador', {
    build: 'small', head: 'goblin', headOpts: { feathers: true }, weapon: 'totem', offhand: 'drum', arms: 'skin', belt: true, loincloth: true, hunch: 3,
    palette: { ...G, skin: '#74804e', legs: '#74804e', body: '#4a3a2a', plume: '#c84a2a', band: '#d8c060', hide: '#d8c8a0', bone: '#d8ccaa', eyeGlow: '#ffd75a' },
    torsoDetail: [C('torso', 'bone', 55, 80.5, 1.2), C('torso', 'bone', 58.5, 82, 1.2), C('torso', 'bone', 62, 81, 1.2)],
  }),
  // Act I · Guarida de los Contrabandistas: the rat swarm and its queen
  'rata-alcantarilla': rodent('rata-alcantarilla', { palette: {} }),
  'rata-gigante': rodent('rata-gigante', { giant: true, art: 1.45, palette: { fur: '#4a423c', furD: '#302a26', mane: '#2a2420', belly: '#6a6056', eyeGlow: '#d8ff4a' } }),
  // Act II · La Cripta: skeletons of fallen adventurers, one per class
  'aventurero-guerrero': adventurer('aventurero-guerrero', { gear: 'nasal', weapon: 'sword', offhand: 'shield', tabard: 'mail', belt: true, palette: { eyeGlow: '#ff9a4a' } }),
  'aventurero-mago': adventurer('aventurero-mago', { gear: 'wizard', weapon: 'staff', robe: true, palette: { hat: '#2a3a6a', robe: '#2a3460', band: '#c9a040', magic: '#7ac8ff', eyeGlow: '#7ac8ff' } }),
  'aventurero-clerigo': adventurer('aventurero-clerigo', { gear: 'mitre', weapon: 'mace', offhand: 'holySymbol', tabard: 'heraldry', sigil: 'gold', belt: true, palette: { hat: '#d8cfb8', gold: '#d9b04a', magic: '#ffd36a', eyeGlow: '#ffc94a' } }),
  'aventurero-picaro': adventurer('aventurero-picaro', { gear: 'hoodMask', weapon: 'dagger', offhand: 'dagger', tabard: 'leather', cloak: true, belt: true, hunch: 8, palette: { hood: '#2e2a28', band: '#3a3330', cloak: '#24221f', eyeGlow: '#d8e0e8' } }),
  'aventurero-barbaro': adventurer('aventurero-barbaro', { build: 'normal', gear: 'horned', weapon: 'greataxe', cloak: true, loincloth: true, hunch: 6, palette: { cloth: '#5a4232', cloak: '#5a4232', horn: '#d8c7a0', eyeGlow: '#ff4a3a' } }),
  'aventurero-paladin': adventurer('aventurero-paladin', { gear: 'winged', weapon: 'warhammer', offhand: 'heater', armor: true, cloak: true, belt: true, palette: { armor: '#8a8e94', metal: '#8a8e94', gold: '#d9b04a', cloak: '#22305a', heraldry: '#2e4a8a', magic: '#ffe9a8', eyeGlow: '#ffe9a8' } }),
  'aventurero-explorador': adventurer('aventurero-explorador', { gear: 'hood', weapon: 'bow', quiver: true, cloak: true, tabard: 'leather', belt: true, palette: { hood: '#2e4a2a', cloak: '#2a3e26', band: '#5a7a3a', eyeGlow: '#9dff7a' } }),
  'aventurero-brujo': adventurer('aventurero-brujo', { gear: 'cowl', weapon: 'orb', offhand: 'book', robe: true, palette: { hood: '#241a34', robe: '#241a34', horn: '#3a3040', leather: '#3a2230', gold: '#8a6a9a', magic: '#c77dff', eyeGlow: '#c77dff' } }),
  'aventurero-bardo': adventurer('aventurero-bardo', { gear: 'plume', weapon: 'rapier', offhand: 'lute', tabard: 'doublet', cloak: true, belt: true, palette: { hat: '#4a2030', plume: '#e04a4a', band: '#c9a040', doublet: '#6a1e3a', cloak: '#6a1e3a', wood: '#8a5a30', eyeGlow: '#ff8ad8' } }),
  // Act III · Guarida del Dragón
  'kobold-lancero': biped('kobold-lancero', { build: 'small', head: 'kobold', weapon: 'spear', offhand: 'kite', palette: { ...KOBOLD }, arms: 'skin', belt: true, loincloth: true, tail: true, hunch: 6, art: 1.2 }),
  'kobold-hechicero': biped('kobold-hechicero', { build: 'small', head: 'kobold', weapon: 'staff', palette: { ...KOBOLD, robe: '#6a2a1e', magic: '#ff9a3a', eyeGlow: '#ffb347' }, arms: 'skin', robe: true, tail: true, hunch: 6, art: 1.2 }),
  'cultista-dragon': biped('cultista-dragon', { build: 'normal', head: 'hood', weapon: 'sword', palette: { hood: '#5a1a14', robe: '#5a1a14', body: '#5a1a14', eyeGlow: '#ff9a3a', gold: '#c9a040' }, robe: true, belt: true }),
  'draco-joven': drake('draco-joven', { eyeGlow: '#ffcf5a' }, false),
  'elemental-magma': biped('elemental-magma', { build: 'hulking', head: 'rock', weapon: 'fists', palette: { skin: '#3e3632', body: '#3e3632', legs: '#3e3632', boots: '#2a2422', metal: '#ff8a3a', rock: '#3e3632', eyeGlow: '#ffb347' }, arms: 'skin', ribs: false }),
  'draco-veterano': drake('draco-veterano', { scale: '#5a1e1a', scaleD: '#401412', belly: '#9a6e40', wing: '#2a0e0c', eyeGlow: '#ff9a3a' }, true),
  'sumo-cultista': biped('sumo-cultista', { build: 'normal', head: 'hood', headOpts: { hornCrown: true }, weapon: 'dragonStaff', palette: { hood: '#6a1a14', robe: '#6a1a14', body: '#6a1a14', eyeGlow: '#ff9a3a', magic: '#ff7a2a', gold: '#c9a040' }, robe: true }),
  // Act III · Laberinto del Contemplador
  azotamentes: biped('azotamentes', { build: 'thin', head: 'tentacle', weapon: 'orb', palette: { skin: '#7a5a7a', robe: '#2e2238', body: '#2e2238', magic: '#e7a8ff', eyeGlow: '#f2e8ff' }, robe: true, arms: 'skin', art: 1.35 }),
  'lacayo-engendrado': biped('lacayo-engendrado', { build: 'normal', head: 'zombie', weapon: 'claws', palette: { skin: '#8a7a8a', body: '#3a3440', legs: '#2e2a34', hair: '#2a2430', eyeGlow: '#e7a8ff' }, arms: 'skin', belt: true, hunch: 12 }),
  'cubo-gelatinoso': cube('cubo-gelatinoso', { slime: '#6f9a5a', belly: '#9fc488', eyeGlow: '#c8f07a' }),
  'reptador-carronero': crawler('reptador-carronero', { scale: '#6a7a4a', scaleD: '#4a5634', flesh: '#b87a8a', horn: '#c8c098', eyeGlow: '#e8e070' }),
  'ojo-flotante': floatingEye('ojo-flotante', { flesh: '#8a5a6a', magic: '#d98bff', eyeGlow: '#ffd75a' }, 3),
  'horror-tentacular': horror('horror-tentacular', { flesh: '#5a6a5a', eyeGlow: '#e8e070' }),
  'azotamentes-anciano': biped('azotamentes-anciano', { build: 'normal', head: 'tentacle', weapon: 'staff', palette: { skin: '#8a5a8a', robe: '#3a1e44', body: '#3a1e44', magic: '#e7a8ff', eyeGlow: '#f2e8ff', gold: '#c9a040' }, robe: true, arms: 'skin', cloak: true }),
  'cerebro-anciano': brain('cerebro-anciano', {
    flesh: '#8a6a74', fold: '#b39496', fleshD: '#5c3a4a', tentacle: '#5a3b54', sucker: '#cdb8a0', socket: '#16060e',
    magic: '#c77dff', eyeGlow: '#d4ff5a', teeth: '#d6cba8',
  }),
  observador: floatingEye('observador', { flesh: '#7a4a5a', magic: '#ff9ad0', eyeGlow: '#ffd75a' }, 2),
  // Act III · Guarida del Dragón: the dragonborn guards and the fire elemental bound to them
  'guardia-draconido': dragonbornGuard('guardia-draconido', {
    skin: '#a04a2a', horn: '#e0cfa0', teeth: '#ece0c4', armor: '#9a7038', metal: '#a3a7ab', edge: '#dadde0', wood: '#5a4030',
    band: '#8a1e14', gold: '#d4a84a', body: '#5a1e16', legs: '#6a5032', boots: '#2e241c', cloak: '#6a1a12', belt: '#4a3020', eyeGlow: '#ffb347',
  }),
  'elemental-fuego': fireElemental('elemental-fuego', {
    flameD: '#a8321a', fire: '#ff7a1e', flame: '#ffc23a', flameCore: '#fff3c0', magic: '#ffd27a', socket: '#3a0c06', eyeGlow: '#fff1a8',
  }),
  // Act III · Laberinto del Contemplador: mimics disguised as a chest, a chair and a door
  'mimico-cofre': mimic('mimico-cofre', mimicChest),
  'mimico-silla': mimic('mimico-silla', mimicChair),
  'mimico-puerta': mimic('mimico-puerta', mimicDoor),
  ...BOSSES,
  // final scene
  'dungeon-master': dungeonMaster('dungeon-master'),
};

// ── Invocations (druid spirits and warlock pacts) ────────────────────────────
export const INVOCATION_RIGS: Record<string, PuppetRig> = {
  lobo: canine('inv-lobo', { palette: { fur: '#6e6a62', furD: '#4f4b45', mane: '#5a564f', belly: '#a39c8e', eyeGlow: '#b6ff7a' }, art: 0.95 }),
  oso: bear('inv-oso', { fur: '#5a4230', furD: '#3e2e20', mane: '#4a3626', belly: '#8a6e50', eyeGlow: '#b6ff7a' }),
  fuego: elemental('inv-fuego', 'fire', { fire: '#ff8a3a', eyeGlow: '#fff2c0' }),
  agua: elemental('inv-agua', 'water', { water: '#4a7aa0', belly: '#9ac8e8', eyeGlow: '#d8f4ff' }),
  aire: elemental('inv-aire', 'wind', { wind: '#9fb4c7', eyeGlow: '#ffffff' }),
  arbol: biped('inv-arbol', { build: 'hulking', head: 'bark', weapon: 'fists', palette: { skin: '#5a4632', body: '#5a4632', legs: '#4a3a28', boots: '#3a2e20', metal: '#4a3a28', leaf: '#5f7a3a', eyeGlow: '#b6ff7a' }, arms: 'skin' }),
  tierra: biped('inv-tierra', { build: 'hulking', head: 'rock', weapon: 'fists', palette: { skin: '#6a6258', body: '#6a6258', legs: '#5a5248', boots: '#4a443c', rock: '#6a6258', lava: '#c8a060', metal: '#5a5248', eyeGlow: '#e8d890' }, arms: 'skin' }),
  sabueso: canine('inv-sabueso', { palette: { fur: '#2e2238', furD: '#1e1628', mane: '#3a2a48', belly: '#4a3a58', fire: '#b98bff', eyeGlow: '#e0b8ff' }, flames: true, art: 1 }),
  demonio: biped('inv-demonio', { build: 'hulking', head: 'demon', weapon: 'claws', palette: { skin: '#5a1e3a', body: '#5a1e3a', legs: '#401428', boots: '#2a0e1a', horn: '#1e141a', wing: '#2a0e1e', eyeGlow: '#ffb8e0' }, arms: 'skin', wings: true, tail: true }),
};
