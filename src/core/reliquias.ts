import type {
  ClaseId, ContextoEfecto, EnemigoCombate, EstadoRun, OrigenReliquia, RarezaReliquia, ReliquiaDef,
} from './types.ts';

// ── Small helpers shared by the relic effects ────────────────────────────────

const vivos = (ctx: ContextoEfecto): EnemigoCombate[] => ctx.enemigos.filter((e) => e.vivo);

/** Upgrades one random upgradable card of the deck; returns its new name. */
function mejorarAlAzar(run: EstadoRun, rng: () => number): string | null {
  const mejorables = run.mazo.filter((c) => !c.mejorada && c.def.mejora);
  if (mejorables.length === 0) return null;
  const carta = mejorables[Math.floor(rng() * mejorables.length)];
  carta.mejorada = true;
  return `${carta.def.nombre}+`;
}

/** true (once) the first time `clave` is asked for in this combat. */
function primeraVez(ctx: ContextoEfecto, clave: string): boolean {
  if (ctx.marca(clave) > 0) return false;
  ctx.marca(clave, 1);
  return true;
}

// ── Reliquias iniciales por clase ────────────────────────────────────────────

export const TOTEM_ROBLE: ReliquiaDef = {
  id: 'totem-roble', nombre: 'Tótem de Roble', icono: '🪵', rareza: 'inicial',
  texto: 'Cúrate 5 PV al final de cada combate.',
  finCombate: (run) => { run.pv = Math.min(run.pvMax, run.pv + 5); },
};

export const HACHA_ANCESTRO: ReliquiaDef = {
  id: 'hacha-ancestro', nombre: 'Hacha del Ancestro', icono: '🪓', rareza: 'inicial',
  texto: 'Empiezas cada combate con Furia: +1 de Fuerza. (La Furia se rompe si acabas la ronda sin recibir daño.)',
  inicioCombate: async (ctx) => { await ctx.ganarFuria(1); },
};

export const PENDULO_AMBAR: ReliquiaDef = {
  id: 'pendulo-ambar', nombre: 'Péndulo de Ámbar', icono: '🔮', rareza: 'inicial',
  texto: 'Cada vez que gastas un espacio de conjuro, gana 2 de bloqueo.',
  alGastarConjuro: async (ctx) => { await ctx.ganarBloqueo(2); },
};

export const GUANTE_LADRON: ReliquiaDef = {
  id: 'guante-ladron', nombre: 'Guante del Ladrón', icono: '🧤', rareza: 'inicial',
  texto: 'Empiezas cada combate con 1 de Destreza y una Daga en la mano.',
  inicioCombate: async (ctx) => {
    await ctx.aplicarEstado(ctx.jugador, 'destreza', 1);
    await ctx.crearDagas(1);
  },
};

export const SELLO_PACTO: ReliquiaDef = {
  id: 'sello-pacto', nombre: 'Sello del Pacto', icono: '🌑', rareza: 'inicial',
  texto: 'Empiezas cada combate aplicando 2 de Oscuridad a todos los enemigos.',
  inicioCombate: async (ctx) => {
    for (const e of vivos(ctx)) await ctx.aplicarEstado(e, 'oscuridad', 2);
  },
};

const INICIALES: Record<ClaseId, ReliquiaDef> = {
  druida: TOTEM_ROBLE, barbaro: HACHA_ANCESTRO, mago: PENDULO_AMBAR,
  picaro: GUANTE_LADRON, brujo: SELLO_PACTO,
};

export function reliquiaInicial(clase: ClaseId): ReliquiaDef {
  return INICIALES[clase];
}

// ── Reliquias generales (objetos clásicos de D&D) ────────────────────────────

