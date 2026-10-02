// Doom (Condena) visuals beyond the bell toll (spell-fx.ts `condena`):
//  · persistent spectral chains that grow from the ground and coil round every
//    doomed enemy, climbing higher the closer its Condena gets to its health;
//  · the death by Doom («almaCondenada»): those chains close on the body, a
//    faceless soul flees upwards, is shackled and dragged slowly into the ground.
// Pure (no DOM): frames are rebuilt analytically from the time, so they are
// deterministic and testable in node. The chains are drawn every frame by the
// enemy's puppet (behind and in front of the figure on its WebGL stage, or on the
// fx canvas without one); the death sequence is a spell on the fx canvas.

import type { Sprite } from './particle-sim.ts';
import {
  Painter, REDUCED_DENSITY, SPELLS, TAU, bell, clamp01, easeIn, easeInOut, easeOut, fly, geo, lerp, smooth, span,
  type Box, type Build, type Point,
} from './spell-fx.ts';

// ── how high the chains climb ───────────────────────────────────────────────

/** Height (share of the target's box) of the chains with a sliver of Condena… */
export const DOOM_LEVEL_MIN = 0.14;
/** …with Condena just short of the enemy's health… */
export const DOOM_LEVEL_NEAR = 0.76;
/** …and once Condena reaches it (it dies at the end of the enemy turn): almost all of it. */
export const DOOM_LEVEL_LETHAL = 0.92;

/** Height of the chains (0..DOOM_LEVEL_LETHAL) for `condena` on an enemy with `pv` health:
 *  the smaller the gap between them, the higher; at Condena ≥ health, almost to the top. */
export function doomChainLevel(condena: number, pv: number): number {
  if (!(condena > 0)) return 0;
  if (!(pv > 0) || condena >= pv) return DOOM_LEVEL_LETHAL;
  return DOOM_LEVEL_MIN + (DOOM_LEVEL_NEAR - DOOM_LEVEL_MIN) * (condena / pv);
}

/** The end-of-turn blow with which Doom consumes an enemy (no card resolving): it shows no
 *  spell of its own, the death by Doom plays instead. */
export function isDoomConsumption(efecto: string | undefined, cardResolving: boolean): boolean {
  return efecto === 'condena' && !cardResolving;
}

// ── chain geometry ──────────────────────────────────────────────────────────

/** Chains round each doomed enemy. */
export const DOOM_CHAIN_COUNT = 3;
/** Turns each chain makes round the target from the ground to the top. */
const TURNS = 0.62;
/** Path samples over the full height. */
const SAMPLES = 36;

/** Angle round the target of chain i at height s (0 ground … 1 top): neighbours wind
 *  opposite ways, so the chains cross like a cage. */
const chainAngle = (i: number, s: number) => 0.5 + (i * TAU) / DOOM_CHAIN_COUNT + (i % 2 ? -1 : 1) * s * TURNS * TAU;
/** Is chain i in front of the target at height s? */
const chainFront = (i: number, s: number) => Math.cos(chainAngle(i, s)) > 0;
/** Point of chain i at height s; `squeeze` < 1 closes it on the body. */
function chainAt(box: Box, i: number, s: number, squeeze: number): Point {
  // a little wider than the body at the feet, closing in towards the head
  const cx = box.x + box.w / 2, rx = (0.46 * box.w + 0.05 * box.h) * (1 - 0.36 * s) * squeeze;
  return { x: cx + rx * Math.sin(chainAngle(i, s)), y: box.y + box.h * (1 - s) };
}

/** Path of chain i from the ground up to `level` (share of the box height), coiled round
 *  the box. Lower levels are prefixes of higher ones: growing never moves the links below. */
export function doomChainPath(box: Box, i: number, level: number, squeeze = 1): Point[] {
  const top = clamp01(level), pts: Point[] = [];
  for (let k = 0; k <= SAMPLES && k / SAMPLES < top; k++) pts.push(chainAt(box, i, k / SAMPLES, squeeze));
  pts.push(chainAt(box, i, top, squeeze));
  return pts;
}

