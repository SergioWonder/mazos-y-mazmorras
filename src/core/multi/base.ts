import type { Presentador } from '../combate.ts';
import { crearRngConEstado } from '../rng.ts';
import type { CartaInstancia } from '../types.ts';
import { HUECOS, type Hueco, type ResultadoMoneda } from './tipos.ts';
import type { PartidaMulti } from './estado.ts';

// Plumbing shared by the state machine: checkpoints, the coin, narration hooks and the
// presenters the combats talk to.

/** Mixes the game seed with a counter into a new seed (deterministic, well spread). */
export function mezclar(semilla: number, k: number): number {
  let x = Math.imul((semilla ^ 0x9e3779b9) >>> 0, 0x85ebca6b) ^ Math.imul(k + 1, 0xc2b2ae35);
  x ^= x >>> 15;
  x = Math.imul(x, 0x2c1b3c6d);
  x ^= x >>> 12;
  return x >>> 0;
}

/** The coin: `cara` or `cruz`, from the shared rng. Part of `aplicar`, never of the screen. */
export function moneda(rng: () => number): Hueco {
  return rng() < 0.5 ? 'cara' : 'cruz';
}

/** Gives every card of both decks an id by position: the same ids on every machine, whether
 *  the game was built from scratch or rebuilt from a save. */
function normalizarUids(p: PartidaMulti) {
  let n = 1;
  for (const h of HUECOS) for (const c of p.runs[h].mazo) c.uid = n++;
  p.uidSiguiente = n;
}

/** A checkpoint: a point where nothing is half-resolved. From here the shared rng restarts
 *  from a seed derived from the checkpoint's number, and card ids are renumbered, so a game
 *  rebuilt from a save of this moment continues exactly like the one that never stopped. */
export function establecerPunto(p: PartidaMulti) {
  p.punto++;
  fijarRng(p);
  normalizarUids(p);
  p.preguntasAbiertas = 0;
  p.limpio = true;
}

export function fijarRng(p: PartidaMulti) {
  const r = crearRngConEstado(mezclar(p.semilla, p.punto));
  p.rng = r.rng;
  p.estadoRng = r.estado;
}

export async function tirarMoneda(p: PartidaMulti, motivo: ResultadoMoneda['motivo']): Promise<Hueco> {
  const ganador = moneda(p.rng);
  await p.pres?.moneda?.({ motivo, ganador });
  return ganador;
}

export async function aviso(p: PartidaMulti, h: Hueco, texto: string) {
  await p.pres?.aviso?.(h, texto);
}

/** The presenter a hero's combat talks to. It forwards to whatever the screen plugged into
 *  the entry being applied (nothing: silent) and turns «pick a card» questions into pauses
 *  answered by an `eleccion` entry. */
export function crearUiHeroe(p: PartidaMulti, h: Hueco): Presentador {
  const real = () => p.pres?.[h];
  const ok = Promise.resolve();
  return {
    render: () => real()?.render(),
    espera: (ms) => real()?.espera(ms) ?? ok,
    fxGolpe: (o, d, fx) => real()?.fxGolpe(o, d, fx) ?? ok,
    fxBloqueo: (o, n) => real()?.fxBloqueo(o, n) ?? ok,
    fxEstado: (o, e, n) => real()?.fxEstado(o, e, n) ?? ok,
    fxCura: (o, n) => real()?.fxCura(o, n) ?? ok,
    fxMuerte: (e, causa) => real()?.fxMuerte(e, causa) ?? ok,
    fxMensaje: (t) => real()?.fxMensaje(t) ?? ok,
    fxEnemigoActua: (e) => real()?.fxEnemigoActua(e) ?? ok,
    fxFuriaPerdida: () => real()?.fxFuriaPerdida() ?? ok,
    fxDado: (n, c, t) => real()?.fxDado(n, c, t) ?? ok,
    fxDadoVentaja: (a, b, c, t) => real()?.fxDadoVentaja(a, b, c, t) ?? ok,
    fxParticulas: (o, e) => real()?.fxParticulas(o, e) ?? ok,
    fxInvocacionGolpe: (d) => real()?.fxInvocacionGolpe(d) ?? ok,
    fxInvocacionMuerte: () => real()?.fxInvocacionMuerte() ?? ok,
    fxInvocacionAtaca: () => real()?.fxInvocacionAtaca() ?? ok,
    fxInvocacionCura: (n) => real()?.fxInvocacionCura(n) ?? ok,
    fxDialogo: (e, txt) => {
      const r = real();
      if (!r) return ok;
      return r.fxDialogo ? r.fxDialogo(e, txt) : r.fxMensaje(`🎲 «${txt}»`);
    },
    fxMuerteHeroe: () => real()?.fxMuerteHeroe?.() ?? ok,
    fxEsperarMuerte: (e) => real()?.fxEsperarMuerte?.(e) ?? ok,
    elegirCarta: (cartas, titulo, opciones) => preguntarCarta(p, h, cartas, titulo, opciones?.cancelable !== false),
  };
}

/** A card in play asks its hero to pick a card: the entry stops here until the answer comes. */
function preguntarCarta(
  p: PartidaMulti, h: Hueco, cartas: CartaInstancia[], titulo: string, cancelable: boolean,
): Promise<CartaInstancia | null> {
  return new Promise((resolver) => {
    p.pausa = { hueco: h, clave: `enCarta:${++p.preguntasAbiertas}`, titulo, cartas: [...cartas], cancelable, resolver };
    p.despertar?.();
  });
}
