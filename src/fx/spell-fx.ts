// Spell VFX: one hand-authored animated composition per card fx key (roots that
// coil around the target, a breaking wave, three claw furrows, a falling rune…).
// Pure (no DOM): every frame is rebuilt analytically from the elapsed time and a
// seed, so the effects are deterministic and testable in node. The fx canvas
// draws the returned sprites in the same WebGL pass as the particles.

import type { ParticleShape, Sprite } from './particle-sim.ts';
import { FLAME_PALETTES, type FlameKind } from './holy-flames.ts';

export interface Box { x: number; y: number; w: number; h: number }
export interface Point { x: number; y: number }
export interface SpellCtx {
  /** Screen box of whoever receives the effect (left, top, width, height). */
  box: Box;
  /** Caster or source point (breath, rays, howls, leaf gusts, waves). */
  from?: Point;
  /** Where the receiver faces: the hero +1 (right), enemies -1. */
  facing?: 1 | -1;
  /** Colour override (the Beholder's chromatic rays). */
  tint?: string;
  seed?: number;
  /** prefers-reduced-motion: builders draw fewer particles. */
  reduced?: boolean;
  /** Viewport size: effects that travel far (volley darts) keep inside it. */
  view?: { w: number; h: number };
  /** Index of this cast within a volley (0, 1, 2…), so each dart takes its own lane. */
  lane?: number;
}
export type Anchor = 'self' | 'target';
export type Build = (g: Painter, u: number, c: SpellCtx, dur: number) => void;
export interface SpellDef {
  /** Seconds. */
  duration: number;
  /** End of the anticipation and of the impact, as fractions of the duration. */
  phases: [number, number];
  /** Default receiver: the hero (defences, buffs) or the target (attacks, curses). */
  anchor: Anchor;
  build: Build;
  /** Sprite cap of one frame (MAX_SPELL_SPRITES by default; the rare cards get more). */
  cap?: number;
  /** Optional brief screen shake at a fraction of the duration (skipped with reduced motion). */
  shake?: { at: number; level: 1 | 2 | 3 };
  /** Who shows it when the card has no natural receiver: the hero, or every enemy. */
  receiver?: 'hero' | 'enemies';
  /** Its hits come in a quick volley (Magic Missile's darts): the next hit is cast `gap`
   *  seconds later and each hit's feedback waits for the impact at `phases[0]`. */
  volley?: { gap: number };
}

export const MAX_SPELL_SPRITES = 220;
/** Sprite cap of one frame of a rare or unique card's own sequence. */
export const MAX_CARD_SPRITES = 420;
/** Particles plus spell sprites alive at once (the peak of a rare card). */
export const MAX_LIVE_SPRITES = 900;
/** Share of the particles drawn with prefers-reduced-motion. */
export const REDUCED_DENSITY = 0.4;

// ── easing helpers ──────────────────────────────────────────────────────────
export const TAU = Math.PI * 2;
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const span = (u: number, a: number, b: number) => clamp01((u - a) / (b - a));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeOut = (v: number) => 1 - (1 - v) ** 3;
export const easeIn = (v: number) => v * v * v;
export const smooth = (v: number) => v * v * (3 - 2 * v);
export const easeInOut = (v: number) => (v < 0.5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2);
export const easeOutBack = (v: number) => 1 + 2.70158 * (v - 1) ** 3 + 1.70158 * (v - 1) ** 2;
/** 0 → 1 → 0 over [a, b]. */
export const bell = (u: number, a: number, b: number) => { const s = span(u, a, b); return s <= 0 || s >= 1 ? 0 : Math.sin(Math.PI * s); };
/** Rotation for a 'gota' (tip up at angle 0) so its tip trails behind the velocity. */
export const dropAngle = (vx: number, vy: number) => Math.atan2(-vx, vy);

