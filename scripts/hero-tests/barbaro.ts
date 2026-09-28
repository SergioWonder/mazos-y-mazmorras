// Sprite tests of the bárbaro (rig in src/fx/heroes/barbaro.ts). Run from
// scripts/smoke-test.ts; add this character's own checks here (helpers in ./common.ts).

import { ACTION_DURATION, puppetImpact, puppetPose, type BoneId, type Matrix } from '../../src/fx/puppet.ts';
import { CHAIN_BONES, type ChainSlot } from '../../src/fx/chains.ts';
import { MAX_FIGURE_PIECES } from '../../src/fx/puppet-gpu.ts';
import { rigOf } from '../../src/fx/hero-rig.ts';
import { anticipation, chainLag, figureChecks, rigidBones, simulate, worldPoint, type Check } from './common.ts';

type Pt = [number, number];

/** Point on the axe head (bind coordinates of the weapon bone). */
export const AXE_HEAD: Pt = [74, 66];

function chainTip(bones: Record<BoneId, Matrix>, slot: ChainSlot): Pt {
  const spec = rigOf('barbaro').chains!.find((c) => c.slot === slot)!;
  return worldPoint(bones, CHAIN_BONES[slot][spec.joints.length - 2], spec.joints[spec.joints.length - 1]);
}

/** True when a chain hangs, directly or through earlier chains, from the head. */
function hangsFromHead(slot: ChainSlot): boolean {
  const chains = rigOf('barbaro').chains ?? [];
  let parent: BoneId | undefined = chains.find((c) => c.slot === slot)?.parent;
  for (let i = 0; i < 6 && parent && parent !== 'head'; i++) {
    const owner: ChainSlot | undefined = chains.find((c) => (CHAIN_BONES[c.slot] as BoneId[]).includes(parent!))?.slot;
    parent = owner ? chains.find((c) => c.slot === owner)?.parent : undefined;
  }
  return parent === 'head';
}

