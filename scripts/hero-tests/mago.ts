// Sprite tests of the mago (rig in src/fx/heroes/mago.ts). Run from
// scripts/smoke-test.ts; add this character's own checks here (helpers in ./common.ts).

import { ACTION_DURATION, puppetImpact, puppetPose, type ActionType, type ChainBone } from '../../src/fx/puppet.ts';
import { CHAIN_BONES, type ChainSlot } from '../../src/fx/chains.ts';
import { MAX_FIGURE_PIECES } from '../../src/fx/puppet-gpu.ts';
import { rigOf } from '../../src/fx/hero-rig.ts';
import { ACTIONS, anticipation, chainLag, figureChecks, rigidBones, simulate, worldPoint, type Check } from './common.ts';

/** Tip of the staff's orb in bind coordinates (weapon bone). */
const ORB: [number, number] = [70, 55];

/** Declared chains of the wizard: what hangs from what. */
const CHAINS: { slot: ChainSlot; parent: string; what: string }[] = [
  { slot: 'A', parent: 'head', what: 'el sombrero' },
  { slot: 'B', parent: 'head', what: 'la barba' },
  { slot: 'C', parent: 'armB', what: 'la manga trasera' },
  { slot: 'D', parent: 'armF', what: 'la manga delantera' },
  { slot: 'E', parent: 'torso', what: 'el faldón de la túnica' },
];

/** Rigid (keyed) value of a pose key during an action. */
const keyed = (type: ActionType, q: number, k: 'squash' | 'head' | 'torso' | ChainBone) => puppetPose(rigOf('mago'), 0, { type, p: q }).p[k];

/** First action fraction at which `f(q)` reaches `share` of its extreme over the action. */
function reachFraction(f: (q: number) => number, share = 0.9): number {
  const qs = Array.from({ length: 100 }, (_, i) => i / 100);
  const v0 = f(0), peak = qs.reduce((m, q) => Math.max(m, Math.abs(f(q) - v0)), 0);
  return qs.find((q) => Math.abs(f(q) - v0) >= peak * share) ?? 1;
}

