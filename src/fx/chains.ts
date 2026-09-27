// Secondary motion for hair, cloth, fur and tails: spring chains hung from any
// bone. Pure maths (no DOM), so it runs the same for the WebGL stage and the
// SVG fallback, and in node for the smoke test.
//
// Each chain is a short rope of joints in viewBox space. Every fixed step
// (SIM_STEP) each joint is pulled by a damped spring towards where the rigid
// animation puts it, plus gravity and a breeze; then position-based length
// constraints keep the segments rigid and the joint bend limited. The result is
// turned back into bone angle offsets that the renderers apply like any other
// pose value. A fixed step with interpolated targets and rendered state keeps
// it deterministic and (within a small tolerance) independent of the frame rate.

import {
  CHAIN_BONES, CHAIN_SEGMENTS, CHAIN_SLOTS, applyMatrix,
  type BoneId, type ChainBone, type ChainSlot, type ChainSpec, type Matrix, type Pose, type PuppetRig, type Shape,
} from './puppet.ts';

export { CHAIN_BONES, CHAIN_SEGMENTS, CHAIN_SLOTS, type ChainBone, type ChainSlot, type ChainSpec };

type Pt = [number, number];

/** Fixed simulation step (seconds). */
export const SIM_STEP = 1 / 120;
/** Longest frame simulated at once; longer gaps (a hidden tab) are skipped. */
export const MAX_STEPS = 12;
/** Default max bend of a joint against the animated pose (degrees). */
export const DEFAULT_LIMIT = 75;
export const CHAIN_DEFAULTS = { freq: 3.2, damping: 0.32, taper: 0.35, sag: 0.8, sway: 1, limit: DEFAULT_LIMIT } as const;

const DEG = 180 / Math.PI;

/** Problems in a rig's chain declarations (empty when they are fine). */
export function validateChains(rig: PuppetRig): string[] {
  const errors: string[] = [];
  const seen = new Set<ChainSlot>();
  for (const c of rig.chains ?? []) {
    const where = `chain ${c.slot}`;
    if (!CHAIN_SLOTS.includes(c.slot)) { errors.push(`${where}: unknown slot`); continue; }
    if (seen.has(c.slot)) errors.push(`${where}: slot used twice`);
    seen.add(c.slot);
    if (c.joints.length < 2 || c.joints.length > CHAIN_SEGMENTS + 1) errors.push(`${where}: needs 2..${CHAIN_SEGMENTS + 1} joints`);
    for (let i = 1; i < c.joints.length; i++) {
      const d = Math.hypot(c.joints[i][0] - c.joints[i - 1][0], c.joints[i][1] - c.joints[i - 1][1]);
      if (!(d > 0.5)) errors.push(`${where}: segment ${i} is too short`);
    }
    const parent = c.parent ?? 'torso';
    const own = CHAIN_SLOTS.indexOf(c.slot);
    const parentSlot = CHAIN_SLOTS.findIndex((s) => (CHAIN_BONES[s] as BoneId[]).includes(parent));
    if (parentSlot >= own) errors.push(`${where}: may only hang from a bone of an earlier chain`);
    if (parentSlot >= 0 && !(rig.chains ?? []).some((o) => o.slot === CHAIN_SLOTS[parentSlot])) errors.push(`${where}: parent chain is not declared`);
    const { freq = CHAIN_DEFAULTS.freq, damping = CHAIN_DEFAULTS.damping, taper = CHAIN_DEFAULTS.taper } = c;
    if (!(freq >= 0.3 && freq <= 14)) errors.push(`${where}: freq must be 0.3..14 Hz`);
    if (!(damping >= 0 && damping <= 2)) errors.push(`${where}: damping must be 0..2`);
    if (!(taper >= 0 && taper <= 0.9)) errors.push(`${where}: taper must be 0..0.9`);
  }
  return errors;
}

interface ChainRun {
  spec: ChainSpec;
  bones: ChainBone[];
  /** Joints including the anchor (index 0). */
  n: number;
  omega: Float64Array;
  zeta: number;
  sag: number;
  sway: number;
  limit: number;
  phase: number;
  // flat [x0, y0, x1, y1, …] arrays
  x: Float64Array;
  v: Float64Array;
  prev: Float64Array;
  from: Float64Array;
  to: Float64Array;
  target: Float64Array;
  render: Float64Array;
}

/** Simulation state of every chain of one puppet. */
export interface ChainState {
  runs: ChainRun[];
  /** Time not simulated yet (less than one step). */
  acc: number;
  /** Simulated time, drives the breeze. */
  time: number;
  primed: boolean;
}

