# Hero sprites: one file per character

| File | Rig(s) | Tests |
|---|---|---|
| `barbaro.ts` | `BARBARO_RIG` | `scripts/hero-tests/barbaro.ts` |
| `druida.ts` | `DRUIDA_RIG` + `FORM_RIGS` (lobo, oso, aguila, enjambre, lunar, estelar) | `scripts/hero-tests/druida.ts` |
| `mago.ts` | `MAGO_RIG` | `scripts/hero-tests/mago.ts` |
| `picaro.ts` | `PICARO_RIG` | `scripts/hero-tests/picaro.ts` |
| `brujo.ts` | `BRUJO_RIG` | `scripts/hero-tests/brujo.ts` |
| `paladin.ts` | `PALADIN_RIG` | `scripts/hero-tests/paladin.ts` |

`fx/hero-rig.ts` gathers them (`HERO_RIGS`, `FORM_RIGS`, `heroPose`, `impactFraction`…).
Only edit your character's rig file and its test file. The engine
(`puppet.ts`, `chains.ts`, `motion.ts`, `animator.ts`) is shared.

Style: backlit silhouettes. Every piece is painted near-black, with a rim light
in `accent`. Only the `EMISSIVE` keys (gem, orb, flame, violetFire…) and eyes
glow. Bind-pose coordinates: viewBox 140×135, facing right, feet at y≈128.

Eyes: angry glowing slits as in the card art, drawn with `slitEye(bone, 'eyeGlow',
outer, inner, h)` (`fx/puppet.ts`) on the `head` bone, with the inner end lower.
`eyeGlow` is emissive (halo) and an eye key (blinks, and goes out at
`EYES_OUT` of the death). Put its bright, saturated colour in the palette.

## Budget (mobile WebGL)

- Keep each figure at or under `MAX_FIGURE_PIECES` (96) pieces (`fx/puppet-gpu.ts`).
  Every piece is an instanced quad drawn in 4–5 passes. Aim for about 40–70 per hero.
- Polygons can have at most `MAX_POLY` (16) vertices.
- There are 6 chains (`A`–`F`), each with 3 bones. Each figure's physics costs
  about 0.2 ms per frame, which is fine.

## Secondary motion: spring chains (`fx/chains.ts`)

Declare the chains on the rig, then hang shapes on the chain bones
(`chA1..chA3`, `chB1..`, … `chF3`):

```ts
import { strandShapes, type ChainSpec } from '../chains.ts';

const LOCK: ChainSpec = {
  slot: 'A', parent: 'head',                          // hangs from the head (default: torso)
  joints: [[50, 50], [42, 62], [38, 74], [36, 86]],   // root pivot + end of each segment (2..4 points)
  freq: 2.6,      // Hz at the root (lower = floppier). Default 3.2
  damping: 0.3,   // damping ratio (0 wobbles, 1 no bounce). Default 0.32
  taper: 0.35,    // the tip is looser than the root. Default 0.35
  sag: 0.8,       // gravity: droop of the tip in viewBox units. Default 0.8
  sway: 1.5,      // idle breeze: sway of the tip in units. Default 1
  limit: 75,      // max bend per joint in degrees. Default 75
};
export const RIG: PuppetRig = {
  …,
  chains: [LOCK],
  shapes: [...strandShapes(LOCK, 'hair', [8, 6, 4, 1]), …],  // widths at each joint
};
```

- `strandShapes(spec, key, widths, { tip: 'point' | 'flat' | 'tattered', teeth })`
  creates one tapered polygon per segment, and the segments overlap at the
  joints. You can also draw your own `P/E/C/L` pieces on `chX1..3` in bind
  coordinates.
- Shape order is paint order. Put back locks and capes before the body, and
  front ones after it.
- A chain can hang from a bone of an earlier chain (for example, `slot: 'B'`
  with `parent: 'chA2'`).
- The solver uses a fixed step of 1/120 s. It samples the rigid pose at each
  step, so it is deterministic, stable and independent of fps. Each joint is
  pulled by a damped spring towards its animated position, then position-based
  length constraints and bend limits are applied. Lunges, recoils and hits
  create inertia on their own. You can also key chain bones in poses (for
  example `chA1: -20`), and the physics adds its offset on top.
