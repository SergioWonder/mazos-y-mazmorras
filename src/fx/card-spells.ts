// Rare and unique card VFX: every rare or class-unique card (and a few signature
// commons, like Magic Missile's and Eldritch Blast's volleys of darts) plays its own hand-authored
// sequence instead of the generic effect of its `fx` key (a storm whose bolts
// strike each enemy, a whirlwind of phantom daggers, an infernal circle with
// chains…). Each card also gets a prelude that gathers over its
// receivers while the rare showcase holds the stage (anticipation); the main
// sequence goes off on the hit, in sync with the damage (climax and impact),
// and then dissipates. Pure like spell-fx.ts: deterministic and testable in node.

import {
  Painter, SPELLS, MAX_CARD_SPRITES, geo, span, lerp, easeOut, easeIn, easeInOut, easeOutBack, bell, dropAngle,
  zigzag, smooth, clamp01, TAU, hash01, lightHammer, vinePath, vineFront, waveCrest, fly, type Box, type Build, type Point, type SpellCtx, type SpellDef,
} from './spell-fx.ts';

// ── palettes ────────────────────────────────────────────────────────────────
const FIRE = ['#ff3b1f', '#ff7a2a', '#ffc04d', '#fff1c9'];
const BLOOD = ['#7a0d0d', '#a01616', '#d63b3b', '#ffd0c0'];
const LEAF = ['#3f7d2a', '#7dba4e', '#c9f29b', '#b8863b'];
const EARTH = ['#6b4a1f', '#8a6a3a', '#b8863b', '#d9b77a'];
const MOON = ['#9bb4ff', '#c7d2e8', '#dfe8ff', '#ffffff'];
const STAR = ['#ffd166', '#fff3b8', '#cfd8ff', '#ffffff'];
const GOLD = ['#e0a82e', '#ffd166', '#fff3b8', '#ffffff'];
const VOID = ['#2a0c45', '#6c2fb5', '#b46bff', '#e8d0ff'];
const TOXIC = ['#2f6b1c', '#5bd13a', '#a8ff5a', '#e3ffc2'];
const ARCANE = ['#3b6bff', '#4fc3ff', '#b8ecff', '#ffffff'];
const SEA = ['#1f6fa8', '#4fb3e8', '#bfeaff', '#ffffff'];
const STORM = ['#7fb6ff', '#cfe6ff', '#ffffff'];
const PSI = ['#c86bff', '#6bf0ff', '#f0d6ff'];
const FEY = ['#ff8fd8', '#b46bff', '#9dffea', '#fff0fb'];
const LOVE = ['#ff5a8a', '#ff9dbd', '#ffd1e0', '#ffd166'];
const STEEL = ['#9aa7b8', '#dfe6ef', '#ffffff'];
const PHANTOM = ['#8a7dff', '#b8c6ff', '#e8f0ff'];
const HELL = ['#5a0a1a', '#c21f3a', '#ff5a2a', '#ffb36b'];

type Kind = 'spark' | 'dot' | 'star' | 'drop' | 'leaf' | 'heart' | 'bubble' | 'rune';

/** One particle of kind `kind` (size ~ its length in px). */
function mote(g: Painter, kind: Kind, x: number, y: number, size: number, angle: number, colour: string, a: number) {
  switch (kind) {
    case 'spark': g.spark(x, y, size, angle, colour, a); break;
    case 'dot': g.dot(x, y, size * 0.3 + 0.5, colour, a); break;
    case 'star': g.star(x, y, size, colour, a, angle); break;
    case 'drop': g.drop(x, y, size * 0.4 + 0.5, angle, colour, a, false); break;
    case 'leaf': g.leaf(x, y, size, angle, colour, a); break;
    case 'heart': g.heart(x, y, size * 0.5, colour, a); break;
    case 'bubble': g.bubble(x, y, size * 0.4 + 0.5, colour, a); break;
    case 'rune': g.rune(x, y, size * 0.6, angle, colour, a); break;
  }
}

interface BurstOpts {
  u0: number; u1: number; n: number; dist: number; cols: string[]; salt: number;
  grav?: number; len?: number; kind?: Kind; dir?: number; spread?: number;
}
/** Radial burst from (x, y) between u0 and u1 (optionally a cone around `dir`). */
function burst(g: Painter, u: number, x: number, y: number, o: BurstOpts) {
  const n = g.n(o.n), L = o.len ?? 9, grav = o.grav ?? 0;
  for (let i = 0; i < n; i++) {
    const t0 = o.u0 + (o.u1 - o.u0) * 0.15 * g.r(o.salt + i);
    const s = span(u, t0, o.u1);
    if (s <= 0 || s >= 1) continue;
    const a = o.dir !== undefined ? o.dir + (g.r(o.salt + i + 300) - 0.5) * (o.spread ?? 1) : g.r(o.salt + i + 300) * TAU;
    const d = easeOut(s) * o.dist * (0.35 + 0.65 * g.r(o.salt + i + 600));
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d + grav * s * s;
    const heading = Math.atan2(Math.sin(a) + (2 * grav * s) / Math.max(1, o.dist), Math.cos(a));
    const kind = o.kind ?? 'spark';
    mote(g, kind, px, py, L * (1 - 0.5 * s) + 1, kind === 'drop' ? dropAngle(Math.cos(heading), Math.sin(heading)) : kind === 'leaf' ? a + s * 6 : heading,
      o.cols[i % o.cols.length], 1 - s);
  }
}

interface RiseOpts {
  x: number; y: number; w: number; h: number; u0: number; u1: number; n: number; cols: string[]; salt: number;
  size: number; kind?: Kind; sway?: number;
}
/** Motes rising from a band and drifting (embers, spores, sap, feathers). */
function rise(g: Painter, u: number, o: RiseOpts) {
  const n = g.n(o.n), life = (o.u1 - o.u0) * 0.5;
  for (let i = 0; i < n; i++) {
    const t0 = o.u0 + (o.u1 - o.u0 - life) * g.r(o.salt + i);
    const q = span(u, t0, t0 + life);
    if (q <= 0 || q >= 1) continue;
    const px = o.x + (g.r(o.salt + i + 300) - 0.5) * o.w + Math.sin(q * 6 + i) * (o.sway ?? 8);
    const py = o.y - easeOut(q) * o.h * (0.45 + 0.55 * g.r(o.salt + i + 600));
    mote(g, o.kind ?? 'dot', px, py, o.size * (0.6 + 0.6 * g.r(o.salt + i + 900)), o.kind === 'spark' ? -Math.PI / 2 : q * 4 + i,
      o.cols[i % o.cols.length], Math.min(1, q * 5) * (1 - q));
  }
}

interface GatherOpts {
  r0: number; u0: number; u1: number; n: number; cols: string[]; salt: number; size: number;
  kind?: Kind; turns?: number; squash?: number;
}
/** Motes spiralling in to (x, y) from radius r0: power gathering. */
function gather(g: Painter, u: number, x: number, y: number, o: GatherOpts) {
  const n = g.n(o.n);
  for (let i = 0; i < n; i++) {
    const t0 = o.u0 + (o.u1 - o.u0) * 0.5 * g.r(o.salt + i);
    const q = span(u, t0, o.u1);
    if (q <= 0 || q >= 1) continue;
    const a = g.r(o.salt + i + 300) * TAU + q * (o.turns ?? 1.5) * TAU;
    const rad = o.r0 * (1 - easeIn(q)) * (0.6 + 0.4 * g.r(o.salt + i + 600));
    mote(g, o.kind ?? 'dot', x + Math.cos(a) * rad, y + Math.sin(a) * rad * (o.squash ?? 1), o.size, a + Math.PI / 2,
      o.cols[i % o.cols.length], Math.min(1, q * 4) * (1 - 0.3 * q));
  }
}

/** Glowing lightning bolt from a to b with forks; returns the main path. */
function bolt(g: Painter, a: Point, b: Point, frame: number, salt: number, k: number, cols: string[], on: number, forks = 3): Point[] {
  const dist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const main = zigzag(a, b, 12, Math.min(34 * k, dist * 0.12), frame, salt);
  g.strip(main, () => 14 * k, cols[0], 0.4 * on);
  g.strip(main, () => 5 * k, cols[1], on);
  g.strip(main, () => 2 * k, '#ffffff', on, false);
  for (let f = 0; f < forks; f++) {
    const from = main[2 + f * 3];
    if (!from) break;
    const ang = Math.atan2(b.y - a.y, b.x - a.x) + (g.r(frame * 7 + f + salt) - 0.5) * 1.8;
    const len = dist * (0.16 + 0.12 * g.r(frame * 3 + f + salt + 40));
    const to = { x: from.x + Math.cos(ang) * len, y: from.y + Math.sin(ang) * len };
    g.strip(zigzag(from, to, 5, 9 * k, frame, salt + 7 + f), () => 2.2 * k, cols[f % cols.length], 0.8 * on);
  }
  return main;
}

/** Cloud bank: soft dark puffs with a lit underside. */
function cloud(g: Painter, x: number, y: number, w: number, h: number, n: number, salt: number, dark: string, lit: string, a: number, flash: number) {
  for (let i = 0; i < n; i++) {
    const px = x + (g.r(salt + i) - 0.5) * w, py = y + (g.r(salt + i + 50) - 0.5) * h;
    const r = (0.35 + 0.35 * g.r(salt + i + 100)) * h;
    g.dot(px, py, r, dark, a * 0.85, false);
    if (flash > 0.02) g.dot(px, py + r * 0.4, r * 0.55, lit, a * flash * 0.3);
  }
}

/** Dagger: blade from the hilt at (x, y) along `ang`, with guard and grip. */
function dagger(g: Painter, x: number, y: number, ang: number, len: number, k: number, col: string, a: number) {
  const ca = Math.cos(ang), sa = Math.sin(ang), tx = x + ca * len, ty = y + sa * len;
  g.fang(x, y, tx, ty, 12 * k, col, 0.22 * a);
  g.fang(x, y, tx, ty, 7 * k, '#5a6070', 0.9 * a, false);
  g.fang(x, y, tx, ty, 3 * k, col, a, false);
  g.fang(x, y, tx, ty, 1.4 * k, '#ffffff', 0.8 * a);
  g.seg(x - sa * 7 * k, y + ca * 7 * k, x + sa * 7 * k, y - ca * 7 * k, 3 * k, col, a);
  g.seg(x, y, x - ca * len * 0.3, y - sa * len * 0.3, 3.2 * k, '#4a3322', a, 0, false);
}

/** Chain of oval links from (x1, y1) to (x2, y2), alternating orientation. */
function chain(g: Painter, x1: number, y1: number, x2: number, y2: number, links: number, k: number, col: string, a: number) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  for (let l = 0; l < links; l++) {
    const f = (l + 0.5) / links, x = lerp(x1, x2, f), y = lerp(y1, y2, f);
    const ry = (l % 2 ? 2.4 : 3.8) * k, rx = (l % 2 ? 5.5 : 6) * k;
    g.put(x, y, ry, 'anillo', '#2a2233', a, ang, false, rx / ry, Math.min(0.5, (2.6 * k) / (2 * ry)));
    g.put(x, y, ry, 'anillo', col, 0.8 * a, ang, true, rx / ry, Math.min(0.5, (1 * k) / (2 * ry)));
  }
}

/** Pentagram inscribed in an ellipse, drawn up to `draw` (0..1) of its five strokes. */
function pentagram(g: Painter, cx: number, cy: number, rx: number, ry: number, rot: number, thick: number, col: string, a: number, draw = 1) {
  const p = (i: number) => ({ x: cx + Math.cos(rot + (i * TAU) / 5 - Math.PI / 2) * rx, y: cy + Math.sin(rot + (i * TAU) / 5 - Math.PI / 2) * ry });
  for (let i = 0; i < 5; i++) {
    const f = Math.min(1, Math.max(0, draw * 5 - i));
    if (f <= 0) break;
    const a0 = p(i * 2), a1 = p(i * 2 + 2);
    g.seg(a0.x, a0.y, lerp(a0.x, a1.x, f), lerp(a0.y, a1.y, f), thick, col, a);
  }
  g.ring(cx, cy, rx * 1.1, ry * 1.1, thick, col, a * Math.min(1, draw * 1.5));
}

/** Outline of a d20 seen from a face: hexagon, inner triangle and spokes. */
function d20(g: Painter, cx: number, cy: number, r: number, rot: number, thick: number, col: string, a: number) {
  const hex = (i: number) => ({ x: cx + Math.cos(rot + (i * TAU) / 6) * r, y: cy + Math.sin(rot + (i * TAU) / 6) * r });
  const tri = (i: number) => ({ x: cx + Math.cos(rot + (i * TAU) / 3 + Math.PI / 6) * r * 0.55, y: cy + Math.sin(rot + (i * TAU) / 3 + Math.PI / 6) * r * 0.55 });
  for (let i = 0; i < 6; i++) { const p = hex(i), q = hex(i + 1); g.seg(p.x, p.y, q.x, q.y, thick, col, a); }
  for (let i = 0; i < 3; i++) {
    const p = tri(i), q = tri(i + 1), h1 = hex(i * 2), h2 = hex(i * 2 + 1);
    g.seg(p.x, p.y, q.x, q.y, thick * 0.8, col, a);
    g.seg(p.x, p.y, h1.x, h1.y, thick * 0.6, col, a * 0.8);
    g.seg(p.x, p.y, h2.x, h2.y, thick * 0.6, col, a * 0.8);
  }
}

/** Eye of half-width w, `open` 0..1, iris looking `look` (-1..1) sideways. */
function eye(g: Painter, cx: number, cy: number, w: number, open: number, k: number, lid: string, iris: string, a: number, look = 0) {
  if (open <= 0.02) { g.seg(cx - w, cy, cx + w, cy, 3 * k, lid, a, 1); return; }
  const d = w * lerp(6, 0.9, open), r = Math.hypot(w, d), half = Math.atan2(w, d), h = r - d;
  g.dot(cx, cy, w * 0.9, '#0c0418', 0.5 * a * open, false);
  g.arc(cx, cy + d, r, 3.5 * k, -Math.PI / 2, half, lid, a);
  g.arc(cx, cy - d, r, 3.5 * k, Math.PI / 2, half, lid, a);
  const ir = Math.min(h * 0.9, w * 0.4), ix = cx + look * w * 0.35;
  g.ring(ix, cy, ir, ir, 3 * k, iris, a);
  g.dot(ix, cy, ir * 0.45, '#050208', a, false);
  g.dot(ix - ir * 0.3, cy - ir * 0.3, ir * 0.18 + 0.5, '#ffffff', a);
}

/** Flame tongue rising from (x, y), height h and width w, flickering with time. */
function flame(g: Painter, x: number, y: number, h: number, w: number, time: number, salt: number, cols: string[], a: number) {
  for (let j = 0; j < 5; j++) {
    const f = j / 5, sway = Math.sin(time * 14 + salt * 1.7 + j) * w * 0.3 * f;
    g.drop(x + sway, y - f * h, w * (1 - f * 0.7) * 0.5 + 0.5, Math.sin(time * 9 + salt) * 0.2, cols[Math.min(cols.length - 1, j)], a * (1 - f * 0.5));
  }
}

/** Ring of runes on an ellipse. */
function runeRing(g: Painter, cx: number, cy: number, rx: number, ry: number, n: number, rot: number, r: number, col: string, a: number, thick: number) {
  g.ring(cx, cy, rx, ry, thick, col, a * 0.7);
  for (let i = 0; i < n; i++) {
    const t = rot + (i / n) * TAU;
    g.rune(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry, r, t * 2, col, a);
  }
}

/** Sprite count helper: loops of `n` elements that also thin out with reduced motion. */
const each = (g: Painter, n: number, fn: (i: number) => void) => { const m = g.n(n); for (let i = 0; i < m; i++) fn(i); };

// ── Druid ───────────────────────────────────────────────────────────────────

/** Shifter's Heart: leaves spiral into the chest, a leafy heart beats twice and
 *  sends vines through the body, then bursts into leaves and spirit motes. */
const corazonCambiante: Build = (g, u, c) => {
  const { cx, cy, R, k, W, H, ground } = geo(c);
  const hy = cy - H * 0.08;
  gather(g, u, cx, hy, { r0: R * 1.8, u0: 0, u1: 0.32, n: 60, cols: LEAF, salt: 1, size: 8 * k, kind: 'leaf', turns: 1.2 });
  const beat = 1 + 0.35 * bell(u, 0.3, 0.42) + 0.45 * bell(u, 0.46, 0.6);
  const on = span(u, 0.22, 0.32) * (1 - span(u, 0.78, 0.95));
  g.dot(cx, hy, 46 * k * beat, '#7dba4e', 0.14 * on);
  g.heart(cx, hy, 30 * k * beat, '#2f6b1c', on);
  g.heart(cx, hy, 21 * k * beat, '#7dba4e', on);
  g.heart(cx, hy, 10 * k * beat, '#e8ffd0', 0.9 * on);
  for (const t0 of [0.32, 0.48]) {
    const s = span(u, t0, t0 + 0.3);
    if (s > 0 && s < 1) g.ring(cx, hy, R * (0.2 + 1.1 * easeOut(s)), R * (0.2 + 1.1 * easeOut(s)), 5 * k * (1 - s) + 1, '#c9f29b', 1 - s);
  }
  const grow = easeOut(span(u, 0.45, 0.7)) * (1 - span(u, 0.85, 1));
  if (grow > 0.02) for (let v = 0; v < 6; v++) {
    const ang = (v / 6) * TAU + 0.3, pts: Point[] = [];
    for (let j = 0; j <= 8; j++) {
      const s = (j / 8) * grow, a2 = ang + Math.sin(s * 5 + v) * 0.5;
      pts.push({ x: cx + Math.cos(a2) * s * R * 1.1, y: hy + Math.sin(a2) * s * R });
    }
    g.strip(pts, (j) => (6 - j * 0.5) * k + 1, '#3f7d2a', 0.9, false);
    g.strip(pts, (j) => (2.5 - j * 0.2) * k + 0.5, '#c9f29b', 0.8);
    const tip = pts[pts.length - 1];
    g.leaf(tip.x, tip.y, 9 * k, ang, '#7dba4e', grow);
  }
  burst(g, u, cx, hy, { u0: 0.46, u1: 1, n: 50, dist: R * 1.7, cols: LEAF, salt: 200, kind: 'leaf', len: 9 * k, grav: 40 * k });
  burst(g, u, cx, hy, { u0: 0.3, u1: 0.62, n: 30, dist: R, cols: ['#fff3b8', '#c9f29b'], salt: 600, len: 10 * k });
  rise(g, u, { x: cx, y: ground, w: W, h: H * 1.2, u0: 0.4, u1: 1, n: 40, cols: ['#c9f29b', '#fff3b8'], salt: 400, size: 7 * k });
};

/** Deep Roots: an earth circle of runes opens at the feet, roots crawl out along
 *  the ground in every direction, pebbles jump and dust rises. */
const raicesProfundas: Build = (g, u, c) => {
  const { cx, k, W, H, ground } = geo(c);
  const rx = W * 1.15, ry = W * 0.3, open = easeOut(span(u, 0, 0.3)), out = 1 - span(u, 0.8, 1);
  if (open > 0.02) runeRing(g, cx, ground, rx * open, ry * open, 8, u * 1.2, 7 * k, '#b8863b', out * open, 4 * k);
  g.dot(cx, ground, rx * 0.5 * open, '#6b4a1f', 0.25 * out, false);
  const grow = easeOut(span(u, 0.15, 0.55)), roots = g.n(10);
  for (let v = 0; v < roots; v++) {
    const ang = (v / roots) * TAU + g.r(v) * 0.4, pts: Point[] = [];
    for (let j = 0; j <= 7; j++) {
      const s = (j / 7) * grow, w = Math.sin(s * 9 + v) * 0.18;
      pts.push({ x: cx + Math.cos(ang + w) * s * rx * 1.25, y: ground + Math.sin(ang + w) * s * ry * 1.25 });
    }
    g.strip(pts, (j) => (8 - j * 0.8) * k + 1.5, '#6b4a1f', out, false);
    g.strip(pts, (j) => (3 - j * 0.3) * k + 0.6, '#d9b77a', 0.9 * out);
    g.strip(pts, (j) => (1.2 - j * 0.1) * k + 0.4, '#c9f29b', 0.6 * out);
    const tip = pts[pts.length - 1], sprout = span(u, 0.5, 0.7) * out;
    if (sprout > 0) { g.leaf(tip.x - 3 * k, tip.y - 4 * k, 8 * k * sprout, -2.2, '#7dba4e', sprout); g.leaf(tip.x + 3 * k, tip.y - 4 * k, 8 * k * sprout, -0.9, '#c9f29b', sprout); }
  }
  const pulse = bell(u, 0.4, 0.65);
  g.rune(cx, ground - 2 * k, 18 * k * (1 + 0.3 * pulse), u * 2, '#d9b77a', pulse);
  burst(g, u, cx, ground, { u0: 0.3, u1: 0.75, n: 36, dist: W * 1.1, cols: EARTH, salt: 50, kind: 'drop', len: 9 * k, grav: 120 * k, dir: -Math.PI / 2, spread: 2.6 });
  rise(g, u, { x: cx, y: ground, w: rx * 2, h: H * 0.8, u0: 0.2, u1: 1, n: 60, cols: EARTH, salt: 300, size: 8 * k });
};

/** Lunar Form: a full moon rises behind the hero and bathes it in silver, a howl
 *  echoes out, silver motes spiral up the body. */
const formaLunar: Build = (g, u, c) => {
  const { b, cx, cy, R, k, W, H, ground, face } = geo(c);
  const mx = cx - face * W * 0.3, my = lerp(ground, b.y - H * 0.35, easeOut(span(u, 0, 0.35)));
  const vis = span(u, 0, 0.15) * (1 - span(u, 0.8, 1));
  g.dot(mx, my, R * 0.95, '#9bb4ff', 0.18 * vis);
  g.dot(mx, my, R * 0.5, '#dfe8ff', 0.9 * vis);
  for (let i = 0; i < 5; i++) g.dot(mx + (g.r(i) - 0.5) * R * 0.5, my + (g.r(i + 9) - 0.5) * R * 0.5, (3 + 4 * g.r(i + 20)) * k, '#9bb4ff', 0.45 * vis, false);
  const bm = bell(u, 0.3, 0.8);
  g.beam(mx, my, cx, ground, W * 0.7, '#c7d2e8', 0.35 * bm);
  g.beam(mx, my, cx, ground, W * 0.2, '#ffffff', 0.5 * bm);
  const hx = cx + face * W * 0.2, hy = cy - H * 0.3;
  for (let i = 0; i < 4; i++) {
    const s = span(u, 0.35 + i * 0.08, 0.75 + i * 0.08);
    if (s > 0 && s < 1) g.arc(hx, hy, 20 * k + R * 1.4 * easeOut(s), 5 * k * (1 - s) + 1, face > 0 ? 0 : Math.PI, 0.7, '#dfe8ff', 1 - s);
  }
  each(g, 70, (i) => {
    const q = span(u, 0.3 + 0.3 * g.r(i + 40), 0.95);
    if (q <= 0 || q >= 1) return;
    const a = g.r(i + 60) * TAU + q * 7, rad = W * (0.55 - 0.25 * q);
    g.dot(cx + Math.cos(a) * rad, ground - q * H * 1.1 + Math.sin(a) * rad * 0.2, 2.2 * k, MOON[i % 4], Math.min(1, q * 4) * (1 - q));
  });
  each(g, 22, (i) => { const tw = bell(u, 0.2 + 0.5 * g.r(i + 80), 1); g.star(cx + (g.r(i + 90) - 0.5) * W * 2.4, b.y - H * 0.4 + g.r(i + 99) * H * 1.2, 7 * k * tw, '#ffffff', tw); });
};

// ── Wrath of the Sea: one big wave sweeps across every enemy ───────────────

/** Seconds until the crest reaches the first enemy (the showcase prelude did the build-up). */
const SEA_FIRST = 0.16;
/** Longest crossing from the first enemy to the last (seconds). */
const SEA_CROSS = 0.6;
/** Crest speed, in enemy heights per second (a wide spread crosses faster, within SEA_CROSS). */
const SEA_SPEED = 5.5;
/** Life of the splash on each enemy (seconds). */
const SEA_SPLASH = 0.5;
/** Long enough for the slowest sweep (SEA_FIRST + SEA_CROSS) to crash and fade out. */
const SEA_DURATION = 1.4;

interface SeaPlan {
  dir: number; ground: number; Hh: number;
  /** Enemy boxes in the order the crest reaches them. */
  targets: Box[];
  /** Crest front at the cast, at the first and at the last enemy (px); crest speed (px/s). */
  x0: number; xFirst: number; xLast: number; speed: number;
  /** When it reaches the last enemy; how far and how long it runs on before crashing. */
  tLast: number; runOut: number; runT: number;
  /** The hero's column when he stands within the wave's height (it keeps clear of him), and
   *  how far: about half a figure's width. */
  heroX?: number; clear: number;
  /** Rough height of the hero's feet: the back slope may run under him if it stays lower. */
  heroFeet: number;
}

