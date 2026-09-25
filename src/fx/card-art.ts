// Card illustrations in the bestiary's illustrated style. Each card gets a
// scene: a few motifs (weapons, flames, runes, creatures…) placed on a 140×80
// frame, drawn once by the WebGL puppet renderer into a static image (see
// ui/card-art-render.ts). Pure data, testable in node.

import type { CartaDef } from '../core/types.ts';
import { C, E, P, L, type PuppetRig, type Shape } from './puppet.ts';
import { ENEMY_RIGS, INVOCATION_RIGS } from './enemy-rigs.ts';
import { FORM_RIGS } from './hero-rig.ts';

export const SCENE_W = 140;
export const SCENE_H = 80;
/** Full-art (unique class cards) scenes are portrait: 140×200. */
export const FULL_H = 200;

type Pt = [number, number];
const c = (k: string, x: number, y: number, r: number) => C('root', k, x, y, r);
const e = (k: string, x: number, y: number, rx: number, ry: number) => E('root', k, x, y, rx, ry);
const p = (k: string, pts: Pt[]) => P('root', k, pts);
const l = (k: string, x1: number, y1: number, x2: number, y2: number, w: number) => L('root', k, x1, y1, x2, y2, w);

/** Points on a circle arc (degrees, 0 = right, clockwise on screen). */
const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n: number): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / (n - 1)) * Math.PI) / 180;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Pt;
  });
const star = (k: string, n: number, r0: number, r1: number, rot = -90): Shape =>
  p(k, Array.from({ length: n * 2 }, (_, i) => {
    const a = ((rot + (i * 180) / n) * Math.PI) / 180, r = i % 2 ? r0 : r1;
    return [Math.cos(a) * r, Math.sin(a) * r] as Pt;
  }));

