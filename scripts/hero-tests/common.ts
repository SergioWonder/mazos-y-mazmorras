// Shared helpers for the per-character sprite tests (scripts/hero-tests/*.ts),
// run from scripts/smoke-test.ts. Pure: node --experimental-strip-types.

import { ACTION_DURATION, EMISSIVE, EYES, applyMatrix, puppetBones, puppetImpact, puppetPose, type ActionType, type BoneId, type Matrix, type PuppetRig } from '../../src/fx/puppet.ts';
import { PuppetAnimator, type AnimFrame } from '../../src/fx/animator.ts';
import { CHAIN_BONES, validateChains, type ChainSlot } from '../../src/fx/chains.ts';
import { BONE_COUNT, MAX_FIGURE_PIECES, MAX_POLY, PIECE_TEXELS, hexRgb, packRig, shapeBBox } from '../../src/fx/puppet-gpu.ts';
import { rigOf, type RigId } from '../../src/fx/hero-rig.ts';

export type Check = (cond: boolean, msg: string) => void;
type Pt = [number, number];

export const ACTIONS: ActionType[] = ['attack', 'spell', 'hit', 'death'];

/** Frames of a timeline played at `fps` for `secs` seconds, optionally with an action starting at t0. */
export function simulate(id: RigId | PuppetRig, fps: number, secs: number, action?: { type: ActionType; t0: number }): { t: number; f: AnimFrame }[] {
  const rig = typeof id === 'string' ? rigOf(id) : id;
  const a = new PuppetAnimator(rig);
  const out: { t: number; f: AnimFrame }[] = [];
  for (let i = 0; i <= Math.round(secs * fps); i++) {
    const t = i / fps;
    const q = action ? (t - action.t0) / ACTION_DURATION[action.type] : -1;
    out.push({ t, f: a.frame(t, action && q >= 0 && q < 1 ? { type: action.type, p: q } : null) });
  }
  return out;
}

/** World position (viewBox) of a bind-pose point on a bone. */
export const worldPoint = (bones: Record<BoneId, Matrix>, bone: BoneId, at: Pt): Pt => applyMatrix(bones[bone], at[0], at[1]);

/** Rigid pose (no physics) of a rig at action fraction q. */
export function rigidBones(id: RigId, type: ActionType | null, q = 0): Record<BoneId, Matrix> {
  const rig = rigOf(id);
  return puppetBones(rig, puppetPose(rig, 0, type ? { type, p: q } : null).p);
}

/**
 * Anticipation of an attack measured on a point of the weapon: how far it goes
 * back (−x, the hero faces right) before the impact, and how far forward it is
 * at the impact, both relative to rest.
 */
export function anticipation(id: RigId, bone: BoneId, at: Pt, type: ActionType = 'attack') {
  const impact = puppetImpact(rigOf(id));
  const restX = worldPoint(rigidBones(id, null), bone, at)[0];
  let back = 0;
  for (let q = 0.02; q < impact - 0.01; q += 0.02) back = Math.max(back, restX - worldPoint(rigidBones(id, type, q), bone, at)[0]);
  const forward = worldPoint(rigidBones(id, type, impact), bone, at)[0] - restX;
  return { back, forward, impact };
}

/** Largest distance the tip of a chain trails behind its rigid position during an action. */
export function chainLag(id: RigId, slot: ChainSlot, type: ActionType = 'attack'): number {
  const rig = rigOf(id);
  const spec = rig.chains?.find((c) => c.slot === slot);
  if (!spec) return 0;
  const tip = spec.joints[spec.joints.length - 1], bone = CHAIN_BONES[slot][spec.joints.length - 2];
  let lag = 0;
  for (const { t, f } of simulate(id, 60, 1.6, { type, t0: 0.3 })) {
    const q = (t - 0.3) / ACTION_DURATION[type];
    if (q < 0 || q >= 1) continue;
    const rigid = worldPoint(rigidBones(id, type, q), bone, tip), sim = worldPoint(f.bones, bone, tip);
    lag = Math.max(lag, Math.hypot(rigid[0] - sim[0], rigid[1] - sim[1]));
  }
  return lag;
}

