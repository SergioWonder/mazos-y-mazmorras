// The server bot of two-player games. In combat it plays one card at a time by a few rules of thumb: block what is
// coming first, then the card worth the most per energy (more damage or more block), counting Weak and Vulnerable,
// playing Strength/Dexterity first when they pay off (they count double: they last), drawing when the rest of the
// hand is plain strikes and defends; the wizard always gains spell slots and the warlock always casts Eldritch Blast.
// On the map it heads for its tavern quest. It only reads the game: every what-if it tries is undone right away.

import { defDe } from '../cartas.ts';
import type { Combate } from '../combate.ts';
import { esAlcanzable } from '../mapa.ts';
import type { CartaDef, CartaInstancia, EnemigoCombate, EstadoId, EstadoRun } from '../types.ts';
import type { Entrada } from './tipos.ts';

/** Block that stops the coming hit goes before damage (until it matches the attacks); past that, almost nothing. */
const PESO_BLOQUEO_NECESARIO = 3;
const PESO_BLOQUEO_SOBRANTE = 0.2;
/** Strength and Dexterity also stay for the next turns: the bot counts what they add double. */
const PESO_MEJORA = 2;
/** Killing an enemy is worth a little extra on top of the damage (it stops its hit too). */
const BONO_REMATE = 3;
/** A draw card when the rest of the hand is plain strikes and defends goes first. */
const VALOR_ROBO_URGENTE = 30;
const VALOR_POR_CARTA_ROBADA = 2;
/** Cards a class always plays first (the wizard's spell slots, the warlock's Eldritch Blast). */
const PRIORIDAD_MAXIMA = 1000;
/** Cards whose effect the bot cannot measure: still better than wasting the energy. */
const VALOR_DESCONOCIDO = 1;
const BASICAS = new Set(['golpe', 'defender']);

const numero = (re: RegExp, texto: string) => {
  const m = re.exec(texto);
  return m ? Number(m[1]) : 0;
};
const fuerzaDe = (t: string) => numero(/(?:\+|gana )(\d+) de Fuerza/i, t);
const destrezaDe = (t: string) => numero(/(?:\+|gana )(\d+) de Destreza/i, t);
const roboDe = (t: string) => numero(/Roba (\d+) cartas?/i, t);
const generaConjuro = (t: string) => /Gana \d+ espacios? de conjuro/i.test(t);
const esArea = (t: string) => /TODOS los enemigos/i.test(t);

type Estados = Partial<Record<EstadoId, number>>;

/** Runs `fn` with some statuses changed, and puts them back exactly as they were. */
function probando<T>(cambios: Array<[Estados, EstadoId, number]>, fn: () => T): T {
  const previos = cambios.map(([est, id]) => [est, id, est[id]] as const);
  for (const [est, id, delta] of cambios) est[id] = (est[id] ?? 0) + delta;
  try {
    return fn();
  } finally {
    for (const [est, id, previo] of previos.reverse()) {
      if (previo === undefined) delete est[id];
      else est[id] = previo;
    }
  }
}

interface Medida { dano: number; bloqueo: number; debil: number; vulnerable: number }

/** Damage, block and debuffs a card would deal now (Strength, Weak, the target's Vulnerable… included). */
function medir(c: Combate, def: CartaDef, objetivo?: EnemigoCombate): Medida {
  const m: Medida = { dano: 0, bloqueo: 0, debil: 0, vulnerable: 0 };
  const area = esArea(def.texto) ? Math.max(1, c.enemigos.filter((e) => e.vivo).length) : 1;
  for (const v of c.valoresDeCarta(def, objetivo)) {
    if (v.aplica === false) continue;
    const n = v.real * (v.veces ?? 1);
    if (v.tipo === 'ataque' || v.tipo === 'directo') m.dano += n * area;
    else if (v.tipo === 'bloqueo') m.bloqueo += n;
    else if (v.tipo === 'estado' && v.estado === 'debil') m.debil += n;
    else if (v.tipo === 'estado' && v.estado === 'vulnerable') m.vulnerable += n;
  }
  if (!m.debil) m.debil = numero(/(\d+) (?:de )?Débil/i, def.texto);
  if (!m.vulnerable) m.vulnerable = numero(/(\d+) (?:de )?Vulnerable/i, def.texto);
  return m;
}

/** Damage that will reach the hero's HP this round (after his block, Mirror Image and summon). */
const entrante = (c: Combate) => [...c.previsionAtaques().values()].reduce((s, p) => s + p.pv, 0);

/** Damage and block the rest of the hand can still add this turn with the energy left (best cards first). */
function resto(c: Combate, mano: CartaInstancia[], sin: CartaInstancia, energia: number, objetivo?: EnemigoCombate) {
  const medidas = mano
    .filter((x) => x !== sin)
    .map((x) => ({ coste: c.costeEfectivo(defDe(x)), m: medir(c, defDe(x), objetivo) }))
    .filter((x) => x.coste <= energia && x.m.dano + x.m.bloqueo > 0)
    .sort((a, b) => (b.m.dano + b.m.bloqueo) / Math.max(b.coste, 0.5) - (a.m.dano + a.m.bloqueo) / Math.max(a.coste, 0.5));
  let queda = energia, dano = 0, bloqueo = 0;
  for (const x of medidas) {
    if (x.coste > queda) continue;
    queda -= x.coste;
    dano += x.m.dano;
    bloqueo += x.m.bloqueo;
  }
  return { dano, bloqueo };
}