/** The sweep of one cast: the crest rolls from the caster's side over every target box at
 *  a steady speed, reaching the first one at SEA_FIRST, then runs out and crashes. */
function seaPlan(c: SpellCtx): SeaPlan {
  const targets = c.targets?.length ? c.targets : [c.box];
  const centre = (b: Box) => b.x + b.w / 2;
  const ground = Math.max(...targets.map((b) => b.y + b.h)), top = Math.min(...targets.map((b) => b.y));
  // a bit taller than the tallest enemy, but never above the top of the screen
  const Hh = Math.max(24, Math.min(1.12 * (ground - top), ground - 6));
  const mean = (f: (b: Box) => number) => targets.reduce((m, b) => m + f(b), 0) / targets.length;
  const left = Math.min(...targets.map((b) => b.x)), right = Math.max(...targets.map((b) => b.x + b.w));
  const dir = c.from ? Math.sign((left + right) / 2 - c.from.x) || 1 : 1;
  const sorted = [...targets].sort((p, q) => dir * (centre(p) - centre(q)));
  const xFirst = centre(sorted[0]), last = sorted[sorted.length - 1], xLast = centre(last);
  const dist = Math.abs(xLast - xFirst);
  // paced by the size of the figures (stacked rows on a phone make a far taller wave)
  const speed = Math.max(SEA_SPEED * 1.12 * Math.max(...targets.map((b) => b.h)), dist / SEA_CROSS);
  // past the last enemy it runs on, slowing down, and crashes (kept on screen)
  let runOut = last.w * 0.5 + 0.45 * Hh;
  if (c.view) runOut = Math.min(runOut, Math.max(last.w * 0.35, dir > 0 ? c.view.w - 0.2 * Hh - xLast : xLast - 0.2 * Hh));
  // it rises in front of the hero when he stands within its height (beside the enemies on a
  // narrow screen): the run-up to the first enemy is shorter, and slower, than the crossing
  const heroX = c.from && c.from.y > ground - 1.1 * Hh && c.from.y < ground + 0.5 * Hh ? c.from.x : undefined;
  const clear = 0.6 * mean((b) => b.w);
  let run = speed * SEA_FIRST;
  if (heroX !== undefined) run = Math.min(run, Math.max(0, dir * (xFirst - heroX) - clear));
  return {
    dir, ground, Hh, targets: sorted, x0: xFirst - dir * run, xFirst, xLast, speed,
    tLast: SEA_FIRST + dist / speed, runOut, runT: Math.min(0.3, Math.max(0.16, (2 * runOut) / speed)), heroX, clear,
    heroFeet: (c.from?.y ?? ground) + 0.6 * mean((b) => b.h),
  };
}

/** Crest front `t` seconds after the cast: a run-up to the first enemy, steady across the
 *  enemies, then easing out (with the same speed where both meet). */
function seaX(p: SeaPlan, t: number): number {
  if (t <= SEA_FIRST) return lerp(p.x0, p.xFirst, Math.max(0, t) / SEA_FIRST);
  if (t <= p.tLast) return p.xFirst + p.dir * p.speed * (t - SEA_FIRST);
  const s = clamp01((t - p.tLast) / p.runT);
  return p.xLast + p.dir * p.runOut * (1 - (1 - s) ** 2);
}

/** Seconds until the crest reaches screen column `x` (0 if it starts past it). */
function seaArrival(p: SeaPlan, x: number): number {
  let lo = 0, hi = p.tLast + p.runT;
  if (p.dir * (x - seaX(p, 0)) <= 0) return 0;
  if (p.dir * (x - seaX(p, hi)) >= 0) return hi;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (p.dir * (seaX(p, mid) - x) < 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Wrath of the Sea: one big wave (the crest, body and foam of Wave, scaled up) rolls in
 *  from the hero's side across every enemy, a bit taller than the tallest; spray, drops
 *  and foam burst on each enemy as the crest breaks over it, and past the last one it
 *  curls over and crashes into foam. */
const coleraMar: Build = (g, u, c, D) => {
  const p = seaPlan(c), t = u * D, { dir, ground, Hh } = p;
  const tEnd = p.tLast + p.runT;
  const X = seaX(p, t), kw = Math.min(2.6, Math.max(0.6, Hh / 170));
  const rise = easeOut(span(t, 0, 0.12)), collapse = easeIn(span(t, p.tLast + 0.04, tEnd + 0.15));
  let height = Hh * (0.4 + 0.6 * rise) * (1 - 0.72 * collapse);
  // the lip hangs over the enemies as it rolls, then curls right over as it crashes
  const curl = 0.3 + 0.3 * span(t, 0, SEA_FIRST) + 0.7 * span(t, p.tLast, tEnd + 0.1);
  const a = span(t, 0, 0.05) * (1 - span(t, tEnd - 0.05, tEnd + 0.25));
  // its back slope keeps clear of the hero standing level with it
  let back = 1.15 * Hh, reach = Hh;
  if (p.heroX !== undefined) {
    // where the hero stands, the slope must stay below his feet (on his ground: end before him)
    const d = dir * (X - p.heroX) - p.clear, allow = clamp01((ground - p.heroFeet) / Math.max(1, height));
    let lo = 0, hi = 1;
    for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (smooth(m) ** 1.2 < allow) lo = m; else hi = m; }
    back = Math.max(0.12 * Hh, Math.min(back, d / Math.max(0.05, 1 - lo)));
    reach = Math.max(0, 1.6 * d); // nor does the spray thrown back off the crest reach him
  }
  // a wave cannot stand much taller than its base: squeezed by the hero, it rises as it rolls on
  height = Math.min(height, 2.2 * back);
  const tail = X - dir * back;
  if (a > 0.01) {
    // the flood it leaves behind: a shallow sheet of water with foam, draining away
    const len = Math.min(1.3 * Hh, Math.max(0, dir * (tail - p.x0)));
    if (len > 4) {
      g.seg(tail, ground - 0.02 * Hh, tail - dir * len, ground - 0.01 * Hh, 0.07 * Hh, '#2a6896', 0.4 * a, 1, false);
      each(g, 10, (i) => {
        const f = g.r(i + 600);
        g.bubble(tail - dir * f * len, ground - 0.03 * Hh - g.r(i + 610) * 0.04 * Hh, (1.5 + 2 * g.r(i + 620)) * kw, '#e6f6ff', 0.6 * a * (1 - f));
      });
    }
    const colW = (back / 21) * 2.4;
    const pts = waveCrest(g, {
      x: X, ground, height, back, dir, curl, k: kw, colW, alpha: a, tips: rise, tipCount: g.n(14), salt: 400,
      segments: 28, sink: colW * 0.45, deep: '#17507e', lean: 0.16,
    });
    // sheen inside the face: lighter streaks following the crest, deeper down
    for (const [dy, al] of [[0.22, 0.2], [0.42, 0.12]]) {
      const sheen: Point[] = [];
      for (let j = 4; j <= 21; j += 3) sheen.push({ x: pts[j].x + dir * dy * 0.1 * Hh, y: Math.min(ground - 6 * kw, pts[j].y + dy * height) });
      g.strip(sheen, () => 5 * kw, '#7cc4ee', al * a, false, 1);
    }
    g.mark('cresta', X, ground - height);
    // a flat base hides the round ends of the body columns, foam churns along it
    g.seg(tail + dir * colW, ground + colW * 0.25, X + dir * 0.16 * Hh, ground + colW * 0.25, colW * 1.1, '#17507e', 0.5 * a, 0, false);
    g.seg(tail + dir * 0.2 * back, ground - 0.5 * colW, X + dir * 0.22 * Hh, ground - 0.5 * colW, 3 * kw, '#e6f6ff', 0.45 * a, 1);
    // the lip pours down in front of the face: a curtain of whitewater and churning foam
    const lip = pts[28], pour = (1 - collapse) * a;
    g.seg(lip.x, lip.y, lip.x + dir * 0.06 * Hh, ground, 0.1 * Hh, '#bfeaff', 0.22 * pour, 1);
    each(g, 14, (i) => {
      const f = (t * 3.2 + g.r(i + 530)) % 1;
      g.dot(lerp(lip.x, X + dir * (0.05 + 0.15 * g.r(i + 540)) * Hh, f), lerp(lip.y, ground - 4 * kw, f * f),
        (2 + 2.5 * g.r(i + 550)) * kw, i % 3 ? '#e6f6ff' : '#ffffff', 0.7 * pour * Math.min(1, f * 4));
    });
    // spray streams off the crest and falls back behind it
    const top = pts[21];
    each(g, 16, (i) => {
      const f = (t * 2.6 + g.r(i + 500)) % 1;
      const x = top.x - dir * f * Math.min(reach, 1.2 * back) * (0.25 + 0.3 * g.r(i + 510)), y = top.y - f * 0.25 * Hh + f * f * 0.5 * Hh;
      g.dot(x, y, (1.6 + 1.6 * g.r(i + 520)) * kw, i % 3 ? '#bfeaff' : '#ffffff', 0.8 * a * (1 - f) * (1 - collapse));
    });
  }
  // the splash on each enemy as the crest breaks over it
  for (let e = 0; e < p.targets.length; e++) {
    const b = p.targets[e], bx = b.x + b.w / 2, tau = t - seaArrival(p, bx);
    if (tau < 0 || tau > SEA_SPLASH) continue;
    const s = tau / SEA_SPLASH, kb = Math.min(1.8, Math.max(0.6, Math.min(b.w, b.h) / 120)), salt = 1000 + e * 97;
    const by = b.y + b.h * 0.4;
    g.mark('salpicadura', bx, by);
    // foam spreads at its feet
    g.ring(bx, b.y + b.h, b.w * (0.35 + 0.6 * easeOut(s)), b.w * 0.1 * (0.5 + 0.8 * s) + 2, 2.5 * kb, '#e6f6ff', 0.5 * (1 - s));
    // the blow: streaks of spray burst from the body, mostly upwards and onwards
    each(g, 10, (i) => {
      const ang = -Math.PI / 2 + dir * 0.35 + (g.r(salt + i + 210) - 0.5) * 2.6;
      const d = easeOut(span(tau, 0, 0.22)) * (0.35 + 0.4 * g.r(salt + i + 240)) * b.h;
      g.spark(bx + Math.cos(ang) * d, by + Math.sin(ang) * d, 12 * kb, ang, '#ffffff', 0.9 * (1 - span(tau, 0.04, 0.24)));
    });
    // droplets thrown up and forward, falling back
    each(g, 22, (i) => {
      const life = 0.3 + 0.2 * g.r(salt + i);
      if (tau > life) return;
      const vx = dir * (30 + 170 * g.r(salt + i + 30)) * kb + (g.r(salt + i + 60) - 0.5) * 140 * kb;
      const vy = -(260 + 300 * g.r(salt + i + 90)) * kb, grav = 1300 * kb;
      const q = fly(bx + (g.r(salt + i + 120) - 0.5) * 0.7 * b.w, b.y + b.h * (0.2 + 0.5 * g.r(salt + i + 150)), vx, vy, tau, grav);
      g.drop(q.x, q.y, (2.8 + 2.4 * g.r(salt + i + 180)) * kb, dropAngle(vx, vy + grav * tau), ['#bfeaff', '#ffffff', '#4fb3e8'][i % 3], 1 - tau / life);
    });
    each(g, 10, (i) => {
      const q = span(tau, 0.05 + 0.15 * g.r(salt + i + 270), SEA_SPLASH);
      if (q <= 0 || q >= 1) return;
      g.bubble(bx + (g.r(salt + i + 300) - 0.5) * 0.9 * b.w + Math.sin(q * 6 + i) * 4 * kb, b.y + b.h * (0.35 + 0.6 * g.r(salt + i + 330)) - q * 0.35 * b.h,
        (2 + 3 * g.r(salt + i + 360)) * kb, '#e6f6ff', Math.min(1, q * 5) * (1 - q));
    });
  }
  // past the last enemy it curls over and crashes: a sheet of spray, foam spreading out
  const tc = t - (p.tLast + 0.05);
  if (tc > 0) {
    const xc = seaX(p, p.tLast + 0.05);
    each(g, 30, (i) => {
      const q = fly(xc + dir * (0.05 + 0.25 * g.r(i + 700)) * Hh, ground - Hh * (0.45 + 0.4 * g.r(i + 710)),
        dir * (80 + 220 * g.r(i + 720)) * kw, -(150 + 230 * g.r(i + 730)) * kw, tc, 1000 * kw);
      if (q.y < ground + 10 && q.y > -50) g.dot(q.x, q.y, (2 + 1.5 * g.r(i + 740)) * kw, i % 3 ? '#bfeaff' : '#ffffff', span(tc, 0, 0.06) * (1 - span(tc, 0.2, 0.55)));
    });
    const sf = span(t, tEnd - 0.08, tEnd + 0.3);
    if (sf > 0 && sf < 1) g.ring(seaX(p, tEnd), ground, Hh * (0.3 + 0.9 * easeOut(sf)), Hh * 0.07 * (0.5 + sf) + 2, 4 * kw, '#bfeaff', 1 - sf);
    each(g, 16, (i) => {
      const q = span(t, tEnd - 0.1 + 0.1 * g.r(i + 760), tEnd + 0.3);
      if (q <= 0 || q >= 1) return;
      g.bubble(seaX(p, tEnd) + dir * (g.r(i + 770) - 0.45) * Hh * (0.4 + 0.8 * q), ground - 4 * kw - g.r(i + 780) * 0.12 * Hh,
        (2 + 3 * g.r(i + 790)) * kw * (0.4 + 0.6 * q), '#e6f6ff', Math.min(1, q * 6) * (1 - q));
    });
  }
};

/** Starry Form: shooting stars land on the hero's outline and link into a
 *  constellation that flares, while stardust spirals up. */
const formaEstelar: Build = (g, u, c) => {
  const { b, cx, cy, R, k, W, H, ground } = geo(c);
  const nodes: Point[] = [];
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i / 9) * TAU;
    nodes.push({ x: cx + Math.cos(a) * W * (0.5 + 0.12 * g.r(i)), y: cy + Math.sin(a) * H * (0.52 + 0.08 * g.r(i + 9)) });
  }
  const out = 1 - span(u, 0.82, 1), flare = 1 + 0.6 * bell(u, 0.5, 0.7);
  nodes.forEach((n, i) => {
    const ta = 0.05 + i * 0.03, s = span(u, ta, ta + 0.16);
    if (s > 0 && s < 1) {
      const sx = n.x + 1.2 * R, sy = Math.max(10, b.y - 1.0 * H), hx = lerp(sx, n.x, easeIn(s)), hy = lerp(sy, n.y, easeIn(s));
      g.fang(hx, hy, lerp(hx, sx, 0.25), lerp(hy, sy, 0.25), 6 * k, '#ffd166', 0.8);
      g.star(hx, hy, 8 * k, '#ffffff', 1);
    }
    const on = span(u, ta + 0.15, ta + 0.2) * out;
    if (on <= 0) return;
    const m = nodes[(i + 1) % 9], ln = span(u, 0.32 + i * 0.025, 0.4 + i * 0.025);
    if (ln > 0) g.seg(n.x, n.y, lerp(n.x, m.x, ln), lerp(n.y, m.y, ln), 2.4 * k, '#cfd8ff', 0.75 * on);
    g.dot(n.x, n.y, 7 * k * flare, '#ffd166', 0.4 * on);
    g.star(n.x, n.y, 10 * k * flare * (1 + 0.25 * Math.sin(u * 40 + i)), '#fff3b8', on, u * 3);
  });
  const fs = span(u, 0.5, 0.85);
  if (fs > 0 && fs < 1) g.ring(cx, cy, R * (0.6 + 0.8 * fs), R * (0.6 + 0.8 * fs), 4 * k * (1 - fs) + 1, '#fff3b8', 1 - fs);
  each(g, 80, (i) => {
    const q = span(u, 0.25 * g.r(i + 40), 0.6 + 0.4 * g.r(i + 50));
    if (q <= 0 || q >= 1) return;
    const a = g.r(i + 60) * TAU + q * 8, rad = W * (0.7 - 0.4 * q);
    g.dot(cx + Math.cos(a) * rad, ground - q * H * 1.3 + Math.sin(a) * rad * 0.25, 2 * k, STAR[i % 4], Math.min(1, q * 4) * (1 - q));
  });
};

/** Oak Guardian: an oak grows beside the hero, branches out, bursts into leaf
 *  and raises a bark shield; leaves drift down. */
const guardianRoble: Build = (g, u, c, D) => {
  const { cx, k, W, H, ground, face } = geo(c);
  const tx = cx + face * W * 0.8, th = H * 1.2, grow = easeOut(span(u, 0, 0.35)), out = 1 - span(u, 0.82, 1);
  for (let s = 0; s < 3; s++) {
    const pts: Point[] = [];
    for (let j = 0; j <= 9; j++) {
      const f = (j / 9) * grow;
      pts.push({ x: tx + Math.sin(f * 7 + s * 2.1) * W * 0.07 * (1 - f * 0.5), y: ground - f * th });
    }
    g.strip(pts, (j) => (15 - j) * k + 2, s ? '#5a3a1c' : '#3e2812', 0.95 * out, false);
    if (s === 0) g.strip(pts, (j) => (3 - j * 0.2) * k + 0.5, '#b8863b', 0.6 * out);
  }
  const top = { x: tx, y: ground - th * grow }, br = easeOut(span(u, 0.3, 0.55));
  const tips: Point[] = [];
  for (let i = 0; i < 5; i++) {
    const ang = -Math.PI / 2 + (i - 2) * 0.55, len = W * (0.55 + 0.2 * g.r(i)) * br;
    const tip = { x: top.x + Math.cos(ang) * len, y: top.y + Math.sin(ang) * len * 0.8 + H * 0.15 * (i === 2 ? 0 : 1) };
    tips.push(tip);
    if (br > 0.02) g.seg(top.x, top.y + H * 0.1, tip.x, tip.y, 6 * k, '#4a3016', 0.95 * out, 0.4, false);
  }
  const bloom = easeOutBack(span(u, 0.45, 0.7));
  if (bloom > 0) tips.forEach((t, i) => each(g, 9, (j) => {
    const a = g.r(i * 20 + j) * TAU, d = (8 + 18 * g.r(i * 20 + j + 5)) * k * bloom;
    g.leaf(t.x + Math.cos(a) * d, t.y + Math.sin(a) * d, 10 * k, a, LEAF[j % 3], out);
  }));
  const sh = bell(u, 0.5, 0.95);
  g.shield(cx + face * W * 0.35, ground - H * 0.5, H * 0.42, 0.72, '#b8863b', 0.45 * sh);
  each(g, 45, (i) => {
    const q = span(u, 0.5 + 0.3 * g.r(i + 50), 1);
    if (q <= 0 || q >= 1) return;
    const p = tips[i % 5];
    g.leaf(p.x + Math.sin(q * 8 + i) * 18 * k + (g.r(i) - 0.5) * 30 * k, p.y + q * H * 1.1, 9 * k, q * D * 6 + i, LEAF[i % 4], 1 - q);
  });
  rise(g, u, { x: tx, y: ground, w: W, h: th, u0: 0.4, u1: 1, n: 26, cols: ['#fff3b8', '#c9f29b'], salt: 400, size: 6 * k });
};

/** Earth Elemental: boulders tear out of the ground, orbit the hero and slam
 *  together into a stone golem whose eyes light up. */
const elementalTierra: Build = (g, u, c, D) => {
  const { cx, cy, k, W, H, ground, face } = geo(c);
  const gx = cx + face * W * 0.8;
  const form: [number, number, number][] = [
    [0, -0.95, 0.16], [0, -0.62, 0.24], [-0.24, -0.58, 0.16], [0.24, -0.58, 0.16], [-0.46, -0.62, 0.13], [0.46, -0.62, 0.13],
    [-0.52, -0.35, 0.14], [0.52, -0.35, 0.14], [0, -0.36, 0.2], [-0.18, -0.14, 0.15], [0.18, -0.14, 0.15], [0, -0.78, 0.12],
    [-0.12, -0.46, 0.12], [0.12, -0.46, 0.12],
  ];
  const vis = 1 - span(u, 0.85, 1);
  form.forEach(([fx, fy, fr], i) => {
    const up = easeOut(span(u, 0.02 * i, 0.2 + 0.02 * i));
    if (up <= 0) return;
    const orb = u * D * 3 + (i / form.length) * TAU;
    const ox = cx + Math.cos(orb) * W * 0.9, oy = lerp(ground, cy - H * 0.1, up) + Math.sin(orb) * H * 0.18;
    const m = easeInOut(span(u, 0.3, 0.42));
    const x = lerp(ox, gx + fx * W, m), y = lerp(oy, ground + fy * H, m), r = fr * W * (0.8 + 0.3 * g.r(i));
    g.dot(x, y, r, '#5a4028', vis, false);
    g.dot(x - r * 0.25, y - r * 0.25, r * 0.55, '#8a6a3a', vis, false);
    g.dot(x - r * 0.35, y - r * 0.4, r * 0.2, '#d9b77a', 0.7 * vis, false);
  });
  const eyes = span(u, 0.45, 0.55) * vis * (Math.sin(u * D * 20) > -0.8 ? 1 : 0.4);
  for (const s of [-1, 1]) { g.dot(gx + s * W * 0.06, ground - H * 0.97, 5 * k, '#ffb33b', eyes); g.dot(gx + s * W * 0.06, ground - H * 0.97, 12 * k, '#ff7a2a', 0.4 * eyes); }
  const sl = span(u, 0.42, 0.8);
  if (sl > 0 && sl < 1) {
    g.ring(gx, ground, W * (0.3 + 1.2 * easeOut(sl)), W * 0.12 * (0.3 + 1.2 * easeOut(sl)) + 2, 6 * k * (1 - sl) + 1, '#d9b77a', 1 - sl);
    g.ring(gx, ground, W * (0.2 + 0.7 * easeOut(sl)), W * 0.08 * (0.2 + 0.7 * easeOut(sl)) + 2, 3 * k, '#8a6a3a', 1 - sl);
  }
  burst(g, u, gx, ground - 6 * k, { u0: 0.4, u1: 0.85, n: 40, dist: W * 1.2, cols: EARTH, salt: 60, kind: 'drop', len: 9 * k, grav: 220 * k, dir: -Math.PI / 2, spread: 2.8 });
  rise(g, u, { x: gx, y: ground, w: W * 1.8, h: H * 0.6, u0: 0.4, u1: 1, n: 50, cols: ['#8a6a3a', '#b8863b', '#d9b77a'], salt: 90, size: 12 * k, sway: 14 * k });
  rise(g, u, { x: cx, y: ground, w: W * 1.6, h: H * 0.3, u0: 0, u1: 0.4, n: 30, cols: EARTH, salt: 190, size: 9 * k });
};

/** Vengeful Storm, on each enemy it hits: storm clouds close over it, one bolt
 *  strikes it (the damage lands with the bolt), sparks and a flash, rain, smoke. */
const tormentaVenganza: Build = (g, u, c, D) => {
  const { b, cx, cy, R, k, W, H, ground } = geo(c);
  const cyC = Math.max(20, b.y - 0.9 * H), close = easeOut(span(u, 0, 0.14)), gone = span(u, 0.72, 1);
  const frame = Math.floor(u * D * 24), strikeOn = span(u, 0.12, 0.14) * (1 - span(u, 0.36, 0.42));
  const visible = strikeOn > 0 && frame % 5 !== 3;
  const flash = visible ? 1 - span(u, 0.12, 0.4) * 0.6 : 0;
  cloud(g, cx, cyC, W * lerp(3, 1.8, close), H * 0.35, g.n(16), 5, '#252c48', '#cfe6ff', 0.9 * close * (1 - gone), flash);
  each(g, 64, (i) => {
    const f = (u * 2.2 + g.r(i + 200)) % 1;
    const x = cx + (g.r(i + 220) - 0.5) * W * 2.2 - f * 30 * k, y = lerp(cyC, ground + 10 * k, f);
    g.spark(x, y, 14 * k, 1.8, '#9fc4ff', 0.5 * close * (1 - gone) * (1 - f * 0.5));
  });
  const tip = { x: cx + (g.r(3) - 0.5) * W * 0.3, y: cy + H * 0.05 };
  if (visible) {
    bolt(g, { x: cx + (g.r(4) - 0.5) * W * 0.6, y: cyC }, tip, frame, 1, k, STORM, strikeOn, 3);
    g.mark('rayo', tip.x, tip.y);
  }
  g.dot(tip.x, tip.y, R * 0.8 * flash + 1, '#e0f0ff', 0.25 * flash);
  g.dot(tip.x, tip.y, 16 * k * flash + 1, '#ffffff', 0.85 * flash);
  const s = span(u, 0.14, 0.6);
  if (s > 0 && s < 1) {
    g.ring(tip.x, tip.y, R * (0.2 + 1.1 * easeOut(s)), R * (0.2 + 1.1 * easeOut(s)), 5 * k * (1 - s) + 1, '#cfe6ff', 1 - s);
    g.ring(cx, ground, W * (0.3 + 0.8 * s), W * 0.1 * (0.3 + 0.8 * s) + 2, 4 * k, '#7fb6ff', 1 - s);
  }
  burst(g, u, tip.x, tip.y, { u0: 0.13, u1: 0.62, n: 50, dist: R * 1.5, cols: STORM, salt: 40, len: 12 * k, grav: 90 * k });
  const crawl = span(u, 0.18, 0.24) * (1 - span(u, 0.5, 0.65));
  if (crawl > 0) for (let j = 0; j < 4; j++) {
    const a0 = { x: cx + (g.r(j + 60) - 0.5) * W * 0.8, y: cy + (g.r(j + 70) - 0.5) * H * 0.8 };
    const a1 = { x: a0.x + (g.r(frame + j) - 0.5) * 50 * k, y: a0.y + (g.r(frame + j + 9) - 0.5) * 50 * k };
    g.strip(zigzag(a0, a1, 4, 8 * k, frame, j + 20), () => 2 * k, '#cfe6ff', crawl);
  }
  rise(g, u, { x: cx, y: cy, w: W * 0.7, h: H * 0.8, u0: 0.35, u1: 1, n: 16, cols: ['#3a4058', '#5a6078'], salt: 90, size: 26 * k, sway: 12 * k });
};

