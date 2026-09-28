// Sprite tests of the druid and its six Wild Shape forms (rigs in
// src/fx/heroes/druida.ts). Run from scripts/smoke-test.ts (helpers in ./common.ts).

import { CHAIN_BONES, puppetImpact, puppetPose, type ActionType, type BoneId, type ChainSlot } from '../../src/fx/puppet.ts';
import { rigOf, type RigId } from '../../src/fx/hero-rig.ts';
import { ACTIONS, anticipation, chainLag, figureChecks, poseDistance, rigidBones, simulate, worldPoint, type Check } from './common.ts';

export const FORMS = ['lobo', 'oso', 'aguila', 'enjambre', 'lunar', 'estelar'] as const;
type Figure = 'druida' | (typeof FORMS)[number];
type Pt = [number, number];

/** What each figure must show: its chains, the point that leads its attack, and how far it must travel. */
const SPECS: Record<Figure, {
  /** Minimum number of physics chains. */
  chains: number;
  /** Chains that must visibly trail behind the body during the attack (tip lag in viewBox units). */
  lag: [ChainSlot, number][];
  /** Point that delivers the blow: staff head, snout, claws, talons, antlers… */
  strike: [BoneId, Pt];
  /** Minimum pull back before the blow and reach at the impact (viewBox units). */
  back: number;
  forward: number;
}> = {
  druida: { chains: 6, lag: [['A', 2.5], ['C', 2.5], ['E', 1.5]], strike: ['weapon', [71, 33]], back: 12, forward: 12 },
  lobo: { chains: 5, lag: [['A', 3], ['C', 1.5]], strike: ['head', [112, 80]], back: 3, forward: 14 },
  oso: { chains: 5, lag: [['A', 2], ['E', 2]], strike: ['armF', [88, 124]], back: 2, forward: 10 },
  aguila: { chains: 5, lag: [['A', 2.5], ['B', 2]], strike: ['chF2', [64, 110]], back: 4, forward: 14 },
  enjambre: { chains: 6, lag: [['A', 2.5], ['D', 2.5]], strike: ['head', [86, 78]], back: 4, forward: 14 },
  lunar: { chains: 5, lag: [['A', 3], ['B', 1.5]], strike: ['armF', [85, 126]], back: 3, forward: 14 },
  estelar: { chains: 5, lag: [['A', 1.5], ['B', 2]], strike: ['head', [96, 62]], back: 3, forward: 12 },
};

const x = (id: RigId, b: BoneId, at: Pt, type: ActionType, q: number) => worldPoint(rigidBones(id, type, q), b, at)[0];

