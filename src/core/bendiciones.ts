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
  ['don-tormenta-venganza', 'don-furia-indomita', 'don-maestria-conjuros', 'don-danza-mortal', 'don-pacto-final', 'don-angel-vengador', 'don-deseo'],
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

// ── What the Senescal and Síbila say: each speaks of the map that was drawn ──

const OFRENDA = 'El torreón guarda viejos tesoros bendecidos: llévate el que mejor te sirva.';

/** The Senescal's task, by the Act I scenario. He knows nothing yet of what lies below. */
const SENESCAL = [
  // El Asentamiento Ogro
  'Los goblins de Gorzug queman nuestras granjas y sus tambores ya se oyen desde el torreón. ' +
    'Ese ogro no se detendrá hasta que el condado entero arda. Acaba con él y el valle no lo olvidará.',
  // La Guarida de los Contrabandistas
  'Las caravanas desaparecen en el camino y nadie ve a los ladrones: dicen que una hermandad de ' +
    'ninjas se esconde bajo la posada vieja, y que la guía Vexis, un embaucador que juega con las sombras. ' +
    'Desenmascáralo y el valle no lo olvidará.',
];

/** Síbila's prophecy, by the act about to start (1 = Act II, 2 = Act III) and its scenario. */
const SIBILA: Record<number, string[]> = {
  1: [
    // La Cripta
    "Pero el agua me muestra algo peor: bajo las ruinas, Vol'guth despierta a los muertos y ata " +
      'su alma a una urna. Si cae, rompe la filacteria antes de que lo devuelva a la no-vida.',
    // El Templo Oscuro
    'Pero el agua se tiñe de negro: bajo la tierra, Malachar y su culto cantan para abrir la puerta ' +
      'del Abismo. Si cae el Heraldo, guárdate de lo que salga por ella.',
  ],
  2: [
    // La Guarida del Dragón
    'Pero el agua hierve: más abajo duerme Ignifax, el dragón rojo, señor oculto del valle. ' +
      'Cuando alce el vuelo, protégete de su aliento… o no quedará de ti ni la ceniza.',
    // El Laberinto del Contemplador
    'Pero el agua se arremolina y mil ojos me devuelven la mirada: en el corazón del laberinto ' +
      'aguarda el Contemplador. Cada uno de sus rayos tuerce las reglas de tu siguiente paso.',
  ],
};

/** The Senescal's words at the start, for the Act I scenario that was drawn. */
export function discursoSenescal(escenario: number): string {
  return `${SENESCAL[escenario] ?? SENESCAL[0]} ${OFRENDA}`;
}

/** Síbila's words between acts, for the act about to start and its scenario. */
export function discursoSibila(capitulo: number, escenario: number): string {
  const profecia = SIBILA[capitulo]?.[escenario] ?? SIBILA[capitulo]?.[0] ?? '';
  return `Has hecho retroceder a la oscuridad, peregrino. ${profecia} ` +
    'Descansa: el manantial cerrará tus heridas… y yo te daré algo más para el camino.';
}
