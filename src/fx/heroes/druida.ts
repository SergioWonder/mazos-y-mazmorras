// Druid rig and its six Wild Shape forms (backlit silhouettes). Bind-pose coordinates: viewBox 140×135,
// facing right, feet at y≈128. See src/fx/heroes/README.md for chains (hair,
// cloth), action timelines and the piece budget.
//
// Everything is painted black with a green rim, so every detail has to live in
// the outline: ragged hems, leaves sticking out, antler tines, bristling fur.

import { C, E, P, L, slitEye, type Keyframe, type PartialPose, type PuppetRig, type BoneId, type Shape } from '../puppet.ts';
import { strandShapes, type ChainSpec } from '../chains.ts';
import { EASE, pulse, shake } from '../motion.ts';

type Pt = [number, number];
const RAD = Math.PI / 180;
const r2 = (v: number) => Math.round(v * 100) / 100;

/** Pointed leaf (or feather, claw…) growing from (x, y) towards `deg` (0 = right, 90 = down). */
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

/** Four-pointed sparkle. */
function star(b: BoneId, k: string, x: number, y: number, r: number): Shape {
  const pts: Pt[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * 45 - 90) * RAD, d = i % 2 ? r * 0.28 : r;
    pts.push([r2(x + Math.cos(a) * d), r2(y + Math.sin(a) * d)]);
  }
  return P(b, k, pts);
}

/** Same partial pose for several chain bones (hackles bristling, capes lifting…). */
const each = (bones: string[], v: number): PartialPose => Object.fromEntries(bones.map((b) => [b, v])) as PartialPose;

// ── Druid ────────────────────────────────────────────────────────────────────

const CAPE_BACK: ChainSpec = { slot: 'A', joints: [[50, 74], [46, 90], [43, 106], [41, 123]], freq: 2.6, damping: 0.4, sag: 1.2, sway: 1.3, limit: 40 };
const CAPE_INNER: ChainSpec = { slot: 'B', joints: [[57, 75], [55, 92], [54, 109], [53, 125]], freq: 3, damping: 0.4, sag: 1, sway: 1, limit: 40 };
const STAFF_VINE: ChainSpec = { slot: 'C', parent: 'weapon', joints: [[66, 38], [64, 45], [63, 52], [63, 59]], freq: 2.8, damping: 0.5, sag: 1, sway: 1.2, limit: 45 };
const STAFF_CHARM: ChainSpec = { slot: 'D', parent: 'weapon', joints: [[76, 36], [77.5, 42], [78.5, 48]], freq: 3.4, damping: 0.45, sag: 0.6, sway: 0.8, limit: 45 };
const BELT_CHARM: ChainSpec = { slot: 'E', joints: [[69, 97], [72, 103], [73, 109], [74, 115]], freq: 3, damping: 0.25, sag: 0.8, sway: 0.8, limit: 60 };
const ANTLER_BEADS: ChainSpec = { slot: 'F', parent: 'head', joints: [[47, 30], [44, 38], [42, 46], [41, 53]], freq: 3, damping: 0.28, sag: 0.8, sway: 1, limit: 60 };

const CAPE_BONES = ['chA1', 'chA2', 'chA3', 'chB1', 'chB2', 'chB3'];

