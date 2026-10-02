/**
 * Card motion: trajectories, staggers and destinations of the flying cards
 * (draw, play, discard, reshuffle). Pure module: no DOM, so the smoke test can
 * drive it. The UI turns the frames into WAAPI animations on fixed clones and
 * only ever animates `transform` and `opacity` (cheap on phones).
 */

export interface Point { x: number; y: number }
export interface Box { x: number; y: number; w: number; h: number }
export type TargetMode = 'enemigo' | 'todos' | 'propio' | 'ninguno';
export type CardKind = 'ataque' | 'habilidad' | 'poder';

/** A WAAPI keyframe restricted to compositor-friendly properties. */
export interface MotionFrame {
  transform: string;
  opacity: number;
  offset?: number;
  easing?: string;
}

export const DRAW_STAGGER_MS = 75;
export const DRAW_MS = 380;
export const DISCARD_MS = 300;
export const DISCARD_STAGGER_MS = 35;
export const SHUFFLE_MS = 320;
export const SHUFFLE_STAGGER_MS = 45;
export const SHUFFLE_MAX_CARDS = 5;
export const PLAY_MIN_MS = 260;
export const PLAY_MAX_MS = 520;
/** Fade that replaces every flight under prefers-reduced-motion. */
export const REDUCED_MS = 140;
/** Glide of the cards left in the hand to their new slots (after a play, a draw…). */
export const REFLOW_MS = 260;

export const centerOf = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
export const distance = (a: Point, b: Point): number => Math.hypot(b.x - a.x, b.y - a.y);

export interface PlayScene {
  mode: TargetMode;
  kind: CardKind;
  /** The card's spell lights up on the hero (a shield, a buff…). */
  selfFx?: boolean;
  /** The chosen enemy (single-target cards). */
  target?: Box | null;
  hero?: Box | null;
  /** Living enemies. */
  enemies: Box[];
  /** Where the card leaves from. */
  from: Point;
  viewport: { w: number; h: number };
}

export type Aim = 'enemy' | 'hero' | 'enemies' | 'up';
export interface Destination { point: Point; aim: Aim }

/**
 * Where a played card flies: to its enemy, to the hero for skills, defences and
 * powers without a target, to the middle of the enemies for area cards, or
 * straight up when there is nobody to aim at.
 */
export function playDestination(s: PlayScene): Destination {
  if (s.mode === 'enemigo' && s.target) return { point: centerOf(s.target), aim: 'enemy' };
  const onHero = s.mode === 'propio' || (s.mode === 'ninguno' && (s.kind !== 'ataque' || !!s.selfFx));
  if (onHero && s.hero) return { point: centerOf(s.hero), aim: 'hero' };
  if (s.enemies.length > 0 && s.mode !== 'propio') {
    const cs = s.enemies.map(centerOf);
    return {
      point: { x: cs.reduce((t, c) => t + c.x, 0) / cs.length, y: cs.reduce((t, c) => t + c.y, 0) / cs.length },
      aim: 'enemies',
    };
  }
  return { point: { x: s.from.x, y: Math.max(40, s.from.y - s.viewport.h * 0.35) }, aim: 'up' };
}

/** Start delay of each of `n` cards drawn together (after an optional reshuffle). */
export function drawDelays(n: number, opts: { reduced?: boolean; after?: number } = {}): number[] {
  const after = opts.reduced ? 0 : opts.after ?? 0;
  const step = opts.reduced ? 0 : DRAW_STAGGER_MS;
  return Array.from({ length: Math.max(0, n) }, (_, i) => after + i * step);
}

/**
 * Length of a play flight: longer for far targets, never shorter than the hero's
 * swing (the card lands with the blow), and within [PLAY_MIN_MS, PLAY_MAX_MS].
 */
export function playDuration(dist: number, opts: { impactMs?: number; reduced?: boolean } = {}): number {
  if (opts.reduced) return REDUCED_MS;
  const base = 220 + Math.max(0, dist) * 0.3;
  return Math.round(Math.min(PLAY_MAX_MS, Math.max(PLAY_MIN_MS, base, opts.impactMs ?? 0)));
}

const px = (n: number) => `${Math.round(n * 10) / 10}px`;
const move = (from: Point, to: Point) => `translate(${px(to.x - from.x)}, ${px(to.y - from.y)})`;

