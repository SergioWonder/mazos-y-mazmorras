// Puppet engine shared by heroes, druid forms, enemies and invocations: bones,
// flat shapes and keyframed animations, with no DOM access. A rig is ~25-50
// shapes attached to a dozen bones; a pose is a set of bone angles and the
// renderers (ui/puppet-sprite.ts) only paint the shapes with each bone's matrix.

import { articulateWings, WING_HZ } from './wing.ts';

/** Generic secondary-motion chains (hair locks, capes, scarves, beards, tails…):
 *  any rig may hang up to CHAIN_SLOTS.length chains of CHAIN_SEGMENTS bones each
 *  from any bone, and the spring solver in fx/chains.ts moves them. */
export const CHAIN_SLOTS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
export type ChainSlot = (typeof CHAIN_SLOTS)[number];
export const CHAIN_SEGMENTS = 3;
export type ChainBone = `ch${ChainSlot}${1 | 2 | 3}`;
/** Bones of each chain slot, from the root segment to the tip. */
export const CHAIN_BONES = Object.fromEntries(
  CHAIN_SLOTS.map((s) => [s, [1, 2, 3].map((i) => `ch${s}${i}` as ChainBone)]),
) as Record<ChainSlot, ChainBone[]>;
const ALL_CHAIN_BONES: ChainBone[] = CHAIN_SLOTS.flatMap((s) => CHAIN_BONES[s]);

export type BoneId =
  | 'root' | 'torso' | 'cape' | 'head' | 'armB' | 'offhand' | 'armF' | 'weapon' | 'legB' | 'legF'
  | 'wingB' | 'wingF'
  // articulated wings: forearm and fingers hang from each shoulder (fx/wing.ts)
  | 'wingBArm' | 'wingBF1' | 'wingBF2' | 'wingBF3' | 'wingFArm' | 'wingFF1' | 'wingFF2' | 'wingFF3'
  | ChainBone;

/** Shape in bind-pose coordinates (viewBox 140×135, facing right, feet at y≈128). */
export type Shape =
  | { t: 'c'; b: BoneId; k: string; x: number; y: number; r: number }
  | { t: 'e'; b: BoneId; k: string; x: number; y: number; rx: number; ry: number }
  | { t: 'p'; b: BoneId; k: string; pts: [number, number][] }
  | { t: 'l'; b: BoneId; k: string; x1: number; y1: number; x2: number; y2: number; w: number };

export interface Pose extends Record<ChainBone, number> {
  /** Squash (> 0) or stretch (< 0) of the whole figure around its feet. */
  squash: number;
  rootX: number; torsoY: number; torso: number; head: number; armF: number; armB: number;
  weapon: number; offhand: number; legF: number; legB: number; cape: number; wingB: number; wingF: number;
  wingBArm: number; wingBF1: number; wingBF2: number; wingBF3: number;
  wingFArm: number; wingFF1: number; wingFF2: number; wingFF3: number;
}
export type PartialPose = Partial<Pose>;

/** Continuous particle source attached to a bone (embers, smoke, souls…). */
export interface Emitter {
  bone: BoneId;
  at: [number, number];
  /** Particle preset name (particle-sim EFFECTS). */
  effect: string;
  /** Particles per second at intensity 1. */
  rate: number;
  /** Random scatter around `at`, in viewBox units. */
  spread?: number;
}
/** One-off particle burst fired by an action (at the blow for attacks). */
export interface Burst {
  bone: BoneId;
  at: [number, number];
  effect: string;
  scale?: number;
}

export type WingSide = 'B' | 'F';
/** Joint data of an articulated wing (built by fx/wing.ts). */
export interface WingJoints {
  /** +1 when positive rotations lower the wing (tips in front of the shoulder), -1 otherwise. */
  stroke: 1 | -1;
  shoulder: [number, number];
  /** Rotation of each joint when the wing is fully folded (degrees). */
  fold: Partial<Record<BoneId, number>>;
  /** Finger tips, in their bone's bind coordinates. */
  tips: { bone: BoneId; at: [number, number] }[];
}