// ── Barbarian ───────────────────────────────────────────────────────────────

/** Frenzy, on each of its three hits: a crossing pair of burning red slashes at a
 *  new angle, rage cracks, a shock ring and burning blood embers. */
const frenesi: Build = (g, u, c) => {
  const { cx, cy, R, k } = geo(c);
  const th = -0.9 + g.r(1) * 1.8;
  for (let i = 0; i < 2; i++) {
    const ang = th + i * 1.25, grow = easeOut(span(u, i * 0.06, 0.2 + i * 0.06)), fade = 1 - span(u, 0.3, 0.7);
    if (grow <= 0) continue;
    const dx = Math.cos(ang) * R * 0.95, dy = Math.sin(ang) * R * 0.95;
    const x0 = cx - dx, y0 = cy - dy, hx = lerp(x0, cx + dx, grow), hy = lerp(y0, cy + dy, grow);
    g.seg(x0, y0, hx, hy, 28 * k * fade + 2, '#ff3b1f', 0.4 * fade, 1);
    g.seg(x0, y0, hx, hy, 11 * k * fade + 1, '#ff9d4d', 0.85 * fade, 1);
    g.seg(x0, y0, hx, hy, 3.5 * k, '#fff1c9', fade, 1);
  }
  const cr = span(u, 0.15, 0.25) * (1 - span(u, 0.45, 0.65));
  if (cr > 0) for (let j = 0; j < 6; j++) {
    const a = (j / 6) * TAU + g.r(j + 10), to = { x: cx + Math.cos(a) * R * 0.8, y: cy + Math.sin(a) * R * 0.8 };
    g.strip(zigzag({ x: cx + Math.cos(a) * R * 0.2, y: cy + Math.sin(a) * R * 0.2 }, to, 4, 8 * k, j, 3), () => 2.4 * k, '#ff3b1f', cr);
  }
  const s = span(u, 0.12, 0.55);
  if (s > 0 && s < 1) g.ring(cx, cy, R * (0.2 + 1.2 * easeOut(s)), R * (0.2 + 1.2 * easeOut(s)), 6 * k * (1 - s) + 1, '#ff5a2a', 1 - s);
  const fl = bell(u, 0.1, 0.35);
  g.dot(cx, cy, R * 0.7 * fl + 1, '#ff3b1f', 0.35 * fl);
  g.dot(cx, cy, 20 * k * fl + 1, '#fff1c9', 0.8 * fl);
  burst(g, u, cx, cy, { u0: 0.12, u1: 0.8, n: 55, dist: R * 1.6, cols: [...FIRE, '#a01616'], salt: 30, len: 10 * k, grav: 160 * k });
  burst(g, u, cx, cy, { u0: 0.12, u1: 0.7, n: 20, dist: R * 1.1, cols: BLOOD, salt: 130, kind: 'drop', len: 10 * k, grav: 300 * k });
};

/** Wild Heart: a primal heart beats three times, faster and faster, in a
 *  spinning ring of tribal runes; claw marks glow and beast eyes open. */
const corazonSalvaje: Build = (g, u, c, D) => {
  const { b, cx, cy, R, k, W, H, ground } = geo(c);
  const hy = cy - H * 0.05, vis = span(u, 0, 0.1) * (1 - span(u, 0.82, 1));
  runeRing(g, cx, hy, R * 0.85, R * 0.85, 10, -u * D * 1.5, 8 * k, '#b8863b', vis, 3 * k);
  let beat = 1;
  for (const [a, b2] of [[0.2, 0.32], [0.4, 0.5], [0.56, 0.64]]) beat += 0.4 * bell(u, a, b2);
  g.dot(cx, hy, 36 * k * beat, '#a01616', 0.35 * vis);
  g.heart(cx, hy, 20 * k * beat, '#7a0d0d', vis);
  g.heart(cx, hy, 13 * k * beat, '#d63b3b', vis);
  for (let i = 0; i < 3; i++) {
    const on = bell(u, 0.4 + i * 0.06, 0.85);
    const a = -2.2 + i * 0.35;
    g.arc(cx, hy, R * (0.95 + i * 0.08), 5 * k, a, 0.28, '#ffb36b', on);
    g.arc(cx, hy, R * (0.95 + i * 0.08), 2 * k, a, 0.26, '#fff1c9', on);
  }
  const blink = Math.sin(u * D * 5) > -0.7 ? 1 : 0.1, ey = span(u, 0.3, 0.45) * (1 - span(u, 0.8, 0.95)) * blink;
  for (const s of [-1, 1]) { g.dot(cx + s * W * 0.18, b.y - H * 0.25, 5 * k, '#ffb33b', ey); g.dot(cx + s * W * 0.18, b.y - H * 0.25, 13 * k, '#ff7a2a', 0.35 * ey); }
  for (const t0 of [0.2, 0.4, 0.56]) {
    const s = span(u, t0, t0 + 0.3);
    if (s > 0 && s < 1) g.ring(cx, hy, R * (0.3 + s), R * (0.3 + s), 4 * k * (1 - s) + 1, '#d63b3b', 0.8 * (1 - s));
  }
  rise(g, u, { x: cx, y: ground, w: W * 1.6, h: H * 1.1, u0: 0.1, u1: 1, n: 50, cols: EARTH, salt: 20, size: 8 * k });
  rise(g, u, { x: cx, y: ground, w: W * 1.2, h: H * 1.2, u0: 0.3, u1: 1, n: 30, cols: ['#c9f29b', '#7dba4e'], salt: 70, size: 6 * k, kind: 'spark' });
};

/** Sap of the World Tree: golden sap climbs up the body into a canopy of
 *  glowing branches over the head; healing motes and leaves drift. */
const saviaArbol: Build = (g, u, c) => {
  const { b, cx, k, W, H, ground } = geo(c);
  const up = easeOut(span(u, 0, 0.42)), out = 1 - span(u, 0.82, 1), crownY = b.y - H * 0.25;
  for (let i = 0; i < 5; i++) {
    const pts: Point[] = [];
    for (let j = 0; j <= 9; j++) {
      const f = (j / 9) * up;
      pts.push({ x: cx + (i - 2) * W * 0.16 * (1 - f * 0.7) + Math.sin(f * 8 + i) * W * 0.06, y: lerp(ground, crownY, f) });
    }
    g.strip(pts, () => 5 * k, '#7a5a26', 0.8 * out, false);
    g.strip(pts, () => 1.8 * k, '#ffd166', 0.7 * out);
  }
  const br = easeOut(span(u, 0.35, 0.6));
  const tips: Point[] = [];
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.45, L = W * (0.5 + 0.25 * g.r(i)) * br;
    const t = { x: cx + Math.cos(a) * L, y: crownY + Math.sin(a) * L * 0.6 };
    tips.push(t);
    if (br > 0.02) { g.seg(cx, crownY, t.x, t.y, 5 * k, '#7a5a26', 0.9 * out, 0.4, false); g.seg(cx, crownY, t.x, t.y, 2 * k, '#ffd166', 0.8 * out, 0.4); }
  }
  const bloom = span(u, 0.45, 0.72);
  if (bloom > 0) tips.forEach((t, i) => each(g, 8, (j) => {
    const a = g.r(i * 13 + j) * TAU, d = (6 + 16 * g.r(i * 13 + j + 3)) * k * easeOutBack(bloom);
    g.leaf(t.x + Math.cos(a) * d, t.y + Math.sin(a) * d, 10 * k, a, j % 2 ? '#7dba4e' : '#e0a82e', out);
  }));
  const glow = bell(u, 0.35, 0.9);
  g.dot(cx, (ground + b.y) / 2, H * 0.5, '#ffd166', 0.08 * glow);
  each(g, 12, (i) => {
    const q = span(u, 0.45 + 0.35 * g.r(i + 30), 1);
    if (q <= 0 || q >= 1) return;
    const x = cx + (g.r(i + 40) - 0.5) * W * 1.3, y = ground - H * 0.3 - q * H * 0.9, s = 5 * k, a = Math.min(1, q * 4) * (1 - q);
    g.seg(x - s, y, x + s, y, 3 * k, '#c9f29b', a); g.seg(x, y - s, x, y + s, 3 * k, '#c9f29b', a);
  });
  rise(g, u, { x: cx, y: ground, w: W * 1.4, h: H * 1.4, u0: 0.1, u1: 1, n: 60, cols: GOLD, salt: 60, size: 6 * k });
  each(g, 24, (i) => {
    const q = span(u, 0.6 + 0.25 * g.r(i + 80), 1);
    if (q <= 0 || q >= 1) return;
    const t = tips[i % tips.length];
    g.leaf(t.x + Math.sin(q * 7 + i) * 16 * k, t.y + q * H, 8 * k, q * 9 + i, i % 2 ? '#7dba4e' : '#ffd166', 1 - q);
  });
};

/** Divine Fury: a spear of golden light plunges onto the target with the hit and
 *  erupts in a pillar of holy fire with a sunburst and rising embers. */
const furiaDivina: Build = (g, u, c, D) => {
  const { b, cx, cy, R, k, W, H, ground } = geo(c);
  const sy = Math.max(20, b.y - 1.1 * H), fall = easeIn(span(u, 0, 0.11)), sp = { x: cx, y: lerp(sy, cy, fall) };
  const show = span(u, 0, 0.03) * (1 - span(u, 0.11, 0.13));
  if (show > 0) {
    g.dot(sp.x, sp.y - 30 * k, 30 * k, '#ffd166', 0.35 * show);
    g.fang(sp.x, sp.y - 80 * k, sp.x, sp.y + 10 * k, 16 * k, '#ffd166', 0.8 * show);
    g.fang(sp.x, sp.y - 80 * k, sp.x, sp.y + 10 * k, 6 * k, '#ffffff', show);
    g.seg(sp.x, sp.y - 80 * k, sp.x, sp.y - 170 * k, 7 * k, '#fff3b8', 0.45 * show, 1);
  }
  const on = span(u, 0.11, 0.16) * (1 - span(u, 0.7, 0.95));
  for (let i = 0; i < 9; i++) flame(g, cx + (i - 4) * W * 0.11, ground, H * (0.8 + 0.5 * g.r(i + 20)) * on, 26 * k, u * D, i, ['#ff5a2a', '#ffb36b', '#ffd166', '#fff3b8', '#ffffff'], 0.75 * on);
  const fl = bell(u, 0.11, 0.34);
  g.dot(cx, cy, R * fl + 1, '#fff3b8', 0.3 * fl);
  g.seg(cx - 0.6 * W, cy - H * 0.1, cx + 0.6 * W, cy - H * 0.1, 7 * k, '#ffffff', fl, 1);
  g.seg(cx, cy - 0.7 * H, cx, cy + 0.5 * H, 7 * k, '#ffffff', fl, 1);
  const rays = bell(u, 0.11, 0.6);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + u * 1.5, L = R * (1.2 + 0.4 * g.r(i));
    g.beam(cx + Math.cos(a) * R * 0.2, cy + Math.sin(a) * R * 0.2, cx + Math.cos(a) * L, cy + Math.sin(a) * L, 14 * k, '#ffd166', 0.3 * rays);
  }
  const s = span(u, 0.14, 0.65);
  if (s > 0 && s < 1) g.ring(cx, b.y - H * 0.1, W * 0.3 * (1 + s), W * 0.09 * (1 + s) + 2, 4 * k, '#fff3b8', 1 - s);
  burst(g, u, cx, cy, { u0: 0.11, u1: 0.95, n: 70, dist: R * 1.8, cols: ['#ffd166', '#ff7a2a', '#fff3b8', '#ff3b1f'], salt: 70, len: 10 * k, grav: -120 * k });
  rise(g, u, { x: cx, y: ground, w: W * 1.4, h: H * 1.4, u0: 0.15, u1: 1, n: 50, cols: FIRE, salt: 140, size: 7 * k });
};

/** Reopen Wounds: old scars on the target glow red, tear open and gush blood. */
const reabrirHeridas: Build = (g, u, c) => {
  const { cx, cy, R, k, W, H } = geo(c);
  for (let i = 0; i < 4; i++) {
    const x = cx + (g.r(i) - 0.5) * W * 0.6, y = cy + (g.r(i + 10) - 0.5) * H * 0.6, a = -0.8 + g.r(i + 20) * 1.6, L = (18 + 14 * g.r(i + 30)) * k;
    const x0 = x - Math.cos(a) * L, y0 = y - Math.sin(a) * L, x1 = x + Math.cos(a) * L, y1 = y + Math.sin(a) * L;
    const seen = span(u, 0, 0.1) * (1 - span(u, 0.8, 1)), glow = 0.4 + 0.6 * Math.abs(Math.sin(u * 30 + i)) * span(u, 0.08, 0.2);
    const rip = easeOutBack(span(u, 0.22 + i * 0.03, 0.34 + i * 0.03));
    g.seg(x0, y0, x1, y1, (3 + 9 * rip) * k, '#4a0808', 0.9 * seen, 1, false);
    g.seg(x0, y0, x1, y1, (2 + 6 * rip) * k, '#d63b3b', glow * seen, 1);
    g.seg(x0, y0, x1, y1, 1.5 * k, '#ffd0c0', rip * seen * (1 - span(u, 0.4, 0.7)), 1);
    const n = -a - Math.PI / 2;
    burst(g, u, x, y, { u0: 0.24 + i * 0.03, u1: 0.8, n: 16, dist: R * 0.9, cols: BLOOD, salt: 40 + i * 30, kind: 'drop', len: 10 * k, grav: 320 * k, dir: n, spread: 1.4 });
    burst(g, u, x, y, { u0: 0.24 + i * 0.03, u1: 0.7, n: 6, dist: R * 0.5, cols: ['#ff3b3b', '#ffd0c0'], salt: 400 + i * 30, len: 8 * k, dir: n + Math.PI, spread: 1.4 });
  }
  const fl = bell(u, 0.22, 0.45);
  g.dot(cx, cy, R * 0.9 * fl + 1, '#d63b3b', 0.3 * fl);
  const s = span(u, 0.25, 0.6);
  if (s > 0 && s < 1) g.ring(cx, cy, R * (0.4 + 0.8 * s), R * (0.4 + 0.8 * s), 4 * k * (1 - s) + 1, '#a01616', 1 - s);
  rise(g, u, { x: cx, y: cy + H * 0.4, w: W * 0.9, h: -H * 0.4, u0: 0.35, u1: 1, n: 20, cols: ['#7a0d0d', '#a01616'], salt: 600, size: 8 * k, kind: 'drop', sway: 2 });
};

/** Crimson Feast: fangs close on the target, a blood vortex opens and a stream
 *  of blood flows back to the caster, who pulses with it. */
const festinCarmesi: Build = (g, u, c, D) => {
  const { cx, cy, R, k, W } = geo(c);
  const from = c.from ?? { x: cx - 3 * W, y: cy };
  const bite = easeIn(span(u, 0, 0.12)), bv = span(u, 0, 0.03) * (1 - span(u, 0.22, 0.32));
  for (const s of [-1, 1]) for (let t = 0; t < 2; t++) {
    const x = cx + (t - 0.5) * 22 * k, y0 = cy + s * R * lerp(0.9, 0.12, bite);
    g.fang(x, y0 - s * 8 * k, x, y0 + s * 22 * k, 12 * k, '#ffe9e0', bv);
  }
  const vx = span(u, 0.1, 0.2) * (1 - span(u, 0.75, 0.95));
  for (let i = 0; i < 3; i++) g.arc(cx, cy, R * (0.3 + i * 0.18), 5 * k, -u * D * (8 + i * 3), 1.4, BLOOD[i + 1], 0.8 * vx);
  g.dot(cx, cy, R * 0.25 * vx + 1, '#4a0808', 0.8 * vx, false);
  const mid = { x: (cx + from.x) / 2, y: Math.min(cy, from.y) - R * 1.1 };
  each(g, 80, (i) => {
    const q = span(u, 0.14 + 0.45 * g.r(i), 0.44 + 0.45 * g.r(i));
    if (q <= 0 || q >= 1) return;
    const e = easeInOut(q), w = Math.sin(q * 9 + i) * 10 * k;
    const x = (1 - e) ** 2 * cx + 2 * (1 - e) * e * mid.x + e * e * from.x;
    const y = (1 - e) ** 2 * cy + 2 * (1 - e) * e * mid.y + e * e * from.y + w;
    const tx = 2 * (1 - e) * (mid.x - cx) + 2 * e * (from.x - mid.x), ty = 2 * (1 - e) * (mid.y - cy) + 2 * e * (from.y - mid.y);
    g.drop(x, y, (3 + 3 * g.r(i + 50)) * k, dropAngle(tx, ty), BLOOD[1 + (i % 3)], Math.min(1, q * 6) * (1 - q * 0.4), i % 4 === 0);
  });
  const hp = bell(u, 0.55, 0.95);
  g.dot(from.x, from.y, 40 * k * hp + 1, '#d63b3b', 0.35 * hp);
  g.heart(from.x, from.y - 20 * k, 16 * k * (1 + 0.3 * bell(u, 0.6, 0.75)), '#d63b3b', hp);
  const s = span(u, 0.6, 0.95);
  if (s > 0 && s < 1) g.ring(from.x, from.y, 30 * k + R * s, 30 * k + R * s, 4 * k * (1 - s) + 1, '#ff3b3b', 1 - s);
  burst(g, u, cx, cy, { u0: 0.1, u1: 0.55, n: 40, dist: R * 1.2, cols: BLOOD, salt: 300, kind: 'drop', len: 9 * k, grav: 200 * k });
};

/** Indomitable Fury: embers gather and the ground cracks, then red fire erupts
 *  in a pillar with a screen-shaking shockwave and a storm of embers. */
const furiaIndomita: Build = (g, u, c, D) => {
  const { cx, cy, R, k, W, H, ground } = geo(c);
  gather(g, u, cx, cy, { r0: R * 2.2, u0: 0, u1: 0.2, n: 50, cols: FIRE, salt: 3, size: 9 * k, kind: 'spark', turns: 0.4 });
  const core = span(u, 0, 0.2) * (1 - span(u, 0.25, 0.4));
  g.dot(cx, cy, (10 + 30 * span(u, 0, 0.2)) * k, '#ff3b1f', 0.6 * core);
  const cracks = span(u, 0.05, 0.18) * (1 - span(u, 0.6, 0.85));
  if (cracks > 0) for (let j = 0; j < 6; j++) {
    const a = (j / 6) * TAU + g.r(j), to = { x: cx + Math.cos(a) * W * 1.3, y: ground + Math.sin(a) * W * 0.3 };
    const pts = zigzag({ x: cx, y: ground }, to, 6, 10 * k, j, 11);
    g.strip(pts, () => 5 * k, '#ff3b1f', 0.5 * cracks);
    g.strip(pts, () => 2 * k, '#ffc04d', cracks);
  }
  const fl = bell(u, 0.19, 0.4);
  g.dot(cx, cy, R * 1.6 * fl + 1, '#ff5a2a', 0.35 * fl);
  g.dot(cx, cy, 40 * k * fl + 1, '#fff1c9', 0.9 * fl);
  for (let i = 0; i < 2; i++) {
    const s = span(u, 0.2 + i * 0.06, 0.62 + i * 0.1);
    if (s > 0 && s < 1) g.ring(cx, cy, R * (0.3 + 2.6 * easeOut(s)), R * (0.3 + 2.6 * easeOut(s)) * 0.8, 10 * k * (1 - s) + 1, i ? '#ffc04d' : '#ff3b1f', 1 - s);
  }
  const pil = span(u, 0.2, 0.26) * (1 - span(u, 0.7, 0.95));
  for (let i = 0; i < 12; i++) flame(g, cx + (i / 11 - 0.5) * W * 1.1, ground, H * (0.7 + 0.8 * g.r(i + 30)) * pil, 28 * k, u * D, i, ['#a01616', '#ff3b1f', '#ff7a2a', '#ffc04d', '#fff1c9'], 0.85 * pil);
  burst(g, u, cx, cy, { u0: 0.2, u1: 0.7, n: 45, dist: R * 2.4, cols: FIRE, salt: 40, len: 14 * k, grav: 100 * k });
  rise(g, u, { x: cx, y: ground, w: W * 2, h: H * 1.8, u0: 0.2, u1: 1, n: 90, cols: FIRE, salt: 90, size: 8 * k, sway: 14 * k });
};

// ── Wizard ──────────────────────────────────────────────────────────────────

/** Disintegrate: a green orb charges in the caster's hand, a searing green ray
 *  hits the target, whose outline crumbles into motes that drift away. */
const desintegrar: Build = (g, u, c) => {
  const { cx, cy, R, k, W, H, dir } = geo(c);
  const from = c.from ?? { x: cx - dir * 3 * W, y: cy };
  gather(g, u, from.x, from.y, { r0: 90 * k, u0: 0, u1: 0.1, n: 36, cols: ['#7dff6b', '#d6ffb8'], salt: 1, size: 9 * k, kind: 'spark', turns: 0.5 });
  const ch = span(u, 0, 0.1) * (1 - span(u, 0.5, 0.62));
  g.dot(from.x, from.y, (8 + 16 * span(u, 0, 0.1)) * k, '#3fbf3a', 0.5 * ch);
  g.dot(from.x, from.y, (3 + 7 * span(u, 0, 0.1)) * k, '#ffffff', ch);
  const on = span(u, 0.08, 0.12) * (1 - span(u, 0.5, 0.62));
  if (on > 0) {
    g.beam(from.x, from.y, cx, cy, 34 * k, '#3fbf3a', 0.4 * on);
    g.beam(from.x, from.y, cx, cy, 14 * k, '#7dff6b', 0.8 * on);
    g.beam(from.x, from.y, cx, cy, 4 * k, '#ffffff', on);
    const L = Math.hypot(cx - from.x, cy - from.y) || 1, nx = -(cy - from.y) / L, ny = (cx - from.x) / L;
    each(g, 36, (i) => {
      const f = ((i / 36) + u * 3) % 1, off = Math.sin(f * 16 + u * 40) * 14 * k;
      g.dot(lerp(from.x, cx, f) + nx * off, lerp(from.y, cy, f) + ny * off, 2.4 * k, i % 2 ? '#d6ffb8' : '#7dff6b', on);
    });
  }
  const crack = span(u, 0.12, 0.25) * (1 - span(u, 0.7, 0.9));
  g.ring(cx, cy, W * 0.45, H * 0.5, 3 * k, '#7dff6b', crack * (0.6 + 0.4 * Math.sin(u * 80)));
  each(g, 100, (i) => {
    const q = span(u, 0.14 + 0.4 * g.r(i), 0.55 + 0.45 * g.r(i));
    if (q <= 0 || q >= 1) return;
    const a = g.r(i + 10) * TAU, x0 = cx + Math.cos(a) * W * 0.45 * g.r(i + 20), y0 = cy + Math.sin(a) * H * 0.5 * g.r(i + 30);
    g.put(x0 + dir * q * 60 * k + Math.sin(q * 6 + i) * 8 * k, y0 - q * 70 * k, (2 + 2 * g.r(i + 40)) * k, 'disco', i % 3 ? '#7dff6b' : '#d6ffb8', 1 - q, 0, true);
  });
  const s = span(u, 0.12, 0.55);
  if (s > 0 && s < 1) g.ring(cx, cy, R * (0.3 + s), R * (0.3 + s), 5 * k * (1 - s) + 1, '#d6ffb8', 1 - s);
  burst(g, u, cx, cy, { u0: 0.12, u1: 0.6, n: 30, dist: R * 1.3, cols: ['#7dff6b', '#d6ffb8'], salt: 500, len: 10 * k });
};

