import { jugadaBot, votoBot } from './bot.ts';
import { ofrecerBendicionInicial } from '../bendiciones.ts';
import { contadorUid, defDe, fijarContadorUid } from '../cartas.ts';
import { rehidratarRun, serializarRun } from '../guardado.ts';
import { crearRng } from '../rng.ts';
import { nuevaRun } from '../run.ts';
import type { ClaseId, EstadoRun } from '../types.ts';
import {
  crearUiHeroe, establecerPunto, fijarRng, mezclar, moneda,
} from './base.ts';
import type { Curso, Fase, PartidaMulti } from './estado.ts';
import { hashPartida as hashDe } from './hash.ts';
import {
  aplicarBendicionInicial, aplicarEnSala, nodosDelMapa, opcionesTaberna, reliquiasValidas, votarMapa,
} from './salas.ts';
import {
  HUECOS, type Entrada, type EntradaSellada, type GuardadoMulti, type Hueco, type Pregunta, type PresentadoresMulti,
} from './tipos.ts';

export type { PartidaMulti } from './estado.ts';
export { moneda } from './base.ts';

// The contract of the two-player engine (docs/multijugador.md): a deterministic state machine.
// Same game + same sequence of sealed entries = same state on the server and on both clients.

// ── Creation, save and load ──────────────────────────────────────────────────

function base(semilla: number, clases: Record<Hueco, ClaseId>, runs: Record<Hueco, EstadoRun>, punto: number): PartidaMulti {
  // both heroes walk the same map
  runs.cruz.mapa = runs.cara.mapa;
  const p = {
    semilla, clases, runs, punto, uidSiguiente: 1, limpio: true,
    fase: { tipo: 'mapa', votos: {} } as Fase,
    pausa: null, preguntasAbiertas: 0, curso: null, despertar: null, pres: undefined,
  } as unknown as PartidaMulti;
  p.heroeUi = { cara: crearUiHeroe(p, 'cara'), cruz: crearUiHeroe(p, 'cruz') };
  return p;
}

/** A new game. Both heroes start from the same seed (so the same map and scenario), and
 *  each is offered his opening blessings. */
export function crearPartidaMulti(opts: { semilla: number; clases: Record<Hueco, ClaseId> }): PartidaMulti {
  const { semilla, clases } = opts;
  const runs = { cara: nuevaRun(clases.cara, semilla), cruz: nuevaRun(clases.cruz, semilla) };
  const p = base(semilla, clases, runs, 0);
  // the offers are drawn with their own rng: the game's one starts fresh at the checkpoint
  const rngOfertas = crearRng(mezclar(semilla, 0x0fe27a5));
  const ofertas = {
    cara: ofrecerBendicionInicial(runs.cara, rngOfertas).map((o) => o.reliquia.id),
    cruz: ofrecerBendicionInicial(runs.cruz, rngOfertas).map((o) => o.reliquia.id),
  };
  p.fase = {
    tipo: 'bendicion', ofertas, hechos: { cara: ofertas.cara.length === 0, cruz: ofertas.cruz.length === 0 },
  };
  establecerPunto(p);
  if (HUECOS.every((h) => (p.fase as { hechos: Record<Hueco, boolean> }).hechos[h])) {
    p.fase = { tipo: 'mapa', votos: {} };
    establecerPunto(p);
  }
  return p;
}

/** Can the game be saved right now? Only at a checkpoint (the start of a room): inside one,
 *  the state is that save plus the entries since. */
export function esPuntoDeGuardado(p: PartidaMulti): boolean {
  return p.limpio && p.fase.tipo !== 'sala' && p.pausa === null;
}

export function serializarPartidaMulti(p: PartidaMulti): GuardadoMulti {
  if (!esPuntoDeGuardado(p)) throw new Error('La partida solo se guarda al empezar una sala');
  return {
    v: 1,
    semilla: p.semilla,
    clases: { ...p.clases },
    heroes: { cara: serializarRun(p.runs.cara), cruz: serializarRun(p.runs.cruz) },
    punto: p.punto,
    fase: structuredClone(p.fase) as GuardadoMulti['fase'],
  };
}

