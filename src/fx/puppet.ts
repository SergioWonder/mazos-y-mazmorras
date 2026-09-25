// Puppet engine shared by heroes, druid forms, enemies and invocations: bones,
// flat shapes and keyframed animations, with no DOM access. A rig is ~25-50
// shapes attached to a dozen bones; a pose is a set of bone angles and the
// renderers (ui/puppet-sprite.ts) only paint the shapes with each bone's matrix.

export type BoneId =
  | 'root' | 'torso' | 'cape' | 'head' | 'armB' | 'offhand' | 'armF' | 'weapon' | 'legB' | 'legF'
  | 'wingB' | 'wingF';

/** Shape in bind-pose coordinates (viewBox 140×135, facing right, feet at y≈128). */
export type Shape =
  | { t: 'c'; b: BoneId; k: string; x: number; y: number; r: number }
  | { t: 'e'; b: BoneId; k: string; x: number; y: number; rx: number; ry: number }
  | { t: 'p'; b: BoneId; k: string; pts: [number, number][] }
  | { t: 'l'; b: BoneId; k: string; x1: number; y1: number; x2: number; y2: number; w: number };

export interface Pose {
  rootX: number; torsoY: number; torso: number; head: number; armF: number; armB: number;
  weapon: number; offhand: number; legF: number; legB: number; cape: number; wingB: number; wingF: number;
}
export type PartialPose = Partial<Pose>;

export interface PuppetRig {
  /** Glow colour of eyes, magic and effects (also the silhouette rim). */
  accent: string;
  /** 'melee' swings and slashes; 'magic' shoots a projectile from its focus. */
  style: 'melee' | 'magic';
  phase: number;
  /** Point where spells and projectiles are born (on focusBone, default 'weapon'). */
  focus: [number, number];
  focusBone?: BoneId;
  /** Inner/outer radius of the melee slash arc. */
  slash?: [number, number];
  /** Centre of the slash arc (default: front shoulder). */
  slashAt?: [BoneId, [number, number]];
  /** Projectile drawn by magic attacks. */
  projectile?: 'orb' | 'arrow';
  /** Idle flapping amplitude in degrees (flying creatures never stand still). */
  flap?: number;
  /** Which bones flap: the arms (birds) or the wings (drakes, imps). */
  flapBones?: 'arms' | 'wings';
  /** Floating creatures bob up and down instead of breathing in place. */
  hover?: number;
  /** Head size relative to the drawing (below 1 = less chibi, more sombre). */
  headScale?: number;
  /** Drawing scale around the feet, so small-bodied designs match the heroes. */
  art?: number;
  palette: Record<string, string>;
  pivots: Partial<Record<BoneId, [number, number]>>;
  rest: PartialPose;
  windup: PartialPose;
  strike: PartialPose;
  shapes: Shape[];
}

export type ActionType = 'attack' | 'spell' | 'hit' | 'death';
export interface Action { type: ActionType; t0: number }
export interface ActionProgress { type: ActionType; p: number }

export interface Effects {
  slash?: number;
  burst?: number;
  projectile?: number;
  flash?: boolean;
  tint?: number;
  blink?: boolean;
  /** 1 visible, 0 gone (death fades the puppet out). */
  opacity: number;
  /** 0..1 desaturation while dying. */
  dying?: number;
}
export interface EffectGeometry {
  slash?: { cx: number; cy: number; r0: number; r1: number; a0: number; a1: number; alpha: number };
  ring?: { cx: number; cy: number; r: number; core: number; alpha: number };
  orb?: { cx: number; cy: number; r: number; alpha: number; angle: number };
}

/** Seconds each action lasts. */
export const ACTION_DURATION: Record<ActionType, number> = { attack: 0.8, spell: 0.8, hit: 0.6, death: 0.9 };

/** Keys that glow (magic foci, eyes, fire, poison…). */
export const EMISSIVE = new Set([
  'gem', 'orb', 'flame', 'flameCore', 'eyeGlow', 'moonGlow', 'starGlow', 'magic', 'fire', 'poison', 'lava',
]);
export const EYES = new Set(['eye', 'eyeGlow']);

