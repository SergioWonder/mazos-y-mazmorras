// Stateful per-sprite animation pipeline, shared by the WebGL stage and the SVG
// fallback (and testable in node): keyframed pose → rigid bones → spring chains
// (secondary motion) → final bones, effects geometry and smear ghosts.

import {
  ACTION_DURATION, puppetBones, puppetEffects, puppetPose,
  type ActionProgress, type BoneId, type EffectGeometry, type Effects, type Matrix, type Pose, type PuppetRig,
} from './puppet.ts';
import { createChainState, stepChains, type ChainState } from './chains.ts';

/** Ghost copies drawn behind a fast-moving weapon, and how far back each one is (s). */
export const SMEAR_GHOSTS = 2;
export const SMEAR_LAG = 0.028;

export interface Ghost { bones: Record<BoneId, Matrix>; alpha: number }

export interface AnimFrame {
  p: Pose;
  fx: Effects;
  bones: Record<BoneId, Matrix>;
  geo: EffectGeometry;
  /** Earlier poses of the smear bones while the action's smear window is on. */
  ghosts: Ghost[];
  smearBones: BoneId[];
}

/** Bones copied by the smear ghosts of a rig (weapon and arms for melee, the focus for magic). */
export function smearBonesOf(rig: PuppetRig): BoneId[] {
  const own = Object.values(rig.actions ?? {}).find((a) => a?.smearBones)?.smearBones;
  return own ?? (rig.style === 'melee' ? ['weapon', 'armF', 'offhand'] : ['weapon']);
}

/** True when any of the rig's action scripts smears. */
export const rigSmears = (rig: PuppetRig) => Object.values(rig.actions ?? {}).some((a) => !!a?.smear);

export class PuppetAnimator {
  readonly rig: PuppetRig;
  readonly smearBones: BoneId[];
  private chains: ChainState | null;
  private lastT = Number.NaN;

  constructor(rig: PuppetRig) {
    this.rig = rig;
    this.smearBones = smearBonesOf(rig);
    this.chains = rig.chains?.length ? createChainState(rig) : null;
  }

  /** Forgets the physics state (the chains snap back to the animated pose). */
  reset() {
    if (this.chains) this.chains = createChainState(this.rig);
    this.lastT = Number.NaN;
  }

  /** Everything needed to draw the puppet at time t (seconds, monotonic). */
  frame(t: number, act: ActionProgress | null): AnimFrame {
    const rig = this.rig;
    const { p, fx } = puppetPose(rig, t, act);
    let bones = puppetBones(rig, p);
    if (this.chains) {
      const dt = Number.isNaN(this.lastT) ? 0 : Math.max(0, t - this.lastT);
      // each fixed step follows the rigid pose of its own instant
      const sample = (back: number) => {
        const q = act ? act.p - back / ACTION_DURATION[act.type] : -1;
        return puppetBones(rig, puppetPose(rig, t - back, q >= 0 && act ? { type: act.type, p: q } : null).p);
      };
      const off = stepChains(this.chains, bones, dt, sample);
      for (const k in off) p[k as keyof Pose] += off[k as keyof Pose]!;
      bones = puppetBones(rig, p);
    }
    this.lastT = t;
    const ghosts: Ghost[] = [];
    if (act && fx.smear !== undefined) {
      const dur = ACTION_DURATION[act.type];
      for (let i = 1; i <= SMEAR_GHOSTS; i++) {
        const q = act.p - (i * SMEAR_LAG) / dur;
        if (q < 0) break;
        const g = puppetPose(rig, t - i * SMEAR_LAG, { type: act.type, p: q }).p;
        ghosts.push({ bones: puppetBones(rig, g), alpha: (0.5 / i) * (1 - 0.5 * fx.smear) });
      }
    }
    return { p, fx, bones, geo: puppetEffects(rig, bones, fx), ghosts, smearBones: this.smearBones };
  }
}
