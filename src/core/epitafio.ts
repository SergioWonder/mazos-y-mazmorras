// Tombstone of a fallen hero: what the defeat screen engraves (class, where and
// against whom the hero fell, how far the run got) and a darkly funny D&D epitaph
// picked deterministically from the run. The epitaph takes turns between three
// voices, all of them mocking how the hero died: a roast of the player's worst
// habit (from the run statistics), a jab from the boss (or elite) that did it,
// and the general jokes.

import { peorHabito, type EstadisticasRun, type Habito } from './estadisticas.ts';

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
  /** Enemy id of the killer (to pick its own jabs). */
  asesinoId?: string | null;
  /** Boss of the fatal fight, if it was a boss fight (a minion's kill is the boss's credit). */
  jefeId?: string | null;
  /** What the hero did in the run (null/absent: no roast by statistics). */
  estadisticas?: EstadisticasRun | null;
  /** Cards in the run's deck. */
  mazo?: number;
  /** Curses the hero carried in the fatal fight. */
  maldiciones?: number;
}

export interface Lapida {
  clase: string;
  lugar: string;
  asesino: string | null;
  cuenta: string;
  epitafio: string;
}

/** Where the epitaph came from. */
export type FuenteEpitafio = 'habito' | 'jefe' | 'general';

export interface Epitafio {
  fuente: FuenteEpitafio;
  /** The habit being roasted (only for 'habito'). */
  habito: Habito | null;
  texto: string;
}

const NOMBRE_CLASE: Record<string, string> = {
  druida: 'Druida', barbaro: 'Bárbaro', mago: 'Mago', picaro: 'Pícaro', brujo: 'Brujo', paladin: 'Paladín',
};

/** General epitaphs; `{asesino}` ones are only used when the killer is known. */
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
  'Aquí yace. Ya puede dejar de tirar iniciativa.',
  'Subió de nivel… hasta el más allá.',
  'Se quedó sin energía, sin cartas y sin excusas.',
  'Leyó el pergamino en voz alta. Entero. Sin saber leer.',
  'Murió haciendo lo que más le gustaba: fallar.',
  'Pidió consejo al bardo. Error de principiante.',
  '{asesino} aún cuenta esta historia en la taberna.',
  'Subestimó a {asesino}. {asesino} no le subestimó a él.',
  '{asesino} se quedó con sus botas.',
];

/** Roasts of the player's worst habit. Holes: {asesino}, {turnos}, {mazo}, {maldiciones}. */
export const EPITAFIOS_HABITO: Record<Habito, string[]> = {
  novato: [
    'Su aventura duró menos que la presentación del máster.',
    'Llegó, vio y cayó en el primer combate.',
    'Se hizo la ficha con más cariño que el primer combate.',
    '{asesino} fue su primer enemigo. Y el último.',
  ],
  sinBloqueo: [
    'Pensó que el bloqueo era opcional.',
    'Su plan defensivo era matar primero. Falló el «primero».',
    'Defender era de cobardes. Ahora es un valiente muy plano.',
    'Paró todos los golpes. Con la cara.',
  ],
  eterno: [
    'Pretendía matar de aburrimiento a {asesino}.',
    '{asesino} tuvo tiempo de entrenar, merendar y matarle.',
    'Aguantó {turnos} turnos. {asesino} se puso cachas mirándole.',
    'Quiso ganar por aburrimiento. Ganó el aburrimiento.',
  ],
  tacano: [
    'Murió con energía de sobra. La ahorraba para el más allá.',
    'Acababa los turnos con energía, por si acaso. El caso llegó.',
    'Nunca gastó su energía. Ahora ya no le hará falta.',
  ],
  envenenado: [
    'Murió envenenado. Y aún culpaba a los dados.',
    'Nadie le dijo que el veneno no se cura solo.',
    'El veneno hizo el trabajo; {asesino} se llevó la fama.',
    'Se fue apagando a sorbitos. Ni una muerte digna.',
  ],
  autolesion: [
    'El enemigo más letal de la mazmorra fue él mismo.',
    'Lo suyo no fue una muerte, fue un autogol.',
    'Pagaba los combates con sus PV. Se le acabó el crédito.',
    '{asesino} solo remató lo que él ya había empezado.',
  ],
  maldito: [
    'Coleccionaba maldiciones como quien colecciona sellos.',
    'Murió con {maldiciones} maldiciones encima. «Mala suerte», dicen.',
    'Su mazo estaba más maldito que él. Y ya es decir.',
  ],
  acaparador: [
    'Llevaba {mazo} cartas y ninguna era la buena.',
    'Lo cogió todo. Hasta la muerte.',
    'Su mazo pesaba más que su armadura.',
  ],
  pacifista: [
    'Hizo menos daño que una mosca con resaca.',
    'Su golpe más fuerte fue contra el suelo.',
    '{asesino} ni se enteró de que estaba ahí.',
  ],
};

