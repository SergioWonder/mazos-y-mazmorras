// Mimics: furniture that is a monster (chest, chair and door). At rest each one is
// an ordinary, if slightly suspicious, piece of furniture: its maw (a dark throat,
// teeth, a long tongue and the chest's pseudopods) is drawn *behind* the wood, so
// the closed lid, seat or door leaves hide it completely, and its eyes stay shut
// (rig.eyesShut). To bite, the wood parts and reveals it.
// The throat of the chest and the chair is a fan of three wedges from the hinge, on
// three bones (the body, the lid, and one turning half as much as the lid), so it
// fills the gap at any opening and still tucks away behind the wood when shut.
// Pure data, no DOM; enemy-rigs.ts finishes the rigs (palette defaults and phase).

import { C, E, P, L, slitEye, type ActionProgress, type BoneId, type ChainBone, type Pose, type PuppetRig, type Shape } from './puppet.ts';
import { EASE } from './motion.ts';

type Pt = [number, number];
/** A rig before enemy-rigs.ts `finish` adds its phase and the default palette. */
export type RigDraft = Omit<PuppetRig, 'phase'>;

const r2 = (v: number) => Math.round(v * 100) / 100;

// ── Action timing shared by every mimic ──────────────────────────────────────
/** [action fraction, value, easing of the segment arriving there]. */
type Key = [number, number, ((t: number) => number)?];
function track(q: number, keys: Key[]): number {
  if (q <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [q1, v1, ease] = keys[i];
    if (q <= q1) {
      const [q0, v0] = keys[i - 1];
      return v0 + (v1 - v0) * (ease ?? EASE.smooth)((q - q0) / (q1 - q0 || 1));
    }
  }
  return keys[keys.length - 1][1];
}

/** What the maw does at an instant of an action. */
interface MawState {
  /** 0 shut … 1 gaping (the death flops past it). */
  open: number;
  /** Nervous shaking of the lid or leaves (anticipation, flinch). */
  rattle: number;
  /** 0 tucked in … 1 lashing out at the hero. */
  tongue: number;
  /** 0 … 1 hanging out lifeless (death). */
  limp: number;
  /** Chest only: 0 folded under the box … 1 standing on its pseudopods. */
  pods: number;
  /** Eyes open. */
  awake: boolean;
}

function mawState(action: ActionProgress | null): MawState {
  const q = action?.p ?? 0;
  switch (action?.type) {
    case 'attack':
      // shudder, gape, lash the tongue at the impact, chomp shut, a last snap and settle
      return {
        open: track(q, [[0, 0], [0.22, 0], [0.34, 1, EASE.expoOut], [0.52, 1], [0.6, 0.04, EASE.easeIn], [0.7, 0.35, EASE.easeOut], [0.92, 0]]),
        rattle: track(q, [[0, 0], [0.05, 1], [0.2, 1], [0.26, 0]]),
        tongue: track(q, [[0.24, 0], [0.38, 1, EASE.expoOut], [0.5, 1], [0.58, 0, EASE.easeIn]]),
        limp: 0,
        pods: track(q, [[0.1, 0], [0.22, 1, EASE.backOut], [0.8, 1], [0.95, 0]]),
        awake: q > 0.1 && q < 0.93,
      };
    case 'spell':
      // a hissing threat: the maw opens halfway, trembling, and the tongue flicks
      return {
        open: track(q, [[0.08, 0], [0.32, 0.55, EASE.backOut], [0.72, 0.5], [0.92, 0]]),
        rattle: track(q, [[0, 0], [0.1, 1], [0.75, 1], [0.9, 0]]),
        tongue: track(q, [[0.3, 0], [0.42, 1, EASE.expoOut], [0.56, 0.85], [0.68, 0, EASE.easeIn]]),
        limp: 0, pods: 0,
        awake: q > 0.05 && q < 0.92,
      };
    case 'hit':
      // the blow cracks it open for an instant
      return {
        open: track(q, [[0, 0], [0.1, 0.45, EASE.expoOut], [0.3, 0.35], [0.55, 0]]),
        rattle: track(q, [[0, 1], [0.4, 0]]),
        tongue: 0, limp: 0, pods: 0,
        awake: q < 0.55,
      };
    case 'death':
      // it gasps, then the lid flops wide open and the tongue lolls out
      return {
        open: track(q, [[0, 0], [0.08, 0.6, EASE.expoOut], [0.2, 0.3], [0.42, 1.3, EASE.easeOut], [1, 1.3]]),
        rattle: track(q, [[0, 1], [0.25, 0]]),
        tongue: 0,
        limp: track(q, [[0.15, 0], [0.45, 1, EASE.easeOut]]),
        pods: track(q, [[0.05, 0], [0.2, 1, EASE.backOut], [0.5, 0.15], [1, 0.15]]),
        awake: true,
      };
    default:
      return { open: 0, rattle: 0, tongue: 0, limp: 0, pods: 0, awake: false };
  }
}

