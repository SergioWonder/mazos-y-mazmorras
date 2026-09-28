// Rogue rig (backlit silhouette). Bind-pose coordinates: viewBox 140×135,
// facing right, feet at y≈128. See src/fx/heroes/README.md for chains (hair,
// cloth), action timelines and the piece budget.
//
// Look (card art: Danza Mortal, Emboscada, Pirueta…): a lean, crouched, feline
// figure in a peaked hood, a long scarf streaming behind, a short ragged cape,
// two daggers (forward grip in front, reverse grip behind), a bandolier of
// throwing knives and light boots. The face is never shown; only the blade
// edges catch the light.
//
// The bind pose is already crouched. Torso and legs share one pivot at the
// centre of mass, so rotating the three together turns the whole body (flips,
// rolls) without tearing it apart.
//
// Chains: A long scarf tail, B second scarf tail (hangs from A), C short cape,
// D back cape layer, E hood peak, F belt sash.
// Acting: quick and sharp — a feint, a coil and a crossed double stab; a
// backflip for tricks; a curled roll back when hit; a slide to the floor on
// death with the scarf floating down after the body.

import { C, E, P, L, slitEye, type PartialPose, type PuppetRig } from '../puppet.ts';
import { strandShapes, type ChainSpec } from '../chains.ts';
import { EASE, shake } from '../motion.ts';

/** Centre of mass: pivot of torso and both legs (whole-body turns). */
const CORE: [number, number] = [58, 96];
const IMPACT = 0.42;

const SCARF: ChainSpec = {
  slot: 'A', joints: [[60, 77], [47, 78], [34, 82], [21, 88]],
  freq: 1.7, damping: 0.26, taper: 0.35, sag: 3, sway: 3, limit: 48,
};
const SCARF_TAIL: ChainSpec = {
  slot: 'B', parent: 'chA1', joints: [[54, 79], [45, 85], [38, 92], [33, 100]],
  freq: 1.9, damping: 0.26, taper: 0.4, sag: 2.5, sway: 2.2, limit: 50,
};
const CAPE: ChainSpec = {
  slot: 'C', joints: [[58, 80], [52, 89], [47, 98], [43, 107]],
  freq: 2.6, damping: 0.3, taper: 0.4, sag: 1.4, sway: 1.4, limit: 50,
};
const CAPE_BACK: ChainSpec = {
  slot: 'D', joints: [[56, 80], [48, 87], [41, 94], [35, 100]],
  freq: 2.3, damping: 0.28, taper: 0.45, sag: 1.6, sway: 1.8, limit: 55,
};
const HOOD_PEAK: ChainSpec = {
  slot: 'E', parent: 'head', joints: [[54, 55], [47, 58], [41, 63]],
  freq: 3.4, damping: 0.3, taper: 0.4, sag: 0.8, sway: 0.8, limit: 55,
};
const SASH: ChainSpec = {
  slot: 'F', joints: [[52, 100], [47, 106], [44, 113]],
  freq: 2.8, damping: 0.25, taper: 0.4, sag: 1, sway: 1.2, limit: 70,
};

/** The double stab at the impact: the front blade rising, the reverse-grip one
 *  diving, crossed in an X in front of the chest. */
const STAB: PartialPose = { rootX: 22, torso: 30, head: -22, armF: -100, weapon: 30, armB: -130, offhand: 20, squash: -0.1, legF: -7, legB: 7, chA1: -26, chA2: -6 };

/** Slumped on the floor; the cloth is laid down too, so the physics lets it
 *  float down slowly after the body. */
const FALLEN: PartialPose = {
  rootX: 4, torsoY: 14, torso: 58, head: 34, armF: 70, weapon: 40, armB: 60, offhand: 30, legF: -48, legB: 30, squash: 0.3,
  chA1: -55, chA2: -10, chB1: -20, chC1: -45, chD1: -45, chF1: -30,
};