export const C = (b: BoneId, k: string, x: number, y: number, r: number): Shape => ({ t: 'c', b, k, x, y, r });
export const E = (b: BoneId, k: string, x: number, y: number, rx: number, ry: number): Shape => ({ t: 'e', b, k, x, y, rx, ry });
export const P = (b: BoneId, k: string, pts: [number, number][]): Shape => ({ t: 'p', b, k, pts });
export const L = (b: BoneId, k: string, x1: number, y1: number, x2: number, y2: number, w: number): Shape =>
  ({ t: 'l', b, k, x1, y1, x2, y2, w });

const DEFAULT_PIVOTS: Record<BoneId, [number, number]> = {
  root: [58, 100], torso: [58, 100], cape: [56, 74], head: [60, 74],
  armB: [52, 78], armF: [65, 78], legB: [54, 100], legF: [63, 100],
  weapon: [68, 97], offhand: [49, 96], wingB: [56, 84], wingF: [62, 84],
};
const PARENT: Record<BoneId, BoneId | null> = {
  root: null, torso: 'root', cape: 'torso', head: 'torso', armB: 'torso', offhand: 'armB',
  armF: 'torso', weapon: 'armF', legB: 'root', legF: 'root', wingB: 'torso', wingF: 'torso',
};
const BONE_ORDER: BoneId[] = ['root', 'torso', 'cape', 'head', 'armB', 'offhand', 'armF', 'weapon', 'legB', 'legF', 'wingB', 'wingF'];

