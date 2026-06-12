import type { EnemigoDef, EnemigoCombate, Movimiento } from './types.ts';

const atk = (nombre: string, dano: number, veces = 1, efectos?: Movimiento['efectos']): Movimiento => ({
  nombre, intencion: 'ataque', dano, veces, efectos,
});
const def = (nombre: string, bloqueo: number, efectos?: Movimiento['efectos']): Movimiento => ({
  nombre, intencion: 'defensa', bloqueo, efectos,
});

// ═══ Capítulo I: Asentamiento Ogro ═══════════════════════════════════════════

export const GOBLIN_CORTADOR: EnemigoDef = {
  id: 'goblin-cortador', nombre: 'Goblin Cortador', arte: '👺', pv: [16, 20],
  ia: (turno, rng) => {
    if (turno > 0 && turno % 3 === 2) return atk('Tajo Sucio', 10);
    return rng() < 0.72 ? atk('Puñalada', 7) : def('Esconderse', 6);
  },
};

export const GOBLIN_ARQUERO: EnemigoDef = {
  id: 'goblin-arquero', nombre: 'Goblin Arquero', arte: '🏹', pv: [14, 17],
  ia: (turno, rng) => {
    if (rng() < 0.35) return atk('Flecha Pegajosa', 5, 1, [['debil', 1, true]]);
    return rng() < 0.5 ? atk('Disparo Doble', 4, 2) : atk('Flecha', 6);
  },
};

export const GOBLIN_CHAMAN: EnemigoDef = {
  id: 'goblin-chaman', nombre: 'Goblin Chamán', arte: '🧙', pv: [18, 22],
  ia: (turno, rng) => {
    if (turno === 0) return { nombre: 'Cántico Salvaje', intencion: 'mejora', fuerzaAliados: 2 };
    if (rng() < 0.35)
      return { nombre: 'Maldición', intencion: 'perjuicio', efectos: [['debil', 2, true]] };
    return atk('Chispa Verde', 8);
  },
};

export const WORG: EnemigoDef = {
  id: 'worg', nombre: 'Worg', arte: '🐺', pv: [26, 30], escala: 1.15,
  ia: (turno, rng) => {
    if (rng() < 0.4) return atk('Desgarro', 6, 1, [['vulnerable', 1, true]]);
    return atk('Mordisco', 9);
  },
};

export const HOBGOBLIN: EnemigoDef = {
  id: 'hobgoblin', nombre: 'Hobgoblin Capitán', arte: '⚔️', pv: [44, 48], escala: 1.25,
  ia: (turno, rng) => {
    if (turno % 3 === 0) return def('Muro de Escudos', 9, [['fuerza', 1, false]]);
    if (rng() < 0.4) return atk('Golpe de Escudo', 7, 1, [['debil', 1, true]]);
    return atk('Espadazo', 12);
  },
};

export const OGRO_JOVEN: EnemigoDef = {
  id: 'ogro-joven', nombre: 'Ogro Joven', arte: '👹', pv: [52, 58], escala: 1.4,
  ia: (turno, rng) => {
    if (turno % 4 === 3) return { nombre: 'Rugido', intencion: 'mejora', efectos: [['fuerza', 2, false]] };
    if (rng() < 0.35) return atk('Pisotón', 9, 1, [['vulnerable', 1, true]]);
    return atk('Garrotazo', 15);
  },
};

export const GOBLIN_FAMELICO: EnemigoDef = {
  id: 'goblin-famelico', nombre: 'Goblin Famélico', arte: '👺', pv: [5, 7], escala: 0.8,
  ia: (turno, rng) => (rng() < 0.3 ? atk('Mordisquitos', 2, 2) : atk('Navajazo', 4)),
};

