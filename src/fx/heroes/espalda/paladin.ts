// Paladin seen from behind (chapter openings). Bind pose: viewBox 140×135, the
// figure faces away from the viewer, centred on the feet at (58, 128), about 75
// units tall (the plume rises a little higher). Painted 'backlit': black, rim
// light all round in `accent`, and the LIT_EDGES pieces as lines of light
// ('edge' bright, 'edgeSoft' faint).
//
// Read from the back: a closed great helm with a ridge, a brow band and an
// arching horsehair plume; broad layered pauldrons with lit plate edges; the
// kite shield slung on the back, its rim lit all round and a pale sun on it
// whose centre glows; the two shield straps over the shoulders; a belt; a split
// tabard hanging below the shield; plate greaves and sabatons; and the warhammer
// held head-down in the right hand beside the leg. Holy glints drift up from
// the sun and a few motes from the hammer head.
//
// Chains: C tabard (hand-drawn panels on its three bones), A helm plume.

import { C, E, L, P, type PuppetRig, type Shape } from '../../puppet.ts';
import { type ChainSpec } from '../../chains.ts';

type Pt = [number, number];

const TABARD: ChainSpec = {
  slot: 'C', joints: [[58, 99], [58, 103.5], [58, 108], [58, 112.5]],
  freq: 1.8, damping: 0.35, taper: 0.4, sag: 0.5, sway: 0.7, limit: 10,
};
const PLUME: ChainSpec = {
  slot: 'A', parent: 'head', joints: [[58, 56.6], [58.2, 62.4], [58.6, 67.6], [58.8, 72.6]],
  freq: 2.2, damping: 0.3, taper: 0.45, sag: 0.6, sway: 0.9, limit: 18,
};

/** Centre of the sun on the shield (torso bone). */
const SUN: Pt = [58, 91.5];

/** Kite shield outline, clockwise from the top-left corner. */
const SHIELD: Pt[] = [[50, 82.4], [58, 81.2], [66, 82.4], [66.2, 89], [64.6, 96.6], [61.8, 102.4], [58, 107.2], [54.2, 102.4], [51.4, 96.6], [49.8, 89]];

/** Split hem of the tabard, left to right (it parts between the legs). */
const HEM: Pt[] = [[49.8, 112.6], [53.6, 113.6], [57.3, 113.1], [58, 111.4], [58.7, 113.1], [62.4, 113.6], [66.2, 112.6]];

/** Rayed sun: n spikes alternating between the outer and inner radius (2n vertices). */
function sun(cx: number, cy: number, rOut: number, rIn: number, n = 8): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i * Math.PI) / n - Math.PI / 2, r = i % 2 ? rIn : rOut;
    pts.push([Math.round((cx + Math.cos(a) * r) * 100) / 100, Math.round((cy + Math.sin(a) * r) * 100) / 100]);
  }
  return pts;
}

/** A polyline as lit segments on one bone. */
const edges = (b: Shape['b'], k: string, pts: Pt[], w: number): Shape[] =>
  pts.slice(1).map((q, i) => L(b, k, pts[i][0], pts[i][1], q[0], q[1], w));

/** Mirror a point across the figure's axis (x = 58). */
const mx = ([x, y]: Pt): Pt => [116 - x, y];

/** Left pauldron (viewer's left) and its two plate lames; the right one is mirrored. */
const PAULDRON: Pt[] = [[51.6, 77.2], [47.6, 76.2], [43.6, 77.6], [41, 81.2], [40.4, 85.6], [42.6, 87.6], [46.6, 87], [50.4, 85.2], [52.4, 81.4]];
const LAME_1: Pt[] = [[40.8, 82.6], [44.2, 80.8], [48.4, 80], [52.2, 80.2]];
const LAME_2: Pt[] = [[40.8, 86], [43.4, 87.6], [47, 87], [50.4, 85.2]];