export const DRUIDA_RIG: PuppetRig = ({
  accent: '#7dba4e', style: 'magic', phase: 0.0, focus: [71.5, 33.5], impact: 0.5,
  palette: { hoodD: '#2f4f27', hood: '#4f7d35', leaf: '#8cc152', moss: '#5f8a3a', robe: '#7a5634', boots: '#4a3322', glove: '#5a3d25', antler: '#c9a77a', wood: '#7b5530', bone: '#d8cbb0', gem: '#b6ff7a', eyeGlow: '#b8f07a' },
  pivots: { weapon: [68, 97] },
  headScale: 0.82,
  chains: [CAPE_BACK, CAPE_INNER, STAFF_VINE, STAFF_CHARM, BELT_CHARM, ANTLER_BEADS],
  rest: { armF: -32, weapon: 32, armB: 10, torso: 2, head: 5 },
  windup: { rootX: -3, torso: -6, head: -4, armF: -60, weapon: 40, armB: 25 },
  strike: { rootX: 6, torso: 8, head: 4, armF: -100, weapon: 55, armB: -20, legF: -8, legB: 5 },
  actions: {
    // staff twirled backwards overhead, then swung round in a full arc onto the enemy
    attack: {
      keys: [
        [0, {}],
        [0.16, { rootX: -2, torso: -5, head: -4, armF: -105, weapon: -140, armB: 20, legF: -3, legB: 4 }, EASE.smooth],
        [0.36, { rootX: -6, torso: -13, head: -9, armF: -192, weapon: -292, armB: 32, legF: -7, legB: 9, squash: 0.07, ...each(CAPE_BONES, 6) }, EASE.easeOut],
        [0.5, { rootX: 11, torso: 13, head: 9, armF: -72, weapon: -193, armB: -32, legF: -15, legB: 12, squash: -0.07 }, EASE.expoIn],
        [0.55, { rootX: 11, torso: 13, head: 9, armF: -72, weapon: -193, armB: -32, legF: -15, legB: 12, squash: -0.05 }, EASE.linear],
        [0.68, { rootX: 12, torso: 16, head: 10, armF: -42, weapon: -150, armB: -24, legF: -12, legB: 10, squash: 0.04 }, EASE.easeOut],
        [0.82, { rootX: 4, torso: 6, head: 4, armF: -30, weapon: 0, armB: 0 }, EASE.smooth],
        [1, {}, EASE.easeOut],
      ],
      burst: [0.48, 0.78], projectile: [0.5, 0.86], smear: [0.4, 0.6], smearBones: ['weapon', 'armF'],
    },
    // raises the staff high, drives it into the ground; a gust lifts the cape
    spell: {
      keys: [
        [0, {}],
        [0.3, { rootX: -2, torsoY: -3, torso: -8, head: -14, armF: -118, weapon: 124, armB: -40, legF: -4, squash: -0.07, chA1: 22, chA2: 14, chB1: 18, chB2: 12, chC1: 20 }, EASE.easeOut],
        [0.38, { rootX: -2, torsoY: -4, torso: -9, head: -16, armF: -124, weapon: 131, armB: -50, legF: -4, squash: -0.08, chA1: 30, chA2: 18, chB1: 26, chB2: 15, chC1: 25 }, EASE.smooth],
        [0.5, { rootX: 3, torsoY: 5, torso: 12, head: 8, armF: -40, weapon: 26, armB: 25, legF: -12, legB: 8, squash: 0.1, chA1: 48, chA2: 24, chA3: 16, chB1: 42, chB2: 20, chB3: 12, chC1: 30, chF1: 30 }, EASE.expoIn],
        [0.76, { rootX: 3, torsoY: 4, torso: 11, head: 6, armF: -40, weapon: 26, armB: 30, legF: -12, legB: 8, squash: 0.08, chA1: 42, chA2: 22, chA3: 14, chB1: 36, chB2: 18, chB3: 10, chC1: 26, chF1: 25 }, EASE.linear],
        [1, {}, EASE.smooth],
      ],
      burst: [0.49, 0.86],
    },
    hit: {
      keys: [
        [0, {}],
        [0.1, { rootX: -10, torso: -17, head: -20, armF: 22, weapon: -18, armB: 38, legF: 10, legB: -4, squash: 0.11 }, EASE.expoOut],
        [0.3, { rootX: -7, torso: -9, head: -6, armF: 6, weapon: 4, armB: 18, legF: 4, squash: -0.03 }, EASE.smooth],
        [0.6, { rootX: -2, torso: -2, head: 0, armF: -10, armB: 12 }, EASE.smooth],
        [1, {}, EASE.smooth],
      ],
    },
    // staggers, drops to its knees leaning on the staff, then topples backwards
    death: {
      keys: [
        [0, {}],
        [0.08, { rootX: -8, torso: -18, head: -22, armF: 25, weapon: -20, armB: 32, squash: 0.08 }, EASE.expoOut],
        [0.3, { rootX: -4, torsoY: 11, torso: 14, head: 28, armF: 30, weapon: 50, armB: 22, legF: -55, legB: 32, squash: 0.1 }, EASE.smooth],
        [0.4, { rootX: -4, torsoY: 12, torso: 12, head: 30, armF: 40, weapon: 75, armB: 26, legF: -58, legB: 34, squash: 0.1 }, EASE.smooth],
        [0.6, { rootX: -9, torsoY: 22, torso: -68, head: -28, armF: 95, weapon: 120, armB: 70, legF: -70, legB: 40, squash: 0.18, ...each(CAPE_BONES, -20) }, EASE.easeIn],
        [0.68, { rootX: -9, torsoY: 20, torso: -63, head: -22, armF: 90, weapon: 115, armB: 65, legF: -68, legB: 38, squash: 0.15, ...each(CAPE_BONES, -20) }, EASE.easeOut],
        [1, { rootX: -9, torsoY: 22, torso: -68, head: -26, armF: 95, weapon: 120, armB: 70, legF: -70, legB: 40, squash: 0.18, ...each(CAPE_BONES, -20) }, EASE.smooth],
      ],
    },
  },
  animate: (p, t, action) => {
    // tremble of the blow during the hit-stop
    if (action?.type === 'attack') p.rootX += shake(t, 0.9) * pulse(action.p, 0.49, 0.57);
    if (action?.type === 'spell') p.torsoY += shake(t, 0.7) * pulse(action.p, 0.49, 0.6);
  },
  shapes: [
    // tattered cape behind everything
    ...strandShapes(CAPE_BACK, 'hoodD', [11, 14, 16, 15], { tip: 'tattered', teeth: 4 }),
    ...strandShapes(CAPE_INNER, 'hoodD', [9, 11, 12, 11], { tip: 'tattered', teeth: 3 }),
    L('legB', 'robe', 54, 100, 52, 121, 8), E('legB', 'boots', 51, 125, 6, 3.8),
    L('legF', 'robe', 62, 100, 65, 121, 8), E('legF', 'boots', 67, 125, 6.5, 3.8),
    P('armB', 'hood', [[49, 76], [56, 78], [54, 94], [51, 99], [49, 95], [46, 98]]), E('armB', 'glove', 50, 98, 3.5, 3.8),
    // robe with a ragged hem, and the leafy shoulder mantle
    P('torso', 'robe', [[50, 75], [67, 75], [70, 92], [73, 110], [71, 116], [68, 112], [65, 117], [61, 112], [57, 117], [53, 112], [49, 116], [46, 111], [46, 95]]),
    P('torso', 'hood', [[45, 72], [72, 72], [76, 80], [73, 84], [70, 82], [66, 88], [62, 84], [57, 89], [53, 84], [48, 87], [46, 82], [42, 84]]),
    leaf('torso', 'leaf', 46, 76, 200, 8, 3.5), leaf('torso', 'leaf', 73, 75, -25, 7, 3), leaf('torso', 'leaf', 45, 82, 155, 7, 3),
    // bone charm and roots hanging from the belt
    ...strandShapes(BELT_CHARM, 'bone', [1.2, 1.2, 1.2, 1], { tip: 'flat' }),
    E('chE2', 'bone', 73, 109.5, 2.2, 2.8),
    L('chE3', 'robe', 74, 113, 76.5, 118.5, 1), L('chE3', 'robe', 74, 114, 71.5, 119, 0.8),
    // faceless cowl, pointed hood tail, leaves and antlers
    P('head', 'hoodD', [[42, 64], [40, 52], [44, 42], [52, 36], [62, 34], [72, 37], [79, 45], [81, 53], [76, 57], [75, 63], [78, 68], [70, 72], [58, 74], [48, 72]]),
    P('head', 'hood', [[45, 44], [37, 46], [30, 53], [34, 52], [38, 51], [43, 55]]),
    // angry green slits glowing in the dark of the cowl
    slitEye('head', 'eyeGlow', [63.6, 58.52], [69.9, 60.48], 1.56), slitEye('head', 'eyeGlow', [75.38, 58.9], [71.32, 60.3], 1.3),
    leaf('head', 'leaf', 48, 39, -140, 8, 3.4), leaf('head', 'leaf', 42, 49, 185, 8, 3.4),
    leaf('head', 'leaf', 57, 35, -105, 7, 3), leaf('head', 'leaf', 72, 38, -50, 6, 3),
    L('head', 'antler', 52, 38, 46, 24, 3.2), L('head', 'antler', 48, 29, 40, 26, 2.4),
    L('head', 'antler', 46, 24, 43, 14, 2.2), L('head', 'antler', 46, 24, 51, 15, 2),
    L('head', 'antler', 66, 36, 72, 20, 3.2), L('head', 'antler', 69, 28, 78, 25, 2.4),
    L('head', 'antler', 72, 20, 70, 10, 2.2), L('head', 'antler', 72, 20, 79, 13, 2),
    // beads and a leaf hanging from the antler
    ...strandShapes(ANTLER_BEADS, 'bone', [1, 1, 1, 0.8], { tip: 'flat' }),
    C('chF1', 'bone', 44, 38, 1.5), C('chF2', 'bone', 42, 46, 1.7), leaf('chF3', 'leaf', 41, 52, 95, 7, 3.2),
    L('armF', 'hood', 64, 78, 68, 95, 8),
    P('armF', 'hood', [[61, 76], [69, 77], [71, 92], [74, 98], [69, 96], [66, 100]]),
    // gnarled staff with a crook, moss tufts and hanging leaves
    L('weapon', 'wood', 70, 127, 69, 110, 3.4), L('weapon', 'wood', 69, 110, 71, 90, 3.8),
    L('weapon', 'wood', 71, 90, 69.5, 70, 3.8), L('weapon', 'wood', 69.5, 70, 68.5, 50, 3.6), L('weapon', 'wood', 68.5, 50, 67, 40, 3.4),
    C('weapon', 'wood', 69.5, 110, 2.6), C('weapon', 'wood', 71, 90, 2.8), C('weapon', 'wood', 69.2, 64, 2.6),
    L('weapon', 'wood', 67, 40, 66, 33, 3), L('weapon', 'wood', 66, 33, 70, 27, 2.8),
    L('weapon', 'wood', 70, 27, 76, 29, 2.6), L('weapon', 'wood', 76, 29, 77, 36, 2.2),
    P('weapon', 'moss', [[67, 48], [73, 47], [74.5, 52], [72, 51], [71, 55.5], [69, 52], [66, 54.5]]),
    P('weapon', 'moss', [[69, 84], [74, 84], [75, 89], [72.5, 87], [70.5, 91], [68.5, 88]]),
    leaf('weapon', 'leaf', 66, 30, -150, 7, 3.2), leaf('weapon', 'leaf', 75, 27, -40, 7, 3.2), leaf('weapon', 'leaf', 65, 36, 190, 6, 3),
    ...strandShapes(STAFF_VINE, 'moss', [2.6, 2.2, 1.8, 1]),
    leaf('chC1', 'leaf', 64, 44, 170, 6, 3), leaf('chC2', 'leaf', 63, 51, 150, 6, 3), leaf('chC3', 'leaf', 63, 58, 110, 6.5, 3.2),
    ...strandShapes(STAFF_CHARM, 'bone', [1.1, 1.1, 1], { tip: 'flat' }),
    C('chD1', 'bone', 77, 40, 1.4),
    P('chD2', 'bone', [[77, 47], [80, 47], [79.6, 52], [78.6, 55], [77.5, 52]]),
    C('weapon', 'gem', 71.5, 33.5, 3),
    C('armF', 'glove', 68.5, 97, 4.2),
  ],
});