export function testBarbaro(check: Check) {
  figureChecks(check, 'barbaro');
  const rig = rigOf('barbaro');
  const chains = rig.chains ?? [];

  // — detail: a wild spiky mane on spring chains, V torso, big axe, pelts —
  const mane = chains.filter((c) => hangsFromHead(c.slot) && c.joints.length === 4
    && rig.shapes.some((s) => s.k === 'hair' && s.b === CHAIN_BONES[c.slot][2]));
  check(mane.length >= 4, `bárbaro: melena de ${mane.length} mechones encadenados con física`);
  check(chains.some((c) => (c.parent ?? 'torso') !== 'head' && rig.shapes.some((s) => s.k === 'fur' && s.b.startsWith(`ch${c.slot}`))),
    'bárbaro: taparrabos de pieles con física');
  check(rig.shapes.filter((s) => s.k === 'hair' && s.b === 'head' && s.t === 'p' && s.pts.length >= 9).length >= 1, 'bárbaro: cresta puntiaguda fija sobre la cabeza');
  check(!rig.shapes.some((s) => s.k === 'eye') && rig.shapes.filter((s) => s.k === 'eyeGlow').length === 2, 'bárbaro: de la cara solo se ven dos ojos brillantes');
  check(rig.shapes.some((s) => s.b === 'offhand') && !!rig.pivots.offhand, 'bárbaro: el brazo de atrás tiene codo y antebrazo');
  check(rig.shapes.filter((s) => s.b === 'weapon' && s.k === 'steel' && s.t === 'p').length >= 2, 'bárbaro: hacha de doble filo');
  const torso = rig.shapes.find((s) => s.b === 'torso' && s.k === 'skin' && s.t === 'p');
  const span = (y0: number, y1: number) => {
    if (!torso || torso.t !== 'p') return 0;
    const xs = torso.pts.filter(([, y]) => y >= y0 && y <= y1).map(([x]) => x);
    return xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
  };
  check(span(66, 76) > span(96, 106) * 1.5, `bárbaro: torso en V (hombros ${span(66, 76)} frente a cintura ${span(96, 106)})`);
  check(rig.shapes.length >= 50 && rig.shapes.length <= Math.min(80, MAX_FIGURE_PIECES), `bárbaro: ${rig.shapes.length} piezas, entre 50 y 80`);

  // — the chop: axe loaded far back over the head, a snapping blow on the impact —
  const impact = puppetImpact(rig);
  check(rig.impact === impact && impact >= 0.35 && impact <= 0.55, `bárbaro: el hachazo cae en ${impact} del ataque`);
  const a = anticipation('barbaro', 'weapon', AXE_HEAD);
  check(a.back > 30, `bárbaro: carga el hacha muy atrás antes del tajo (${a.back.toFixed(1)})`);
  check(a.forward > 10, `bárbaro: en el impacto el hacha está delante (${a.forward.toFixed(1)})`);
  const at = (q: number) => worldPoint(rigidBones('barbaro', 'attack', q), 'weapon', AXE_HEAD);
  const shoulderY = worldPoint(rigidBones('barbaro', 'attack', impact), 'torso', [68, 78])[1];
  check(at(impact - 0.2)[1] < shoulderY - 10 || at(impact - 0.14)[1] < shoulderY - 10, 'bárbaro: el hacha pasa por encima de la cabeza');
  check(at(impact)[1] > shoulderY, 'bárbaro: el tajo baja de arriba abajo');
  const speed = (q: number) => Math.hypot(at(q + 0.01)[0] - at(q)[0], at(q + 0.01)[1] - at(q)[1]);
  let peakQ = 0, peak = 0;
  for (let q = 0.02; q < 0.98; q += 0.01) if (speed(q) > peak) { peak = speed(q); peakQ = q; }
  check(peakQ > impact - 0.1 && peakQ < impact, `bárbaro: el hacha va más rápida justo antes del impacto (${peakQ.toFixed(2)})`);
  check(speed(impact + 0.01) < peak * 0.1, 'bárbaro: pausa en el impacto (hit-stop)');
  const fxAt = (q: number) => puppetPose(rig, 0, { type: 'attack', p: q }).fx;
  check(fxAt(impact).slash !== undefined && fxAt(impact - 0.03).smear !== undefined, 'bárbaro: estela y tajo acompañan al golpe');
  const sqAt = (q: number) => puppetPose(rig, 0, { type: 'attack', p: q }).p.squash;
  let settle = 0, stretch = 0;
  for (let q = 0; q < 1; q += 0.02) { if (q > impact) settle = Math.max(settle, sqAt(q)); else stretch = Math.min(stretch, sqAt(q)); }
  check(stretch < -0.04 && settle > 0.1, `bárbaro: se estira al cargar y se aplasta al asentarse (${stretch.toFixed(2)} / ${settle.toFixed(2)})`);

  // — secondary motion: the mane trails the chop, whips on the impact, flies on a hit —
  const lags = mane.map((c) => chainLag('barbaro', c.slot, 'attack'));
  check(Math.max(...lags) > 5, `bárbaro: la melena se retrasa respecto a la cabeza en el tajo (${Math.max(...lags).toFixed(1)})`);
  check(lags.filter((l) => l > 2.5).length >= 3, 'bárbaro: se sacuden varios mechones, no solo uno');
  const hitLag = Math.max(...mane.map((c) => chainLag('barbaro', c.slot, 'hit')));
  check(hitLag > 3, `bárbaro: al recibir un golpe la melena sale despedida (${hitLag.toFixed(1)})`);

  // — the roar: chest out, head back, arms open, mane bristling —
  const spellPeak = (fn: (p: ReturnType<typeof puppetPose>['p']) => number) => {
    let m = -Infinity;
    for (let q = 0; q < 1; q += 0.02) m = Math.max(m, fn(puppetPose(rig, 0, { type: 'spell', p: q }).p));
    return m;
  };
  const rest = puppetPose(rig, 0, null).p;
  check(spellPeak((p) => rest.head - p.head) > 15, 'bárbaro: echa la cabeza atrás al rugir');
  check(spellPeak((p) => rest.torso - p.torso) > 12, 'bárbaro: hincha el pecho al rugir');
  check(spellPeak((p) => Math.min(rest.armF - p.armF, p.armB - rest.armB)) > 60, 'bárbaro: abre los brazos al rugir');
  check(spellPeak((p) => mane.filter((c) => p[CHAIN_BONES[c.slot][0]] > 8).length) >= 3, 'bárbaro: la melena se eriza al rugir');

  // — death: to his knees, the axe bites into the ground —
  const dq = 0.55, db = rigidBones('barbaro', 'death', dq);
  const axe = worldPoint(db, 'weapon', AXE_HEAD), fist = worldPoint(db, 'weapon', rig.pivots.weapon!);
  check(axe[1] > fist[1] + 20 && axe[1] > 112, 'bárbaro: al morir clava el hacha en el suelo');
  check(puppetPose(rig, 0, { type: 'death', p: dq }).p.squash > 0.1, 'bárbaro: cae de rodillas');

  // — stability: deterministic, frame-rate independent, settles back —
  const tipsAt = (fps: number, t: number) => {
    const f = simulate('barbaro', fps, t, { type: 'attack', t0: 0.3 }).at(-1)!.f;
    return mane.map((c) => chainTip(f.bones, c.slot));
  };
  const diff = (x: Pt[], y: Pt[]) => Math.max(...x.map((p, i) => Math.hypot(p[0] - y[i][0], p[1] - y[i][1])));
  check(diff(tipsAt(60, 0.7), tipsAt(60, 0.7)) === 0, 'bárbaro: la física de la melena es determinista');
  check(diff(tipsAt(30, 0.7), tipsAt(60, 0.7)) < 2, `bárbaro: la melena no depende de los fps (${diff(tipsAt(30, 0.7), tipsAt(60, 0.7)).toFixed(2)})`);
  const idle = simulate('barbaro', 60, 4).at(-1)!.f, after = simulate('barbaro', 60, 4, { type: 'attack', t0: 0.3 }).at(-1)!.f;
  const settled = diff(mane.map((c) => chainTip(idle.bones, c.slot)), mane.map((c) => chainTip(after.bones, c.slot)));
  check(settled < 1, `bárbaro: tras el hachazo la melena vuelve al reposo (${settled.toFixed(2)})`);
  let calm = true;
  const restTips = mane.map((c) => chainTip(rigidBones('barbaro', null), c.slot));
  for (const { f } of simulate('barbaro', 60, 8)) if (diff(mane.map((c) => chainTip(f.bones, c.slot)), restTips) > 8) calm = false;
  check(calm, 'bárbaro: en reposo la melena ondea sin desmadrarse');
  // the SVG fallback clips at its viewBox (140×135): the axe must never leave it
  let out = '';
  for (const type of ['attack', 'spell', 'hit', 'death'] as const) {
    for (const { f } of simulate('barbaro', 60, 1.3, { type, t0: 0.2 })) {
      for (const s of rig.shapes) {
        const pts: Pt[] = s.t === 'p' ? s.pts : s.t === 'l' ? [[s.x1, s.y1], [s.x2, s.y2]] : [[s.x, s.y]];
        for (const p of pts) {
          const [x, y] = worldPoint(f.bones, s.b, p);
          if (!out && (x < -1 || x > 141 || y < -1 || y > 136)) out = `${type} (${s.b} en ${x.toFixed(0)}, ${y.toFixed(0)})`;
        }
      }
    }
  }
  check(!out, `bárbaro: cabe siempre en el lienzo del SVG${out ? ` — se sale en ${out}` : ''}`);
  check(ACTION_DURATION.attack === 0.8, 'bárbaro: el ataque dura lo que espera el combate');
}
