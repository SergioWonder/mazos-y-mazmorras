// Hand-drawn relic illustrations (src/arte/reliquias/*.svg). Vite bundles them
// and hands back their URLs; outside Vite (the node smoke test) the table is empty.

type SvgTable = Record<string, string>;

const RELICS: SvgTable = import.meta.env
  ? import.meta.glob('../arte/reliquias/*.svg', { eager: true, query: '?url', import: 'default' })
  : {};

/** URL of a relic's SVG in `table`, or null if it has not been drawn yet. */
export function pickRelicSvg(table: SvgTable, id: string): string | null {
  return table[`../arte/reliquias/${id}.svg`] ?? null;
}

interface RelicLike { id: string; nombre: string; icono: string; }

/** Icon HTML for a relic: its illustration as an <img>, or the emoji fallback.
 *  Attributes use single quotes so the result can live inside a data-tip="…". */
export function relicIcon(relic: RelicLike, size = 24, table: SvgTable = RELICS): string {
  const url = pickRelicSvg(table, relic.id);
  if (!url) return relic.icono;
  const alt = relic.nombre.replace(/['"<>&]/g, '');
  // Vite inlines small SVGs as data URIs whose markup uses ' — percent-encode it.
  const src = url.replace(/'/g, '%27').replace(/"/g, '%22');
  return `<img class='reliquia-img' src='${src}' alt='${alt}' width='${size}' height='${size}' draggable='false'>`;
}