/** Plain fade in place: the reduced-motion stand-in for every flight. */
export function fadeFrames(prefix = '', out = true): MotionFrame[] {
  const t = `${prefix}translate(0px, 0px)`.trim();
  return out
    ? [{ transform: t, opacity: 1 }, { transform: t, opacity: 0 }]
    : [{ transform: t, opacity: 0 }, { transform: t, opacity: 1 }];
}

/**
 * A played card flies from `from` to `to`, shrinking and spinning, and fades as it
 * arrives. `prefix` keeps a base transform (the rare showcase is centred with
 * translate(-50%, -50%)); `startScale` is its size when it leaves.
 */
export function playFrames(
  from: Point, to: Point,
  opts: { reduced?: boolean; prefix?: string; startScale?: number; startAngle?: number } = {},
): MotionFrame[] {
  const prefix = opts.prefix ? `${opts.prefix} ` : '';
  if (opts.reduced) return fadeFrames(prefix);
  const s0 = opts.startScale ?? 1;
  const a0 = opts.startAngle ?? 0;
  const spin = (to.x >= from.x ? 1 : -1) * 16;
  // a slight arc: the card rises a bit before diving onto its target
  const mid = { x: from.x + (to.x - from.x) * 0.55, y: from.y + (to.y - from.y) * 0.45 - 30 };
  return [
    { transform: `${prefix}${move(from, from)} rotate(${a0}deg) scale(${s0})`, opacity: 1, offset: 0 },
    { transform: `${prefix}${move(from, mid)} rotate(${spin * 0.5}deg) scale(${s0 * 0.7})`, opacity: 1, offset: 0.55 },
    { transform: `${prefix}${move(from, to)} rotate(${spin}deg) scale(${s0 * 0.28})`, opacity: 0, offset: 1 },
  ].map((f, i) => (i === 0 ? { ...f, easing: 'cubic-bezier(0.3, 0, 0.6, 1)' } : f));
}

/**
 * A drawn card leaves the draw pile face down, small, and lands face up in its
 * slot of the hand (`angle` is its tilt in the fan). The clone sits on its slot,
 * so the flight ends at translate(0, 0).
 */
export function drawFrames(pile: Point, slot: Point, angle: number, opts: { reduced?: boolean } = {}): MotionFrame[] {
  if (opts.reduced) return fadeFrames('', false);
  const back = { x: pile.x - slot.x, y: pile.y - slot.y };
  const mid = { x: back.x * 0.45, y: back.y * 0.45 - 40 };
  return [
    { transform: `perspective(800px) translate(${px(back.x)}, ${px(back.y)}) rotate(0deg) rotateY(180deg) scale(0.4)`, opacity: 0, offset: 0, easing: 'cubic-bezier(0.25, 0.6, 0.35, 1)' },
    { transform: `perspective(800px) translate(${px(back.x)}, ${px(back.y)}) rotate(0deg) rotateY(180deg) scale(0.45)`, opacity: 1, offset: 0.1 },
    { transform: `perspective(800px) translate(${px(mid.x)}, ${px(mid.y)}) rotate(${angle * 0.5}deg) rotateY(90deg) scale(0.8)`, opacity: 1, offset: 0.55 },
    { transform: `perspective(800px) translate(0px, 0px) rotate(${angle}deg) rotateY(0deg) scale(1)`, opacity: 1, offset: 1 },
  ];
}

/** A card left in hand at the end of the turn drops into the discard pile. */
export function discardFrames(from: Point, pile: Point, opts: { reduced?: boolean; startAngle?: number } = {}): MotionFrame[] {
  if (opts.reduced) return fadeFrames();
  const a0 = opts.startAngle ?? 0;
  return [
    { transform: `${move(from, from)} rotate(${a0}deg) scale(1)`, opacity: 1, offset: 0, easing: 'cubic-bezier(0.4, 0, 0.7, 1)' },
    { transform: `${move(from, pile)} rotate(${a0 + 24}deg) scale(0.3)`, opacity: 0.2, offset: 1 },
  ];
}

/** How many card backs cross from the discard pile to the draw pile on a reshuffle. */
export function shuffleCount(cards: number, reduced = false): number {
  return reduced ? 0 : Math.min(SHUFFLE_MAX_CARDS, Math.max(0, cards));
}

