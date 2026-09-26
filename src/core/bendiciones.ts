import type { CartaDef, EstadoRun, ReliquiaDef, TipoBendicion } from './types.ts';
import { BENDICIONES, otorgarReliquia } from './reliquias.ts';
import { instanciar, NEUTRALES_ESPECIALES, cartaUnicaDeClase } from './cartas.ts';
import { barajar } from './rng.ts';

// Síbila's blessings: what each blessing screen offers and how a choice applies.
// Unique cards keep their old behaviour; everything else is a blessing relic.

/** One option of a blessing screen. */
export type OfertaBendicion =
  | { tipo: 'carta'; icono: string; nombre: string; detalle: string; carta: CartaDef }
  | { tipo: 'reliquia'; reliquia: ReliquiaDef };

const especial = (id: string): CartaDef => NEUTRALES_ESPECIALES.find((c) => c.id === id)!;

/** Unique colourless cards offered by the Seer depending on the act you are about to start. */
function cartasUnicas(run: EstadoRun): OfertaBendicion[] {
  if (run.capitulo === 0) {
    return [{
      tipo: 'carta', icono: '💘', nombre: 'Carta única: Seducir',
      detalle: 'Añade «Seducir» a tu mazo (incolora, tira 1d20)', carta: especial('seducir'),
    }];
  }
  if (run.capitulo === 1) {
    const unica = cartaUnicaDeClase(run.clase);
    return [
      {
        tipo: 'carta', icono: '🌟', nombre: `Carta única: ${unica.nombre}`,
        detalle: `Añade «${unica.nombre}» a tu mazo (única de clase)`, carta: unica,
      },
      {
        tipo: 'carta', icono: '🌠', nombre: 'Carta única: Deseo',
        detalle: 'Añade «Deseo» a tu mazo (incolora, tira 1d20)', carta: especial('deseo'),
      },
    ];
  }
  return [];
}

/** Blessing relics this run can still receive: not owned and general or of its class. */
export function bendicionesDisponibles(run: EstadoRun): ReliquiaDef[] {
  const propias = new Set(run.reliquias.map((r) => r.id));
  return BENDICIONES.filter((r) => !propias.has(r.id) && (!r.soloClase || r.soloClase === run.clase));
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

/** Between acts: the unique cards as before, plus blessing relics up to 3 options. */
export function ofrecerBendicionEntreActos(run: EstadoRun, rng: () => number): OfertaBendicion[] {
  const cartas = cartasUnicas(run);
  const huecos: Array<TipoBendicion[] | null> = [['clase', 'general'], ['pacto', 'mapa'], null];
  const n = Math.max(1, 3 - cartas.length);
  return [...cartas, ...elegirPorHuecos(run, rng, huecos.slice(0, n)).map(comoOferta)];
}

/** Applies the chosen option: the card goes to the deck, the relic to the relic bar. */
export function aplicarBendicion(run: EstadoRun, oferta: OfertaBendicion, rng: () => number) {
  if (oferta.tipo === 'carta') run.mazo.push(instanciar(oferta.carta));
  else otorgarReliquia(run, oferta.reliquia, rng);
}
