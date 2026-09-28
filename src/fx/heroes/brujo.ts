// Warlock rig (backlit silhouette). Bind-pose coordinates: viewBox 140×135,
// facing right, feet at y≈128. See src/fx/heroes/README.md for chains (hair,
// cloth), action timelines and the piece budget.
//
// Look (card art): a near-black figure with curved horns, a rigid high collar,
// a long torn cape, pact amulets and a chained grimoire at the belt, and a
// violet flame in the front hand. The face is never shown.
//
// Chains: A inner cape panel, B outer (back) cape panel, C front cape edge,
// D neck amulet, E grimoire hanging from the belt, F belt talisman.
// Acting: contained, then bursting — the Eldritch Blast coils inwards with the
// cape wrapped around the body and snaps the arm open, the cape spreading like
// wings and the amulets leaping.

import { C, E, P, L, slitEye, type ActionScript, type PuppetRig } from '../puppet.ts';
import { strandShapes, type ChainSpec } from '../chains.ts';
import { EASE, pulse, shake } from '../motion.ts';

/** Where the flame sits on the weapon bone (and where the blast is born). */
const FLAME: [number, number] = [70, 85];
const IMPACT = 0.52;

const CAPE_IN: ChainSpec = {
  slot: 'A', joints: [[53, 75], [48, 92], [44, 109], [41, 125]],
  freq: 2, damping: 0.5, taper: 0.4, sag: 1, sway: 1.3, limit: 55,
};
const CAPE_OUT: ChainSpec = {
  slot: 'B', joints: [[50, 77], [42, 92], [36, 108], [31, 123]],
  freq: 1.7, damping: 0.45, taper: 0.45, sag: 1.1, sway: 1.8, limit: 60,
};
const CAPE_FRONT: ChainSpec = {
  slot: 'C', joints: [[67, 76], [71, 92], [74, 108], [76, 123]],
  freq: 2.3, damping: 0.5, taper: 0.4, sag: 0.8, sway: 1, limit: 50,
};
const AMULET: ChainSpec = {
  slot: 'D', joints: [[62, 80], [64, 86], [65, 92], [65, 96]],
  freq: 3.4, damping: 0.22, taper: 0.3, sag: 0.4, sway: 0.4, limit: 80,
};
const TOME: ChainSpec = {
  slot: 'E', joints: [[71, 99], [75, 102], [79, 104], [82, 107]],
  freq: 2.6, damping: 0.25, taper: 0.3, sag: 1.2, sway: 0.4, limit: 80,
};
const TALISMAN: ChainSpec = {
  slot: 'F', joints: [[66, 99], [69, 104], [70, 109], [70, 113]],
  freq: 3, damping: 0.22, taper: 0.3, sag: 0.5, sway: 0.5, limit: 80,
};

// — Eldritch Blast: gather, a long tense coil, then the arm snaps open —
const GATHER = { rootX: -2, squash: 0.04, torso: -3, head: 12, armF: 5, weapon: -5, armB: -15, chA1: -14, chB1: -18, chC1: 6 };
const COIL = {
  rootX: -5, squash: 0.1, torso: -8, head: 16, armF: 40, weapon: -40, armB: -38,
  chA1: -30, chA2: -12, chB1: -40, chB2: -14, chC1: 14, chC2: 6, chD1: 8, chF1: 6,
};
const BLAST = {
  rootX: 8, squash: -0.1, torso: 12, head: 2, armF: -86, weapon: 76, armB: 60,
  chA1: 44, chA2: 14, chA3: 6, chB1: 55, chB2: 16, chB3: 8, chC1: -28, chC2: -10,
  chD1: -55, chD2: -20, chF1: -50, chF2: -15, chE1: -35, chE2: -15,
};
const ATTACK: ActionScript = {
  keys: [
    [0, {}],
    [0.14, GATHER, EASE.easeOut],
    [IMPACT - 0.06, COIL, EASE.smooth],
    [IMPACT, BLAST, EASE.easeIn],
    [IMPACT + 0.05, BLAST, EASE.linear],
    [0.68, {
      rootX: 9, squash: -0.04, torso: 14, head: 0, armF: -94, weapon: 82, armB: 52,
      chA1: 36, chA2: 10, chB1: 52, chB2: 16, chC1: -18, chD1: -20, chF1: -20, chE1: -10,
    }, EASE.easeOut],
    [0.86, { rootX: 3, torso: 6, head: 6, armF: -60, weapon: 55, armB: 20, chA1: 14, chB1: 18 }, EASE.smooth],
    [1, {}, EASE.smooth],
  ],
  burst: [IMPACT - 0.03, 0.78],
  projectile: [IMPACT - 0.01, 0.86],
  smear: [IMPACT - 0.03, 0.64],
  smearBones: ['armF', 'weapon'],
};

