// Original soundtrack: one track per theme in src/audio/, composed and synthesised
// for the game (see src/audio/LEEME.md). Every track is an exact loop; the loop
// length is stored so playback can skip the MP3 codec padding and loop without a gap.

export interface MusicTrack {
  file: string;        // file name inside src/audio/
  loopSamples: number; // exact loop length in samples at 44.1 kHz
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
  'cap3': { file: 'cap3.mp3', loopSamples: 3175200 },      // heroic adventure, Lydian
  'cap3-jefe': { file: 'jefe3.mp3', loopSamples: 3316320 }, // final battle, C harmonic minor
};

/**
 * Loop points (seconds) inside a decoded track. Browsers that honour the LAME gapless
 * header return exactly the loop; others keep the codec delay at the start and some
 * padding at the end, so the loop starts after the delay.
 */
export function loopWindow(bufferDuration: number, loopSamples: number): { start: number; end: number } {
  const loop = loopSamples / SOURCE_RATE;
  if (bufferDuration <= loop) return { start: 0, end: bufferDuration };
  const start = bufferDuration - loop > 0.01 ? Math.min(MP3_DELAY_SAMPLES / SOURCE_RATE, bufferDuration - loop) : 0;
  return { start, end: start + loop };
}
