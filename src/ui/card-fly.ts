/**
 * Flying cards on screen: draw, play, discard and reshuffle. Every flight runs on
 * a `position: fixed` clone animated with WAAPI (transform and opacity only), so
 * the real hand is never moved and nothing repaints continuously. Trajectories
 * and timings come from the pure card-motion module.
 */
import {
  DISCARD_MS, DISCARD_STAGGER_MS, DRAW_MS, REDUCED_MS, SHUFFLE_MS, SHUFFLE_STAGGER_MS,
  centerOf, discardFrames, distance, drawFrames, playDuration, playFrames, shuffleCount, shuffleFrames,
  type MotionFrame, type Point,
} from './card-motion.ts';
import { audio } from '../fx/audio.ts';

/** Hand states that must not travel with the clone. */
const HAND_CLASSES = ['seleccionada', 'pendiente', 'en-cola', 'en-curso', 'sin-energia', 'arrastrando', 'carta-llegando'];

export function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Runs the frames on `node` and removes it when done. Resolves when it has finished,
 * or when its time is up anyway: a hidden tab may freeze the animation timeline, and
 * the action queue must never wait on a flight that does not tick.
 */
function run(node: HTMLElement, frames: MotionFrame[], duration: number, delay = 0): Promise<void> {
  if (typeof node.animate !== 'function') {
    node.remove();
    return Promise.resolve();
  }
  const anim = node.animate(frames as unknown as Keyframe[], { duration, delay, fill: 'both' });
  const timeUp = new Promise<void>((resolve) => setTimeout(resolve, delay + duration + 120));
  return Promise.race([anim.finished.then(() => undefined, () => undefined), timeUp]).then(() => {
    anim.cancel();
    node.remove();
  });
}

/** Screen centre, tilt and scale of an element as it is drawn now (fan tilt, hover lift…). */
function pose(node: HTMLElement): { center: Point; angle: number; scale: number; w: number; h: number } {
  const r = node.getBoundingClientRect();
  let angle = 0;
  let scale = 1;
  const t = getComputedStyle(node).transform;
  if (t && t !== 'none' && typeof DOMMatrix === 'function') {
    const m = new DOMMatrix(t);
    angle = (Math.atan2(m.b, m.a) * 180) / Math.PI;
    scale = Math.hypot(m.a, m.b) || 1;
  }
  return { center: { x: r.left + r.width / 2, y: r.top + r.height / 2 }, angle, scale, w: node.offsetWidth, h: node.offsetHeight };
}

/** A bare copy of a hand card, fixed with its centre on `center`. */
function cardClone(card: HTMLElement, center: Point, w: number, h: number): HTMLElement {
  const clone = card.cloneNode(true) as HTMLElement;
  clone.classList.remove(...HAND_CLASSES);
  clone.removeAttribute('data-mano');
  clone.classList.add('carta-clon');
  clone.style.cssText = `left:${center.x - w / 2}px;top:${center.y - h / 2}px;width:${w}px;height:${h}px;`;
  return clone;
}

function pileCenter(pile: HTMLElement): Point {
  const r = pile.getBoundingClientRect();
  return centerOf({ x: r.left, y: r.top, w: r.width, h: r.height });
}

/**
 * A played card flies to `to` and fades as it arrives. `from` overrides where it
 * leaves (the point where a dragged card was dropped). Resolves on arrival.
 */
export function flyPlay(
  card: HTMLElement | null, to: Point,
  opts: { from?: { center: Point; scale: number } | null; impactMs?: number } = {},
): Promise<void> {
  if (!card?.isConnected) return Promise.resolve();
  const reduced = reducedMotion();
  const p = pose(card);
  const from = opts.from?.center ?? p.center;
  const clone = cardClone(card, from, p.w, p.h);
  document.body.appendChild(clone);
  const duration = playDuration(distance(from, to), { impactMs: opts.impactMs, reduced });
  const frames = playFrames(from, to, {
    reduced, startScale: opts.from?.scale ?? p.scale, startAngle: opts.from ? 0 : p.angle,
  });
  return run(clone, frames, duration);
}

/** The rare showcase, once shown, flies from the middle of the screen to `to`. */
export function flyShowcase(showcase: HTMLElement, to: Point): Promise<void> {
  const reduced = reducedMotion();
  const r = showcase.getBoundingClientRect();
  const from = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  // the CSS entrance gives way to the flight
  for (const a of showcase.getAnimations()) a.cancel();
  const frames = playFrames(from, to, { reduced, prefix: 'translate(-50%, -50%)', startScale: 1.7 });
  return run(showcase, frames, playDuration(distance(from, to), { reduced }));
}

/**
 * A drawn card flies face down from the draw pile (or the discard pile, for cards
 * taken back) and lands face up on `card`, its slot in the hand. The real card is
 * expected hidden meanwhile; `onLand` shows it again.
 */
export function flyDraw(card: HTMLElement, pile: HTMLElement, delay: number, onLand: () => void): void {
  if (!card.isConnected) {
    onLand();
    return;
  }
  // the card slides off its pile as it takes off
  if (delay > 0) setTimeout(() => audio.sfx('robar'), delay);
  else audio.sfx('robar');
  const reduced = reducedMotion();
  const p = pose(card);
  const wrap = document.createElement('div');
  wrap.className = 'carta-vuelo';
  wrap.style.cssText = `left:${p.center.x - p.w / 2}px;top:${p.center.y - p.h / 2}px;width:${p.w}px;height:${p.h}px;`;
  const face = card.cloneNode(true) as HTMLElement;
  face.classList.remove(...HAND_CLASSES);
  face.removeAttribute('data-mano');
  face.style.cssText = '';
  const back = document.createElement('div');
  back.className = 'carta-dorso';
  wrap.append(face, back);
  document.body.appendChild(wrap);
  const frames = drawFrames(pileCenter(pile), p.center, p.angle, { reduced });
  void run(wrap, frames, reduced ? REDUCED_MS : DRAW_MS, delay).then(onLand);
}

/** A card left in hand drops into the discard pile (`card` is its old element, still on screen). */
export function flyDiscard(card: HTMLElement, pile: HTMLElement, index: number): void {
  if (!card.isConnected) return;
  if (index === 0) audio.sfx('descartar'); // one sweep for the whole batch
  const reduced = reducedMotion();
  if (reduced) return; // the pile counter says it; no motion needed
  const p = pose(card);
  const clone = cardClone(card, p.center, p.w, p.h);
  document.body.appendChild(clone);
  void run(clone, discardFrames(p.center, pileCenter(pile), { startAngle: p.angle }), DISCARD_MS, index * DISCARD_STAGGER_MS);
}

/**
 * Reshuffle: a few card backs jump from the discard pile to the draw pile.
 * Returns how long it lasts (0 when nothing is shown).
 */
export function flyShuffle(discardPile: HTMLElement, drawPile: HTMLElement, cards: number): number {
  if (cards > 0) audio.sfx('barajar');
  const n = shuffleCount(cards, reducedMotion());
  if (n === 0) return 0;
  const from = pileCenter(discardPile);
  const to = pileCenter(drawPile);
  for (let i = 0; i < n; i++) {
    const back = document.createElement('div');
    back.className = 'carta-dorso carta-dorso-suelta';
    back.style.cssText = `left:${from.x - 60}px;top:${from.y - 85}px;`;
    document.body.appendChild(back);
    void run(back, shuffleFrames(from, to, i), SHUFFLE_MS, i * SHUFFLE_STAGGER_MS);
  }
  return SHUFFLE_MS + (n - 1) * SHUFFLE_STAGGER_MS;
}
