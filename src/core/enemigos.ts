import type { EnemigoDef, EnemigoCombate, Movimiento } from './types.ts';
import { FRASES_DM, INTENCION_DM } from './escena-final.ts';

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
  id: 'hobgoblin', nombre: 'Hobgoblin Capitán', arte: '⚔️', pv: [62, 68], escala: 1.25,
  ia: (turno, rng) => {
    if (turno % 3 === 0) return def('Muro de Escudos', 12, [['fuerza', 2, false]]);
    if (rng() < 0.45) return atk('Golpe de Escudo', 11, 1, [['debil', 2, true]]);
    return atk('Espadazo', 17);
  },
};

export const OGRO_JOVEN: EnemigoDef = {
  id: 'ogro-joven', nombre: 'Ogro Joven', arte: '👹', pv: [74, 82], escala: 1.4,
  ia: (turno, rng) => {
    if (turno % 4 === 3) return { nombre: 'Rugido', intencion: 'mejora', efectos: [['fuerza', 3, false]] };
    if (rng() < 0.4) return atk('Pisotón', 12, 1, [['vulnerable', 2, true]]);
    return atk('Garrotazo', 21);
  },
};

export const GOBLIN_FAMELICO: EnemigoDef = {
  id: 'goblin-famelico', nombre: 'Goblin Famélico', arte: '👺', pv: [5, 7], escala: 0.8,
  ia: (turno, rng) => (rng() < 0.3 ? atk('Mordisquitos', 2, 2) : atk('Navajazo', 4)),
};

