// Paladin rig (backlit silhouette). Bind-pose coordinates: viewBox 140×135,
// facing right, feet at y≈128. See src/fx/heroes/README.md for chains (hair,
// cloth), action timelines and the piece budget.
//
// Look: a heavy holy warrior in full plate — big layered pauldrons, a closed
// great helm with a jutting visor, a small wing at the temple and a horsehair
// plume, a short cape and a tabard between the greaves. A large heater shield is
// strapped to the back forearm and held in front of the body; the front hand
// carries a one-handed warhammer. Only the sun on the shield, the hammer head
// (holy light) and the eye slits of the visor glow.
//
// Bones: armF is the whole front arm and the weapon bone pivots on its fist; the
// back arm has an elbow (armB = upper arm, offhand = forearm + shield).
// Chains: A inner cape, B outer cape, C front tabard, D helm plume,
// E hammer tassel (hangs from the pommel), F back tabard.
// Acting: firm and protective. The attack is a big overhead hammer blow (long
// lift, a hang at the top, a crushing snap down with a golden smear); the spell
// raises the hammer to the sky in a burst of light; a hit is taken behind the
// raised shield; he dies on his knees, leaning on the planted hammer.

import { C, E, P, L, slitEye, type ActionScript, type PuppetRig } from '../puppet.ts';
import { strandShapes, type ChainSpec } from '../chains.ts';
import { EASE, pulse, shake } from '../motion.ts';

type Pt = [number, number];

/** Centre of the hammer head on the weapon bone (bursts, spell light). */
const HAMMER: Pt = [74.5, 65.5];
/** Centre of the sun on the shield (offhand bone). */
const SUN: Pt = [78, 97];
const IMPACT = 0.46;

/** Rayed sun: n spikes alternating between the outer and inner radius (2n vertices). */
function sun(cx: number, cy: number, rOut: number, rIn: number, n = 8): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i * Math.PI) / n - Math.PI / 2, r = i % 2 ? rIn : rOut;
    pts.push([Math.round((cx + Math.cos(a) * r) * 100) / 100, Math.round((cy + Math.sin(a) * r) * 100) / 100]);
  }
  return pts;
}

// ── Cloth: a short cape behind the shoulders, the tabard between the legs ────
const CAPE_IN: ChainSpec = {
  slot: 'A', joints: [[51, 72], [48, 86], [46, 99], [45, 111]],
  freq: 2.8, damping: 0.6, taper: 0.4, sag: 1, sway: 1.1, limit: 40,
};
const CAPE_OUT: ChainSpec = {
  slot: 'B', joints: [[48, 73], [43, 86], [40, 98], [37, 109]],
  freq: 2.5, damping: 0.58, taper: 0.45, sag: 1.1, sway: 1.4, limit: 45,
};
const TABARD: ChainSpec = {
  slot: 'C', joints: [[63, 99], [64, 107], [64.5, 115], [64.5, 123]],
  freq: 2.6, damping: 0.4, taper: 0.35, sag: 0.8, sway: 0.8, limit: 50,
};
const TABARD_BACK: ChainSpec = {
  slot: 'F', joints: [[53, 99], [51, 107], [49.5, 115], [48.5, 122]],
  freq: 2.4, damping: 0.4, taper: 0.35, sag: 0.8, sway: 0.9, limit: 50,
};
// ── The plume trails back from the crest; a leather tassel hangs from the pommel ─
const PLUME: ChainSpec = {
  slot: 'D', parent: 'head', joints: [[64, 41], [57, 34.5], [48, 34.5], [41, 41]],
  freq: 2.8, damping: 0.3, taper: 0.45, sag: 1, sway: 1.5, limit: 65,
};
const TASSEL: ChainSpec = {
  slot: 'E', parent: 'weapon', joints: [[74.5, 112], [75, 117], [75.5, 122]],
  freq: 3, damping: 0.22, taper: 0.3, sag: 0.8, sway: 0.4, limit: 85,
};

