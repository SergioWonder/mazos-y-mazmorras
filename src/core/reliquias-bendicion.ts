import type { CartaDef, ClaseId, ContextoEfecto, EnemigoCombate, EstadoRun, ReliquiaDef } from './types.ts';
import { crearRng } from './rng.ts';
import { instanciar, nuevaMaldicion, NEUTRALES_ESPECIALES, cartaUnicaDeClase } from './cartas.ts';
// Circular on purpose: only used inside hooks, never while the module loads.
import { sortearReliquia, otorgarReliquia } from './reliquias.ts';

// Blessing relics: they only come from Síbila's blessings (start of the run and
// between acts), never from chests, elites, events or bosses.

const vivos = (ctx: ContextoEfecto): EnemigoCombate[] => ctx.enemigos.filter((e) => e.vivo);

/** true (once) the first time `clave` is asked for in this combat. */
function primeraVez(ctx: ContextoEfecto, clave: string): boolean {
  if (ctx.marca(clave) > 0) return false;
  ctx.marca(clave, 1);
  return true;
}

/** true (once per turn) the first time `clave` is asked for this turn. */
function primeraDelTurno(ctx: ContextoEfecto, clave: string): boolean {
  if (ctx.marca(clave) === ctx.turnoActual()) return false;
  ctx.marca(clave, ctx.turnoActual());
  return true;
}

// ── Generales ────────────────────────────────────────────────────────────────

const GENERALES: ReliquiaDef[] = [
  {
    id: 'bendicion-alba', nombre: 'Bendición del Alba', icono: '🌅', rareza: 'bendicion', tipoBendicion: 'general',
    texto: 'En tus dos primeros turnos de cada combate ganas 1 de energía y robas 1 carta.',
    inicioTurno: async (ctx, turno) => {
      if (turno > 2) return;
      ctx.ganarEnergia(1);
      await ctx.robar(1);
    },
  },
  {
    id: 'estrella-fugaz', nombre: 'Estrella Fugaz', icono: '🌠', rareza: 'bendicion', tipoBendicion: 'general',
    texto: 'La 4.ª carta que juegas cada turno te devuelve 1 de energía y te hace robar 1 carta.',
    alJugarCarta: async (ctx, { jugadasTurno }) => {
      if (jugadasTurno !== 4) return;
      ctx.ganarEnergia(1);
      await ctx.robar(1);
    },
  },
  {
    id: 'campana-plegaria', nombre: 'Campana de Plegaria', icono: '🔔', rareza: 'bendicion', tipoBendicion: 'general',
    texto: 'Cada vez que barajas tu descarte, la campana tañe: te curas 3 PV y ganas 5 de bloqueo.',
    alBarajar: async (ctx) => {
      await ctx.curar(3);
      await ctx.ganarBloqueo(5);
    },
  },
  {
    id: 'mirada-vidente', nombre: 'Mirada de la Vidente', icono: '👁️‍🗨️', rareza: 'bendicion', tipoBendicion: 'general',
    texto: 'Al empezar cada combate, Síbila te revela sus planes: quien pretende atacarte queda con 2 de Débil; quien no, con 2 de Vulnerable.',
    inicioCombate: async (ctx) => {
      for (const e of vivos(ctx)) {
        await ctx.aplicarEstado(e, ctx.noPretendeAtacar(e) ? 'vulnerable' : 'debil', 2);
      }
    },
  },
  {
    id: 'aureola-martir', nombre: 'Aureola del Mártir', icono: '😇', rareza: 'bendicion', tipoBendicion: 'general',
    texto: 'Cada vez que un golpe enemigo te hiere, la aureola brilla: ganas tanto bloqueo como la mitad del daño recibido.',
    alSerGolpeado: async (ctx, _atacante, golpe) => {
      if (golpe.real > 0 && ctx.jugador.pv > 0) await ctx.ganarBloqueo(Math.ceil(golpe.real / 2));
    },
  },
];

// ── Pactos: mucho a cambio de una pega ───────────────────────────────────────

