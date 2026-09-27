// Pure d20 physics (no DOM, no WebGL): icosahedron geometry, the face numbering
// of a real d20, a seeded rigid-body roll (gravity, bounces against the floor and
// the walls of the zone, friction, angular damping) and the constant
// "compensation" rotation that makes the face that ends up on top show the
// requested number. The trajectory is pure physics; the result only chooses
// which icosahedral symmetry is applied to the numbering, so nothing is corrected
// after the die comes to rest.

export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number]; // x, y, z, w

/** Play area on the floor (y = 0) in world units; the die circumradius is 1. */
export interface RollBox { minX: number; maxX: number; minZ: number; maxZ: number }

export interface RollFrame { t: number; x: Vec3; q: Quat; v: Vec3; w: Vec3 }
export interface RollImpact { t: number; strength: number; x: Vec3 }

export interface RollTrack {
  result: number;
  /** Physical frames (body orientation, without the compensation), ~60 per second. */
  frames: RollFrame[];
  /** Seconds until the die is at rest (the last frame). */
  duration: number;
  /** Floor impacts strong enough to be heard or seen. */
  impacts: RollImpact[];
  /** Body face that ends up on top. */
  restFace: number;
  /** Constant rotation applied to the numbered mesh: display = q(t) · compensation. */
  compensation: Quat;
}

export const ROLL_MIN_S = 1.4;
export const ROLL_MAX_S = 2.2;
export const DEFAULT_BOX: RollBox = { minX: -3.6, maxX: 3.6, minZ: -2.2, maxZ: 2.2 };
/** How far the flat part of each face reaches towards its corners (the rest is bevel). */
export const FACE_INSET = 0.9;

const GRAVITY = 32;
const INERTIA = 0.36; // isotropic (an icosahedron's inertia tensor is a multiple of I)
const STEP = 1 / 300;
const FRAME_EVERY = 5; // one stored frame every 5 steps → 60 fps
const MAX_SIM_S = 3.2;

// ── Vector and quaternion helpers ────────────────────────────────────────────
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: Vec3): Vec3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

export function qMul(a: Quat, b: Quat): Quat {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}
export function qNormalize(q: Quat): Quat {
  const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
}
export function rotateVec(q: Quat, v: Vec3): Vec3 {
  const [x, y, z, w] = q;
  // t = 2 · (q.xyz × v); v' = v + w·t + q.xyz × t
  const tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0]);
  return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
}
export function qSlerp(a: Quat, b: Quat, t: number): Quat {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  let bb = b;
  if (d < 0) { bb = [-b[0], -b[1], -b[2], -b[3]]; d = -d; }
  if (d > 0.9995) {
    return qNormalize([a[0] + (bb[0] - a[0]) * t, a[1] + (bb[1] - a[1]) * t, a[2] + (bb[2] - a[2]) * t, a[3] + (bb[3] - a[3]) * t]);
  }
  const th = Math.acos(d), s = Math.sin(th);
  const wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
  return [a[0] * wa + bb[0] * wb, a[1] * wa + bb[1] * wb, a[2] * wa + bb[2] * wb, a[3] * wa + bb[3] * wb];
}
/** Quaternion of the rotation whose matrix has the given columns. */
function qFromColumns(c0: Vec3, c1: Vec3, c2: Vec3): Quat {
  const m00 = c0[0], m10 = c0[1], m20 = c0[2];
  const m01 = c1[0], m11 = c1[1], m21 = c1[2];
  const m02 = c2[0], m12 = c2[1], m22 = c2[2];
  const tr = m00 + m11 + m22;
  let q: Quat;
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    q = [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, 0.25 * s];
  } else if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
    q = [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s];
  } else if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
    q = [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s];
  } else {
    const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
    q = [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s];
  }
  return qNormalize(q);
}

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

// ── Geometry ─────────────────────────────────────────────────────────────────
export interface D20Geometry {
  /** 12 unit vertices (circumradius 1). */
  vertices: Vec3[];
  /** 20 faces, counter-clockwise seen from outside; vertex 0 is where the number's top points. */
  faces: [number, number, number][];
  normals: Vec3[];
  centroids: Vec3[];
  /** Unit direction, in the face plane, towards the top of its number. */
  faceUp: Vec3[];
  /** The 60 corners of the flat part of the faces (the bevelled die touches with these). */
  corners: Vec3[];
}

