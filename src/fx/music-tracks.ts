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
  'cap1': { file: 'cap1.mp3', loopSamples: 3386880 },      // «Taberna y travesura»
  // Act I, sample-based (scripts/musica/acto1-*): each scenario's song in two synced versions
  'cap1-e0': { file: 'cap1-e0.mp3', loopSamples: 3528000, group: 'cap1-e0' },          // «Tambores en el valle», map
  'cap1-e0-combate': { file: 'cap1-e0-combate.mp3', loopSamples: 3528000, group: 'cap1-e0' }, // same song, combat
  'cap1-e0-jefe': { file: 'cap1-e0-jefe.mp3', loopSamples: 3704400 },                 // «El festín de Gorzug»
  'cap1-e1': { file: 'cap1-e1.mp3', loopSamples: 3528000, group: 'cap1-e1' },          // «Bajo la posada vieja», map
  'cap1-e1-combate': { file: 'cap1-e1-combate.mp3', loopSamples: 3528000, group: 'cap1-e1' }, // same song, combat
  'cap1-e1-jefe': { file: 'cap1-e1-jefe.mp3', loopSamples: 3528000 },                 // «La función de medianoche» (Vexis)
  'cap1-jefe': { file: 'jefe1.mp3', loopSamples: 3024000 }, // «Señor de la guerra»
  'cap2': { file: 'cap2.mp3', loopSamples: 3256615 },      // «Marcha de los huesos»
  'cap2-jefe': { file: 'jefe2.mp3', loopSamples: 3207273 }, // «Presagio»
  'cap3': { file: 'cap3.mp3', loopSamples: 3528000 },      // «Brasas y locura», E phrygian, 90 BPM
  'cap3-jefe': { file: 'jefe3.mp3', loopSamples: 3316320 }, // final battle, C harmonic minor
  'dm': { file: 'dm.mp3', loopSamples: 5065200, introSamples: 604800 }, // «Behind the Screen», G minor metalcore, 140 BPM
};

/** Theme of a combat: the Dungeon Master has his own track; the rest use the act's theme. */
export function combatTheme(
  chapter: number, boss: boolean, enemies: { dungeonMaster?: boolean; faseMusical?: number }[], scenario = 0,
  tracks: Record<string, MusicTrack> = MUSIC_TRACKS,
): string {
  if (enemies.some((e) => e.dungeonMaster)) return 'dm';
  const own = `cap${chapter + 1}-e${scenario}-${boss ? 'jefe' : 'combate'}`;
  // a boss's second phase (Abaddon rising from Malachar) has its own version of the song
  const phase = Math.max(1, ...enemies.map((e) => e.faseMusical ?? 1));
  if (boss && phase > 1 && tracks[`${own}-fase${phase}`]) return `${own}-fase${phase}`;
  return tracks[own] ? own : `cap${chapter + 1}${boss ? '-jefe' : ''}`;
}

/** Map and events: the scenario's own exploration version, or the act's theme. */
export function exploreTheme(chapter: number, scenario = 0, tracks: Record<string, MusicTrack> = MUSIC_TRACKS): string {
  const own = `cap${chapter + 1}-e${scenario}`;
  return tracks[own] ? own : `cap${chapter + 1}`;
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