// ── Motif library (local frame, roughly ±20 units, facing right) ─────────────
const MOTIFS: Record<string, () => Shape[]> = {
  sword: () => [
    p('metal', [[-1.8, 12], [1.8, 12], [1.4, -17], [0, -21], [-1.4, -17]]), l('ink', 0, 10, 0, -15, 0.5),
    l('gold', -7, 12, 7, 12, 2.2), l('leather', 0, 13, 0, 19, 2.4), c('gold', 0, 20.5, 1.8),
  ],
  dagger: () => [
    p('metal', [[-2.8, 6], [2.8, 6], [1.6, -12], [0, -19], [-1.6, -12]]), l('edge', 0.6, 4, 0.3, -14, 0.7),
    l('gold', -6.5, 6, 6.5, 6, 2.4), l('leather', 0, 7.5, 0, 14, 3), c('gold', 0, 15.5, 2),
  ],
  axe: () => [
    l('wood', 0, 20, 0, -18, 2.8),
    p('metal', [[0, -18], [10, -23], [14, -12], [10, -3], [0, -8]]), l('edge', 10.8, -22, 13.4, -5, 0.8),
    p('metal', [[0, -16], [-6, -14], [0, -11]]), l('leather', 0, 10, 0, 16, 3.4),
  ],
  hammer: () => [
    l('wood', 0, 20, 0, -8, 2.8), p('metal', [[-9, -18], [9, -18], [9, -6], [-9, -6]]),
    l('ink', -9, -12, 9, -12, 0.5), p('metal', [[9, -15], [13, -14], [13, -10], [9, -9]]),
  ],
  scythe: () => [
    l('wood', -4, 20, 2, -18, 2.4),
    p('metal', [[2, -18], [-6, -20], [-16, -16], [-22, -8], [-14, -12], [-4, -14], [2, -14]]), l('edge', -20, -9, -6, -18, 0.6),
  ],
  shield: () => [
    p('metal', [[-13, -15], [13, -15], [13, 0], [0, 17], [-13, 0]]),
    p('cloth', [[-10.5, -12.5], [10.5, -12.5], [10.5, -1], [0, 13.5], [-10.5, -1]]),
    l('gold', 0, -12, 0, 12, 2), l('gold', -10, -4, 10, -4, 2), c('gold', 0, -4, 3),
  ],
  roundShield: () => [
    e('metal', 0, 0, 16, 16), e('wood', 0, 0, 13.5, 13.5),
    l('ink', -6, -13, -6, 13, 0.6), l('ink', 6, -13, 6, 13, 0.6), c('metal', 0, 0, 4), c('edge', -1, -1, 1.4),
  ],
  barkShield: () => [
    e('bark', 0, 0, 16, 16), l('ink', -8, -12, -6, 12, 0.6), l('ink', 2, -14, 4, 14, 0.6), l('ink', 10, -8, 9, 9, 0.6),
    e('leaf', -10, -12, 5, 2.4), e('leaf', 11, -11, 4.5, 2.2), e('leaf', 12, 10, 4, 2),
  ],
  fist: () => [
    l('leather', -4, 10, -7, 20, 8),
    p('skin', [[-10, -5], [8, -8], [12, -2], [11, 9], [-8, 10], [-12, 3]]),
    l('ink', -2, -6, -2, 0, 0.6), l('ink', 3, -7, 3, -1, 0.6), l('ink', 8, -6, 8, 0, 0.6),
    l('skin', -9, 2, 1, 5, 4.2),
  ],
  hand: () => [
    l('cloth', -6, 12, -9, 22, 7),
    p('skin', [[-9, -2], [6, -4], [8, 10], [-7, 12]]),
    l('skin', -7, -2, -9, -14, 3), l('skin', -2, -3, -2, -17, 3), l('skin', 3, -3, 5, -16, 3), l('skin', 7, -2, 11, -11, 2.8),
    l('skin', -8, 6, -16, 0, 3),
  ],
  claws: () => [
    p('slash', [[-14, -16], [-11, -17], [6, 16], [3, 16]]),
    p('slash', [[-6, -18], [-3, -19], [14, 14], [11, 15]]),
    p('slash', [[2, -19], [5, -20], [20, 10], [17, 11]]),
  ],
  paw: () => [
    e('fur', 0, 6, 9, 7.5), c('fur', -9, -6, 3.6), c('fur', -3, -11, 3.8), c('fur', 4, -11, 3.8), c('fur', 10, -5, 3.6),
    p('bone', [[-10, -9], [-11, -14], [-8, -10]]), p('bone', [[-3, -14], [-3, -19], [-1, -14]]),
    p('bone', [[4, -14], [5, -19], [6, -14]]), p('bone', [[10, -8], [12, -13], [12, -8]]),
  ],
  fang: () => [p('bone', [[-5, -14], [5, -14], [3, 4], [0, 15], [-3, 4]]), l('ink', -1, -10, -0.5, 6, 0.5), p('flesh', [[-7, -18], [7, -18], [5, -13], [-5, -13]])],
  flame: () => [
    p('fire', [[0, -21], [6, -9], [11, -1], [9, 10], [0, 15], [-9, 10], [-11, 0], [-5, -6], [-2, -14]]),
    p('flameCore', [[0, -9], [4, 0], [5, 7], [0, 11], [-5, 7], [-4, 1]]),
  ],
  fireball: () => [
    p('fire', [[-22, -8], [-6, -9], [-4, 9], [-24, 6], [-14, 0]]),
    c('fire', 0, 0, 10), c('flameCore', 1, -1, 5.5),
  ],
  burst: () => [star('fire', 8, 9, 20, -80), star('flameCore', 8, 5, 11, -60)],
  sun: () => [star('gold', 8, 11, 19), c('flameCore', 0, 0, 9)],
  bolt: () => [p('bolt', [[5, -21], [-7, -2], [0, -2], [-6, 21], [9, -5], [2, -5], [9, -21]])],
  ice: () => [
    p('ice', [[0, -20], [5, -6], [0, 20], [-5, -6]]), p('ice', [[-14, -4], [-4, -2], [2, 8], [-8, 4]]),
    p('ice', [[14, -8], [4, -2], [2, 8], [10, 4]]), l('frost', 0, -16, 0, 14, 0.8),
  ],
  snowflake: () => [
    l('ice', -16, 0, 16, 0, 2.6), l('ice', -8, -14, 8, 14, 2.6), l('ice', 8, -14, -8, 14, 2.6),
    l('ice', 10, -4, 12, 0, 1.4), l('ice', -10, 4, -12, 0, 1.4), c('frost', 0, 0, 3),
  ],
  leaf: () => [p('leaf', [[0, -16], [8, -4], [6, 8], [0, 14], [-6, 8], [-8, -4]]), l('ink', 0, -12, 0, 12, 0.6), l('ink', 0, -2, 4, -6, 0.4), l('ink', 0, 4, -4, 0, 0.4)],
  vines: () => [
    l('bark', -20, 18, -10, 6, 2.6), l('bark', -10, 6, -2, 10, 2.4), l('bark', -2, 10, 8, -2, 2.2), l('bark', 8, -2, 18, -12, 2),
    e('leaf', -12, 2, 4.5, 2.2), e('leaf', 0, 14, 4, 2), e('leaf', 10, -8, 4.5, 2.2), e('leaf', 17, -16, 4, 2),
    l('bark', -4, 9, -8, -8, 1.6), e('leaf', -9, -11, 3.6, 1.8),
  ],
  roots: () => [
    l('bark', 0, 20, 0, 4, 5), l('bark', 0, 4, -10, -10, 3.4), l('bark', 0, 4, 10, -12, 3.4), l('bark', -10, -10, -18, -12, 2.2),
    l('bark', 10, -12, 16, -19, 2.2), l('bark', 0, 8, 12, 8, 2.4), l('bark', 12, 8, 19, 2, 1.8), l('bark', 0, 12, -14, 12, 2.4),
    l('ink', -1, 18, -1, 6, 0.6),
  ],
  thorns: () => [
    l('bark', -20, 10, 20, -6, 3),
    p('bark', [[-12, 6], [-14, -2], [-9, 5]]), p('bark', [[-2, 2], [-2, -7], [1, 2]]), p('bark', [[8, -2], [10, -10], [11, -2]]),
    p('bark', [[-6, 5], [-5, 12], [-3, 4]]), p('bark', [[4, 1], [6, 8], [7, 0]]), e('leaf', 16, -10, 4, 2),
  ],
  tree: () => [
    p('bark', [[-4, 20], [-3, 0], [-9, -6], [-2, -4], [0, -10], [3, -4], [9, -8], [3, 0], [4, 20]]),
    c('leaf', -8, -12, 8), c('leaf', 6, -14, 9), c('leaf', 0, -20, 7), c('leaf', 12, -6, 6), c('leaf', -13, -3, 5.5),
  ],
  moon: () => [p('moonGlow', [...arc(0, 0, 15, 60, 300, 9), ...arc(6, 0, 12, 285, 75, 7)])],
  fullMoon: () => [c('moonGlow', 0, 0, 14), c('stone', -4, -3, 2.6), c('stone', 5, 4, 1.8), c('stone', 3, -6, 1.3)],
  star: () => [star('starGlow', 5, 5, 13)],
  sparkle: () => [star('starGlow', 4, 2, 9, 0)],
  skull: () => [
    c('bone', 0, -2, 11),
    p('bone', [[-7, 5], [7, 5], [6, 13], [-6, 13]]),
    c('socket', -4.5, -2, 3.2), c('socket', 4.5, -2, 3.2), p('socket', [[0, 2], [2, 6], [-2, 6]]),
    l('ink', -5, 10, 5, 10, 0.6), l('ink', -2.5, 8, -2.5, 12, 0.5), l('ink', 2.5, 8, 2.5, 12, 0.5),
    c('eyeGlow', -4.5, -2, 1.3), c('eyeGlow', 4.5, -2, 1.3),
  ],
  heart: () => [p('blood', Array.from({ length: 16 }, (_, i) => {
    const t = (i / 16) * Math.PI * 2;
    return [16 * Math.sin(t) ** 3 * 0.9, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 0.9] as Pt;
  })), c('sparkle', -6, -6, 1.8)],
  drop: () => [p('blood', [[0, -15], [7, -1], [7, 7], [0, 13], [-7, 7], [-7, -1]]), c('frost', -3, 2, 1.6)],
  potion: () => [
    p('sclera', [[-3, -16], [3, -16], [3, -8], [10, 2], [8, 14], [-8, 14], [-10, 2], [-3, -8]]),
    p('poison', [[-9, 4], [9, 4], [8, 13], [-8, 13]]), l('wood', 0, -20, 0, -15, 5), c('frost', -5, 7, 1.2),
  ],
  goblet: () => [
    p('gold', [[-11, -14], [11, -14], [8, -2], [2, 2], [-2, 2], [-8, -2]]), e('blood', 0, -13, 10, 2.4),
    l('gold', 0, 2, 0, 13, 2.4), e('gold', 0, 15, 8, 2.6),
  ],
  scroll: () => [
    p('card', [[-14, -12], [14, -12], [14, 12], [-14, 12]]), l('card', -16, -13, -16, 13, 5), l('card', 16, -13, 16, 13, 5),
    l('ink', -9, -6, 9, -6, 0.6), l('ink', -9, -1, 7, -1, 0.6), l('ink', -9, 4, 9, 4, 0.6), c('redMagic', 8, 8, 2.2),
  ],
  book: () => [
    p('leather', [[-20, -12], [0, -9], [20, -12], [20, 13], [0, 15], [-20, 13]]),
    p('card', [[-18, -11], [0, -8], [0, 13], [-18, 11]]), p('card', [[18, -11], [0, -8], [0, 13], [18, 11]]),
    l('ink', -14, -4, -4, -2, 0.5), l('ink', -14, 1, -4, 3, 0.5), l('ink', 4, -2, 14, -4, 0.5), l('ink', 4, 3, 14, 1, 0.5),
    c('magic', 9, 7, 2),
  ],
  tome: () => [
    p('cloth', [[-13, -16], [13, -16], [13, 16], [-13, 16]]), l('gold', -13, -16, -13, 16, 2.2),
    p('gold', [[-4, -6], [4, -6], [4, 6], [-4, 6]]), c('magic', 0, 0, 2.4), l('metal', -14, -4, 14, -4, 1.4),
  ],
  quill: () => [
    p('feather', [[8, -20], [14, -14], [4, 6], [-2, 12], [0, 4]]), l('ink', 11, -16, -3, 13, 0.6), p('socket', [[-2, 12], [-5, 18], [0, 14]]),
  ],
  runes: () => [
    ...Array.from({ length: 12 }, (_, i): Shape => {
      const [a0, a1] = [i * 30 + 4, i * 30 + 24].map((d) => (d * Math.PI) / 180);
      return l('magic', Math.cos(a0) * 16, Math.sin(a0) * 16, Math.cos(a1) * 16, Math.sin(a1) * 16, 1.6);
    }),
    l('magic', 0, -12, 10.4, 6, 1), l('magic', 10.4, 6, -10.4, 6, 1), l('magic', -10.4, 6, 0, -12, 1),
  ],
  hexagram: () => [
    star('magic', 6, 7, 16), c('void', 0, 0, 5), c('voidCore', 0, 0, 2),
  ],
  orb: () => [c('magic', 0, 0, 10), c('sparkle', -3.5, -3.5, 2.2), p('gold', [[-8, 8], [-4, 12], [4, 12], [8, 8], [5, 14], [-5, 14]])],
  voidOrb: () => [c('void', 0, 0, 11), c('voidCore', 0, 0, 6), c('sparkle', -3, -3, 1.6)],
  eye: () => [
    p('flesh', [[-18, 0], [-8, -10], [8, -10], [18, 0], [8, 10], [-8, 10]]),
    e('sclera', 0, 0, 12, 7.5), c('magic', 0, 0, 6), c('ink', 0.5, 0, 2.6), l('ink', -12, -5, 12, -5, 0.7),
  ],
  tentacle: () => [
    l('flesh', -16, 20, -12, 6, 6), l('flesh', -12, 6, -2, -2, 5), l('flesh', -2, -2, 8, -4, 4), l('flesh', 8, -4, 14, -12, 3),
    l('flesh', 14, -12, 12, -18, 2), c('sclera', -10, 10, 1.4), c('sclera', -5, 2, 1.2), c('sclera', 3, -2, 1), c('sclera', 10, -6, 0.8),
  ],
  wing: () => [
    p('wing', [[-18, 10], [-10, -8], [2, -18], [16, -20], [10, -10], [16, -8], [8, 0], [12, 4], [0, 8], [2, 12], [-8, 12]]),
    l('ink', -14, 8, 14, -18, 0.6), l('ink', -8, 10, 13, -7, 0.5), l('ink', -3, 11, 10, 3, 0.5),
  ],
  feather: () => [p('feather', [[0, -18], [7, -8], [5, 8], [0, 16], [-5, 8], [-6, -8]]), l('ink', 0, -16, 0, 19, 0.8), l('ink', 0, -4, 5, -8, 0.4), l('ink', 0, 4, -4, 0, 0.4)],
  bat: () => [
    p('wing', [[-4, 0], [-20, -10], [-16, 0], [-20, 6], [-10, 4], [-6, 8]]), p('wing', [[4, 0], [20, -10], [16, 0], [20, 6], [10, 4], [6, 8]]),
    e('fur', 0, 1, 5, 7), p('fur', [[-4, -5], [-5, -11], [-1, -6]]), p('fur', [[4, -5], [5, -11], [1, -6]]),
    c('eyeGlow', -2, -2, 1), c('eyeGlow', 2, -2, 1),
  ],
  arrow: () => [l('wood', -18, 0, 12, 0, 1.6), p('metal', [[12, -3.5], [20, 0], [12, 3.5]]), p('cloth', [[-18, 0], [-22, -5], [-14, 0]]), p('cloth', [[-18, 0], [-22, 5], [-14, 0]])],
  chain: () => [0, 1, 2, 3, 4].flatMap((i): Shape[] => {
    const x = -16 + i * 8, v = i % 2 === 0;
    return [e('metal', x, 0, v ? 5.4 : 3.6, v ? 3.6 : 5.4), e('socket', x, 0, v ? 3 : 1.4, v ? 1.4 : 3)];
  }),
  pouch: () => [
    p('leather', [[-10, -6], [10, -6], [14, 8], [8, 14], [-8, 14], [-14, 8]]), l('gold', -8, -6, 8, -6, 2),
    p('leather', [[-6, -6], [-3, -14], [3, -14], [6, -6]]), c('gold', 12, 12, 3.4), c('gold', 17, 8, 3), c('gold', -14, 14, 3),
  ],
  coins: () => [c('gold', -8, 6, 5), c('gold', 4, 8, 5), c('gold', -2, -2, 5), l('ink', -11, 6, -5, 6, 0.6), l('ink', 1, 8, 7, 8, 0.6), l('ink', -5, -2, 1, -2, 0.6)],
  crown: () => [p('gold', [[-15, 8], [-15, -6], [-9, 0], [-5, -12], [0, -2], [5, -12], [9, 0], [15, -6], [15, 8]]), c('gem', 0, 3, 2.4), c('redMagic', -9, 4, 1.6), c('redMagic', 9, 4, 1.6)],
  hourglass: () => [
    l('wood', -12, -18, 12, -18, 3), l('wood', -12, 18, 12, 18, 3), l('wood', -11, -18, -11, 18, 1.8), l('wood', 11, -18, 11, 18, 1.8),
    p('sclera', [[-8, -16], [8, -16], [1, 0], [8, 16], [-8, 16], [-1, 0]]), p('gold', [[-5, 8], [5, 8], [7, 15], [-7, 15]]), p('gold', [[-3, -12], [3, -12], [0, -6]]),
  ],
  mask: () => [
    p('card', [[-12, -14], [12, -14], [13, 0], [8, 12], [0, 16], [-8, 12], [-13, 0]]),
    e('socket', -5, -4, 3.6, 2.2), e('socket', 5, -4, 3.6, 2.2), l('ink', -5, 7, 5, 7, 0.9), c('gold', 0, -10, 1.6),
  ],
  hat: () => [e('hat', 0, 12, 20, 5), p('hat', [[-12, 12], [12, 12], [4, -6], [-6, -20], [-4, -4]]), p('gold', [[-11, 8], [11, 8], [12, 12], [-12, 12]]), c('starGlow', 0, 0, 2)],
  playingCard: () => [p('card', [[-9, -13], [9, -13], [9, 13], [-9, 13]]), l('ink', -7, -11, 7, -11, 0.4), c('blood', 0, 0, 3.2), p('blood', [[-3, 1], [3, 1], [0, 6]])],
  horn: () => [p('horn', [[-12, 14], [-8, 4], [-2, -6], [6, -14], [13, -18], [9, -9], [3, 1], [-4, 12]]), l('ink', -8, 8, -3, 11, 0.6), l('ink', -3, -1, 2, 2, 0.6)],
  warHorn: () => [
    p('horn', [[-18, 4], [-6, -4], [8, -10], [18, -16], [16, -4], [6, 4], [-8, 10], [-18, 10]]),
    l('gold', -2, -6, 0, 8, 2.4), l('gold', 10, -12, 12, 0, 2.2), l('leather', -14, 8, 14, -4, 1),
  ],
  cloud: () => [e('cloudy', 0, 6, 18, 7), c('cloudy', -8, 0, 7), c('cloudy', 3, -4, 9), c('cloudy', 12, 2, 6)],
  spiral: () => Array.from({ length: 13 }, (_, i): Shape => {
    const a0 = i * 0.75, a1 = (i + 1) * 0.75, r0 = 2 + i * 1.4, r1 = 2 + (i + 1) * 1.4;
    return l(i % 2 ? 'magic' : 'voidCore', Math.cos(a0) * r0, Math.sin(a0) * r0, Math.cos(a1) * r1, Math.sin(a1) * r1, 2.2 - i * 0.08);
  }),
  voidSpiral: () => [c('void', 0, 0, 18), ...Array.from({ length: 12 }, (_, i): Shape => {
    const a0 = i * 0.8, a1 = (i + 1) * 0.8, r0 = 1.5 + i * 1.3, r1 = 1.5 + (i + 1) * 1.3;
    return l('voidCore', Math.cos(a0) * r0, Math.sin(a0) * r0, Math.cos(a1) * r1, Math.sin(a1) * r1, 1.6);
  })],
  wave: () => [
    p('water', [[-20, 12], [-17, 0], [-9, -9], [1, -12], [11, -8], [7, -3], [1, -5], [-3, 1], [2, 6], [20, 5], [20, 14], [-20, 14]]),
    c('frost', 8, -9, 2), c('frost', 12, -6, 1.4), l('ink', -14, 8, 14, 9, 0.5),
  ],
  wind: () => [
    l('breeze', -18, -8, 2, -8, 1.3), l('breeze', 2, -8, 8, -11, 1.1), l('breeze', 8, -11, 7, -15, 0.9),
    l('breeze', -12, 2, 12, 2, 1.3), l('breeze', 12, 2, 15, -1, 1),
    l('breeze', -18, 12, 0, 12, 1.3), l('breeze', 0, 12, 6, 15, 1), l('breeze', 6, 15, 10, 13, 0.8),
  ],
  rock: () => [p('stone', [[-16, 12], [-14, -4], [-6, -13], [6, -12], [15, -3], [17, 12]]), l('ink', -6, -8, -2, 4, 0.7), l('ink', -2, 4, 6, 8, 0.6), l('ink', 8, -8, 10, 0, 0.6)],
  web: () => [
    ...[0, 60, 120].map((d): Shape => { const a = (d * Math.PI) / 180; return l('frost', -Math.cos(a) * 18, -Math.sin(a) * 18, Math.cos(a) * 18, Math.sin(a) * 18, 0.7); }),
    ...[7, 13].flatMap((r) => Array.from({ length: 6 }, (_, i): Shape => {
      const a0 = (i * 60 * Math.PI) / 180, a1 = ((i + 1) * 60 * Math.PI) / 180;
      return l('frost', Math.cos(a0) * r, Math.sin(a0) * r, Math.cos(a1) * r, Math.sin(a1) * r, 0.6);
    })),
  ],
  candle: () => [l('wax', 0, 16, 0, -4, 6), p('wax', [[3, -4], [4, 4], [2, 2]]), p('fire', [[-2.4, -6], [0, -14], [2.4, -6]]), c('flameCore', 0, -7, 1.2)],
  gem: () => [p('gem', [[-8, -4], [-4, -10], [4, -10], [8, -4], [0, 12]]), l('ink', -8, -4, 8, -4, 0.5), l('ink', -3, -4, 0, 11, 0.4), l('ink', 3, -4, 0, 11, 0.4)],
  bone: () => [l('bone', -14, 8, 14, -8, 3.6), c('bone', -15, 6, 3), c('bone', -13, 10, 3), c('bone', 15, -6, 3), c('bone', 13, -10, 3)],
  footprints: () => [e('leather', -12, 10, 3, 5), e('leather', -4, 2, 3, 5), e('leather', 4, 8, 3, 5), e('leather', 12, 0, 3, 5)],
  soul: () => [p('soul', [[0, 16], [-8, 2], [-7, -8], [0, -14], [7, -8], [8, 2]]), c('socket', -2.5, -5, 1.4), c('socket', 2.5, -5, 1.4)],
  wand: () => {
    const tip = star('starGlow', 5, 3, 7) as Extract<Shape, { t: 'p' }>;
    return [l('wood', -14, 14, 10, -10, 2.2), l('gold', -14, 14, -9, 9, 2.6), p('starGlow', tip.pts.map(([x, y]) => [x + 12, y - 12] as Pt))];
  },
  cloak: () => [
    p('cloth', [[-6, -18], [6, -18], [14, 18], [8, 14], [4, 18], [0, 14], [-4, 18], [-8, 14], [-14, 18]]),
    p('socket', [[-5, -12], [5, -12], [4, -2], [-4, -2]]), c('eyeGlow', -2, -8, 1), c('eyeGlow', 2, -8, 1),
  ],
};