/** Link length (px) for a target box: legible on phones, not chunky on big bosses. */
const linkSize = (box: Box) => Math.min(30, Math.max(9, 0.11 * box.h));
/** Links overlap a little along the chain, so they read as interlocked. */
const LINK_STEP = 0.88;

/** Purple-black links with a violet rim, their glow and the flash of a toll. */
const CHAIN = { link: '#170a26', edge: '#4a2a78', rim: '#c3a0f5', glow: '#6c2fb5', flash: '#efe0ff', hole: '#12041f' };

/** One chain link at (x, y) along `ang`: face-on links are open rings, edge-on ones bars. */
function chainLink(g: Painter, x: number, y: number, ang: number, Lk: number, face: boolean, a: number, rim: number) {
  if (face) {
    g.put(x, y, 0.34 * Lk, 'anillo', CHAIN.link, a, ang, false, 1.75, 0.46);
    // only a toll's flash (rim > 1.2) turns the rims white; the lethal throb stays violet
    if (rim > 0.02) g.put(x, y, 0.3 * Lk, 'anillo', rim > 1.2 ? CHAIN.flash : CHAIN.rim, Math.min(1, rim) * a, ang, true, 1.8, 0.16);
  } else {
    // edge-on: one lit bar (the face-on rings either side carry the glow)
    const dx = Math.cos(ang) * 0.5 * Lk, dy = Math.sin(ang) * 0.5 * Lk;
    g.seg(x - dx, y - dy, x + dx, y + dy, 0.28 * Lk, rim > 1.2 ? CHAIN.rim : rim > 0.02 ? CHAIN.edge : CHAIN.link, a, 0, false);
  }
}

/** A link laid along a polyline: position, direction and how high it sits. */
interface LinkSpot { x: number; y: number; ang: number; s: number; j: number }
/** Links every `Lk` px along `pts` (arc length), the first `offset` px in. `hs` gives the
 *  height parameter of each point (for the depth test). */
function linksAlong(pts: Point[], Lk: number, offset = 0, hs?: number[]): LinkSpot[] {
  const out: LinkSpot[] = [];
  let acc = 0, next = Lk * 0.5 + offset, j = 0;
  const step = Lk * LINK_STEP;
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1], b = pts[k], len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 1e-6) continue;
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    while (next <= acc + len) {
      if (next >= 0) {
        const f = (next - acc) / len;
        const s = hs ? lerp(hs[k - 1], hs[k], f) : 0;
        out.push({ x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f), ang, s, j });
      }
      next += step;
      j++;
    }
    acc += len;
  }
  return out;
}

// ── the persistent overlay ──────────────────────────────────────────────────

/** A chain sprite: `front` ones go over the figure, the rest behind it. */
export interface DoomSprite extends Sprite { front?: boolean }
/** What the overlay of one enemy shows this frame. */
export interface DoomChainView {
  /** Height of the chains (share of the box). */
  level: number;
  /** Condena ≥ health and the chains are up: they throb. */
  lethal: boolean;
  /** 1 → 0 after a bell toll: a flash running up the links. */
  flash: number;
  /** Overall opacity (the puppet's, while it fades). */
  alpha: number;
}
/** Sprite cap of one enemy's chains. */
export const MAX_DOOM_CHAIN_SPRITES = 108;

/**
 * Chains coiled round `box` up to `view.level` at `t` seconds (any clock: it only drives
 * the throb and the motes). `layered`: the back links go behind the figure (WebGL stage);
 * without it everything is drawn over the figure, so the back links are dimmed.
 */
