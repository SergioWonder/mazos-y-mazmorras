// Rogue seen from behind (chapter openings). Bind pose: viewBox 140×135, the
// figure faces away from the viewer, centred on the feet at (58, 128), about 80
// units tall. Painted 'backlit': black, rim light all round in `accent`, and the
// LIT_EDGES pieces as lines of light ('edge' bright, 'edgeSoft' faint).
//
// Read from the back: a rounded hood, a ragged shoulder cape, a scarf end over
// it, a belt with pouches, a dagger sheathed across the small of the back,
// bracers, folded boot tops, a strap round one thigh and a dagger held low in
// each hand, points out.
//
// Chains: A scarf end, C shoulder cape (hand-drawn panels on its three bones).

import { C, E, L, P, type PuppetRig, type Shape } from '../../puppet.ts';
import { strandShapes, type ChainSpec } from '../../chains.ts';

type Pt = [number, number];

const SCARF: ChainSpec = {
  slot: 'A', joints: [[53.5, 80], [52.6, 86.5], [52, 93], [51.8, 98.5]],
  freq: 1.6, damping: 0.25, taper: 0.4, sag: 1.2, sway: 1.3, limit: 30,
};
const CAPE: ChainSpec = {
  slot: 'C', joints: [[58, 78], [58, 85], [58, 91], [58, 96]],
  freq: 1.8, damping: 0.3, taper: 0.4, sag: 0.6, sway: 0.7, limit: 10,
};

/** Ragged hem of the cape, left to right. */
const HEM: Pt[] = [[44.6, 96.6], [47.4, 94.6], [50, 97.2], [53, 95.2], [56, 98], [59, 95.4], [62, 97.6], [65, 95.2], [68, 96.9], [71.4, 95.4]];

/** A polyline as lit segments on one bone. */
const edges = (b: Shape['b'], k: string, pts: Pt[], w: number): Shape[] =>
  pts.slice(1).map((q, i) => L(b, k, pts[i][0], pts[i][1], q[0], q[1], w));

