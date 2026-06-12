import type { CartaInstancia, EstadoRun, Rareza } from './types.ts';
import { instanciar, poolDeClase } from './cartas.ts';
import { POOL_RELIQUIAS } from './reliquias.ts';

/** Una opción de un evento. Devuelve el texto del desenlace. */
export interface OpcionEvento {
  etiqueta: string;
  detalle: string; // lo que arriesgas / ganas, visible antes de elegir
  aplicar: (run: EstadoRun, rng: () => number) => string;
}

export interface EventoDef {
  id: string;
  titulo: string;
  arte: string;
  texto: string;
  tono: 'positivo' | 'negativo';
  opciones: OpcionEvento[];
}

// ── Ayudantes de efectos ─────────────────────────────────────────────────────

function curar(run: EstadoRun, n: number): number {
  const real = Math.min(n, run.pvMax - run.pv);
  run.pv += real;
  return real;
}

function perderPV(run: EstadoRun, n: number): number {
  const real = Math.min(n, run.pv - 1); // los eventos nunca matan
  run.pv -= real;
  return real;
}

function mejorables(run: EstadoRun): CartaInstancia[] {
  return run.mazo.filter((c) => !c.mejorada && c.def.mejora);
}

function mejorarAleatorias(run: EstadoRun, rng: () => number, n: number): string {
  const nombres: string[] = [];
  for (let i = 0; i < n; i++) {
    const lista = mejorables(run);
    if (lista.length === 0) break;
    const carta = lista[Math.floor(rng() * lista.length)];
    carta.mejorada = true;
    nombres.push(`${carta.def.nombre}+`);
  }
  return nombres.length ? nombres.join(', ') : 'nada (no quedaban cartas mejorables)';
}

function cartaAleatoria(run: EstadoRun, rng: () => number, rarezas: Rareza[]): string {
  const pool = poolDeClase(run.clase).filter((c) => rarezas.includes(c.rareza));
  if (pool.length === 0) return 'nada';
  const def = pool[Math.floor(rng() * pool.length)];
  run.mazo.push(instanciar(def));
  return def.nombre;
}

function quitarCartaBasica(run: EstadoRun, rng: () => number, id?: string): string {
  const candidatas = run.mazo.filter((c) =>
    id ? c.def.id === id : c.def.id === 'golpe' || c.def.id === 'defender',
  );
  if (candidatas.length === 0) return 'ninguna carta';
  const carta = candidatas[Math.floor(rng() * candidatas.length)];
  run.mazo.splice(run.mazo.indexOf(carta), 1);
  return carta.def.nombre;
}

function quitarCartaAleatoria(run: EstadoRun, rng: () => number): string {
  // prioriza cartas no básicas (perderlas duele más narrativamente)
  const noBasicas = run.mazo.filter((c) => c.def.rareza !== 'inicial');
  const lista = noBasicas.length ? noBasicas : run.mazo;
  if (lista.length === 0) return 'ninguna carta';
  const carta = lista[Math.floor(rng() * lista.length)];
  run.mazo.splice(run.mazo.indexOf(carta), 1);
  return defNombre(carta);
}

function defNombre(c: CartaInstancia): string {
  return c.mejorada ? `${c.def.nombre}+` : c.def.nombre;
}

export function reliquiaAleatoria(run: EstadoRun, rng: () => number): string {
  const propias = new Set(run.reliquias.map((r) => r.id));
  const pool = POOL_RELIQUIAS.filter(
    (r) => !propias.has(r.id) && (!r.soloClase || r.soloClase === run.clase),
  );
  if (pool.length === 0) {
    curar(run, 8);
    return 'unas vendas viejas (+8 PV)';
  }
  const r = pool[Math.floor(rng() * pool.length)];
  run.reliquias.push(r);
  r.alObtener?.(run);
  return `${r.icono} ${r.nombre}`;
}

// ── Eventos positivos (~70 %) ────────────────────────────────────────────────