const GENERALES: ReliquiaDef[] = [
  // — Ritmo del combate —
  {
    id: 'botas-aladas', nombre: 'Botas Aladas', icono: '🥾', rareza: 'comun',
    texto: 'En tu primer turno de cada combate ganas 1 de energía y robas 2 cartas.',
    inicioTurno: async (ctx, turno) => {
      if (turno !== 1) return;
      ctx.ganarEnergia(1);
      await ctx.robar(2);
    },
  },
  {
    id: 'capa-desplazamiento', nombre: 'Capa de Desplazamiento', icono: '🧥', rareza: 'comun',
    texto: 'En tu primer turno de cada combate ganas tanto bloqueo como el daño que te anuncian los enemigos (máx. 15).',
    inicioTurno: async (ctx, turno) => {
      if (turno !== 1) return;
      const anunciado = vivos(ctx).reduce((s, e) => s + ctx.danoIntencion(e) * (e.intencion.veces ?? 1), 0);
      if (anunciado > 0) await ctx.ganarBloqueo(Math.min(15, anunciado));
    },
  },
  {
    id: 'cuerno-valhalla', nombre: 'Cuerno de Valhalla', icono: '📯', rareza: 'comun',
    texto: 'Al inicio de tu 3.er turno, los espíritus de Valhalla cargan: 6 de daño y 1 de Débil a TODOS los enemigos.',
    inicioTurno: async (ctx, turno) => {
      if (turno !== 3) return;
      await ctx.mensaje('📯 ¡Los espíritus de Valhalla cargan!');
      for (const e of vivos(ctx)) {
        await ctx.danar(e, 6, 'impacto');
        if (e.vivo) await ctx.aplicarEstado(e, 'debil', 1);
      }
    },
  },
  {
    id: 'tambor-guerra', nombre: 'Tambor de Guerra Enano', icono: '🥁', rareza: 'comun',
    texto: 'Cada 3 cartas que juegas, el tambor retumba: 3 de daño a un enemigo al azar.',
    alJugarCarta: async (ctx, { jugadasCombate }) => {
      if (jugadasCombate % 3 !== 0) return;
      const lista = vivos(ctx);
      if (lista.length === 0) return;
      await ctx.danar(lista[Math.floor(ctx.rng() * lista.length)], 3, 'impacto');
    },
  },
  {
    id: 'bolsa-contencion', nombre: 'Bolsa de Contención', icono: '👝', rareza: 'rara',
    texto: 'Cada vez que barajas tu descarte para rehacer el mazo, ganas 1 de energía.',
    alBarajar: async (ctx) => {
      ctx.ganarEnergia(1);
      await ctx.mensaje('👝 La Bolsa de Contención te devuelve el aliento: +1 de energía');
    },
  },
  {
    id: 'caliz-vacio', nombre: 'Cáliz Vacío', icono: '🏺', rareza: 'comun',
    texto: 'La primera vez en cada turno que te quedas sin energía, robas 1 carta.',
    alQuedarseSinEnergia: async (ctx) => {
      if (ctx.marca('caliz-vacio') === ctx.turnoActual()) return;
      ctx.marca('caliz-vacio', ctx.turnoActual());
      await ctx.robar(1);
    },
  },
  {
    id: 'guanteletes-ogro', nombre: 'Guanteletes de Poder de Ogro', icono: '🥊', rareza: 'comun',
    texto: 'Cada vez que cae un enemigo, ganas 1 de Fuerza para el resto del combate.',
    alMatar: async (ctx) => { await ctx.aplicarEstado(ctx.jugador, 'fuerza', 1); },
  },
  {
    id: 'estandarte-terror', nombre: 'Estandarte del Terror', icono: '🚩', rareza: 'comun',
    texto: 'Cuando cae un enemigo, el terror cunde: los demás reciben 1 de Débil y 1 de Vulnerable.',
    alMatar: async (ctx, muerto) => {
      for (const e of vivos(ctx)) {
        if (e === muerto) continue;
        await ctx.aplicarEstado(e, 'debil', 1);
        await ctx.aplicarEstado(e, 'vulnerable', 1);
      }
    },
  },
  // — Riesgo y recompensa —
  {
    id: 'baraja-maravillas', nombre: 'Baraja de las Maravillas', icono: '🃏', rareza: 'rara',
    texto: 'Al empezar cada combate sacas una carta de la Baraja (1d20): 1-3 pierdes 5 PV · 4-9 ganas 6 de bloqueo · 10-15 ganas 2 de Fuerza · 16-19 robas 3 cartas · 20 todos los enemigos reciben 3 de Débil y 3 de Vulnerable.',
    inicioCombate: async (ctx) => {
      const n = await ctx.tirarDado(20);
      if (n <= 3) {
        await ctx.mensaje('🃏 La Calavera: pierdes 5 PV');
        await ctx.perderPV(5);
      } else if (n <= 9) {
        await ctx.mensaje('🃏 El Escudo');
        await ctx.ganarBloqueo(6);
      } else if (n <= 15) {
        await ctx.mensaje('🃏 La Espada');
        await ctx.aplicarEstado(ctx.jugador, 'fuerza', 2);
      } else if (n <= 19) {
        await ctx.mensaje('🃏 El Sol: robas 3 cartas');
        await ctx.robar(3);
      } else {
        await ctx.mensaje('🃏 ¡El Destino sonríe!');
        for (const e of vivos(ctx)) {
          await ctx.aplicarEstado(e, 'debil', 3);
          await ctx.aplicarEstado(e, 'vulnerable', 3);
        }
      }
    },
  },
  {
    id: 'yelmo-tirano', nombre: 'Yelmo del Tirano', icono: '⛑️', rareza: 'jefe',
    texto: 'Ganas 1 de energía más cada turno, pero cada combate empieza con una punzada: pierdes 4 PV.',
    inicioCombate: async (ctx) => {
      ctx.jugador.energiaMax += 1;
      await ctx.perderPV(4);
    },
  },
  {
    id: 'hoja-sedienta', nombre: 'Hoja Sedienta', icono: '🔪', rareza: 'jefe',
    texto: 'Tus ataques infligen 1 de daño más por cada 10 PV que te falten, pero descansar en un campamento solo cura la mitad.',
    bonoAtaque: (ctx) => Math.floor((ctx.jugador.pvMax - ctx.jugador.pv) / 10),
    curaDescanso: (_run, cura) => Math.floor(cura / 2),
  },
  {
    id: 'piedra-ioun', nombre: 'Piedra Ioun', icono: '💎', rareza: 'jefe',
    texto: 'Robas 1 carta más cada turno y, al acabarlo, conservas en la mano la carta más cara que no jugaste.',
    robaExtraPorTurno: 1,
    retieneCartas: 1,
  },
  {
    id: 'amuleto-salud', nombre: 'Amuleto de Salud', icono: '🧿', rareza: 'rara',
    texto: 'La primera vez en cada combate que un golpe te deja por debajo de la mitad de tus PV, te curas 10.',
    alSerGolpeado: async (ctx, _atacante, golpe) => {
      const mitad = ctx.jugador.pvMax / 2;
      const { pv } = ctx.jugador;
      if (pv <= 0 || pv >= mitad || pv + golpe.real < mitad) return;
      if (!primeraVez(ctx, 'amuleto-salud')) return;
      await ctx.mensaje('🧿 El Amuleto de Salud se enciende');
      await ctx.curar(10);
    },
  },
  // — Estados —
  {
    id: 'talisman-vorpal', nombre: 'Talismán Vorpal', icono: '🗡️', rareza: 'rara',
    texto: 'Si tu ataque deja a un enemigo Vulnerable (que no sea jefe) con un 15 % de sus PV o menos, lo decapitas.',
    alAtacar: async (ctx, e) => {
      if (!e.vivo || (e.estados.vulnerable ?? 0) <= 0 || ctx.esJefe(e)) return;
      if (e.pv > Math.floor(e.pvMax * 0.15)) return;
      await ctx.mensaje(`🗡️ ¡Snicker-snack! ${e.nombre} pierde la cabeza`);
      await ctx.matar(e);
    },
  },
  {
    id: 'vial-drow', nombre: 'Veneno de Drow', icono: '🧪', rareza: 'comun',
    texto: 'Cada vez que aplicas Débil a un enemigo, le aplicas también 2 de Veneno.',
    alAplicarEstado: async (ctx, obj, estado) => {
      if (obj === ctx.jugador || estado !== 'debil') return;
      await ctx.aplicarEstado(obj, 'veneno', 2);
    },
  },
  {
    id: 'frasco-plaga', nombre: 'Frasco de la Plaga', icono: '🦠', rareza: 'rara',
    texto: 'Cuando muere un enemigo envenenado, su Veneno salta entero a otro enemigo al azar.',
    alMatar: async (ctx, muerto) => {
      const ven = muerto.estados.veneno ?? 0;
      const otros = vivos(ctx).filter((e) => e !== muerto);
      if (ven <= 0 || otros.length === 0) return;
      const destino = otros[Math.floor(ctx.rng() * otros.length)];
      await ctx.mensaje(`🦠 La plaga salta a ${destino.nombre}`);
      await ctx.aplicarEstado(destino, 'veneno', ven);
    },
  },
  // — Bloqueo —
  {
    id: 'anillo-proteccion', nombre: 'Anillo de Protección', icono: '💍', rareza: 'comun',
    texto: 'Al empezar tu turno conservas hasta 5 del bloqueo que te sobró.',
    conservaBloqueo: 5,
  },
  {
    id: 'brazales-defensa', nombre: 'Brazales de Defensa', icono: '🦾', rareza: 'comun',
    texto: 'Si acabas tu turno sin haber jugado ningún ataque, ganas 6 de bloqueo.',
    alJugarCarta: async (ctx, { carta }) => {
      if (carta.def.tipo === 'ataque') ctx.marca('brazales-defensa', ctx.turnoActual());
    },
    finTurno: async (ctx) => {
      if (ctx.marca('brazales-defensa') !== ctx.turnoActual()) await ctx.ganarBloqueo(6);
    },
  },
  {
    id: 'escudo-centinela', nombre: 'Escudo Centinela', icono: '🛡️', rareza: 'rara',
    texto: 'Cada golpe enemigo que tu bloqueo detiene por completo le devuelve 4 de daño al atacante.',
    alSerGolpeado: async (ctx, atacante, golpe) => {
      if (golpe.dano <= 0 || golpe.real > 0 || golpe.bloqueado < golpe.dano || !atacante.vivo) return;
      await ctx.danar(atacante, 4, 'impacto');
    },
  },
  {
    id: 'manto-espectral', nombre: 'Manto Espectral', icono: '👘', rareza: 'comun',
    texto: 'Empiezas cada combate envuelto en 2 cargas de Espejismo: 40 % de esquivar en el primer turno (un golpe recibido las disipa).',
    inicioCombate: async (ctx) => { await ctx.aplicarEstado(ctx.jugador, 'espejismo', 2); },
  },
  // — Mapa, élites y economía —
  {
    id: 'manual-ejercicio', nombre: 'Manual del Ejercicio Provechoso', icono: '📕', rareza: 'rara',
    texto: 'Cada vez que vences a un élite o a un jefe, empiezas los combates con 1 de Fuerza más (para siempre).',
    alVencerCombate: (run, { eliteOJefe }) => { if (eliteOJefe) run.permanentes.fuerza += 1; },
  },
  {
    id: 'cuerno-caza', nombre: 'Cuerno de Caza', icono: '🎺', rareza: 'rara',
    texto: 'Al empezar un combate contra un élite o un jefe, todos los enemigos reciben 2 de Vulnerable y robas 2 cartas.',
    inicioCombate: async (ctx) => {
      if (!ctx.esEliteOJefe()) return;
      for (const e of vivos(ctx)) await ctx.aplicarEstado(e, 'vulnerable', 2);
      await ctx.robar(2);
    },
  },
  {
    id: 'piedra-suerte', nombre: 'Piedra de la Buena Suerte', icono: '🍀', rareza: 'comun',
    texto: 'Las recompensas de carta tienen el doble de probabilidad de ofrecer una carta rara.',
    pesoRaroMult: 2,
  },
  {
    id: 'saco-dormir', nombre: 'Saco de Dormir Élfico', icono: '🛌', rareza: 'comun',
    texto: 'Descansar en un campamento cura un 15 % más de tus PV (45 %); si ya estabas ileso, ganas 5 PV máximos.',
    curaDescanso: (run, cura) => cura + Math.floor(run.pvMax * 0.15),
    alDescansar: (run, curado) => {
      if (curado > 0) return;
      run.pvMax += 5;
      run.pv += 5;
    },
  },
  {
    id: 'piedra-afilar', nombre: 'Piedra de Afilar Enana', icono: '🪨', rareza: 'comun',
    texto: 'Cada vez que afilas una carta en un campamento, se mejora también otra carta al azar.',
    alAfilar: (run, rng) => {
      const nombre = mejorarAlAzar(run, rng);
      return nombre ? [nombre] : [];
    },
  },
  {
    id: 'yunque-moradin', nombre: 'Yunque de Moradin', icono: '🔨', rareza: 'rara',
    texto: 'Los ataques que añades a tu mazo llegan ya mejorados.',
    alAnadirCarta: (_run, carta) => {
      if (carta.def.tipo === 'ataque' && carta.def.mejora) carta.mejorada = true;
    },
  },
  {
    id: 'mapa-tesoro', nombre: 'Mapa del Tesoro', icono: '🗺️', rareza: 'comun',
    texto: 'Tras abrir un cofre, eliges también una carta para tu mazo.',
    recompensaCartaEn: ['cofre'],
  },
  {
    id: 'diario-aventurero', nombre: 'Diario del Aventurero', icono: '📔', rareza: 'comun',
    texto: 'Cada vez que entras en un evento, anotas lo aprendido: se mejora 1 carta al azar de tu mazo.',
    alEntrarEnSala: (run, tipo, rng) => {
      if (tipo !== 'evento') return;
      const nombre = mejorarAlAzar(run, rng);
      return nombre ? `📔 Diario del Aventurero: ${nombre}` : undefined;
    },
  },
];