/** A card back jumping from the discard pile to the draw pile (reshuffle). */
export function shuffleFrames(discard: Point, draw: Point, i: number): MotionFrame[] {
  const lift = -50 - (i % 3) * 14;
  const mid = { x: discard.x + (draw.x - discard.x) / 2, y: Math.min(discard.y, draw.y) + lift };
  return [
    { transform: `${move(discard, discard)} rotate(0deg) scale(0.35)`, opacity: 0, offset: 0 },
    { transform: `${move(discard, discard)} rotate(0deg) scale(0.35)`, opacity: 1, offset: 0.1 },
    { transform: `${move(discard, mid)} rotate(${-90 + i * 12}deg) scale(0.4)`, opacity: 1, offset: 0.5 },
    { transform: `${move(discard, draw)} rotate(-180deg) scale(0.35)`, opacity: 0, offset: 1 },
  ];
}

// ── Exhausted cards: they burn away from an edge ────────────────────────────────

export const DISSOLVE_MS = 780;
/** Reduced motion: a short fade in place, no burning edge, no embers. */
export const DISSOLVE_REDUCED_MS = 200;
export const DISSOLVE_STAGGER_MS = 90;
/** Embers one card sheds (particles on the fx canvas). */
export const DISSOLVE_MAX_EMBERS = 32;
/** Embers a whole batch may shed (the Spectral Ray exhausting a full hand). */
export const DISSOLVE_BATCH_EMBERS = 100;
/** Share of the dissolve spent on the anticipation: the card flares before the edge bites. */
const DISSOLVE_LEAD = 0.1;
const EDGE_POINTS = 16;
const DISSOLVE_KEYS = 10;
const EMBER_STEPS = 12;
/** How far the edge reaches beyond the sides (the clip covers the whole border box). */
const EDGE_OVERHANG = 4;
const EDGE_SLOPE = 0.3;

/** A keyframe of a clip-path animation (the burning edge). */
export interface ClipFrame { clipPath: string; offset: number }
export type EmberPreset = 'brasaCarta' | 'cenizaCarta';
/** One ember shed at `at` ms from the card-local point (x, y) (0,0 = top left corner). */
export interface EmberBurst { at: number; x: number; y: number; preset: EmberPreset }

export interface DissolvePlan {
  duration: number;
  /** Clip of the card: what is left below the burning edge. */
  card: ClipFrame[];
  /** Scorched band right under the edge. */
  char: ClipFrame[];
  /** Incandescent band along the edge. */
  glow: ClipFrame[];
  /** White-hot line on the very edge. */
  core: ClipFrame[];
  /** The card body: a slight rise while it burns (transform and opacity only). */
  lift: MotionFrame[];
  /** Warm flash over the card (anticipation). */
  flash: MotionFrame[];
  embers: EmberBurst[];
}