// ── Creatures from the bestiary, normalised to the motif box ─────────────────
const CREATURES: Record<string, () => { shapes: Shape[]; palette: Record<string, string> }> = {
  lobo: () => INVOCATION_RIGS.lobo, oso: () => INVOCATION_RIGS.oso, fuego: () => INVOCATION_RIGS.fuego,
  agua: () => INVOCATION_RIGS.agua, aire: () => INVOCATION_RIGS.aire, arbol: () => INVOCATION_RIGS.arbol,
  tierra: () => INVOCATION_RIGS.tierra, sabueso: () => INVOCATION_RIGS.sabueso, demonio: () => INVOCATION_RIGS.demonio,
  aguila: () => ({ shapes: FORM_RIGS.aguila.shapes, palette: { feather: '#6a5238', eye: '#140d0a' } }),
  enjambre: () => ({ shapes: FORM_RIGS.enjambre.shapes, palette: { bug: '#4a4a30', eye: '#9fe06a' } }),
  ninja: () => ENEMY_RIGS['ninja-sombras'],
};

function bbox(shapes: Shape[]): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (x: number, y: number, r = 0) => { x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r); };
  for (const s of shapes) {
    if (s.t === 'c') add(s.x, s.y, s.r);
    else if (s.t === 'e') add(s.x, s.y, Math.max(s.rx, s.ry));
    else if (s.t === 'l') { add(s.x1, s.y1, s.w / 2); add(s.x2, s.y2, s.w / 2); }
    else s.pts.forEach(([x, y]) => add(x, y));
  }
  return [x0, y0, x1, y1];
}

