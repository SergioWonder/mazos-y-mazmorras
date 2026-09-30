/**
 * Flying cards on screen: draw, play, discard and reshuffle. Every flight runs on
 * a `position: fixed` clone animated with WAAPI (transform and opacity only), so
 * the real hand is never moved and nothing repaints continuously. Trajectories
 * and timings come from the pure card-motion module.
 */
import {
  DISCARD_MS, DISCARD_STAGGER_MS, DRAW_MS, EXHAUST_HOP_MS, REDUCED_MS, SHUFFLE_MS, SHUFFLE_STAGGER_MS,
  centerOf, discardFrames, dissolveBudget, dissolveDelays, dissolvePlan, distance, drawFrames, exhaustFrames, exhaustPose,
  playDuration, playFrames, shuffleCount, shuffleFrames,
  type ClipFrame, type DissolveOptions, type MotionFrame, type Point,
} from './card-motion.ts';
import { audio } from '../fx/audio.ts';
import { fx, menosParticulas } from '../fx/particulas.ts';

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

/**
 * Like run, but the node stays on screen in its last pose (to burn away next).
 * Resolves on arrival, or when its time is up anyway.
 */
function runAndHold(node: HTMLElement, frames: MotionFrame[], duration: number): Promise<void> {
  const last = frames[frames.length - 1];
  const hold = () => {
    node.style.transform = last.transform;
    node.style.opacity = String(last.opacity);
  };
  if (typeof node.animate !== 'function') {
    hold();
    return Promise.resolve();
  }
  const anim = node.animate(frames as unknown as Keyframe[], { duration, fill: 'both' });
  const timeUp = new Promise<void>((resolve) => setTimeout(resolve, duration + 120));
  return Promise.race([anim.finished.then(() => undefined, () => undefined), timeUp]).then(() => {
    hold();
    anim.cancel();
  });
}

/** Where a card burns: the centre of its layout box, its size and the pose it is left in. */
interface BurnPose extends DissolveOptions { center: Point; w: number; h: number }

/**
 * The card `node` (a fixed clone or the rare showcase) burns away from a top corner:
 * a ragged incandescent edge eats it (clip-path keyframes on the card and on three thin
 * bands), glowing flakes and ash come off the edge into the fx canvas, and the card
 * rises slightly as it goes. Only transform, opacity and clip-path are animated.
 * Resolves once it is gone.
 */
