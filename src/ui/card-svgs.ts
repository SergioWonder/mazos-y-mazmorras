// Hand-drawn card illustrations (src/arte/cartas/*.svg). Vite bundles them and
// hands back their URLs; outside Vite (the node smoke test) the tables are empty.

type SvgTable = Record<string, string>;

const NORMAL: SvgTable = import.meta.env
  ? import.meta.glob('../arte/cartas/*.svg', { eager: true, query: '?url', import: 'default' })
  : {};
const FULL: SvgTable = import.meta.env
  ? import.meta.glob('../arte/cartas/full/*.svg', { eager: true, query: '?url', import: 'default' })
  : {};

/** URL of a card's SVG in `table`, or null if it has not been drawn yet. */
export function pickSvg(table: SvgTable, id: string, full: boolean): string | null {
  return table[`../arte/cartas/${full ? 'full/' : ''}${id}.svg`] ?? null;
}

/** Hand-drawn illustration of a card (full-art portrait when asked), if any. */
export const cardSvgUrl = (id: string, full = false): string | null => pickSvg(full ? FULL : NORMAL, id, full);