/** Moves, scales, rotates and flips shapes; everything ends on the root bone.
 *  Rotated ellipses become polygons (the renderer only has axis-aligned ones). */
function place(shapes: Shape[], x: number, y: number, s: number, rot: number, flip: boolean, remap: Record<string, string>): Shape[] {
  const r = (rot * Math.PI) / 180, cs = Math.cos(r), sn = Math.sin(r);
  const T = (px: number, py: number): Pt => { const fx = flip ? -px : px; return [x + (fx * cs - py * sn) * s, y + (fx * sn + py * cs) * s]; };
  const k = (key: string) => remap[key] ?? key;
  return shapes.map((sh): Shape => {
    if (sh.t === 'c') { const [cx, cy] = T(sh.x, sh.y); return { t: 'c', b: 'root', k: k(sh.k), x: cx, y: cy, r: sh.r * s }; }
    if (sh.t === 'l') { const [x1, y1] = T(sh.x1, sh.y1), [x2, y2] = T(sh.x2, sh.y2); return { t: 'l', b: 'root', k: k(sh.k), x1, y1, x2, y2, w: sh.w * s }; }
    if (sh.t === 'p') return { t: 'p', b: 'root', k: k(sh.k), pts: sh.pts.map(([px, py]) => T(px, py)) };
    if (rot % 180 === 0) { const [cx, cy] = T(sh.x, sh.y); return { t: 'e', b: 'root', k: k(sh.k), x: cx, y: cy, rx: sh.rx * s, ry: sh.ry * s }; }
    return { t: 'p', b: 'root', k: k(sh.k), pts: arc(0, 0, 1, 0, 337.5, 16).map(([ux, uy]) => T(sh.x + ux * sh.rx, sh.y + uy * sh.ry)) };
  });
}