export function createChainState(rig: PuppetRig): ChainState {
  const runs: ChainRun[] = (rig.chains ?? []).map((spec, i) => {
    const n = Math.min(spec.joints.length, CHAIN_SEGMENTS + 1);
    const freq = Math.min(14, Math.max(0.3, spec.freq ?? CHAIN_DEFAULTS.freq));
    const taper = Math.min(0.9, Math.max(0, spec.taper ?? CHAIN_DEFAULTS.taper));
    const omega = new Float64Array(n);
    for (let k = 1; k < n; k++) omega[k] = 2 * Math.PI * freq * (1 - taper * (n > 2 ? (k - 1) / (n - 2) : 0));
    const buf = () => new Float64Array(n * 2);
    return {
      spec, bones: CHAIN_BONES[spec.slot].slice(0, n - 1), n, omega,
      zeta: Math.min(2, Math.max(0, spec.damping ?? CHAIN_DEFAULTS.damping)),
      sag: spec.sag ?? CHAIN_DEFAULTS.sag, sway: spec.sway ?? CHAIN_DEFAULTS.sway,
      limit: (spec.limit ?? CHAIN_DEFAULTS.limit) / DEG, phase: rig.phase + i * 1.7,
      x: buf(), v: buf(), prev: buf(), from: buf(), to: buf(), target: buf(), render: buf(),
    };
  });
  return { runs, acc: 0, time: 0, primed: false };
}

/** Rigid (animated) positions of a chain's joints for the given bone matrices. */
function rigidJoints(r: ChainRun, bones: Record<BoneId, Matrix>, out: Float64Array) {
  const j = r.spec.joints;
  for (let k = 0; k < r.n; k++) {
    const [x, y] = applyMatrix(bones[r.bones[Math.max(0, k - 1)]], j[k][0], j[k][1]);
    out[k * 2] = x; out[k * 2 + 1] = y;
  }
}

/** Signed angle (radians) turning direction a into direction b. */
const angleBetween = (ax: number, ay: number, bx: number, by: number) => Math.atan2(ax * by - ay * bx, ax * bx + ay * by);

/** Places each joint at its segment length from the previous one, bending at most `limit` per joint. */
function constrain(r: ChainRun, p: Float64Array, t: Float64Array) {
  let prevDev = 0;
  p[0] = t[0]; p[1] = t[1];
  for (let k = 1; k < r.n; k++) {
    const tx = t[k * 2] - t[k * 2 - 2], ty = t[k * 2 + 1] - t[k * 2 - 1];
    const dx = p[k * 2] - p[k * 2 - 2], dy = p[k * 2 + 1] - p[k * 2 - 1];
    let dev = dx * dx + dy * dy > 1e-12 ? angleBetween(tx, ty, dx, dy) : prevDev;
    dev = Math.min(prevDev + r.limit, Math.max(prevDev - r.limit, dev));
    dev = Math.min(r.limit, Math.max(-r.limit, dev));
    const c = Math.cos(dev), s = Math.sin(dev);
    p[k * 2] = p[k * 2 - 2] + c * tx - s * ty;
    p[k * 2 + 1] = p[k * 2 - 1] + s * tx + c * ty;
    prevDev = dev;
  }
}

/** One fixed step of a chain towards `t` (the rigid joints at this instant). */
function stepRun(r: ChainRun, t: Float64Array, h: number, time: number) {
  const { x, v, prev } = r;
  prev.set(x);
  const last = r.n - 1;
  // breeze: a slow swell plus a faster flutter, travelling down the chain
  const swell = 0.25 + 0.5 * Math.sin(2 * Math.PI * 0.37 * time + r.phase);
  for (let k = 1; k < r.n; k++) {
    const w = r.omega[k], w2 = w * w, reach = k / last;
    const gust = swell + 0.25 * Math.sin(2 * Math.PI * 0.91 * time + 2.1 * r.phase - k * 0.6);
    const ax = w2 * (t[k * 2] - x[k * 2]) - 2 * r.zeta * w * v[k * 2] - r.sway * w2 * reach * gust;
    const ay = w2 * (t[k * 2 + 1] - x[k * 2 + 1]) - 2 * r.zeta * w * v[k * 2 + 1]
      + r.sag * w2 * reach + 0.2 * r.sway * w2 * reach * Math.sin(2 * Math.PI * 0.53 * time + r.phase + k);
    v[k * 2] += ax * h; v[k * 2 + 1] += ay * h;
    x[k * 2] += v[k * 2] * h; x[k * 2 + 1] += v[k * 2 + 1] * h;
  }
  constrain(r, x, t);
  // position-based dynamics: velocities follow the constrained positions
  for (let k = 0; k < r.n * 2; k++) v[k] = (x[k] - prev[k]) / h;
}

/** Rigid bone matrices `back` seconds before the current frame (lets the solver
 *  follow fast strikes exactly instead of interpolating between frames). */
export type RigidSampler = (back: number) => Record<BoneId, Matrix>;

/**
 * Advances every chain by dt seconds towards the rigid pose given by `bones`
 * (the puppet's matrices without chain physics) and returns the angle offsets
 * (degrees) to add to the chain bones of the pose. With a sampler, each fixed
 * step aims at the rigid pose of its own instant; without one, the targets are
 * interpolated between the previous frame and this one.
 */