let geoCache: D20Geometry | null = null;
export function d20Geometry(): D20Geometry {
  if (geoCache) return geoCache;
  const p = (1 + Math.sqrt(5)) / 2;
  const vertices = ([
    [-1, p, 0], [1, p, 0], [-1, -p, 0], [1, -p, 0],
    [0, -1, p], [0, 1, p], [0, -1, -p], [0, 1, -p],
    [p, 0, -1], [p, 0, 1], [-p, 0, -1], [-p, 0, 1],
  ] as Vec3[]).map(norm);
  const faces: [number, number, number][] = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  const normals: Vec3[] = [], centroids: Vec3[] = [], faceUp: Vec3[] = [], corners: Vec3[] = [];
  for (const f of faces) {
    const [a, b, c] = f.map((i) => vertices[i]);
    let n = norm(cross(sub(b, a), sub(c, a)));
    const g: Vec3 = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
    if (dot(n, g) < 0) { [f[1], f[2]] = [f[2], f[1]]; n = [-n[0], -n[1], -n[2]]; }
    normals.push(n);
    centroids.push(g);
    faceUp.push(norm(sub(a, g)));
    for (const i of f) {
      const v = vertices[i];
      corners.push([g[0] + (v[0] - g[0]) * FACE_INSET, g[1] + (v[1] - g[1]) * FACE_INSET, g[2] + (v[2] - g[2]) * FACE_INSET]);
    }
  }
  geoCache = { vertices, faces, normals, centroids, faceUp, corners };
  return geoCache;
}

export function oppositeFace(f: number): number {
  const { normals } = d20Geometry();
  let best = 0, bestDot = 2;
  normals.forEach((n, i) => { const d = dot(n, normals[f]); if (d < bestDot) { bestDot = d; best = i; } });
  return best;
}

let numberingCache: number[] | null = null;
/** Number engraved on each face: opposite faces add up to 21, like a real d20,
 *  with odd and even numbers alternating so highs and lows are spread out. */
export function d20Numbering(): number[] {
  if (numberingCache) return numberingCache;
  const lows = [1, 3, 5, 7, 9, 2, 4, 6, 8, 10];
  const nums = new Array<number>(20).fill(0);
  let k = 0;
  for (let f = 0; f < 20; f++) {
    if (nums[f]) continue;
    nums[f] = lows[k++];
    nums[oppositeFace(f)] = 21 - nums[f];
  }
  numberingCache = nums;
  return nums;
}

export function faceOfNumber(n: number): number {
  return d20Numbering().indexOf(Math.min(20, Math.max(1, Math.round(n))));
}

/** True when q maps the icosahedron onto itself (every vertex onto a vertex). */
export function isIcosahedralSymmetry(q: Quat): boolean {
  const { vertices } = d20Geometry();
  return vertices.every((v) => {
    const r = rotateVec(q, v);
    return vertices.some((u) => Math.abs(u[0] - r[0]) + Math.abs(u[1] - r[1]) + Math.abs(u[2] - r[2]) < 1e-6);
  });
}

/** Two side-by-side lanes (along z) for rolling with advantage. */
export function advantageLanes(box: RollBox): [RollBox, RollBox] {
  const mid = (box.minZ + box.maxZ) / 2;
  return [{ ...box, maxZ: mid }, { ...box, minZ: mid }];
}

export function rollEnergy(f: RollFrame): number {
  return 0.5 * dot(f.v, f.v) + 0.5 * INERTIA * dot(f.w, f.w) + GRAVITY * f.x[1];
}

// ── Rigid-body simulation ────────────────────────────────────────────────────
interface SimResult { frames: RollFrame[]; impacts: RollImpact[]; rested: boolean; duration: number }

