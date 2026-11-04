// Pure coin physics (no DOM, no WebGL): a seeded rigid-body toss of a thin disc
// (gravity, bounces against the table and the walls of the zone, friction and
// the real inertia of a disc, so it precesses and wobbles on its rim before it
// falls flat) plus the constant "compensation" rotation that makes the side the
// engine already decided end up on top. The trajectory is pure physics: the
// result only picks one of the disc's symmetries (flip it over, turn it about its
// axis so the drawing reads upright), so nothing turns after the coin rests.
// Object space: the coin axis is y, heads (cara) is the +y cap, tails (cruz) −y.

import { qMul, qNormalize, qSlerp, rotateVec, type Quat, type RollBox, type Vec3 } from './d20-physics.ts';

export { rotateVec };
export type { Quat, Vec3 };

export interface TossFrame { t: number; x: Vec3; q: Quat; v: Vec3; w: Vec3 }
export interface TossImpact { t: number; strength: number; x: Vec3 }

export interface TossTrack {
  heads: boolean;
  /** Physical frames (body orientation, without the compensation), ~60 per second. */
  frames: TossFrame[];
  /** Seconds until the coin is at rest (the last frame). */
  duration: number;
  /** Table impacts strong enough to be heard or seen. */
  impacts: TossImpact[];
  /** Constant rotation applied to the drawn coin: display = q(t) · compensation. */
  compensation: Quat;
}

export const COIN_RADIUS = 1;
export const COIN_HALF_THICKNESS = 0.075;
export const TOSS_MIN_S = 1.5;
export const TOSS_MAX_S = 2.6;
export const DEFAULT_TOSS_BOX: RollBox = { minX: -3.6, maxX: 3.6, minZ: -2.2, maxZ: 2.2 };

const GRAVITY = 32;
const STEP = 1 / 300;
const FRAME_EVERY = 5; // one stored frame every 5 steps → 60 fps
const MAX_SIM_S = 3.4;
/** Whole turns the coin makes in the air before it first touches the table. */
export const AIR_TURNS_MIN = 3.2;
export const AIR_TURNS_MAX = 4.2;
/** Highest the centre of the coin ever gets (the camera keeps it on screen). */
export const TOSS_PEAK = 3.4;
const RIM_POINTS = 36;
// principal moments of a uniform disc of mass 1: about its axis and about a diameter
const I_AXIS = 0.5 * COIN_RADIUS * COIN_RADIUS;
const I_DIAM = 0.25 * COIN_RADIUS * COIN_RADIUS + ((2 * COIN_HALF_THICKNESS) ** 2) / 12;

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const conj = (q: Quat): Quat => [-q[0], -q[1], -q[2], q[3]];

/** Small deterministic PRNG (mulberry32). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Contact points: the two rims of the coin (object space). */
const RIM: Vec3[] = [];
for (const y of [COIN_HALF_THICKNESS, -COIN_HALF_THICKNESS]) {
  for (let i = 0; i < RIM_POINTS; i++) {
    const a = (i / RIM_POINTS) * Math.PI * 2;
    RIM.push([Math.cos(a) * COIN_RADIUS, y, Math.sin(a) * COIN_RADIUS]);
  }
}

/** Object-space normal of a side: heads is the +y cap, tails the −y cap. */
export function faceNormal(heads: boolean): Vec3 {
  return heads ? [0, 1, 0] : [0, -1, 0];
}
/** Object-space direction, in the plane of each side, towards the top of its drawing. */
export function faceTop(_heads: boolean): Vec3 {
  return [0, 0, -1];
}

/** Inverse world inertia applied to a vector: R · I⁻¹ · Rᵀ · v. */
function invInertia(q: Quat, v: Vec3): Vec3 {
  const b = rotateVec(conj(q), v);
  return rotateVec(q, [b[0] / I_DIAM, b[1] / I_AXIS, b[2] / I_DIAM]);
}
/** World inertia applied to a vector: R · I · Rᵀ · v. */
function inertia(q: Quat, v: Vec3): Vec3 {
  const b = rotateVec(conj(q), v);
  return rotateVec(q, [b[0] * I_DIAM, b[1] * I_AXIS, b[2] * I_DIAM]);
}

