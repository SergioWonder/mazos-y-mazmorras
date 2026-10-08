// Barbarian seen from behind (chapter openings). Bind pose: viewBox 140×135, the
// figure faces away from the viewer, centred on the feet at (58, 128), about 82
// units tall with the mane. Painted 'backlit': black, rim light all round in
// `accent`, and the LIT_EDGES pieces as lines of light ('edge' bright,
// 'edgeSoft' faint).
//
// Read from the back: a broad V-shaped back, a wild spiky mane, a ragged fur
// mantle over the shoulders whose hem points down the spine, bare arms with
// bracers, the double-bitted greataxe resting on the right shoulder with its
// haft slung across the back, a belt over a ragged fur kilt and fur-wrapped
// boots in a wide stance.
//
// Chains: C fur mantle, D fur kilt (hand-drawn panels on their bones), A and B
// two mane spikes.

import { C, E, L, P, type PuppetRig, type Shape } from '../../puppet.ts';
import { strandShapes, type ChainSpec } from '../../chains.ts';

type Pt = [number, number];

const MANTLE: ChainSpec = {
  slot: 'C', joints: [[58, 72], [58, 78], [58, 83.5], [58, 90]],
  freq: 1.7, damping: 0.32, taper: 0.4, sag: 0.5, sway: 0.7, limit: 10,
};
const KILT: ChainSpec = {
  slot: 'D', joints: [[58, 100.5], [58, 105.5], [58, 111]],
  freq: 2, damping: 0.32, taper: 0.4, sag: 0.4, sway: 0.6, limit: 10,
};
const SPIKE_L: ChainSpec = {
  slot: 'A', parent: 'head', joints: [[52.4, 58], [48.6, 55], [45.2, 52.8], [42, 51.4]],
  freq: 3.2, damping: 0.3, taper: 0.45, sag: 0.25, sway: 0.7, limit: 25,
};
const SPIKE_R: ChainSpec = {
  slot: 'B', parent: 'head', joints: [[60.6, 55], [63.2, 51.4], [65.4, 48.6], [67.6, 46.4]],
  freq: 3.5, damping: 0.3, taper: 0.45, sag: 0.25, sway: 0.6, limit: 25,
};

/** Ragged fur hem of the mantle, left to right: a V that points down the spine. */
const HEM: Pt[] = [
  [41.6, 83.4], [43.6, 86.4], [45.6, 84.6], [47.6, 88.2], [50, 86.6], [52.4, 90.4], [55, 88.8], [58, 92.6],
  [61, 88.8], [63.6, 90.4], [66, 86.6], [68.4, 88.2], [70.4, 84.6], [72.4, 86.4], [74.4, 83.4],
];
/** Ragged hem of the fur kilt, left to right. */
const KILT_HEM: Pt[] = [[46.8, 110], [49.2, 113.4], [52.4, 110.6], [55.4, 114.4], [58.6, 111], [61.6, 114.2], [64.6, 110.6], [67.6, 113.2], [69.6, 109.6]];

/** A polyline as lit segments on one bone. */
const edges = (b: Shape['b'], k: string, pts: Pt[], w: number): Shape[] =>
  pts.slice(1).map((q, i) => L(b, k, pts[i][0], pts[i][1], q[0], q[1], w));

// ── Greataxe: drawn in its own frame (u across the head, v down the haft) and
// placed on the shoulder, the haft slung down across the back ────────────────
const GRIP: Pt = [76.8, 75.5];
const POMMEL: Pt = [42.6, 113.6];
const AXIS = (() => {
  const dx = POMMEL[0] - GRIP[0], dy = POMMEL[1] - GRIP[1], n = Math.hypot(dx, dy);
  return { v: [dx / n, dy / n] as Pt, u: [-dy / n, dx / n] as Pt };
})();
const HEAD: Pt = [GRIP[0] - AXIS.v[0] * 9.5, GRIP[1] - AXIS.v[1] * 9.5];
/** Axe frame → bind coordinates. */
const ax = (u: number, v: number): Pt => [HEAD[0] - AXIS.u[0] * u + AXIS.v[0] * v, HEAD[1] - AXIS.u[1] * u + AXIS.v[1] * v];
const axP = (pts: Pt[]): Pt[] => pts.map(([u, v]) => ax(u, v));
const axL = (k: string, u1: number, v1: number, u2: number, v2: number, w: number): Shape => {
  const [x1, y1] = ax(u1, v1), [x2, y2] = ax(u2, v2);
  return L('weapon', k, x1, y1, x2, y2, w);
};
/** One crescent bit, u > 0 (mirrored with side = -1). */
const bit = (side: number): Pt[] =>
  [[1, -2.2], [4.2, -3.6], [8.8, -9.4], [11.2, -4.8], [11.8, 0], [11.2, 4.8], [8.8, 9.4], [4.2, 3.6], [1, 2.2]]
    .map(([u, v]) => [u * side, v] as Pt);