function simulate(seed: number, box: RollBox): SimResult {
  const rng = mulberry32(seed);
  const { corners, normals } = d20Geometry();
  const width = box.maxX - box.minX;
  const midZ = (box.minZ + box.maxZ) / 2, depth = box.maxZ - box.minZ;

  // Throw: enters from one side, a bit above the table, spinning hard
  const dir = rng() < 0.5 ? 1 : -1;
  const x: Vec3 = [
    dir > 0 ? box.minX + 1.1 : box.maxX - 1.1,
    2.6 + rng() * 1.3,
    midZ + (rng() - 0.5) * depth * 0.35,
  ];
  const v: Vec3 = [dir * (0.9 + rng() * 0.5) * width, 0.8 + rng() * 2.2, (rng() - 0.5) * 3];
  let q = qNormalize([rng() - 0.5, rng() - 0.5, rng() - 0.5, rng() - 0.5]);
  const spinAxis = norm([rng() - 0.5, rng() - 0.5, rng() - 0.5]);
  const spin = 11 + rng() * 9;
  const w: Vec3 = [spinAxis[0] * spin, spinAxis[1] * spin, spinAxis[2] * spin];

  // contact planes: normal pointing into the zone and offset (dot(p, n) >= off)
  const planes: { n: Vec3; off: number; floor: boolean }[] = [
    { n: [0, 1, 0], off: 0, floor: true },
    { n: [1, 0, 0], off: box.minX, floor: false },
    { n: [-1, 0, 0], off: -box.maxX, floor: false },
    { n: [0, 0, 1], off: box.minZ, floor: false },
    { n: [0, 0, -1], off: -box.maxZ, floor: false },
  ];

  const frames: RollFrame[] = [];
  const impacts: RollImpact[] = [];
  const push = (t: number) => frames.push({ t, x: [...x] as Vec3, q: [...q] as Quat, v: [...v] as Vec3, w: [...w] as Vec3 });
  push(0);

  const rs: Vec3[] = corners.map(() => [0, 0, 0]);
  let calm = 0;
  const maxSteps = Math.round(MAX_SIM_S / STEP);
  for (let step = 1; step <= maxSteps; step++) {
    const t = step * STEP;
    // integrate (semi-implicit Euler)
    v[1] -= GRAVITY * STEP;
    x[0] += v[0] * STEP; x[1] += v[1] * STEP; x[2] += v[2] * STEP;
    const dq = qMul([w[0], w[1], w[2], 0], q);
    q = qNormalize([q[0] + 0.5 * dq[0] * STEP, q[1] + 0.5 * dq[1] * STEP, q[2] + 0.5 * dq[2] * STEP, q[3] + 0.5 * dq[3] * STEP]);

    for (let i = 0; i < corners.length; i++) rs[i] = rotateVec(q, corners[i]);

    let onFloor = false;
    for (let iter = 0; iter < 3; iter++) {
      for (const pl of planes) {
        // the die cannot touch a plane its centre is more than a radius away from
        if (dot(x, pl.n) - pl.off > 1) continue;
        for (let i = 0; i < rs.length; i++) {
          const r = rs[i];
          const dist = (x[0] + r[0]) * pl.n[0] + (x[1] + r[1]) * pl.n[1] + (x[2] + r[2]) * pl.n[2] - pl.off;
          if (dist >= 0) continue;
          if (pl.floor) onFloor = true;
          const wr = cross(w, r);
          const vel: Vec3 = [v[0] + wr[0], v[1] + wr[1], v[2] + wr[2]];
          const vn = dot(vel, pl.n);
          if (vn >= 0) continue;
          const e = iter === 0 && vn < -1.2 ? (pl.floor ? 0.42 : 0.5) : 0;
          const rn = cross(r, pl.n);
          const jn = (-(1 + e) * vn) / (1 + dot(rn, rn) / INERTIA);
          v[0] += jn * pl.n[0]; v[1] += jn * pl.n[1]; v[2] += jn * pl.n[2];
          w[0] += (rn[0] * jn) / INERTIA; w[1] += (rn[1] * jn) / INERTIA; w[2] += (rn[2] * jn) / INERTIA;
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
            const rt = cross(r, td);
            const jt = Math.min(vtl / (1 + dot(rt, rt) / INERTIA), (pl.floor ? 0.5 : 0.3) * jn);
            v[0] -= jt * td[0]; v[1] -= jt * td[1]; v[2] -= jt * td[2];
            w[0] -= (rt[0] * jt) / INERTIA; w[1] -= (rt[1] * jt) / INERTIA; w[2] -= (rt[2] * jt) / INERTIA;
          }
        }
      }
    }
    // push the body out of the deepest penetration of each plane
    for (const pl of planes) {
      if (dot(x, pl.n) - pl.off > 1) continue;
      let deepest = 0;
      for (const r of rs) {
        const dist = (x[0] + r[0]) * pl.n[0] + (x[1] + r[1]) * pl.n[1] + (x[2] + r[2]) * pl.n[2] - pl.off;
        if (dist < deepest) deepest = dist;
      }
      if (deepest < 0) { x[0] -= deepest * pl.n[0]; x[1] -= deepest * pl.n[1]; x[2] -= deepest * pl.n[2]; }
    }

    // damping: air drag is tiny; rolling on the table bleeds energy, and more so
    // as the roll gets old, so it always settles inside the time budget
    const assist = t > 1.25 ? (t - 1.25) * 9 : 0;
    const kw = onFloor ? 1.1 + assist : 0.05;
    const kv = onFloor ? 0.5 + assist * 0.6 : 0.02;
    const fw = Math.exp(-kw * STEP), fv = Math.exp(-kv * STEP);
    w[0] *= fw; w[1] *= fw; w[2] *= fw;
    v[0] *= fv; v[2] *= fv;
    if (!onFloor) v[1] *= fv;

    // at rest: slow, touching the floor and lying flat on a face
    let flat = -1;
    for (const n of normals) flat = Math.max(flat, rotateVec(q, n)[1]);
    if (onFloor && len(v) < 0.09 && len(w) < 0.3 && flat > 0.9995) calm++;
    else calm = 0;
    if (calm >= 6) {
      v[0] = v[1] = v[2] = 0;
      w[0] = w[1] = w[2] = 0;
      push(t);
      return { frames, impacts, rested: true, duration: t };
    }
    if (step % FRAME_EVERY === 0) push(t);
  }
  return { frames, impacts, rested: false, duration: MAX_SIM_S };
}