export function hash01(seed: number, n: number): number {
  let h = (Math.imul(seed | 0, 374761393) + Math.imul(n | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Collects the sprites of one frame, with drawing helpers in screen pixels. */
export class Painter {
  readonly out: Sprite[] = [];
  /** Semantic events of the frame (a bolt landing…), for tests and sync. */
  readonly marks: { kind: string; x: number; y: number }[] = [];
  private readonly seed: number;
  private readonly cap: number;
  private readonly density: number;
  constructor(seed: number, cap = MAX_SPELL_SPRITES, density = 1) { this.seed = seed; this.cap = cap; this.density = density; }
  /** Stable random in [0, 1) for element n. */
  r(n: number) { return hash01(this.seed, n); }
  /** How many of `count` particles to draw (fewer with reduced motion). */
  n(count: number) { return Math.max(1, Math.round(count * this.density)); }
  mark(kind: string, x: number, y: number) { this.marks.push({ kind, x, y }); }
  put(x: number, y: number, size: number, shape: ParticleShape, colour: string, alpha: number,
    angle = 0, glow = true, stretch?: number, param?: number) {
    if (this.out.length >= this.cap || !(alpha > 0.004) || !(size > 0.05) || !Number.isFinite(x + y + angle)) return;
    // param -1 flags the particle shapes as spell sprites (pixel-sized glow)
    this.out.push({ x, y, size, shape, colour, alpha: Math.min(1, alpha), angle, glow, stretch, param: param ?? -1 });
  }
  dot(x: number, y: number, r: number, colour: string, a: number, glow = true) { this.put(x, y, r, 'disco', colour, a, 0, glow); }
  /** Capsule from (x1,y1) to (x2,y2); taper 1 = lens (thin at both ends). */
  seg(x1: number, y1: number, x2: number, y2: number, thick: number, colour: string, a: number, taper = 0, glow = true) {
    const half = thick / 2, len = Math.hypot(x2 - x1, y2 - y1);
    this.put((x1 + x2) / 2, (y1 + y2) / 2, half, 'capsula', colour, a, Math.atan2(y2 - y1, x2 - x1), glow, len / (2 * half) + 1, taper);
  }
  /** Fang: wide base at (x1,y1), sharp tip at (x2,y2). */
  fang(x1: number, y1: number, x2: number, y2: number, thick: number, colour: string, a: number, glow = true) {
    const half = thick / 2, len = Math.hypot(x2 - x1, y2 - y1);
    this.put((x1 + x2) / 2, (y1 + y2) / 2, half, 'colmillo', colour, a, Math.atan2(y2 - y1, x2 - x1), glow, len / (2 * half) + 1);
  }
  strip(pts: Point[], thick: (i: number) => number, colour: string, a: number, glow = true, taper = 0) {
    for (let i = 1; i < pts.length; i++) this.seg(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, thick(i), colour, a, taper, glow);
  }
  /** Elliptic ring with radii rx, ry and line thickness. */
  ring(x: number, y: number, rx: number, ry: number, thick: number, colour: string, a: number, glow = true) {
    if (ry <= 0.5 || rx <= 0.5) return;
    this.put(x, y, ry, 'anillo', colour, a, 0, glow, rx / ry, Math.min(0.5, thick / (2 * ry)));
  }
  /** Circular arc of radius r centred on direction `dir`, half-span in radians. */
  arc(x: number, y: number, r: number, thick: number, dir: number, halfSpan: number, colour: string, a: number) {
    if (r <= 0.5) return;
    this.put(x, y, r, 'arco', colour, a, dir, true, Math.min(0.45, thick / (2 * r)), halfSpan);
  }
  crescent(x: number, y: number, r: number, angle: number, colour: string, a: number, bite = 0.45) { this.put(x, y, r, 'media-luna', colour, a, angle, true, 1, bite); }
  rune(x: number, y: number, r: number, angle: number, colour: string, a: number) { this.put(x, y, r, 'runa', colour, a, angle, true); }
  shield(x: number, y: number, r: number, squash: number, colour: string, a: number) { this.put(x, y, r, 'escudo', colour, a, 0, true, squash); }
  drop(x: number, y: number, r: number, angle: number, colour: string, a: number, glow = true) { this.put(x, y, r, 'gota', colour, a, angle, glow); }
  bubble(x: number, y: number, r: number, colour: string, a: number) { this.put(x, y, r, 'burbuja', colour, a, 0, true); }
  /** Soft beam of light from (x1,y1) to (x2,y2). */
  beam(x1: number, y1: number, x2: number, y2: number, width: number, colour: string, a: number) {
    const half = width / 2, len = Math.hypot(x2 - x1, y2 - y1);
    this.put((x1 + x2) / 2, (y1 + y2) / 2, half, 'haz', colour, a, Math.atan2(y2 - y1, x2 - x1), true, Math.max(1, len / (2 * half)));
  }
  skull(x: number, y: number, r: number, colour: string, a: number) { this.put(x, y, r, 'calavera', colour, a, 0, true); }
  star(x: number, y: number, r: number, colour: string, a: number, angle = 0) { this.put(x, y, r / 2, 'estrella', colour, a, angle, true); }
  leaf(x: number, y: number, r: number, angle: number, colour: string, a: number, glow = false) { this.put(x, y, r / 1.4, 'hoja', colour, a, angle, glow); }
  heart(x: number, y: number, r: number, colour: string, a: number) { this.put(x, y, r, 'corazon', colour, a, 0, true); }
  /** Streak of length `len` along `angle`. */
  spark(x: number, y: number, len: number, angle: number, colour: string, a: number) { this.put(x, y, len / 3.6, 'chispa', colour, a, angle, true); }
}

/** Shared geometry of the receiver's box. */
export function geo(c: SpellCtx) {
  const b = c.box;
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  return {
    b, cx, cy, W: b.w, H: b.h, ground: b.y + b.h,
    R: Math.max(b.w, b.h) * 0.5,
    k: Math.min(1.8, Math.max(0.6, Math.min(b.w, b.h) / 120)),
    face: c.facing ?? 1,
    /** Horizontal direction from the caster to the target (+1 = rightwards). */
    dir: c.from ? Math.sign(cx - c.from.x) || 1 : 1,
  };
}

/** Ballistic point: start + v·τ + ½·g·τ² (px, px/s, seconds). */
export const fly = (x: number, y: number, vx: number, vy: number, tau: number, grav: number) =>
  ({ x: x + vx * tau, y: y + vy * tau + 0.5 * grav * tau * tau });

/** Path of vine i (of n) growing from the ground and coiling around the box.
 *  `growth` 0..1 is how much of the vine is out; `squeeze` < 1 tightens it. */
export function vinePath(box: Box, i: number, n: number, growth: number, squeeze: number): Point[] {
  const cx = box.x + box.w / 2;
  const x0 = box.x + box.w * (0.12 + 0.76 * (n > 1 ? i / (n - 1) : 0.5));
  const y0 = box.y + box.h * 1.04;
  const ph = i * 2.1 + 0.6, turns = 1.4 + 0.15 * (i % 2);
  const m = Math.max(2, Math.round(17 * clamp01(growth)));
  const pts: Point[] = [];
  for (let j = 0; j <= m; j++) {
    const s = clamp01(growth) * (j / m);
    const hx = cx + box.w * 0.46 * squeeze * Math.sin(ph + s * turns * TAU);
    pts.push({ x: lerp(x0, hx, smooth(clamp01(s / 0.18))), y: y0 - s * box.h * 0.96 });
  }
  return pts;
}
/** Is vine i in front of the target at height s (0..1)? */
export const vineFront = (i: number, s: number) => Math.cos(i * 2.1 + 0.6 + s * (1.4 + 0.15 * (i % 2)) * TAU) > 0;

// ── the effects ─────────────────────────────────────────────────────────────

/** Slash: one bright tapered blade sweeps diagonally, sparks fly off it. */
const tajo: Build = (g, u, c) => {
  const { cx, cy, R, k, dir } = geo(c);
  const x0 = cx - dir * R * 0.85, y0 = cy - R * 0.7, x1 = cx + dir * R * 0.85, y1 = cy + R * 0.6;
  const grow = easeOut(span(u, 0, 0.28)), fade = 1 - span(u, 0.3, 1);
  if (grow > 0) {
    const hx = lerp(x0, x1, grow), hy = lerp(y0, y1, grow);
    g.seg(x0, y0, hx, hy, 24 * k * (0.5 + 0.5 * fade), '#ff9d4d', 0.35 * fade, 1);
    g.seg(x0, y0, hx, hy, 10 * k * fade + 2, '#ffd9a0', 0.85 * fade, 1);
    g.seg(x0, y0, hx, hy, 4 * k * fade + 1, '#ffffff', fade, 1);
    const o = 14 * k; // echo blade just behind
    g.seg(x0 - dir * o, y0 + o, lerp(x0, x1, grow * 0.85) - dir * o, lerp(y0, y1, grow * 0.85) + o, 5 * k * fade + 1, '#ff9d4d', 0.45 * fade, 1);
  }
  const len = Math.hypot(x1 - x0, y1 - y0), nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
  for (let i = 0; i < 16; i++) {
    const t0 = 0.08 + 0.2 * g.r(i), s = span(u, t0, t0 + 0.45);
    if (s <= 0 || s >= 1) continue;
    const a = g.r(i + 50), side = g.r(i + 90) < 0.5 ? -1 : 1, sp = (40 + 70 * g.r(i + 130)) * k;
    const d = easeOut(s) * sp;
    const x = lerp(x0, x1, a) + nx * side * d, y = lerp(y0, y1, a) + ny * side * d + 30 * k * s * s;
    g.spark(x, y, 10 * k * (1 - s) + 2, Math.atan2(ny * side, nx * side), g.r(i + 170) < 0.5 ? '#fff3d6' : '#ff9d4d', 1 - s);
  }
  const fl = bell(u, 0.15, 0.45);
  g.dot(cx, cy, 26 * k * fl + 1, '#fff3d6', 0.55 * fl);
};

/** Claw: three glowing furrows raked one after another, then dark gouges. */
const zarpa: Build = (g, u, c) => {
  const { cx, cy, R, k, dir } = geo(c);
  for (let i = 0; i < 3; i++) {
    const t0 = i * 0.07, grow = easeOut(span(u, t0, t0 + 0.18));
    if (grow <= 0) continue;
    const o = (i - 1) * 0.3 * R;
    const x0 = cx + dir * 0.4 * R + o, y0 = cy - 0.75 * R + Math.abs(i - 1) * 0.08 * R;
    const x1 = cx - dir * 0.35 * R + o, y1 = cy + 0.7 * R - Math.abs(i - 1) * 0.08 * R;
    const hx = lerp(x0, x1, grow), hy = lerp(y0, y1, grow);
    const glow = 1 - span(u, 0.4, 0.85), scar = span(u, 0.25, 0.45) * (1 - span(u, 0.7, 1));
    g.seg(x0, y0, hx, hy, 6 * k, '#4a1410', 0.55 * scar, 1, false);
    g.seg(x0, y0, hx, hy, 18 * k, '#7dba4e', 0.4 * glow, 1);
    g.seg(x0, y0, hx, hy, 8 * k, '#c9f29b', 0.8 * glow, 1);
    g.seg(x0, y0, hx, hy, 3 * k, '#fff7e0', glow, 1);
    for (let j = 0; j < 5; j++) {
      const n = i * 10 + j, s = span(u, t0 + 0.12, t0 + 0.5);
      if (s <= 0 || s >= 1) continue;
      const a = Math.atan2(y1 - y0, x1 - x0) + (g.r(n) - 0.5) * 1.6;
      const p = fly(x1, y1, Math.cos(a) * 160 * k, Math.sin(a) * 160 * k, s * 0.35, 500 * k);
      g.spark(p.x, p.y, 8 * k, a, '#c9f29b', 1 - s);
    }
  }
};

/** Blunt impact: white flash, radial spikes, a shockwave and flying debris. */
const impacto: Build = (g, u, c, D) => {
  const { cx, cy, R, k } = geo(c);
  const fl = u < 0.08 ? u / 0.08 : 1 - span(u, 0.08, 0.4);
  g.dot(cx, cy, 60 * k, '#ffe9b0', 0.35 * fl);
  g.dot(cx, cy, 26 * k * (0.6 + 0.4 * fl), '#ffffff', 0.9 * fl);
  const out = easeOut(span(u, 0.02, 0.2)) * (1 - span(u, 0.3, 0.7));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + g.r(i) * 0.3, len = (0.45 + 0.35 * g.r(i + 20)) * R * out, r0 = 0.12 * R;
    if (len < 2) continue;
    g.fang(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len), 9 * k, i % 2 ? '#ffe9b0' : '#ff8c3b', 1 - span(u, 0.3, 0.7));
  }
  const s = span(u, 0.05, 0.6);
  if (s > 0 && s < 1) g.ring(cx, cy, R * (0.2 + easeOut(s)), R * (0.2 + easeOut(s)), 8 * k * (1 - s) + 1, '#ff8c3b', 1 - s);
  for (let i = 0; i < 16; i++) {
    const a = g.r(i + 40) * TAU, sp = (200 + 260 * g.r(i + 60)) * k, tau = u * D;
    const p = fly(cx, cy, Math.cos(a) * sp, Math.sin(a) * sp, tau, 900 * k);
    g.spark(p.x, p.y, 9 * k, Math.atan2(Math.sin(a) * sp + 900 * k * tau, Math.cos(a) * sp), '#fff3d6', 1 - span(u, 0.2, 0.8));
  }
};

/** Blood: a crossing X of cuts, droplets arcing out and splatters that drip. */
const sangre: Build = (g, u, c, D) => {
  const { cx, cy, R, k, W, H } = geo(c);
  for (let i = 0; i < 2; i++) {
    const grow = easeOut(span(u, i * 0.06, 0.15 + i * 0.06)), f = 1 - span(u, 0.25, 0.5);
    if (grow <= 0) continue;
    const sx = i ? 1 : -1;
    const x0 = cx - sx * 0.6 * R, y0 = cy - 0.6 * R, x1 = cx + sx * 0.6 * R, y1 = cy + 0.6 * R;
    g.seg(x0, y0, lerp(x0, x1, grow), lerp(y0, y1, grow), 12 * k, '#d63b3b', 0.6 * f, 1);
    g.seg(x0, y0, lerp(x0, x1, grow), lerp(y0, y1, grow), 4 * k, '#ffd0c0', f, 1);
  }
  const G = 900 * k;
  for (let i = 0; i < 16; i++) {
    const t0 = 0.08 + 0.1 * g.r(i), tau = (u - t0) * D;
    if (tau <= 0 || u > t0 + 0.6) continue;
    const a = -Math.PI / 2 + (g.r(i + 20) - 0.5) * 2.6, sp = (150 + 170 * g.r(i + 40)) * k;
    const vx = Math.cos(a) * sp, vy = Math.sin(a) * sp;
    const p = fly(cx, cy, vx, vy, tau, G);
    g.drop(p.x, p.y, (3 + 3 * g.r(i + 60)) * k, dropAngle(vx, vy + G * tau), i % 3 ? '#a01616' : '#d63b3b', 1 - span(u, t0 + 0.35, t0 + 0.6), false);
  }
  for (let i = 0; i < 6; i++) {
    const x = cx + (g.r(i + 80) - 0.5) * 0.7 * W, y = cy + (g.r(i + 90) - 0.5) * 0.5 * H;
    const pop = easeOutBack(span(u, 0.12 + 0.03 * i, 0.25 + 0.03 * i)), a = 0.85 * (1 - span(u, 0.75, 1));
    if (pop <= 0) continue;
    const r = (5 + 5 * g.r(i + 100)) * k * pop;
    g.dot(x, y, r, '#7a0d0d', a, false);
    const drip = easeIn(span(u, 0.3, 1)) * 0.3 * H * (0.5 + 0.5 * g.r(i + 110));
    if (drip > 1) {
      g.seg(x, y, x, y + drip, r * 0.55, '#7a0d0d', a, 0, false);
      g.drop(x, y + drip, r * 0.6, 0, '#a01616', a, false);
    }
  }
};

/** Eldritch rift: a violet portal opens, tentacles lash out, then it implodes. */
const abisal: Build = (g, u, c, D) => {
  const { cx, cy, R, k, H } = geo(c);
  const open = easeOut(span(u, 0, 0.3)), close = easeIn(span(u, 0.72, 0.95));
  const ry = 0.42 * H * open * (1 - close) * (1 + 0.05 * Math.sin(u * D * 20)), rx = ry * 0.5;
  if (ry > 1) {
    for (let j = -2; j <= 2; j++) g.dot(cx, cy + j * ry * 0.35, rx * 0.8, '#12041f', 0.7, false);
    g.ring(cx, cy, rx, ry, 9 * k, '#6c2fb5', 0.7);
    g.ring(cx, cy, rx, ry, 3 * k, '#e8d0ff', 0.9);
    for (let i = 0; i < 10; i++) {
      const a = g.r(i) * TAU + u * D * 5;
      g.dot(cx + Math.cos(a) * rx * 0.7, cy + Math.sin(a) * ry * 0.7, 2.5 * k, '#b46bff', 0.8);
    }
  }
  for (let i = 0; i < 5; i++) {
    const t0 = 0.18 + 0.05 * i, e = easeOut(span(u, t0, t0 + 0.3)) * (1 - span(u, 0.62, 0.82));
    if (e <= 0.02) continue;
    const a = (i / 5) * TAU + 0.5 + g.r(i + 20) * 0.6, L = (0.55 + 0.35 * g.r(i + 30)) * R;
    const bx = cx + Math.cos(a) * rx, by = cy + Math.sin(a) * ry, pts: Point[] = [];
    for (let j = 0; j <= 9; j++) {
      const s = (j / 9) * e, w = Math.sin(s * 7 + u * D * 14 + i) * 14 * k * s;
      pts.push({ x: bx + Math.cos(a) * s * L - Math.sin(a) * w, y: by + Math.sin(a) * s * L + Math.cos(a) * w });
    }
    g.strip(pts, (j) => (9 - j * 0.7) * k + 4, '#b46bff', 0.45);
    g.strip(pts, (j) => (8 - j * 0.7) * k, '#2a0c45', 0.9, false);
  }
  const s = span(u, 0.7, 0.98);
  if (s > 0 && s < 1) for (let i = 0; i < 14; i++) {
    const a = g.r(i + 40) * TAU + s * 4, rad = (1 - s) * R * 1.2 * (0.6 + 0.4 * g.r(i + 50));
    g.dot(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, 3 * k, i % 2 ? '#e8d0ff' : '#b46bff', 0.3 + 0.7 * s);
  }
  const fl = bell(u, 0.9, 1);
  g.dot(cx, cy, 30 * k * fl + 1, '#e8d0ff', 0.7 * fl);
};

/** Doom: a hexagram rune falls from above, stamps with chains and sinks in. */
const condena: Build = (g, u, c, D) => {
  const { b, cx, cy, k, W, H, ground } = geo(c);
  const rr = 0.36 * Math.min(W, H) + 10;
  const yAt = (f: number) => lerp(b.y - 0.9 * H - 40, cy, f * f);
  const fall = span(u, 0, 0.45), rot = u * D * 4;
  if (u < 0.45) {
    for (let e = 2; e >= 1; e--) {
      const f = span(u - e * 0.04, 0, 0.45);
      if (f > 0) g.rune(cx, yAt(f), rr, rot - e * 0.3, '#7a3fc7', 0.18 * e * span(u, 0, 0.15));
    }
    g.rune(cx, yAt(fall), rr * 1.08, rot, '#7a3fc7', 0.6 * span(u, 0, 0.15));
    g.rune(cx, yAt(fall), rr, rot, '#cfa8ff', span(u, 0, 0.15));
  } else {
    const pulse = 1 + 0.35 * bell(u, 0.45, 0.6), sink = span(u, 0.72, 1);
    g.rune(cx, cy, rr * 1.1 * pulse * (1 - 0.6 * sink), rot, '#7a3fc7', 0.6 * (1 - sink));
    g.rune(cx, cy, rr * pulse * (1 - 0.6 * sink), rot, '#cfa8ff', 1 - sink);
  }
  const s = span(u, 0.45, 0.8);
  if (s > 0 && s < 1) {
    g.ring(cx, ground, W * (0.3 + 0.6 * easeOut(s)), W * 0.12 * (0.3 + 0.6 * easeOut(s)) + 2, 5 * k, '#7a3fc7', 1 - s);
    g.ring(cx, cy, rr * (1 + s), rr * (1 + s), 4 * k, '#cfa8ff', 0.8 * (1 - s));
    for (let i = 0; i < 12; i++) {
      const x = cx + (g.r(i) - 0.5) * W, y = ground - easeOut(s) * H * (0.4 + 0.5 * g.r(i + 10));
      g.spark(x, y, 12 * k, -Math.PI / 2, '#cfa8ff', 1 - s);
    }
  }
  const ch = span(u, 0.48, 0.62) * (1 - span(u, 0.8, 0.95));
  if (ch > 0) for (let j = 0; j < 4; j++) {
    const ex = cx + (j < 2 ? -1 : 1) * W * (0.45 + 0.1 * (j % 2)), ey = j % 2 ? ground : cy + H * 0.1;
    for (let l = 1; l <= 6; l++) {
      const f = (l / 7) * ch;
      g.ring(lerp(cx, ex, f), lerp(cy, ey, f), 4 * k, 3 * k, 1.6 * k, '#b48ae0', 0.85 * ch);
    }
  }
};

/** Moon: a silver crescent sweeps round the target, trailing after-images. */
const luna: Build = (g, u, c) => {
  const { cx, cy, R, k } = geo(c);
  const p = easeInOut(span(u, 0.05, 0.55)), th = lerp(-2.4, 1.0, p), rad = 0.55 * R, cr = 0.3 * R + 6;
  const vis = span(u, 0, 0.1) * (1 - span(u, 0.6, 0.85));
  if (vis > 0) {
    g.arc(cx, cy, rad, 7 * k, th - 0.55 * p, 0.55 * p + 0.01, '#9bb4ff', 0.35 * vis);
    for (let e = 2; e >= 0; e--) {
      const a = th - e * 0.2;
      const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
      if (e === 0) g.crescent(x, y, cr * 1.12, a - Math.PI / 2, '#9bb4ff', 0.5 * vis);
      g.crescent(x, y, cr, a - Math.PI / 2, e ? '#9bb4ff' : '#dfe8ff', vis * (e ? 0.35 / e : 1));
    }
  }
  const cut = bell(u, 0.3, 0.5);
  g.seg(cx - R * 0.8, cy + R * 0.3, cx + R * 0.8, cy - R * 0.3, 5 * k, '#ffffff', cut, 1);
  for (let i = 0; i < 8; i++) {
    const tw = bell(u, 0.45 + 0.05 * g.r(i), 1);
    const a = lerp(-2.4, 1.0, i / 7);
    g.star(cx + Math.cos(a) * rad * (0.8 + 0.4 * g.r(i + 10)), cy + Math.sin(a) * rad * (0.8 + 0.4 * g.r(i + 20)), 6 * k * tw, '#dfe8ff', tw);
  }
};

/** Stars: shooting stars land on nodes that link up into a constellation. */
const estrellas: Build = (g, u, c) => {
  const { cx, cy, R, k, W, H, dir } = geo(c);
  const nodes: Point[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + g.r(i) * 0.5;
    nodes.push({ x: cx + Math.cos(a) * (0.35 + 0.2 * g.r(i + 10)) * W, y: cy + Math.sin(a) * (0.3 + 0.18 * g.r(i + 20)) * H });
  }
  const out = 1 - span(u, 0.75, 1);
  for (let i = 0; i < 3; i++) {
    const n = nodes[i * 2], ta = 0.12 + i * 0.08, s = span(u, ta - 0.2, ta);
    if (s <= 0 || s >= 1) continue;
    const sx = n.x - dir * (1.2 * R + 60), sy = n.y - (1.0 * R + 60);
    const hx = lerp(sx, n.x, s), hy = lerp(sy, n.y, s), tl = 0.45 * s + 0.1;
    g.fang(hx, hy, lerp(hx, sx, tl), lerp(hy, sy, tl), 7 * k, '#ffd166', 0.8);
    g.star(hx, hy, 9 * k, '#ffffff', 1);
  }
  for (let j = 0; j < 6; j++) {
    const tj = 0.28 + j * 0.05, on = span(u, tj, tj + 0.05) * out;
    if (on <= 0) continue;
    const a = nodes[j], b2 = nodes[(j + 1) % 6], ln = span(u, tj + 0.03, tj + 0.13);
    if (ln > 0) g.seg(a.x, a.y, lerp(a.x, b2.x, ln), lerp(a.y, b2.y, ln), 2.4 * k, '#cfd8ff', 0.7 * on);
    const tw = 1 + 0.35 * Math.sin(u * 40 + j * 1.7);
    g.dot(a.x, a.y, 5 * k, '#ffd166', 0.5 * on);
    g.star(a.x, a.y, 8 * k * tw, '#fff3b8', on, u * 2);
  }
  for (let i = 0; i < 12; i++) {
    const s = bell(u, 0.2 + 0.4 * g.r(i + 30), 1);
    g.dot(cx + (g.r(i + 40) - 0.5) * W * 1.3, cy + (g.r(i + 50) - 0.5) * H * 1.1 - u * 20 * k, 1.8 * k, '#ffffff', s * 0.8);
  }
};

/** Divine: a golden beam descends from the sky onto the target. */
const divino: Build = (g, u, c) => {
  const { b, cx, cy, k, W, H, ground } = geo(c);
  const top = b.y - 2.2 * H, bottom = lerp(top, ground, easeIn(span(u, 0, 0.22)));
  const w = 0.55 * W * easeOut(span(u, 0, 0.3)) * (1 - easeIn(span(u, 0.75, 1))) * (1 + 0.06 * Math.sin(u * 60)) + 3 * k;
  const a = 1 - span(u, 0.8, 1);
  g.beam(cx, top, cx, bottom, w, '#ffd166', 0.55 * a);
  g.beam(cx, top, cx, bottom, w * 0.35, '#fff3b8', 0.9 * a);
  g.beam(cx, top, cx, bottom, w * 0.1 + 1, '#ffffff', a);
  const s = span(u, 0.2, 0.7);
  if (s > 0 && s < 1) {
    g.ring(cx, ground, W * (0.3 + 0.6 * s), W * 0.1 * (0.3 + 0.6 * s) + 2, 5 * k, '#ffd166', 1 - s);
    g.ring(cx, ground, W * (0.15 + 0.4 * s), W * 0.06 * (0.3 + 0.6 * s) + 2, 3 * k, '#fff3b8', 1 - s);
  }
  const gl = bell(u, 0.22, 0.5);
  g.seg(cx - 0.5 * W, cy, cx + 0.5 * W, cy, 6 * k, '#ffffff', gl, 1);
  g.seg(cx, cy - 0.5 * H, cx, cy + 0.5 * H, 6 * k, '#ffffff', gl, 1);
  for (let i = 0; i < 16; i++) {
    const f = (u * 2.5 + g.r(i)) % 1;
    g.dot(cx + (g.r(i + 20) - 0.5) * w, ground - f * (ground - Math.max(top, b.y - H)), 2.4 * k, i % 2 ? '#fff3b8' : '#ffd166', span(u, 0.15, 0.3) * a * (1 - f));
  }
};

/** Wave: a crest rolls in from the caster's side, curls over and crashes. */
const ola: Build = (g, u, c, D) => {
  const { cx, cy, k, W, H, ground, dir } = geo(c);
  const p = easeOut(span(u, 0, 0.5));
  const X = cx - dir * 1.0 * W + dir * 1.05 * W * p;
  const Hh = H * (0.35 + 0.8 * span(u, 0, 0.4)) * (1 - 0.7 * easeIn(span(u, 0.5, 0.85)));
  const curl = span(u, 0.25, 0.55) + 0.6 * span(u, 0.5, 0.8), a = 1 - span(u, 0.7, 1);
  const pts: Point[] = [];
  for (let j = 0; j <= 14; j++) {
    const s = j / 14;
    if (s <= 0.75) {
      const q = s / 0.75;
      pts.push({ x: X - dir * (1 - q) * 0.95 * W, y: ground - Hh * smooth(q) ** 1.2 });
    } else {
      const q = (s - 0.75) / 0.25, phi = q * Math.PI * (0.6 + 0.9 * curl), rc = 0.22 * Hh;
      pts.push({ x: X + dir * Math.sin(phi) * rc, y: ground - Hh + rc - Math.cos(phi) * rc });
    }
  }
  // water body: overlapping columns from the crest line down to the ground
  for (let j = 0; j <= 10; j++) g.seg(pts[j].x, pts[j].y + 8 * k, pts[j].x, ground, 0.17 * W, '#2a6896', 0.8 * a, 0, false);
  const th = (base: number) => (j: number) => base * k * (j < 11 ? 1 : 1 - (j - 10) * 0.18);
  g.strip(pts, th(24), '#3b82b8', 0.95 * a, false);
  g.strip(pts.map((q) => ({ x: q.x, y: q.y - 5 * k })), th(10), '#5aa7d6', 0.55 * a);
  g.strip(pts.map((q) => ({ x: q.x, y: q.y - 9 * k })), th(3.5), '#e6f6ff', 0.85 * a);
  for (let i = 0; i < 8; i++) {
    const q = pts[Math.min(14, 9 + Math.floor(g.r(i + 120) * 6))];
    g.dot(q.x + (g.r(i + 130) - 0.5) * 16 * k, q.y - 8 * k - g.r(i + 140) * 8 * k, (2 + 2 * g.r(i + 150)) * k, '#ffffff', 0.8 * a * span(u, 0.2, 0.3));
  }
  if (u > 0.5) {
    const tau = (u - 0.5) * D;
    for (let i = 0; i < 22; i++) {
      const pp = fly(X + dir * (0.1 + 0.25 * g.r(i + 40)) * W, cy + (g.r(i + 50) - 0.5) * 0.3 * H, dir * (60 + 160 * g.r(i)) * k, -(150 + 200 * g.r(i + 30)) * k, tau, 900 * k);
      if (pp.y < ground + 10) g.dot(pp.x, pp.y, 2.5 * k, i % 3 ? '#bfe7ff' : '#ffffff', span(u, 0.5, 0.56) * (1 - span(u, 0.6, 1)));
    }
    const s2 = span(u, 0.55, 1);
    for (let i = 0; i < 10; i++)
      g.bubble(X + dir * (g.r(i + 60) - 0.3) * W * (0.2 + s2), ground - 6 * k - g.r(i + 70) * 14 * k, (2 + 3 * g.r(i + 80)) * k * (0.4 + 0.6 * s2), '#e6f6ff', span(u, 0.55, 0.62) * (1 - s2));
  }
};

/** Howl: sound arcs expand from the howler (towards the target when there is one). */
const aullido: Build = (g, u, c) => {
  const { cx, cy, R, k, face } = geo(c);
  const src = c.from ?? { x: cx, y: cy };
  const dist = Math.hypot(cx - src.x, cy - src.y), directed = dist > 30;
  const dirA = directed ? Math.atan2(cy - src.y, cx - src.x) : face > 0 ? 0 : Math.PI;
  const reach = directed ? dist + 0.4 * R : 1.8 * R;
  for (let i = 0; i < 5; i++) {
    const s = span(u, i * 0.1, i * 0.1 + 0.55);
    if (s <= 0 || s >= 1) continue;
    g.arc(src.x, src.y, 20 * k + s * reach, (7 - 4 * s) * k, dirA, (directed ? 0.45 : 0.9) + 0.25 * s, i % 2 ? '#8d8db5' : '#cfcfe8', (1 - s) * 0.9);
  }
  for (let i = 0; i < 2; i++) {
    const s = span(u, i * 0.15, i * 0.15 + 0.4);
    if (s > 0 && s < 1) g.ring(src.x, src.y, 10 * k + s * 0.9 * R, 10 * k + s * 0.9 * R, 4 * k, '#cfcfe8', (1 - s) * 0.6);
  }
  if (directed) for (let i = 0; i < 2; i++) {
    const s = span(u, 0.35 + i * 0.15, 0.75 + i * 0.15);
    if (s > 0 && s < 1) g.ring(cx, cy, R * (0.3 + 0.5 * s), R * (0.3 + 0.5 * s), 3 * k, '#8d8db5', (1 - s) * 0.7);
  }
  for (let i = 0; i < 8; i++) {
    const s = span(u, 0.05 + 0.05 * i, 0.6 + 0.05 * i), a = dirA + (g.r(i) - 0.5) * 1.4;
    if (s > 0 && s < 1) g.spark(src.x + Math.cos(a) * s * reach, src.y + Math.sin(a) * s * reach, 10 * k, a, '#e6e6f5', 1 - s);
  }
};

/** Roots: vines sprout from the ground, coil around the target, squeeze, retreat. */
const raices: Build = (g, u, c) => {
  const { b, cx, k, W, H } = geo(c);
  const y0 = b.y + b.h * 1.04;
  g.ring(cx, y0, 0.6 * W, 0.08 * H + 2, 4 * k, '#3a2a18', 0.5 * (1 - span(u, 0.85, 1)), false);
  const squeeze = 1 - 0.18 * bell(u, 0.45, 0.75);
  for (let i = 0; i < 4; i++) {
    const growth = u < 0.75 ? easeOut(span(u, i * 0.04, 0.45)) : 1 - easeIn(span(u, 0.78, 1));
    if (growth <= 0.02) continue;
    const pts = vinePath(b, i, 4, growth, squeeze), m = pts.length - 1;
    for (let j = 1; j <= m; j++) {
      const s = growth * (j / m), front = vineFront(i, s), th = lerp(8, 2, s) * k;
      const p0 = pts[j - 1], p1 = pts[j];
      g.seg(p0.x, p0.y, p1.x, p1.y, th, front ? '#7a5a36' : '#3f2e1b', front ? 1 : 0.75, 0, false);
      if (front && j % 2) g.seg(p0.x - th * 0.15, p0.y - th * 0.15, p1.x - th * 0.15, p1.y - th * 0.15, th * 0.35, '#8fc25a', 0.8, 0, false);
    }
    const tip = pts[m];
    g.dot(tip.x, tip.y, 3.5 * k, '#c9f29b', 0.8);
    for (const s of [0.3, 0.55, 0.8]) {
      if (growth < s + 0.05) continue;
      const q = pts[Math.round((s / growth) * m)];
      const side = (Math.round(s * 10) + i) % 2 ? 1 : -1;
      g.leaf(q.x + side * 6 * k, q.y - 3 * k, 7 * k, side * 0.7, vineFront(i, s) ? '#4e8a33' : '#2f5a20', 0.95);
    }
  }
  for (let i = 0; i < 14; i++) {
    const s = span(u, 0.02, 0.35);
    if (s <= 0 || s >= 1) continue;
    const x0 = b.x + W * (0.12 + 0.76 * (i % 4) / 3);
    const pp = fly(x0, y0, (g.r(i) - 0.5) * 180 * k, -(120 + 160 * g.r(i + 20)) * k, s * 0.42, 1100 * k);
    g.dot(pp.x, pp.y, (1.8 + 1.8 * g.r(i + 40)) * k, i % 3 ? '#7a5a36' : '#a8804f', 1 - s, false);
  }
};

/** Earth: stone spikes erupt under the target amid dust and flying pebbles. */
const tierra: Build = (g, u, c, D) => {
  const { cx, k, W, H, ground } = geo(c);
  g.ring(cx, ground, 0.55 * W, 0.07 * H + 2, 5 * k, '#3a2a18', 0.6 * span(u, 0, 0.1) * (1 - span(u, 0.8, 1)), false);
  for (let i = 0; i < 8; i++) {
    const s = span(u, 0.08, 0.95);
    if (s <= 0 || s >= 1) continue;
    const r = (14 + 12 * g.r(i + 90)) * k * (0.5 + s);
    g.dot(cx + (g.r(i + 80) - 0.5) * W * (0.6 + s), ground - r * 0.4 - s * 16 * k, r, '#b89a70', 0.35 * (1 - s), false);
  }
  const sink = easeIn(span(u, 0.7, 1));
  for (let i = 0; i < 5; i++) {
    const t0 = 0.08 + 0.03 * Math.abs(i - 2), rise = Math.max(0, easeOutBack(span(u, t0, t0 + 0.2)));
    const h = (0.45 + 0.35 * g.r(i)) * H * (i === 2 ? 1.25 : 1) * rise * (1 - sink);
    if (h < 2) continue;
    const x = cx + (i - 2) * 0.2 * W + (g.r(i + 10) - 0.5) * 0.08 * W, tilt = (i - 2) * 0.12 + (g.r(i + 20) - 0.5) * 0.1;
    const bw = (0.13 + 0.05 * g.r(i + 30)) * W;
    const tx = x + Math.sin(tilt) * h, ty = ground - Math.cos(tilt) * h;
    g.fang(x, ground + 4, tx, ty, bw, '#7a5a36', 1, false);
    g.fang(x - bw * 0.12, ground + 2, tx - bw * 0.05, ty + 4, bw * 0.55, '#c9a36a', 0.9, false);
  }
  for (let i = 0; i < 16; i++) {
    const t0 = 0.1 + 0.1 * g.r(i + 40), tau = (u - t0) * D;
    if (tau <= 0) continue;
    const x0 = cx + (g.r(i + 50) - 0.5) * W;
    const pp = fly(x0, ground, (g.r(i + 60) - 0.5) * 220 * k, -(200 + 240 * g.r(i + 70)) * k, tau, 1000 * k);
    if (pp.y > ground + 4) continue;
    if (i % 4) g.dot(pp.x, pp.y, (2 + 2 * g.r(i + 75)) * k, '#6e5030', 1, false);
    else g.dot(pp.x, pp.y, 2.5 * k, '#c9f29b', 0.9);
  }
};

/** Poison: toxic haze, acid bubbles that rise and pop, drips that splash. */
const veneno: Build = (g, u, c, D) => {
  const { b, cx, cy, k, W, H, ground } = geo(c);
  const haze = span(u, 0, 0.2) * (1 - span(u, 0.7, 1));
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + u * D * 1.5;
    g.dot(cx + Math.cos(a) * 0.25 * W, cy + Math.sin(a) * 0.2 * H, (0.22 + 0.08 * Math.sin(u * 12 + i)) * W, '#39a824', 0.13 * haze);
  }
  for (let i = 0; i < 14; i++) {
    const t0 = g.r(i) * 0.55, s = span(u, t0, t0 + 0.4);
    if (s <= 0 || s >= 1) continue;
    const x = b.x + (0.15 + 0.7 * g.r(i + 20)) * W + Math.sin(s * 8 + i) * 6 * k;
    const y = b.y + (0.95 - 0.55 * s - 0.2 * g.r(i + 30)) * H;
    const r = (4 + 6 * g.r(i + 40)) * k * (0.4 + 0.6 * s);
    if (s < 0.85) g.bubble(x, y, r, '#7cff5a', 0.9);
    else { const q = (s - 0.85) / 0.15; g.ring(x, y, r * (1 + 1.2 * q), r * (1 + 1.2 * q), 2 * k, '#caffb8', 1 - q); }
  }
  for (let i = 0; i < 7; i++) {
    const t0 = 0.1 + g.r(i + 50) * 0.45, s = span(u, t0, t0 + 0.3);
    if (s <= 0) continue;
    const x = b.x + (0.2 + 0.6 * g.r(i + 60)) * W, y = b.y + 0.12 * H + (ground - b.y - 0.12 * H) * s * s;
    if (s < 1) {
      g.seg(x, y - 16 * k * s - 2, x, y, 2 * k, '#39a824', 0.45);
      g.drop(x, y, 5 * k, 0, '#7cff5a', 1);
    }
    const q = span(u, t0 + 0.3, t0 + 0.45);
    if (q > 0 && q < 1) g.ring(x, ground, 12 * k * (0.3 + q), 3 * k * (0.3 + q) + 1, 2 * k, '#caffb8', 1 - q);
  }
};