// ── Attack: the hammer blow ──────────────────────────────────────────────────
/** Pose at the very instant the hammer lands. */
const SMASH = {
  rootX: 4, torsoY: 3, torso: 18, head: 6, squash: 0.1,
  armF: -22, weapon: 116, armB: 14, offhand: -14, legF: -26, legB: 22,
  // the cape keeps hanging from the leaning shoulders instead of flying off
  chA1: -18, chA2: -6, chB1: -22, chB2: -8,
};
const ATTACK: ActionScript = {
  keys: [
    [0, {}],
    // settle the weight: a short dip, the shield tucks in
    [0.1, { squash: 0.07, torso: 9, head: 8, armF: -40, weapon: 20, rootX: -1, armB: -4 }, EASE.smooth],
    // the lift: the hammer swings back over the helm, the body rears up tall
    [0.3, {
      rootX: -2, torso: -15, head: -10, squash: -0.06, armF: -175, weapon: 100, armB: 22, offhand: -26,
      legF: -8, legB: 10, chA1: -10, chB1: -14, chD1: 14,
    }, EASE.easeOut],
    // hang at the top: the hips already drive forward, the hammer drags behind
    [0.39, {
      rootX: -1, torso: -9, head: -7, squash: -0.07, armF: -178, weapon: 117, armB: 26, offhand: -30,
      legF: -12, legB: 13, chA1: -12, chB1: -16, chD1: 18,
    }, EASE.smooth],
    // the blow snaps down: the arm leads and the wrist stays cocked…
    [IMPACT - 0.03, {
      rootX: 3, torsoY: 1, torso: 4, head: 0, squash: -0.02, armF: -112, weapon: 96, armB: 20, offhand: -22,
      legF: -20, legB: 18, chA1: -10, chB1: -12, chD1: 10,
    }, EASE.expoIn],
    // …then the hammer head whips down onto the impact
    [IMPACT, SMASH, EASE.linear],
    // hit-stop
    [IMPACT + 0.06, SMASH, EASE.linear],
    // follow-through: the weight crunches down behind the hammer
    [0.64, { ...SMASH, rootX: 5, torsoY: 4, torso: 21, head: 9, squash: 0.13, armF: -18, weapon: 106 }, EASE.easeOut],
    // he drags the hammer back under the shoulder, then hauls it up to guard
    [0.74, { rootX: 4, torsoY: 3, torso: 14, head: 8, squash: 0.08, armF: 2, weapon: 78, armB: 8, offhand: -8, chA1: -10, chB1: -12 }, EASE.smooth],
    [0.87, { rootX: 2, torsoY: 1, torso: 8, head: 6, squash: 0.03, armF: -30, weapon: 50, armB: 0, offhand: -5 }, EASE.smooth],
    [1, {}, EASE.smooth],
  ],
  slash: [IMPACT - 0.04, 0.66],
  smear: [IMPACT - 0.08, IMPACT + 0.02],
  smearBones: ['weapon', 'armF'],
};

// ── Spell: the hammer raised to the sky, a burst of holy light ───────────────
const EXALT = {
  rootX: -1, torso: -8, head: -14, squash: -0.05, armF: -188, weapon: 192, armB: -16, offhand: -20,
  legF: -8, legB: 8, chD1: 12, chA1: -6, chB1: -10,
};
const SPELL: ActionScript = {
  keys: [
    [0, {}],
    // kneel into it: head bowed, the hammer drawn to the chest
    [0.24, { squash: 0.08, torso: 12, head: 16, torsoY: 2, armF: -80, weapon: 70, armB: 10, offhand: -4 }, EASE.smooth],
    [0.4, EXALT, EASE.backOut],
    [0.74, { ...EXALT, head: -12, torso: -6 }, EASE.linear],
    [1, {}, EASE.smooth],
  ],
  burst: [0.38, 0.8],
  smear: [0.3, 0.42],
};

// ── Hit: braced behind the raised shield ─────────────────────────────────────
const HIT: ActionScript = {
  keys: [
    [0, {}],
    [0.1, {
      rootX: -6, torso: -8, head: 12, squash: 0.1, armB: -30, offhand: -32, armF: -20, weapon: 40,
      legF: 6, legB: -5, chA1: -22, chB1: -28, chC1: -14, chF1: -12, chD1: 24,
    }, EASE.expoOut],
    [0.36, { rootX: -4, torso: -2, head: 8, squash: 0.04, armB: -20, offhand: -22 }, EASE.smooth],
    [1, {}, EASE.smooth],
  ],
};

