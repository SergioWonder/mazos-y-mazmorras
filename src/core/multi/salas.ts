import { aplicarBendicion, aplicarBendicionEntreActos, ofrecerBendicionEntreActos } from '../bendiciones.ts';
import { recompensaCartas } from '../cartas.ts';
import { ACTOS, DUNGEON_MASTER } from '../enemigos.ts';
import { desenlaceCampana } from '../escena-final.ts';
import { abrirEvento } from '../eventos.ts';
import {
  curarPorVendas, otorgarReliquia, reliquiaPorId, reliquiasDisponibles, sortearDePool,
} from '../reliquias.ts';
import {
  afilarCarta, anadirCarta, avanzarCapituloGrupo, cartaExtraEnSala, cartasMejorables, descansar, elegirElite,
  entrarEnSala as entrarEnSalaReliquias, maldicionesDe, pesoRaroEfectivo, purificar, sortearEscenario,
} from '../run.ts';
import { grupoNormal } from '../sala.ts';
import {
  aceptarRumor, cartasEliminables, completarMision, eliminarCarta, olvidoTaberna, revisarMision, rumoresTaberna,
} from '../taberna.ts';
import type { EnemigoDef, EstadoRun, OrigenReliquia, ReliquiaDef } from '../types.ts';
import type { ContextoEncuentro } from '../dificultad.ts';
import { aviso, establecerPunto, tirarMoneda } from './base.ts';
import { CombateDuo } from './combate-duo.ts';
import type { HeroeEnSala, Paso, PartidaMulti, PreguntaAbierta, Sala } from './estado.ts';
import { HUECOS, otroHueco, type Entrada, type Hueco } from './tipos.ts';
import { nodosDisponibles } from '../mapa.ts';

// The rooms of the map for two heroes. Per-player rules of the design:
// card rewards each on their own; relics: two offered, each picks one, a coin if it is the same;
// events and campfires per player; the tavern together (a vote, the coin if they differ, the same quest for both);
// the room ends when both have closed theirs.

const heroeVacio = (): HeroeEnSala => ({ cola: [], abierta: null, listo: false });

/** What each hero does after the room's own business: the tavern quest pays, a relic may add a card. */
const COLA_FINAL: Paso[] = [{ k: 'mision' }, { k: 'cartaExtra' }];

export const salaActual = (p: PartidaMulti): Sala | null => (p.fase.tipo === 'sala' ? p.fase.sala : null);

// ── Entering a room ──────────────────────────────────────────────────────────

/** The party walks to the node both agreed on (or the coin chose): the room begins. */
export async function entrarEnSala(p: PartidaMulti, nodoId: number) {
  const mapa = p.runs.cara.mapa;
  const nodo = mapa.find((n) => n.id === nodoId)!;
  nodo.visitado = true;
  for (const h of HUECOS) {
    const run = p.runs[h];
    run.nodoActual = nodo.id;
    run.piso++;
    // A tavern quest whose node is now out of reach is quietly lost
    if (revisarMision(run)) await aviso(p, h, '📜 Has dejado atrás el lugar del rumor: misión perdida');
    // Relics that react to the room you step into (Adventurer's Journal…)
    for (const nota of entrarEnSalaReliquias(run, nodo.tipo, p.rng)) await aviso(p, h, nota);
  }
  const sala: Sala = {
    nodo, etapa: 'heroes', combate: null, ultimoJefe: false, reliquias: null, taberna: null, pasosTras: [],
    heroes: { cara: heroeVacio(), cruz: heroeVacio() }, evento: null, siguiente: null,
  };
  p.fase = { tipo: 'sala', sala };
  const cara = p.runs.cara;
  const cap = ACTOS[cara.capitulo][cara.escenario];
  switch (nodo.tipo) {
    case 'combate': {
      const { grupo, orden } = grupoNormal(cara, p.rng);
      sala.pasosTras = [{ k: 'carta', peso: 4 }, ...COLA_FINAL];
      await empezarCombate(p, sala, grupo, false, { tipo: 'normal', orden });
      break;
    }
    case 'elite': {
      const grupo = elegirElite(cara, p.rng); // none repeats until the others have come out
      p.runs.cruz.elitesVistos = [...(cara.elitesVistos ?? [])];
      sala.pasosTras = [{ k: 'carta', peso: 25 }, ...COLA_FINAL]; // elite: far more likely to be rare
      await empezarCombate(p, sala, grupo, true, { tipo: 'elite' });
      break;
    }
    case 'jefe': {
      sala.ultimoJefe = cara.capitulo + 1 >= ACTOS.length;
      sala.pasosTras = [{ k: 'carta', peso: 100 }, { k: 'bendicionEntreActos' }]; // a rare is guaranteed
      await empezarCombate(p, sala, cap.jefe, true, { tipo: 'jefe' });
      break;
    }
    case 'cofre':
      sala.pasosTras = [...COLA_FINAL];
      await abrirReliquias(p, sala, 'cofre');
      break;
    case 'descanso':
      armarColas(sala, [{ k: 'descanso' }, ...COLA_FINAL]);
      await avanzarTodos(p, sala);
      break;
    case 'evento':
      sala.evento = abrirEvento([p.runs.cara, p.runs.cruz], p.rng);
      armarColas(sala, [{ k: 'evento' }, ...COLA_FINAL]);
      await avanzarTodos(p, sala);
      break;
    case 'taberna':
      await abrirTaberna(p, sala);
      break;
  }
}

