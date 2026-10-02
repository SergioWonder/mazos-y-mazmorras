import type { CartaDef, CartaInstancia, ClaseId, EstadoRun, TipoNodo } from './types.ts';
import { DEFENSA_SAGRADA, GOLPE_SAGRADO, instanciar, mazoInicial, nuevaMaldicion } from './cartas.ts';
import { reliquiaInicial } from './reliquias.ts';
import { generarMapa } from './mapa.ts';
import { crearRng } from './rng.ts';

export const PV_POR_CLASE: Record<ClaseId, number> = {
  druida: 70,
  barbaro: 80,
  mago: 62,
  picaro: 66,
  brujo: 64,
  paladin: 76,
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
    mision: null,
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

/** Curses currently in the run deck. */
export function maldicionesDe(run: EstadoRun): CartaInstancia[] {
  return run.mazo.filter((c) => c.def.tipo === 'maldicion');
}

/** Campfire «Purificar»: removes a curse from the deck (refuses any other card). */
/** Takes a card out of the run deck. With the Holy Symbol (paladin) a Strike or a
 *  Defend is not lost: it turns into its holy version, keeping its upgrade.
 *  Returns false if the card was not in the deck, and the new card if it changed. */
export function retirarCarta(run: EstadoRun, carta: CartaInstancia): false | { nueva?: CartaInstancia } {
  const i = run.mazo.indexOf(carta);
  if (i < 0) return false;
  const sagrada = run.reliquias.some((r) => r.id === 'simbolo-sagrado')
    ? { golpe: GOLPE_SAGRADO, defender: DEFENSA_SAGRADA }[carta.def.id]
    : undefined;
  if (!sagrada) {
    run.mazo.splice(i, 1);
    return {};
  }
  const nueva = instanciar(sagrada);
  nueva.mejorada = carta.mejorada;
  run.mazo[i] = nueva;
  return { nueva };
}

export function purificar(run: EstadoRun, carta: CartaInstancia): boolean {
  const i = run.mazo.indexOf(carta);
  if (i < 0 || carta.def.tipo !== 'maldicion') return false;
  run.mazo.splice(i, 1);
  return true;
}

/** Adds a curse to the run deck; returns its name for the story text. */
export function anadirMaldicion(run: EstadoRun, id: string): string {
  const carta = nuevaMaldicion(id);
  run.mazo.push(carta);
  return carta.def.nombre;
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

/** The scenario of the next act, drawn at random (one of its two maps). */
export function sortearEscenario(rng: () => number): number {
  return Math.floor(rng() * 2);
}

/** Prepara la run para el siguiente capítulo: nuevo mapa y respiro. `escenario` is the
 *  map already drawn (and foretold by Síbila); without it, one is drawn now. */
export function avanzarCapitulo(run: EstadoRun, rng: () => number, escenario = sortearEscenario(rng)) {
  run.capitulo++;
  run.escenario = escenario; // uno de los dos escenarios del nuevo acto
  run.mapa = generarMapa(rng);
  run.mision = null; // the old map's tavern quest cannot be followed any more
  run.nodoActual = -1;
  run.piso = 0;
  run.pv = Math.min(run.pvMax, run.pv + Math.floor(run.pvMax * 0.35));
}
