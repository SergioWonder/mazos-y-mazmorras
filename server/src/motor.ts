// What the Sala (room) needs from the game engine: an adapter over the real two-player engine (`src/core/multi`, pure
// TypeScript shared with the clients). The room runs it without presenters, so every entry applies silently.

import {
  aplicar, crearPartidaMulti, decisionBot, esPuntoDeGuardado, esValida, hashPartida, pendiente, rehidratarPartidaMulti,
  serializarPartidaMulti,
  type Entrada, type EntradaSellada, type GuardadoMulti, type Hueco, type PartidaMulti, type Pregunta,
} from '../../src/core/multi/index.ts';
import type { ResumenDuo } from './duo-runs.ts';

export type { Entrada, EntradaSellada, GuardadoMulti, Hueco, Pregunta };

export interface MotorSala {
  /** Would the engine accept this (sealed) entry right now? */
  esValida(entrada: EntradaSellada): boolean;
  /** Applies an accepted, numbered entry to the room state. Entries must be applied one at a time. */
  aplicar(entrada: EntradaSellada): Promise<void>;
  /** Cheap, stable digest of the state after the entries applied so far. */
  hash(): string;
  /** True at the start of a room (and when the game ends): the only moments the game can be saved. */
  esPuntoDeGuardado(): boolean;
  /** The game state as a save (only valid when `esPuntoDeGuardado`). */
  serializar(): GuardadoMulti;
  /** What this seat has to decide now (null: nothing). */
  pendiente(hueco: Hueco): Pregunta | null;
  /** The entry the bot would play for this seat. */
  decisionBot(hueco: Hueco, rng: () => number): Entrada | null;
  /** The run is over (victory or defeat). */
  terminada(): boolean;
  /** What the leaderboard needs once the run is over (null while it goes on). */
  resumenFinal(): ResumenDuo | null;
}

function envolver(p: PartidaMulti): MotorSala {
  return {
    esValida: (e) => esValida(p, e),
    aplicar: (e) => aplicar(p, e),
    hash: () => hashPartida(p),
    esPuntoDeGuardado: () => esPuntoDeGuardado(p),
    serializar: () => serializarPartidaMulti(p),
    pendiente: (h) => pendiente(p, h),
    decisionBot: (h, rng) => decisionBot(p, h, rng),
    terminada: () => p.fase.tipo === 'fin',
    resumenFinal: () => p.fase.tipo !== 'fin' ? null : {
      victory: p.fase.victoria,
      // true ending: the Dungeon Master fell to a natural 20 on Seduce (either hero)
      dmDefeated: p.fase.victoria && p.fase.finalVerdadero,
      chapter: p.runs.cara.capitulo,
      floor: p.runs.cara.piso,
      turns: p.runs.cara.estadisticas?.turnos ?? 0,
    },
  };
}

/** A new game from the seed and the two classes. */
export function crearMotor(opts: { semilla: number; clases: Record<Hueco, string> }): MotorSala {
  return envolver(crearPartidaMulti({ semilla: opts.semilla, clases: opts.clases as never }));
}

/** The game as it was at a room save. */
export function rehidratarMotor(guardado: GuardadoMulti): MotorSala {
  return envolver(rehidratarPartidaMulti(guardado));
}

const esEntero = (v: unknown): v is number => Number.isInteger(v);

/** Shape check of an entry coming from a client (semantic validity is the engine's job). */
export function esEntrada(v: unknown): v is Entrada {
  if (!v || typeof v !== 'object') return false;
  const e = v as Record<string, unknown>;
  switch (e.tipo) {
    case 'mapa': return esEntero(e.nodo);
    case 'jugar': return typeof e.carta === 'string' && e.carta.length <= 64 && (e.objetivo === undefined || esEntero(e.objetivo));
    case 'finTurno': return true;
    case 'eleccion':
      return typeof e.clave === 'string' && e.clave.length <= 64 &&
        (e.valor === null || esEntero(e.valor) || (typeof e.valor === 'string' && e.valor.length <= 64));
    default: return false;
  }
}