function armarColas(sala: Sala, pasos: Paso[]) {
  sala.etapa = 'heroes';
  for (const h of HUECOS) sala.heroes[h] = { cola: pasos.map((x) => ({ ...x })), abierta: null, listo: false };
}

async function avanzarTodos(p: PartidaMulti, sala: Sala) {
  for (const h of HUECOS) await avanzar(p, sala, h);
  await comprobarCierre(p, sala);
}

// ── Fights ───────────────────────────────────────────────────────────────────

async function empezarCombate(
  p: PartidaMulti, sala: Sala, defs: EnemigoDef[], eliteOJefe: boolean, contexto: ContextoEncuentro,
) {
  sala.etapa = 'combate';
  sala.combate = new CombateDuo(p.runs, defs, p.rng, { cara: p.heroeUi.cara, cruz: p.heroeUi.cruz }, eliteOJefe, contexto);
  await sala.combate.iniciar();
  if (sala.combate.terminado) await finDeCombate(p, sala);
}

/** A card, the end of a turn or a hero's answer was applied inside a fight: did it end? */
export async function tras(p: PartidaMulti, sala: Sala) {
  if (sala.combate?.terminado) await finDeCombate(p, sala);
}

async function finDeCombate(p: PartidaMulti, sala: Sala) {
  const duo = sala.combate!;
  duo.cerrar(); // HP back to the runs, relics that heal after a win
  if (sala.etapa === 'dm') {
    // The Dungeon Master has the last word: only seducing him (either hero) is the true ending
    const d = desenlaceCampana(true, duo.combates.cara.finalVerdadero ? 'victoria' : 'derrota');
    terminar(p, d.victoria, d.finalVerdadero, d.epilogoDM);
    return;
  }
  if (duo.terminado === 'derrota') {
    terminar(p, false, false, false);
    return;
  }
  sala.combate = null;
  const tipo = sala.nodo.tipo;
  if (tipo === 'jefe' && sala.ultimoJefe) {
    // The campaign is won: the Dungeon Master's scene follows, with no rewards
    sala.etapa = 'dm';
    sala.combate = new CombateDuo(
      p.runs, [DUNGEON_MASTER], p.rng, { cara: p.heroeUi.cara, cruz: p.heroeUi.cruz }, true, { tipo: 'jefe' },
    );
    await sala.combate.iniciar();
    if (sala.combate.terminado) await finDeCombate(p, sala);
    return;
  }
  if (tipo === 'jefe') sala.siguiente = sortearEscenario(p.rng); // drawn first so Síbila can foretell it
  if (tipo === 'elite' || tipo === 'jefe') {
    await abrirReliquias(p, sala, tipo === 'elite' ? 'elite' : 'jefe');
  } else {
    armarColas(sala, sala.pasosTras);
    await avanzarTodos(p, sala);
  }
}

