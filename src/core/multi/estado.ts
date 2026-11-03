import type { Presentador } from '../combate.ts';
import type { OfertaBendicion } from '../bendiciones.ts';
import type { EventoDef } from '../eventos.ts';
import type { OlvidoTaberna, RumorTaberna } from '../taberna.ts';
import type {
  CartaDef, CartaInstancia, ClaseId, EstadoRun, NodoMapa, OrigenReliquia, ReliquiaDef,
} from '../types.ts';
import type { CombateDuo } from './combate-duo.ts';
import type { FaseGuardada, Hueco, Pregunta, PresentadoresMulti } from './tipos.ts';

// Internal state of a two-player game. Only the parts outside a room are ever saved: inside a
// room the state is «the save taken when the room began + the entries since» (see partida.ts).

export type PreguntaEleccion = Extract<Pregunta, { tipo: 'eleccion' }>;

/** One step of what a hero has left to do in a room, in order. */
export type Paso =
  | { k: 'carta'; peso: number }          // card reward (weight of a rare one)
  | { k: 'descanso' }
  | { k: 'evento' }
  | { k: 'taberna' }
  | { k: 'bendicionEntreActos' }
  | { k: 'mision' }                       // the tavern quest of the room is paid (no question)
  | { k: 'cartaExtra' };                  // a relic adds a card reward to this kind of room (no question)

/** What a question opened for a hero needs to be resolved when its answer arrives. */
export type DatosPregunta =
  | { k: 'carta'; defs: CartaDef[] }
  | { k: 'descanso' }
  | { k: 'evento' }
  | { k: 'taberna'; rumores: RumorTaberna[]; olvido: OlvidoTaberna }
  | { k: 'bendicion'; ofertas: OfertaBendicion[] };

export interface PreguntaAbierta {
  pregunta: PreguntaEleccion;
  datos: DatosPregunta;
}

export interface HeroeEnSala {
  cola: Paso[];
  abierta: PreguntaAbierta | null;
  /** He has nothing left to do in this room and waits for the partner. */
  listo: boolean;
}

/** Relics offered to both heroes at once (elite, boss, chest): each picks one. */
export interface OfertaReliquias {
  origen: OrigenReliquia;
  ofertas: ReliquiaDef[];
  elecciones: Partial<Record<Hueco, string>>;
  /** Heroes with nothing to pick (no offered relic fits them): they get bandages instead. */
  sinOpciones: Partial<Record<Hueco, true>>;
}

export type EtapaSala = 'combate' | 'reliquia' | 'heroes' | 'dm';

export interface Sala {
  nodo: NodoMapa;
  etapa: EtapaSala;
  /** The fight in progress (also the Dungeon Master's). */
  combate: CombateDuo | null;
  /** The boss of the last act: after it comes the Dungeon Master. */
  ultimoJefe: boolean;
  reliquias: OfertaReliquias | null;
  /** What each hero does once the shared steps (fight, relics) are over. */
  pasosTras: Paso[];
  heroes: Record<Hueco, HeroeEnSala>;
  evento: EventoDef | null;
  /** Scenario of the next act, drawn when its boss falls (Síbila foretells it). */
  siguiente: number | null;
}

export type Fase =
  | FaseGuardada
  | { tipo: 'sala'; sala: Sala };

/** A card question in the middle of a card being played: the entry that played it is
 *  suspended until the `eleccion` that answers arrives. */
export interface PausaCarta {
  hueco: Hueco;
  clave: string;
  titulo: string;
  cartas: CartaInstancia[];
  cancelable: boolean;
  resolver(carta: CartaInstancia | null): void;
}

/** The work of the entry being applied (it may stop on a PausaCarta and go on later). */
export interface Curso {
  fin: boolean;
  error: unknown;
}

export interface PartidaMulti {
  semilla: number;
  clases: Record<Hueco, ClaseId>;
  /** Both heroes' runs. They share the map (same object) and the position in it. */
  runs: Record<Hueco, EstadoRun>;
  /** Number of the checkpoint the shared rng restarted from. */
  punto: number;
  /** The shared rng: the only source of randomness of the game. */
  rng: () => number;
  estadoRng: () => number;
  /** Next card instance id (card ids travel in the log, so every machine counts the same). */
  uidSiguiente: number;
  /** True at a checkpoint: nothing has been applied since it (so the game can be saved). */
  limpio: boolean;
  fase: Fase;
  // ── Runtime plumbing (never saved) ──
  pausa: PausaCarta | null;
  preguntasAbiertas: number;
  curso: Curso | null;
  despertar: (() => void) | null;
  pres: PresentadoresMulti | undefined;
  heroeUi: Record<Hueco, Presentador>;
}
