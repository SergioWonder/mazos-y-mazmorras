// Druid seen from behind (chapter openings). Bind pose: viewBox 140×135, the
// figure faces away from the viewer, centred on the feet at (58, 128), about 80
// units tall to the antlers (the staff rises above). Painted 'backlit': black,
// rim light all round in `accent`, and the LIT_EDGES pieces as lines of light
// ('edge' bright, 'edgeSoft' faint).
//
// Read from the back: a hood with two small antlers and a couple of leaves, a
// mantle of leaves over the shoulders (leaf-toothed hem), a long cloak cinched
// by a rope belt that flares down to the calves and ends in a ragged hem of
// leaves, a satchel at the small of the back, wrapped shins, and the gnarled
// staff held upright in the right hand, vines spiralling up to the green orb
// cradled in its crown. Green motes rise from the orb.
//
// Chains: A long cloak, B leaf mantle (hand-drawn panels on their bones),
// C vine hanging from the staff's crown.

import { C, E, L, P, type BoneId, type PuppetRig, type Shape } from '../../puppet.ts';
import { strandShapes, type ChainSpec } from '../../chains.ts';

type Pt = [number, number];
const RAD = Math.PI / 180;
const r2 = (v: number) => Math.round(v * 100) / 100;

const CLOAK: ChainSpec = {
  slot: 'A', joints: [[58, 80], [58, 92], [58, 104], [58, 117]],
  freq: 1.5, damping: 0.3, taper: 0.4, sag: 0.6, sway: 0.7, limit: 10,
};
const MANTLE: ChainSpec = {
  slot: 'B', joints: [[58, 75], [58, 83], [58, 90]],
  freq: 2, damping: 0.35, taper: 0.4, sag: 0.4, sway: 0.5, limit: 8,
};
const VINE: ChainSpec = {
  slot: 'C', parent: 'weapon', joints: [[79.6, 46], [80.6, 50.6], [80.6, 55.4], [79.8, 60]],
  freq: 2.2, damping: 0.3, taper: 0.4, sag: 0.8, sway: 1.2, limit: 40,
};

/** Leaf-toothed hem of the mantle, left to right. */
const MANTLE_HEM: Pt[] = [[44, 88.6], [46, 92.2], [48.4, 89.4], [50.8, 93], [53.2, 90], [55.6, 93.6], [58, 90.4], [60.4, 93.6], [62.8, 90], [65.2, 93], [67.6, 89.4], [70, 92.2], [72, 88.6]];
/** Ragged hem of leaves of the cloak, left to right. */
const CLOAK_HEM: Pt[] = [[43, 119.6], [45.8, 117.4], [48.4, 121.4], [51.2, 117.8], [54, 122], [56.8, 118.2], [59.6, 122.2], [62.4, 118], [65.2, 121.6], [68, 117.6], [70.8, 121], [73, 117.6]];

/** A polyline as lit segments on one bone. */
const edges = (b: BoneId, k: string, pts: Pt[], w: number): Shape[] =>
  pts.slice(1).map((q, i) => L(b, k, pts[i][0], pts[i][1], q[0], q[1], w));

/** Pointed leaf growing from (x, y) towards `deg` (0 = right, 90 = down). */
function leaf(b: BoneId, k: string, x: number, y: number, deg: number, len: number, w: number): Shape {
  const ux = Math.cos(deg * RAD), uy = Math.sin(deg * RAD), nx = -uy, ny = ux;
  const pts: Pt[] = [
    [x, y],
    [x + ux * len * 0.4 + nx * w / 2, y + uy * len * 0.4 + ny * w / 2],
    [x + ux * len, y + uy * len],
    [x + ux * len * 0.4 - nx * w / 2, y + uy * len * 0.4 - ny * w / 2],
  ];
  return P(b, k, pts.map(([px, py]) => [r2(px), r2(py)] as Pt));
}

