// Wizard rig (backlit silhouette). Bind-pose coordinates: viewBox 140×135,
// facing right, feet at y≈128. See src/fx/heroes/README.md for chains (hair,
// cloth), action timelines and the piece budget.
//
// Pointed wide-brimmed hat whose whole cone hangs from chain A (so it can nearly
// fall off on a hit and tumble after the body on death), long beard (B), wide
// sleeves (C, D), a robe tail flowing behind (E) and a tome tied to the sash (F).
// The face is never seen: it stays in the shadow of the brim.

import { C, E, P, L, type PuppetRig, type ChainSpec, type PartialPose } from '../puppet.ts';
import { strandShapes } from '../chains.ts';
import { EASE, strikeKeys } from '../motion.ts';

/** Fraction of the attack (and of the spell) at which the magic bursts out. */
const IMPACT = 0.5;

// ── Spring chains ────────────────────────────────────────────────────────────
/** The whole hat: brim and lower cone (stiff), upper cone, drooping tip (floppy). */
const HAT: ChainSpec = {
  slot: 'A', parent: 'head',
  joints: [[60, 46], [58, 28], [51, 17], [41, 20]],
  freq: 6, damping: 0.5, taper: 0.75, sag: 1.4, sway: 0.6, limit: 32,
};
const BEARD: ChainSpec = {
  slot: 'B', parent: 'head',
  joints: [[70, 64], [73, 76], [72, 88], [68, 99]],
  freq: 2.6, damping: 0.3, taper: 0.35, sag: 0.8, sway: 0.8, limit: 60,
};
/** Wide sleeves hanging under each forearm. */
const SLEEVE_B: ChainSpec = {
  slot: 'C', parent: 'armB',
  joints: [[50, 86], [47, 97], [45, 107]],
  freq: 2.4, damping: 0.3, taper: 0.3, sag: 1, sway: 1, limit: 70,
};
const SLEEVE_F: ChainSpec = {
  slot: 'D', parent: 'armF',
  joints: [[66, 86], [63, 97], [61, 107]],
  freq: 2.4, damping: 0.3, taper: 0.3, sag: 1, sway: 1, limit: 70,
};
/** Back tail of the robe, flowing behind the legs. */
const ROBE: ChainSpec = {
  slot: 'E', parent: 'torso',
  joints: [[52, 77], [47, 94], [43, 110], [40, 125]],
  freq: 2.4, damping: 0.4, taper: 0.4, sag: 0.8, sway: 1.4, limit: 38,
};
/** Sash end with the tome hanging from it. */
const TOME: ChainSpec = {
  slot: 'F', parent: 'torso',
  joints: [[64, 99], [65, 106], [66, 112]],
  freq: 2.8, damping: 0.35, taper: 0.2, sag: 1, sway: 0.4, limit: 60,
};

// ── Action poses ─────────────────────────────────────────────────────────────
/** Both hands raise the staff over the head, knees bent (spell anticipation). */
const RAISE: PartialPose = {
  rootX: -4, squash: 0.07, torsoY: 2, torso: -9, head: -12,
  armF: -168, armB: -150, weapon: 150,
  chA1: 6, chE1: 8, chD1: -10, chC1: -10,
};
/** Staff brought down and levelled at the enemy, the arcane wind lifting the cloth. */
const DISCHARGE: PartialPose = {
  rootX: 8, squash: -0.08, torso: 12, head: 8,
  armF: -92, armB: -50, weapon: 168, legF: -8, legB: 6,
  chA1: -8, chA2: 10, chB1: 30, chB2: 12, chC1: 14, chD1: 30, chD2: 14, chE1: 24, chE2: 10, chF1: 25,
};