export function testMago(check: Check) {
  figureChecks(check, 'mago');
  const rig = rigOf('mago');
  const impact = puppetImpact(rig);

  // detail within the budget
  check(rig.shapes.length >= 40 && rig.shapes.length <= MAX_FIGURE_PIECES, `mago: ${rig.shapes.length} piezas, con detalle y dentro del tope de ${MAX_FIGURE_PIECES}`);
  check(!rig.shapes.some((s) => s.k === 'eye' || s.k === 'skin') && rig.shapes.filter((s) => s.k === 'eyeGlow').length === 2, 'mago: bajo el sombrero solo se le ven dos ojos brillantes (sin piel)');
  check(rig.shapes.some((s) => s.k === 'orb'), 'mago: el báculo lleva un orbe que brilla');

  // physics chains: hat, beard, sleeves and robe
  for (const c of CHAINS) {
    const spec = rig.chains?.find((s) => s.slot === c.slot);
    check(!!spec && (spec.parent ?? 'torso') === c.parent, `mago: ${c.what} cuelga de una cadena ${c.slot} sobre ${c.parent}`);
    check(rig.shapes.some((s) => (CHAIN_BONES[c.slot] as string[]).includes(s.b)), `mago: ${c.what} tiene piezas en su cadena`);
  }
  check(rig.shapes.some((s) => s.b === 'chF2' && s.k === 'tome'), 'mago: el tomo cuelga del cinto con física');

  // the spell drags the cloth behind: hat, beard and sleeves trail the rigid pose
  for (const [slot, what, min] of [['A', 'la punta del sombrero', 2], ['B', 'la barba', 2], ['C', 'la manga trasera', 2], ['D', 'la manga delantera', 2]] as const) {
    const lag = chainLag('mago', slot, 'spell');
    check(lag >= min, `mago: en el conjuro ${what} se retrasa ${lag.toFixed(1)} u (≥ ${min})`);
  }
  // the arcane wind lifts robe and sleeves while casting
  const windAt = impact + 0.05;
  check(keyed('spell', windAt, 'chE1') > 20 && keyed('spell', windAt, 'chD1') > 20, 'mago: el viento arcano levanta túnica y mangas al descargar el conjuro');

  // spell and attack: anticipation (orb drawn back, crouch) and the discharge lands on the impact
  for (const type of ['spell', 'attack'] as const) {
    const a = anticipation('mago', 'weapon', ORB, type);
    check(a.back >= 4, `mago: ${type} con anticipación, el orbe retrocede ${a.back.toFixed(1)} u`);
    check(a.forward >= 12, `mago: ${type} descarga el orbe ${a.forward.toFixed(1)} u hacia delante en el impacto`);
    const xAt = (q: number) => worldPoint(rigidBones('mago', type, q), 'weapon', ORB)[0];
    const rest = xAt(0);
    let peak = 0, before = 0;
    for (let q = 0; q < 1; q += 0.01) {
      peak = Math.max(peak, xAt(q) - rest);
      if (q < impact - 0.06) before = Math.max(before, xAt(q) - rest);
    }
    check(a.forward >= peak * 0.85 && before < a.forward * 0.6, `mago: ${type} descarga justo en el impacto (${a.forward.toFixed(0)} de un máximo de ${peak.toFixed(0)}, antes ${before.toFixed(0)})`);
  }
  check(keyed('spell', impact * 0.72, 'squash') > 0.03, 'mago: se agacha al alzar el báculo antes del conjuro');

  // hit: the hat nearly falls off
  const hatTilt = Math.min(...Array.from({ length: 50 }, (_, i) => keyed('hit', i / 50, 'chA1')));
  check(hatTilt <= -25, `mago: al recibir un golpe el sombrero se ladea ${hatTilt.toFixed(0)}°`);
  check(Math.abs(keyed('hit', 0.99, 'chA1')) < 3, 'mago: el sombrero vuelve a su sitio tras el golpe');

  // death: collapses first, the hat falls after
  const bodyAt = reachFraction((q) => keyed('death', q, 'torso'));
  const hatAt = reachFraction((q) => keyed('death', q, 'chA1'));
  check(hatAt >= bodyAt + 0.1 && hatAt < 0.8, `mago: al morir se desploma (${bodyAt}) y el sombrero cae después (${hatAt})`);
  check(chainLag('mago', 'A', 'death') >= 3, 'mago: el sombrero cae con retraso de la física');

  // stable: bounded chain offsets, fps independence and no drift at rest
  const limit = Math.max(...(rig.chains ?? []).map((c) => c.limit ?? 75));
  let bounded = true;
  for (const type of ACTIONS) {
    const f30 = simulate('mago', 30, 1.4, { type, t0: 0.2 }), f60 = simulate('mago', 60, 1.4, { type, t0: 0.2 });
    let diff = 0;
    f30.forEach(({ t, f }, i) => {
      // compare inside the action only (the last frame may fall on either side of its end)
      if (t > 0.2 + ACTION_DURATION[type] * 0.97) return;
      const g = f60[i * 2].f;
      for (const c of rig.chains ?? []) {
        const tip = c.joints[c.joints.length - 1], bone = CHAIN_BONES[c.slot][c.joints.length - 2];
        const a = worldPoint(f.bones, bone, tip), b = worldPoint(g.bones, bone, tip);
        diff = Math.max(diff, Math.hypot(a[0] - b[0], a[1] - b[1]));
        for (const b of CHAIN_BONES[c.slot]) if (!(Math.abs(f.p[b]) < limit + 90)) bounded = false;
      }
    });
    check(diff < 2.5, `mago: ${type} se ve igual a 30 y a 60 fps (desvío ${diff.toFixed(2)} u)`);
  }
  check(bounded, 'mago: las cadenas no se disparan');
  const idle = simulate('mago', 60, 12);
  const last = idle[idle.length - 1].f, rigid = rigidBones('mago', null);
  let drift = 0;
  for (const c of rig.chains ?? []) {
    const tip = c.joints[c.joints.length - 1], bone = CHAIN_BONES[c.slot][c.joints.length - 2];
    const a = worldPoint(last.bones, bone, tip), b = worldPoint(rigid, bone, tip);
    drift = Math.max(drift, Math.hypot(a[0] - b[0], a[1] - b[1]));
  }
  check(drift < 8, `mago: en reposo las cadenas se mecen sin desbocarse (${drift.toFixed(1)} u tras 12 s)`);
  check(ACTION_DURATION.spell === 0.8, 'mago: el conjuro dura lo esperado');
}