export function doomChainSprites(box: Box, view: DoomChainView, t: number, opts: { reduced?: boolean; layered?: boolean } = {}): DoomSprite[] {
  const alpha = clamp01(view.alpha);
  if (alpha <= 0.01 || view.level <= 0.005 || box.w < 2 || box.h < 2) return [];
  const g = new Painter(7, MAX_DOOM_CHAIN_SPRITES, opts.reduced ? REDUCED_DENSITY : 1);
  const out = g.out as DoomSprite[];
  const tag = (front: boolean, draw: () => void) => {
    const n0 = out.length;
    draw();
    for (let i = n0; i < out.length; i++) out[i].front = front;
  };
  const Lk = linkSize(box), level = Math.min(1, view.level);
  const back = opts.layered ? 1 : 0.45;
  const throb = view.lethal ? 0.3 + 0.35 * (1 + Math.sin(t * TAU * 0.75)) : 0;
  const flash = clamp01(view.flash), wave = 1.15 * (1 - flash) - 0.1;
  const hs: number[] = [];
  for (let k = 0; k <= SAMPLES && k / SAMPLES < level; k++) hs.push(k / SAMPLES);
  hs.push(level);
  for (let i = 0; i < DOOM_CHAIN_COUNT; i++) {
    const pts = doomChainPath(box, i, level);
    const base = pts[0], frontBase = chainFront(i, 0);
    // the hole each chain rises from
    tag(frontBase, () => g.put(base.x, base.y, 0.24 * Lk, 'anillo', CHAIN.hole, 0.8 * alpha * (frontBase ? 1 : back), 0, false, 3, 0.5));
    // violet glow under the chain (one soft bar per stretch), stronger when lethal or tolled
    if (!opts.reduced) {
      const ga = (0.2 + 0.28 * throb + 0.5 * flash) * alpha;
      for (let k = 0; k < pts.length - 1; k += 8) {
        const a = pts[k], e = pts[Math.min(pts.length - 1, k + 8)];
        // always behind the figure: an aura round its outline, not a haze over it
        tag(false, () => g.seg(a.x, a.y, e.x, e.y, 0.8 * Lk, CHAIN.glow, ga * back));
      }
    }
    for (const l of linksAlong(pts, Lk, 0, hs)) {
      const front = chainFront(i, l.s);
      const near = flash > 0 ? Math.exp(-(((l.s - wave) / 0.12) ** 2)) : 0;
      // the topmost links are a touch fainter, as if still rising out of the dark
      const tip = 1 - 0.4 * span(l.s, level - 0.06, level);
      const rim = (front ? 0.75 : 0.35) + 0.35 * throb + 0.9 * near + 0.3 * flash;
      tag(front, () => chainLink(g, l.x, l.y, l.ang, Lk, l.j % 2 === 0, alpha * tip * (front ? 1 : back), opts.reduced && !front ? 0 : rim));
    }
  }
  // lethal: a shackle of links closes round the top, and motes of the underworld climb
  if (view.lethal) {
    const cy = box.y + box.h * (1 - level + 0.06), rx = (0.46 * box.w + 0.05 * box.h) * (1 - 0.36 * level) * 1.05, ry = 0.28 * rx;
    const n = 8, spin = t * 0.25;
    for (let j = 0; j < n; j++) {
      const th = (j / n) * TAU + spin, front = Math.sin(th) > 0;
      const x = box.x + box.w / 2 + Math.cos(th) * rx, y = cy + Math.sin(th) * ry;
      const ang = Math.atan2(Math.cos(th) * ry, -Math.sin(th) * rx);
      tag(front, () => chainLink(g, x, y, ang, Lk * 0.9, j % 2 === 0, alpha * (front ? 1 : back), (front ? 0.8 : 0.4) + 0.35 * throb));
    }
  }
  if (view.lethal && !opts.reduced) {
    for (let m = 0; m < 4; m++) {
      const q = (t * 0.45 + m / 4) % 1, i = m % DOOM_CHAIN_COUNT, s = q * level;
      const p = chainAt(box, i, s, 1), f = chainFront(i, s);
      tag(f, () => g.dot(p.x, p.y - 0.3 * Lk, 0.18 * Lk, m % 2 ? CHAIN.rim : CHAIN.flash, alpha * Math.sin(Math.PI * q) * (f ? 0.9 : 0.9 * back)));
    }
  }
  return out;
}

