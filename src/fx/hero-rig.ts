// Hero puppet rigs: bones, shapes and keyframed animations, with no DOM access.
// Every hero is ~25 flat shapes attached to 10 bones; a pose is a set of bone
// angles and the renderer (ui/sprite-heroe.ts) only has to paint the shapes with
// each bone's matrix. Pure and testable from the smoke test.

import type { ClaseId } from '../core/types.ts';

export type BoneId =
  | 'root' | 'torso' | 'cape' | 'head' | 'armB' | 'offhand' | 'armF' | 'weapon' | 'legB' | 'legF';

/** Shape in bind-pose coordinates (viewBox 140×135, hero facing right). */
export type Shape =
  | { t: 'c'; b: BoneId; k: string; x: number; y: number; r: number }
  | { t: 'e'; b: BoneId; k: string; x: number; y: number; rx: number; ry: number }
  | { t: 'p'; b: BoneId; k: string; pts: [number, number][] }
  | { t: 'l'; b: BoneId; k: string; x1: number; y1: number; x2: number; y2: number; w: number };

export interface Pose {
  rootX: number; torsoY: number; torso: number; head: number; armF: number; armB: number;
  weapon: number; offhand: number; legF: number; legB: number; cape: number;
}
type PartialPose = Partial<Pose>;

export interface HeroRig {
  /** Rim light colour (class colour). */
  accent: string;
  /** 'melee' swings and slashes; 'magic' casts a projectile from its focus. */
  style: 'melee' | 'magic';
  phase: number;
  /** Point on the weapon bone where spells and projectiles are born. */
  focus: [number, number];
  /** Inner/outer radius of the melee slash arc. */
  slash?: [number, number];
  palette: Record<string, string>;
  pivots: Partial<Record<BoneId, [number, number]>>;
  rest: PartialPose;
  windup: PartialPose;
  strike: PartialPose;
  shapes: Shape[];
}

export type ActionType = 'attack' | 'spell' | 'hit';
export interface Action { type: ActionType; t0: number }
export interface ActionProgress { type: ActionType; p: number }

export interface Effects {
  slash?: number;
  burst?: number;
  projectile?: number;
  flash?: boolean;
  tint?: number;
  blink?: boolean;
}
export interface EffectGeometry {
  slash?: { cx: number; cy: number; r0: number; r1: number; a0: number; a1: number; alpha: number };
  ring?: { cx: number; cy: number; r: number; core: number; alpha: number };
  orb?: { cx: number; cy: number; r: number; alpha: number };
}

/** Seconds each action lasts. */
export const ACTION_DURATION: Record<ActionType, number> = { attack: 0.8, spell: 0.8, hit: 0.6 };

/** Keys that glow (magic foci, warlock eyes, effects). */
export const EMISSIVE = new Set(['gem', 'orb', 'flame', 'flameCore', 'eyeGlow']);
export const EYES = new Set(['eye', 'eyeGlow']);

const C = (b: BoneId, k: string, x: number, y: number, r: number): Shape => ({ t: 'c', b, k, x, y, r });
const E = (b: BoneId, k: string, x: number, y: number, rx: number, ry: number): Shape => ({ t: 'e', b, k, x, y, rx, ry });
const P = (b: BoneId, k: string, pts: [number, number][]): Shape => ({ t: 'p', b, k, pts });
const L = (b: BoneId, k: string, x1: number, y1: number, x2: number, y2: number, w: number): Shape =>
  ({ t: 'l', b, k, x1, y1, x2, y2, w });

const DEFAULT_PIVOTS: Record<BoneId, [number, number]> = {
  root: [58, 100], torso: [58, 100], cape: [56, 74], head: [60, 74],
  armB: [52, 78], armF: [65, 78], legB: [54, 100], legF: [63, 100],
  weapon: [68, 97], offhand: [49, 96],
};
const PARENT: Record<BoneId, BoneId | null> = {
  root: null, torso: 'root', cape: 'torso', head: 'torso', armB: 'torso', offhand: 'armB',
  armF: 'torso', weapon: 'armF', legB: 'root', legF: 'root',
};
const BONE_ORDER: BoneId[] = ['root', 'torso', 'cape', 'head', 'armB', 'offhand', 'armF', 'weapon', 'legB', 'legF'];

