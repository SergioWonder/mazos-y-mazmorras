// Run statistics: what the hero did in every fight (the combat engine feeds them)
// and the worst habit they reveal, which the tombstone throws in the player's face.
// Pure data and functions, no DOM, so the smoke test can drive them.

import type { TipoCarta } from './types.ts';

/** How the hero last lost HP: an enemy blow, a status (poison, burn) or their own card. */
export type OrigenGolpe = 'ataque' | 'veneno' | 'propio';

export interface EstadisticasRun {
  /** Fights started. */
  combates: number;
  /** Player turns, across every fight. */
  turnos: number;
  /** Damage that actually hurt enemies (after their block). */
  danoHecho: number;
  /** Damage from enemy blows that got through the hero's block. */
  danoRecibido: number;
  /** Damage from enemy blows soaked by the hero's block. */
  danoBloqueado: number;
  /** Block the hero gained from cards. */
  bloqueoGanado: number;
  /** HP lost to statuses: poison and burn. */
  danoVeneno: number;
  /** HP the hero took off himself (own cards, curses). */
  autolesion: number;
  /** Energy left unspent when ending the turn. */
  energiaSobrante: number;
  /** Cards played by type. */
  ataques: number;
  habilidades: number;
  poderes: number;
  /** Strength enemies gained during the fights. */
  escaladoEnemigo: number;
  /** Turns of the current (or last) fight. */
  turnosUltimo: number;
  /** Strength enemies gained in the current (or last) fight. */
  escaladoUltimo: number;
  /** Source of the last HP the hero lost (null: none yet). */
  ultimoGolpe: OrigenGolpe | null;
}

export function nuevasEstadisticas(): EstadisticasRun {
  return {
    combates: 0, turnos: 0, danoHecho: 0, danoRecibido: 0, danoBloqueado: 0, bloqueoGanado: 0,
    danoVeneno: 0, autolesion: 0, energiaSobrante: 0, ataques: 0, habilidades: 0, poderes: 0,
    escaladoEnemigo: 0, turnosUltimo: 0, escaladoUltimo: 0, ultimoGolpe: null,
  };
}

/** Fills in what an older save (or none at all) lacks. */
export function normalizarEstadisticas(p?: Partial<EstadisticasRun> | null): EstadisticasRun {
  const s = nuevasEstadisticas();
  if (!p) return s;
  for (const k of Object.keys(s) as Array<keyof EstadisticasRun>) {
    const v = p[k];
    if (k === 'ultimoGolpe') s.ultimoGolpe = v === 'ataque' || v === 'veneno' || v === 'propio' ? v : null;
    else if (typeof v === 'number' && Number.isFinite(v)) (s[k] as number) = v;
  }
  return s;
}

// ── Recorders (the engine calls these) ──────────────────────────────────────

export function empezarCombate(s: EstadisticasRun) {
  s.combates++;
  s.turnosUltimo = 0;
  s.escaladoUltimo = 0;
}

export function empezarTurno(s: EstadisticasRun) {
  s.turnos++;
  s.turnosUltimo++;
}

export function terminarTurno(s: EstadisticasRun, energiaSinGastar: number) {
  s.energiaSobrante += Math.max(0, energiaSinGastar);
}

export function cartaJugada(s: EstadisticasRun, tipo: TipoCarta) {
  if (tipo === 'ataque') s.ataques++;
  else if (tipo === 'habilidad') s.habilidades++;
  else if (tipo === 'poder') s.poderes++;
}

export function danoInfligido(s: EstadisticasRun, n: number) {
  if (n > 0) s.danoHecho += n;
}

/** An enemy blow: `real` got through, `bloqueado` was soaked by the block. */
export function golpeRecibido(s: EstadisticasRun, real: number, bloqueado: number) {
  s.danoBloqueado += Math.max(0, bloqueado);
  if (real > 0) {
    s.danoRecibido += real;
    s.ultimoGolpe = 'ataque';
  }
}

export function bloqueoObtenido(s: EstadisticasRun, n: number) {
  if (n > 0) s.bloqueoGanado += n;
}

/** HP lost to poison or burn. */
export function perdidaPorEstado(s: EstadisticasRun, n: number) {
  if (n <= 0) return;
  s.danoVeneno += n;
  s.ultimoGolpe = 'veneno';
}

/** HP the hero took off himself. */
export function herirse(s: EstadisticasRun, n: number) {
  if (n <= 0) return;
  s.autolesion += n;
  s.ultimoGolpe = 'propio';
}