export const MAGO_RIG: PuppetRig = {
  accent: '#8a7ae0', style: 'magic', phase: 2.3, focus: [70, 55],
  palette: {
    robe: '#5d4bc9', robeD: '#3d3190', hat: '#4a3cae', hatD: '#3a2e8c', beard: '#eef0f5', wood: '#8a5a32',
    orb: '#cbbcff', starGlow: '#b9a8ff', sash: '#d9a93f', boots: '#4a3450', tome: '#6b3d2a', page: '#e8dcc0', shade: '#1a1530',
  },
  pivots: { weapon: [68, 97] },
  headScale: 0.84,
  impact: IMPACT,
  rest: { armF: -28, weapon: 26, armB: 5, torso: 3, head: 6 },
  windup: { rootX: -3, torso: -5, head: -5, armF: -150, weapon: 150, armB: 30 },
  strike: { rootX: 5, torso: 10, head: 6, armF: -85, weapon: 55, armB: -30 },
  chains: [HAT, BEARD, SLEEVE_B, SLEEVE_F, ROBE, TOME],
  actions: {
    // thrust of the staff, orb first, with a spark at the tip
    attack: {
      keys: strikeKeys({
        impact: IMPACT,
        anticipation: { rootX: -6, squash: 0.05, torso: -10, head: -8, armF: -40, armB: 25, weapon: 60, legF: 4, chA1: 5 },
        strike: { rootX: 12, squash: -0.07, torso: 14, head: 10, armF: -96, armB: -40, weapon: 176, legF: -12, legB: 8, chD1: 30, chE1: 8 },
        overshoot: { rootX: 14, torso: 16, armF: -100, weapon: 180, chD1: 36 },
        settle: { rootX: 4, torso: 6, armF: -40, weapon: 60 },
        hitStop: 0.06,
        ease: { strike: EASE.whip },
      }),
      burst: [IMPACT - 0.02, IMPACT + 0.3],
      projectile: [IMPACT, IMPACT + 0.38],
      smear: [IMPACT - 0.12, IMPACT + 0.04],
    },
    // raise the staff with both hands, crouching, then discharge it forward
    spell: {
      keys: strikeKeys({
        impact: IMPACT,
        anticipation: RAISE,
        strike: DISCHARGE,
        overshoot: { ...DISCHARGE, rootX: 9, torso: 14, chB1: 36, chD1: 36, chC1: 18, chE1: 30 },
        settle: { torso: 6, armF: -50, armB: -20, weapon: 70, chE1: 12, chD1: 10 },
        coilAt: 0.3, hitStop: 0.08, overshootAt: 0.7, settleAt: 0.86,
        ease: { coil: EASE.backOut, strike: EASE.whip },
      }),
      burst: [IMPACT - 0.03, IMPACT + 0.35],
      smear: [IMPACT - 0.14, IMPACT + 0.04],
    },
    // knocked back: the hat flips up and nearly falls off
    hit: {
      keys: [
        [0, {}],
        [0.1, { rootX: -9, squash: 0.08, torso: -14, head: -16, armF: 8, armB: 30, weapon: 14, chA1: -34, chA2: -12, chB1: -20 }, EASE.expoOut],
        [0.3, { rootX: -5, torso: -8, head: -6, chA1: -22, chA2: 10 }, EASE.smooth],
        [0.55, { rootX: -2, torso: -2, head: 2, chA1: 5 }, EASE.smooth],
        [1, {}, EASE.elasticOut],
      ],
    },
    // collapses to his knees and backwards; the hat tumbles off afterwards
    death: {
      keys: [
        [0, {}],
        [0.1, { rootX: -8, torso: -12, head: -14, armF: 10, armB: 30, chA1: -10 }, EASE.expoOut],
        [0.3, { rootX: -9, squash: 0.14, torsoY: 6, torso: -16, head: -18, armF: 40, armB: 36, weapon: 40, legF: -8, legB: 6, chA1: -12 }, EASE.easeIn],
        [0.46, { rootX: -8, squash: 0.2, torsoY: 11, torso: -22, head: -24, armF: 55, armB: 40, weapon: 60, legF: -12, legB: 10, chA1: -16, chE1: 30 }, EASE.easeOut],
        [0.7, { rootX: -8, squash: 0.2, torsoY: 11, torso: -22, head: -24, armF: 55, armB: 40, weapon: 60, legF: -12, legB: 10, chA1: -75, chA2: 25, chE1: 20 }, EASE.easeIn],
        [1, { rootX: -8, squash: 0.2, torsoY: 11, torso: -22, head: -24, armF: 55, armB: 40, weapon: 60, legF: -12, legB: 10, chA1: -80, chA2: 20, chE1: 20 }, EASE.easeOut],
      ],
    },
  },
  shapes: [
    // robe tail behind everything
    ...strandShapes(ROBE, 'robeD', [10, 13, 15, 14], { tip: 'tattered', teeth: 3 }),
    // back sleeve and arm
    ...strandShapes(SLEEVE_B, 'robeD', [9, 12, 13], { tip: 'flat' }),
    P('armB', 'robeD', [[48, 76], [56, 77], [53, 92], [45, 93]]),
    C('armB', 'shade', 48, 96, 3.6),
    // boots under the hem
    E('legB', 'boots', 52, 126, 6, 3.5), P('legF', 'boots', [[62, 122], [70, 123], [74, 127], [72, 129], [61, 129]]),
    // robe body: flared skirt with folds
    P('torso', 'robe', [[50, 74], [67, 74], [70, 92], [76, 114], [80, 127], [73, 125], [66, 128], [60, 125], [53, 128], [46, 125], [39, 127], [43, 112], [48, 92]]),
    P('torso', 'robeD', [[57, 77], [61, 77], [64, 126], [55, 126]]),
    L('torso', 'robeD', 51, 102, 47, 124, 1.6), L('torso', 'robeD', 69, 102, 73, 122, 1.6),
    P('torso', 'hatD', [[45, 83], [48, 73], [58, 69], [68, 71], [72, 81], [60, 87]]),
    // sash with its knot
    P('torso', 'sash', [[48, 94], [70, 94], [70.8, 99.5], [47.4, 99.5]]),
    E('torso', 'sash', 64, 97, 3, 3.2),
    P('torso', 'sash', [[62, 99], [65, 99], [63, 108], [60, 107]]),
    // tome hanging from the sash on a cord, with glowing clasp
    ...strandShapes(TOME, 'sash', [3.5, 3, 2], { tip: 'flat' }),
    P('chF2', 'tome', [[61, 108], [71, 108], [72, 120], [62, 120]]),
    P('chF2', 'page', [[70.5, 109], [72, 109], [73, 119], [71.6, 119]]),
    L('chF2', 'tome', 61.5, 110, 71.5, 110, 1.4),
    C('chF2', 'starGlow', 67, 114, 1.3),
    // head in shadow (no face), beard over the chest
    C('head', 'shade', 62, 60, 12.5),
    E('head', 'beard', 69, 65, 7, 4),
    ...strandShapes(BEARD, 'beard', [10, 10, 7, 1.5], { tip: 'point' }),
    L('chB2', 'shade', 71, 80, 70, 88, 0.9),
    // front sleeve, arm and hand
    ...strandShapes(SLEEVE_F, 'robe', [9, 13, 14], { tip: 'flat' }),
    P('armF', 'robe', [[61, 76], [69, 77], [72, 92], [63, 93]]),
    P('armF', 'hatD', [[63, 91], [72, 90], [73, 94], [62, 95]]),
    // staff: shaft, knots, claw around the orb
    L('weapon', 'wood', 70, 64, 70, 127, 3.4),
    C('weapon', 'wood', 70, 84, 2.4), C('weapon', 'wood', 70, 112, 2.2),
    L('weapon', 'wood', 70, 64, 64, 58, 2.2), L('weapon', 'wood', 70, 64, 76, 58, 2.2),
    L('weapon', 'wood', 64, 58, 66, 51, 1.6), L('weapon', 'wood', 76, 58, 74, 51, 1.6),
    C('weapon', 'orb', 70, 55, 5.2),
    C('weapon', 'starGlow', 68.5, 53.5, 1.6),
    C('armF', 'shade', 68, 97, 4),
    // hat on top: wide brim, cone, drooping tip, glowing star and moon
    E('chA1', 'hat', 60, 47, 25, 4.8),
    P('chA1', 'hatD', [[47, 47], [73, 47], [72, 43], [48, 43]]),
    ...strandShapes(HAT, 'hat', [24, 11, 5, 1], { tip: 'point' }),
    E('chA1', 'hatD', 60, 44.5, 11, 1.5),
    P('chA1', 'starGlow', [[58.0, 34.2], [59.1, 36.5], [61.5, 36.8], [59.7, 38.4], [60.2, 40.8], [58.0, 39.6], [55.8, 40.8], [56.3, 38.4], [54.5, 36.8], [56.9, 36.5]]),
    P('chA2', 'starGlow', [[52, 20], [54.5, 22], [55.2, 25], [53.3, 23.2], [50.8, 22.6]]),
  ],
};