/** Height of the lowest point of the coin. */
export function lowestPoint(q: Quat, x: Vec3): number {
  let low = Infinity;
  for (const p of RIM) low = Math.min(low, x[1] + rotateVec(q, p)[1]);
  return low;
}

export function tossEnergy(f: TossFrame): number {
  return 0.5 * dot(f.v, f.v) + 0.5 * dot(f.w, inertia(f.q, f.w)) + GRAVITY * f.x[1];
}

/** True when q maps the disc onto itself (its axis onto ±axis). */
export function isCoinSymmetry(q: Quat): boolean {
  return Math.abs(Math.abs(rotateVec(q, [0, 1, 0])[1]) - 1) < 1e-9;
}

// ── Rigid-body simulation ────────────────────────────────────────────────────
interface SimResult { frames: TossFrame[]; impacts: TossImpact[]; rested: boolean; duration: number }

function simulate(seed: number, box: RollBox): SimResult {
  const rng = mulberry32(seed);
  const width = box.maxX - box.minX;
  const midZ = (box.minZ + box.maxZ) / 2, depth = box.maxZ - box.minZ;

  // Throw: flicked in from one side like a thumb flip, nearly flat, spinning about a
  // horizontal diameter fast enough for 3–4 whole turns before it first lands
  const dir = rng() < 0.5 ? 1 : -1;
  const x: Vec3 = [dir > 0 ? box.minX + 1.2 : box.maxX - 1.2, 1.8 + rng() * 0.5, midZ + (rng() - 0.5) * depth * 0.35];
  const v: Vec3 = [dir * (0.75 + rng() * 0.3) * width, 5 + rng() * 1.2, (rng() - 0.5) * 2.5];
  // time until the centre comes down to about half a radius over the table
  const flight = (v[1] + Math.sqrt(v[1] * v[1] + 2 * GRAVITY * (x[1] - 0.55))) / GRAVITY;
  const turns = AIR_TURNS_MIN + rng() * (AIR_TURNS_MAX - AIR_TURNS_MIN);
  const flip = (turns * Math.PI * 2) / flight;
  const heading = rng() * Math.PI * 2;
  const tilt = (rng() - 0.5) * 0.3;
  // nearly flat: a small tilt about the spin axis, then any turn about the vertical
  let q = qNormalize(qMul([0, Math.sin(heading / 2), 0, Math.cos(heading / 2)], [Math.sin(tilt / 2), 0, 0, Math.cos(tilt / 2)]));
  // spin about the body x axis (a diameter, horizontal at the start) plus a little twirl about the coin axis
  const twirl = (rng() - 0.5) * 4;
  const w0 = rotateVec(q, [flip, twirl, 0]);
  // angular momentum is what the impulses change; w follows from it and the orientation
  const L: Vec3 = inertia(q, w0);
  let w: Vec3 = w0;

  // contact planes: normal pointing into the zone and offset (dot(p, n) >= off)
  const planes: { n: Vec3; off: number; floor: boolean }[] = [
    { n: [0, 1, 0], off: 0, floor: true },
    { n: [1, 0, 0], off: box.minX, floor: false },
    { n: [-1, 0, 0], off: -box.maxX, floor: false },
    { n: [0, 0, 1], off: box.minZ, floor: false },
    { n: [0, 0, -1], off: -box.maxZ, floor: false },
  ];

  const frames: TossFrame[] = [];
  const impacts: TossImpact[] = [];
  const push = (t: number) => frames.push({ t, x: [...x] as Vec3, q: [...q] as Quat, v: [...v] as Vec3, w: [...w] as Vec3 });
  push(0);

  const rs: Vec3[] = RIM.map(() => [0, 0, 0]);
  // impulse j along direction d at offset r
  const applyImpulse = (r: Vec3, d: Vec3, j: number) => {
    v[0] += j * d[0]; v[1] += j * d[1]; v[2] += j * d[2];
    const rd = cross(r, d);
    L[0] += rd[0] * j; L[1] += rd[1] * j; L[2] += rd[2] * j;
    w = invInertia(q, L);
  };
  const effMass = (r: Vec3, d: Vec3) => 1 / (1 + dot(cross(invInertia(q, cross(r, d)), r), d));

  let calm = 0;
  const maxSteps = Math.round(MAX_SIM_S / STEP);
  for (let step = 1; step <= maxSteps; step++) {
    const t = step * STEP;
    // integrate (semi-implicit Euler); torque-free precession comes from L being kept
    v[1] -= GRAVITY * STEP;
    x[0] += v[0] * STEP; x[1] += v[1] * STEP; x[2] += v[2] * STEP;
    w = invInertia(q, L);
    const dq = qMul([w[0], w[1], w[2], 0], q);
    q = qNormalize([q[0] + 0.5 * dq[0] * STEP, q[1] + 0.5 * dq[1] * STEP, q[2] + 0.5 * dq[2] * STEP, q[3] + 0.5 * dq[3] * STEP]);
    w = invInertia(q, L);

    for (let i = 0; i < RIM.length; i++) rs[i] = rotateVec(q, RIM[i]);

    let onFloor = false;
    for (let iter = 0; iter < 3; iter++) {
      for (const pl of planes) {
        if (dot(x, pl.n) - pl.off > COIN_RADIUS + 0.05) continue;
        for (let i = 0; i < rs.length; i++) {
          const r = rs[i];
          const dist = (x[0] + r[0]) * pl.n[0] + (x[1] + r[1]) * pl.n[1] + (x[2] + r[2]) * pl.n[2] - pl.off;
          if (dist >= 0) continue;
          if (pl.floor) onFloor = true;
          const wr = cross(w, r);
          const vel: Vec3 = [v[0] + wr[0], v[1] + wr[1], v[2] + wr[2]];
          const vn = dot(vel, pl.n);
          if (vn >= 0) continue;
          const e = iter === 0 && vn < -1.2 ? (pl.floor ? 0.38 : 0.45) : 0;
          const jn = -(1 + e) * vn * effMass(r, pl.n);
          applyImpulse(r, pl.n, jn);
          if (pl.floor && iter === 0 && vn < -1.5) {
            const last = impacts[impacts.length - 1];
            if (last && t - last.t < 0.07) last.strength = Math.max(last.strength, -vn);
            else impacts.push({ t, strength: -vn, x: [x[0] + r[0], 0, x[2] + r[2]] });
          }
          // Coulomb friction on the tangential velocity
          const wr2 = cross(w, r);
          const vel2: Vec3 = [v[0] + wr2[0], v[1] + wr2[1], v[2] + wr2[2]];
          const vn2 = dot(vel2, pl.n);
          const vt: Vec3 = [vel2[0] - vn2 * pl.n[0], vel2[1] - vn2 * pl.n[1], vel2[2] - vn2 * pl.n[2]];
          const vtl = len(vt);
          if (vtl > 1e-6) {
            const td: Vec3 = [vt[0] / vtl, vt[1] / vtl, vt[2] / vtl];
            const jt = Math.min(vtl * effMass(r, td), (pl.floor ? 0.45 : 0.25) * jn);
            applyImpulse(r, td, -jt);
          }
        }
      }
    }
    // push the body out of the deepest penetration of each plane
    for (const pl of planes) {
      if (dot(x, pl.n) - pl.off > COIN_RADIUS + 0.05) continue;
      let deepest = 0;
      for (const r of rs) {
        const dist = (x[0] + r[0]) * pl.n[0] + (x[1] + r[1]) * pl.n[1] + (x[2] + r[2]) * pl.n[2] - pl.off;
        if (dist < deepest) deepest = dist;
      }
      if (deepest < 0) { x[0] -= deepest * pl.n[0]; x[1] -= deepest * pl.n[1]; x[2] -= deepest * pl.n[2]; }
    }

    // damping: tiny air drag; sliding and rolling on the table bleed energy, more so
    // as the toss gets old, so it always settles inside the time budget
    const assist = t > 1.4 ? (t - 1.4) * 8 : 0;
    const kw = onFloor ? 0.9 + assist : 0.03;
    const kv = onFloor ? 0.6 + assist * 0.6 : 0.02;
    const fw = Math.exp(-kw * STEP), fv = Math.exp(-kv * STEP);
    L[0] *= fw; L[1] *= fw; L[2] *= fw;
    w = invInertia(q, L);
    v[0] *= fv; v[2] *= fv;
    if (!onFloor) v[1] *= fv;

    // at rest: slow, touching the table and lying flat on one side
    const flat = Math.abs(rotateVec(q, [0, 1, 0])[1]);
    if (onFloor && len(v) < 0.09 && len(w) < 0.3 && flat > 0.9995) calm++;
    else calm = 0;
    if (calm >= 6) {
      v[0] = v[1] = v[2] = 0;
      w = [0, 0, 0];
      push(t);
      return { frames, impacts, rested: true, duration: t };
    }
    if (step % FRAME_EVERY === 0) push(t);
  }
  return { frames, impacts, rested: false, duration: MAX_SIM_S };
}

