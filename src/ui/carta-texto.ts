/** Rough characters per rendered line of card text (measured with Marcellus at the base size). */
const CHARS_PER_LINE = 24;

/**
 * True when a card's text wraps to more than two lines: that small, dense text is set
 * in the sans-serif face (`--fuente-pequena`) instead of the incised body face.
 * Counts explicit line breaks plus the soft wraps of long segments.
 */
export function textoDenso(texto: string): boolean {
  const lineas = texto
    .split('\n')
    .reduce((n, seg) => n + Math.max(1, Math.ceil(seg.trim().length / CHARS_PER_LINE)), 0);
  return lineas > 2;
}
