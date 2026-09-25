// Illustrated puppets for normal/elite enemies and invocations. Rigs are built
// from parametric archetypes (biped, quadruped, floating, blob) so the whole
// bestiary shares proportions, pivots and animations; each enemy only picks its
// build, head, weapon, clothing and palette. Bosses are not covered yet.

import { C, E, P, L, type BoneId, type PartialPose, type PuppetRig, type Shape } from './puppet.ts';

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
  | 'imp' | 'demon' | 'tentacle' | 'mummy' | 'helm' | 'rock' | 'capirote' | 'bark';

interface HeadOpts { beard?: boolean; bandana?: boolean; hat?: boolean; bald?: boolean; crown?: boolean; hornCrown?: boolean; scar?: boolean }

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
    case 'skull':
      return [
        hC('bone', 0, 0, 10),
        hP('bone', [[-6, 6], [8, 4], [9, 12], [-2, 14], [-6, 10]]),
        hC('socket', 4, 0, 3), hP('socket', [[8, 3], [10.5, 6.5], [7, 6.5]]),
        hL('ink', -1, 8.2, 8.5, 7, 0.7), hL('ink', 1, 6.5, 1, 9.5, 0.6), hL('ink', 4, 6, 4, 9, 0.6), hL('ink', 6.5, 5.6, 6.5, 8.4, 0.6),
        hL('ink', -5, -7, -1, -1.5, 0.7),
        ...(o.hat ? [hP('metal', [[-11, -1], [-8, -11], [0, -14], [8, -12], [11, -6], [0, -7], [-10, 1]]), hL('ink', -10, -1, 11, -6, 0.9)] : []),
        hC('eyeGlow', 4.5, 0, 1.3),
      ];
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
  }
}

// ── Weapons and off-hand items (relative to the hand, bind pose pointing up) ──
export type WeaponType =
  | 'cleaver' | 'sword' | 'katana' | 'axe' | 'club' | 'flail' | 'spear' | 'dagger' | 'poisonDagger'
  | 'staff' | 'skullStaff' | 'dragonStaff' | 'bow' | 'crossbow' | 'orb' | 'claws' | 'fists';
type OffhandType = 'shield' | 'kite' | 'dagger' | 'book' | 'lantern' | 'orb' | 'vial' | 'none';

type Grip = 'swing' | 'thrust' | 'cast' | 'castHand' | 'shoot' | 'crossbow';
const GRIP: Record<WeaponType, Grip> = {
  cleaver: 'swing', sword: 'swing', katana: 'swing', axe: 'swing', club: 'swing', flail: 'swing', claws: 'swing', fists: 'swing',
  spear: 'thrust', dagger: 'thrust', poisonDagger: 'thrust',
  staff: 'cast', skullStaff: 'cast', dragonStaff: 'cast', orb: 'castHand', bow: 'shoot', crossbow: 'crossbow',
};

function weapon(type: WeaponType, [hx, hy]: Pt): { shapes: Shape[]; focus: Pt } {
  const W = (k: string, x1: number, y1: number, x2: number, y2: number, w: number) => L('weapon', k, hx + x1, hy + y1, hx + x2, hy + y2, w);
  const WP = (k: string, pts: Pt[]) => P('weapon', k, pts.map(([x, y]) => [hx + x, hy + y] as Pt));
  const WC = (k: string, x: number, y: number, r: number) => C('weapon', k, hx + x, hy + y, r);
  const WE = (k: string, x: number, y: number, rx: number, ry: number) => E('weapon', k, hx + x, hy + y, rx, ry);
  switch (type) {
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
  }
}