/** Angry glow of the druid's eyes, shared by the beast forms (forma-lobo, forma-oso…). */
const FORM_EYE = '#b8f07a';

/** Wild Shape forms of the druid. */
export type FormId = 'lobo' | 'oso' | 'aguila' | 'enjambre' | 'lunar' | 'estelar';

// Quadrupeds: armF/armB are the near/far front legs (they follow the body when it
// rears up), legF/legB the near/far hind legs. Tails, fur, manes and jaws are
// spring chains; the jaw is a stiff one-segment chain hung from the head, keyed
// open and shut.

// ── Wolf and moon wolf ───────────────────────────────────────────────────────

const WOLF_JAW: ChainSpec = { slot: 'F', parent: 'head', joints: [[92, 85], [110, 86]], freq: 9, damping: 0.8, sag: 0.2, sway: 0, limit: 15 };
const HACKLES = ['chB1', 'chB2', 'chC1', 'chC2', 'chD1', 'chD2'];

function wolfChains(lunar: boolean): ChainSpec[] {
  const tail: ChainSpec = { slot: 'A', joints: [[38, 90], [28, 86], [19, 88], [11, 94]], freq: 2.4, damping: 0.3, sag: 1.4, sway: 1.2, limit: 55 };
  if (!lunar) {
    // bristling hackles along the back
    const tuft = (slot: 'B' | 'C' | 'D', x: number, y: number): ChainSpec =>
      ({ slot, joints: [[x, y], [x - 4, y - 6], [x - 9, y - 9]], freq: 4.2, damping: 0.3, sag: 0.2, sway: 0.5, limit: 45 });
    return [tail, tuft('B', 58, 86), tuft('C', 67, 84), tuft('D', 76, 82), WOLF_JAW];
  }
  // a long silver mane from the nape down the shoulders
  return [
    tail,
    { slot: 'B', joints: [[70, 82], [63, 77], [56, 76], [50, 79]], freq: 2.6, damping: 0.28, sag: 1, sway: 1.2, limit: 55 },
    { slot: 'C', joints: [[78, 80], [73, 72], [66, 69], [60, 70]], freq: 2.8, damping: 0.28, sag: 1, sway: 1.2, limit: 55 },
    { slot: 'D', parent: 'head', joints: [[86, 74], [82, 66], [76, 62], [70, 63]], freq: 3, damping: 0.28, sag: 0.8, sway: 1, limit: 55 },
    WOLF_JAW,
  ];
}

function wolfShapes(lunar: boolean): Shape[] {
  const [tail, b, c, d] = wolfChains(lunar);
  const out: Shape[] = [
    ...strandShapes(tail, 'fur', lunar ? [9, 11, 9, 1.5] : [8, 10, 8, 1.5]),
    L('armB', 'fur', 76, 100, 77, 113, 5.5), L('armB', 'fur', 77, 113, 78, 125, 4.5), E('armB', 'fur', 79.5, 126.5, 4.5, 2.3),
    L('legB', 'fur', 42, 100, 46, 114, 6), L('legB', 'fur', 46, 114, 41, 125, 4.5), E('legB', 'fur', 42, 126.5, 4.5, 2.3),
    ...(lunar
      ? [...strandShapes(b, 'fur', [9, 8, 6, 1]), ...strandShapes(c, 'fur', [9, 8, 6, 1])]
      : [...strandShapes(b, 'fur', [7, 4, 0.6]), ...strandShapes(c, 'fur', [7, 4, 0.6]), ...strandShapes(d, 'fur', [7, 4, 0.6])]),
    P('torso', 'fur', [[34, 96], [37, 89], [46, 85], [58, 86], [70, 82], [80, 82], [88, 88], [90, 98], [84, 106], [74, 106], [62, 103], [50, 106], [40, 105]]),
    P('torso', 'fur', [[76, 82], [84, 72], [93, 75], [94, 90], [86, 100]]),
    P('torso', 'fur', lunar
      ? [[80, 96], [88, 94], [94, 101], [89, 100], [89, 107], [85, 102], [82, 108], [79, 102]]
      : [[82, 98], [88, 96], [92, 102], [88, 101], [86, 106], [84, 101], [80, 104]]),
    E('legF', 'fur', 47, 100, 9, 10), L('legF', 'fur', 47, 106, 51, 116, 6), L('legF', 'fur', 51, 116, 46, 125, 5), E('legF', 'fur', 47, 126.5, 5, 2.6),
    L('armF', 'fur', 80, 100, 81, 113, 6.5), L('armF', 'fur', 81, 113, 83, 125, 5.5), E('armF', 'fur', 85, 126.5, 5.2, 2.7),
    // head: skull, long snout, ears, fang, angry glowing eye (profile)
    E('head', 'fur', 89, 78, 10, 8.5),
    P('head', 'fur', [[94, 72], [113, 78], [114, 82], [108, 83], [96, 85]]),
    P('head', 'fur', [[82, 73], [84, 57], [91, 69]]), P('head', 'fur', [[88, 70], [94, 58], [97, 71]]),
    P('head', 'fur', [[105.5, 82], [108.5, 82], [107, 86.5]]),
    // lower jaw (opens for the bite and the howl)
    P('chF1', 'fur', [[90, 83], [110, 84.5], [109, 87.5], [100, 89], [92, 90]]),
    P('chF1', 'fur', [[102.5, 85], [105, 85], [104, 81.5]]),
    slitEye('head', 'eyeGlow', [93.64, 74.16], [100.36, 76.54], 1.56),
  ];
  if (lunar) {
    // mane over the head, silver strands and a crescent on the brow
    out.push(...strandShapes(d, 'fur', [8, 6, 4, 1]));
    out.push(
      L('chB2', 'moonGlow', 62, 77.5, 56, 77, 0.7), L('chC2', 'moonGlow', 72, 71.5, 66, 70, 0.7),
      L('chD2', 'moonGlow', 81, 65, 76, 63, 0.7), L('chB3', 'moonGlow', 56, 77, 51, 79.5, 0.6),
      P('head', 'moonGlow', [[86, 68], [90, 64], [95, 64], [91, 66], [88, 70]]),
    );
  }
  return out;
}

const WOLF_HIT: Keyframe[] = [
  [0, {}],
  [0.1, { rootX: -10, torso: -10, head: -22, armF: 20, armB: 15, squash: 0.1, chF1: 18, ...each(HACKLES, 25) }, EASE.expoOut],
  [0.35, { rootX: -5, torso: -4, head: -6, armF: 5, squash: -0.02, chF1: 4, ...each(HACKLES, 8) }, EASE.smooth],
  [1, {}, EASE.smooth],
];
const WOLF_FALLEN: PartialPose = { rootX: -6, torsoY: 14, torso: 14, head: 38, armF: 70, armB: 60, legF: -50, legB: -45, squash: 0.28, chF1: 15, chA1: 25, chA2: 15 };
const WOLF_DEATH: Keyframe[] = [
  [0, {}],
  [0.1, { rootX: -8, torso: -14, head: -26, chF1: 25, squash: 0.06 }, EASE.expoOut],
  [0.35, { rootX: -4, torsoY: 6, torso: 10, head: 20, armF: 40, armB: 35, legF: -20, legB: -15, squash: 0.15, chF1: 10 }, EASE.smooth],
  [0.6, WOLF_FALLEN, EASE.easeIn],
  [0.68, { ...WOLF_FALLEN, torsoY: 12, squash: 0.24 }, EASE.easeOut],
  [1, WOLF_FALLEN, EASE.smooth],
];
/** Howl: sits back, throws the head up and opens the jaw. */
const howlKeys = (lift: number): Keyframe[] => [
  [0, {}],
  [0.24, { rootX: -3, torso: -12 - lift / 3, head: -24, armF: -6, squash: 0.06, legF: 8, chF1: 6, chA1: 10 }, EASE.smooth],
  [0.4, { rootX: -3, torso: -18 - lift, head: -50 - lift, armF: -12 - lift, armB: -4, squash: -0.05, legF: 6, chF1: 30, chA1: 22, ...each(HACKLES, 18) }, EASE.backOut],
  [0.78, { rootX: -3, torso: -17 - lift, head: -54 - lift, armF: -12 - lift, armB: -4, squash: -0.04, legF: 6, chF1: 28, chA1: 20, ...each(HACKLES, 14) }, EASE.linear],
  [1, {}, EASE.smooth],
];
const howlVibrato = (p: PartialPose & { head: number; chF1: number }, t: number, q: number) => {
  const k = pulse(q, 0.36, 0.82);
  p.head += shake(t, 1.6, 9) * k;
  p.chF1 += shake(t + 0.3, 3, 7) * k;
};