const ACTIONS: PuppetRig['actions'] = {
  // feint → coil → crossed double stab (hit-stop) → follow-through → settle
  attack: {
    keys: [
      [0, {}],
      [0.1, { rootX: 3, torso: 14, head: -8, armF: -72, weapon: 62, armB: 20, squash: -0.04 }, EASE.expoOut],
      [0.2, { rootX: -4, torso: -8, head: -4, armF: 20, weapon: -25, armB: 60, offhand: 10, squash: 0.12, legF: 3, legB: -3 }, EASE.easeOut],
      [0.3, { rootX: -6, torso: -11, head: -6, armF: 30, weapon: -30, armB: 75, offhand: 15, squash: 0.15, legF: 4, legB: -4, chA1: 0 }, EASE.smooth],
      [IMPACT, STAB, EASE.expoIn],
      [IMPACT + 0.05, STAB, EASE.linear],
      [0.6, { rootX: 22, torso: 31, head: -22, armF: -90, weapon: 10, armB: -118, offhand: 26, squash: -0.02, legF: -8, legB: 8, chA1: -20, chA2: -4 }, EASE.easeOut],
      [0.8, { rootX: 6, torso: 4, head: 2, armF: -45, weapon: 20, armB: 35, squash: 0.04, legF: -4, legB: 4 }, EASE.smooth],
      [1, {}, EASE.smooth],
    ],
    slash: [0.38, 0.62],
    smear: [0.33, 0.52],
  },
  // backflip: crouch, spring up, tuck and turn over, land in a crouch
  spell: {
    keys: [
      [0, {}],
      [0.14, { rootX: 2, torso: 10, head: 8, armF: 25, armB: 45, legF: 3, legB: -3, squash: 0.16 }, EASE.easeOut],
      [0.26, { rootX: -4, torsoY: -8, torso: -45, legF: -45, legB: -45, head: -12, armF: -150, armB: -140, squash: -0.14 }, EASE.expoOut],
      [0.48, { rootX: -10, torsoY: -12, torso: -190, legF: -200, legB: -198, head: 35, armF: -20, armB: -10, offhand: -30, squash: -0.1 }, EASE.linear],
      [0.66, { rootX: -8, torsoY: -6, torso: -332, legF: -334, legB: -333, head: 20, armF: -90, armB: -60, squash: -0.04 }, EASE.linear],
      [0.72, { rootX: -6, torsoY: 0, torso: -352, legF: -358, legB: -358, head: 10, armF: -60, armB: 60, squash: 0.14 }, EASE.easeOut],
      // same pose one full turn later: jump back to the unwound angles
      [0.7201, { rootX: -6, torsoY: 0, torso: 8, legF: 2, legB: 2, head: 10, armF: -60, armB: 60, squash: 0.14 }, EASE.step],
      [0.86, { rootX: -2, torso: 2, head: 2, armF: -40, armB: 35, squash: 0.03 }, EASE.easeOut],
      [1, {}, EASE.smooth],
    ],
    burst: [0.42, 0.8],
    smear: [0.3, 0.66],
    smearBones: ['weapon', 'armF', 'offhand'],
  },
  // curls up and rolls a little backwards, then springs back to guard
  hit: {
    keys: [
      [0, {}],
      [0.1, { rootX: -10, torso: -30, legF: -28, legB: -28, head: 18, armF: 35, armB: 40, weapon: -30, squash: 0.14 }, EASE.expoOut],
      [0.36, { rootX: -13, torso: -12, legF: -10, legB: -10, head: 8, armF: 5, armB: 30, squash: 0.06 }, EASE.easeOut],
      [0.62, { rootX: -6, torso: -2, head: 2, squash: 0.02 }, EASE.smooth],
      [1, {}, EASE.smooth],
    ],
  },
  // knees give, the body slides down to the floor; the scarf floats down after
  death: {
    keys: [
      [0, {}],
      [0.08, { rootX: -6, torso: -16, head: -12, armF: 20, armB: 30, squash: 0.04 }, EASE.expoOut],
      [0.28, { rootX: -2, torsoY: 6, torso: 18, head: 22, armF: 40, armB: 45, legF: -22, legB: 16, squash: 0.18 }, EASE.easeIn],
      [0.5, FALLEN, EASE.easeOut],
      [1, FALLEN],
    ],
  },
};

