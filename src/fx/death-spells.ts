// Hero death compositions: one class-themed burst per hero plus the rising soul.
// Pure builders in the spell-fx style (every frame rebuilt from the elapsed time),
// registered in SPELLS so the fx canvas draws them in its single WebGL pass and
// the global time scale (slow motion) stretches them for free.

import {
  SPELLS, TAU, bell, clamp01, dropAngle, easeIn, easeOut, fly, geo, lerp, lightHammer, smooth, span, zigzag, type Build,
} from './spell-fx.ts';

const mix = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), q = clamp01(t);
  const ch = (s: number) => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, q));
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
};

/** Barbarian: the rage leaves him as a burst of embers that rise, cool and turn to ash. */
const muerteBarbaro: Build = (g, u, c, D) => {
  const { b, cx, cy, R, k, W, H, ground } = geo(c);
  // the last heartbeat of fury: a red core that throbs twice and dies
  const beat = bell(u, 0, 0.22) + 0.6 * bell(u, 0.2, 0.4);
  g.dot(cx, cy, 0.7 * R * (0.8 + 0.3 * beat), '#d62828', 0.28 * beat);
  g.dot(cx, cy, 0.3 * R, '#ffd166', 0.5 * bell(u, 0, 0.18));
  // shock ring on the ground where he falls
  const s0 = span(u, 0.05, 0.55);
  if (s0 > 0 && s0 < 1) g.ring(cx, ground, W * (0.3 + 0.9 * easeOut(s0)), W * 0.18 * (0.3 + 0.9 * easeOut(s0)), 5 * k * (1 - s0) + 1, '#ff6b35', 0.8 * (1 - s0));
  // embers: thrown out hot, then drifting up while they cool to grey ash
  const n = g.n(46);
  for (let i = 0; i < n; i++) {
    const t0 = 0.02 + 0.3 * g.r(i), q = span(u, t0, t0 + 0.6 + 0.3 * g.r(i + 1));
    if (q <= 0 || q >= 1) continue;
    const a = -Math.PI / 2 + (g.r(i + 2) - 0.5) * 2.8, sp = (90 + 170 * g.r(i + 3)) * k;
    const tau = q * D * 0.7;
    const p = fly(cx + (g.r(i + 4) - 0.5) * W * 0.5, cy + 0.15 * H, Math.cos(a) * sp, Math.sin(a) * sp, tau, -60 * k);
    const x = p.x + Math.sin(q * 9 + i) * 6 * k;
    const hot = mix('#ffb347', '#ff8c3b', q * 2);
    const col = q < 0.5 ? hot : mix('#ff8c3b', '#5a4a44', (q - 0.5) * 2);
    if (i % 3 === 0) g.spark(x, p.y, (9 - 5 * q) * k, a, q < 0.5 ? '#ff8c3b' : '#ffb347', 1 - q);
    else g.dot(x, p.y, (2.6 - 1.2 * q) * k, col, 1 - q * q, q < 0.7);
  }
  // falling ash flakes over the body
  for (let i = 0; i < g.n(14); i++) {
    const q = span(u, 0.35 + 0.35 * g.r(i + 60), 1);
    if (q <= 0 || q >= 1) continue;
    g.dot(b.x + g.r(i + 61) * W, cy - 0.4 * H + q * 0.9 * H + Math.sin(q * 6 + i) * 3, 1.8 * k, '#6b6360', 0.8 * (1 - q), false);
  }
};