export const JEFE_OGRO: EnemigoDef = {
  id: 'jefe-ogro', nombre: 'Gorzug, Jefe Ogro', arte: '👹', pv: [115, 115], escala: 1.9,
  rasgo: {
    nombre: 'Devorador',
    texto: 'Invoca goblins famélicos y puede devorar a uno vivo para curarse 20 PV y ganar 3 de Fuerza. Mata a los goblins antes de que se los coma.',
  },
  ia: (turno, rng, self, aliados) => {
    if (turno === 0)
      return {
        nombre: 'Llamada de Guerra', intencion: 'mejora',
        invocar: [
          { def: GOBLIN_FAMELICO, pv: 6 },
          { def: GOBLIN_FAMELICO, pv: 6 },
        ],
      };
    const ciclo = turno % 4;
    if (ciclo === 1) {
      if (aliados.length > 0)
        return { nombre: 'Devorar Goblin', intencion: 'mejora', devorar: { cura: 20, fuerza: 3 } };
      return {
        nombre: 'Rugido Atronador', intencion: 'mejora',
        efectos: [['fuerza', 2, false], ['debil', 1, true]],
      };
    }
    if (ciclo === 2) return atk('Garrotazo Brutal', 17);
    if (ciclo === 3) return atk('Aplastamiento', 10, 1, [['vulnerable', 2, true]]);
    // ciclo 0 (turnos 4, 8…): repone su despensa si está vacía
    if (aliados.length === 0)
      return {
        nombre: 'Llamada de Guerra', intencion: 'mejora',
        invocar: [{ def: GOBLIN_FAMELICO, pv: 6 }, { def: GOBLIN_FAMELICO, pv: 6 }],
      };
    return atk('Doble Mazazo', 9, 2);
  },
};

// ═══ Capítulo II: La Cripta ══════════════════════════════════════════════════

export const ESQUELETO_GUERRERO: EnemigoDef = {
  id: 'esqueleto-guerrero', nombre: 'Esqueleto Guerrero', arte: '💀', pv: [24, 28],
  ia: (turno, rng) => {
    if (turno % 3 === 2) return def('Guardia Ósea', 8);
    return rng() < 0.45 ? atk('Doble Tajo', 6, 2) : atk('Espadazo Oxidado', 10);
  },
};

export const ESQUELETO_ARQUERO: EnemigoDef = {
  id: 'esqueleto-arquero', nombre: 'Esqueleto Arquero', arte: '🏹', pv: [18, 22],
  ia: (turno, rng) => {
    if (rng() < 0.3) return atk('Flecha Maldita', 6, 1, [['fragil', 2, true]]);
    return rng() < 0.5 ? atk('Doble Disparo', 5, 2) : atk('Flecha Negra', 8);
  },
};

export const ZOMBI: EnemigoDef = {
  id: 'zombi', nombre: 'Zombi', arte: '🧟', pv: [34, 38], escala: 1.15,
  ia: (turno, rng) => {
    if (rng() < 0.25)
      return { nombre: 'Carne Putrefacta', intencion: 'defensa', bloqueo: 5, cura: 5 };
    if (rng() < 0.4) return atk('Dentellada', 8, 1, [['vulnerable', 1, true]]);
    return atk('Embestida Pútrida', 12);
  },
};

export const ESPECTRO: EnemigoDef = {
  id: 'espectro', nombre: 'Espectro', arte: '👻', pv: [26, 30], escala: 1.1,
  ia: (turno, rng) => {
    if (turno % 4 === 1)
      return { nombre: 'Lamento Fúnebre', intencion: 'perjuicio', efectos: [['debil', 2, true]] };
    if (rng() < 0.45)
      return { nombre: 'Toque Drenante', intencion: 'ataque', dano: 8, cura: 4 };
    return atk('Garra Helada', 9);
  },
};

export const NECROFAGO: EnemigoDef = {
  id: 'necrofago', nombre: 'Necrófago', arte: '🧛', pv: [28, 32],
  ia: (turno, rng) => {
    if (rng() < 0.35) return atk('Zarpa Paralizante', 7, 1, [['debil', 1, true], ['fragil', 1, true]]);
    return atk('Garras Voraces', 6, 2);
  },
};