// ── Palettes ─────────────────────────────────────────────────────────────────
const BASE_PALETTE: Record<string, string> = {
  metal: '#9aa3aa', edge: '#e2e6ea', gold: '#c9a040', leather: '#6b4a30', wood: '#7a5530', cloth: '#8a2e24', skin: '#d8a882',
  fire: '#ff8a2a', flameCore: '#ffe08a', bolt: '#fff08a', ice: '#bfe6ff', frost: '#e8f8ff', leaf: '#6f9a3a', bark: '#6a4a2e',
  moonGlow: '#eef2ff', starGlow: '#fff4c8', bone: '#e0d6bc', socket: '#1a120e', eyeGlow: '#ff5a3a', blood: '#a8201a',
  water: '#3a7ab0', poison: '#7ce05a', magic: '#a98bff', sclera: '#ece4d4', card: '#eadcb8', flesh: '#8a5a6a', wing: '#4a2a3a',
  void: '#4a1a78', voidCore: '#e0b0ff', wind: '#b8c8d8', breeze: '#eef4f8', toxic: '#86a850', stone: '#7a7068', fur: '#7a6a58', gem: '#7ae0ff', wax: '#e8dcc0',
  slash: '#fff2d8', cloudy: '#7a8a6a', soul: '#9fe8ff', hat: '#3a3aa0', feather: '#e8e0d0', violetFire: '#c070ff',
  violetCore: '#f0d0ff', greenFire: '#8ce06a', redMagic: '#ff5a5a', horn: '#d8c7a0', sparkle: '#fff8e0', ink: '#140d0a',
};

export interface ClassLook { top: string; bottom: string; glow: string; magic: string; rim: string }
export const CLASS_LOOK: Record<CartaDef['clase'], ClassLook> = {
  druida: { top: '#34502c', bottom: '#131f11', glow: '#a8e070', magic: '#9fe06a', rim: 'rgba(210,255,170,0.55)' },
  barbaro: { top: '#5e2a1a', bottom: '#210d07', glow: '#ff9a50', magic: '#ff9a5a', rim: 'rgba(255,200,150,0.55)' },
  mago: { top: '#2e2c60', bottom: '#0f0f2c', glow: '#a896ff', magic: '#a98bff', rim: 'rgba(200,190,255,0.55)' },
  picaro: { top: '#1f3c3a', bottom: '#0b1918', glow: '#72e0cc', magic: '#6fe0c8', rim: 'rgba(170,255,235,0.5)' },
  brujo: { top: '#381c50', bottom: '#11071c', glow: '#c98bff', magic: '#c070ff', rim: 'rgba(225,180,255,0.55)' },
  neutral: { top: '#4c4436', bottom: '#1c1812', glow: '#ffe0a0', magic: '#ffd07a', rim: 'rgba(255,235,190,0.55)' },
};