function offhand(type: OffhandType, [bx, by]: Pt): Shape[] {
  const O = (k: string, x1: number, y1: number, x2: number, y2: number, w: number) => L('offhand', k, bx + x1, by + y1, bx + x2, by + y2, w);
  const OP = (k: string, pts: Pt[]) => P('offhand', k, pts.map(([x, y]) => [bx + x, by + y] as Pt));
  const OC = (k: string, x: number, y: number, r: number) => C('offhand', k, bx + x, by + y, r);
  const OE = (k: string, x: number, y: number, rx: number, ry: number) => E('offhand', k, bx + x, by + y, rx, ry);
  switch (type) {
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
  if (o.wings) {
    shapes.push(P('wingB', 'wing', [[56, 84], [44, 66], [36, 56], [36, 68], [28, 66], [32, 78], [26, 80], [40, 90]]));
    shapes.push(L('wingB', 'skin', 56, 84, 36, 57, 1.2), L('wingB', 'skin', 56, 84, 29, 67, 1));
  }
  // back arm + off-hand
  shapes.push(L('armB', armKey, shB[0], shB[1], shB[0] - 3, shB[1] + 11, b.aw), L('armB', armKey, shB[0] - 3, shB[1] + 11, handB[0], handB[1], b.aw * 0.9));
  shapes.push(...offhand(o.offhand ?? 'none', handB));
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
  if (o.belt || o.loincloth) shapes.push(L('torso', 'belt', 58 - b.ww, 98, 58 + b.ww, 97.5, 3), C('torso', 'metal', 60, 97.7, 1.5));
  if (o.loincloth) shapes.push(P('torso', 'cloth', [[56, 99], [66, 98.5], [65, 112], [62, 108], [59, 113]]));
  // head
  shapes.push(...head(o.head, hc, b.hr / 10, o.headOpts));
  // front arm, weapon, hand
  if (o.armor) shapes.push(E('armF', 'armor', shF[0], shF[1] + 1, b.aw * 0.95, b.aw * 0.8));
  shapes.push(L('armF', armKey, shF[0], shF[1], shF[0] + 2, shF[1] + 11, b.aw), L('armF', armKey, shF[0] + 2, shF[1] + 11, handF[0], handF[1], b.aw * 0.9));
  const w = weapon(o.weapon, handF);
  shapes.push(...w.shapes);
  shapes.push(C('armF', 'skin', handF[0], handF[1], b.aw * 0.62));
  if (o.wings) shapes.push(P('wingF', 'wing', [[62, 84], [58, 64], [56, 50], [64, 60], [70, 52], [70, 68], [78, 64], [72, 86]]), L('wingF', 'skin', 62, 84, 56.5, 52, 1.2));

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
    pivots: { torso: hip, head: neck, armB: shB, armF: shF, legB: hipB, legF: hipF, weapon: handF, offhand: handB, cape: [56, 76], wingB: [56, 84], wingF: [62, 84] },
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

function drake(id: string, palette: Record<string, string>, veteran: boolean): PuppetRig {
  const extra: Shape[] = veteran
    ? [P('head', 'horn', [[80, 72], [66, 64], [76, 70]]), L('torso', 'ink', 50, 92, 58, 100, 0.8), L('torso', 'ink', 62, 90, 66, 99, 0.8), P('torso', 'horn', [[38, 92], [40, 85], [44, 91]])]
    : [];
  return finish(id, {
    accent: palette.eyeGlow ?? '#ffcf5a', style: 'melee', focus: [96, 74], focusBone: 'head', slash: [10, 22], slashAt: ['head', [98, 76]],
    flap: 14, flapBones: 'wings', art: 1.15, palette,
    pivots: { torso: [44, 100], head: [76, 92], cape: [40, 97], armF: [78, 100], armB: [74, 100], legF: [48, 100], legB: [44, 100], wingB: [56, 86], wingF: [62, 86] },
    rest: {},
    windup: { rootX: -6, torso: -10, head: -22, wingF: -20, wingB: -20, armF: -10 },
    strike: { rootX: 16, torso: 6, head: 18, armF: -35, legF: 20, wingF: 18, wingB: 18 },
    shapes: [
      P('wingB', 'wing', [[56, 86], [48, 62], [42, 44], [38, 58], [30, 54], [32, 70], [24, 71], [36, 86]]),
      L('wingB', 'scaleD', 56, 86, 42, 46, 1.2), L('wingB', 'scaleD', 56, 86, 31, 56, 1), L('wingB', 'scaleD', 56, 86, 25, 71, 1),
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
      P('wingF', 'wing', [[62, 86], [60, 62], [58, 42], [66, 57], [73, 49], [73, 65], [82, 61], [75, 83]]),
      L('wingF', 'scaleD', 62, 86, 58.5, 44, 1.3), L('wingF', 'scaleD', 62, 86, 72.5, 51, 1.1), L('wingF', 'scaleD', 62, 86, 81, 62, 1.1),
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

function brain(id: string, palette: Record<string, string>): PuppetRig {
  const tentacle = (bone: BoneId, x: number, dx: number): Shape[] => [L(bone, 'flesh', x, 96, x + dx, 110, 2.6), L(bone, 'flesh', x + dx, 110, x + dx * 0.4, 122, 2)];
  return finish(id, {
    accent: palette.magic ?? '#e7a8ff', style: 'magic', focus: [76, 80], focusBone: 'torso', hover: 4, art: 1.15, palette,
    pivots: { torso: [60, 84], legB: [52, 96], legF: [64, 96], armB: [46, 94], armF: [72, 94] },
    rest: {},
    windup: { rootX: -4, torso: -12 },
    strike: { rootX: 6, torso: 10 },
    shapes: [
      ...tentacle('armB', 46, -6), ...tentacle('legB', 52, -3),
      E('torso', 'flesh', 60, 82, 22, 16),
      L('torso', 'ink', 44, 76, 54, 70, 0.8), L('torso', 'ink', 50, 84, 62, 74, 0.8), L('torso', 'ink', 60, 90, 72, 78, 0.8), L('torso', 'ink', 66, 70, 76, 80, 0.8),
      L('torso', 'ink', 40, 86, 48, 92, 0.7), L('torso', 'ink', 70, 92, 78, 86, 0.7), L('torso', 'ink', 58, 68, 60, 96, 0.9),
      P('torso', 'socket', [[62, 94], [72, 93], [70, 97], [64, 97]]),
      C('torso', 'magic', 74, 80, 2.4),
      ...tentacle('legF', 64, 3), ...tentacle('armF', 72, 7),
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

// ── Enemy catalogue ──────────────────────────────────────────────────────────
const G = { skin: '#6f7d4a', leather: '#56422f', cloth: '#6a3b2a', hair: '#2e2a22', eyeGlow: '#ffd75a', body: '#56422f', legs: '#6f7d4a', boots: '#3e2e20' };
const BONE = { skin: '#cdc3a6', bone: '#cdc3a6', body: '#cdc3a6', legs: '#cdc3a6', boots: '#cdc3a6', arms: '#cdc3a6', eyeGlow: '#9fe8ff', cloth: '#3e4a52', metal: '#7f858a', rust: '#6b4a34' };
const KOBOLD = { skin: '#7a5a3a', body: '#5a3a2a', legs: '#7a5a3a', boots: '#4a3322', horn: '#d8c7a0', eyeGlow: '#ffb347' };

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
  'cerebro-anciano': brain('cerebro-anciano', { flesh: '#b07a8a', magic: '#e7a8ff' }),
  observador: floatingEye('observador', { flesh: '#7a4a5a', magic: '#ff9ad0', eyeGlow: '#ffd75a' }, 2),
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
