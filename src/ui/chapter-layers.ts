// Layered chapter openings: the empty scenario (src/arte/escenas/capas/<id>.webp)
// with the hero's puppet seen from behind walking into it. Each scenario says
// where the feet land and how tall the hero stands there, so size and
// perspective match the painting. Scenarios without layers keep their flat view.

import { BACK_FEET, BACK_FIGURE_HEIGHT } from '../fx/hero-back.ts';

export { BACK_FIGURE_HEIGHT };

export interface ChapterLayer {
  /** Point between the hero's feet, as fractions of the image (x, y). */
  foot: [number, number];
  /** Height of the hero (feet to top of the head) as a fraction of the image height. */
  height: number;
}

/** Aspect ratio (width / height) of the layered scenario paintings. */
export const LAYER_ASPECT = 3 / 2;
const VIEW_W = 140, VIEW_H = 135;

export const CHAPTER_LAYERS: Record<string, ChapterLayer> = {
  // through the broken gate, on the trampled path into the camp
  'capitulo-asentamiento-ogro': { foot: [0.5, 0.965], height: 0.42 },
  // at the top of the cellar steps, a stride before the landing
  'capitulo-guarida-contrabandistas': { foot: [0.5, 0.965], height: 0.42 },
  // on the last steps down into the necropolis
  'capitulo-cripta': { foot: [0.5, 0.965], height: 0.42 },
  // at the head of the nave, before the ritual circle
  'capitulo-templo-oscuro': { foot: [0.5, 0.965], height: 0.42 },
  // at the start of the obsidian bridge over the lava
  'capitulo-guarida-dragon': { foot: [0.5, 0.965], height: 0.42 },
  // at the start of the walkway into the labyrinth
  'capitulo-laberinto-contemplador': { foot: [0.5, 0.965], height: 0.42 },
};

type UrlTable = Record<string, string>;
const IMAGES: UrlTable = import.meta.env
  ? import.meta.glob('../arte/escenas/capas/*.webp', { eager: true, query: '?url', import: 'default' })
  : {};

/** Box of the puppet's 140×135 canvas, in % of the scenario, so its feet land on `foot`. */
export function heroBox(layer: ChapterLayer): { left: number; top: number; width: number; height: number } {
  const height = (layer.height * 100 * VIEW_H) / BACK_FIGURE_HEIGHT;
  const width = (height * VIEW_W) / VIEW_H / LAYER_ASPECT;
  return {
    left: layer.foot[0] * 100 - (width * BACK_FEET[0]) / VIEW_W,
    top: layer.foot[1] * 100 - (height * BACK_FEET[1]) / VIEW_H,
    width,
    height,
  };
}

/** HTML of a layered opening, and where to put the hero's puppet; null if the scene has no layers. */
export function chapterLayers(sceneId: string, alt: string): { html: string; place(root: HTMLElement, hero: Element): void } | null {
  const layer = CHAPTER_LAYERS[sceneId];
  const url = IMAGES[`../arte/escenas/capas/${sceneId}.webp`];
  if (!layer || !url) return null;
  return {
    html: `<div class="capitulo-arte escena escena-vineta"><div class="escena-capas">`
      + `<img class="escena-img" src="${url}" alt="${alt}" decoding="async" draggable="false"></div></div>`,
    place(root, hero) {
      const box = heroBox(layer);
      const el = hero as HTMLElement;
      el.classList.add('heroe-espalda');
      Object.assign(el.style, { left: `${box.left}%`, top: `${box.top}%`, width: `${box.width}%`, height: `${box.height}%` });
      // contact shadow under the feet, outside the puppet's rim-light filter
      const shadow = document.createElement('span');
      shadow.className = 'heroe-sombra';
      const w = box.width * 0.36;
      Object.assign(shadow.style, { left: `${layer.foot[0] * 100 - w / 2}%`, top: `${layer.foot[1] * 100 - w * LAYER_ASPECT * 0.09}%`, width: `${w}%` });
      root.querySelector('.escena-capas')?.append(shadow, el);
    },
  };
}
