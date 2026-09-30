// Holy flames: a calm, persistent aura of yellow and white fire rising behind
// the hero while the paladin holds a prepared Smite. Pure (no DOM): the flame
// points come from the rig's shapes, follow the bones every frame and each
// tongue is rebuilt analytically from the time, so frames are deterministic
// and testable in node. With a WebGL puppet stage the stage paints them right
// before the figure (so the silhouette hides them where they overlap); without
// one they fall back to the fx canvas.

import { applyMatrix, type BoneId, type Matrix, type PuppetRig, type Shape } from './puppet.ts';
import type { Sprite } from './particle-sim.ts';

/** 'holy' for generic Smites; the others, one per Smite card's element. */
export type FlameKind = 'holy' | 'divino' | 'trueno' | 'cegador' | 'fuego' | 'resplandor' | 'destierro';

/** Seconds of the fade in (Smite prepared) and fade out (Smite released). */
export const FLAME_FADE_IN = 0.5;
export const FLAME_FADE_OUT = 0.7;
/** Sprite cap of one aura frame (tongues, their white cores and embers). */
export const MAX_FLAME_SPRITES = 76;

/** Outer tongues: warm golds; cores and embers: whites. */
const OUTER = ['#ffe27a', '#ffd35a', '#ffc94a'];
const CORE = ['#ffffff', '#fffbe8', '#fff6d6'];
const EMBER = ['#fff3c4', '#ffe9a0', '#ffffff'];
export const HOLY_FLAME_COLOURS = [...OUTER, ...CORE, ...EMBER];

export interface FlamePalette { outer: string[]; core: string[]; ember: string[] }
/** Colours of each Smite's flames: tongues, their bright cores and the embers. */
export const FLAME_PALETTES: Record<FlameKind, FlamePalette> = {
  holy: { outer: OUTER, core: CORE, ember: EMBER },
  divino: { outer: ['#ffb52e', '#ffc440', '#f29a1c'], core: ['#fff1c2', '#ffe6a0', '#ffffff'], ember: ['#ffd27a', '#ffe9b8', '#fff4d6'] },
  trueno: { outer: ['#6fb8ff', '#8ccaff', '#4f9dff'], core: ['#ffffff', '#e6f4ff', '#cfe9ff'], ember: ['#cfe9ff', '#ffffff', '#a8d8ff'] },
  cegador: { outer: ['#e9eeff', '#d6def5', '#f4f6ff'], core: ['#ffffff', '#fbfcff', '#f0f4ff'], ember: ['#ffffff', '#e6ecff', '#f7f9ff'] },
  fuego: { outer: ['#ff7a2a', '#ff5a1f', '#ff9a3c'], core: ['#ffe0a0', '#ffc870', '#fff0c8'], ember: ['#ffb15a', '#ff8a3a', '#ffe0a0'] },
  resplandor: { outer: ['#ffc38a', '#ffb07a', '#ffd3a6'], core: ['#fffaf0', '#fff0dc', '#ffffff'], ember: ['#ffe3c4', '#fff4e6', '#ffd0a8'] },
  destierro: { outer: ['#b77bff', '#9b5cf0', '#d0a0ff'], core: ['#fff0c0', '#ffe6a8', '#f4e8ff'], ember: ['#ffd978', '#d8b0ff', '#fff0c0'] },
};

/** Tongues of fire (each drawn as TONGUE_SPRITES sprites) and embers. */
const SLOTS = 14, SLOTS_REDUCED = 7;
/** Thin, fainter tongues drawn in front of the figure, licking its outline, so the
 *  silhouette melts into the fire instead of reading as a cut-out (2 sprites each). */
const FRONT_SLOTS = 7, FRONT_SLOTS_REDUCED = 3;
const EMBERS = 6, EMBERS_REDUCED = 3;
/** Sprites per tongue: three golden segments along its path plus a white core. */
export const TONGUE_SPRITES = 4;
/** Seconds a tongue takes to rise from its birthplace and die out (min, max). */
export const TONGUE_PERIOD: [number, number] = [1.0, 1.6];

/** Where the flames are drawn: behind the figure on its WebGL stage, or on the fx canvas. */
export const flameLayerFor = (hasStage: boolean): 'stage' | 'fx' => (hasStage ? 'stage' : 'fx');

/** Bones whose shapes make the silhouette the flames lick (no weapon, cape or chains). */
const BODY: BoneId[] = ['legB', 'legF', 'torso', 'armB', 'offhand', 'armF', 'head'];

