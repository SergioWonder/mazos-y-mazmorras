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
    texto: 'Su despensa camina: invoca goblins famélicos, y devorarlos lo repara y lo enfurece.',
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
  id: 'caballero-tumbario', nombre: 'Caballero Tumbario', arte: '🛡️', pv: [92, 100], escala: 1.3,
  ia: (turno, rng) => {
    if (turno % 3 === 0) return def('Muro Sepulcral', 14, [['fuerza', 3, false]]);
    return rng() < 0.45 ? atk('Carga Fantasmal', 12, 2, [['vulnerable', 1, true]]) : atk('Mandoble Maldito', 21);
  },
};

export const MOMIA_REAL: EnemigoDef = {
  id: 'momia-real', nombre: 'Momia Real', arte: '🪦', pv: [82, 90], escala: 1.3,
  ia: (turno, rng) => {
    if (turno % 4 === 0)
      return {
        nombre: 'Maldición Faraónica', intencion: 'perjuicio',
        efectos: [['debil', 3, true], ['fragil', 3, true], ['vulnerable', 1, true]],
      };
    if (rng() < 0.3)
      return { nombre: 'Vendas Reparadoras', intencion: 'defensa', bloqueo: 12, cura: 10 };
    return atk('Puño Vendado', 18);
  },
};

export const SENOR_CRIPTA: EnemigoDef = {
  id: 'senor-cripta', nombre: "Vol'guth, Señor de la Cripta", arte: '🧙‍♂️', pv: [178, 178], escala: 1.8,
  pasiva: 'filacteria', esJefe: true,
  rasgo: {
    nombre: 'Filacteria',
    texto: 'Su alma está atada a una filacteria: para él, la muerte no es un final… sino un despertar.',
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
  id: 'draco-veterano', nombre: 'Draco Veterano', arte: '🐉', pv: [120, 130], escala: 1.45,
  ia: (turno, rng) => {
    if (turno % 4 === 3) return { nombre: 'Rugido Escamoso', intencion: 'mejora', efectos: [['fuerza', 3, false]] };
    if (rng() < 0.4) return atk('Aliento de Fuego', 12, 2, [['vulnerable', 1, true]]);
    return atk('Garra Desgarradora', 22);
  },
};

export const SUMO_CULTISTA: EnemigoDef = {
  id: 'sumo-cultista', nombre: 'Sumo Cultista de Ignifax', arte: '🧙‍♀️', pv: [110, 118], escala: 1.35,
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
    texto: 'Sus escamas al rojo castigan a quien lo golpea. Y cuando la sangre del dragón hierve de verdad… la montaña entera lo sabe.',
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
  ia: (turno, rng) => (rng() < 0.4 ? def('Parpadeo', 4) : atk('Cuchillada Falsa', 5)),
};

export const EMBAUCADOR_ARCANO: EnemigoDef = {
  id: 'embaucador-arcano', nombre: 'Vexis, el Embaucador Arcano', arte: '🃏', pv: [120, 128], escala: 1.9, esJefe: true,
  rasgo: {
    nombre: 'Mil Rostros',
    texto: 'Ladrón, asesino e ilusionista a la vez: nunca golpeas al que crees. Sus dagas van untadas y sus copias bailan a tu alrededor.',
  },
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
  id: 'acolito-velado', nombre: 'Acólito Velado', arte: '🧎', pv: [20, 24],
  ia: (turno, rng) => {
    if (turno === 0) return { nombre: 'Cántico Impío', intencion: 'mejora', fuerzaAliados: 2 };
    if (rng() < 0.35) return { nombre: 'Maldición Leve', intencion: 'perjuicio', efectos: [['debil', 2, true]] };
    return atk('Golpe de Báculo', 8);
  },
};

export const LANZADOR_VACIO: EnemigoDef = {
  id: 'lanzador-vacio', nombre: 'Lanzador del Vacío', arte: '📿', pv: [18, 22],
  ia: (turno, rng) => {
    if (rng() < 0.3) return atk('Esquirla del Vacío', 6, 1, [['fragil', 2, true]]);
    return rng() < 0.5 ? atk('Doble Saeta Oscura', 5, 2) : atk('Saeta Oscura', 9);
  },
};

export const DIABLILLO: EnemigoDef = {
  id: 'diablillo', nombre: 'Diablillo', arte: '👿', pv: [16, 20],
  ia: (turno, rng) => (rng() < 0.35 ? atk('Pinchazo Ardiente', 4, 2) : atk('Tridente', 8)),
};

export const SABUESO_INFERNAL: EnemigoDef = {
  id: 'sabueso-infernal', nombre: 'Sabueso Infernal', arte: '🐕', pv: [30, 34], escala: 1.15,
  ia: (turno, rng) =>
    rng() < 0.4 ? atk('Mordisco Ígneo', 7, 1, [['vulnerable', 1, true]]) : atk('Embestida', 11),
};

export const POSEIDO: EnemigoDef = {
  id: 'poseido', nombre: 'Poseído', arte: '🫥', pv: [26, 30], escala: 1.1,
  ia: (turno, rng) => {
    if (rng() < 0.25) return { nombre: 'Convulsión', intencion: 'defensa', bloqueo: 6, cura: 4 };
    if (rng() < 0.4) return atk('Zarpazo Errático', 7, 1, [['debil', 1, true]]);
    return atk('Arremetida', 12);
  },
};

export const FLAGELANTE: EnemigoDef = {
  id: 'flagelante', nombre: 'Flagelante', arte: '🩸', pv: [22, 26],
  ia: (turno, rng) => (rng() < 0.4 ? atk('Látigo Espinado', 5, 1, [['veneno', 2, true]]) : atk('Azote', 8)),
};

export const DEMONIO_MENOR: EnemigoDef = {
  id: 'demonio-menor', nombre: 'Demonio Menor', arte: '😈', pv: [86, 94], escala: 1.3,
  ia: (turno, rng) => {
    if (turno % 4 === 3) return { nombre: 'Rugido Infernal', intencion: 'mejora', efectos: [['fuerza', 3, false]] };
    return rng() < 0.4 ? atk('Garra Demoníaca', 12, 2, [['vulnerable', 1, true]]) : atk('Mazazo Ígneo', 20);
  },
};

export const INQUISIDOR_OSCURO: EnemigoDef = {
  id: 'inquisidor-oscuro', nombre: 'Inquisidor Oscuro', arte: '🕯️', pv: [80, 88], escala: 1.3,
  ia: (turno, rng) => {
    if (turno % 4 === 0)
      return {
        nombre: 'Anatema', intencion: 'perjuicio',
        efectos: [['debil', 2, true], ['fragil', 2, true], ['vulnerable', 1, true]],
      };
    if (rng() < 0.3) return { nombre: 'Plegaria Profana', intencion: 'mejora', cura: 10, fuerzaAliados: 2 };
    return atk('Verbo Oscuro', 18);
  },
};

export const DEMONIO_MAYOR: EnemigoDef = {
  id: 'demonio-mayor', nombre: 'Abaddon, el Demonio Mayor', arte: '😈', pv: [108, 108], escala: 2.0, esJefe: true,
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
    texto: 'Su cuerpo es solo la cáscara de un pacto: derríbalo y lo que mora dentro se alzará en su lugar.',
  },
  ia: (turno, rng, self, aliados) => {
    if (turno === 0) return { nombre: 'Invocar Acólitos', intencion: 'mejora', invocar: [{ def: ACOLITO_VELADO, pv: 20 }] };
    const ciclo = turno % 4;
    if (ciclo === 0 && aliados.length === 0)
      return { nombre: 'Invocar Acólitos', intencion: 'mejora', invocar: [{ def: ACOLITO_VELADO, pv: 20 }] };
    if (ciclo === 1)
      return {
        nombre: 'Maldición del Pacto', intencion: 'perjuicio',
        efectos: [['debil', 2, true], ['fragil', 2, true], ['vulnerable', 1, true]],
      };
    if (ciclo === 2) return { nombre: 'Drenar Fe', intencion: 'ataque', dano: 15, cura: 9 };
    if (ciclo === 3) return atk('Cuchillo Ritual', 9, 2, [['veneno', 2, true]]);
    return atk('Verbo de Ruina', 20);
  },
};