// ── Reliquias únicas de clase ────────────────────────────────────────────────

const DE_DRUIDA: ReliquiaDef[] = [
  {
    id: 'semilla-roble', nombre: 'Semilla del Roble Madre', icono: '🌰', rareza: 'comun', soloClase: 'druida',
    texto: 'Cada vez que te transformas, brotan raíces: 3 de Raíces a TODOS los enemigos durante 1 turno.',
    alTransformarse: async (ctx) => {
      for (const e of vivos(ctx)) await ctx.aplicarRaices(e, 3, 1);
    },
  },
  {
    id: 'muerdago-sagrado', nombre: 'Muérdago Sagrado', icono: '🌿', rareza: 'comun', soloClase: 'druida',
    texto: 'Cada vez que tus Raíces aplastan a un enemigo, te curas 3 PV.',
    alAplastarRaices: async (ctx) => { await ctx.curar(3); },
  },
  {
    id: 'colmillo-cambiaformas', nombre: 'Colmillo del Cambiaformas', icono: '🦷', rareza: 'rara', soloClase: 'druida',
    texto: 'Tu primera Transformación de cada combate dura 3 turnos más y te hace robar 2 cartas.',
    alTransformarse: async (ctx, efecto) => {
      if (efecto.permanente || !primeraVez(ctx, 'colmillo-cambiaformas')) return;
      efecto.turnos += 3;
      await ctx.robar(2);
    },
  },
  {
    id: 'luna-frasco', nombre: 'Luna en un Frasco', icono: '🌙', rareza: 'rara', soloClase: 'druida',
    texto: 'Cuando termina una Transformación, el espíritu de la forma se queda contigo: Invoca 6.',
    alTerminarTransformacion: async (ctx) => { await ctx.invocar('lobo', 6); },
  },
];

