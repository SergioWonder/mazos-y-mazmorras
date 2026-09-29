// The hero's death in combat as a pure, testable timeline: when each beat plays
// (killing blow, collapse, class burst, rising soul, closing vignette, the killer's
// gloat, the funeral gong) and the global time scale that makes it slow motion.
// The combat screen only schedules these cues; no DOM here.

import './death-spells.ts'; // registers the death compositions in SPELLS

export type DeathCueId = 'golpe' | 'caida' | 'estallido' | 'vineta' | 'gong' | 'alma' | 'risa' | 'fin';
export interface DeathCue { id: DeathCueId; at: number }
export interface DeathSequence {
  reduced: boolean;
  /** Real milliseconds from the killing blow to the defeat screen. */
  total: number;
  /** Beats in time order (real ms). */
  cues: DeathCue[];
  /** Slow motion: eases down to `scale` by `from`, holds it until `hold`, back to 1 at `to` (ms). */
  slowMotion: { scale: number; from: number; hold: number; to: number } | null;
  /** Screen shake level of the killing blow (0: none). */
  shake: 0 | 1 | 2 | 3;
  /** Red flash / heartbeat on the killing blow. */
  flash: boolean;
  /** Dark vignette closing in from the edges: start and length (ms). */
  vignette: { from: number; ms: number };
  /** Music fade: level it drops to and how long the fade takes (s). */
  music: { level: number; seconds: number };
}

const FULL: DeathSequence = {
  reduced: false,
  total: 3200,
  cues: [
    { id: 'golpe', at: 0 },
    { id: 'caida', at: 40 },
    { id: 'estallido', at: 300 },
    { id: 'vineta', at: 400 },
    { id: 'gong', at: 650 },
    { id: 'alma', at: 950 },
    { id: 'risa', at: 1250 },
    { id: 'fin', at: 3200 },
  ],
  slowMotion: { scale: 0.3, from: 90, hold: 1500, to: 2100 },
  shake: 3,
  flash: true,
  vignette: { from: 400, ms: 2500 },
  music: { level: 0.15, seconds: 1.6 },
};

const SHORT: DeathSequence = {
  reduced: true,
  total: 1800,
  cues: [
    { id: 'golpe', at: 0 },
    { id: 'caida', at: 0 },
    { id: 'estallido', at: 120 },
    { id: 'vineta', at: 150 },
    { id: 'gong', at: 250 },
    { id: 'alma', at: 350 },
    { id: 'risa', at: 450 },
    { id: 'fin', at: 1800 },
  ],
  slowMotion: null,
  shake: 0,
  flash: true,
  vignette: { from: 150, ms: 1400 },
  music: { level: 0.15, seconds: 0.8 },
};

/** The death timeline; `reduced` (prefers-reduced-motion) is the short one: no slow motion, no shake. */
export function heroDeathSequence(reduced: boolean): DeathSequence {
  const s = reduced ? SHORT : FULL;
  return { ...s, cues: s.cues.map((c) => ({ ...c })) };
}

/** Global clock factor at `ms` real milliseconds into the sequence (1 = normal speed). */
export function deathTimeScale(seq: DeathSequence, ms: number): number {
  const m = seq.slowMotion;
  if (!m || ms <= 0 || ms >= m.to) return 1;
  if (ms < m.from) return 1 + (m.scale - 1) * (ms / m.from);
  if (ms <= m.hold) return m.scale;
  return m.scale + (1 - m.scale) * ((ms - m.hold) / (m.to - m.hold));
}

/** Real ms at which something started at `startMs` ends after `virtualSeconds` of the slowed clock. */
export function realEnd(seq: DeathSequence, startMs: number, virtualSeconds: number): number {
  let t = startMs, left = virtualSeconds * 1000;
  const step = 5;
  while (left > 0 && t < startMs + 60000) {
    left -= deathTimeScale(seq, t + step / 2) * step;
    t += step;
  }
  return t;
}

export interface HeroDeathFx {
  /** Spell key of the class burst (death-spells.ts). */
  spell: string;
  /** Palette of the burst (also tints the flash of the killing blow). */
  colours: string[];
}

/** Class-themed burst: embers, withering leaves and spirit, dying runes, shadows and daggers, violet flames, a shattering hammer of light. */
export const HERO_DEATH_FX: Record<string, HeroDeathFx> = {
  barbaro: { spell: 'muerteBarbaro', colours: ['#ff8c3b', '#ffb347', '#d62828', '#5a4a44'] },
  druida: { spell: 'muerteDruida', colours: ['#7dba4e', '#a8804f', '#b8ffd9'] },
  mago: { spell: 'muerteMago', colours: ['#c98bff', '#6bd8ff', '#4a4a5a'] },
  picaro: { spell: 'muertePicaro', colours: ['#2a2438', '#c3ced6', '#8d8db5'] },
  brujo: { spell: 'muerteBrujo', colours: ['#b46bff', '#6c2fb5', '#e8d0ff'] },
  paladin: { spell: 'muertePaladin', colours: ['#ffd35a', '#e0a82e', '#8a7a5a'] },
};

export const heroDeathFx = (clase: string): HeroDeathFx => HERO_DEATH_FX[clase] ?? HERO_DEATH_FX.barbaro;

/** Spell of the hero's soul rising out of the body. */
export const SOUL_SPELL = 'almaHeroe';

/** Only a real defeat plays the death: the Dungeon Master's ray is the campaign's victory joke. */
export function playsDefeatSequence(result: 'victoria' | 'derrota' | null, enemies: { dungeonMaster?: boolean }[]): boolean {
  return result === 'derrota' && !enemies.some((e) => e.dungeonMaster);
}