function terminar(p: PartidaMulti, victoria: boolean, finalVerdadero: boolean, epilogoDM: boolean) {
  p.fase = { tipo: 'fin', victoria, finalVerdadero, epilogoDM };
  establecerPunto(p);
}

// ── Relics: two offered, each picks one ─────────────────────────────────────

const puedeTomar = (run: EstadoRun, r: ReliquiaDef) => reliquiasDisponibles(run).some((x) => x.id === r.id);

export function reliquiasValidas(p: PartidaMulti, sala: Sala, h: Hueco): ReliquiaDef[] {
  return sala.reliquias!.ofertas[h].filter((r) => puedeTomar(p.runs[h], r));
}

/** What each hero sees of the relics drawn for the room: the same, except that a slot holding
 *  a relic that does not fit him (one of the other hero's class) shows a relic of his own class
 *  instead, drawn with the shared rng among the ones he does not have yet. Only when he has no
 *  class relic left does it show any other relic he can take; a slot nothing fills is dropped. */
export function ofertasPorHeroe(
  p: PartidaMulti, base: ReliquiaDef[], origen: OrigenReliquia,
): Record<Hueco, ReliquiaDef[]> {
  const out: Record<Hueco, ReliquiaDef[]> = { cara: [], cruz: [] };
  for (const h of HUECOS) {
    const run = p.runs[h];
    const vistas = new Set(base.map((r) => r.id)); // never show him the same relic twice
    for (const r of base) {
      if (puedeTomar(run, r)) { out[h].push(r); continue; }
      const libres = reliquiasDisponibles(run).filter((x) => !vistas.has(x.id));
      const propias = libres.filter((x) => x.soloClase === run.clase);
      const pool = propias.length > 0 ? propias : libres;
      if (pool.length === 0) continue;
      const sustituta = sortearDePool(pool, p.rng, origen) ?? pool[Math.floor(p.rng() * pool.length)];
      vistas.add(sustituta.id);
      out[h].push(sustituta);
    }
  }
  return out;
}

async function abrirReliquias(p: PartidaMulti, sala: Sala, origen: OrigenReliquia) {
  // the draw is what either hero could still receive; each hero then sees his own version of it
  const vistas = new Set<string>();
  const pool = HUECOS.flatMap((h) => reliquiasDisponibles(p.runs[h])).filter((r) => !vistas.has(r.id) && vistas.add(r.id));
  const primera = sortearDePool(pool, p.rng, origen);
  const segunda = primera ? sortearDePool(pool.filter((r) => r.id !== primera.id), p.rng, origen) : undefined;
  const sorteadas = [primera, segunda].filter((r): r is ReliquiaDef => !!r);
  if (sorteadas.length === 0) {
    // like a solo chest with nothing left: bandages
    for (const h of HUECOS) {
      curarPorVendas(p.runs[h]);
      await aviso(p, h, 'El cofre contiene vendas: +10 PV');
    }
    armarColas(sala, sala.pasosTras);
    await avanzarTodos(p, sala);
    return;
  }
  sala.etapa = 'reliquia';
  sala.reliquias = { origen, ofertas: ofertasPorHeroe(p, sorteadas, origen), elecciones: {}, sinOpciones: {} };
  for (const h of HUECOS) if (reliquiasValidas(p, sala, h).length === 0) sala.reliquias.sinOpciones[h] = true;
  await comprobarReliquias(p, sala);
}

