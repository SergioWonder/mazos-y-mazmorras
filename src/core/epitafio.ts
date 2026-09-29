// Tombstone of a fallen hero: what the defeat screen engraves (class, where and
// against whom the hero fell, how far the run got) and a darkly funny D&D epitaph
// picked deterministically from the run.

export interface DatosCaida {
  clase: string;
  /** 0-based act index. */
  capitulo: number;
  /** Act label, e.g. 'Capítulo II'. */
  subtitulo: string;
  /** Scenario name, e.g. 'El Asentamiento Ogro'. */
  escenario: string;
  /** Name of whoever dealt the killing blow (null if unknown: poison, own spell…). */
  asesino: string | null;
  /** Rooms entered in the run. */
  salas: number;
  /** Turns of the last combat (null if unknown). */
  turnos: number | null;
  semilla: number;
}

export interface Lapida {
  clase: string;
  lugar: string;
  asesino: string | null;
  cuenta: string;
  epitafio: string;
}

const NOMBRE_CLASE: Record<string, string> = {
  druida: 'Druida', barbaro: 'Bárbaro', mago: 'Mago', picaro: 'Pícaro', brujo: 'Brujo', paladin: 'Paladín',
};

/** Epitaphs; `{asesino}` ones are only used when the killer is known. */
export const EPITAFIOS: string[] = [
  'Tiró un 1 en el momento menos oportuno.',
  'Dijo «yo me encargo» sin mirar su hoja de personaje.',
  'Confió en el pícaro. Una vez.',
  'Abrió el cofre sin buscar trampas.',
  'Murió como vivió: sin curarse a tiempo.',
  'Guardaba la poción para una emergencia de verdad.',
  'Su última palabra fue «¿alguien tiene un clérigo?».',
  'El máster ni siquiera tuvo que hacer trampa.',
  'Falló la tirada de salvación. Las tres.',
  'Pensó que el bloqueo era opcional.',
  'Aquí yace. Ya puede dejar de tirar iniciativa.',
  'Subió de nivel… hasta el más allá.',
  'Se quedó sin energía, sin cartas y sin excusas.',
  '{asesino} aún cuenta esta historia en la taberna.',
  'Subestimó a {asesino}. {asesino} no le subestimó a él.',
  '{asesino} se quedó con sus botas.',
];

const pick = (seed: number, n: number) => {
  let h = Math.imul((seed | 0) ^ 0x5bd1e995, 2654435761) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  return ((h ^ (h >>> 13)) >>> 0) % n;
};

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Chooses the epitaph for this run (stable for the same data). */
export function elegirEpitafio(d: DatosCaida): string {
  const lista = d.asesino ? EPITAFIOS : EPITAFIOS.filter((e) => !e.includes('{asesino}'));
  const e = lista[pick(d.semilla + d.salas * 131 + d.capitulo * 7, lista.length)];
  return d.asesino ? e.split('{asesino}').join(d.asesino) : e;
}

/** Lines engraved on the tombstone. */
export function lapida(d: DatosCaida): Lapida {
  const cuenta = [plural(d.salas, 'sala', 'salas')];
  if (d.turnos !== null && d.turnos !== undefined) cuenta.push(plural(d.turnos, 'turno', 'turnos'));
  return {
    clase: NOMBRE_CLASE[d.clase] ?? d.clase,
    lugar: `Cayó en ${d.escenario} · ${d.subtitulo}`,
    asesino: d.asesino ? `A manos de ${d.asesino}` : null,
    cuenta: cuenta.join(' · '),
    epitafio: elegirEpitafio(d),
  };
}