/** A spring chain hung from a bone (see fx/chains.ts for the solver). */
export interface ChainSpec {
  slot: ChainSlot;
  /** Bone the chain hangs from (default 'torso'); may be a bone of an earlier chain slot. */
  parent?: BoneId;
  /** Root pivot followed by the end of each segment (2..CHAIN_SEGMENTS+1 points, bind coords). */
  joints: [number, number][];
  /** Natural frequency at the root in Hz: lower is floppier (default 3.2). */
  freq?: number;
  /** Damping ratio: 0 wobbles for ever, 1 settles without bouncing (default 0.32). */
  damping?: number;
  /** How much looser the tip is than the root, 0..0.9 (default 0.35). */
  taper?: number;
  /** Gravity: droop of the tip in viewBox units (default 0.8). */
  sag?: number;
  /** Idle breeze: sway of the tip in viewBox units (default 1). */
  sway?: number;
  /** Max bend of each joint against the animated pose, degrees (default 75). */
  limit?: number;
}

/** Hand-authored timeline of one action, replacing the generic one. */
export interface ActionScript {
  /** [fraction 0..1, pose, easing into this key] — see fx/motion.ts (strikeKeys). */
  keys: Keyframe[];
  /** Windows [from, to] (action fractions) of each effect; omitted ones keep the generic timing. */
  slash?: [number, number];
  burst?: [number, number];
  projectile?: [number, number];
  /** Motion smear: ghosts of the weapon trailing behind it. */
  smear?: [number, number];
  /** Bones the smear ghosts copy (default: weapon and arms for melee, weapon for magic). */
  smearBones?: BoneId[];
}

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
  /** Articulated wings (shoulder, forearm, fingers and membrane panels). */
  wings?: Partial<Record<WingSide, WingJoints>>;
  /** Floating creatures bob up and down instead of breathing in place. */
  hover?: number;
  /** Head size relative to the drawing (below 1 = less chibi, more sombre). */
  headScale?: number;
  /** Drawing scale around the feet, so small-bodied designs match the heroes. */
  art?: number;
  /** Glow around the whole figure, always on (bosses). */
  aura?: string;
  /** Bosses: particles emitted all the time, and bursts per action. */
  emitters?: Emitter[];
  bursts?: Partial<Record<ActionType, Burst[]>>;
  palette: Record<string, string>;
  /** Palette keys painted as a backlit silhouette (black with a rim light in the
   *  accent colour) inside an illustrated sprite: the Dungeon Master behind his screen. */
  backlit?: string[];
  /** Extra per-frame motion on top of the generic one (drumming fingers…). */
  animate?: (p: Pose, t: number, action: ActionProgress | null) => void;
  pivots: Partial<Record<BoneId, [number, number]>>;
  /** Secondary-motion spring chains (hair, cloth, fur, tails). */
  chains?: ChainSpec[];
  /** Per-action timelines (anticipation, impact, hit-stop, overshoot…). */
  actions?: Partial<Record<ActionType, ActionScript>>;
  /** Fraction of the attack at which the blow lands (default 0.4 melee, 0.55 magic). */
  impact?: number;
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
  /** 0..1 progress of the motion smear window (ghosts of the weapon). */
  smear?: number;
}
export interface EffectGeometry {
  slash?: { cx: number; cy: number; r0: number; r1: number; a0: number; a1: number; alpha: number };
  ring?: { cx: number; cy: number; r: number; core: number; alpha: number };
  orb?: { cx: number; cy: number; r: number; alpha: number; angle: number };
}

/** Fraction of the death at which the glowing eyes go out (the body is still fading). */
export const EYES_OUT = 0.7;

/** Seconds each action lasts. */
export const ACTION_DURATION: Record<ActionType, number> = { attack: 0.8, spell: 0.8, hit: 0.6, death: 0.9 };

/** Keys that glow (magic foci, eyes, fire, poison…). */
export const EMISSIVE = new Set([
  'gem', 'orb', 'flame', 'flameCore', 'eyeGlow', 'moonGlow', 'starGlow', 'magic', 'fire', 'poison', 'lava',
  // card art glows
  'bolt', 'slash', 'voidCore', 'soul', 'violetFire', 'violetCore', 'greenFire', 'redMagic', 'sparkle', 'breeze',
]);
export const EYES = new Set(['eye', 'eyeGlow']);