const WOLF_RIG: PuppetRig = {
  accent: '#7dba4e', style: 'melee', phase: 0.4, focus: [110, 81], focusBone: 'head', slash: [16, 30], slashAt: ['head', [100, 82]],
  impact: 0.42,
  palette: { fur: '#3a3a3a', eyeGlow: FORM_EYE },
  pivots: { torso: [42, 100], head: [82, 86], cape: [37, 93], armF: [80, 100], armB: [76, 100], legF: [46, 100], legB: [42, 100] },
  chains: wolfChains(false),
  rest: { head: 10, torso: 2 },
  windup: { rootX: -6, torso: -6, head: -10, armF: -15, legF: 10 },
  strike: { rootX: 16, torso: 6, head: 12, armF: -45, armB: -30, legF: 30, legB: 25 },
  actions: {
    // crouches with the hackles up, leaps with the jaw open and snaps it shut on the impact
    attack: {
      keys: [
        [0, {}],
        [0.26, { rootX: -8, torso: 7, head: 16, armF: 25, armB: 20, legF: -10, legB: -8, squash: 0.14, chF1: 6, ...each(HACKLES, 28) }, EASE.easeOut],
        [0.33, { rootX: -9, torso: 8, head: 18, armF: 28, armB: 22, legF: -12, legB: -10, squash: 0.16, chF1: 10, ...each(HACKLES, 30) }, EASE.smooth],
        [0.38, { rootX: 8, torsoY: -7, torso: -5, head: 4, armF: -40, armB: -30, legF: 25, legB: 20, squash: -0.08, chF1: 32, ...each(HACKLES, 22) }, EASE.easeIn],
        [0.42, { rootX: 24, torsoY: -10, torso: 2, head: 10, armF: -60, armB: -50, legF: 40, legB: 35, squash: -0.12, chF1: -2, ...each(HACKLES, 18) }, EASE.expoIn],
        [0.47, { rootX: 24, torsoY: -10, torso: 2, head: 10, armF: -60, armB: -50, legF: 40, legB: 35, squash: -0.1, chF1: -2, ...each(HACKLES, 18) }, EASE.linear],
        [0.6, { rootX: 13, torso: 5, head: 10, armF: 10, armB: 5, legF: 5, squash: 0.12, ...each(HACKLES, 10) }, EASE.easeIn],
        [0.78, { rootX: 8, head: 8, squash: -0.02 }, EASE.smooth],
        [1, {}, EASE.smooth],
      ],
      slash: [0.39, 0.6], smear: [0.35, 0.47], smearBones: ['head', 'armF', 'armB'],
    },
    spell: { keys: howlKeys(0), burst: [0.4, 0.86] },
    hit: { keys: WOLF_HIT },
    death: { keys: WOLF_DEATH },
  },
  animate: (p, t, action) => { if (action?.type === 'spell') howlVibrato(p, t, action.p); },
  shapes: wolfShapes(false),
};

const LUNAR_RIG: PuppetRig = {
  ...WOLF_RIG,
  accent: '#b9c8ff', phase: 3.3, slash: [20, 36], impact: 0.45,
  palette: { fur: '#2a2c38', eyeGlow: '#a9c0ff', moonGlow: '#e6ecff' },
  chains: wolfChains(true),
  rest: { head: 8, torso: 2 },
  windup: { rootX: -6, torso: -10, head: -22, armF: -25, legF: 10 },
  strike: { rootX: 18, torso: 8, head: 14, armF: -50, armB: -35, legF: 32, legB: 26 },
  actions: {
    // howls with the head thrown back, crouches, then leaps with both forepaws raking
    attack: {
      keys: [
        [0, {}],
        [0.2, { rootX: -4, torso: -16, head: -46, armF: -10, squash: 0.03, chF1: 28, chA1: 18 }, EASE.easeOut],
        [0.33, { rootX: -9, torso: 7, head: 12, armF: 22, armB: 16, legF: -10, legB: -8, squash: 0.15, chF1: 6 }, EASE.smooth],
        [0.45, { rootX: 26, torsoY: -12, torso: -14, head: -4, armF: -95, armB: -72, legF: 42, legB: 38, squash: -0.12, chF1: 22, chA1: -10 }, EASE.expoIn],
        [0.5, { rootX: 26, torsoY: -12, torso: -14, head: -4, armF: -95, armB: -72, legF: 42, legB: 38, squash: -0.1, chF1: 22, chA1: -10 }, EASE.linear],
        [0.64, { rootX: 14, torso: 6, head: 10, armF: 12, armB: 8, legF: 5, squash: 0.13, chF1: 4 }, EASE.easeIn],
        [0.8, { rootX: 8, head: 6, squash: -0.02 }, EASE.smooth],
        [1, {}, EASE.smooth],
      ],
      slash: [0.42, 0.64], smear: [0.37, 0.5], smearBones: ['head', 'armF', 'armB'],
    },
    // rises on the hind legs to howl at the moon
    spell: { keys: howlKeys(14), burst: [0.4, 0.88] },
    hit: { keys: WOLF_HIT },
    death: { keys: WOLF_DEATH },
  },
  animate: (p, t, action) => { if (action && (action.type === 'spell' || (action.type === 'attack' && action.p < 0.3))) howlVibrato(p, t, action.type === 'spell' ? action.p : action.p + 0.36); },
  shapes: wolfShapes(true),
};

// ── Bear ─────────────────────────────────────────────────────────────────────

const BEAR_TUFT = (slot: 'A' | 'B' | 'C', x: number, y: number): ChainSpec =>
  ({ slot, joints: [[x, y], [x - 5, y - 6], [x - 11, y - 8]], freq: 3.4, damping: 0.28, sag: 0.4, sway: 0.7, limit: 50 });
const BEAR_CHAINS: ChainSpec[] = [
  BEAR_TUFT('A', 50, 71), BEAR_TUFT('B', 60, 69), BEAR_TUFT('C', 70, 72),
  { slot: 'D', parent: 'head', joints: [[93, 90], [91, 95], [89, 100]], freq: 3.4, damping: 0.3, sag: 0.8, sway: 0.6, limit: 50 },
  { slot: 'E', joints: [[52, 110], [51, 115], [50, 120]], freq: 2.8, damping: 0.3, sag: 0.8, sway: 0.8, limit: 55 },
  { slot: 'F', parent: 'head', joints: [[100, 91], [114, 91]], freq: 9, damping: 0.8, sag: 0.2, sway: 0, limit: 15 },
];
const HUMP = ['chA1', 'chA2', 'chB1', 'chB2', 'chC1', 'chC2'];
const BEAR_FALLEN: PartialPose = { rootX: -4, torsoY: 12, torso: 12, head: 30, armF: 60, armB: 50, legF: -30, legB: -25, squash: 0.25, chF1: 12 };