async function comprobarReliquias(p: PartidaMulti, sala: Sala) {
  const of = sala.reliquias!;
  if (!HUECOS.every((h) => of.sinOpciones[h] || of.elecciones[h] !== undefined)) return;
  const eleccion = (h: Hueco) => of.elecciones[h];
  const def = (h: Hueco, id: string) => of.ofertas[h].find((r) => r.id === id)!;
  const reparto: Record<Hueco, ReliquiaDef | null> = { cara: null, cruz: null };
  if (eleccion('cara') !== undefined && eleccion('cara') === eleccion('cruz')) {
    // the same relic: the coin decides who keeps it, the other takes the other slot as he sees it (if it fits)
    const ganador = await tirarMoneda(p, 'reliquia');
    const perdedor = otroHueco(ganador);
    reparto[ganador] = def(ganador, eleccion(ganador)!);
    reparto[perdedor] = of.ofertas[perdedor].find((r) => r.id !== eleccion(ganador) && puedeTomar(p.runs[perdedor], r)) ?? null;
  } else {
    for (const h of HUECOS) reparto[h] = eleccion(h) !== undefined ? def(h, eleccion(h)!) : null;
  }
  for (const h of HUECOS) {
    const r = reparto[h];
    if (r) {
      otorgarReliquia(p.runs[h], r, p.rng);
      await aviso(p, h, `🧰 ${r.nombre}`);
    } else {
      curarPorVendas(p.runs[h]);
      await aviso(p, h, 'Las vendas del cofre: +10 PV');
    }
  }
  sala.reliquias = null;
  armarColas(sala, sala.pasosTras);
  await avanzarTodos(p, sala);
}

// ── The tavern: decided together ───────────────────────────────────────────

/** What both heroes vote on in the tavern: its rumours (`rumor:<node>`) and, if anyone has a card to lose, forgetting. */
export function opcionesTaberna(p: PartidaMulti, sala: Sala): string[] {
  const t = sala.taberna!;
  const olvidar = HUECOS.some((h) => cartasEliminables(p.runs[h]).length > 0);
  return [...t.rumores.map((r) => `rumor:${r.nodo}`), ...(olvidar ? ['olvido'] : [])];
}

async function abrirTaberna(p: PartidaMulti, sala: Sala) {
  // the map is shared, so the rumours are drawn once for both
  sala.taberna = { rumores: rumoresTaberna(p.runs.cara, sala.nodo, p.rng), olvido: olvidoTaberna(p.rng), votos: {} };
  if (opcionesTaberna(p, sala).length === 0) {
    sala.taberna = null;
    armarColas(sala, [...COLA_FINAL]);
    await avanzarTodos(p, sala);
    return;
  }
  sala.etapa = 'taberna';
}

async function votarTaberna(p: PartidaMulti, sala: Sala, h: Hueco, valor: string) {
  const t = sala.taberna!;
  t.votos[h] = valor;
  const { cara, cruz } = t.votos;
  if (cara === undefined || cruz === undefined) {
    p.pres?.esperandoAlCompanero?.(h);
    return;
  }
  const elegido = cara === cruz ? cara : (await tirarMoneda(p, 'taberna')) === 'cara' ? cara : cruz;
  sala.taberna = null;
  if (elegido.startsWith('rumor:')) {
    const rumor = t.rumores.find((r) => `rumor:${r.nodo}` === elegido)!;
    for (const x of HUECOS) {
      aceptarRumor(p.runs[x], rumor); // the same quest for both
      await aviso(p, x, '📜 Misión marcada en el mapa');
    }
    armarColas(sala, [...COLA_FINAL]);
  } else {
    armarColas(sala, [{ k: 'olvido', olvido: t.olvido }, ...COLA_FINAL]);
  }
  await avanzarTodos(p, sala);
}

// ── What each hero does on his own ──────────────────────────────────────────

