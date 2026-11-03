export const HERO_CLASSES = ['druida', 'barbaro', 'mago', 'picaro', 'brujo', 'paladin'] as const;
export type HeroClass = (typeof HERO_CLASSES)[number];

export const isHeroClass = (v: unknown): v is HeroClass => typeof v === 'string' && (HERO_CLASSES as readonly string[]).includes(v);

/** Non-negative integer no bigger than `max`. */
export const isCount = (v: unknown, max: number): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max;

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function readJson<T>(req: { json<U>(): Promise<U> }): Promise<Partial<T>> {
  const body = await req.json<Partial<T>>().catch(() => ({}));
  return body && typeof body === 'object' ? body : {};
}