const OSO_RIG: PuppetRig = {
  accent: '#7dba4e', style: 'melee', phase: 1.2, focus: [112, 88], focusBone: 'head', slash: [24, 40], impact: 0.45,
  palette: { fur: '#3a2a20', claw: '#d8cbb0', eyeGlow: FORM_EYE },
  pivots: { torso: [40, 104], head: [86, 84], cape: [26, 88], armF: [82, 98], armB: [78, 98], legF: [44, 100], legB: [40, 100] },
  chains: BEAR_CHAINS,
  rest: { head: 9 },
  windup: { rootX: -4, torso: -24, head: -14, armF: -100, armB: -70 },
  strike: { rootX: 10, torso: 6, head: 10, armF: -30, armB: -10, legF: 8 },
  actions: {
    // rears up on the hind legs, paws high, and brings the whole weight down
    attack: {
      keys: [
        [0, {}],
        [0.14, { rootX: -2, torso: -5, head: -6, armF: 10, squash: 0.08 }, EASE.smooth],
        [0.34, { rootX: -5, torsoY: -4, torso: -38, head: -24, armF: -112, armB: -86, legF: -6, legB: 6, squash: -0.1, chF1: 22, ...each(HUMP, -12) }, EASE.easeOut],
        [0.45, { rootX: 12, torsoY: 4, torso: 10, head: 14, armF: -20, armB: -6, legF: 10, legB: -4, squash: 0.19, chF1: 4 }, EASE.expoIn],
        [0.51, { rootX: 12, torsoY: 4, torso: 10, head: 14, armF: -20, armB: -6, legF: 10, legB: -4, squash: 0.16, chF1: 4 }, EASE.linear],
        [0.62, { rootX: 10, torso: 5, head: 8, armF: -10, squash: -0.04 }, EASE.easeOut],
        [0.82, { rootX: 4, torso: 2, head: 4 }, EASE.smooth],
        [1, {}, EASE.smooth],
      ],
      slash: [0.42, 0.64], smear: [0.38, 0.5], smearBones: ['armF', 'armB', 'head'],
    },
    // stands up and roars with the arms wide
    spell: {
      keys: [
        [0, {}],
        [0.28, { rootX: -3, torso: -28, head: -26, armF: -85, armB: -140, squash: -0.07, chF1: 10, ...each(HUMP, -8) }, EASE.smooth],
        [0.44, { rootX: -3, torso: -34, head: -42, armF: -100, armB: -165, squash: -0.1, chF1: 32, ...each(HUMP, -18) }, EASE.backOut],
        [0.78, { rootX: -3, torso: -33, head: -40, armF: -96, armB: -160, squash: -0.09, chF1: 30, ...each(HUMP, -16) }, EASE.linear],
        [0.9, { rootX: 2, torso: 6, head: 6, armF: -10, squash: 0.1 }, EASE.easeIn],
        [1, {}, EASE.smooth],
      ],
      burst: [0.42, 0.88],
    },
    hit: {
      keys: [
        [0, {}],
        [0.1, { rootX: -8, torso: -12, head: -20, armF: 18, armB: 14, squash: 0.1, chF1: 16, ...each(HUMP, 20) }, EASE.expoOut],
        [0.35, { rootX: -4, torso: -4, head: -5, squash: -0.02 }, EASE.smooth],
        [1, {}, EASE.smooth],
      ],
    },
    death: {
      keys: [
        [0, {}],
        [0.1, { rootX: -6, torso: -18, head: -24, armF: -30, armB: -40, chF1: 25, squash: -0.04 }, EASE.expoOut],
        [0.36, { rootX: -3, torsoY: 4, torso: -8, head: 10, armF: 20, armB: 20, legF: -12, legB: -8, squash: 0.1, chF1: 18 }, EASE.smooth],
        [0.58, BEAR_FALLEN, EASE.easeIn],
        [0.66, { ...BEAR_FALLEN, torsoY: 10, squash: 0.21 }, EASE.easeOut],
        [1, BEAR_FALLEN, EASE.smooth],
      ],
    },
  },
  animate: (p, t, action) => {
    if (action?.type === 'spell') { const k = pulse(action.p, 0.4, 0.82); p.head += shake(t, 1.8, 10) * k; p.chF1 += shake(t, 2.5, 8) * k; }
    if (action?.type === 'attack') p.rootX += shake(t, 1.2) * pulse(action.p, 0.44, 0.53);
  },
  shapes: [
    L('armB', 'fur', 78, 98, 80, 124, 11), E('armB', 'fur', 81, 126.5, 7, 3),
    L('legB', 'fur', 40, 100, 38, 124, 11), E('legB', 'fur', 39, 126.5, 7, 3),
    // bristling fur on the hump and a shaggy belly
    ...strandShapes(BEAR_CHAINS[0], 'fur', [9, 6, 0.8]), ...strandShapes(BEAR_CHAINS[1], 'fur', [9, 6, 0.8]), ...strandShapes(BEAR_CHAINS[2], 'fur', [8, 5, 0.6]),
    ...strandShapes(BEAR_CHAINS[4], 'fur', [18, 15, 11], { tip: 'tattered', teeth: 4 }),
    P('torso', 'fur', [[22, 100], [26, 86], [36, 76], [48, 70], [58, 67], [70, 71], [80, 76], [88, 84], [89, 100], [82, 110], [60, 112], [40, 112], [28, 110]]),
    E('torso', 'fur', 24, 88, 4, 3),
    E('legF', 'fur', 44, 100, 12, 14), L('legF', 'fur', 44, 108, 42, 124, 12), E('legF', 'fur', 44, 126.5, 8, 3.5),
    L('armF', 'fur', 82, 96, 85, 122, 12), E('armF', 'fur', 87, 125.5, 8, 3.5),
    P('armF', 'claw', [[90, 122.5], [96, 124], [90, 125.5]]), P('armF', 'claw', [[90, 125.5], [96.5, 127.5], [90, 128.3]]),
    // head: skull, muzzle, round ears, chin ruff and jaw
    E('head', 'fur', 96, 82, 13, 11), E('head', 'fur', 107, 86, 8, 6), C('head', 'fur', 114.5, 84, 2.2),
    C('head', 'fur', 88, 71, 4.5), C('head', 'fur', 97, 70, 4),
    ...strandShapes(BEAR_CHAINS[3], 'fur', [8, 6, 2], { tip: 'tattered', teeth: 2 }),
    P('chF1', 'fur', [[98, 89], [114, 90], [113, 93], [100, 95]]),
    P('head', 'claw', [[109, 89], [111, 89], [110, 92.5]]),
    slitEye('head', 'eyeGlow', [98.64, 77.26], [105.36, 79.64], 1.56),
  ],
};

// ── Eagle ────────────────────────────────────────────────────────────────────

const EAGLE_TAIL: ChainSpec = { slot: 'A', joints: [[50, 88], [40, 92], [31, 96], [23, 99]], freq: 2.8, damping: 0.3, sag: 0.8, sway: 1.2, limit: 50 };
const feather = (slot: 'B' | 'C' | 'D' | 'E', parent: BoneId, x: number, y: number, dx: number, dy: number): ChainSpec =>
  ({ slot, parent, joints: [[x, y], [x + dx, y + dy], [x + dx * 1.8, y + dy * 1.8]], freq: 3.4, damping: 0.42, sag: 0.3, sway: 0.8, limit: 35 });
const EAGLE_FEATHERS: ChainSpec[] = [
  feather('B', 'armF', 49, 30, -4, -9), feather('C', 'armF', 55, 28, -1, -9),
  feather('D', 'armB', 42, 32, -5, -8), feather('E', 'armB', 48, 31, -2, -8),
];
const TALONS: ChainSpec = { slot: 'F', joints: [[60, 92], [61, 102], [62, 109]], freq: 6, damping: 0.6, sag: 0.4, sway: 0.3, limit: 40 };
const EAGLE_FALLEN: PartialPose = { rootX: -4, torsoY: 30, torso: 80, head: 55, armF: 95, armB: 100, chF1: 40, chF2: 20 };