const PACTOS: ReliquiaDef[] = [
  {
    id: 'pacto-sangre', nombre: 'Pacto de Sangre', icono: '🩸', rareza: 'bendicion', tipoBendicion: 'pacto',
    texto: 'Ganas 1 de energía más cada turno, pero cada vez que barajas tu descarte pierdes 4 PV.',
    inicioCombate: async (ctx) => { ctx.jugador.energiaMax += 1; },
    alBarajar: async (ctx) => {
      await ctx.mensaje('🩸 El Pacto de Sangre se cobra su parte');
      await ctx.perderPV(4);
    },
  },
  {
    id: 'corazon-cristal', nombre: 'Corazón de Cristal', icono: '💠', rareza: 'bendicion', tipoBendicion: 'pacto',
    texto: 'Tus ataques infligen 3 de daño más por golpe, pero empiezas cada combate con 2 de Vulnerable.',
    bonoAtaque: () => 3,
    inicioCombate: async (ctx) => { await ctx.aplicarEstado(ctx.jugador, 'vulnerable', 2); },
  },
  {
    id: 'pacto-insomne', nombre: 'Pacto del Insomne', icono: '🌘', rareza: 'bendicion', tipoBendicion: 'pacto',
    texto: 'Robas 2 cartas más cada turno, pero la primera carta que juegas cada turno te cuesta 3 PV.',
    robaExtraPorTurno: 2,
    alJugarCarta: async (ctx, { jugadasTurno }) => {
      if (jugadasTurno === 1) await ctx.perderPV(3);
    },
  },
  {
    id: 'pacto-codicia', nombre: 'Pacto de la Codicia', icono: '💰', rareza: 'bendicion', tipoBendicion: 'pacto',
    texto: 'Al sellarlo obtienes 2 reliquias al azar, pero la Codicia entra en tu mazo: una maldición que, una vez robada, no sale de tu mano.',
    alObtener: (run, rng) => {
      run.mazo.push(nuevaMaldicion('codicia'));
      for (let i = 0; i < 2; i++) {
        const r = sortearReliquia(run, rng, 'evento');
        if (r) otorgarReliquia(run, r, rng);
      }
    },
  },
];

// ── De mapa: eventos, élites y campamentos ───────────────────────────────────

/** Upgrades one random upgradable card of the deck; returns its new name. */
function mejorarAlAzar(run: EstadoRun, rng: () => number): string | null {
  const mejorables = run.mazo.filter((c) => !c.mejorada && c.def.mejora);
  if (mejorables.length === 0) return null;
  const carta = mejorables[Math.floor(rng() * mejorables.length)];
  carta.mejorada = true;
  return `${carta.def.nombre}+`;
}

const DE_MAPA: ReliquiaDef[] = [
  {
    id: 'farol-peregrino', nombre: 'Farol del Peregrino', icono: '🏮', rareza: 'bendicion', tipoBendicion: 'mapa',
    texto: 'Cada vez que llegas a un campamento, su luz te cura 10 PV antes de que elijas qué hacer.',
    alEntrarEnSala: (run, tipo) => {
      if (tipo !== 'descanso') return;
      const cura = Math.min(10, run.pvMax - run.pv);
      run.pv += cura;
      return `🏮 Farol del Peregrino: +${cura} PV`;
    },
  },
  {
    id: 'brujula-sibila', nombre: 'Brújula de Síbila', icono: '🧭', rareza: 'bendicion', tipoBendicion: 'mapa',
    texto: 'Tras cada evento, eliges también una carta para tu mazo.',
    recompensaCartaEn: ['evento'],
  },
  {
    id: 'trofeo-cazador', nombre: 'Trofeo del Cazador', icono: '🏆', rareza: 'bendicion', tipoBendicion: 'mapa',
    texto: 'Cada élite o jefe que vences mejora 1 carta al azar de tu mazo.',
    alVencerCombate: (run, { eliteOJefe }) => {
      if (!eliteOJefe) return;
      const mejoradas = run.mazo.filter((c) => c.mejorada).length;
      mejorarAlAzar(run, crearRng(run.semilla + run.piso * 131 + mejoradas));
    },
  },
  {
    id: 'estandarte-cruzada', nombre: 'Estandarte de Cruzada', icono: '⚜️', rareza: 'bendicion', tipoBendicion: 'mapa',
    texto: 'Contra élites y jefes, ganas 1 de energía más cada turno y empiezas con 8 de bloqueo.',
    inicioCombate: async (ctx) => {
      if (!ctx.esEliteOJefe()) return;
      ctx.jugador.energiaMax += 1;
      await ctx.ganarBloqueo(8);
    },
  },
];