/** Divination: runes circle above the hero's head and a great eye opens in
 *  them, glancing around, radiating rays among orbiting star motes. */
const clarividencia: Build = (g, u, c, D) => {
  const { b, cx, R, k, W, H } = geo(c);
  const ey = b.y - H * 0.3, w = W * 0.5, vis = span(u, 0, 0.15) * (1 - span(u, 0.82, 1));
  runeRing(g, cx, ey, w * 1.5, w * 0.9, 10, u * D * 1.2, 7 * k, '#4fc3ff', vis, 3 * k);
  runeRing(g, cx, ey, w * 1.9, w * 1.15, 12, -u * D * 0.8, 5 * k, '#ffd166', vis * 0.7, 2 * k);
  const open = easeOutBack(span(u, 0.25, 0.45)) * (1 - span(u, 0.8, 0.95));
  eye(g, cx, ey, w, open, k, '#b8ecff', '#ffd166', vis, Math.sin(u * D * 3));
  const rays = bell(u, 0.4, 0.85);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + u * 0.8, L = R * (1.1 + 0.3 * g.r(i));
    g.beam(cx + Math.cos(a) * w * 0.9, ey + Math.sin(a) * w * 0.6, cx + Math.cos(a) * L, ey + Math.sin(a) * L * 0.7, 8 * k, '#b8ecff', 0.35 * rays);
  }
  each(g, 70, (i) => {
    const q = span(u, 0.25 * g.r(i), 0.7 + 0.3 * g.r(i + 1));
    if (q <= 0 || q >= 1) return;
    const a = g.r(i + 10) * TAU + q * 5, rad = w * (1.2 + 1.2 * g.r(i + 20));
    g.star(cx + Math.cos(a) * rad, ey + Math.sin(a) * rad * 0.6 + q * 30 * k, (4 + 5 * g.r(i + 30)) * k, STAR[i % 4], Math.min(1, q * 4) * (1 - q));
  });
};

/** Mirror Image: prismatic mirror shards swirl in, three ghostly copies of the
 *  hero slide out, flicker and shatter. */
const imagenEspejo: Build = (g, u, c, D) => {
  const { cx, cy, R, k, W, H } = geo(c);
  const cols = ['#dfe8ff', '#ff9dff', '#9dffea', '#fff3b8'];
  each(g, 40, (i) => {
    const q = span(u, 0.25 * g.r(i), 0.45);
    if (q <= 0 || q >= 1) return;
    const a = g.r(i + 10) * TAU + q * 4, rad = R * 2 * (1 - easeIn(q));
    g.seg(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, cx + Math.cos(a) * rad + Math.cos(a + q * 9) * 10 * k, cy + Math.sin(a) * rad + Math.sin(a + q * 9) * 10 * k, 4 * k, cols[i % 4], Math.min(1, q * 4), 0.8);
  });
  const slide = easeOutBack(span(u, 0.25, 0.5)), fade = 1 - span(u, 0.7, 0.8);
  const offs = [-0.95, 0.95, 0];
  offs.forEach((o, i) => {
    const flick = 0.55 + 0.45 * Math.sin(u * D * 30 + i * 2), x = cx + o * W * slide, y = cy - (i === 2 ? H * 0.12 * slide : 0);
    const a = span(u, 0.25, 0.3) * fade * flick;
    if (a <= 0) return;
    g.dot(x, y, W * 0.35, cols[i], 0.2 * a);
    g.ring(x, y, W * 0.4, H * 0.5, 3 * k, cols[i], 0.8 * a);
    g.ring(x, y - H * 0.35, W * 0.18, W * 0.18, 2.5 * k, cols[i], 0.7 * a);
  });
  offs.forEach((o, i) => burst(g, u, cx + o * W, cy - (i === 2 ? H * 0.12 : 0), { u0: 0.7, u1: 1, n: 22, dist: R * 1.1, cols, salt: 100 + i * 40, len: 9 * k, grav: 80 * k }));
  each(g, 36, (i) => { const tw = bell(u, 0.2 + 0.6 * g.r(i + 60), 1); g.star(cx + (g.r(i + 70) - 0.5) * W * 3, cy + (g.r(i + 80) - 0.5) * H * 1.3, 8 * k * tw, cols[i % 4], tw); });
};

/** Forbidden Treatise: a tome opens in front of the hero, its pages flutter out
 *  in a spiral, violet runes rise and an eldritch glyph throbs overhead. */
const tratadoProhibido: Build = (g, u, c, D) => {
  const { b, cx, cy, k, W, H, face } = geo(c);
  const bx = cx + face * W * 0.6, by = cy - H * 0.02, open = easeOutBack(span(u, 0, 0.25)), vis = 1 - span(u, 0.85, 1), K = k * 1.5;
  for (const s of [-1, 1]) {
    const a = -Math.PI / 2 + s * lerp(0.1, 1.25, open);
    g.seg(bx, by, bx + Math.cos(a) * 34 * K, by + Math.sin(a) * 34 * K + 12 * K, 20 * K, '#3a1a52', vis, 0, false);
    g.seg(bx, by, bx + Math.cos(a) * 30 * K, by + Math.sin(a) * 30 * K + 12 * K, 14 * K, '#e8dcc0', vis * open, 0, false);
    for (let l = 1; l <= 3; l++) g.seg(bx + Math.cos(a) * 8 * K, by + Math.sin(a) * 8 * K + (4 + l * 4) * K * 0.6, bx + Math.cos(a) * 26 * K, by + Math.sin(a) * 26 * K + (4 + l * 4) * K * 0.6, 1.2 * k, '#6c2fb5', 0.7 * vis * open, 0, false);
  }
  g.dot(bx, by - 10 * K, 30 * K, '#b46bff', 0.22 * open * vis);
  each(g, 28, (i) => {
    const q = span(u, 0.18 + 0.4 * g.r(i), 0.6 + 0.4 * g.r(i));
    if (q <= 0 || q >= 1) return;
    const a = g.r(i + 10) * TAU + q * 6, rad = W * (0.3 + 0.9 * q);
    const x = cx + Math.cos(a) * rad, y = by - q * H * 0.9 + Math.sin(a) * rad * 0.3, flap = Math.sin(u * D * 16 + i) * 0.9;
    g.put(x, y, 8 * k, 'capsula', '#b46bff', 0.3 * (1 - q), a + flap, true, 1.35, 0);
    g.put(x, y, 7 * k, 'capsula', '#e8dcc0', 0.95 * (1 - q), a + flap, false, 1.35, 0);
  });
  rise(g, u, { x: bx, y: by, w: W * 0.5, h: H * 1.2, u0: 0.15, u1: 1, n: 26, cols: ['#b46bff', '#e8d0ff'], salt: 40, size: 16 * k, kind: 'rune', sway: 16 * k });
  const gl = bell(u, 0.35, 0.9), gy = b.y - H * 0.35;
  g.rune(cx, gy, 34 * k * (1 + 0.15 * Math.sin(u * D * 12)), u * 2, '#6c2fb5', 0.6 * gl);
  g.rune(cx, gy, 30 * k * (1 + 0.15 * Math.sin(u * D * 12)), u * 2, '#e8d0ff', gl);
  for (let i = 0; i < 3; i++) {
    const s = span(u, 0.4 + i * 0.12, 0.8 + i * 0.07);
    if (s > 0 && s < 1) g.arc(cx, gy, 40 * k + W * s, 3 * k, Math.PI / 2, 1.1, '#b46bff', 1 - s);
  }
  rise(g, u, { x: bx, y: by + 20 * k, w: W * 0.4, h: -H * 0.5, u0: 0.2, u1: 1, n: 30, cols: ['#2a0c45', '#6c2fb5'], salt: 90, size: 8 * k, kind: 'drop', sway: 3 });
};

/** Power Word: five runes light up one after another in front of the hero, fuse
 *  into one huge rune that stamps with a concussive shockwave. */
const palabraPoder: Build = (g, u, c) => {
  const { b, cx, cy, R, k, W, face } = geo(c);
  const fx0 = cx + face * W * 0.8, fy = b.y + 10 * k;
  for (let i = 0; i < 5; i++) {
    const on = span(u, 0.04 + i * 0.05, 0.08 + i * 0.05), fuse = easeIn(span(u, 0.28, 0.36));
    const x = lerp(fx0 + (i - 2) * 40 * k, fx0, fuse), y = lerp(fy, cy, fuse);
    if (on > 0 && fuse < 1) { g.rune(x, y, 19 * k, i, '#4fc3ff', 0.6 * on); g.rune(x, y, 16 * k, i, '#dff4ff', on); }
  }
  const st = span(u, 0.34, 0.38), pop = 1 + 0.6 * (1 - easeOutBack(span(u, 0.34, 0.48))), out = 1 - span(u, 0.7, 0.95);
  if (st > 0) { g.rune(fx0, cy, 44 * k * pop, 0, '#3b6bff', 0.7 * st * out); g.rune(fx0, cy, 38 * k * pop, 0, '#b8ecff', st * out); }
  const fl = bell(u, 0.34, 0.55);
  g.dot(fx0, cy, R * 1.1 * fl + 1, '#b8ecff', 0.4 * fl);
  for (let i = 0; i < 3; i++) {
    const s = span(u, 0.35 + i * 0.07, 0.75 + i * 0.07);
    if (s > 0 && s < 1) g.ring(fx0, cy, R * (0.3 + 2 * easeOut(s)), R * (0.3 + 2 * easeOut(s)), 7 * k * (1 - s) + 1, ARCANE[i + 1], 1 - s);
  }
  burst(g, u, fx0, cy, { u0: 0.35, u1: 0.85, n: 60, dist: R * 2.2, cols: ARCANE, salt: 20, len: 13 * k });
  rise(g, u, { x: fx0, y: cy + R * 0.5, w: W * 1.4, h: R * 1.2, u0: 0.4, u1: 1, n: 40, cols: ['#b8ecff', '#4fc3ff'], salt: 90, size: 7 * k, kind: 'rune' });
};

/** Spell Mastery: three rune rings turn round the hero at different speeds and
 *  arcane missiles spiral out of them and dart ahead. */
const maestriaConjuros: Build = (g, u, c, D) => {
  const { cx, cy, R, k, W, H, face } = geo(c);
  const vis = span(u, 0, 0.12) * (1 - span(u, 0.85, 1));
  for (let i = 0; i < 3; i++) {
    const y = cy + (i - 1) * H * 0.32, rx = W * (0.75 - Math.abs(i - 1) * 0.15) * easeOutBack(span(u, i * 0.06, 0.25 + i * 0.06));
    if (rx > 1) runeRing(g, cx, y, rx, rx * 0.28, 8, u * D * (i % 2 ? -2 : 2.6), 7 * k, i === 1 ? '#ffd166' : '#4fc3ff', vis, 3 * k);
  }
  const missiles = g.n(10);
  for (let m = 0; m < missiles; m++) {
    const t0 = 0.25 + m * 0.035;
    for (let tr = 0; tr < 6; tr++) {
      const q = span(u - tr * 0.018, t0, t0 + 0.45);
      if (q <= 0 || q >= 1) continue;
      const spiral = Math.min(1, q / 0.6), dart = span(q, 0.6, 1);
      const a = (m / 10) * TAU + spiral * 5, rad = W * (0.3 + 0.7 * spiral);
      const x = cx + Math.cos(a) * rad + face * dart * W * 3, y = cy - spiral * H * 0.4 + Math.sin(a) * rad * 0.3;
      if (tr === 0) { g.dot(x, y, 12 * k, m % 2 ? '#4fc3ff' : '#ff5ad8', 0.45); g.dot(x, y, 5 * k, '#ffffff', 1); }
      else g.dot(x, y, (6 - tr * 0.8) * k, m % 2 ? '#b8ecff' : '#ff9df0', 0.9 * (1 - tr / 6));
    }
  }
  each(g, 60, (i) => { const tw = bell(u, 0.1 + 0.7 * g.r(i), 1); g.star(cx + (g.r(i + 10) - 0.5) * W * 2.6, cy + (g.r(i + 20) - 0.5) * H * 1.4, 7 * k * tw, ARCANE[i % 4], tw); });
  gather(g, u, cx, cy, { r0: R * 1.8, u0: 0, u1: 0.3, n: 30, cols: ARCANE, salt: 300, size: 7 * k });
};

// ── Rogue ───────────────────────────────────────────────────────────────────

/** Assassin's Strike: a dagger forms out of shadow, venom coats and drips off
 *  it, it cuts across in green and a ghostly skull flashes. */
const golpeAsesino: Build = (g, u, c) => {
  const { cx, cy, R, k, W, H, face } = geo(c);
  const dx = cx + face * W * 0.45, dy = cy - H * 0.05, ang = face > 0 ? -0.7 : Math.PI + 0.7, L = 96 * k;
  gather(g, u, dx, dy, { r0: R * 1.4, u0: 0, u1: 0.25, n: 40, cols: ['#1a1024', '#3a2a4a', '#5bd13a'], salt: 1, size: 9 * k });
  const form = span(u, 0.12, 0.26) * (1 - span(u, 0.8, 0.95));
  if (form > 0) {
    dagger(g, dx, dy, ang, L, k * 1.3, '#a8ff5a', form);
    const coat = span(u, 0.2, 0.45);
    g.seg(dx, dy, dx + Math.cos(ang) * L * coat, dy + Math.sin(ang) * L * coat, 12 * k, '#5bd13a', 0.4 * form);
  }
  const tip = { x: dx + Math.cos(ang) * L, y: dy + Math.sin(ang) * L };
  each(g, 30, (i) => {
    const t0 = 0.25 + 0.5 * g.r(i), q = span(u, t0, t0 + 0.2);
    if (q <= 0 || q >= 1) return;
    g.drop(tip.x - Math.cos(ang) * L * g.r(i + 5) * 0.8, tip.y - Math.sin(ang) * L * g.r(i + 5) * 0.8 + q * q * H * 0.8, 3.5 * k, 0, TOXIC[1 + (i % 3)], 1 - q, false);
  });
  const cut = easeOut(span(u, 0.45, 0.58)), cf = 1 - span(u, 0.58, 0.8);
  if (cut > 0) {
    const x0 = cx - face * W * 0.1, y0 = cy - H * 0.45, x1 = cx + face * W * 1.2, y1 = cy + H * 0.2;
    g.seg(x0, y0, lerp(x0, x1, cut), lerp(y0, y1, cut), 18 * k * cf + 1, '#5bd13a', 0.5 * cf, 1);
    g.seg(x0, y0, lerp(x0, x1, cut), lerp(y0, y1, cut), 4 * k, '#e3ffc2', cf, 1);
  }
  const sk = bell(u, 0.5, 0.85);
  g.skull(cx, cy - H * 0.2, 28 * k, '#a8ff5a', 0.45 * sk);
  burst(g, u, tip.x, tip.y, { u0: 0.46, u1: 0.8, n: 34, dist: R * 1.1, cols: TOXIC, salt: 60, len: 9 * k, grav: 100 * k });
  rise(g, u, { x: dx, y: cy + H * 0.4, w: W, h: H * 0.9, u0: 0.3, u1: 1, n: 30, cols: TOXIC, salt: 120, size: 9 * k, kind: 'bubble' });
  rise(g, u, { x: cx, y: cy + H * 0.5, w: W * 1.6, h: H, u0: 0, u1: 0.7, n: 40, cols: ['#1a1024', '#3a2a4a'], salt: 700, size: 22 * k, sway: 12 * k });
};

/** Soul of Blades: psionic waves pulse from the head, blades materialise in a
 *  halo above it, orbit, then align forwards and lunge. */
const almaCuchillas: Build = (g, u, c, D) => {
  const { b, cx, R, k, W, H, face } = geo(c);
  const hx = cx, hy = b.y + H * 0.15;
  for (let i = 0; i < 4; i++) {
    const s = span(u, i * 0.1, 0.4 + i * 0.1);
    if (s > 0 && s < 1) g.ring(hx, hy, 12 * k + R * 1.2 * s, (12 * k + R * 1.2 * s) * 0.6, 4 * k * (1 - s) + 1, PSI[i % 2], 1 - s);
  }
  const appear = span(u, 0.15, 0.35), lunge = easeIn(span(u, 0.62, 0.85)), vis = 1 - span(u, 0.82, 0.9);
  for (let i = 0; i < 8; i++) {
    if (appear <= 0 || vis <= 0) break;
    const orb = (i / 8) * TAU + u * D * 3, al = easeInOut(span(u, 0.5, 0.62));
    const ox = hx + Math.cos(orb) * W * 0.6, oy = hy - H * 0.35 + Math.sin(orb) * H * 0.14;
    const lx = hx + face * W * 0.4, ly = hy - H * 0.1 + (i - 3.5) * H * 0.1;
    const x = lerp(ox, lx, al) + face * lunge * W * 3, y = lerp(oy, ly, al);
    const ang = lerp(orb, face > 0 ? 0 : Math.PI, al), L = 36 * k;
    const x0 = x - Math.cos(ang) * L / 2, y0 = y - Math.sin(ang) * L / 2;
    g.fang(x0, y0, x0 + Math.cos(ang) * L, y0 + Math.sin(ang) * L, 10 * k, i % 2 ? '#6bf0ff' : '#c86bff', 0.6 * appear * vis);
    g.fang(x0, y0, x0 + Math.cos(ang) * L, y0 + Math.sin(ang) * L, 4 * k, '#ffffff', appear * vis);
    if (lunge > 0) g.seg(x0 - face * lunge * 60 * k, y0, x0, y0, 4 * k, PSI[i % 2], 0.5 * vis, 1);
  }
  each(g, 70, (i) => {
    const q = span(u, 0.6 * g.r(i), 0.4 + 0.6 * g.r(i));
    if (q <= 0 || q >= 1) return;
    const a = g.r(i + 10) * TAU, rad = W * (0.3 + q * 1.1);
    g.spark(hx + Math.cos(a) * rad, hy - H * 0.2 + Math.sin(a) * rad * 0.6, 7 * k, a, PSI[i % 3], 1 - q);
  });
};

/** Mage Hand: a spectral hand sweeps in beside the hero, opens its fingers and
 *  flicks two glowing cards into the hero's hand, leaving wisps. */
const manoFantasmal: Build = (g, u, c, D) => {
  const { cx, cy, R, k, W, H, face, ground } = geo(c);
  const p = easeInOut(span(u, 0, 0.4)), hx = cx + face * lerp(-W * 1.1, W * 0.75, p), hy = cy - H * lerp(0.05, 0.3, p);
  const vis = span(u, 0, 0.1) * (1 - span(u, 0.8, 0.95)), spread = 0.35 + 0.65 * easeOutBack(span(u, 0.35, 0.5)), K = k * 1.5;
  g.dot(hx, hy, 34 * K, '#9dffea', 0.1 * vis);
  g.put(hx, hy + 4 * K, 14 * K, 'escudo', '#9dffea', 0.55 * vis, 0, true, 0.85);
  g.dot(hx, hy + 4 * K, 10 * K, '#dffff7', 0.2 * vis, false);
  for (let f = 0; f < 5; f++) {
    const a = -Math.PI / 2 + (f - 2) * 0.3 * spread + (f === 0 ? -0.75 * face : 0), L = (f === 0 ? 22 : 32 - Math.abs(f - 2) * 5) * K;
    const wig = Math.sin(u * D * 6 + f) * 0.08;
    const x1 = hx + Math.cos(a) * 10 * K, y1 = hy + Math.sin(a) * 10 * K;
    const xm = hx + Math.cos(a) * L * 0.6, ym = hy + Math.sin(a) * L * 0.6;
    const x2 = xm + Math.cos(a + wig + 0.15 * (1 - spread)) * L * 0.4, y2 = ym + Math.sin(a + wig + 0.15 * (1 - spread)) * L * 0.4;
    g.seg(x1, y1, xm, ym, 7 * K, '#9dffea', 0.45 * vis, 0.2, false);
    g.seg(xm, ym, x2, y2, 6 * K, '#9dffea', 0.45 * vis, 0.5, false);
    g.seg(x1, y1, xm, ym, 2 * K, '#ffffff', 0.7 * vis, 0.2);
    g.seg(xm, ym, x2, y2, 1.6 * K, '#ffffff', 0.7 * vis, 0.5);
  }
  for (let cd = 0; cd < 2; cd++) {
    const q = easeInOut(span(u, 0.5 + cd * 0.08, 0.8 + cd * 0.08));
    if (q <= 0 || q >= 1) continue;
    const x = lerp(hx, cx - face * W * 0.1 + cd * 14 * k, q), y = lerp(hy, ground - H * 0.25, q) - Math.sin(q * Math.PI) * 40 * k;
    g.put(x, y, 12 * k, 'capsula', '#9dffea', 0.35, q * 8 + cd, true, 1.5, 0);
    g.put(x, y, 10 * k, 'capsula', '#3a2a55', 0.95, q * 8 + cd, false, 1.5, 0);
    g.put(x, y, 7 * k, 'capsula', '#ffd166', 0.8, q * 8 + cd, false, 1.6, 0);
  }
  each(g, 70, (i) => {
    const q = span(u, 0.45 * g.r(i), 0.45 * g.r(i) + 0.4);
    if (q <= 0 || q >= 1) return;
    const lag = Math.max(0, p - q * 0.35), x = cx + face * lerp(-W * 1.1, W * 0.75, lag), y = cy - H * lerp(0.05, 0.3, lag);
    g.dot(x + (g.r(i + 10) - 0.5) * 34 * k, y + (g.r(i + 20) - 0.5) * 34 * k - q * 20 * k, 2.2 * k, i % 2 ? '#9dffea' : '#c7d2e8', 1 - q);
  });
  burst(g, u, hx, hy, { u0: 0.45, u1: 0.8, n: 30, dist: R, cols: ['#9dffea', '#ffffff'], salt: 80, kind: 'star', len: 8 * k });
};

/** Blade Mastery: a fan of daggers deploys behind the hero, a whetstone shower
 *  of sparks runs along each edge in turn and each tip glints. */
const maestriaCuchillas: Build = (g, u, c) => {
  const { cx, cy, k, W, H, face } = geo(c);
  const px = cx - face * W * 0.1, py = cy + H * 0.2, fan = easeOutBack(span(u, 0, 0.3)), vis = 1 - span(u, 0.8, 0.95);
  const L = H * 0.6;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.32 * fan, x0 = px + Math.cos(a) * H * 0.15, y0 = py + Math.sin(a) * H * 0.15;
    dagger(g, x0, y0, a, L, k * 1.1, '#dfe6ef', vis * span(u, 0, 0.12));
    const t0 = 0.25 + i * 0.05, q = span(u, t0, t0 + 0.12);
    if (q > 0 && q < 1) {
      const ex = x0 + Math.cos(a) * L * q, ey = y0 + Math.sin(a) * L * q;
      burst(g, u, ex, ey, { u0: t0, u1: t0 + 0.3, n: 18, dist: 40 * k, cols: ['#ffc04d', '#fff1c9', '#ffffff'], salt: i * 30, len: 8 * k, grav: 70 * k, dir: a + face * Math.PI / 2, spread: 1.2 });
    }
    const gl = bell(u, t0 + 0.1, t0 + 0.25);
    g.star(x0 + Math.cos(a) * L, y0 + Math.sin(a) * L, 16 * k * gl, '#ffffff', gl, u * 4);
  }
  each(g, 30, (i) => { const tw = bell(u, 0.2 + 0.6 * g.r(i), 1); g.dot(px + (g.r(i + 10) - 0.5) * W * 2, py - g.r(i + 20) * H * 1.2, 2 * k, STEEL[i % 3], tw); });
};

/** Stinking Cloud: a billowing green cloud swells round the target with rising
 *  acid bubbles, buzzing flies, drips and a flickering skull. */
