// Tests of the heroes seen from behind (rigs in src/fx/heroes/espalda/), the
// puppets that walk into the chapter openings. Run from scripts/smoke-test.ts.

import { EMISSIVE, EYES, LIT_EDGES, applyMatrix, puppetBones, puppetPose, type PuppetRig } from '../../src/fx/puppet.ts';
import { CHAIN_BONES, strandEdges, strandShapes, validateChains, type ChainSpec } from '../../src/fx/chains.ts';
import { MAX_FIGURE_PIECES, MAX_POLY, shapeBBox } from '../../src/fx/puppet-gpu.ts';
import { HERO_RIGS } from '../../src/fx/hero-rig.ts';
import { HERO_BACK_RIGS, BACK_FEET, BACK_FIGURE_HEIGHT } from '../../src/fx/hero-back.ts';
import { simulate, type Check } from './common.ts';

/** Classes whose back view carries a glowing magic element (orb, crystal, flame, holy light). */
const MAGIC = ['druida', 'mago', 'brujo', 'paladin'];

function bbox(rig: PuppetRig, filter: (b: string) => boolean = () => true) {
  const bones = puppetBones(rig, puppetPose(rig, 0, null).p);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of rig.shapes) {
    if (!filter(s.b)) continue;
    const [a, c, d, e] = shapeBBox(s);
    for (const [x, y] of [[a, c], [d, c], [a, e], [d, e]].map(([px, py]) => applyMatrix(bones[s.b], px, py))) {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
  }
  return { x0, y0, x1, y1 };
}

export function testEspalda(check: Check) {
  // lit borders of a cape follow its sides and its ragged hem, on the chain bones
  const cape: ChainSpec = { slot: 'C', joints: [[58, 80], [58, 88], [58, 96], [58, 104]] };
  const lines = strandEdges(cape, [20, 22, 24, 22], { tip: 'tattered', teeth: 3, width: 0.9 });
  const poly = strandShapes(cape, 'x', [20, 22, 24, 22], { tip: 'tattered', teeth: 3 });
  const tipPts = poly[2].t === 'p' ? poly[2].pts.length : 0;
  check(lines.every((l) => l.t === 'l' && l.k === 'edge' && l.w === 0.9 && CHAIN_BONES.C.includes(l.b as never))
    && lines.length === 2 + 2 + (tipPts - 1),
    `strandEdges: líneas de luz por los dos lados de cada tramo y por el bajo deshilachado (${lines.length})`);
  const side = lines.filter((l) => l.b === 'chC1');
  const touches = (x: number, y: number) => side.some((l) => l.t === 'l' && [[l.x1, l.y1], [l.x2, l.y2]].some(([a, b]) => Math.hypot(a - x, b - y) < 0.05));
  check(side.length === 2 && touches(48, 80) && touches(68, 80), 'strandEdges: los lados arrancan en los bordes de la capa');

  check(Object.keys(HERO_RIGS).every((c) => c in HERO_BACK_RIGS) && Object.keys(HERO_BACK_RIGS).length === Object.keys(HERO_RIGS).length,
    `cada clase tiene su marioneta de espaldas (${Object.keys(HERO_BACK_RIGS).join(', ')})`);
  for (const [id, rig] of Object.entries(HERO_BACK_RIGS)) {
    check(rig.shapes.length >= 30 && rig.shapes.length <= MAX_FIGURE_PIECES, `${id} de espaldas: ${rig.shapes.length} piezas (entre 30 y ${MAX_FIGURE_PIECES})`);
    check(rig.shapes.every((s) => s.t !== 'p' || s.pts.length <= MAX_POLY), `${id} de espaldas: ningún polígono pasa de ${MAX_POLY} vértices`);
    const errors = validateChains(rig);
    check(errors.length === 0, `${id} de espaldas: cadenas bien declaradas${errors.length ? ` (${errors.join('; ')})` : ''}`);
    const bones = puppetBones(rig, puppetPose(rig, 0, null).p);
    check(rig.shapes.every((s) => !!bones[s.b]), `${id} de espaldas: todas las piezas cuelgan de un hueso que existe`);
    check(!rig.shapes.some((s) => EYES.has(s.k)), `${id} de espaldas: no se le ven los ojos`);

    // the back is read through lit edges: cape borders, straps, seams
    const edges = rig.shapes.filter((s) => LIT_EDGES.has(s.k));
    const edgeBones = new Set(edges.map((s) => s.b));
    check(edges.length >= 8 && edgeBones.size >= 3, `${id} de espaldas: ${edges.length} líneas de luz en ${edgeBones.size} huesos marcan capa, correas y costuras`);
    check(edges.some((s) => s.b === 'torso' || s.b.startsWith('ch')), `${id} de espaldas: la espalda (torso o capa) lleva detalles marcados`);

    // standing on the scene: centred on the feet, feet on the ground line, a hero's height
    const all = bbox(rig), legs = bbox(rig, (b) => b === 'legF' || b === 'legB');
    const cx = (legs.x0 + legs.x1) / 2;
    check(Math.abs(cx - BACK_FEET[0]) <= 4, `${id} de espaldas: los pies están centrados en x=${BACK_FEET[0]} (${cx.toFixed(1)})`);
    check(Math.abs(legs.y1 - BACK_FEET[1]) <= 2.5, `${id} de espaldas: apoya los pies en y=${BACK_FEET[1]} (${legs.y1.toFixed(1)})`);
    const h = BACK_FEET[1] - all.y0;
    check(h >= BACK_FIGURE_HEIGHT * 0.85 && h <= BACK_FIGURE_HEIGHT * 1.3, `${id} de espaldas: mide ${h.toFixed(0)} (figura tipo ${BACK_FIGURE_HEIGHT})`);
    check(all.x0 >= 0 && all.x1 <= 140 && all.y0 >= 0, `${id} de espaldas: cabe en su lienzo de 140×135`);

    // idle: breathing and cloth moving, never broken values
    const frames = simulate(rig, 30, 4);
    const finite = frames.every(({ f }) => Object.values(f.bones).every((m) => m.every(Number.isFinite)));
    check(finite, `${id} de espaldas: el reposo se anima sin valores rotos`);
    const ys = frames.map(({ f }) => f.bones.torso[5]);
    check(Math.max(...ys) - Math.min(...ys) >= 0.6, `${id} de espaldas: respira (el torso sube y baja ${(Math.max(...ys) - Math.min(...ys)).toFixed(2)})`);
    if (rig.chains?.length) {
      const tip = (i: number) => frames[i].f.bones[`ch${rig.chains![0].slot}3`];
      let sway = 0;
      for (let i = 1; i < frames.length; i++) sway = Math.max(sway, Math.hypot(tip(i)[4] - tip(0)[4], tip(i)[5] - tip(0)[5]));
      check(sway >= 0.5, `${id} de espaldas: la capa se mece (${sway.toFixed(2)})`);
    }
    if (MAGIC.includes(id)) {
      check(rig.shapes.some((s) => EMISSIVE.has(s.k)), `${id} de espaldas: su elemento mágico brilla`);
      check((rig.emitters?.length ?? 0) >= 1, `${id} de espaldas: su elemento mágico suelta partículas`);
    }
  }
}
