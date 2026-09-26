import type { EstadoRun, ReliquiaDef, TipoBendicion } from './types.ts';
import { BENDICIONES, otorgarReliquia } from './reliquias.ts';
import { barajar } from './rng.ts';

// Síbila's blessings: what each blessing screen offers and how a choice applies.
// Every option is a blessing relic; the unique-card ones put their card in the deck.

/** One option of a blessing screen. */
export type OfertaBendicion = { tipo: 'reliquia'; reliquia: ReliquiaDef };

/** Ids of the unique-card relics offered when starting each act (index = current act). */
const DONES_POR_ACTO: string[][] = [
  ['don-seducir'],
  // Class card first: only the one of the class being played survives the filter
  ['don-tormenta-venganza', 'don-furia-indomita', 'don-maestria-conjuros', 'don-danza-mortal', 'don-pacto-final', 'don-deseo'],
];

/** Unique-card relics offered by the Seer depending on the act you are about to start. */
function donesDeCartaUnica(run: EstadoRun): ReliquiaDef[] {
  const propias = new Set(run.reliquias.map((r) => r.id));
  return (DONES_POR_ACTO[run.capitulo] ?? [])
    .map((id) => BENDICIONES.find((r) => r.id === id)!)
    .filter((r) => !propias.has(r.id) && (!r.soloClase || r.soloClase === run.clase));
}

/** Blessing relics this run can still receive in a regular slot: not owned, general or
 *  of its class, and never a unique-card one (those only come at their act change). */
export function bendicionesDisponibles(run: EstadoRun): ReliquiaDef[] {
  const propias = new Set(run.reliquias.map((r) => r.id));
  return BENDICIONES.filter((r) => r.tipoBendicion !== 'unica'
    && !propias.has(r.id) && (!r.soloClase || r.soloClase === run.clase));
}

/**
 * Picks `n` distinct blessings following `huecos` (one kind per slot, `null` = any
 * kind); a slot whose kind has run out falls back to any blessing left.
 */
function elegirPorHuecos(
  run: EstadoRun, rng: () => number, huecos: Array<TipoBendicion | TipoBendicion[] | null>,
): ReliquiaDef[] {
  const restantes = barajar(rng, bendicionesDisponibles(run));
  const elegidas: ReliquiaDef[] = [];
  for (const hueco of huecos) {
    const tipos = hueco === null ? null : Array.isArray(hueco) ? hueco : [hueco];
    let i = restantes.findIndex((r) => !tipos || tipos.includes(r.tipoBendicion!));
    if (i < 0) i = restantes.length > 0 ? 0 : -1;
    if (i < 0) break;
    elegidas.push(...restantes.splice(i, 1));
  }
  return elegidas;
}

const comoOferta = (r: ReliquiaDef): OfertaBendicion => ({ tipo: 'reliquia', reliquia: r });

/** Opening blessing: 4 relics — one of your class, one general, one pact and a wildcard. */
export function ofrecerBendicionInicial(run: EstadoRun, rng: () => number): OfertaBendicion[] {
  return elegirPorHuecos(run, rng, ['clase', 'general', 'pacto', ['general', 'mapa']]).map(comoOferta);
}

/** Between acts: the unique-card relics of this act, plus blessing relics up to 3 options. */
export function ofrecerBendicionEntreActos(run: EstadoRun, rng: () => number): OfertaBendicion[] {
  const dones = donesDeCartaUnica(run);
  const huecos: Array<TipoBendicion[] | null> = [['clase', 'general'], ['pacto', 'mapa'], null];
  const n = Math.max(1, 3 - dones.length);
  return [...dones, ...elegirPorHuecos(run, rng, huecos.slice(0, n))].map(comoOferta);
}

/** Applies the chosen option: the relic goes to the relic bar (and runs its alObtener). */
export function aplicarBendicion(run: EstadoRun, oferta: OfertaBendicion, rng: () => number) {
  otorgarReliquia(run, oferta.reliquia, rng);
}
