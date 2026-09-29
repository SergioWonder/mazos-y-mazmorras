import type { CartaInstancia, EstadoRun, NodoMapa, ReliquiaDef, TipoNodo } from './types.ts';
import { candidatosMision, esAlcanzable } from './mapa.ts';
import { sortearReliquia, otorgarReliquia } from './reliquias.ts';

export { candidatosMision, esAlcanzable };

/** A rumour template: who tells it and which kind of node it points at.
 *  `{dist}` is replaced by the distance in days ("dos jornadas"…). */
export interface PlantillaRumor {
  tipo: TipoNodo;
  icono: string;
  narrador: string;
  texto: string;
}

/** A rumour offered in a tavern, already tied to a map node. */
export interface RumorTaberna {
  nodo: number;
  tipo: TipoNodo;
  icono: string;
  narrador: string;
  texto: string;
}

export const RUMORES: PlantillaRumor[] = [
  {
    tipo: 'combate', icono: '🍺', narrador: 'El tabernero',
    texto: 'Unos salteadores cobran peaje a los viajeros a {dist} de aquí. Quien les plante cara se quedará con lo que han robado.',
  },
  {
    tipo: 'combate', icono: '🧔', narrador: 'Un parroquiano con el brazo en cabestrillo',
    texto: 'Me asaltaron a {dist} de camino y se llevaron el amuleto de mi abuela. Si les das su merecido, quédatelo tú: a mí ya no me trae suerte.',
  },
  {
    tipo: 'elite', icono: '🪓', narrador: 'Una leñadora tuerta',
    texto: 'Dicen que un ogro solitario duerme a {dist} de aquí, sentado sobre el botín de una caravana entera. Nadie se atreve a despertarlo.',
  },
  {
    tipo: 'elite', icono: '🎻', narrador: 'El bardo',
    texto: 'Mi balada habla de un campeón caído que aún vela sus armas a {dist} de aquí. Quien lo derrote heredará su reliquia… y un verso nuevo.',
  },
  {
    tipo: 'evento', icono: '🎻', narrador: 'El bardo, entre dos acordes',
    texto: 'Hay un santuario olvidado a {dist} de aquí. Los que se detienen allí salen cambiados, y alguno, con un regalo en las manos.',
  },
  {
    tipo: 'evento', icono: '👵', narrador: 'La tabernera',
    texto: 'Una vieja adivina acampa a {dist} de aquí. Dile que vas de mi parte y te guardará algo especial cuando termine de leerte la suerte.',
  },
  {
    tipo: 'cofre', icono: '🧔', narrador: 'Un enano borracho',
    texto: 'Enterré mi cofre a {dist} de aquí, ¡hip!, bajo una losa con mi marca. No volveré a por él: lo que haya dentro, y lo que escondí debajo, es tuyo.',
  },
  {
    tipo: 'cofre', icono: '🍺', narrador: 'El tabernero, en voz baja',
    texto: 'Unos contrabandistas guardan un alijo a {dist} de aquí. El cofre es lo de menos: busca el doble fondo.',
  },
];

const DISTANCIAS = ['', 'una jornada', 'dos jornadas', 'tres jornadas', 'cuatro jornadas'];