// ── De clase: ligadas a la mecánica de cada una ──────────────────────────────

const DE_CLASE: ReliquiaDef[] = [
  // Druida
  {
    id: 'bendicion-manada', nombre: 'Bendición de la Manada', icono: '🐺', rareza: 'bendicion', tipoBendicion: 'clase', soloClase: 'druida',
    texto: 'Cada vez que te transformas, tu forma dura 1 turno más y un lobo espiritual acude a tu lado: Invoca 4.',
    alTransformarse: async (ctx, efecto) => {
      if (!efecto.permanente) efecto.turnos += 1;
      await ctx.invocar('lobo', 4);
    },
  },
  {
    id: 'bendicion-raices', nombre: 'Bendición de las Raíces Profundas', icono: '🌳', rareza: 'bendicion', tipoBendicion: 'clase', soloClase: 'druida',
    texto: 'Al empezar cada combate, 2 de Raíces a TODOS los enemigos durante 2 turnos; cada vez que tus Raíces aplastan a un enemigo, robas 1 carta.',
    inicioCombate: async (ctx) => {
      for (const e of vivos(ctx)) await ctx.aplicarRaices(e, 2, 2);
    },
    alAplastarRaices: async (ctx) => { await ctx.robar(1); },
  },
  // Bárbaro
  {
    id: 'bendicion-trueno', nombre: 'Bendición del Trueno Ancestral', icono: '⛈️', rareza: 'bendicion', tipoBendicion: 'clase', soloClase: 'barbaro',
    texto: 'Cada vez que ganas Furia, un trueno cae sobre el campo: 3 de daño a TODOS los enemigos.',
    alGanarFuria: async (ctx) => {
      for (const e of vivos(ctx)) await ctx.danar(e, 3, 'impacto');
    },
  },
  {
    id: 'juramento-inquebrantable', nombre: 'Juramento Inquebrantable', icono: '🔥', rareza: 'bendicion', tipoBendicion: 'clase', soloClase: 'barbaro',
    texto: 'La primera vez en cada combate que pierdes la Furia, vuelve a arder al instante: ganas Furia (+2 de Fuerza).',
    alPerderFuria: async (ctx) => {
      if (!primeraVez(ctx, 'juramento-inquebrantable')) return;
      await ctx.mensaje('🔥 ¡El Juramento reaviva tu Furia!');
      await ctx.ganarFuria(2);
    },
  },
  // Mago
  {
    id: 'fuente-arcana', nombre: 'Bendición de la Fuente Arcana', icono: '⛲', rareza: 'bendicion', tipoBendicion: 'clase', soloClase: 'mago',
    texto: 'Empiezas cada combate con 1 espacio de conjuro más, y cada espacio de nivel 2 o superior que gastas te hace robar 1 carta.',
    inicioCombate: async (ctx) => { await ctx.ganarConjuro(false); },
    alGastarConjuro: async (ctx, nivel) => {
      if (nivel >= 2) await ctx.robar(1);
    },
  },
  {
    id: 'bendicion-constelacion', nombre: 'Bendición de la Constelación', icono: '✨', rareza: 'bendicion', tipoBendicion: 'clase', soloClase: 'mago',
    texto: 'Cada 2 espacios de conjuro que gastas en un combate, las estrellas se alinean: ganas 1 de energía.',
    alGastarConjuro: async (ctx) => {
      const n = ctx.marca('bendicion-constelacion', ctx.marca('bendicion-constelacion') + 1);
      if (n % 2 === 0) ctx.ganarEnergia(1);
    },
  },
  // Pícaro
  {
    id: 'filo-consagrado', nombre: 'Bendición del Filo Consagrado', icono: '⚔️', rareza: 'bendicion', tipoBendicion: 'clase', soloClase: 'picaro',
    texto: 'Cada Daga que juegas inflige además 2 de daño sagrado a su objetivo, y la primera de cada turno te hace robar 1 carta.',
    alJugarCarta: async (ctx, { carta, objetivo }) => {
      if (carta.def.id !== 'daga') return;
      if (objetivo?.vivo) await ctx.danar(objetivo, 2, 'impacto');
      if (primeraDelTurno(ctx, 'filo-consagrado')) await ctx.robar(1);
    },
  },
  {
    id: 'sombra-veloz', nombre: 'Bendición de la Sombra Veloz', icono: '🌫️', rareza: 'bendicion', tipoBendicion: 'clase', soloClase: 'picaro',
    texto: 'Cada carta que descartas deja una estela venenosa: 2 de Veneno a un enemigo al azar.',
    alDescartar: async (ctx) => {
      const lista = vivos(ctx);
      if (lista.length === 0) return;
      await ctx.aplicarEstado(lista[Math.floor(ctx.rng() * lista.length)], 'veneno', 2);
    },
  },
  // Brujo
  {
    id: 'eco-sobrenatural', nombre: 'Bendición del Eco Sobrenatural', icono: '🌀', rareza: 'bendicion', tipoBendicion: 'clase', soloClase: 'brujo',
    texto: 'La primera Explosión Sobrenatural de cada turno resuena: inflige 3 de daño a todos los demás enemigos.',
    alLanzarExplosion: async (ctx, golpeados) => {
      if (!primeraDelTurno(ctx, 'eco-sobrenatural')) return;
      // a flat echo on the enemies the Blast missed (it no longer scales with the Blast)
      for (const e of vivos(ctx)) if (!golpeados.includes(e)) await ctx.danar(e, 3, 'abisal');
    },
  },
  {
    id: 'diablillo-guardian', nombre: 'Bendición del Diablillo Guardián', icono: '👹', rareza: 'bendicion', tipoBendicion: 'clase', soloClase: 'brujo',
    texto: 'Al empezar cada combate acude un diablillo: invocación efímera de 8 de vida que, si aguanta la ronda, golpea por 6 y aplica 2 de Condena.',
    inicioCombate: async (ctx) => { await ctx.invocarEfimero('demonio', 8, 6, 2); },
  },
  // Paladín
  {
    id: 'bendicion-martillo-radiante', nombre: 'Bendición del Martillo Radiante', icono: '🔨', rareza: 'bendicion', tipoBendicion: 'clase', soloClase: 'paladin',
    texto: 'Tus Golpes infligen 2 de daño más y tus Defensas dan 2 de bloqueo más.',
    inicioCombate: async (ctx) => {
      await ctx.aplicarEstado(ctx.jugador, 'golpesMas', 2);
      await ctx.aplicarEstado(ctx.jugador, 'defensasMas', 2);
    },
  },
  {
    id: 'bendicion-aurora', nombre: 'Bendición de la Aurora', icono: '🌅', rareza: 'bendicion', tipoBendicion: 'clase', soloClase: 'paladin',
    texto: 'Empiezas cada combate con un Castigo preparado: tu primer ataque inflige 8 de daño más.',
    inicioCombate: async (ctx) => {
      await ctx.prepararCastigo({ nombre: 'Bendición de la Aurora', elemento: 'divino', dano: 8, generico: true });
    },
  },
];

