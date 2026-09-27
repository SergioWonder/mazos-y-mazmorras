// Ink-drawn map locations (src/arte/mapa/iconos/*.svg) and the per-act parchment
// backgrounds (src/arte/mapa/mapa-actoN[-ancho].webp). Vite bundles them and hands
// back their URLs; outside Vite (the node smoke test) the tables are empty.
import type { TipoNodo } from '../core/types.ts';
import { ACTOS } from '../core/enemigos.ts';

type UrlTable = Record<string, string>;

const ICONS: UrlTable = import.meta.env
  ? import.meta.glob('../arte/mapa/iconos/*.svg', { eager: true, query: '?url', import: 'default' })
  : {};
const BACKGROUNDS: UrlTable = import.meta.env
  ? import.meta.glob('../arte/mapa/*.webp', { eager: true, query: '?url', import: 'default' })
  : {};

/** Node types whose drawing changes with the act (the file is `<tipo>-actoN.svg`). */
const PER_ACT: ReadonlySet<TipoNodo> = new Set<TipoNodo>(['combate']);

/** Decorations drawn on the map that are not node types. */
export const MAP_EXTRA_ICONS = ['mision', 'heroe', 'aro', 'tachado'];

/** Icon name of a boss: `jefe-<id>` without doubling the «jefe» prefix. */
export const bossIconFor = (bossId: string): string => `jefe-${bossId.replace(/^jefe-/, '')}`;

/** Name of the ink icon (file basename) for a node of `tipo` in act `capitulo`
 *  (0-based) and scenario `escenario`. Unknown acts fall back to the generic one. */
export function mapIconFor(tipo: TipoNodo, capitulo: number, escenario: number): string {
  const act = ACTOS[capitulo];
  if (!act) return tipo;
  if (tipo === 'jefe') {
    const boss = (act[escenario] ?? act[0])?.jefe[0];
    return boss ? bossIconFor(boss.id) : 'jefe';
  }
  return PER_ACT.has(tipo) ? `${tipo}-acto${capitulo + 1}` : tipo;
}

/** URL of the icon called `name` in `table`, or null if it has not been drawn. */
export function pickMapIcon(table: UrlTable, name: string): string | null {
  return table[`../arte/mapa/iconos/${name}.svg`] ?? null;
}

/** Bundled URL of a map icon (null outside Vite or when missing). */
export const mapIconUrl = (name: string): string | null => pickMapIcon(ICONS, name);

/** Painted parchment for act `capitulo` (0-based): tall and, if painted, wide. */
export function mapBackground(capitulo: number): { tall: string | null; wide: string | null } {
  const base = `../arte/mapa/mapa-acto${capitulo + 1}`;
  return { tall: BACKGROUNDS[`${base}.webp`] ?? null, wide: BACKGROUNDS[`${base}-ancho.webp`] ?? null };
}