// ═══ Capítulo III (alt.): El Laberinto del Contemplador ══════════════════════

export const AZOTAMENTES: EnemigoDef = {
  id: 'azotamentes', nombre: 'Azotamentes', arte: '🦑', pv: [34, 38],
  ia: (turno, rng) => {
    if (rng() < 0.3)
      return { nombre: 'Estallido Mental', intencion: 'ataque', dano: 9, efectos: [['cartasSobrecoste', 1, true]] };
    return rng() < 0.5 ? atk('Tentáculos', 5, 2) : atk('Sacudida Psíquica', 12);
  },
};

export const LACAYO_ENGENDRADO: EnemigoDef = {
  id: 'lacayo-engendrado', nombre: 'Lacayo Engendrado', arte: '🧟', pv: [30, 34],
  ia: (turno, rng) => {
    if (turno % 3 === 2) return def('Carne Coriácea', 8);
    return atk('Garras Deformes', 11);
  },
};

export const CUBO_GELATINOSO: EnemigoDef = {
  id: 'cubo-gelatinoso', nombre: 'Cubo Gelatinoso', arte: '🟩', pv: [44, 50], escala: 1.3,
  ia: (turno, rng) =>
    rng() < 0.35 ? atk('Embestida Ácida', 8, 1, [['fragil', 2, true]]) : atk('Engullir', 13),
};

