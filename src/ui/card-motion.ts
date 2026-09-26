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