const AGUILA_RIG: PuppetRig = {
  accent: '#7dba4e', style: 'melee', phase: 2.0, focus: [91, 70], focusBone: 'head', slash: [16, 30], flap: 22, impact: 0.45,
  slashAt: ['chF2', [64, 108]],
  palette: { feather: '#4a3a2a', claw: '#d8cbb0', eyeGlow: FORM_EYE },
  pivots: { torso: [60, 82], head: [70, 76], cape: [46, 86], armF: [62, 76], armB: [56, 74] },
  chains: [EAGLE_TAIL, ...EAGLE_FEATHERS, TALONS],
  rest: {},
  windup: { rootX: -6, torsoY: -8, torso: -15, armF: -30, armB: -30 },
  strike: { rootX: 18, torsoY: 10, torso: 25, head: 10, armF: 35, armB: 35 },
  actions: {
    // climbs, folds the wings and stoops, talons thrown forward and open
    attack: {
      keys: [
        [0, {}],
        [0.2, { rootX: -8, torsoY: -14, torso: -12, head: -10, armF: 25, armB: 22, chF1: 20, chF2: 10 }, EASE.easeOut],
        [0.34, { rootX: -5, torsoY: -16, torso: 20, head: 14, armF: -85, armB: -80, chF1: 25, chF2: 12 }, EASE.smooth],
        [0.45, { rootX: 22, torsoY: 12, torso: 28, head: 10, armF: -95, armB: -90, chF1: -70, chF2: -35 }, EASE.expoIn],
        [0.5, { rootX: 22, torsoY: 12, torso: 26, head: 10, armF: -90, armB: -86, chF1: -68, chF2: -35 }, EASE.linear],
        [0.62, { rootX: 16, torsoY: 4, torso: -10, head: -6, armF: 32, armB: 30, chF1: -30, chF2: 18 }, EASE.easeOut],
        [0.8, { rootX: 6, torsoY: -4, torso: -4, armF: 10, armB: 10, chF1: -8, chF2: 10 }, EASE.smooth],
        [1, {}, EASE.smooth],
      ],
      slash: [0.42, 0.62], smear: [0.36, 0.5], smearBones: ['armF', 'armB', 'head'],
    },
    // rears up with wings spread and screeches, beating the air
    spell: {
      keys: [
        [0, {}],
        [0.28, { torsoY: -8, torso: -15, head: -25, armF: 30, armB: 26, chF1: 15 }, EASE.smooth],
        [0.44, { torsoY: -11, torso: -18, head: -36, armF: -25, armB: -28, chF1: 20 }, EASE.backOut],
        [0.6, { torsoY: -13, torso: -16, head: -32, armF: 36, armB: 32, chF1: 18 }, EASE.smooth],
        [0.76, { torsoY: -7, torso: -10, head: -28, armF: -12, armB: -15, chF1: 12 }, EASE.smooth],
        [1, {}, EASE.smooth],
      ],
      burst: [0.42, 0.86],
    },
    hit: {
      keys: [
        [0, {}],
        [0.1, { rootX: -10, torsoY: -4, torso: -26, head: -22, armF: 42, armB: 46, chF1: 30, chF2: 15 }, EASE.expoOut],
        [0.4, { rootX: -4, torso: -8, head: -6, armF: 10, armB: 8, chF1: 8 }, EASE.smooth],
        [1, {}, EASE.smooth],
      ],
    },
    // wings go limp and it drops out of the sky
    death: {
      keys: [
        [0, {}],
        [0.1, { rootX: -8, torsoY: -6, torso: -22, head: -26, armF: 40, armB: 40, chF1: 30 }, EASE.expoOut],
        [0.38, { rootX: -5, torsoY: 8, torso: 36, head: 36, armF: 60, armB: 70, chF1: 35, chF2: 15 }, EASE.smooth],
        [0.66, EAGLE_FALLEN, EASE.easeIn],
        [0.74, { ...EAGLE_FALLEN, torsoY: 27 }, EASE.easeOut],
        [1, EAGLE_FALLEN, EASE.smooth],
      ],
    },
  },
  shapes: [
    // far wing with its primaries
    P('armB', 'feather', [[56, 76], [50, 60], [44, 44], [40, 30], [46, 34], [48, 28], [52, 36], [55, 31], [57, 42], [61, 40], [62, 56], [62, 76]]),
    ...strandShapes(EAGLE_FEATHERS[2], 'feather', [4, 3, 0.5]), ...strandShapes(EAGLE_FEATHERS[3], 'feather', [4, 3, 0.5]),
    // fanned tail
    ...strandShapes(EAGLE_TAIL, 'feather', [7, 10, 12, 13], { tip: 'tattered', teeth: 4 }),
    // feathered thighs, shanks and talons
    P('chF1', 'feather', [[55, 90], [66, 90], [65, 98], [63, 103], [58, 103], [56, 97]]),
    L('chF2', 'claw', 61, 102, 62, 109, 2.4),
    P('chF2', 'claw', [[61, 107], [69, 109], [70, 112.5], [67, 110.5], [62, 111]]),
    P('chF2', 'claw', [[62, 108], [66.5, 113], [64.5, 114.5], [61, 111]]),
    P('chF2', 'claw', [[61, 108], [55, 111], [56, 113], [62, 111]]),
    P('torso', 'feather', [[46, 86], [54, 80], [66, 77], [75, 79], [77, 86], [71, 92], [60, 95], [50, 93]]),
    P('torso', 'feather', [[62, 92], [70, 90], [72, 97], [68, 94], [66, 99], [63, 95]]),
    // head: hooked beak, heavy brow, ragged nape
    C('head', 'feather', 76, 71, 7.5),
    P('head', 'feather', [[81, 66], [91, 68], [93.5, 73], [90.5, 77.5], [88.5, 73.5], [82, 75.5]]),
    P('head', 'feather', [[72, 65], [85, 63.5], [83, 67]]),
    P('head', 'feather', [[71, 66], [61, 62], [65, 67], [60, 70], [66, 71], [62, 75], [71, 74]]),
    slitEye('head', 'eyeGlow', [77.2, 67.62], [82.8, 69.58], 1.3),
    // near wing with its primaries
    P('armF', 'feather', [[62, 76], [56, 58], [51, 42], [48, 28], [54, 32], [56, 26], [60, 34], [63, 29], [65, 40], [69, 36], [71, 54], [72, 78]]),
    ...strandShapes(EAGLE_FEATHERS[0], 'feather', [4.5, 3, 0.5]), ...strandShapes(EAGLE_FEATHERS[1], 'feather', [4, 3, 0.5]),
  ],
};

// ── Swarm ────────────────────────────────────────────────────────────────────

const SWARM_CENTRE: Pt = [62, 92];
const SWARM_SLOTS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
/** Six streams of insects spiralling out of the centre (they curl in to contract). */
const SWARM_STREAMS: ChainSpec[] = SWARM_SLOTS.map((slot, i) => {
  const a0 = [0, 180, 60, 240, 120, 300][i];
  const joints = [6, 13, 20, 27].map((r, k): Pt => {
    const a = (a0 + k * 32) * RAD;
    return [r2(SWARM_CENTRE[0] + Math.cos(a) * r), r2(SWARM_CENTRE[1] + Math.sin(a) * r * 0.85)];
  });
  return { slot, parent: (['torso', 'torso', 'armB', 'armB', 'armF', 'armF'] as BoneId[])[i], joints, freq: 2.2, damping: 0.36, taper: 0.4, sag: 0.3, sway: 1.5, limit: 50 };
});
const SWARM_BONES = SWARM_SLOTS.flatMap((s) => [1, 2, 3].map((k) => `ch${s}${k}`));
/** Curl of every stream: > 0 winds the swirl in (contracts), < 0 flings it open. */
const curl = (v: number): PartialPose => Object.fromEntries(SWARM_BONES.map((b) => [b, v * (1 - 0.2 * (Number(b[3]) - 1))])) as PartialPose;