export const REPTADOR_CARRONERO: EnemigoDef = {
  id: 'reptador-carronero', nombre: 'Reptador Carroñero', arte: '🪲', pv: [30, 34],
  ia: (turno, rng) => (rng() < 0.4 ? atk('Pinzas', 5, 2) : atk('Mordisco Quitinoso', 10)),
};

export const OJO_FLOTANTE: EnemigoDef = {
  id: 'ojo-flotante', nombre: 'Ojo Flotante', arte: '👁️', pv: [22, 26],
  ia: (turno, rng) =>
    rng() < 0.35 ? atk('Rayo Debilitador', 5, 1, [['vulnerable', 1, true]]) : atk('Rayo Ocular', 9),
};

export const HORROR_TENTACULAR: EnemigoDef = {
  id: 'horror-tentacular', nombre: 'Horror Tentacular', arte: '🐙', pv: [38, 42], escala: 1.2,
  ia: (turno, rng) =>
    rng() < 0.35 ? atk('Constricción', 7, 1, [['debil', 2, true]]) : atk('Azote de Tentáculos', 13),
};

export const AZOTAMENTES_ANCIANO: EnemigoDef = {
  id: 'azotamentes-anciano', nombre: 'Azotamentes Anciano', arte: '🦑', pv: [112, 120], escala: 1.4,
  ia: (turno, rng) => {
    if (turno % 4 === 2)
      return { nombre: 'Devorar Mente', intencion: 'ataque', dano: 14, cura: 10, efectos: [['cartasSobrecoste', 1, true]] };
    if (rng() < 0.4)
      return { nombre: 'Onda Psíquica', intencion: 'ataque', dano: 10, efectos: [['cartasEtereas', 1, true]] };
    return atk('Tentáculos Cerebrales', 20);
  },
};

export const CEREBRO_ANCIANO: EnemigoDef = {
  id: 'cerebro-anciano', nombre: 'Cerebro Anciano', arte: '🧠', pv: [108, 116], escala: 1.35,
  ia: (turno, rng, self, aliados) => {
    if (turno % 4 === 0 && aliados.length === 0)
      return { nombre: 'Brotar un Ojo', intencion: 'mejora', invocar: [{ def: OJO_FLOTANTE, pv: 22 }] };
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
  { nombre: 'Rayo Carmesí', intencion: 'ataque', dano: 13, fx: 'aliento', efectos: [['cartasSobrecoste', 1, true]] },
  { nombre: 'Rayo Áureo', intencion: 'ataque', dano: 11, fx: 'aliento', efectos: [['cartasAgotan', 1, true]] },
  { nombre: 'Rayo Espectral', intencion: 'ataque', dano: 11, fx: 'aliento', efectos: [['cartasEtereas', 1, true]] },
  { nombre: 'Rayo Pútrido', intencion: 'ataque', dano: 9, fx: 'aliento', efectos: [['veneno', 4, true]] },
  { nombre: 'Rayo Necrótico', intencion: 'ataque', dano: 15, fx: 'aliento', efectos: [['vulnerable', 2, true]] },
];

export const CONTEMPLADOR: EnemigoDef = {
  id: 'contemplador', nombre: 'El Contemplador', arte: '👁️', pv: [280, 280], escala: 2.3, esJefe: true,
  rasgo: {
    nombre: 'Ojos del Caos',
    texto: 'Diez tallos oculares, diez magias distintas. Cada rayo tuerce las reglas de tu próximo turno… y sus Observadores nunca dejan de mirar.',
  },
  ia: (turno, rng, self, aliados) => {
    if (turno === 0)
      return {
        nombre: 'Despertar de Ojos', intencion: 'mejora',
        invocar: [{ def: OBSERVADOR, pv: 22 }, { def: OBSERVADOR, pv: 22 }],
      };
    const ciclo = turno % 4;
    if (ciclo === 0 && aliados.length === 0)
      return {
        nombre: 'Llamada del Enjambre', intencion: 'mejora',
        invocar: [{ def: OBSERVADOR, pv: 22 }, { def: OBSERVADOR, pv: 22 }],
      };
    if (ciclo === 0) return { nombre: 'MIRADA ANIQUILADORA', intencion: 'ataque', dano: 30, fx: 'aliento' };
    return RAYOS_CONTEMPLADOR[(turno - 1) % RAYOS_CONTEMPLADOR.length];
  },
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
      elites: [[HOBGOBLIN], [OGRO_JOVEN]],
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
      elites: [[CAPITAN_BANDIDO], [MAESTRO_NINJA]],
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
      elites: [[CABALLERO_TUMBARIO], [MOMIA_REAL]],
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
      elites: [[DEMONIO_MENOR], [INQUISIDOR_OSCURO]],
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
      elites: [[DRACO_VETERANO], [SUMO_CULTISTA]],
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
      elites: [[AZOTAMENTES_ANCIANO], [CEREBRO_ANCIANO]],
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