export function enemigoSeRefuerza(s: EstadisticasRun, fuerza: number) {
  if (fuerza <= 0) return;
  s.escaladoEnemigo += fuerza;
  s.escaladoUltimo += fuerza;
}

// ── The worst habit ─────────────────────────────────────────────────────────

export const HABITOS = [
  'novato', 'sinBloqueo', 'eterno', 'tacano', 'envenenado', 'autolesion', 'maldito', 'acaparador', 'pacifista',
] as const;
export type Habito = (typeof HABITOS)[number];

/** What the run's statistics do not hold: the deck the hero died with. */
export interface ContextoHabitos {
  /** Cards in the run's deck. */
  mazo?: number;
  /** Curses the hero carried in the fatal fight. */
  maldiciones?: number;
}

/**
 * How bad each habit was (only the ones that show: a score of 1 or more; the
 * higher, the worse). Thresholds are meant for a whole run, not for a single turn.
 */
export function evaluarHabitos(
  s: EstadisticasRun | null | undefined, c: ContextoHabitos = {},
): Partial<Record<Habito, number>> {
  const notas: Partial<Record<Habito, number>> = {};
  const mazo = c.mazo ?? 0;
  const maldiciones = c.maldiciones ?? 0;
  if (maldiciones >= 3) notas.maldito = 1 + (maldiciones - 3) * 0.35;
  if (mazo >= 32) notas.acaparador = 1 + (mazo - 32) * 0.08;
  if (!s) return notas;
  const turnos = Math.max(1, s.turnos);
  // fell in the very first fight: nothing else matters much
  if (s.combates <= 1) notas.novato = 2.2;
  // all-in on offense: the blows went through because there was hardly any block
  const golpes = s.danoRecibido + s.danoBloqueado;
  if (s.danoRecibido >= 20 && golpes > 0) {
    const cubierto = s.danoBloqueado / golpes;
    const bloqueoPorTurno = s.bloqueoGanado / turnos;
    if (cubierto < 0.35 || bloqueoPorTurno < 3) {
      notas.sinBloqueo = 1 + (0.35 - Math.min(cubierto, 0.35)) * 3 + Math.max(0, 3 - bloqueoPorTurno) / 3
        + (s.ataques > s.habilidades * 2 ? 0.2 : 0);
    }
  }
  // dragged the last fight out while the enemy kept growing (boss fights are long
  // anyway: a long one only counts when the enemy scaled or it outlasted the usual)
  const media = s.turnos / Math.max(1, s.combates);
  const largo = s.turnosUltimo >= 6 && (s.escaladoUltimo >= 5 || s.turnosUltimo >= 2 * media);
  if (s.turnosUltimo >= 9 || largo) {
    notas.eterno = 1 + Math.max(0, s.turnosUltimo - 8) * 0.15 + Math.min(s.escaladoUltimo, 10) * 0.08;
  }
  // ended turns with energy to spare
  if (s.turnos >= 3) {
    const sobra = s.energiaSobrante / turnos;
    if (sobra >= 1) notas.tacano = 1 + (sobra - 1) * 0.8;
  }
  const perdido = s.danoRecibido + s.danoVeneno + s.autolesion;
  // poison or burn did the job
  if (s.ultimoGolpe === 'veneno') notas.envenenado = 2.5;
  else if (s.danoVeneno >= 25 && s.danoVeneno >= perdido * 0.3) notas.envenenado = 1 + s.danoVeneno / perdido;
  // the hero was his own worst enemy
  if (s.autolesion >= 20 && s.autolesion >= perdido * 0.25) notas.autolesion = 1 + (s.autolesion / perdido) * 2;
  // barely scratched anyone
  if (s.turnos >= 4) {
    const porTurno = s.danoHecho / turnos;
    if (porTurno < 6) notas.pacifista = 1 + (6 - porTurno) / 6;
  }
  return notas;
}

/** The habit the tombstone holds against the player (null: nothing worth a roast). */
export function peorHabito(s: EstadisticasRun | null | undefined, c: ContextoHabitos = {}): Habito | null {
  const notas = evaluarHabitos(s, c);
  let peor: Habito | null = null;
  for (const h of HABITOS) {
    const n = notas[h] ?? 0;
    if (n >= 1 && (peor === null || n > (notas[peor] ?? 0))) peor = h;
  }
  return peor;
}