/** Druid: leaves burst out and wither while green spirit motes spiral up to the canopy. */
const muerteDruida: Build = (g, u, c, D) => {
  const { cx, cy, R, k, W, H, ground } = geo(c);
  // leaves: a gust out of the body, then they wither from green to ochre and fall
  const n = g.n(30);
  for (let i = 0; i < n; i++) {
    const t0 = 0.03 * (i % 6), q = span(u, t0, t0 + 0.85);
    if (q <= 0 || q >= 1) continue;
    const a = g.r(i) * TAU, sp = (80 + 120 * g.r(i + 1)) * k;
    const out = easeOut(span(q, 0, 0.4)) * sp * 0.9;
    const fall = easeIn(span(q, 0.3, 1)) * H * 0.7;
    const x = cx + Math.cos(a) * out + Math.sin(q * 7 + i) * 10 * k;
    const y = Math.min(ground, cy + Math.sin(a) * out * 0.6 + fall);
    const col = q < 0.35 ? '#7dba4e' : mix('#7dba4e', q < 0.7 ? '#a8804f' : '#6b4a2c', (q - 0.35) / 0.65);
    g.leaf(x, y, (7 + 3 * g.r(i + 2)) * k, a + q * 6 * (g.r(i + 3) < 0.5 ? 1 : -1), col, 1 - span(q, 0.75, 1));
  }
  // spirit motes spiralling up
  const m = g.n(22);
  for (let i = 0; i < m; i++) {
    const t0 = 0.12 + 0.35 * g.r(i + 30), q = span(u, t0, t0 + 0.55);
    if (q <= 0 || q >= 1) continue;
    const ang = g.r(i + 31) * TAU + q * 7, rad = (0.15 + 0.25 * g.r(i + 32)) * W * (1 - 0.6 * q);
    const x = cx + Math.cos(ang) * rad, y = cy + 0.2 * H - easeOut(q) * 1.1 * H;
    g.dot(x, y, (3.2 - 1.4 * q) * k, i % 3 ? '#b8ffd9' : '#eaffe8', 1 - q);
  }
  // the glade's last breath: a pale green halo
  const h = bell(u, 0.05, 0.6);
  g.dot(cx, cy, 0.8 * R, '#54c95e', 0.18 * h);
  const s = span(u, 0.1, 0.7);
  if (s > 0 && s < 1) g.ring(cx, cy, R * (0.4 + 0.8 * easeOut(s)), R * (0.4 + 0.8 * easeOut(s)), 3 * k, '#b8e08a', 0.6 * (1 - s));
};

/** Wizard: a ring of runes orbits the body, flickers and goes out one by one. */
const muerteMago: Build = (g, u, c, D) => {
  const { cx, cy, R, k } = geo(c);
  const n = 8;
  const grow = easeOut(span(u, 0, 0.2));
  for (let i = 0; i < n; i++) {
    // each rune dies at its own moment, with a last flicker
    const dies = 0.35 + 0.5 * (i / n) + 0.05 * g.r(i);
    const life = 1 - span(u, dies, dies + 0.12);
    if (life <= 0) continue;
    const flick = u > dies - 0.1 ? 0.5 + 0.5 * Math.sin(u * D * 60 + i * 3) : 1;
    const a = (i / n) * TAU + u * 1.6;
    const rad = R * (0.4 + 0.55 * grow) * (1 - 0.25 * span(u, 0.5, 1));
    const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad * 0.55;
    const col = mix('#c98bff', '#4a4a5a', span(u, dies - 0.15, dies + 0.1));
    g.dot(x, y, 10 * k, '#6bd8ff', 0.25 * life * flick * grow);
    g.rune(x, y, 8 * k, a + Math.PI / 2, col, life * flick * grow);
    // a spark falls from the rune as it goes out
    const q = span(u, dies, dies + 0.3);
    if (q > 0 && q < 1) g.spark(x, y + q * 40 * k, 6 * k, Math.PI / 2, '#6bd8ff', 1 - q);
  }
  // the arcane circle under him cracks and closes
  const s = span(u, 0.05, 0.95);
  if (s > 0 && s < 1) g.ring(cx, cy, R * (1.05 - 0.7 * easeIn(s)), R * 0.58 * (1.05 - 0.7 * easeIn(s)), 3 * k, '#6bd8ff', 0.7 * (1 - s));
  const fl = bell(u, 0.82, 1);
  g.dot(cx, cy, 14 * k, '#ffffff', 0.7 * fl);
};