export function rehidratarPartidaMulti(guardado: GuardadoMulti): PartidaMulti {
  const g = structuredClone(guardado);
  if (g.v !== 1) throw new Error('Guardado de partida multijugador de otra versión');
  const cara = rehidratarRun(g.heroes.cara);
  const cruz = rehidratarRun(g.heroes.cruz);
  if (!cara || !cruz) throw new Error('El guardado tiene cartas o reliquias que esta versión no conoce');
  const p = base(g.semilla, g.clases, { cara, cruz }, g.punto);
  p.fase = g.fase;
  fijarRng(p);
  // same card ids as the game that never stopped (see establecerPunto)
  let n = 1;
  for (const h of HUECOS) for (const c of p.runs[h].mazo) c.uid = n++;
  p.uidSiguiente = n;
  return p;
}

// ── What each hole has to decide ────────────────────────────────────────────

/** What this hole must decide now, with its valid options; null when it has nothing to do
 *  (it already answered and waits for the partner, or the game is over). */
export function pendiente(p: PartidaMulti, h: Hueco): Pregunta | null {
  if (p.pausa) {
    const q = p.pausa;
    if (q.hueco !== h) return null;
    return {
      tipo: 'eleccion', clave: q.clave, contexto: 'enCarta', titulo: q.titulo,
      opciones: [...q.cartas.map((c) => c.uid), ...(q.cancelable ? [null] : [])],
    };
  }
  const f = p.fase;
  switch (f.tipo) {
    case 'bendicion':
      return f.hechos[h] ? null : { tipo: 'eleccion', clave: 'bendicion', contexto: 'bendicion', opciones: [...f.ofertas[h]] };
    case 'mapa':
      return f.votos[h] !== undefined ? null : { tipo: 'mapa', nodos: nodosDelMapa(p) };
    case 'fin':
      return null;
    case 'sala': {
      const s = f.sala;
      if (s.etapa === 'combate' || s.etapa === 'dm') {
        const duo = s.combate!;
        if (duo.terminado || !duo.puedeTerminarTurno(h)) return null;
        const vivos = duo.enemigos.map((e, i) => (e.vivo ? i : -1)).filter((i) => i >= 0);
        const jugables = duo.combates[h].jugador.mano
          .filter((c) => duo.puedeJugar(h, c))
          .map((c) => ({ carta: String(c.uid), objetivos: defDe(c).objetivo === 'enemigo' ? vivos : null }));
        return { tipo: 'combate', jugables, puedeFinTurno: true };
      }
      if (s.etapa === 'taberna') {
        if (s.taberna!.votos[h] !== undefined) return null;
        return { tipo: 'eleccion', clave: 'taberna-comun', contexto: 'tabernaComun', opciones: opcionesTaberna(p, s) };
      }
      if (s.etapa === 'reliquia') {
        const of = s.reliquias!;
        if (of.sinOpciones[h] || of.elecciones[h] !== undefined) return null;
        return { tipo: 'eleccion', clave: 'reliquia', contexto: 'reliquia', opciones: reliquiasValidas(p, s, h).map((r) => r.id) };
      }
      return s.heroes[h].abierta?.pregunta ?? null;
    }
  }
}

export function esValida(p: PartidaMulti, e: EntradaSellada): boolean {
  if (e.de !== 'cara' && e.de !== 'cruz') return false;
  const q = pendiente(p, e.de);
  if (!q) return false;
  switch (e.tipo) {
    case 'mapa':
      return q.tipo === 'mapa' && q.nodos.includes(e.nodo);
    case 'jugar': {
      if (q.tipo !== 'combate') return false;
      const j = q.jugables.find((x) => x.carta === e.carta);
      if (!j) return false;
      return j.objetivos === null ? e.objetivo === undefined : e.objetivo !== undefined && j.objetivos.includes(e.objetivo);
    }
    case 'finTurno':
      return q.tipo === 'combate';
    case 'eleccion':
      return q.tipo === 'eleccion' && q.clave === e.clave && q.opciones.some((o) => o === e.valor);
    default:
      return false;
  }
}