/** Searches, from `seed`, the first toss that comes to rest inside the time budget. */
function settledToss(seed: number, box: RollBox): SimResult {
  let best: SimResult | null = null;
  const lo = TOSS_MIN_S + 0.05, hi = TOSS_MAX_S - 0.05, mid = (lo + hi) / 2;
  for (let k = 0; k < 80; k++) {
    const sim = simulate((Math.imul(seed | 0, 1013) + k * 7919) >>> 0, box);
    if (sim.rested && sim.duration >= lo && sim.duration <= hi && sim.impacts.length >= 2
      && sim.impacts[sim.impacts.length - 1].strength < sim.impacts[0].strength) return sim;
    if (sim.rested && (!best || Math.abs(sim.duration - mid) < Math.abs(best.duration - mid))) best = sim;
  }
  return best ?? simulate(seed, box);
}

/** Symmetry of the disc that shows `heads` on top and its drawing upright (towards −z)
 *  once the coin lies in `restQ`: a flip about a diameter if needed, then a turn about the axis. */
function compensationFor(heads: boolean, restQ: Quat): Quat {
  const bodyHeadsUp = rotateVec(restQ, [0, 1, 0])[1] > 0;
  const flip: Quat = bodyHeadsUp === heads ? [0, 0, 0, 1] : [1, 0, 0, 0];
  const base = qMul(restQ, flip);
  const top = faceTop(heads);
  // turning by φ about y: top → cos φ · top + sin φ · (y × top)
  const a = rotateVec(base, top), b = rotateVec(base, cross([0, 1, 0], top));
  const phi = Math.atan2(-b[2], -a[2]);
  return qNormalize(qMul(flip, [0, Math.sin(phi / 2), 0, Math.cos(phi / 2)]));
}