/** Shapeshift: a vortex of leaves and spirit wisps spirals round the hero, then bursts. */
const transformacion: Build = (g, u, c, D) => {
  const { b, cx, cy, R, k, W, H, ground } = geo(c);
  const rx = W * (0.62 - 0.2 * span(u, 0.1, 0.7)), burst = span(u, 0.75, 1), show = span(u, 0, 0.15);
  for (let i = 0; i < 32; i++) {
    const wisp = i >= 24;
    const ang = g.r(i) * TAU + u * D * 6 * (1 + 0.3 * g.r(i + 40));
    const hgt = (g.r(i + 80) + u * 0.9) % 1;
    let x = cx + Math.cos(ang) * rx, y = b.y + H * (1 - hgt);
    const depth = Math.sin(ang), a = show * (depth > 0 ? 1 : 0.45) * (1 - burst);
    if (burst > 0) { const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1; x += (dx / d) * burst * R * 1.2; y += (dy / d) * burst * R * 1.2; }
    const al = burst > 0 ? show * (1 - burst) : a;
    if (wisp) {
      g.seg(x, y, x - Math.sin(ang) * 18 * k, y + Math.cos(ang) * 4 * k, 5 * k, '#fff7c2', 0.4 * al);
      g.dot(x, y, 4 * k, '#fff7c2', al);
    } else {
      g.leaf(x, y, 7 * k * (0.85 + 0.25 * depth), ang + Math.PI / 2, ['#b8e08a', '#7dba4e', '#4e8a33'][i % 3], al);
    }
  }
  for (let i = 0; i < 2; i++) {
    const s = span(u, i * 0.25, i * 0.25 + 0.5);
    if (s > 0 && s < 1) g.ring(cx, ground, W * (0.35 + 0.5 * s), W * 0.12 * (0.35 + 0.5 * s) + 2, 4 * k, i ? '#fff7c2' : '#7dba4e', 1 - s);
  }
  const fl = bell(u, 0.7, 0.88);
  g.dot(cx, cy, 0.6 * R * fl + 1, '#fff7c2', 0.55 * fl);
  if (fl > 0) g.ring(cx, cy, R * (0.3 + span(u, 0.7, 0.88)), R * (0.3 + span(u, 0.7, 0.88)), 4 * k, '#b8e08a', fl);
};

/** Death: a dark ring collapses, a ghostly skull rises among spiralling souls. */
const muerte: Build = (g, u, c) => {
  const { cx, cy, R, k, W, H } = geo(c);
  const s = span(u, 0, 0.35);
  if (s < 1) g.ring(cx, cy, R * (1.1 - 0.9 * easeIn(s)), R * (1.1 - 0.9 * easeIn(s)), 4 * k, '#8d8db5', 0.3 + 0.6 * s);
  const core = bell(u, 0.2, 0.85);
  g.dot(cx, cy, 0.4 * R, '#15101f', 0.45 * core, false);
  const s2 = span(u, 0.25, 1), sa = span(u, 0.25, 0.4) * (1 - span(u, 0.7, 1));
  const sr = 0.28 * Math.min(W, H) + 8, sy = cy - s2 * 0.7 * H;
  g.dot(cx, sy, sr * 1.3, '#8d8db5', 0.3 * sa);
  g.skull(cx, sy, sr, '#dcdcf0', sa);
  for (let i = 0; i < 10; i++) {
    const t0 = 0.2 + g.r(i) * 0.3, q = span(u, t0, t0 + 0.6);
    if (q <= 0 || q >= 1) continue;
    const a = g.r(i + 10) * TAU + q * 5, rad = (0.2 + 0.3 * g.r(i + 20)) * W * (1 - q * 0.5);
    const x = cx + Math.cos(a) * rad, y = cy + 0.2 * H - q * 0.9 * H;
    g.seg(x, y, x - Math.sin(a) * 14 * k, y + 10 * k, 4 * k, '#8d8db5', 0.5 * (1 - q));
    g.dot(x, y, 3.5 * k, '#cfcfe8', 1 - q);
  }
  for (let i = 0; i < 10; i++) {
    const q = span(u, 0.3 + 0.3 * g.r(i + 30), 1);
    if (q > 0 && q < 1) g.dot(cx + (g.r(i + 40) - 0.5) * W, cy - 0.3 * H + q * 0.8 * H, 2.2 * k, '#3a3a52', 1 - q, false);
  }
};

/** Darkness: shadow blobs and tendrils close in, eyes open in the gloom, it disperses. */
const oscuridad: Build = (g, u, c, D) => {
  const { cx, cy, R, k, W, H } = geo(c);
  const conv = easeOut(span(u, 0, 0.4)), disp = span(u, 0.75, 1), show = span(u, 0, 0.2) * (1 - disp);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + g.r(i) * 0.4;
    const rad = lerp(1.4 * R, 0.35 * R * (0.6 + 0.6 * g.r(i + 10)), conv) + disp * 0.8 * R;
    g.dot(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.85, (0.28 + 0.12 * g.r(i + 20)) * R * (1 + 0.3 * Math.sin(u * D * 6 + i)), '#140822', 0.55 * show, false);
  }
  const reach = conv * (1 - disp);
  for (let i = 0; i < 7; i++) {
    if (reach < 0.05) break;
    const a0 = (i / 7) * TAU + 0.3, pts: Point[] = [];
    for (let j = 0; j <= 9; j++) {
      const s = (j / 9) * reach, rad = 1.5 * R * (1 - s * 0.85), a = a0 + s * 1.2 * Math.sin(i + 1) + Math.sin(u * D * 5 + j * 0.8 + i) * 0.08;
      pts.push({ x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad * 0.85 });
    }
    g.strip(pts, (j) => (9 - j * 0.6) * k + 4, '#8d5acc', 0.35);
    g.strip(pts, (j) => (8 - j * 0.6) * k, '#22103a', 0.9, false);
  }
  const eyes = span(u, 0.35, 0.45) * (1 - span(u, 0.72, 0.82));
  const blink = 1 - bell(u, 0.56, 0.62) * 0.85;
  for (const sx of [-1, 1]) {
    const ex = cx + sx * 0.1 * W, ey = cy - 0.1 * H;
    g.dot(ex, ey, 6 * k, '#b46bff', 0.4 * eyes);
    g.seg(ex - 6 * k, ey, ex + 6 * k, ey, 3.2 * k * blink + 0.5, '#f0dcff', eyes, 1);
  }
  for (let i = 0; i < 12; i++) {
    const q = span(u, 0.75, 1), a = g.r(i + 30) * TAU;
    if (q > 0 && q < 1) g.dot(cx + Math.cos(a) * q * R * 1.3, cy + Math.sin(a) * q * R, 2.5 * k, '#8d5acc', 1 - q);
  }
};

/** Leaves: a gust of leaves flutters from the caster, swirls round the target, scatters. */
const hojas: Build = (g, u, c, D) => {
  const { cx, cy, R, k, W, H, ground } = geo(c);
  const travel = !!c.from && Math.hypot(c.from.x - cx, c.from.y - cy) > 40;
  const cols = ['#7dba4e', '#4e8a33', '#b8e08a', '#a8c64a'];
  const scatter = span(u, 0.75, 1);
  for (let i = 0; i < 22; i++) {
    const t0 = g.r(i) * 0.3, s = easeInOut(span(u, t0, t0 + 0.35));
    const ph = g.r(i + 30) * TAU, oa = ph + u * D * 7;
    const ox = cx + Math.cos(oa) * 0.55 * W, oy = cy + Math.sin(oa) * 0.45 * H;
    const sx = travel ? c.from!.x + (g.r(i + 60) - 0.5) * 30 * k : cx + (g.r(i + 60) - 0.5) * W;
    const sy = travel ? c.from!.y + (g.r(i + 70) - 0.5) * 30 * k : ground;
    let x = lerp(sx, ox, s), y = lerp(sy, oy, s);
    const dx = ox - sx, dy = oy - sy, d = Math.hypot(dx, dy) || 1, wob = Math.sin(s * Math.PI) * (g.r(i + 90) - 0.5) * 0.8 * R;
    x += (-dy / d) * wob; y += (dx / d) * wob;
    if (scatter > 0) { const ex = x - cx, ey = y - cy, e = Math.hypot(ex, ey) || 1; x += (ex / e) * scatter * R; y += (ey / e) * scatter * R + scatter * 20 * k; }
    const a = span(u, t0, t0 + 0.05) * (1 - scatter);
    g.leaf(x, y, (5 + 2 * g.r(i + 100)) * k, u * D * 10 * (g.r(i + 110) - 0.5) + ph, cols[i % 4], a);
    if (i % 5 === 0) g.dot(x, y, 2 * k, '#d6f5a8', 0.8 * a);
  }
  for (let i = 0; i < 3; i++) {
    const s = span(u, 0.35 + i * 0.1, 0.7 + i * 0.1);
    if (s > 0 && s < 1) g.arc(cx, cy, 0.5 * W + i * 6 * k, 3 * k, s * 5 + i * 2, 0.8, '#d6f5a8', 0.4 * (1 - s));
  }
};

