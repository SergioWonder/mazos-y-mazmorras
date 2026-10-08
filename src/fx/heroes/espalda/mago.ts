// Wizard seen from behind (chapter openings). Bind pose: viewBox 140×135, the
// figure faces away from the viewer, centred on the feet at (58, 128), about 80
// units to the shoulders-and-head plus the tall hat. Painted 'backlit': black,
// rim light all round in `accent`, and the LIT_EDGES pieces as lines of light
// ('edge' bright, 'edgeSoft' faint).
//
// Read from the back: a tall pointed hat with a wide brim (lit rim and band)
// whose tip bends and sways, long hair falling from under the brim in pointed
// locks, a robe to the ankles with a lit hem trim dotted with small stars, wide
// bell sleeves with lit cuffs, a belt with a pouch, a scroll case slung across
// the back on a lit strap, and the staff held upright beside the body, its
// violet crystal glowing and shedding arcane sparkles.
//
// Chains: A hat tip (hangs from the head), C robe skirt (hand-drawn panels on
// its three bones).

import { C, L, P, E, CHAIN_BONES, type PuppetRig, type Shape } from '../../puppet.ts';
import type { ChainSpec } from '../../chains.ts';

type Pt = [number, number];

/** Upper cone of the hat, bending to one side. */
const HAT: ChainSpec = {
  slot: 'A', parent: 'head', joints: [[58.2, 50.5], [57.4, 44], [54.8, 39.4], [50, 38.2]],
  freq: 2.6, damping: 0.3, taper: 0.45, sag: 0.5, sway: 1.2, limit: 18,
};
/** Robe skirt, from the waist to the ankles. */
const ROBE: ChainSpec = {
  slot: 'C', joints: [[58, 97], [58, 106], [58, 115], [58, 123.5]],
  freq: 1.8, damping: 0.35, taper: 0.4, sag: 0.4, sway: 0.7, limit: 8,
};

/** Hem of the robe, left to right (soft folds). */
const HEM: Pt[] = [[44.2, 123.4], [48.6, 124.4], [53.2, 123.8], [58, 124.6], [62.8, 123.8], [67.4, 124.4], [71.8, 123.4]];
/** Pointed ends of the hair under the brim, left to right. */
const LOCKS: Pt[] = [[51.2, 85.4], [54.6, 84], [58, 87.4], [61.4, 84], [64.8, 85.4]];

/** A polyline as lit segments on one bone. */
const edges = (b: Shape['b'], k: string, pts: Pt[], w: number): Shape[] =>
  pts.slice(1).map((q, i) => L(b, k, pts[i][0], pts[i][1], q[0], q[1], w));
/** Smooth tapered panels along a chain: a Catmull-Rom centreline through its
 *  joints, one polygon per bone, each reaching a little back over the previous
 *  one so that a bend shows no steps in the outline. The last one ends in a point. */
function taperPanels(spec: ChainSpec, key: string, widths: number[], back = 0.35): Shape[] {
  const j = spec.joints, n = j.length - 1, out: Shape[] = [];
  const at = (s: number): Pt => {
    const i = Math.min(n - 1, Math.max(0, Math.floor(s))), t = Math.min(1, Math.max(0, s - i));
    const p0 = j[Math.max(0, i - 1)], p1 = j[i], p2 = j[i + 1], p3 = j[Math.min(n, i + 2)];
    const c = (k: 0 | 1) => 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t
      + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t * t * t);
    return [c(0), c(1)];
  };
  const width = (s: number) => {
    const i = Math.min(n - 1, Math.floor(s)), t = s - i;
    return widths[i] + (widths[i + 1] - widths[i]) * t;
  };
  const r = (v: number) => Math.round(v * 100) / 100;
  for (let k = 0; k < n; k++) {
    const s0 = k ? k - back : 0, s1 = k + 1, steps = 4, left: Pt[] = [], right: Pt[] = [];
    for (let i = 0; i <= steps; i++) {
      const s = s0 + ((s1 - s0) * i) / steps, [x, y] = at(s);
      const [ax, ay] = at(Math.max(0, s - 0.05)), [bx, by] = at(Math.min(n, s + 0.05));
      const len = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / len, ny = (bx - ax) / len, w = width(s) / 2;
      left.push([r(x + nx * w), r(y + ny * w)]);
      right.push([r(x - nx * w), r(y - ny * w)]);
    }
    out.push(P(CHAIN_BONES[spec.slot][k], key, [...left, ...right.reverse()]));
  }
  return out;
}
/** A small four-pointed star mark, as two faint crossing strokes. */
const star = (b: Shape['b'], x: number, y: number, r: number): Shape[] =>
  [L(b, 'edgeSoft', x - r, y, x + r, y, 0.45), L(b, 'edgeSoft', x, y - r, x, y + r, 0.45)];