function barajar<T>(rng: () => number, lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Up to `cuantos` rumours told in this tavern, each pointing at a different
 *  reachable node 2–4 rows ahead (different node types first, for variety). */
export function rumoresTaberna(
  run: EstadoRun, taberna: NodoMapa, rng: () => number, cuantos = 2,
): RumorTaberna[] {
  const candidatos = barajar(rng, candidatosMision(run.mapa, taberna.id));
  const elegidos: NodoMapa[] = [];
  for (const n of candidatos) {
    if (elegidos.length >= cuantos) break;
    if (!elegidos.some((e) => e.tipo === n.tipo)) elegidos.push(n);
  }
  for (const n of candidatos) {
    if (elegidos.length >= cuantos) break;
    if (!elegidos.includes(n)) elegidos.push(n);
  }
  const usadas = new Set<PlantillaRumor>();
  return elegidos.map((n) => {
    // prefer an unused template told by someone else, so two rumours never
    // come from the same patron
    const delTipo = RUMORES.filter((r) => r.tipo === n.tipo);
    const iconos = new Set([...usadas].map((r) => r.icono));
    const posibles = delTipo.filter((r) => !usadas.has(r) && !iconos.has(r.icono));
    const plantilla = barajar(rng, posibles.length ? posibles : delTipo)[0];
    usadas.add(plantilla);
    return {
      nodo: n.id,
      tipo: n.tipo,
      icono: plantilla.icono,
      narrador: plantilla.narrador,
      texto: plantilla.texto.replace('{dist}', DISTANCIAS[n.fila - taberna.fila] ?? 'unas jornadas'),
    };
  });
}

/** Follows a rumour: its node becomes the run's active quest. */
export function aceptarRumor(run: EstadoRun, rumor: RumorTaberna) {
  run.mision = { nodo: rumor.nodo, tipo: rumor.tipo, texto: rumor.texto };
}

/** Called after a room is cleared: if it was the quest node, grants a relic
 *  (once) and returns it. */
export function completarMision(
  run: EstadoRun, nodo: NodoMapa, rng: () => number,
): ReliquiaDef | undefined {
  if (!run.mision || run.mision.nodo !== nodo.id) return undefined;
  run.mision = null;
  const reliquia = sortearReliquia(run, rng, 'evento');
  if (reliquia) otorgarReliquia(run, reliquia, rng);
  return reliquia;
}

/** Drops the quest when its node can no longer be reached from where the
 *  player stands. Returns true if it was just lost. */
export function revisarMision(run: EstadoRun): boolean {
  const mision = run.mision;
  if (!mision) return false;
  if (run.nodoActual === mision.nodo) return false;
  const objetivo = run.mapa.find((n) => n.id === mision.nodo);
  if (objetivo && !objetivo.visitado && esAlcanzable(run.mapa, run.nodoActual, mision.nodo)) return false;
  run.mision = null;
  return true;
}

/** A way the tavern takes one card off the deck (instead of following a rumour). */
export interface OlvidoTaberna {
  etiqueta: string;
  detalle: string;
  /** Title of the card picker. */
  titulo: string;
  /** Announcement once the card is gone; `{carta}` is its name. */
  anuncio: string;
}

export const OLVIDOS_TABERNA: OlvidoTaberna[] = [
  {
    etiqueta: '🎲 Jugar a los dados con un tahúr',
    detalle: 'Te dejas ganar a propósito: elimina 1 carta de tu mazo, que el tahúr se lleva como premio. No sigues ningún rumor.',
    titulo: 'Elige la carta que apuestas (y pierdes)',
    anuncio: '🎲 El tahúr se guarda «{carta}» en la manga',
  },
  {
    etiqueta: '🎻 Contarle una hazaña al bardo',
    detalle: 'La historia se queda en su canción y tú la dejas atrás: elimina 1 carta de tu mazo. No sigues ningún rumor.',
    titulo: 'Elige la hazaña que regalas al bardo',
    anuncio: '🎻 «{carta}» ya solo vive en una balada',
  },
  {
    etiqueta: '🔥 Quemar un viejo pergamino en la chimenea',
    detalle: 'Hay técnicas que es mejor olvidar: elimina 1 carta de tu mazo. No sigues ningún rumor.',
    titulo: 'Elige lo que arrojas al fuego',
    anuncio: '🔥 «{carta}» se consume entre las brasas',
  },
  {
    etiqueta: '🍻 Brindar por los caídos hasta el amanecer',
    detalle: 'Entre jarra y jarra se te olvida una vieja costumbre: elimina 1 carta de tu mazo. No sigues ningún rumor.',
    titulo: 'Elige lo que olvidas esta noche',
    anuncio: '🍻 A la mañana siguiente no recuerdas «{carta}»',
  },
];

/** How this tavern offers the card removal (a random scene each visit). */
export function olvidoTaberna(rng: () => number): OlvidoTaberna {
  return OLVIDOS_TABERNA[Math.min(OLVIDOS_TABERNA.length - 1, Math.floor(rng() * OLVIDOS_TABERNA.length))];
}

/** Cards the tavern can take: any card of the deck. */
export function cartasEliminables(run: EstadoRun): CartaInstancia[] {
  return [...run.mazo];
}

/** Removes one card from the deck. Returns false if it was not in it. */
export function eliminarCarta(run: EstadoRun, carta: CartaInstancia): boolean {
  const i = run.mazo.indexOf(carta);
  if (i < 0) return false;
  run.mazo.splice(i, 1);
  return true;
}