// ── 2D affine matrices [a b c d e f] (SVG convention) ────────────────────────
export type Matrix = [number, number, number, number, number, number];
const mul = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const translate = (x: number, y: number): Matrix => [1, 0, 0, 1, x, y];
const scaleAbout = (k: number, px: number, py: number): Matrix => [k, 0, 0, k, px - k * px, py - k * py];
function rotateAbout(deg: number, px: number, py: number): Matrix {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return [c, s, -s, c, px - c * px + s * py, py - s * px - c * py];
}
export const applyMatrix = (m: Matrix, x: number, y: number): [number, number] =>
  [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

export const pivotOf = (rig: PuppetRig, b: BoneId) => rig.pivots[b] ?? DEFAULT_PIVOTS[b];

/** World matrix of every bone for a pose. */
export function puppetBones(rig: PuppetRig, p: Pose): Record<BoneId, Matrix> {
  const out = {} as Record<BoneId, Matrix>;
  for (const b of BONE_ORDER) {
    if (b === 'root') { out.root = translate(p.rootX, 0); continue; }
    const [px, py] = pivotOf(rig, b);
    let m = out[PARENT[b]!];
    if (b === 'torso') m = mul(m, translate(0, p.torsoY));
    out[b] = mul(m, rotateAbout(p[b as keyof Pose] ?? 0, px, py));
    if (b === 'head' && rig.headScale) out[b] = mul(out[b], scaleAbout(rig.headScale, px, py));
  }
  return out;
}

// ── Animation ────────────────────────────────────────────────────────────────
const ZERO: Pose = {
  rootX: 0, torsoY: 0, torso: 0, head: 0, armF: 0, armB: 0, weapon: 0, offhand: 0, legF: 0, legB: 0, cape: 0, wingB: 0, wingF: 0,
};
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
export const puppetImpact = (rig: PuppetRig) => (rig.style === 'melee' ? 0.4 : 0.55);

/** Pose and effects of a puppet at time t (seconds), optionally mid-action. */
export function puppetPose(rig: PuppetRig, t: number, action: ActionProgress | null): { p: Pose; fx: Effects } {
  const base: Pose = { ...ZERO, ...rig.rest };
  let p: Pose = { ...base };
  const fx: Effects = { opacity: 1 };
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
      // magic users raise their focus; brutes brace and roar
      const up: PartialPose = rig.style === 'magic'
        ? rig.windup
        : { torso: base.torso - 5, head: base.head - 8, armF: base.armF - 35, armB: base.armB - 60 };
      const hold: PartialPose = rig.style === 'magic'
        ? { ...rig.strike, rootX: 0, legF: 0, legB: 0 }
        : { torso: base.torso + 2, head: base.head + 4, armF: base.armF - 20, armB: base.armB - 30 };
      p = interpolate([[0, {}], [0.35, up], [0.5, hold, easeOut], [0.75, hold], [1, {}]], q, base);
      if (q > 0.42 && q < 0.8) fx.burst = (q - 0.42) / 0.38;
    } else if (action.type === 'hit') {
      p = interpolate([
        [0, {}],
        [0.12, { rootX: -8, torso: base.torso - 14, head: base.head - 12, armF: base.armF + 18, armB: base.armB + 22 }, easeOut],
        [0.45, { rootX: -3, torso: base.torso - 5, head: base.head - 4 }],
        [1, {}],
      ], q, base);
      fx.flash = q < 0.14;
      fx.tint = Math.max(0, 1 - q / 0.55);
    } else {
      // death: recoil, collapse backwards, grey out and fade away for good
      const fallen: PartialPose = {
        rootX: -6, torsoY: 9, torso: base.torso - 26, head: base.head - 34, armF: base.armF + 45,
        armB: base.armB + 35, legF: -18, legB: 14, wingF: 45, wingB: 40, cape: 20,
      };
      p = interpolate([[0, {}], [0.1, { rootX: -8, torso: base.torso - 14, head: base.head - 12 }, easeOut], [0.5, fallen], [1, fallen]], q, base);
      fx.flash = q < 0.1;
      fx.tint = Math.max(0, 1 - q / 0.4);
      fx.opacity = q < 0.35 ? 1 : q < 0.8 ? 1 - (q - 0.35) / 0.45 : 0;
      fx.dying = Math.min(1, q / 0.4);
    }
  }
  // breathing on top of everything, damped during actions
  const b = Math.sin((t * 2 * Math.PI) / 2.5 + rig.phase), calm = action ? 0.3 : 1;
  p.torsoY += b * 0.9 * calm; p.torso += b * 1.2 * calm; p.head -= b * 1.5 * calm;
  p.armF += b * 2.5 * calm; p.armB -= b * 2.5 * calm; p.weapon -= b * 2 * calm;
  if (rig.hover) p.torsoY += Math.sin(t * 2 * Math.PI * 0.55 + rig.phase) * rig.hover;
  if (rig.flap) {
    const w = Math.sin(t * 2 * Math.PI * (rig.flapBones === 'wings' ? 1.1 : 1.6) + rig.phase) * rig.flap * (action ? 0.5 : 1);
    if (rig.flapBones === 'wings') { p.wingF += w; p.wingB += w * 0.9; } else { p.armF += w; p.armB += w * 0.9; p.torsoY -= w * 0.08; }
  }
  // cape/scarf/tail hangs from its pivot and trails behind forward motion
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
export function puppetEffects(rig: PuppetRig, bones: Record<BoneId, Matrix>, fx: Effects): EffectGeometry {
  const g: EffectGeometry = {};
  if (fx.slash !== undefined && rig.slash) {
    const [cx, cy] = rig.slashAt
      ? applyMatrix(bones[rig.slashAt[0]], ...rig.slashAt[1])
      : applyMatrix(bones.torso, ...pivotOf(rig, 'armF'));
    const head = -120 + 170 * easeOut(fx.slash), tail = head - 85 * (1 - fx.slash * 0.5);
    g.slash = { cx, cy, r0: rig.slash[0], r1: rig.slash[1], a0: tail, a1: head, alpha: 1 - fx.slash * fx.slash };
  }
  const [ex, ey] = applyMatrix(bones[rig.focusBone ?? 'weapon'], ...rig.focus);
  if (fx.burst !== undefined) g.ring = { cx: ex, cy: ey, r: 3 + fx.burst * 15, core: (1 - fx.burst) * 6, alpha: 1 - fx.burst };
  if (fx.projectile !== undefined) {
    const arc = rig.projectile === 'arrow' ? 3 : 4;
    g.orb = {
      cx: ex + fx.projectile * 60, cy: ey - Math.sin(fx.projectile * Math.PI) * arc,
      r: 4.5 * (1 - fx.projectile * 0.4), alpha: 1 - Math.pow(fx.projectile, 3),
      angle: -Math.cos(fx.projectile * Math.PI) * arc * 3,
    };
  }
  return g;
}
