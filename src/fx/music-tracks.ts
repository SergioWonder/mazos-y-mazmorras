// Original soundtrack: one track per theme in src/audio/, composed and synthesised
// for the game (see src/audio/LEEME.md). Every track is an exact loop; the loop
// length is stored so playback can skip the MP3 codec padding and loop without a gap.

export interface MusicTrack {
  file: string;        // file name inside src/audio/
  loopSamples: number; // exact loop length in samples at 44.1 kHz
  introSamples?: number; // intro played once before the loop starts (samples at 44.1 kHz)
  /** Tracks of one group with the same loopSamples are versions of one song (map and
   *  combat): switching between them carries on from the same point of the loop. */
  group?: string;
}

const SOURCE_RATE = 44100;

/** LAME encoder delay + decoder delay: silence some decoders leave at the start. */
export const MP3_DELAY_SAMPLES = 1105;

export const MUSIC_TRACKS: Record<string, MusicTrack> = {
  'menu': { file: 'menu.mp3', loopSamples: 3528000 },       // main theme «Brasas» (fantasy and magic), D minor, 84 BPM, 28 bars
  // Act I, sample-based (scripts/musica/acto1-*): each scenario's song in two synced versions
  'cap1-e0': { file: 'cap1-e0.mp3', loopSamples: 3528000, group: 'cap1-e0' },          // «Tambores en el valle», map
  'cap1-e0-combate': { file: 'cap1-e0-combate.mp3', loopSamples: 3528000, group: 'cap1-e0' }, // same song, combat
  'cap1-e0-jefe': { file: 'cap1-e0-jefe.mp3', loopSamples: 3704400 },                 // «El festín de Gorzug»
  'cap1-e1': { file: 'cap1-e1.mp3', loopSamples: 3528000, group: 'cap1-e1' },          // «Bajo la posada vieja», map
  'cap1-e1-combate': { file: 'cap1-e1-combate.mp3', loopSamples: 3528000, group: 'cap1-e1' }, // same song, combat
  'cap1-e1-jefe': { file: 'cap1-e1-jefe.mp3', loopSamples: 3528000 },                 // «La función de medianoche» (Vexis)
  // Act II, sample-based (scripts/musica/acto2-*), on leitmotif 7 «Sombra»
  'cap2-e0': { file: 'cap2-e0.mp3', loopSamples: 3528000, group: 'cap2-e0' },          // «Nana para los que no duermen», map
  'cap2-e0-combate': { file: 'cap2-e0-combate.mp3', loopSamples: 3528000, group: 'cap2-e0' }, // same song, combat
  'cap2-e0-jefe': { file: 'cap2-e0-jefe.mp3', loopSamples: 4116000 },                 // «Misa de la filacteria» (Vol'guth)
  'cap2-e1': { file: 'cap2-e1.mp3', loopSamples: 3704400, group: 'cap2-e1' },          // «Vísperas del pozo», map
  'cap2-e1-combate': { file: 'cap2-e1-combate.mp3', loopSamples: 3704400, group: 'cap2-e1' }, // same song, combat
  'cap2-e1-jefe': { file: 'cap2-e1-jefe.mp3', loopSamples: 3704400, group: 'cap2-e1-jefe' },  // «El pacto»: Malachar, the ritual
  'cap2-e1-jefe-fase2': { file: 'cap2-e1-jefe-fase2.mp3', loopSamples: 3704400, group: 'cap2-e1-jefe' }, // same song: Abaddon, chaos
  // Act III, sample-based: La Guarida del Dragón (e0) on «Tesoro maldito», El Laberinto (e1) on «Fractura»
  'cap3-e0': { file: 'cap3-e0.mp3', loopSamples: 3402000, group: 'cap3-e0' },          // «Tesoro maldito», map
  'cap3-e0-combate': { file: 'cap3-e0-combate.mp3', loopSamples: 3402000, group: 'cap3-e0' }, // same song: Saqueo and Derrumbe
  'cap3-e1': { file: 'cap3-e1.mp3', loopSamples: 3628800, group: 'cap3-e1' },          // «Ojo del vacío», map
  'cap3-e1-combate': { file: 'cap3-e1-combate.mp3', loopSamples: 3628800, group: 'cap3-e1' }, // same song: Asalto and Espiral
  'cap3-e0-jefe': { file: 'cap3-e0-jefe.mp3', loopSamples: 3549000 },                  // «Llamarada / Trono de ceniza» (Ignifax): 168 ⇄ 126
  'cap3-e1-jefe': { file: 'cap3-e1-jefe.mp3', loopSamples: 3553200 },                  // «El ojo abierto» (Contemplador): metalcore with synths
  'dm': { file: 'dm.mp3', loopSamples: 5065200, introSamples: 604800 }, // «Behind the Screen», G minor metalcore, 140 BPM
};