export interface FlameAnchor { bone: BoneId; at: [number, number] }
/** A flame sprite; `front` ones are painted over the figure, the rest behind it. */
export interface FlameSprite extends Sprite { front?: boolean }
export interface ScreenPoint { x: number; y: number }

// ── silhouette points ───────────────────────────────────────────────────────
/** Points on the outline of a shape, in bind coordinates. */
function outlinePoints(s: Shape): [number, number][] {
  if (s.t === 'c') return [[s.x - s.r, s.y], [s.x + s.r, s.y], [s.x, s.y - s.r], [s.x, s.y + s.r]];
  if (s.t === 'e') return [[s.x - s.rx, s.y], [s.x + s.rx, s.y], [s.x, s.y - s.ry], [s.x, s.y + s.ry]];
  if (s.t === 'p') return s.pts.map(([x, y]) => [x, y]);
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1, len = Math.hypot(dx, dy) || 1, r = s.w / 2;
  const nx = (-dy / len) * r, ny = (dx / len) * r, ex = (dx / len) * r, ey = (dy / len) * r;
  return [
    [s.x1 + nx, s.y1 + ny], [s.x1 - nx, s.y1 - ny], [s.x2 + nx, s.y2 + ny], [s.x2 - nx, s.y2 - ny],
    [s.x1 - ex, s.y1 - ey], [s.x2 + ex, s.y2 + ey],
  ];
}

/** Signed-ish depth of a point inside a shape (> 0 inside). */
function depthIn(s: Shape, x: number, y: number): number {
  if (s.t === 'c') return s.r - Math.hypot(x - s.x, y - s.y);
  if (s.t === 'e') {
    const k = Math.hypot((x - s.x) / s.rx, (y - s.y) / s.ry);
    return (1 - k) * Math.min(s.rx, s.ry);
  }
  if (s.t === 'l') {
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1, l2 = dx * dx + dy * dy || 1;
    const u = Math.max(0, Math.min(1, ((x - s.x1) * dx + (y - s.y1) * dy) / l2));
    return s.w / 2 - Math.hypot(x - (s.x1 + u * dx), y - (s.y1 + u * dy));
  }
  // polygon: inside test by ray casting, depth approximated by the nearest edge
  let inside = false, near = Infinity;
  for (let i = 0, j = s.pts.length - 1; i < s.pts.length; j = i++) {
    const [xi, yi] = s.pts[i], [xj, yj] = s.pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    const ex = xi - xj, ey = yi - yj, l2 = ex * ex + ey * ey || 1;
    const u = Math.max(0, Math.min(1, ((x - xj) * ex + (y - yj) * ey) / l2));
    near = Math.min(near, Math.hypot(x - (xj + u * ex), y - (yj + u * ey)));
  }
  return inside ? near : -near;
}

const DIRS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1], [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]];

/** Points on the outer edge of the body where the flames are born: the extreme
 *  points of every body shape in eight directions, keeping only those with open
 *  air just outside them (seen from the body's centre), without near-duplicates.
 *  Deterministic. */
export function flameAnchors(rig: PuppetRig): FlameAnchor[] {
  const body = rig.shapes.filter((s) => s.k !== 'ink' && BODY.includes(s.b));
  const all = body.flatMap(outlinePoints);
  if (!all.length) return [];
  const cx = all.reduce((a, p) => a + p[0], 0) / all.length, cy = all.reduce((a, p) => a + p[1], 0) / all.length;
  const out: FlameAnchor[] = [];
  const air = (x: number, y: number) => !body.some((s) => depthIn(s, x, y) > 0);
  for (const bone of BODY) {
    for (const shape of body.filter((s) => s.b === bone)) {
      const pts = outlinePoints(shape);
      for (const [dx, dy] of DIRS) {
        let best = pts[0], score = -Infinity;
        for (const p of pts) {
          const v = p[0] * dx + p[1] * dy;
          if (v > score) { score = v; best = p; }
        }
        const [x, y] = best;
        const nx = x - cx, ny = y - cy, nl = Math.hypot(nx, ny) || 1;
        if (!air(x + (nx / nl) * 2.5, y + (ny / nl) * 2.5) || !air(x + dx * 2.5, y + dy * 2.5)) continue;
        if (out.some((a) => Math.hypot(a.at[0] - x, a.at[1] - y) < 5)) continue;
        out.push({ bone, at: [Math.round(x * 100) / 100, Math.round(y * 100) / 100] });
      }
    }
  }
  return out;
}