export const MAGO_BACK_RIG: PuppetRig = {
  accent: '#8a7ae0', style: 'magic', phase: 2.3, focus: [74, 40.5], focusBone: 'weapon',
  palette: {
    robe: '#3d3190', robeD: '#2e2570', hat: '#4a3cae', hatD: '#3a2e8c', hair: '#d8dae2', leather: '#5a3f2e',
    wood: '#8a5a32', sash: '#d9a93f', boots: '#4a3450', skin: '#c9a48a', gem: '#b48cff', starGlow: '#efe6ff',
  },
  pivots: {
    root: [58, 128], torso: [58, 100], head: [58, 79], armB: [48.5, 82], armF: [67.5, 82],
    offhand: [46, 100], weapon: [73.5, 99], legB: [54, 104], legF: [62, 104],
  },
  chains: [HAT, ROBE],
  // weight on one hip, head tilted a touch, the staff hand out from the body and the staff upright
  rest: { torso: -1, head: 3, armB: 4, armF: -4, weapon: 5, offhand: 6 },
  windup: {},
  strike: {},
  emitters: [{ bone: 'weapon', at: [74, 40.5], effect: 'arcana', rate: 7, spread: 2.6 }],
  shapes: [
    // heels peeking out under the robe
    P('legB', 'boots', [[51.4, 120], [56.6, 120], [56.8, 124.6], [57.3, 128], [50.6, 128], [51, 124.6]]),
    P('legF', 'boots', [[59.4, 120], [64.6, 120], [65, 124.6], [65.4, 128], [58.7, 128], [59.2, 124.6]]),
    // robe skirt in three panels on the chain; lit sides and a trimmed hem with stars
    P('chC1', 'robe', [[49.4, 96], [66.6, 96], [68.5, 107.6], [47.5, 107.6]]),
    P('chC2', 'robe', [[47.6, 106.6], [68.4, 106.6], [70.3, 116.6], [45.7, 116.6]]),
    P('chC3', 'robe', [[45.8, 115.6], [70.2, 115.6], ...[...HEM].reverse()]),
    L('chC2', 'edgeSoft', 48.6, 107.2, 46.8, 116.2, 0.6), L('chC2', 'edgeSoft', 67.4, 107.2, 69.2, 116.2, 0.6),
    L('chC3', 'edgeSoft', 46.8, 116, 45.4, 122.4, 0.6), L('chC3', 'edgeSoft', 69.2, 116, 70.6, 122.4, 0.6),
    ...edges('chC3', 'edge', HEM.map(([x, y]) => [x + (x < 58 ? 0.6 : -0.6), y - 0.7] as Pt), 0.8),
    ...edges('chC3', 'edgeSoft', [[45.6, 120.4], [53, 120.7], [63, 120.7], [70.4, 120.4]], 0.55),
    C('chC3', 'edgeSoft', 50.4, 122.2, 0.5), C('chC3', 'edgeSoft', 58, 122.6, 0.5), C('chC3', 'edgeSoft', 65.6, 122.2, 0.5),
    ...star('chC2', 53.4, 111.6, 1.1), ...star('chC3', 63.4, 117.4, 0.9),
    // left arm: wide bell sleeve with a lit cuff, the hand below it
    P('armB', 'robeD', [[46.6, 80.4], [51, 81.6], [50.8, 90], [50.3, 97.4], [49.5, 100.4], [42.6, 100.8], [42.6, 97], [44.6, 89], [45.2, 83]]),
    L('armB', 'edge', 43, 100.3, 49.3, 99.9, 0.8),
    C('offhand', 'skin', 46.2, 102.4, 2),
    // the staff, upright beside the body: a claw holding the glowing crystal
    L('weapon', 'wood', 74, 126.8, 74, 88, 2.2), L('weapon', 'wood', 74, 89, 74, 46.5, 2),
    P('weapon', 'gem', [[74, 34.2], [76.3, 40.4], [74, 46.4], [71.7, 40.4]]),
    P('weapon', 'starGlow', [[74, 37.2], [75, 40.6], [74, 43.6], [73, 40.6]]),
    L('weapon', 'wood', 73.4, 47, 71.4, 43.6, 1.1), L('weapon', 'wood', 71.4, 43.6, 71.8, 39.6, 0.9),
    L('weapon', 'wood', 74.6, 47, 76.6, 43.6, 1.1), L('weapon', 'wood', 76.6, 43.6, 76.2, 39.6, 0.9),
    L('weapon', 'edge', 72.7, 48.2, 75.3, 48.2, 0.7), L('weapon', 'edgeSoft', 72.9, 52, 75.1, 52.6, 0.5),
    // right arm: bell sleeve bent out to the staff, lit cuff, the hand gripping it
    P('armF', 'robeD', [[65.6, 80.4], [69.8, 81.6], [71.6, 88], [74.4, 94.6], [76.2, 97.2], [69.6, 99.4], [68.2, 96], [66.6, 89], [65, 83]]),
    L('armF', 'edge', 69.9, 98.9, 75.8, 96.9, 0.8),
    C('armF', 'skin', 73.6, 99.8, 2),
    // upper robe; a high belt with a pouch hanging on the hip
    P('torso', 'robe', [[50, 80], [54, 78.2], [58, 77.6], [62, 78.2], [66, 80], [68.4, 83], [68, 90], [67.2, 98], [66.8, 101], [49.2, 101], [48.8, 98], [48, 90], [47.6, 83]]),
    L('torso', 'edgeSoft', 48.4, 84.6, 48.9, 92.6, 0.55), L('torso', 'edgeSoft', 67.8, 84.6, 67.4, 92.6, 0.55),
    P('torso', 'sash', [[48.9, 93.4], [67.5, 93.4], [67.4, 97], [48.8, 97]]),
    L('torso', 'edge', 49.2, 93.6, 67.2, 93.6, 0.8),
    E('torso', 'leather', 63.2, 100.4, 2.6, 3.2), L('torso', 'edge', 60.8, 98.6, 65.6, 98.6, 0.7),
    ...edges('torso', 'edgeSoft', [[61, 100.8], [61.9, 102.8], [63.2, 103.4], [64.5, 102.8], [65.4, 100.8]], 0.5),
    // scroll case slung across the back, its cap above the left shoulder; the strap crosses it
    L('torso', 'leather', 45.2, 71.8, 60.2, 95, 3.8), L('torso', 'leather', 45.2, 71.8, 46.8, 74.3, 4.8),
    L('torso', 'edge', 45.2, 76, 49, 73.5, 0.75), L('torso', 'edgeSoft', 57, 93.8, 60.6, 91.4, 0.55),
    L('torso', 'leather', 65.4, 81.2, 50.4, 99.6, 1.9), L('torso', 'edge', 65.3, 81.4, 50.6, 99.2, 0.75),
    // long hair falling from under the brim over the shoulders, ending in pointed locks
    P('head', 'hair', [[52.4, 63.5], [51.6, 72], [50.8, 78], [50.2, 82], [51.2, 85.4], [53.6, 84.2], [55.8, 87.4], [58, 85.2], [60.2, 87.4], [62.4, 84.2], [64.8, 85.4], [65.8, 82], [65.2, 78], [64.4, 72], [63.6, 63.5]]),
    ...edges('head', 'edgeSoft', LOCKS, 0.55),
    // the hat: wide brim with a lit rim, the cone with a lit band, the tip on the chain
    E('head', 'hatD', 58, 65, 14.6, 3.4),
    ...edges('head', 'edge', [[44.6, 65.8], [49, 67.5], [58, 68.1], [67, 67.5], [71.4, 65.8]], 0.85),
    P('head', 'hat', [[49.8, 65.2], [53.2, 65.8], [58, 66], [62.8, 65.8], [66.2, 65.2], [63.6, 58], [61.9, 52.5], [61.4, 49.6], [55, 49.6], [54.5, 52.5], [52.4, 58]]),
    L('head', 'edge', 51.8, 60.2, 64.2, 60.2, 0.8), L('head', 'edgeSoft', 51, 63.2, 65, 63.2, 0.55),
    ...taperPanels(HAT, 'hat', [6.6, 4.6, 2.6, 0.2]),
  ],
};
