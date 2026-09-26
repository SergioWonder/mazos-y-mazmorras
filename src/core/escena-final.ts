// Final joke scene: after the Act III boss the player faces the Dungeon Master,
// who cannot be beaten and ends the campaign with a ray… unless the hero rolls a
// natural 20 on Seduce against him, which unlocks the true ending (the whole
// party manages to agree on a date for the next session). Pure (no DOM), so the
// smoke test can check how the run is resolved.

/** What the Dungeon Master says during the scene (shown in speech bubbles). */
export const FRASES_DM = {
  inicio: 'Muy bien… ¿y qué hacéis ahora?',
  notas: 'Mmm… dejadme consultar mis notas.',
  bloqueo: 'Eso no funciona así.',
  casi: 'Casi… pero no.',
  rayo: 'Tu personaje muere. ¿Echamos otra partida?',
  seducido: '…Vale. Tú ganas. ¿Cuándo quedamos para la próxima?',
} as const;

/** Jokes shown next to the DM's intent icon («⚡ ??? · “Tira iniciativa…”»). */
export const INTENCION_DM = {
  notas: '“Mmm… interesante…”',
  rayo: '“Tira iniciativa…”',
} as const;

/** Extra epilogue on the victory screen once the DM has had the last word. */
export const EPILOGO_DM =
  'Venciste al dragón… pero el Dungeon Master siempre tiene la última palabra. ' +
  'Recoge los dados: la semana que viene, otra campaña.';

/** Card that, with a natural 20, gets past the DM's screen. */
export const CARTA_SECRETA_DM = 'seducir';

export interface DesenlaceCampana {
  /** The run is won (victory screen or true ending). */
  victoria: boolean;
  /** The save is wiped, as with any finished run. */
  borrarGuardado: true;
  /** The victory screen adds the Dungeon Master epilogue (his ray fell). */
  epilogoDM: boolean;
  /** The DM was seduced: the true ending plays instead of the victory screen. */
  finalVerdadero: boolean;
}

/**
 * How a finished run is resolved. `campanaCompleta` is true once the Act III
 * boss has fallen; `escenaDM` is the result of the Dungeon Master scene (null if
 * it was never reached). The DM can only "lose" to a natural 20 on Seduce, so a
 * 'victoria' there is the true ending; his ray ('derrota') is a joke, not a
 * defeat: reaching him means the campaign was won either way.
 */
export function desenlaceCampana(
  campanaCompleta: boolean,
  escenaDM: 'victoria' | 'derrota' | null,
): DesenlaceCampana {
  const alcanzado = campanaCompleta && escenaDM !== null;
  return {
    victoria: campanaCompleta,
    borrarGuardado: true,
    epilogoDM: alcanzado && escenaDM === 'derrota',
    finalVerdadero: alcanzado && escenaDM === 'victoria',
  };
}

// ── True ending ──────────────────────────────────────────────────────────────

/** Days of the DM's diary (Monday first). */
export const DIAS_AGENDA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;
export type DiaAgenda = (typeof DIAS_AGENDA)[number];

/** One line of the scheduling scene: who speaks, what they say, and which days
 *  of the DM's diary it crosses out (or rings, for the chosen one). */
export interface LineaAgenda {
  quien: 'dm' | 'druida' | 'barbaro' | 'mago' | 'picaro' | 'brujo';
  texto: string;
  tacha?: DiaAgenda[];
  marca?: DiaAgenda;
}

/** The hardest quest in D&D: finding a date everybody can make. */
export const GUION_AGENDA: LineaAgenda[] = [
  { quien: 'dm', texto: '📅 Bueno… ¿cuándo quedamos para la próxima sesión?' },
  { quien: 'barbaro', texto: 'El martes tengo tribu. Y el miércoles, resaca de tribu.', tacha: ['M', 'X'] },
  { quien: 'mago', texto: 'Los jueves no puedo: club de lectura de grimorios.', tacha: ['J'] },
  { quien: 'druida', texto: 'Los lunes, luna nueva. Y el domingo riego el bosque.', tacha: ['L', 'D'] },
  { quien: 'picaro', texto: 'Yo puedo cualquier día… que no sepáis cuál es.' },
  { quien: 'brujo', texto: 'El viernes tengo cena con mi patrón. Otra vez.', tacha: ['V'] },
  { quien: 'dm', texto: '…¿El sábado a las 17:00?' },
  { quien: 'barbaro', texto: '…¡Vale!', marca: 'S' },
  { quien: 'dm', texto: '¡El sábado a las 17:00, y trae dados!' },
];

/** Title of the true ending screen. */
export const TITULO_FINAL_VERDADERO = 'Final verdadero: ¡Hay fecha!';

/** localStorage key that remembers the true ending was reached. */
export const CLAVE_FINAL_VERDADERO = 'mym-final-verdadero';

/** Minimal Storage-like interface (so node tests can pass a fake). */
export interface AlmacenSimple {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

const almacenPorDefecto = (): AlmacenSimple | null => {
  try {
    return (globalThis as { localStorage?: AlmacenSimple }).localStorage ?? null;
  } catch {
    return null; // storage blocked (private mode, sandboxed previews…)
  }
};

/** Remembers that the true ending was unlocked. Never throws. */
export function marcarFinalVerdadero(almacen: AlmacenSimple | null = almacenPorDefecto()): void {
  try {
    almacen?.setItem(CLAVE_FINAL_VERDADERO, '1');
  } catch {
    // storage full or blocked: the ending still plays, it just is not remembered
  }
}

/** Whether the true ending was unlocked on this device. Never throws. */
export function finalVerdaderoDesbloqueado(almacen: AlmacenSimple | null = almacenPorDefecto()): boolean {
  try {
    return almacen?.getItem(CLAVE_FINAL_VERDADERO) === '1';
  } catch {
    return false;
  }
}