export interface DissolveOptions {
  reduced?: boolean;
  /** «Reduce particles»: half the embers. */
  fewer?: boolean;
  seed?: number;
  /** Embers for this card (see dissolveBudget); defaults to DISSOLVE_MAX_EMBERS. */
  budget?: number;
  /** Pose the card is left in: base transform, offset from its box, tilt and scale. */
  prefix?: string;
  dx?: number;
  dy?: number;
  angle?: number;
  scale?: number;
  /** Which corner burns first: 1 the top right one, -1 the top left one. */
  dir?: 1 | -1;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const clip = (pts: Point[]) => `polygon(${pts.map((p) => `${r1(p.x)}px ${r1(p.y)}px`).join(', ')})`;
/** Smooth, bounded (|n| <= 1) flicker of edge vertex `i` at progress `p`. */
const flicker = (i: number, p: number, seed: number) =>
  0.55 * Math.sin(i * 2.1 + seed * 1.7 + p * 7) + 0.3 * Math.sin(i * 4.3 + seed * 0.9 - p * 11)
  + 0.15 * Math.sin(i * 7.7 + seed * 3.1 + p * 3);
const edgeJitter = (h: number) => Math.max(3, h * 0.05);
/** Burn progress (0..1) at time offset `o` (0..1): it holds during the anticipation, then eases through. */
export function dissolveProgress(o: number): number {
  if (o <= DISSOLVE_LEAD) return 0;
  const u = (o - DISSOLVE_LEAD) / (1 - DISSOLVE_LEAD);
  return u * 0.5 + u * u * (3 - 2 * u) * 0.5;
}

/**
 * The burning edge at progress `p` (0 = above the card, 1 = past its bottom): a
 * tilted, ragged line across the card, in card-local pixels.
 */
export function dissolveEdge(p: number, w: number, h: number, seed = 0, dir: 1 | -1 = 1): Point[] {
  const jitter = edgeJitter(h);
  const reach = EDGE_SLOPE * (w / 2 + EDGE_OVERHANG) + jitter + 1;
  const base = -reach + (h + EDGE_OVERHANG + 2 * reach) * p;
  return Array.from({ length: EDGE_POINTS }, (_, i) => {
    const x = -EDGE_OVERHANG + ((w + 2 * EDGE_OVERHANG) * i) / (EDGE_POINTS - 1);
    return { x, y: base + EDGE_SLOPE * (x - w / 2) * dir + jitter * flicker(i, p, seed) };
  });
}

/** A band hanging under the edge, `thick(i)` pixels deep at vertex i. */
function band(edge: Point[], thick: (i: number) => number): string {
  const under = edge.map((q, i) => ({ x: q.x, y: q.y + thick(i) })).reverse();
  return clip([...edge, ...under]);
}

/** Height of the edge at `x` (linear between its vertices). */
function edgeYAt(edge: Point[], x: number): number {
  for (let i = 1; i < edge.length; i++) {
    if (x <= edge[i].x) {
      const a = edge[i - 1], b = edge[i];
      return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x || 1);
    }
  }
  return edge[edge.length - 1].y;
}

/** Embers each of `n` cards exhausted together may shed (the batch keeps a cap). */
export function dissolveBudget(n: number, fewer = false): number {
  const each = Math.min(DISSOLVE_MAX_EMBERS, Math.floor(DISSOLVE_BATCH_EMBERS / Math.max(1, n)));
  return fewer ? Math.ceil(each / 2) : each;
}

/** Start delay of each of `n` cards exhausted together. */
export function dissolveDelays(n: number, reduced = false): number[] {
  return Array.from({ length: Math.max(0, n) }, (_, i) => (reduced ? 0 : i * DISSOLVE_STAGGER_MS));
}

/**
 * How a card of w×h pixels burns away: a ragged edge sweeps down from a top corner
 * (clip-path keyframes for the card and its scorched and incandescent bands), embers
 * and ash come off the edge as it passes, and the card rises slightly as it goes.
 */