/** Rogue: shadows spill out of him and his daggers rain down and stick in the ground. */
const muertePicaro: Build = (g, u, c, D) => {
  const { b, cx, cy, R, k, W, H, ground } = geo(c);
  // shadow puffs that spread and fade (plain alpha, no glow)
  const n = g.n(16);
  for (let i = 0; i < n; i++) {
    const q = span(u, 0.02 * i, 0.55 + 0.03 * i);
    if (q <= 0 || q >= 1) continue;
    const a = g.r(i) * TAU, d = easeOut(q) * R * (0.5 + 0.6 * g.r(i + 1));
    g.dot(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7 - q * 18 * k, (10 + 10 * q) * k, i % 2 ? '#2a2438' : '#3a3450', 0.6 * (1 - q), false);
  }
  // daggers: fall tip down from above, bite into the ground, then fade
  const m = 6;
  for (let i = 0; i < m; i++) {
    const t0 = 0.12 + 0.08 * i, q = span(u, t0, t0 + 0.2);
    if (q <= 0) continue;
    const x = b.x + W * (0.05 + 0.9 * ((i * 0.37 + g.r(i + 20) * 0.2) % 1));
    const tilt = (g.r(i + 21) - 0.5) * 0.5;
    const yTip = lerp(b.y - 0.6 * H, ground + 2 * k, easeIn(q));
    const len = 26 * k, fade = 1 - span(u, 0.8, 1);
    const bx = x - Math.sin(tilt) * len, by = yTip - Math.cos(tilt) * len;
    g.fang(bx, by, x, yTip, 6 * k, '#c3ced6', fade);
    g.seg(bx - 6 * k, by, bx + 6 * k, by, 3 * k, '#6e4a2c', fade, 0, false);
    if (q >= 1) {
      const s = span(u, t0 + 0.2, t0 + 0.4);
      if (s > 0 && s < 1) g.ring(x, ground, 12 * k * (0.4 + s), 3 * k * (0.4 + s), 2 * k, '#8d8db5', 1 - s);
    }
  }
  // a last glint on a blade
  g.star(cx, cy - 0.2 * H, 16 * k * bell(u, 0.6, 0.8) + 0.1, '#ffffff', bell(u, 0.6, 0.8));
};

/** Warlock: violet flames climb him, gutter and are swallowed by a point of void. */
const muerteBrujo: Build = (g, u, c, D) => {
  const { b, cx, cy, R, k, W, H, ground } = geo(c);
  const n = g.n(24);
  const consume = span(u, 0.45, 0.95); // flames shrink towards the core
  for (let i = 0; i < n; i++) {
    const t0 = g.r(i) * 0.4, q = span(u, t0, t0 + 0.45);
    if (q <= 0 || q >= 1) continue;
    const x0 = b.x + (0.1 + 0.8 * g.r(i + 1)) * W;
    const x = lerp(x0, cx, easeIn(consume)) + Math.sin(q * 8 + i) * 4 * k;
    const y = lerp(ground - q * H * (0.5 + 0.5 * g.r(i + 2)), cy, easeIn(consume));
    const size = (7 + 6 * g.r(i + 3)) * k * Math.sin(Math.PI * q) * (1 - 0.7 * consume);
    const col = q < 0.3 ? '#e8d0ff' : q < 0.6 ? '#b46bff' : '#6c2fb5';
    g.drop(x, y, size, dropAngle(0, 1) + Math.sin(q * 6 + i) * 0.25, col, 1);
  }
  // rising violet tongues
  for (let i = 0; i < 5; i++) {
    const q = span(u, 0.05 + 0.06 * i, 0.5 + 0.06 * i);
    if (q <= 0 || q >= 1) continue;
    const x = b.x + W * (0.2 + 0.15 * i);
    g.seg(x, ground, x + Math.sin(q * 5 + i) * 6 * k, ground - q * H * 0.8, 7 * k * (1 - q), '#9b5de5', 0.8 * (1 - q), 1);
  }
  // the void point that swallows them, then winks out
  const v = span(u, 0.4, 0.9), out = bell(u, 0.88, 1);
  g.dot(cx, cy, (6 + 0.35 * R * smooth(v)) * (1 - span(u, 0.9, 1)) + 0.5, '#15101f', 0.8 * v, false);
  if (v > 0 && v < 1) g.ring(cx, cy, R * (1 - 0.8 * v), R * (1 - 0.8 * v), 3 * k, '#b46bff', 0.7 * v);
  g.dot(cx, cy, 10 * k, '#e8d0ff', out);
};