export const EVENTOS_POSITIVOS: EventoDef[] = [
  {
    id: 'altar-bosque', titulo: 'El Altar del Bosque', arte: '🌳', tono: 'positivo',
    texto:
      'Entre la maleza encuentras un altar de piedra cubierto de musgo. Las ofrendas resecas de otros viajeros se amontonan a sus pies, y el aire vibra con una energía antigua.',
    opciones: [
      {
        etiqueta: 'Rezar en silencio',
        detalle: 'Mejora 1 carta aleatoria',
        aplicar: (run, rng) => `El altar resplandece. Se mejora: ${mejorarAleatorias(run, rng, 1)}.`,
      },
      {
        etiqueta: 'Ofrenda de sangre',
        detalle: 'Pierde 5 PV · mejora 2 cartas aleatorias',
        aplicar: (run, rng) => {
          perderPV(run, 5);
          return `La piedra bebe tu sangre (-5 PV). Se mejoran: ${mejorarAleatorias(run, rng, 2)}.`;
        },
      },
      {
        etiqueta: 'Seguir adelante',
        detalle: 'Nada ocurre',
        aplicar: () => 'Dejas atrás el altar. El bosque guarda silencio.',
      },
    ],
  },
  {
    id: 'fuente', titulo: 'La Fuente Cristalina', arte: '⛲', tono: 'positivo',
    texto:
      'Una fuente de agua clarísima brota entre rocas blancas. Dicen que las aguas de estas tierras bendicen a quien se atreve a probarlas.',
    opciones: [
      {
        etiqueta: 'Beber',
        detalle: 'Cura 12 PV',
        aplicar: (run) => `El agua sabe a invierno limpio. Recuperas ${curar(run, 12)} PV.`,
      },
      {
        etiqueta: 'Sumergirte',
        detalle: '+5 PV máximos · el agua oxida tu equipo: pierdes 1 Defender',
        aplicar: (run, rng) => {
          run.pvMax += 5;
          run.pv += 5;
          const perdida = quitarCartaBasica(run, rng, 'defender');
          return `Sales del agua renovado (+5 PV máximos), pero tu equipo chorrea: pierdes ${perdida}.`;
        },
      },
      {
        etiqueta: 'Desconfiar',
        detalle: 'Nada ocurre',
        aplicar: () => 'Llenas la cantimplora y sigues. Mejor no tentar a la suerte.',
      },
    ],
  },
  {
    id: 'buhonero', titulo: 'El Buhonero', arte: '🧳', tono: 'positivo',
    texto:
      'Un buhonero de sonrisa torcida bloquea el sendero con su carromato. «Todo tiene un precio, aventurero. Y a veces el precio… eres tú.»',
    opciones: [
      {
        etiqueta: 'Trueque',
        detalle: 'Pierde 1 Golpe · gana una carta de tu clase',
        aplicar: (run, rng) => {
          const perdida = quitarCartaBasica(run, rng, 'golpe');
          const nueva = cartaAleatoria(run, rng, ['comun', 'infrecuente']);
          return `Entregas ${perdida} y recibes ${nueva}. El buhonero ríe entre dientes.`;
        },
      },
      {
        etiqueta: 'Pagar con sangre',
        detalle: 'Pierde 6 PV · gana una carta infrecuente',
        aplicar: (run, rng) => {
          perderPV(run, 6);
          const nueva = cartaAleatoria(run, rng, ['infrecuente']);
          return `El frasco se llena de rojo (-6 PV). A cambio: ${nueva}.`;
        },
      },
      {
        etiqueta: 'Rechazar',
        detalle: 'Nada ocurre',
        aplicar: () => 'El buhonero se encoge de hombros y arrea a su mula.',
      },
    ],
  },
  {
    id: 'herrero', titulo: 'El Herrero Caído', arte: '⚒️', tono: 'positivo',
    texto:
      'Junto al camino yace un herrero con la armadura destrozada por garras goblin. Su mano aún sujeta una piedra de afilar de runas tenues.',
    opciones: [
      {
        etiqueta: 'Tomar su piedra de afilar',
        detalle: 'Mejora 1 carta aleatoria',
        aplicar: (run, rng) =>
          `La piedra canta al rozar tu arma. Se mejora: ${mejorarAleatorias(run, rng, 1)}.`,
      },
      {
        etiqueta: 'Darle sepultura',
        detalle: 'Cura 7 PV',
        aplicar: (run) =>
          `Apilas piedras sobre el cuerpo. Una calma extraña te repara: +${curar(run, 7)} PV.`,
      },
    ],
  },
  {
    id: 'santuario', titulo: 'El Santuario Olvidado', arte: '⛩️', tono: 'positivo',
    texto:
      'Las ruinas de un santuario emergen de la niebla. En el altar central, algo brilla. Los muros susurran plegarias en una lengua que casi entiendes.',
    opciones: [
      {
        etiqueta: 'Meditar entre las ruinas',
        detalle: 'Gana una carta rara de tu clase',
        aplicar: (run, rng) =>
          `Las plegarias se ordenan en tu mente. Aprendes: ${cartaAleatoria(run, rng, ['rara'])}.`,
      },
      {
        etiqueta: 'Saquear el altar',
        detalle: 'Gana una reliquia · pierde 8 PV',
        aplicar: (run, rng) => {
          const r = reliquiaAleatoria(run, rng);
          perderPV(run, 8);
          return `Arrancas ${r} del altar. Una fuerza invisible te castiga (-8 PV).`;
        },
      },
      {
        etiqueta: 'Marcharte',
        detalle: 'Nada ocurre',
        aplicar: () => 'Algunas deudas no merecen contraerse. Te alejas.',
      },
    ],
  },
  {
    id: 'bardo', titulo: 'El Bardo del Camino', arte: '🪕', tono: 'positivo',
    texto:
      'Un bardo desafina junto a una hoguera moribunda. Al verte, se le ilumina la cara: «¡Material nuevo! Déjame verte el alma, héroe.»',
    opciones: [
      {
        etiqueta: 'Escuchar su balada',
        detalle: 'Cura 10 PV',
        aplicar: (run) => `Es horrible, pero reconforta. Recuperas ${curar(run, 10)} PV.`,
      },
      {
        etiqueta: 'Pedirle una epopeya',
        detalle: 'Mejora 1 carta aleatoria',
        aplicar: (run, rng) =>
          `Su canción exagera tus gestas… y tú decides estar a la altura. Se mejora: ${mejorarAleatorias(run, rng, 1)}.`,
      },
    ],
  },
  {
    id: 'forja-clan', titulo: 'La Forja del Clan Perdido', arte: '🔥', tono: 'positivo',
    texto:
      'Las brasas de una forja enana siguen vivas siglos después de que su clan desapareciera. El yunque rúnico aún canta cuando lo rozas.',
    opciones: [
      {
        etiqueta: 'Templar tu equipo',
        detalle: 'Mejora 2 cartas aleatorias',
        aplicar: (run, rng) => `El yunque canta dos veces. Se mejoran: ${mejorarAleatorias(run, rng, 2)}.`,
      },
      {
        etiqueta: 'Avivar el fuego ritual',
        detalle: 'Pierde 7 PV · mejora 3 cartas aleatorias',
        aplicar: (run, rng) => {
          perderPV(run, 7);
          return `Las llamas exigen su parte (-7 PV). Se mejoran: ${mejorarAleatorias(run, rng, 3)}.`;
        },
      },
      {
        etiqueta: 'No tocar nada',
        detalle: 'Nada ocurre',
        aplicar: () => 'Los enanos no perdonan a los intrusos, ni siquiera muertos. Sigues tu camino.',
      },
    ],
  },
  {
    id: 'cofre-extrano', titulo: 'El Cofre Extraño', arte: '📦', tono: 'positivo',
    texto:
      'Un cofre con remaches de bronce descansa en mitad del sendero. Demasiado limpio. Demasiado conveniente. Te parece oír… ¿una respiración?',
    opciones: [
      {
        etiqueta: 'Abrirlo',
        detalle: '70 %: reliquia · 30 %: ¡es un mímico! (pierde 10 PV)',
        aplicar: (run, rng) => {
          if (rng() < 0.7) return `Dentro brilla: ${reliquiaAleatoria(run, rng)}.`;
          perderPV(run, 10);
          return '¡El cofre tiene dientes! Te zafas a duras penas (-10 PV).';
        },
      },
      {
        etiqueta: 'Dejarlo donde está',
        detalle: 'Nada ocurre',
        aplicar: () => 'Le lanzas una piedra. El cofre… ¿gruñe? Mejor seguir.',
      },
    ],
  },
];