/** Rage: flames lick up the body, a fire ring at the feet, red shockwaves, embers. */
const furia: Build = (g, u, c, D) => {
  const { b, cx, cy, R, k, W, H, ground } = geo(c);
  g.dot(cx, cy, 0.6 * R, '#d62828', 0.22 * bell(u, 0, 1) * (1 + 0.2 * Math.sin(u * D * 20)));
  const s0 = span(u, 0, 0.5);
  if (s0 < 1) g.ring(cx, ground, W * (0.3 + 0.5 * s0), W * 0.22 * (0.3 + 0.5 * s0), 5 * k, '#ff6b35', 1 - s0);
  for (let i = 0; i < 16; i++) {
    const t0 = g.r(i) * 0.55, s = span(u, t0, t0 + 0.35);
    if (s <= 0 || s >= 1) continue;
    const x = b.x + (0.1 + 0.8 * g.r(i + 20)) * W + Math.sin(s * 6 + i) * 4 * k;
    const y = ground - s * H * (0.6 + 0.5 * g.r(i + 30));
    const col = s < 0.3 ? '#ffd166' : s < 0.6 ? '#ff6b35' : '#d62828';
    g.drop(x, y, (6 + 6 * g.r(i + 40)) * k * Math.sin(Math.PI * s), Math.sin(s * 8 + i) * 0.2, col, 1);
  }
  for (let i = 0; i < 2; i++) {
    const s = span(u, 0.2 + i * 0.1, 0.6 + i * 0.1);
    if (s > 0 && s < 1) g.ring(cx, cy, R * (0.3 + 0.9 * easeOut(s)), R * (0.3 + 0.9 * easeOut(s)), 6 * k * (1 - s) + 1, '#ff3b1f', 1 - s);
  }
  for (let i = 0; i < 18; i++) {
    const q = span(u, g.r(i + 50) * 0.5, g.r(i + 50) * 0.5 + 0.5);
    if (q <= 0 || q >= 1) continue;
    g.spark(b.x + g.r(i + 60) * W + Math.sin(q * 10 + i) * 8 * k, ground - q * H * 1.2, 7 * k, -Math.PI / 2, '#ffd166', 1 - q);
  }
};

/** Block: hexagonal shards converge in front of the hero into a glowing shield. */
const bloqueo: Build = (g, u, c) => {
  const { cx, cy, k, W, H, face } = geo(c);
  const sx = cx + face * W * 0.34, sy = cy - 0.02 * H, sr = 0.42 * H, sq = 0.55;
  const V = (j: number, m = 1) => ({ x: sx + Math.sin((j * Math.PI) / 3) * 0.98 * sr * sq * m, y: sy - Math.cos((j * Math.PI) / 3) * 0.98 * sr * m });
  const out = 1 - span(u, 0.7, 1);
  for (let j = 0; j < 6; j++) {
    const e = easeOut(span(u, j * 0.02, 0.28 + j * 0.02));
    if (e <= 0) continue;
    const m = lerp(1.9, 1, e), a = V(j, m), b2 = V(j + 1, m), sw = (1 - e) * 0.6;
    const mx = (a.x + b2.x) / 2, my = (a.y + b2.y) / 2;
    const rot = (p: Point) => ({ x: mx + (p.x - mx) * Math.cos(sw) - (p.y - my) * Math.sin(sw), y: my + (p.x - mx) * Math.sin(sw) + (p.y - my) * Math.cos(sw) });
    const p0 = rot(a), p1 = rot(b2);
    g.seg(p0.x, p0.y, p1.x, p1.y, 4 * k, '#e8f6ff', e * out);
  }
  const fill = span(u, 0.26, 0.36) * out, fl = bell(u, 0.28, 0.48);
  g.shield(sx, sy, sr, sq, '#9fd8ff', 0.9 * fill);
  g.shield(sx, sy, sr, sq, '#ffffff', 0.6 * fl);
  const s = span(u, 0.3, 0.65);
  if (s > 0 && s < 1) g.ring(sx, sy, sr * sq * (1 + 0.6 * s), sr * (1 + 0.6 * s), 3 * k, '#9fd8ff', 1 - s);
  const sw = span(u, 0.35, 0.6);
  if (sw > 0 && sw < 1) {
    const x = sx + face * lerp(-1, 1, sw) * sr * sq * 0.7;
    g.seg(x, sy - sr * 0.7, x, sy + sr * 0.7, 5 * k, '#ffffff', 0.45 * Math.sin(Math.PI * sw), 1);
  }
  for (let i = 0; i < 12; i++) {
    const q = span(u, 0.7 + 0.05 * g.r(i), 1);
    if (q <= 0 || q >= 1) continue;
    const p = V(i % 6);
    g.spark(p.x + (g.r(i + 10) - 0.5) * 10 * k, p.y - q * 40 * k, 6 * k, -Math.PI / 2, '#9fd8ff', 1 - q);
  }
};

/** Hearts: little hearts spiral in, a big heart beats twice and pops into a float of hearts. */
const corazones: Build = (g, u, c) => {
  const { cx, cy, R, k, W, H } = geo(c);
  for (let i = 0; i < 12; i++) {
    const s = easeIn(span(u, g.r(i) * 0.1, 0.4));
    if (s >= 1) continue;
    const a = g.r(i + 10) * TAU + s * 3, rad = (1 - s) * 1.1 * R;
    g.heart(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, 5 * k * (1 - 0.4 * s), '#ff8fb3', span(u, 0, 0.08));
  }
  const beat = 1 + 0.25 * Math.max(bell(u, 0.4, 0.52), bell(u, 0.55, 0.67));
  const big = span(u, 0.36, 0.42) * (1 - span(u, 0.7, 0.74)), hr = (0.25 * Math.min(W, H) + 6) * beat;
  g.dot(cx, cy, hr * 1.2, '#ff5d8f', 0.3 * big);
  g.heart(cx, cy, hr, '#ff5d8f', big);
  const s = span(u, 0.72, 1);
  if (s > 0 && s < 1) {
    g.ring(cx, cy, R * (0.3 + 0.9 * easeOut(s)), R * (0.3 + 0.9 * easeOut(s)), 4 * k, '#ffd0e0', 1 - s);
    for (let i = 0; i < 12; i++) {
      const x = cx + (g.r(i + 20) - 0.5) * W * 0.8 + Math.sin(s * 6 + i) * 8 * k, y = cy - s * (0.6 + 0.4 * g.r(i + 30)) * H;
      g.heart(x, y, (5 + 4 * g.r(i + 40)) * k, i % 2 ? '#ff8fb3' : '#ffd0e0', 1 - s);
    }
  }
  for (let i = 0; i < 6; i++) {
    const tw = bell(u, 0.45 + 0.08 * i, 0.75 + 0.05 * i);
    g.star(cx + (g.r(i + 50) - 0.5) * W, cy + (g.r(i + 60) - 0.5) * H, 6 * k * tw, '#ffffff', tw);
  }
};

/** Flames engulfing a box (breath target, burn). */
function engulf(g: Painter, u: number, c: SpellCtx, a0: number, a1: number, n: number, base: number) {
  const { b, k, W, H, ground } = geo(c);
  for (let i = 0; i < n; i++) {
    const t0 = a0 + g.r(i + base) * (a1 - a0 - 0.3), s = span(u, t0, t0 + 0.3);
    if (s <= 0 || s >= 1) continue;
    const x = b.x + (0.1 + 0.8 * g.r(i + base + 20)) * W, y = ground - s * H * (0.5 + 0.6 * g.r(i + base + 30));
    g.drop(x, y, (7 + 6 * g.r(i + base + 40)) * k * Math.sin(Math.PI * s), Math.sin(s * 8 + i) * 0.25, s < 0.35 ? '#fff3b8' : s < 0.7 ? '#ffb347' : '#ff3b00', 1);
  }
}

/** Dragon breath: a cone of fire pours from the mouth and engulfs the target. */
const aliento: Build = (g, u, c) => {
  const { cx, cy, k, H } = geo(c);
  const src = c.from;
  if (src) {
    g.dot(src.x, src.y, 16 * k, '#fff3b8', 0.8 * bell(u, 0, 0.75));
    const tx = cx - src.x, ty = cy - src.y, d = Math.hypot(tx, ty) || 1, nx = -ty / d, ny = tx / d;
    for (let i = 0; i < 64; i++) {
      const te = (i / 64) * 0.62, s = span(u, te, te + 0.32);
      if (s <= 0 || s >= 1) continue;
      const aim = (g.r(i) - 0.5) * 0.5 * H, spread = (g.r(i + 100) - 0.5) * s * 0.5 * H;
      const x = lerp(src.x, cx + nx * aim, s) + nx * spread, y = lerp(src.y, cy + ny * aim, s) + ny * spread;
      const size = (4 + 22 * s) * k * (0.7 + 0.5 * g.r(i + 200));
      if (s > 0.82) { g.dot(x, y - s * 10 * k, size * 1.2, 'rgba(50,36,30,0.55)', 1 - span(s, 0.82, 1), false); continue; }
      const col = s < 0.2 ? '#fff3b8' : s < 0.45 ? '#ffb347' : s < 0.7 ? '#ff7a18' : '#ff3b00';
      g.dot(x, y, size, col, (s < 0.08 ? s / 0.08 : 1) * 0.85);
    }
  }
  engulf(g, u, c, src ? 0.25 : 0, 1, 18, 300);
  for (let i = 0; i < 10; i++) {
    const q = span(u, 0.3 + 0.4 * g.r(i + 400), 1);
    if (q > 0 && q < 1) g.spark(cx + (g.r(i + 410) - 0.5) * geo(c).W, cy + 0.3 * H - q * H, 6 * k, -Math.PI / 2, '#ffd166', 1 - q);
  }
};

/** Eye ray: the Beholder charges an orb and fires a flickering coloured beam. */
const rayoOcular: Build = (g, u, c, D) => {
  const { b, cx, cy, R, k, H } = geo(c);
  const tint = c.tint ?? '#ff5ad8';
  const src = c.from ?? { x: cx, y: b.y - 1.5 * H };
  const ch = span(u, 0, 0.2) * (1 - span(u, 0.7, 0.85));
  g.dot(src.x, src.y, (4 + 10 * span(u, 0, 0.2)) * k, tint, 0.8 * ch);
  g.dot(src.x, src.y, (2 + 4 * span(u, 0, 0.2)) * k, '#ffffff', ch);
  for (let i = 0; i < 6; i++) {
    const q = span(u, g.r(i) * 0.08, 0.2);
    if (q <= 0 || q >= 1) continue;
    const a = g.r(i + 10) * TAU, rad = (1 - q) * 40 * k;
    g.dot(src.x + Math.cos(a) * rad, src.y + Math.sin(a) * rad, 2 * k, tint, q);
  }
  const on = span(u, 0.18, 0.24) * (1 - span(u, 0.7, 0.85));
  if (on > 0) {
    const w = 10 * k * (0.8 + 0.2 * Math.sin(u * D * 70));
    g.beam(src.x, src.y, cx, cy, w * 2.2, tint, 0.6 * on);
    g.beam(src.x, src.y, cx, cy, w * 0.5, '#ffffff', on);
    const frame = Math.floor(u * D * 30), dx = cx - src.x, dy = cy - src.y, d = Math.hypot(dx, dy) || 1;
    for (let f = 0; f < 2; f++) {
      const pts: Point[] = [];
      for (let j = 0; j <= 10; j++) {
        const s = j / 10, off = j === 0 || j === 10 ? 0 : (hash01(frame * 7 + f, j) - 0.5) * 16 * k;
        pts.push({ x: lerp(src.x, cx, s) - (dy / d) * off, y: lerp(src.y, cy, s) + (dx / d) * off });
      }
      g.strip(pts, () => 1.6 * k, '#ffffff', 0.7 * on);
    }
  }
  for (let i = 0; i < 2; i++) {
    const s = span(u, 0.22 + i * 0.15, 0.6 + i * 0.15);
    if (s > 0 && s < 1) g.ring(cx, cy, R * (0.15 + 0.7 * s), R * (0.15 + 0.7 * s), 4 * k, tint, 1 - s);
  }
  const back = Math.atan2(src.y - cy, src.x - cx);
  for (let i = 0; i < 14; i++) {
    const q = span(u, 0.22 + 0.3 * g.r(i + 20), 0.55 + 0.3 * g.r(i + 20));
    if (q <= 0 || q >= 1) continue;
    const a = back + (g.r(i + 30) - 0.5) * 2.2, dd = easeOut(q) * 0.8 * R;
    g.spark(cx + Math.cos(a) * dd, cy + Math.sin(a) * dd, 9 * k, a, i % 2 ? tint : '#ffffff', 1 - q);
  }
  g.dot(cx, cy, 20 * k, '#ffffff', 0.6 * bell(u, 0.2, 0.4));
};

/** Jagged path from a to b; the offsets change `fps` times a second. */
export function zigzag(a: Point, b: Point, n: number, amp: number, frame: number, salt: number): Point[] {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
  const pts: Point[] = [];
  for (let j = 0; j <= n; j++) {
    const s = j / n, off = j === 0 || j === n ? 0 : (hash01(frame * 13 + salt, j) - 0.5) * 2 * amp * Math.sin(Math.PI * s);
    pts.push({ x: lerp(a.x, b.x, s) - (dy / d) * off, y: lerp(a.y, b.y, s) + (dx / d) * off });
  }
  return pts;
}

/** The Dungeon Master's ray: his hands gather light, then a huge zigzag bolt
 *  crosses the screen and strikes the hero with a blinding flash. */
const rayoDM: Build = (g, u, c, D) => {
  const { cx, cy, R, k, H } = geo(c);
  const src = c.from ?? { x: cx + 3 * H, y: cy - H };
  const tgt = { x: cx, y: cy };
  const gold = '#ffd27a', violet = '#b98bff';
  const dist = Math.hypot(tgt.x - src.x, tgt.y - src.y) || 1;
  // charge: sparks spiral into the hands, the orb swells
  const ch = span(u, 0, 0.3) * (1 - span(u, 0.72, 0.85));
  g.dot(src.x, src.y, (6 + 16 * span(u, 0, 0.3)) * k, violet, 0.55 * ch);
  g.dot(src.x, src.y, (3 + 8 * span(u, 0, 0.3)) * k, gold, 0.85 * ch);
  g.dot(src.x, src.y, (2 + 4 * span(u, 0, 0.3)) * k, '#ffffff', ch);
  for (let i = 0; i < 12; i++) {
    const q = span(u, g.r(i) * 0.15, 0.3);
    if (q <= 0 || q >= 1) continue;
    const a = g.r(i + 40) * TAU + q * 2.4, rad = (1 - easeIn(q)) * 70 * k;
    g.spark(src.x + Math.cos(a) * rad, src.y + Math.sin(a) * rad, 8 * k, a + Math.PI, i % 3 ? gold : violet, q);
  }
  // strike: the main bolt, its forks and a soft beam underneath
  const on = span(u, 0.28, 0.32) * (1 - span(u, 0.68, 0.9));
  if (on > 0) {
    const frame = Math.floor(u * D * 22);
    g.beam(src.x, src.y, tgt.x, tgt.y, 26 * k, violet, 0.28 * on);
    const main = zigzag(src, tgt, 14, Math.min(46 * k, dist * 0.09), frame, 1);
    g.strip(main, () => 12 * k, gold, 0.45 * on);
    g.strip(main, () => 5 * k, '#fff6dc', on);
    g.strip(main, () => 2 * k, '#ffffff', on, false);
    for (let f = 0; f < 3; f++) {
      const from = main[3 + f * 3];
      const ang = Math.atan2(tgt.y - src.y, tgt.x - src.x) + (hash01(frame + f * 5, 9) - 0.5) * 1.6;
      const len = dist * (0.12 + 0.1 * hash01(frame, f + 20));
      const to = { x: from.x + Math.cos(ang) * len, y: from.y + Math.sin(ang) * len };
      g.strip(zigzag(from, to, 5, 10 * k, frame, 7 + f), () => 2.4 * k, f % 2 ? violet : gold, 0.8 * on);
    }
  }
  // impact: blinding flash over the whole scene, then a ring and embers
  const flash = bell(u, 0.29, 0.5);
  g.dot((src.x + tgt.x) / 2, (src.y + tgt.y) / 2, dist * 0.9, '#fff4d8', 0.22 * flash, false);
  g.dot(tgt.x, tgt.y, 46 * k, '#ffffff', 0.85 * flash);
  g.dot(tgt.x, tgt.y, 90 * k, gold, 0.35 * flash);
  for (let i = 0; i < 2; i++) {
    const s = span(u, 0.34 + i * 0.12, 0.8 + i * 0.1);
    if (s > 0 && s < 1) g.ring(tgt.x, tgt.y, R * (0.2 + 1.1 * easeOut(s)), R * (0.12 + 0.6 * easeOut(s)), 4 * k, i ? violet : gold, 1 - s);
  }
  for (let i = 0; i < 26; i++) {
    const q = span(u, 0.34 + 0.25 * g.r(i + 60), 0.7 + 0.28 * g.r(i + 60));
    if (q <= 0 || q >= 1) continue;
    const a = g.r(i + 80) * TAU, dd = easeOut(q) * R * (0.6 + 0.8 * g.r(i + 90));
    g.spark(tgt.x + Math.cos(a) * dd, tgt.y + Math.sin(a) * dd, 10 * k, a, i % 3 ? gold : '#ffffff', 1 - q);
  }
};

// ── Paladin: hammers of light, holy rays and elemental smites ───────────────