/** Flame points in screen pixels for the current pose (M: viewBox → screen). */
export function flameScreenPoints(anchors: FlameAnchor[], bones: Record<BoneId, Matrix>, M: Matrix): ScreenPoint[] {
  return anchors.map((a) => {
    const [wx, wy] = applyMatrix(bones[a.bone], a.at[0], a.at[1]);
    const [x, y] = applyMatrix(M, wx, wy);
    return { x, y };
  });
}

// ── fade ────────────────────────────────────────────────────────────────────
const smooth = (k: number) => k * k * (3 - 2 * k);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Fade of the aura: in when the Smite is prepared, out when it is released,
 *  always starting from the current level (no pops when toggled mid-fade). */
export class FlameFade {
  private on = false;
  private from = 0;
  private t0 = -Infinity;

  set(on: boolean, t: number) {
    if (on === this.on) return;
    this.from = this.level(t);
    this.on = on;
    this.t0 = t;
  }

  level(t: number): number {
    const k = clamp01((t - this.t0) / (this.on ? FLAME_FADE_IN : FLAME_FADE_OUT));
    const target = this.on ? 1 : 0;
    return k >= 1 ? target : this.from + (target - this.from) * smooth(k);
  }

  /** Still visible (lit, or fading out). */
  active(t: number): boolean {
    return this.on || this.level(t) > 0;
  }
}