export const CABALLERO_TUMBARIO: EnemigoDef = {
  id: 'caballero-tumbario', nombre: 'Caballero Tumbario', arte: '🛡️', pv: [68, 74], escala: 1.3,
  ia: (turno, rng) => {
    if (turno % 3 === 0) return def('Muro Sepulcral', 10, [['fuerza', 2, false]]);
    return rng() < 0.4 ? atk('Carga Fantasmal', 9, 2) : atk('Mandoble Maldito', 15);
  },
};

export const MOMIA_REAL: EnemigoDef = {
  id: 'momia-real', nombre: 'Momia Real', arte: '🪦', pv: [60, 66], escala: 1.3,
  ia: (turno, rng) => {
    if (turno % 4 === 0)
      return {
        nombre: 'Maldición Faraónica', intencion: 'perjuicio',
        efectos: [['debil', 2, true], ['fragil', 2, true]],
      };
    if (rng() < 0.3)
      return { nombre: 'Vendas Reparadoras', intencion: 'defensa', bloqueo: 8, cura: 6 };
    return atk('Puño Vendado', 13);
  },
};

export const SENOR_CRIPTA: EnemigoDef = {
  id: 'senor-cripta', nombre: "Vol'guth, Señor de la Cripta", arte: '🧙‍♂️', pv: [140, 140], escala: 1.8,
  pasiva: 'filacteria',
  rasgo: {
    nombre: 'Filacteria',
    texto: 'La primera vez que sus PV llegan a 0, su filacteria lo devuelve a la no-vida con 30 PV. Tendrás que matarlo dos veces.',
  },
  ia: (turno) => {
    const ciclo = turno % 4;
    if (ciclo === 0)
      return {
        nombre: 'Maldición Eterna', intencion: 'perjuicio',
        efectos: [['debil', 2, true], ['fragil', 2, true], ['fuerza', 2, false]],
      };
    if (ciclo === 1) return { nombre: 'Drenar Vida', intencion: 'ataque', dano: 13, cura: 8 };
    if (ciclo === 2) return atk('Lluvia de Huesos', 7, 3);
    return atk('Nova Necrótica', 20);
  },
};

// ═══ Capítulo III: La Guarida del Dragón ═════════════════════════════════════

export const KOBOLD_LANCERO: EnemigoDef = {
  id: 'kobold-lancero', nombre: 'Kobold Lancero', arte: '🦎', pv: [30, 34],
  ia: (turno, rng) => {
    if (rng() < 0.3) return atk('Trampa de Abrojos', 7, 1, [['fragil', 2, true]]);
    return rng() < 0.5 ? atk('Doble Lanzada', 7, 2) : atk('Lanza Dracónica', 11);
  },
};

export const KOBOLD_HECHICERO: EnemigoDef = {
  id: 'kobold-hechicero', nombre: 'Kobold Hechicero', arte: '🜂', pv: [28, 32],
  ia: (turno, rng) => {
    if (turno === 0) return { nombre: 'Bendición Dracónica', intencion: 'mejora', fuerzaAliados: 2 };
    if (rng() < 0.3)
      return { nombre: 'Humo Cegador', intencion: 'perjuicio', efectos: [['debil', 2, true]] };
    return atk('Chispa Ígnea', 10);
  },
};

export const CULTISTA_DRAGON: EnemigoDef = {
  id: 'cultista-dragon', nombre: 'Cultista del Dragón', arte: '🥷', pv: [36, 40],
  ia: (turno, rng, self) => {
    if (turno % 3 === 1)
      return { nombre: 'Ofrenda de Sangre', intencion: 'mejora', efectos: [['fuerza', 3, false]] };
    return rng() < 0.4 ? atk('Daga Ritual', 8, 2) : atk('Tajo Fanático', 12);
  },
};