// ── following each enemy across re-renders ──────────────────────────────────

interface Track {
  shown: number; target: number; lethal: boolean;
  /** Growth waits until then (a bell toll on its way). */
  growAt: number;
  tollAt: number;
  last: number;
}
/** Seconds the flash of a toll takes to run up the chains. */
const FLASH_TIME = 0.8;

/** Chains shown on each doomed enemy, kept apart from the DOM (rebuilt on every render):
 *  the level eases towards the Condena/health ratio, never restarting. Times in seconds. */
export class DoomChainTracker<K> {
  private readonly tracks = new Map<K, Track>();

  has(key: K): boolean { return this.tracks.has(key); }

  /** The enemy now has `condena` against `pv` health (call on every render). */
  set(key: K, condena: number, pv: number, now: number) {
    const target = doomChainLevel(condena, pv);
    let tr = this.tracks.get(key);
    if (!tr) {
      if (target <= 0) return;
      tr = { shown: 0, target, lethal: false, growAt: -Infinity, tollAt: -Infinity, last: now };
      this.tracks.set(key, tr);
    }
    else this.advance(tr, now);
    tr.target = target;
    tr.lethal = target >= DOOM_LEVEL_LETHAL;
  }

  /** A bell tolls over the enemy at `at`: the chains wait for it to grow, and flash with it. */
  toll(key: K, at: number) {
    let tr = this.tracks.get(key);
    if (!tr) { tr = { shown: 0, target: 0, lethal: false, growAt: at, tollAt: at, last: NaN }; this.tracks.set(key, tr); }
    tr.growAt = at;
    tr.tollAt = at;
  }

  /** Forgets the enemy at once (its death by Doom takes over the chains). */
  drop(key: K) { this.tracks.delete(key); }

  /** Eases the shown level towards the target up to `now`. */
  private advance(tr: Track, now: number) {
    if (Number.isNaN(tr.last)) tr.last = now;
    const dt = Math.max(0, now - Math.max(tr.last, tr.growAt));
    tr.last = Math.max(tr.last, now);
    const gap = tr.target - tr.shown;
    if (dt > 0 && gap !== 0) {
      // fast at first, then settling; sinking back into the ground is a little quicker
      const speed = gap > 0 ? Math.max(0.18, 2.2 * gap) : Math.max(0.25, 2.5 * -gap);
      tr.shown = gap > 0 ? Math.min(tr.target, tr.shown + speed * dt) : Math.max(tr.target, tr.shown - speed * dt);
    }
  }

  /** Advances the enemy's chains to `now`; null when it has none. */
  step(key: K, now: number): DoomChainView | null {
    const tr = this.tracks.get(key);
    if (!tr) return null;
    this.advance(tr, now);
    if (tr.target <= 0 && tr.shown <= 0 && now >= tr.growAt) { this.tracks.delete(key); return null; }
    const since = now - tr.tollAt;
    return {
      level: tr.shown,
      lethal: tr.lethal && tr.shown >= DOOM_LEVEL_LETHAL - 0.01,
      flash: since >= 0 && since < FLASH_TIME ? 1 - since / FLASH_TIME : 0,
      alpha: 1,
    };
  }
}

/** Seconds from casting the bell (`condena`) to its toll: the sound and the chains wait for it. */
export const DOOM_TOLL_AT = SPELLS.condena.duration * SPELLS.condena.phases[0];

// ── death by Doom: the chains close, the soul flees and is dragged under ────

/** Seconds of the death by Doom (deaths no longer hold the fight up: it plays over the fall). */
export const DOOMED_SOUL_DURATION = 3;
/** When the chains have shackled the soul and when they start dragging it, as fractions. */
const LATCH = 0.27, DRAG = 0.34;
/** Seconds into the death when the drag starts (the chains' sound). */
export const DOOM_DRAG_AT = DOOMED_SOUL_DURATION * DRAG;
/** End of the chains closing on the body, the drag reaching the bottom, and the rift closing. */
const TIGHT = 0.1, SUNK = 0.88, SHUT = 0.97;
/** The soul is the hero's (death-spells.ts `almaHeroe`): a faceless pale wisp. */
const SOUL = { halo: '#9fe8ff', tail: '#d8fff0', core: '#ffffff' };