/** Runs the hero's steps until one needs his answer (or he has none left). */
async function avanzar(p: PartidaMulti, sala: Sala, h: Hueco) {
  const he = sala.heroes[h];
  const run = p.runs[h];
  while (!he.abierta && he.cola.length > 0) {
    const paso = he.cola.shift()!;
    switch (paso.k) {
      case 'mision': {
        // Tavern quest completed: a relic on top of the room's normal reward
        const reliquia = completarMision(run, sala.nodo, p.rng);
        if (reliquia) await aviso(p, h, `📜 ¡El rumor era cierto! ${reliquia.nombre}`);
        break;
      }
      case 'cartaExtra':
        // Relics that add a card reward to some rooms (Treasure Map on chests)
        if (cartaExtraEnSala(run, sala.nodo.tipo)) he.cola.unshift({ k: 'carta', peso: 4 });
        break;
      case 'carta': {
        const defs = recompensaCartas(run.clase, p.rng, pesoRaroEfectivo(run, paso.peso));
        if (defs.length === 0) break;
        he.abierta = abierta('carta', 'carta', [...defs.map((d) => d.id), null], { k: 'carta', defs });
        break;
      }
      case 'descanso': {
        const opciones = [
          'descansar',
          ...cartasMejorables(run).map((c) => `afilar:${c.uid}`),
          ...maldicionesDe(run).map((c) => `purificar:${c.uid}`),
        ];
        he.abierta = abierta('descanso', 'descanso', opciones, { k: 'descanso' });
        break;
      }
      case 'evento':
        he.abierta = abierta('evento', 'evento', sala.evento!.opciones.map((_, i) => i), { k: 'evento' });
        break;
      case 'olvido': {
        // the tavern chose to forget: each hero picks a card of his own deck (nothing to pick, nothing to do)
        const cartas = cartasEliminables(run);
        if (cartas.length === 0) break;
        he.abierta = abierta('taberna', 'taberna', cartas.map((c) => `olvido:${c.uid}`), { k: 'taberna', rumores: [], olvido: paso.olvido });
        break;
      }
      case 'bendicionEntreActos': {
        const ofertas = ofrecerBendicionEntreActos(run, p.rng);
        if (ofertas.length === 0) break;
        he.abierta = abierta('bendicion', 'bendicion', ofertas.map((o) => o.reliquia.id), { k: 'bendicion', ofertas });
        break;
      }
    }
  }
  if (!he.abierta && !he.listo) {
    he.listo = true;
    if (!sala.heroes[otroHueco(h)].listo) p.pres?.esperandoAlCompanero?.(h);
  }
}

function abierta(
  clave: string, contexto: string, opciones: Array<number | string | null>, datos: PreguntaAbierta['datos'],
): PreguntaAbierta {
  return { pregunta: { tipo: 'eleccion', clave, contexto, opciones }, datos };
}

/** The hero answers the question he had open. */
async function responder(p: PartidaMulti, sala: Sala, h: Hueco, valor: number | string | null) {
  const he = sala.heroes[h];
  const run = p.runs[h];
  const q = he.abierta!;
  he.abierta = null;
  const d = q.datos;
  switch (d.k) {
    case 'carta': {
      const def = d.defs.find((x) => x.id === valor);
      if (def) {
        const inst = anadirCarta(run, def);
        await aviso(p, h, `+ ${def.nombre}${inst.mejorada ? '+' : ''}`);
      }
      break;
    }
    case 'descanso': {
      const [accion, uid] = String(valor).split(':');
      if (accion === 'descansar') {
        const antes = run.pvMax;
        const curado = descansar(run);
        await aviso(p, h, run.pvMax > antes ? `+${run.pvMax - antes} PV máximos` : `+${curado} PV`);
      } else if (accion === 'afilar') {
        const carta = run.mazo.find((c) => String(c.uid) === uid)!;
        const extra = afilarCarta(run, carta, p.rng);
        await aviso(p, h, `⚒️ ${[`${carta.def.nombre}+`, ...extra].join(' · ')}`);
      } else {
        const carta = run.mazo.find((c) => String(c.uid) === uid)!;
        purificar(run, carta);
        await aviso(p, h, `🕯️ «${carta.def.nombre}» arde en la hoguera`);
      }
      break;
    }
    case 'evento': {
      const texto = sala.evento!.opciones[valor as number].aplicar(run, p.rng);
      await aviso(p, h, texto);
      break;
    }
    case 'taberna': {
      const [accion, id] = String(valor).split(':');
      if (accion === 'rumor') {
        aceptarRumor(run, d.rumores.find((r) => String(r.nodo) === id)!);
        await aviso(p, h, '📜 Misión marcada en el mapa');
      } else {
        const carta = run.mazo.find((c) => String(c.uid) === id)!;
        const nombre = carta.def.nombre;
        eliminarCarta(run, carta);
        await aviso(p, h, d.olvido.anuncio.replace('{carta}', nombre));
      }
      break;
    }
    case 'bendicion': {
      const oferta = d.ofertas.find((o) => o.reliquia.id === valor)!;
      aplicarBendicionEntreActos(run, oferta, p.rng); // the relic plus a full heal
      await aviso(p, h, `✨ ${oferta.reliquia.nombre}`);
      break;
    }
  }
  await avanzar(p, sala, h);
  await comprobarCierre(p, sala);
}