// ── Unique cards: the relic puts its card into the deck when obtained ────────

/**
 * Builds a unique-card relic: on pickup (never on rehydration) the card goes to the
 * deck, and each time you play that card `alJugarla` adds a small themed bonus.
 */
function donDeCarta(
  base: Omit<ReliquiaDef, 'rareza' | 'tipoBendicion' | 'alObtener' | 'alJugarCarta'>,
  carta: string, clase: ClaseId | undefined,
  alJugarla: (ctx: ContextoEfecto) => Promise<void>,
): ReliquiaDef {
  // Resolved lazily: a class's unique card, or a colourless special card
  const def = (): CartaDef => (clase ? cartaUnicaDeClase(clase) : NEUTRALES_ESPECIALES.find((c) => c.id === carta)!);
  return {
    ...base, rareza: 'bendicion', tipoBendicion: 'unica', ...(clase ? { soloClase: clase } : {}),
    alObtener: (run) => { run.mazo.push(instanciar(def())); },
    alJugarCarta: async (ctx, { carta: jugada }) => {
      if (jugada.def.id === carta) await alJugarla(ctx);
    },
  };
}

/** Unique-card relics, only offered between acts (see core/bendiciones.ts). */
export const DE_CARTA_UNICA: ReliquiaDef[] = [
  donDeCarta({
    id: 'don-seducir', nombre: 'Dado del Encanto', icono: '💘',
    texto: 'Añade «Seducir» a tu mazo (incolora, tira 1d20). La primera Seducir de cada combate te devuelve su energía.',
  }, 'seducir', undefined, async (ctx) => {
    if (ctx.marca('don-seducir') > 0) return;
    ctx.marca('don-seducir', 1);
    ctx.ganarEnergia(1);
  }),
  donDeCarta({
    id: 'don-deseo', nombre: 'Dado de los Deseos', icono: '🌠',
    texto: 'Añade «Deseo» a tu mazo (incolora, tira 1d20). Cada vez que juegas Deseo, robas 1 carta.',
  }, 'deseo', undefined, async (ctx) => { await ctx.robar(1); }),
  donDeCarta({
    id: 'don-tormenta-venganza', nombre: 'Asta de la Tormenta', icono: '🌩️',
    texto: 'Añade «Tormenta de Venganza» a tu mazo (única de clase). Al jugarla, te curas 6 PV.',
  }, 'tormenta-venganza', 'druida', async (ctx) => { await ctx.curar(6); }),
  donDeCarta({
    id: 'don-furia-indomita', nombre: 'Gran Hacha Indómita', icono: '🪓',
    texto: 'Añade «Furia Indómita» a tu mazo (única de clase). Al jugarla, ganas Furia (+1 de Fuerza).',
  }, 'furia-indomita', 'barbaro', async (ctx) => { await ctx.ganarFuria(1); }),
  donDeCarta({
    id: 'don-maestria-conjuros', nombre: 'Orbe de la Maestría', icono: '🌕',
    texto: 'Añade «Maestría de Conjuros» a tu mazo (única de clase). Al jugarla, ganas 1 espacio de conjuro.',
  }, 'maestria-conjuros', 'mago', async (ctx) => { await ctx.ganarConjuro(false); }),
  donDeCarta({
    id: 'don-danza-mortal', nombre: 'Dagas de la Danza Mortal', icono: '💃',
    texto: 'Añade «Danza Mortal» a tu mazo (única de clase). Al jugarla, creas 2 Dagas en tu mano.',
  }, 'danza-mortal', 'picaro', async (ctx) => { await ctx.crearDagas(2); }),
  donDeCarta({
    id: 'don-pacto-final', nombre: 'Ojo del Pacto Final', icono: '👁️',
    texto: 'Añade «Pacto Final» a tu mazo (única de clase). Al jugarla, ganas 6 de bloqueo.',
  }, 'pacto-final', 'brujo', async (ctx) => { await ctx.ganarBloqueo(6); }),
  donDeCarta({
    id: 'don-angel-vengador', nombre: 'Pluma del Ángel Vengador', icono: '🪶',
    texto: 'Añade «Ángel Vengador» a tu mazo (única de clase). Al jugarla, ganas 3 de Fervor.',
  }, 'angel-vengador', 'paladin', async (ctx) => { await ctx.ganarFervor(3); }),
];

/** Every blessing relic (only offered by the blessing screens). */
export const BENDICIONES: ReliquiaDef[] = [...GENERALES, ...PACTOS, ...DE_MAPA, ...DE_CLASE, ...DE_CARTA_UNICA];