/** Searches, from `seed`, the first throw that comes to rest inside the time budget. */
function settledRoll(seed: number, box: RollBox): SimResult {
  let best: SimResult | null = null;
  const lo = ROLL_MIN_S + 0.05, hi = ROLL_MAX_S - 0.05, mid = (lo + hi) / 2;
  for (let k = 0; k < 80; k++) {
    const sim = simulate((Math.imul(seed | 0, 1013) + k * 7919) >>> 0, box);
    if (sim.rested && sim.duration >= lo && sim.duration <= hi && sim.impacts.length >= 2) return sim;
    if (sim.rested && (!best || Math.abs(sim.duration - mid) < Math.abs(best.duration - mid))) best = sim;
  }
  return best ?? simulate(seed, box);
}

/** Rotation that carries the numbered face `from` onto the body face `to`,
 *  choosing among the 3 possible ones the one whose number reads most upright
 *  for a camera looking towards −z once the die lies in `restQ`. */
function compensationFor(from: number, to: number, restQ: Quat): Quat {
  const { faces, vertices, normals, centroids, faceUp } = d20Geometry();
  const nk = normals[from], uk = faceUp[from];
  const bk = cross(nk, uk);
  let best: Quat = [0, 0, 0, 1], bestScore = -Infinity;
  for (const vi of faces[to]) {
    const nf = normals[to];
    const uf = norm(sub(vertices[vi], centroids[to]));
    const bf = cross(nf, uf);
    // C = F_to · F_fromᵀ, with F = [n | u | b]
    const col = (j: number): Vec3 => [
      nf[0] * nk[j] + uf[0] * uk[j] + bf[0] * bk[j],
      nf[1] * nk[j] + uf[1] * uk[j] + bf[1] * bk[j],
      nf[2] * nk[j] + uf[2] * uk[j] + bf[2] * bk[j],
    ];
    const c = qFromColumns(col(0), col(1), col(2));
    const score = -rotateVec(restQ, rotateVec(c, uk))[2];
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return best;
}

export function simulateRoll(opts: { result: number; seed: number; box?: RollBox }): RollTrack {
  const box = opts.box ?? DEFAULT_BOX;
  const sim = settledRoll(opts.seed, box);
  const { normals } = d20Geometry();
  const rest = sim.frames[sim.frames.length - 1].q;
  let restFace = 0, up = -2;
  normals.forEach((n, i) => { const y = rotateVec(rest, n)[1]; if (y > up) { up = y; restFace = i; } });
  const compensation = compensationFor(faceOfNumber(opts.result), restFace, rest);
  return { result: opts.result, frames: sim.frames, duration: sim.duration, impacts: sim.impacts, restFace, compensation };
}

/** Display pose at time t (the numbered mesh, compensation included). */
export function poseAt(track: RollTrack, t: number): { x: Vec3; q: Quat } {
  const fr = track.frames;
  const last = fr[fr.length - 1];
  if (t >= track.duration || fr.length < 2) return { x: [...last.x] as Vec3, q: qMul(last.q, track.compensation) };
  const i = Math.min(fr.length - 2, Math.max(0, Math.floor(t / (STEP * FRAME_EVERY))));
  const a = fr[i], b = fr[i + 1];
  const k = Math.min(1, Math.max(0, (t - a.t) / ((b.t - a.t) || 1)));
  const x: Vec3 = [a.x[0] + (b.x[0] - a.x[0]) * k, a.x[1] + (b.x[1] - a.x[1]) * k, a.x[2] + (b.x[2] - a.x[2]) * k];
  return { x, q: qMul(qSlerp(a.q, b.q, k), track.compensation) };
}