export function stepChains(state: ChainState, bones: Record<BoneId, Matrix>, dt: number, sample?: RigidSampler): Partial<Pose> {
  const out: Partial<Pose> = {};
  const h = SIM_STEP;
  for (const r of state.runs) rigidJoints(r, bones, r.to);
  if (!state.primed) {
    for (const r of state.runs) { r.x.set(r.to); r.prev.set(r.to); r.from.set(r.to); r.v.fill(0); }
    state.primed = true;
    dt = 0;
  }
  dt = Math.min(Math.max(0, dt), MAX_STEPS * h);
  state.acc += dt;
  while (state.acc >= h - 1e-12) {
    state.acc = Math.max(0, state.acc - h);
    state.time += h;
    if (sample && state.acc > 1e-9) {
      const at = sample(state.acc);
      for (const r of state.runs) { rigidJoints(r, at, r.target); stepRun(r, r.target, h, state.time); }
      continue;
    }
    // where this step falls inside the frame, to interpolate the rigid targets
    const u = dt > 0 ? Math.min(1, Math.max(0, 1 - state.acc / dt)) : 1;
    for (const r of state.runs) {
      for (let k = 0; k < r.n * 2; k++) r.target[k] = r.from[k] + (r.to[k] - r.from[k]) * u;
      stepRun(r, r.target, h, state.time);
    }
  }
  const a = state.acc / h;
  for (const r of state.runs) {
    r.from.set(r.to);
    // rendered state: between the last two steps, then re-anchored on the current rigid pose
    for (let k = 0; k < r.n * 2; k++) r.render[k] = r.prev[k] + (r.x[k] - r.prev[k]) * a;
    constrain(r, r.render, r.to);
    let prevDev = 0;
    for (let k = 1; k < r.n; k++) {
      const dev = angleBetween(
        r.to[k * 2] - r.to[k * 2 - 2], r.to[k * 2 + 1] - r.to[k * 2 - 1],
        r.render[k * 2] - r.render[k * 2 - 2], r.render[k * 2 + 1] - r.render[k * 2 - 1],
      );
      out[r.bones[k - 1]] = (dev - prevDev) * DEG;
      prevDev = dev;
    }
  }
  return out;
}

// ── Shape helpers ────────────────────────────────────────────────────────────

export interface StrandOptions {
  /** End of the last segment: a point (hair, default), flat (sleeve) or ragged (tattered cloth). */
  tip?: 'point' | 'flat' | 'tattered';
  /** Teeth of a tattered end (default 3). */
  teeth?: number;
  /** How far each segment reaches back over the previous joint, as a share of its width (default 0.6). */
  overlap?: number;
}

const round = (v: number) => Math.round(v * 100) / 100;

/**
 * One tapered polygon per chain segment, each on its own bone, so a lock of
 * hair, a scarf end or a cape panel bends with the chain. `widths` gives the
 * full width at every joint (same length as `spec.joints`). Segments overlap
 * a little across the joints so no gap opens when the chain bends.
 */
export function strandShapes(spec: ChainSpec, key: string, widths: number[], opts: StrandOptions = {}): Shape[] {
  const bones = CHAIN_BONES[spec.slot];
  const j = spec.joints, out: Shape[] = [];
  const overlap = opts.overlap ?? 0.6;
  for (let k = 1; k < j.length && k - 1 < bones.length; k++) {
    const [ax, ay] = j[k - 1], [bx, by] = j[k];
    const len = Math.hypot(bx - ax, by - ay) || 1, ux = (bx - ax) / len, uy = (by - ay) / len;
    const nx = -uy, ny = ux;
    const w0 = (widths[k - 1] ?? 2) / 2, w1 = (widths[k] ?? widths[k - 1] ?? 2) / 2;
    const back = k > 1 ? w0 * 2 * overlap : 0;
    const sx = ax - ux * back, sy = ay - uy * back;
    const pts: Pt[] = [[sx + nx * w0, sy + ny * w0]];
    const tip = k === j.length - 1 ? opts.tip ?? 'point' : 'flat';
    if (tip === 'flat') pts.push([bx + nx * w1, by + ny * w1], [bx - nx * w1, by - ny * w1]);
    else if (tip === 'point') {
      pts.push([bx + nx * w1 * 0.5, by + ny * w1 * 0.5], [bx + ux * Math.max(w1, 0.8), by + uy * Math.max(w1, 0.8)], [bx - nx * w1 * 0.5, by - ny * w1 * 0.5]);
    } else {
      // ragged hem: teeth of alternating depth across the end
      const teeth = Math.max(2, Math.min(5, opts.teeth ?? 3));
      for (let i = 0; i <= teeth * 2; i++) {
        const f = 1 - (i / (teeth * 2)) * 2;
        const depth = i % 2 === 0 ? w1 * 0.9 * (1 - 0.25 * ((i / 2) % 2)) : -w1 * 0.25;
        pts.push([bx + nx * w1 * f + ux * depth, by + ny * w1 * f + uy * depth]);
      }
    }
    pts.push([sx - nx * w0, sy - ny * w0]);
    out.push({ t: 'p', b: bones[k - 1], k: key, pts: pts.map(([x, y]) => [round(x), round(y)] as Pt) });
  }
  return out;
}