/** Summed angle travel (degrees) of every pose value through an action: how much it moves. */
export function travel(id: RigId, type: ActionType): number {
  const rig = rigOf(id);
  let sum = 0, prev = puppetPose(rig, 0, { type, p: 0 }).p;
  for (let q = 0.02; q < 1; q += 0.02) {
    const p = puppetPose(rig, 0, { type, p: q }).p;
    for (const k in p) sum += Math.abs(p[k as keyof typeof p] - prev[k as keyof typeof p]);
    prev = p;
  }
  return sum;
}

/** Mean per-sample pose difference (degrees) between two rigs doing the same action. */
export function poseDistance(a: RigId, b: RigId, type: ActionType): number {
  let sum = 0, n = 0;
  for (let q = 0.05; q < 1; q += 0.05) {
    const pa = puppetPose(rigOf(a), 0, { type, p: q }).p, pb = puppetPose(rigOf(b), 0, { type, p: q }).p;
    for (const k in pa) { sum += Math.abs(pa[k as keyof typeof pa] - pb[k as keyof typeof pb]); n++; }
  }
  return sum / n;
}

/** Budget, GPU packing, chain validity and finite animation for one hero or form. */
export function figureChecks(check: Check, id: RigId) {
  const rig = rigOf(id);
  check(rig.shapes.length <= MAX_FIGURE_PIECES, `${id}: ${rig.shapes.length} piezas, dentro del tope de ${MAX_FIGURE_PIECES}`);
  check(rig.shapes.every((s) => s.t !== 'p' || s.pts.length <= MAX_POLY), `${id}: ningún polígono pasa de ${MAX_POLY} vértices`);
  const errors = validateChains(rig);
  check(errors.length === 0, `${id}: cadenas bien declaradas${errors.length ? ` (${errors.join('; ')})` : ''}`);
  const pk = packRig(rig, 'silhouette');
  const bonesOk = rig.shapes.every((_, i) => pk.data[i * PIECE_TEXELS * 4 + 1] < BONE_COUNT);
  check(bonesOk && pk.data.every(Number.isFinite), `${id}: se empaqueta para la GPU`);
  const impact = puppetImpact(rig);
  check(impact >= 0.25 && impact <= 0.7, `${id}: el impacto cae en ${impact} de la acción`);
  let finite = true;
  for (const type of ACTIONS) {
    for (const { f } of simulate(id, 30, 1.2, { type, t0: 0.1 })) {
      for (const b in f.bones) if (!f.bones[b as BoneId].every(Number.isFinite)) finite = false;
    }
  }
  check(finite, `${id}: ataque, conjuro, golpe y muerte se animan sin valores rotos`);
}

/** HSV saturation and value (0..1) of a '#rrggbb' colour. */
export function hsv(hex: string): { s: number; v: number } {
  const c = hexRgb(hex).map((x) => x / 255), mx = Math.max(...c), mn = Math.min(...c);
  return { s: mx ? (mx - mn) / mx : 0, v: mx };
}

/** Vertices at the outer ends (min and max x) of a polygon. */
function ends(pts: Pt[]): { left: Pt; right: Pt } {
  const byX = [...pts].sort((a, b) => a[0] - b[0]);
  return { left: byX[0], right: byX[byX.length - 1] };
}

/**
 * Angry glowing eyes as in the card art: 1-2 slanted slits on the head, painted
 * with an emissive key in a bright, saturated colour. The inner end of each slit
 * (towards the other eye, or the snout when there is only one) sits lower than
 * the outer end. They follow the head bone and go out at the end of the death.
 */