export function dissolvePlan(w: number, h: number, opts: DissolveOptions = {}): DissolvePlan {
  const prefix = opts.prefix ?? '';
  const dx = opts.dx ?? 0, dy = opts.dy ?? 0, a0 = opts.angle ?? 0, s0 = opts.scale ?? 1;
  const dir = opts.dir ?? 1;
  const seed = opts.seed ?? 0;
  const at = (x: number, y: number, a: number, s: number) =>
    `${prefix}translate(${px(x)}, ${px(y)}) rotate(${r1(a)}deg) scale(${Math.round(s * 1000) / 1000})`;
  if (opts.reduced) {
    const still = at(dx, dy, a0, s0);
    return {
      duration: DISSOLVE_REDUCED_MS, card: [], char: [], glow: [], core: [], embers: [],
      lift: [{ transform: still, opacity: 1 }, { transform: still, opacity: 0 }],
      flash: [{ transform: 'translate(0px, 0px)', opacity: 0 }, { transform: 'translate(0px, 0px)', opacity: 0 }],
    };
  }
  const offsets = [0, DISSOLVE_LEAD, ...Array.from({ length: DISSOLVE_KEYS }, (_, k) => DISSOLVE_LEAD + ((1 - DISSOLVE_LEAD) * (k + 1)) / DISSOLVE_KEYS)];
  offsets[offsets.length - 1] = 1;
  const glowDepth = Math.max(3, h * 0.04);
  const coreDepth = Math.max(1.2, h * 0.012);
  const charDepth = Math.max(10, h * 0.13);
  const card: ClipFrame[] = [], char: ClipFrame[] = [], glow: ClipFrame[] = [], core: ClipFrame[] = [];
  for (const offset of offsets) {
    const p = dissolveProgress(offset);
    const edge = dissolveEdge(p, w, h, seed, dir);
    const bottom = h + EDGE_OVERHANG;
    card.push({ offset, clipPath: clip([...edge, { x: w + EDGE_OVERHANG, y: bottom }, { x: -EDGE_OVERHANG, y: bottom }]) });
    char.push({ offset, clipPath: band(edge, (i) => charDepth * (0.65 + 0.35 * Math.abs(Math.sin(i * 1.9 + seed + p * 5)))) });
    glow.push({ offset, clipPath: band(edge, (i) => glowDepth * (0.6 + 0.4 * Math.abs(Math.sin(i * 5.3 + seed + p * 13)))) });
    core.push({ offset, clipPath: band(edge, () => coreDepth) });
  }
  // embers come off the edge where it crosses the card, spread along it
  const count = opts.fewer ? Math.ceil((opts.budget ?? DISSOLVE_MAX_EMBERS) / 2) : opts.budget ?? DISSOLVE_MAX_EMBERS;
  const duration = DISSOLVE_MS;
  const embers: EmberBurst[] = [];
  for (let k = 0; k < count; k++) {
    const step = Math.floor((k * EMBER_STEPS) / Math.max(1, count));
    const offset = DISSOLVE_LEAD + 0.03 + ((0.9 - DISSOLVE_LEAD - 0.03) * (step + 0.5)) / EMBER_STEPS;
    const p = dissolveProgress(offset);
    const edge = dissolveEdge(p, w, h, seed, dir);
    let x = 4, y = edgeYAt(edge, 4), miss = Infinity;
    // golden-ratio walk across the width until it finds the stretch of edge on the card
    // (or the point of the edge closest to it)
    for (let tries = 0; tries < 24 && miss > 0; tries++) {
      const cx = 4 + (w - 8) * (((k + tries) * 0.618034 + seed * 0.1) % 1);
      const cy = edgeYAt(edge, cx);
      const off = Math.max(0, 2 - cy, cy - (h - 2));
      if (off < miss) { miss = off; x = cx; y = cy; }
    }
    embers.push({
      at: Math.round(offset * duration),
      x: r1(Math.min(w, Math.max(0, x))), y: r1(Math.min(h - 2, Math.max(2, y))),
      preset: k % 2 === 1 ? 'cenizaCarta' : 'brasaCarta',
    });
  }
  const rise = 16 * s0;
  const lift: MotionFrame[] = [
    { transform: at(dx, dy, a0, s0), opacity: 1, offset: 0, easing: 'cubic-bezier(0.3, 0, 0.5, 1)' },
    { transform: at(dx, dy - 3 * s0, a0, s0 * 1.03), opacity: 1, offset: DISSOLVE_LEAD },
    { transform: at(dx + 4 * dir * s0, dy - rise * 0.8, a0 + 2 * dir, s0 * 1.045), opacity: 1, offset: 0.9 },
    { transform: at(dx + 5 * dir * s0, dy - rise, a0 + 2.5 * dir, s0 * 1.05), opacity: 0, offset: 1 },
  ];
  const still = 'translate(0px, 0px)';
  const flash: MotionFrame[] = [
    { transform: still, opacity: 0, offset: 0 },
    { transform: still, opacity: 0.6, offset: DISSOLVE_LEAD * 0.85 },
    { transform: still, opacity: 0.18, offset: 0.4 },
    { transform: still, opacity: 0, offset: 0.7 },
  ];
  return { duration, card, char, glow, core, lift, flash, embers };
}

/** The short hop of a card that exhausts on play, before it burns (reduced motion: none). */
export const EXHAUST_HOP_MS = 220;

/** Where a card that exhausts on play stops to burn: 40% of the way to its target. */
export function exhaustPose(from: Point, to: Point, opts: { startScale?: number } = {}): { dx: number; dy: number; angle: number; scale: number } {
  const s0 = opts.startScale ?? 1;
  const spin = (to.x >= from.x ? 1 : -1) * 6;
  return { dx: (to.x - from.x) * 0.4, dy: (to.y - from.y) * 0.4, angle: spin, scale: Math.min(1, s0 * 0.8) };
}

