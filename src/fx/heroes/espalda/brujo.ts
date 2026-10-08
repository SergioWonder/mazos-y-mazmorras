// Warlock seen from behind (chapter openings). Bind pose: viewBox 140×135, the
// figure faces away from the viewer, centred on the feet at (58, 128), about 80
// units tall with the horns. Painted 'backlit': black, rim light all round in
// `accent`, and the LIT_EDGES pieces as lines of light ('edge' bright,
// 'edgeSoft' faint). Only the violet flame glows.
//
// Read from the back: a pointed hood with two ringed horns sweeping out and up,
// the rigid high collar rising in two flaps on each side of the hood, a long
// ragged cloak down to the boots (lit outer borders and torn hem), a heavy chain
// draped across the back from the left shoulder to the right hip with a
// grimoire hanging from it, bell sleeves, the left hand hanging with its claws
// and the right hand raised a little to the side, palm up, under a small
// floating eldritch flame that sheds void motes.
//
// Chains: C long cloak (hand-drawn panels on its three bones), E grimoire.

import { C, E, L, P, type PuppetRig, type Shape } from '../../puppet.ts';
import type { ChainSpec } from '../../chains.ts';

type Pt = [number, number];

const CLOAK: ChainSpec = {
  slot: 'C', joints: [[58, 79], [58, 92], [58, 105], [58, 118]],
  freq: 1.5, damping: 0.32, taper: 0.4, sag: 0.6, sway: 0.7, limit: 10,
};
const TOME: ChainSpec = {
  slot: 'E', joints: [[70.5, 105], [73.6, 107.8], [76, 110.4]],
  freq: 2.4, damping: 0.28, taper: 0.3, sag: 0.5, sway: 0.5, limit: 30,
};

/** Where the flame floats, on the hand (weapon) bone. */
const FLAME: Pt = [83.6, 82];

/** Ragged hem of the cloak, left to right. */
const HEM: Pt[] = [
  [40, 119.8], [43.4, 116.4], [46.4, 121.2], [50, 116.6], [53, 120.6], [56, 117], [59, 121.4],
  [62, 116.8], [65.4, 120.8], [68.6, 116.6], [72, 120.4], [76, 117.2],
];
/** Path of the chain over the back, from the left shoulder to the right hip. */
const CHAIN: Pt[] = [[49.5, 83], [54, 89], [59.5, 95.4], [65, 100.8], [70.5, 105]];

/** A polyline as lit segments on one bone. */
const edges = (b: Shape['b'], k: string, pts: Pt[], w: number): Shape[] =>
  pts.slice(1).map((q, i) => L(b, k, pts[i][0], pts[i][1], q[0], q[1], w));

/** Links along a polyline: a lit band broken by dark holes (flat links)
 *  alternating with bright bars (links seen edge-on). */
function links(b: Shape['b'], pts: Pt[], n: number): Shape[] {
  const segs = pts.slice(1).map((q, i) => ({ a: pts[i], q, len: Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]) }));
  const total = segs.reduce((s, g) => s + g.len, 0);
  const out: Shape[] = edges(b, 'edgeSoft', pts, 2.3);
  for (let i = 0; i < n; i++) {
    let d = ((i + 0.5) / n) * total;
    const g = segs.find((s) => (d -= s.len) <= 0) ?? segs[segs.length - 1];
    const f = 1 + d / g.len;
    const ux = (g.q[0] - g.a[0]) / g.len, uy = (g.q[1] - g.a[1]) / g.len;
    const x = g.a[0] + (g.q[0] - g.a[0]) * f, y = g.a[1] + (g.q[1] - g.a[1]) * f;
    out.push(i % 2
      ? L(b, 'edge', x - ux * 0.9, y - uy * 0.9, x + ux * 0.9, y + uy * 0.9, 0.8)
      : L(b, 'chain', x - ux * 0.75, y - uy * 0.75, x + ux * 0.75, y + uy * 0.75, 0.75));
  }
  return out;
}