/** Mimics play dead: eyes shut unless they are acting. */
const eyesShut = (_t: number, action: ActionProgress | null) => !mawState(action).awake;
/** Fast tremor (degrees) while rattling. */
const shake = (m: MawState, t: number, amp: number) => m.rattle * amp * Math.sin(t * 2 * Math.PI * 13);
/** Slow, barely visible breathing of the whole piece of furniture. */
const breathe = (p: Pose, t: number, phase: number, action: ActionProgress | null) => {
  if (!action) p.squash += 0.01 * Math.sin((t * 2 * Math.PI) / 3.1 + phase);
};

// ── Shared parts ─────────────────────────────────────────────────────────────
/** A three-segment tongue on a generic chain slot, folded away at rest. */
interface Tongue {
  bones: [ChainBone, ChainBone, ChainBone];
  /** Root followed by the end of each segment, straight, in bind pose. */
  joints: [Pt, Pt, Pt, Pt];
  /** Joint rotations folded away, lashing out and hanging limp. The folds go through the
   *  top (-180 rather than 180), so unfolding sweeps up through the open maw. */
  rest: [number, number, number];
  out: [number, number, number];
  limp: [number, number, number];
}

/** Capsules of the tongue and its forked tip. */
function tongueShapes(tg: Tongue, widths: [number, number, number]): Shape[] {
  const [a, b, c, d] = tg.joints, tip = tg.bones[2], w = widths[2] / 2;
  return [
    L(tg.bones[0], 'tongue', a[0], a[1], b[0], b[1], widths[0]),
    L(tg.bones[1], 'tongue', b[0], b[1], c[0], c[1], widths[1]),
    L(tip, 'tongue', c[0], c[1], d[0], d[1], widths[2]),
    // forked tip (the joints are straight to the right in bind pose)
    P(tip, 'tongue', [[d[0] - 1, d[1] - w], [d[0] + 4.5, d[1] - w - 1.6], [d[0] + 1.6, d[1]], [d[0] + 4.5, d[1] + w + 1.6], [d[0] - 1, d[1] + w]]),
    L(tg.bones[1], 'ink', b[0] + 2, b[1], c[0] - 2, c[1], 0.5),
  ];
}

/** Tongue joints for a maw state: folded, lashing with a travelling whip, or limp. */
function poseTongue(p: Pose, tg: Tongue, m: MawState, t: number, phase: number) {
  const whip = [3, 8, 14];
  tg.bones.forEach((b, k) => {
    const lash = tg.rest[k] + (tg.out[k] - tg.rest[k]) * m.tongue;
    p[b] = lash + (tg.limp[k] - lash) * m.limp + m.tongue * whip[k] * Math.sin(t * 2 * Math.PI * 4.5 + phase - k * 1.1);
  });
}

/** Pivots of the tongue bones (each turns around its own root). */
const tonguePivots = (tg: Tongue) => Object.fromEntries(tg.bones.map((b, k) => [b, tg.joints[k]])) as Partial<Record<BoneId, Pt>>;

/**
 * The throat behind a lid hinged at `h`: three wedges between copies of the `rim` (the
 * line where lid and body meet, from the hinge to the front) turned about the hinge,
 * together covering the angles from the rim up to `max` degrees once the lid is open
 * `max` degrees: one on `base` just above the rim, one on `mid` (turned half as much
 * as the lid) straddling it, and one on `lid` just under its edge. At rest each one
 * reaches only a quarter of `max` past the rim, so the wood around it hides it.
 */