/**
 * A played card that exhausts rises toward its target and stops, whole and visible,
 * 40% of the way there: it burns away on that spot (dissolvePlan) as its effect goes off.
 */
export function exhaustFrames(
  from: Point, to: Point,
  opts: { reduced?: boolean; prefix?: string; startScale?: number; startAngle?: number } = {},
): MotionFrame[] {
  const prefix = opts.prefix ? `${opts.prefix} ` : '';
  const s0 = opts.startScale ?? 1;
  const a0 = opts.startAngle ?? 0;
  const start = `${prefix}translate(0px, 0px) rotate(${a0}deg) scale(${s0})`;
  if (opts.reduced) return [{ transform: start, opacity: 1 }, { transform: start, opacity: 1 }];
  const end = exhaustPose(from, to, { startScale: s0 });
  return [
    { transform: start, opacity: 1, offset: 0, easing: 'cubic-bezier(0.25, 0.1, 0.3, 1)' },
    { transform: `${prefix}translate(${px(end.dx * 0.7)}, ${px(end.dy * 0.7 - 18)}) rotate(${r1(end.angle * 0.6)}deg) scale(${r1((s0 + end.scale) / 2)})`, opacity: 1, offset: 0.6 },
    { transform: `${prefix}translate(${px(end.dx)}, ${px(end.dy)}) rotate(${end.angle}deg) scale(${end.scale})`, opacity: 1, offset: 1 },
  ];
}

/** What the combat engine does with a played card, as far as the flight needs to know. */
export interface ExhaustRules { tipo: string; unUso?: boolean; exhumar?: boolean; alTopeDelMazo?: boolean }

/**
 * Whether a played card will end up exhausted (so it burns away instead of fading):
 * paid-off curses, one-use cards, Daggers and every «Exhaust» card, powers, and any
 * card under the Golden Ray; the Eldritch Blast always goes back on top of the deck.
 * Mirrors the end of Combate.jugarCarta, which reads the card's base definition.
 */
export function exhaustsWhenPlayed(def: ExhaustRules, playerStates: { cartasAgotan?: number }): boolean {
  if (def.tipo === 'maldicion' || def.unUso) return true;
  if (def.alTopeDelMazo) return false;
  return !!def.exhumar || def.tipo === 'poder' || (playerStates.cartasAgotan ?? 0) > 0;
}

// ── Hand reflow ──────────────────────────────────────────────────────────────
// When the hand changes, the cards that stay glide from their old slot to the new
// one (FLIP) instead of jumping: a card sliding under a still pointer is easy to
// follow, a card popping there gets clicked by mistake.

/** Where a card sits in the fan: its layout position and its fan pose (--ang, --alza). */
export interface SlotPose { x: number; y: number; ang: number; alza: number }
/** How far a card must be pushed back to look like it is still in its old slot. */
export interface ReflowDelta { dx: number; dy: number; dAng: number }
/** A reflow keyframe: individual transform properties, composed over the fan's CSS transform. */
export interface ReflowFrame { translate: string; rotate: string; offset?: number; easing?: string }

/** Offset from the new slot back to the old one, or null when the card did not move. */
export function reflowDelta(before: SlotPose, now: SlotPose): ReflowDelta | null {
  const dx = before.x - now.x;
  // the fan's lift is a translateY inside the (small) fan rotation: close enough to vertical
  const dy = before.y - now.y + (before.alza - now.alza);
  const dAng = before.ang - now.ang;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(dAng) < 0.2) return null;
  return { dx: Math.round(dx * 10) / 10, dy: Math.round(dy * 10) / 10, dAng: Math.round(dAng * 100) / 100 };
}

/** From the old slot to the new one, easing out so the card settles softly. */
export function reflowFrames(d: ReflowDelta): ReflowFrame[] {
  return [
    { translate: `${d.dx}px ${d.dy}px`, rotate: `${d.dAng}deg`, easing: 'cubic-bezier(0.25, 0.5, 0.35, 1)' },
    { translate: '0px 0px', rotate: '0deg' },
  ];
}

/** Length of the reflow: none under prefers-reduced-motion (the cards just appear in place). */
export function reflowDuration(reduced: boolean): number {
  return reduced ? 0 : REFLOW_MS;
}