// ── Scenes: "motif@x,y,scale[,rot][,f]{key=key}" separated by ';' (~ = creature) ─
const SCENES: Record<string, string> = {
  golpe: 'claws@88,40,1.2{slash=slash};sword@62,42,1.55,-40',
  defender: 'shield@70,40,1.7',
  // Druida
  zarpazo: 'paw@56,44,1.2,-15;claws@90,40,1.3',
  mordisco: 'fang@58,32,1.3,-8;fang@82,32,1.3,8,f;drop@70,64,0.6',
  'piel-corteza': 'barkShield@70,40,1.8;leaf@100,20,0.7,30',
  enredadera: 'vines@70,42,2.2;leaf@30,20,0.6,-30',
  'zarpa-doble': 'claws@56,40,1.2;claws@90,42,1.2,10;paw@30,64,0.6',
  aullido: '~lobo@62,46,1.5,-8;wind@108,32,0.9;moon@28,20,0.7',
  'forma-lobo': 'moon@102,22,0.9;~lobo@62,48,1.7',
  'forma-oso': '~oso@70,46,1.8;leaf@110,20,0.6',
  'forma-aguila': '~aguila@72,40,1.6;feather@24,56,0.8,30',
  'forma-enjambre': '~enjambre@70,40,1.8;leaf@110,62,0.6,40',
  'raices-estranguladoras': 'roots@70,44,2.1;skull@104,56,0.6',
  espinas: 'thorns@70,40,2.1;drop@110,24,0.5',
  'luna-creciente': 'moon@70,40,2.2;star@30,22,0.6;star@112,60,0.45',
  'pacto-bosque': 'hand@62,48,1.4;leaf@88,24,0.8,25;leaf@102,44,0.6,-20;leaf@44,20,0.6,-40',
  'comunion-salvaje': 'feather@56,40,1.3,-25;feather@84,40,1.3,25,f;leaf@70,66,0.6',
  'oso-espiritual': '~oso@70,46,1.7{fur=ice,furD=wind,mane=ice,belly=frost};sparkle@28,22,0.7;sparkle@112,24,0.5',
  'elemental-agua': '~agua@70,42,1.8;wave@24,64,0.6',
  'elemental-fuego': '~fuego@70,42,1.8;flame@24,60,0.5',
  'elemental-aire': '~aire@70,42,1.8;wind@112,30,0.7',
  'vinculo-feroz': 'paw@52,44,1.1,-10;heart@90,40,1.0',
  'corazon-cambiante': 'heart@70,40,1.3;vines@70,44,1.6{leaf=leaf}',
  'circulo-tierra': 'runes@70,40,2.1;rock@70,44,1.1',
  'circulo-luna': 'runes@70,40,2.1;fullMoon@70,40,1.1',
  'circulo-mar': 'runes@70,40,2.1;wave@70,44,1.1',
  'circulo-estrellas': 'runes@70,40,2.1;star@70,40,1.0;sparkle@50,24,0.5;sparkle@92,58,0.5',
  'guardian-roble': '~arbol@70,44,1.9;leaf@112,22,0.6',
  'elemental-tierra': '~tierra@70,44,1.9;rock@24,62,0.5',
  'tormenta-venganza': 'cloud@70,24,1.6;bolt@60,52,1.0,10;bolt@88,56,0.8,-10',
  // Bárbaro
  'furia-primaria': 'flame@54,42,1.4;axe@86,42,1.6,20',
  'golpe-imprudente': 'burst@70,40,1.2;fist@70,42,1.3',
  'tajo-brutal': 'sword@62,42,1.5,-35;sword@78,42,1.5,35,f',
  'postura-firme': 'rock@70,56,1.6;roundShield@70,34,1.2',
  'grito-intimidante': 'warHorn@62,44,1.5;wind@104,36,0.9',
  'golpe-pomo': 'hammer@70,42,1.6,-25;burst@96,26,0.5',
  'furia-creciente': 'flame@44,50,0.8;flame@70,44,1.1;flame@98,36,1.5',
  'furia-agil': 'axe@62,42,1.4,-30;wind@100,40,0.9',
  'golpe-demoledor': 'hammer@62,38,1.5,-45;rock@96,54,1.0',
  'reflejos-acero': 'roundShield@58,42,1.3;sword@86,40,1.3,20',
  'sangre-caliente': 'heart@70,44,1.3;flame@70,22,0.8',
  torbellino: 'wind@70,40,1.8;axe@46,40,1.0,-60;axe@94,40,1.0,120',
  'voto-sangre': 'dagger@60,40,1.6,-25;drop@92,46,1.1',
  'corte-sangrante': 'dagger@64,38,1.7,-50;drop@90,56,0.7;drop@102,40,0.5',
  'doble-tajo': 'claws@60,40,1.1;claws@86,42,1.1,15;sword@70,42,1.3,-60',
  desgarro: 'axe@64,42,1.6,-35;drop@98,54,0.7',
  'hacha-carnicera': 'axe@68,40,1.9,-15;bone@104,60,0.6',
  'furia-sanguinaria': 'skull@70,42,1.4{bone=blood,socket=socket};flame@44,48,0.7;flame@96,48,0.7',
  'sed-de-sangre': 'fang@60,34,1.2,-8;fang@80,34,1.2,8,f;goblet@104,58,0.6',
  'senda-berserker': 'skull@70,40,1.2;axe@48,44,1.2,-40;axe@92,44,1.2,40,f',
  'senda-corazon-salvaje': 'heart@70,42,1.4;paw@104,62,0.6;paw@36,24,0.5,20',
  'senda-arbol-mundo': 'tree@70,44,1.7;roots@70,70,1.0;star@70,12,0.5',
  'senda-fanatico': 'bolt@70,40,1.5;axe@52,46,1.2,-30',
  'reabrir-heridas': 'bone@70,44,1.4;claws@70,40,1.1;drop@104,60,0.5',
  'festin-carmesi': 'goblet@70,44,1.5;heart@104,26,0.6',
  'furia-indomita': 'horn@56,42,1.3;horn@84,42,1.3,0,f;flame@70,54,0.9',
  // Mago
  'manos-ardientes': 'hand@56,50,1.3,20;flame@86,34,1.2,30',
  'canalizar-mana': 'candle@70,48,1.4;orb@70,18,0.6;sparkle@100,26,0.5',
  'proyectil-magico': 'orb@44,54,0.6;orb@70,40,0.7;orb@98,26,0.8;sparkle@112,18,0.5',
  'rayo-escarcha': 'ice@70,40,1.6,30;snowflake@106,58,0.6',
  'toque-electrizante': 'hand@56,50,1.3,20;bolt@90,32,1.1,20',
  'armadura-mago': 'runes@70,40,2.0;shield@70,42,1.0{metal=magic,cloth=hat}',
  'truco-magia': 'hat@70,44,1.5;sparkle@104,22,0.7;sparkle@36,24,0.5',
  'escudo-arcano': 'runes@70,40,2.0;gem@70,40,1.1',
  'bola-fuego': 'fireball@74,40,1.8',
  'rayo-abrasador': 'sun@70,40,1.3;bolt@34,44,0.8,40;bolt@106,44,0.8,-40',
  'toque-vampirico': 'bat@70,36,1.6;drop@70,64,0.6',
  'meditacion-arcana': 'runes@70,40,2.0;orb@70,40,0.9;candle@30,54,0.6;candle@110,54,0.6',
  'sacrificio-arcano': 'runes@70,40,1.9{magic=redMagic};drop@70,42,1.0',
  'estudio-arcano': 'book@70,48,1.6;sparkle@70,16,0.6',
  'recuperacion-arcana': 'spiral@70,40,1.6;orb@70,40,0.5',
  'marea-arcana': 'wave@70,48,1.9{water=magic};sparkle@40,20,0.5;sparkle@100,16,0.5',
  acelerar: 'hourglass@66,40,1.4;wind@104,40,0.8',
  'inscripcion-arcana': 'scroll@62,46,1.4;quill@96,30,1.0',
  'glifo-mordiente': 'runes@70,40,1.9;fang@70,40,0.9',
  'dictado-veloz': 'book@62,50,1.3;quill@96,26,1.0,-10',
  'runa-flamigera': 'runes@70,40,1.9{magic=fire};flame@70,40,0.9',
  'runa-de-ruina': 'runes@70,40,1.9{magic=redMagic};skull@70,40,0.8',
  'runa-egida': 'runes@70,40,1.9{magic=gem};shield@70,42,0.8',
  'escuela-evocacion': 'burst@70,40,1.5;fireball@96,24,0.5',
  'escuela-abjuracion': 'runes@70,40,2.0{magic=gem};roundShield@70,40,0.9{wood=hat}',
  'escuela-ilusion': 'mask@58,40,1.2,-12;mask@84,42,1.1,12,f{card=magic}',
  'tratado-prohibido': 'tome@70,40,1.4;chain@70,40,1.3,-25;eye@70,20,0.4',
  'palabra-de-poder': 'runes@70,40,2.1;bolt@70,40,1.0',
  'maestria-conjuros': 'book@70,54,1.3;crown@70,22,0.9;sparkle@104,30,0.5',
  // Pícaro
  'filo-rapido': 'dagger@62,42,1.6,-30;bolt@96,36,0.7',
  pirueta: 'wind@70,40,1.6;feather@96,24,0.7,30',
  'daga-veloz': 'dagger@80,40,1.5,70;wind@42,40,1.0',
  'lanzamiento-daga': 'dagger@48,48,1.1,60;dagger@74,38,1.1,70;dagger@100,30,1.1,80',
  finta: 'spiral@70,40,1.4{voidCore=frost};mask@70,40,0.8',
  'golpe-bajo': 'fist@66,46,1.4;star@100,22,0.5;star@110,36,0.35',
  rodar: 'wind@70,36,1.5;footprints@70,60,1.0',
  distraccion: 'coins@70,50,1.0;sparkle@44,24,0.6;sparkle@96,20,0.6;sparkle@70,14,0.4',
  'punalada-trapera': 'dagger@60,38,1.5,-140;drop@92,54,0.7',
  'ataque-sutil': 'cloak@62,42,1.5;dagger@92,48,0.9,-30',
  'trabajo-de-pies': 'footprints@70,42,1.8;wind@108,24,0.6',
  esfumarse: 'cloud@70,40,1.6{cloudy=stone};dagger@104,58,0.6,-30',
  'mano-rapida': 'hand@60,48,1.3,15;coins@96,30,0.8',
  cuchilladas: 'claws@70,40,1.5;dagger@104,56,0.6,-40',
  preparacion: 'pouch@60,46,1.3;potion@98,40,0.8',
  cambiazo: 'mask@56,42,1.1,-15;playingCard@90,40,1.0,10',
  emboscada: '~ninja@70,44,1.7',
  'filo-toxico': 'dagger@60,40,1.5,-30{metal=poison};drop@96,46,0.8{blood=poison}',
  'giro-veloz': 'wind@70,40,1.5;dagger@44,30,0.9,-60;dagger@96,52,0.9,120',
  atraco: 'pouch@70,44,1.5;coins@30,60,0.6',
  'lluvia-de-dagas': 'dagger@34,26,0.8,180;dagger@58,42,0.8,180;dagger@82,22,0.8,180;dagger@106,40,0.8,180;cloud@70,12,1.2{cloudy=stone}',
  'guardia-de-cuchillas': 'shield@70,40,1.3;dagger@42,42,0.9,-20;dagger@98,42,0.9,20',
  'golpe-septico': 'cloud@70,34,1.3{cloudy=toxic};dagger@70,52,1.0,-40',
  'toxina-paralizante': 'potion@66,42,1.4;drop@100,54,0.6{blood=poison};drop@34,30,0.5{blood=poison}',
  asesino: 'skull@70,38,1.3;dagger@70,50,1.2,-45',
  psionico: 'orb@70,42,1.3{magic=gem};eye@70,40,0.6',
  'embaucador-arcano': 'playingCard@52,44,1.0,-20;playingCard@70,40,1.0;playingCard@88,44,1.0,20;sparkle@70,16,0.6',
  'maestria-cuchillas': 'dagger@60,42,1.5,-30;dagger@80,42,1.5,30,f;crown@70,16,0.5',
  'nube-nauseabunda': 'cloud@70,40,1.9{cloudy=toxic};drop@104,62,0.5{blood=poison}',
  oportunista: 'eye@64,40,1.2;dagger@100,48,0.9,-30',
  'tempestad-acero': 'wind@70,40,1.7;dagger@40,28,0.8,-90;dagger@100,28,0.8,0;dagger@100,58,0.8,90;dagger@40,58,0.8,180',
  'danza-mortal': 'dagger@56,40,1.2,-50;dagger@84,40,1.2,50,f;sparkle@70,18,0.6;wind@70,62,0.8',
  // Brujo
  'explosion-sobrenatural': 'burst@76,40,1.3{fire=violetFire,flameCore=violetCore};voidOrb@76,40,0.8',
  'armadura-agathys': 'roundShield@70,40,1.5{metal=ice,wood=frost};snowflake@104,22,0.6',
  'sacudida-abisal': 'voidSpiral@70,40,1.5',
  'manto-sombras': 'cloak@70,42,1.6{cloth=void}',
  'marca-condena': 'runes@70,40,1.9{magic=voidCore};eye@70,40,0.7',
  'susurro-maldito': 'skull@62,40,1.1{eyeGlow=violetFire};wind@100,40,0.9{breeze=violetCore}',
  'sabueso-sombra': '~sabueso@70,46,1.7',
  oscuridad: 'voidOrb@70,40,1.6;moon@104,20,0.5{moonGlow=voidCore}',
  'canalizar-pacto': 'hexagram@70,40,1.6;sparkle@104,62,0.5',
  'diezmo-sangre': 'eye@70,36,1.1{magic=blood};drop@70,62,0.6',
  'brazos-hadar': 'tentacle@52,42,1.2;tentacle@88,42,1.2,0,f;tentacle@70,48,1.0,-10',
  'invocacion-sobrenatural': '~demonio@70,46,1.8',
  'blindaje-infernal': 'shield@70,42,1.4{cloth=void};flame@36,52,0.7{fire=violetFire,flameCore=violetCore};flame@104,52,0.7{fire=violetFire,flameCore=violetCore}',
  'cosecha-almas': 'scythe@62,40,1.5;soul@98,32,0.7;soul@110,52,0.5',
  'palabra-ruina': 'skull@62,42,1.1;bolt@96,40,1.0{bolt=violetFire}',
  'velo-tinieblas': 'web@70,40,1.9;voidOrb@70,40,0.4',
  'sacrificio-familiar': 'candle@60,46,1.3;bat@98,30,0.8',
  'pacto-sangriento': 'scroll@62,44,1.3;dagger@96,38,1.0,-30;drop@100,60,0.5',
  'verbo-agonizante': 'skull@70,40,1.2;wind@70,40,1.6{breeze=violetCore}',
  'don-del-patron': 'hand@60,48,1.3,15;orb@92,28,0.8{magic=violetFire};eye@92,28,0.35',
  'llamada-vacio': 'voidSpiral@70,40,1.3;warHorn@96,56,0.6{horn=void}',
  'cadenas-carceri': 'chain@70,30,1.5,-15;chain@70,52,1.5,15',
  marchitar: 'leaf@62,42,1.4,-40{leaf=bark};skull@96,54,0.6;drop@40,24,0.4{blood=poison}',
  archifata: 'wing@70,40,1.5{wing=gem};sparkle@40,22,0.6;sparkle@104,60,0.5;star@100,20,0.4',
  celestial: 'sun@70,34,1.1;wing@48,52,1.0,0,f{wing=feather};wing@92,52,1.0{wing=feather}',
  infernal: 'horn@54,40,1.3;horn@86,40,1.3,0,f;flame@70,52,0.9',
  'gran-antiguo': 'eye@70,34,1.5;tentacle@44,56,0.8;tentacle@96,56,0.8,0,f',
  'explosion-trifurcada': 'voidOrb@70,40,0.8;voidOrb@40,26,0.6;voidOrb@100,26,0.6;voidOrb@70,64,0.5',
  'haz-desdoblado': 'voidOrb@70,66,0.5;bolt@56,36,1.2,15{bolt=violetFire};bolt@86,36,1.2,-15{bolt=violetCore}',
  'verbo-aniquilacion': 'voidSpiral@70,40,1.2;skull@70,40,0.9',
  'pacto-final': 'voidSpiral@70,40,1.7;chain@70,62,1.2',
  // Incoloras y generadas
  seducir: 'heart@70,40,1.4{blood=redMagic};sparkle@40,22,0.6;sparkle@100,58,0.5',
  deseo: 'wand@70,42,1.4;sparkle@34,22,0.6;star@108,60,0.5',
  'conjuro-prodigioso': 'scroll@70,46,1.5;runes@70,22,0.7',
  daga: 'dagger@70,40,1.6,45',
};