const DE_BARBARO: ReliquiaDef[] = [
  {
    id: 'totem-oso', nombre: 'Tótem del Oso', icono: '🐻', rareza: 'rara', soloClase: 'barbaro',
    texto: 'La primera vez en cada combate que tu Furia se iba a romper por no recibir daño, aguanta.',
    salvarFuria: (ctx) => primeraVez(ctx, 'totem-oso'),
  },
  {
    id: 'cinturon-gigante', nombre: 'Cinturón del Gigante', icono: '🎗️', rareza: 'comun', soloClase: 'barbaro',
    texto: 'Cada vez que ganas Furia, ganas 4 de bloqueo.',
    alGanarFuria: async (ctx) => { await ctx.ganarBloqueo(4); },
  },
  {
    id: 'collar-colmillos', nombre: 'Collar de Colmillos', icono: '🦴', rareza: 'comun', soloClase: 'barbaro',
    texto: 'La primera vez en cada ronda que un golpe enemigo te hiere, ganas Furia: +1 de Fuerza.',
    alSerGolpeado: async (ctx, _atacante, golpe) => {
      if (golpe.real <= 0 || ctx.marca('collar-colmillos') === ctx.turnoActual()) return;
      ctx.marca('collar-colmillos', ctx.turnoActual());
      await ctx.ganarFuria(1);
    },
  },
  {
    id: 'jarra-hidromiel', nombre: 'Jarra de Hidromiel', icono: '🍺', rareza: 'comun', soloClase: 'barbaro',
    texto: 'Cuando pierdes la Furia, un buen trago te consuela: te curas 5 PV.',
    alPerderFuria: async (ctx) => { await ctx.curar(5); },
  },
  {
    id: 'garfio-carnicero', nombre: 'Garfio del Carnicero', icono: '🪝', rareza: 'rara', soloClase: 'barbaro',
    texto: 'Cada vez que cae un enemigo mientras estás en Furia, ganas 1 de energía.',
    alMatar: async (ctx) => {
      if (ctx.jugador.furiaFuerza + ctx.jugador.furiaDestreza > 0) ctx.ganarEnergia(1);
    },
  },
];