/** Paladin palettes: [halo, rim, core] of the hammer and the element's accents. */
export const HOLY = { halo: '#ffb830', rim: '#ffd35a', core: '#fff6d8', pale: '#fff3c4', deep: '#e0a82e' };
const THUNDER = { halo: '#4f8fff', rim: '#9fd0ff', core: '#ffffff', pale: '#cfe6ff', deep: '#3a6fe0' };
const BLIND = { halo: '#fff8e6', rim: '#fffdf5', core: '#ffffff', pale: '#fffbe8', deep: '#fff0c0' };
const SMITE_FIRE = { halo: '#ff7a2a', rim: '#ffb347', core: '#fff1c9', pale: '#ffd35a', deep: '#ff4a1a' };
const RADIANT = { halo: '#f5c96a', rim: '#ffe7a0', core: '#fffaf0', pale: '#fff3d0', deep: '#e8b850' };
const BANISH = { halo: '#6c2fb5', rim: '#b46bff', core: '#fff3c4', pale: '#e8d0ff', deep: '#ffd35a' };
type HammerLook = { halo: string; rim: string; core: string };

/** Warhammer of light: head centred on (hx, hy), handle along `ang` (from the head
 *  towards the grip), size `s` ≈ the head's length in px. About ten sprites. */
export function lightHammer(g: Painter, hx: number, hy: number, ang: number, s: number, a: number, look: HammerLook = HOLY) {
  if (a <= 0.01) return;
  const ca = Math.cos(ang), sa = Math.sin(ang), px = -sa, py = ca;
  const half = 0.5 * s, th = 0.36 * s, L = 1.25 * s;
  const gx = hx + ca * L, gy = hy + sa * L;
  g.dot(hx, hy, 0.7 * s, look.halo, 0.14 * a);
  // dark silhouette under the light so the shape reads on bright backgrounds
  g.seg(hx - px * half * 1.08, hy - py * half * 1.08, hx + px * half * 1.08, hy + py * half * 1.08, th * 1.3, '#3a2a08', 0.55 * a, 0, false);
  g.seg(hx, hy, gx, gy, 0.12 * s + 1, look.rim, 0.9 * a);
  g.seg(hx, hy, gx, gy, 0.05 * s + 0.6, look.core, a, 0, false);
  g.dot(gx, gy, 0.09 * s + 1, look.rim, a);
  g.seg(hx - px * half, hy - py * half, hx + px * half, hy + py * half, th, look.rim, a, 0, false);
  g.seg(hx - px * half * 0.85, hy - py * half * 0.85, hx + px * half * 0.85, hy + py * half * 0.85, th * 0.45, look.core, a, 0, false);
  for (const e of [-1, 1]) {
    const ex = hx + px * half * e, ey = hy + py * half * e, f = th * 0.72;
    g.seg(ex - ca * f, ey - sa * f, ex + ca * f, ey + sa * f, 0.12 * s + 1, look.rim, a);
  }
}

/** Where the paladin holds his hammer up while it charges (self spells). */
function heldHammer(c: SpellCtx) {
  const { b, cx, W, H, k, face } = geo(c);
  return { x: cx + face * W * 0.3, y: b.y + 0.04 * H, ang: Math.PI / 2 + face * 0.35, s: 30 * k + 10 };
}

/** Flame tongue rising from (x, y): stacked teardrops that sway with `time`. */
function tongue(g: Painter, x: number, y: number, h: number, w: number, time: number, salt: number, cols: string[], a: number) {
  if (h < 2 || a <= 0.01) return;
  const m = Math.max(3, Math.min(6, Math.round(h / (w * 0.55))));
  for (let j = 0; j < m; j++) {
    const f = j / m, sway = Math.sin(time * 13 + salt * 1.7 + j) * w * 0.35 * f;
    g.drop(x + sway, y - f * h, w * (1 - f * 0.6) * 0.62 + 0.5, Math.sin(time * 9 + salt) * 0.2, cols[Math.min(cols.length - 1, Math.floor(f * cols.length))], a * (1 - f * 0.4));
  }
}

/** Sun emblem: a ring with `n` triangular rays, rotated by `rot`. */
function sunSigil(g: Painter, x: number, y: number, r: number, n: number, rot: number, thick: number, col: string, core: string, a: number) {
  if (a <= 0.01 || r < 2) return;
  g.ring(x, y, r, r, thick, col, a);
  g.ring(x, y, r * 0.55, r * 0.55, thick * 0.6, core, 0.8 * a);
  for (let i = 0; i < n; i++) {
    const t = rot + (i / n) * TAU, ct = Math.cos(t), st = Math.sin(t);
    g.fang(x + ct * r * 1.05, y + st * r * 1.05, x + ct * r * 1.55, y + st * r * 1.55, thick * 2.2, col, a);
  }
}

/** Hammer of Light: a golden warhammer swings down onto the target and rings it
 *  like a bell: flash, starburst, a shock ring and sparks. Each blow varies its swing. */
const martillo: Build = (g, u, c) => {
  const { cx, cy, R, k, W, H, ground, dir } = geo(c);
  const side = g.r(900) < 0.5;
  const I = { x: cx + (g.r(901) - 0.5) * 0.24 * W, y: cy - 0.1 * H + (g.r(902) - 0.5) * 0.14 * H };
  const s = 40 * k + 14, L = 1.25 * s;
  const gv = side ? { x: -dir * 0.95, y: -0.3 } : { x: -dir * 0.8, y: -0.6 };
  const gl = Math.hypot(gv.x, gv.y), G = { x: I.x + (gv.x / gl) * L * 1.6, y: I.y + (gv.y / gl) * L * 1.6 };
  const rad = L * 1.6, thImp = Math.atan2(I.y - G.y, I.x - G.x), th0 = thImp - dir * ((side ? 1.5 : 2.0) + (g.r(903) - 0.5) * 0.4);
  const HIT = 0.2, p = span(u, 0, HIT);
  const th = u < HIT ? lerp(th0, thImp, p * p) : thImp - dir * 0.14 * bell(u, HIT, 0.5);
  const vis = span(u, 0, 0.05) * (1 - span(u, 0.32, 0.58));
  const head = (t: number) => ({ x: G.x + Math.cos(t) * rad, y: G.y + Math.sin(t) * rad - (u > HIT ? 16 * k * easeOut(span(u, 0.28, 0.58)) : 0) });
  // motion trail while it swings
  if (u < HIT + 0.08) {
    const ta = th - dir * Math.min(Math.abs(th - th0), 1.1), tr = 1 - span(u, HIT, HIT + 0.08);
    g.arc(G.x, G.y, rad, 0.45 * s, (ta + th) / 2, Math.abs(th - ta) / 2 + 0.01, HOLY.halo, 0.22 * tr * vis);
    g.arc(G.x, G.y, rad, 0.12 * s, (ta + th) / 2, Math.abs(th - ta) / 2 + 0.01, HOLY.pale, 0.5 * tr * vis);
  }
  if (u >= HIT) {
    // the blow rings out (painted under the hammer, which stays readable on top)
    if (u < HIT + 0.05) g.mark('golpe', I.x, I.y);
    const fl = 1 - span(u, HIT, 0.4);
    g.dot(I.x, I.y, R * 0.4 * fl + 1, HOLY.pale, 0.22 * fl);
    g.dot(I.x, I.y, 9 * k * (0.6 + 0.4 * fl), '#ffffff', 0.8 * fl);
    const out = easeOut(span(u, HIT, 0.32)), fade = 1 - span(u, 0.36, 0.66), rot = g.r(904) * TAU;
    for (let i = 0; i < 8; i++) {
      const a = rot + (i / 8) * TAU, len = (0.4 + 0.3 * g.r(i + 910)) * R * out, r0 = 0.12 * R;
      if (len > 2) g.fang(I.x + Math.cos(a) * r0, I.y + Math.sin(a) * r0, I.x + Math.cos(a) * (r0 + len), I.y + Math.sin(a) * (r0 + len), 5 * k, i % 2 ? HOLY.pale : HOLY.rim, fade);
    }
    const sr = span(u, HIT, 0.72);
    if (sr < 1) g.ring(I.x, I.y, R * (0.2 + 0.95 * easeOut(sr)), R * (0.1 + 0.45 * easeOut(sr)), 6 * k * (1 - sr) + 1, HOLY.rim, 1 - sr);
    const sg = span(u, HIT + 0.04, 0.8);
    if (sg > 0 && sg < 1) g.ring(cx, ground, W * (0.3 + 0.5 * sg), W * 0.08 * (0.3 + 0.5 * sg) + 2, 3 * k, HOLY.deep, 0.7 * (1 - sg));
    const n = g.n(14);
    for (let i = 0; i < n; i++) {
      const q = span(u, HIT, HIT + 0.35 + 0.3 * g.r(i + 920));
      if (q <= 0 || q >= 1) continue;
      const a = -Math.PI / 2 + dir * (0.2 + 1.2 * g.r(i + 930)) * (g.r(i + 940) < 0.75 ? 1 : -1), sp = (0.8 + 0.8 * g.r(i + 950)) * R;
      const x = I.x + Math.cos(a) * sp * easeOut(q), y = I.y + Math.sin(a) * sp * easeOut(q) + 0.7 * R * q * q;
      g.spark(x, y, 9 * k * (1 - 0.5 * q), Math.atan2(Math.sin(a) + 1.4 * q, Math.cos(a)), i % 3 ? HOLY.rim : '#ffffff', 1 - q);
    }
  } else {
    const h2 = head(th - dir * 0.25 * p);
    lightHammer(g, h2.x, h2.y, th - dir * 0.25 * p + Math.PI, s, 0.18 * vis);
  }
  const h = head(th);
  lightHammer(g, h.x, h.y, th + Math.PI, s * (1 + 0.08 * bell(u, HIT, 0.3)), vis);
  if (vis > 0.02) g.mark('martillo', h.x, h.y);
};

/** Sacred Shield: a sun seal draws itself in front of the paladin, a golden shield
 *  lights inside it, a dome of light swells and the arrows glance off it. */
const escudoSagrado: Build = (g, u, c) => {
  const { cx, cy, R, k, W, H, face } = geo(c);
  const sx = cx + face * W * 0.42, sy = cy - 0.04 * H, sr = 0.36 * H;
  const draw = easeOut(span(u, 0, 0.3)), out = 1 - span(u, 0.72, 1), rot = u * 1.6;
  g.arc(sx, sy, sr, 3 * k, -Math.PI / 2, Math.PI * draw + 0.01, HOLY.rim, 0.8 * out * span(u, 0, 0.05));
  g.arc(sx, sy, sr, 1.2 * k, -Math.PI / 2, Math.PI * draw + 0.01, '#ffffff', 0.8 * out * span(u, 0, 0.05));
  const inner = span(u, 0.14, 0.3) * out;
  g.ring(sx, sy, sr * 0.82, sr * 0.82, 2 * k, HOLY.pale, 0.8 * inner);
  const glints = g.n(8);
  for (let i = 0; i < glints; i++) {
    const t = rot + (i / glints) * TAU;
    g.star(sx + Math.cos(t) * sr * 0.91, sy + Math.sin(t) * sr * 0.91, 7 * k, HOLY.pale, inner);
  }
  const fill = span(u, 0.24, 0.34) * out, flash = bell(u, 0.26, 0.5);
  g.dot(sx, sy, sr * 0.7, '#2a1e06', 0.45 * fill, false);
  g.shield(sx, sy, sr * 0.64, 0.8, HOLY.deep, 0.6 * fill);
  g.shield(sx, sy, sr * 0.64, 0.8, '#ffffff', 0.35 * flash);
  const cr = span(u, 0.2, 0.34) * out;
  g.seg(sx, sy - sr * 0.4 * cr, sx, sy + sr * 0.42 * cr, 3.5 * k, '#fff6d8', cr);
  g.seg(sx - sr * 0.26 * cr, sy - sr * 0.1, sx + sr * 0.26 * cr, sy - sr * 0.1, 3.5 * k, '#fff6d8', cr);
  // the dome of light in front of him
  const dome = easeOutBack(span(u, 0.28, 0.5)) * out, dr = R * 1.6 * (0.7 + 0.3 * dome);
  if (dome > 0.02) {
    g.arc(cx, cy, dr, 10 * k, face > 0 ? 0 : Math.PI, 0.8, HOLY.halo, 0.2 * dome);
    g.arc(cx, cy, dr, 2.5 * k, face > 0 ? 0 : Math.PI, 0.8, HOLY.pale, 0.75 * dome * (0.8 + 0.2 * Math.sin(u * 40)));
  }
  // arrows glance off the dome
  for (let i = 0; i < 3; i++) {
    const t0 = 0.3 + 0.08 * i, q = span(u, t0, t0 + 0.12), q2 = span(u, t0 + 0.12, t0 + 0.4);
    const ay = (i - 1) * 0.28 * H, ang = face > 0 ? Math.PI : 0;
    const hit = { x: cx + Math.cos(ay / dr) * dr * face, y: cy + ay };
    if (q > 0 && q < 1) {
      const x = lerp(hit.x + face * 1.4 * R, hit.x, q), y = hit.y;
      g.spark(x, y, 16 * k, ang, '#fff3d6', 0.9);
    } else if (q2 > 0 && q2 < 1) {
      const a = (face > 0 ? 0 : Math.PI) - face * (0.6 + 0.4 * i) * 0.9;
      g.spark(hit.x + Math.cos(a) * q2 * R, hit.y + Math.sin(a) * q2 * R + 0.6 * R * q2 * q2, 12 * k, a + q2 * 2, '#c9b58a', 1 - q2);
      const f = bell(q2, 0, 0.35);
      g.star(hit.x, hit.y, 16 * k * f + 0.1, '#ffffff', f);
    }
  }
  const s2 = span(u, 0.7, 1);
  if (s2 > 0 && s2 < 1) g.ring(sx, sy, sr * (1 + 0.5 * s2), sr * (1 + 0.5 * s2), 3 * k, HOLY.rim, 1 - s2);
  const n = g.n(22);
  for (let i = 0; i < n; i++) {
    const q = span(u, 0.4 + 0.35 * g.r(i), 1);
    if (q <= 0 || q >= 1) continue;
    const t = g.r(i + 20) * TAU;
    g.dot(sx + Math.cos(t) * sr * 0.9, sy + Math.sin(t) * sr * 0.9 - q * 40 * k, 2.2 * k, i % 2 ? HOLY.pale : HOLY.rim, 1 - q);
  }
};

/** Blessing: a column of dawn light rises from the ground, golden motes spiral
 *  up round the paladin, a halo forms over his head and a glint crowns it. */
const bendicion: Build = (g, u, c, D) => {
  const { b, cx, k, W, H, ground } = geo(c);
  const col = bell(u, 0, 1) * (1 - 0.3 * span(u, 0.6, 1));
  g.beam(cx, ground + 6 * k, cx, b.y - 0.5 * H, W * 0.95, HOLY.rim, 0.28 * col);
  g.beam(cx, ground + 6 * k, cx, b.y - 0.5 * H, W * 0.3, HOLY.pale, 0.35 * col);
  const s0 = span(u, 0, 0.45);
  if (s0 < 1) g.ring(cx, ground, W * (0.25 + 0.5 * easeOut(s0)), W * 0.09 * (0.25 + 0.5 * easeOut(s0)) + 2, 4 * k, HOLY.rim, 1 - s0);
  const n = g.n(30);
  for (let i = 0; i < n; i++) {
    const ph = g.r(i) * TAU, h = (u * 1.25 + g.r(i + 30)) % 1;
    const a = ph + u * D * 4 + h * 5, depth = Math.sin(a);
    const x = cx + Math.cos(a) * W * (0.46 - 0.18 * h), y = ground - h * H * 1.25;
    const al = span(u, 0, 0.15) * (1 - span(u, 0.75, 1)) * Math.sin(Math.PI * h) * (depth > 0 ? 1 : 0.45);
    if (i % 3 === 0) g.star(x, y, 7 * k, '#ffffff', al, a);
    else g.dot(x, y, (2.4 + 1.2 * g.r(i + 60)) * k, i % 2 ? HOLY.rim : HOLY.pale, al);
  }
  const hl = span(u, 0.25, 0.42) * (1 - span(u, 0.85, 1)), hy = b.y - 0.02 * H - 6 * k * span(u, 0.25, 0.5);
  g.ring(cx, hy, W * 0.24, W * 0.07, 4 * k, HOLY.rim, hl);
  g.ring(cx, hy, W * 0.24, W * 0.07, 1.5 * k, '#ffffff', hl);
  const gl = bell(u, 0.3, 0.6);
  g.star(cx, hy - 4 * k, 18 * k * gl + 0.1, '#ffffff', gl, u * 2);
  g.dot(cx, hy, 14 * k * gl + 1, HOLY.pale, 0.3 * gl);
};

/** Turn the Wicked: a wall of light sweeps over the enemy from the paladin's side,
 *  a holy sun flashes on it and dark wisps are driven out of its body. */