const nubeNauseabunda: Build = (g, u, c, D) => {
  const { cx, cy, R, k, W, H, ground } = geo(c);
  const sw = easeOut(span(u, 0, 0.35)), out = 1 - span(u, 0.8, 1);
  each(g, 22, (i) => {
    const a = g.r(i) * TAU, rad = R * (0.3 + 0.8 * g.r(i + 10)) * sw, drift = u * D * 12 * k;
    const x = cx + Math.cos(a) * rad + Math.sin(u * 3 + i) * drift, y = cy + Math.sin(a) * rad * 0.8 - drift * 0.5;
    const r = (0.25 + 0.2 * g.r(i + 20)) * R * (0.5 + 0.5 * sw);
    g.dot(x, y, r, i % 3 ? '#3d7a22' : '#5bd13a', 0.4 * out * sw, false);
    g.dot(x - r * 0.2, y - r * 0.25, r * 0.5, '#a8ff5a', 0.25 * out * sw);
  });
  rise(g, u, { x: cx, y: ground, w: W * 1.2, h: H * 1.1, u0: 0.15, u1: 1, n: 30, cols: TOXIC, salt: 40, size: 10 * k, kind: 'bubble' });
  each(g, 20, (i) => {
    const a = u * D * (6 + 4 * g.r(i)) + g.r(i + 30) * TAU, rad = R * (0.5 + 0.5 * g.r(i + 40));
    const on = span(u, 0.25, 0.35) * out;
    g.dot(cx + Math.cos(a) * rad + Math.sin(u * 90 + i) * 3 * k, cy + Math.sin(a * 1.3) * rad * 0.6, 2.2 * k, '#1a1a0a', on, false);
  });
  each(g, 16, (i) => {
    const t0 = 0.3 + 0.5 * g.r(i + 50), q = span(u, t0, t0 + 0.2);
    if (q <= 0 || q >= 1) return;
    g.drop(cx + (g.r(i + 60) - 0.5) * W, cy + q * q * H * 0.6, 3.4 * k, 0, TOXIC[1 + (i % 2)], 1 - q, false);
  });
  const sk = bell(u, 0.35, 0.75) * (0.6 + 0.4 * Math.sin(u * D * 25));
  g.skull(cx, cy - H * 0.05, 30 * k, '#a8ff5a', 0.5 * sk);
  const s = span(u, 0.3, 0.7);
  if (s > 0 && s < 1) g.ring(cx, cy, R * (0.6 + 0.6 * s), R * (0.5 + 0.5 * s), 4 * k * (1 - s) + 1, '#a8ff5a', 0.8 * (1 - s));
};

/** Opportunist: shadows close in, a grin shows in the dark, a crosshair tightens
 *  ahead of the hero, a blade glints and a silver slash snaps. */
const oportunista: Build = (g, u, c, D) => {
  const { cx, cy, R, k, W, H, face } = geo(c);
  const sh = span(u, 0, 0.3) * (1 - span(u, 0.75, 1));
  each(g, 26, (i) => {
    const a = (i / 26) * TAU, rad = R * (1.6 - 0.5 * sh) * (0.9 + 0.2 * g.r(i));
    g.dot(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.8, R * 0.35, '#06040c', 0.55 * sh, false);
  });
  g.crescent(cx, cy - H * 0.3, 20 * k, Math.PI / 2, '#dfe6ef', bell(u, 0.15, 0.7) * 0.8, 0.6);
  const tx = cx + face * W * 1.3, ch = easeOut(span(u, 0.05, 0.42)), cv = span(u, 0.05, 0.12) * (1 - span(u, 0.5, 0.65));
  const rr = lerp(R * 1.4, 16 * k, ch), rot = u * D * 2;
  g.ring(tx, cy, rr, rr, 2.5 * k, '#ff5a5a', cv);
  for (let i = 0; i < 4; i++) {
    const a = rot + (i * Math.PI) / 2;
    g.seg(tx + Math.cos(a) * rr * 0.6, cy + Math.sin(a) * rr * 0.6, tx + Math.cos(a) * rr * 1.4, cy + Math.sin(a) * rr * 1.4, 2.5 * k, '#ff5a5a', cv);
  }
  const snap = bell(u, 0.42, 0.52);
  g.dot(tx, cy, 18 * k * snap + 1, '#ffffff', snap);
  const gl = bell(u, 0.45, 0.62);
  g.star(cx + face * W * 0.3, cy - H * 0.1, 22 * k * gl, '#ffffff', gl, u * 3);
  const cut = easeOut(span(u, 0.5, 0.62)), cf = 1 - span(u, 0.62, 0.85);
  if (cut > 0) {
    const x0 = cx + face * W * 0.3, y0 = cy - H * 0.1;
    g.seg(x0, y0, lerp(x0, tx, cut), lerp(y0, cy, cut), 12 * k * cf + 1, '#9aa7b8', 0.5 * cf, 1);
    g.seg(x0, y0, lerp(x0, tx, cut), lerp(y0, cy, cut), 3 * k, '#ffffff', cf, 1);
  }
  burst(g, u, tx, cy, { u0: 0.55, u1: 0.95, n: 44, dist: R * 1.2, cols: STEEL, salt: 50, len: 10 * k, grav: 90 * k });
};

/** Steel Tempest: a storm of daggers flies in from every side onto the target,
 *  each one striking sparks, amid whirling steel arcs. */
const tempestadAcero: Build = (g, u, c, D) => {
  const { cx, cy, R, k } = geo(c);
  const n = g.n(16);
  for (let i = 0; i < n; i++) {
    const t0 = 0.04 + (i / n) * 0.36, q = span(u, t0, t0 + 0.14);
    const a = g.r(i) * TAU, far = R * 2.6;
    const hx = cx + Math.cos(a) * R * 0.15 * g.r(i + 5), hy = cy + Math.sin(a) * R * 0.15 * g.r(i + 7);
    if (q > 0 && q < 1) {
      const e = easeIn(q), x = lerp(cx + Math.cos(a) * far, hx, e), y = lerp(cy + Math.sin(a) * far, hy, e);
      g.seg(x + Math.cos(a) * 50 * k, y + Math.sin(a) * 50 * k, x, y, 5 * k, '#9aa7b8', 0.4, 1);
      dagger(g, x + Math.cos(a) * 46 * k, y + Math.sin(a) * 46 * k, a + Math.PI, 46 * k, k, '#dfe6ef', 1);
    }
    const hit = span(u, t0 + 0.14, t0 + 0.34);
    if (hit > 0 && hit < 1) {
      g.dot(hx, hy, 8 * k * (1 - hit) + 1, '#ffffff', 0.7 * (1 - hit));
      for (let j = 0; j < 5; j++) {
        const sa = a + Math.PI + (g.r(i * 9 + j) - 0.5) * 2.2, d = easeOut(hit) * 40 * k;
        g.spark(hx + Math.cos(sa) * d, hy + Math.sin(sa) * d, 8 * k, sa, j % 2 ? '#ffc04d' : '#ffffff', 1 - hit);
      }
    }
  }
  const wv = bell(u, 0.15, 0.85);
  for (let i = 0; i < 3; i++) g.arc(cx, cy, R * (0.6 + i * 0.2), 4 * k, u * D * (9 + i * 2) + i * 2, 1.1, STEEL[i], 0.6 * wv);
  burst(g, u, cx, cy, { u0: 0.4, u1: 0.9, n: 40, dist: R * 1.5, cols: STEEL, salt: 400, len: 11 * k, grav: 120 * k });
};

/** Deadly Dance: phantom daggers whirl round the hero in a tightening spiral,
 *  then fan out forwards as crescent slashes. */
const danzaMortal: Build = (g, u, c, D) => {
  const { cx, cy, R, k, W, H, face } = geo(c);
  const sp = span(u, 0, 0.5), fanT = easeOut(span(u, 0.48, 0.75)), vis = 1 - span(u, 0.82, 1);
  for (let i = 0; i < 12; i++) {
    const orb = (i / 12) * TAU + u * D * 9, rad = W * lerp(1.2, 0.55, sp), y = cy + Math.sin(orb) * H * 0.25;
    const x = cx + Math.cos(orb) * rad;
    const fa = (face > 0 ? 0 : Math.PI) + ((i / 11) - 0.5) * 1.6;
    const px = lerp(x, cx + Math.cos(fa) * W * 2.4, fanT), py = lerp(y, cy + Math.sin(fa) * W * 2.4, fanT);
    const ang = fanT > 0 ? fa : orb + Math.PI / 2, a = span(u, 0.02 * i, 0.05 + 0.02 * i) * vis * (1 - fanT * 0.6);
    if (a <= 0) continue;
    dagger(g, px, py, ang, 44 * k, k, PHANTOM[i % 3], a);
    if (fanT <= 0) g.arc(cx, cy, rad, 3 * k, orb - 0.35, 0.3, PHANTOM[0], 0.35 * a);
  }
  for (let j = 0; j < 5; j++) {
    const s = span(u, 0.5 + j * 0.04, 0.8 + j * 0.04);
    if (s <= 0 || s >= 1) continue;
    const dir = (face > 0 ? 0 : Math.PI) + (j - 2) * 0.35;
    g.arc(cx, cy, W * (0.5 + 1.6 * easeOut(s)), 8 * k * (1 - s) + 1, dir, 0.35, j % 2 ? '#b8c6ff' : '#e8f0ff', 1 - s);
  }
  gather(g, u, cx, cy, { r0: R * 1.8, u0: 0, u1: 0.4, n: 40, cols: PHANTOM, salt: 7, size: 8 * k, kind: 'spark', turns: 1.2 });
  burst(g, u, cx, cy, { u0: 0.5, u1: 0.95, n: 60, dist: W * 2.4, cols: PHANTOM, salt: 70, len: 11 * k, dir: face > 0 ? 0 : Math.PI, spread: 2 });
};

// ── Warlock ─────────────────────────────────────────────────────────────────

/** Fey Presence: a glitter swirl, flowers bloom and butterflies flutter up round
 *  the enemy, then a violet mist of darkness closes in. */
const presenciaFeerica: Build = (g, u, c, D) => {
  const { cx, cy, R, k, W, H, ground } = geo(c);
  each(g, 60, (i) => {
    const q = span(u, 0.4 * g.r(i), 0.5 + 0.4 * g.r(i));
    if (q <= 0 || q >= 1) return;
    const a = g.r(i + 10) * TAU + q * 7, rad = R * (1.2 - 0.6 * q);
    g.star(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.7 - q * 20 * k, (4 + 4 * g.r(i + 20)) * k, FEY[i % 4], Math.min(1, q * 4) * (1 - q), q * 5);
  });
  for (let f = 0; f < 4; f++) {
    const bl = easeOutBack(span(u, 0.15 + f * 0.06, 0.4 + f * 0.06)) * (1 - span(u, 0.8, 0.95));
    if (bl <= 0) continue;
    const fx = cx + (f - 1.5) * W * 0.45, fy = ground - 4 * k;
    for (let p = 0; p < 5; p++) { const a = (p / 5) * TAU + f; g.leaf(fx + Math.cos(a) * 9 * k * bl, fy + Math.sin(a) * 6 * k * bl, 11 * k * bl, a, f % 2 ? '#ff8fd8' : '#b46bff', 0.9 * bl, true); }
    g.dot(fx, fy, 4 * k * bl, '#fff3b8', bl);
  }
  for (let b2 = 0; b2 < 6; b2++) {
    const q = span(u, 0.25 + b2 * 0.05, 0.85 + b2 * 0.02);
    if (q <= 0 || q >= 1) continue;
    const x = cx + (g.r(b2 + 40) - 0.5) * W * 1.5 + Math.sin(q * 8 + b2) * 20 * k, y = ground - q * H * 1.2, flap = Math.abs(Math.sin(u * D * 22 + b2));
    for (const s of [-1, 1]) g.leaf(x + s * 6 * k * flap, y, 11 * k, s * (0.6 + flap), FEY[b2 % 3], 1 - q * 0.6, true);
  }
  const mist = span(u, 0.5, 0.75) * (1 - span(u, 0.85, 1));
  each(g, 16, (i) => {
    const a = g.r(i + 60) * TAU, rad = R * lerp(1.6, 0.7, mist);
    g.dot(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.7, R * 0.3, '#2a0c45', 0.5 * mist, false);
  });
};

/** Celestial Blessing: light pours from above, wings of light unfold behind
 *  the hero under a halo, feathers drift down among sparkles. */
const bendicionCelestial: Build = (g, u, c, D) => {
  const { b, cx, cy, k, W, H, ground } = geo(c);
  const bm = bell(u, 0, 0.6);
  g.beam(cx, b.y - H * 2, cx, ground, W * 0.8, '#ffd166', 0.3 * bm);
  g.beam(cx, b.y - H * 2, cx, ground, W * 0.25, '#fff3b8', 0.5 * bm);
  const open = easeOutBack(span(u, 0.2, 0.5)), vis = 1 - span(u, 0.8, 1);
  for (const s of [-1, 1]) for (let f = 0; f < 6; f++) {
    const a = (s > 0 ? 0 : Math.PI) - s * (0.9 - f * 0.28) * open, L = W * (0.95 - f * 0.08) * (0.4 + 0.6 * open);
    const x0 = cx + s * W * 0.12, y0 = cy - H * 0.2;
    const x1 = x0 + Math.cos(a) * L, y1 = y0 + Math.sin(a) * L * 0.9 + Math.sin(u * D * 6) * 3 * k;
    g.seg(x0, y0, x1, y1, 10 * k, '#e0a82e', 0.16 * vis * span(u, 0.2, 0.3), 1);
    g.seg(x0, y0, x1, y1, 5 * k, '#fff3d0', 0.75 * vis * span(u, 0.2, 0.3), 1, false);
    g.seg(x0, y0, x1, y1, 1.6 * k, '#ffffff', 0.7 * vis * span(u, 0.2, 0.3), 1);
  }
  const hl = span(u, 0.25, 0.4) * vis;
  g.ring(cx, b.y - H * 0.02, W * 0.26, W * 0.08, 4 * k, '#ffd166', hl);
  g.ring(cx, b.y - H * 0.02, W * 0.26, W * 0.08, 1.5 * k, '#ffffff', hl);
  each(g, 40, (i) => {
    const q = span(u, 0.35 + 0.35 * g.r(i), 1);
    if (q <= 0 || q >= 1) return;
    g.leaf(cx + (g.r(i + 10) - 0.5) * W * 2.2 + Math.sin(q * 6 + i) * 18 * k, b.y - H * 0.3 + q * H * 1.2, 10 * k, Math.sin(q * 5 + i), i % 3 ? '#fff8e0' : '#ffd166', 1 - q);
  });
  each(g, 44, (i) => { const tw = bell(u, 0.2 + 0.6 * g.r(i + 40), 1); g.star(cx + (g.r(i + 50) - 0.5) * W * 2.4, cy + (g.r(i + 60) - 0.5) * H * 1.4, 7 * k * tw, GOLD[i % 4], tw); });
  rise(g, u, { x: cx, y: ground, w: W, h: H * 1.2, u0: 0.4, u1: 1, n: 20, cols: ['#c9f29b', '#fff3b8'], salt: 90, size: 7 * k });
};

/** Infernal Pact: a burning pentagram draws itself under the hero, fire rises
 *  from its points, horns of flame crown the hero and embers fly. */
const pactoInfernal: Build = (g, u, c, D) => {
  const { b, cx, k, W, H, ground } = geo(c);
  const rx = W * 0.95, ry = W * 0.26, draw = span(u, 0, 0.3), out = 1 - span(u, 0.8, 1);
  g.dot(cx, ground, rx * 0.8, '#2a0508', 0.35 * out * draw, false);
  pentagram(g, cx, ground, rx, ry, u * 0.6, 4 * k, '#ff3b1f', out, draw);
  pentagram(g, cx, ground, rx, ry, u * 0.6, 1.6 * k, '#ffc04d', out, draw);
  const fl = span(u, 0.28, 0.35) * (1 - span(u, 0.8, 0.95));
  for (let i = 0; i < 5; i++) {
    const a = u * 0.6 + (i * TAU) / 5 - Math.PI / 2;
    flame(g, cx + Math.cos(a) * rx, ground + Math.sin(a) * ry, H * (0.5 + 0.3 * g.r(i)) * fl, 22 * k, u * D, i, HELL, 0.9 * fl);
  }
  const hn = span(u, 0.35, 0.5) * (1 - span(u, 0.8, 0.95));
  for (const s of [-1, 1]) {
    const x0 = cx + s * W * 0.14, y0 = b.y + H * 0.05;
    g.fang(x0, y0, x0 + s * 16 * k, y0 - 30 * k * hn, 12 * k, '#c21f3a', hn);
    g.fang(x0, y0, x0 + s * 16 * k, y0 - 30 * k * hn, 5 * k, '#ffb36b', hn);
  }
  rise(g, u, { x: cx, y: ground, w: rx * 2, h: H * 1.6, u0: 0.25, u1: 1, n: 80, cols: HELL.slice(1), salt: 30, size: 8 * k, sway: 14 * k });
  const s = span(u, 0.3, 0.7);
  if (s > 0 && s < 1) g.ring(cx, ground, rx * (1 + s), ry * (1 + s), 5 * k * (1 - s) + 1, '#ff5a2a', 1 - s);
};

/** Mind of the Great Old One: a rift tears open above the hero, a huge eye opens
 *  in it, tentacles reach down and whispered runes orbit. */
const menteGranAntiguo: Build = (g, u, c, D) => {
  const { b, cx, R, k, W, H } = geo(c);
  const ry = b.y - H * 0.35, open = easeOut(span(u, 0, 0.3)) * (1 - easeIn(span(u, 0.8, 0.97)));
  g.dot(cx, ry, W * 0.75 * open + 1, '#0c0418', 0.85 * open, false);
  g.ring(cx, ry, W * 0.8 * open + 1, W * 0.35 * open + 1, 5 * k, '#6c2fb5', open);
  eye(g, cx, ry, W * 0.45 * open + 1, easeOutBack(span(u, 0.25, 0.45)) * open, k, '#b46bff', '#a8ff5a', open, Math.sin(u * D * 2.5));
  const arms = g.n(6);
  for (let i = 0; i < arms; i++) {
    const e = easeOut(span(u, 0.3 + i * 0.03, 0.6 + i * 0.03)) * (1 - span(u, 0.75, 0.95));
    if (e <= 0.02) continue;
    const x0 = cx + (i - 2.5) * W * 0.25, pts: Point[] = [];
    for (let j = 0; j <= 10; j++) {
      const s = (j / 10) * e, w = Math.sin(s * 6 + u * D * 8 + i) * 16 * k * s;
      pts.push({ x: x0 + w + (i < 3 ? -1 : 1) * s * W * 0.3, y: ry + W * 0.2 + s * H * 1.1 });
    }
    g.strip(pts, (j) => (11 - j) * k + 2, '#6c2fb5', 0.5);
    g.strip(pts, (j) => (9 - j * 0.8) * k + 1, '#1a0830', 0.95, false);
  }
  each(g, 18, (i) => {
    const a = (i / 18) * TAU + u * D * 1.5, rad = R * (1.2 + 0.2 * Math.sin(u * 10 + i));
    g.rune(cx + Math.cos(a) * rad, b.y + H * 0.4 + Math.sin(a) * rad * 0.5, 8 * k, a, VOID[2 + (i % 2)], bell(u, 0.2, 0.9) * (0.5 + 0.5 * Math.sin(u * 20 + i)));
  });
  gather(g, u, cx, ry, { r0: R * 2, u0: 0, u1: 0.3, n: 40, cols: VOID, salt: 80, size: 8 * k });
};

/** Three-Pronged Blast: a violet orb charges in the hand and splits into three
 *  crackling eldritch beams fanning forwards. */
const explosionTrifurcada: Build = (g, u, c, D) => {
  const { cx, cy, R, k, W, H, face } = geo(c);
  const hx = cx + face * W * 0.4, hy = cy - H * 0.05;
  gather(g, u, hx, hy, { r0: R * 1.5, u0: 0, u1: 0.34, n: 70, cols: VOID, salt: 1, size: 9 * k, kind: 'spark', turns: 0.7 });
  const ch = span(u, 0, 0.3) * (1 - span(u, 0.55, 0.7));
  g.dot(hx, hy, (8 + 20 * span(u, 0, 0.3)) * k, '#6c2fb5', 0.6 * ch);
  g.dot(hx, hy, (4 + 8 * span(u, 0, 0.3)) * k, '#e8d0ff', ch);
  const on = span(u, 0.28, 0.32) * (1 - span(u, 0.62, 0.75)), frame = Math.floor(u * D * 20);
  const ends: Point[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (face > 0 ? 0 : Math.PI) + (i - 1) * 0.45 * face, L = W * 2.6 * easeOut(span(u, 0.28, 0.4));
    const end = { x: hx + Math.cos(a) * L, y: hy + Math.sin(a) * L };
    ends.push(end);
    if (on > 0 && L > 4) {
      g.beam(hx, hy, end.x, end.y, 18 * k, '#6c2fb5', 0.35 * on);
      bolt(g, { x: hx, y: hy }, end, frame, i * 11, k * 0.8, ['#b46bff', '#e8d0ff', '#ff5ad8'], on, 1);
    }
  }
  ends.forEach((e, i) => burst(g, u, e.x, e.y, { u0: 0.34, u1: 0.8, n: 34, dist: R * 0.9, cols: VOID.slice(1), salt: 50 + i * 30, len: 9 * k }));
  const s = span(u, 0.3, 0.6);
  if (s > 0 && s < 1) g.ring(hx, hy, 12 * k + R * s, 12 * k + R * s, 4 * k * (1 - s) + 1, '#b46bff', 1 - s);
};

/** Doubled Beam: one eldritch beam leaves the hand, splits into two strands
 *  that twist round each other in a helix, ringed with sigils. */
const hazDesdoblado: Build = (g, u, c, D) => {
  const { cx, cy, R, k, W, H, face } = geo(c);
  const hx = cx + face * W * 0.4, hy = cy - H * 0.05, L = W * 2.8 * easeOut(span(u, 0.2, 0.4));
  const on = span(u, 0.2, 0.24) * (1 - span(u, 0.7, 0.85)), split = easeOut(span(u, 0.3, 0.5));
  gather(g, u, hx, hy, { r0: R * 1.2, u0: 0, u1: 0.22, n: 36, cols: VOID, salt: 1, size: 8 * k });
  if (on > 0) {
    g.beam(hx, hy, hx + face * L, hy, 26 * k, '#6c2fb5', 0.2 * on);
    for (let s = 0; s < 2; s++) {
      const pts: Point[] = [];
      for (let j = 0; j <= 16; j++) {
        const f = j / 16, off = Math.sin(f * 10 - u * D * 14 + s * Math.PI) * 18 * k * split * Math.min(1, f * 4);
        pts.push({ x: hx + face * f * L, y: hy + off });
      }
      g.strip(pts, () => 6 * k, s ? '#ff5ad8' : '#b46bff', 0.35 * on);
      g.strip(pts, () => 2 * k, '#f0e0ff', 0.9 * on);
    }
    for (let r = 1; r <= 4; r++) g.ring(hx + face * L * (r / 4.5), hy, 7 * k, 28 * k * (1 + 0.2 * Math.sin(u * D * 12 + r)), 2.5 * k, '#e8d0ff', 0.7 * on * split);
  }
  each(g, 50, (i) => {
    const f = g.r(i), q = span(u, 0.3 + 0.3 * g.r(i + 5), 0.7 + 0.3 * g.r(i + 5));
    if (q <= 0 || q >= 1) return;
    g.spark(hx + face * f * L, hy + (g.r(i + 10) - 0.5) * 60 * k * q, 7 * k, (g.r(i + 20) - 0.5) * 3, VOID[1 + (i % 3)], 1 - q);
  });
};

/** Word of Annihilation: runes of a dark word orbit the target and tighten, it
 *  implodes into a void, a skull stamps and ashes drift. */
const verboAniquilacion: Build = (g, u, c, D) => {
  const { cx, cy, R, k, W, H } = geo(c);
  const tight = easeIn(span(u, 0, 0.4)), rv = span(u, 0, 0.1) * (1 - span(u, 0.38, 0.44));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + u * D * (2 + 4 * tight), rad = R * lerp(1.5, 0.3, tight);
    g.rune(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.8, 12 * k, a, '#6c2fb5', 0.6 * rv);
    g.rune(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.8, 10 * k, a, '#e8d0ff', rv);
  }
  gather(g, u, cx, cy, { r0: R * 1.6, u0: 0.2, u1: 0.42, n: 60, cols: VOID, salt: 30, size: 8 * k, kind: 'spark', turns: 0.5 });
  const vd = bell(u, 0.38, 0.85);
  g.dot(cx, cy, R * 0.6 * vd + 1, '#0c0418', 0.8 * vd, false);
  const st = easeOutBack(span(u, 0.4, 0.55)), sk = st * (1 - span(u, 0.75, 0.95));
  g.skull(cx, cy, 40 * k * (0.5 + 0.5 * st), '#6c2fb5', 0.6 * sk);
  g.skull(cx, cy, 34 * k * (0.5 + 0.5 * st), '#e8d0ff', sk);
  for (let i = 0; i < 2; i++) {
    const s = span(u, 0.42 + i * 0.08, 0.85 + i * 0.05);
    if (s > 0 && s < 1) g.ring(cx, cy, R * (0.3 + 1.4 * easeOut(s)), R * (0.3 + 1.4 * easeOut(s)), 6 * k * (1 - s) + 1, i ? '#b46bff' : '#6c2fb5', 1 - s);
  }
  burst(g, u, cx, cy, { u0: 0.42, u1: 0.9, n: 40, dist: R * 1.6, cols: VOID.slice(1), salt: 400, len: 10 * k });
  rise(g, u, { x: cx, y: cy + H * 0.3, w: W * 1.2, h: H * 1.1, u0: 0.45, u1: 1, n: 50, cols: ['#3a2a4a', '#6c5a7a', '#b46bff'], salt: 90, size: 7 * k, sway: 12 * k });
};