const DE_MAGO: ReliquiaDef[] = [
  {
    id: 'diadema-intelecto', nombre: 'Diadema de Intelecto', icono: '👑', rareza: 'rara', soloClase: 'mago',
    texto: 'Al gastar tu último espacio de conjuro libre, ganas 1 de energía y robas 2 cartas.',
    alGastarConjuro: async (ctx) => {
      if (ctx.conjurosLibres() > 0) return;
      ctx.ganarEnergia(1);
      await ctx.robar(2);
    },
  },
  {
    id: 'baculo-archimago', nombre: 'Báculo del Archimago', icono: '🪄', rareza: 'rara', soloClase: 'mago',
    texto: 'La primera vez en cada combate que gastas un espacio de nivel 3, recuperas el espacio gastado de menor nivel.',
    alGastarConjuro: async (ctx, nivel) => {
      if (nivel < 3 || !primeraVez(ctx, 'baculo-archimago')) return;
      await ctx.recuperarConjuro();
    },
  },
  {
    id: 'pluma-escriba', nombre: 'Pluma de Escriba', icono: '🪶', rareza: 'comun', soloClase: 'mago',
    texto: 'Cada vez que gastas un espacio de conjuro, Escribes 3 en el Conjuro Prodigioso.',
    alGastarConjuro: async (ctx) => { await ctx.escribir(3); },
  },
  {
    id: 'reloj-arena-arcano', nombre: 'Reloj de Arena Arcano', icono: '⏳', rareza: 'comun', soloClase: 'mago',
    texto: 'Cada 3 turnos (el 3.º, el 6.º…), recuperas el espacio de conjuro gastado de mayor nivel.',
    inicioTurno: async (ctx, turno) => {
      if (turno % 3 === 0) await ctx.recuperarConjuro(true);
    },
  },
  {
    id: 'grimorio-contingencia', nombre: 'Grimorio de Contingencia', icono: '📘', rareza: 'rara', soloClase: 'mago',
    texto: 'Si acabas tu turno sin haber gastado ningún espacio de conjuro, ganas 1 espacio de conjuro para este combate.',
    alGastarConjuro: async (ctx) => { ctx.marca('grimorio-contingencia', ctx.turnoActual()); },
    finTurno: async (ctx) => {
      if (ctx.marca('grimorio-contingencia') !== ctx.turnoActual()) await ctx.ganarConjuro(false);
    },
  },
];