function throat(h: Pt, rim: Pt[], max: number, base: BoneId, mid: BoneId, lid: BoneId): Shape[] {
  // the rim turned `deg` degrees upwards about the hinge
  const turned = (deg: number): Pt[] => {
    const c = Math.cos((deg * Math.PI) / 180), s = Math.sin((deg * Math.PI) / 180);
    return rim.map(([x, y]): Pt => [r2(h[0] + (x - h[0]) * c + (y - h[1]) * s), r2(h[1] - (x - h[0]) * s + (y - h[1]) * c)]);
  };
  const wedge = (b: BoneId, a0: number, a1: number) => P(b, 'maw', [...turned(a0), ...turned(a1).slice(1).reverse()]);
  // each wedge reaches half a step (plus some overlap) either side of its rest angle
  const s = max / 4 + 1;
  return [wedge(base, -1, s), wedge(mid, -s, s), wedge(lid, -s, 1)];
}

/** A fang standing on (x, y), pointing up (dir -1) or down (dir 1). */
const fang = (b: BoneId, x: number, y: number, h: number, dir: 1 | -1, w = 1.3): Shape =>
  P(b, 'teeth', [[r2(x - w), y], [r2(x + w), y], [r2(x + 0.4), r2(y + dir * h)]]);
/** A fang on (x, y) pointing left (dir -1) or right (dir 1). */
const fangX = (b: BoneId, x: number, y: number, h: number, dir: 1 | -1, w = 1.3): Shape =>
  P(b, 'teeth', [[x, r2(y - w)], [x, r2(y + w)], [r2(x + dir * h), r2(y + 0.4)]]);

/** Hook of the common pieces of a mimic rig. */
function mimicRig(o: {
  accent: string; palette: Record<string, string>; art: number; focus: Pt; slashAt: Pt;
  pivots: Partial<Record<BoneId, Pt>>; actions: PuppetRig['actions']; shapes: Shape[];
  animate: NonNullable<PuppetRig['animate']>;
}): RigDraft {
  return {
    accent: o.accent, style: 'melee', focus: o.focus, focusBone: 'torso', slash: [10, 22], slashAt: ['torso', o.slashAt],
    impact: 0.4, art: o.art, palette: o.palette, pivots: o.pivots, actions: o.actions,
    rest: {}, windup: { rootX: -3 }, strike: { rootX: 14 },
    eyesShut, animate: o.animate, shapes: o.shapes,
  };
}

// ── The chest ────────────────────────────────────────────────────────────────
/**
 * A banded wooden chest seen from its side, the lock facing the hero. The domed lid
 * hinges at the back: it gapes up to 42° showing the throat, two rows of fangs and a
 * long forked tongue that lashes out, while the box rises on four stubby pseudopods
 * that unfold from under it. Two knots on the lid open as glowing eyes.
 */