export const JEFE_OGRO: EnemigoDef = {
  id: 'jefe-ogro', nombre: 'Gorzug, Jefe Ogro', arte: '👹', pv: [115, 115], escala: 1.9, esJefe: true,
  rasgo: {
    nombre: 'Devorador',
    texto: 'Siempre tiene hambre, y nunca le falta a quién comerse.',
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
  id: 'esqueleto-guerrero', nombre: 'Esqueleto Guerrero', arte: '💀', pv: [27, 31],
  ia: (turno, rng) => {
    if (turno % 3 === 2) return def('Guardia Ósea', 9);
    return rng() < 0.45 ? atk('Doble Tajo', 7, 2) : atk('Espadazo Oxidado', 12);
  },
};

export const ESQUELETO_ARQUERO: EnemigoDef = {
  id: 'esqueleto-arquero', nombre: 'Esqueleto Arquero', arte: '🏹', pv: [20, 24],
  ia: (turno, rng) => {
    if (rng() < 0.3) return atk('Flecha Maldita', 7, 1, [['fragil', 2, true]]);
    return rng() < 0.5 ? atk('Doble Disparo', 6, 2) : atk('Flecha Negra', 10);
  },
};

export const ZOMBI: EnemigoDef = {
  id: 'zombi', nombre: 'Zombi', arte: '🧟', pv: [39, 43], escala: 1.15,
  ia: (turno, rng) => {
    if (rng() < 0.25)
      return { nombre: 'Carne Putrefacta', intencion: 'defensa', bloqueo: 6, cura: 6 };
    if (rng() < 0.4) return atk('Dentellada', 10, 1, [['vulnerable', 1, true]]);
    return atk('Embestida Pútrida', 14);
  },
};

export const ESPECTRO: EnemigoDef = {
  id: 'espectro', nombre: 'Espectro', arte: '👻', pv: [29, 33], escala: 1.1,
  ia: (turno, rng) => {
    if (turno % 4 === 1)
      return { nombre: 'Lamento Fúnebre', intencion: 'perjuicio', efectos: [['debil', 2, true]] };
    if (rng() < 0.45)
      return { nombre: 'Toque Drenante', intencion: 'ataque', dano: 10, cura: 5 };
    return atk('Garra Helada', 11);
  },
};

export const NECROFAGO: EnemigoDef = {
  id: 'necrofago', nombre: 'Necrófago', arte: '🧛', pv: [32, 36],
  ia: (turno, rng) => {
    if (rng() < 0.35) return atk('Zarpa Paralizante', 8, 1, [['debil', 1, true], ['fragil', 1, true]]);
    return atk('Garras Voraces', 7, 2);
  },
};

export const CABALLERO_TUMBARIO: EnemigoDef = {
  id: 'caballero-tumbario', nombre: 'Caballero Tumbario', arte: '🛡️', pv: [92, 100], escala: 1.3,
  conservaBloqueo: true,
  rasgo: {
    nombre: 'Juramento Inquebrantable',
    texto: 'Juró guardar la cripta más allá de la muerte, y no piensa faltar a su palabra.',
  },
  ia: (turno, rng) => {
    if (turno % 3 === 0) return def('Muro Sepulcral', 12, [['fuerza', 2, false]]);
    return rng() < 0.45 ? atk('Carga Fantasmal', 12, 2, [['vulnerable', 1, true]]) : atk('Mandoble Maldito', 21);
  },
};

export const MOMIA_REAL: EnemigoDef = {
  id: 'momia-real', nombre: 'Momia Real', arte: '🪦', pv: [82, 90], escala: 1.3,
  estadosIniciales: { regeneracion: 5 },
  rasgo: {
    nombre: 'Vendas Eternas',
    texto: 'Los embalsamadores la prepararon para durar toda la eternidad.',
  },
  ia: (turno, rng) => {
    if (turno % 4 === 0)
      return {
        nombre: 'Maldición Faraónica', intencion: 'perjuicio',
        efectos: [['debil', 2, true], ['fragil', 1, true]],
        maldicion: { id: 'maldicion-momia', destino: 'descarte' },
      };
    if (rng() < 0.3)
      return { nombre: 'Vendas Reparadoras', intencion: 'defensa', bloqueo: 12, cura: 10 };
    return atk('Puño Vendado', 18);
  },
};

/** Vol'guth's phylactery: takes his place when he falls and, if it survives a full turn,
 *  brings him back at full health. Its health carries over between deaths; breaking it ends him. */
export const FILACTERIA_VOLGUTH: EnemigoDef = {
  id: 'filacteria-volguth', nombre: "Filacteria de Vol'guth", arte: '⚱️', pv: [60, 60], escala: 1.1, esJefe: true,
  rasgo: {
    nombre: 'Alma encadenada',
    texto: "Late con el alma de Vol'guth. Mientras lata, él no se ha ido del todo.",
  },
  ia: (turno) => turno === 0
    ? { nombre: 'Latido del alma', intencion: 'mejora' }
    : { nombre: 'RESURRECCIÓN', intencion: 'mejora', resucitar: true },
};

export const SENOR_CRIPTA: EnemigoDef = {
  id: 'senor-cripta', nombre: "Vol'guth, Señor de la Cripta", arte: '🧙‍♂️', pv: [130, 130], escala: 1.8,
  pasiva: 'filacteria', filacteria: FILACTERIA_VOLGUTH, esJefe: true,
  rasgo: {
    nombre: 'Filacteria',
    texto: 'Para él, la muerte no es más que un contratiempo.',
  },
  ia: (turno, rng, self) => {
    // Tras despertar de la filacteria, su hambre de vida se desata:
    // todos sus ataques drenan la esencia del enemigo
    const despierto = self.filacteriaUsada === true;
    const ciclo = turno % 4;
    if (ciclo === 0)
      return {
        nombre: despierto ? 'Maldición del Despertar' : 'Maldición Eterna',
        intencion: 'perjuicio',
        maldicion: { id: 'cadena-filacteria', destino: 'mano' }, // a chain that feeds him while you hold it
        efectos: despierto
          ? [['debil', 3, true], ['fragil', 3, true], ['vulnerable', 2, true], ['fuerza', 3, false]]
          : [['debil', 2, true], ['fragil', 2, true], ['vulnerable', 1, true], ['fuerza', 2, false]],
      };
    if (ciclo === 1)
      return {
        nombre: 'Drenar Vida', intencion: 'ataque', dano: despierto ? 18 : 15,
        cura: despierto ? 15 : 9, efectos: [['vulnerable', 1, true]],
      };
    if (ciclo === 2)
      return despierto
        ? { nombre: 'Lluvia de Huesos Voraz', intencion: 'ataque', dano: 9, veces: 3, cura: 9, efectos: [['debil', 1, true]] }
        : atk('Lluvia de Huesos', 8, 3, [['debil', 1, true]]);
    return despierto
      ? { nombre: 'Nova Necrótica Voraz', intencion: 'ataque', dano: 28, cura: 14 }
      : atk('Nova Necrótica', 24);
  },
};

// ═══ Capítulo III: La Guarida del Dragón ═════════════════════════════════════

export const KOBOLD_LANCERO: EnemigoDef = {
  id: 'kobold-lancero', nombre: 'Kobold Lancero', arte: '🦎', pv: [35, 39],
  rasgo: {
    nombre: 'Falange',
    texto: 'Uno solo no da miedo. Hombro con hombro, es otra historia.',
  },
  ia: (turno, rng, self, aliados) => {
    const falange = aliados.length;
    if (rng() < 0.3) return atk('Trampa de Abrojos', 7 + falange, 1, [['fragil', 2, true]]);
    return rng() < 0.5 ? atk('Doble Lanzada', 7 + falange, 2) : atk('Lanza Dracónica', 12 + falange);
  },
};

export const KOBOLD_HECHICERO: EnemigoDef = {
  id: 'kobold-hechicero', nombre: 'Kobold Hechicero', arte: '🜂', pv: [33, 37],
  rasgo: {
    nombre: 'Escamas del Nido',
    texto: 'Cuida del nido como si todos fueran sus crías.',
  },
  ia: (turno, rng) => {
    if (turno === 0) return { nombre: 'Bendición Dracónica', intencion: 'mejora', fuerzaAliados: 2 };
    if (turno % 3 === 2) return { nombre: 'Escudo de Escamas', intencion: 'defensa', bloqueoAliados: 7 };
    if (rng() < 0.3)
      return { nombre: 'Humo Cegador', intencion: 'perjuicio', efectos: [['debil', 2, true]] };
    return atk('Chispa Ígnea', 12);
  },
};

export const CULTISTA_DRAGON: EnemigoDef = {
  id: 'cultista-dragon', nombre: 'Cultista del Dragón', arte: '🥷', pv: [42, 46],
  alMorirAliado: { efectos: [['fuerza', 3]] },
  rasgo: {
    nombre: 'Fanatismo',
    texto: 'Cada hermano caído aviva su fe en el dragón.',
  },
  ia: (turno, rng, self) => {
    if (turno % 3 === 1)
      return { nombre: 'Ofrenda de Sangre', intencion: 'mejora', efectos: [['fuerza', 3, false]] };
    return rng() < 0.4 ? atk('Daga Ritual', 9, 2) : atk('Tajo Fanático', 14);
  },
};

export const DRACO_JOVEN: EnemigoDef = {
  id: 'draco-joven', nombre: 'Draco Joven', arte: '🐲', pv: [51, 55], escala: 1.25,
  estadosIniciales: { coraza: 1 },
  rasgo: {
    nombre: 'Escamas Jóvenes',
    texto: 'Sus escamas aún son tiernas, pero ya empiezan a endurecerse.',
  },
  ia: (turno, rng) => {
    if (rng() < 0.3) return atk('Aliento Chispeante', 7, 2);
    if (rng() < 0.45) return atk('Coletazo', 11, 1, [['vulnerable', 1, true]]);
    return atk('Mordisco', 15);
  },
};

export const ELEMENTAL_MAGMA: EnemigoDef = {
  id: 'elemental-magma', nombre: 'Elemental de Magma', arte: '🌋', pv: [44, 48], escala: 1.2,
  alMorir: { nombre: 'Estallido de Magma', dano: 10, efectos: [['quemadura', 1, true]] },
  rasgo: {
    nombre: 'Estallido de Magma',
    texto: 'Lleva un volcán dentro, y los volcanes no se apagan en silencio.',
  },
  ia: (turno, rng) => {
    if (turno % 3 === 2)
      return { nombre: 'Cuerpo Ardiente', intencion: 'defensa', bloqueo: 11, cura: 4 };
    if (rng() < 0.35) return atk('Salpicadura de Lava', 9, 1, [['fragil', 1, true]]);
    return atk('Erupción', 16);
  },
};

export const DRACO_VETERANO: EnemigoDef = {
  id: 'draco-veterano', nombre: 'Draco Veterano', arte: '🐉', pv: [112, 122], escala: 1.45,
  estadosIniciales: { coraza: 3 },
  rasgo: {
    nombre: 'Escamas Ancestrales',
    texto: 'Siglos de batallas le han dejado una piel de acero.',
  },
  ia: (turno, rng) => {
    if (turno % 4 === 3) return { nombre: 'Rugido Escamoso', intencion: 'mejora', efectos: [['fuerza', 3, false]] };
    if (rng() < 0.4) return atk('Aliento de Fuego', 12, 2, [['vulnerable', 1, true]]);
    return atk('Garra Desgarradora', 22);
  },
};

export const SUMO_CULTISTA: EnemigoDef = {
  id: 'sumo-cultista', nombre: 'Sumo Cultista de Ignifax', arte: '🧙‍♀️', pv: [110, 118], escala: 1.35,
  alMorirAliado: { efectos: [['fuerza', 3]], cura: 8 },
  rasgo: {
    nombre: 'Devoción del Nido',
    texto: 'Sus kobolds son ofrendas, y al dragón le encantan las ofrendas.',
  },
  ia: (turno, rng, self, aliados) => {
    if (turno % 4 === 0 && aliados.length === 0)
      return {
        nombre: 'Llamada al Nido', intencion: 'mejora',
        invocar: [{ def: KOBOLD_LANCERO, pv: 20 }],
      };
    if (turno % 4 === 2)
      return {
        nombre: 'Maldición Dracónica', intencion: 'perjuicio',
        efectos: [['debil', 3, true], ['fragil', 3, true], ['vulnerable', 1, true]],
      };
    if (rng() < 0.4) return { nombre: 'Drenar Esencia', intencion: 'ataque', dano: 16, cura: 9 };
    return atk('Látigo de Fuego', 19);
  },
};

export const IGNIFAX: EnemigoDef = {
  id: 'ignifax', nombre: 'Ignifax, el Dragón Rojo', arte: '🐉', pv: [320, 320], escala: 2.2, esJefe: true,
  estadosIniciales: { espinas: 4 }, // Escamas Ígneas: pasiva todo el combate
  rasgo: {
    nombre: 'Escamas Ígneas y Corazón de Magma',
    texto: 'Tocar al dragón quema. Enfadarlo de verdad es mucho peor.',
  },
  ia: (turno, rng, self) => {
    // Enfurecimiento único y devastador al cruzar la mitad de la vida
    if (!self.rasgoUsado && self.pv <= self.pvMax / 2) {
      self.rasgoUsado = true;
      return {
        nombre: 'CORAZÓN DE MAGMA', intencion: 'ataque', fx: 'aliento',
        dano: 14, cura: 55,
        efectos: [['fuerza', 5, false], ['espinas', 2, false], ['vulnerable', 2, true]],
      };
    }
    if (turno === 0)
      return {
        nombre: 'Rugido del Tesoro', intencion: 'mejora',
        efectos: [['fuerza', 3, false], ['debil', 2, true]],
      };
    const ciclo = turno % 4;
    if (ciclo === 1) return atk('Garra Incandescente', 20, 1, [['vulnerable', 1, true]]);
    // Ataque especial alternado: Aliento de Dragón (fuego + Quemadura 2 turnos)
    if (ciclo === 2)
      return {
        nombre: 'ALIENTO DE DRAGÓN', intencion: 'ataque', dano: 15, fx: 'aliento',
        efectos: [['vulnerable', 2, true], ['quemadura', 2, true]],
      };
    if (ciclo === 3) return atk('Coletazo Brutal', 16, 1, [['debil', 2, true]]);
    return { nombre: 'ALIENTO ÍGNEO', intencion: 'ataque', dano: 34, fx: 'aliento' };
  },
};

// ═══ Capítulo I (alt.): La Guarida de los Contrabandistas ═════════════════════

export const LADRON_FURTIVO: EnemigoDef = {
  id: 'ladron-furtivo', nombre: 'Ladrón Furtivo', arte: '🗡️', pv: [16, 20],
  ia: (turno, rng) => {
    if (rng() < 0.35) return atk('Corte y Carrera', 6, 1, [['debil', 1, true]]);
    return rng() < 0.5 ? atk('Puñaladas', 5, 2) : atk('Tajo Rápido', 8);
  },
};

export const BANDIDO_BALLESTERO: EnemigoDef = {
  id: 'bandido-ballestero', nombre: 'Bandido Ballestero', arte: '🏹', pv: [15, 18],
  ia: (turno, rng) => {
    if (rng() < 0.3) return atk('Virote Trampa', 5, 1, [['fragil', 2, true]]);
    return rng() < 0.5 ? atk('Doble Disparo', 4, 2) : atk('Ballestazo', 7);
  },
};

export const MATON: EnemigoDef = {
  id: 'maton', nombre: 'Matón', arte: '💪', pv: [24, 28], escala: 1.15,
  ia: (turno, rng) => {
    if (turno % 3 === 2) return def('Cubrirse', 8);
    return rng() < 0.4 ? atk('Empujón', 6, 1, [['vulnerable', 1, true]]) : atk('Garrotazo', 11);
  },
};

export const NINJA_SOMBRAS: EnemigoDef = {
  id: 'ninja-sombras', nombre: 'Ninja de las Sombras', arte: '🥷', pv: [18, 22],
  ia: (turno, rng) => {
    if (turno % 4 === 1) return def('Paso Sombrío', 10, [['debil', 1, true]]);
    return rng() < 0.45 ? atk('Shuriken', 4, 3) : atk('Filo Veloz', 9);
  },
};

export const PICARO_ENVENENADOR: EnemigoDef = {
  id: 'picaro-envenenador', nombre: 'Pícaro Envenenador', arte: '🧪', pv: [18, 22],
  ia: (turno, rng) => (rng() < 0.4 ? atk('Daga Untada', 5, 1, [['veneno', 2, true]]) : atk('Corte Sucio', 7)),
};

export const SABUESO_CONTRABANDO: EnemigoDef = {
  id: 'sabueso-contrabando', nombre: 'Sabueso de Contrabando', arte: '🐕', pv: [22, 26], escala: 1.1,
  ia: (turno, rng) =>
    rng() < 0.4 ? atk('Dentellada', 6, 1, [['vulnerable', 1, true]]) : atk('Mordisco', 9),
};

export const CAPITAN_BANDIDO: EnemigoDef = {
  id: 'capitan-bandido', nombre: 'Capitán Bandido', arte: '⚔️', pv: [66, 72], escala: 1.25,
  ia: (turno, rng) => {
    if (turno % 3 === 0) return def('¡Cerrad Filas!', 12, [['fuerza', 2, false]]);
    return rng() < 0.45 ? atk('Golpe Bajo', 10, 1, [['debil', 2, true]]) : atk('Sablazo', 18);
  },
};

export const MAESTRO_NINJA: EnemigoDef = {
  id: 'maestro-ninja', nombre: 'Maestro Ninja', arte: '🥷', pv: [70, 78], escala: 1.3,
  ia: (turno, rng) => {
    if (turno % 4 === 1) return def('Humo Cegador', 12, [['debil', 2, true]]);
    if (rng() < 0.4) return atk('Estrellas Arrojadizas', 5, 3);
    if (rng() < 0.4) return atk('Filo Envenenado', 9, 1, [['veneno', 3, true]]);
    return atk('Tajo del Maestro', 19);
  },
};

export const IMAGEN_ILUSORIA: EnemigoDef = {
  id: 'imagen-ilusoria', nombre: 'Imagen Ilusoria', arte: '🃏', pv: [8, 10], escala: 0.85,
  ia: (turno, rng) => (rng() < 0.4 ? def('Parpadeo', 6) : atk('Cuchillada Falsa', 5)),
};

export const EMBAUCADOR_ARCANO: EnemigoDef = {
  id: 'embaucador-arcano', nombre: 'Vexis, el Embaucador Arcano', arte: '🃏', pv: [120, 128], escala: 1.9, esJefe: true,
  rasgo: {
    nombre: 'Mil Rostros',
    texto: 'Nunca estás del todo seguro de a quién golpeas.',
  },
  senuelos: ['imagen-ilusoria'],
  ia: (turno, rng, self, aliados) => {
    if (turno === 0)
      return {
        nombre: 'Manto de Espejismos', intencion: 'mejora',
        invocar: [{ def: IMAGEN_ILUSORIA, pv: 9 }, { def: IMAGEN_ILUSORIA, pv: 9 }],
        efectos: [['debil', 1, true]],
      };
    const ciclo = turno % 4;
    if (ciclo === 0 && aliados.length === 0)
      return {
        nombre: 'Más Espejismos', intencion: 'mejora',
        invocar: [{ def: IMAGEN_ILUSORIA, pv: 9 }, { def: IMAGEN_ILUSORIA, pv: 9 }],
      };
    if (ciclo === 1) return atk('Abanico de Cuchillos', 5, 3);
    if (ciclo === 2) return atk('Daga Envenenada', 8, 1, [['veneno', 3, true]]);
    if (ciclo === 3) return { nombre: 'Truco de Humo', intencion: 'defensa', bloqueo: 14, efectos: [['debil', 2, true]] };
    return atk('Estocada Arcana', 16);
  },
};

// ═══ Capítulo II (alt.): El Templo Oscuro ════════════════════════════════════

export const ACOLITO_VELADO: EnemigoDef = {
  id: 'acolito-velado', nombre: 'Acólito Velado', arte: '🧎', pv: [23, 27],
  ia: (turno, rng) => {
    if (turno === 0) return { nombre: 'Cántico Impío', intencion: 'mejora', fuerzaAliados: 2 };
    if (rng() < 0.35)
      return { nombre: 'Maldición Leve', intencion: 'perjuicio', maldicion: { id: 'duda', destino: 'descarte' } };
    return atk('Golpe de Báculo', 10);
  },
};

export const LANZADOR_VACIO: EnemigoDef = {
  id: 'lanzador-vacio', nombre: 'Lanzador del Vacío', arte: '📿', pv: [20, 24],
  ia: (turno, rng) => {
    if (rng() < 0.3) return atk('Esquirla del Vacío', 7, 1, [['fragil', 2, true]]);
    return rng() < 0.5 ? atk('Doble Saeta Oscura', 6, 2) : atk('Saeta Oscura', 11);
  },
};

export const DIABLILLO: EnemigoDef = {
  id: 'diablillo', nombre: 'Diablillo', arte: '👿', pv: [18, 22],
  ia: (turno, rng) => (rng() < 0.35 ? atk('Pinchazo Ardiente', 5, 2) : atk('Tridente', 10)),
};

export const SABUESO_INFERNAL: EnemigoDef = {
  id: 'sabueso-infernal', nombre: 'Sabueso Infernal', arte: '🐕', pv: [34, 38], escala: 1.15,
  ia: (turno, rng) =>
    rng() < 0.4 ? atk('Mordisco Ígneo', 9, 1, [['vulnerable', 1, true]]) : atk('Embestida', 13),
};

export const POSEIDO: EnemigoDef = {
  id: 'poseido', nombre: 'Poseído', arte: '🫥', pv: [29, 33], escala: 1.1,
  ia: (turno, rng) => {
    if (rng() < 0.25) return { nombre: 'Convulsión', intencion: 'defensa', bloqueo: 7, cura: 5 };
    if (rng() < 0.4) return atk('Zarpazo Errático', 8, 1, [['debil', 1, true]]);
    return atk('Arremetida', 14);
  },
};

export const FLAGELANTE: EnemigoDef = {
  id: 'flagelante', nombre: 'Flagelante', arte: '🩸', pv: [25, 29],
  ia: (turno, rng) => (rng() < 0.4 ? atk('Látigo Espinado', 6, 1, [['veneno', 2, true]]) : atk('Azote', 10)),
};

export const DEMONIO_MENOR: EnemigoDef = {
  id: 'demonio-menor', nombre: 'Demonio Menor', arte: '😈', pv: [86, 94], escala: 1.3,
  vampirico: 0.5,
  rasgo: {
    nombre: 'Hambre Abisal',
    texto: 'Tiene sed, y tu sangre le parece deliciosa.',
  },
  ia: (turno, rng) => {
    if (turno % 4 === 3) return { nombre: 'Rugido Infernal', intencion: 'mejora', efectos: [['fuerza', 3, false]] };
    return rng() < 0.4 ? atk('Garra Demoníaca', 12, 2, [['vulnerable', 1, true]]) : atk('Mazazo Ígneo', 20);
  },
};

export const INQUISIDOR_OSCURO: EnemigoDef = {
  id: 'inquisidor-oscuro', nombre: 'Inquisidor Oscuro', arte: '🕯️', pv: [80, 88], escala: 1.3,
  rasgo: {
    nombre: 'Hoguera Inquisitorial',
    texto: 'Para él, todo hereje merece arder. Y tú eres un hereje.',
  },
  ia: (turno, rng) => {
    if (turno % 4 === 0)
      return {
        nombre: 'Anatema', intencion: 'perjuicio',
        efectos: [['debil', 2, true], ['fragil', 2, true], ['quemadura', 1, true]],
      };
    if (rng() < 0.3) return { nombre: 'Plegaria Profana', intencion: 'mejora', cura: 10, fuerzaAliados: 2 };
    return atk('Verbo Oscuro', 18);
  },
};

export const DEMONIO_MAYOR: EnemigoDef = {
  id: 'demonio-mayor', nombre: 'Abaddon, el Demonio Mayor', arte: '😈', pv: [108, 108], escala: 2.0, esJefe: true,
  faseMusical: 2, // his rise turns Malachar's ritual into chaos: the boss song's second version
  rasgo: {
    nombre: 'Furia del Abismo',
    texto: 'Lo que el Heraldo guardaba en su carne. Ahora libre, arde por arrastrarte con él al pozo.',
  },
  ia: (turno, rng) => {
    if (turno === 0)
      return { nombre: 'Alarido del Abismo', intencion: 'mejora', efectos: [['fuerza', 3, false], ['debil', 2, true]] };
    const ciclo = turno % 3;
    if (ciclo === 0) return atk('Garra Abisal', 14, 1, [['vulnerable', 2, true]]);
    if (ciclo === 1)
      return { nombre: 'Llamarada Infernal', intencion: 'ataque', dano: 11, veces: 2, fx: 'aliento', efectos: [['veneno', 3, true]] };
    return atk('Aplastamiento Demoníaco', 24);
  },
};

export const HERALDO_CULTO: EnemigoDef = {
  id: 'heraldo-culto', nombre: "Malachar, Heraldo del Culto", arte: '🕯️', pv: [140, 146], escala: 1.7, esJefe: true,
  invocaAlMorir: DEMONIO_MAYOR,
  rasgo: {
    nombre: 'Recipiente del Pacto',
    texto: 'Su cuerpo es solo la cáscara de algo mucho peor.',
  },
  ia: (turno, rng, self, aliados) => {
    if (turno === 0) return { nombre: 'Invocar Acólitos', intencion: 'mejora', invocar: [{ def: ACOLITO_VELADO, pv: 20 }] };
    const ciclo = turno % 4;
    if (ciclo === 0 && aliados.length === 0)
      return { nombre: 'Invocar Acólitos', intencion: 'mejora', invocar: [{ def: ACOLITO_VELADO, pv: 20 }] };
    if (ciclo === 1)
      return {
        nombre: 'Maldición del Pacto', intencion: 'perjuicio',
        efectos: [['debil', 2, true], ['fragil', 2, true]],
        maldicion: { id: 'marca-condenado', destino: 'mazo' },
      };
    if (ciclo === 2) return { nombre: 'Drenar Fe', intencion: 'ataque', dano: 15, cura: 9 };
    if (ciclo === 3) return atk('Cuchillo Ritual', 9, 2, [['veneno', 2, true]]);
    return atk('Verbo de Ruina', 20);
  },
};

// ═══ Capítulo III (alt.): El Laberinto del Contemplador ══════════════════════

export const AZOTAMENTES: EnemigoDef = {
  id: 'azotamentes', nombre: 'Azotamentes', arte: '🦑', pv: [39, 43],
  rasgo: {
    nombre: 'Mente Fracturada',
    texto: 'Hablar con él deja la cabeza hecha pedazos.',
  },
  ia: (turno, rng) => {
    if (rng() < 0.3)
      return { nombre: 'Estallido Mental', intencion: 'ataque', dano: 10, efectos: [['robaMenos', 1, true]] };
    return rng() < 0.5 ? atk('Tentáculos', 6, 2) : atk('Sacudida Psíquica', 14);
  },
};

export const LACAYO_ENGENDRADO: EnemigoDef = {
  id: 'lacayo-engendrado', nombre: 'Lacayo Engendrado', arte: '🧟', pv: [35, 39],
  estadosIniciales: { regeneracion: 3 },
  rasgo: {
    nombre: 'Carne Regenerativa',
    texto: 'La carne que le implantaron no sabe morir.',
  },
  ia: (turno, rng) => {
    if (turno % 3 === 2) return def('Carne Coriácea', 9);
    return atk('Garras Deformes', 13);
  },
};

export const CUBO_GELATINOSO: EnemigoDef = {
  id: 'cubo-gelatinoso', nombre: 'Cubo Gelatinoso', arte: '🟩', pv: [51, 57], escala: 1.3,
  rasgo: {
    nombre: 'Engullir',
    texto: 'Lo que entra en el cubo nunca sale igual.',
  },
  ia: (turno, rng) =>
    rng() < 0.35 ? atk('Embestida Ácida', 9, 1, [['fragil', 2, true]]) : atk('Engullir', 15, 1, [['veneno', 3, true]]),
};

export const REPTADOR_CARRONERO: EnemigoDef = {
  id: 'reptador-carronero', nombre: 'Reptador Carroñero', arte: '🪲', pv: [35, 39],
  alMorirAliado: { efectos: [['fuerza', 1]], cura: 10 },
  rasgo: {
    nombre: 'Carroñero',
    texto: 'Para él, cada cadáver es un banquete.',
  },
  ia: (turno, rng) => (rng() < 0.4 ? atk('Pinzas', 6, 2) : atk('Mordisco Quitinoso', 12)),
};

export const OJO_FLOTANTE: EnemigoDef = {
  id: 'ojo-flotante', nombre: 'Ojo Flotante', arte: '👁️', pv: [26, 30],
  rasgo: {
    nombre: 'Mirada Penetrante',
    texto: 'No hay escudo que detenga su mirada.',
  },
  ia: (turno, rng) =>
    rng() < 0.35
      ? atk('Rayo Debilitador', 6, 1, [['vulnerable', 1, true]])
      : { nombre: 'Rayo Ocular', intencion: 'ataque', dano: 11, perforante: true },
};

export const HORROR_TENTACULAR: EnemigoDef = {
  id: 'horror-tentacular', nombre: 'Horror Tentacular', arte: '🐙', pv: [44, 48], escala: 1.2,
  estadosIniciales: { espinas: 2 },
  rasgo: {
    nombre: 'Tentáculos Urticantes',
    texto: 'Tocarlo es mala idea. Pegarle, también.',
  },
  ia: (turno, rng) =>
    rng() < 0.35 ? atk('Constricción', 8, 1, [['debil', 2, true]]) : atk('Azote de Tentáculos', 15),
};

export const AZOTAMENTES_ANCIANO: EnemigoDef = {
  id: 'azotamentes-anciano', nombre: 'Azotamentes Anciano', arte: '🦑', pv: [112, 120], escala: 1.4,
  rasgo: {
    nombre: 'Devorador de Mentes',
    texto: 'Se alimenta de pensamientos, y los tuyos tienen buena pinta.',
  },
  ia: (turno, rng) => {
    if (turno % 4 === 2)
      return { nombre: 'Devorar Mente', intencion: 'ataque', dano: 14, cura: 10, efectos: [['robaMenos', 2, true], ['cartasSobrecoste', 1, true]] };
    if (rng() < 0.4)
      return { nombre: 'Onda Psíquica', intencion: 'ataque', dano: 10, efectos: [['cartasEtereas', 1, true]] };
    return atk('Tentáculos Cerebrales', 20);
  },
};

export const CEREBRO_ANCIANO: EnemigoDef = {
  id: 'cerebro-anciano', nombre: 'Cerebro Anciano', arte: '🧠', pv: [108, 116], escala: 1.35,
  protegidoPorAliados: true,
  rasgo: {
    nombre: 'Mente Colmena',
    texto: 'Sus ojos lo protegen, y siempre tiene ojos de sobra.',
  },
  ia: (turno, rng, self, aliados) => {
    if (turno % 3 === 0 && aliados.length === 0)
      return { nombre: 'Brotar un Ojo', intencion: 'mejora', invocar: [{ def: OJO_FLOTANTE, pv: 26 }] };
    if (turno % 4 === 2)
      return { nombre: 'Dominar Mente', intencion: 'perjuicio', efectos: [['debil', 3, true], ['cartasSobrecoste', 1, true]] };
    if (rng() < 0.4) return { nombre: 'Pulso Aniquilador', intencion: 'ataque', dano: 16, cura: 6 };
    return atk('Salva Psíquica', 9, 2);
  },
};

export const OBSERVADOR: EnemigoDef = {
  id: 'observador', nombre: 'Observador', arte: '👁️‍🗨️', pv: [20, 24], escala: 0.8,
  ia: (turno, rng) => {
    if (rng() < 0.3) return atk('Rayo de Debilidad', 5, 1, [['debil', 1, true]]);
    return rng() < 0.5 ? atk('Rayo Gemelo', 4, 2) : atk('Rayo Menor', 7);
  },
};

/** Rayos cromáticos del Contemplador: cada color tuerce tu próximo turno. */
const RAYOS_CONTEMPLADOR: Movimiento[] = [
  { nombre: 'Rayo Carmesí', intencion: 'ataque', dano: 20, fx: 'aliento', efectos: [['cartasSobrecoste', 1, true]] },
  { nombre: 'Rayo Áureo', intencion: 'ataque', dano: 18, fx: 'aliento', efectos: [['cartasAgotan', 1, true]] },
  { nombre: 'Rayo Espectral', intencion: 'ataque', dano: 18, fx: 'aliento', efectos: [['cartasEtereas', 1, true]] },
  { nombre: 'Rayo Pútrido', intencion: 'ataque', dano: 14, fx: 'aliento', efectos: [['veneno', 5, true]] },
  { nombre: 'Rayo Necrótico', intencion: 'ataque', dano: 22, fx: 'aliento', efectos: [['vulnerable', 2, true]] },
];

/** The great central eye: one huge blast that twists nothing… it just unmakes you. */
const RAYO_DESINTEGRADOR: Movimiento = { nombre: 'RAYO DESINTEGRADOR', intencion: 'ataque', dano: 45, fx: 'aliento' };

export const CONTEMPLADOR: EnemigoDef = {
  id: 'contemplador', nombre: 'El Contemplador', arte: '👁️', pv: [336, 336], escala: 2.3, esJefe: true,
  rasgo: {
    nombre: 'Ojos del Caos',
    texto: 'Diez ojos, diez magias… y un ojo central que mejor no ver abierto.',
  },
  ia: (turno, rng, self, aliados) => {
    if (turno === 0)
      return {
        nombre: 'Despertar de Ojos', intencion: 'mejora',
        invocar: [{ def: OBSERVADOR, pv: 22 }, { def: OBSERVADOR, pv: 22 }],
      };
    // five-turn cycle: rays of every colour, and the central eye opens on the fourth
    const ciclo = turno % 5;
    if (ciclo === 0 && aliados.length === 0)
      return {
        nombre: 'Llamada del Enjambre', intencion: 'mejora',
        invocar: [{ def: OBSERVADOR, pv: 22 }, { def: OBSERVADOR, pv: 22 }],
      };
    if (ciclo === 4) return RAYO_DESINTEGRADOR;
    return RAYOS_CONTEMPLADOR[(turno - 1) % RAYOS_CONTEMPLADOR.length];
  },
};

// ═══ Élites de grupo (un tercer élite por escenario) ═════════════════════════

// Act I · Asentamiento Ogro — the goblin horde: two kinds that take turns, so every
// round two of them strike while the other two cheer the whole pack on.
const vitorear = (nombre: string): Movimiento => ({ nombre, intencion: 'mejora', fuerzaAliados: 1 });

export const GOBLIN_SAQUEADOR: EnemigoDef = {
  id: 'goblin-saqueador', nombre: 'Goblin Saqueador', arte: '👺', pv: [22, 26], escala: 0.9,
  rasgo: {
    nombre: 'Horda Bulliciosa',
    texto: 'Sueltos no valen nada; juntos, son una plaga.',
  },
  ia: (turno, rng) => (turno % 2 === 0 ? (rng() < 0.5 ? atk('Hachazo Oxidado', 8) : atk('Pedrada', 4, 2)) : vitorear('¡A por él!')),
};

export const GOBLIN_JALEADOR: EnemigoDef = {
  id: 'goblin-jaleador', nombre: 'Goblin Jaleador', arte: '📯', pv: [22, 26], escala: 0.9,
  rasgo: {
    nombre: 'Tambor de Guerra',
    texto: 'Su tambor enardece a toda la horda.',
  },
  ia: (turno, rng) => (turno % 2 === 1 ? (rng() < 0.5 ? atk('Mazazo de Tambor', 8) : atk('Mordisco', 4, 2)) : vitorear('Redoble de Guerra')),
};

// Act I · Guarida de los Contrabandistas — the rat swarm: their bites poison you and
// gnaw harder the more poison you already carry.
export const RATA_ALCANTARILLA: EnemigoDef = {
  id: 'rata-alcantarilla', nombre: 'Rata de Alcantarilla', arte: '🐀', pv: [17, 19], escala: 0.75,
  rasgo: {
    nombre: 'Peste del Enjambre',
    texto: 'Traen la peste, y la peste les abre el apetito.',
  },
  ia: (turno, rng) => (rng() < 0.55
    ? atk('Mordisco Infecto', 4, 1, [['veneno', 2, true]])
    : { nombre: 'Roer', intencion: 'ataque', dano: 3, masPorVeneno: true }),
};

export const RATA_GIGANTE: EnemigoDef = {
  id: 'rata-gigante', nombre: 'Rata Gigante', arte: '🐀', pv: [40, 44], escala: 1,
  rasgo: {
    nombre: 'Reina de la Cloaca',
    texto: 'La madre del enjambre huele la enfermedad desde lejos.',
  },
  ia: (turno, rng) => (turno % 2 === 0
    ? atk('Mordisco Pestilente', 6, 1, [['veneno', 3, true]])
    : rng() < 0.6
      ? { nombre: 'Desgarro', intencion: 'ataque', dano: 6, masPorVeneno: true }
      : { nombre: 'Chillido', intencion: 'mejora', fuerzaAliados: 1 }),
};

// Act II · La Cripta — skeletal adventurers: dead heroes of every class. Each fight
// fills three slots with three different classes out of the nine.
const AVENTUREROS: EnemigoDef[] = [
  {
    id: 'aventurero-guerrero', nombre: 'Guerrero Esquelético', arte: '⚔️', pv: [50, 55], escala: 1.05,
    rasgo: { nombre: 'Oleada de Acción', texto: 'Un veterano que nunca se cansa.' },
    ia: (turno) => (turno % 3 === 2 ? { nombre: 'Segundo Aliento', intencion: 'defensa', bloqueo: 10, cura: 6 } : atk('Acción Súbita', 6, 2)),
  },
  {
    id: 'aventurero-mago', nombre: 'Mago Esquelético', arte: '🪄', pv: [43, 48], escala: 1,
    rasgo: { nombre: 'Proyectil Mágico', texto: 'Sus conjuros jamás fallan su objetivo.' },
    ia: (turno) => (turno % 3 === 2 ? atk('Bola de Fuego', 14) : { nombre: 'Proyectil Mágico', intencion: 'ataque', dano: 3, veces: 3, perforante: true }),
  },
  {
    id: 'aventurero-clerigo', nombre: 'Clérigo Esquelético', arte: '✝️', pv: [48, 53], escala: 1,
    rasgo: { nombre: 'Palabra Sanadora', texto: 'Aún reza a un dios que lo abandonó, y a veces el dios responde.' },
    ia: (turno) => (turno % 2 === 1 ? { nombre: 'Palabra Sanadora', intencion: 'mejora', curaAliados: 8 } : atk('Llama Sagrada', 9)),
  },
  {
    id: 'aventurero-picaro', nombre: 'Pícaro Esquelético', arte: '🗡️', pv: [45, 50], escala: 1,
    rasgo: { nombre: 'Hoja Untada', texto: 'Sus dagas siguen untadas después de tantos siglos.' },
    ia: (turno, rng) => (rng() < 0.3 ? def('Esconderse', 9) : atk('Ataque Furtivo', 6, 1, [['veneno', 2, true]])),
  },
  {
    id: 'aventurero-barbaro', nombre: 'Bárbaro Esquelético', arte: '🪓', pv: [55, 60], escala: 1.1,
    alMorirAliado: { efectos: [['fuerza', 3]] },
    rasgo: { nombre: 'Furia del Caído', texto: 'Cada compañero que cae alimenta su rabia.' },
    ia: (turno, rng) => (rng() < 0.35 ? atk('Golpe Temerario', 15) : atk('Hachazo', 10)),
  },
  {
    id: 'aventurero-paladin', nombre: 'Paladín Esquelético', arte: '🛡️', pv: [53, 58], escala: 1.05,
    rasgo: { nombre: 'Aura de Protección', texto: 'Su juramento aún protege a los suyos.' },
    ia: (turno) => (turno % 3 === 0 ? { nombre: 'Aura de Protección', intencion: 'defensa', bloqueoAliados: 6 } : atk('Castigo Divino', 9, 1, [['vulnerable', 1, true]])),
  },
  {
    id: 'aventurero-explorador', nombre: 'Explorador Esquelético', arte: '🏹', pv: [45, 50], escala: 1,
    rasgo: { nombre: 'Marca del Cazador', texto: 'Nunca pierde de vista a su presa.' },
    ia: (turno) => (turno % 2 === 0 ? atk('Marca del Cazador', 6, 1, [['vulnerable', 2, true]]) : atk('Lluvia de Flechas', 3, 3)),
  },
  {
    id: 'aventurero-brujo', nombre: 'Brujo Esquelético', arte: '📕', pv: [45, 50], escala: 1,
    rasgo: { nombre: 'Maleficio', texto: 'Su pacto sobrevivió a la muerte, y aún le quedan maldiciones que repartir.' },
    ia: (turno) => (turno % 3 === 1
      ? { nombre: 'Maleficio', intencion: 'perjuicio', efectos: [['debil', 1, true]], maldicion: { id: 'grilletes', destino: 'descarte' } }
      : atk('Explosión Sobrenatural', 9)),
  },
  {
    id: 'aventurero-bardo', nombre: 'Bardo Esquelético', arte: '🪕', pv: [43, 48], escala: 1,
    rasgo: { nombre: 'Inspiración Bárdica', texto: 'Su laúd desafinado aún inspira a los suyos.' },
    ia: (turno) => (turno % 2 === 0 ? { nombre: 'Balada Macabra', intencion: 'mejora', fuerzaAliados: 2 } : atk('Burla Cruel', 7, 1, [['debil', 1, true]])),
  },
];

/** A slot of the skeletal adventurers' elite: filled at random with one of the nine classes. */
export const AVENTURERO_ESQUELETICO: EnemigoDef = {
  id: 'aventurero-esqueletico', nombre: 'Aventurero Esquelético', arte: '💀', pv: [30, 30],
  variantes: AVENTUREROS,
  rasgo: { nombre: 'Compañía Caída', texto: 'Un grupo de aventureros que nunca salió de la cripta.' },
  ia: () => atk('Golpe', 8),
};

// Act II · Templo Oscuro — the incubus and the succubus share one cycle of debuffs: while
// one attacks, the other casts the next of Vulnerable 3 (him), Frágil 3 (her), his curse in
// your hand, her curse in your hand… When one falls, the other attacks every turn and
// adds its own debuff to each blow.
const GARRAS = 13;
const embrujo = (nombre: string, efecto: Movimiento['efectos'] | null, maldicion: string | null, ataque = false): Movimiento => ({
  nombre, intencion: ataque ? 'ataque' : 'perjuicio',
  ...(ataque ? { dano: GARRAS } : {}),
  ...(efecto ? { efectos: efecto } : {}),
  ...(maldicion ? { maldicion: { id: maldicion, destino: 'mano' as const } } : {}),
});

export const INCUBO: EnemigoDef = {
  id: 'incubo', nombre: 'Íncubo', arte: '😈', pv: [63, 68], escala: 1.35,
  alMorirAliado: { efectos: [['fuerza', 4]] },
  rasgo: {
    nombre: 'Danza Seductora',
    texto: 'Su seducción es tan peligrosa como sus garras.',
  },
  rasgoSolo: { nombre: 'Despecho', texto: 'La caída de su pareja no le va a detener: ahora es el doble de peligroso.' },
  ia: (turno, rng, self, aliados) => {
    if (aliados.length === 0)
      return turno % 2 === 0
        ? embrujo('Zarpazo Embriagador', [['vulnerable', 3, true]], null, true)
        : embrujo('Zarpazo de la Duda', null, 'duda', true);
    if (turno % 4 === 0) return embrujo('Susurro Embriagador', [['vulnerable', 3, true]], null);
    if (turno % 4 === 2) return embrujo('Semilla de la Duda', null, 'duda');
    return atk('Garras Lascivas', GARRAS);
  },
};

export const SUCUBO: EnemigoDef = {
  id: 'sucubo', nombre: 'Súcubo', arte: '😈', pv: [63, 68], escala: 1.3,
  alMorirAliado: { efectos: [['fuerza', 4]] },
  rasgo: {
    nombre: 'Abrazo Letal',
    texto: 'Su abrazo es tan dulce como letal.',
  },
  rasgoSolo: { nombre: 'Rencor', texto: 'La caída de su pareja no la va a detener: ahora es el doble de peligrosa.' },
  ia: (turno, rng, self, aliados) => {
    if (aliados.length === 0)
      return turno % 2 === 0
        ? embrujo('Abrazo Quebrantador', [['fragil', 3, true]], null, true)
        : embrujo('Beso del Remordimiento', null, 'remordimiento', true);
    if (turno % 4 === 1) return embrujo('Caricia Quebrantadora', [['fragil', 3, true]], null);
    if (turno % 4 === 3) return embrujo('Beso del Abismo', null, 'remordimiento');
    return atk('Garras de Súcubo', GARRAS);
  },
};

// Act III · Guarida del Dragón — dragonborn guards that shield one another; each one
// that falls frees a fire elemental bound to the others, which cannot die while any
// guard still stands.
export const ELEMENTAL_FUEGO: EnemigoDef = {
  id: 'elemental-fuego', nombre: 'Elemental de Fuego', arte: '🔥', pv: [29, 29], escala: 1.1,
  inmortalMientras: ['guardia-draconido'],
  rasgo: {
    nombre: 'Llama Atada',
    texto: 'Atado a la sangre de los dracónidos.',
  },
  ia: (turno, rng) => (rng() < 0.4 ? atk('Lengua de Fuego', 5, 2) : atk('Llamarada', 9)),
};

export const GUARDIA_DRACONIDO: EnemigoDef = {
  id: 'guardia-draconido', nombre: 'Guardia Dracónido', arte: '🐲', pv: [47, 52], escala: 1.15,
  invocaAlMorir: ELEMENTAL_FUEGO,
  rasgo: {
    nombre: 'Escudo del Clan',
    texto: 'Los guardas se cubren unos a otros, y su sangre arde.',
  },
  ia: (turno, rng) => {
    if (rng() < 0.3) return { nombre: 'Muro del Clan', intencion: 'defensa', bloqueoAliados: 7 };
    return rng() < 0.5 ? atk('Aliento Abrasador', 7, 1, [['vulnerable', 1, true]]) : atk('Alabarda', 13);
  },
};

// Act III · Laberinto del Contemplador — the mimic: a chest that sleeps 3 turns or until
// hit; then the chair and the door of the room turn out to be mimics too, and strike.
export const MIMICO_SILLA: EnemigoDef = {
  id: 'mimico-silla', nombre: 'Silla Mímica', arte: '🪑', pv: [24, 26], escala: 0.9,
  rasgo: { nombre: 'Asiento Traicionero', texto: 'Nadie sospecha de una silla.' },
  ia: (turno, rng) => (turno === 0 ? atk('Emboscada', 6) : rng() < 0.5 ? atk('Patas Astilladas', 5, 2) : atk('Mordisco del Respaldo', 9)),
};

export const MIMICO_PUERTA: EnemigoDef = {
  id: 'mimico-puerta', nombre: 'Puerta Mímica', arte: '🚪', pv: [32, 37], escala: 1.15,
  rasgo: { nombre: 'Portazo', texto: 'La salida también tenía dientes.' },
  ia: (turno, rng) => (turno === 0 ? atk('Portazo Sorpresa', 8) : rng() < 0.35 ? def('Cerrojo', 12) : atk('Portazo', 13)),
};

const DORMIDO: Movimiento = { nombre: 'Dormido 💤', intencion: 'desconocido' };

export const MIMICO_COFRE: EnemigoDef = {
  id: 'mimico-cofre', nombre: 'Cofre Sospechoso', arte: '🧰', pv: [86, 94], escala: 1.15,
  durmiente: { turnos: 3, despertar: [MIMICO_SILLA, MIMICO_PUERTA] },
  rasgo: {
    nombre: 'Cofre Dormido',
    texto: 'Un cofre que respira.',
  },
  ia: (turno, rng, self) => {
    if (!self.despierto && turno < 3) return DORMIDO;
    if (rng() < 0.35) return atk('Lengua Pegajosa', 8, 1, [['debil', 2, true]]);
    return atk('Mordisco Voraz', 15);
  },
};

// ═══ Escena final: el Dungeon Master ═════════════════════════════════════════

/** Final joke after the Act III boss: his screen blocks everything and his ray
 *  ends the campaign (resolved as a victory, see core/escena-final.ts). */
export const DUNGEON_MASTER: EnemigoDef = {
  id: 'dungeon-master', nombre: 'El Dungeon Master', arte: '🎲', pv: [999, 999], escala: 2.2,
  dungeonMaster: true,
  rasgo: {
    nombre: 'Pantalla del DM',
    texto: 'Detrás de la pantalla todo es posible. Delante, nada funciona así… o casi nada.',
  },
  // one harmless turn to let the hero try everything (and roll that 20), then the ray
  ia: (turno) => turno === 0
    ? { nombre: 'Consultar sus notas', intencion: 'desconocido', cita: INTENCION_DM.notas, dialogo: FRASES_DM.notas }
    : { nombre: 'Rayo del Dungeon Master', intencion: 'ataque', fx: 'divino', mataAlInstante: true, cita: INTENCION_DM.rayo },
};

// ═══ Capítulos ═══════════════════════════════════════════════════════════════

export interface Capitulo {
  nombre: string;
  subtitulo: string;
  intro: string;
  ambiente: 'brasas' | 'almas' | 'sombras' | 'abismo' | 'arcano';
  normales: EnemigoDef[][];
  elites: EnemigoDef[][];
  jefe: EnemigoDef[];
}

/**
 * Cada acto tiene dos escenarios posibles; al empezar el acto se elige uno al
 * azar (determinista por semilla). `ACTOS[acto][escenario]`.
 */
export const ACTOS: Capitulo[][] = [
  [
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
      elites: [[HOBGOBLIN], [OGRO_JOVEN], [GOBLIN_SAQUEADOR, GOBLIN_JALEADOR, GOBLIN_SAQUEADOR, GOBLIN_JALEADOR]],
      jefe: [JEFE_OGRO],
    },
    {
      nombre: 'La Guarida de los Contrabandistas',
      subtitulo: 'Capítulo I',
      intro:
        'Las aldeas no arden por azar: una hermandad de ladrones y ninjas usa el valle como ruta de contrabando. En su guarida, bajo la posada vieja, te espera el más escurridizo de todos.',
      ambiente: 'sombras',
      normales: [
        [LADRON_FURTIVO, BANDIDO_BALLESTERO],
        [BANDIDO_BALLESTERO, BANDIDO_BALLESTERO],
        [MATON],
        [PICARO_ENVENENADOR, LADRON_FURTIVO],
        [NINJA_SOMBRAS],
        [SABUESO_CONTRABANDO, BANDIDO_BALLESTERO],
        [LADRON_FURTIVO, LADRON_FURTIVO, BANDIDO_BALLESTERO],
        [NINJA_SOMBRAS, PICARO_ENVENENADOR],
      ],
      elites: [[CAPITAN_BANDIDO], [MAESTRO_NINJA], [RATA_ALCANTARILLA, RATA_ALCANTARILLA, RATA_GIGANTE, RATA_ALCANTARILLA]],
      jefe: [EMBAUCADOR_ARCANO],
    },
  ],
  [
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
      elites: [[CABALLERO_TUMBARIO], [MOMIA_REAL], [AVENTURERO_ESQUELETICO, AVENTURERO_ESQUELETICO, AVENTURERO_ESQUELETICO]],
      jefe: [SENOR_CRIPTA],
    },
    {
      nombre: 'El Templo Oscuro',
      subtitulo: 'Capítulo II',
      intro:
        'La escalera no lleva a una cripta, sino a un templo profanado. Entre cánticos y velas negras, un culto abre la puerta del Abismo… y su Heraldo no piensa cerrarla.',
      ambiente: 'abismo',
      normales: [
        [ACOLITO_VELADO],
        [ACOLITO_VELADO, LANZADOR_VACIO],
        [SABUESO_INFERNAL],
        [DIABLILLO, LANZADOR_VACIO],
        [POSEIDO],
        [FLAGELANTE, DIABLILLO],
        [ACOLITO_VELADO, ACOLITO_VELADO, LANZADOR_VACIO],
        [POSEIDO, FLAGELANTE],
      ],
      elites: [[DEMONIO_MENOR], [INQUISIDOR_OSCURO], [INCUBO, SUCUBO]],
      jefe: [HERALDO_CULTO],
    },
  ],
  [
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
      elites: [[DRACO_VETERANO], [SUMO_CULTISTA], [GUARDIA_DRACONIDO, GUARDIA_DRACONIDO, GUARDIA_DRACONIDO]],
      jefe: [IGNIFAX],
    },
    {
      nombre: 'El Laberinto del Contemplador',
      subtitulo: 'Capítulo III',
      intro:
        'Los túneles no descienden hacia el fuego, sino que se retuercen sobre sí mismos hasta perder el sentido. En el corazón del laberinto, un único ojo gigante lo observa todo: el Contemplador, señor de las aberraciones.',
      ambiente: 'arcano',
      normales: [
        [AZOTAMENTES],
        [LACAYO_ENGENDRADO, OJO_FLOTANTE],
        [CUBO_GELATINOSO],
        [REPTADOR_CARRONERO, REPTADOR_CARRONERO],
        [HORROR_TENTACULAR],
        [AZOTAMENTES, OJO_FLOTANTE],
        [LACAYO_ENGENDRADO, LACAYO_ENGENDRADO, OJO_FLOTANTE],
        [HORROR_TENTACULAR, REPTADOR_CARRONERO],
      ],
      elites: [[AZOTAMENTES_ANCIANO], [CEREBRO_ANCIANO], [MIMICO_COFRE]],
      jefe: [CONTEMPLADOR],
    },
  ],
];