/** Paladin: his hammer of light flickers, cracks and shatters into golden shards
 *  that fall and dim; the halo over his head sinks and goes out as the last shaft
 *  of light from above narrows to nothing. */
const muertePaladin: Build = (g, u, c, D) => {
  const { b, cx, cy, k, W, H, ground, face } = geo(c);
  const sh = bell(u, 0, 0.75), bw = W * 0.7 * (1 - span(u, 0.1, 0.75)) + 1;
  g.beam(cx, b.y - 1.8 * H, cx, ground, bw, '#ffd35a', 0.3 * sh);
  g.beam(cx, b.y - 1.8 * H, cx, ground, bw * 0.3, '#fff3c4', 0.35 * sh);
  const hx = cx + face * W * 0.3, hy = cy - 0.1 * H, s = 30 * k + 10, BREAK = 0.22;
  const flick = u > 0.08 ? 0.55 + 0.45 * Math.sin(u * D * 50) : 1;
  lightHammer(g, hx, hy, Math.PI / 2 + face * 0.35, s, span(u, 0, 0.04) * (1 - span(u, BREAK - 0.02, BREAK)) * flick);
  const cr = span(u, 0.1, 0.16) * (1 - span(u, BREAK - 0.02, BREAK));
  if (cr > 0) for (let j = 0; j < 2; j++) {
    const a0 = { x: hx - face * s * 0.4, y: hy + (j - 0.5) * s * 0.3 }, a1 = { x: hx + face * s * 0.4, y: hy - (j - 0.5) * s * 0.2 };
    g.strip(zigzag(a0, a1, 4, 4 * k, j, 3), () => 1.6 * k, '#ffffff', cr, false);
  }
  const fl = bell(u, BREAK, 0.4);
  g.dot(hx, hy, s * 1.2 * fl + 1, '#fff3c4', 0.4 * fl);
  g.dot(hx, hy, s * 0.35 * fl + 1, '#ffffff', 0.9 * fl);
  // shards: thrown out of the break, they fall, bounce off the ground and dim to bronze
  const n = g.n(18), G = 900 * k;
  for (let i = 0; i < n; i++) {
    const tau = (u - BREAK) * D * 0.8;
    if (tau <= 0) break;
    const a = -Math.PI / 2 + (g.r(i) - 0.5) * 3.4, sp = (120 + 200 * g.r(i + 1)) * k;
    const p = fly(hx, hy, Math.cos(a) * sp, Math.sin(a) * sp, tau, G);
    const y = Math.min(ground, p.y), q = span(u, BREAK, 1);
    const col = q < 0.3 ? '#ffd35a' : q < 0.55 ? '#e0a82e' : mix('#c9a45a', '#5a5040', (q - 0.55) / 0.45);
    const L = (7 + 6 * g.r(i + 2)) * k, spin = g.r(i + 3) * TAU + (y < ground ? tau * 9 : 0);
    g.fang(p.x - Math.cos(spin) * L, y - Math.sin(spin) * L, p.x + Math.cos(spin) * L, y + Math.sin(spin) * L, 5 * k, col, 1 - span(q, 0.7, 1));
  }
  // the halo sinks and goes out
  const hl = span(u, 0, 0.08) * (1 - span(u, 0.55, 0.85)) * (u > 0.4 ? 0.6 + 0.4 * Math.sin(u * D * 40) : 1);
  const hyH = lerp(b.y - 0.04 * H, cy, easeIn(span(u, 0.2, 0.85)));
  g.ring(cx, hyH, W * 0.24, W * 0.07, 4 * k, '#ffd35a', hl);
  g.ring(cx, hyH, W * 0.24, W * 0.07, 1.4 * k, '#fff3c4', hl);
  const m = g.n(14);
  for (let i = 0; i < m; i++) {
    const q = span(u, 0.25 + 0.4 * g.r(i + 30), 0.7 + 0.3 * g.r(i + 30));
    if (q > 0 && q < 1) g.dot(cx + (g.r(i + 40) - 0.5) * W * 0.8 + Math.sin(q * 6 + i) * 5 * k, cy - q * H * 1.1, 2.4 * k, i % 2 ? '#ffd35a' : '#fff3c4', 1 - q);
  }
  const s0 = span(u, BREAK, 0.8);
  if (s0 > 0 && s0 < 1) g.ring(cx, ground, W * (0.3 + 0.7 * s0), W * 0.1 * (0.3 + 0.7 * s0) + 2, 3 * k, '#e0a82e', 0.7 * (1 - s0));
};

