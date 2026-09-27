// Sprite tests of the pícaro (rig in src/fx/heroes/picaro.ts). Run from
// scripts/smoke-test.ts; add this character's own checks here (helpers in ./common.ts).

import { ACTION_DURATION, CHAIN_BONES, puppetImpact, puppetPose, type ActionType, type BoneId, type ChainSlot } from '../../src/fx/puppet.ts';
import { rigOf } from '../../src/fx/hero-rig.ts';
import { ACTIONS, anticipation, chainLag, figureChecks, rigidBones, simulate, worldPoint, type Check } from './common.ts';

type Pt = [number, number];

/** Blade tips (bind coordinates) of the main dagger and the reverse-grip offhand dagger. */
export const DAGGER_TIP: Pt = [88, 99];
export const DAGGER_BASE: Pt = [72, 99];
export const OFFHAND_TIP: Pt = [54, 118];
export const OFFHAND_BASE: Pt = [54, 104];

const ID = 'picaro';
const rig = () => rigOf(ID);
const pose = (type: ActionType, q: number) => puppetPose(rig(), 0, { type, p: q }).p;
const at = (type: ActionType | null, q: number, bone: BoneId, p: Pt) => worldPoint(rigidBones(ID, type, q), bone, p);

/** Tip of a chain (its last joint) in the rigid pose and in the physics frame. */
function chainTip(slot: ChainSlot) {
  const spec = rig().chains!.find((c) => c.slot === slot)!;
  return { bone: CHAIN_BONES[slot][spec.joints.length - 2], at: spec.joints[spec.joints.length - 1] };
}

/** Do segments ab and cd cross? */
function crosses(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const side = (p: Pt, q: Pt, r: Pt) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return side(a, b, c) !== side(a, b, d) && side(c, d, a) !== side(c, d, b);
}