/** The room ends when both heroes have closed theirs: back to the map (a checkpoint). */
async function comprobarCierre(p: PartidaMulti, sala: Sala) {
  if (sala.etapa !== 'heroes' || !HUECOS.every((h) => sala.heroes[h].listo)) return;
  if (sala.nodo.tipo === 'jefe') {
    avanzarCapituloGrupo([p.runs.cara, p.runs.cruz], p.rng, sala.siguiente ?? sortearEscenario(p.rng));
  }
  p.fase = { tipo: 'mapa', votos: {} };
  establecerPunto(p);
}

// ── Entries inside a room ────────────────────────────────────────────────────

/** Applies an entry that came while a room is on. `esValida` already checked it. */
export async function aplicarEnSala(p: PartidaMulti, sala: Sala, h: Hueco, e: Entrada) {
  if (sala.etapa === 'combate' || sala.etapa === 'dm') {
    const duo = sala.combate!;
    if (e.tipo === 'jugar') {
      const carta = duo.combates[h].jugador.mano.find((c) => String(c.uid) === e.carta)!;
      const objetivo = e.objetivo === undefined ? undefined : duo.enemigos[e.objetivo];
      await duo.jugar(h, carta, objetivo);
    } else if (e.tipo === 'finTurno') {
      await duo.terminarTurno(h);
    }
    await tras(p, sala);
    return;
  }
  if (e.tipo !== 'eleccion') return;
  if (sala.etapa === 'taberna') return votarTaberna(p, sala, h, String(e.valor));
  if (sala.etapa === 'reliquia') {
    sala.reliquias!.elecciones[h] = String(e.valor);
    if (!sala.reliquias!.sinOpciones[otroHueco(h)] && sala.reliquias!.elecciones[otroHueco(h)] === undefined) {
      p.pres?.esperandoAlCompanero?.(h);
    }
    await comprobarReliquias(p, sala);
    return;
  }
  await responder(p, sala, h, e.valor);
}

/** Blessing at the start of the run: each hero picks one of his offers (ids). */
export async function aplicarBendicionInicial(
  p: PartidaMulti, fase: Extract<PartidaMulti['fase'], { tipo: 'bendicion' }>, h: Hueco, id: string,
) {
  const reliquia = reliquiaPorId(id)!;
  aplicarBendicion(p.runs[h], { tipo: 'reliquia', reliquia }, p.rng);
  fase.hechos[h] = true;
  await aviso(p, h, `✨ ${reliquia.nombre}`);
  if (HUECOS.every((x) => fase.hechos[x])) {
    p.fase = { tipo: 'mapa', votos: {} };
    establecerPunto(p);
  } else {
    p.pres?.esperandoAlCompanero?.(h);
  }
}

/** Both heroes vote for the next node; if they disagree, the coin picks one of the votes. */
export async function votarMapa(p: PartidaMulti, fase: Extract<PartidaMulti['fase'], { tipo: 'mapa' }>, h: Hueco, nodo: number) {
  fase.votos[h] = nodo;
  await p.pres?.votoMapa?.(h, nodo);
  const { cara, cruz } = fase.votos;
  if (cara === undefined || cruz === undefined) {
    p.pres?.esperandoAlCompanero?.(h);
    return;
  }
  const elegido = cara === cruz ? cara : (await tirarMoneda(p, 'mapa')) === 'cara' ? cara : cruz;
  await entrarEnSala(p, elegido);
}

export const nodosDelMapa = (p: PartidaMulti): number[] =>
  nodosDisponibles(p.runs.cara.mapa, p.runs.cara.nodoActual).map((n) => n.id);