function swarmShapes(): Shape[] {
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const out: Shape[] = [];
  // dense core and the leading cluster (the "head" that bites)
  const clusters: [BoneId, number, number, number, number, number][] = [['torso', 62, 92, 9, 8, 14], ['head', 84, 80, 7, 6, 8]];
  for (const [bone, cx, cy, rx, ry, n] of clusters) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd());
      out.push(E(bone, 'bug', r2(cx + Math.cos(a) * rx * d), r2(cy + Math.sin(a) * ry * d), 3, 2));
    }
    const gx = r2(cx + (rnd() - 0.5) * rx), gy = r2(cy + (rnd() - 0.5) * ry);
    // the leading cluster glares with two angry eyes; the core keeps a glint
    if (bone === 'head') out.push(slitEye('head', 'eyeGlow', [79.4, 77.6], [83.4, 79.2], 1.3), slitEye('head', 'eyeGlow', [89.6, 77.6], [85.8, 79.2], 1.3));
    else out.push(C(bone, 'sparkle', gx, gy, 0.9));
  }
  // streams: three insects per segment, smaller towards the tip, one glint each
  for (const s of SWARM_STREAMS) {
    const bones = (['1', '2', '3'] as const).map((k) => `ch${s.slot}${k}` as BoneId);
    for (let k = 0; k < 3; k++) {
      const [ax, ay] = s.joints[k], [bx, by] = s.joints[k + 1];
      for (const f of [0.2, 0.55, 0.9]) {
        const j = (rnd() - 0.5) * 7, i = (rnd() - 0.5) * 5;
        out.push(E(bones[k], 'bug', r2(ax + (bx - ax) * f + j), r2(ay + (by - ay) * f + i), r2(2.6 - k * 0.35), r2(1.7 - k * 0.25)));
      }
    }
    const [tx, ty] = s.joints[3];
    out.push(C(bones[2], 'sparkle', tx, ty, 0.9));
  }
  return out;
}

const ENJAMBRE_RIG: PuppetRig = {
  accent: '#7dba4e', style: 'melee', phase: 2.7, focus: [86, 78], focusBone: 'head', slash: [16, 30], slashAt: ['head', [84, 80]], flap: 10, impact: 0.42,
  palette: { bug: '#2a2a2a', eyeGlow: FORM_EYE, sparkle: '#c4e0af' },
  pivots: { torso: [62, 96], head: [80, 84], cape: [52, 96], armF: [70, 90], armB: [56, 88], legF: [64, 104], legB: [54, 104] },
  chains: SWARM_STREAMS,
  rest: {},
  windup: { rootX: -6, torso: -10, head: -14, armF: -20, armB: -20 },
  strike: { rootX: 20, torso: 12, head: 16, armF: 25, armB: 20, legF: -15, legB: -10 },
  actions: {
    // winds in tight, then flings itself open over the enemy
    attack: {
      keys: [
        [0, {}],
        [0.28, { rootX: -7, torso: -14, head: -16, armF: -25, armB: -25, squash: 0.1, ...curl(34) }, EASE.easeOut],
        [0.34, { rootX: -8, torso: -16, head: -18, armF: -28, armB: -28, squash: 0.12, ...curl(40) }, EASE.smooth],
        [0.42, { rootX: 24, torso: 12, head: 18, armF: 28, armB: 22, squash: -0.12, ...curl(-16) }, EASE.expoIn],
        [0.47, { rootX: 24, torso: 12, head: 18, armF: 28, armB: 22, squash: -0.1, ...curl(-18) }, EASE.linear],
        [0.64, { rootX: 14, torso: 4, head: 6, armF: 8, armB: 6, squash: 0.04, ...curl(-6) }, EASE.easeOut],
        [1, {}, EASE.smooth],
      ],
      slash: [0.39, 0.6], smear: [0.36, 0.47], smearBones: ['head', 'torso'],
    },
    // contracts into a ball, then bursts outwards buzzing
    spell: {
      keys: [
        [0, {}],
        [0.3, { torsoY: -4, torso: -20, head: -20, armF: -30, armB: -30, squash: 0.12, ...curl(45) }, EASE.easeOut],
        [0.46, { torsoY: -6, torso: 25, head: 20, armF: 35, armB: 35, squash: -0.14, ...curl(-22) }, EASE.backOut],
        [0.76, { torsoY: -5, torso: 20, head: 14, armF: 25, armB: 25, squash: -0.1, ...curl(-14) }, EASE.linear],
        [1, {}, EASE.smooth],
      ],
      burst: [0.44, 0.86],
    },
    hit: {
      keys: [
        [0, {}],
        [0.1, { rootX: -10, torso: -20, head: -24, armF: 25, armB: 25, squash: 0.08, ...curl(-25) }, EASE.expoOut],
        [0.4, { rootX: -4, torso: -6, head: -6, ...curl(-6) }, EASE.smooth],
        [1, {}, EASE.smooth],
      ],
    },
    // scatters and rains down
    death: {
      keys: [
        [0, {}],
        [0.1, { rootX: -8, torso: -20, head: -26, squash: 0.06, ...curl(-25) }, EASE.expoOut],
        [0.5, { rootX: -4, torsoY: 14, torso: 25, head: 45, armF: 40, armB: 45, squash: 0.25, ...curl(-38) }, EASE.easeIn],
        [1, { rootX: -4, torsoY: 18, torso: 30, head: 50, armF: 45, armB: 50, squash: 0.3, ...curl(-41) }, EASE.easeOut],
      ],
    },
  },
  animate: (p, t) => {
    // heartbeat: the swirl contracts on each beat and expands between them
    const ph = (t * 1.1 + 0.37) % 1;
    const beat = 0.35 * Math.sin(2 * Math.PI * (t * 1.1)) + Math.exp(-Math.pow((ph - 0.1) / 0.06, 2)) + 0.6 * Math.exp(-Math.pow((ph - 0.3) / 0.06, 2));
    const c = curl(16 * beat - 4);
    for (const b of SWARM_BONES) (p as unknown as Record<string, number>)[b] += (c as Record<string, number>)[b];
    p.squash += 0.025 * beat;
  },
  shapes: swarmShapes(),
};

// ── Star stag ────────────────────────────────────────────────────────────────

const STAG_CHAINS: ChainSpec[] = [
  { slot: 'A', joints: [[35, 84], [30, 85], [27, 90]], freq: 4.5, damping: 0.3, sag: 0.6, sway: 0.8, limit: 50 },
  { slot: 'B', parent: 'head', joints: [[78, 68], [73, 71], [69, 75], [66, 80]], freq: 3, damping: 0.28, sag: 0.8, sway: 1.1, limit: 55 },
  { slot: 'C', parent: 'head', joints: [[76, 76], [71, 79], [67, 83]], freq: 3.2, damping: 0.28, sag: 0.8, sway: 1, limit: 55 },
  { slot: 'D', parent: 'head', joints: [[81, 62], [77, 63], [73, 66]], freq: 3.4, damping: 0.28, sag: 0.6, sway: 1, limit: 55 },
  { slot: 'E', parent: 'head', joints: [[101, 39], [102, 45], [103, 51]], freq: 2.6, damping: 0.2, sag: 0.8, sway: 1, limit: 70 },
];
const MANE = ['chB1', 'chB2', 'chC1', 'chC2', 'chD1', 'chD2'];
const STAG_FALLEN: PartialPose = { rootX: -5, torsoY: 14, torso: 10, head: 30, armF: 60, armB: 50, legF: -40, legB: -35, squash: 0.26 };

