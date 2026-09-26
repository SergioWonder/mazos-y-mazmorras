// Articulated bat/dragon wings: shoulder → forearm → 2-3 long fingers, with the
// membrane split into panels hung from each finger so they overlap when the
// wing folds. Pure maths (no DOM): the builder turns a few landmarks into
// shapes and joint data; the motion adds a travelling wave from the shoulder
// to the tip, spreads the wing on the downstroke and folds it on the upstroke.

import type { ActionProgress, BoneId, Matrix, Pose, PuppetRig, Shape, WingJoints, WingSide } from './puppet.ts';

type Pt = [number, number];

/** Bone chain of each wing: shoulder, forearm and fingers (leading first). */
type WingBone = Extract<BoneId, keyof Pose>;
export const WING_BONES: Record<WingSide, [WingBone, WingBone, WingBone, WingBone, WingBone]> = {
  B: ['wingB', 'wingBArm', 'wingBF1', 'wingBF2', 'wingBF3'],
  F: ['wingF', 'wingFArm', 'wingFF1', 'wingFF2', 'wingFF3'],
};

/** Flapping frequency of winged creatures (Hz). */
export const WING_HZ = 1.1;
/** Fold at rest (0 = fully spread as drawn, 1 = tucked). */
const REST_FOLD = 0.2;
/** Extra fold at the top of the upstroke. */
const STROKE_FOLD = 0.35;
/** Full fold: share of the elbow angle closed (and its cap), wrist bend (degrees) and fan closing. */
const ELBOW_FLEX = 0.6, ELBOW_MAX = 80, WRIST_BEND = 60, FAN_CLOSE = 0.8;

/** Landmarks of a wing in bind pose (viewBox units, the wing fully spread). */
export interface WingSpec {
  side: WingSide;
  shoulder: Pt;
  elbow: Pt;
  wrist: Pt;
  /** Finger tips from the leading (top) finger to the trailing one: 2 or 3. */
  tips: Pt[];
  /** Where the trailing edge of the membrane meets the body. */
  root: Pt;
  /** Palette keys: membrane, bones and the thumb claw. */
  membrane?: string;
  bone: string;
  claw?: string;
  /** Bone thickness. */
  width?: number;
  /** Depth of the scalloped edges, as a fraction of each edge. */
  sag?: number;
}

const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const lerp = (a: Pt, b: Pt, u: number): Pt => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
const len = (v: Pt) => Math.hypot(v[0], v[1]);
const angleOf = (v: Pt) => (Math.atan2(v[1], v[0]) * 180) / Math.PI;
/** Signed angle (degrees, -180..180] that turns direction a into direction b. */
const turn = (a: Pt, b: Pt) => ((angleOf(b) - angleOf(a) + 540) % 360) - 180;
const round = (p: Pt): Pt => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100];

/** Concave, festooned edge from a to b bowing towards `towards` (end points excluded). */
function scallop(a: Pt, b: Pt, towards: Pt, sag: number): Pt[] {
  const d = sub(b, a), l = len(d);
  let n: Pt = [-d[1] / l, d[0] / l];
  const m = lerp(a, b, 0.5);
  if ((towards[0] - m[0]) * n[0] + (towards[1] - m[1]) * n[1] < 0) n = [-n[0], -n[1]];
  // the billow sits a little closer to the trailing finger, like stretched skin
  return [0.2, 0.42, 0.62, 0.82].map((u) => {
    const k = Math.sin(Math.PI * Math.pow(u, 0.85)) * sag * l;
    const p = lerp(a, b, u);
    return round([p[0] + n[0] * k, p[1] + n[1] * k]);
  });
}

const poly = (b: BoneId, k: string, pts: Pt[]): Shape => ({ t: 'p', b, k, pts: pts.map(round) });
const line = (b: BoneId, k: string, p: Pt, q: Pt, w: number): Shape => ({ t: 'l', b, k, x1: p[0], y1: p[1], x2: q[0], y2: q[1], w });