export function mimicChest(phase: number): RigDraft {
  const H: Pt = [30, 102], OPEN = 42;
  const rim: Pt[] = [[32.5, 102], [84, 102], [89, 99.2]];
  const tg: Tongue = {
    bones: ['chA1', 'chA2', 'chA3'], joints: [[38, 106], [60, 106], [80, 106], [100, 106]],
    rest: [0, -184, 184], out: [-24, 4, 8], limp: [-28, 25, 35],
  };
  const lidFace: Pt[] = [[29, 102.5], [84, 102.5], [85.5, 96], [84, 88.5], [80, 85], [34, 85], [30, 88.5], [28.5, 96]];
  const lidEnd: Pt[] = [[84, 102.5], [91, 98.5], [93, 93], [92, 87], [88.5, 82.8], [84, 82.4], [81, 84.6], [84, 88.5], [85.5, 96]];
  const lower = [[36, 3.5], [41.5, 5.5], [47.5, 4], [53.5, 5.5], [59.5, 4], [65.5, 6], [71.5, 4], [77.5, 5.5]] as const;
  const upper = [[38.5, 4], [44.5, 6], [50.5, 4], [56.5, 5.5], [62.5, 4], [68.5, 6.5], [74.5, 4.5], [80.5, 5.5]] as const;
  const pod = (b: BoneId, x: number): Shape[] => [L(b, 'pod', x, 114, x, 123.5, 6), E(b, 'pod', x + 0.6, 125.4, 3.6, 2.2), L(b, 'ink', x - 1.2, 116, x - 1, 122, 0.5)];
  return mimicRig({
    accent: '#ffcc4a', art: 1.22, focus: [90, 96], slashAt: [94, 96],
    palette: {
      wood: '#6e4c2e', woodD: '#50361f', iron: '#4c4e52', gold: '#9c7c3c', knot: '#2c1c10',
      maw: '#1c0609', teeth: '#e2d8b8', tongue: '#b23c50', pod: '#8c4c56', eye: '#1a0505', eyeGlow: '#ffcc4a',
    },
    pivots: { torso: [60, 128], cape: H, head: H, legB: [48, 114], legF: [72, 114], ...tonguePivots(tg) },
    actions: {
      attack: {
        keys: [[0, {}], [0.2, { rootX: -3, torso: -2 }], [0.4, { rootX: 14, torso: 4 }, EASE.expoOut], [0.55, { rootX: 13, torso: 3 }],
          [0.62, { rootX: 15, torso: 6 }, EASE.easeIn], [0.75, { rootX: 10, torso: 1 }], [1, {}]],
        slash: [0.34, 0.5],
      },
      spell: { keys: [[0, {}], [0.3, { torso: -2, squash: -0.04 }], [0.5, { torso: 2, squash: 0.03 }], [0.8, { torso: 0 }], [1, {}]] },
      hit: { keys: [[0, {}], [0.1, { rootX: -7, torso: -4 }, EASE.expoOut], [0.35, { rootX: -2, torso: -1 }], [1, {}]] },
      death: {
        keys: [[0, {}], [0.08, { rootX: -6, torso: -4 }, EASE.expoOut], [0.3, { rootX: -3, torso: 2 }],
          [0.55, { rootX: -5, torso: -2, squash: 0.08 }, EASE.easeIn], [1, { rootX: -5, torso: -2, squash: 0.08 }]],
      },
    },
    animate: (p, t, action) => {
      const m = mawState(action);
      p.cape = -OPEN * m.open + shake(m, t, 2.5);
      p.head = p.cape / 2;
      poseTongue(p, tg, m, t, phase);
      // pseudopods: folded flat under the box, then standing and scuttling
      const scuttle = 10 * m.pods * (1 - m.limp) * Math.sin(t * 2 * Math.PI * 6 + phase);
      p.legB = 90 + (6 - 90) * m.pods + scuttle;
      p.legF = -90 + (90 - 6) * m.pods - scuttle;
      p.torsoY -= 7 * m.pods;
      breathe(p, t, phase, action);
    },
    shapes: [
      // — hidden under the box: pseudopods, throat, tongue and fangs —
      ...pod('legB', 48), ...pod('legF', 72),
      ...throat(H, rim, OPEN, 'torso', 'head', 'cape'),
      ...tongueShapes(tg, [6, 5, 4]),
      ...lower.map(([x, h]) => fang('torso', x, 102.4, h, -1)),
      fang('torso', 86.5, 100.4, 4, -1),
      ...upper.map(([x, h]) => fang('cape', x, 102, h, 1)),
      // — the lid: domed boards, iron bands and two suspicious knots —
      P('cape', 'wood', lidFace),
      L('cape', 'ink', 30, 95, 85.3, 95, 0.6), L('cape', 'ink', 33, 89, 83, 89, 0.5),
      L('cape', 'iron', 29.5, 101.6, 84.5, 101.6, 1.8),
      L('cape', 'iron', 40, 85.6, 40, 101.6, 3.2), L('cape', 'iron', 70, 85.6, 70, 101.6, 3.2),
      P('cape', 'woodD', lidEnd),
      L('cape', 'iron', 85.5, 101.8, 91, 98.5, 1.6), L('cape', 'ink', 85.5, 91.5, 91.8, 89, 0.5),
      E('cape', 'knot', 77, 94.4, 3.1, 2), E('cape', 'knot', 59.5, 94.8, 2.2, 1.5),
      // — the box: planks, iron bands, corner brackets and the lock plate —
      P('torso', 'wood', [[30, 102], [84, 102], [84, 127], [30, 127]]),
      L('torso', 'ink', 30, 110.5, 84, 110.5, 0.6), L('torso', 'ink', 30, 119, 84, 119, 0.6),
      L('torso', 'ink', 52, 104, 50, 109, 0.45), L('torso', 'ink', 60, 121, 63, 125, 0.45),
      L('torso', 'iron', 40, 102.4, 40, 127, 3.2), L('torso', 'iron', 70, 102.4, 70, 127, 3.2),
      P('torso', 'iron', [[30, 127], [30, 120], [36.5, 127]]), P('torso', 'iron', [[30, 102.6], [36.5, 102.6], [30, 109]]),
      P('torso', 'woodD', [[84, 102], [91, 98], [91, 123], [84, 127]]),
      L('torso', 'iron', 84, 102.4, 84, 126.6, 2.2), L('torso', 'ink', 84.5, 112.5, 90.5, 109, 0.5),
      P('torso', 'gold', [[85.4, 104.6], [89.8, 102.1], [89.8, 110.6], [85.4, 113.1]]),
      C('torso', 'ink', 87.6, 106.6, 0.85), L('torso', 'ink', 87.6, 106.8, 87.6, 109.6, 0.7),
      // — the hasp hanging from the lid over the lock, then the eyes —
      P('cape', 'iron', [[85.6, 100], [89.4, 97.8], [89.4, 103.4], [85.6, 105.6]]), C('cape', 'gold', 87.5, 102.2, 0.9),
      slitEye('cape', 'eyeGlow', [74.2, 93.6], [80, 95], 1.7), C('cape', 'eye', 77.6, 94.6, 0.65),
      slitEye('cape', 'eyeGlow', [57.6, 94.3], [61.6, 95.2], 1.2),
    ],
  });
}