const ESTELAR_RIG: PuppetRig = {
  accent: '#ffe39a', style: 'melee', phase: 4.1, focus: [93, 28], focusBone: 'head', slash: [20, 36], slashAt: ['head', [96, 50]], impact: 0.42,
  palette: { hide: '#4a3a2c', eyeGlow: '#ffe07a', starGlow: '#fff4c8' },
  pivots: { torso: [44, 96], head: [78, 84], cape: [34, 84], armF: [78, 94], armB: [74, 94], legF: [46, 94], legB: [42, 94] },
  chains: STAG_CHAINS,
  rest: {},
  windup: { rootX: -5, torso: -10, head: -16 },
  strike: { rootX: 8, torso: 4, head: 10, armF: -20, legF: 12 },
  actions: {
    // rears back pawing the ground, lowers the antlers and charges
    attack: {
      keys: [
        [0, {}],
        [0.24, { rootX: -9, torso: -7, head: -20, armF: -35, legF: 8, squash: 0.05, ...each(MANE, -10) }, EASE.easeOut],
        [0.34, { rootX: -7, torso: 4, head: 32, armF: 6, legF: -10, legB: -6, squash: 0.12, ...each(MANE, 10) }, EASE.smooth],
        [0.42, { rootX: 22, torsoY: -2, torso: 6, head: 48, armF: -40, armB: -30, legF: 30, legB: 25, squash: -0.1 }, EASE.expoIn],
        [0.47, { rootX: 22, torsoY: -2, torso: 6, head: 48, armF: -40, armB: -30, legF: 30, legB: 25, squash: -0.08 }, EASE.linear],
        [0.62, { rootX: 16, torso: 2, head: 26, armF: -8, legF: 6, squash: 0.06 }, EASE.easeOut],
        [0.8, { rootX: 6, head: 6 }, EASE.smooth],
        [1, {}, EASE.smooth],
      ],
      slash: [0.39, 0.6], smear: [0.35, 0.47], smearBones: ['head', 'armF'],
    },
    // rears up and bells, the antlers blazing
    spell: {
      keys: [
        [0, {}],
        [0.3, { rootX: -3, torso: -20, head: -30, armF: -40, armB: -30, squash: -0.05, ...each(MANE, 12) }, EASE.smooth],
        [0.45, { rootX: -3, torso: -26, head: -40, armF: -62, armB: -46, squash: -0.07, ...each(MANE, 20) }, EASE.backOut],
        [0.76, { rootX: -3, torso: -25, head: -38, armF: -58, armB: -44, squash: -0.06, ...each(MANE, 16) }, EASE.linear],
        [0.9, { rootX: 1, torso: 2, head: 4, armF: -4, squash: 0.08 }, EASE.easeIn],
        [1, {}, EASE.smooth],
      ],
      burst: [0.42, 0.88],
    },
    hit: {
      keys: [
        [0, {}],
        [0.1, { rootX: -10, torso: -10, head: -24, armF: 20, armB: 16, squash: 0.08, ...each(MANE, 25) }, EASE.expoOut],
        [0.38, { rootX: -4, torso: -3, head: -6, squash: -0.02 }, EASE.smooth],
        [1, {}, EASE.smooth],
      ],
    },
    death: {
      keys: [
        [0, {}],
        [0.1, { rootX: -8, torso: -12, head: -28, armF: -20, squash: 0.04 }, EASE.expoOut],
        [0.38, { rootX: -4, torsoY: 6, torso: 8, head: 16, armF: 40, armB: 35, legF: -18, legB: -14, squash: 0.14 }, EASE.smooth],
        [0.62, STAG_FALLEN, EASE.easeIn],
        [0.7, { ...STAG_FALLEN, torsoY: 12, squash: 0.22 }, EASE.easeOut],
        [1, STAG_FALLEN, EASE.smooth],
      ],
    },
  },
  animate: (p, t, action) => {
    if (action?.type === 'spell') p.head += shake(t, 1.4, 8) * pulse(action.p, 0.42, 0.82);
    if (action?.type === 'attack') p.rootX += shake(t, 1) * pulse(action.p, 0.41, 0.49);
  },
  shapes: [
    ...strandShapes(STAG_CHAINS[0], 'hide', [5, 5, 1.5]),
    L('armB', 'hide', 74, 94, 76, 110, 4.5), L('armB', 'hide', 76, 110, 76, 125, 3.2), E('armB', 'hide', 77, 126.5, 3, 2),
    L('legB', 'hide', 42, 94, 47, 108, 6), L('legB', 'hide', 47, 108, 41, 125, 3.2), E('legB', 'hide', 41.5, 126.5, 3, 2),
    P('torso', 'hide', [[33, 86], [40, 80], [56, 79], [70, 78], [80, 82], [82, 92], [74, 98], [58, 97], [46, 98], [36, 95]]),
    // star speckles on the flank
    C('torso', 'starGlow', 50, 86, 0.9), C('torso', 'starGlow', 58, 90, 0.8), C('torso', 'starGlow', 66, 84, 0.9),
    C('torso', 'starGlow', 72, 90, 0.7), C('torso', 'starGlow', 44, 91, 0.7),
    E('legF', 'hide', 46, 92, 8, 9), L('legF', 'hide', 46, 98, 50, 110, 5), L('legF', 'hide', 50, 110, 44, 125, 3.6), E('legF', 'hide', 45, 126.5, 3.4, 2.2),
    L('armF', 'hide', 78, 94, 80, 110, 5), L('armF', 'hide', 80, 110, 81, 125, 3.6), E('armF', 'hide', 82, 126.5, 3.4, 2.2),
    // neck, head, ear
    P('head', 'hide', [[72, 88], [78, 66], [88, 64], [86, 78], [82, 92]]),
    P('head', 'hide', [[81, 59], [95, 61], [100, 66], [89, 70], [81, 67]]),
    P('head', 'hide', [[82, 61], [74, 55], [82, 65]]),
    // flowing mane
    ...strandShapes(STAG_CHAINS[1], 'hide', [5, 5, 4, 1]), ...strandShapes(STAG_CHAINS[2], 'hide', [5, 4, 1]), ...strandShapes(STAG_CHAINS[3], 'hide', [4, 3, 0.8]),
    // antlers with sparkling tines
    L('head', 'hide', 84, 59, 79, 44, 2.2), L('head', 'hide', 79, 44, 72, 38, 1.8), L('head', 'hide', 79, 44, 78, 30, 1.8), L('head', 'hide', 78.5, 36, 70, 32, 1.4),
    L('head', 'hide', 87, 58, 93, 42, 2.2), L('head', 'hide', 93, 42, 101, 38, 1.8), L('head', 'hide', 93, 42, 93, 28, 1.8), L('head', 'hide', 93, 34, 99, 28, 1.4),
    star('head', 'starGlow', 72, 38, 3), star('head', 'starGlow', 78, 30, 3.2), star('head', 'starGlow', 70, 32, 2.4),
    star('head', 'starGlow', 101, 38, 3), star('head', 'starGlow', 93, 28, 3.4), star('head', 'starGlow', 99, 28, 2.4),
    C('head', 'starGlow', 86, 46, 1.1),
    // a thread of starlight hanging from a tine
    ...strandShapes(STAG_CHAINS[4], 'starGlow', [0.6, 0.5, 0.4], { tip: 'flat' }), star('chE2', 'starGlow', 103, 51, 2.4),
    slitEye('head', 'eyeGlow', [87, 61.52], [92.6, 63.48], 1.3),
  ],
};

export const FORM_RIGS: Record<FormId, PuppetRig> = {
  lobo: (WOLF_RIG),
  oso: (OSO_RIG),
  aguila: (AGUILA_RIG),
  enjambre: (ENJAMBRE_RIG),
  lunar: (LUNAR_RIG),
  estelar: (ESTELAR_RIG),
};