/** Shapes, pivots and joint data of one articulated wing. */
export function buildWing(spec: WingSpec): { shapes: Shape[]; pivots: Partial<Record<BoneId, Pt>>; joints: WingJoints } {
  const { side, shoulder, elbow, wrist, tips, root } = spec;
  const [sBone, aBone, ...fBones] = WING_BONES[side];
  const fingers = fBones.slice(0, tips.length);
  const k = spec.membrane ?? 'wing', bk = spec.bone, w = spec.width ?? 1.2, sag = spec.sag ?? 0.22;
  const shapes: Shape[] = [];
  // membrane, innermost first so the leading panels end up on top
  // the inner panels reach well into the finger panels so no hole opens when the fan closes
  const last = tips.length - 1;
  shapes.push(poly(sBone, k, [shoulder, elbow, lerp(elbow, wrist, 0.5), lerp(elbow, root, 0.7), root]));
  shapes.push(poly(aBone, k, [elbow, wrist, lerp(wrist, tips[last], 0.45), lerp(lerp(root, tips[last], 0.3), wrist, 0.35), root, lerp(elbow, root, 0.3)]));
  shapes.push(poly(fingers[last], k, [wrist, tips[last], ...scallop(tips[last], root, wrist, sag * 0.8), root, lerp(wrist, root, 0.5)]));
  for (let i = last - 1; i >= 0; i--) {
    shapes.push(poly(fingers[i], k, [wrist, tips[i], ...scallop(tips[i], tips[i + 1], wrist, sag), tips[i + 1]]));
  }
  // skeleton: humerus, forearm, knuckle, thumb claw and long tapering fingers
  shapes.push(line(sBone, bk, shoulder, elbow, w * 1.25));
  shapes.push(line(aBone, bk, elbow, wrist, w * 1.1), { t: 'c', b: aBone, k: bk, x: elbow[0], y: elbow[1], r: w * 0.85 });
  fingers.forEach((b, i) => {
    const mid = lerp(wrist, tips[i], 0.55);
    shapes.push(line(b, bk, wrist, mid, w * 0.9), line(b, bk, mid, tips[i], w * 0.6));
  });
  shapes.push({ t: 'c', b: aBone, k: bk, x: wrist[0], y: wrist[1], r: w * 0.95 });
  const out = sub(wrist, elbow), ol = len(out), u: Pt = [out[0] / ol, out[1] / ol];
  const claw: Pt = [wrist[0] + u[0] * 5, wrist[1] + u[1] * 5];
  shapes.push(poly(aBone, spec.claw ?? 'horn', [[wrist[0] - u[1] * 1.3, wrist[1] + u[0] * 1.3], claw, [wrist[0] + u[1] * 1.3, wrist[1] - u[0] * 1.3]]));

  // folding zig-zags like a real wing: the elbow flexes towards the humerus
  // (swinging the hand back), the wrist bends the other way and the fan
  // closes onto the trailing finger, so the panels slide under each other
  const fold: Partial<Record<BoneId, number>> = {};
  const flex = turn(sub(wrist, elbow), sub(shoulder, elbow));
  fold[aBone] = Math.sign(flex) * Math.min(Math.abs(flex) * ELBOW_FLEX, ELBOW_MAX);
  const bend = -Math.sign(flex) * WRIST_BEND, trail = sub(tips[last], wrist);
  fingers.forEach((b, i) => { fold[b] = turn(sub(tips[i], wrist), trail) * FAN_CLOSE + bend; });
  // positive rotations lower the wing when its tips lie in front of the shoulder
  const meanX = tips.reduce((s, t) => s + t[0], 0) / tips.length;
  const pivots: Partial<Record<BoneId, Pt>> = { [sBone]: shoulder, [aBone]: elbow };
  for (const b of fBones) pivots[b] = wrist;
  return {
    shapes, pivots,
    joints: { stroke: meanX >= shoulder[0] ? 1 : -1, shoulder, fold, tips: fingers.map((b, i) => ({ bone: b, at: tips[i] })) },
  };
}