export const PICARO_BACK_RIG: PuppetRig = {
  accent: '#4fb0a0', style: 'melee', phase: 3.4, focus: [70, 110],
  palette: {
    hood: '#2f4d49', hoodD: '#1f3431', leather: '#5a4636', leatherD: '#3a2d24', boots: '#2a2320',
    belt: '#8a6a44', glove: '#2a2320', steel: '#cfd8de', sparkle: '#d8f3ee', scarf: '#4fb0a0',
  },
  pivots: {
    root: [58, 128], torso: [58, 100], head: [58, 78], armB: [48, 82], armF: [68, 82],
    offhand: [46, 99.5], weapon: [70, 99.5], legB: [54, 101], legF: [62, 101],
  },
  headScale: 0.88,
  chains: [SCARF, CAPE],
  // weight on the left leg, head a touch to the side, blades away from the body
  rest: { torso: -1.5, head: 4, armB: 7, armF: -7, offhand: 14, weapon: -14, legB: 1.5, legF: -2.5 },
  windup: {},
  strike: {},
  shapes: [
    // legs: thigh, knee and ankle; folded boot tops; a strap round the right thigh
    P('legB', 'leatherD', [[50.2, 100.5], [57.6, 100.5], [57.1, 108], [56.2, 114], [55.8, 120.5], [51.4, 120.5], [51, 114], [50.1, 108]]),
    P('legB', 'boots', [[50.4, 118.4], [56.6, 118.4], [56.4, 123], [57.3, 128], [49.4, 128], [50.2, 123]]),
    L('legB', 'edge', 50.5, 118.5, 56.5, 118.5, 0.8), L('legB', 'edgeSoft', 51.2, 114, 56, 114, 0.5),
    P('legF', 'leatherD', [[58.4, 100.5], [65.8, 100.5], [65.9, 108], [65, 114], [64.6, 120.5], [60.2, 120.5], [59.8, 114], [58.9, 108]]),
    P('legF', 'boots', [[59.4, 118.4], [65.6, 118.4], [65.8, 123], [66.6, 128], [58.7, 128], [59.6, 123]]),
    L('legF', 'edge', 59.5, 118.5, 65.5, 118.5, 0.8), L('legF', 'edgeSoft', 60, 114, 64.8, 114, 0.5),
    L('legF', 'belt', 58.7, 106.4, 65.8, 106.8, 1.6), L('legF', 'edgeSoft', 58.8, 105.4, 65.8, 105.8, 0.5),
    // arms at the sides with bracers, a dagger held low in each hand, points out
    L('armB', 'hood', 48, 82, 46.6, 91, 6), L('armB', 'hood', 46.6, 91, 46, 97.6, 5.2),
    L('armB', 'edge', 43.4, 91.6, 49.6, 92, 0.7), L('armB', 'edgeSoft', 43.6, 95.4, 48.6, 95.6, 0.5),
    L('offhand', 'leatherD', 46, 97.5, 46, 102.5, 2.4), L('offhand', 'belt', 43.6, 102.6, 48.4, 102.6, 1.6),
    P('offhand', 'steel', [[44.8, 103], [47.2, 103], [46, 116.5]]), L('offhand', 'sparkle', 46.1, 104.5, 46, 114.5, 0.5),
    C('armB', 'glove', 46.1, 99.4, 2.9),
    L('armF', 'hood', 68, 82, 69.4, 91, 6), L('armF', 'hood', 69.4, 91, 70, 97.6, 5.2),
    L('armF', 'edge', 66.4, 92, 72.6, 91.6, 0.7), L('armF', 'edgeSoft', 67.4, 95.6, 72.4, 95.4, 0.5),
    L('weapon', 'leatherD', 70, 97.5, 70, 102.5, 2.4), L('weapon', 'belt', 67.6, 102.6, 72.4, 102.6, 1.6),
    P('weapon', 'steel', [[68.8, 103], [71.2, 103], [70, 116.5]]), L('weapon', 'sparkle', 69.9, 104.5, 70, 114.5, 0.5),
    C('armF', 'glove', 69.9, 99.4, 2.9),
    // lower back: belt with two pouches, a dagger sheathed across below it
    P('torso', 'leather', [[49.5, 81], [58, 79], [66.5, 81], [66.2, 90], [65, 101.5], [51, 101.5], [49.8, 90]]),
    P('torso', 'belt', [[50.4, 97.6], [65.6, 97.6], [65.6, 101.8], [50.4, 101.8]]),
    L('torso', 'edge', 50.6, 97.7, 65.4, 97.7, 0.8),
    E('torso', 'leatherD', 52.8, 101.4, 2.6, 2.8), L('torso', 'edgeSoft', 50.6, 100, 55, 100, 0.5),
    E('torso', 'leatherD', 63.2, 101.4, 2.6, 2.8), L('torso', 'edgeSoft', 61, 100, 65.4, 100, 0.5),
    L('torso', 'leatherD', 49.6, 106, 63.6, 103.2, 2.8), L('torso', 'edge', 49.8, 104.7, 63.6, 101.9, 0.7),
    L('torso', 'belt', 63.6, 103.2, 67.2, 102.5, 2), L('torso', 'leatherD', 67.2, 102.5, 69.4, 102.1, 3),
    L('torso', 'edge', 63.8, 102.1, 69.2, 101, 0.6),
    // shoulder cape in three panels on the chain, ragged hem; borders lit
    P('chC1', 'hoodD', [[50.5, 77.4], [58, 76.6], [65.5, 77.4], [71.2, 85.6], [44.8, 85.6]]),
    P('chC2', 'hoodD', [[44.9, 84.6], [71.1, 84.6], [71.6, 91.6], [44.4, 91.6]]),
    P('chC3', 'hoodD', [[44.5, 90.6], [71.5, 90.6], ...[...HEM].reverse()]),
    L('chC1', 'edge', 50.5, 77.6, 45, 85.4, 0.9), L('chC1', 'edge', 65.5, 77.6, 71, 85.4, 0.9),
    L('chC2', 'edge', 45, 85, 44.5, 91.2, 0.9), L('chC2', 'edge', 71, 85, 71.5, 91.2, 0.9),
    L('chC3', 'edge', 44.5, 91, 44.6, 96.4, 0.9), L('chC3', 'edge', 71.5, 91, 71.4, 95.4, 0.9),
    ...edges('chC3', 'edge', HEM, 0.8),
    L('chC2', 'edgeSoft', 53.6, 86, 52.8, 91, 0.5), L('chC2', 'edgeSoft', 62.4, 86, 63.2, 91, 0.5),
    // scarf end over the cape
    ...strandShapes(SCARF, 'scarf', [5, 5, 4.4, 3], { tip: 'tattered', teeth: 2 }),
    // rounded hood from behind, its rim against the cape
    P('head', 'hoodD', [[51, 79.5], [50, 72], [50.7, 64.2], [53.5, 57.8], [57.6, 54.9], [58.8, 54.6], [62.6, 57.8], [65.4, 64.2], [66, 72], [65, 79.5]]),
    L('head', 'edge', 50.7, 64.4, 50, 73.4, 0.85), L('head', 'edge', 65.4, 64.4, 66, 73.4, 0.85),
    L('head', 'edge', 53.6, 58, 57.6, 55.1, 0.75), L('head', 'edge', 58.8, 54.8, 62.5, 58, 0.75),
    L('head', 'edgeSoft', 52.4, 77.6, 63.6, 77.6, 0.6),
  ],
};
