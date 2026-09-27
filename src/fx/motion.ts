// Animation kit for hand-authored action timelines (PuppetRig.actions): easing
// curves with character and a builder for the classic strike beats —
// anticipation, a snapping blow that lands exactly on the impact fraction, a
// short hit-stop, follow-through (overshoot) and settle. Pure, no DOM.

import type { Keyframe, PartialPose } from './puppet.ts';

type Ease = (t: number) => number;

const C1 = 1.70158, C3 = C1 + 1;
const WHIP = 2.6;

/** Easing curves: all start at 0 and end at 1. The easing of a keyframe shapes
 *  the segment that arrives at it. */
export const EASE = {
  linear: (t: number) => t,
  /** In-out cubic, the generic default. */
  smooth: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeIn: (t: number) => t * t * t,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 4),
  /** Hangs, then snaps: the blow itself. */
  expoIn: (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, 10 * t - 10)),
  /** Bursts out and brakes hard: recoils, lunges. */
  expoOut: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  /** Pulls back before moving (anticipation inside one segment). */
  backIn: (t: number) => C3 * t * t * t - C1 * t * t,
  /** Goes past the target and comes back (overshoot inside one segment). */
  backOut: (t: number) => 1 + C3 * Math.pow(t - 1, 3) + C1 * Math.pow(t - 1, 2),
  /** Springy wobble around the target (cloth snapping, a staggered landing). */
  elasticOut: (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((10 * t - 0.75) * ((2 * Math.PI) / 3)) + 1),
  /** Strong wind-up then a whip crack. */
  whip: (t: number) => (WHIP + 1) * t * t * t - WHIP * t * t,
  /** Holds the previous pose for the whole segment and jumps at the end. */
  step: (t: number) => (t < 1 ? 0 : 1),
} satisfies Record<string, Ease>;

export interface StrikeSpec {
  /** Fraction of the action where the blow lands (use puppetImpact / impactFraction for attacks). */
  impact: number;
  /** Coiled pose: weapon drawn back, weight on the back foot. */
  anticipation: PartialPose;
  /** Pose at the very moment of the impact. */
  strike: PartialPose;
  /** Follow-through past the strike. */
  overshoot?: PartialPose;
  /** Pose on the way back, before rest. */
  settle?: PartialPose;
  /** Where the coil peaks (default 0.72 × impact). */
  coilAt?: number;
  /** Frozen time right after the impact, as a fraction (default 0.05). */
  hitStop?: number;
  /** Where the follow-through peaks and where the settle pose is reached. */
  overshootAt?: number;
  settleAt?: number;
  /** Easing of each beat. */
  ease?: { coil?: Ease; strike?: Ease; overshoot?: Ease; settle?: Ease; recover?: Ease };
}

/**
 * Keyframes of a strike: rest → anticipation → strike (exactly at `impact`) →
 * hit-stop → overshoot → settle → rest. Works for spells too (impact = the
 * moment the magic bursts out).
 */
export function strikeKeys(s: StrikeSpec): Keyframe[] {
  const e = s.ease ?? {};
  const impact = s.impact;
  const hold = Math.max(0, s.hitStop ?? 0.05);
  const coilAt = Math.min(impact - 0.02, s.coilAt ?? impact * 0.72);
  const after = impact + hold, tail = 1 - after;
  const keys: Keyframe[] = [[0, {}]];
  if (coilAt > 0.01) keys.push([coilAt, s.anticipation, e.coil ?? EASE.easeOut]);
  keys.push([impact, s.strike, e.strike ?? EASE.expoIn]);
  if (hold > 0) keys.push([after, s.strike, EASE.linear]);
  if (s.overshoot) keys.push([s.overshootAt ?? after + tail * 0.25, s.overshoot, e.overshoot ?? EASE.easeOut]);
  if (s.settle) keys.push([s.settleAt ?? after + tail * 0.6, s.settle, e.settle ?? EASE.smooth]);
  keys.push([1, {}, e.recover ?? EASE.smooth]);
  return keys;
}

/** Deterministic tremble (e.g. during a hit-stop), in -amp..amp. */
export function shake(t: number, amp: number, hz = 30): number {
  return amp * (Math.sin(t * 2 * Math.PI * hz) * 0.6 + Math.sin(t * 2 * Math.PI * hz * 1.7 + 1.3) * 0.4);
}

/** 0 → 1 → 0 bump over [a, b] (a squash pulse, a flash of the smear…). */
export function pulse(q: number, a: number, b: number): number {
  if (q <= a || q >= b) return 0;
  return Math.sin(((q - a) / (b - a)) * Math.PI);
}