export const DRUIDA_BACK_RIG: PuppetRig = {
  accent: '#7dba4e', style: 'magic', phase: 0.9, focus: [75.6, 40.6],
  palette: {
    hoodD: '#2f4f27', hood: '#4f7d35', leaf: '#8cc152', moss: '#5f8a3a', robe: '#7a5634', boots: '#4a3322',
    glove: '#5a3d25', antler: '#c9a77a', wood: '#7b5530', rope: '#a8804f', leather: '#6a4a2c', orb: '#b6ff7a',
  },
  pivots: {
    root: [58, 128], torso: [58, 100], head: [58, 77], armB: [47.5, 82], armF: [68.5, 82],
    offhand: [43.8, 99], weapon: [75.6, 96.6], legB: [54, 101], legF: [62, 101],
  },
  headScale: 0.86,
  chains: [CLOAK, MANTLE, VINE],
  // weight on the left leg, head turned a touch towards the staff
  rest: { torso: -1, head: 3, armB: 3, legB: 1, legF: -1.5 },
  windup: {},
  strike: {},
  emitters: [{ bone: 'weapon', at: [75.6, 40.6], effect: 'alma', rate: 6, spread: 2.5 }],
  shapes: [
    // legs under the cloak: soft boots wrapped at the shin, below the hem
    P('legB', 'boots', [[51.4, 112], [56.6, 112], [56.4, 120], [56.6, 124], [57.4, 128], [50, 128], [50.8, 124], [51.2, 120]]),
    L('legB', 'edge', 51, 123.8, 56.7, 123.8, 0.75),
    P('legF', 'boots', [[59.4, 112], [64.6, 112], [64.8, 120], [65.2, 124], [66, 128], [58.6, 128], [59.4, 124], [59.6, 120]]),
    L('legF', 'edge', 59.3, 123.8, 65.2, 123.8, 0.75),
    // arms coming out from under the mantle: sleeves with a lit cuff, the left hand empty
    L('armB', 'hood', 47.5, 82, 45, 90, 6), L('armB', 'hood', 45, 90, 43.4, 96.6, 4.4),
    L('armB', 'edge', 40.8, 94.4, 45.8, 95.2, 0.7),
    C('armB', 'glove', 43.2, 98.6, 2.3),
    L('armF', 'hood', 68.5, 82, 71.4, 90, 6), L('armF', 'hood', 71.4, 90, 74.6, 95.2, 5),
    L('armF', 'edge', 71, 94.8, 75.2, 91.6, 0.7),
    // long cloak in three panels on the chain, falling from the shoulders to the
    // calves and ending in a ragged hem of leaves; its borders lit
    P('chA1', 'hoodD', [[47.4, 79.5], [68.6, 79.5], [69.2, 90], [69, 93.6], [47, 93.6], [46.8, 90]]),
    P('chA2', 'hoodD', [[47, 92.4], [69, 92.4], [70.4, 105.6], [45.6, 105.6]]),
    P('chA3', 'hoodD', [[45.6, 104.4], [70.4, 104.4], ...[...CLOAK_HEM].reverse()]),
    L('chA2', 'edge', 47, 92.6, 45.7, 105.2, 0.85), L('chA2', 'edge', 69, 92.6, 70.3, 105.2, 0.85),
    L('chA3', 'edge', 45.7, 104.8, 43.1, 119.2, 0.85), L('chA3', 'edge', 70.3, 104.8, 72.9, 117.4, 0.85),
    ...edges('chA3', 'edge', CLOAK_HEM, 0.75),
    L('chA3', 'edgeSoft', 52.4, 108.6, 51, 116.6, 0.5), L('chA3', 'edgeSoft', 63.8, 108.6, 65.4, 116.4, 0.5),
    leaf('chA3', 'hoodD', 44.8, 109, 130, 4.6, 2.2), leaf('chA3', 'hoodD', 71.2, 109, 50, 4.6, 2.2),
    // satchel strap across the back, from the left shoulder to the right hip
    L('torso', 'leather', 50, 81, 63.6, 101.2, 1.8), L('torso', 'edge', 50.9, 80.6, 64.4, 100.6, 0.6),
    P('torso', 'leather', [[60.6, 100.6], [68.2, 100.6], [68.4, 106.4], [67.2, 108], [61.6, 108], [60.4, 106.4]]),
    L('torso', 'edge', 60.9, 101, 61.3, 104.4, 0.65), L('torso', 'edge', 61.3, 104.4, 64.4, 105.6, 0.65),
    L('torso', 'edge', 64.4, 105.6, 67.5, 104.4, 0.65), L('torso', 'edge', 67.5, 104.4, 67.9, 101, 0.65),
    // mantle of leaves over the shoulders, its outer borders and leaf hem lit
    P('chB1', 'hood', [[51.4, 75.6], [58, 74.8], [64.6, 75.6], [70.8, 82], [71.8, 83.8], [44.2, 83.8], [45.2, 82]]),
    P('chB2', 'hood', [[44.2, 83], [71.8, 83], ...[...MANTLE_HEM].reverse()]),
    L('chB1', 'edge', 51.4, 75.8, 45.2, 82.2, 0.85), L('chB1', 'edge', 64.6, 75.8, 70.8, 82.2, 0.85),
    L('chB2', 'edge', 44.2, 83, 44, 88.4, 0.85), L('chB2', 'edge', 71.8, 83, 72, 88.4, 0.85),
    ...edges('chB2', 'edge', MANTLE_HEM, 0.7),
    leaf('chB1', 'hood', 45.2, 82.4, 145, 4.6, 2.2), leaf('chB1', 'hood', 70.8, 82.4, 35, 4.6, 2.2),
    // rounded hood with two small branching antlers; rim against the mantle
    L('head', 'antler', 54.6, 59.4, 50.8, 54.4, 1.9), L('head', 'antler', 50.8, 54.4, 47.6, 50.6, 1.5),
    L('head', 'antler', 50.8, 54.4, 50.6, 48.6, 1.3), L('head', 'antler', 47.6, 50.6, 48, 45.6, 1.2),
    L('head', 'antler', 47.6, 50.6, 44.2, 49.4, 1.1),
    L('head', 'antler', 61.4, 59.4, 65.2, 54.4, 1.9), L('head', 'antler', 65.2, 54.4, 68.4, 50.6, 1.5),
    L('head', 'antler', 65.2, 54.4, 65.4, 48.6, 1.3), L('head', 'antler', 68.4, 50.6, 68, 45.6, 1.2),
    L('head', 'antler', 68.4, 50.6, 71.8, 49.4, 1.1),
    P('head', 'hoodD', [[51.2, 79.5], [50.2, 73], [50.4, 66.4], [52, 61.2], [54.6, 57.8], [58, 56.4], [61.4, 57.8], [64, 61.2], [65.6, 66.4], [65.8, 73], [64.8, 79.5]]),
    L('head', 'edge', 50.9, 71, 51.3, 65.2, 0.8), L('head', 'edge', 51.3, 65.2, 54.4, 59.6, 0.8),
    L('head', 'edge', 65.1, 71, 64.7, 65.2, 0.8), L('head', 'edge', 64.7, 65.2, 61.6, 59.6, 0.8),
    L('head', 'edgeSoft', 52.6, 77.6, 63.4, 77.6, 0.6),
    // gnarled staff held upright beside the body, vines spiralling up to the orb
    L('weapon', 'wood', 76.6, 127.6, 76.2, 110, 2.6), L('weapon', 'wood', 76.2, 110, 76.8, 92, 2.9),
    L('weapon', 'wood', 76.8, 92, 75.6, 72, 2.9), L('weapon', 'wood', 75.6, 72, 75.6, 48, 2.8),
    C('weapon', 'wood', 76.2, 110, 1.8), C('weapon', 'wood', 75.8, 74, 1.8),
    C('weapon', 'orb', 75.6, 40.6, 3.3),
    P('weapon', 'wood', [[75, 49.4], [71, 45.6], [69.8, 40.2], [70.8, 36.2], [71.8, 36.4], [71.4, 40.2], [72.8, 44.4], [76.4, 47.8]]),
    P('weapon', 'wood', [[76.2, 49.4], [80.2, 45.6], [81.4, 40.2], [80.4, 36.2], [79.4, 36.4], [79.8, 40.2], [78.4, 44.4], [74.8, 47.8]]),
    L('weapon', 'edge', 74.2, 67.4, 77.2, 64.2, 0.6), L('weapon', 'edge', 74.2, 61, 77.2, 57.8, 0.6),
    L('weapon', 'edge', 74.2, 54.6, 77.2, 51.4, 0.6),
    leaf('weapon', 'moss', 74.4, 50.4, 165, 5, 2.2),
    // a vine hanging from the crown, swaying
    ...strandShapes(VINE, 'moss', [1.2, 1, 0.9, 0.6]),
    leaf('chC2', 'moss', 80.6, 53, 30, 4, 2), leaf('chC3', 'moss', 79.8, 59.6, 80, 4, 2),
    // the hand round the staff
    C('armF', 'glove', 75.6, 96.6, 2.8),
  ],
};