export function angryEyeChecks(check: Check, id: RigId, expected: 1 | 2) {
  const rig = rigOf(id);
  const eyes = rig.shapes.filter((s) => EYES.has(s.k));
  check(eyes.length === expected, `${id}: tiene ${expected === 2 ? 'dos ojos' : 'un ojo de perfil'} (${eyes.length})`);
  if (!eyes.length) return;
  check(eyes.every((s) => EMISSIVE.has(s.k)), `${id}: los ojos son emisivos (brillan con halo)`);
  const colours = [...new Set(eyes.map((s) => rig.palette[s.k] ?? ''))];
  check(colours.every((c) => /^#[0-9a-f]{6}$/i.test(c) && hsv(c).v >= 0.85 && hsv(c).s >= 0.3),
    `${id}: ojos de color claro y saturado (${colours.join(', ')})`);
  check(eyes.every((s) => s.b === 'head'), `${id}: los ojos cuelgan del hueso de la cabeza`);
  const slits = eyes.filter((s): s is Extract<typeof s, { t: 'p' }> => s.t === 'p' && s.pts.length >= 3 && s.pts.length <= Math.min(8, MAX_POLY));
  check(slits.length === eyes.length, `${id}: cada ojo es un polígono pequeño, no un círculo`);
  if (slits.length !== eyes.length) return;
  const cx = (s: (typeof slits)[number]) => s.pts.reduce((a, p) => a + p[0], 0) / s.pts.length;
  const sorted = [...slits].sort((a, b) => cx(a) - cx(b));
  const slanted = sorted.every((s, i) => {
    const { left, right } = ends(s.pts);
    // the inner end is the right one for the left (or only) eye, the left one for the right eye
    const innerRight = sorted.length === 1 || i === 0;
    return innerRight ? right[1] - left[1] >= 0.4 : left[1] - right[1] >= 0.4;
  });
  check(slanted, `${id}: rendijas inclinadas con el ceño fruncido (extremo interior más bajo)`);
  const slim = slits.every((s) => {
    const xs = s.pts.map((p) => p[0]), ys = s.pts.map((p) => p[1]);
    const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
    return w >= 1.4 * h && w <= 8;
  });
  check(slim, `${id}: los ojos son rendijas finas y pequeñas`);
  // they sit on the head and ride on it through every action (with the physics)
  const head = rig.shapes.filter((s) => s.b === 'head' && !EYES.has(s.k) && s.t !== 'l').map(shapeBBox);
  const hb = [Math.min(...head.map((b) => b[0])), Math.min(...head.map((b) => b[1])), Math.max(...head.map((b) => b[2])), Math.max(...head.map((b) => b[3]))];
  const headC: Pt = [(hb[0] + hb[2]) / 2, (hb[1] + hb[3]) / 2], reach = Math.hypot(hb[2] - hb[0], hb[3] - hb[1]) / 2;
  const centre = (s: (typeof slits)[number]): Pt => [cx(s), s.pts.reduce((a, p) => a + p[1], 0) / s.pts.length];
  const inside = slits.every((s) => { const [x, y] = centre(s); return x > hb[0] && x < hb[2] && y > hb[1] && y < hb[3]; });
  let follows = inside;
  for (const type of ACTIONS) {
    for (const { f } of simulate(id, 20, 1.1, { type, t0: 0.1 })) {
      const [hx, hy] = worldPoint(f.bones, 'head', headC);
      for (const s of slits) {
        const [ex, ey] = worldPoint(f.bones, 'head', centre(s));
        if (!Number.isFinite(ex + ey) || Math.hypot(ex - hx, ey - hy) > reach * 1.3) follows = false;
      }
    }
  }
  check(follows, `${id}: los ojos están en la cara y siguen a la cabeza en reposo, ataque, conjuro, golpe y muerte`);
  const lit = [0.1, 0.3, 0.5].some((q) => [0.5, 1.7].some((t) => !puppetPose(rig, t, { type: 'death', p: q }).fx.blink));
  const out = [0.8, 0.9, 0.99].every((q) => [0.5, 1.7, 2.9].every((t) => puppetPose(rig, t, { type: 'death', p: q }).fx.blink));
  check(lit && out, `${id}: al morir los ojos siguen encendidos al principio y se apagan al final`);
}
