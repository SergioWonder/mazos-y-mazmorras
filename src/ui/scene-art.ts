// Illustrations of the narrative screens (src/arte/escenas): hand-drawn SVG for the
// NPC portraits (240×300) and the vignettes of events, the tavern and the camp
// (320×180), and painted WebP for the chapter openings (1280×720). Vite bundles
// them and hands back their URLs; outside Vite (the node smoke test) the table is
// empty and the emoji stays.
import type { Capitulo } from '../core/enemigos.ts';
import { ACTOS } from '../core/enemigos.ts';
import { sceneBackground } from '../fx/background.ts';

type UrlTable = Record<string, string>;

const SCENES: UrlTable = import.meta.env
  ? import.meta.glob('../arte/escenas/*.{svg,webp}', { eager: true, query: '?url', import: 'default' })
  : {};

/** Scenes drawn as upright NPC portraits; every other scene is a landscape vignette. */
export const PORTRAIT_SCENES: readonly string[] = ['aldric', 'sibila'];

/** Scene id of a chapter's opening view: named after its combat background. */
export function chapterSceneId(cap: Capitulo): string {
  for (let c = 0; c < ACTOS.length; c++) {
    const e = ACTOS[c].indexOf(cap);
    if (e >= 0) return `capitulo-${sceneBackground(c, e).id}`;
  }
  return 'capitulo';
}

/** Scene id of a narrative event's vignette. */
export const eventSceneId = (eventId: string): string => `evento-${eventId}`;

/** URL of the scene called `id` in `table` (a painted WebP wins over an SVG), or null if it has not been drawn. */
export function pickSceneArt(table: UrlTable, id: string): string | null {
  return table[`../arte/escenas/${id}.webp`] ?? table[`../arte/escenas/${id}.svg`] ?? null;
}

/** HTML of a scene box: the framed illustration when there is one, otherwise the emoji. */
export function sceneFigure(url: string | null, emoji: string, className: string, alt: string, portrait: boolean): string {
  if (!url) return emoji ? `<div class="${className}">${emoji}</div>` : '';
  const shape = portrait ? 'escena-retrato' : 'escena-vineta';
  return `<div class="${className} escena ${shape}"><img class="escena-img" src="${url}" alt="${alt}" decoding="async" draggable="false"></div>`;
}

/** Scene box for `id`, falling back to `emoji` while the illustration is missing. */
export const sceneArt = (id: string, emoji: string, className: string, alt: string): string =>
  sceneFigure(pickSceneArt(SCENES, id), emoji, className, alt, PORTRAIT_SCENES.includes(id));
