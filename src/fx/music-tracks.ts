// Original soundtrack: one track per theme in src/audio/, composed and synthesised
// for the game (see src/audio/LEEME.md). Every track is an exact loop; the loop
// length is stored so playback can skip the MP3 codec padding and loop without a gap.

export interface MusicTrack {
  file: string;        // file name inside src/audio/
  loopSamples: number; // exact loop length in samples at 44.1 kHz
  introSamples?: number; // intro played once before the loop starts (samples at 44.1 kHz)
}

const SOURCE_RATE = 44100;

/** LAME encoder delay + decoder delay: silence some decoders leave at the start. */
export const MP3_DELAY_SAMPLES = 1105;

export const MUSIC_TRACKS: Record<string, MusicTrack> = {
  'menu': { file: 'menu.mp3', loopSamples: 3307500 },       // main theme (leitmotif)
  'cap1': { file: 'cap1.mp3', loopSamples: 3386880 },      // «Taberna y travesura»
  'cap1-jefe': { file: 'jefe1.mp3', loopSamples: 3024000 }, // «Señor de la guerra»
  'cap2': { file: 'cap2.mp3', loopSamples: 3256615 },      // «Marcha de los huesos»
  'cap2-jefe': { file: 'jefe2.mp3', loopSamples: 3207273 }, // «Presagio»
  'cap3': { file: 'cap3.mp3', loopSamples: 3528000 },      // «Brasas y locura», E phrygian, 90 BPM
  'cap3-jefe': { file: 'jefe3.mp3', loopSamples: 3316320 }, // final battle, C harmonic minor
  'dm': { file: 'dm.mp3', loopSamples: 5065200, introSamples: 604800 }, // «Behind the Screen», G minor metalcore, 140 BPM
};

/** Theme of a combat: the Dungeon Master has his own track; the rest use the act's theme. */
export function combatTheme(chapter: number, boss: boolean, enemies: { dungeonMaster?: boolean }[]): string {
  if (enemies.some((e) => e.dungeonMaster)) return 'dm';
  return `cap${chapter + 1}${boss ? '-jefe' : ''}`;
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