- `PuppetAnimator` (`fx/animator.ts`) runs the pipeline for both the GPU stage
  and the SVG fallback, so the physics looks the same in both.
- The old procedural `cape` bone still moves as before. You can replace it with
  a chain.

## Action timelines (`fx/motion.ts`)

Override any action with `rig.actions[type] = { keys, slash?, burst?, projectile?, smear?, smearBones? }`.
Windows are `[from, to]` fractions of the action. Any window you omit keeps the
generic timing, shifted to the rig's `impact`.

```ts
import { EASE, strikeKeys, pulse, shake } from '../motion.ts';

impact: 0.42,   // optional; defaults: melee 0.4, magic 0.55 (combat waits for it!)
actions: {
  attack: {
    keys: strikeKeys({
      impact: 0.42,
      anticipation: { weapon: -60, armF: 150, rootX: -6, squash: 0.08 },   // coil, weapon back
      strike: { weapon: 190, armF: 290, rootX: 12, squash: -0.1 },         // lands exactly at impact
      overshoot: { armF: 310, rootX: 14 },                                   // follow-through
      settle: { armF: 20 },
      hitStop: 0.05,                                                         // freeze after the blow
    }),
    slash: [0.36, 0.62],
    smear: [0.3, 0.44],             // weapon ghosts trail behind (GPU and SVG)
  },
  hit: { keys: [[0, {}], [0.1, { rootX: -9, torso: -16, squash: 0.12 }, EASE.expoOut], [0.5, { rootX: -3 }], [1, {}]] },
},
```

- `Keyframe = [fraction, PartialPose, ease?]`. The easing shapes the segment
  that arrives at that key.
- `EASE`: `linear`, `smooth`, `easeIn`, `easeOut`, `expoIn` (hang, then snap),
  `expoOut`, `backIn` (anticipation), `backOut` (overshoot), `elasticOut`,
  `whip`, `step`.
- `squash` is a pose value (> 0 squashes, < 0 stretches) around the feet.
- `smearBones` sets which bones are ghosted. The default is weapon, armF and
  offhand for melee, and weapon for magic. Ghosted bones must have a GPU index
  below 32, so no chain bones.
- `rig.animate(p, t, action)` is still available for per-frame extras (for
  example `shake(t, amp)` during the hit-stop).
- Keep `ACTION_DURATION` (attack 0.8 s, spell 0.8 s, hit 0.6 s, death 0.9 s).
  `play('attack')` returns `ACTION_DURATION.attack × impact`, and `ui/combate.ts`
  applies damage at that moment.
- The death action fades the figure out, and the generic `fx` (flash, tint,
  opacity) is kept.

## Tests (`scripts/hero-tests/<class>.ts`, run by the smoke test)

`common.ts` provides these helpers:

- `figureChecks`: budget, GPU packing, chains, finite animation
- `simulate(id, fps, secs, action)`: `PuppetAnimator` frames
- `anticipation(id, bone, point)`: `{ back, forward }` of a weapon point
- `chainLag(id, slot, type)`: how far the chain tip trails behind the rigid pose
- `travel(id, type)`: total motion
- `poseDistance(a, b, type)`: how different two rigs animate
- `worldPoint`
- `rigidBones`

Run: `node --experimental-strip-types scripts/smoke-test.ts` (it must end with
«✅ Todo correcto») and `npx tsc --noEmit`.

## Visual check and frame captures

1. `npm run dev` (port 5173) → `http://localhost:5173/mazos-y-mazmorras/` → «🎭 Galería de sprites».
2. `node scripts/frame-sink.mjs <output-dir>` (port 5199) receives the PNGs.
3. With the gallery open, run this in the page:
   ```js
   const cap = await import('/mazos-y-mazmorras/scripts/sprite-capture.ts');
   await cap.captureAction({ sprite: 'hero:barbaro', action: 'attack', dir: 'barbaro', frames: 12 });
   // sprite keys: 'hero:<clase>', 'form:<lobo|oso|aguila|enjambre|lunar|estelar>'
   ```
   It writes `<dir>/<action>-NN.png` and `<dir>/<action>-sheet.png`. Frames are
   stepped at a fixed 60 fps, so it also works while the browser pane is hidden.
4. Repeat with `?render=svg` to check the SVG fallback.