export const C = (b: BoneId, k: string, x: number, y: number, r: number): Shape => ({ t: 'c', b, k, x, y, r });
export const E = (b: BoneId, k: string, x: number, y: number, rx: number, ry: number): Shape => ({ t: 'e', b, k, x, y, rx, ry });
export const P = (b: BoneId, k: string, pts: [number, number][]): Shape => ({ t: 'p', b, k, pts });
export const L = (b: BoneId, k: string, x1: number, y1: number, x2: number, y2: number, w: number): Shape =>
  ({ t: 'l', b, k, x1, y1, x2, y2, w });

/**
 * Angry glowing slit eye, as the card art draws them: a small almond from its
 * outer end to its inner end (put the inner end lower for the frown). The top
 * edge stays almost straight, as if cut by the brow, and the bottom bulges by `h`.
 * Paint it with an emissive eye key ('eyeGlow') so it glows, blinks and dies out.
 */
export function slitEye(b: BoneId, k: string, outer: [number, number], inner: [number, number], h = 1.2): Shape {
  const [ox, oy] = outer, dx = inner[0] - ox, dy = inner[1] - oy, len = Math.hypot(dx, dy) || 1;
  // unit normal pointing down the screen (towards the cheek)
  let nx = -dy / len, ny = dx / len;
  if (ny < 0) { nx = -nx; ny = -ny; }
  const at = (f: number, off: number): [number, number] =>
    [Math.round((ox + dx * f + nx * off) * 100) / 100, Math.round((oy + dy * f + ny * off) * 100) / 100];
  return P(b, k, [outer, at(0.45, -h * 0.18), inner, at(0.62, h), at(0.25, h * 0.8)]);
}

const DEFAULT_PIVOTS = {
  root: [58, 100], torso: [58, 100], cape: [56, 74], head: [60, 74],
  armB: [52, 78], armF: [65, 78], legB: [54, 100], legF: [63, 100],
  weapon: [68, 97], offhand: [49, 96], wingB: [56, 84], wingF: [62, 84],
  wingBArm: [50, 70], wingBF1: [44, 58], wingBF2: [44, 58], wingBF3: [44, 58],
  wingFArm: [60, 70], wingFF1: [60, 58], wingFF2: [60, 58], wingFF3: [60, 58],
} as Record<BoneId, [number, number]>;
const PARENT = {
  root: null, torso: 'root', cape: 'torso', head: 'torso', armB: 'torso', offhand: 'armB',
  armF: 'torso', weapon: 'armF', legB: 'root', legF: 'root', wingB: 'torso', wingF: 'torso',
  wingBArm: 'wingB', wingBF1: 'wingBArm', wingBF2: 'wingBArm', wingBF3: 'wingBArm',
  wingFArm: 'wingF', wingFF1: 'wingFArm', wingFF2: 'wingFArm', wingFF3: 'wingFArm',
} as Record<BoneId, BoneId | null>;
const BONE_ORDER: BoneId[] = [
  'root', 'torso', 'cape', 'head', 'armB', 'offhand', 'armF', 'weapon', 'legB', 'legF', 'wingB', 'wingF',
  'wingBArm', 'wingBF1', 'wingBF2', 'wingBF3', 'wingFArm', 'wingFF1', 'wingFF2', 'wingFF3',
  ...ALL_CHAIN_BONES,
];
for (const s of CHAIN_SLOTS) CHAIN_BONES[s].forEach((b, i) => { PARENT[b] = i ? CHAIN_BONES[s][i - 1] : 'torso'; DEFAULT_PIVOTS[b] = [0, 0]; });

/** Parents and pivots of a rig's chain bones (declared chains only), cached per rig. */
interface ChainLayout { parent: Partial<Record<BoneId, BoneId>>; pivot: Partial<Record<BoneId, [number, number]>> }
const layouts = new WeakMap<PuppetRig, ChainLayout>();
function chainLayout(rig: PuppetRig): ChainLayout {
  let l = layouts.get(rig);
  if (!l) {
    l = { parent: {}, pivot: {} };
    for (const c of rig.chains ?? []) {
      const bones = CHAIN_BONES[c.slot];
      if (!bones) continue;
      for (let i = 0; i < c.joints.length - 1 && i < bones.length; i++) {
        l.parent[bones[i]] = i ? bones[i - 1] : c.parent ?? 'torso';
        l.pivot[bones[i]] = c.joints[i];
      }
    }
    layouts.set(rig, l);
  }
  return l;
}