/** Portrait compositions covering the whole card, for the unique class cards. */
const FULL_SCENES: Record<string, string> = {
  'tormenta-venganza': 'cloud@70,34,2.4{cloudy=stone};cloud@30,58,1.2{cloudy=stone};cloud@112,52,1.1{cloudy=stone};bolt@52,104,1.8,12;bolt@96,118,1.4,-14;bolt@74,150,0.9,6;~aguila@74,176,1.0;leaf@24,130,0.6,40;leaf@118,150,0.6,-30;wind@70,82,1.2',
  'furia-indomita': 'horn@38,70,1.7;horn@102,70,1.7,0,f;skull@70,56,1.1;flame@70,150,1.5;axe@54,122,1.9,-28;axe@86,122,1.9,28,f;flame@26,186,0.8;flame@114,186,0.8;drop@28,110,0.6;drop@112,112,0.5',
  'maestria-conjuros': 'runes@70,92,3.2;runes@70,92,1.8{magic=gem};orb@70,92,1.0;crown@70,34,1.2;book@70,160,1.6;sparkle@26,46,0.8;sparkle@116,62,0.7;star@24,128,0.6;star@118,132,0.5;candle@20,176,0.7;candle@120,176,0.7',
  'danza-mortal': 'wind@70,100,2.4;dagger@70,40,1.2,0;dagger@112,70,1.2,60;dagger@112,130,1.2,120;dagger@70,160,1.2,180;dagger@28,130,1.2,240;dagger@28,70,1.2,300;mask@70,100,1.1;sparkle@40,34,0.6;sparkle@104,182,0.6',
  'pacto-final': 'voidSpiral@70,96,3.0;eye@70,96,0.9{magic=violetFire};chain@70,52,1.6,-20;chain@70,142,1.6,20;tentacle@28,176,1.1;tentacle@112,176,1.1,0,f;skull@70,22,0.7{eyeGlow=violetFire};soul@24,90,0.6;soul@118,104,0.5',
};