/** How good playing `inst` on `objetivo` is right now (before dividing by its cost). */
function valorar(c: Combate, inst: CartaInstancia, objetivo: EnemigoCombate | undefined, energiaTras: number): number {
  const def = defDe(inst);
  const clase = c.run.clase;
  if (clase === 'brujo' && def.id === 'explosion-sobrenatural') return PRIORIDAD_MAXIMA;
  if (clase === 'mago' && generaConjuro(def.texto)) return PRIORIDAD_MAXIMA;

  const mano = c.jugador.mano;
  const necesario = entrante(c);
  const vivos = c.enemigos.filter((e) => e.vivo);
  const blanco = objetivo ?? vivos[0];
  const m = medir(c, def, objetivo);
  let valor = 0;

  // damage, up to what the target can take; killing it also stops its hit
  if (m.dano > 0) {
    if (objetivo) {
      const aguante = objetivo.pv + objetivo.bloqueo;
      valor += Math.min(m.dano, aguante);
      if (m.dano >= aguante) valor += BONO_REMATE + (c.previsionAtaques().get(objetivo)?.pv ?? 0) * PESO_BLOQUEO_NECESARIO;
    } else valor += m.dano;
  }
  // block: what covers the coming hit is worth more
  valor += Math.min(m.bloqueo, necesario) * PESO_BLOQUEO_NECESARIO + Math.max(0, m.bloqueo - necesario) * PESO_BLOQUEO_SOBRANTE;
  // Weak: less of the coming hit reaches the hero
  if (m.debil > 0 && necesario > 0) {
    const debilitados = objetivo && !esArea(def.texto) ? [objetivo] : vivos;
    const tras = probando(debilitados.map((e) => [e.estados, 'debil', m.debil] as [Estados, EstadoId, number]), () => entrante(c));
    valor += Math.max(0, necesario - tras) * PESO_BLOQUEO_NECESARIO;
  }
  // Vulnerable: the rest of the hand hits harder this turn
  if (m.vulnerable > 0 && blanco) {
    const antes = resto(c, mano, inst, energiaTras, blanco).dano;
    const tras = probando([[blanco.estados, 'vulnerable', m.vulnerable]], () => resto(c, mano, inst, energiaTras, blanco).dano);
    valor += Math.max(0, tras - antes);
  }
  // Strength / Dexterity: double what they add to the rest of the hand this turn (they last)
  const fuerza = fuerzaDe(def.texto), destreza = destrezaDe(def.texto);
  if (fuerza > 0 || destreza > 0) {
    const antes = resto(c, mano, inst, energiaTras, blanco);
    const tras = probando(
      [[c.jugador.estados, 'fuerza', fuerza], [c.jugador.estados, 'destreza', destreza]],
      () => resto(c, mano, inst, energiaTras, blanco),
    );
    const util = (b: number) => Math.min(b, necesario);
    valor += PESO_MEJORA * (Math.max(0, tras.dano - antes.dano) + Math.max(0, util(tras.bloqueo) - util(antes.bloqueo)));
  }
  // draw: first when the rest of the hand is plain strikes and defends
  const robo = roboDe(def.texto);
  if (robo > 0) {
    const otras = mano.filter((x) => x !== inst);
    valor += otras.every((x) => BASICAS.has(defDe(x).id)) ? VALOR_ROBO_URGENTE : robo * VALOR_POR_CARTA_ROBADA;
  }
  return valor > 0 ? valor : def.tipo === 'maldicion' ? VALOR_DESCONOCIDO / 2 : VALOR_DESCONOCIDO;
}

/** The bot's next move in a fight: the best card (and target) per energy, or the end of its turn. */
export function jugadaBot(c: Combate, jugables: Array<{ carta: string; objetivos: number[] | null }>): Entrada {
  let mejor: { carta: string; objetivo?: number; puntos: number } | null = null;
  for (const j of jugables) {
    const inst = c.jugador.mano.find((x) => String(x.uid) === j.carta);
    if (!inst) continue;
    const coste = c.costeEfectivo(defDe(inst));
    for (const o of j.objetivos ?? [undefined]) {
      const valor = valorar(c, inst, o === undefined ? undefined : c.enemigos[o], c.jugador.energia - coste);
      const puntos = valor >= PRIORIDAD_MAXIMA ? valor : valor / Math.max(coste, 0.5);
      if (!mejor || puntos > mejor.puntos) mejor = { carta: j.carta, objetivo: o, puntos };
    }
  }
  if (!mejor) return { tipo: 'finTurno' };
  return mejor.objetivo === undefined ? { tipo: 'jugar', carta: mejor.carta } : { tipo: 'jugar', carta: mejor.carta, objetivo: mejor.objetivo };
}

/** The bot's vote on the map: towards its tavern quest while it has one, anywhere otherwise. */
export function votoBot(run: EstadoRun, nodos: number[], rng: () => number): number {
  const mision = run.mision;
  const hacia = mision ? nodos.filter((n) => n === mision.nodo || esAlcanzable(run.mapa, n, mision.nodo)) : [];
  const opciones = hacia.length > 0 ? hacia : nodos;
  return opciones[Math.floor(rng() * opciones.length)];
}