/** Final Pact, on every enemy: an infernal circle opens under it, chains shoot
 *  out of the circle and bind it, hellfire licks the rim. */
const pactoFinal: Build = (g, u, c, D) => {
  const { b, cx, cy, k, W, H, ground } = geo(c);
  const rx = W * 0.8, ry = W * 0.22, draw = span(u, 0, 0.28), out = 1 - span(u, 0.82, 1);
  g.dot(cx, ground, rx * 0.8, '#1a0510', 0.4 * out * draw, false);
  pentagram(g, cx, ground, rx * 0.85, ry * 0.85, -u * 0.8, 3.5 * k, '#c21f3a', out, draw);
  runeRing(g, cx, ground, rx * 1.1 * Math.min(1, draw * 2), ry * 1.1 * Math.min(1, draw * 2), 8, u * D * 0.8, 6 * k, '#b46bff', out * draw, 3 * k);
  const shoot = easeOut(span(u, 0.22, 0.4)), tightT = span(u, 0.45, 0.6), shake = Math.sin(u * D * 40) * 2 * k * bell(u, 0.45, 0.8);
  for (let j = 0; j < 4; j++) {
    const a = (j / 4) * TAU + 0.6, sx = cx + Math.cos(a) * rx, sy = ground + Math.sin(a) * ry;
    const ex = cx + (j % 2 ? 1 : -1) * W * lerp(0.4, 0.28, tightT) + shake, ey = b.y + H * (0.25 + 0.2 * j);
    if (shoot > 0.02) chain(g, sx, sy, lerp(sx, ex, shoot), lerp(sy, ey, shoot), 9, k, j % 2 ? '#b48ae0' : '#d0c0e0', out);
  }
  const bind = span(u, 0.4, 0.5) * out;
  const links = g.n(10);
  for (let l = 0; l < 2; l++) {
    const y = cy + (l - 0.5) * H * 0.35;
    for (let m = 0; m < links; m++) {
      const f = m / links, x = cx + (f - 0.5) * W * lerp(1, 0.85, tightT) + shake;
      g.put(x, y + Math.sin(f * TAU * 2) * 3 * k, (m % 2 ? 2.2 : 3.4) * k, 'anillo', '#d0c0e0', bind, 0, true, m % 2 ? 2.2 : 1.6, 0.25);
    }
  }
  const fl = span(u, 0.25, 0.35) * (1 - span(u, 0.8, 0.95));
  const tongues = g.n(8);
  for (let i = 0; i < tongues; i++) {
    const a = (i / tongues) * TAU + u;
    flame(g, cx + Math.cos(a) * rx, ground + Math.sin(a) * ry, H * 0.35 * fl * (0.7 + 0.5 * g.r(i)), 16 * k, u * D, i, ['#6c2fb5', '#c21f3a', '#ff5a2a', '#ffb36b', '#fff1c9'], 0.85 * fl);
  }
  rise(g, u, { x: cx, y: ground, w: rx * 2, h: H * 1.2, u0: 0.3, u1: 1, n: 40, cols: ['#c21f3a', '#b46bff', '#ff5a2a'], salt: 60, size: 7 * k });
};

/** Seconds a volley dart (Magic Missile, Eldritch Blast) flies before it strikes. */
const DART_FLIGHT = 0.45;
/** Seconds its impact burst lingers after the strike. */
const DART_FADE = 0.26;
/** Seconds between two darts of the same volley: quick, but each one reads on its own. */
const DART_GAP = 0.15;
/** Seconds the Eldritch Blast's bigger burst lingers after the strike. */
const BLAST_FADE = 0.32;

/** Lane of the i-th dart of a volley: how high it flies over the caster→target line
 *  (+1 the highest arc, -1 the lowest swing below it). Any first 3, 4 or 5 darts
 *  spread over both sides and keep apart. */
const DART_LANES = [0.5, -0.45, 1, -1, 0.05];

/** Route of one volley dart from the caster's staff tip to the target. */
interface DartRoute {
  /** Launch point (the staff tip) and impact point (inside the target). */
  S: Point; E: Point;
  /** Point of the route at progress s (0 launch … 1 impact). */
  at: (s: number) => Point;
  /** Whether this dart loops the loop, where the loop starts and how much of the route it takes. */
  loops: boolean; l0: number; lw: number;
}

/** Weaving route shared by every volley dart. Each dart of a volley takes its own lane
 *  above or below the line to the target and weaves along it in a damped wobble with
 *  its own amplitude, frequency and phase; now and then one loops the loop halfway.
 *  Every route ends in an arc diving onto the target, and stays inside the viewport
 *  and over the floor. Deterministic by seed (it draws on g.r(1…13)). */
function dartRoute(g: Painter, c: SpellCtx): DartRoute {
  const { b, cx, cy, k, W, H, dir, ground } = geo(c);
  const src = c.from ?? { x: b.x - dir * W * 2.5, y: cy };
  // born at the staff tip: ahead of and above the caster's centre
  const S = { x: src.x + dir * 26 * k, y: src.y - 22 * k };
  const E = { x: cx + (g.r(1) - 0.5) * W * 0.36, y: cy + (g.r(2) - 0.6) * H * 0.3 };
  const dx = E.x - S.x, dy = E.y - S.y, L = Math.hypot(dx, dy) || 1, tx = dx / L, ty = dy / L;
  // chord normal pointing up the screen
  const up = tx >= 0 ? 1 : -1, nx = ty * up, ny = -tx * up;
  const lane = Math.abs(Math.round(c.lane ?? c.seed ?? 1)) % DART_LANES.length;
  const h = DART_LANES[lane] + (g.r(3) - 0.5) * 0.16, side = h >= 0 ? 1 : -1;
  // above: an arc over the line, higher for higher lanes; below: a lower swing (kept
  // shallower, the floor is near) that hooks up at the end. Either way the last
  // control point sits over the target, so every dart dives onto it.
  let out1 = h >= 0 ? L * h * 0.55 * (0.75 + 0.5 * g.r(4)) : L * h * 0.6;
  let out2 = L * (0.16 + 0.5 * Math.max(0, h));
  const f1 = 0.22 + 0.12 * g.r(5), f2 = 0.02 + 0.12 * g.r(6);
  // about one dart in three loops the loop halfway: the path stalls while it circles
  const loops = g.r(11) < 0.3, l0 = 0.3 + 0.14 * g.r(12), lw = 0.2;
  let rho = (side > 0 ? 20 + 8 * g.r(13) : 16 + 6 * g.r(13)) * k;
  // serpentine wobble across the path (smaller below the line), fading out before the final arc
  let amp = (18 + 12 * g.r(7)) * k * (side > 0 ? 1 : 0.75);
  const freq = 2.6 + 1.0 * g.r(8), ph = g.r(9) * TAU;
  // the floor under the route: from the caster's feet down (or up) to the target's ground
  const floorAt = (s: number) => lerp(c.from ? src.y + 40 * k : ground, ground, smooth(clamp01(s))) - 8 * k;
  // fit inside the viewport: shrink the bulge (and the wobble and loop) until it clears the edges
  const view = c.view, m = 10;
  if (view) {
    /** Largest share (0..1) of a bulge (o1, o2) that keeps the route `top` px off the top
     *  and sides and `low` px over the floor. */
    const fit = (o1: number, o2: number, g1: number, g2: number, top: number, low: number) => {
      let f = 1;
      for (let j = 1; j < 16; j++) {
        const sj = j / 16, mm = 1 - sj, b1 = 3 * mm * mm * sj, b2 = 3 * mm * sj * sj;
        const bx = mm * mm * mm * S.x + b1 * (S.x + tx * L * g1) + b2 * (E.x - tx * L * g2) + sj * sj * sj * E.x;
        const by = mm * mm * mm * S.y + b1 * (S.y + ty * L * g1) + b2 * (E.y - ty * L * g2) + sj * sj * sj * E.y;
        const dev = b1 * o1 + b2 * o2;
        const lims: [number, number, number, number][] = [
          [bx, nx * dev, m + top, view.w - m - top], [by, ny * dev, m + top, Math.min(view.h - m, floorAt(sj)) - low]];
        for (const [p0, nd, l, hh] of lims) {
          if (p0 < l || p0 > hh) continue; // the straight line itself is already there: nothing to shrink
          if (nd > 0.01) f = Math.min(f, (hh - p0) / nd);
          else if (nd < -0.01) f = Math.min(f, (l - p0) / nd);
        }
      }
      return Math.max(0, f);
    };
    // one shared squeeze per side, taken from its outermost lane, so the lanes of a volley
    // shrink together and stay apart; then this dart's own route, for its random shape
    const top = 18 * k, low = 8 * k;
    const shared = side > 0 ? fit(L * 1.08 * 0.55 * 1.25, L * (0.16 + 0.54), 0.28, 0.08, top, low) : fit(-L * 1.08 * 0.6, L * 0.16, 0.28, 0.08, top, low);
    const f = Math.min(shared, fit(out1, out2, f1, f2, top * 0.5, low));
    out1 *= f; out2 *= f;
    // a bulge squeezed by the edges also calms the wobble and tightens the loop
    const calm = 0.5 + 0.5 * f;
    amp *= calm; rho *= calm;
  }
  const C1 = { x: S.x + tx * L * f1 + nx * out1, y: S.y + ty * L * f1 + ny * out1 };
  const C2 = { x: E.x - tx * L * f2 + nx * out2, y: E.y - ty * L * f2 + ny * out2 };
  const bez = (s: number) => {
    const mm = 1 - s, a = mm * mm * mm, b1 = 3 * mm * mm * s, b2 = 3 * mm * s * s, d = s * s * s;
    return { x: a * S.x + b1 * C1.x + b2 * C2.x + d * E.x, y: a * S.y + b1 * C1.y + b2 * C2.y + d * E.y };
  };
  const base = (s: number) => (!loops || s <= l0 ? s : s < l0 + lw ? l0 + (s - l0) * 0.15 : s - lw * 0.85) / (loops ? 1 - lw * 0.85 : 1);
  // a loop near the top edge gets tighter, never cut off
  if (loops && view) rho = Math.max(4 * k, Math.min(rho, (bez(base(l0)).y - m - 6 * k) / 2.2));
  const at = (s: number): Point => {
    const sb = base(s), p = bez(sb), q = bez(Math.min(1, sb + 0.01)), p0 = bez(Math.max(0, sb - 0.01));
    const vx = q.x - p0.x, vy = q.y - p0.y, vl = Math.hypot(vx, vy) || 1, ux = vx / vl, uy = vy / vl;
    const inLoop = loops ? span(s, l0, l0 + lw) : 0;
    const env = smooth(clamp01(sb / 0.08)) * (1 - smooth(clamp01((sb - 0.2) / 0.45))) * (1 - bell(s, l0 - 0.04, l0 + lw + 0.04));
    const w = amp * Math.sin(TAU * freq * sb + ph) * env;
    let x = p.x - uy * w, y = p.y + ux * w;
    if (inLoop > 0 && inLoop < 1) {
      // a full circle tangent to the path, bulging upwards (into the open air, off the floor)
      const th = TAU * smooth(inLoop), o = (uy * nx - ux * ny) > 0 ? 1 : -1;
      const lnx = uy * o, lny = -ux * o;
      x += rho * (Math.sin(th) * ux + (1 - Math.cos(th)) * lnx);
      y += rho * (Math.sin(th) * uy + (1 - Math.cos(th)) * lny);
    }
    // never below the floor (the hand and the ground stay clear): eases onto it, never past it
    const floor = floorAt(sb);
    if (y > floor) y = floor + 8 * k * (1 - Math.exp(-(y - floor) / (8 * k)));
    // last resort: never off screen
    if (view) { x = Math.min(view.w - m, Math.max(m, x)); y = Math.min(view.h - m, Math.max(m, y)); }
    return { x, y };
  };
  return { S, E, at, loops, l0, lw };
}

/** Where a dart's trail runs at `t` seconds (route progress of its head and tail) and
 *  whether it has struck: the head eases in, the tail catches up on the strike. */
function dartTrail(t: number, tailLen = 0.28) {
  const uf = Math.min(1, t / DART_FLIGHT), head = uf * (0.75 + 0.25 * uf), hit = t >= DART_FLIGHT;
  const tail = hit ? lerp(Math.max(0, 1 - tailLen), 1, easeOut(span(t, DART_FLIGHT, DART_FLIGHT + 0.12))) : Math.max(0, head - tailLen);
  return { head, tail, hit };
}
/** Seconds after the launch when the head passes route progress `s` (inverse of dartTrail). */
const dartTimeAt = (s: number) => DART_FLIGHT * (Math.sqrt(0.5625 + s) - 0.75) / 0.5;
/** Points of the trail from its tail to its head; a trail running through the loop gets
 *  more samples, so it stays round. */
function trailPoints(g: Painter, r: DartRoute, tail: number, head: number, samples: number): Point[] {
  const n = Math.max(4, g.n(r.loops && tail < r.l0 + r.lw && head > r.l0 ? Math.round(samples * 5 / 3) : samples));
  const pts: Point[] = [];
  for (let j = 0; j <= n; j++) pts.push(r.at(lerp(tail, head, j / n)));
  return pts;
}
/** Unit heading of the route at progress s. */
function headingAt(r: DartRoute, s: number) {
  const h = r.at(s), a2 = r.at(Math.max(0, s - 0.02));
  const hx = h.x - a2.x, hy = h.y - a2.y, hl = Math.hypot(hx, hy) || 1;
  return { ux: hx / hl, uy: hy / hl };
}

/** Magic Missile: one glowing force dart per hit, flying its own weaving lane of the
 *  volley (dartRoute), shedding sparkles, diving onto the target in an arc and
 *  bursting in a violet flash. Few sprites: a whole volley fits a phone's budget. */
const proyectilMagico: Build = (g, u, c, D) => {
  const { k } = geo(c);
  const t = u * D;
  const route = dartRoute(g, c), { S, E, at } = route;
  const { head, tail, hit } = dartTrail(t);
  // launch flash at the staff tip
  const lf = bell(t, 0, 0.12);
  if (lf > 0) {
    g.dot(S.x, S.y, 9 * k * lf, '#7a5cff', 0.35 * lf);
    g.ring(S.x, S.y, (4 + 14 * span(t, 0, 0.12)) * k, (4 + 14 * span(t, 0, 0.12)) * k, 1.4 * k, '#9fd8ff', 0.8 * lf);
  }
  // glowing trail: violet halo, blue body, white core, tapering to the tail
  if (head - tail > 0.004) {
    const pts = trailPoints(g, route, tail, head, 12), n = pts.length - 1;
    const fade = hit ? 1 - span(t, DART_FLIGHT, DART_FLIGHT + 0.12) : 1;
    const w = (i: number) => (i / n) ** 1.3;
    g.strip(pts, (i) => 9 * k * w(i) + 1, '#6c3cff', 0.2 * fade);
    g.strip(pts, (i) => 4 * k * w(i) + 0.6, '#5fb0ff', 0.55 * fade);
    g.strip(pts, (i) => 1.6 * k * w(i) + 0.4, '#f0f8ff', 0.9 * fade, false);
  }
  // the dart itself: a bright arrowhead with a twinkle
  if (!hit) {
    const h = at(head), { ux, uy } = headingAt(route, head);
    g.dot(h.x, h.y, 9 * k, '#7a5cff', 0.3);
    g.fang(h.x - ux * 13 * k, h.y - uy * 13 * k, h.x + ux * 6 * k, h.y + uy * 6 * k, 6 * k, '#9fd8ff', 0.9);
    g.dot(h.x, h.y, 2.4 * k, '#ffffff', 1, false);
    g.star(h.x, h.y, 9 * k * (0.75 + 0.35 * Math.sin(t * 60 + g.r(10) * 9)), '#d9c8ff', 0.7, t * 14);
    g.mark('dardo', h.x, h.y);
  }
  // sparkles shed along the way, drifting and fading
  each(g, 7, (i) => {
    const s0 = 0.08 + 0.8 * ((i + g.r(20 + i) * 0.8) / 7), born = dartTimeAt(s0);
    const q = span(t, born, born + 0.2);
    if (q <= 0 || q >= 1) return;
    const p = at(s0), dr = (g.r(30 + i) - 0.5) * 20 * k;
    mote(g, i % 2 ? 'star' : 'dot', p.x + dr * q, p.y + dr * 0.5 * q + 14 * k * q * q, 6 * k * (1 - q) + 1, t * 8 + i,
      ['#b46bff', '#6fc8ff', '#e8d0ff', '#ffffff'][i % 4], 1 - q);
  });
  // impact: violet flash, a four-point spark, a ring and a splash of force sparks
  if (hit) {
    const T = DART_FLIGHT, fl = bell(t, T - 0.01, T + 0.14);
    if (t <= T + 0.05) g.mark('impacto', E.x, E.y);
    const a1 = at(0.97), inAng = Math.atan2(E.y - a1.y, E.x - a1.x);
    g.dot(E.x, E.y, 20 * k * fl + 1, '#6c3cff', 0.22 * fl);
    const st = easeOutBack(span(t, T, T + 0.1)) * (1 - span(t, T + 0.08, T + 0.22));
    g.star(E.x, E.y, 22 * k * st, '#8f6bff', 0.4 * st, inAng + Math.PI / 4);
    g.star(E.x, E.y, 14 * k * st, '#e6f4ff', st, inAng + Math.PI / 4);
    g.dot(E.x, E.y, 4 * k * fl + 0.5, '#ffffff', fl, false);
    const rs = span(t, T, T + 0.24);
    if (rs > 0 && rs < 1) g.ring(E.x, E.y, (6 + 34 * easeOut(rs)) * k, (6 + 26 * easeOut(rs)) * k, 3 * k * (1 - rs) + 0.6, '#9d7bff', 1 - rs);
    each(g, 10, (i) => {
      const q = span(t, T, T + 0.16 + 0.08 * g.r(40 + i));
      if (q <= 0 || q >= 1) return;
      const a = inAng + Math.PI + (g.r(50 + i) - 0.5) * 3.4, d = easeOut(q) * (20 + 32 * g.r(60 + i)) * k;
      g.spark(E.x + Math.cos(a) * d, E.y + Math.sin(a) * d, 9 * k * (1 - q) + 2, a, i % 3 ? '#b8ecff' : '#c9a8ff', 1 - q);
    });
  }
};

/** Eldritch Blast: a thick bolt of dark energy flying Magic Missile's weaving routes
 *  (same lanes, same volley rhythm). A black orb in a violet corona crackling with white
 *  arcs drags a heavy trail (violet haze, a black core, a violet vein and a flickering
 *  white filament) that sheds dark smoke; on the strike the void implodes and bursts
 *  in a violet shockwave, a white flash, shards of darkness and white sparks. */
const explosionSobrenatural: Build = (g, u, c, D) => {
  const { k } = geo(c);
  const t = u * D, T = DART_FLIGHT;
  const route = dartRoute(g, c), { S, E, at } = route;
  const { head, tail, hit } = dartTrail(t, 0.32);
  // decorations near the edges stay on screen, like the route itself
  const view = c.view;
  const clampX = (x: number) => (view ? Math.min(view.w - 6, Math.max(6, x)) : x);
  const clampY = (y: number) => (view ? Math.min(view.h - 6, Math.max(6, y)) : y);
  // launch: the staff tip flares dark with a violet ring
  const lf = bell(t, 0, 0.14);
  if (lf > 0) {
    const rr = (6 + 20 * span(t, 0, 0.14)) * k;
    g.dot(S.x, S.y, 16 * k * lf, '#6c2fb5', 0.45 * lf);
    g.dot(S.x, S.y, 7 * k * lf, '#12041f', 0.85 * lf, false);
    g.ring(S.x, S.y, rr, rr, 2.6 * k, '#b46bff', 0.85 * lf);
  }
  // heavy trail: violet haze, black core, violet vein, white filament near the head
  if (head - tail > 0.004) {
    const pts = trailPoints(g, route, tail, head, 12), n = pts.length - 1;
    const fade = hit ? 1 - span(t, T, T + 0.14) : 1;
    const w = (i: number) => (i / n) ** 1.1;
    g.strip(pts, (i) => 26 * k * w(i) + 2, '#5a1f9e', 0.42 * fade);
    g.strip(pts, (i) => 14 * k * w(i) + 1.4, '#14051f', 0.95 * fade, false);
    // the vein runs inside the black core without a glow of its own, so the core stays dark
    g.strip(pts, (i) => 3 * k * w(i) + 0.5, '#9a4dff', 0.9 * fade, false);
    const flick = 0.55 + 0.45 * Math.sin(t * 90 + g.r(14) * 6);
    const half = pts.slice(Math.floor(n * 0.45));
    g.strip(half, (i) => 1.5 * k * (i / Math.max(1, half.length - 1)) + 0.4, '#ffffff', 0.75 * flick * fade, false);
  }
  // dark smoke torn off the trail, swelling and fading
  each(g, 8, (i) => {
    const s0 = 0.06 + 0.86 * ((i + g.r(20 + i) * 0.8) / 8), born = dartTimeAt(s0);
    const q = span(t, born, born + 0.3);
    if (q <= 0 || q >= 1) return;
    const p = at(s0), dr = (g.r(30 + i) - 0.5) * 22 * k;
    const x = clampX(p.x + dr * q), y = clampY(p.y + dr * 0.4 * q - 10 * k * q);
    g.dot(x, y, (5 + 7 * q) * k, '#1a0830', 0.35 * (1 - q));
    if (i % 2) g.dot(x, y, 2.2 * k * (1 - q) + 0.6, i % 4 === 1 ? '#ffffff' : '#c79bff', 1 - q);
  });
  // the orb: corona, rim, black heart and a white glint, with crackling white arcs
  if (!hit) {
    const h = at(head), { ux, uy } = headingAt(route, head);
    const pulse = 1 + 0.12 * Math.sin(t * 50 + g.r(10) * 9);
    g.dot(h.x, h.y, 22 * k * pulse, '#6c2fb5', 0.45);
    g.dot(h.x, h.y, 13 * k, '#b46bff', 0.9);
    g.dot(h.x, h.y, 9.5 * k, '#0d0217', 1, false);
    g.dot(h.x + ux * 3 * k, h.y + uy * 3 * k, 2.8 * k, '#ffffff', 0.95, false);
    const fr = Math.floor(t * 24);
    for (let j = 0; j < 2; j++) {
      const a = hash01(fr * 7 + j, 101 + g.r(15) * 1000) * TAU, a0 = { x: h.x + Math.cos(a) * 9 * k, y: h.y + Math.sin(a) * 9 * k };
      const len = (12 + 10 * hash01(fr * 7 + j, 202)) * k, b = { x: clampX(a0.x + Math.cos(a) * len - ux * 8 * k), y: clampY(a0.y + Math.sin(a) * len - uy * 8 * k) };
      g.strip(zigzag(a0, b, 3, 3 * k, fr, j + 5), () => 1.5 * k, '#f4ecff', 0.9);
    }
    g.mark('dardo', h.x, h.y);
  }
  // the strike: the void implodes, then bursts
  if (hit) {
    if (t <= T + 0.05) g.mark('impacto', E.x, E.y);
    const a1 = at(0.97), inAng = Math.atan2(E.y - a1.y, E.x - a1.x);
    const fl = bell(t, T - 0.01, T + 0.18);
    g.dot(E.x, E.y, 36 * k * fl + 1, '#6c2fb5', 0.38 * fl);
    const core = easeOutBack(span(t, T, T + 0.08)) * (1 - easeIn(span(t, T + 0.1, T + 0.3)));
    if (core > 0.01) {
      g.dot(E.x, E.y, 15 * k * core, '#0d0217', 0.95, false);
      g.ring(E.x, E.y, 15 * k * core + 1, 15 * k * core + 1, 3 * k, '#b46bff', core);
    }
    const st = easeOutBack(span(t, T, T + 0.08)) * (1 - span(t, T + 0.06, T + 0.2));
    g.star(E.x, E.y, 30 * k * st, '#8a3cff', 0.5 * st, inAng + Math.PI / 4);
    g.star(E.x, E.y, 18 * k * st, '#ffffff', st, inAng);
    g.dot(E.x, E.y, 6 * k * fl + 0.5, '#ffffff', fl, false);
    for (let i = 0; i < 2; i++) {
      const rs = span(t, T + 0.02 + 0.06 * i, T + 0.3 + 0.02 * i);
      if (rs > 0 && rs < 1) {
        const rx = (10 + (52 - 16 * i) * easeOut(rs)) * k, ry = rx * 0.78;
        g.ring(E.x, E.y, rx, ry, (5 - 2 * i) * k * (1 - rs) + 0.8, i ? '#e8d0ff' : '#8a3cff', 1 - rs);
      }
    }
    // shards of darkness flung out, with a violet edge
    each(g, 7, (i) => {
      const q = span(t, T, T + 0.2 + 0.06 * g.r(70 + i));
      if (q <= 0 || q >= 1) return;
      const a = (i / 7) * TAU + g.r(80 + i) * 0.7, r0 = 8 * k, len = easeOut(q) * (22 + 18 * g.r(90 + i)) * k * (1 - 0.4 * q);
      const x0 = E.x + Math.cos(a) * (r0 + 14 * k * q), y0 = E.y + Math.sin(a) * (r0 + 14 * k * q);
      const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
      g.fang(x0, y0, x1, y1, 9 * k, '#a35cff', 0.5 * (1 - q));
      g.fang(x0, y0, x1, y1, 6 * k, '#14051f', 0.9 * (1 - q), false);
    });
    // white and violet sparks
    each(g, 12, (i) => {
      const q = span(t, T, T + 0.18 + 0.1 * g.r(40 + i));
      if (q <= 0 || q >= 1) return;
      const a = inAng + Math.PI + (g.r(50 + i) - 0.5) * 4, d = easeOut(q) * (24 + 40 * g.r(60 + i)) * k;
      g.spark(E.x + Math.cos(a) * d, E.y + Math.sin(a) * d, 11 * k * (1 - q) + 2, a, i % 3 ? '#ffffff' : '#c79bff', 1 - q);
    });
  }
};

