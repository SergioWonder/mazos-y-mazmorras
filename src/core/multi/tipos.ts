import type { Presentador } from '../combate.ts';
import type { Guardado } from '../guardado.ts';
import type { ClaseId } from '../types.ts';

// Contract types of the two-player engine (see docs/multijugador.md). Everything in here is
// plain data except the presenters: the engine runs the same on the server (silent) and on
// both clients (with the screen's animations).

/** Who is who: `cara` invited (always heads in the coin), `cruz` accepted (always tails). */
export type Hueco = 'cara' | 'cruz';
export const HUECOS: readonly Hueco[] = ['cara', 'cruz'];
export const otroHueco = (h: Hueco): Hueco => (h === 'cara' ? 'cruz' : 'cara');

/** What a player sends. */
export type Entrada =
  | { tipo: 'mapa'; nodo: number }                                  // vote for the next node
  | { tipo: 'jugar'; carta: string; objetivo?: number }             // card instance id, enemy index
  | { tipo: 'finTurno' }
  | { tipo: 'eleccion'; clave: string; valor: number | string | null }; // answer to a Pregunta

/** An entry numbered by the room: the unit of the log. */
export type EntradaSellada = Entrada & { seq: number; de: Hueco };

/** One thing a hole has to decide right now, with its valid options. `null` when the hole
 *  has nothing to decide (it already answered and waits for the partner, or the game is over). */
export type Pregunta =
  | { tipo: 'mapa'; nodos: number[] }
  | {
    tipo: 'combate';
    /** Playable cards, each with the enemy indexes it can target (null: it needs no target). */
    jugables: Array<{ carta: string; objetivos: number[] | null }>;
    /** Ending the turn is always possible while there is a question of this kind. */
    puedeFinTurno: true;
  }
  | {
    tipo: 'eleccion';
    /** Identifies the question (it goes back in the answer). */
    clave: string;
    /** Which screen asks: 'bendicion', 'carta', 'reliquia', 'descanso', 'evento', 'taberna' or 'enCarta'. */
    contexto: string;
    /** Valid answers (`valor`). `null` appears when skipping is allowed. */
    opciones: Array<number | string | null>;
    /** Optional text for the screen (the question of a card in play). */
    titulo?: string;
  };

/** Outcome of a coin toss, for the screens to animate it. */
export interface ResultadoMoneda {
  motivo: 'mapa' | 'reliquia' | 'taberna';
  ganador: Hueco;
}

/** What the screens plug into the engine. All optional: without presenters `aplicar` runs
 *  silently (server, resync, tests). */
export interface PresentadoresMulti {
  /** The usual presenter of each hero's combat. Its `elegirCarta` is never used: the engine
   *  turns that question into a `Pregunta` of context 'enCarta' answered by an `eleccion`. */
  cara?: Presentador;
  cruz?: Presentador;
  /** A coin was tossed (map disagreement, same relic picked). */
  moneda?(r: ResultadoMoneda): Promise<void>;
  /** A hero's vote for the next node (shown before the votes are resolved). */
  votoMapa?(h: Hueco, nodo: number): Promise<void>;
  /** A hero has done his part of a shared step and waits for the partner. */
  esperandoAlCompanero?(h: Hueco): void;
  /** A line of narration for one hero (event outcome, relic received, quest done…). */
  aviso?(h: Hueco, texto: string): Promise<void>;
}

/** Saved game: the state at the start of a room (a point where nothing is half-resolved). */
export interface GuardadoMulti {
  v: 1;
  semilla: number;
  clases: Record<Hueco, ClaseId>;
  /** Each hero's solo save (the map is the same in both). */
  heroes: Record<Hueco, Guardado>;
  /** Number of the checkpoint: the shared rng restarts from it. */
  punto: number;
  fase: FaseGuardada;
}

/** The only phases a game can be saved in. Offers travel as ids. */
export type FaseGuardada =
  | { tipo: 'bendicion'; ofertas: Record<Hueco, string[]>; hechos: Record<Hueco, boolean> }
  | { tipo: 'mapa'; votos: Partial<Record<Hueco, number>> }
  | { tipo: 'fin'; victoria: boolean; finalVerdadero: boolean; epilogoDM: boolean };
