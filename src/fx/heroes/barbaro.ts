// Barbarian rig (backlit silhouette). Bind-pose coordinates: viewBox 140×135,
// facing right, feet at y≈128. See src/fx/heroes/README.md for chains (hair,
// cloth), action timelines and the piece budget.
//
// Card reference: furia-indomita / furia-creciente — a hulking V-shaped
// silhouette with a wild spiky mane and a double-bitted greataxe, never a face.
// Bones: armF is the whole front arm (slightly bent) and the weapon bone pivots
// on its fist, so the wrist cocks and snaps the axe; the back arm has a real
// elbow (armB = upper arm, offhand = forearm). Six spring chains: four mane
// locks (A–D), the beard (E) and the front loincloth (F).

import { C, E, P, L, type Keyframe, type PuppetRig } from '../puppet.ts';
import { strandShapes, type ChainSpec } from '../chains.ts';
import { EASE, shake } from '../motion.ts';

// ── Mane: stiff-ish spikes that sweep back and up from the skull ────────────
const LOCK_TOP: ChainSpec = {
  slot: 'A', parent: 'head', joints: [[56, 47], [51, 37], [45, 29], [38, 21]],
  freq: 3.4, damping: 0.28, taper: 0.45, sag: 0.4, sway: 1.4, limit: 60,
};
const LOCK_BACK: ChainSpec = {
  slot: 'B', parent: 'head', joints: [[50, 53], [41, 49], [32, 47], [23, 47]],
  freq: 3.1, damping: 0.26, taper: 0.45, sag: 0.6, sway: 1.6, limit: 60,
};
const LOCK_NAPE: ChainSpec = {
  slot: 'C', parent: 'head', joints: [[50, 60], [42, 62], [34, 66], [26, 71]],
  freq: 2.7, damping: 0.25, taper: 0.4, sag: 0.9, sway: 1.8, limit: 65,
};
const LOCK_CROWN: ChainSpec = {
  slot: 'D', parent: 'head', joints: [[62, 46], [63, 36], [63, 28], [62, 19]],
  freq: 3.8, damping: 0.3, taper: 0.45, sag: 0.3, sway: 1.1, limit: 55,
};
const BEARD: ChainSpec = {
  slot: 'E', parent: 'head', joints: [[70, 68], [74, 73], [76, 78], [76, 84]],
  freq: 3.6, damping: 0.35, taper: 0.35, sag: 0.6, sway: 0.7, limit: 50,
};
// ── Pelts: the loincloth flaps in front of the thighs ───────────────────────
const LOINCLOTH: ChainSpec = {
  slot: 'F', parent: 'torso', joints: [[60, 103], [61, 110], [61, 117], [60, 123]],
  freq: 2.6, damping: 0.3, taper: 0.3, sag: 0.8, sway: 1.2, limit: 55,
};

const IMPACT = 0.45;

/** Pose at the very instant the axe bites. */
const CHOP = {
  rootX: 3, torsoY: 3, torso: 16, head: 4, squash: 0.1,
  armF: 341, weapon: 102, armB: 45, offhand: -40, legF: -28, legB: 26, cape: 18,
};

const ATTACK: Keyframe[] = [
  [0, {}],
  // quick dip before the lift: the weight drops into the knees
  [0.1, { squash: 0.08, torso: 10, head: 10, armF: 340, weapon: 30, rootX: -1 }, EASE.smooth],
  // coil: the axe swings back over the head, the body stretches tall and leans back
  [0.3, { rootX: -4, torso: -16, head: -12, squash: -0.05, armF: 190, weapon: 116, armB: -100, offhand: -30, legF: -8, legB: 10, chA1: 16, chB1: 22, chC1: 26 }, EASE.easeOut],
  // hang at the top: the hips already drive forward while the axe drags behind
  [0.38, { rootX: 0, torso: -10, head: -8, squash: -0.06, armF: 188, weapon: 124, armB: -112, offhand: -40, legF: -10, legB: 12, chA1: 18, chB1: 24, chC1: 30 }, EASE.smooth],
  // the chop snaps down onto the impact
  [IMPACT, CHOP, EASE.expoIn],
  // hit-stop
  [IMPACT + 0.06, CHOP, EASE.linear],
  // follow-through: the axe bites deeper, the whole body crunches down
  [0.64, { ...CHOP, rootX: 4, torsoY: 4, torso: 20, head: 8, squash: 0.12, armF: 344, weapon: 98 }, EASE.easeOut],
  // heavy settle: he drags the axe back in and hauls it up
  [0.72, { rootX: 4, torsoY: 3, torso: 16, head: 8, squash: 0.1, armF: 352, weapon: 90, armB: 30, offhand: -20 }, EASE.smooth],
  [0.85, { rootX: 3, torsoY: 2, torso: 12, head: 10, squash: 0.06, armF: 330, weapon: 66, armB: 20, offhand: -10 }, EASE.smooth],
  [1, {}, EASE.smooth],
];