/** Pose of the doomed soul over `box` at u (0..1): head centre, core and halo radii,
 *  opacity and how hard it strains upwards. It leaves the chest, darts up and sideways
 *  looking for a way out, is shackled, and the chains drag it slowly into the ground
 *  while it jerks upwards. Sized on the target so it reads on phones. */
export function doomSoulPose(box: Box, u: number) {
  const cx = box.x + box.w / 2, H = box.h, W = box.w, ground = box.y + H;
  // sized on the body's height (bodies are narrow), never a speck on a phone
  const core = Math.max(5, 0.07 * H), halo = Math.max(14, 0.18 * H);
  const apex = Math.max(1.3 * halo, box.y - 0.15 * H);
  const start = box.y + 0.42 * H;
  // free: up and sideways; shackled: a hard pull up held by the chains
  const rise = easeOut(span(u, 0.06, 0.25));
  let y = lerp(start, apex, rise);
  const dart = Math.sin(span(u, 0.06, LATCH) * TAU * 1.25) * (1 - span(u, LATCH, DRAG));
  let x = cx + 0.16 * W * dart;
  // dragged: down slowly, with jerks upwards (fast pull, slow give) that weaken
  const d = span(u, DRAG, SUNK);
  const sw = d * 3.2, fr = sw - Math.floor(sw);
  const jerk = d <= 0 || d >= 1 ? 0 : (fr < 0.3 ? easeOut(fr / 0.3) : 1 - smooth((fr - 0.3) / 0.7)) * (1 - 0.55 * d);
  const strain = u < LATCH ? 0 : u < DRAG ? bell(u, LATCH, DRAG + 0.04) : jerk;
  if (u > LATCH) {
    const below = ground + 0.14 * H;
    y = lerp(apex, below, smooth(d)) - 0.17 * H * jerk - 0.05 * H * (u < DRAG ? strain : 0);
    x = lerp(x, cx, smooth(span(u, LATCH, DRAG + 0.1))) + 0.05 * W * Math.sin(u * 40) * strain;
  }
  const alpha = smooth(span(u, 0.05, 0.1)) * (1 - smooth(span(u, 0.9, 0.98)));
  return { x, y, core, halo, alpha, strain };
}

/** Where chain i grips the soul: its tail, just under the head. */
function grip(p: ReturnType<typeof doomSoulPose>, i: number): Point {
  return { x: p.x + (i - 1) * 0.55 * p.halo, y: p.y + (0.95 + 0.25 * (i % 2)) * p.halo };
}