// ── The chair ────────────────────────────────────────────────────────────────
/**
 * A high-backed tavern chair seen three-quarters from the side. The seat board
 * hinges at the back posts and lifts like a jaw over fangs set in the seat rails; the
 * long tongue lashes out from under it while the chair rears on its back legs and
 * paws with the front ones. Two knots in the carved back splat are its eyes.
 */
export function mimicChair(phase: number): RigDraft {
  const H: Pt = [39, 101], OPEN = 32;
  const rim: Pt[] = [[41.5, 101], [79, 101], [83, 99]];
  const tg: Tongue = {
    bones: ['chA1', 'chA2', 'chA3'], joints: [[45, 105], [64, 105], [82, 105], [99, 105]],
    rest: [0, -184, 184], out: [-18, 4, 8], limp: [-22, 20, 30],
  };
  const lower = [[44, 3.5], [49.5, 4.5], [55, 3.5], [60.5, 4.5], [66, 3.5], [71.5, 4.5], [76.5, 3.5]] as const;
  const upper = [[46.5, 4], [52, 5], [57.5, 4], [63, 5.5], [68.5, 4], [74, 5]] as const;
  return mimicRig({
    accent: '#b8ff6a', art: 1.05, focus: [92, 96], slashAt: [96, 95],
    palette: {
      wood: '#7a5636', woodD: '#563a24', woodL: '#9a724a', knot: '#2e1e12',
      maw: '#1a070c', teeth: '#e4dcbc', tongue: '#a8384c', eye: '#0c1a05', eyeGlow: '#b8ff6a',
    },
    pivots: { torso: [40, 127], cape: H, head: H, armF: [77, 104], armB: [90, 99], ...tonguePivots(tg) },
    actions: {
      attack: {
        // rears back on its hind legs, then lunges with the seat gaping
        keys: [[0, {}], [0.22, { rootX: -2, torso: -9 }], [0.4, { rootX: 13, torso: -2 }, EASE.expoOut], [0.55, { rootX: 12, torso: -1 }],
          [0.62, { rootX: 14, torso: 0 }, EASE.easeIn], [0.75, { rootX: 9, torso: -1 }], [1, {}]],
        slash: [0.34, 0.5],
      },
      spell: { keys: [[0, {}], [0.3, { torso: -6 }], [0.5, { torso: -3 }], [0.8, { torso: -1 }], [1, {}]] },
      hit: { keys: [[0, {}], [0.1, { rootX: -7, torso: -7 }, EASE.expoOut], [0.35, { rootX: -2, torso: -2 }], [1, {}]] },
      death: {
        // it rears, then topples backwards
        keys: [[0, {}], [0.08, { rootX: -6, torso: -8 }, EASE.expoOut], [0.3, { rootX: -3, torso: -3 }],
          [0.6, { rootX: -8, torso: -24, torsoY: 3 }, EASE.easeIn], [0.7, { rootX: -8, torso: -21, torsoY: 3 }], [1, { rootX: -8, torso: -22, torsoY: 3 }]],
      },
    },
    animate: (p, t, action) => {
      const m = mawState(action);
      p.cape = -OPEN * m.open + shake(m, t, 2.2);
      p.head = p.cape / 2;
      poseTongue(p, tg, m, t, phase);
      // front legs paw at the hero while it is awake, and go stiff in death
      const paw = action?.type === 'attack' || action?.type === 'spell' ? m.pods + 0.4 * m.rattle : 0;
      p.armF = -22 * paw * (0.6 + 0.4 * Math.sin(t * 2 * Math.PI * 5 + phase)) - 25 * m.limp;
      p.armB = -18 * paw * (0.6 + 0.4 * Math.sin(t * 2 * Math.PI * 5 + phase + 2)) - 20 * m.limp;
      p.weapon = 0; p.offhand = 0;
      breathe(p, t, phase, action);
    },
    shapes: [
      // — far posts and legs, in shadow —
      L('torso', 'woodD', 54, 120, 53, 47.5, 3.6),
      L('armB', 'woodD', 90, 99, 90.2, 120, 3.4),
      L('torso', 'woodD', 40.5, 117, 54, 110.5, 2),
      // — hidden in the seat: throat, tongue and fangs —
      ...throat(H, rim, OPEN, 'torso', 'head', 'cape'),
      ...tongueShapes(tg, [4.6, 4, 3.2]),
      ...lower.map(([x, h]) => fang('torso', x, 101.4, h, -1)),
      fang('torso', 83, 99.2, 3.5, -1), fang('torso', 88, 96.7, 3, -1),
      ...upper.map(([x, h]) => fang('cape', x, 100.8, h, 1)),
      fang('cape', 81.5, 99.2, 4, 1), fang('cape', 87, 96.4, 3.5, 1),
      // — the seat board: top, near edge and front edge —
      P('cape', 'wood', [[38, 101], [79, 101], [93, 94], [93, 90], [52, 90], [38, 97]]),
      P('cape', 'woodL', [[38, 97], [79, 97], [93, 90], [52, 90]]),
      L('cape', 'ink', 45, 95.2, 84, 95.2, 0.5), L('cape', 'ink', 50, 92.4, 89, 92.4, 0.45),
      P('cape', 'woodD', [[79, 97], [93, 90], [93, 94], [79, 101]]),
      // — the seat rails that hide the fangs —
      P('torso', 'wood', [[38, 101], [79, 101], [79, 111], [38, 111]]),
      L('torso', 'ink', 39, 107.6, 78, 107.6, 0.5),
      P('torso', 'woodD', [[79, 101], [93, 94], [93, 104], [79, 111]]),
      // — the near back post, back splat with its knots, crest rail and finials —
      L('torso', 'wood', 40, 127, 39.5, 54, 4.6),
      P('torso', 'wood', [[41, 62], [53, 56], [53, 88], [41, 95]]),
      P('torso', 'woodD', [[43.4, 66], [50.6, 62.4], [50.6, 84.6], [43.4, 88.6]]),
      L('torso', 'ink', 47, 70, 47, 85.5, 0.5),
      E('torso', 'knot', 45.6, 71.6, 2.1, 2.9), E('torso', 'knot', 49.4, 69.6, 1.7, 2.5),
      P('torso', 'wood', [[37, 57.5], [55, 48.5], [56.5, 52.5], [38.5, 61.5]]),
      L('torso', 'ink', 39, 59, 55, 51, 0.5),
      C('torso', 'woodL', 38.4, 54.6, 2.5), C('torso', 'woodL', 55, 46, 2.2),
      // — the near front leg, in front of the rails —
      L('armF', 'wood', 77, 103.5, 77.6, 127, 4.4),
      L('torso', 'wood', 40.5, 118, 77, 118, 2.2),
      // — the eyes —
      slitEye('torso', 'eyeGlow', [44.1, 70.4], [47.2, 72.9], 1.4), C('torso', 'eye', 45.9, 71.8, 0.55),
      slitEye('torso', 'eyeGlow', [48.2, 68.6], [50.6, 70.7], 1.2),
    ],
  });
}