/** Parent of a bone in the skeleton (null for the root); chain roots follow the rig's declaration. */
export const boneParent = (b: BoneId, rig?: PuppetRig): BoneId | null => (rig && chainLayout(rig).parent[b]) || PARENT[b];

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

export const pivotOf = (rig: PuppetRig, b: BoneId) => rig.pivots[b] ?? chainLayout(rig).pivot[b] ?? DEFAULT_PIVOTS[b];

/** Height of the feet: squash and stretch happen around it. */
const FEET_Y = 128;

/** World matrix of every bone for a pose. */
export function puppetBones(rig: PuppetRig, p: Pose): Record<BoneId, Matrix> {
  const out = {} as Record<BoneId, Matrix>;
  const chain = chainLayout(rig).parent;
  for (const b of BONE_ORDER) {
    if (b === 'root') {
      out.root = translate(p.rootX, 0);
      if (p.squash) {
        // volume-preserving-ish: squashing widens, stretching narrows
        const sy = 1 - p.squash, sx = 1 + p.squash * 0.6, fx = pivotOf(rig, 'root')[0];
        out.root = mul(out.root, [sx, 0, 0, sy, fx - sx * fx, FEET_Y - sy * FEET_Y]);
      }
      continue;
    }
    const [px, py] = pivotOf(rig, b);
    let m = out[chain[b] ?? PARENT[b]!];
    if (b === 'torso') m = mul(m, translate(0, p.torsoY));
    out[b] = mul(m, rotateAbout(p[b as keyof Pose] ?? 0, px, py));
    if (b === 'head' && rig.headScale) out[b] = mul(out[b], scaleAbout(rig.headScale, px, py));
  }
  return out;
}

// ── Animation ────────────────────────────────────────────────────────────────
const ZERO: Pose = {
  squash: 0,
  rootX: 0, torsoY: 0, torso: 0, head: 0, armF: 0, armB: 0, weapon: 0, offhand: 0, legF: 0, legB: 0, cape: 0, wingB: 0, wingF: 0,
  wingBArm: 0, wingBF1: 0, wingBF2: 0, wingBF3: 0, wingFArm: 0, wingFF1: 0, wingFF2: 0, wingFF3: 0,
  ...(Object.fromEntries(ALL_CHAIN_BONES.map((b) => [b, 0])) as Record<ChainBone, number>),
};
const POSE_KEYS = Object.keys(ZERO) as (keyof Pose)[];
const smooth = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);
/** [fraction of the action, pose, easing of the segment that arrives at this key]. */
export type Keyframe = [number, PartialPose, ((t: number) => number)?];

/** Pose at fraction q of a keyframed timeline; missing values fall back to `base`. */
export function interpolate(kfs: Keyframe[], q: number, base: Pose): Pose {
  let i = 0;
  while (i < kfs.length - 2 && q > kfs[i + 1][0]) i++;
  const [p0, a0] = kfs[i];
  const [p1, a1, ease] = kfs[i + 1];
  const u = Math.max(0, Math.min(1, (q - p0) / (p1 - p0)));
  const e = (ease ?? smooth)(u);
  const out = { ...ZERO };
  for (const k of POSE_KEYS) {
    const va = a0[k] ?? base[k], vb = a1[k] ?? base[k];
    out[k] = va + (vb - va) * e;
  }
  return out;
}

/** Default fraction of an attack at which the blow lands. */
const defaultImpact = (rig: PuppetRig) => (rig.style === 'melee' ? 0.4 : 0.55);
/** Fraction of an attack at which the blow lands (to sync damage numbers). */
export const puppetImpact = (rig: PuppetRig) => rig.impact ?? defaultImpact(rig);

/** Progress 0..1 inside [a, b], or undefined outside it. */
const windowOf = (q: number, w: [number, number]) => (q > w[0] && q < w[1] ? (q - w[0]) / (w[1] - w[0]) : undefined);

const smoothstep = (x: number) => { const u = Math.min(1, Math.max(0, x)); return u * u * (3 - 2 * u); };

