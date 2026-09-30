// Holy flames: a calm, persistent aura of yellow and white fire licking the
// hero's silhouette while the paladin holds a prepared Smite. Pure (no DOM):
// the flame points come from the rig's shapes, follow the bones every frame and
// each tongue is rebuilt analytically from the time, so frames are
// deterministic and testable in node. PuppetSprite feeds the result to the fx
// canvas (same WebGL pass as particles and spells, canvas 2D without WebGL2).

import { applyMatrix, type BoneId, type Matrix, type PuppetRig, type Shape } from './puppet.ts';
import type { Sprite } from './particle-sim.ts';

export type FlameKind = 'holy';

/** Seconds of the fade in (Smite prepared) and fade out (Smite released). */
export const FLAME_FADE_IN = 0.5;
export const FLAME_FADE_OUT = 0.7;
/** Sprite cap of one aura frame (tongues, their white cores and embers). */
export const MAX_FLAME_SPRITES = 48;

/** Outer tongues: warm golds; cores and embers: whites. */
const OUTER = ['#ffd35a', '#ffe27a', '#ffc94a'];
const CORE = ['#ffffff', '#fffbe8', '#fff6d6'];
const EMBER = ['#fff3c4', '#ffe9a0', '#ffffff'];
export const HOLY_FLAME_COLOURS = [...OUTER, ...CORE, ...EMBER];

/** Tongue slots (each draws an outer tongue plus a white core) and embers. */
const SLOTS = 20, SLOTS_REDUCED = 10;
const EMBERS = 5, EMBERS_REDUCED = 2;

/** Bones whose shapes make the silhouette the flames lick (no weapon, cape or chains). */
const BODY: BoneId[] = ['legB', 'legF', 'torso', 'armB', 'offhand', 'armF', 'head'];

export interface FlameAnchor { bone: BoneId; at: [number, number] }
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
}

/** One frame of the holy aura: tongues of fire born on the silhouette points
 *  that rise, sway and peel off while shrinking, each with a white core, plus a
 *  few embers drifting up. Every slot lives in cycles and moves to another
 *  point of the body only while invisible, so the fire never jumps. */
export function holyFlameFrame(t: number, points: ScreenPoint[], o: FlameOptions): Sprite[] {
  const level = clamp01(o.level);
  if (level <= 0 || !points.length) return [];
  const u0 = o.unit;
  let cx = 0, cy = 0;
  for (const p of points) { cx += p.x; cy += p.y; }
  cx /= points.length; cy /= points.length;
  const out: Sprite[] = [];
  const slots = o.reduced ? SLOTS_REDUCED : SLOTS, embers = o.reduced ? EMBERS_REDUCED : EMBERS;

  for (let i = 0; i < slots; i++) {
    const period = 0.95 + hash(i, 1) * 0.5;
    const c = (t / period) + hash(i, 2);
    const k = Math.floor(c), u = c - k;
    // this cycle's birthplace, size and sway (fixed for the whole cycle)
    const p = points[Math.floor(hash(i * 31 + k, 3) * points.length) % points.length];
    let nx = p.x - cx, ny = p.y - cy;
    const nl = Math.hypot(nx, ny) || 1;
    nx /= nl; ny = Math.min(ny / nl, 0.2);
    const r = (2.4 + hash(i + k * 7, 4) * 1.2) * u0;
    const rise = (6 + hash(i + k * 7, 5) * 5) * u0;
    const ph = hash(i + k * 7, 6);
    const lateral = (hash(i + k * 7, 7) - 0.5) * 3 * u0;
    // envelope: kindles quickly, licks upwards, then thins out
    const env = smooth(clamp01(u / 0.22)) * (1 - smooth(clamp01((u - 0.55) / 0.45)));
    const push = (1 + u * 2.2) * u0;
    const sway = Math.sin((u * 0.9 + ph) * Math.PI * 2) * 1.3 * u0;
    const bx = p.x + nx * push + lateral + sway, by = p.y + ny * push - rise * u;
    const ang = -Math.PI / 2 + nx * 0.45 + Math.sin((u * 1.2 + ph) * Math.PI * 2 + 1) * 0.16;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const size = r * (0.55 + 0.45 * env) * (1 - 0.35 * u);
    const stretch = 2.1 + 0.8 * env;
    // the fang shape grows from its base at -x: shift the centre along the tongue
    const L = (stretch - 1) * size;
    out.push({
      x: bx + dx * L, y: by + dy * L, size, angle: ang, stretch, shape: 'colmillo',
      colour: pick(OUTER, hash(i, k + 11)), alpha: level * 0.5 * env, glow: true,
    });
    const cs = size * 0.52, cst = stretch + 0.35, cl = (cst - 1) * cs;
    out.push({
      x: bx + dx * (cl + size * 0.25), y: by + dy * (cl + size * 0.25), size: cs, angle: ang, stretch: cst, shape: 'colmillo',
      colour: pick(CORE, hash(i, k + 13)), alpha: level * 0.42 * env, glow: true,
    });
  }

  for (let i = 0; i < embers; i++) {
    const period = 1.7 + hash(i, 21) * 0.8;
    const c = (t / period) + hash(i, 22);
    const k = Math.floor(c), u = c - k;
    const p = points[Math.floor(hash(i * 17 + k, 23) * points.length) % points.length];
    const env = smooth(clamp01(u / 0.15)) * (1 - smooth(clamp01((u - 0.4) / 0.6)));
    const rise = (18 + hash(i + k * 5, 24) * 12) * u0;
    const wob = Math.sin((u * 1.6 + hash(i + k * 5, 25)) * Math.PI * 2) * 2 * u0;
    out.push({
      x: p.x + wob, y: p.y - rise * u, size: (0.5 + hash(i + k * 5, 26) * 0.35) * u0, angle: 0, shape: 'disco',
      colour: pick(EMBER, hash(i, k + 27)), alpha: level * 0.6 * env, glow: true,
    });
  }
  return out.slice(0, MAX_FLAME_SPRITES);
}