/** Both wings of a rig at once: back shapes, front shapes, pivots and joints. */
export function buildWings(back: WingSpec, front: WingSpec) {
  const b = buildWing(back), f = buildWing(front);
  return { back: b.shapes, front: f.shapes, pivots: { ...b.pivots, ...f.pivots }, joints: { B: b.joints, F: f.joints } };
}

/** 0 → 1 → 1 → 0 envelope over q with the given corners. */
function plateau(q: number, a: number, b: number, c: number, d: number): number {
  if (q <= a || q >= d) return 0;
  if (q < b) { const u = (q - a) / (b - a); return u * u * (3 - 2 * u); }
  if (q <= c) return 1;
  const u = (d - q) / (d - c);
  return u * u * (3 - 2 * u);
}

/**
 * Adds the articulated flapping to a pose: the shoulder leads, the forearm and
 * fingers follow with growing delay (a wave running to the tip, with a little
 * whip at the end), the wing spreads on the downstroke and folds on the way up.
 * Actions override the fold: attacks and spells open the wings wide, hits tuck
 * them in and death lets them collapse.
 */
export function articulateWings(rig: PuppetRig, p: Pose, t: number, action: ActionProgress | null): void {
  const wings = rig.wings;
  if (!wings) return;
  const amp = (rig.flap ?? 0) * (action ? 0.5 : 1);
  let open = 0, tuck = 0, slump = 0, spread = 0;
  if (action) {
    const q = action.p;
    if (action.type === 'attack' || action.type === 'spell') { open = plateau(q, 0, 0.3, 0.72, 1); spread = open; }
    else if (action.type === 'hit') tuck = plateau(q, 0, 0.1, 0.35, 1);
    else { slump = Math.min(1, Math.max(0, (q - 0.05) / 0.45)); }
  }
  for (const side of ['B', 'F'] as const) {
    const j = wings[side];
    if (!j) continue;
    const [sBone, aBone, f1, f2, f3] = WING_BONES[side];
    const th = t * 2 * Math.PI * WING_HZ + rig.phase + (side === 'B' ? -0.35 : 0);
    const s = j.stroke;
    const a = amp * (side === 'B' ? 0.9 : 1);
    // travelling wave: each segment lags the previous one
    const wave = [Math.sin(th), 0.38 * Math.sin(th - 0.8), 0.3 * Math.sin(th - 1.5)];
    const whip = 0.1 * Math.sin(2 * th - 2.4) + 0.05 * Math.sin(3 * th - 3.1);
    const strokeFold = 0.5 * (1 - Math.cos(th - 0.45));
    let fold = REST_FOLD + STROKE_FOLD * strokeFold * Math.min(1, (rig.flap ?? 0) / 10);
    fold += (0 - fold) * open;
    fold += (1 - fold) * tuck;
    fold += (0.85 - fold) * slump;
    // death: fingers flop down with a damped bounce
    const flop = slump > 0 ? 18 * slump + 9 * Math.sin((action!.p - 0.05) * 22) * Math.exp(-action!.p * 5) * slump : 0;
    // the beat swings around a slightly open V so both wings never merge overhead
    p[sBone] += s * (a * (wave[0] + (side === 'B' ? 0.8 : -0.2)) + 8 * spread - 6 * tuck);
    p[aBone] += s * a * wave[1] + fold * (j.fold[aBone] ?? 0) + s * flop * 0.5;
    const tipKick = s * (a * wave[2] + a * whip + flop);
    for (const f of [f1, f2, f3]) p[f] += tipKick + fold * (j.fold[f] ?? 0);
  }
}

/** Widest reach of a wing: distance from the shoulder to its farthest finger tip. */
export function wingSpan(rig: PuppetRig, bones: Record<BoneId, Matrix>, side: WingSide): number {
  const j = rig.wings?.[side];
  if (!j) return 0;
  const at = (m: Matrix, [x, y]: Pt): Pt => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const sh = at(bones[WING_BONES[side][0]], j.shoulder);
  return Math.max(...j.tips.map((tp) => len(sub(at(bones[tp.bone], tp.at), sh))));
}