/** Theme of a combat: the Dungeon Master has his own track; the rest use their scenario's. */
export function combatTheme(
  chapter: number, boss: boolean, enemies: { dungeonMaster?: boolean; faseMusical?: number }[], scenario = 0,
  tracks: Record<string, MusicTrack> = MUSIC_TRACKS,
): string {
  if (enemies.some((e) => e.dungeonMaster)) return 'dm';
  const own = `cap${chapter + 1}-e${scenario}-${boss ? 'jefe' : 'combate'}`;
  // a boss's second phase (Abaddon rising from Malachar) has its own version of the song
  const phase = Math.max(1, ...enemies.map((e) => e.faseMusical ?? 1));
  if (boss && phase > 1 && tracks[`${own}-fase${phase}`]) return `${own}-fase${phase}`;
  return own;
}

/** Map and events: the scenario's own exploration version. */
export function exploreTheme(chapter: number, scenario = 0): string {
  return `cap${chapter + 1}-e${scenario}`;
}

/** Pause before retrying a track that failed to load (`attempt` from 0), or null to give up.
 *  Meanwhile the music stays silent: nothing else plays in its place. */
export function retryDelayMs(attempt: number): number | null {
  return [1500, 4000, 10000][attempt] ?? null;
}

/** Files worth keeping decoded while `id` plays: itself and its other versions (map ↔ combat,
 *  boss phases). A decoded track weighs tens of MB, so the rest are let go. */
export function tracksToKeep(id: string, tracks: Record<string, MusicTrack> = MUSIC_TRACKS): string[] {
  if (!tracks[id]) return [];
  return [tracks[id].file, ...Object.keys(tracks).filter((o) => sameSong(id, o, tracks)).map((o) => tracks[o].file)];
}

/** Music once a fight is over: a victory brings back the scenario's calm version right
 *  away (rewards are chosen to it); a defeat or the Dungeon Master's scene keep theirs. */
export function themeAfterCombat(
  result: 'victoria' | 'derrota', chapter: number, scenario: number, enemies: { dungeonMaster?: boolean }[],
): string | null {
  if (result !== 'victoria' || enemies.some((e) => e.dungeonMaster)) return null;
  return exploreTheme(chapter, scenario);
}

/** Two different tracks that are versions of the same song (same group, same loop). */
export function sameSong(a: string, b: string, tracks: Record<string, MusicTrack> = MUSIC_TRACKS): boolean {
  const x = tracks[a], y = tracks[b];
  return a !== b && !!x?.group && x.group === y?.group && x.loopSamples === y.loopSamples;
}

/**
 * Where a looping source is inside its buffer (seconds) after playing `elapsed` seconds
 * from `begin`, with the loop running from `start` to `end`. The same position, shifted
 * by each buffer's own `start`, is where the other version of the song picks up.
 */
export function loopPosition(elapsed: number, begin: number, start: number, end: number): number {
  const pos = begin + elapsed;
  if (pos < end) return pos;
  const span = end - start;
  return start + ((pos - start) % span);
}

/**
 * Loop points (seconds) inside a decoded track. Browsers that honour the LAME gapless
 * header return exactly the intro plus the loop; others keep the codec delay at the start
 * and some padding at the end, so everything shifts by that delay. `begin` is where
 * playback starts (the intro, if any) and the loop runs from `start` to `end`.
 */
export function loopWindow(bufferDuration: number, loopSamples: number, introSamples = 0): { start: number; end: number; begin: number } {
  const loop = loopSamples / SOURCE_RATE;
  const intro = introSamples / SOURCE_RATE;
  if (bufferDuration <= intro + loop) {
    const start = Math.max(0, Math.min(intro, bufferDuration - loop));
    return { start, end: bufferDuration, begin: 0 };
  }
  const extra = bufferDuration - intro - loop;
  const begin = extra > 0.01 ? Math.min(MP3_DELAY_SAMPLES / SOURCE_RATE, extra) : 0;
  return { start: begin + intro, end: begin + intro + loop, begin };
}