export function simulateToss(opts: { heads: boolean; seed: number; box?: RollBox }): TossTrack {
  const sim = settledToss(opts.seed, opts.box ?? DEFAULT_TOSS_BOX);
  const rest = sim.frames[sim.frames.length - 1].q;
  return { heads: opts.heads, frames: sim.frames, duration: sim.duration, impacts: sim.impacts, compensation: compensationFor(opts.heads, rest) };
}

/** Display pose at time t (the drawn coin, compensation included). */
export function coinPoseAt(track: TossTrack, t: number): { x: Vec3; q: Quat } {
  const fr = track.frames;
  const last = fr[fr.length - 1];
  if (t >= track.duration || fr.length < 2) return { x: [...last.x] as Vec3, q: qMul(last.q, track.compensation) };
  const i = Math.min(fr.length - 2, Math.max(0, Math.floor(t / (STEP * FRAME_EVERY))));
  const a = fr[i], b = fr[i + 1];
  const k = Math.min(1, Math.max(0, (t - a.t) / ((b.t - a.t) || 1)));
  const x: Vec3 = [a.x[0] + (b.x[0] - a.x[0]) * k, a.x[1] + (b.x[1] - a.x[1]) * k, a.x[2] + (b.x[2] - a.x[2]) * k];
  return { x, q: qMul(qSlerp(a.q, b.q, k), track.compensation) };
}