/** Left horn (viewer's left): a thick crescent sweeping out from the hood, then up. */
const HORN: Pt[] = [
  [52, 64.5], [48, 63.5], [44.5, 61], [42, 57], [41, 52], [41.8, 47], [43.6, 43.4], [45.4, 41.6],
  [44.8, 45.2], [44.6, 49.6], [45.6, 53.6], [48, 56.6], [51, 58.4], [54, 59],
];
/** Rings across the left horn, root to tip. */
const RINGS: [Pt, Pt][] = [[[48.2, 63.4], [48.6, 56.8]], [[43.2, 59.4], [46.4, 55.2]], [[41.2, 52.4], [45, 51.6]]];
const mirror = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [116 - x, y]);

export const BRUJO_BACK_RIG: PuppetRig = {
  accent: '#c98bff', style: 'magic', phase: 4.6, focus: FLAME,
  palette: {
    cloak: '#2e1b48', cloakD: '#1d1130', collar: '#24163a', robe: '#2a1a3c', robeD: '#1d1130', boots: '#231a2c',
    skin: '#cdbfd9', hood: '#1c1424', horn: '#5a4a62', tome: '#6b2130', chain: '#8a8196', gem: '#c98bff',
    violetFire: '#b46bff', violetCore: '#f6e6ff',
  },
  pivots: {
    root: [58, 128], torso: [58, 100], head: [58, 78], armB: [48, 82], armF: [68, 82],
    offhand: [41.5, 100], weapon: [81.5, 91.5], legB: [54, 101], legF: [62, 101],
  },
  headScale: 0.9,
  chains: [CLOAK, TOME],
  // weight on the left leg, head turned a touch towards the flame
  rest: { torso: -1, head: 3, legB: 1, legF: -1.5 },
  windup: {},
  strike: {},
  emitters: [
    { bone: 'weapon', at: FLAME, effect: 'vacio', rate: 9, spread: 2 },
    { bone: 'weapon', at: [83.6, 79], effect: 'arcana', rate: 2.5, spread: 1.5 },
  ],
  animate(p, t) {
    // the hand bobs gently under the flame, as if weighing it
    p.weapon += Math.sin(t * 2 * Math.PI * 0.9) * 1.4;
  },
  shapes: [
    // boots below the hem, a lit cuff on each
    P('legB', 'boots', [[50.6, 113], [56.6, 113], [56.4, 122.5], [57.2, 128], [49.4, 128], [50.4, 122.5]]),
    L('legB', 'edge', 50.6, 123.4, 56.6, 123.4, 0.7),
    P('legF', 'boots', [[59.4, 113], [65.4, 113], [65.6, 122.5], [66.6, 128], [58.8, 128], [59.6, 122.5]]),
    L('legF', 'edge', 59.6, 123.4, 65.6, 123.4, 0.7),
    // left arm hanging in a bell sleeve, clawed hand
    L('armB', 'robe', 48, 81, 42.5, 97, 6.5),
    P('armB', 'robeD', [[39, 94], [45.5, 96], [45.5, 101], [43.5, 99.8], [42, 102.5], [40.5, 100], [38.2, 101.5], [38.2, 97]]),
    ...edges('armB', 'edgeSoft', [[42, 102.5], [40.5, 100], [38.2, 101.5]], 0.55),
    C('offhand', 'skin', 40.8, 103.2, 2.1),
    L('offhand', 'skin', 39.6, 104.4, 38.2, 108.2, 0.9), L('offhand', 'skin', 40.9, 105, 40.6, 109, 0.9),
    L('offhand', 'skin', 42.1, 104.6, 42.8, 108.2, 0.9),
    // right arm raised to the side, sleeve hanging from the forearm
    L('armF', 'robe', 68, 81, 74.5, 93.5, 6.5), L('armF', 'robe', 74.5, 93.5, 80, 91.5, 5.2),
    P('armF', 'robeD', [[75.4, 90.2], [81.4, 88.8], [82.2, 93.8], [80.6, 97.8], [79.4, 95.6], [77.8, 99.5], [76.3, 96.4], [74.4, 98.6]]),
    ...edges('armF', 'edgeSoft', [[80.6, 97.8], [79.4, 95.6], [77.8, 99.5]], 0.55),
    L('armF', 'edge', 81.2, 89, 82, 93.6, 0.7),
    // hand palm up, claws open under the floating flame
    C('weapon', 'skin', 83, 90.6, 2.1),
    L('weapon', 'skin', 82, 89, 81.4, 86.4, 0.85), L('weapon', 'skin', 84.3, 89.1, 85.5, 86.6, 0.85),
    E('weapon', 'violetFire', 83.6, 82.6, 2.8, 3.6),
    P('weapon', 'violetFire', [[80.8, 83.6], [82, 77.6], [83.3, 80.6], [84, 74.6], [85.2, 80.1], [86.6, 77.3], [86.4, 83.9]]),
    E('weapon', 'violetCore', 83.6, 83.4, 1.2, 1.8),
    // long cloak in three panels on the chain, ragged hem; borders lit
    P('chC1', 'cloakD', [[50, 76.5], [58, 75.5], [66, 76.5], [71.5, 82], [72.5, 93], [43.5, 93], [44.5, 82]]),
    P('chC2', 'cloakD', [[43.6, 92], [72.4, 92], [73.8, 106], [42.2, 106]]),
    P('chC3', 'cloakD', [[42.3, 105], [73.7, 105], ...[...HEM].reverse()]),
    L('chC1', 'edge', 44.5, 82.4, 43.6, 92.6, 0.9), L('chC1', 'edge', 71.5, 82.4, 72.4, 92.6, 0.9),
    L('chC2', 'edge', 43.6, 92.4, 42.3, 105.6, 0.9), L('chC2', 'edge', 72.4, 92.4, 73.7, 105.6, 0.9),
    L('chC3', 'edge', 42.3, 105.4, 40, 119.6, 0.9), L('chC3', 'edge', 73.7, 105.4, 76, 117, 0.9),
    ...edges('chC3', 'edge', HEM, 0.8),
    L('chC3', 'edgeSoft', 50.5, 108, 49.2, 115.4, 0.5), L('chC3', 'edgeSoft', 64.8, 108, 66.4, 115.2, 0.5),
    // heavy chain draped across the back, lit links
    ...links('torso', CHAIN, 11),
    // grimoire hanging from the chain at the right hip: lit spine, page edge and clasp
    L('chE1', 'edgeSoft', 70.5, 105, 73.6, 107.8, 1.2), L('chE2', 'edgeSoft', 73.6, 107.8, 76, 110.4, 1.2),
    P('chE2', 'tome', [[75, 110.6], [82.6, 109.6], [84, 118.6], [76.4, 119.6]]),
    L('chE2', 'edge', 75.3, 111, 76.7, 119.2, 0.9), L('chE2', 'edgeSoft', 76.4, 110.7, 82.4, 109.9, 0.55),
    L('chE2', 'edgeSoft', 80.8, 114.4, 83.4, 114, 0.6),
    // pointed hood from behind
    P('head', 'hood', [[51, 80], [50, 72], [50.5, 65], [52.5, 59.5], [55.5, 55.5], [58, 53], [60.5, 55.5], [63.5, 59.5], [65.5, 65], [66, 72], [65, 80]]),
    L('head', 'edge', 52.6, 59.6, 55.6, 55.6, 0.75), L('head', 'edge', 63.4, 59.6, 60.4, 55.6, 0.75),
    // two horns curving out and up, their outer curve lit
    P('head', 'horn', HORN), P('head', 'horn', mirror(HORN)),
    ...RINGS.flatMap(([a, q]) => [L('head', 'edgeSoft', a[0], a[1], q[0], q[1], 0.6), L('head', 'edgeSoft', 116 - a[0], a[1], 116 - q[0], q[1], 0.6)]),
    // rigid high collar: two flaps framing the hood, their tops lit
    P('torso', 'collar', [[49, 83], [47, 76], [45.5, 68.5], [48.5, 70.5], [51.5, 74], [58, 75.8], [64.5, 74], [67.5, 70.5], [70.5, 68.5], [69, 76], [67, 83], [58, 84.5]]),
    ...edges('torso', 'edge', [[45.7, 68.8], [48.5, 70.7], [51.5, 74.1]], 0.8),
    ...edges('torso', 'edge', [[70.3, 68.8], [67.5, 70.7], [64.5, 74.1]], 0.8),
    ...edges('torso', 'edgeSoft', [[49, 83], [58, 84.5], [67, 83]], 0.6),
  ],
};
