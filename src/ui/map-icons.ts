// Ink-drawn map locations (src/arte/mapa/iconos/*.svg) and the per-scenario parchment
// backgrounds (src/arte/mapa/*[-ancho].webp). Vite bundles them and hands
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

/** Map key of every scenario, `MAP_SCENARIOS[act][scenario]`: it names the
 *  scenario's themed icons (`<tipo>-<key>.svg`) and its CSS tint class. */
export const MAP_SCENARIOS: readonly (readonly string[])[] = [
  ['ogro', 'contrabandistas'],
  ['cripta', 'templo'],
  ['dragon', 'contemplador'],
];

/** Key of scenario `escenario` in act `capitulo`, or null when unknown. */
export const mapScenarioKey = (capitulo: number, escenario: number): string | null =>
  MAP_SCENARIOS[capitulo]?.[escenario] ?? null;

/** Decorations drawn on the map that are not node types. */
export const MAP_EXTRA_ICONS = ['mision', 'heroe', 'aro', 'tachado'];

/** Icon name of a boss: `jefe-<id>` without doubling the «jefe» prefix. */
export const bossIconFor = (bossId: string): string => `jefe-${bossId.replace(/^jefe-/, '')}`;

/** Name of the ink icon (file basename) for a node of `tipo` in act `capitulo`
 *  (0-based) and scenario `escenario`. Tries the scenario's own drawing, then
 *  the act's, then the generic one; `available` tells which icons exist (by
 *  default the preferred candidate is returned as is). */
export function mapIconFor(
  tipo: TipoNodo, capitulo: number, escenario: number, available?: (name: string) => boolean,
): string {
  const act = ACTOS[capitulo];
  if (!act) return tipo;
  if (tipo === 'jefe') {
    const boss = (act[escenario] ?? act[0])?.jefe[0];
    return boss ? bossIconFor(boss.id) : 'jefe';
  }
  const key = mapScenarioKey(capitulo, escenario);
  const candidates = [
    ...(key ? [`${tipo}-${key}`] : []),
    ...(PER_ACT.has(tipo) ? [`${tipo}-acto${capitulo + 1}`] : []),
  ];
  if (!available) return candidates[0] ?? tipo;
  return candidates.find(available) ?? tipo;
}

/** URL of the icon called `name` in `table`, or null if it has not been drawn. */
export function pickMapIcon(table: UrlTable, name: string): string | null {
  return table[`../arte/mapa/iconos/${name}.svg`] ?? null;
}

/** Bundled URL of a map icon (null outside Vite or when missing). */
export const mapIconUrl = (name: string): string | null => pickMapIcon(ICONS, name);

/** Whether a map icon has been bundled. */
export const hasMapIcon = (name: string): boolean => mapIconUrl(name) !== null;

/** Painted parchment files of each act's second scenario (the first one keeps
 *  the act's own `mapa-actoN`). */
const SCENARIO_BACKGROUNDS: readonly string[] = ['mapa-contrabandistas', 'mapa-templo', 'mapa-contemplador'];

/** Basename of the painted parchment of scenario `escenario` in act `capitulo`. */
export function mapBackgroundName(capitulo: number, escenario: number): string {
  const own = escenario > 0 ? SCENARIO_BACKGROUNDS[capitulo] : undefined;
  return own ?? `mapa-acto${capitulo + 1}`;
}

/** Painted parchment (tall and, if painted, wide) of a scenario found in
 *  `table`; the act's parchment stands in while the scenario's is missing. */
export function pickMapBackground(
  table: UrlTable, capitulo: number, escenario: number,
): { tall: string | null; wide: string | null } {
  const at = (name: string) => ({
    tall: table[`../arte/mapa/${name}.webp`] ?? null,
    wide: table[`../arte/mapa/${name}-ancho.webp`] ?? null,
  });
  const own = at(mapBackgroundName(capitulo, escenario));
  return own.tall ? own : at(mapBackgroundName(capitulo, 0));
}

/** Bundled painted parchment of a scenario (nulls outside Vite or when missing). */
export const mapBackground = (capitulo: number, escenario: number) => pickMapBackground(BACKGROUNDS, capitulo, escenario);
