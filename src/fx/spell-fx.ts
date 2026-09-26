// Spell VFX: one hand-authored animated composition per card fx key (roots that
// coil around the target, a breaking wave, three claw furrows, a falling rune…).
// Pure (no DOM): every frame is rebuilt analytically from the elapsed time and a
// seed, so the effects are deterministic and testable in node. The fx canvas
// draws the returned sprites in the same WebGL pass as the particles.

import type { ParticleShape, Sprite } from './particle-sim.ts';

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
}
export type Anchor = 'self' | 'target';
type Build = (g: Painter, u: number, c: SpellCtx, dur: number) => void;
export interface SpellDef {
  /** Seconds. */
  duration: number;
  /** End of the anticipation and of the impact, as fractions of the duration. */
  phases: [number, number];
  /** Default receiver: the hero (defences, buffs) or the target (attacks, curses). */
  anchor: Anchor;
  build: Build;
}

export const MAX_SPELL_SPRITES = 220;
export const MAX_LIVE_SPRITES = 600;

// ── easing helpers ──────────────────────────────────────────────────────────
const TAU = Math.PI * 2;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const span = (u: number, a: number, b: number) => clamp01((u - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (v: number) => 1 - (1 - v) ** 3;
const easeIn = (v: number) => v * v * v;
const smooth = (v: number) => v * v * (3 - 2 * v);
const easeInOut = (v: number) => (v < 0.5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2);
const easeOutBack = (v: number) => 1 + 2.70158 * (v - 1) ** 3 + 1.70158 * (v - 1) ** 2;
/** 0 → 1 → 0 over [a, b]. */
const bell = (u: number, a: number, b: number) => { const s = span(u, a, b); return s <= 0 || s >= 1 ? 0 : Math.sin(Math.PI * s); };
/** Rotation for a 'gota' (tip up at angle 0) so its tip trails behind the velocity. */
const dropAngle = (vx: number, vy: number) => Math.atan2(-vx, vy);

function hash01(seed: number, n: number): number {
  let h = (Math.imul(seed | 0, 374761393) + Math.imul(n | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Collects the sprites of one frame, with drawing helpers in screen pixels. */
class Painter {
  readonly out: Sprite[] = [];
  private readonly seed: number;
  constructor(seed: number) { this.seed = seed; }
  /** Stable random in [0, 1) for element n. */
  r(n: number) { return hash01(this.seed, n); }
  put(x: number, y: number, size: number, shape: ParticleShape, colour: string, alpha: number,
    angle = 0, glow = true, stretch?: number, param?: number) {
    if (this.out.length >= MAX_SPELL_SPRITES || !(alpha > 0.004) || !(size > 0.05)) return;
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
function geo(c: SpellCtx) {
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
const fly = (x: number, y: number, vx: number, vy: number, tau: number, grav: number) =>
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
const vineFront = (i: number, s: number) => Math.cos(i * 2.1 + 0.6 + s * (1.4 + 0.15 * (i % 2)) * TAU) > 0;

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
};

/** Sprites of spell `key` at `t` seconds after it was cast ([] once it is over). */
export function spellFrame(key: string, ctx: SpellCtx, t: number): Sprite[] {
  const def = SPELLS[key];
  if (!def || t < 0 || t > def.duration) return [];
  const g = new Painter(ctx.seed ?? 1);
  def.build(g, t / def.duration, ctx, def.duration);
  return g.out;
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
  get active() { return this.list.length; }
  add(key: string, ctx: SpellCtx, now: number): boolean {
    if (!SPELLS[key]) return false;
    this.list.push({ key, ctx: { ...ctx, seed: ctx.seed ?? this.seeds++ }, start: now });
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
