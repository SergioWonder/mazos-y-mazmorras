// Sound-effect bank: the table of SFX names the game plays and the pure helpers the
// audio engine uses to pick a recorded-style MP3 for each one. Kept free of browser
// APIs so the smoke test can check it in node.
//
// Files live in `src/audio/sfx/` as `<name>.mp3` or `<name>-<n>.mp3` (variations of
// the same sound). They are synthesised offline by `scripts/sfx/make_sfx.py`.

/** Every sound the engine can play: engine names plus every `fx` key of cards and enemies. */
export const SFX_NAMES: readonly string[] = [
  // engine events
  'tajo', 'impacto', 'golpeEnemigo', 'bloqueo', 'cura', 'muerte', 'furia', 'divino', 'tierra',
  'raices', 'carta', 'estado', 'furiaPerdida', 'ui',
  // card and enemy `fx` keys
  'estrellas', 'sangre', 'abisal', 'luna', 'condena', 'veneno', 'transformacion', 'ola', 'zarpa',
  'oscuridad', 'hojas', 'aullido', 'corazones', 'aliento',
  // flourish layered on top when a rare card is played
  'rara',
];

/** Sounds heard many times per fight: they ship several variations each. */
export const FREQUENT_SFX: readonly string[] = ['tajo', 'impacto', 'golpeEnemigo', 'carta', 'bloqueo'];

/** Sound used for a name that is not in the table. */
export const SFX_FALLBACK = 'impacto';

/** Maps any requested name to one that has a sound. */
export function resolveSfx(name: string): string {
  return SFX_NAMES.includes(name) ? name : SFX_FALLBACK;
}

/** Groups the glob of MP3 URLs (`../audio/sfx/tajo-2.mp3` → url) by sound name. */
export function groupSfxFiles(urls: Record<string, string>): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const path of Object.keys(urls).sort()) {
    const match = /([A-Za-z]+)(?:-\d+)?\.mp3$/.exec(path);
    if (!match) continue;
    const list = groups.get(match[1]) ?? [];
    list.push(urls[path]);
    groups.set(match[1], list);
  }
  return groups;
}

/** Picks a variation index in [0, count) that differs from the previous one when possible. */
export function pickVariant(count: number, previous: number, rnd: () => number): number {
  if (count <= 1) return 0;
  const i = Math.floor(rnd() * (count - 1));
  return i >= previous ? i + 1 : i;
}

/** Small random pitch (playback rate) and volume change so repeats do not sound identical. */
export function playbackJitter(rnd: () => number): { rate: number; gain: number } {
  const semitones = (rnd() * 2 - 1) * 0.6;
  return { rate: Math.pow(2, semitones / 12), gain: 0.86 + rnd() * 0.14 };
}
