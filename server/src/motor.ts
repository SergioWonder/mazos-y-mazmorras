// What the Sala (room relay) needs from the game engine. Unit C plugs the real engine (`src/core/multi`) in here;
// until then the generic stub below only chains a hash over the entries so clients can already check their sync.

export type Hueco = 'cara' | 'cruz';

export type Entrada =
  | { tipo: 'mapa'; nodo: number }
  | { tipo: 'jugar'; carta: string; objetivo?: number }
  | { tipo: 'finTurno' }
  | { tipo: 'eleccion'; clave: string; valor: number | string | null };

export type EntradaSellada = Entrada & { seq: number; de: Hueco };

export interface MotorSala {
  /** Applies an accepted, numbered entry to the room state. */
  aplicar(entrada: EntradaSellada): void;
  /** Cheap, stable digest of the state after the entries applied so far. */
  hash(): string;
}

export const HASH_INICIAL = '00000000';

/** Engine-agnostic stand-in: the «state» is just a running FNV-1a digest of the entries. */
export function crearMotorGenerico(hashInicial: string = HASH_INICIAL): MotorSala {
  let actual = hashInicial;
  return {
    aplicar(entrada) {
      let h = 0x811c9dc5;
      for (const c of `${actual}|${JSON.stringify(entrada)}`) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0;
      actual = h.toString(16).padStart(8, '0');
    },
    hash: () => actual,
  };
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