const ROAR = {
  torsoY: 0, torso: -14, head: -20, squash: -0.05, rootX: -2,
  armF: 258, weapon: 100, armB: 142, offhand: -45, legF: -12, legB: 12,
  // the mane bristles (positive bends the back locks upwards)
  chA1: 22, chA2: 10, chB1: 26, chB2: 12, chC1: 34, chC2: 14, chD1: 10, chE1: -18,
};
const SPELL: Keyframe[] = [
  [0, {}],
  // gather: hunch over and draw the arms in, a deep breath
  [0.22, { squash: 0.1, torso: 16, head: 14, torsoY: 2, armF: 352, weapon: 12, armB: 30, offhand: -60, chC1: -8 }, EASE.smooth],
  // the roar bursts out
  [0.4, ROAR, EASE.backOut],
  [0.74, { ...ROAR, head: -17, torso: -12 }, EASE.linear],
  [1, {}, EASE.smooth],
];

const HIT: Keyframe[] = [
  [0, {}],
  [0.1, { rootX: -6, torso: -17, head: -18, squash: 0.1, armF: 355, weapon: 70, armB: 45, offhand: 35, legF: 8, legB: -6, chA1: 30, chB1: 36, chC1: 40, chD1: 24 }, EASE.expoOut],
  [0.34, { rootX: -5, torso: -6, head: -4, squash: -0.03 }, EASE.smooth],
  [1, {}, EASE.smooth],
];

/** Kneeling on the axe: squashed, splayed legs, axe planted head-down in front. */
const KNEEL = {
  rootX: 2, torsoY: 8, torso: 14, head: 18, squash: 0.16,
  armF: 240, weapon: 280, armB: 20, offhand: 30, legF: -25, legB: 22, cape: 20,
};
/** Slumped over the planted axe, the haft tipping forward. */
const SLUMP = { ...KNEEL, rootX: 4, torsoY: 10, torso: 30, head: 30, squash: 0.22, armF: 205, weapon: 280, armB: -10, offhand: 20 };
const DEATH: Keyframe[] = [
  [0, {}],
  [0.1, { rootX: -8, torso: -16, head: -16, squash: 0.02, armF: 350, weapon: 60, armB: 40 }, EASE.expoOut],
  // the knees give way and the axe is slammed head-first into the ground
  [0.3, KNEEL, EASE.backIn],
  [0.46, { ...KNEEL, head: 24, torso: 17 }, EASE.smooth],
  // he collapses forward over the axe
  [0.72, SLUMP, EASE.easeIn],
  [1, { ...SLUMP, torso: 33, head: 34 }, EASE.linear],
];