const expulsar: Build = (g, u, c) => {
  const { cx, cy, R, k, W, H, dir } = geo(c);
  const O = c.from ?? { x: cx - dir * 3 * W, y: cy };
  const dist = Math.hypot(cx - O.x, cy - O.y) || 1, base = Math.atan2(cy - O.y, cx - O.x);
  const front = lerp(dist - 1.4 * R, dist + 1.5 * R, easeOut(span(u, 0, 0.7)));
  const vis = span(u, 0, 0.08) * (1 - span(u, 0.6, 0.85));
  for (let i = 0; i < 3; i++) {
    const r = front - i * 16 * k;
    if (r <= 4) continue;
    const half = Math.min(1.2, (0.85 * H) / r);
    if (i === 0) g.arc(O.x, O.y, r, 22 * k, base, half, HOLY.halo, 0.25 * vis);
    g.arc(O.x, O.y, r, (i ? 3 : 7) * k, base, half, i ? HOLY.rim : HOLY.pale, vis * (i ? 0.6 / i : 1));
  }
  // light motes carried on the front
  const m = g.n(12);
  for (let i = 0; i < m; i++) {
    const a = base + (g.r(i) - 0.5) * 2 * Math.min(1.2, (0.85 * H) / Math.max(front, 1));
    const r = front - g.r(i + 20) * 30 * k;
    g.spark(O.x + Math.cos(a) * r, O.y + Math.sin(a) * r, 10 * k, a, '#ffffff', 0.8 * vis);
  }
  // the enemy lights up when the front passes
  const pass = bell(u, 0.2, 0.55);
  g.ring(cx, cy, W * 0.5, H * 0.5, 4 * k, HOLY.pale, 0.7 * pass);
  sunSigil(g, cx, cy - 0.05 * H, 0.18 * Math.min(W, H) + 4, 8, u * 2, 3 * k, HOLY.rim, '#ffffff', bell(u, 0.24, 0.6));
  // dark wisps driven out of the body, away from the paladin
  const n = g.n(12);
  for (let i = 0; i < n; i++) {
    const q = span(u, 0.26 + 0.12 * g.r(i + 40), 0.8 + 0.15 * g.r(i + 40));
    if (q <= 0 || q >= 1) continue;
    const x0 = cx + (g.r(i + 50) - 0.5) * W * 0.7, y0 = cy + (g.r(i + 60) - 0.5) * H * 0.7;
    const x = x0 + dir * easeOut(q) * R * (0.8 + 0.6 * g.r(i + 70)), y = y0 - q * 30 * k + Math.sin(q * 8 + i) * 5 * k;
    g.dot(x, y, (6 + 6 * q) * k, i % 2 ? '#2a1d38' : '#4a3a5a', 0.55 * (1 - q), false);
    if (i % 3 === 0) g.dot(x, y, 2.2 * k, '#b46bff', 0.8 * (1 - q));
  }
};

/** Holy Bolt: a sun sigil opens in the sky above the enemy, draws light in and
 *  hurls a golden zigzag bolt down on it; a cross gleam and a ring at its feet. */
const rayoSagrado: Build = (g, u, c, D) => {
  const { b, cx, cy, R, k, W, H, ground } = geo(c);
  const top = Math.max(34, b.y - 1.25 * H), open = easeOut(span(u, 0, 0.25)), out = 1 - span(u, 0.62, 0.9);
  const sr = (0.16 * W + 6) * open;
  sunSigil(g, cx, top, sr, 8, u * D * 1.5, 2.5 * k, HOLY.rim, '#ffffff', out);
  g.ring(cx, top, sr * 2.1, sr * 0.6, 2 * k, HOLY.pale, 0.6 * out);
  const n = g.n(14);
  for (let i = 0; i < n; i++) {
    const q = span(u, g.r(i) * 0.12, 0.28);
    if (q <= 0 || q >= 1) continue;
    const a = g.r(i + 10) * TAU, rad = (1 - easeIn(q)) * W * 0.7;
    g.spark(cx + Math.cos(a) * rad, top + Math.sin(a) * rad * 0.4, 8 * k, a + Math.PI, HOLY.rim, q);
  }
  const tip = { x: cx + (g.r(30) - 0.5) * 0.2 * W, y: cy - 0.05 * H };
  const on = span(u, 0.28, 0.31) * (1 - span(u, 0.5, 0.6)), frame = Math.floor(u * D * 22);
  if (on > 0 && frame % 4 !== 3) {
    const main = zigzag({ x: cx, y: top }, tip, 10, Math.min(22 * k, H * 0.12), frame, 3);
    g.beam(cx, top, tip.x, tip.y, 26 * k, HOLY.rim, 0.35 * on);
    g.strip(main, () => 10 * k, HOLY.halo, 0.45 * on);
    g.strip(main, () => 4 * k, HOLY.pale, on);
    g.strip(main, () => 1.6 * k, '#ffffff', on, false);
    g.mark('rayo', tip.x, tip.y);
  }
  const fl = bell(u, 0.29, 0.55);
  g.dot(tip.x, tip.y, R * 0.6 * fl + 1, HOLY.pale, 0.3 * fl);
  g.seg(tip.x - 0.55 * W * fl, tip.y, tip.x + 0.55 * W * fl, tip.y, 5 * k, '#ffffff', fl, 1);
  g.seg(tip.x, tip.y - 0.55 * H * fl, tip.x, tip.y + 0.45 * H * fl, 5 * k, '#ffffff', fl, 1);
  const pil = span(u, 0.5, 0.95);
  if (pil > 0 && pil < 1) g.beam(tip.x, top, tip.x, ground, 10 * k * (1 - pil) + 1, HOLY.pale, 0.4 * (1 - pil));
  const s = span(u, 0.3, 0.8);
  if (s > 0 && s < 1) g.ring(cx, ground, W * (0.2 + 0.6 * s), W * 0.07 * (0.2 + 0.6 * s) + 2, 4 * k, HOLY.rim, 1 - s);
  const m = g.n(12);
  for (let i = 0; i < m; i++) {
    const q = span(u, 0.3 + 0.1 * g.r(i + 40), 0.75 + 0.2 * g.r(i + 40));
    if (q <= 0 || q >= 1) continue;
    const a = -Math.PI / 2 + (g.r(i + 50) - 0.5) * 2.4, d = easeOut(q) * R * (0.6 + 0.6 * g.r(i + 60));
    g.spark(tip.x + Math.cos(a) * d, tip.y + Math.sin(a) * d + 0.5 * R * q * q, 8 * k, a, i % 2 ? HOLY.rim : '#ffffff', 1 - q);
  }
};

// ── Paladin charges: the raised hammer takes the element of the smite ──────

/** Divine charge: golden light spirals into the raised hammer, which flares with a
 *  cross gleam and a crown of spinning rays. */
const cargaDivina: Build = (g, u, c) => {
  const { cx, k, W, ground } = geo(c);
  const hm = heldHammer(c), vis = span(u, 0, 0.18) * (1 - span(u, 0.82, 1));
  const n = g.n(24);
  for (let i = 0; i < n; i++) {
    const q = span(u, g.r(i) * 0.14, 0.32);
    if (q <= 0 || q >= 1) continue;
    const a = g.r(i + 30) * TAU + q * 4, rad = (1 - easeIn(q)) * W * 0.9;
    g.dot(hm.x + Math.cos(a) * rad, hm.y + Math.sin(a) * rad * 0.8, 2.4 * k, i % 2 ? HOLY.rim : HOLY.pale, q);
  }
  lightHammer(g, hm.x, hm.y, hm.ang, hm.s * (1 + 0.15 * bell(u, 0.3, 0.5)), vis);
  const fl = bell(u, 0.3, 0.58);
  g.star(hm.x, hm.y, 44 * k * fl + 0.1, '#ffffff', fl);
  const rays = bell(u, 0.3, 0.9);
  for (let i = 0; i < 10; i++) {
    const a = u * 3 + (i / 10) * TAU;
    g.fang(hm.x + Math.cos(a) * hm.s * 0.6, hm.y + Math.sin(a) * hm.s * 0.6, hm.x + Math.cos(a) * hm.s * 1.25, hm.y + Math.sin(a) * hm.s * 1.25, 5 * k, HOLY.rim, 0.8 * rays);
  }
  const s = span(u, 0.3, 0.8);
  if (s > 0 && s < 1) g.ring(hm.x, hm.y, hm.s * (0.5 + 1.2 * s), hm.s * (0.5 + 1.2 * s), 3 * k, HOLY.pale, 1 - s);
  const s2 = span(u, 0.3, 0.9);
  if (s2 > 0 && s2 < 1) g.ring(cx, ground, W * (0.3 + 0.4 * s2), W * 0.08 * (0.3 + 0.4 * s2) + 2, 3 * k, HOLY.rim, 0.8 * (1 - s2));
};

/** Thunder charge: a bolt from the sky strikes the raised hammer; arcs of blue-white
 *  electricity crackle round its head and crawl down the handle. */
const cargaTrueno: Build = (g, u, c, D) => {
  const { b, k, H } = geo(c);
  const hm = heldHammer(c), vis = span(u, 0, 0.15) * (1 - span(u, 0.82, 1)), frame = Math.floor(u * D * 24);
  const skyY = Math.max(10, b.y - 1.2 * H);
  const on = span(u, 0.26, 0.29) * (1 - span(u, 0.42, 0.5));
  if (on > 0 && frame % 4 !== 2) {
    const main = zigzag({ x: hm.x + 10 * k, y: skyY }, { x: hm.x, y: hm.y }, 9, 16 * k, frame, 5);
    g.strip(main, () => 9 * k, THUNDER.halo, 0.45 * on);
    g.strip(main, () => 3.5 * k, THUNDER.pale, on);
    g.strip(main, () => 1.4 * k, '#ffffff', on, false);
  }
  const fl = bell(u, 0.27, 0.5);
  g.dot(hm.x, hm.y, hm.s * 0.9 * fl + 1, THUNDER.halo, 0.25 * fl);
  g.dot(hm.x, hm.y, hm.s * 0.25 * fl + 1, '#ffffff', 0.8 * fl);
  const crackle = span(u, 0.05, 0.2) * (1 - span(u, 0.8, 0.95)) * (0.6 + 0.4 * span(u, 0.27, 0.35));
  const arcs = g.n(4);
  if (crackle > 0) for (let j = 0; j < arcs; j++) {
    const a = hash01(frame * 5 + j, 3) * TAU, r = hm.s * (0.7 + 0.6 * hash01(frame + j, 8));
    const end = { x: hm.x + Math.cos(a) * r, y: hm.y + Math.sin(a) * r };
    g.strip(zigzag({ x: hm.x, y: hm.y }, end, 4, 6 * k, frame, j + 11), () => 1.2 * k, j % 2 ? THUNDER.rim : THUNDER.pale, 0.75 * crackle);
  }
  const down = span(u, 0.3, 0.7);
  if (down > 0 && down < 1 && frame % 2 === 0) {
    const L = 1.25 * hm.s, f = down;
    const a0 = { x: hm.x + Math.cos(hm.ang) * L * f * 0.6, y: hm.y + Math.sin(hm.ang) * L * f * 0.6 };
    const a1 = { x: hm.x + Math.cos(hm.ang) * L * (f * 0.6 + 0.4), y: hm.y + Math.sin(hm.ang) * L * (f * 0.6 + 0.4) };
    g.strip(zigzag(a0, a1, 3, 5 * k, frame, 21), () => 1.6 * k, THUNDER.pale, 1 - down);
  }
  const n = g.n(14);
  for (let i = 0; i < n; i++) {
    const q = span(u, 0.28 + 0.3 * g.r(i), 0.6 + 0.3 * g.r(i));
    if (q <= 0 || q >= 1) continue;
    const a = g.r(i + 20) * TAU, d = easeOut(q) * hm.s * 1.6;
    g.spark(hm.x + Math.cos(a) * d, hm.y + Math.sin(a) * d + 20 * k * q * q, 7 * k, a, i % 2 ? THUNDER.rim : '#ffffff', 1 - q);
  }
  lightHammer(g, hm.x, hm.y, hm.ang, hm.s, vis, THUNDER);
};

/** Blinding charge: light condenses to a point on the hammer and bursts into a
 *  white flare with spinning spokes and a long lens streak. */
const cargaCegadora: Build = (g, u, c) => {
  const { cx, cy, R, k, W } = geo(c);
  const hm = heldHammer(c), vis = span(u, 0, 0.15) * (1 - span(u, 0.8, 1));
  lightHammer(g, hm.x, hm.y, hm.ang, hm.s, vis, BLIND);
  const n = g.n(20);
  for (let i = 0; i < n; i++) {
    const q = span(u, g.r(i) * 0.12, 0.3);
    if (q <= 0 || q >= 1) continue;
    const a = g.r(i + 20) * TAU, rad = (1 - easeIn(q)) * R * 1.1;
    g.spark(hm.x + Math.cos(a) * rad, hm.y + Math.sin(a) * rad, 9 * k, a + Math.PI, BLIND.pale, q);
  }
  const pt = span(u, 0.1, 0.3) * (1 - span(u, 0.3, 0.36));
  g.dot(hm.x, hm.y, 6 * k * pt + 0.5, '#ffffff', pt);
  const fl = bell(u, 0.3, 0.62);
  g.dot(hm.x, hm.y, R * 1.1 * fl + 1, BLIND.halo, 0.3 * fl);
  g.dot(hm.x, hm.y, R * 0.35 * fl + 1, '#ffffff', 0.95 * fl);
  const sp = bell(u, 0.3, 0.8);
  for (let i = 0; i < 12; i++) {
    const a = u * 2.4 + (i / 12) * TAU, L = R * (0.7 + 0.4 * (i % 2)) * (0.5 + 0.5 * sp);
    g.beam(hm.x, hm.y, hm.x + Math.cos(a) * L, hm.y + Math.sin(a) * L, 6 * k, '#ffffff', 0.45 * sp);
  }
  const st = bell(u, 0.3, 0.7);
  g.seg(hm.x - W * 0.9 * st, hm.y, hm.x + W * 0.9 * st, hm.y, 3 * k, '#ffffff', 0.8 * st, 1);
  for (const f of [-0.6, 0.45, 0.8]) g.ring(hm.x + f * W * 0.8, hm.y + f * 4 * k, 6 * k, 6 * k, 1.4 * k, BLIND.deep, 0.6 * st);
  const m = g.n(10);
  for (let i = 0; i < m; i++) {
    const tw = bell(u, 0.45 + 0.4 * g.r(i + 40), 1);
    g.star(cx + (g.r(i + 50) - 0.3) * W, cy + (g.r(i + 60) - 0.7) * R, 8 * k * tw + 0.1, '#ffffff', tw);
  }
};

/** Fire charge: golden-orange flames lick up the hammer head, a ring of fire runs
 *  round the paladin's feet and embers rise. */
const cargaFuego: Build = (g, u, c, D) => {
  const { b, cx, k, W, H, ground } = geo(c);
  const hm = heldHammer(c), vis = span(u, 0, 0.15) * (1 - span(u, 0.82, 1));
  g.dot(hm.x, hm.y, hm.s * 1.1, SMITE_FIRE.deep, 0.18 * vis * (1 + 0.2 * Math.sin(u * D * 20)));
  const fl = span(u, 0.12, 0.3) * (1 - span(u, 0.78, 0.95));
  const cols = ['#fff1c9', '#ffd35a', '#ffb347', '#ff7a2a'];
  const t = g.n(5);
  for (let i = 0; i < t; i++) {
    const off = (i / Math.max(1, t - 1) - 0.5) * hm.s * 0.9;
    const px = -Math.sin(hm.ang), py = Math.cos(hm.ang);
    tongue(g, hm.x + px * off, hm.y + py * off - 4 * k, hm.s * (0.8 + 0.5 * g.r(i)) * fl, 11 * k, u * D, i, cols, 0.75 * fl);
  }
  lightHammer(g, hm.x, hm.y, hm.ang, hm.s, vis, SMITE_FIRE);
  const ring = easeOut(span(u, 0.2, 0.45)) * (1 - span(u, 0.8, 1));
  if (ring > 0.02) {
    g.ring(cx, ground, W * 0.6 * ring, W * 0.14 * ring + 1, 4 * k, SMITE_FIRE.halo, ring);
    const m = g.n(8);
    for (let i = 0; i < m; i++) {
      const a = (i / m) * TAU + u * 2;
      tongue(g, cx + Math.cos(a) * W * 0.6 * ring, ground + Math.sin(a) * W * 0.14 * ring, H * 0.22 * ring * (0.7 + 0.5 * g.r(i + 10)), 10 * k, u * D, i + 7, cols.slice(1), 0.8 * ring);
    }
  }
  const e = g.n(16);
  for (let i = 0; i < e; i++) {
    const q = span(u, 0.2 + 0.5 * g.r(i + 30), 0.6 + 0.4 * g.r(i + 30));
    if (q <= 0 || q >= 1) continue;
    const x = (i % 2 ? hm.x : cx) + (g.r(i + 40) - 0.5) * W * 0.8 + Math.sin(q * 9 + i) * 5 * k;
    const y = (i % 2 ? hm.y : ground) - q * H * 0.7;
    if (y < b.y - 0.9 * H) continue;
    g.spark(x, y, 6 * k, -Math.PI / 2, i % 3 ? '#ffb347' : '#ffd35a', 1 - q);
  }
};

/** Radiant charge: soft golden rings breathe out of the hammer, a warm aura wraps
 *  the paladin and a faint shield glints ahead of him. */
const cargaResplandor: Build = (g, u, c) => {
  const { cx, cy, R, k, W, H, face } = geo(c);
  const hm = heldHammer(c), vis = span(u, 0, 0.2) * (1 - span(u, 0.82, 1));
  const aura = bell(u, 0, 1);
  g.dot(cx, cy, R * 1.05, RADIANT.halo, 0.12 * aura);
  g.dot(cx, cy, R * 0.6, RADIANT.pale, 0.1 * aura);
  lightHammer(g, hm.x, hm.y, hm.ang, hm.s, vis, RADIANT);
  for (let i = 0; i < 4; i++) {
    const s = span(u, 0.1 + i * 0.15, 0.55 + i * 0.15);
    if (s > 0 && s < 1) g.ring(hm.x, hm.y, hm.s * (0.4 + 1.8 * s), hm.s * (0.4 + 1.8 * s), 3 * k * (1 - s) + 0.8, i % 2 ? RADIANT.rim : RADIANT.pale, 0.8 * Math.sin(Math.PI * s));
  }
  const sh = bell(u, 0.4, 0.95), sx = cx + face * W * 0.5;
  g.shield(sx, cy, H * 0.3, 0.55, RADIANT.rim, 0.45 * sh);
  const n = g.n(18);
  for (let i = 0; i < n; i++) {
    const tw = bell(u, 0.15 + 0.6 * g.r(i), 0.5 + 0.5 * g.r(i) + 0.1);
    const a = g.r(i + 20) * TAU, d = R * (0.4 + 0.7 * g.r(i + 30));
    g.star(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.9 - u * 20 * k, 7 * k * tw + 0.1, i % 3 ? RADIANT.pale : '#ffffff', 0.9 * tw);
  }
};