export interface CardScene {
  rig: PuppetRig;
  look: ClassLook;
  frame: CartaDef['tipo'];
  /** Portrait full-art scene (140×200) instead of the 140×80 vignette. */
  full: boolean;
}

/** Cards drawn full-art: the unique class cards. */
export const hasFullArt = (def: CartaDef) => def.rareza === 'especial' && def.id in FULL_SCENES;

/** Builds the illustrated scene of a card (throws if the card has none). */
export function cardScene(def: CartaDef, full = false): CardScene {
  const spec = full ? FULL_SCENES[def.id] : SCENES[def.id];
  if (!spec) throw new Error('sin escena');
  const look = CLASS_LOOK[def.clase];
  const palette: Record<string, string> = { ...BASE_PALETTE, magic: look.magic };
  const shapes: Shape[] = [];
  for (const part of spec.split(';')) {
    const m = part.trim().match(/^(~?)([a-zA-Z]+)@([-\d.,f]+)(?:\{([^}]*)\})?$/);
    if (!m) throw new Error(`escena mal escrita: ${part}`);
    const [, creature, name, nums, remapTxt] = m;
    const args = nums.split(',');
    const flip = args.includes('f');
    const [x, y, s, rot = 0] = args.filter((a) => a !== 'f').map(Number);
    const remap: Record<string, string> = {};
    for (const pair of (remapTxt ?? '').split(',').filter(Boolean)) { const [a, b] = pair.split('='); remap[a.trim()] = b.trim(); }
    let local: Shape[];
    if (creature) {
      const src = CREATURES[name]?.();
      if (!src) throw new Error(`criatura desconocida: ${name}`);
      for (const [key, colour] of Object.entries(src.palette)) if (!(key in palette)) palette[key] = colour;
      // normalise the creature to the ±20 motif box, centred
      const [x0, y0, x1, y1] = bbox(src.shapes);
      const k = 40 / Math.max(x1 - x0, y1 - y0);
      local = place(src.shapes, -((x0 + x1) / 2) * k, -((y0 + y1) / 2) * k, k, 0, false, {});
    } else {
      const motif = MOTIFS[name];
      if (!motif) throw new Error(`motivo desconocido: ${name}`);
      local = motif();
    }
    shapes.push(...place(local, x, y, s, rot, flip, remap));
  }
  const rig: PuppetRig = {
    accent: look.glow, style: 'melee', phase: 0, focus: [70, 40], palette,
    pivots: {}, rest: {}, windup: {}, strike: {}, shapes,
  };
  return { rig, look, frame: def.tipo, full };
}