/** Jabs from the bosses (and the elites that fight alone), by enemy id. */
export const EPITAFIOS_JEFE: Record<string, string[]> = {
  'jefe-ogro': [
    'Gorzug no sabe contar, pero sus golpes sí.',
    'Lo aplastó Gorzug. Ni siquiera era su mejor día.',
    'Perdió contra un ogro que se come las cucharas.',
  ],
  'embaucador-arcano': [
    'Vexis le hizo un truco. El de desaparecer fue cosa suya.',
    'Le pegó fuerte a una ilusión. Vexis aún aplaude.',
    'Eligió una carta. Era la equivocada. Con Vexis siempre lo es.',
  ],
  'senor-cripta': [
    "Vol'guth tenía una filacteria. Él, una hoja de personaje.",
    "Mató a Vol'guth. Vol'guth no se dio por enterado.",
    "Ahora sirve a Vol'guth. Al menos tiene trabajo fijo.",
  ],
  'filacteria-volguth': [
    'Lo mató un jarrón. Un jarrón con ambición, eso sí.',
    "Rompió el cuerpo de Vol'guth y se olvidó del frasco.",
  ],
  'heraldo-culto': [
    'Malachar le prometió el paraíso. Mintió en lo del paraíso.',
    'Se unió al culto de Malachar. Como ofrenda.',
    'Malachar ya tiene vela nueva para el altar.',
  ],
  'demonio-mayor': [
    'Mató a Malachar para soltar a Abaddon. Gran plan.',
    'Abaddon se lo merendó y ni dio las gracias.',
  ],
  ignifax: [
    'Ignifax ya tiene otra antorcha para su cueva.',
    'Quiso el tesoro de Ignifax. Ahora es parte de la decoración.',
    'Llegó crudo a la guarida. Salió poco hecho.',
  ],
  contemplador: [
    'El Contemplador lo miró. Con eso bastó.',
    'Le dio la espalda a un ojo. Había diez más.',
    'Intentó sostenerle la mirada a alguien con once ojos.',
  ],
  hobgoblin: ['Lo tumbó un hobgoblin con galones. Solo galones.'],
  'ogro-joven': ['Ni siquiera era el ogro adulto.'],
  'capitan-bandido': ['El Capitán Bandido se quedó la bolsa. Y lo demás.'],
  'maestro-ninja': ['No vio venir al ninja. Nadie lo ve; esa es la gracia.'],
  'caballero-tumbario': ['El Caballero Tumbario ya tiene vecino de tumba.'],
  'momia-real': ['Una momia de mil años le ganó en aguante.'],
  'demonio-menor': ['Lo mató un demonio «menor». Imagina el mayor.'],
  'inquisidor-oscuro': ['El Inquisidor lo halló culpable. De ser blandito.'],
  'draco-veterano': ['El Draco Veterano tenía más experiencia. Y más dientes.'],
  'sumo-cultista': ['El Sumo Cultista se lo ofreció a Ignifax. Gratis.'],
  'azotamentes-anciano': ['El Azotamentes buscó su cerebro. Le costó encontrarlo.'],
  'cerebro-anciano': ['Lo derrotó un cerebro. Él no trajo el suyo.'],
  'mimico-cofre': ['Abrió el cofre. El cofre le abrió a él.'],
};

const pick = (seed: number, n: number) => {
  let h = Math.imul((seed | 0) ^ 0x5bd1e995, 2654435761) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  return ((h ^ (h >>> 13)) >>> 0) % n;
};

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** «Ignifax, el Dragón Rojo» → «Ignifax» (the stone already has the full name). */
const nombreCorto = (nombre: string) => nombre.split(',')[0].trim() || nombre;

/** Fills the holes of the phrases; those whose holes cannot be filled are left out. */
function rellenables(lista: string[], d: DatosCaida): string[] {
  const valores: Record<string, string | null> = {
    asesino: d.asesino ? nombreCorto(d.asesino) : null,
    turnos: d.turnos !== null && d.turnos !== undefined ? String(d.turnos) : null,
    mazo: d.mazo !== undefined ? String(d.mazo) : null,
    maldiciones: d.maldiciones !== undefined ? String(d.maldiciones) : null,
  };
  return lista
    .filter((t) => [...t.matchAll(/\{(\w+)\}/g)].every((m) => valores[m[1]] !== null && valores[m[1]] !== undefined))
    .map((t) => t.replace(/\{(\w+)\}/g, (_, k: string) => valores[k] ?? ''));
}

/** Chooses this death's epitaph and where it came from (stable for the same data). */
export function epitafioDe(d: DatosCaida): Epitafio {
  const semilla = d.semilla + d.salas * 131 + d.capitulo * 7;
  const habito = peorHabito(d.estadisticas, { mazo: d.mazo, maldiciones: d.maldiciones });
  const roast = habito ? rellenables(EPITAFIOS_HABITO[habito], d) : [];
  const deJefe = rellenables(
    (d.asesinoId ? EPITAFIOS_JEFE[d.asesinoId] : undefined) ?? (d.jefeId ? EPITAFIOS_JEFE[d.jefeId] : undefined) ?? [],
    d,
  );
  const general = rellenables(EPITAFIOS, d);
  // share of each voice (out of 100), depending on which ones have something to say
  const reparto: Array<[FuenteEpitafio, string[], number]> = [
    ['habito', roast, roast.length ? (deJefe.length ? 45 : 60) : 0],
    ['jefe', deJefe, deJefe.length ? (roast.length ? 30 : 55) : 0],
  ];
  let tirada = pick(semilla ^ 0x2c1b3c6d, 100);
  for (const [fuente, lista, peso] of reparto) {
    if (tirada < peso) return { fuente, habito: fuente === 'habito' ? habito : null, texto: lista[pick(semilla, lista.length)] };
    tirada -= peso;
  }
  return { fuente: 'general', habito: null, texto: general[pick(semilla, general.length)] };
}

/** Chooses the epitaph for this run (stable for the same data). */
export function elegirEpitafio(d: DatosCaida): string {
  return epitafioDe(d).texto;
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