// ── Neutral ─────────────────────────────────────────────────────────────────

/** Seduce: hearts spiral in round the enemy, a d20 spins over it, a big heart
 *  pops pierced by an arrow and wish stars burst with hearts. */
const seducir: Build = (g, u, c, D) => {
  const { b, cx, cy, R, k, W, H } = geo(c);
  gather(g, u, cx, cy, { r0: R * 1.8, u0: 0, u1: 0.38, n: 46, cols: LOVE, salt: 1, size: 12 * k, kind: 'heart', turns: 1 });
  const dv = span(u, 0, 0.1) * (1 - span(u, 0.5, 0.65));
  d20(g, cx, b.y - H * 0.3, 26 * k, u * D * 6, 2.6 * k, '#ffd166', dv);
  const pop = easeOutBack(span(u, 0.34, 0.46)), hv = pop * (1 - span(u, 0.75, 0.9));
  g.dot(cx, cy, 44 * k * pop, '#ff5a8a', 0.3 * hv);
  g.heart(cx, cy, 26 * k * pop * (1 + 0.1 * Math.sin(u * D * 20)), '#ff5a8a', hv);
  g.heart(cx, cy, 17 * k * pop, '#ffd1e0', hv);
  const ar = easeOut(span(u, 0.4, 0.5));
  if (ar > 0) {
    const x0 = cx - W * 0.9, y0 = cy + H * 0.25, x1 = lerp(x0, cx + W * 0.4, ar), y1 = lerp(y0, cy - H * 0.14, ar);
    g.seg(x0, y0, x1, y1, 3 * k, '#ffd166', hv);
    g.fang(x1 - (x1 - x0) * 0.08, y1 - (y1 - y0) * 0.08, x1 + (x1 - x0) * 0.06, y1 + (y1 - y0) * 0.06, 10 * k, '#fff3b8', hv);
  }
  burst(g, u, cx, cy, { u0: 0.45, u1: 1, n: 44, dist: R * 1.8, cols: LOVE, salt: 60, kind: 'heart', len: 12 * k, grav: -40 * k });
  burst(g, u, cx, cy, { u0: 0.45, u1: 0.95, n: 36, dist: R * 1.5, cols: ['#ffd166', '#fff3b8', '#ff9dbd'], salt: 160, kind: 'star', len: 10 * k });
};

/** Wish: a shooting star falls onto the hero and bursts into gold, a golden d20
 *  spins overhead and a spiral of stars climbs. */
const deseo: Build = (g, u, c, D) => {
  const { b, cx, cy, R, k, W, H, ground } = geo(c);
  const fall = easeIn(span(u, 0, 0.33)), sx = cx + R * 1.8, sy = Math.max(10, b.y - H * 1.1);
  const hx = lerp(sx, cx, fall), hy = lerp(sy, cy - H * 0.2, fall), sv = span(u, 0, 0.05) * (1 - span(u, 0.33, 0.36));
  if (sv > 0) {
    g.fang(hx, hy, lerp(hx, sx, 0.4), lerp(hy, sy, 0.4), 12 * k, '#ffd166', 0.7 * sv);
    g.star(hx, hy, 18 * k, '#ffffff', sv, u * 10);
    each(g, 20, (i) => { const f = g.r(i) * 0.5; g.dot(lerp(hx, sx, f) + (g.r(i + 5) - 0.5) * 14 * k, lerp(hy, sy, f) + (g.r(i + 9) - 0.5) * 14 * k, 2 * k, STAR[i % 4], sv * (1 - f * 2)); });
  }
  const fl = bell(u, 0.33, 0.55);
  g.dot(cx, cy - H * 0.2, R * 0.9 * fl + 1, '#fff3b8', 0.25 * fl);
  const dv = span(u, 0.35, 0.45) * (1 - span(u, 0.82, 0.95));
  d20(g, cx, b.y - H * 0.3, 30 * k * (1 + 0.1 * Math.sin(u * D * 8)), u * D * 3, 3 * k, '#ffd166', dv);
  d20(g, cx, b.y - H * 0.3, 30 * k * (1 + 0.1 * Math.sin(u * D * 8)), u * D * 3, 1.2 * k, '#ffffff', dv);
  burst(g, u, cx, cy - H * 0.2, { u0: 0.33, u1: 0.85, n: 60, dist: R * 2, cols: GOLD, salt: 40, kind: 'star', len: 12 * k });
  each(g, 56, (i) => {
    const q = span(u, 0.4 + 0.35 * g.r(i), 1);
    if (q <= 0 || q >= 1) return;
    const a = g.r(i + 10) * TAU + q * 8, rad = W * (0.7 - 0.3 * q);
    g.star(cx + Math.cos(a) * rad, ground - q * H * 1.5, 6 * k, GOLD[i % 4], Math.min(1, q * 4) * (1 - q), q * 4);
  });
  const s = span(u, 0.35, 0.8);
  if (s > 0 && s < 1) g.ring(cx, ground, W * (0.3 + s), W * 0.1 * (0.3 + s) + 2, 4 * k, '#ffd166', 1 - s);
};

// ── Paladin ─────────────────────────────────────────────────────────────────

const DEVOTION = ['#fffaf0', '#fff3c4', '#ffe7a0', '#ffd35a'];
const GLORY = ['#ffd35a', '#ffb830', '#fff3c4', '#ffffff'];
const ANCIENT = ['#3f7d2a', '#7dba4e', '#c9f29b', '#ffd35a'];
const VENGEANCE = ['#5a0a0a', '#c21f1f', '#ff5a2a', '#ffd35a'];
const VENGEFUL_FLAME = ['#ffd35a', '#ff5a2a', '#c21f1f', '#7a0a0a', '#3a0505'];

/** Oath of Devotion: a white aura wraps the paladin, a sunburst opens behind him
 *  and ribbons of light coil up the raised hammer until it blazes. */
const juramentoDevocion: Build = (g, u, c, D) => {
  const { b, cx, cy, R, k, W, H, ground, face } = geo(c);
  const vis = span(u, 0, 0.2) * (1 - span(u, 0.82, 1));
  const sb = easeOut(span(u, 0.05, 0.4)) * (1 - span(u, 0.8, 1)), sy = cy - 0.15 * H;
  each(g, 16, (i) => {
    const a = u * 0.8 + (i / 16) * TAU, L = R * (1.1 + 0.45 * (i % 2)) * sb;
    g.beam(cx, sy, cx + Math.cos(a) * L, sy + Math.sin(a) * L, 16 * k, DEVOTION[3], 0.22 * sb);
  });
  g.dot(cx, cy, R * 0.95, '#fffaf0', 0.14 * vis);
  for (let i = 0; i < 2; i++) {
    const s = (u * 1.4 + i / 2) % 1;
    g.ring(cx, cy, W * 0.55 * (0.9 + 0.3 * s), H * 0.55 * (0.9 + 0.3 * s), 2 * k, '#fff3c4', 0.35 * vis * (1 - s));
  }
  const hx = cx + face * W * 0.3, hy = b.y - 0.12 * H, hs = 44 * k + 10, ang = Math.PI / 2 + face * 0.2;
  gather(g, u, hx, hy, { r0: R * 1.8, u0: 0, u1: 0.34, n: 30, cols: DEVOTION, salt: 5, size: 5 * k });
  // ribbons of light coiling up the handle to the head
  const grow = easeOut(span(u, 0.08, 0.38)), rib = vis * (1 - span(u, 0.7, 0.85));
  const gx = hx + Math.cos(ang) * hs * 1.25, gy = hy + Math.sin(ang) * hs * 1.25, px = -Math.sin(ang), py = Math.cos(ang);
  if (grow > 0.02) for (let r = 0; r < 3; r++) {
    const pts: Point[] = [];
    for (let j = 0; j <= 10; j++) {
      const t = (j / 10) * grow, w = Math.sin(t * 9 + r * 2.1 - u * D * 6) * hs * 0.6 * (1 - 0.3 * t);
      pts.push({ x: lerp(gx, hx, t) + px * w, y: lerp(gy, hy, t) + py * w });
    }
    g.strip(pts, () => 1.8 * k, '#fff6d8', 0.85 * rib, false);
    const tip = pts[pts.length - 1];
    g.dot(tip.x, tip.y, 2.4 * k, '#ffffff', rib);
  }
  const fl = bell(u, 0.33, 0.6);
  g.dot(hx, hy, hs * 1.1 * fl + 1, '#fff3c4', 0.2 * fl);
  g.star(hx, hy, 44 * k * fl + 0.1, '#ffffff', fl);
  const s = span(u, 0.35, 0.8);
  if (s > 0 && s < 1) g.ring(hx, hy, hs * (0.5 + 2 * easeOut(s)), hs * (0.5 + 2 * easeOut(s)), 4 * k * (1 - s) + 1, '#ffe7a0', 1 - s);
  burst(g, u, hx, hy, { u0: 0.35, u1: 0.9, n: 44, dist: R * 2.2, cols: DEVOTION, salt: 40, kind: 'star', len: 9 * k });
  rise(g, u, { x: cx, y: ground, w: W * 1.4, h: H * 1.3, u0: 0.2, u1: 1, n: 60, cols: DEVOTION, salt: 90, size: 5 * k });
  lightHammer(g, hx, hy, ang, hs * (1 + 0.1 * bell(u, 0.35, 0.55)), vis, { halo: '#fff3c4', rim: '#ffe7a0', core: '#ffffff' });
};

/** Oath of Glory: a sunrise fans out behind the paladin, a laurel wreath of light
 *  crowns him leaf by leaf and flares, and golden stars shower down. */
const juramentoGloria: Build = (g, u, c) => {
  const { b, cx, R, k, W, H, ground } = geo(c);
  const vis = 1 - span(u, 0.82, 1), fan = easeOut(span(u, 0, 0.35)) * vis;
  const rays = g.n(11);
  for (let i = 0; i < rays; i++) {
    const a = -Math.PI / 2 + (i / Math.max(1, rays - 1) - 0.5) * 2.4, L = H * (1.4 + 0.3 * (i % 2)) * fan;
    g.beam(cx, ground, cx + Math.cos(a) * L, ground + Math.sin(a) * L, 22 * k, i % 2 ? GLORY[1] : GLORY[0], 0.22 * fan);
  }
  g.dot(cx, ground, W * 0.4 * fan + 1, '#ffd35a', 0.12 * fan);
  const wy = b.y + 0.02 * H, wr = W * 0.48, wry = W * 0.17;
  g.ring(cx, wy, wr, wry, 2 * k, '#ffd35a', 0.6 * span(u, 0.15, 0.3) * vis);
  const m = g.n(9);
  for (const side of [-1, 1]) for (let j = 0; j < m; j++) {
    const t = j / Math.max(1, m - 1), th = Math.PI / 2 - side * (0.3 + 2.3 * t);
    const x = cx + Math.cos(th) * wr, y = wy + Math.sin(th) * wry;
    const t0 = 0.15 + 0.025 * j, pop = Math.max(0, easeOutBack(span(u, t0, t0 + 0.08)));
    if (pop <= 0) continue;
    const tang = th - side * Math.PI / 2;
    g.leaf(x + Math.cos(tang + side * 0.5) * 4 * k, y + Math.sin(tang + side * 0.5) * 4 * k, 11 * k * pop, tang + side * 0.5, j % 2 ? '#e0a82e' : '#ffc53a', vis);
    g.leaf(x - Math.cos(tang - side * 0.4) * 2 * k, y - Math.sin(tang - side * 0.4) * 2 * k, 8 * k * pop, tang - side * 0.4, '#ffe08a', 0.9 * vis);
  }
  const fl = bell(u, 0.35, 0.6);
  g.star(cx, wy - wry, 44 * k * fl + 0.1, '#ffffff', fl);
  g.dot(cx, wy - wry, wr * 0.6 * fl + 1, '#fff3c4', 0.2 * fl);
  for (let i = 0; i < 2; i++) {
    const s = span(u, 0.35 + i * 0.1, 0.8 + i * 0.1);
    if (s > 0 && s < 1) g.ring(cx, wy, wr * (1 + 1.6 * s), wry * (1 + 1.6 * s), 3 * k, i ? '#ffffff' : '#ffd35a', 1 - s);
  }
  burst(g, u, cx, wy, { u0: 0.35, u1: 1, n: 40, dist: R * 2.2, cols: GLORY, salt: 30, kind: 'star', len: 9 * k, grav: 90 * k });
  rise(g, u, { x: cx, y: ground, w: W * 1.6, h: H * 1.2, u0: 0.1, u1: 1, n: 40, cols: GLORY, salt: 70, size: 8 * k, kind: 'spark' });
};

/** Oath of the Ancients: golden-green vines climb and coil round the paladin,
 *  bloom into gold flowers under slanting forest light; spores drift up. */
const juramentoAntiguos: Build = (g, u, c) => {
  const { b, cx, cy, R, k, W, H, ground } = geo(c);
  const vis = 1 - span(u, 0.8, 1);
  g.dot(cx, cy, R * 1.05, '#7dba4e', 0.12 * bell(u, 0, 1));
  g.dot(cx, cy, R * 0.6, '#ffd35a', 0.1 * bell(u, 0.2, 1));
  const lt = bell(u, 0.05, 0.95);
  for (let i = 0; i < 3; i++) g.beam(cx - W * 0.9 + i * W * 0.55, b.y - H * 0.8, cx - W * 0.35 + i * W * 0.45, ground, 20 * k, '#ffd35a', 0.16 * lt);
  const s0 = span(u, 0, 0.5);
  if (s0 < 1) g.ring(cx, ground, W * (0.3 + 0.6 * s0), W * 0.1 * (0.3 + 0.6 * s0) + 2, 4 * k, '#7dba4e', 1 - s0);
  const nv = g.n(4);
  for (let i = 0; i < nv; i++) {
    const growth = easeOut(span(u, i * 0.04, 0.45));
    if (growth <= 0.02) continue;
    const pts = vinePath(b, i, nv, growth, 1.08), m = pts.length - 1;
    for (let j = 1; j <= m; j++) {
      const s = growth * (j / m), front = vineFront(i, s), th = lerp(7, 2, s) * k;
      const p0 = pts[j - 1], p1 = pts[j];
      g.seg(p0.x, p0.y, p1.x, p1.y, th, front ? '#4e7a2a' : '#2f5a20', (front ? 1 : 0.7) * vis, 0, false);
      if (front && j % 2) g.seg(p0.x, p0.y, p1.x, p1.y, th * 0.3, '#e8c24a', 0.55 * vis, 0, false);
    }
    for (const s of [0.25, 0.45, 0.65, 0.85]) {
      if (growth < s + 0.05) continue;
      const q = pts[Math.round((s / growth) * m)], side = (Math.round(s * 20) + i) % 2 ? 1 : -1;
      g.leaf(q.x + side * 6 * k, q.y - 3 * k, 8 * k, side * 0.7, (Math.round(s * 20) + i) % 3 ? '#7dba4e' : '#ffd35a', vis, (Math.round(s * 20) + i) % 3 === 0);
      const bloom = span(u, 0.4 + s * 0.3, 0.5 + s * 0.3);
      if (bloom > 0) g.star(q.x - side * 5 * k, q.y, 6 * k * bloom, '#fff3c4', 0.8 * vis * bloom, u * 3);
    }
    const tip = pts[m];
    g.dot(tip.x, tip.y, 3 * k, '#ffd35a', 0.7 * vis);
  }
  burst(g, u, cx, cy, { u0: 0.4, u1: 1, n: 40, dist: R * 1.6, cols: ANCIENT, salt: 50, kind: 'leaf', len: 9 * k, grav: 50 * k });
  rise(g, u, { x: cx, y: ground, w: W * 1.6, h: H * 1.3, u0: 0.1, u1: 1, n: 44, cols: ['#c9f29b', '#ffd35a', '#7dba4e'], salt: 80, size: 4.5 * k });
};

/** Oath of Vengeance: a hood of shadow falls over the paladin, his eyes kindle,
 *  crimson flames rise round him and his hammer levels at a marked foe. */
const juramentoVenganza: Build = (g, u, c, D) => {
  const { b, cx, cy, R, k, W, H, ground, face } = geo(c);
  const vis = 1 - span(u, 0.82, 1), hood = span(u, 0, 0.25) * vis;
  each(g, 6, (i) => g.dot(cx + (g.r(i) - 0.5) * W * 0.35, b.y + 0.14 * H + (g.r(i + 6) - 0.5) * H * 0.12, W * 0.16, '#140606', 0.45 * hood, false));
  gather(g, u, cx, b.y + 0.16 * H, { r0: R * 1.5, u0: 0, u1: 0.3, n: 30, cols: ['#3a0505', '#7a0a0a', '#c21f1f'], salt: 7, size: 6 * k });
  const eo = span(u, 0.18, 0.3) * vis, flick = 0.85 + 0.15 * Math.sin(u * D * 30), ey = b.y + 0.16 * H, ex = cx + face * W * 0.06;
  for (const s of [-1, 1]) {
    const x = ex + s * W * 0.07;
    g.dot(x, ey, 7 * k * eo + 0.5, '#ff5a2a', 0.5 * eo);
    g.seg(x - s * 5 * k, ey + 1.5 * k, x + s * 5 * k, ey - 1.5 * k, 3 * k * eo + 0.5, '#ffd35a', eo * flick, 1);
    flame(g, x, ey - 3 * k, 16 * k * eo, 6 * k, u * D, s + 3, VENGEFUL_FLAME, 0.7 * eo);
  }
  const au = span(u, 0.2, 0.35) * vis, tongues = g.n(8);
  for (let i = 0; i < tongues; i++) {
    const f = (i + 0.5) / tongues, mid = 1 - Math.abs(f - 0.5) * 1.6;
    flame(g, b.x + (f + (g.r(i + 30) - 0.5) * 0.1) * W, ground - g.r(i + 40) * 8 * k, H * (0.25 + 0.45 * mid + 0.25 * g.r(i + 20)) * au, (14 + 8 * g.r(i + 50)) * k, u * D, i, VENGEFUL_FLAME, 0.55 * au);
  }
  const point = Math.max(0, easeOutBack(span(u, 0.25, 0.4)));
  const hx = lerp(cx + face * W * 0.3, cx + face * W * 0.62, point), hy = lerp(b.y, cy - 0.12 * H, point);
  const ang = lerp(Math.PI / 2, face > 0 ? Math.PI : 0, point);
  lightHammer(g, hx, hy, ang, 34 * k + 10, span(u, 0.1, 0.25) * vis, { halo: '#c21f1f', rim: '#ff7a4a', core: '#ffe0c0' });
  let mx = cx + face * W * 2.6;
  if (c.view) mx = Math.max(50, Math.min(c.view.w - 50, mx));
  const my = cy - 0.1 * H, ray = bell(u, 0.33, 0.62);
  g.beam(hx, hy, mx, my, 12 * k, '#c21f1f', 0.5 * ray);
  g.beam(hx, hy, mx, my, 3 * k, '#ffd35a', 0.8 * ray);
  const pop = Math.max(0, easeOutBack(span(u, 0.38, 0.5))) * vis, mr = 30 * k * pop * (1 + 0.1 * Math.sin(u * D * 8));
  if (mr > 1) {
    g.ring(mx, my, mr, mr, 4 * k, '#c21f1f', pop);
    g.ring(mx, my, mr * 0.55, mr * 0.55, 2 * k, '#ffd35a', pop);
    for (let i = 0; i < 4; i++) {
      const a = u * 1.2 + (i / 4) * TAU;
      g.fang(mx + Math.cos(a) * mr * 1.7, my + Math.sin(a) * mr * 1.7, mx + Math.cos(a) * mr * 1.05, my + Math.sin(a) * mr * 1.05, 6 * k, '#ff5a2a', pop);
    }
  }
  burst(g, u, mx, my, { u0: 0.4, u1: 0.85, n: 30, dist: R * 1.2, cols: VENGEANCE.slice(1), salt: 60, len: 10 * k });
  rise(g, u, { x: cx, y: ground, w: W * 1.2, h: H * 1.4, u0: 0.2, u1: 1, n: 60, cols: ['#ff5a2a', '#ffd35a', '#c21f1f'], salt: 50, size: 7 * k, kind: 'spark' });
};

/** Celestial Wrath, on each enemy it hits: the sky breaks open over it and a
 *  column of golden light slams down with the damage, cracking the ground. */
const coleraCelestial: Build = (g, u, c, D) => {
  const { b, cx, R, k, W, H, ground } = geo(c);
  const HIT = 0.14, top = Math.max(0, b.y - 2.4 * H), a = 1 - span(u, 0.8, 1);
  const sky = span(u, 0, 0.1) * (1 - span(u, 0.7, 1));
  cloud(g, cx, Math.max(16, b.y - 1.1 * H), W * 1.6, H * 0.3, g.n(8), 7, '#3a2e18', '#ffd35a', 0.7 * sky, bell(u, 0.1, 0.5));
  const bottom = lerp(top, ground, easeIn(span(u, 0, HIT)));
  const w = W * (0.25 + 0.75 * easeOut(span(u, HIT - 0.03, HIT + 0.1))) * (1 - easeIn(span(u, 0.55, 0.95))) * (1 + 0.05 * Math.sin(u * D * 60)) + 3 * k;
  g.beam(cx, top, cx, bottom, w, '#ffb830', 0.5 * a);
  g.beam(cx, top, cx, bottom, w * 0.45, '#fff3c4', 0.8 * a);
  g.beam(cx, top, cx, bottom, w * 0.12 + 1, '#ffffff', a);
  if (u < HIT) return;
  if (u < HIT + 0.05) g.mark('columna', cx, ground);
  const fl = bell(u, HIT, HIT + 0.3);
  g.dot(cx, ground - 0.1 * H, R * 1.1 * fl + 1, '#fff3c4', 0.35 * fl);
  g.dot(cx, ground - 0.1 * H, 24 * k * fl + 1, '#ffffff', 0.9 * fl);
  const cr = easeOut(span(u, HIT, HIT + 0.14)) * (1 - span(u, 0.6, 0.95)), cracks = g.n(8);
  if (cr > 0.02) for (let i = 0; i < cracks; i++) {
    const an = (i / cracks) * TAU + g.r(i) * 0.5, L = cr * (0.7 + 0.5 * g.r(i + 10));
    const end = { x: cx + Math.cos(an) * W * 1.1 * L, y: ground + Math.sin(an) * W * 0.24 * L };
    const pts = zigzag({ x: cx, y: ground }, end, 4, 6 * k, 0, i + 5);
    g.strip(pts, () => 3.2 * k, '#ffb830', 0.8 * a);
    g.strip(pts, () => 1.2 * k, '#ffffff', a, false);
  }
  const s = span(u, HIT, 0.7);
  if (s > 0 && s < 1) g.ring(cx, ground, W * (0.3 + 1.1 * easeOut(s)), W * 0.12 * (0.3 + 1.1 * easeOut(s)) + 2, 6 * k * (1 - s) + 1, '#ffd35a', 1 - s);
  burst(g, u, cx, ground - 6 * k, { u0: HIT, u1: 0.7, n: 34, dist: R * 1.6, cols: GLORY, salt: 30, len: 11 * k, grav: 220 * k, dir: -Math.PI / 2, spread: 2.6 });
  rise(g, u, { x: cx, y: ground, w: W * 1.2, h: H * 1.5, u0: HIT + 0.1, u1: 1, n: 30, cols: DEVOTION, salt: 60, size: 6 * k });
};