export const DRACO_JOVEN: EnemigoDef = {
  id: 'draco-joven', nombre: 'Draco Joven', arte: '🐲', pv: [44, 48], escala: 1.25,
  ia: (turno, rng) => {
    if (rng() < 0.3) return atk('Aliento Chispeante', 6, 2);
    if (rng() < 0.45) return atk('Coletazo', 9, 1, [['vulnerable', 1, true]]);
    return atk('Mordisco', 13);
  },
};

export const ELEMENTAL_MAGMA: EnemigoDef = {
  id: 'elemental-magma', nombre: 'Elemental de Magma', arte: '🌋', pv: [38, 42], escala: 1.2,
  ia: (turno, rng) => {
    if (turno % 3 === 2)
      return { nombre: 'Cuerpo Ardiente', intencion: 'defensa', bloqueo: 10, cura: 4 };
    if (rng() < 0.35) return atk('Salpicadura de Lava', 8, 1, [['fragil', 1, true]]);
    return atk('Erupción', 14);
  },
};

export const DRACO_VETERANO: EnemigoDef = {
  id: 'draco-veterano', nombre: 'Draco Veterano', arte: '🐉', pv: [88, 95], escala: 1.45,
  ia: (turno, rng) => {
    if (turno % 4 === 3) return { nombre: 'Rugido Escamoso', intencion: 'mejora', efectos: [['fuerza', 2, false]] };
    if (rng() < 0.4) return atk('Aliento de Fuego', 9, 2);
    return atk('Garra Desgarradora', 16);
  },
};

export const SUMO_CULTISTA: EnemigoDef = {
  id: 'sumo-cultista', nombre: 'Sumo Cultista de Ignifax', arte: '🧙‍♀️', pv: [80, 86], escala: 1.35,
  ia: (turno, rng, self, aliados) => {
    if (turno % 4 === 0 && aliados.length === 0)
      return {
        nombre: 'Llamada al Nido', intencion: 'mejora',
        invocar: [{ def: KOBOLD_LANCERO, pv: 14 }],
      };
    if (turno % 4 === 2)
      return {
        nombre: 'Maldición Dracónica', intencion: 'perjuicio',
        efectos: [['debil', 2, true], ['fragil', 2, true]],
      };
    if (rng() < 0.4) return { nombre: 'Drenar Esencia', intencion: 'ataque', dano: 12, cura: 6 };
    return atk('Látigo de Fuego', 14);
  },
};

export const IGNIFAX: EnemigoDef = {
  id: 'ignifax', nombre: 'Ignifax, el Dragón Rojo', arte: '🐉', pv: [200, 200], escala: 2.2,
  rasgo: {
    nombre: 'Corazón de Magma',
    texto: 'La primera vez que baja de la mitad de sus PV se enfurece: se cura 25 y gana +3 de Fuerza. Cuando alza el vuelo, al turno siguiente desata su Aliento Ígneo (30): bloquea o anula su ataque.',
  },
  ia: (turno, rng, self) => {
    // Enfurecimiento único al cruzar la mitad de la vida
    if (!self.rasgoUsado && self.pv <= self.pvMax / 2) {
      self.rasgoUsado = true;
      return {
        nombre: 'Corazón de Magma', intencion: 'mejora',
        cura: 25, efectos: [['fuerza', 3, false]],
      };
    }
    if (turno === 0)
      return {
        nombre: 'Rugido del Tesoro', intencion: 'mejora',
        efectos: [['fuerza', 2, false], ['debil', 1, true]],
      };
    const ciclo = turno % 4;
    if (ciclo === 1) return atk('Garra Incandescente', 18);
    if (ciclo === 2) return atk('Coletazo Brutal', 12, 1, [['vulnerable', 2, true]]);
    if (ciclo === 3) return def('Alza el Vuelo', 20);
    return atk('ALIENTO ÍGNEO', 30);
  },
};

// ═══ Capítulos ═══════════════════════════════════════════════════════════════

