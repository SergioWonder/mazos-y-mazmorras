import type { ReliquiaDef, ClaseId } from './types.ts';

// ── Reliquias iniciales por clase ────────────────────────────────────────────

export const TOTEM_ROBLE: ReliquiaDef = {
  id: 'totem-roble', nombre: 'Tótem de Roble', icono: '🪵',
  texto: 'Cúrate 5 PV al final de cada combate.',
  finCombate: (run) => { run.pv = Math.min(run.pvMax, run.pv + 5); },
};

export const HACHA_ANCESTRO: ReliquiaDef = {
  id: 'hacha-ancestro', nombre: 'Hacha del Ancestro', icono: '🪓',
  texto: 'Empiezas cada combate con Furia: +1 de Fuerza. (La Furia se rompe si acabas la ronda sin recibir daño.)',
  inicioCombate: async (ctx) => { await ctx.ganarFuria(1); },
};

export const PENDULO_AMBAR: ReliquiaDef = {
  id: 'pendulo-ambar', nombre: 'Péndulo de Ámbar', icono: '🔮',
  texto: 'Cada vez que gastas un espacio de conjuro, gana 2 de bloqueo.',
  alGastarConjuro: async (ctx) => { await ctx.ganarBloqueo(2); },
};

export function reliquiaInicial(clase: ClaseId): ReliquiaDef {
  return { druida: TOTEM_ROBLE, barbaro: HACHA_ANCESTRO, mago: PENDULO_AMBAR }[clase];
}

/** Registro completo (para guardar/cargar partidas por id). */
export function reliquiaPorId(id: string): ReliquiaDef | undefined {
  return [TOTEM_ROBLE, HACHA_ANCESTRO, PENDULO_AMBAR, ...POOL_RELIQUIAS].find((r) => r.id === id);
}

// ── Pool de reliquias (objetos clásicos de D&D) ──────────────────────────────

export const POOL_RELIQUIAS: ReliquiaDef[] = [
  {
    id: 'guanteletes-ogro', nombre: 'Guanteletes de Poder de Ogro', icono: '🧤',
    texto: 'Empiezas cada combate con +1 de Fuerza.',
    inicioCombate: async (ctx) => { await ctx.aplicarEstado(ctx.jugador, 'fuerza', 1); },
  },
  {
    id: 'botas-aladas', nombre: 'Botas Aladas', icono: '🥾',
    texto: 'Empiezas cada combate con +1 de Destreza.',
    inicioCombate: async (ctx) => { await ctx.aplicarEstado(ctx.jugador, 'destreza', 1); },
  },
  {
    id: 'amuleto-salud', nombre: 'Amuleto de Salud', icono: '🧿',
    texto: '+8 PV máximos al obtenerlo.',
    alObtener: (run) => { run.pvMax += 8; run.pv += 8; },
  },
  {
    id: 'capa-desplazamiento', nombre: 'Capa de Desplazamiento', icono: '🧥',
    texto: 'Gana 4 de bloqueo en el primer turno de cada combate.',
    inicioCombate: async (ctx) => { await ctx.ganarBloqueo(4); },
  },
  {
    id: 'piedra-ioun', nombre: 'Piedra Ioun', icono: '💎',
    texto: 'Roba 1 carta adicional cada turno.',
    robaExtraPorTurno: 1,
  },
  {
    id: 'anillo-proteccion', nombre: 'Anillo de Protección', icono: '💍',
    texto: 'Gana 1 de bloqueo al final de cada turno.',
    finTurno: async (ctx) => { await ctx.ganarBloqueo(1); },
  },
  {
    id: 'diadema-intelecto', nombre: 'Diadema de Intelecto', icono: '👑',
    texto: 'Empiezas cada combate con 1 espacio de conjuro adicional.',
    soloClase: 'mago',
    inicioCombate: async (ctx) => { await ctx.ganarConjuro(false); },
  },
  {
    id: 'cuerno-valhalla', nombre: 'Cuerno de Valhalla', icono: '📯',
    texto: 'Al inicio de cada combate, aplica 1 de Débil a todos los enemigos.',
    inicioCombate: async (ctx) => {
      for (const e of ctx.enemigos.filter((x) => x.vivo)) await ctx.aplicarEstado(e, 'debil', 1);
    },
  },
  {
    id: 'talisman-vorpal', nombre: 'Talismán Vorpal', icono: '🗡️',
    texto: 'Al inicio de cada combate, aplica 1 de Vulnerable a todos los enemigos.',
    inicioCombate: async (ctx) => {
      for (const e of ctx.enemigos.filter((x) => x.vivo)) await ctx.aplicarEstado(e, 'vulnerable', 1);
    },
  },
  {
    id: 'brazales-defensa', nombre: 'Brazales de Defensa', icono: '🦾',
    texto: 'Empiezas cada combate con 8 de bloqueo.',
    inicioCombate: async (ctx) => { await ctx.ganarBloqueo(8); },
  },
  {
    id: 'manual-ejercicio', nombre: 'Manual del Ejercicio Provechoso', icono: '📕',
    texto: 'Al obtenerlo: +1 de Fuerza permanente al inicio de cada combate.',
    alObtener: (run) => { run.permanentes.fuerza += 1; },
  },
  {
    id: 'piedra-suerte', nombre: 'Piedra de la Buena Suerte', icono: '🍀',
    texto: 'Cúrate 3 PV al inicio de cada combate.',
    inicioCombate: async (ctx) => { await ctx.curar(3); },
  },
  {
    id: 'manto-espectral', nombre: 'Manto Espectral', icono: '👘',
    texto: 'Empiezas cada combate con Espejismo: 20 % de esquivar el primer ataque.',
    inicioCombate: async (ctx) => { await ctx.aplicarEstado(ctx.jugador, 'espejismo', 1); },
  },
];