/** Avenging Angel: light pours down, great feathered wings of light unfold from
 *  the paladin's back under a halo, his hammer rises crackling and bursts in
 *  radiance with a shockwave, and feathers drift down. */
const angelVengador: Build = (g, u, c, D) => {
  const { b, cx, cy, R, k, W, H, ground, face } = geo(c);
  const vis = 1 - span(u, 0.85, 1), bm = bell(u, 0, 0.6);
  g.beam(cx, b.y - 2.2 * H, cx, ground, W * 1.2, '#ffd35a', 0.22 * bm);
  g.beam(cx, b.y - 2.2 * H, cx, ground, W * 0.35, '#fff3c4', 0.35 * bm);
  const open = easeOutBack(span(u, 0.12, 0.42)), flap = Math.sin(u * D * 4) * 0.08 * span(u, 0.4, 0.6);
  const L1 = W * 0.5 * (0.5 + 0.5 * open), L2 = W * 0.95 * (0.4 + 0.6 * open);
  const e1 = lerp(-1.2, 0.65, open) + flap, e2 = lerp(-1.4, 0.2, open) + flap;
  const rows: [number, number, number, number, number][] = [
    // [count, t from, t to, length (× W), angle bias]
    [9, 0.2, 1, 0.55, 0], [7, 0, 1, 0.48, 0.3], [8, 0, 1, 0.24, 0.15],
  ];
  const wingIn = span(u, 0.1, 0.2) * vis;
  for (const s of [-1, 1]) {
    // rooted at the shoulders so the paladin's body stays clear under the wings
    const S = { x: cx + s * W * 0.2, y: b.y + 0.28 * H };
    const E = { x: S.x + s * Math.cos(e1) * L1, y: S.y - Math.sin(e1) * L1 };
    const T = { x: E.x + s * Math.cos(e2) * L2, y: E.y - Math.sin(e2) * L2 };
    rows.forEach(([cnt, t0, t1, len, bias], r) => {
      const n = g.n(cnt);
      for (let i = 0; i < n; i++) {
        const t = lerp(t0, t1, n > 1 ? i / (n - 1) : 0.5);
        const onArm = r === 1;
        const base = onArm ? { x: lerp(S.x, E.x, t), y: lerp(S.y, E.y, t) } : r === 0 ? { x: lerp(E.x, T.x, t), y: lerp(E.y, T.y, t) }
          : t < 0.5 ? { x: lerp(S.x, E.x, t * 2), y: lerp(S.y, E.y, t * 2) } : { x: lerp(E.x, T.x, t * 2 - 1), y: lerp(E.y, T.y, t * 2 - 1) };
        const phiR = (onArm ? lerp(1.2, 1.0, t) : r === 0 ? lerp(1.0, 0.1, t) : lerp(1.1, 0.4, t)) - bias * 0.3 - flap;
        const phi = s > 0 ? phiR : Math.PI - phiR;
        const Lf = W * len * (r === 0 ? 0.65 + 0.5 * t : r === 1 ? 0.55 + 0.45 * t : 1) * (0.4 + 0.6 * open);
        const tip = { x: base.x + Math.cos(phi) * Lf, y: base.y + Math.sin(phi) * Lf };
        const a = wingIn * span(u, 0.12 + 0.12 * t, 0.2 + 0.12 * t);
        g.fang(base.x, base.y, tip.x, tip.y, (r === 2 ? 9 : 12) * k, '#ffc53a', 0.14 * a);
        g.fang(base.x, base.y, tip.x, tip.y, (r === 2 ? 6 : 8.5) * k, r === 2 ? '#f0d890' : '#fff3d0', 0.85 * a, false);
        if (r === 0) g.seg(base.x, base.y, lerp(base.x, tip.x, 0.8), lerp(base.y, tip.y, 0.8), 1.2 * k, '#ffffff', 0.5 * a);
      }
    });
    g.seg(S.x, S.y, E.x, E.y, 5 * k, '#ffe7a0', 0.7 * wingIn);
    g.seg(E.x, E.y, T.x, T.y, 3.5 * k, '#ffe7a0', 0.7 * wingIn);
  }
  const hl = span(u, 0.25, 0.4) * vis;
  g.ring(cx, b.y - 0.02 * H, W * 0.26, W * 0.08, 4 * k, '#ffd35a', hl);
  g.ring(cx, b.y - 0.02 * H, W * 0.26, W * 0.08, 1.5 * k, '#ffffff', hl);
  const hx = cx + face * W * 0.18, hy = b.y - 0.4 * H, hs = 50 * k + 10;
  gather(g, u, hx, hy, { r0: R * 1.8, u0: 0, u1: 0.35, n: 40, cols: GLORY, salt: 9, size: 7 * k, kind: 'star' });
  lightHammer(g, hx, hy, Math.PI / 2 + face * 0.12, hs * (1 + 0.12 * bell(u, 0.35, 0.55)), span(u, 0.15, 0.3) * vis);
  const frame = Math.floor(u * D * 20), arcs = span(u, 0.2, 0.3) * (1 - span(u, 0.7, 0.85));
  if (arcs > 0) for (let j = 0; j < g.n(3); j++) {
    const an = hash01(frame * 3 + j, 5) * TAU, end = { x: hx + Math.cos(an) * hs * 1.3, y: hy + Math.sin(an) * hs * 1.3 };
    g.strip(zigzag({ x: hx, y: hy }, end, 4, 7 * k, frame, j + 2), () => 2 * k, j % 2 ? '#ffd35a' : '#ffffff', arcs);
  }
  const fl = bell(u, 0.35, 0.62);
  g.dot(hx, hy, R * 1.1 * fl + 1, '#fff3c4', 0.22 * fl);
  g.star(hx, hy, 70 * k * fl + 0.1, '#ffffff', fl);
  for (let i = 0; i < 2; i++) {
    const s = span(u, 0.36 + i * 0.08, 0.8 + i * 0.08);
    if (s > 0 && s < 1) g.ring(cx, cy, R * (0.4 + 2.2 * easeOut(s)), R * (0.3 + 1.4 * easeOut(s)), 6 * k * (1 - s) + 1, i ? '#ffffff' : '#ffd35a', 1 - s);
  }
  each(g, 40, (i) => {
    const q = span(u, 0.4 + 0.4 * g.r(i + 100), 1);
    if (q <= 0 || q >= 1) return;
    g.leaf(cx + (g.r(i + 110) - 0.5) * W * 3.2 + Math.sin(q * 6 + i) * 14 * k, b.y + q * H * 1.3, 10 * k, Math.sin(q * 5 + i), i % 3 ? '#fff8e0' : '#ffd35a', 1 - q, true);
  });
  burst(g, u, hx, hy, { u0: 0.35, u1: 0.95, n: 60, dist: R * 2.2, cols: GLORY, salt: 80, kind: 'star', len: 12 * k });
  rise(g, u, { x: cx, y: ground, w: W * 1.8, h: H * 1.4, u0: 0.4, u1: 1, n: 40, cols: DEVOTION, salt: 140, size: 6 * k });
};

/** Avenging Angel's prelude: a shaft of light narrows onto the paladin while
 *  feathers of light spiral down into it and a ring opens at his feet. */
const angelPrelude: Build = (g, u, c) => {
  const { b, cx, cy, R, k, W, H, ground } = geo(c);
  const vis = span(u, 0, 0.15) * (1 - span(u, 0.9, 1)), w = W * lerp(1.6, 0.5, easeInOut(u));
  g.beam(cx, b.y - 2 * H, cx, ground, w, '#ffd35a', 0.2 * vis);
  g.beam(cx, b.y - 2 * H, cx, ground, w * 0.3, '#fff3c4', 0.3 * vis);
  each(g, 36, (i) => {
    const q = (u * 1.2 + g.r(i)) % 1, a = g.r(i + 40) * TAU + q * 5, rad = W * (1.4 - 1.1 * q);
    g.leaf(cx + Math.cos(a) * rad, lerp(b.y - 1.5 * H, cy, q), 9 * k, a, i % 3 ? '#fff3d0' : '#ffd35a', 0.9 * vis * Math.sin(Math.PI * q));
  });
  gather(g, u, cx, cy, { r0: R * 2, u0: 0, u1: 0.95, n: 50, cols: GLORY, salt: 3, size: 6 * k, kind: 'star' });
  const op = easeOut(span(u, 0.1, 0.5));
  g.ring(cx, ground, W * 0.8 * op + 1, W * 0.2 * op + 1, 3 * k, '#ffd35a', 0.8 * vis);
};

// ── Preludes: anticipation over the receivers while the showcase holds ─────

/** Generic prelude: themed motes spiral in and motif symbols orbit the receiver
 *  as a sigil opens at its feet, then everything draws in tight. */
function gatherPrelude(cols: string[], motif: Kind, ringCol: string): Build {
  return (g, u, c, D) => {
    const { cx, cy, R, k, W, ground } = geo(c);
    const vis = span(u, 0, 0.15) * (1 - span(u, 0.88, 1));
    gather(g, u, cx, cy, { r0: R * 2.2, u0: 0, u1: 0.95, n: 80, cols, salt: 1, size: 6 * k, kind: 'dot', turns: 1.2 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + u * D * 2, rad = R * lerp(1.3, 0.6, easeIn(u));
      mote(g, motif, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.6, 12 * k, a, cols[i % cols.length], 0.8 * vis);
    }
    const op = easeOut(span(u, 0.1, 0.5));
    g.ring(cx, ground, W * 0.8 * op + 1, W * 0.2 * op + 1, 3 * k, ringCol, 0.8 * vis);
    g.dot(cx, cy, R * 0.5 * span(u, 0.5, 0.95) + 1, ringCol, 0.18 * vis);
  };
}

/** Vengeful Storm's prelude: storm clouds close in over the enemies from both
 *  sides, flickering inside, and the first drops of rain fall. */
const tormentaPrelude: Build = (g, u, c) => {
  const { b, cx, k, W, H, ground } = geo(c);
  const cyC = Math.max(20, b.y - 0.9 * H), close = easeInOut(span(u, 0, 0.8)), vis = 1 - span(u, 0.92, 1);
  for (const s of [-1, 1]) {
    const x = cx + s * lerp(W * 1.1, W * 0.28, close);
    const flick = Math.max(0, Math.sin(u * 47 + s * 3)) ** 8;
    cloud(g, x, cyC, W * 0.7, H * 0.4, g.n(14), s > 0 ? 3 : 29, '#1c2238', '#cfe6ff', 0.9 * vis * span(u, 0, 0.2), flick);
  }
  each(g, 50, (i) => {
    const f = (u * 2.6 + g.r(i)) % 1, on = span(u, 0.3 + 0.4 * g.r(i + 40), 0.9);
    g.spark(cx + (g.r(i + 20) - 0.5) * W * 1.4 * close - f * 20 * k, lerp(cyC, ground, f), 12 * k, 1.8, '#9fc4ff', 0.5 * on * vis);
  });
  each(g, 8, (i) => {
    const q = span(u, 0.35 + 0.07 * i, 0.4 + 0.07 * i);
    if (q <= 0 || q >= 1) return;
    const a = { x: cx + (g.r(i + 70) - 0.5) * W, y: cyC }, e = { x: a.x + (g.r(i + 80) - 0.5) * 60 * k, y: cyC + 30 * k };
    g.strip(zigzag(a, e, 4, 8 * k, i, 5), () => 2 * k, '#cfe6ff', 1 - q);
  });
};

// ── registry ────────────────────────────────────────────────────────────────

const ONE = MAX_CARD_SPRITES;
/** Cards that show on several enemies at once (or hit several times) stay lighter. */
const MULTI = 280;

interface Entry { spell: SpellDef; prelude: SpellDef }
const entry = (spell: Omit<SpellDef, 'cap'> & { cap?: number }, prelude: Build | [string[], Kind, string]): Entry => ({
  spell: { cap: ONE, ...spell },
  prelude: { duration: 1.1, phases: [0.5, 0.85], anchor: spell.anchor, cap: ONE, build: Array.isArray(prelude) ? gatherPrelude(...prelude) : prelude },
});

/** Rare and unique cards' own sequences, by card id. */
export const CARD_FX: Record<string, Entry> = {
  // druid
  'corazon-cambiante': entry({ duration: 1.3, phases: [0.3, 0.72], anchor: 'self', build: corazonCambiante }, [LEAF, 'leaf', '#7dba4e']),
  'circulo-tierra': entry({ duration: 1.2, phases: [0.3, 0.7], anchor: 'self', build: raicesProfundas }, [EARTH, 'rune', '#b8863b']),
  'circulo-luna': entry({ duration: 1.3, phases: [0.3, 0.7], anchor: 'self', build: formaLunar }, [MOON, 'star', '#9bb4ff']),
  // one wave across every enemy: the hits do not cast it again, each one lands as the crest reaches it
  'circulo-mar': entry({
    duration: SEA_DURATION, phases: [SEA_FIRST / SEA_DURATION, 0.6], anchor: 'target', build: coleraMar,
    sweep: (c, x) => seaArrival(seaPlan(c), x),
  }, [SEA, 'bubble', '#4fb3e8']),
  'circulo-estrellas': entry({ duration: 1.3, phases: [0.35, 0.7], anchor: 'self', build: formaEstelar }, [STAR, 'star', '#ffd166']),
  'guardian-roble': entry({ duration: 1.3, phases: [0.35, 0.72], anchor: 'self', build: guardianRoble }, [LEAF, 'leaf', '#b8863b']),
  'elemental-tierra': entry({ duration: 1.2, phases: [0.35, 0.7], anchor: 'self', shake: { at: 0.4, level: 1 }, build: elementalTierra }, [EARTH, 'drop', '#8a6a3a']),
  'tormenta-venganza': entry({ duration: 0.9, phases: [0.12, 0.5], anchor: 'target', cap: MULTI, shake: { at: 0.13, level: 2 }, build: tormentaVenganza }, tormentaPrelude),
  // barbarian
  'senda-berserker': entry({ duration: 0.7, phases: [0.15, 0.5], anchor: 'target', cap: MULTI, build: frenesi }, [FIRE, 'spark', '#ff3b1f']),
  'senda-corazon-salvaje': entry({ duration: 1.2, phases: [0.3, 0.7], anchor: 'self', build: corazonSalvaje }, [['#a01616', '#b8863b', '#d9b77a'], 'heart', '#b8863b']),
  'senda-arbol-mundo': entry({ duration: 1.2, phases: [0.3, 0.72], anchor: 'self', build: saviaArbol }, [GOLD, 'leaf', '#7dba4e']),
  'senda-fanatico': entry({ duration: 1.0, phases: [0.12, 0.6], anchor: 'target', shake: { at: 0.12, level: 1 }, build: furiaDivina }, [GOLD, 'spark', '#ffd166']),
  'reabrir-heridas': entry({ duration: 0.9, phases: [0.22, 0.6], anchor: 'target', build: reabrirHeridas }, [BLOOD, 'drop', '#a01616']),
  'festin-carmesi': entry({ duration: 1.2, phases: [0.12, 0.65], anchor: 'target', build: festinCarmesi }, [BLOOD, 'heart', '#d63b3b']),
  'furia-indomita': entry({ duration: 1.3, phases: [0.2, 0.6], anchor: 'self', shake: { at: 0.2, level: 3 }, build: furiaIndomita }, [FIRE, 'spark', '#ff3b1f']),
  // wizard
  'escuela-evocacion': entry({ duration: 1.1, phases: [0.12, 0.6], anchor: 'target', shake: { at: 0.12, level: 1 }, build: desintegrar }, [['#3fbf3a', '#7dff6b', '#d6ffb8'], 'rune', '#7dff6b']),
  'escuela-abjuracion': entry({ duration: 1.2, phases: [0.35, 0.72], anchor: 'self', build: clarividencia }, [ARCANE, 'rune', '#4fc3ff']),
  'escuela-ilusion': entry({ duration: 1.1, phases: [0.3, 0.7], anchor: 'self', build: imagenEspejo }, [['#dfe8ff', '#ff9dff', '#9dffea'], 'star', '#dfe8ff']),
  'tratado-prohibido': entry({ duration: 1.3, phases: [0.35, 0.72], anchor: 'self', build: tratadoProhibido }, [VOID, 'rune', '#b46bff']),
  'palabra-de-poder': entry({ duration: 0.9, phases: [0.3, 0.62], anchor: 'self', shake: { at: 0.36, level: 1 }, build: palabraPoder }, [ARCANE, 'rune', '#3b6bff']),
  'maestria-conjuros': entry({ duration: 1.4, phases: [0.3, 0.7], anchor: 'self', build: maestriaConjuros }, [ARCANE, 'star', '#ffd166']),
  // a common card with its own effect: one weaving dart per hit, cast in a quick volley
  'proyectil-magico': entry({
    duration: DART_FLIGHT + DART_FADE, phases: [DART_FLIGHT / (DART_FLIGHT + DART_FADE), (DART_FLIGHT + 0.14) / (DART_FLIGHT + DART_FADE)],
    anchor: 'target', cap: 120, volley: { gap: DART_GAP }, build: proyectilMagico,
  }, [ARCANE, 'star', '#8a6bff']),
  // rogue
  asesino: entry({ duration: 1.0, phases: [0.3, 0.7], anchor: 'self', build: golpeAsesino }, [TOXIC, 'drop', '#5bd13a']),
  psionico: entry({ duration: 1.2, phases: [0.35, 0.7], anchor: 'self', build: almaCuchillas }, [PSI, 'spark', '#c86bff']),
  'embaucador-arcano': entry({ duration: 1.1, phases: [0.3, 0.7], anchor: 'self', build: manoFantasmal }, [['#9dffea', '#c7d2e8', '#ffffff'], 'star', '#9dffea']),
  'maestria-cuchillas': entry({ duration: 1.0, phases: [0.3, 0.7], anchor: 'self', build: maestriaCuchillas }, [STEEL, 'spark', '#dfe6ef']),
  'nube-nauseabunda': entry({ duration: 1.3, phases: [0.3, 0.75], anchor: 'target', cap: MULTI, build: nubeNauseabunda }, [TOXIC, 'bubble', '#5bd13a']),
  oportunista: entry({ duration: 1.0, phases: [0.3, 0.68], anchor: 'self', build: oportunista }, [['#3a3a4a', '#9aa7b8', '#ff5a5a'], 'spark', '#9aa7b8']),
  'tempestad-acero': entry({ duration: 1.0, phases: [0.18, 0.68], anchor: 'target', build: tempestadAcero }, [STEEL, 'spark', '#dfe6ef']),
  'danza-mortal': entry({ duration: 1.3, phases: [0.35, 0.72], anchor: 'self', build: danzaMortal }, [PHANTOM, 'spark', '#b8c6ff']),
  // warlock
  archifata: entry({ duration: 1.2, phases: [0.3, 0.72], anchor: 'target', receiver: 'enemies', cap: MULTI, build: presenciaFeerica }, [FEY, 'star', '#ff8fd8']),
  celestial: entry({ duration: 1.3, phases: [0.3, 0.72], anchor: 'self', build: bendicionCelestial }, [GOLD, 'star', '#ffd166']),
  infernal: entry({ duration: 1.2, phases: [0.3, 0.7], anchor: 'self', build: pactoInfernal }, [HELL, 'spark', '#c21f3a']),
  'gran-antiguo': entry({ duration: 1.3, phases: [0.35, 0.72], anchor: 'self', build: menteGranAntiguo }, [VOID, 'rune', '#6c2fb5']),
  // the starter Eldritch Blast: a thick dark dart per hit, on Magic Missile's routes and volley
  'explosion-sobrenatural': entry({
    duration: DART_FLIGHT + BLAST_FADE, phases: [DART_FLIGHT / (DART_FLIGHT + BLAST_FADE), (DART_FLIGHT + 0.16) / (DART_FLIGHT + BLAST_FADE)],
    anchor: 'target', cap: 140, volley: { gap: DART_GAP }, build: explosionSobrenatural,
  }, [VOID, 'spark', '#b46bff']),
  'explosion-trifurcada': entry({ duration: 1.0, phases: [0.3, 0.65], anchor: 'self', build: explosionTrifurcada }, [VOID, 'spark', '#b46bff']),
  'haz-desdoblado': entry({ duration: 1.0, phases: [0.25, 0.7], anchor: 'self', build: hazDesdoblado }, [['#b46bff', '#ff5ad8', '#e8d0ff'], 'spark', '#ff5ad8']),
  'verbo-aniquilacion': entry({ duration: 1.2, phases: [0.4, 0.72], anchor: 'target', build: verboAniquilacion }, [VOID, 'rune', '#e8d0ff']),
  'pacto-final': entry({ duration: 1.3, phases: [0.3, 0.72], anchor: 'target', receiver: 'enemies', cap: MULTI, build: pactoFinal }, [HELL, 'rune', '#c21f3a']),
  // paladin
  'juramento-devocion': entry({ duration: 1.3, phases: [0.35, 0.72], anchor: 'self', build: juramentoDevocion }, [DEVOTION, 'star', '#fff3c4']),
  'juramento-gloria': entry({ duration: 1.3, phases: [0.35, 0.72], anchor: 'self', build: juramentoGloria }, [GLORY, 'leaf', '#ffd35a']),
  'juramento-antiguos': entry({ duration: 1.3, phases: [0.35, 0.72], anchor: 'self', build: juramentoAntiguos }, [ANCIENT, 'leaf', '#7dba4e']),
  'juramento-venganza': entry({ duration: 1.2, phases: [0.33, 0.72], anchor: 'self', build: juramentoVenganza }, [VENGEANCE, 'spark', '#c21f1f']),
  'colera-celestial': entry({ duration: 0.9, phases: [0.14, 0.55], anchor: 'target', cap: MULTI, shake: { at: 0.15, level: 2 }, build: coleraCelestial }, [GOLD, 'spark', '#ffd35a']),
  'angel-vengador': entry({ duration: 1.4, phases: [0.35, 0.75], anchor: 'self', shake: { at: 0.37, level: 2 }, build: angelVengador }, angelPrelude),
  // neutral
  seducir: entry({ duration: 1.2, phases: [0.35, 0.72], anchor: 'target', build: seducir }, [LOVE, 'heart', '#ff5a8a']),
  deseo: entry({ duration: 1.3, phases: [0.33, 0.72], anchor: 'self', build: deseo }, [GOLD, 'star', '#ffd166']),
};

/** Spell key of a card: its own sequence when it has one, else its fx key. */
export function cardSpellKey(id: string, fx?: string): string {
  return CARD_FX[id] ? `carta:${id}` : fx ?? '';
}

/** Spell key of a card's showcase prelude, if it has its own sequence. */
export function preludeKey(id: string): string | undefined {
  return CARD_FX[id] ? `carta:${id}:preludio` : undefined;
}

/** Spell for a hit with effect `efecto` while `card` resolves: the card's own
 *  sequence replaces the generic effect of its fx key. */
export function hitSpell(card: { id: string; fx?: string } | null, efecto: string): string {
  return card && card.fx === efecto && CARD_FX[card.id] ? cardSpellKey(card.id, card.fx) : efecto;
}

/** Volley rhythm of spell `key`: its hits are cast `gapMs` apart and each one's
 *  feedback (number, hit, shake) waits `impactMs` for its dart to land. Reduced
 *  motion spaces the darts out so every number reads. Null for ordinary hits. */
export function volleyTiming(key: string, reduced: boolean): { impactMs: number; gapMs: number } | null {
  const d = SPELLS[key];
  if (!d?.volley) return null;
  return { impactMs: Math.round(d.phases[0] * d.duration * 1000), gapMs: Math.round(d.volley.gap * (reduced ? 2 : 1) * 1000) };
}

/** Seconds since spell `key` was cast until its sweep reaches screen column `x`, or null
 *  when the spell is not a sweep (each hit casts its own). */
export function sweepArrival(key: string, ctx: SpellCtx, x: number): number | null {
  const d = SPELLS[key];
  return d?.sweep ? d.sweep(ctx, x) : null;
}

/** Milliseconds a hit on `target` waits for sweep `key`, cast `elapsedMs` ago, to reach the
 *  middle of its box (0 once the sweep has passed); null when `key` is not a sweep. */
export function sweepImpactMs(key: string, ctx: SpellCtx, target: Box, elapsedMs: number): number | null {
  const t = sweepArrival(key, ctx, target.x + target.w / 2);
  return t === null ? null : Math.max(0, Math.round(t * 1000 - elapsedMs));
}

/** Screen shake of spell `key` (delay since it was cast), or null with reduced motion. */
export function cardShake(key: string, reduced: boolean): { delayMs: number; level: 1 | 2 | 3 } | null {
  const d = SPELLS[key];
  if (reduced || !d?.shake) return null;
  return { delayMs: Math.round(d.shake.at * d.duration * 1000), level: d.shake.level };
}

for (const [id, e] of Object.entries(CARD_FX)) {
  SPELLS[`carta:${id}`] = e.spell;
  SPELLS[`carta:${id}:preludio`] = e.prelude;
}

