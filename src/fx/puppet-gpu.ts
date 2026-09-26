// Pure helpers for the WebGL puppet renderer (no DOM, testable in node): colour
// maths, the per-piece data texture layout and the viewBox → pixel transform.

import { EMISSIVE, EYES, type BoneId, type Matrix, type PuppetRig, type Shape } from './puppet.ts';

/** Texels (RGBA32F) per piece row in the data texture. */
export const PIECE_TEXELS = 14;
/** Max polygon vertices the fragment shader walks. */
export const MAX_POLY = 16;
/** Bone slot order in the bones uniform array. */
export const BONE_INDEX: Record<BoneId, number> = {
  root: 0, torso: 1, cape: 2, head: 3, armB: 4, offhand: 5, armF: 6, weapon: 7, legB: 8, legF: 9, wingB: 10, wingF: 11,
  wingBArm: 12, wingBF1: 13, wingBF2: 14, wingBF3: 15, wingFArm: 16, wingFF1: 17, wingFF2: 18, wingFF3: 19,
};
export const BONE_COUNT = 20;

export const SHAPE_CODE = { c: 0, e: 1, l: 2, p: 3 } as const;
export const FLAG = { emissive: 1, ink: 2, eye: 4 } as const;

// ── colour ───────────────────────────────────────────────────────────────────
export const hexRgb = (h: string): [number, number, number] =>
  [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
const rgbHex = (c: number[]) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
export const lighten = (hex: string, k: number) => rgbHex(hexRgb(hex).map((v) => v + (255 - v) * k));

/** Darker, slightly bluer tone for the shadow side of an illustrated piece. */
export function shadowOf(hex: string): string {
  const [r, g, b] = hexRgb(hex).map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) {
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  }
  const diff = ((250 - h + 540) % 360) - 180;
  h += Math.sign(diff) * Math.min(Math.abs(diff), 16);
  s *= 0.9;
  const l2 = l * 0.6;
  const q = l2 < 0.5 ? l2 * (1 + s) : l2 + s - l2 * s, p = 2 * l2 - q, hh = (((h % 360) + 360) % 360) / 360;
  const f = (t: number) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return s === 0 ? rgbHex([l2 * 255, l2 * 255, l2 * 255]) : rgbHex([f(hh + 1 / 3) * 255, f(hh) * 255, f(hh - 1 / 3) * 255]);
}

/** Parses '#rrggbb' or 'rgba(r,g,b,a)' into 0..1 components. */
export function parseColour(c: string): [number, number, number, number] {
  if (c.startsWith('#')) { const [r, g, b] = hexRgb(c); return [r / 255, g / 255, b / 255, 1]; }
  const m = c.match(/[\d.]+/g) ?? ['0', '0', '0', '1'];
  return [+m[0] / 255, +m[1] / 255, +m[2] / 255, m[3] !== undefined ? +m[3] : 1];
}

export function shapeBBox(s: Shape): [number, number, number, number] {
  if (s.t === 'c') return [s.x - s.r, s.y - s.r, s.x + s.r, s.y + s.r];
  if (s.t === 'e') return [s.x - s.rx, s.y - s.ry, s.x + s.rx, s.y + s.ry];
  if (s.t === 'p') {
    const xs = s.pts.map((q) => q[0]), ys = s.pts.map((q) => q[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  }
  const r = s.w / 2;
  return [Math.min(s.x1, s.x2) - r, Math.min(s.y1, s.y2) - r, Math.max(s.x1, s.x2) + r, Math.max(s.y1, s.y2) + r];
}

/**
 * Packs a rig into one row of PIECE_TEXELS RGBA texels per piece:
 * 0 type, bone, flags, nVerts · 1 shape params · 2 bbox · 3 fill · 4 shadow ·
 * 5 capsule radius · 6..13 polygon vertices (two per texel).
 * Colours depend on the style: black silhouettes or the illustrated palette.
 */
export function packRig(rig: PuppetRig, style: 'silhouette' | 'illustrated'): { data: Float32Array; count: number } {
  const count = rig.shapes.length;
  const data = new Float32Array(count * PIECE_TEXELS * 4);
  const eyeColour = lighten(rig.accent, 0.55);
  rig.shapes.forEach((s, i) => {
    const o = i * PIECE_TEXELS * 4;
    const emissive = EMISSIVE.has(s.k), ink = s.k === 'ink', eye = EYES.has(s.k);
    const flags = (emissive ? FLAG.emissive : 0) | (ink ? FLAG.ink : 0) | (eye ? FLAG.eye : 0);
    const nVerts = s.t === 'p' ? Math.min(MAX_POLY, s.pts.length) : 0;
    data.set([SHAPE_CODE[s.t], BONE_INDEX[s.b], flags, nVerts], o);
    if (s.t === 'c') data.set([s.x, s.y, s.r, s.r], o + 4);
    else if (s.t === 'e') data.set([s.x, s.y, s.rx, s.ry], o + 4);
    else if (s.t === 'l') data.set([s.x1, s.y1, s.x2, s.y2], o + 4);
    data.set(shapeBBox(s), o + 8);
    let fill: string, shade: string;
    const base = rig.palette[s.k] ?? '#ff00ff';
    if (style === 'silhouette') {
      fill = emissive ? base : s.k === 'eye' ? eyeColour : '#0b0910';
      shade = fill;
    } else {
      fill = ink ? '#140d0a' : base;
      shade = ink || emissive ? fill : shadowOf(base);
    }
    data.set(parseColour(fill), o + 12);
    data.set(parseColour(shade), o + 16);
    data.set([s.t === 'l' ? s.w / 2 : 0, 0, 0, 0], o + 20);
    if (s.t === 'p') s.pts.slice(0, MAX_POLY).forEach(([x, y], k) => { data[o + 24 + k * 2] = x; data[o + 25 + k * 2] = y; });
  });
  return { data, count };
}

/** viewBox (140×135) → pixels inside `rect`, enlarged by `art` around the feet
 *  and mirrored for enemies so they face the hero. */
export function spriteMatrix(rect: { x: number; y: number; w: number }, mirrored: boolean, art: number): Matrix {
  const s = rect.w / 140;
  // art scale about the feet (58,129) in viewBox units
  const ax = 58 - art * 58, ay = 129 - art * 129;
  // local → viewBox: x' = art*x + ax (then mirrored: 140 - x')
  const mx = mirrored ? -1 : 1, ox = mirrored ? 140 : 0;
  return [mx * art * s, 0, 0, art * s, rect.x + (ox + mx * ax) * s, rect.y + ay * s];
}

export const multiply = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
