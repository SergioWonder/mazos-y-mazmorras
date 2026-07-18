import type { ClaseId, EstadoRun } from './types.ts';
import { mazoInicial } from './cartas.ts';
import { reliquiaInicial } from './reliquias.ts';
import { generarMapa } from './mapa.ts';
import { crearRng } from './rng.ts';

export const PV_POR_CLASE: Record<ClaseId, number> = {
  druida: 70,
  barbaro: 80,
  mago: 62,
  picaro: 66,
};

export function nuevaRun(clase: ClaseId, semilla = Date.now()): EstadoRun {
  const rng = crearRng(semilla);
  const pvMax = PV_POR_CLASE[clase];
  const escenario = Math.floor(rng() * 2);
  return {
    clase,
    pvMax,
    pv: pvMax,
    mazo: mazoInicial(clase),
    reliquias: [reliquiaInicial(clase)],
    mapa: generarMapa(rng),
    nodoActual: -1,
    piso: 0,
    capitulo: 0,
    escenario,
    semilla,
    espaciosConjuro: clase === 'mago' ? 1 : 0,
    permanentes: { fuerza: 0, destreza: 0, energia: 0, energiaElite: 0, energiaInicial: 0, robo: 0 },
    eventosVistos: [],
  };
}

/** Prepara la run para el siguiente capítulo: nuevo mapa y respiro. */
export function avanzarCapitulo(run: EstadoRun, rng: () => number) {
  run.capitulo++;
  run.escenario = Math.floor(rng() * 2); // uno de los dos escenarios del nuevo acto
  run.mapa = generarMapa(rng);
  run.nodoActual = -1;
  run.piso = 0;
  run.pv = Math.min(run.pvMax, run.pv + Math.floor(run.pvMax * 0.35));
}