export const PICARO_RIG: PuppetRig = {
  accent: '#4fb0a0', style: 'melee', phase: 3.4, focus: [72, 99], slash: [18, 32],
  impact: IMPACT,
  palette: {
    scarf: '#4fb0a0', hood: '#2f4d49', hoodD: '#1f3431', leather: '#5a4636', leatherD: '#3a2d24', boots: '#2a2320',
    belt: '#8a6a44', glove: '#2a2320', knife: '#cfd8de', steel: '#cfd8de', sparkle: '#d8f3ee', eyeGlow: '#7ff0da',
  },
  pivots: {
    root: CORE, torso: CORE, legB: CORE, legF: CORE,
    head: [64, 78], armF: [66, 81], armB: [57, 81], weapon: [70, 99], offhand: [54, 100],
  },
  headScale: 0.78,
  chains: [SCARF, SCARF_TAIL, CAPE, CAPE_BACK, HOOD_PEAK, SASH],
  actions: ACTIONS,
  rest: { torso: 12, head: -6, armF: -50, weapon: 58, armB: 30, offhand: -8 },
  windup: { rootX: -5, torso: -10, armF: 30, weapon: -30, armB: 75, squash: 0.14 },
  strike: { rootX: 22, torso: 14, head: 6, armF: -88, weapon: 95, armB: -95, offhand: -15, legF: -16, legB: 14 },
  animate: (p, t, action) => {
    // tremble of the blades during the hit-stop
    if (action?.type === 'attack' && action.p > IMPACT && action.p < IMPACT + 0.05) {
      p.weapon += shake(t, 2.5); p.offhand += shake(t + 0.3, 2.5);
    }
  },
  shapes: [
    // behind the body: scarf tails, cape layers, back arm and its dagger
    ...strandShapes(SCARF_TAIL, 'scarf', [4.5, 4, 3, 1.5]),
    ...strandShapes(SCARF, 'scarf', [6.5, 6, 5, 4], { tip: 'tattered', teeth: 2 }),
    ...strandShapes(CAPE_BACK, 'hoodD', [10, 12, 11, 9], { tip: 'tattered', teeth: 3 }),
    ...strandShapes(CAPE, 'hoodD', [15, 17, 17, 15], { tip: 'tattered', teeth: 4 }),
    ...strandShapes(SASH, 'leatherD', [3.5, 3, 1.5]),
    L('armB', 'hood', 57, 81, 54, 97, 6.5), L('armB', 'leatherD', 54.6, 93, 54.1, 98, 7.2),
    L('offhand', 'leatherD', 54, 96.5, 54, 103, 2.6), L('offhand', 'belt', 51.5, 103.6, 56.5, 103.6, 1.8),
    P('offhand', 'steel', [[52.6, 104], [55.4, 104], [54, 118]]), L('offhand', 'sparkle', 54.5, 105.5, 54.1, 115.5, 0.6),
    C('armB', 'glove', 54, 100, 3.3),
    // back leg: kneeling lunge on the toes
    L('legB', 'leatherD', 54, 101, 46, 112, 8.5), L('legB', 'leatherD', 46, 112, 38, 121, 6.5),
    P('legB', 'boots', [[35, 118.5], [41.5, 120], [46.5, 126], [46.5, 128], [38.5, 128], [34, 123.5]]),
    L('legB', 'belt', 44.5, 113.5, 40, 118.5, 7),
    // front leg: bent, weight forward, a knife strapped to the thigh
    L('legF', 'leatherD', 62, 100, 73, 110, 8.5), L('legF', 'leatherD', 73, 110, 72, 122, 6.5),
    P('legF', 'boots', [[68.5, 119.5], [75.5, 120], [77, 123], [83.5, 125.5], [84, 128], [68, 128]]),
    L('legF', 'belt', 72.3, 118, 72.2, 121, 7.6),
    L('legF', 'belt', 64.5, 106, 70, 102, 2), P('legF', 'knife', [[66, 104.5], [68.5, 103], [60.5, 112]]),
    // torso: leaning chest, belt, bandolier with throwing knives sticking out in front
    P('torso', 'leather', [[53, 80], [62, 78], [69, 81], [70, 88], [67, 97], [64.5, 103], [52.5, 103], [51, 94], [51.5, 86]]),
    P('torso', 'belt', [[50, 97.5], [66.5, 96.5], [65.5, 102.5], [51, 103.5]]),
    E('torso', 'leatherD', 51, 101, 3.2, 3.6),
    L('torso', 'belt', 54, 80.5, 68, 99, 2.4),
    L('torso', 'knife', 68, 84, 73, 80.5, 1.7), L('torso', 'knife', 69, 88, 74, 85, 1.7), L('torso', 'knife', 68.5, 92, 73.5, 89.5, 1.7),
    E('torso', 'scarf', 63, 79, 9, 5),
    // head: peaked hood with a forward brim, the lower face wrapped in the scarf
    P('head', 'hoodD', [[52, 76], [49, 66], [51, 57], [57, 50], [65, 47], [73, 50], [79, 55], [85, 61.5], [77.5, 62], [75.5, 66], [75, 72], [68, 78]]),
    ...strandShapes(HOOD_PEAK, 'hoodD', [7, 4.5, 1]),
    P('head', 'scarf', [[66, 69], [76.5, 68.5], [78, 74], [71, 80], [63, 80]]),
    // angry mint slits between the brim and the scarf (danza-mortal)
    slitEye('head', 'eyeGlow', [66.8, 63.6], [72.6, 65.5], 1.4), slitEye('head', 'eyeGlow', [77.3, 64.1], [74.1, 65.2], 1.2),
    // front arm and the main dagger (forward grip)
    L('armF', 'hood', 66, 81, 70, 96.5, 7), L('armF', 'leatherD', 69.3, 92.5, 70, 97.5, 7.6),
    L('weapon', 'leatherD', 66, 99, 70.5, 99, 2.6), L('weapon', 'belt', 72, 95.6, 72, 102.4, 1.8),
    P('weapon', 'steel', [[72.5, 97.6], [88, 99], [72.5, 100.4]]), L('weapon', 'sparkle', 74, 98.5, 86, 98.9, 0.6),
    C('armF', 'glove', 70, 99, 3.5),
  ],
};