const DE_PICARO: ReliquiaDef[] = [
  {
    id: 'vaina-ponzona', nombre: 'Vaina Ponzoñosa', icono: '🐍', rareza: 'comun', soloClase: 'picaro',
    texto: 'Tus Dagas están untadas: cada Daga que juegas aplica 2 de Veneno.',
    alJugarCarta: async (ctx, { carta, objetivo }) => {
      if (carta.def.id === 'daga' && objetivo?.vivo) await ctx.aplicarEstado(objetivo, 'veneno', 2);
    },
  },
  {
    id: 'capa-acrobata', nombre: 'Capa del Acróbata', icono: '🤸', rareza: 'comun', soloClase: 'picaro',
    texto: 'Cada vez que descartas una carta, Acrobacias: ganas 2 de bloqueo y vuelves a ganarlo el próximo turno.',
    alDescartar: async (ctx) => { await ctx.ganarBloqueoAcrobatico(2); },
  },
  {
    id: 'mascara-asesino', nombre: 'Máscara del Asesino', icono: '🎭', rareza: 'rara', soloClase: 'picaro',
    texto: 'Tus ataques contra enemigos que no pretenden atacar les aplican 3 de Veneno.',
    alAtacar: async (ctx, e) => {
      if (e.vivo && ctx.noPretendeAtacar(e)) await ctx.aplicarEstado(e, 'veneno', 3);
    },
  },
  {
    id: 'bandolera-cuchillos', nombre: 'Bandolera de Cuchillos', icono: '🎒', rareza: 'comun', soloClase: 'picaro',
    texto: 'Empiezas cada combate con 2 Dagas en la mano, y cada vez que barajas tu descarte añades otra.',
    inicioCombate: async (ctx) => { await ctx.crearDagas(2); },
    alBarajar: async (ctx) => { await ctx.crearDagas(1); },
  },
];

