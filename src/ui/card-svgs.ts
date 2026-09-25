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

// ── One-time rasterisation ──────────────────────────────────────────────────
// SVGs with blur filters are costly to rasterise, and the hand is rebuilt on
// every render. Each illustration is drawn once into a bitmap (blob URL) and
// every card after that just shows the bitmap.
const bitmaps = new Map<string, string>();
const pending = new Set<string>();

async function rasterise(url: string): Promise<string> {
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  await new Promise<void>((ok, fail) => { img.onload = () => ok(); img.onerror = () => fail(new Error(url)); });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || 280;
  canvas.height = img.naturalHeight || 160;
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'));
  return blob ? URL.createObjectURL(blob) : url;
}

/** Bitmap version of an illustration URL once ready; until then the URL itself.
 *  Images tagged with data-arte="<url>" are upgraded in place when it lands. */
export function cardArtBitmap(url: string): string {
  const hit = bitmaps.get(url);
  if (hit) return hit;
  if (!pending.has(url) && typeof document !== 'undefined') {
    pending.add(url);
    rasterise(url).then((bitmap) => {
      bitmaps.set(url, bitmap);
      document.querySelectorAll<HTMLImageElement>('img[data-arte]').forEach((i) => { if (i.dataset.arte === url) i.src = bitmap; });
    }).catch(() => bitmaps.set(url, url));
  }
  return url;
}