// ── Applying entries ─────────────────────────────────────────────────────────

/** Runs the entry's work until it finishes or stops on a card's question. */
async function supervisar(p: PartidaMulti) {
  const curso = p.curso!;
  while (!curso.fin && !p.pausa) await new Promise<void>((res) => { p.despertar = res; });
  p.despertar = null;
  if (curso.fin) {
    p.curso = null;
    if (curso.error) throw curso.error;
  }
}

function empezarCurso(p: PartidaMulti, trabajo: () => Promise<void>) {
  const curso: Curso = { fin: false, error: undefined };
  p.curso = curso;
  void (async () => {
    try {
      await trabajo();
    } catch (err) {
      curso.error = err;
    } finally {
      curso.fin = true;
      p.despertar?.();
    }
  })();
}

async function despachar(p: PartidaMulti, e: EntradaSellada) {
  const h = e.de;
  const f = p.fase;
  switch (f.tipo) {
    case 'bendicion':
      if (e.tipo === 'eleccion') await aplicarBendicionInicial(p, f, h, String(e.valor));
      break;
    case 'mapa':
      if (e.tipo === 'mapa') await votarMapa(p, f, h, e.nodo);
      break;
    case 'sala':
      await aplicarEnSala(p, f.sala, h, e);
      break;
    case 'fin':
      break;
  }
}

/** Applies one sealed entry. Deterministic: all the randomness of the game (card draws, enemy
 *  choices, the coin) happens in here, from the game's own rng. It is async because the
 *  presenters animate: wait for it before applying the next entry. A card that asks a question
 *  stops the entry; the answer (an `eleccion`) is the next one to apply. */
export async function aplicar(p: PartidaMulti, e: EntradaSellada, ui?: PresentadoresMulti): Promise<void> {
  if (!esValida(p, e)) throw new Error(`Entrada no válida para ${e.de}: ${JSON.stringify(e)}`);
  // card ids come from this game's own counter, whatever else the process has been doing
  const contadorAjeno = contadorUid();
  fijarContadorUid(p.uidSiguiente);
  p.pres = ui;
  p.limpio = false;
  try {
    if (p.pausa) {
      // the answer to a card's question: the suspended entry goes on
      const pausa = p.pausa;
      p.pausa = null;
      pausa.resolver(pausa.cartas.find((c) => e.tipo === 'eleccion' && c.uid === e.valor) ?? null);
    } else {
      empezarCurso(p, () => despachar(p, e));
    }
    await supervisar(p);
  } finally {
    // a checkpoint reached during the entry already renumbered the cards (and the counter)
    if (!p.limpio) p.uidSiguiente = contadorUid();
    fijarContadorUid(contadorAjeno);
    p.pres = undefined;
  }
}

// ── Hash and bot ─────────────────────────────────────────────────────────────

/** A stable string over the observable state (both heroes, enemies, phase, map position and
 *  the shared rng). Two machines that agree on it after every entry are in sync. */
export function hashPartida(p: PartidaMulti): string {
  return hashDe(p);
}

/** What the bot plays for a hole. In a fight: the first playable card from the left of the
 *  hand on the first valid target, until nothing is playable, then end the turn. Everywhere
 *  else: a random valid option (with the bot's own rng, never the game's). */
export function decisionBot(p: PartidaMulti, h: Hueco, rng: () => number): Entrada | null {
  const q = pendiente(p, h);
  if (!q) return null;
  switch (q.tipo) {
    case 'mapa':
      return { tipo: 'mapa', nodo: votoBot(p.runs[h], q.nodos, rng) };
    case 'combate': {
      const duo = p.fase.tipo === 'sala' ? p.fase.sala.combate : null;
      return duo ? jugadaBot(duo.combates[h], q.jugables) : { tipo: 'finTurno' };
    }
    case 'eleccion':
      return { tipo: 'eleccion', clave: q.clave, valor: q.opciones[Math.floor(rng() * q.opciones.length)] };
  }
}