// — Spell: wrap, then raise the flame high with the cape spread —
const SPELL: ActionScript = {
  keys: [
    [0, {}],
    [0.3, { squash: 0.08, torso: -6, head: 14, armF: 30, weapon: -30, armB: -30, chA1: -24, chB1: -30, chC1: 10 }, EASE.easeOut],
    [0.4, {
      squash: -0.08, torso: -4, head: -8, armF: -150, weapon: 130, armB: 40,
      chA1: 40, chB1: 60, chB2: 20, chC1: -20, chD1: -40, chF1: -40, chE1: -25,
    }, EASE.backOut],
    [0.72, { squash: -0.03, torso: -3, head: -6, armF: -145, weapon: 125, armB: 35, chA1: 20, chB1: 30, chC1: -8 }, EASE.smooth],
    [1, {}, EASE.smooth],
  ],
  burst: [0.38, 0.78],
  smear: [0.33, 0.46],
};

// — Hit: recoil, the cape billows forwards —
const HIT: ActionScript = {
  keys: [
    [0, {}],
    [0.1, {
      rootX: -9, torso: -14, head: -8, squash: 0.08, armF: -15, weapon: 30, armB: 30,
      chA1: -28, chB1: -34, chB2: -10, chC1: -26, chC2: -10, chD1: -30, chF1: -25, chE1: -25,
    }, EASE.expoOut],
    [0.4, { rootX: -3, torso: -4, head: 2, chA1: -8, chB1: -10, chC1: -6 }, EASE.smooth],
    [1, {}, EASE.smooth],
  ],
};

// — Death: fades backwards, sinks, and the cape falls in a heap —
const HEAP = {
  rootX: -14, torsoY: 10, torso: -30, head: -26, armF: 50, weapon: 0, armB: 50, squash: 0.4, legF: -10, legB: 10,
  chA1: -22, chA2: 20, chA3: 20, chB1: -30, chB2: 25, chB3: 20, chC1: 34, chC2: 10, chD1: 20, chE1: 30, chF1: 20,
};
const DEATH: ActionScript = {
  keys: [
    [0, {}],
    [0.1, { rootX: -8, torso: -12, head: -10, squash: 0.02, chA1: -15, chB1: -20 }, EASE.expoOut],
    [0.35, { rootX: -12, torso: -24, head: -18, torsoY: 4, armF: 30, weapon: 10, armB: 40, squash: 0.12, chA1: 5, chB1: 8 }, EASE.smooth],
    [0.7, HEAP, EASE.smooth],
    [1, HEAP],
  ],
};