export function testPicaro(check: Check) {
  figureChecks(check, ID);
  const r = rig();

  // budget and the silhouette of the card art
  check(r.shapes.length >= 40 && r.shapes.length <= 80, `picaro: ${r.shapes.length} piezas (entre 40 y 80, tope ${96})`);
  check(!r.shapes.some((s) => s.k === 'eye' || s.k === 'skin'), 'picaro: nunca se le ve la cara');
  check(r.shapes.filter((s) => s.b === 'weapon').length >= 3 && r.shapes.filter((s) => s.b === 'offhand').length >= 3, 'picaro: lleva dos dagas');
  check(r.shapes.filter((s) => s.k === 'knife').length >= 3, 'picaro: correas con cuchillos arrojadizos');
  check(r.shapes.filter((s) => s.k === 'boots').length >= 2, 'picaro: botas ligeras');
  check(ACTIONS.every((a) => (r.actions?.[a]?.keys.length ?? 0) >= 4), 'picaro: ataque, conjuro, golpe y muerte tienen guion propio');

  // chains: a long scarf (very loose) and a short tattered cape
  const chains = r.chains ?? [];
  const scarf = chains.find((c) => c.slot === 'A'), cape = chains.find((c) => c.slot === 'C');
  check(chains.length >= 5, `picaro: ${chains.length} cadenas de física (mínimo 5)`);
  check(!!scarf && scarf.joints.length === 4 && (scarf.freq ?? 3.2) <= 2 && (scarf.damping ?? 0.32) <= 0.28, 'picaro: bufanda larga y muy suelta (cadena A)');
  const scarfLen = scarf ? scarf.joints.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - scarf.joints[i][0], p[1] - scarf.joints[i][1]), 0) : 0;
  check(scarfLen >= 36, `picaro: la bufanda mide ${scarfLen.toFixed(0)} (mínimo 36)`);
  check(!!cape && CHAIN_BONES.C.every((b) => r.shapes.some((s) => s.b === b)) && r.shapes.some((s) => s.b === 'chC3' && s.t === 'p' && s.pts.length >= 9), 'picaro: capa corta desflecada (cadena C)');
  const hood = chains.find((c) => c.parent === 'head');
  check(!!hood, 'picaro: el pico de la capucha cuelga de la cabeza');

  // attack: a quick feint, then the real double stab exactly at the impact
  const impact = puppetImpact(r);
  check(impact >= 0.25 && impact <= 0.7, `picaro: impacto en ${impact}`);
  const restX = at(null, 0, 'weapon', DAGGER_TIP)[0];
  const tipX = (q: number) => at('attack', q, 'weapon', DAGGER_TIP)[0] - restX;
  let feint = 0, feintQ = 0;
  for (let q = 0.02; q < impact * 0.5; q += 0.01) if (tipX(q) > feint) { feint = tipX(q); feintQ = q; }
  let dip = feint;
  for (let q = feintQ; q < impact; q += 0.01) dip = Math.min(dip, tipX(q));
  check(feint >= 5, `picaro: amago rápido hacia delante (${feint.toFixed(1)})`);
  check(feint - dip >= 10, `picaro: recoge la daga tras el amago (${(feint - dip).toFixed(1)})`);
  const a = anticipation(ID, 'weapon', DAGGER_TIP);
  check(a.back >= 4, `picaro: anticipación de ${a.back.toFixed(1)} antes de la puñalada`);
  check(a.forward >= feint + 12, `picaro: la puñalada (${a.forward.toFixed(1)}) llega más lejos que el amago`);
  let reach = 0;
  for (let q = 0.02; q < 1; q += 0.01) reach = Math.max(reach, tipX(q));
  check(a.forward >= reach * 0.85, `picaro: la puñalada cae en el impacto (${a.forward.toFixed(1)} de ${reach.toFixed(1)})`);
  check(tipX(impact - 0.06) < a.forward * 0.6, 'picaro: la puñalada restalla justo antes del impacto');
  const held = Math.abs(tipX(impact + 0.03) - a.forward);
  check(held < 1.5, `picaro: pausa de impacto (se mueve ${held.toFixed(2)})`);
  // double stab: both blades forward, crossed in an X
  const offRest = at(null, 0, 'offhand', OFFHAND_TIP)[0];
  const offForward = at('attack', impact, 'offhand', OFFHAND_TIP)[0] - offRest;
  check(offForward >= 18, `picaro: la segunda daga también apuñala (${offForward.toFixed(1)})`);
  const blade = at('attack', impact, 'weapon', DAGGER_BASE), bladeTip = at('attack', impact, 'weapon', DAGGER_TIP);
  const off = at('attack', impact, 'offhand', OFFHAND_BASE), offTip = at('attack', impact, 'offhand', OFFHAND_TIP);
  check(crosses(blade, bladeTip, off, offTip), 'picaro: las dagas se cruzan en la puñalada doble');
  check(!!r.actions?.attack?.smear && r.actions.attack.smear[0] < impact && r.actions.attack.smear[1] > impact, 'picaro: smear afilado alrededor del impacto');
  const coil = pose('attack', impact * 0.7);
  check(coil.squash > 0.06, 'picaro: se agazapa antes de la estocada');

  // the scarf shoots out behind during the lunge
  const scarfLag = chainLag(ID, 'A', 'attack'), capeLag = chainLag(ID, 'C', 'attack');
  check(scarfLag >= 8, `picaro: la bufanda se retrasa ${scarfLag.toFixed(1)} en la estocada (mínimo 8)`);
  check(capeLag >= 3, `picaro: la capa se retrasa ${capeLag.toFixed(1)} en la estocada (mínimo 3)`);
  {
    // streams out long behind the neck, lifted instead of hanging
    const tip = chainTip('A'), root = rig().chains!.find((c) => c.slot === 'A')!.joints[0];
    const t0 = 0.3, frames = simulate(ID, 60, 1.4, { type: 'attack', t0 });
    const restTip = worldPoint(frames[0].f.bones, tip.bone, tip.at);
    let behind = 0, lifted = false;
    for (const { t, f } of frames) {
      const q = (t - t0) / ACTION_DURATION.attack;
      if (q < impact || q > impact + 0.2) continue;
      const neck = worldPoint(f.bones, 'torso', root), end = worldPoint(f.bones, tip.bone, tip.at);
      if (neck[0] - end[0] > behind) { behind = neck[0] - end[0]; lifted = end[1] < restTip[1] - 2; }
    }
    check(behind >= 30 && lifted, `picaro: la bufanda sale disparada detrás tras la puñalada (${behind.toFixed(1)} tras el cuello${lifted ? ', al vuelo' : ', colgando'})`);
  }

  // spell: an acrobatic flip with a swirl of the cape
  {
    let lo = Infinity, hi = -Infinity;
    for (let q = 0; q <= 1; q += 0.01) { const t = pose('spell', q).torso; lo = Math.min(lo, t); hi = Math.max(hi, t); }
    check(hi - lo >= 300, `picaro: voltereta en el conjuro (${(hi - lo).toFixed(0)}°)`);
    let floor = 0;
    for (let q = 0; q <= 1; q += 0.02) {
      const b = rigidBones(ID, 'spell', q);
      floor = Math.max(floor, worldPoint(b, 'head', [64, 60])[1], worldPoint(b, 'head', [70, 70])[1]);
    }
    check(floor < 128, `picaro: la cabeza no atraviesa el suelo en la voltereta (${floor.toFixed(0)})`);
    const swirl = chainLag(ID, 'C', 'spell');
    check(swirl >= 6, `picaro: la capa gira con la voltereta (${swirl.toFixed(1)})`);
  }

  // hit: curls up and rolls back a little
  {
    let back = 0, curl = 0, roll = 0;
    for (let q = 0; q < 0.6; q += 0.02) {
      const p = pose('hit', q);
      back = Math.min(back, p.rootX); curl = Math.max(curl, p.squash); roll = Math.min(roll, p.torso - (r.rest.torso ?? 0));
    }
    check(back <= -8, `picaro: retrocede al recibir el golpe (${back.toFixed(1)})`);
    check(curl >= 0.08, 'picaro: se encoge al recibir el golpe');
    check(roll <= -25, `picaro: rueda hacia atrás (${roll.toFixed(0)}°)`);
  }

  // death: slides to the floor, the scarf floats down after the body
  {
    const hood = at(null, 0, 'head', [64, 60])[1], down = at('death', 0.9, 'head', [64, 60])[1];
    check(down - hood >= 20, `picaro: se desliza hasta el suelo (${(down - hood).toFixed(0)})`);
    check(puppetPose(r, 0, { type: 'death', p: 0.99 }).fx.opacity === 0, 'picaro: la muerte se desvanece');
    const tip = chainTip('A'), t0 = 0.2, frames = simulate(ID, 60, 1.2, { type: 'death', t0 });
    const settled = r.actions!.death!.keys.filter(([q]) => q < 1).reduce((m, [q, p]) => (Object.keys(p).length ? Math.max(m, q) : m), 0);
    let rigidMove = 0, scarfMove = 0, prevR: Pt | null = null, prevS: Pt | null = null;
    for (const { t, f } of frames) {
      const q = (t - t0) / ACTION_DURATION.death;
      if (q < settled || q > 0.8) continue;
      const rp = at('death', q, tip.bone, tip.at), sp = worldPoint(f.bones, tip.bone, tip.at);
      if (prevR && prevS) { rigidMove += Math.hypot(rp[0] - prevR[0], rp[1] - prevR[1]); scarfMove += Math.hypot(sp[0] - prevS[0], sp[1] - prevS[1]); }
      prevR = rp; prevS = sp;
    }
    check(settled <= 0.6, `picaro: el cuerpo cae antes que la bufanda (en ${settled})`);
    check(scarfMove >= 3 && scarfMove > rigidMove + 2, `picaro: la bufanda cae lenta después (${scarfMove.toFixed(1)} frente a ${rigidMove.toFixed(1)})`);
  }

  // stable physics: bounded, settles back to idle, independent of the frame rate
  {
    const idle = simulate(ID, 60, 4), acted = simulate(ID, 60, 4, { type: 'attack', t0: 0.5 });
    let drift = 0, maxDev = 0, finite = true;
    for (let i = 0; i < acted.length; i++) for (const c of chains) for (const b of CHAIN_BONES[c.slot].slice(0, c.joints.length - 1)) {
      const v = acted[i].f.p[b];
      if (!Number.isFinite(v)) finite = false;
      maxDev = Math.max(maxDev, Math.abs(v));
      if (acted[i].t >= 3.4) drift = Math.max(drift, Math.abs(v - idle[i].f.p[b]));
    }
    check(finite && maxDev < 200, `picaro: física estable (desvío máximo ${maxDev.toFixed(0)}°)`);
    check(drift < 4, `picaro: las cadenas vuelven a reposo tras el ataque (resto ${drift.toFixed(2)}°)`);
    for (const type of ['attack', 'spell'] as ActionType[]) {
      const f30 = simulate(ID, 30, 2, { type, t0: 0.3 }), f60 = simulate(ID, 60, 2, { type, t0: 0.3 });
      let diff = 0;
      for (let i = 0; i < f30.length; i++) for (const c of chains) for (const b of CHAIN_BONES[c.slot].slice(0, c.joints.length - 1)) {
        diff = Math.max(diff, Math.abs(f30[i].f.p[b] - f60[i * 2].f.p[b]));
      }
      // the spell is a full 360° backflip with a long scarf: its worst single-frame
      // peak is more sensitive to the sampling phase, so it gets a little more room
      const limite = type === 'spell' ? 10 : 8;
      check(diff < limite, `picaro: la física de ${type} no depende de los fps (${diff.toFixed(2)}°)`);
    }
  }
}