export const PALADIN_BACK_RIG: PuppetRig = {
  accent: '#ffd35a', style: 'melee', phase: 5.3, focus: [58, 92],
  palette: {
    plate: '#8f97a4', plateD: '#5f6672', steel: '#b9c2cc', cloth: '#e6dcc4', clothD: '#b8a987',
    plume: '#e9e1d0', leather: '#5b3b26', wood: '#6e4a2c', gem: '#ffe9a0',
  },
  pivots: {
    root: [58, 128], torso: [58, 100], head: [58, 77], armB: [46, 80], armF: [70, 80],
    offhand: [44.5, 99], weapon: [71.5, 99], legB: [53.5, 102], legF: [62.5, 102],
  },
  headScale: 0.9,
  chains: [TABARD, PLUME],
  // weight on the left leg, the hammer hanging a touch away from the body
  rest: { torso: -1, head: 2, armB: 4, armF: -3, offhand: 6, weapon: -4, legB: 1.5, legF: -1.5 },
  windup: {},
  strike: {},
  emitters: [
    { bone: 'torso', at: SUN, effect: 'destelloCarta', rate: 5, spread: 5 },
    { bone: 'weapon', at: [72.5, 117], effect: 'mota', rate: 2.5, spread: 3 },
  ],
  shapes: [
    // legs: plate greaves and sabatons, lit at the greave top and the heel
    P('legB', 'plateD', [[49.6, 101], [57.4, 101], [57, 109], [56.4, 116], [56.2, 121.5], [50.6, 121.5], [50.4, 116], [49.8, 109]]),
    P('legB', 'steel', [[50.4, 121], [56.4, 121], [56.8, 125], [57.8, 128], [49.2, 128], [49.8, 125]]),
    L('legB', 'edge', 50.6, 116.6, 56.4, 116.6, 0.8), L('legB', 'edgeSoft', 50.2, 122.6, 56.6, 122.6, 0.6),
    P('legF', 'plateD', [[58.6, 101], [66.4, 101], [66.2, 109], [65.6, 116], [65.4, 121.5], [59.8, 121.5], [59.6, 116], [59, 109]]),
    P('legF', 'steel', [[59.6, 121], [65.6, 121], [66.2, 125], [66.8, 128], [58.2, 128], [59.2, 125]]),
    L('legF', 'edge', 59.6, 116.6, 65.4, 116.6, 0.8), L('legF', 'edgeSoft', 59.4, 122.6, 65.8, 122.6, 0.6),
    // warhammer head-down in the right hand: haft, pommel above the fist, head and spike by the shin
    L('weapon', 'wood', 71.5, 96.4, 72.4, 116, 1.7), C('weapon', 'steel', 71.4, 95.8, 1.3),
    P('weapon', 'steel', [[68.6, 114.6], [76.4, 114.6], [76.8, 119.8], [68.2, 119.8]]),
    P('weapon', 'steel', [[71.4, 119.6], [73.4, 119.6], [72.5, 122.6]]),
    L('weapon', 'edge', 68.8, 114.7, 76.2, 114.7, 0.8), L('weapon', 'edgeSoft', 68.6, 117.2, 76.6, 117.2, 0.5),
    // arms in plate: upper arm, elbow cop, vambrace with a lit cuff, gauntlets
    L('armB', 'plateD', 45.6, 84, 44.6, 92, 6.4), C('armB', 'plate', 44.5, 92, 3),
    L('armB', 'plateD', 44.6, 92, 44.4, 97.4, 5.8),
    P('offhand', 'steel', [[41.6, 96.6], [47.4, 96.6], [46.8, 99.6], [42.2, 99.6]]),
    C('offhand', 'steel', 44.5, 101, 2.8), L('offhand', 'edge', 41.8, 96.8, 47.2, 96.8, 0.7),
    L('armF', 'plateD', 70.4, 84, 71.4, 92, 6.4), C('armF', 'plate', 71.5, 92, 3),
    L('armF', 'plateD', 71.4, 92, 71.6, 97.4, 5.8),
    P('armF', 'steel', [[68.6, 96.6], [74.4, 96.6], [73.8, 99.6], [69.2, 99.6]]),
    C('armF', 'steel', 71.5, 101, 2.8), L('armF', 'edge', 68.8, 96.8, 74.2, 96.8, 0.7),
    // back plate
    P('torso', 'plate', [[47, 79], [58, 77], [69, 79], [68.6, 88], [66.8, 96], [66.2, 101.6], [49.8, 101.6], [49.2, 96], [47.4, 88]]),
    // tabard in three panels on the chain, split hem; sides and hem lit
    P('chC1', 'cloth', [[50.4, 98.6], [65.6, 98.6], [66, 104], [50, 104]]),
    P('chC2', 'cloth', [[50, 103.2], [66, 103.2], [66.2, 108.6], [49.8, 108.6]]),
    P('chC3', 'cloth', [[49.8, 107.8], [66.2, 107.8], ...[...HEM].reverse()]),
    L('chC2', 'edge', 50.1, 103.4, 49.9, 108.4, 0.8), L('chC2', 'edge', 65.9, 103.4, 66.1, 108.4, 0.8),
    L('chC3', 'edge', 49.9, 108, 49.8, 112.4, 0.8), L('chC3', 'edge', 66.1, 108, 66.2, 112.4, 0.8),
    ...edges('chC3', 'edge', HEM, 0.8),
    // broad pauldrons, two lit lames each
    P('armB', 'plate', PAULDRON),
    ...edges('armB', 'edge', LAME_1, 0.75), ...edges('armB', 'edgeSoft', LAME_2, 0.6),
    P('armF', 'plate', PAULDRON.map(mx)),
    ...edges('armF', 'edge', LAME_1.map(mx), 0.75), ...edges('armF', 'edgeSoft', LAME_2.map(mx), 0.6),
    // kite shield slung on the back: lit rim all round, a pale sun with a glowing centre
    P('torso', 'wood', SHIELD),
    ...edges('torso', 'edge', [...SHIELD, SHIELD[0]], 0.85),
    P('torso', 'edgeSoft', sun(SUN[0], SUN[1], 5.4, 2.4)),
    C('torso', 'gem', SUN[0], SUN[1], 1.3),
    // shield straps over the shoulders
    L('torso', 'leather', 51.8, 82.4, 53.6, 76.4, 2.4), L('torso', 'edge', 51.8, 82.4, 53.6, 76.4, 0.7),
    L('torso', 'leather', 64.2, 82.4, 62.4, 76.4, 2.4), L('torso', 'edge', 64.2, 82.4, 62.4, 76.4, 0.7),
    // closed great helm: lit sides and crown, brow band, ridge and neck flare
    P('head', 'plate', [[51.4, 77.4], [51, 70], [51.2, 63.6], [52.2, 60], [54.8, 58], [58, 57.4], [61.2, 58], [63.8, 60], [64.8, 63.6], [65, 70], [64.6, 77.4]]),
    L('head', 'edge', 51.3, 64.2, 51.2, 73.6, 0.85), L('head', 'edge', 64.7, 64.2, 64.8, 73.6, 0.85),
    L('head', 'edge', 52.3, 60, 54.8, 58.2, 0.75), L('head', 'edge', 61.2, 58.2, 63.7, 60, 0.75),
    ...edges('head', 'edge', [[51.4, 65.6], [58, 67.2], [64.6, 65.6]], 0.8),
    ...edges('head', 'edgeSoft', [[52, 75.8], [58, 77], [64, 75.8]], 0.6),
    // horsehair plume: a crest holder on the crown, the tail fanning down the back
    // of the helm to a ragged end, its sides lit
    E('head', 'plume', 58, 56.6, 3.4, 2.2),
    P('chA1', 'plume', [[55.4, 56.2], [60.6, 56.2], [61.4, 62.8], [55.2, 62.8]]),
    P('chA2', 'plume', [[55.2, 62], [61.4, 62], [62.4, 68], [55, 68]]),
    P('chA3', 'plume', [[55, 67.2], [62.4, 67.2], [62.6, 71], [60.2, 74], [58.6, 72], [56.8, 74.4], [54.8, 71]]),
    L('chA1', 'edgeSoft', 55.4, 56.6, 55.2, 62.6, 0.6), L('chA1', 'edgeSoft', 60.6, 56.6, 61.4, 62.6, 0.6),
    L('chA2', 'edgeSoft', 55.2, 62.4, 55, 67.8, 0.6), L('chA2', 'edgeSoft', 61.4, 62.4, 62.4, 67.8, 0.6),
    L('chA3', 'edgeSoft', 55, 67.6, 54.8, 71, 0.6), L('chA3', 'edgeSoft', 62.4, 67.6, 62.6, 71, 0.6),
    ...edges('chA3', 'edge', [[54.8, 71], [56.8, 74.4], [58.6, 72], [60.2, 74], [62.6, 71]], 0.6),
  ],
};