export function crearEnemigo(def: EnemigoDef, rng: () => number): EnemigoCombate {
  const pv = def.pv[0] + Math.floor(rng() * (def.pv[1] - def.pv[0] + 1));
  const enemigo: EnemigoCombate = {
    def, nombre: def.nombre, pvMax: pv, pv, bloqueo: 0,
    estados: { ...def.estadosIniciales }, vivo: true, turnosVisto: 0,
    intencion: { nombre: '...', intencion: 'desconocido' },
    danoBaseMax: 0,
  };
  enemigo.intencion = def.ia(0, rng, enemigo, []);
  enemigo.danoBaseMax = enemigo.intencion.dano ?? 0;
  return enemigo;
}

/** The enemies of a fight, with every placeholder slot (EnemigoDef.variantes) filled at
 *  random by a variant not already in the fight. */
export function resolverVariantes(defs: EnemigoDef[], rng: () => number): EnemigoDef[] {
  const usados = new Set(defs.filter((d) => !d.variantes?.length).map((d) => d.id));
  return defs.map((d) => {
    if (!d.variantes?.length) return d;
    const libres = d.variantes.filter((v) => !usados.has(v.id));
    const pool = libres.length ? libres : d.variantes;
    const elegido = pool[Math.floor(rng() * pool.length)];
    usados.add(elegido.id);
    return elegido;
  });
}

/** Everything a def can bring into a fight: its variants, what it frees on death and what
 *  wakes with it (for the gallery and the art checks). */
export function enemigosRelacionados(d: EnemigoDef): EnemigoDef[] {
  return [
    ...(d.variantes ?? [d]),
    ...(d.invocaAlMorir ? [d.invocaAlMorir] : []),
    ...(d.durmiente?.despertar ?? []),
  ];
}

/** The trait shown for `e` right now: its lone one once nobody else stands with it. */
export function rasgoActual(e: EnemigoCombate, enemigos: EnemigoCombate[]): EnemigoDef['rasgo'] {
  const solo = !enemigos.some((x) => x !== e && x.vivo);
  return solo && e.def.rasgoSolo ? e.def.rasgoSolo : e.def.rasgo;
}