/** The hero's soul: a pale wisp rises out of the body, swaying, and fades above. */
const almaHeroe: Build = (g, u, c) => {
  const { cx, cy, k, H, W } = geo(c);
  const rise = smooth(span(u, 0.08, 1));
  const head = { x: cx + Math.sin(u * 5) * 0.12 * W, y: cy + 0.1 * H - rise * 1.3 * H };
  const show = span(u, 0, 0.15) * (1 - span(u, 0.75, 1));
  // tail of fading motes behind the head
  const n = g.n(14);
  for (let i = 0; i < n; i++) {
    const lag = (i + 1) * 0.035, q = clamp01(u - lag);
    const r = smooth(span(q, 0.08, 1));
    const x = cx + Math.sin(q * 5) * 0.12 * W, y = cy + 0.1 * H - r * 1.3 * H;
    g.dot(x, y, (7 - 0.4 * i) * k, i % 2 ? '#9fe8ff' : '#d8fff0', show * (1 - i / n) * 0.8);
  }
  g.dot(head.x, head.y, 22 * k, '#9fe8ff', 0.3 * show);
  g.dot(head.x, head.y, 9 * k, '#ffffff', show);
  // a few sparkles shed on the way up
  for (let i = 0; i < 8; i++) {
    const t0 = 0.15 + 0.08 * i, q = span(u, t0, t0 + 0.3);
    if (q <= 0 || q >= 1) continue;
    const r = smooth(span(t0, 0.08, 1));
    g.star(cx + Math.sin(t0 * 5) * 0.12 * W + (g.r(i) - 0.5) * 20 * k, cy + 0.1 * H - r * 1.3 * H + q * 20 * k, 6 * k, '#d8fff0', 1 - q);
  }
};

export const DEATH_SPELLS = {
  muerteBarbaro: { duration: 1.3, phases: [0.2, 0.6], anchor: 'self', build: muerteBarbaro },
  muerteDruida: { duration: 1.35, phases: [0.25, 0.65], anchor: 'self', build: muerteDruida },
  muerteMago: { duration: 1.3, phases: [0.3, 0.8], anchor: 'self', build: muerteMago },
  muertePicaro: { duration: 1.25, phases: [0.25, 0.6], anchor: 'self', build: muertePicaro },
  muerteBrujo: { duration: 1.35, phases: [0.3, 0.85], anchor: 'self', build: muerteBrujo },
  muertePaladin: { duration: 1.35, phases: [0.22, 0.7], anchor: 'self', build: muertePaladin },
  almaHeroe: { duration: 1.4, phases: [0.15, 0.75], anchor: 'self', build: almaHeroe },
} as const;

for (const [key, def] of Object.entries(DEATH_SPELLS)) {
  SPELLS[key] = { ...def, phases: [def.phases[0], def.phases[1]] };
}