export function testDruida(check: Check) {
  const figures: Figure[] = ['druida', ...FORMS];
  for (const id of figures) {
    figureChecks(check, id);
    const rig = rigOf(id), spec = SPECS[id];

    // hand-authored timelines for every action
    check(ACTIONS.every((a) => (rig.actions?.[a]?.keys.length ?? 0) >= 3), `${id}: ataque, conjuro, golpe y muerte tienen guion propio`);

    // physics chains and their lag behind the rigid pose
    check((rig.chains?.length ?? 0) >= spec.chains, `${id}: ${rig.chains?.length ?? 0} cadenas de física (mínimo ${spec.chains})`);
    for (const [slot, min] of spec.lag) {
      const lag = chainLag(id, slot, 'attack');
      check(lag >= min, `${id}: la cadena ${slot} se retrasa ${lag.toFixed(1)} en el ataque (mínimo ${min})`);
    }

    // anticipation, and the blow lands on the impact fraction
    const [bone, at] = spec.strike;
    const a = anticipation(id, bone, at);
    check(a.back >= spec.back, `${id}: anticipación de ${a.back.toFixed(1)} antes del golpe (mínimo ${spec.back})`);
    check(a.forward >= spec.forward, `${id}: alcanza ${a.forward.toFixed(1)} en el impacto (mínimo ${spec.forward})`);
    const rest = x(id, bone, at, 'attack', 0);
    let reach = 0;
    for (let q = 0.02; q < 1; q += 0.02) reach = Math.max(reach, x(id, bone, at, 'attack', q) - rest);
    check(a.forward >= reach * 0.8, `${id}: el golpe llega en el impacto (${a.forward.toFixed(1)} de ${reach.toFixed(1)})`);
    const early = x(id, bone, at, 'attack', a.impact - 0.12) - rest;
    check(early < a.forward * 0.7, `${id}: el golpe cae de golpe justo antes del impacto`);

    // spell, hit and death move expressively, and death stays down
    for (const t of ['spell', 'hit', 'death'] as ActionType[]) {
      const moved = rig.actions?.[t]?.keys.reduce((s, [, pose]) => s + Object.values(pose).reduce((u, v) => u + Math.abs(v ?? 0), 0), 0) ?? 0;
      check(moved > 60, `${id}: ${t} con movimiento expresivo (${moved.toFixed(0)})`);
    }
    const end = puppetPose(rig, 0, { type: 'death', p: 0.99 });
    check(end.fx.opacity === 0, `${id}: la muerte se desvanece`);

    // stable physics: after an action the chains settle back to the idle motion
    if (rig.chains?.length) {
      const idle = simulate(id, 60, 4, undefined), acted = simulate(id, 60, 4, { type: 'attack', t0: 0.5 });
      let drift = 0, finite = true, maxDev = 0;
      for (let i = 0; i < acted.length; i++) {
        for (const c of rig.chains) {
          for (const b of CHAIN_BONES[c.slot].slice(0, c.joints.length - 1)) {
            const v = acted[i].f.p[b] - (rig.rest[b] ?? 0);
            if (!Number.isFinite(v)) finite = false;
            maxDev = Math.max(maxDev, Math.abs(acted[i].f.p[b]));
            if (acted[i].t >= 3.4) drift = Math.max(drift, Math.abs(acted[i].f.p[b] - idle[i].f.p[b]));
          }
        }
      }
      check(finite && maxDev < 200, `${id}: física estable (desvío máximo ${maxDev.toFixed(0)}°)`);
      check(drift < 4, `${id}: las cadenas vuelven a reposo tras el ataque (resto ${drift.toFixed(2)}°)`);
      // frame-rate independence: 30 and 60 fps agree
      const f30 = simulate(id, 30, 2, { type: 'attack', t0: 0.3 }), f60 = simulate(id, 60, 2, { type: 'attack', t0: 0.3 });
      let fpsDiff = 0;
      for (let i = 0; i < f30.length; i++) {
        for (const c of rig.chains) for (const b of CHAIN_BONES[c.slot].slice(0, c.joints.length - 1)) {
          fpsDiff = Math.max(fpsDiff, Math.abs(f30[i].f.p[b] - f60[i * 2].f.p[b]));
        }
      }
      check(fpsDiff < 3, `${id}: la física no depende de los fps (${fpsDiff.toFixed(2)}°)`);
    }
  }

  // the druid: cape lifts in the wind while casting, the staff is driven down
  {
    const rig = rigOf('druida');
    const mid = puppetPose(rig, 0, { type: 'spell', p: 0.45 }).p;
    check(mid.chA1 + mid.chA2 > 25 && mid.chB1 + mid.chB2 > 25, 'druida: la capa se levanta con el viento del conjuro');
    const top = worldPoint(rigidBones('druida', 'spell', 0.3), 'weapon', [71, 33])[1];
    const foot = worldPoint(rigidBones('druida', 'spell', 0.55), 'weapon', [70, 124])[1];
    check(top < 40, `druida: alza el bastón por encima de la cabeza (${top.toFixed(0)})`);
    check(foot > 120, `druida: clava el bastón en el suelo (${foot.toFixed(0)})`);
    let spin = 0;
    for (let q = 0.02; q < puppetImpact(rig); q += 0.02) spin = Math.max(spin, Math.abs(puppetPose(rig, 0, { type: 'attack', p: q }).p.weapon));
    check(spin >= 180, `druida: el bastón gira en el ataque (${spin.toFixed(0)}°)`);
    check(!rig.shapes.some((s) => s.k === 'eye' || s.k === 'skin') && rig.shapes.filter((s) => s.k === 'eyeGlow').length === 2, 'druida: bajo la capucha solo se le ven dos ojos brillantes');
  }

  // each form attacks with its own timeline
  for (let i = 0; i < FORMS.length; i++) for (let j = i + 1; j < FORMS.length; j++) {
    const d = poseDistance(FORMS[i], FORMS[j], 'attack');
    check(d > 2, `${FORMS[i]} y ${FORMS[j]} atacan distinto (${d.toFixed(1)})`);
  }
  const keysOf = (id: RigId) => JSON.stringify(rigOf(id).actions?.attack?.keys);
  check(new Set(FORMS.map(keysOf)).size === FORMS.length, 'cada forma tiene su propio guion de ataque');

  // form signatures
  const pose = (id: RigId, type: ActionType, q: number) => puppetPose(rigOf(id), 0, { type, p: q }).p;
  {
    const coil = pose('lobo', 'attack', puppetImpact(rigOf('lobo')) * 0.7);
    check(coil.squash > 0.06, 'lobo: se agacha antes de saltar');
    const leap = Math.min(...[0.4, 0.45, 0.5].map((q) => worldPoint(rigidBones('lobo', 'attack', q), 'torso', [60, 90])[1]));
    check(leap < worldPoint(rigidBones('lobo', null), 'torso', [60, 90])[1] - 5, 'lobo: salta al morder');
  }
  {
    const im = puppetImpact(rigOf('oso'));
    const rear = Math.min(...[0.1, 0.2, 0.3].map((q) => pose('oso', 'attack', q * im / 0.4).torso));
    check(rear < -25, `oso: se alza sobre dos patas (${rear.toFixed(0)}°)`);
    const land = Math.max(...[0, 0.03, 0.06].map((d) => pose('oso', 'attack', im + d).squash));
    check(land > 0.1, 'oso: squash al caer el zarpazo');
  }
  {
    const im = puppetImpact(rigOf('aguila')), dive = pose('aguila', 'attack', im - 0.04);
    check(dive.torso > 15 && dive.armF < -60, 'águila: pica con las alas plegadas');
    check(pose('aguila', 'attack', im).chF2 < -15, 'águila: abre las garras en el impacto');
  }
  {
    const r = rigOf('enjambre');
    check(r.shapes.length <= 96 && r.shapes.length >= 70, `enjambre: ${r.shapes.length} insectos dentro del tope`);
    // the heartbeat: the swirl contracts and expands in idle
    const a = new Set<string>();
    for (const t of [0, 0.2, 0.4, 0.6, 0.8, 1.0]) a.add(puppetPose(r, t, null).p.chA1.toFixed(0));
    check(a.size >= 3, 'enjambre: el remolino late en reposo');
  }
  {
    const howl = Math.min(pose('lunar', 'attack', 0.15).head, pose('lunar', 'attack', 0.2).head, pose('lunar', 'attack', 0.25).head);
    check(howl < -25, `lobo lunar: echa la cabeza atrás para aullar (${howl.toFixed(0)}°)`);
    check(Math.min(pose('lobo', 'spell', 0.45).head, pose('lunar', 'spell', 0.45).head) < -30, 'lobos: aúllan al conjurar');
    check(rigOf('lunar').shapes.filter((s) => s.k === 'moonGlow').length >= 3, 'lobo lunar: crin plateada');
  }
  {
    const im = puppetImpact(rigOf('estelar'));
    check(pose('estelar', 'attack', im).head > 25, 'ciervo estelar: embiste con las astas bajadas');
    check(rigOf('estelar').shapes.filter((s) => s.k === 'starGlow').length >= 6, 'ciervo estelar: destellos en la cornamenta');
  }
}
