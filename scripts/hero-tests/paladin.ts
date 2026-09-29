// Sprite tests of the paladín (rig in src/fx/heroes/paladin.ts). Run from
// scripts/smoke-test.ts; add this character's own checks here (helpers in ./common.ts).

import { ACTION_DURATION, EMISSIVE, puppetImpact, puppetPose, type BoneId, type Matrix } from '../../src/fx/puppet.ts';
import { CHAIN_BONES, type ChainSlot } from '../../src/fx/chains.ts';
import { MAX_FIGURE_PIECES } from '../../src/fx/puppet-gpu.ts';
import { rigOf } from '../../src/fx/hero-rig.ts';
import { angryEyeChecks, anticipation, chainLag, figureChecks, rigidBones, simulate, worldPoint, type Check } from './common.ts';

type Pt = [number, number];

/** Centre of the hammer head (bind coordinates of the weapon bone). */
export const HAMMER_HEAD: Pt = [74.5, 65.5];
/** A point near the top of the shield (bind coordinates of the offhand bone). */
const SHIELD_TOP: Pt = [78, 83];

function chainTip(bones: Record<BoneId, Matrix>, slot: ChainSlot): Pt {
  const spec = rigOf('paladin').chains!.find((c) => c.slot === slot)!;
  return worldPoint(bones, CHAIN_BONES[slot][spec.joints.length - 2], spec.joints[spec.joints.length - 1]);
}