const DE_BRUJO: ReliquiaDef[] = [
  {
    id: 'ojo-patron', nombre: 'Ojo del Patrón', icono: '👁️', rareza: 'comun', soloClase: 'brujo',
    texto: 'Tu Explosión Sobrenatural aplica 2 de Condena al objetivo.',
    alJugarCarta: async (ctx, { carta, objetivo }) => {
      if (carta.def.id === 'explosion-sobrenatural' && objetivo?.vivo) {
        await ctx.aplicarEstado(objetivo, 'condena', 2);
      }
    },
  },
  {
    id: 'corazon-diablillo', nombre: 'Corazón de Diablillo', icono: '😈', rareza: 'rara', soloClase: 'brujo',
    texto: 'Si tu invocación efímera aguanta la ronda, al desvanecerse estalla: inflige la mitad de su vida restante a TODOS los enemigos.',
    alDesvanecerseInvocacion: async (ctx, inv) => {
      const n = Math.ceil(inv.vida / 2);
      if (n <= 0) return;
      await ctx.mensaje(`😈 ¡La invocación estalla! ${n} a todos`);
      for (const e of vivos(ctx)) await ctx.danar(e, n, 'abisal');
    },
  },
  {
    id: 'cadena-condenado', nombre: 'Cadena del Condenado', icono: '⛓️', rareza: 'comun', soloClase: 'brujo',
    texto: 'Cada vez que muere un enemigo con Condena, tu siguiente turno empieza con 1 de energía más.',
    alMatar: async (ctx, muerto) => {
      if ((muerto.estados.condena ?? 0) > 0) ctx.marca('cadena-condenado', ctx.marca('cadena-condenado') + 1);
    },
    inicioTurno: async (ctx) => {
      const n = ctx.marca('cadena-condenado');
      if (n <= 0) return;
      ctx.marca('cadena-condenado', 0);
      ctx.ganarEnergia(n);
      await ctx.mensaje(`⛓️ Las almas condenadas te dan +${n} de energía`);
    },
  },
  {
    id: 'colgante-escarcha', nombre: 'Colgante de Escarcha', icono: '❄️', rareza: 'rara', soloClase: 'brujo',
    texto: 'El daño que tu bloqueo detiene se vuelve contra quien golpea: el atacante recibe esa misma cantidad de Condena.',
    alSerGolpeado: async (ctx, atacante, golpe) => {
      if (golpe.bloqueado > 0 && atacante.vivo) await ctx.aplicarEstado(atacante, 'condena', golpe.bloqueado);
    },
  },
];