export const BRUJO_RIG: PuppetRig = {
  accent: '#c98bff', style: 'magic', phase: 4.6, focus: FLAME,
  palette: {
    cloak: '#2e1b48', cloakD: '#1d1130', collar: '#24163a', lining: '#7a2f9a', boots: '#231a2c', skin: '#cdbfd9',
    hood: '#1c1424', horn: '#5a4a62', tome: '#6b2130', tomeD: '#3e1220', gold: '#b9924a', chain: '#8a8196',
    belt: '#3a2a20', gem: '#c98bff', flame: '#b46bff', flameCore: '#f6e6ff', eyeGlow: '#d49aff',
  },
  pivots: { weapon: [69, 97] },
  headScale: 0.84,
  impact: IMPACT,
  rest: { armF: -40, weapon: 40, armB: 10, torso: 2, head: 8 },
  windup: COIL,
  strike: BLAST,
  chains: [CAPE_IN, CAPE_OUT, CAPE_FRONT, AMULET, TOME, TALISMAN],
  actions: { attack: ATTACK, spell: SPELL, hit: HIT, death: DEATH },
  bursts: { attack: [{ bone: 'weapon', at: FLAME, effect: 'abisal', scale: 0.8 }] },
  emitters: [{ bone: 'weapon', at: [70, 80], effect: 'vacio', rate: 2.5, spread: 2 }],
  animate(p, t, action) {
    // the flame never stops licking; the coil trembles with held power
    p.weapon += Math.sin(t * 2 * Math.PI * 1.9) * 1.6;
    if (action?.type === 'attack') {
      const tense = pulse(action.p, 0.16, IMPACT - 0.02);
      p.armF += shake(t, 1.6 * tense);
      p.torso += shake(t + 0.37, 0.6 * tense);
    }
  },
  shapes: [
    // back cape panels (behind everything)
    ...strandShapes(CAPE_OUT, 'cloakD', [8, 13, 15, 16], { tip: 'tattered', teeth: 3 }),
    ...strandShapes(CAPE_IN, 'cloakD', [16, 18, 20, 21], { tip: 'tattered', teeth: 3 }),
    E('legB', 'boots', 52, 126, 6, 3.5), E('legF', 'boots', 67, 126, 6.5, 3.5),
    // back arm
    L('armB', 'cloak', 52, 78, 47, 95, 8.5),
    C('armB', 'skin', 47, 97, 3.6),
    // robe, belt and the rigid high collar
    P('torso', 'cloak', [[50, 74], [68, 74], [72, 100], [75, 126], [64, 127], [58, 124], [52, 127], [44, 126], [47, 100]]),
    P('torso', 'lining', [[58, 77], [61, 77], [62, 124], [57, 124]]),
    L('torso', 'belt', 48, 98, 71, 98, 3.5), C('torso', 'gold', 60, 98, 2.6),
    P('torso', 'collar', [[47, 81], [42, 67], [42, 52], [47, 58], [51, 66], [56, 73], [58, 75]]),
    P('torso', 'collar', [[64, 75], [70, 69], [74, 58], [77, 62], [75, 72], [71, 81]]),
    P('torso', 'cloak', [[46, 80], [56, 74], [68, 74], [74, 79], [70, 86], [60, 84], [50, 86]]),
    // hooded head (only the eyes glow) and curved horns
    P('head', 'hood', [[46, 58], [49, 48], [58, 43], [68, 45], [74, 52], [76, 58], [73, 64], [68, 70], [56, 71], [48, 66]]),
    P('head', 'hood', [[72, 51], [78, 56], [74, 60]]),
    // angry violet slits burning inside the hood (pacto-final)
    slitEye('head', 'eyeGlow', [61.12, 55.9], [67.28, 58], 1.56), slitEye('head', 'eyeGlow', [73.38, 56.4], [69.32, 57.8], 1.3),
    P('head', 'horn', [[51, 50], [46, 41], [41, 34], [36, 30], [32, 24], [37, 26], [42, 29], [48, 33], [54, 40], [59, 46]]),
    P('head', 'horn', [[61, 45], [63, 37], [67, 30], [72, 26], [78, 23], [74, 28], [70, 32], [68, 38], [68, 44], [67, 47]]),
    // pact amulets and the chained grimoire
    L('chD1', 'chain', 62, 80, 64, 86, 1), L('chD2', 'chain', 64, 86, 65, 92, 1), L('chD3', 'chain', 65, 92, 65, 95.5, 1),
    P('chD3', 'gold', [[65, 95], [67.5, 98.2], [65, 101.5], [62.5, 98.2]]), C('chD3', 'gem', 65, 98.2, 1.3),
    L('chF1', 'chain', 66, 99, 69, 104, 1), L('chF2', 'chain', 69, 104, 70, 109, 1), L('chF3', 'chain', 70, 109, 70, 113, 1),
    C('chF3', 'gold', 70, 115.5, 2.8), C('chF3', 'gem', 70, 115.5, 1.4),
    L('chE1', 'chain', 71, 99, 75, 102, 1.1), L('chE2', 'chain', 75, 102, 79, 104, 1.1), L('chE3', 'chain', 79, 104, 82, 107.5, 1.1),
    P('chE3', 'tome', [[78.5, 107], [88, 108], [87, 121], [77.5, 120]]),
    L('chE3', 'tomeD', 78.5, 107.3, 77.8, 120, 2.2), L('chE3', 'gold', 83.5, 107.6, 82.5, 120.6, 1),
    C('chE3', 'gem', 83, 114, 1.3),
    // front cape edge
    ...strandShapes(CAPE_FRONT, 'cloakD', [5, 7, 8, 8], { tip: 'tattered', teeth: 2 }),
    // front arm, clawed hand and the violet flame
    L('armF', 'cloak', 65, 78, 69, 94, 9),
    P('armF', 'cloak', [[63, 89], [74, 91], [73, 97], [65, 99]]),
    C('armF', 'skin', 69, 97, 3.8),
    L('weapon', 'skin', 71, 95, 74, 90.5, 1.6), L('weapon', 'skin', 67, 95, 65.5, 90.5, 1.6),
    E('weapon', 'flame', 70, 86, 5.5, 8),
    P('weapon', 'flame', [[65, 87], [67.5, 74], [70, 81], [72, 69], [74.5, 81], [76.5, 75], [75.5, 88]]),
    P('weapon', 'flame', [[66.5, 81], [63.5, 73], [68.5, 78]]),
    E('weapon', 'flameCore', 70, 88.5, 2.6, 3.8),
  ],
};