export function testPaladin(check: Check) {
  figureChecks(check, 'paladin');
  angryEyeChecks(check, 'paladin', 2);
  const rig = rigOf('paladin');
  const chains = rig.chains ?? [];
  const onChain = (slot: ChainSlot, k?: string) => rig.shapes.some((s) => s.b.startsWith(`ch${slot}`) && (!k || s.k === k));
  const slotsWith = (k: string) => chains.filter((c) => onChain(c.slot, k));

  // — look: plate, short cape, tabard, plume, shield with a sun, glowing hammer —
  check(rig.accent === '#ffd35a', 'paladín: luz de borde dorada');
  check(rig.shapes.length >= 45 && rig.shapes.length <= Math.min(80, MAX_FIGURE_PIECES), `paladín: ${rig.shapes.length} piezas, entre 45 y 80`);
  const capes = chains.filter((c) => (c.parent ?? 'torso') === 'torso' && c.joints[0][1] < 80 && (onChain(c.slot, 'cape') || onChain(c.slot, 'capeD')));
  check(capes.length >= 2, `paladín: capa corta en ${capes.length} paños con física`);
  check(capes.every((c) => c.joints.at(-1)![1] < 118), 'paladín: la capa es corta (no llega a los pies)');
  const tabards = slotsWith('cloth').concat(slotsWith('clothD')).filter((c) => (c.parent ?? 'torso') === 'torso' && c.joints[0][1] > 95);
  check(tabards.length >= 2, `paladín: el tabardo cuelga delante y detrás entre las piernas (${tabards.length} paños)`);
  const plume = chains.find((c) => c.parent === 'head' && onChain(c.slot, 'plume'));
  check(!!plume, 'paladín: penacho en el yelmo con física');
  const tassel = chains.find((c) => c.parent === 'weapon');
  check(!!tassel && onChain(tassel.slot), 'paladín: una borla cuelga del pomo del martillo');
  check(rig.shapes.some((s) => s.b === 'head' && s.t === 'p' && s.pts.length >= 12), 'paladín: yelmo cerrado');
  check(rig.shapes.some((s) => s.b === 'armF' && s.t === 'p' && s.pts.length >= 8) && rig.shapes.some((s) => s.b === 'armB' && s.t === 'p' && s.pts.length >= 7),
    'paladín: hombreras grandes en los dos hombros');
  check(!!rig.pivots.offhand && rig.shapes.some((s) => s.b === 'offhand' && s.k === 'steel' && s.t === 'p' && s.pts.length >= 10),
    'paladín: escudo grande en el antebrazo de atrás');
  const shieldAt = rig.shapes.findIndex((s) => s.b === 'offhand' && s.k === 'steel');
  const emblem = rig.shapes.filter((s, i) => s.b === 'offhand' && EMISSIVE.has(s.k) && i > shieldAt);
  check(emblem.length >= 2 && emblem.some((s) => s.t === 'p' && s.pts.length >= 12), 'paladín: el escudo lleva un sol de luz sagrada');
  const lastBody = Math.max(...rig.shapes.map((s, i) => (['torso', 'armF', 'weapon'].includes(s.b) ? i : -1)));
  check(emblem.every((s) => rig.shapes.indexOf(s) > lastBody), 'paladín: el sol del escudo se pinta delante del cuerpo y del martillo');
  const hammer = rig.shapes.filter((s) => s.b === 'weapon');
  check(hammer.some((s) => s.k === 'wood' && s.t === 'l') && hammer.filter((s) => s.k === 'steel' && s.t === 'p').length >= 3, 'paladín: martillo de guerra (mango y cabeza)');
  check(hammer.filter((s) => EMISSIVE.has(s.k)).length >= 2, 'paladín: la cabeza del martillo brilla con luz sagrada');
  const glow = new Set(rig.shapes.filter((s) => EMISSIVE.has(s.k) && s.k !== 'eyeGlow').map((s) => s.b));
  check([...glow].every((b) => b === 'weapon' || b === 'offhand'), 'paladín: solo brillan el martillo, el sol del escudo y los ojos');
  check(rig.focusBone === undefined && Math.hypot(rig.focus[0] - HAMMER_HEAD[0], rig.focus[1] - HAMMER_HEAD[1]) < 2, 'paladín: la luz del conjuro nace en el martillo');

  // — firm stance: feet apart, hammer up beside the helm, shield in front —
  const rest = rigidBones('paladin', null);
  const toe = (b: BoneId, x: number) => worldPoint(rest, b, [x, 126])[0];
  check(toe('legF', 72) - toe('legB', 52) > 22, 'paladín: postura firme con los pies separados');
  const head = worldPoint(rest, 'head', [62, 57]);
  check(worldPoint(rest, 'weapon', HAMMER_HEAD)[1] < head[1] + 8, 'paladín: en guardia, el martillo en alto junto al yelmo');
  check(worldPoint(rest, 'offhand', [78, 97])[0] > worldPoint(rest, 'torso', [60, 85])[0] + 12, 'paladín: el escudo va delante del cuerpo');

  // — the hammer blow: big lift over the helm, crushing snap down, hit-stop —
  const impact = puppetImpact(rig);
  check(rig.impact === impact && impact >= 0.4 && impact <= 0.5, `paladín: el martillazo cae en ${impact} del ataque`);
  const a = anticipation('paladin', 'weapon', HAMMER_HEAD);
  check(a.back > 25, `paladín: carga el martillo muy atrás (${a.back.toFixed(1)})`);
  check(a.forward > 10, `paladín: en el impacto el martillo está delante (${a.forward.toFixed(1)})`);
  const at = (q: number) => worldPoint(rigidBones('paladin', 'attack', q), 'weapon', HAMMER_HEAD);
  const helmTop = (q: number) => worldPoint(rigidBones('paladin', 'attack', q), 'head', [63, 42])[1];
  check([0.3, 0.35, 0.39].some((q) => at(q)[1] < helmTop(q)), 'paladín: el martillo pasa por encima del yelmo');
  check(at(impact)[1] > worldPoint(rigidBones('paladin', 'attack', impact), 'torso', [60, 100])[1], 'paladín: el golpe baja hasta el suelo, delante');
  const speed = (q: number) => Math.hypot(at(q + 0.01)[0] - at(q)[0], at(q + 0.01)[1] - at(q)[1]);
  let peakQ = 0, peak = 0;
  for (let q = 0.02; q < 0.98; q += 0.01) if (speed(q) > peak) { peak = speed(q); peakQ = q; }
  check(peakQ > impact - 0.08 && peakQ < impact, `paladín: el martillo va más rápido justo antes del impacto (${peakQ.toFixed(2)})`);
  check(speed(impact + 0.01) < peak * 0.1, 'paladín: pausa en el impacto (hit-stop)');
  let hang = 0;
  for (let q = 0.3; q < impact - 0.06; q += 0.01) hang = Math.max(hang, speed(q));
  check(hang < peak * 0.3, 'paladín: se queda arriba un instante antes de descargar el golpe');
  const fxAt = (q: number) => puppetPose(rig, 0, { type: 'attack', p: q }).fx;
  check(fxAt(impact - 0.03).smear !== undefined && fxAt(impact + 0.01).slash !== undefined, 'paladín: estela dorada y tajo acompañan al martillazo');
  check((rig.bursts?.attack ?? []).some((b) => b.bone === 'weapon' && b.effect === 'divino'), 'paladín: estallido de luz sagrada en el impacto');
  const sqAt = (q: number) => puppetPose(rig, 0, { type: 'attack', p: q }).p.squash;
  let settle = 0, stretch = 0;
  for (let q = 0; q < 1; q += 0.02) { if (q > impact) settle = Math.max(settle, sqAt(q)); else stretch = Math.min(stretch, sqAt(q)); }
  check(stretch < -0.04 && settle > 0.1, `paladín: se estira al alzar el martillo y se aplasta al golpear (${stretch.toFixed(2)} / ${settle.toFixed(2)})`);

  // — secondary motion —
  const capeLag = Math.max(...capes.map((c) => chainLag('paladin', c.slot, 'attack')));
  check(capeLag > 3, `paladín: la capa se retrasa en el martillazo (${capeLag.toFixed(1)})`);
  if (plume) check(chainLag('paladin', plume.slot, 'attack') > 3, 'paladín: el penacho se sacude con el golpe');
  if (tassel) check(chainLag('paladin', tassel.slot, 'attack') > 3, 'paladín: la borla del martillo vuela con el golpe');
  const tabLag = Math.max(...tabards.map((c) => chainLag('paladin', c.slot, 'hit')));
  check(tabLag > 1.5, `paladín: el tabardo ondea al recibir un golpe (${tabLag.toFixed(1)})`);
  // the cape must not fly off into a horizontal slab on the lunge
  let flat = 0;
  for (const { t, f } of simulate('paladin', 60, 1.4, { type: 'attack', t0: 0.3 })) {
    if (t < 0.3) continue;
    for (const c of capes) {
      const root = worldPoint(f.bones, CHAIN_BONES[c.slot][0], c.joints[0]), tip = chainTip(f.bones, c.slot);
      flat = Math.max(flat, (root[0] - tip[0]) / Math.max(1, tip[1] - root[1]));
    }
  }
  check(flat < 1.6, `paladín: la capa cuelga pesada, no sale volando en horizontal (${flat.toFixed(2)})`);

  // — spell: the hammer raised to the sky, a burst of light at its head —
  const sp = (q: number) => rigidBones('paladin', 'spell', q);
  const top = Math.min(...[0.45, 0.55, 0.65].map((q) => worldPoint(sp(q), 'weapon', HAMMER_HEAD)[1]));
  check(top < worldPoint(sp(0.55), 'head', [63, 42])[1] - 10, 'paladín: al conjurar alza el martillo por encima del yelmo');
  const spFx = puppetPose(rig, 0, { type: 'spell', p: 0.55 }).fx;
  check(spFx.burst !== undefined && spFx.projectile === undefined, 'paladín: estallido de luz sin proyectil');

  // — hit: braced behind the raised shield —
  const shieldY = (type: 'hit' | null, q = 0) => worldPoint(rigidBones('paladin', type, q), 'offhand', SHIELD_TOP)[1];
  check(shieldY(null) - shieldY('hit', 0.1) > 8, 'paladín: al recibir un golpe alza el escudo');
  const hitPose = puppetPose(rig, 0, { type: 'hit', p: 0.1 });
  check(hitPose.p.rootX < 0 && hitPose.p.squash > 0.05 && !!hitPose.fx.flash, 'paladín: encaja el golpe agachado tras el escudo');

  // — death: to his knees, leaning on the planted hammer —
  for (const dq of [0.4, 0.6, 0.9]) {
    const db = rigidBones('paladin', 'death', dq);
    const h = worldPoint(db, 'weapon', HAMMER_HEAD), fist = worldPoint(db, 'weapon', rig.pivots.weapon!);
    check(h[1] > fist[1] + 20 && h[1] > 112 && h[1] < 134, `paladín: al morir apoya el martillo clavado en el suelo (${dq})`);
  }
  check(puppetPose(rig, 0, { type: 'death', p: 0.6 }).p.squash > 0.1, 'paladín: cae de rodillas');
  check(puppetPose(rig, 0, { type: 'death', p: 0.99 }).fx.opacity === 0, 'paladín: se desvanece');

  // — stability: deterministic, frame-rate independent, settles back —
  const tipsAt = (fps: number, t: number) => {
    const f = simulate('paladin', fps, t, { type: 'attack', t0: 0.3 }).at(-1)!.f;
    return chains.map((c) => chainTip(f.bones, c.slot));
  };
  const diff = (x: Pt[], y: Pt[]) => Math.max(...x.map((p, i) => Math.hypot(p[0] - y[i][0], p[1] - y[i][1])));
  check(diff(tipsAt(60, 0.7), tipsAt(60, 0.7)) === 0, 'paladín: la física es determinista');
  check(diff(tipsAt(30, 0.7), tipsAt(60, 0.7)) < 2, `paladín: la física no depende de los fps (${diff(tipsAt(30, 0.7), tipsAt(60, 0.7)).toFixed(2)})`);
  const idle = simulate('paladin', 60, 4).at(-1)!.f, after = simulate('paladin', 60, 4, { type: 'attack', t0: 0.3 }).at(-1)!.f;
  const settled = diff(chains.map((c) => chainTip(idle.bones, c.slot)), chains.map((c) => chainTip(after.bones, c.slot)));
  check(settled < 1, `paladín: tras el martillazo todo vuelve al reposo (${settled.toFixed(2)})`);
  let wander = 0;
  const restTips = chains.map((c) => chainTip(rest, c.slot));
  for (const { f } of simulate('paladin', 30, 12)) wander = Math.max(wander, diff(chains.map((c) => chainTip(f.bones, c.slot)), restTips));
  check(wander < 8, `paladín: en reposo la tela ondea sin desmadrarse (${wander.toFixed(1)})`);
  // the SVG fallback clips at its viewBox (140×135): the hammer must never leave it
  let out = '';
  for (const type of ['attack', 'spell', 'hit', 'death'] as const) {
    for (const { f } of simulate('paladin', 60, 1.3, { type, t0: 0.2 })) {
      for (const s of rig.shapes) {
        const pts: Pt[] = s.t === 'p' ? s.pts : s.t === 'l' ? [[s.x1, s.y1], [s.x2, s.y2]] : [[s.x, s.y]];
        for (const p of pts) {
          const [x, y] = worldPoint(f.bones, s.b, p);
          if (!out && (x < -1 || x > 141 || y < -1 || y > 136)) out = `${type} (${s.b} en ${x.toFixed(0)}, ${y.toFixed(0)})`;
        }
      }
    }
  }
  check(!out, `paladín: cabe siempre en el lienzo del SVG${out ? ` — se sale en ${out}` : ''}`);
  check(ACTION_DURATION.attack === 0.8, 'paladín: el ataque dura lo que espera el combate');
}