// ── Death: to his knees, leaning on the hammer planted head-down ─────────────
const KNEEL = {
  rootX: 3, torsoY: 9, torso: 7, head: 18, squash: 0.15,
  armF: -82, weapon: 258, armB: 30, offhand: 20, legF: -28, legB: 24,
};
const SLUMP = { ...KNEEL, rootX: 4, torsoY: 11, torso: 15, head: 30, squash: 0.18, armF: -92, weapon: 266, armB: 40, offhand: 30 };
const DEATH: ActionScript = {
  keys: [
    [0, {}],
    [0.1, { rootX: -7, torso: -12, head: -10, squash: 0.02, armF: -30, weapon: 50, armB: -20 }, EASE.expoOut],
    // the knees give way and the hammer is planted in front of him
    [0.32, KNEEL, EASE.backIn],
    [0.5, { ...KNEEL, head: 23, torso: 10 }, EASE.smooth],
    // the head bows over the hammer
    [0.75, SLUMP, EASE.easeIn],
    [1, { ...SLUMP, head: 34, torso: 17 }, EASE.linear],
  ],
};

export const PALADIN_RIG: PuppetRig = {
  accent: '#ffd35a', style: 'melee', phase: 5.3, focus: HAMMER, slash: [30, 50], slashAt: ['torso', [67, 77]],
  palette: {
    plate: '#8f97a4', plateD: '#5f6672', steel: '#b9c2cc', cloth: '#e6dcc4', clothD: '#b8a987',
    cape: '#7a1f24', capeD: '#56151a', plume: '#e9e1d0', leather: '#5b3b26', wood: '#6e4a2c',
    magic: '#ffd35a', gem: '#ffe9a0', sparkle: '#fff6d6', eyeGlow: '#ffe27a',
  },
  pivots: { armF: [67, 77], armB: [52, 78], offhand: [53, 90], weapon: [74.5, 99.5] },
  headScale: 0.84,
  impact: IMPACT,
  chains: [CAPE_IN, CAPE_OUT, TABARD, PLUME, TASSEL, TABARD_BACK],
  rest: { torso: 3, head: 4, armF: -34, weapon: 36, armB: -6, offhand: -4, legF: -7, legB: 8 },
  windup: { rootX: -4, torso: -15, head: -10, armF: -175, weapon: 102 },
  strike: SMASH,
  actions: { attack: ATTACK, spell: SPELL, hit: HIT, death: DEATH },
  bursts: {
    attack: [{ bone: 'weapon', at: HAMMER, effect: 'divino', scale: 0.9 }],
    spell: [{ bone: 'weapon', at: HAMMER, effect: 'divino', scale: 1.1 }],
  },
  emitters: [{ bone: 'weapon', at: HAMMER, effect: 'destelloCarta', rate: 1.6, spread: 5 }],
  animate(p, t, action) {
    if (!action) return;
    // tremble through the hit-stop and while the light pours out
    if (action.type === 'attack' && action.p > IMPACT && action.p < IMPACT + 0.07) {
      p.rootX += shake(t, 0.7); p.torso += shake(t + 0.3, 1);
    } else if (action.type === 'spell') {
      const glow = pulse(action.p, 0.4, 0.76);
      p.armF += shake(t, 1.2 * glow, 22); p.head += shake(t + 0.2, 0.8 * glow, 22);
    }
  },
  shapes: [
    // — short cape and plume (behind everything) —
    ...strandShapes(CAPE_OUT, 'capeD', [6, 9, 11, 12], { tip: 'flat' }),
    ...strandShapes(CAPE_IN, 'cape', [8, 11, 12, 12], { tip: 'flat' }),
    ...strandShapes(PLUME, 'plume', [7, 9, 7, 2], { tip: 'point' }),
    // — back tabard flap and back leg (greave, knee cop, sabaton) —
    ...strandShapes(TABARD_BACK, 'clothD', [11, 11, 10.5, 10], { tip: 'flat' }),
    L('legB', 'plate', 54, 100, 53, 112, 11.5), C('legB', 'plateD', 53, 112, 5.2), L('legB', 'plate', 53, 112, 52.5, 122, 9.5),
    P('legB', 'plateD', [[46.5, 121], [56, 120], [61, 124], [61, 128], [46.5, 128]]),
    // — back arm: pauldron, upper arm, forearm —
    P('armB', 'plate', [[40, 78], [41, 71.5], [46, 67.5], [53, 66.5], [58.5, 69.5], [58, 76], [50, 83], [43, 82]]),
    L('armB', 'plate', 52, 79, 53, 90, 9.5),
    L('offhand', 'plate', 53, 90, 66, 95, 8.5), C('offhand', 'plateD', 67.5, 95.5, 4.5),
    // — front leg —
    L('legF', 'plate', 63, 100, 66, 112, 12), C('legF', 'plateD', 66, 112, 5.5), L('legF', 'plate', 66, 112, 67.5, 122, 10),
    P('legF', 'plateD', [[61.5, 121], [71, 120], [76, 124], [76, 128], [61.5, 128]]),
    // — cuirass: barrel chest, gorget, layered faulds —
    P('torso', 'plate', [[42, 77], [45, 69], [52, 65], [60, 63.5], [68, 65], [74, 69], [77, 76], [77.5, 84], [75, 92], [71, 99], [49, 99], [46, 92], [43, 85]]),
    E('torso', 'plateD', 60, 67, 8, 4.5),
    P('torso', 'plateD', [[47, 96], [72, 96], [74, 104], [70, 106], [65, 104.5], [60, 106], [54, 104.5], [49, 106], [45, 104]]),
    ...strandShapes(TABARD, 'cloth', [12, 11.5, 11, 10.5], { tip: 'flat' }),
    // — great helm: dome, jutting visor, crest comb and a small wing at the temple —
    P('head', 'plate', [[48, 64], [47.5, 55], [50.5, 48], [56, 43.5], [63, 42], [70, 44], [75, 49], [78, 55], [79, 61], [78, 67], [74, 71.5], [66, 73], [57, 72.5], [51, 69]]),
    P('head', 'plate', [[76, 53.5], [82, 57], [82.5, 59.5], [77, 61.5]]),
    // the eyes burn through the visor slit
    slitEye('head', 'eyeGlow', [64, 57], [70, 59.2], 1.5), slitEye('head', 'eyeGlow', [76.5, 57.4], [72.4, 58.9], 1.3),
    // — front arm: layered pauldron, vambrace, elbow cop —
    P('armF', 'plate', [[57, 75], [59.5, 68.5], [66, 65], [74, 65.5], [79.5, 69.5], [81.5, 76], [78, 80.5], [70, 82], [61, 80]]),
    E('armF', 'plateD', 71, 84, 8, 4),
    L('armF', 'plate', 67, 80, 70.5, 90, 10.5), C('armF', 'plateD', 70.5, 90, 5.4),
    L('armF', 'plate', 70.5, 90, 74.5, 99, 9.5),
    // — warhammer: haft, pommel tassel, flanged head glowing with holy light —
    L('weapon', 'wood', 74.5, 110, 74.5, 66, 3.8), C('weapon', 'steel', 74.5, 111, 2.6),
    ...strandShapes(TASSEL, 'leather', [1.8, 2.4, 0.8], { tip: 'point' }),
    P('weapon', 'steel', [[65.5, 60], [83.5, 60], [83.5, 71], [65.5, 71]]),
    P('weapon', 'steel', [[62, 58], [66.5, 58.5], [66.5, 72.5], [62, 73]]),
    P('weapon', 'steel', [[83, 58.5], [87.5, 58], [87.5, 73], [83, 72.5]]),
    P('weapon', 'steel', [[72, 60.5], [74.5, 52], [77, 60.5]]),
    P('weapon', 'magic', [[68, 62.2], [81, 62.2], [81, 68.8], [68, 68.8]]),
    P('weapon', 'sparkle', [[74.5, 62.4], [76.8, 65.5], [74.5, 68.6], [72.2, 65.5]]),
    // gauntlet over the haft
    C('armF', 'plateD', 74.5, 99.5, 5.6),
    // — heater shield on the back forearm, a sun of holy light on it —
    P('offhand', 'steel', [[65, 82], [71.5, 80.5], [78, 80], [84.5, 80.5], [91, 82], [91.5, 92], [90, 101], [85.5, 109.5], [78, 117], [70.5, 109.5], [66, 101], [64.5, 92]]),
    P('offhand', 'magic', sun(SUN[0], SUN[1], 8, 4.2)),
    C('offhand', 'gem', SUN[0], SUN[1], 3.6), C('offhand', 'sparkle', SUN[0], SUN[1], 1.8),
  ],
};