// ── The door ─────────────────────────────────────────────────────────────────
/**
 * An arched, iron-strapped dungeon door in its stone frame. Its two plank leaves
 * part down the middle into a vertical maw lined with fangs; knots in the upper
 * planks open as eyes, the iron knocker swings, and a long tongue lashes out of the
 * slit as the whole door lurches forward. Each leaf slides on a pivot far below the
 * floor, so it moves almost straight sideways, a little more at the top.
 */
export function mimicDoor(phase: number): RigDraft {
  const tg: Tongue = {
    bones: ['chA1', 'chA2', 'chA3'], joints: [[53.5, 98], [71.5, 98], [88.5, 98], [104.5, 98]],
    rest: [90, -182, 182], out: [-6, 4, 8], limp: [20, 15, 20],
  };
  const OPEN = 4.2;
  // the doorway: an arch over two jambs
  const arch: Pt[] = [[38, 66], [40.5, 56], [47, 48.5], [54, 44.8], [60, 44], [66, 44.8], [73, 48.5], [79.5, 56], [82, 66]];
  const leafB: Pt[] = [[38, 128], ...arch.slice(0, 5), [60, 128]];
  const leafF: Pt[] = [[60, 128], [60, 44], ...arch.slice(5)].concat([[82, 128]]) as Pt[];
  const rightRow = [[52, 4.5], [61, 6], [70, 4.5], [79, 6], [88, 4.5], [97, 6], [106, 4.5], [115, 5.5]] as const;
  const leftRow = [[56.5, 5], [65.5, 6.5], [74.5, 5], [83.5, 6.5], [92.5, 5], [101.5, 6.5], [110.5, 5], [119, 5.5]] as const;
  const strap = (y: number): Shape[] => [
    L('armB', 'iron', 35.5, y, 54, y, 3), P('armB', 'iron', [[54, y - 1.5], [57.5, y], [54, y + 1.5]]),
    C('armB', 'ink', 41, y, 0.55), C('armB', 'ink', 47, y, 0.55), C('armB', 'ink', 52.5, y, 0.55),
  ];
  return mimicRig({
    accent: '#ff6a3a', art: 1.1, focus: [70, 90], slashAt: [74, 90],
    palette: {
      wood: '#634830', woodD: '#463020', stone: '#5c5852', stoneL: '#7a756d', iron: '#46484c', knot: '#24160c',
      maw: '#16050a', teeth: '#e0d4b2', tongue: '#a63448', eye: '#1c0402', eyeGlow: '#ff6a3a',
    },
    pivots: {
      torso: [88, 128], armB: [38, 220], offhand: [38, 220], armF: [82, 220], weapon: [72, 86.6], ...tonguePivots(tg),
    },
    actions: {
      attack: {
        // crouches into the frame, then lurches forward on its front edge
        keys: [[0, {}], [0.2, { torsoY: 1.5, squash: 0.05 }], [0.4, { rootX: 10, torso: 7, squash: -0.04 }, EASE.expoOut], [0.55, { rootX: 9, torso: 6 }],
          [0.62, { rootX: 11, torso: 8 }, EASE.easeIn], [0.75, { rootX: 6, torso: 3 }], [1, {}]],
        slash: [0.34, 0.5],
      },
      spell: { keys: [[0, {}], [0.3, { squash: 0.04 }], [0.5, { squash: -0.03, torso: 2 }], [0.8, { torso: 1 }], [1, {}]] },
      hit: { keys: [[0, {}], [0.1, { rootX: -6, torsoY: -1.5 }, EASE.expoOut], [0.35, { rootX: -2 }], [1, {}]] },
      death: {
        // shudders, its leaves sag apart and it falls flat on its face
        keys: [[0, {}], [0.08, { rootX: -5 }, EASE.expoOut], [0.3, { rootX: -2, torso: 3 }],
          [0.62, { rootX: 2, torso: 40 }, EASE.easeIn], [0.7, { rootX: 2, torso: 36 }], [1, { rootX: 2, torso: 38 }]],
      },
    },
    animate: (p, t, action) => {
      const m = mawState(action);
      const open = OPEN * m.open;
      p.armB = -open - shake(m, t, 0.5);
      p.armF = open + shake(m, t, 0.5);
      // the left fangs follow their leaf only partway, so they stick out of its edge
      p.offhand = -0.6 * p.armB;
      poseTongue(p, tg, m, t, phase);
      // the knocker sways, and swings wildly when it moves
      const agit = Math.max(m.rattle, m.open, m.limp);
      p.weapon = 3 * Math.sin(t * 1.3 + phase) + 22 * agit * Math.sin(t * 2 * Math.PI * 2.2 + phase);
      breathe(p, t, phase, action);
    },
    shapes: [
      // — the stone frame, and the dark doorway behind the leaves —
      P('torso', 'stone', [[29, 128], [29, 66], [32, 53], [41, 42.5], [53, 37], [67, 37], [79, 42.5], [88, 53], [91, 66], [91, 128]]),
      L('torso', 'ink', 29, 82, 38, 82, 0.6), L('torso', 'ink', 29, 100, 38, 100, 0.6), L('torso', 'ink', 29, 116, 38, 116, 0.6),
      L('torso', 'ink', 82, 90, 91, 90, 0.6), L('torso', 'ink', 82, 108, 91, 108, 0.6), L('torso', 'ink', 82, 74, 91, 74, 0.6),
      L('torso', 'ink', 33.5, 58, 40, 60, 0.6), L('torso', 'ink', 43, 45, 47.5, 49.5, 0.6), L('torso', 'ink', 77, 45, 72.5, 49.5, 0.6), L('torso', 'ink', 86.5, 58, 80, 60, 0.6),
      P('torso', 'stoneL', [[55.5, 37.2], [64.5, 37.2], [63.2, 45], [56.8, 45]]),
      P('torso', 'maw', [[38.5, 125.5], ...arch.map(([x, y]): Pt => [x + (x < 60 ? 0.5 : x > 60 ? -0.5 : 0), y + 0.5]), [81.5, 125.5]]),
      // — the right leaf, with the fangs of its edge tucked behind the left one —
      P('armF', 'wood', leafF),
      L('armF', 'ink', 67.5, 45, 67.5, 127.5, 0.6), L('armF', 'ink', 75, 48, 75, 127.5, 0.6),
      L('armF', 'iron', 61, 74, 81, 74, 2.4), L('armF', 'iron', 61, 114, 81, 114, 2.4),
      C('armF', 'iron', 72, 86.6, 1.9), E('armF', 'knot', 70.4, 63.6, 2.8, 2), L('armF', 'ink', 63, 100, 65, 108, 0.45),
      ...rightRow.map(([y, h]) => fangX('armF', 59.6, y, h, -1)),
      // — the tongue, coiled between the fangs —
      ...tongueShapes(tg, [5, 4.2, 3.4]),
      // — the left leaf, with its fangs and its iron hinges —
      ...leftRow.map(([y, h]) => fangX('offhand', r2(58.6 - h), y, h, 1)),
      P('armB', 'wood', leafB),
      L('armB', 'ink', 45, 51, 45, 127.5, 0.6), L('armB', 'ink', 52.5, 46, 52.5, 127.5, 0.6),
      E('armB', 'knot', 49.6, 63.6, 2.8, 2), L('armB', 'ink', 42, 92, 43.5, 99, 0.45),
      ...strap(62), ...strap(112),
      // — the knocker ring, the eyes —
      C('weapon', 'iron', 72, 92.4, 3.6), C('weapon', 'woodD', 72, 92.4, 2.2),
      slitEye('armB', 'eyeGlow', [46.6, 62.8], [52.6, 64.6], 1.7), C('armB', 'eye', 50.3, 63.9, 0.65),
      slitEye('armF', 'eyeGlow', [73.4, 62.8], [67.4, 64.6], 1.7), C('armF', 'eye', 69.7, 63.9, 0.65),
    ],
  });
}