export interface Capitulo {
  nombre: string;
  subtitulo: string;
  intro: string;
  ambiente: 'brasas' | 'almas';
  normales: EnemigoDef[][];
  elites: EnemigoDef[][];
  jefe: EnemigoDef[];
}

export const CAPITULOS: Capitulo[] = [
  {
    nombre: 'El Asentamiento Ogro',
    subtitulo: 'Capítulo I',
    intro:
      'Los tambores de guerra resuenan en el valle. Una banda de goblins, al servicio del temible Gorzug, asola las aldeas del condado.',
    ambiente: 'brasas',
    normales: [
      [GOBLIN_CORTADOR, GOBLIN_ARQUERO],
      [GOBLIN_ARQUERO, GOBLIN_ARQUERO],
      [WORG],
      [GOBLIN_CHAMAN, GOBLIN_CORTADOR],
      [WORG, GOBLIN_ARQUERO],
      [WORG, GOBLIN_CORTADOR],
      [GOBLIN_CORTADOR, GOBLIN_CORTADOR, GOBLIN_ARQUERO],
      [GOBLIN_CHAMAN, WORG],
    ],
    elites: [[HOBGOBLIN], [OGRO_JOVEN]],
    jefe: [JEFE_OGRO],
  },
  {
    nombre: 'La Cripta',
    subtitulo: 'Capítulo II',
    intro:
      'Bajo las ruinas del asentamiento se abre una escalera de piedra negra. Del fondo asciende un frío antiguo: la cripta de Vol\'guth, donde los muertos no descansan.',
    ambiente: 'almas',
    normales: [
      [ESQUELETO_GUERRERO],
      [ESQUELETO_GUERRERO, ESQUELETO_ARQUERO],
      [ZOMBI],
      [NECROFAGO, ESQUELETO_ARQUERO],
      [ESPECTRO],
      [ESPECTRO, ZOMBI],
      [ESQUELETO_GUERRERO, ESQUELETO_GUERRERO, ESQUELETO_ARQUERO],
      [NECROFAGO, ESPECTRO],
    ],
    elites: [[CABALLERO_TUMBARIO], [MOMIA_REAL]],
    jefe: [SENOR_CRIPTA],
  },
  {
    nombre: 'La Guarida del Dragón',
    subtitulo: 'Capítulo III',
    intro:
      'Más allá de la cripta, los túneles descienden hacia un calor imposible. Los kobolds susurran un nombre entre reverencias: Ignifax. El señor oculto del valle, el origen de todo… y tu última batalla.',
    ambiente: 'brasas',
    normales: [
      [KOBOLD_LANCERO, KOBOLD_LANCERO],
      [KOBOLD_HECHICERO, KOBOLD_LANCERO],
      [CULTISTA_DRAGON],
      [DRACO_JOVEN],
      [ELEMENTAL_MAGMA],
      [CULTISTA_DRAGON, KOBOLD_HECHICERO],
      [DRACO_JOVEN, KOBOLD_LANCERO],
      [KOBOLD_LANCERO, KOBOLD_LANCERO, KOBOLD_HECHICERO],
      [ELEMENTAL_MAGMA, CULTISTA_DRAGON],
    ],
    elites: [[DRACO_VETERANO], [SUMO_CULTISTA]],
    jefe: [IGNIFAX],
  },
];

export function crearEnemigo(def: EnemigoDef, rng: () => number): EnemigoCombate {
  const pv = def.pv[0] + Math.floor(rng() * (def.pv[1] - def.pv[0] + 1));
  const enemigo: EnemigoCombate = {
    def, nombre: def.nombre, pvMax: pv, pv, bloqueo: 0,
    estados: {}, vivo: true, turnosVisto: 0,
    intencion: { nombre: '...', intencion: 'desconocido' },
    danoBaseMax: 0,
  };
  enemigo.intencion = def.ia(0, rng, enemigo, []);
  enemigo.danoBaseMax = enemigo.intencion.dano ?? 0;
  return enemigo;
}