// ── Pool completo y registro ─────────────────────────────────────────────────

export const POOL_RELIQUIAS: ReliquiaDef[] = [
  ...GENERALES, ...DE_DRUIDA, ...DE_BARBARO, ...DE_MAGO, ...DE_PICARO, ...DE_BRUJO,
];

/** Registro completo (para guardar/cargar partidas por id). */
export function reliquiaPorId(id: string): ReliquiaDef | undefined {
  return [...Object.values(INICIALES), ...POOL_RELIQUIAS].find((r) => r.id === id);
}

/** Relics that can still be offered to this run: not owned yet and either
 *  general or of the class being played (never another class's). */
export function reliquiasDisponibles(run: EstadoRun): ReliquiaDef[] {
  const propias = new Set(run.reliquias.map((r) => r.id));
  return POOL_RELIQUIAS.filter(
    (r) => !propias.has(r.id) && (!r.soloClase || r.soloClase === run.clase),
  );
}

/** Rarity odds by reward source. Boss relics only drop from bosses. */
const PESO_RAREZA: Record<OrigenReliquia, Partial<Record<RarezaReliquia, number>>> = {
  cofre: { comun: 65, rara: 35 },
  evento: { comun: 65, rara: 35 },
  elite: { comun: 45, rara: 55 },
  jefe: { jefe: 100 },
};

/** Class relics weigh double inside their rarity, so they show up often enough. */
const PESO_CLASE = 2;

function elegirPonderado<T>(rng: () => number, items: Array<[T, number]>): T | undefined {
  const total = items.reduce((s, [, p]) => s + p, 0);
  if (total <= 0) return undefined;
  let tirada = rng() * total;
  for (const [item, peso] of items) {
    tirada -= peso;
    if (tirada < 0) return item;
  }
  return items[items.length - 1][0];
}

/** Rolls a relic for this run from the given source (undefined if none is left). */
export function sortearReliquia(
  run: EstadoRun, rng: () => number, origen: OrigenReliquia = 'cofre',
): ReliquiaDef | undefined {
  const disponibles = reliquiasDisponibles(run);
  const tramos = (pesos: Partial<Record<RarezaReliquia, number>>) =>
    (Object.entries(pesos) as Array<[RarezaReliquia, number]>)
      .filter(([rareza]) => disponibles.some((r) => r.rareza === rareza));
  let posibles = tramos(PESO_RAREZA[origen]);
  // A boss with no boss relic left falls back to the elite odds
  if (posibles.length === 0) posibles = tramos(PESO_RAREZA.elite);
  const rareza = elegirPonderado(rng, posibles);
  if (!rareza) return undefined;
  const candidatas = disponibles.filter((r) => r.rareza === rareza);
  return elegirPonderado(rng, candidatas.map((r): [ReliquiaDef, number] => [r, r.soloClase ? PESO_CLASE : 1]));
}

/** Gives a relic to the run and applies its on-pickup effect. */
export function otorgarReliquia(run: EstadoRun, reliquia: ReliquiaDef) {
  run.reliquias.push(reliquia);
  reliquia.alObtener?.(run);
}

/** Visible label of each rarity (reward panel and tooltips). */
export const NOMBRE_RAREZA_RELIQUIA: Record<RarezaReliquia, string> = {
  inicial: 'Inicial', comun: 'Común', rara: 'Rara', jefe: 'De jefe',
};