function burn(node: HTMLElement, pose: BurnPose, delay = 0): Promise<void> {
  const plan = dissolvePlan(pose.w, pose.h, pose);
  node.classList.add('carta-ardiendo');
  if (typeof node.animate !== 'function') {
    node.remove();
    return Promise.resolve();
  }
  const timing = { duration: plan.duration, delay, fill: 'both' as const };
  const anims: Animation[] = [node.animate(plan.lift as unknown as Keyframe[], timing)];
  const layer = (cls: string, frames: ClipFrame[] | MotionFrame[]) => {
    if (!frames.length) return;
    const div = document.createElement('div');
    div.className = cls;
    node.appendChild(div);
    anims.push(div.animate(frames as unknown as Keyframe[], timing));
  };
  if (plan.card.length) anims.push(node.animate(plan.card as unknown as Keyframe[], timing));
  layer('carta-quemado', plan.char);
  layer('carta-brasa', plan.glow);
  layer('carta-filo', plan.core);
  if (plan.card.length) layer('carta-destello', plan.flash);
  // embers leave the edge in a few batches, mapped from the card to the screen
  const rad = ((pose.angle ?? 0) * Math.PI) / 180;
  const s = pose.scale ?? 1;
  const cx = pose.center.x + (pose.dx ?? 0), cy = pose.center.y + (pose.dy ?? 0);
  const batches = new Map<number, typeof plan.embers>();
  for (const e of plan.embers) batches.set(e.at, [...(batches.get(e.at) ?? []), e]);
  const timers: ReturnType<typeof setTimeout>[] = [];
  for (const [at, list] of batches) {
    timers.push(setTimeout(() => {
      if (!node.isConnected) return;
      const rise = -16 * s * (at / plan.duration);
      for (const e of list) {
        const lx = (e.x - pose.w / 2) * s, ly = (e.y - pose.h / 2) * s;
        fx.emitir(e.preset, cx + lx * Math.cos(rad) - ly * Math.sin(rad), cy + rise + lx * Math.sin(rad) + ly * Math.cos(rad), 1);
      }
    }, delay + at));
  }
  const timeUp = new Promise<void>((resolve) => setTimeout(resolve, delay + plan.duration + 120));
  return Promise.race([anims[0].finished.then(() => undefined, () => undefined), timeUp]).then(() => {
    for (const t of timers) clearTimeout(t);
    for (const a of anims) a.cancel();
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
  opts: { from?: { center: Point; scale: number } | null; impactMs?: number; exhaust?: boolean } = {},
): Promise<void> {
  if (!card?.isConnected) return Promise.resolve();
  const reduced = reducedMotion();
  const p = pose(card);
  const from = opts.from?.center ?? p.center;
  const clone = cardClone(card, from, p.w, p.h);
  document.body.appendChild(clone);
  const motion = { reduced, startScale: opts.from?.scale ?? p.scale, startAngle: opts.from ? 0 : p.angle };
  if (!opts.exhaust) return run(clone, playFrames(from, to, motion), playDuration(distance(from, to), { impactMs: opts.impactMs, reduced }));
  // an exhausted card rises toward its target and burns away there while the hero's blow
  // lands (the play waits for the impact itself): the short hop does not wait for it
  const end = reduced ? { dx: 0, dy: 0, angle: motion.startAngle, scale: motion.startScale } : exhaustPose(from, to, motion);
  const hop = reduced ? REDUCED_MS : EXHAUST_HOP_MS;
  return runAndHold(clone, exhaustFrames(from, to, motion), hop).then(() => {
    void burnSolo(clone, { center: from, w: p.w, h: p.h, ...end, reduced });
  });
}

/** The rare showcase, once shown, flies from the middle of the screen to `to` (or burns on the way, if it exhausts). */
export function flyShowcase(showcase: HTMLElement, to: Point, opts: { exhaust?: boolean } = {}): Promise<void> {
  const reduced = reducedMotion();
  const r = showcase.getBoundingClientRect();
  const from = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  // the CSS entrance gives way to the flight
  for (const a of showcase.getAnimations()) a.cancel();
  const prefix = 'translate(-50%, -50%)';
  if (!opts.exhaust) return run(showcase, playFrames(from, to, { reduced, prefix, startScale: 1.7 }), playDuration(distance(from, to), { reduced }));
  const end = reduced ? { dx: 0, dy: 0, angle: 0, scale: 1.7 } : exhaustPose(from, to, { startScale: 1.7 });
  const hop = reduced ? REDUCED_MS : EXHAUST_HOP_MS;
  return runAndHold(showcase, exhaustFrames(from, to, { reduced, prefix, startScale: 1.7 }), hop).then(() => {
    void burnSolo(showcase, { center: from, w: showcase.offsetWidth, h: showcase.offsetHeight, ...end, prefix: `${prefix} `, reduced });
  });
}

/** One card burning on its own: its own sound and the whole ember budget. */
function burnSolo(node: HTMLElement, p: BurnPose): Promise<void> {
  audio.sfx('verCarta', 0.6);
  return burn(node, {
    ...p, fewer: menosParticulas(), budget: dissolveBudget(1), seed: Math.random() * 10, dir: Math.random() < 0.5 ? 1 : -1,
  });
}

/**
 * A card exhausted from the hand (an effect, the Spectral Ray at the end of the turn…)
 * burns away where it is. `card` is its old element, still on screen; `index` and
 * `total` place it in the batch exhausted together (staggered, with a shared ember cap).
 */
export function flyExhaust(card: HTMLElement, index = 0, total = 1): void {
  if (!card.isConnected) return;
  const reduced = reducedMotion();
  if (index === 0) audio.sfx('verCarta', 0.6); // one crackle for the whole batch
  const p = pose(card);
  const clone = cardClone(card, p.center, p.w, p.h);
  document.body.appendChild(clone);
  const delay = dissolveDelays(total, reduced)[index] ?? 0;
  void burn(clone, {
    center: p.center, w: p.w, h: p.h, angle: p.angle, scale: p.scale, reduced,
    fewer: menosParticulas(), budget: dissolveBudget(total), seed: index * 2.7 + Math.random(), dir: index % 2 === 0 ? 1 : -1,
  }, delay);
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
