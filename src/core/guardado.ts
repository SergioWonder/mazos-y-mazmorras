import type { ClaseId, EstadoRun, NodoMapa } from './types.ts';
import { cartaPorId, instanciar } from './cartas.ts';
import { reliquiaPorId } from './reliquias.ts';

const CLAVE = 'mazo-y-mazmorra/guardado';

/** Formato serializable: cartas y reliquias se guardan por id (las definiciones
 *  contienen funciones y no se pueden serializar). */
export interface Guardado {
  v: 1;
  clase: ClaseId;
  pvMax: number;
  pv: number;
  nodoActual: number;
  piso: number;
  capitulo: number;
  semilla: number;
  espaciosConjuro: number;
  permanentes: EstadoRun['permanentes'];
  eventosVistos: string[];
  mazo: Array<{ id: string; mejorada: boolean }>;
  reliquias: string[];
  mapa: NodoMapa[];
}

export function serializarRun(run: EstadoRun): Guardado {
  return {
    v: 1,
    clase: run.clase,
    pvMax: run.pvMax,
    pv: run.pv,
    nodoActual: run.nodoActual,
    piso: run.piso,
    capitulo: run.capitulo,
    semilla: run.semilla,
    espaciosConjuro: run.espaciosConjuro,
    permanentes: { ...run.permanentes },
    eventosVistos: [...run.eventosVistos],
    mazo: run.mazo.map((c) => ({ id: c.def.id, mejorada: c.mejorada })),
    reliquias: run.reliquias.map((r) => r.id),
    mapa: structuredClone(run.mapa),
  };
}

export function rehidratarRun(g: Guardado): EstadoRun | null {
  if (g.v !== 1) return null;
  const mazo = [];
  for (const c of g.mazo) {
    const def = cartaPorId(c.id);
    if (!def) return null; // carta desconocida: guardado de otra versión
    const inst = instanciar(def);
    inst.mejorada = c.mejorada;
    mazo.push(inst);
  }
  const reliquias = [];
  for (const id of g.reliquias) {
    const def = reliquiaPorId(id);
    if (!def) return null;
    reliquias.push(def);
  }
  // OJO: no se ejecuta alObtener() al rehidratar (sus efectos ya están en pvMax)
  return {
    clase: g.clase,
    pvMax: g.pvMax,
    pv: g.pv,
    mazo,
    reliquias,
    mapa: g.mapa,
    nodoActual: g.nodoActual,
    piso: g.piso,
    capitulo: g.capitulo,
    semilla: g.semilla,
    espaciosConjuro: g.espaciosConjuro,
    permanentes: { ...g.permanentes },
    eventosVistos: [...g.eventosVistos],
  };
}

export function guardarRun(run: EstadoRun) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(serializarRun(run)));
  } catch {
    /* almacenamiento lleno o no disponible: la partida sigue sin guardar */
  }
}

export function cargarRun(): EstadoRun | null {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return null;
    return rehidratarRun(JSON.parse(crudo) as Guardado);
  } catch {
    return null;
  }
}

export function hayGuardado(): boolean {
  try {
    return localStorage.getItem(CLAVE) !== null;
  } catch {
    return false;
  }
}

export function borrarGuardado() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    /* nada */
  }
}