/** Banishing charge: a violet seal with golden runes turns under the paladin's
 *  feet, a small seal wheels behind the hammer head and violet-gold motes rise. */
const cargaDestierro: Build = (g, u, c, D) => {
  const { cx, k, W, H, ground } = geo(c);
  const hm = heldHammer(c), vis = span(u, 0, 0.18) * (1 - span(u, 0.82, 1));
  const open = easeOut(span(u, 0, 0.3)) * (1 - span(u, 0.82, 1)), rx = W * 0.62 * open, ry = W * 0.16 * open;
  if (rx > 2) {
    g.dot(cx, ground, rx * 0.8, '#1a0a2a', 0.3 * open, false);
    g.ring(cx, ground, rx, ry, 4 * k, BANISH.rim, open);
    g.ring(cx, ground, rx * 0.72, ry * 0.72, 2 * k, BANISH.deep, open);
    for (let i = 0; i < 6; i++) {
      const t = u * D * 1.2 + (i / 6) * TAU;
      g.rune(cx + Math.cos(t) * rx * 0.86, ground + Math.sin(t) * ry * 0.86, 5 * k, t, i % 2 ? BANISH.deep : BANISH.pale, open);
    }
  }
  g.rune(hm.x, hm.y, hm.s * 0.95 * span(u, 0.1, 0.35), -u * D * 2, BANISH.rim, 0.8 * vis);
  lightHammer(g, hm.x, hm.y, hm.ang, hm.s, vis, BANISH);
  const fl = bell(u, 0.3, 0.55);
  g.dot(hm.x, hm.y, hm.s * 0.5 * fl + 1, BANISH.deep, 0.6 * fl);
  const n = g.n(22);
  for (let i = 0; i < n; i++) {
    const q = span(u, 0.1 + 0.6 * g.r(i), 0.45 + 0.55 * g.r(i));
    if (q <= 0 || q >= 1) continue;
    const a = g.r(i + 20) * TAU;
    g.dot(cx + Math.cos(a) * rx * 0.8 + Math.sin(q * 7 + i) * 4 * k, ground + Math.sin(a) * ry * 0.8 - q * H * 0.9, 2.4 * k, i % 3 ? BANISH.rim : BANISH.deep, 1 - q);
  }
};

// ── Paladin smites: the element discharges on the enemy with the attack ─────

/** Colours of a smite's impact: the same as the flames the paladin burned with. */
const flamesOf = (kind: FlameKind) => FLAME_PALETTES[kind];

/** Smite (generic): the holy fire the paladin was burning with leaps onto the
 *  enemy: a sacred cross of light flares on the blow and yellow holy flames
 *  engulf it from a ring of fire at its feet. */
const castigoGenerico: Build = (g, u, c, D) => {
  const { b, cx, cy, R, k, W, H, ground } = geo(c);
  const P = flamesOf('holy'), HIT = 0.14, fire = [P.outer[0], P.outer[1], P.outer[2], P.ember[1]];
  const n0 = g.n(12);
  for (let i = 0; i < n0; i++) {
    const q = span(u, g.r(i) * 0.05, HIT);
    if (q <= 0 || q >= 1) continue;
    const a = g.r(i + 10) * TAU, rad = (1 - easeIn(q)) * R * 1.4;
    g.spark(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, 11 * k, a + Math.PI, P.outer[i % 3], q);
  }
  if (u < HIT) return;
  // the sacred cross flares on the blow
  const cr = easeOut(span(u, HIT, HIT + 0.1)), cf = 1 - span(u, 0.36, 0.62), crY = cy - 0.08 * H;
  if (cf > 0) {
    g.seg(cx, crY - H * 0.72 * cr, cx, crY + H * 0.62 * cr, 18 * k, P.outer[1], 0.35 * cf, 1);
    g.seg(cx - W * 0.5 * cr, crY - H * 0.12, cx + W * 0.5 * cr, crY - H * 0.12, 18 * k, P.outer[1], 0.35 * cf, 1);
    g.seg(cx, crY - H * 0.7 * cr, cx, crY + H * 0.6 * cr, 6 * k, P.core[0], cf, 1);
    g.seg(cx - W * 0.48 * cr, crY - H * 0.12, cx + W * 0.48 * cr, crY - H * 0.12, 6 * k, P.core[0], cf, 1);
  }
  const fl = 1 - span(u, HIT, 0.42);
  g.dot(cx, crY - H * 0.12, R * 0.7 * fl + 1, P.outer[0], 0.28 * fl);
  g.dot(cx, crY - H * 0.12, 14 * k * fl + 1, P.core[0], 0.9 * fl);
  // holy flames engulf it
  const burn = span(u, HIT, HIT + 0.1) * (1 - span(u, 0.66, 0.92)), t = g.n(8);
  for (let i = 0; i < t; i++) {
    const f = i / Math.max(1, t - 1), mid = 1 - Math.abs(f - 0.5) * 1.4;
    const x = b.x + (0.08 + 0.84 * f + (g.r(i + 20) - 0.5) * 0.08) * W;
    tongue(g, x, ground - (4 + g.r(i + 30) * 14) * k, H * (0.35 + 0.55 * mid + 0.2 * g.r(i + 40)) * burn, (13 + 8 * g.r(i + 50)) * k, u * D, i, fire, 0.62 * burn);
  }
  const s = span(u, HIT, 0.75);
  if (s > 0 && s < 1) {
    const rx = W * (0.35 + 0.9 * easeOut(s));
    g.ring(cx, ground, rx, rx * 0.2 + 2, 5 * k * (1 - s) + 1.5, P.outer[2], 1 - s);
    g.ring(cx, ground, rx * 0.9, rx * 0.18 + 2, 2 * k, P.core[1], 0.8 * (1 - s));
  }
  const m = g.n(12), G = 1100 * k;
  for (let i = 0; i < m; i++) {
    const tau = (u - HIT) * D, vx = (g.r(i + 60) - 0.5) * 360 * k, vy = -(240 + 220 * g.r(i + 70)) * k;
    if (tau > 0.5) continue;
    const pp = fly(cx, crY, vx, vy, tau, G);
    g.drop(pp.x, pp.y, (3.5 + 2.5 * g.r(i + 80)) * k, dropAngle(vx, vy + G * tau), P.outer[i % 3], 1 - tau / 0.5);
  }
  const e = g.n(16);
  for (let i = 0; i < e; i++) {
    const q = span(u, HIT + 0.35 * g.r(i + 90), 0.62 + 0.38 * g.r(i + 90));
    if (q > 0 && q < 1) g.spark(cx + (g.r(i + 100) - 0.5) * W * 1.3 + Math.sin(q * 7 + i) * 5 * k, ground - q * H * 1.35, 7 * k, -Math.PI / 2, P.ember[i % 3], 1 - q);
  }
};

/** Divine Smite: an amber sun sigil drops out of the sky onto the enemy, stamps
 *  on it with a shockwave and burns there as a flaming sun, spokes of amber
 *  light wheeling out of it, until it crumbles into embers. */
const castigoDivino: Build = (g, u, c) => {
  const { b, cx, cy, R, k, W, H, ground } = geo(c);
  const P = flamesOf('divino'), HIT = 0.16, sr = 0.34 * Math.min(W, H) + 6;
  const fall = easeIn(span(u, 0, HIT)), sy = lerp(Math.max(20, b.y - 1.1 * H), cy, fall);
  const burnOut = span(u, 0.62, 0.9), vis = span(u, 0, 0.04) * (1 - burnOut);
  const r = sr * (u < HIT ? 0.55 + 0.45 * fall : 1 + 0.25 * bell(u, HIT, 0.32)) * (1 - 0.5 * burnOut);
  if (u < HIT) g.fang(cx, sy - r * 0.2, cx, sy - r * 0.2 - H * 0.7 * (1 - fall * 0.6), r * 0.9, P.outer[1], 0.35 * vis);
  sunSigil(g, cx, sy, r, 10, u * 2.2, 4.5 * k, P.outer[0], P.core[0], vis);
  if (u < HIT) return;
  const fl = 1 - span(u, HIT, 0.46);
  g.dot(cx, cy, R * 1.05 * fl + 1, P.outer[1], 0.3 * fl);
  g.dot(cx, cy, 18 * k * fl + 1, '#ffffff', 0.95 * fl);
  // the flaming corona round the stamped sun
  const cor = span(u, HIT, HIT + 0.06) * (1 - burnOut), n = g.n(14);
  for (let i = 0; i < n; i++) {
    const a = u * 2.2 + (i / n) * TAU, fx = 0.8 + 0.25 * Math.sin(u * 40 + i * 1.7);
    const x = cx + Math.cos(a) * r * 1.62, y = cy + Math.sin(a) * r * 1.62;
    g.drop(x, y, 7 * k * fx * cor + 0.5, a + Math.PI / 2, P.outer[i % 3], 0.9 * cor);
    g.drop(x - Math.cos(a) * 3 * k, y - Math.sin(a) * 3 * k, 3.5 * k * fx * cor + 0.5, a + Math.PI / 2, P.core[1], cor);
  }
  const sp = bell(u, HIT, 0.8);
  for (let i = 0; i < 12; i++) {
    const a = -u * 1.6 + (i / 12) * TAU, L = R * (1.2 + 0.4 * (i % 3));
    g.beam(cx + Math.cos(a) * r, cy + Math.sin(a) * r, cx + Math.cos(a) * L, cy + Math.sin(a) * L, 12 * k, P.outer[2], 0.35 * sp);
  }
  for (let i = 0; i < 2; i++) {
    const s = span(u, HIT + i * 0.07, 0.62 + i * 0.1);
    if (s > 0 && s < 1) g.ring(cx, cy, R * (0.35 + 1.1 * easeOut(s)), R * (0.35 + 1.1 * easeOut(s)), 6 * k * (1 - s) + 1, i ? P.core[1] : P.outer[1], 1 - s);
  }
  const s2 = span(u, HIT, 0.7);
  if (s2 > 0 && s2 < 1) g.ring(cx, ground, W * (0.3 + 0.8 * s2), W * 0.09 * (0.3 + 0.8 * s2) + 2, 4 * k, P.outer[2], 0.9 * (1 - s2));
  const m = g.n(22);
  for (let i = 0; i < m; i++) {
    const q = span(u, 0.55 + 0.25 * g.r(i + 30), 0.85 + 0.15 * g.r(i + 30));
    if (q <= 0 || q >= 1) continue;
    const a = g.r(i + 40) * TAU, d = r * (0.6 + 0.9 * q);
    g.dot(cx + Math.cos(a) * d, cy + Math.sin(a) * d - q * 30 * k, 2.6 * k, P.ember[i % 3], 1 - q);
  }
};

/** Thundering Smite: electric-blue bolts fork out of the blow to the ground, a
 *  thunderclap rolls out in waves and sparks crackle over the body. */
const castigoTrueno: Build = (g, u, c, D) => {
  const { cx, cy, R, k, W, H, ground } = geo(c);
  const P = flamesOf('trueno'), HIT = 0.14, frame = Math.floor(u * D * 24);
  const ch = span(u, 0, HIT);
  if (u < HIT) { g.dot(cx, cy, 10 * k * ch + 1, P.core[2], ch); g.dot(cx, cy, 30 * k * ch + 1, P.outer[2], 0.3 * ch); return; }
  const on = 1 - span(u, 0.4, 0.55);
  if (on > 0 && frame % 5 !== 4) {
    const bolts = g.n(4);
    for (let j = 0; j < bolts; j++) {
      const a = Math.PI / 2 + (j / Math.max(1, bolts - 1) - 0.5) * 2.6 + (g.r(j) - 0.5) * 0.3;
      const end = { x: cx + Math.cos(a) * W * 1.25, y: Math.min(ground, cy + Math.sin(a) * H * 0.9) };
      const pts = zigzag({ x: cx + Math.cos(a) * R * 0.2, y: cy - 0.1 * H + Math.sin(a) * R * 0.12 }, end, 8, 18 * k, frame, j + 3);
      g.strip(pts, () => 5 * k, P.outer[2], 0.3 * on);
      g.strip(pts, () => 2 * k, P.core[2], on);
      g.strip(pts, () => 1 * k, '#ffffff', on, false);
    }
  }
  const fl = bell(u, HIT, 0.4);
  g.dot(cx, cy, R * 0.8 * fl + 1, P.outer[2], 0.22 * fl);
  g.dot(cx, cy, 12 * k * fl + 1, '#ffffff', 0.85 * fl);
  for (let i = 0; i < 3; i++) {
    const s = span(u, HIT + i * 0.07, 0.62 + i * 0.1);
    if (s <= 0 || s >= 1) continue;
    const r = R * (0.35 + 1.1 * easeOut(s));
    g.arc(cx, cy, r, 5 * k * (1 - s) + 1, 0, 0.7, P.outer[1], 0.9 * (1 - s));
    g.arc(cx, cy, r, 5 * k * (1 - s) + 1, Math.PI, 0.7, P.outer[1], 0.9 * (1 - s));
  }
  const s = span(u, HIT, 0.7);
  if (s > 0 && s < 1) g.ring(cx, ground, W * (0.3 + 0.8 * s), W * 0.09 * (0.3 + 0.8 * s) + 2, 4 * k, P.outer[0], 1 - s);
  const cr = span(u, 0.3, 0.36) * (1 - span(u, 0.7, 0.9));
  if (cr > 0) for (let j = 0; j < g.n(3); j++) {
    const a0 = { x: cx + (hash01(frame, j + 40) - 0.5) * W * 0.8, y: cy + (hash01(frame, j + 50) - 0.5) * H * 0.8 };
    const a1 = { x: a0.x + (hash01(frame, j + 60) - 0.5) * 40 * k, y: a0.y + (hash01(frame, j + 70) - 0.5) * 40 * k };
    g.strip(zigzag(a0, a1, 4, 7 * k, frame, j + 30), () => 1.2 * k, P.outer[1], 0.8 * cr, false);
  }
  const m = g.n(16);
  for (let i = 0; i < m; i++) {
    const q = span(u, HIT + 0.05 * g.r(i + 80), 0.55 + 0.2 * g.r(i + 80));
    if (q <= 0 || q >= 1) continue;
    const a = g.r(i + 90) * TAU, d = easeOut(q) * R * (0.7 + 0.7 * g.r(i + 95));
    g.spark(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 10 * k, a, P.ember[i % 3], 1 - q);
  }
};

/** Blinding Smite: a silver-white flash bursts on the blow with a lens streak and
 *  spokes, then little stars reel round the dazzled enemy's head. */
const castigoCegador: Build = (g, u, c) => {
  const { b, cx, cy, R, k, W, H } = geo(c);
  const P = flamesOf('cegador'), HIT = 0.14;
  const pre = span(u, 0, HIT);
  if (u < HIT) { g.dot(cx, cy, 8 * k * pre + 0.5, '#ffffff', pre); return; }
  const fl = 1 - span(u, HIT, 0.5);
  g.dot(cx, cy, R * 1.4 * fl + 1, P.outer[1], 0.35 * fl);
  g.dot(cx, cy, R * 0.5 * fl + 1, '#ffffff', 0.95 * fl);
  const st = bell(u, HIT, 0.55);
  g.seg(cx - W * 1.3 * st, cy, cx + W * 1.3 * st, cy, 4 * k, '#ffffff', 0.9 * st, 1);
  g.seg(cx - W * 0.7 * st, cy, cx + W * 0.7 * st, cy, 10 * k, P.outer[0], 0.35 * st, 1);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU + u, L = R * (0.9 + 0.5 * (i % 2)) * st;
    g.beam(cx, cy, cx + Math.cos(a) * L, cy + Math.sin(a) * L, 5 * k, P.core[i % 3], 0.4 * st);
  }
  const s = span(u, HIT, 0.55);
  if (s > 0 && s < 1) g.ring(cx, cy, R * (0.3 + s), R * (0.3 + s), 3 * k, P.outer[2], 1 - s);
  // dazed: stars reel round the head
  const dz = span(u, 0.35, 0.45) * (1 - span(u, 0.85, 1)), hy = b.y + 0.12 * H;
  const n = g.n(5);
  for (let i = 0; i < n; i++) {
    const a = u * 11 + (i / n) * TAU, depth = Math.sin(a);
    g.star(cx + Math.cos(a) * W * 0.3, hy + depth * W * 0.07, (7 + 3 * depth) * k, i % 2 ? P.ember[1] : '#ffffff', dz * (depth > -0.3 ? 1 : 0.5), a);
  }
  const m = g.n(12);
  for (let i = 0; i < m; i++) {
    const tw = bell(u, HIT + 0.5 * g.r(i), HIT + 0.3 + 0.5 * g.r(i));
    g.dot(cx + (g.r(i + 20) - 0.5) * W * 1.6, cy + (g.r(i + 30) - 0.5) * H * 1.2, 2.2 * k, P.ember[i % 3], tw);
  }
};

/** Searing Smite: the blow explodes in orange-red fire, flaming gobs splash out
 *  onto the ground around the enemy and a ring of fire spreads from its feet. */