// ── frame ───────────────────────────────────────────────────────────────────
/** Deterministic hash of two integers to [0, 1). */
function hash(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x7f4a7c15, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const pick = <T,>(xs: T[], r: number) => xs[Math.floor(r * xs.length) % xs.length];

export interface FlameOptions {
  /** Fade level 0..1 (FlameFade), times the sprite's own opacity. */
  level: number;
  /** Screen pixels per viewBox unit of the sprite. */
  unit: number;
  /** prefers-reduced-motion: fewer tongues and embers. */
  reduced?: boolean;
  /** Colour of the flames (the prepared Smite's); 'holy' by default. */
  kind?: FlameKind;
}

const centreOf = (points: ScreenPoint[]) => {
  let x = 0, y = 0;
  for (const p of points) { x += p.x; y += p.y; }
  return { x: x / points.length, y: y / points.length };
};

/** Fixed traits of tongue `i` in its cycle `k` (birthplace, rise, sway). */
function tongueTraits(i: number, k: number, points: ScreenPoint[], c: ScreenPoint, U: number) {
  const p = points[Math.floor(hash(i * 31 + k, 3) * points.length) % points.length];
  let nx = p.x - c.x, ny = p.y - c.y;
  const nl = Math.hypot(nx, ny) || 1;
  nx /= nl; ny = Math.min(ny / nl, 0.2);
  const h = (n: number) => hash(i + k * 7, n);
  return {
    // born just outside the outline, so the tongue peeks out at the sides
    bx: p.x + nx * 3 * U, by: p.y + ny * 3 * U, nx,
    rise: (32 + h(5) * 16) * U,
    drift: nx * (4 + h(8) * 5) * U,
    amp: (2.5 + h(7) * 1.5) * U,
    freq: 1 + h(9) * 0.4,
    ph: h(6),
    r0: (4.6 + h(4) * 1.6) * U,
  };
}
type Traits = ReturnType<typeof tongueTraits>;

/** Point of a tongue's path at progress u (0 birth … 1 top): it climbs and snakes. */
function pathAt(tr: Traits, u: number): [number, number] {
  const w = Math.PI * 2;
  const x = tr.bx + tr.drift * u + tr.amp * (Math.sin(w * (tr.freq * u + tr.ph)) - Math.sin(w * tr.ph));
  return [x, tr.by - tr.rise * u];
}

function cycleOf(i: number, t: number) {
  const period = TONGUE_PERIOD[0] + hash(i, 1) * (TONGUE_PERIOD[1] - TONGUE_PERIOD[0]);
  const c = t / period + hash(i, 2);
  const cycle = Math.floor(c);
  return { period, cycle, u: c - cycle };
}

/** Tip of tongue `i` at time t (for tests and tuning): its position and cycle. */
export function tongueHead(i: number, t: number, points: ScreenPoint[], unit: number) {
  const { period, cycle, u } = cycleOf(i, t);
  const [x, y] = pathAt(tongueTraits(i, cycle, points, centreOf(points), unit), u);
  return { x, y, u, cycle, period };
}

/** One frame of the holy aura: tongues of fire born all around the silhouette
 *  (feet included) that climb above the shoulders and head while snaking from
 *  side to side, each drawn as three golden segments bending along its path
 *  with a white core, plus a few embers. Every tongue lives in cycles and moves
 *  to another point of the body only while invisible, so the fire never jumps. */
export function holyFlameFrame(t: number, points: ScreenPoint[], o: FlameOptions): FlameSprite[] {
  const level = clamp01(o.level);
  if (level <= 0 || !points.length) return [];
  const U = o.unit, c = centreOf(points);
  const out: FlameSprite[] = [];
  const slots = o.reduced ? SLOTS_REDUCED : SLOTS, embers = o.reduced ? EMBERS_REDUCED : EMBERS;
  const pal = FLAME_PALETTES[o.kind ?? 'holy'];

  for (let i = 0; i < slots; i++) {
    const { cycle: k, u } = cycleOf(i, t);
    const tr = tongueTraits(i, k, points, c, U);
    // envelope: kindles quickly, climbs, then thins out near the top
    const env = smooth(clamp01(u / 0.15)) * (1 - smooth(clamp01((u - 0.6) / 0.4)));
    const r = tr.r0 * (1 - 0.45 * u);
    // segment 0 is the tip (small, highest), segment 2 the wide base below it
    const seg = (j: number) => {
      const uj = Math.max(0, u - j * 0.09);
      const [x, y] = pathAt(tr, uj), [px, py] = pathAt(tr, uj - 0.03);
      return { x, y, ang: Math.atan2(y - py, x - px) };
    };
    for (let j = 0; j < 3; j++) {
      const s = seg(j), size = r * (0.6 + 0.25 * j);
      out.push({
        x: s.x, y: s.y, size, angle: s.ang, stretch: 1.9, shape: 'colmillo',
        colour: pal.outer[j], alpha: level * 0.85 * env, glow: true,
      });
    }
    const b = seg(2), cs = r * 0.55;
    out.push({
      x: b.x, y: b.y, size: cs, angle: b.ang, stretch: 2.3, shape: 'colmillo',
      colour: pick(pal.core, hash(i, k + 13)), alpha: level * 0.8 * env, glow: true,
    });
  }

  // front licks: born just inside the outline and rising over its edge, thin and faint
  const front = o.reduced ? FRONT_SLOTS_REDUCED : FRONT_SLOTS;
  for (let i = 0; i < front; i++) {
    const id = 50 + i;
    const { cycle: k, u } = cycleOf(id, t);
    const base = tongueTraits(id, k, points, c, U);
    const h = (n: number) => hash(id + k * 7, n);
    const tr: Traits = {
      ...base,
      bx: base.bx - base.nx * 6 * U, by: base.by + 2 * U,
      rise: (16 + h(5) * 10) * U, drift: base.nx * (2 + h(8) * 2) * U,
      amp: (1.5 + h(7) * 1) * U, r0: (2.6 + h(4) * 0.8) * U,
    };
    const env = smooth(clamp01(u / 0.2)) * (1 - smooth(clamp01((u - 0.5) / 0.5)));
    const r = tr.r0 * (1 - 0.4 * u);
    for (let j = 0; j < 2; j++) {
      const uj = Math.max(0, u - j * 0.1);
      const [x, y] = pathAt(tr, uj), [px, py] = pathAt(tr, uj - 0.03);
      out.push({
        x, y, size: r * (0.6 + 0.3 * j), angle: Math.atan2(y - py, x - px), stretch: 2.4, shape: 'colmillo',
        colour: j ? pal.core[2] : pal.outer[0], alpha: level * 0.55 * env, glow: true, front: true,
      });
    }
  }

  // embers drift in front: sparks over the outline help blend the figure into the fire
  for (let i = 0; i < embers; i++) {
    const period = 1.7 + hash(i, 21) * 0.8;
    const cc = (t / period) + hash(i, 22);
    const k = Math.floor(cc), u = cc - k;
    const p = points[Math.floor(hash(i * 17 + k, 23) * points.length) % points.length];
    const env = smooth(clamp01(u / 0.15)) * (1 - smooth(clamp01((u - 0.4) / 0.6)));
    const rise = (40 + hash(i + k * 5, 24) * 20) * U;
    const wob = Math.sin((u * 1.6 + hash(i + k * 5, 25)) * Math.PI * 2) * 3 * U;
    out.push({
      x: p.x + wob, y: p.y - rise * u, size: (1.2 + hash(i + k * 5, 26) * 0.8) * U, angle: 0, shape: 'disco',
      colour: pick(pal.ember, hash(i, k + 27)), alpha: level * 0.85 * env, glow: true, front: true,
    });
  }
  return out.slice(0, MAX_FLAME_SPRITES);
}