/** Cutting edge of one bit, as lit segments. */
const bitEdge = (side: number): Shape[] => {
  const pts: Pt[] = [[8.8, -8.2], [11, -3.6], [11, 3.6], [8.8, 8.2]];
  return pts.slice(1).map((q, i) => axL('edge', pts[i][0] * side, pts[i][1], q[0] * side, q[1], 0.75));
};
const pommelLen = Math.hypot(POMMEL[0] - HEAD[0], POMMEL[1] - HEAD[1]);

export const BARBARO_BACK_RIG: PuppetRig = {
  accent: '#e0622e', style: 'melee', phase: 1.1, focus: [60, 100],
  palette: {
    hair: '#c4532b', skin: '#c98a5e', fur: '#9b7b55', furD: '#6e5236', pants: '#5b3b26', boots: '#3e2a1d',
    steel: '#c3ced6', wood: '#6e4a2c', belt: '#8a5a2e', strap: '#6b3f22',
  },
  pivots: {
    root: [58, 128], torso: [58, 100], head: [58, 73], armB: [44.6, 79], armF: [71.4, 79],
    offhand: [41.8, 91], weapon: GRIP, legB: [53, 101], legF: [63, 101],
  },
  headScale: 0.92,
  chains: [MANTLE, KILT, SPIKE_L, SPIKE_R],
  // wide stance, weight a touch on the left leg, free arm hanging away from the body
  rest: { torso: -1.2, head: 3, armB: 12, offhand: 4, legB: 3.5, legF: -4 },
  windup: {},
  strike: {},
  shapes: [
    // legs: thick thighs, fur-wrapped boots bound with a strap
    P('legB', 'pants', [[48, 100], [57.6, 100], [57.2, 107.6], [56.4, 113.6], [56, 118.4], [49.6, 118.4], [48.8, 113], [48, 107]]),
    P('legB', 'boots', [[47.4, 117.6], [48.6, 115.2], [50.8, 116.8], [52.8, 114.8], [55, 116.6], [57.2, 115.2], [57.8, 118], [56.6, 123], [57.8, 128], [47.4, 128], [48.4, 123]]),
    L('legB', 'edge', 48, 118.2, 57.2, 118, 0.8), L('legB', 'edgeSoft', 48.6, 124.6, 56.6, 121.2, 0.55),
    P('legF', 'pants', [[58.4, 100], [68, 100], [68, 107], [67.2, 113], [66.4, 118.4], [60, 118.4], [59.6, 113.6], [58.8, 107.6]]),
    P('legF', 'boots', [[58.2, 118], [58.8, 115.2], [61, 116.6], [63.2, 114.8], [65.2, 116.8], [67.4, 115.2], [68.6, 117.6], [67.6, 123], [68.6, 128], [58.2, 128], [59.4, 123]]),
    L('legF', 'edge', 58.8, 118, 68, 118.2, 0.8), L('legF', 'edgeSoft', 59.4, 121.2, 67.4, 124.6, 0.55),
    // free left arm: deltoid, bare arm, bracer, fist
    E('armB', 'skin', 44.4, 81.4, 4.8, 5.4),
    L('armB', 'skin', 44.2, 80.6, 41.8, 91, 7.6), E('armB', 'skin', 42.8, 86, 4.4, 5.4),
    L('offhand', 'skin', 41.8, 90.6, 41.2, 98.6, 6.4),
    L('offhand', 'strap', 41.7, 92.8, 41.3, 97.8, 7.2),
    L('offhand', 'edge', 37.9, 92.6, 45.5, 92.9, 0.75), L('offhand', 'edgeSoft', 38.4, 96.8, 44.6, 96.9, 0.55),
    C('offhand', 'skin', 41.1, 100.6, 3.5),
    // right arm cocked up to the shoulder, holding the haft
    E('armF', 'skin', 71.6, 81.4, 4.8, 5.4),
    L('armF', 'skin', 72, 81, 80.6, 90, 7.8), C('armF', 'skin', 80.4, 90.2, 3.6),
    L('armF', 'skin', 80.6, 90, 78.2, 78.6, 6.4),
    L('armF', 'strap', 80.2, 87.6, 78.8, 81, 7.2),
    L('armF', 'edge', 76.5, 88.4, 83.9, 86.8, 0.75), L('armF', 'edgeSoft', 75.2, 81.8, 82.2, 80.4, 0.55),
    // V-shaped back: broad shoulders, heavy traps, a narrow waist; lats in soft light
    P('torso', 'skin', [[44, 75], [52, 72], [58, 71.4], [64, 72], [72, 75], [73.2, 82], [70.4, 90], [67.4, 96.6], [66.8, 101.4], [49.2, 101.4], [48.6, 96.6], [45.6, 90], [42.8, 82]]),
    P('torso', 'skin', [[51.6, 74.6], [54.6, 66.6], [61.4, 66.6], [64.4, 74.6]]),
    L('torso', 'edgeSoft', 46.4, 89.4, 50.2, 95.4, 0.55), L('torso', 'edgeSoft', 69.6, 89.4, 65.8, 95.4, 0.55),
    P('torso', 'belt', [[48.8, 96.6], [67.2, 96.6], [67.2, 101.6], [48.8, 101.6]]),
    L('torso', 'edge', 49, 96.7, 67, 96.7, 0.8),
    // ragged fur kilt below the belt
    P('chD1', 'fur', [[48.4, 100.6], [67.6, 100.6], [68.8, 106.2], [47.4, 106.2]]),
    P('chD2', 'fur', [[47.5, 105.4], [68.7, 105.4], ...[...KILT_HEM].reverse()]),
    ...edges('chD2', 'edgeSoft', KILT_HEM, 0.65),
    // fur mantle over the shoulders in three panels on the chain; lit borders and hem
    P('chC1', 'furD', [[50.4, 72.6], [58, 71.2], [65.6, 72.6], [70.4, 73.8], [72.6, 73.2], [74.2, 75.6], [76.2, 76], [76.4, 79.6], [39.6, 79.6], [39.8, 76], [41.8, 75.6], [43.4, 73.2], [45.6, 73.8]]),
    P('chC2', 'furD', [[39.8, 78.8], [76.2, 78.8], [75.6, 82.2], [76.6, 83.6], [74.6, 84.4], [41.4, 84.4], [39.4, 83.6], [40.4, 82.2]]),
    P('chC3', 'furD', [...HEM, [58, 83]]),
    L('chC1', 'edge', 50.4, 72.8, 43.4, 74, 0.85), L('chC1', 'edge', 43.4, 74, 40.4, 78, 0.85),
    L('chC1', 'edge', 65.6, 72.8, 72.6, 74, 0.85), L('chC1', 'edge', 72.6, 74, 75.6, 78, 0.85),
    L('chC2', 'edge', 40.3, 77.6, 41.4, 83.6, 0.85), L('chC2', 'edge', 75.7, 77.6, 74.6, 83.6, 0.85),
    ...edges('chC3', 'edge', HEM, 0.8),
    // mane: wild spikes round the skull, locks over the mantle collar, two loose spikes
    ...strandShapes(SPIKE_L, 'hair', [4.6, 3.2, 1.8, 0.4], { tip: 'point' }),
    ...strandShapes(SPIKE_R, 'hair', [4.6, 3.2, 1.8, 0.4], { tip: 'point' }),
    E('head', 'skin', 58, 63.6, 7.2, 8.6),
    P('head', 'hair', [
      [50.4, 70.4], [45.6, 68.4], [49.6, 65], [44.4, 61.2], [50.2, 59.6], [47.6, 54.4], [53.4, 55.6], [54.8, 50.6],
      [58.2, 54.2], [61.4, 50.8], [63.4, 54.6], [69.6, 53.6], [66.6, 59], [72.2, 62.2], [66.8, 64.6], [69.6, 69.6],
    ]),
    P('head', 'hair', [[51.4, 68], [64.6, 68], [64.2, 73.6], [62.2, 71.8], [60.6, 75.6], [58.4, 72.6], [56.2, 75.8], [54.4, 72], [52, 74]]),
    // greataxe: haft across the back, double-bitted head above the right shoulder
    axL('wood', 0, -3, 0, pommelLen, 2.6),
    axL('strap', 0, pommelLen - 7, 0, pommelLen - 1.6, 3.2), C('weapon', 'strap', POMMEL[0], POMMEL[1], 1.9),
    axL('edge', -1.5, 6, -1.5, pommelLen - 8, 0.55),
    axL('edgeSoft', -1.9, pommelLen - 7.2, 1.9, pommelLen - 7.2, 0.5),
    P('weapon', 'steel', axP(bit(1))), P('weapon', 'steel', axP(bit(-1))),
    ...bitEdge(1), ...bitEdge(-1),
    // the fist over the haft
    C('armF', 'skin', GRIP[0], GRIP[1], 3.4),
  ],
};