const almaCondenada: Build = (g, u, c, D) => {
  const { b, cx, k, W, H, ground } = geo(c);
  const t = u * D, Lk = linkSize(b);
  const p = doomSoulPose(b, u);
  const sunk = (y: number) => 1 - span(y, ground - 0.02 * H, ground + 0.05 * H);
  // the rift into the underworld: opens under the enemy as the drag begins, then seals
  const rift = easeOutBack01(span(u, DRAG - 0.06, DRAG + 0.06)) * (1 - easeIn(span(u, SUNK, SHUT)));
  if (rift > 0.01) {
    const rx = 0.5 * W * rift, ry = 0.11 * W * rift + 2;
    // no shader glow on such a flat ellipse: its halo would show the quad's edges
    g.ring(cx, ground, rx, ry, ry, '#0c0414', 0.9, false);
    g.ring(cx, ground, rx, ry, 3 * k, '#7a3fc7', 0.9, false);
    g.ring(cx, ground, rx * 0.86, ry * 0.8, 1.4 * k, CHAIN.rim, 0.6 * (0.7 + 0.3 * Math.sin(t * 9)), false);
    g.mark('grieta', cx, ground);
  }
  // the chains: they close on the body, their ends whip up to the fleeing soul and
  // shackle it, then they pull it down, sliding into the rift link by link
  const squeeze = 1 - 0.42 * easeInOut(span(u, 0, TIGHT));
  const climb = lerp(DOOM_LEVEL_LETHAL, 0.97, easeOut(span(u, 0, TIGHT)));
  const reach = easeIn(span(u, 0.15, LATCH));
  const straight = smooth(span(u, DRAG, DRAG + 0.14));
  const pull = Math.max(0, t - DOOM_DRAG_AT) * 0.55 * H;
  const shiver = (u >= LATCH && u < SUNK ? 1.5 + 2.5 * p.strain : 0) * k;
  const fade = 1 - span(u, SUNK - 0.02, SHUT);
  for (let i = 0; i < DOOM_CHAIN_COUNT; i++) {
    const coil = doomChainPath(b, i, climb, squeeze);
    const hs: number[] = coil.map((_, j) => Math.min(climb, j / SAMPLES));
    hs[hs.length - 1] = climb;
    // the free end reaching for the soul
    let pts = coil;
    if (reach > 0) {
      const tip = coil[coil.length - 1], P = grip(p, i);
      const end = { x: lerp(tip.x, P.x, reach), y: lerp(tip.y, P.y, reach) };
      const n = 6;
      for (let j = 1; j <= n; j++) {
        const f = j / n, o = Math.sin(Math.PI * f) * ((i - 1) * 0.12 * W * (1 - reach) + shiver * Math.sin(t * 60 + i * 2));
        pts = pts.concat({ x: lerp(tip.x, end.x, f) + o, y: lerp(tip.y, end.y, f) });
        hs.push(climb);
      }
      if (straight > 0) {
        // the coil unwinds into a taut line from the rift to the soul
        const A = { x: cx + (i - 1) * 0.22 * W * (1 - 0.4 * straight), y: ground + 0.02 * H };
        const m = pts.length - 1;
        pts = pts.map((q, j) => {
          const f = j / m, o = Math.sin(Math.PI * f) * shiver * Math.sin(t * 55 + i * 3 + f * 4);
          return { x: lerp(q.x, lerp(A.x, end.x, f) + o, straight), y: lerp(q.y, lerp(A.y, end.y, f), straight) };
        });
      }
      if (u >= LATCH && u < SUNK && p.y < ground) g.mark('grillete', end.x, end.y);
      // the snap of the shackle
      const sn = bell(u, LATCH, LATCH + 0.05);
      if (sn > 0) {
        g.ring(end.x, end.y, (0.3 + 0.6 * span(u, LATCH, LATCH + 0.05)) * p.halo, (0.3 + 0.6 * span(u, LATCH, LATCH + 0.05)) * p.halo, 2 * k, CHAIN.flash, sn);
        g.star(end.x, end.y, 0.8 * p.halo * sn, CHAIN.flash, sn, i);
      }
    }
    // violet glow under the taut chain while it holds
    const glow = (0.25 + 0.4 * bell(u, 0, TIGHT * 1.6) + 0.25 * p.strain) * fade;
    if (glow > 0.02 && !c.reduced) {
      for (let k2 = 0; k2 + 1 < pts.length; k2 += 4) {
        const a = pts[k2], e = pts[Math.min(pts.length - 1, k2 + 4)];
        g.seg(a.x, a.y, e.x, e.y, 0.7 * Lk, CHAIN.glow, 0.3 * glow * sunk(Math.max(a.y, e.y)));
      }
    }
    // links: a flash runs up them as they close; dragged ones slide into the ground
    for (const l of linksAlong(pts, Lk, -(pull % (2 * Lk * LINK_STEP)), hs)) {
      const vis = sunk(l.y) * fade;
      if (vis <= 0.01) continue;
      const front = straight > 0.5 || chainFront(i, l.s);
      const run = Math.exp(-(((l.s - 1.1 * span(u, 0, TIGHT * 1.5)) / 0.15) ** 2)) * (1 - span(u, TIGHT, TIGHT * 1.8));
      const rim = (front ? 0.8 : 0.4) + 0.9 * run + 0.4 * p.strain * (u >= LATCH ? 1 : 0);
      chainLink(g, l.x, l.y, l.ang, Lk, l.j % 2 === 0, vis * (front ? 1 : 0.5), c.reduced && !front ? 0 : rim);
      g.mark('eslabon', l.x, l.y);
    }
  }
  // the soul, faceless like the hero's: halo, white core and a streaming tail
  if (p.alpha > 0.01) {
    // the tail trails below while it flies up, then streams upwards as it strains to escape
    const dir = lerp(Math.PI / 2, -Math.PI / 2, smooth(span(u, LATCH - 0.03, DRAG + 0.04)));
    const side = Math.sin(dir) < 0.95 && Math.sin(dir) > -0.95 ? 1 : 0;
    const L = Math.max(36, 0.55 * H), n = g.n(14);
    let tail: Point = { x: p.x, y: p.y };
    for (let j = 1; j <= n; j++) {
      const f = j / n, sway = Math.sin(t * 8 - f * 5) * 0.18 * L * f * (1 + side);
      const x = p.x + Math.cos(dir) * L * f - Math.sin(dir) * sway, y = p.y + Math.sin(dir) * L * f + Math.cos(dir) * sway;
      const a = p.alpha * (1 - 0.85 * f) * sunk(y);
      g.dot(x, y, p.core * (1.05 - 0.6 * f), j % 2 ? SOUL.halo : SOUL.tail, 0.85 * a);
      tail = { x, y };
    }
    const a = p.alpha * sunk(p.y);
    g.dot(p.x, p.y, p.halo, SOUL.halo, 0.42 * a);
    g.dot(p.x, p.y, p.core, SOUL.core, a);
    g.mark('alma', p.x, p.y);
    g.mark('almaCola', tail.x, tail.y);
    // sparkles shed as it thrashes
    const m = g.n(8);
    for (let j = 0; j < m; j++) {
      const t0 = 0.12 + 0.09 * j, q = span(u, t0, t0 + 0.2);
      if (q <= 0 || q >= 1) continue;
      const src = doomSoulPose(b, t0);
      const sx = src.x + (g.r(j) - 0.5) * 2 * src.halo, sy = src.y - q * 0.6 * src.halo;
      g.star(sx, sy, 0.45 * src.halo, SOUL.tail, (1 - q) * sunk(sy) * src.alpha);
    }
  }
  // the rift seals with a last flash and a puff of violet sparks thrown up
  const shut = bell(u, SUNK, SHUT);
  if (shut > 0) {
    g.seg(cx - 0.5 * W * shut, ground, cx + 0.5 * W * shut, ground, 3 * k, CHAIN.flash, shut, 1);
    const n = g.n(10);
    for (let j = 0; j < n; j++) {
      const q = span(u, SUNK, 1);
      const f = fly(cx + (g.r(40 + j) - 0.5) * W * 0.8, ground, (g.r(50 + j) - 0.5) * 80 * k, -(60 + 90 * g.r(60 + j)) * k, q * D * 0.3, 400 * k);
      g.spark(f.x, f.y, 7 * k, -Math.PI / 2, j % 2 ? CHAIN.rim : CHAIN.glow, 1 - q);
    }
  }
};

/** easeOutBack clamped for scales that must not go negative. */
const easeOutBack01 = (v: number) => (v <= 0 ? 0 : v >= 1 ? 1 : 1 + 2.70158 * (v - 1) ** 3 + 1.70158 * (v - 1) ** 2);

SPELLS.almaCondenada = { duration: DOOMED_SOUL_DURATION, phases: [LATCH, DRAG], anchor: 'target', cap: 240, build: almaCondenada };