export const BARBARO_RIG: PuppetRig = {
  accent: '#e0622e', style: 'melee', phase: 1.1, focus: [78, 64], focusBone: 'head', slash: [38, 58],
  palette: { hair: '#c4532b', skin: '#c98a5e', fur: '#9b7b55', pants: '#5b3b26', boots: '#3e2a1d', steel: '#c3ced6', wood: '#6e4a2c', belt: '#8a5a2e', strap: '#6b3f22' },
  pivots: { armF: [68, 78], armB: [52, 78], offhand: [48, 90], weapon: [74, 99], cape: [50, 100] },
  headScale: 0.84,
  impact: IMPACT,
  chains: [LOCK_TOP, LOCK_BACK, LOCK_NAPE, LOCK_CROWN, BEARD, LOINCLOTH],
  rest: { armF: 312, weapon: 62, armB: 24, offhand: -34, torso: 6, head: 6, legF: -6, legB: 7 },
  windup: { rootX: -7, torso: -16, head: -12, armF: 190, weapon: 116, armB: -100 },
  strike: CHOP,
  actions: {
    attack: { keys: ATTACK, slash: [0.41, 0.64], smear: [0.37, IMPACT + 0.02], smearBones: ['weapon', 'armF'] },
    spell: { keys: SPELL, burst: [0.38, 0.78] },
    hit: { keys: HIT },
    death: { keys: DEATH },
  },
  animate: (p, t, action) => {
    if (!action) return;
    // tremble through the hit-stop and while roaring
    if (action.type === 'attack' && action.p > IMPACT && action.p < IMPACT + 0.07) {
      p.rootX += shake(t, 0.8); p.torso += shake(t + 0.3, 1.2);
    } else if (action.type === 'spell' && action.p > 0.4 && action.p < 0.76) {
      p.torso += shake(t, 1.1, 24); p.head += shake(t + 0.2, 1.8, 24);
    }
  },
  shapes: [
    // — back mane locks (behind everything) —
    ...strandShapes(LOCK_NAPE, 'hair', [8, 6, 3.5, 1]),
    ...strandShapes(LOCK_BACK, 'hair', [8, 6, 3.5, 1]),
    ...strandShapes(LOCK_TOP, 'hair', [8, 6, 3.5, 1]),
    // — back pelt hanging from the belt —
    P('cape', 'fur', [[44, 99], [56, 99], [55, 111], [52, 108], [50, 117], [47, 110], [44, 115], [42, 105]]),
    // — back leg —
    L('legB', 'pants', 54, 100, 51, 120, 11), P('legB', 'fur', [[46, 116], [56, 116], [55.5, 121], [46.5, 121]]),
    E('legB', 'boots', 50, 124.5, 7, 4.3),
    // — back arm with a real elbow —
    E('armB', 'skin', 50, 80, 8, 7), L('armB', 'skin', 52, 78, 48, 90, 11),
    L('offhand', 'skin', 48, 90, 50, 100, 9.5), L('offhand', 'strap', 48.6, 93, 49.6, 98, 10.4), C('offhand', 'skin', 50.5, 101.5, 5.4),
    // — front leg —
    L('legF', 'pants', 63, 100, 67, 120, 11.5), P('legF', 'fur', [[62, 116], [72, 116], [71.5, 121], [62.5, 121]]),
    E('legF', 'boots', 69, 124.5, 7.5, 4.5),
    // — V torso: broad shoulders, narrow waist, heavy traps —
    P('torso', 'skin', [[40, 74], [47, 67], [56, 63], [64, 63], [72, 67], [77, 74], [75, 83], [71, 91], [67, 104], [51, 104], [46, 92], [40, 83]]),
    P('torso', 'skin', [[50, 68], [57, 60], [64, 60], [70, 68]]),
    L('torso', 'strap', 47, 72, 70, 98, 3.6),
    P('torso', 'belt', [[49, 97], [69, 97], [69.5, 104], [48.5, 104]]),
    C('torso', 'steel', 60, 100.5, 3),
    P('torso', 'fur', [[45, 100], [52, 100], [53, 111], [50, 108], [48, 114], [46, 108], [43, 111]]),
    P('torso', 'fur', [[66, 100], [72, 100], [73, 110], [70, 107], [68, 112], [66, 107]]),
    ...strandShapes(LOINCLOTH, 'fur', [12, 11, 10, 9], { tip: 'tattered', teeth: 3 }),
    // — head: skull, brow and jutting jaw in profile, sunburst crest (no face) —
    C('head', 'skin', 61, 58, 13),
    P('head', 'skin', [[64, 54], [75, 53], [76, 57], [79, 61], [76, 63], [76, 68], [71, 73], [63, 72]]),
    P('head', 'hair', [[48, 62], [40, 56], [49, 53], [43, 42], [53, 46], [52, 34], [59, 43], [66, 33], [67, 45], [76, 40], [72, 50], [62, 52], [54, 58]]),
    ...strandShapes(LOCK_CROWN, 'hair', [7, 5, 3, 1]),
    ...strandShapes(BEARD, 'hair', [8, 6.5, 4, 1]),
    // — front arm: deltoid, bent arm, bracer —
    E('armF', 'skin', 71, 80, 9, 7.5), L('armF', 'skin', 68, 78, 71, 89, 12.5),
    L('armF', 'skin', 71, 89, 74, 98, 10.5), L('armF', 'strap', 72, 91.5, 73.6, 96.5, 11.6),
    // — double-bitted greataxe —
    L('weapon', 'wood', 74, 113, 74, 59, 4.4), C('weapon', 'strap', 74, 114, 2.8),
    L('weapon', 'strap', 74, 104, 74, 109, 5.4),
    P('weapon', 'steel', [[75, 61], [83, 58], [90, 52], [94, 60], [95, 68], [93, 76], [89, 84], [83, 78], [75, 75]]),
    P('weapon', 'steel', [[73, 62], [67, 59], [60, 55], [57, 63], [57, 70], [59, 78], [66, 75], [73, 74]]),
    P('weapon', 'steel', [[72, 60], [74, 50], [76, 60]]),
    L('weapon', 'strap', 72, 64.5, 76, 64.5, 2),
    C('armF', 'skin', 74.5, 99.5, 6.2),
  ],
};