const castigoFuego: Build = (g, u, c, D) => {
  const { cx, cy, R, k, W, H, ground } = geo(c);
  const P = flamesOf('fuego'), HIT = 0.15, cols = [P.core[2], P.core[1], P.outer[2], P.outer[0]];
  const pre = span(u, 0, HIT);
  if (u < HIT) { g.dot(cx, cy, 14 * k * pre + 1, P.ember[0], 0.8 * pre); return; }
  const fl = 1 - span(u, HIT, 0.5);
  g.dot(cx, cy, R * 0.95 * fl + 1, P.outer[0], 0.4 * fl);
  g.dot(cx, cy, R * 0.4 * fl + 1, P.core[2], 0.9 * fl);
  const burn = span(u, HIT, 0.25) * (1 - span(u, 0.7, 0.95));
  const t = g.n(6);
  for (let i = 0; i < t; i++) {
    const x = cx + (i / Math.max(1, t - 1) - 0.5 + (g.r(i + 90) - 0.5) * 0.12) * W * 0.85;
    const y = ground - (2 + 10 * g.r(i + 95)) * k, mid = 1 - Math.abs(i / Math.max(1, t - 1) - 0.5);
    tongue(g, x, y, H * (0.25 + 0.5 * mid + 0.25 * g.r(i + 5)) * burn, (11 + 8 * g.r(i + 99)) * k, u * D, i, cols, 0.85 * burn);
  }
  const s = span(u, HIT, 0.85);
  if (s > 0 && s < 1) {
    const rx = W * (0.3 + 1.4 * easeOut(s));
    g.ring(cx, ground, rx, rx * 0.2 + 2, 5 * k * (1 - s) + 1.5, P.outer[0], 1 - s);
    g.ring(cx, ground, rx * 0.92, rx * 0.18 + 2, 2 * k, P.core[1], 0.8 * (1 - s));
  }
  // splashes: flaming gobs arc out and land on the ground around it
  const G = 1400 * k, m = g.n(14);
  for (let i = 0; i < m; i++) {
    const side = i % 2 ? 1 : -1, vx = side * (180 + 260 * g.r(i + 20)) * k, vy = -(260 + 240 * g.r(i + 30)) * k;
    const tau = (u - HIT) * D * 0.9, land = (-vy + Math.sqrt(vy * vy + 2 * G * (ground - cy))) / G;
    if (tau < land) {
      const p = fly(cx, cy, vx, vy, tau, G);
      g.drop(p.x, p.y, (4 + 3 * g.r(i + 40)) * k, dropAngle(vx, vy + G * tau), i % 3 ? P.outer[2] : P.ember[0], 1);
    } else {
      const q = span(tau, land, land + 0.35);
      if (q >= 1) continue;
      tongue(g, cx + vx * land, ground, 22 * k * Math.sin(Math.PI * q), 9 * k, u * D, i + 20, cols.slice(1), 1 - q * 0.5);
    }
  }
  const e = g.n(12);
  for (let i = 0; i < e; i++) {
    const q = span(u, HIT + 0.4 * g.r(i + 60), 0.7 + 0.3 * g.r(i + 60));
    if (q > 0 && q < 1) g.spark(cx + (g.r(i + 70) - 0.5) * W * 1.4, ground - q * H * 1.3, 6 * k, -Math.PI / 2, P.ember[i % 3], 1 - q);
  }
};

/** Radiant Smite: a soft peach bloom on the enemy, then a ribbon of light flows
 *  back to the paladin and gathers into a shield before him. */
const castigoResplandor: Build = (g, u, c) => {
  const { cx, cy, R, k, W, H, dir } = geo(c);
  const P = flamesOf('resplandor'), HIT = 0.15;
  const pre = span(u, 0, HIT);
  if (u < HIT) { g.dot(cx, cy, 12 * k * pre + 1, P.core[1], pre); return; }
  const fl = bell(u, HIT, 0.55);
  g.dot(cx, cy, R * 1.1 * fl + 1, P.outer[1], 0.3 * fl);
  g.dot(cx, cy, R * 0.35 * fl + 1, '#ffffff', 0.8 * fl);
  for (let i = 0; i < 3; i++) {
    const s = span(u, HIT + i * 0.1, 0.6 + i * 0.1);
    if (s > 0 && s < 1) g.ring(cx, cy, R * (0.3 + 0.9 * s), R * (0.3 + 0.9 * s), 3 * k, i % 2 ? P.outer[0] : P.outer[2], 0.8 * Math.sin(Math.PI * s));
  }
  const src = c.from;
  if (src && Math.hypot(src.x - cx, src.y - cy) > 60) {
    const mid = { x: (cx + src.x) / 2, y: Math.min(cy, src.y) - Math.abs(cx - src.x) * 0.25 };
    const n = g.n(26);
    for (let i = 0; i < n; i++) {
      const q = span(u, 0.22 + 0.35 * g.r(i), 0.62 + 0.3 * g.r(i));
      if (q <= 0 || q >= 1) continue;
      const e = easeInOut(q), wob = Math.sin(q * 9 + i) * 10 * k;
      const x = (1 - e) * (1 - e) * cx + 2 * (1 - e) * e * mid.x + e * e * src.x;
      const y = (1 - e) * (1 - e) * cy + 2 * (1 - e) * e * mid.y + e * e * src.y + wob;
      if (i % 3 === 0) g.star(x, y, 8 * k, '#ffffff', Math.sin(Math.PI * q));
      else g.dot(x, y, 2.6 * k, i % 2 ? P.outer[0] : P.ember[0], Math.sin(Math.PI * q));
    }
    const sh = span(u, 0.6, 0.72) * (1 - span(u, 0.9, 1)), sx = src.x + dir * 38 * k;
    g.shield(sx, src.y, 46 * k, 0.6, P.outer[0], 0.75 * sh);
    g.shield(sx, src.y, 46 * k, 0.6, '#ffffff', 0.5 * bell(u, 0.62, 0.8));
  } else {
    const n = g.n(16);
    for (let i = 0; i < n; i++) {
      const q = span(u, HIT + 0.4 * g.r(i), 0.6 + 0.4 * g.r(i));
      if (q > 0 && q < 1) g.dot(cx + (g.r(i + 10) - 0.5) * W, cy - q * H * 0.9, 2.4 * k, P.ember[i % 3], 1 - q);
    }
  }
};

/** Banishing Smite: a violet-and-gold seal opens under the enemy, a column of light
 *  rises from it, tendrils drag the enemy down and the seal snaps shut. */
const castigoDestierro: Build = (g, u, c, D) => {
  const { cx, cy, k, W, H, ground } = geo(c);
  const HIT = 0.16, open = easeOutBack(span(u, 0, HIT)) * (1 - easeIn(span(u, 0.7, 0.86)));
  const rx = W * 0.8 * Math.max(0, open), ry = W * 0.27 * Math.max(0, open), rot = u * D * 1.4;
  if (rx > 2) {
    g.dot(cx, ground, rx * 0.9, '#12041f', 0.6 * Math.min(1, open), false);
    g.ring(cx, ground, rx, ry, 3.5 * k, BANISH.rim, 0.9);
    g.ring(cx, ground, rx * 0.8, ry * 0.8, 1.6 * k, BANISH.deep, 0.8);
    const P = (i: number) => ({ x: cx + Math.cos(rot + (i * TAU) / 6) * rx * 0.8, y: ground + Math.sin(rot + (i * TAU) / 6) * ry * 0.8 });
    for (let i = 0; i < 6; i++) { const a = P(i), b2 = P(i + 2); g.seg(a.x, a.y, b2.x, b2.y, 1.4 * k, i % 2 ? BANISH.deep : BANISH.rim, 0.55); }
    const runes = g.n(8);
    for (let i = 0; i < runes; i++) {
      const t = -rot + (i / runes) * TAU;
      g.rune(cx + Math.cos(t) * rx * 1.12, ground + Math.sin(t) * ry * 1.12, 6 * k, t, i % 2 ? BANISH.deep : BANISH.pale, 0.75);
    }
  }
  const col = span(u, HIT, 0.24) * (1 - span(u, 0.62, 0.8));
  g.beam(cx, ground, cx, cy - 0.8 * H, W * 0.8, BANISH.halo, 0.4 * col);
  g.beam(cx, ground, cx, cy - 0.8 * H, W * 0.25, BANISH.deep, 0.5 * col);
  // tendrils of the seal drag the enemy down
  const grab = easeOut(span(u, 0.2, 0.36)) * (1 - span(u, 0.62, 0.76)), pull = span(u, 0.4, 0.7);
  const tendrils = g.n(5);
  if (grab > 0.02) for (let v = 0; v < tendrils; v++) {
    const bx = cx + (v / Math.max(1, tendrils - 1) - 0.5) * rx * 1.4, pts: Point[] = [];
    const reach = grab * (1 - 0.6 * pull);
    for (let j = 0; j <= 6; j++) {
      const s = (j / 6) * reach;
      pts.push({ x: bx + Math.sin(s * 6 + v * 2 + u * D * 5) * 10 * k * s + (cx - bx) * 0.4 * s, y: ground - s * H * 0.85 });
    }
    g.strip(pts, (j) => (6 - j * 0.6) * k + 1, BANISH.rim, 0.4);
    g.strip(pts, (j) => (4 - j * 0.4) * k + 0.6, '#2a0c45', 0.9, false);
  }
  const n = g.n(26);
  for (let i = 0; i < n; i++) {
    const q = span(u, 0.2 + 0.35 * g.r(i), 0.55 + 0.3 * g.r(i));
    if (q <= 0 || q >= 1) continue;
    const x0 = cx + (g.r(i + 10) - 0.5) * W * 0.9, y0 = cy + (g.r(i + 20) - 0.5) * H * 0.7;
    g.dot(lerp(x0, cx, easeIn(q) * 0.6), lerp(y0, ground, easeIn(q)), 2.6 * k, i % 3 ? BANISH.pale : BANISH.deep, 1 - q * 0.6);
  }
  const shut = bell(u, 0.8, 0.95);
  g.dot(cx, ground, 24 * k * shut + 1, BANISH.deep, 0.8 * shut);
  g.seg(cx - W * 0.6 * shut, ground, cx + W * 0.6 * shut, ground, 3 * k, '#ffffff', shut, 1);
};

export const SPELLS: Record<string, SpellDef> = {
  tajo: { duration: 0.5, phases: [0.2, 0.5], anchor: 'target', build: tajo },
  zarpa: { duration: 0.65, phases: [0.3, 0.6], anchor: 'target', build: zarpa },
  impacto: { duration: 0.55, phases: [0.15, 0.5], anchor: 'target', build: impacto },
  sangre: { duration: 0.85, phases: [0.2, 0.6], anchor: 'target', build: sangre },
  abisal: { duration: 1.0, phases: [0.3, 0.7], anchor: 'target', build: abisal },
  condena: { duration: 1.1, phases: [0.45, 0.75], anchor: 'target', build: condena },
  luna: { duration: 0.85, phases: [0.25, 0.6], anchor: 'target', build: luna },
  estrellas: { duration: 1.2, phases: [0.35, 0.7], anchor: 'target', build: estrellas },
  divino: { duration: 1.1, phases: [0.3, 0.75], anchor: 'target', build: divino },
  ola: { duration: 1.1, phases: [0.35, 0.65], anchor: 'target', build: ola },
  aullido: { duration: 1.0, phases: [0.2, 0.7], anchor: 'target', build: aullido },
  raices: { duration: 1.2, phases: [0.45, 0.72], anchor: 'target', build: raices },
  tierra: { duration: 0.9, phases: [0.3, 0.65], anchor: 'target', build: tierra },
  veneno: { duration: 1.2, phases: [0.3, 0.8], anchor: 'target', build: veneno },
  transformacion: { duration: 1.3, phases: [0.4, 0.75], anchor: 'self', build: transformacion },
  muerte: { duration: 1.2, phases: [0.3, 0.7], anchor: 'target', build: muerte },
  oscuridad: { duration: 1.1, phases: [0.4, 0.75], anchor: 'target', build: oscuridad },
  hojas: { duration: 1.0, phases: [0.35, 0.7], anchor: 'target', build: hojas },
  furia: { duration: 1.0, phases: [0.25, 0.7], anchor: 'self', build: furia },
  bloqueo: { duration: 0.9, phases: [0.35, 0.7], anchor: 'self', build: bloqueo },
  corazones: { duration: 1.2, phases: [0.4, 0.75], anchor: 'target', build: corazones },
  // enemy signature moves
  aliento: { duration: 1.3, phases: [0.25, 0.8], anchor: 'target', build: aliento },
  rayoOcular: { duration: 0.8, phases: [0.2, 0.7], anchor: 'target', build: rayoOcular },
  rayoDM: { duration: 1.35, phases: [0.3, 0.75], anchor: 'target', build: rayoDM },
  // paladin: hammer blows, holy light, and the charge and discharge of each smite
  martillo: { duration: 0.55, phases: [0.2, 0.5], anchor: 'target', build: martillo },
  escudoSagrado: { duration: 0.9, phases: [0.3, 0.7], anchor: 'self', build: escudoSagrado },
  bendicion: { duration: 1.0, phases: [0.3, 0.72], anchor: 'self', build: bendicion },
  expulsar: { duration: 0.95, phases: [0.25, 0.65], anchor: 'target', build: expulsar },
  rayoSagrado: { duration: 0.85, phases: [0.3, 0.65], anchor: 'target', build: rayoSagrado },
  cargaDivina: { duration: 0.9, phases: [0.3, 0.7], anchor: 'self', build: cargaDivina },
  cargaTrueno: { duration: 0.85, phases: [0.27, 0.7], anchor: 'self', build: cargaTrueno },
  cargaCegadora: { duration: 0.8, phases: [0.3, 0.65], anchor: 'self', build: cargaCegadora },
  cargaFuego: { duration: 0.9, phases: [0.3, 0.72], anchor: 'self', build: cargaFuego },
  cargaResplandor: { duration: 1.0, phases: [0.3, 0.72], anchor: 'self', build: cargaResplandor },
  cargaDestierro: { duration: 1.0, phases: [0.3, 0.72], anchor: 'self', build: cargaDestierro },
  castigoGenerico: { duration: 0.85, phases: [0.14, 0.6], anchor: 'target', build: castigoGenerico },
  castigoDivino: { duration: 0.9, phases: [0.16, 0.6], anchor: 'target', build: castigoDivino },
  castigoTrueno: { duration: 0.85, phases: [0.14, 0.6], anchor: 'target', build: castigoTrueno },
  castigoCegador: { duration: 0.9, phases: [0.14, 0.55], anchor: 'target', build: castigoCegador },
  castigoFuego: { duration: 0.95, phases: [0.15, 0.6], anchor: 'target', build: castigoFuego },
  castigoResplandor: { duration: 1.0, phases: [0.15, 0.62], anchor: 'target', build: castigoResplandor },
  castigoDestierro: { duration: 1.1, phases: [0.16, 0.72], anchor: 'target', build: castigoDestierro },
};

/** Sprites of spell `key` at `t` seconds after it was cast ([] once it is over). */
export function spellFrame(key: string, ctx: SpellCtx, t: number): Sprite[] {
  return paint(key, ctx, t)?.out ?? [];
}

/** Semantic marks of spell `key` at `t` (where each bolt lands…). */
export function spellMarks(key: string, ctx: SpellCtx, t: number): { kind: string; x: number; y: number }[] {
  return paint(key, ctx, t)?.marks ?? [];
}

function paint(key: string, ctx: SpellCtx, t: number): Painter | null {
  const def = SPELLS[key];
  if (!def || t < 0 || t > def.duration) return null;
  const g = new Painter(ctx.seed ?? 1, def.cap ?? MAX_SPELL_SPRITES, ctx.reduced ? REDUCED_DENSITY : 1);
  def.build(g, t / def.duration, ctx, def.duration);
  return g;
}

/** Coarse visual fingerprint (shapes and layout over time) to tell effects apart. */
export function spellSignature(key: string): string {
  const def = SPELLS[key];
  const ctx: SpellCtx = { box: { x: 400, y: 200, w: 160, h: 200 }, from: { x: 100, y: 300 }, facing: -1, seed: 11 };
  return [0.15, 0.35, 0.55, 0.8].map((q) => {
    const fr = spellFrame(key, ctx, q * def.duration), hist: Record<string, number> = {};
    for (const s of fr) hist[s.shape] = (hist[s.shape] ?? 0) + 1;
    const mx = fr.reduce((m, s) => m + s.x, 0) / Math.max(1, fr.length), my = fr.reduce((m, s) => m + s.y, 0) / Math.max(1, fr.length);
    return `${Object.entries(hist).sort().map(([s, n]) => `${s}${n}`).join(',')}@${Math.round(mx / 10)},${Math.round(my / 10)}`;
  }).join('|');
}

/** Active spells over time, trimmed to a sprite budget (newest first). */
export class SpellSystem {
  private list: { key: string; ctx: SpellCtx; start: number }[] = [];
  private seeds = 1;
  /** Last volley cast: casts of the same key in quick succession take lanes 0, 1, 2… */
  private volley: { key: string; at: number; lane: number } | null = null;
  get active() { return this.list.length; }
  add(key: string, ctx: SpellCtx, now: number): boolean {
    const def = SPELLS[key];
    if (!def) return false;
    let lane = ctx.lane;
    if (def.volley && lane === undefined) {
      // a pause longer than a few gaps (reduced motion doubles them) starts a new volley
      const v = this.volley;
      lane = v && v.key === key && now - v.at >= 0 && now - v.at <= def.volley.gap * 4 ? v.lane + 1 : 0;
      this.volley = { key, at: now, lane };
    }
    this.list.push({ key, ctx: { ...ctx, seed: ctx.seed ?? this.seeds++, lane }, start: now });
    if (this.list.length > 10) this.list.shift();
    return true;
  }
  frame(now: number, budget = MAX_LIVE_SPRITES): Sprite[] {
    this.list = this.list.filter((s) => now - s.start <= SPELLS[s.key].duration);
    const out: Sprite[] = [];
    for (let i = this.list.length - 1; i >= 0 && out.length < budget; i--) {
      const s = this.list[i];
      const fr = spellFrame(s.key, s.ctx, now - s.start);
      for (let j = 0; j < fr.length && out.length < budget; j++) out.push(fr[j]);
    }
    return out;
  }
}