/** How much an action suppresses idle motion: 0 at rest, eases to 1 over the first
 *  12 % and back to 0 over the last 15 % (death keeps it, the body stays down). */
export function actionHold(action: ActionProgress | null): number {
  if (!action) return 0;
  const q = action.p;
  const enter = smoothstep(q / 0.12);
  return action.type === 'death' ? enter : Math.min(enter, 1 - smoothstep((q - 0.85) / 0.15));
}

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
        armB: base.armB + 35, legF: -18, legB: 14, cape: 20,
        // wings drop: positive is downwards unless the wing opens backwards
        wingF: 45 * (rig.wings?.F?.stroke ?? 1), wingB: 40 * (rig.wings?.B?.stroke ?? 1),
      };
      p = interpolate([[0, {}], [0.1, { rootX: -8, torso: base.torso - 14, head: base.head - 12 }, easeOut], [0.5, fallen], [1, fallen]], q, base);
      fx.flash = q < 0.1;
      fx.tint = Math.max(0, 1 - q / 0.4);
      fx.opacity = q < 0.35 ? 1 : q < 0.8 ? 1 - (q - 0.35) / 0.45 : 0;
      fx.dying = Math.min(1, q / 0.4);
    }
    const script = rig.actions?.[action.type];
    if (script) {
      p = interpolate(script.keys, q, base);
      // generic effect windows follow the rig's own impact
      const shift = action.type === 'attack' ? puppetImpact(rig) - defaultImpact(rig) : 0;
      const move = (v: number | undefined, w: [number, number] | undefined, g: [number, number]) =>
        w ? windowOf(q, w) : v === undefined && !shift ? undefined : windowOf(q, [g[0] + shift, g[1] + shift]);
      if (action.type === 'attack') {
        if (rig.style === 'melee') fx.slash = move(fx.slash, script.slash, [0.3, 0.6]);
        else {
          fx.burst = move(fx.burst, script.burst, [0.43, 0.75]);
          fx.projectile = move(fx.projectile, script.projectile, [0.46, 0.84]);
        }
      } else {
        if (script.burst) fx.burst = windowOf(q, script.burst);
        if (script.slash) fx.slash = windowOf(q, script.slash);
      }
      if (script.smear) fx.smear = windowOf(q, script.smear);
    }
  }
  // breathing on top of everything, damped during actions; the damping ramps in
  // and out at the edges so actions start and end without a pop (which the
  // physics chains would amplify)
  const hold = actionHold(action);
  const b = Math.sin((t * 2 * Math.PI) / 2.5 + rig.phase), calm = 1 - 0.7 * hold;
  p.torsoY += b * 0.9 * calm; p.torso += b * 1.2 * calm; p.head -= b * 1.5 * calm;
  p.armF += b * 2.5 * calm; p.armB -= b * 2.5 * calm; p.weapon -= b * 2 * calm;
  if (rig.hover) p.torsoY += Math.sin(t * 2 * Math.PI * 0.55 + rig.phase) * rig.hover;
  if (rig.wings) articulateWings(rig, p, t, action);
  else if (rig.flap) {
    const w = Math.sin(t * 2 * Math.PI * (rig.flapBones === 'wings' ? WING_HZ : 1.6) + rig.phase) * rig.flap * (1 - 0.5 * hold);
    if (rig.flapBones === 'wings') { p.wingF += w; p.wingB += w * 0.9; } else { p.armF += w; p.armB += w * 0.9; p.torsoY -= w * 0.08; }
  }
  // cape/scarf/tail hangs from its pivot and trails behind forward motion
  p.cape += b * 4 + Math.sin(t * 1.7 + rig.phase) * 2 - (p.torso - base.torso) * 0.8 + p.rootX * 0.9;
  // blink now and then; the eyes go out for good near the end of the death
  fx.blink = (action?.type === 'death' && action.p >= EYES_OUT) || ((t + rig.phase) % 3.7) < 0.13;
  rig.animate?.(p, t, action);
  return { p, fx };
}

/** Point of an emitter or burst in viewBox space, following its bone. */
export function emitterWorld(rig: PuppetRig, bones: Record<BoneId, Matrix>, e: { bone: BoneId; at: [number, number] }): [number, number] {
  return applyMatrix(bones[e.bone], ...e.at);
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