// ── Eventos negativos (~30 %) ────────────────────────────────────────────────

export const EVENTOS_NEGATIVOS: EventoDef[] = [
  {
    id: 'foso', titulo: 'El Foso de Estacas', arte: '🕳️', tono: 'negativo',
    texto:
      'El suelo cede bajo tus pies: una trampa goblin. Te aferras al borde de un foso erizado de estacas. La mochila tira de ti hacia abajo.',
    opciones: [
      {
        etiqueta: 'Impulsarte y saltar',
        detalle: 'Pierde 7 PV',
        aplicar: (run) => {
          perderPV(run, 7);
          return 'Una estaca te raja la pierna al saltar (-7 PV), pero sales.';
        },
      },
      {
        etiqueta: 'Soltar peso',
        detalle: 'Pierde 1 carta aleatoria',
        aplicar: (run, rng) =>
          `Arrojas la mochila al foso y trepas ileso. Pierdes: ${quitarCartaAleatoria(run, rng)}.`,
      },
    ],
  },
  {
    id: 'niebla', titulo: 'La Niebla Maldita', arte: '🌫️', tono: 'negativo',
    texto:
      'Una niebla verdosa repta por el desfiladero, y no hay otro camino. Dentro se oyen susurros que pronuncian tu nombre.',
    opciones: [
      {
        etiqueta: 'Cruzar despacio',
        detalle: 'Pierde 8 PV',
        aplicar: (run) => {
          perderPV(run, 8);
          return 'La niebla muerde cada palmo de piel expuesta (-8 PV).';
        },
      },
      {
        etiqueta: 'Correr a ciegas',
        detalle: '50 %: sales ileso · 50 %: pierde 12 PV',
        aplicar: (run, rng) => {
          if (rng() < 0.5) return 'Corres entre los susurros y sales ileso, con el corazón a mil.';
          perderPV(run, 12);
          return 'Tropiezas y la niebla se ceba contigo (-12 PV).';
        },
      },
    ],
  },
  {
    id: 'espiritu', titulo: 'El Espíritu Hambriento', arte: '👤', tono: 'negativo',
    texto:
      'Un espíritu translúcido te corta el paso. No ataca: extiende la mano, suplicante y terrible a la vez. Quiere algo de ti, y no se irá sin ello.',
    opciones: [
      {
        etiqueta: 'Ofrecerle tu esencia',
        detalle: '-4 PV máximos',
        aplicar: (run) => {
          run.pvMax = Math.max(20, run.pvMax - 4);
          run.pv = Math.min(run.pv, run.pvMax);
          return 'El espíritu bebe algo que no volverá (-4 PV máximos) y se disuelve en paz.';
        },
      },
      {
        etiqueta: 'Resistirte',
        detalle: 'Pierde 9 PV',
        aplicar: (run) => {
          perderPV(run, 9);
          return 'El espíritu aúlla y te atraviesa una y otra vez (-9 PV) antes de rendirse.';
        },
      },
    ],
  },
];

/** Elige un evento: ~70 % positivos / ~30 % negativos, sin repetir los ya vistos. */
export function elegirEvento(
  rng: () => number,
  vistos: Set<string>,
): EventoDef {
  const pool = rng() < 0.7 ? EVENTOS_POSITIVOS : EVENTOS_NEGATIVOS;
  const frescos = pool.filter((e) => !vistos.has(e.id));
  const lista = frescos.length ? frescos : pool;
  return lista[Math.floor(rng() * lista.length)];
}
