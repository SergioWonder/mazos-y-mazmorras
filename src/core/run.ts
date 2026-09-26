import type { CartaDef, CartaInstancia, ClaseId, EstadoRun, TipoNodo } from './types.ts';
import { instanciar, mazoInicial } from './cartas.ts';
import { reliquiaInicial } from './reliquias.ts';
import { generarMapa } from './mapa.ts';
import { crearRng } from './rng.ts';

export const PV_POR_CLASE: Record<ClaseId, number> = {
  druida: 70,
  barbaro: 80,
  mago: 62,
  picaro: 66,
  brujo: 64,
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

// ── Run-level relic hooks (campfires, deck, map) ─────────────────────────────

/** PV that resting at a campfire heals (30 % of max PV, then relic modifiers). */
export function curaDeDescanso(run: EstadoRun): number {
  let cura = Math.floor(run.pvMax * 0.3);
  for (const r of run.reliquias) if (r.curaDescanso) cura = r.curaDescanso(run, cura);
  return Math.max(0, cura);
}

/** Rests at a campfire: heals and lets the relics react. Returns PV healed. */
export function descansar(run: EstadoRun): number {
  const curado = Math.min(curaDeDescanso(run), run.pvMax - run.pv);
  run.pv += curado;
  for (const r of run.reliquias) r.alDescansar?.(run, curado);
  return curado;
}

/** Upgrades a card at a campfire; returns the extra upgrades made by relics. */
export function afilarCarta(run: EstadoRun, carta: CartaInstancia, rng: () => number): string[] {
  carta.mejorada = true;
  const extra: string[] = [];
  for (const r of run.reliquias) if (r.alAfilar) extra.push(...r.alAfilar(run, rng));
  return extra;
}

/** Adds a card to the deck, letting the relics touch it (Moradin's Anvil…). */
export function anadirCarta(run: EstadoRun, def: CartaDef): CartaInstancia {
  const inst = instanciar(def);
  run.mazo.push(inst);
  for (const r of run.reliquias) r.alAnadirCarta?.(run, inst);
  return inst;
}

/** Entering a map room: returns the lines the relics want to announce. */
export function entrarEnSala(run: EstadoRun, tipo: TipoNodo, rng: () => number): string[] {
  const notas: string[] = [];
  for (const r of run.reliquias) {
    const nota = r.alEntrarEnSala?.(run, tipo, rng);
    if (nota) notas.push(nota);
  }
  return notas;
}

/** true if some relic grants an extra card reward in this kind of room. */
export function cartaExtraEnSala(run: EstadoRun, tipo: TipoNodo): boolean {
  return run.reliquias.some((r) => r.recompensaCartaEn?.includes(tipo));
}

/** Rare-card weight of a card reward after the relics' multipliers. */
export function pesoRaroEfectivo(run: EstadoRun, base: number): number {
  return run.reliquias.reduce((peso, r) => peso * (r.pesoRaroMult ?? 1), base);
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