export const HERO_RIGS: Record<ClaseId, HeroRig> = {
  druida: {
    accent: '#7dba4e', style: 'magic', phase: 0.0, focus: [70, 52],
    palette: { hoodD: '#2f4f27', hood: '#4f7d35', leaf: '#8cc152', robe: '#7a5634', robeD: '#5a3d25', boots: '#4a3322', belt: '#c19a52', skin: '#e2b48c', eye: '#1b140f', antler: '#c9a77a', wood: '#7b5530', gem: '#b6ff7a' },
    pivots: { weapon: [68, 97] },
    rest: { armF: -15, weapon: 15, armB: 10 },
    windup: { rootX: -3, torso: -6, head: -4, armF: -60, weapon: 40, armB: 25 },
    strike: { rootX: 6, torso: 8, head: 4, armF: -100, weapon: 55, armB: -20, legF: -8, legB: 5 },
    shapes: [
      P('cape', 'hoodD', [[49, 73], [62, 73], [60, 100], [52, 120], [38, 122], [44, 100]]),
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
    rest: { armF: -25, weapon: 60, armB: 15, torso: 3 },
    windup: { rootX: -5, torso: -10, head: -6, armF: 150, weapon: 190, armB: 120, legF: -6, legB: 6 },
    strike: { rootX: 12, torso: 14, head: 6, armF: 290, weapon: 190, armB: -40, legF: -14, legB: 10 },
    shapes: [
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
    rest: { armF: -12, weapon: 12, armB: 5 },
    windup: { rootX: -3, torso: -5, head: -5, armF: -150, weapon: 150, armB: 30 },
    strike: { rootX: 5, torso: 10, head: 6, armF: -85, weapon: 55, armB: -30 },
    shapes: [
      E('legB', 'boots', 52, 126, 6, 3.5), E('legF', 'boots', 66, 126, 6.5, 3.5),
      L('armB', 'robeD', 52, 78, 48, 94, 9), C('armB', 'skin', 48, 97, 3.8),
      P('torso', 'robe', [[50, 75], [67, 75], [74, 126], [44, 126]]),
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
    rest: { torso: 6, head: -3, armF: -35, weapon: 20, armB: 25 },
    windup: { rootX: -4, torso: -4, head: -4, armF: 30, weapon: -10, armB: -30 },
    strike: { rootX: 18, torso: 18, head: 8, armF: -95, weapon: 15, armB: 60, legF: -18, legB: 14 },
    shapes: [
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
    rest: { armF: -40, weapon: 40, armB: 10 },
    windup: { rootX: -4, torso: -8, head: -6, armF: 10, weapon: -10, armB: 30 },
    strike: { rootX: 6, torso: 10, head: 8, armF: -92, weapon: 92, armB: -10 },
    shapes: [
      P('cape', 'cloakD', [[46, 74], [66, 74], [70, 124], [38, 126], [42, 100]]),
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

// ── 2D affine matrices [a b c d e f] (SVG convention) ────────────────────────
export type Matrix = [number, number, number, number, number, number];
const mul = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const translate = (x: number, y: number): Matrix => [1, 0, 0, 1, x, y];
function rotateAbout(deg: number, px: number, py: number): Matrix {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return [c, s, -s, c, px - c * px + s * py, py - s * px - c * py];
}
export const applyMatrix = (m: Matrix, x: number, y: number): [number, number] =>
  [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

const pivotOf = (cls: ClaseId, b: BoneId) => HERO_RIGS[cls].pivots[b] ?? DEFAULT_PIVOTS[b];

/** World matrix of every bone for a pose. */
export function heroBones(cls: ClaseId, p: Pose): Record<BoneId, Matrix> {
  const out = {} as Record<BoneId, Matrix>;
  for (const b of BONE_ORDER) {
    if (b === 'root') { out.root = translate(p.rootX, 0); continue; }
    const [px, py] = pivotOf(cls, b);
    let m = out[PARENT[b]!];
    if (b === 'torso') m = mul(m, translate(0, p.torsoY));
    const angle = b === 'torso' ? p.torso : (p[b as keyof Pose] ?? 0);
    out[b] = mul(m, rotateAbout(angle, px, py));
  }
  return out;
}

// ── Animation ────────────────────────────────────────────────────────────────
const ZERO: Pose = { rootX: 0, torsoY: 0, torso: 0, head: 0, armF: 0, armB: 0, weapon: 0, offhand: 0, legF: 0, legB: 0, cape: 0 };
const smooth = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);
type Keyframe = [number, PartialPose, ((t: number) => number)?];

function interpolate(kfs: Keyframe[], q: number, base: Pose): Pose {
  let i = 0;
  while (i < kfs.length - 2 && q > kfs[i + 1][0]) i++;
  const [p0, a0] = kfs[i];
  const [p1, a1, ease] = kfs[i + 1];
  const u = Math.max(0, Math.min(1, (q - p0) / (p1 - p0)));
  const e = (ease ?? smooth)(u);
  const out = { ...ZERO };
  for (const k of Object.keys(ZERO) as (keyof Pose)[]) {
    const va = a0[k] ?? base[k], vb = a1[k] ?? base[k];
    out[k] = va + (vb - va) * e;
  }
  return out;
}

/** Fraction of an attack at which the blow lands (to sync damage numbers). */
export function impactFraction(cls: ClaseId): number {
  return HERO_RIGS[cls].style === 'melee' ? 0.4 : 0.55;
}

/** Pose and effects of a hero at time t (seconds), optionally mid-action. */
export function heroPose(cls: ClaseId, t: number, action: ActionProgress | null): { p: Pose; fx: Effects } {
  const rig = HERO_RIGS[cls];
  const base: Pose = { ...ZERO, ...rig.rest };
  let p: Pose = { ...base };
  const fx: Effects = {};
  if (action) {
    const q = action.p;
    if (action.type === 'attack') {
      const kfs: Keyframe[] = rig.style === 'melee'
        ? [[0, {}], [0.28, rig.windup], [0.4, rig.strike, easeOut], [0.62, rig.strike], [1, {}]]
        : [[0, {}], [0.32, rig.windup], [0.46, rig.strike, easeOut], [0.74, rig.strike], [1, {}]];
      p = interpolate(kfs, q, base);
      if (rig.style === 'melee') {
        if (q > 0.3 && q < 0.6) fx.slash = (q - 0.3) / 0.3;
      } else {
        if (q > 0.43 && q < 0.75) fx.burst = (q - 0.43) / 0.32;
        if (q > 0.46 && q < 0.84) fx.projectile = (q - 0.46) / 0.38;
      }
    } else if (action.type === 'spell') {
      // magic classes raise their focus; melee classes brace and roar
      const up: PartialPose = rig.style === 'magic'
        ? rig.windup
        : { torso: base.torso - 5, head: base.head - 8, armF: base.armF - 35, armB: base.armB - 60 };
      const hold: PartialPose = rig.style === 'magic'
        ? { ...rig.strike, rootX: 0, legF: 0, legB: 0 }
        : { torso: base.torso + 2, head: base.head + 4, armF: base.armF - 20, armB: base.armB - 30 };
      p = interpolate([[0, {}], [0.35, up], [0.5, hold, easeOut], [0.75, hold], [1, {}]], q, base);
      if (q > 0.42 && q < 0.8) fx.burst = (q - 0.42) / 0.38;
    } else {
      p = interpolate([
        [0, {}],
        [0.12, { rootX: -8, torso: base.torso - 14, head: base.head - 12, armF: base.armF + 18, armB: base.armB + 22 }, easeOut],
        [0.45, { rootX: -3, torso: base.torso - 5, head: base.head - 4 }],
        [1, {}],
      ], q, base);
      fx.flash = q < 0.14;
      fx.tint = Math.max(0, 1 - q / 0.55);
    }
  }
  // breathing on top of everything, damped during actions
  const b = Math.sin((t * 2 * Math.PI) / 1.9 + rig.phase), calm = action ? 0.3 : 1;
  p.torsoY += b * 0.9 * calm; p.torso += b * 1.2 * calm; p.head -= b * 1.5 * calm;
  p.armF += b * 2.5 * calm; p.armB -= b * 2.5 * calm; p.weapon -= b * 2 * calm;
  // cape/scarf hangs from the shoulders and trails behind forward motion
  p.cape += b * 4 + Math.sin(t * 1.7 + rig.phase) * 2 - (p.torso - base.torso) * 0.8 + p.rootX * 0.9;
  fx.blink = ((t + rig.phase) % 3.7) < 0.13;
  return { p, fx };
}

/** Progress of an action at time t, or null once it has finished. */
export function activeAction(a: Action | null, t: number): ActionProgress | null {
  if (!a) return null;
  const q = (t - a.t0) / ACTION_DURATION[a.type];
  return q >= 0 && q < 1 ? { type: a.type, p: q } : null;
}

/** World-space geometry of the slash arc, spell ring and projectile. */
export function heroEffects(cls: ClaseId, bones: Record<BoneId, Matrix>, fx: Effects): EffectGeometry {
  const rig = HERO_RIGS[cls];
  const g: EffectGeometry = {};
  if (fx.slash !== undefined && rig.slash) {
    const [cx, cy] = applyMatrix(bones.torso, ...pivotOf(cls, 'armF'));
    const head = -120 + 170 * easeOut(fx.slash), tail = head - 85 * (1 - fx.slash * 0.5);
    g.slash = { cx, cy, r0: rig.slash[0], r1: rig.slash[1], a0: tail, a1: head, alpha: 1 - fx.slash * fx.slash };
  }
  const [ex, ey] = applyMatrix(bones.weapon, ...rig.focus);
  if (fx.burst !== undefined) g.ring = { cx: ex, cy: ey, r: 3 + fx.burst * 15, core: (1 - fx.burst) * 6, alpha: 1 - fx.burst };
  if (fx.projectile !== undefined) {
    g.orb = {
      cx: ex + fx.projectile * 60, cy: ey - Math.sin(fx.projectile * Math.PI) * 4,
      r: 4.5 * (1 - fx.projectile * 0.4), alpha: 1 - Math.pow(fx.projectile, 3),
    };
  }
  return g;
}
