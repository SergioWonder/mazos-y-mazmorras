// Sprite tests of the brujo (rig in src/fx/heroes/brujo.ts). Run from
// scripts/smoke-test.ts; add this character's own checks here (helpers in ./common.ts).

import { ACTION_DURATION, puppetImpact, puppetPose, type BoneId } from '../../src/fx/puppet.ts';
import { CHAIN_BONES, type ChainSlot } from '../../src/fx/chains.ts';
import { MAX_FIGURE_PIECES } from '../../src/fx/puppet-gpu.ts';
import { rigOf } from '../../src/fx/hero-rig.ts';
import { anticipation, chainLag, figureChecks, rigidBones, simulate, worldPoint, type Check } from './common.ts';

type Pt = [number, number];

/** World position of the tip of a chain in a set of bone matrices. */
function chainTip(bones: Parameters<typeof worldPoint>[0], slot: ChainSlot): Pt {
  const spec = rigOf('brujo').chains!.find((c) => c.slot === slot)!;
  return worldPoint(bones, CHAIN_BONES[slot][spec.joints.length - 2], spec.joints[spec.joints.length - 1]);
}

export function testBrujo(check: Check) {
  figureChecks(check, 'brujo');
  const rig = rigOf('brujo');
  const chains = rig.chains ?? [];
  const slotOf = (bone: BoneId) => chains.find((c) => (CHAIN_BONES[c.slot] as BoneId[]).some((b) => rig.shapes.some((s) => s.b === b && s.k === bone)))?.slot;

  // — detail: torn cape, pact amulets and a chained tome, all on spring chains —
  const capes = chains.filter((c) => (c.parent ?? 'torso') === 'torso' && c.joints.length === 4
    && c.joints[3][1] - c.joints[0][1] > 40);
  check(capes.length >= 3, `brujo: capa larga desgarrada en ${capes.length} paños con física`);
  check(rig.shapes.filter((s) => s.k === 'cloakD' && s.b.startsWith('ch')).length >= 6, 'brujo: los paños de la capa cuelgan de las cadenas');
  const amulets = rig.shapes.filter((s) => s.k === 'gem' && s.b.startsWith('ch'));
  check(new Set(amulets.map((s) => s.b.slice(0, 3))).size >= 2, 'brujo: al menos dos amuletos del pacto colgando con física');
  const tomeSlot = slotOf('tome');
  check(!!tomeSlot && rig.shapes.some((s) => s.k === 'chain' && s.b.startsWith(`ch${tomeSlot}`)), 'brujo: el grimorio cuelga del cinto con una cadena');
  check(rig.shapes.filter((s) => s.k === 'horn').length >= 2 && rig.shapes.some((s) => s.k === 'horn' && s.t === 'p' && s.pts.length >= 8),
    'brujo: cuernos curvos');
  check(rig.shapes.some((s) => s.k === 'collar' && s.b === 'torso'), 'brujo: cuello alto de la capa, rígido');
  check(rig.shapes.filter((s) => s.b === 'weapon' && (s.k === 'flame' || s.k === 'flameCore')).length >= 3, 'brujo: llama violeta en la mano');
  check(!rig.shapes.some((s) => s.k === 'eyeGlow' || s.k === 'eye'), 'brujo: nunca se le ve la cara');
  check(rig.shapes.length >= 40 && rig.shapes.length <= Math.min(80, MAX_FIGURE_PIECES), `brujo: ${rig.shapes.length} piezas, entre 40 y 80`);

  // — the Eldritch Blast: long tense gathering, then the flame bursts out —
  const impact = puppetImpact(rig);
  check(impact >= 0.45 && impact <= 0.6, `brujo: la explosión se hace esperar (impacto en ${impact})`);
  const flame = rig.focus;
  const a = anticipation('brujo', 'weapon', flame);
  check(a.back > 6, `brujo: recoge la llama hacia atrás antes de lanzarla (${a.back.toFixed(1)})`);
  check(a.forward > 8, `brujo: en el impacto la llama sale hacia delante (${a.forward.toFixed(1)})`);
  const restX = worldPoint(rigidBones('brujo', null), 'weapon', flame)[0];
  let behind = 0, n = 0;
  for (let q = 0.02; q < impact; q += 0.02, n++) if (worldPoint(rigidBones('brujo', 'attack', q), 'weapon', flame)[0] < restX - 1) behind++;
  check(behind / n >= 0.55, `brujo: la anticipación es larga (${Math.round((behind / n) * 100)} % del tiempo con la llama atrás)`);
  const xAt = (q: number) => worldPoint(rigidBones('brujo', 'attack', q), 'weapon', flame)[0];
  check(xAt(impact) - xAt(impact - 0.04) > 8, 'brujo: el brazo se abre de golpe justo en el impacto');
  const before = puppetPose(rig, 0, { type: 'attack', p: impact - 0.02 }).fx, after = puppetPose(rig, 0, { type: 'attack', p: impact + 0.02 }).fx;
  check(before.projectile === undefined && after.projectile !== undefined && after.burst !== undefined, 'brujo: la llama sale disparada en el impacto');
  check(after.smear !== undefined || puppetPose(rig, 0, { type: 'attack', p: impact }).fx.smear !== undefined, 'brujo: estela violeta al lanzar');
  check((rig.bursts?.attack ?? []).some((b) => b.bone === 'weapon'), 'brujo: estallido de partículas en la mano');

  // cape wraps the body in the coil and opens like wings at the blow
  if (!capes.length) return;
  const capeSlot = [...capes].sort((x, y) => x.joints[3][0] - y.joints[3][0])[0].slot;
  const rest = chainTip(rigidBones('brujo', null), capeSlot);
  const coil = chainTip(rigidBones('brujo', 'attack', impact - 0.08), capeSlot);
  const open = chainTip(rigidBones('brujo', 'attack', impact), capeSlot);
  check(coil[0] - rest[0] > 5, `brujo: en la anticipación la capa envuelve el cuerpo (${(coil[0] - rest[0]).toFixed(1)})`);
  check(rest[0] - open[0] > 8 && open[1] < rest[1] - 4, 'brujo: al lanzar, la capa se abre como alas');
  check(chainLag('brujo', capeSlot, 'attack') > 4, 'brujo: la capa llega con retraso al lanzamiento');
  const amuletSlot = amulets[0].b.slice(2, 3) as ChainSlot;
  check(chainLag('brujo', amuletSlot, 'attack') > 2, 'brujo: los amuletos saltan con el estallido');

  // — hit: the cape billows forwards —
  const frontest = (type: 'hit') => {
    let best = -Infinity;
    for (const { t, f } of simulate('brujo', 60, 1.2, { type, t0: 0.3 })) if (t > 0.3 && t < 0.3 + ACTION_DURATION.hit) best = Math.max(best, chainTip(f.bones, capeSlot)[0]);
    return best;
  };
  check(frontest('hit') - rest[0] > 5, 'brujo: al recibir un golpe la capa ondea hacia delante');

  // — death: fades backwards and the cape falls in a heap —
  const dead = rigidBones('brujo', 'death', 0.98), alive = rigidBones('brujo', null);
  const head = (b: typeof alive) => worldPoint(b, 'head', [60, 58]);
  check(head(dead)[0] < head(alive)[0] - 4 && head(dead)[1] > head(alive)[1] + 20, 'brujo: al morir se desploma hacia atrás');
  check(chains.filter((c) => capes.includes(c)).every((c) => chainTip(dead, c.slot)[1] > 118), 'brujo: la capa cae en un montón en el suelo');
  check(puppetPose(rig, 0, { type: 'death', p: 0.99 }).fx.opacity === 0, 'brujo: se desvanece');

  // — stable physics: independent of fps, bounded in a long idle, back to rest after acting —
  const at60 = simulate('brujo', 60, 1.6, { type: 'attack', t0: 0.2 }), at30 = simulate('brujo', 30, 1.6, { type: 'attack', t0: 0.2 });
  let drift = 0;
  for (let i = 0; i < at30.length; i++) {
    for (const c of chains) {
      const p = chainTip(at30[i].f.bones, c.slot), q = chainTip(at60[i * 2].f.bones, c.slot);
      drift = Math.max(drift, Math.hypot(p[0] - q[0], p[1] - q[1]));
    }
  }
  check(drift < 1.5, `brujo: la física da lo mismo a 30 y a 60 fps (${drift.toFixed(2)})`);
  const idle = simulate('brujo', 30, 20);
  let wander = 0;
  for (const { f } of idle) for (const c of chains) {
    const p = chainTip(f.bones, c.slot), r = chainTip(rigidBones('brujo', null), c.slot);
    wander = Math.max(wander, Math.hypot(p[0] - r[0], p[1] - r[1]));
  }
  check(wander < 12, `brujo: en reposo la capa ondea sin desbocarse (${wander.toFixed(1)})`);
  const acted = simulate('brujo', 60, 3, { type: 'attack', t0: 0.2 }), calm = simulate('brujo', 60, 3);
  let settle = 0;
  for (const c of chains) {
    const p = chainTip(acted[acted.length - 1].f.bones, c.slot), q = chainTip(calm[calm.length - 1].f.bones, c.slot);
    settle = Math.max(settle, Math.hypot(p[0] - q[0], p[1] - q[1]));
  }
  check(settle < 2, `brujo: tras el ataque todo vuelve al reposo (${settle.toFixed(2)})`);
}
