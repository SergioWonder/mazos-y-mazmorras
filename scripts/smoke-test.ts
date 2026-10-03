// Prueba de humo del motor: simula combates completos sin navegador.
// Ejecutar con: node --experimental-strip-types scripts/smoke-test.ts

import { Combate, type Presentador } from '../src/core/combate.ts';
import { nuevaRun, avanzarCapitulo } from '../src/core/run.ts';
import { crearRng } from '../src/core/rng.ts';
import {
  ACTOS, GOBLIN_CORTADOR, GOBLIN_ARQUERO, GOBLIN_FAMELICO, JEFE_OGRO, SENOR_CRIPTA, IGNIFAX,
  HERALDO_CULTO, CONTEMPLADOR,
} from '../src/core/enemigos.ts';
import { serializarRun, rehidratarRun } from '../src/core/guardado.ts';
import { generarMapa, nodosDisponibles } from '../src/core/mapa.ts';
import {
  recompensaCartas, DRUIDA, BARBARO, MAGO, PICARO, BRUJO, PALADIN, BASICAS, NEUTRALES_ESPECIALES, instanciar, mazoInicial, defDe,
  poolDeClase, cartaUnicaDeClase, CONJURO_PRODIGIOSO, DAGA, MALDICIONES, GOLPE_SAGRADO, DEFENSA_SAGRADA,
} from '../src/core/cartas.ts';
import { piramideConjuros } from '../src/core/conjuros.ts';
import { EVENTOS_POSITIVOS, EVENTOS_NEGATIVOS, elegirEvento } from '../src/core/eventos.ts';
import { ARTE_CARTA } from '../src/ui/carta.ts';
import * as ENEMIGOS from '../src/core/enemigos.ts';
import { ENEMY_RIGS, INVOCATION_RIGS } from '../src/fx/enemy-rigs.ts';
import { galleryCatalogue } from '../src/ui/gallery-catalogue.ts';
import { pickSvg } from '../src/ui/card-svgs.ts';
import { packRig, spriteMatrix, MAX_POLY, PIECE_TEXELS } from '../src/fx/puppet-gpu.ts';
import { majorOf, isMajorUpgrade, majorChangelog, shouldNotifyMajor, noticesOn } from '../src/core/versions.ts';
import { hasFullArt } from '../src/ui/card-looks.ts';
import { spawnEffect, stepParticles, EFFECTS, type Particle } from '../src/fx/particle-sim.ts';
import { sceneBackground } from '../src/fx/background.ts';
import { MUSIC_TRACKS, loopWindow, MP3_DELAY_SAMPLES } from '../src/fx/music-tracks.ts';
import { puppetPose, puppetBones, puppetEffects, emitterWorld, boneParent } from '../src/fx/puppet.ts';
import { WING_BONES, wingSpan } from '../src/fx/wing.ts';
import { HERO_RIGS, FORM_RIGS, formFromLabel, currentForm, heroPose, heroBones, heroEffects, activeAction, ACTION_DURATION } from '../src/fx/hero-rig.ts';
import type { CartaDef, CartaInstancia, ClaseId, EnemigoCombate, EnemigoDef, Movimiento } from '../src/core/types.ts';

const CLASES = ['druida', 'barbaro', 'mago', 'picaro', 'brujo', 'paladin'] as ClaseId[];

let fallos = 0;
function check(cond: boolean, msg: string) {
  if (!cond) {
    fallos++;
    console.error(`  ✗ ${msg}`);
  } else {
    console.log(`  ✓ ${msg}`);
  }
}

const uiSilenciosa: Presentador = {
  render: () => {},
  espera: async () => {},
  fxGolpe: async () => {},
  fxBloqueo: async () => {},
  fxEstado: async () => {},
  fxCura: async () => {},
  fxMuerte: async () => {},
  fxMensaje: async () => {},
  fxEnemigoActua: async () => {},
  fxFuriaPerdida: async () => {},
  fxDado: async () => {},
  fxDadoVentaja: async () => {},
  fxParticulas: async () => {},
  fxInvocacionGolpe: async () => {},
  fxInvocacionMuerte: async () => {},
  fxInvocacionAtaca: async () => {},
  fxInvocacionCura: async () => {},
  elegirCarta: async (cartas) => cartas[0] ?? null,
};

// ── Piloto heurístico ────────────────────────────────────────────────────────
// La IA de la simulación no busca jugar perfecto: busca jugar *plausible*, para
// que las tasas de victoria signifiquen algo. Puntúa cada carta de la mano según
// el estado del combate y juega de mayor a menor puntuación mientras le quede
// energía, reevaluando tras cada carta (el estado cambia).

const sinTildes = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Daño que el jugador va a comer este turno si no hace nada. */
function danoEntrante(comb: Combate): number {
  return comb.enemigos
    .filter((e) => e.vivo)
    .reduce((s, e) => s + comb.danoIntencion(e) * (e.intencion.veces ?? 1), 0);
}

/** Palabras que delatan una carta de mitigación: bloqueo propio o menos ataque
 *  enemigo. Vulnerable NO cuenta: sube el daño que recibe el enemigo, no baja
 *  el que te hace a ti. */
const MITIGA = ['bloqueo', 'raices', 'debil', 'oscuridad'];

/** Una carta que deja Fuerza o Destreza durante varios turnos (Transformación
 *  del druida, Furia del bárbaro) es una inversión que multiplica todo lo que
 *  juegues después: como un poder, cuanto antes se ponga, mejor. */
function esEscalado(t: string): boolean {
  if (t.includes('transformacion')) return true;
  if (t.startsWith('furia:')) return true;
  return t.includes('gana') && (t.includes('de fuerza') || t.includes('de destreza'));
}

/** Prioridad de una carta: más alto = jugarla antes. */
function puntuarCarta(comb: Combate, inst: CartaInstancia, turno: number): number {
  const def = defDe(inst);
  const t = sinTildes((inst.mejorada && def.mejora?.texto) || def.texto);
  const faltaBloqueo = Math.max(0, danoEntrante(comb) - comb.jugador.bloqueo);
  const vidaEnemiga = comb.enemigos.filter((e) => e.vivo).reduce((s, e) => s + e.pv, 0);

  let p: number;
  if (def.tipo === 'poder' || esEscalado(t)) {
    // los poderes y las inversiones escalan con los turnos que les queden
    p = 100 - turno * 6;
    // salvo que el combate esté a punto de acabar: entonces no compensan
    if (vidaEnemiga < 15) p = def.tipo === 'poder' ? 10 : 62;
  } else if (faltaBloqueo > 0 && MITIGA.some((k) => t.includes(k))) {
    // defenderse cuando de verdad hace falta. Bajar el ataque del enemigo
    // (Raíces, Débil, Oscuridad) mitiga igual que el bloqueo: si el piloto no lo
    // cuenta, subestima a las clases de control.
    p = 72 + Math.min(18, faltaBloqueo);
  } else if (def.tipo === 'ataque') {
    p = 62;
  } else {
    p = 42; // utilidad (estados, control, robo)
  }
  if (def.castigo) {
    // Smites (paladin): prepared right before an attack that can still be paid for
    const resto = comb.jugador.energia - comb.costeEfectivo(def);
    const ataque = comb.jugador.mano.some((c) => c !== inst && defDe(c).tipo === 'ataque' && comb.costeEfectivo(defDe(c)) <= resto);
    p = ataque ? 66 : 30;
  }
  if (def.coste === 0) p += 14;                       // valor gratis: encadena
  if (t.includes('roba')) p += 7;                     // más opciones este turno
  if (t.includes('gana') && t.includes('energia')) p += 20;
  if (t.includes('invoca')) p += 8;
  if (def.unUso) p -= 30;                             // no quemar cartas de 1 uso a la ligera
  return p;
}

/** Objetivo preferente: el enemigo vivo con menos PV (rematar reduce el daño entrante). */
function mejorObjetivo(comb: Combate): EnemigoCombate | undefined {
  const vivos = comb.enemigos.filter((e) => e.vivo);
  if (vivos.length === 0) return undefined;
  return vivos.reduce((a, b) => (b.pv < a.pv ? b : a));
}

/** Progresión simulada: un jefe no se pelea con el mazo inicial, así que para
 *  los encuentros tardíos se añaden recompensas y mejoras al mazo. */
/** `pv`: the hero's max HP (a huge one measures what a fight costs to win). */
interface OpcionesSim { extra?: number; mejoras?: number; pv?: number }

async function simular(
  clase: ClaseId, semilla: number, defs: EnemigoDef[], op: OpcionesSim = {},
) {
  const run = nuevaRun(clase, semilla);
  if (op.pv) { run.pvMax = op.pv; run.pv = op.pv; }
  const rng = crearRng(semilla);
  const pool = poolDeClase(clase);
  for (let i = 0; i < (op.extra ?? 0); i++) {
    run.mazo.push(instanciar(pool[Math.floor(rng() * pool.length)]));
  }
  for (let i = 0; i < (op.mejoras ?? 0); i++) {
    const mejorables = run.mazo.filter((c) => !c.mejorada && defDe(c).mejora);
    if (mejorables.length === 0) break;
    mejorables[Math.floor(rng() * mejorables.length)].mejorada = true;
  }
  const combate = new Combate(run, defs, rng, uiSilenciosa);
  await combate.iniciar();

  let turnos = 0;
  // a generous cap: it only has to catch fights that never end (the pícaro bot needs ~120 turns against Vexis)
  while (!combate.terminado && turnos < 150) {
    turnos++;
    let jugadas = 0;
    while (jugadas < 15) {
      const jugables = combate.jugador.mano.filter((c) => combate.puedeJugar(c));
      if (jugables.length === 0) break;
      // la mejor carta según la heurística, con el estado actual del combate
      const elegida = jugables
        .map((c) => ({ c, p: puntuarCarta(combate, c, turnos) }))
        .reduce((a, b) => (b.p > a.p ? b : a)).c;
      await combate.jugarCarta(elegida, mejorObjetivo(combate));
      jugadas++;
      if (combate.terminado) break;
    }
    if (combate.terminado) break;
    await combate.terminarTurno();
  }
  return { combate, turnos, run };
}

console.log('— Pirámide de conjuros —');
{
  const esperado: Array<[number, number[]]> = [
    [1, [1, 0, 0]], [2, [2, 0, 0]], [3, [2, 1, 0]], [4, [3, 1, 0]],
    [5, [3, 2, 0]], [6, [3, 2, 1]], [7, [4, 2, 1]],
    // a partir del sexto, los extra son siempre de nivel 1 (no engordan 2 ni 3)
    [8, [5, 2, 1]], [9, [6, 2, 1]],
  ];
  for (const [total, forma] of esperado) {
    const r = piramideConjuros(total);
    check(
      JSON.stringify(r) === JSON.stringify(forma),
      `${total} espacios → niveles [${forma}] (obtenido [${r}])`,
    );
  }
}

console.log('— Mapa —');
{
  for (let i = 0; i < 50; i++) {
    const mapa = generarMapa(crearRng(i * 7 + 1));
    const jefe = mapa.filter((n) => n.tipo === 'jefe');
    if (jefe.length !== 1) check(false, `mapa ${i}: debe haber exactamente 1 jefe`);
    if (Math.max(...mapa.map((n) => n.fila)) !== 9)
      check(false, `mapa ${i}: debe tener 10 filas`);
    if (mapa.filter((n) => n.tipo === 'evento').length < 2)
      check(false, `mapa ${i}: debe haber al menos 2 eventos`);
    if (mapa.filter((n) => n.tipo === 'descanso').length < 3)
      check(false, `mapa ${i}: debe haber al menos 3 descansos (2 medios + el del jefe)`);
    const alcanzables = new Set<number>();
    const cola = mapa.filter((n) => n.fila === 0).map((n) => n.id);
    while (cola.length) {
      const id = cola.pop()!;
      if (alcanzables.has(id)) continue;
      alcanzables.add(id);
      cola.push(...mapa.find((n) => n.id === id)!.siguientes);
    }
    if (alcanzables.size !== mapa.length) {
      check(false, `mapa ${i}: hay nodos inalcanzables (${alcanzables.size}/${mapa.length})`);
    }
  }
  console.log('  ✓ 50 mapas generados: 10 filas, 1 jefe, ≥2 eventos, descansos y todo alcanzable');
  check(nodosDisponibles(generarMapa(crearRng(42)), -1).length >= 1, 'hay nodos iniciales disponibles');
}

console.log('— Recompensas y pools —');
{
  const rng = crearRng(7);
  for (const clase of CLASES) {
    for (let i = 0; i < 20; i++) {
      const r = recompensaCartas(clase, rng);
      if (new Set(r.map((c) => c.id)).size !== r.length)
        check(false, `${clase}: cartas repetidas en recompensa`);
      if (r.some((c) => c.clase !== clase)) check(false, `${clase}: carta de otra clase`);
    }
  }
  console.log('  ✓ 60 tiradas de recompensa sin repetidas y de la clase correcta');
  check(DRUIDA.filter((c) => c.rareza === 'rara').length === 7, 'druida: 7 raras (4 subclases + 2 de invocación + Corazón del Cambiante)');
  check(BARBARO.filter((c) => c.rareza === 'rara').length === 6, 'bárbaro: 6 raras (4 subclases + 2 de Hemorragia)');
  check(MAGO.filter((c) => c.rareza === 'rara').length === 5, 'mago: 5 raras (3 escuelas + 2 de Creación de conjuros)');
  check(PICARO.filter((c) => c.rareza === 'rara').length === 7, 'pícaro: 7 raras (3 subclases + 4 remates)');
  check(BRUJO.filter((c) => c.rareza === 'rara').length === 7, 'brujo: 7 raras (4 subclases + 3 remates)');
  for (const clase of CLASES) {
    const mazo = mazoInicial(clase);
    check(mazo.length === 11, `${clase}: mazo inicial de 11 cartas (5 golpe + 4 defender + 2 de clase)`);
  }
  const mazoMago = mazoInicial('mago');
  check(mazoMago.some((c) => c.def.requiereConjuro), 'el mago empieza con 1 carta que gasta conjuro');
  check(
    mazoMago.some((c) => c.def.id === 'canalizar-mana' && c.def.tipo === 'poder'),
    'el mago empieza con 1 poder que genera espacio de conjuro',
  );
}

console.log('— Arte de las cartas —');
{
  const TODAS = [
    ...BASICAS, ...DRUIDA, ...BARBARO, ...MAGO, ...PICARO, ...BRUJO, ...PALADIN,
    ...NEUTRALES_ESPECIALES, ...MALDICIONES, CONJURO_PRODIGIOSO, DAGA, GOLPE_SAGRADO, DEFENSA_SAGRADA,
  ];
  const sinArte = TODAS.filter((c) => !ARTE_CARTA[c.id]);
  check(sinArte.length === 0, `todas las cartas tienen emoji propio (faltan: ${sinArte.map((c) => c.id).join(', ')})`);
  const huerfanos = Object.keys(ARTE_CARTA).filter((id) => !TODAS.some((c) => c.id === id));
  check(huerfanos.length === 0, `no hay emojis de cartas que ya no existen (${huerfanos.join(', ')})`);
  // Golpe y Defender están en todos los mazos, así que cuentan siempre
  const comunes = TODAS.filter((c) => c.clase === 'neutral');
  for (const clase of CLASES) {
    const mazo = [...TODAS.filter((c) => c.clase === clase), ...comunes];
    const porEmoji = new Map<string, string[]>();
    for (const c of mazo) {
      const e = ARTE_CARTA[c.id] ?? '✦';
      porEmoji.set(e, [...(porEmoji.get(e) ?? []), c.id]);
    }
    const repes = [...porEmoji.entries()].filter(([, v]) => v.length > 1);
    check(repes.length === 0,
      `${clase}: ningún emoji repetido en un mismo mazo (${repes.map(([e, v]) => `${e}=${v.join('/')}`).join(', ')})`);
  }
}

console.log('— Combates simulados: los 6 escenarios × 5 clases × 4 tipos de encuentro —');
{
  /** Los tres tipos de encuentro se comportan muy distinto: un enemigo solo
   *  premia el daño concentrado, un grupo premia el área y el bloqueo, y un jefe
   *  premia aguantar muchos turnos. Si una clase falla, suele fallar en uno. */
  type Cap = typeof ACTOS[0][0];
  /** El mazo con el que llegas a un encuentro depende del acto (has recogido
   *  recompensas y pasado por campamentos) y de lo avanzado del acto: a un élite
   *  o a un jefe se llega más tarde que a los combates normales. Medir el Acto III
   *  con el mazo inicial no dice nada de la clase, solo de la escala del acto. */
  const progresion = (capIdx: number, base: OpcionesSim): OpcionesSim => {
    const acto = Math.floor(capIdx / 2); // 0, 1 o 2
    return { extra: acto * 5 + (base.extra ?? 0), mejoras: acto * 2 + (base.mejoras ?? 0) };
  };
  const tipos = [
    { nombre: 'singular', base: {}, grupos: (c: Cap) => c.normales.filter((g) => g.length === 1) },
    { nombre: 'grupo', base: {}, grupos: (c: Cap) => c.normales.filter((g) => g.length > 1) },
    { nombre: 'élite', base: { extra: 3, mejoras: 1 }, grupos: (c: Cap) => c.elites },
    { nombre: 'jefe', base: { extra: 6, mejoras: 2 }, grupos: (c: Cap) => [c.jefe] },
  ];

  // Resumen por tipo (agregado de todos los escenarios y clases)
  const porTipo: Record<string, { v: number; t: number; turnos: number }> = {};
  const porClase: Record<string, { v: number; t: number }> = {};
  const porTipoClase: Record<string, Record<string, { v: number; t: number }>> = {};

  for (const tipo of tipos) {
    for (const [capIdx, cap] of ACTOS.flat().entries()) {
      const grupos = tipo.grupos(cap);
      if (grupos.length === 0) continue;
      for (const clase of CLASES) {
        for (let s = 1; s <= 4; s++) {
          const defs = grupos[s % grupos.length];
          const { combate, turnos } =
            await simular(clase, s * 131 + capIdx * 17, defs, progresion(capIdx, tipo.base));
          if (combate.terminado === null) {
            check(false, `${clase} · ${cap.nombre} · ${tipo.nombre} s${s}: el combate no termina`);
          }
          const r = (porTipo[tipo.nombre] ??= { v: 0, t: 0, turnos: 0 });
          const c = (porClase[clase] ??= { v: 0, t: 0 });
          const tc = ((porTipoClase[tipo.nombre] ??= {})[clase] ??= { v: 0, t: 0 });
          r.t++; c.t++; tc.t++; r.turnos += turnos;
          if (combate.terminado === 'victoria') { r.v++; c.v++; tc.v++; }
        }
      }
    }
  }

  console.log('  Por tipo de encuentro:');
  for (const [nombre, r] of Object.entries(porTipo)) {
    const pct = Math.round((r.v / r.t) * 100);
    console.log(`    ${nombre.padEnd(9)} ${String(r.v).padStart(3)}/${r.t} victorias (${pct}%) · ${(r.turnos / r.t).toFixed(1)} turnos`);
  }
  console.log('  Por clase y tipo (% de victorias):');
  const cab = CLASES.map((c) => c.slice(0, 7).padStart(8)).join('');
  console.log(`    ${'tipo'.padEnd(10)}${cab}`);
  for (const [nombre, porC] of Object.entries(porTipoClase)) {
    const fila = CLASES.map((c) => `${Math.round((porC[c].v / porC[c].t) * 100)}%`.padStart(8)).join('');
    console.log(`    ${nombre.padEnd(10)}${fila}`);
  }

  // Guardarraíles. Lo que importa no es el número absoluto (depende del mazo y
  // del piloto heurístico) sino que ninguna clase se descuelgue del resto en su
  // mismo nivel de encuentro, y que los jefes sigan siendo un reto.
  for (const nombre of ['singular', 'grupo'] as const) {
    for (const [clase, c] of Object.entries(porTipoClase[nombre])) {
      const pct = Math.round((c.v / c.t) * 100);
      check(pct >= 70, `${clase} · ${nombre}: ≥70 % con mazo inicial (${pct} %)`);
    }
  }
  for (const [nombre, porC] of Object.entries(porTipoClase)) {
    const pcts = CLASES.map((c) => (porC[c].v / porC[c].t) * 100);
    const brecha = Math.round(Math.max(...pcts) - Math.min(...pcts));
    check(brecha <= 45, `${nombre}: la brecha entre la mejor y la peor clase es de ${brecha} puntos (máx. 45)`);
  }
  const jefes = porTipo['jefe'];
  check(jefes.v / jefes.t <= 0.9, `los jefes no se ganan siempre (${jefes.v}/${jefes.t})`);
  check(jefes.v > 0, `los jefes se pueden ganar con un mazo hecho (${jefes.v}/${jefes.t})`);
}

console.log('— Mecánica de Furia (se rompe sin recibir daño) —');
{
  // Caso 1: el enemigo no ataca → no recibes daño → la Furia se rompe
  const run = nuevaRun('barbaro', 999);
  const combate = new Combate(run, [GOBLIN_CORTADOR], crearRng(999), uiSilenciosa);
  await combate.iniciar();
  check(combate.jugador.furiaFuerza === 1, 'Hacha del Ancestro otorga Furia inicial');
  combate.enemigos[0].intencion = { nombre: 'Esconderse', intencion: 'defensa', bloqueo: 5 };
  await combate.terminarTurno();
  check(combate.jugador.furiaFuerza === 0, 'la Furia se rompe al acabar la ronda sin recibir daño');
  check((combate.jugador.estados.fuerza ?? 0) === 0, 'la Fuerza de Furia se retira');

  // Caso 2: el enemigo te hiere → la Furia se mantiene
  const run2 = nuevaRun('barbaro', 998);
  const combate2 = new Combate(run2, [GOBLIN_CORTADOR], crearRng(998), uiSilenciosa);
  await combate2.iniciar();
  combate2.enemigos[0].intencion = { nombre: 'Puñalada', intencion: 'ataque', dano: 7 };
  await combate2.terminarTurno();
  check(combate2.jugador.furiaFuerza === 1, 'la Furia se mantiene si recibes daño real');

  // Caso 3: bloquear todo el daño NO cuenta como recibirlo
  const run3 = nuevaRun('barbaro', 997);
  const combate3 = new Combate(run3, [GOBLIN_CORTADOR], crearRng(997), uiSilenciosa);
  await combate3.iniciar();
  combate3.jugador.bloqueo = 99;
  combate3.enemigos[0].intencion = { nombre: 'Puñalada', intencion: 'ataque', dano: 7 };
  await combate3.terminarTurno();
  check(combate3.jugador.furiaFuerza === 0, 'el daño bloqueado no mantiene la Furia');

  // Caso 4: el daño autoinfligido (Golpe Imprudente) sí alimenta la Furia
  const run4 = nuevaRun('barbaro', 996);
  const combate4 = new Combate(run4, [GOBLIN_CORTADOR], crearRng(996), uiSilenciosa);
  await combate4.iniciar();
  combate4.jugador.bloqueo = 99;
  combate4.enemigos[0].intencion = { nombre: 'Esconderse', intencion: 'defensa', bloqueo: 5 };
  await combate4.contexto().perderPV(2);
  await combate4.terminarTurno();
  check(combate4.jugador.furiaFuerza === 1, 'perder PV propios (Golpe Imprudente) mantiene la Furia');
}

console.log('— Espacios de conjuro del mago —');
{
  const run = nuevaRun('mago', 444);
  const combate = new Combate(run, [GOBLIN_CORTADOR], crearRng(444), uiSilenciosa);
  await combate.iniciar();
  check(combate.jugador.conjuros.length === 1, 'el mago empieza con 1 espacio de nivel 1');
  const ctx = combate.contexto(combate.enemigos[0]);
  const bloqueoAntes = combate.jugador.bloqueo;
  const nivel = await ctx.gastarConjuro(1);
  check(nivel === 1, 'gastarConjuro devuelve el nivel gastado');
  check(combate.jugador.bloqueo === bloqueoAntes + 2, 'Péndulo de Ámbar da 2 de bloqueo al gastar');
  check(ctx.conjurosLibres() === 0, 'el espacio queda gastado');
  const cartaConjuro = combate.jugador.mano.find((c) => c.def.requiereConjuro) ??
    combate.jugador.mazo.find((c) => c.def.requiereConjuro)!;
  check(!combate.puedeJugar(cartaConjuro), 'sin espacios libres no se pueden jugar cartas de conjuro');
  const recuperado = await ctx.recuperarConjuro();
  check(recuperado === 1, 'Recuperación Arcana devuelve el espacio');
  check(ctx.conjurosLibres() === 1, 'el espacio vuelve a estar libre');

  // con pirámide mixta, se gasta primero el de mayor nivel
  combate.jugador.conjuros = [
    { nivel: 1, gastado: false },
    { nivel: 1, gastado: false },
    { nivel: 2, gastado: false },
  ];
  check((await ctx.gastarConjuro(1)) === 2, 'por defecto se gasta el espacio de mayor nivel');
  check((await ctx.gastarConjuro(1)) === 1, 'después se gastan los de nivel inferior');
}

console.log('— Espacios de combate vs permanentes —');
{
  const run = nuevaRun('mago', 321);
  const combate = new Combate(run, [GOBLIN_CORTADOR], crearRng(321), uiSilenciosa);
  await combate.iniciar();
  const ctx = combate.contexto();
  await ctx.ganarConjuro(false); // Canalizar Maná: solo este combate
  check(combate.jugador.conjuros.length === 2, 'el espacio de combate se añade a la pirámide');
  check(run.espaciosConjuro === 1, 'el espacio de combate NO toca la run');
  // el siguiente combate vuelve a empezar con la pirámide base
  const combate2 = new Combate(run, [GOBLIN_CORTADOR], crearRng(322), uiSilenciosa);
  await combate2.iniciar();
  check(combate2.jugador.conjuros.length === 1, 'el efecto del poder se reinicia entre combates');
}

console.log('— Cartas de 1 uso —');
{
  const run = nuevaRun('mago', 888);
  const combate = new Combate(run, [GOBLIN_CORTADOR], crearRng(888), uiSilenciosa);
  await combate.iniciar();
  const estudio = instanciar(MAGO.find((c) => c.id === 'estudio-arcano')!);
  combate.jugador.mano.push(estudio);
  run.mazo.push(estudio);
  const tamanoAntes = run.mazo.length;
  await combate.jugarCarta(estudio);
  check(run.espaciosConjuro === 2, 'Estudio Arcano añade un espacio permanente');
  check(run.mazo.length === tamanoAntes - 1, 'la carta de 1 uso se elimina del mazo de la run');
  check(combate.jugador.conjuros.length === 2, 'la pirámide se reconstruye en combate');
}

console.log('— Raíces: instancias con duración individual —');
{
  const run = nuevaRun('druida', 777);
  const combate = new Combate(run, [GOBLIN_CORTADOR], crearRng(777), uiSilenciosa);
  await combate.iniciar();
  const e = combate.enemigos[0];
  const ctx = combate.contexto(e);
  const defender = () => { e.intencion = { nombre: 'Cubrirse', intencion: 'defensa', bloqueo: 4 }; };
  defender();
  e.intencion = { nombre: 'Tajo', intencion: 'ataque', dano: 30 }; // alto: no se anula
  await ctx.aplicarRaices(e, 6, 1);  // Enredaderas (1 turno)
  await ctx.aplicarRaices(e, 10, 2); // Estranguladoras (2 turnos)
  check((e.estados.raices ?? 0) === 16, 'este turno: 6 + 10 = 16 de raíces');
  check(combate.danoIntencion(e) === 14, 'la intención se reduce: 30 − 16 = 14');
  combate.jugador.bloqueo = 999; defender();
  await combate.terminarTurno();
  check((e.estados.raices ?? 0) === 10, 'al turno siguiente las Enredaderas expiran: quedan 10');
  await ctx.aplicarRaices(e, 10, 2); // otras Estranguladoras
  check((e.estados.raices ?? 0) === 20, 'tras otras Estranguladoras: 10 + 10 = 20');
  combate.jugador.bloqueo = 999; defender();
  await combate.terminarTurno();
  check((e.estados.raices ?? 0) === 10, 'y al siguiente vuelve a 10');
}

console.log('— Raíces aplastan al atacar anulado —');
{
  const run = nuevaRun('druida', 555);
  const combate = new Combate(run, [GOBLIN_CORTADOR], crearRng(555), uiSilenciosa);
  await combate.iniciar();
  const e = combate.enemigos[0];
  e.pv = e.pvMax = 30;
  e.intencion = { nombre: 'Tajo', intencion: 'ataque', dano: 7 };
  const ctx = combate.contexto(e);
  await ctx.aplicarRaices(e, 10, 1); // 7 − 10 = −3
  combate.jugador.bloqueo = 999;
  const pvJ = combate.jugador.pv;
  await combate.terminarTurno();
  check(combate.jugador.pv === pvJ, 'el jugador no recibe daño: el ataque queda anulado');
  check(30 - e.pv === 3, 'el enemigo pierde solo la diferencia (10 − 7 = 3) PV (ignora bloqueo)');
}

console.log('— Raíces Profundas: +1 turno por carta —');
{
  const tierra = DRUIDA.find((c) => c.id === 'circulo-tierra')!;
  check(tierra.nombre === 'Raíces Profundas' && tierra.tipo === 'poder', 'la carta de Tierra es el poder Raíces Profundas');

  const run = nuevaRun('druida', 909);
  const combate = new Combate(run, [GOBLIN_CORTADOR], crearRng(909), uiSilenciosa);
  await combate.iniciar();
  const e = combate.enemigos[0];
  const ctx = combate.contexto(e);
  const defender = () => { e.intencion = { nombre: 'Cubrirse', intencion: 'defensa', bloqueo: 4 }; };
  await ctx.aplicarEstado(combate.jugador, 'raizProlongada', 1);
  await ctx.aplicarRaices(e, 6, 1); // Enredaderas → con el poder duran 2 turnos
  check((e.estados.raices ?? 0) === 6, 'aplica 6 de raíces');
  combate.jugador.bloqueo = 999; defender(); await combate.terminarTurno();
  check((e.estados.raices ?? 0) === 6, 'con Raíces Profundas siguen activas al 2.º turno');
  combate.jugador.bloqueo = 999; defender(); await combate.terminarTurno();
  check((e.estados.raices ?? 0) === 0, 'y expiran tras el turno extra');
}

console.log('— Recuperación de conjuros: menor vs mayor nivel —');
{
  const run = nuevaRun('mago', 4242);
  const combate = new Combate(run, [GOBLIN_CORTADOR], crearRng(4242), uiSilenciosa);
  await combate.iniciar();
  const ctx = combate.contexto();
  combate.jugador.conjuros = [
    { nivel: 1, gastado: true },
    { nivel: 2, gastado: true },
    { nivel: 3, gastado: true },
  ];
  check((await ctx.recuperarConjuro()) === 1, 'por defecto recupera el de MENOR nivel');
  check((await ctx.recuperarConjuro(true)) === 3, 'Sacrificio recupera el de MAYOR nivel');
  check((await ctx.recuperarConjuro()) === 2, 'el último gastado restante es el nivel 2');
  check((await ctx.recuperarConjuro()) === 0, 'sin gastados devuelve 0');

  const sacrificio = MAGO.find((c) => c.id === 'sacrificio-arcano')!;
  check(sacrificio.coste === 1 && !sacrificio.exhumar, 'Sacrificio Arcano cuesta 1 y ya no se agota');
}

console.log('— Mejoras de cartas —');
{
  const todas = [...BASICAS, ...DRUIDA, ...BARBARO, ...MAGO];
  const sinMejora = todas.filter((c) => !c.mejora);
  check(sinMejora.length === 0, `todas las cartas tienen mejora (faltan: ${sinMejora.map((c) => c.id).join(', ') || '—'})`);

  const golpe = instanciar(BASICAS.find((c) => c.id === 'golpe')!);
  check(defDe(golpe).texto.includes('6'), 'sin mejorar usa la definición base');
  golpe.mejorada = true;
  check(defDe(golpe).nombre === 'Golpe+' && defDe(golpe).texto.includes('9'), 'mejorada usa nombre+ y efecto nuevo');

  const estudio = instanciar(MAGO.find((c) => c.id === 'estudio-arcano')!);
  estudio.mejorada = true;
  check(defDe(estudio).coste === 0, 'la mejora puede reducir el coste (Estudio Arcano+ = 0)');

  // la mejora funciona dentro de un combate real
  const run = nuevaRun('barbaro', 777);
  run.mazo.forEach((c) => (c.mejorada = true));
  const combate = new Combate(run, [GOBLIN_CORTADOR], crearRng(777), uiSilenciosa);
  await combate.iniciar();
  const golpeM = combate.jugador.mano.find((c) => c.def.id === 'golpe');
  if (golpeM) {
    const pvAntes = combate.enemigos[0].pv;
    await combate.jugarCarta(golpeM, combate.enemigos[0]);
    check(pvAntes - combate.enemigos[0].pv >= 9, 'Golpe+ inflige el daño mejorado en combate');
  }
}

console.log('— Eventos —');
{
  check(EVENTOS_POSITIVOS.length >= 6, `hay ${EVENTOS_POSITIVOS.length} eventos positivos`);
  check(EVENTOS_NEGATIVOS.length >= 3, `hay ${EVENTOS_NEGATIVOS.length} eventos negativos`);

  // ratio 70/30 aproximado
  const rng = crearRng(2024);
  let positivos = 0;
  for (let i = 0; i < 1000; i++) {
    if (elegirEvento(rng, new Set()).tono === 'positivo') positivos++;
  }
  check(positivos > 630 && positivos < 770, `ratio positivos ≈ 70 % (${positivos / 10} %)`);

  // todas las opciones de todos los eventos se aplican sin reventar y nunca matan
  let opcionesProbadas = 0;
  for (const ev of [...EVENTOS_POSITIVOS, ...EVENTOS_NEGATIVOS]) {
    for (const [i, op] of ev.opciones.entries()) {
      for (const clase of CLASES) {
        for (let s = 0; s < 5; s++) {
          const run = nuevaRun(clase, s * 17 + i);
          run.pv = 5; // al borde de la muerte: los eventos no deben matar
          const resultado = op.aplicar(run, crearRng(s * 31 + i));
          opcionesProbadas++;
          if (typeof resultado !== 'string' || resultado.length === 0)
            check(false, `${ev.id}/${op.etiqueta}: no devuelve desenlace`);
          if (run.pv < 1) check(false, `${ev.id}/${op.etiqueta}: ¡ha matado al jugador!`);
          if (run.pv > run.pvMax) check(false, `${ev.id}/${op.etiqueta}: PV > PV máx`);
        }
      }
    }
  }
  console.log(`  ✓ ${opcionesProbadas} aplicaciones de opciones de evento sin errores ni muertes`);

  // no repite eventos ya vistos mientras queden frescos
  const vistos = new Set(EVENTOS_POSITIVOS.slice(1).map((e) => e.id));
  const rng2 = crearRng(5);
  for (let i = 0; i < 20; i++) {
    const e = elegirEvento(rng2, vistos);
    if (e.tono === 'positivo' && e.id !== EVENTOS_POSITIVOS[0].id)
      check(false, 'ha repetido un evento ya visto');
  }
  console.log('  ✓ evita repetir eventos ya vividos');
}

console.log('— Jefes con efectos únicos —');
{
  // Gorzug: invoca goblins en el turno 1 y devora a uno en el turno 2
  const run = nuevaRun('barbaro', 4242);
  const combate = new Combate(run, [JEFE_OGRO], crearRng(4242), uiSilenciosa);
  await combate.iniciar();
  const gorzug = combate.enemigos[0];
  check(gorzug.intencion.invocar !== undefined, 'Gorzug abre con Llamada de Guerra (invocación)');
  await combate.terminarTurno();
  check(
    combate.enemigos.filter((e) => e.vivo).length === 3,
    'tras su turno hay 2 goblins famélicos invocados',
  );
  check(gorzug.intencion.devorar !== undefined, 'su siguiente intención es Devorar Goblin');
  gorzug.pv -= 30; // le abrimos el apetito para ver la cura
  const pvAntes = gorzug.pv;
  await combate.terminarTurno();
  check(
    combate.enemigos.filter((e) => e.vivo).length === 2,
    'devora a un goblin (queda 1)',
  );
  check(gorzug.pv === pvAntes + 20, 'se cura 20 al devorar');
  check((gorzug.estados.fuerza ?? 0) >= 3, 'gana 3 de Fuerza al devorar');

  // Ignifax: escamas pasivas y enfurecimiento devastador único bajo el 50%
  const runI = nuevaRun('druida', 7777);
  const combateI = new Combate(runI, [IGNIFAX], crearRng(7777), uiSilenciosa);
  await combateI.iniciar();
  const dragon = combateI.enemigos[0];
  check(dragon.pvMax === 320, 'Ignifax tiene 320 PV');
  check((dragon.estados.espinas ?? 0) === 4, 'Escamas Ígneas: empieza con 4 de Espinas');
  const pvHeroe = combateI.jugador.pv;
  await combateI.contexto(dragon).atacar(dragon, 5);
  check(combateI.jugador.pv === pvHeroe - 4, 'sus espinas devuelven 4 de daño al atacarle');
  dragon.pv = 100; // por debajo de la mitad de 320
  combateI.jugador.bloqueo = 999; // sobrevivir a su turno
  await combateI.terminarTurno();
  check(dragon.intencion.nombre === 'CORAZÓN DE MAGMA', 'Ignifax telegrafia su enfurecimiento');
  const pvDragon = dragon.pv;
  combateI.jugador.bloqueo = 999;
  await combateI.terminarTurno();
  check(dragon.pv === pvDragon + 55, 'Corazón de Magma lo cura 55');
  check((dragon.estados.fuerza ?? 0) >= 5, 'gana +5 de Fuerza');
  check((dragon.estados.espinas ?? 0) === 6, 'y sus escamas arden más (+2 Espinas)');
  check(dragon.rasgoUsado === true, 'el enfurecimiento es de un solo uso');

  // Vol'guth (rework): dies into his phylactery; it rebuilds him after a turn unless it breaks
  {
    const run2 = nuevaRun('mago', 6666);
    run2.reliquias = [];
    const combate2 = new Combate(run2, [SENOR_CRIPTA], crearRng(6666), uiSilenciosa);
    await combate2.iniciar();
    const liche = combate2.enemigos[0];
    check(SENOR_CRIPTA.pv[0] <= 140, `Vol'guth tiene menos vida (${SENOR_CRIPTA.pv[0]})`);
    await combate2.contexto(liche).atacar(liche, 999);
    const fil = combate2.enemigos[0];
    check(!combate2.terminado && fil.vivo && fil.def.id === 'filacteria-volguth' && fil.pv === fil.pvMax && fil.pvMax >= 30 && fil.pvMax <= 60,
      `al morir, su sitio lo ocupa la filacteria (${fil.def.id}, ${fil.pv} PV)`);
    check(fil.intencion.resucitar !== true, 'la filacteria no lo devuelve en su primer turno: tienes un turno entero para romperla');
    combate2.jugador.bloqueo = 999;
    await combate2.terminarTurno();
    check(combate2.enemigos[0] === fil && fil.intencion.resucitar === true, 'en su segundo turno anuncia la resurrección');
    await combate2.contexto(fil).atacar(fil, 12);
    const quedaba = fil.pv;
    combate2.jugador.bloqueo = 999;
    await combate2.terminarTurno();
    const vuelto = combate2.enemigos[0];
    check(vuelto.def.id === 'senor-cripta' && vuelto.vivo && vuelto.pv === vuelto.pvMax && vuelto.filacteriaUsada === true,
      'si la filacteria aguanta, Vol\'guth resucita con toda su vida (y despierto)');
    await combate2.contexto(vuelto).atacar(vuelto, 999);
    const fil2 = combate2.enemigos[0];
    check(fil2.def.id === 'filacteria-volguth' && fil2.pv === quedaba, `al matarlo otra vez, la filacteria vuelve con la vida que le quedaba (${fil2.pv} de ${quedaba})`);
    await combate2.contexto(fil2).atacar(fil2, 999);
    check(!combate2.enemigos[0].vivo && combate2.terminado === 'victoria', 'romper la filacteria lo destruye para siempre');
  }
  // his curse turn hands you a chain that heals him while you hold it
  {
    const mov = SENOR_CRIPTA.ia(0, () => 0.5, { pv: 100, pvMax: 130, estados: {} } as never, []);
    check(mov.maldicion?.id === 'cadena-filacteria' && mov.maldicion?.destino === 'mano', 'su turno de maldición te mete la Cadena de la Filacteria en la mano');
    const run3 = nuevaRun('mago', 6667);
    run3.reliquias = [];
    const c3 = new Combate(run3, [SENOR_CRIPTA], crearRng(6667), uiSilenciosa);
    await c3.iniciar();
    const v = c3.enemigos[0];
    c3.jugador.bloqueo = 999;
    c3.jugador.mano = [];
    v.intencion = mov;
    await c3.terminarTurno();
    const cadena = c3.jugador.mano.find((x) => x.def.id === 'cadena-filacteria');
    check(!!cadena, 'tras su turno, la cadena está en tu mano');
    v.pv = 100;
    const { cartaPorId: porId } = await import('../src/core/cartas.ts');
    const otra = instanciar(porId('defender')!);
    c3.jugador.mano.push(otra);
    c3.jugador.energia = 5;
    await c3.jugarCarta(otra);
    check(v.pv === 103, `mientras la tengas en la mano, cada carta que juegas cura 3 a Vol'guth (${v.pv})`);
    check(cadena?.def.purgar === 1, 'puedes romperla pagando 1 de energía');
  }
}

console.log('— Quemadura (Aliento de Dragón) —');
{
  const run = nuevaRun('barbaro', 31415);
  const combate = new Combate(run, [GOBLIN_CORTADOR], crearRng(31415), uiSilenciosa);
  await combate.iniciar();
  combate.jugador.estados.quemadura = 2;
  combate.jugador.pv = combate.jugador.pvMax;
  const carta = combate.jugador.mano.find((c) => combate.puedeJugar(c))!;
  const pvAntes = combate.jugador.pv;
  await combate.jugarCarta(carta, combate.enemigos[0]);
  check(combate.jugador.pv === pvAntes - 3, 'cada carta jugada con Quemadura cuesta 3 PV');
  // se reduce 1 por turno y expira tras dos
  combate.jugador.bloqueo = 999;
  await combate.terminarTurno();
  check((combate.jugador.estados.quemadura ?? 0) === 1, 'la Quemadura baja 1 por turno');
  combate.jugador.bloqueo = 999;
  await combate.terminarTurno();
  check((combate.jugador.estados.quemadura ?? 0) === 0, 'y expira tras dos turnos');

  // el dragón la inflige con su Aliento de Dragón
  const aliento = IGNIFAX.ia(2, () => 0.5, { rasgoUsado: true, pv: 320, pvMax: 320 } as never, []);
  check(aliento.nombre === 'ALIENTO DE DRAGÓN' && (aliento.efectos ?? []).some(([e]) => e === 'quemadura'),
    'el Aliento de Dragón de Ignifax aplica Quemadura');
}

console.log('— Cartas de azar (Seducir / Deseo) —');
{
  const seducir = NEUTRALES_ESPECIALES.find((c) => c.id === 'seducir')!;
  const deseo = NEUTRALES_ESPECIALES.find((c) => c.id === 'deseo')!;
  check(!!seducir && !!deseo && seducir.clase === 'neutral' && deseo.clase === 'neutral',
    'existen las cartas únicas incoloras Seducir y Deseo');

  // Seducir con un 20 sobre un NO jefe: muere y ganas +3 de Fuerza
  const run = nuevaRun('mago', 1);
  const comb = new Combate(run, [GOBLIN_CORTADOR], () => 0.99, uiSilenciosa); // d20 → 20
  await comb.iniciar();
  const e = comb.enemigos[0];
  const fAntes = comb.jugador.estados.fuerza ?? 0;
  await seducir.jugar(comb.contexto(e));
  check(!e.vivo, 'Seducir con 20 mata a un enemigo que no es jefe');
  check((comb.jugador.estados.fuerza ?? 0) === fAntes + 3, 'y otorga +3 de Fuerza');

  // Deseo con un 20 sobre un jefe: no muere, sufre 50 y queda 99/99
  const run2 = nuevaRun('mago', 2);
  const comb2 = new Combate(run2, [IGNIFAX], () => 0.99, uiSilenciosa);
  await comb2.iniciar();
  const jefe = comb2.enemigos[0];
  const pvJefe = jefe.pv;
  await deseo.jugar(comb2.contexto());
  check(jefe.vivo && jefe.pv === pvJefe - 50, 'Deseo con 20: el jefe sufre 50 (no muere)');
  check((jefe.estados.vulnerable ?? 0) >= 99 && (jefe.estados.debil ?? 0) >= 99, 'y queda 99 Vulnerable / 99 Débil');

  // Deseo con un 1: pierdes el maná actual y el próximo turno empiezas a 0
  const run3 = nuevaRun('mago', 3);
  const comb3 = new Combate(run3, [GOBLIN_CORTADOR], () => 0, uiSilenciosa); // d20 → 1
  await comb3.iniciar();
  comb3.jugador.energia = 3;
  await deseo.jugar(comb3.contexto());
  check(comb3.jugador.energia === 0, 'Deseo con 1: pierdes todo el maná');
  check(comb3.jugador.energiaCero === true, 'y el próximo turno empezará a 0 de maná');
}

console.log('— Imagen Espejo —');
{
  const espejo = MAGO.find((c) => c.id === 'escuela-ilusion')!;
  check(espejo.nombre === 'Imagen Espejo' && espejo.coste === 2, 'Imagen Espejo: coste 2 (las ilusiones se encarecieron para evitar bucles)');
  check(espejo.requiereConjuro === 1, 'gasta un espacio de conjuro');

  // al jugarse: previene los próximos (nivel + 1) ataques (antes 60 % + 20 % por nivel)
  const runE = nuevaRun('mago', 13);
  const combE = new Combate(runE, [GOBLIN_CORTADOR], () => 0.5, uiSilenciosa);
  await combE.iniciar();
  combE.jugador.conjuros = [{ nivel: 1, gastado: false }, { nivel: 2, gastado: false }];
  combE.jugador.energia = 3;
  const instE = { uid: 9999, def: espejo, mejorada: false };
  combE.jugador.mano.push(instE);
  await combE.jugarCarta(instE, undefined);
  check((combE.jugador.estados.espejismo ?? 0) === 3, 'nivel 2 gastado → previene los próximos 3 ataques');
  check(combE.jugador.conjuros.filter((c) => !c.gastado).length === 1, 'consume el espacio de mayor nivel');
  check(/previenen? los próximos/i.test(espejo.texto) && !/%/.test(espejo.texto), 'el texto habla de ataques prevenidos, no de porcentajes');

  // sin azar: aunque el rng diga «falla», el ataque se previene y gasta una carga
  const runA = nuevaRun('mago', 11);
  const combA = new Combate(runA, [GOBLIN_CORTADOR], () => 0.99, uiSilenciosa);
  await combA.iniciar();
  combA.jugador.estados.espejismo = 2;
  combA.enemigos[0].intencion = { nombre: 'Puñalada', intencion: 'ataque', dano: 7 };
  const pvAntes = combA.jugador.pv;
  await combA.terminarTurno();
  check(combA.jugador.pv === pvAntes, 'el ataque se previene siempre, sin tirada');
  check((combA.jugador.estados.espejismo ?? 0) === 1, 'gasta una carga y la otra se guarda para el siguiente ataque');

  // un ataque múltiple gasta una carga por golpe y los que sobran entran
  const runB = nuevaRun('mago', 12);
  const combB = new Combate(runB, [GOBLIN_CORTADOR], () => 0.01, uiSilenciosa);
  await combB.iniciar();
  combB.jugador.estados.espejismo = 1;
  combB.enemigos[0].intencion = { nombre: 'Ráfaga', intencion: 'ataque', dano: 3, veces: 3 };
  const pvAntesB = combB.jugador.pv;
  await combB.terminarTurno();
  check(pvAntesB - combB.jugador.pv === 6 && (combB.jugador.estados.espejismo ?? 0) === 0, 'en un ataque de 3 golpes, 1 carga previene uno y entran los otros dos');

  const embaucador = PICARO.find((c) => c.id === 'embaucador-arcano')!;
  check(/previene el próximo ataque/i.test(embaucador.texto), 'Embaucador Arcano: previene el próximo ataque (antes 60 %)');
  // no more illusion loops: every illusion card costs one more and exhausts
  for (const c of [espejo, embaucador]) {
    const mej = defDe({ uid: 0, def: c, mejorada: true });
    check(c.coste === 2 && mej.coste === 1, `${c.nombre}: cuesta 2 (1 mejorada)`);
    check(!!c.exhumar && !!mej.exhumar && /se agota/i.test(c.texto) && /se agota/i.test(mej.texto), `${c.nombre}: se agota al jugarla`);
  }
}

console.log('— Reliquias —');
{
  const { POOL_RELIQUIAS } = await import('../src/core/reliquias.ts');
  const ids = POOL_RELIQUIAS.map((r) => r.id);
  check(ids.length >= 13, `pool de reliquias amplio (${ids.length})`);
  check(new Set(ids).size === ids.length, 'sin ids de reliquia duplicados');
}

console.log('— Guardado y carga —');
{
  const run = nuevaRun('mago', 1234);
  run.pv = 33;
  run.piso = 4;
  run.capitulo = 1;
  run.espaciosConjuro = 3;
  run.permanentes.energia = 1;
  run.permanentes.robo = 1;
  run.eventosVistos.push('foso', 'bardo');
  run.mazo[0].mejorada = true;
  run.mapa[2].visitado = true;
  run.nodoActual = 2;

  const restaurada = rehidratarRun(JSON.parse(JSON.stringify(serializarRun(run))))!;
  check(restaurada !== null, 'el guardado se rehidrata');
  check(restaurada.clase === 'mago' && restaurada.pv === 33 && restaurada.pvMax === run.pvMax, 'clase y PV conservados');
  check(restaurada.capitulo === 1 && restaurada.piso === 4 && restaurada.nodoActual === 2, 'progreso conservado');
  check(restaurada.mazo.length === run.mazo.length, 'tamaño del mazo conservado');
  check(restaurada.mazo[0].mejorada && restaurada.mazo[0].def.id === run.mazo[0].def.id, 'mejoras de cartas conservadas');
  check(restaurada.reliquias[0].id === 'pendulo-ambar', 'reliquias conservadas (con sus funciones)');
  check(typeof restaurada.mazo[0].def.jugar === 'function', 'las cartas rehidratadas son jugables');
  check(restaurada.espaciosConjuro === 3, 'espacios de conjuro conservados');
  check(restaurada.permanentes.energia === 1 && restaurada.permanentes.robo === 1, 'permanentes conservados');
  check(restaurada.eventosVistos.includes('foso'), 'eventos vistos conservados');
  check(restaurada.mapa[2].visitado, 'estado del mapa conservado');
}

console.log('— Bendiciones de la Vidente —');
{
  // +1 energía solo en élites/jefes (Don del Vigor con drawback)
  const run = nuevaRun('druida', 55);
  run.permanentes.energiaElite = 1;
  const normal = new Combate(run, [GOBLIN_CORTADOR], crearRng(55), uiSilenciosa);
  await normal.iniciar();
  check(normal.jugador.energiaMax === 3, 'Don del Vigor: energía normal en combates corrientes');
  const elite = new Combate(run, [GOBLIN_CORTADOR], crearRng(55), uiSilenciosa, true);
  await elite.iniciar();
  check(elite.jugador.energiaMax === 4, 'Don del Vigor: +1 energía contra élites y jefes');
  // +1 robo por turno
  const run2 = nuevaRun('druida', 56);
  run2.permanentes.robo = 1;
  const combate2 = new Combate(run2, [GOBLIN_CORTADOR], crearRng(56), uiSilenciosa);
  await combate2.iniciar();
  check(combate2.jugador.mano.length === 6, 'Don de la Mente: roba 6 cartas');
  // +1 destreza al inicio
  const run3 = nuevaRun('druida', 57);
  run3.permanentes.destreza = 1;
  const combate3 = new Combate(run3, [GOBLIN_CORTADOR], crearRng(57), uiSilenciosa);
  await combate3.iniciar();
  check((combate3.jugador.estados.destreza ?? 0) === 1, 'Don de la Destreza: +1 al inicio del combate');
  // Don del Maná Eterno: +1 energía solo turnos 1 y 2
  const run4 = nuevaRun('druida', 58);
  run4.permanentes.energiaInicial = 1;
  const combate4 = new Combate(run4, [GOBLIN_CORTADOR], crearRng(58), uiSilenciosa);
  await combate4.iniciar();
  check(combate4.jugador.energia === 4, 'Maná Eterno: +1 energía el turno 1');
  combate4.enemigos[0].intencion = { nombre: 'x', intencion: 'defensa', bloqueo: 1 };
  await combate4.terminarTurno();
  check(combate4.jugador.energia === 4, 'Maná Eterno: +1 energía el turno 2');
  await combate4.terminarTurno();
  check(combate4.jugador.energia === 3, 'Maná Eterno: ya no da energía el turno 3');
}

console.log('— Cartas únicas de clase (Acto III) —');
{
  for (const clase of CLASES) {
    const u = cartaUnicaDeClase(clase);
    check(u.rareza === 'especial' && u.clase === clase, `${clase}: carta única de rareza especial`);
    check(!poolDeClase(clase).includes(u), `${clase}: la única NO aparece en recompensas normales`);
  }

  // Manto de Espinas: 4 / 7
  const manto = DRUIDA.find((c) => c.id === 'espinas')!;
  check(manto.texto.includes('4'), 'Manto de Espinas da 4 de Espinas');

  // Furia Indómita: bloqueo = Fuerza al inicio de turno mientras hay Furia
  const run = nuevaRun('barbaro', 71);
  const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(71), uiSilenciosa);
  await comb.iniciar();
  const j = comb.jugador;
  await comb.contexto().aplicarEstado(j, 'furiaIndomita', 1);
  await comb.contexto().ganarFuria(5); // +5 Fuerza de Furia
  comb.enemigos[0].intencion = { nombre: 'Puñalada', intencion: 'ataque', dano: 3 };
  await comb.terminarTurno(); // pasa al turno 2
  check(j.bloqueo >= 5, 'Furia Indómita: gana bloqueo igual a su Fuerza al inicio del turno');
  check(j.furiaFuerza > 0, 'la Furia aguanta tras bloquear con poco bloqueo restante');

  // Maestría de Conjuros: añade un Proyectil Mágico cada turno
  const runM = nuevaRun('mago', 72);
  const combM = new Combate(runM, [GOBLIN_CORTADOR], crearRng(72), uiSilenciosa);
  await combM.iniciar();
  combM.jugador.estados.maestria = 1;
  combM.enemigos[0].intencion = { nombre: 'x', intencion: 'defensa', bloqueo: 1 };
  await combM.terminarTurno();
  check(
    combM.jugador.mano.filter((c) => c.def.id === 'proyectil-magico').length >= 1,
    'Maestría: añade un Proyectil Mágico a la mano cada turno',
  );

  // Magic Missile: every cast makes every Magic Missile deal +1 damage per missile
  {
    const run = nuevaRun('mago', 73);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(73), uiSilenciosa);
    await comb.iniciar();
    const e = comb.enemigos[0];
    const pm = MAGO.find((c) => c.id === 'proyectil-magico')!;
    const lanzar = async (mejorada = false) => {
      const inst = instanciar(pm);
      inst.mejorada = mejorada;
      comb.jugador.mano.push(inst);
      comb.jugador.energia = 10;
      e.pv = 500; e.pvMax = 500; e.bloqueo = 5;
      const pv0 = e.pv;
      await comb.jugarCarta(inst, e);
      return pv0 - e.pv;
    };
    check(await lanzar() === 6, 'Proyectil Mágico: 3 proyectiles de 2 que ignoran el bloqueo');
    check((comb.jugador.estados.proyectilCarga ?? 0) === 1, 'Proyectil Mágico: cada lanzamiento suma +1 de daño a los proyectiles');
    check(await lanzar() === 9, 'Proyectil Mágico: el segundo lanzamiento (otra copia) hace 3 de daño por proyectil');
    const vals = comb.valoresDeCarta(pm, e);
    check(vals[0]?.real === 4 && vals[0]?.veces === 3, 'Proyectil Mágico: la carta muestra el daño acumulado (4) por proyectil');
    comb.jugador.estados.maestria = 1;
    const valsM = comb.valoresDeCarta(pm, e);
    check(valsM[0]?.veces === 4 && valsM.find((v) => v.indice === 1)?.real === 4,
      'Maestría de Conjuros: los Proyectiles Mágicos muestran 1 proyectil más');
    check(await lanzar() === 16, 'Maestría de Conjuros: el Proyectil Mágico lanza 4 proyectiles (de 4)');
    check(await lanzar(true) === 25, 'Maestría de Conjuros: el Proyectil Mágico+ lanza 5 proyectiles (de 5)');
  }

  // Acelerar: poder que roba +1 al inicio del turno y se cae al quedarte sin mano
  const acel = MAGO.find((c) => c.id === 'acelerar')!;
  check(acel.tipo === 'poder' && acel.mejora?.innato === true, 'Acelerar es un poder; su mejora es innata');
  const runA = nuevaRun('mago', 73);
  const combA = new Combate(runA, [GOBLIN_CORTADOR], crearRng(73), uiSilenciosa);
  await combA.iniciar();
  combA.jugador.estados.roboAcelerado = 1;
  combA.enemigos[0].intencion = { nombre: 'x', intencion: 'defensa', bloqueo: 1 };
  await combA.terminarTurno();
  check(combA.jugador.mano.length === 6, 'Acelerar: roba 6 cartas al inicio del turno');
  // vaciar la mano disipa el efecto
  while (combA.jugador.mano.length > 0) {
    combA.jugador.descarte.push(combA.jugador.mano.pop()!);
    if (combA.jugador.mano.length === 0) {
      // simula el chequeo de jugarCarta vaciando la mano mediante una carta jugada
    }
  }
  // forzar el chequeo jugando una carta cuando la mano queda vacía
  const truco = instanciar(MAGO.find((c) => c.id === 'truco-magia')!);
  combA.jugador.mano = [truco];
  combA.jugador.mazo = []; // sin nada que robar → la mano quedará vacía
  combA.jugador.descarte = [];
  await combA.jugarCarta(truco);
  check((combA.jugador.estados.roboAcelerado ?? 0) === 0, 'Acelerar se disipa al quedarte sin cartas en la mano');
}

console.log('— Recuperación de conjuros sostenible —');
{
  const recu = MAGO.find((c) => c.id === 'recuperacion-arcana')!;
  // decided again (oct 2026): it exhausts, the price that sets it apart from Arcane Sacrifice (which costs HP)
  check(!!recu.exhumar && /Se agota/.test(recu.texto) && /Se agota/.test(recu.mejora?.texto ?? ''), 'Recuperación Arcana se agota (como contrapartida a Sacrificio Arcano)');
  const marea = MAGO.find((c) => c.id === 'marea-arcana')!;
  check(!!marea && !marea.exhumar, 'Marea Arcana existe y no se agota');
  const run = nuevaRun('mago', 60);
  run.espaciosConjuro = 3; // pirámide [2×N1, 1×N2]
  const combate = new Combate(run, [GOBLIN_CORTADOR], crearRng(60), uiSilenciosa);
  await combate.iniciar();
  const ctx = combate.contexto();
  await ctx.gastarConjuro(1);
  await ctx.gastarConjuro(1);
  await ctx.gastarConjuro(1);
  check(ctx.conjurosLibres() === 0, 'tres espacios gastados');
  const inst = instanciar(marea);
  combate.jugador.mano.push(inst);
  await combate.jugarCarta(inst);
  check(ctx.conjurosLibres() === 2, 'Marea Arcana recupera 2 espacios');
  check(combate.jugador.descarte.includes(inst), 'Marea Arcana va al descarte (reutilizable)');
  const estrang = DRUIDA.find((c) => c.id === 'raices-estranguladoras')!;
  check(estrang.coste === 2, 'Raíces Estranguladoras cuesta 2 de maná');
}

console.log('— Avance de capítulo —');
{
  const run = nuevaRun('druida', 123);
  const pvAntes = (run.pv = 30);
  avanzarCapitulo(run, crearRng(123));
  check(run.capitulo === 1, 'el capítulo avanza');
  check(run.nodoActual === -1 && run.mapa.length > 0, 'nuevo mapa generado');
  check(run.pv > pvAntes, 'cura parcial entre capítulos');
}

console.log('— Escenarios alternativos: jefes y estados nuevos —');
{
  // Heraldo del Culto: al morir libera al Demonio Mayor (fase 2)
  const run = nuevaRun('barbaro', 2026);
  const comb = new Combate(run, [HERALDO_CULTO], crearRng(2026), uiSilenciosa);
  await comb.iniciar();
  const heraldo = comb.enemigos[0];
  await comb.contexto(heraldo).danar(heraldo, 999);
  check(!heraldo.vivo, 'el Heraldo del Culto muere');
  check(comb.terminado === null, 'el combate NO termina: aún queda su demonio');
  check(
    comb.enemigos.some((e) => e.vivo && e.def.id === 'demonio-mayor'),
    'al morir libera al Demonio Mayor',
  );

  // Veneno: pierde PV al inicio del turno y baja 1
  const run2 = nuevaRun('mago', 2027);
  const comb2 = new Combate(run2, [GOBLIN_CORTADOR], crearRng(2027), uiSilenciosa);
  await comb2.iniciar();
  comb2.jugador.estados.veneno = 3;
  comb2.jugador.pv = comb2.jugador.pvMax;
  const pvAntes = comb2.jugador.pv;
  comb2.jugador.bloqueo = 999;
  comb2.enemigos[0].intencion = { nombre: 'x', intencion: 'defensa', bloqueo: 1 };
  await comb2.terminarTurno(); // pasa al turno 2: tica el veneno
  check(comb2.jugador.pv === pvAntes - 3, 'el Veneno hace 3 de daño al inicio del turno');
  check((comb2.jugador.estados.veneno ?? 0) === 2, 'el Veneno baja 1 por turno');

  // Contemplador: invoca 2 Observadores en su primer turno
  const run3 = nuevaRun('druida', 2028);
  const comb3 = new Combate(run3, [CONTEMPLADOR], crearRng(2028), uiSilenciosa);
  await comb3.iniciar();
  check(comb3.enemigos[0].intencion.invocar !== undefined, 'el Contemplador abre invocando Observadores');
  comb3.jugador.bloqueo = 999;
  await comb3.terminarTurno();
  check(
    comb3.enemigos.filter((e) => e.def.id === 'observador').length === 2,
    'invoca 2 Observadores',
  );

  // Sobrecarga (Rayo Carmesí): las cartas cuestan +1 este turno
  const run4 = nuevaRun('mago', 2029);
  const comb4 = new Combate(run4, [GOBLIN_CORTADOR], crearRng(2029), uiSilenciosa);
  await comb4.iniciar();
  const carta = comb4.jugador.mano[0];
  const costeBase = comb4.costeEfectivo(carta.def);
  comb4.jugador.estados.cartasSobrecoste = 1;
  check(comb4.costeEfectivo(carta.def) === costeBase + 1, 'Sobrecarga: la carta cuesta +1');
}

console.log('— Pícaro: mecánicas nuevas —');
{
  // Acrobacias (pirueta): el bloqueo de esa carta se reaplica el turno siguiente (1 turno)
  {
    const run = nuevaRun('picaro', 4001);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(4001), uiSilenciosa);
    await comb.iniciar();
    comb.jugador.estados.destreza = 0; // números limpios
    const defender = () => { comb.enemigos[0].intencion = { nombre: 'Cubrirse', intencion: 'defensa', bloqueo: 4 }; };
    await comb.contexto().ganarBloqueoAcrobatico(14);
    check(comb.jugador.bloqueo === 14, 'Acrobacias: 14 de bloqueo este turno');
    check((comb.jugador.estados.acrobacias ?? 0) === 14, 'el indicador muestra 14 de bloqueo aplazado');
    defender(); await comb.terminarTurno();
    check(comb.jugador.bloqueo === 14, 'Acrobacias: 14 de bloqueo también el turno siguiente');
    check((comb.jugador.estados.acrobacias ?? 0) === 0, 'ya no queda bloqueo aplazado (solo 1 turno)');
    defender(); await comb.terminarTurno();
    check(comb.jugador.bloqueo === 0, 'y al turno siguiente el bloqueo ya no vuelve');
  }
  // Sin Acrobacias el bloqueo se limpia
  {
    const run = nuevaRun('picaro', 4002);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(4002), uiSilenciosa);
    await comb.iniciar();
    comb.jugador.bloqueo = 12;
    comb.enemigos[0].intencion = { nombre: 'Cubrirse', intencion: 'defensa', bloqueo: 4 };
    await comb.terminarTurno();
    check(comb.jugador.bloqueo === 0, 'sin Acrobacias el bloqueo se limpia al inicio del turno');
  }
  // Veneno sobre el enemigo: pierde PV al inicio de SU turno y baja 1
  {
    const run = nuevaRun('picaro', 4003);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(4003), uiSilenciosa);
    await comb.iniciar();
    const e = comb.enemigos[0];
    e.pv = e.pvMax = 40; e.bloqueo = 5;
    e.estados.veneno = 5;
    e.intencion = { nombre: 'Cubrirse', intencion: 'defensa', bloqueo: 4 };
    await comb.terminarTurno();
    check(40 - e.pv === 5, 'el Veneno hace 5 de daño al enemigo (ignora bloqueo)');
    check((e.estados.veneno ?? 0) === 4, 'el Veneno del enemigo baja 1 por turno');
  }
  // Filo Venenoso (Asesino): cada ataque envenena al objetivo
  {
    const run = nuevaRun('picaro', 4004);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(4004), uiSilenciosa);
    await comb.iniciar();
    const e = comb.enemigos[0];
    e.pv = e.pvMax = 40;
    comb.jugador.estados.filoVenenoso = 3;
    await comb.contexto(e).atacar(e, 5);
    check((e.estados.veneno ?? 0) === 3, 'Filo Venenoso: el ataque aplica 3 de Veneno');
  }
  // Preparación + descartar: gana bloqueo por cada descarte y cuenta el descarte
  {
    const run = nuevaRun('picaro', 4005);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(4005), uiSilenciosa);
    await comb.iniciar();
    comb.jugador.bloqueo = 0;
    comb.jugador.estados.preparacion = 3;
    const antes = comb.jugador.mano.length;
    const n = await comb.contexto().descartar(2);
    check(n === 2, 'descartar(2) descarta 2 cartas');
    check(comb.jugador.mano.length === antes - 2, 'la mano pierde 2 cartas');
    check(comb.jugador.bloqueo === 6, 'Preparación: +3 de bloqueo por cada descarte');
    check(comb.descartadasEsteTurno === 2, 'se contabilizan 2 descartes este turno');
  }
  // Dagas: crearDagas añade Dagas y su daño crece con dagasFuerza
  {
    const run = nuevaRun('picaro', 4006);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(4006), uiSilenciosa);
    await comb.iniciar();
    comb.jugador.mano = []; // sitio de sobra
    await comb.contexto().crearDagas(3);
    const dagas = comb.jugador.mano.filter((c) => c.def.id === 'daga');
    check(dagas.length === 3, 'crearDagas(3) añade 3 Dagas a la mano');
    check(dagas[0].def.coste === 0, 'las Dagas cuestan 0 y se agotan');
    const e = comb.enemigos[0]; e.pv = e.pvMax = 40; e.bloqueo = 0;
    comb.jugador.estados.dagasFuerza = 5;
    comb.jugador.estados.destreza = 0;
    await dagas[0].def.jugar(comb.contexto(e));
    check(40 - e.pv === 9, 'la Daga inflige 4 + 5 (Maestría con Cuchillas) = 9');
    // Danza Mortal: las Dagas hacen daño extra igual a la Destreza
    e.pv = e.pvMax = 40; e.bloqueo = 0;
    comb.jugador.estados.dagasFuerza = 0;
    comb.jugador.estados.destreza = 6;
    comb.jugador.estados.dagasDestreza = 1;
    await dagas[1].def.jugar(comb.contexto(e));
    check(40 - e.pv === 10, 'Danza Mortal: la Daga inflige 4 + 6 (Destreza) = 10');
  }
  // Cambiazo: intercambia la intención actual por la del turno siguiente
  {
    const run = nuevaRun('picaro', 4007);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(4007), uiSilenciosa);
    await comb.iniciar();
    const e = comb.enemigos[0];
    const original = e.intencion;
    await comb.contexto(e).intercambiarIntencion(e);
    check(e.intencionForzada === original, 'Cambiazo guarda la intención original para después');
    check(e.intencion !== original, 'Cambiazo cambia la intención de este turno');
    check(comb.noPretendeAtacar(e), 'Cambiazo garantiza que este turno no atacará');
  }
  // Cambiazo contra un enemigo que solo sabe atacar: se queda desconcertado
  {
    const run = nuevaRun('picaro', 4107);
    const comb = new Combate(run, [GOBLIN_FAMELICO], crearRng(4107), uiSilenciosa);
    await comb.iniciar();
    const e = comb.enemigos[0];
    const pvAntes = comb.jugador.pv;
    await comb.contexto(e).intercambiarIntencion(e);
    check(e.saltaAccion === true, 'Cambiazo: si solo ataca, se queda desconcertado');
    check(comb.noPretendeAtacar(e), 'desconcertado cuenta como «no pretende atacar»');
    await comb.terminarTurno();
    check(comb.jugador.pv === pvAntes, 'el enemigo desconcertado no actúa este turno');
  }
  // Ataque furtivo (Emboscada): daño extra si el enemigo no pretende atacar
  {
    const emboscada = PICARO.find((c) => c.id === 'emboscada')!;
    const run = nuevaRun('picaro', 4008);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(4008), uiSilenciosa);
    await comb.iniciar();
    const e = comb.enemigos[0]; e.pv = e.pvMax = 60; e.bloqueo = 0;
    e.intencion = { nombre: 'Cubrirse', intencion: 'defensa', bloqueo: 4 };
    await emboscada.jugar(comb.contexto(e));
    check(60 - e.pv === 31, 'Emboscada: 13 + 18 = 31 si el enemigo no ataca');
    const e2 = comb.enemigos[0]; e2.pv = e2.pvMax = 60; e2.bloqueo = 0;
    e2.intencion = { nombre: 'Tajo', intencion: 'ataque', dano: 8 };
    await emboscada.jugar(comb.contexto(e2));
    check(60 - e2.pv === 13, 'Emboscada: solo 13 si el enemigo sí ataca');
  }
  // Trabajo de Pies: poder con 2 de Destreza fijos (se agota, no escala por turno)
  {
    const tdp = PICARO.find((c) => c.id === 'trabajo-de-pies')!;
    check(tdp.tipo === 'poder', 'Trabajo de Pies es un poder');
    const run = nuevaRun('picaro', 4110);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(4110), uiSilenciosa);
    await comb.iniciar();
    comb.jugador.estados.destreza = 0;
    await tdp.jugar(comb.contexto());
    check((comb.jugador.estados.destreza ?? 0) === 2, 'Trabajo de Pies: +2 de Destreza al jugarlo');
    check(tdp.mejora!.texto.includes('3 de Destreza'), 'Trabajo de Pies+ da 3 de Destreza');
    comb.enemigos[0].intencion = { nombre: 'Cubrirse', intencion: 'defensa', bloqueo: 4 };
    await comb.terminarTurno();
    check((comb.jugador.estados.destreza ?? 0) === 2, 'la Destreza se mantiene, no crece cada turno');
  }
  // Guardia de Cuchillas: bloqueo por cada Daga jugada
  {
    const guardia = PICARO.find((c) => c.id === 'guardia-de-cuchillas')!;
    const run = nuevaRun('picaro', 4111);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(4111), uiSilenciosa);
    await comb.iniciar();
    comb.jugador.estados.destreza = 0;
    comb.jugador.bloqueo = 0;
    await guardia.jugar(comb.contexto());
    check(comb.jugador.bloqueo === 0, 'Guardia de Cuchillas no da bloqueo al jugarse');
    comb.jugador.mano = [];
    await comb.contexto().crearDagas(2);
    const dagas = comb.jugador.mano.filter((c) => c.def.id === 'daga');
    await comb.jugarCarta(dagas[0], comb.enemigos[0]);
    check(comb.jugador.bloqueo === 3, 'Guardia de Cuchillas: +3 de bloqueo al jugar una Daga');
    await comb.jugarCarta(dagas[1], comb.enemigos[0]);
    check(comb.jugador.bloqueo === 6, 'Guardia de Cuchillas: cada Daga suma su bloqueo');
  }
  // Lluvia de Dagas: genera 3 Dagas
  {
    const lluvia = PICARO.find((c) => c.id === 'lluvia-de-dagas')!;
    const run = nuevaRun('picaro', 4112);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(4112), uiSilenciosa);
    await comb.iniciar();
    comb.jugador.mano = [];
    await lluvia.jugar(comb.contexto());
    check(comb.jugador.mano.filter((c) => c.def.id === 'daga').length === 3, 'Lluvia de Dagas añade 3 Dagas');
  }
  // Nube Nauseabunda: envenena a todos y detona el Veneno al instante
  {
    const nube = PICARO.find((c) => c.id === 'nube-nauseabunda')!;
    const run = nuevaRun('picaro', 4113);
    const comb = new Combate(run, [GOBLIN_CORTADOR, GOBLIN_ARQUERO], crearRng(4113), uiSilenciosa);
    await comb.iniciar();
    const [a, b] = comb.enemigos;
    a.pv = a.pvMax = 60; a.bloqueo = 10; a.estados.veneno = 3;
    b.pv = b.pvMax = 60; b.bloqueo = 0;
    await nube.jugar(comb.contexto());
    check(60 - a.pv === 7, 'Nube Nauseabunda: 3 + 4 de Veneno detonan 7 (ignora el bloqueo)');
    check(a.bloqueo === 10, 'el Veneno detonado no gasta el bloqueo del enemigo');
    check((a.estados.veneno ?? 0) === 6, 'tras detonar, el Veneno baja 1 (7 → 6)');
    check(60 - b.pv === 4, 'Nube Nauseabunda envenena y detona también al segundo enemigo');
  }
  // Golpe Séptico: daño extra igual al Veneno del objetivo
  {
    const septico = PICARO.find((c) => c.id === 'golpe-septico')!;
    const run = nuevaRun('picaro', 4114);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(4114), uiSilenciosa);
    await comb.iniciar();
    const e = comb.enemigos[0]; e.pv = e.pvMax = 60; e.bloqueo = 0;
    e.estados.veneno = 8;
    await septico.jugar(comb.contexto(e));
    check(60 - e.pv === 13, 'Golpe Séptico: 5 + 8 de Veneno = 13');
  }
  // Toxina Paralizante: dobla el Veneno si el enemigo no pretende atacar
  {
    const toxina = PICARO.find((c) => c.id === 'toxina-paralizante')!;
    const run = nuevaRun('picaro', 4115);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(4115), uiSilenciosa);
    await comb.iniciar();
    const e = comb.enemigos[0];
    e.intencion = { nombre: 'Tajo', intencion: 'ataque', dano: 8 };
    await toxina.jugar(comb.contexto(e));
    check((e.estados.veneno ?? 0) === 5, 'Toxina Paralizante: 5 de Veneno si el enemigo ataca');
    delete e.estados.veneno;
    e.intencion = { nombre: 'Cubrirse', intencion: 'defensa', bloqueo: 4 };
    await toxina.jugar(comb.contexto(e));
    check((e.estados.veneno ?? 0) === 10, 'Toxina Paralizante: 10 de Veneno si no pretende atacar');
  }
  // Oportunista: daño extra por golpe contra quien no pretende atacar
  {
    const oportunista = PICARO.find((c) => c.id === 'oportunista')!;
    const cuchilladas = PICARO.find((c) => c.id === 'cuchilladas')!;
    const run = nuevaRun('picaro', 4116);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(4116), uiSilenciosa);
    await comb.iniciar();
    await oportunista.jugar(comb.contexto());
    const e = comb.enemigos[0]; e.pv = e.pvMax = 90; e.bloqueo = 0;
    e.intencion = { nombre: 'Cubrirse', intencion: 'defensa', bloqueo: 4 };
    await cuchilladas.jugar(comb.contexto(e));
    check(90 - e.pv === 18, 'Oportunista: Cuchilladas hace (3+3)×3 = 18 si el enemigo no ataca');
    e.pv = e.pvMax = 90; e.bloqueo = 0;
    e.intencion = { nombre: 'Tajo', intencion: 'ataque', dano: 8 };
    await cuchilladas.jugar(comb.contexto(e));
    check(90 - e.pv === 9, 'Oportunista: solo 3×3 = 9 si el enemigo sí ataca');
  }
  // Bug corregido: los poderes de «inicio de turno» no se aplican al jugarse
  {
    const psionico = PICARO.find((c) => c.id === 'psionico')!;
    const run = nuevaRun('picaro', 4117);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(4117), uiSilenciosa);
    await comb.iniciar();
    comb.jugador.mano = [];
    await psionico.jugar(comb.contexto());
    check(comb.jugador.mano.length === 0, 'Alma de Cuchillas no crea Dagas el turno que la juegas');
    comb.enemigos[0].intencion = { nombre: 'Cubrirse', intencion: 'defensa', bloqueo: 4 };
    await comb.terminarTurno();
    check(
      comb.jugador.mano.filter((c) => c.def.id === 'daga').length === 1,
      'Alma de Cuchillas crea 1 Daga al inicio del turno siguiente',
    );
  }
  {
    const tratado = MAGO.find((c) => c.id === 'tratado-prohibido')!;
    const run = nuevaRun('mago', 4118);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(4118), uiSilenciosa);
    await comb.iniciar();
    await tratado.jugar(comb.contexto());
    check(comb.jugador.conjuroEscrito === 0, 'Tratado Prohibido no escribe el turno que lo juegas');
    comb.enemigos[0].intencion = { nombre: 'Cubrirse', intencion: 'defensa', bloqueo: 4 };
    await comb.terminarTurno();
    check(comb.jugador.conjuroEscrito === 4, 'Tratado Prohibido escribe 4 al inicio del turno siguiente');
    const mejor = instanciar(tratado);
    mejor.mejorada = true;
    await defDe(mejor).jugar(comb.contexto());
    comb.enemigos[0].intencion = { nombre: 'Cubrirse', intencion: 'defensa', bloqueo: 4 };
    await comb.terminarTurno();
    check(comb.jugador.conjuroEscrito === 4 + 4 + 7, 'Tratado Prohibido+ escribe 7 cada turno');
  }
}

console.log('— Brujo: mecánicas nuevas —');
{
  const carta = (id: string) => BRUJO.find((c) => c.id === id)!;
  const defender = (comb: Combate) => {
    comb.enemigos.filter((e) => e.vivo).forEach((e) => {
      e.intencion = { nombre: 'Cubrirse', intencion: 'defensa', bloqueo: 4 };
    });
  };
  /** Borra la Oscuridad que deja puesta el Sello del Pacto (reliquia inicial),
   *  para medir solo lo que aporta la carta bajo prueba. */
  const sinOscuridad = (comb: Combate) => {
    comb.enemigos.forEach((e) => { delete e.estados.oscuridad; });
  };

  // Sello del Pacto: la reliquia inicial del brujo oscurece de entrada
  {
    const run = nuevaRun('brujo', 5000);
    check(run.reliquias[0].id === 'sello-pacto', 'el brujo arranca con el Sello del Pacto');
    const comb = new Combate(run, [GOBLIN_CORTADOR, GOBLIN_ARQUERO], crearRng(5000), uiSilenciosa);
    await comb.iniciar();
    check(comb.enemigos.every((e) => (e.estados.oscuridad ?? 0) === 2),
      'Sello del Pacto: 2 de Oscuridad a todos al empezar el combate');
    check(comb.enemigos.every((e) => (e.estados.condena ?? 0) === 0),
      'y ya no reparte Condena (Diezmo de Sangre no está siempre activo)');
  }

  // Explosión Sobrenatural: vuelve a lo alto del mazo, no al descarte
  {
    const run = nuevaRun('brujo', 5001);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(5001), uiSilenciosa);
    await comb.iniciar();
    const exp = comb.jugador.mazo.concat(comb.jugador.mano)
      .find((c) => c.def.id === 'explosion-sobrenatural')!;
    check(!!exp, 'el mazo inicial del brujo trae la Explosión Sobrenatural');
    // la ponemos en la mano a mano para jugarla
    comb.jugador.mazo = comb.jugador.mazo.filter((c) => c.uid !== exp.uid);
    comb.jugador.mano = [exp];
    const e = comb.enemigos[0]; e.pv = e.pvMax = 60; e.bloqueo = 0;
    const descarteAntes = comb.jugador.descarte.length;
    await comb.jugarCarta(exp, e);
    check(60 - e.pv === 7, 'la Explosión inflige 7 de daño base');
    check(comb.jugador.descarte.length === descarteAntes, 'no va al descarte');
    check(comb.jugador.mazo[comb.jugador.mazo.length - 1].uid === exp.uid,
      'la Explosión vuelve a lo alto del mazo de robo');
  }

  // Si NO la juegas, se descarta como cualquier otra carta (no se queda arriba)
  {
    const run = nuevaRun('brujo', 5017);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(5017), uiSilenciosa);
    await comb.iniciar();
    const exp = instanciar(carta('explosion-sobrenatural'));
    comb.jugador.mano = [exp];
    defender(comb);
    await comb.terminarTurno();
    check(comb.jugador.descarte.some((c) => c.uid === exp.uid),
      'la Explosión que no juegas acaba en el descarte');
    check(!comb.jugador.mazo.some((c) => c.uid === exp.uid), 'y no se queda en el mazo');
  }

  // El Rayo Áureo del Contemplador no se la lleva por delante
  {
    const run = nuevaRun('brujo', 5002);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(5002), uiSilenciosa);
    await comb.iniciar();
    const exp = instanciar(carta('explosion-sobrenatural'));
    comb.jugador.mano = [exp];
    comb.jugador.estados.cartasAgotan = 1;
    await comb.jugarCarta(exp, comb.enemigos[0]);
    check(comb.jugador.agotadas.every((c) => c.uid !== exp.uid),
      'con cartasAgotan activo la Explosión NO se agota');
    check(comb.jugador.mazo.some((c) => c.uid === exp.uid), 'sigue volviendo al mazo');
  }

  // Mejoras de la Explosión: permanentes, de un turno, área y golpes extra
  {
    const run = nuevaRun('brujo', 5003);
    const comb = new Combate(run, [GOBLIN_CORTADOR, GOBLIN_ARQUERO], crearRng(5003), uiSilenciosa);
    await comb.iniciar();
    const exp = carta('explosion-sobrenatural');
    const [a, b] = comb.enemigos;
    a.pv = a.pvMax = 200; a.bloqueo = 0;
    b.pv = b.pvMax = 200; b.bloqueo = 0;

    comb.jugador.estados.explosionFuerza = 3; // Verbo Agonizante
    await exp.jugar(comb.contexto(a));
    check(200 - a.pv === 10, 'Verbo Agonizante: 7 + 3 = 10');

    a.pv = 200;
    comb.jugador.estados.explosionTurno = 5; // Canalizar el Pacto
    await exp.jugar(comb.contexto(a));
    check(200 - a.pv === 15, 'con mejora de turno: 7 + 3 + 5 = 15');

    a.pv = 200;
    comb.jugador.estados.explosionVeces = 1; // Haz Desdoblado
    await exp.jugar(comb.contexto(a));
    check(200 - a.pv === 30, 'Haz Desdoblado: golpea dos veces (15 + 15)');

    a.pv = 200; b.pv = 200;
    delete comb.jugador.estados.explosionVeces;
    comb.jugador.estados.explosionArea = 1; // Explosión Trifurcada
    await exp.jugar(comb.contexto(a));
    check(200 - a.pv === 15 && 200 - b.pv === 15, 'Explosión Trifurcada: golpea a todos');

    // la mejora de un turno se limpia al acabar el turno; la permanente no
    defender(comb);
    await comb.terminarTurno();
    check((comb.jugador.estados.explosionTurno ?? 0) === 0, 'la mejora de un turno se disipa');
    check((comb.jugador.estados.explosionFuerza ?? 0) === 3, 'la mejora permanente se queda');
  }

  // Armadura de Agathys: el daño bloqueado rebota a TODOS los enemigos
  {
    const run = nuevaRun('brujo', 5004);
    const comb = new Combate(run, [GOBLIN_CORTADOR, GOBLIN_ARQUERO], crearRng(5004), uiSilenciosa);
    await comb.iniciar();
    const [a, b] = comb.enemigos;
    a.pv = a.pvMax = 60; b.pv = b.pvMax = 60;
    comb.jugador.mano = [];
    comb.jugador.bloqueo = 0;
    sinOscuridad(comb); // si no, la reliquia rebaja el golpe enemigo
    await carta('armadura-agathys').jugar(comb.contexto());
    check(comb.jugador.bloqueo === 8, 'Armadura de Agathys da 8 de bloqueo');
    check((comb.jugador.estados.agathys ?? 0) === 1, 'y arma el rebote este turno');
    // un solo golpe enemigo de 5: lo absorbe el bloqueo y rebota a los dos
    a.intencion = { nombre: 'Puñalada', intencion: 'ataque', dano: 5 };
    b.intencion = { nombre: 'Esperar', intencion: 'mejora' }; // sin bloqueo propio
    b.bloqueo = 0;
    await comb.terminarTurno();
    check(60 - a.pv === 5, 'el atacante recibe de vuelta los 5 que bloqueaste');
    check(60 - b.pv === 0, 'y el otro enemigo no (la Armadura solo castiga a quien te golpea)');
    check((comb.jugador.estados.agathys ?? 0) === 0, 'Agathys solo dura ese turno');
  }
  // Blindaje Infernal (coste 2): the blocked damage still bounces to EVERY enemy
  {
    const run = nuevaRun('brujo', 5006);
    const comb = new Combate(run, [GOBLIN_CORTADOR, GOBLIN_ARQUERO], crearRng(5006), uiSilenciosa);
    await comb.iniciar();
    const [a, b] = comb.enemigos;
    a.pv = a.pvMax = 60; b.pv = b.pvMax = 60;
    comb.jugador.mano = [];
    comb.jugador.bloqueo = 0;
    sinOscuridad(comb);
    const blindaje = carta('blindaje-infernal');
    check(blindaje.coste === 2 && /TODOS/.test(blindaje.texto), 'Blindaje Infernal cuesta 2 y rebota a TODOS');
    await blindaje.jugar(comb.contexto());
    a.intencion = { nombre: 'Puñalada', intencion: 'ataque', dano: 5 };
    b.intencion = { nombre: 'Esperar', intencion: 'mejora' };
    b.bloqueo = 0;
    await comb.terminarTurno();
    check(60 - a.pv === 5 && 60 - b.pv === 5, 'Blindaje Infernal: el daño bloqueado rebota a todos los enemigos');
    check(!comb.jugador.estados.agathysArea, 'y también dura solo ese turno');
    check(!/TODOS/.test(carta('armadura-agathys').texto) && /te ataca|te golpea/.test(carta('armadura-agathys').texto),
      'el texto de la Armadura de Agathys dice que el daño vuelve a quien te golpea');
  }

  // Condena: mata al final del turno enemigo cuando iguala sus PV actuales
  {
    const run = nuevaRun('brujo', 5005);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(5005), uiSilenciosa);
    await comb.iniciar();
    const e = comb.enemigos[0];
    e.pv = e.pvMax = 20;
    await comb.contexto().aplicarEstado(e, 'condena', 19);
    check(!comb.condenaLetal(e), '19 de Condena sobre 20 PV todavía no es letal');
    defender(comb);
    await comb.terminarTurno();
    check(e.vivo, 'con Condena por debajo de sus PV sobrevive');
    await comb.contexto().aplicarEstado(e, 'condena', 1);
    check(comb.condenaLetal(e), '20 de Condena sobre 20 PV ya es letal');
    defender(comb);
    await comb.terminarTurno();
    check(!e.vivo, 'la Condena lo remata al final de su turno');
    check(comb.terminado === 'victoria', 'y el combate se cierra con victoria');
  }

  // La Condena no decae y se alcanza también bajando los PV del enemigo
  {
    const run = nuevaRun('brujo', 5006);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(5006), uiSilenciosa);
    await comb.iniciar();
    const e = comb.enemigos[0];
    e.pv = e.pvMax = 40; e.bloqueo = 0;
    await comb.contexto().aplicarEstado(e, 'condena', 12);
    defender(comb);
    await comb.terminarTurno();
    check((e.estados.condena ?? 0) === 12, 'la Condena no baja con el tiempo');
    e.bloqueo = 0; // se cubrió en su turno: le quitamos el bloqueo para medir limpio
    await comb.contexto().atacar(e, 30); // lo dejamos en 10 PV
    check(e.pv === 10 && comb.condenaLetal(e), 'bajarle los PV por debajo de la Condena la vuelve letal');
  }

  // Brazos de Hadar: Condena y Débil a todos
  {
    const run = nuevaRun('brujo', 5007);
    const comb = new Combate(run, [GOBLIN_CORTADOR, GOBLIN_ARQUERO], crearRng(5007), uiSilenciosa);
    await comb.iniciar();
    await carta('brazos-hadar').jugar(comb.contexto());
    check(comb.enemigos.every((e) => (e.estados.condena ?? 0) === 6), 'Brazos de Hadar: 6 de Condena a todos');
    check(comb.enemigos.every((e) => (e.estados.debil ?? 0) === 1), 'Brazos de Hadar: 1 de Débil a todos');
  }

  // Oscuridad: baja el ataque de todos y se suma a las Raíces
  {
    const run = nuevaRun('brujo', 5008);
    const comb = new Combate(run, [GOBLIN_CORTADOR, GOBLIN_ARQUERO], crearRng(5008), uiSilenciosa);
    await comb.iniciar();
    const e = comb.enemigos[0];
    sinOscuridad(comb);
    e.intencion = { nombre: 'Puñalada', intencion: 'ataque', dano: 10 };
    check(comb.danoIntencion(e) === 10, 'sin Oscuridad el ataque es de 10');
    await carta('oscuridad').jugar(comb.contexto());
    check(comb.enemigos.every((x) => (x.estados.oscuridad ?? 0) === 3), 'Oscuridad: 3 a todos');
    check(comb.danoIntencion(e) === 7, 'la Oscuridad le resta 3 al ataque');
    defender(comb);
    await comb.terminarTurno();
    check((e.estados.oscuridad ?? 0) === 2, 'la Oscuridad baja 1 por turno');
    defender(comb);
    await comb.terminarTurno();
    defender(comb);
    await comb.terminarTurno();
    check((e.estados.oscuridad ?? 0) === 0, 'y se agota al tercer turno');
  }

  // Invocación efímera: absorbe daño, golpea si sobrevive y se desvanece
  {
    const run = nuevaRun('brujo', 5009);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(5009), uiSilenciosa);
    await comb.iniciar();
    const e = comb.enemigos[0];
    e.pv = e.pvMax = 60; e.bloqueo = 0;
    await carta('invocacion-sobrenatural').jugar(comb.contexto());
    check(comb.jugador.invocacion?.vida === 12, 'Invocación Sobrenatural: 12 de vida');
    check(comb.jugador.invocacion?.efimera === true, 'es efímera');
    check(comb.jugador.invocacion?.condena === 6, 'y su golpe aplica 6 de Condena');
    e.intencion = { nombre: 'Puñalada', intencion: 'ataque', dano: 7 };
    const pvAntes = comb.jugador.pv;
    await comb.terminarTurno();
    check(comb.jugador.pv === pvAntes, 'la invocación absorbe el golpe: el brujo no pierde PV');
    check(60 - e.pv === 9, 'sobrevive y golpea por 9');
    check((e.estados.condena ?? 0) === 6, 'su golpe deja 6 de Condena');
    check(comb.jugador.invocacion === undefined, 'y se desvanece al acabar la ronda');
  }

  // Si la matan, no llega a atacar
  {
    const run = nuevaRun('brujo', 5010);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(5010), uiSilenciosa);
    await comb.iniciar();
    const e = comb.enemigos[0];
    e.pv = e.pvMax = 60; e.bloqueo = 0;
    await carta('sabueso-sombra').jugar(comb.contexto()); // 7 de vida
    e.intencion = { nombre: 'Mazazo', intencion: 'ataque', dano: 40 };
    await comb.terminarTurno();
    check(comb.jugador.invocacion === undefined, 'la invocación muere al recibir 40');
    check(e.pv === 60, 'y no llega a devolver el golpe');
  }

  // Sacrificio del Familiar: convierte la vida restante en daño
  {
    const run = nuevaRun('brujo', 5011);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(5011), uiSilenciosa);
    await comb.iniciar();
    const e = comb.enemigos[0];
    e.pv = e.pvMax = 60; e.bloqueo = 0;
    await carta('sabueso-sombra').jugar(comb.contexto()); // 8 de vida
    const energiaAntes = comb.jugador.energia;
    await carta('sacrificio-familiar').jugar(comb.contexto(e));
    check(60 - e.pv === 16, 'Sacrificio del Familiar inflige el doble de la vida que le quedaba (8 → 16)');
    check(comb.jugador.invocacion === undefined, 'la invocación desaparece');
    check(comb.jugador.energia === energiaAntes + 1, 'y devuelve 1 de energía');
    e.pv = 60;
    await carta('sabueso-sombra').jugar(comb.contexto());
    await carta('sacrificio-familiar').mejora!.jugar!(comb.contexto(e));
    check(60 - e.pv === 16 && (e.estados.condena ?? 0) >= 8, 'Sacrificio del Familiar+: el doble de daño y Condena igual a su vida');
    check(/doble/.test(carta('sacrificio-familiar').texto) && /doble/.test(carta('sacrificio-familiar').mejora!.texto!), 'el texto dice que inflige el doble');
  }

  // Mente del Gran Antiguo: cada ataque condena
  {
    const run = nuevaRun('brujo', 5012);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(5012), uiSilenciosa);
    await comb.iniciar();
    const e = comb.enemigos[0];
    e.pv = e.pvMax = 90; e.bloqueo = 0;
    await carta('gran-antiguo').jugar(comb.contexto());
    await comb.contexto().atacar(e, 5);
    check((e.estados.condena ?? 0) === 2, 'Gran Antiguo: el ataque aplica 2 de Condena');
    await comb.contexto().atacar(e, 5, 3);
    check((e.estados.condena ?? 0) === 4, 'un ataque múltiple condena una sola vez');
    // en área también condena, y a todos (Explosión Trifurcada + Gran Antiguo)
    delete e.estados.condena;
    comb.jugador.estados.explosionArea = 1;
    await carta('explosion-sobrenatural').jugar(comb.contexto(e));
    check((e.estados.condena ?? 0) === 2, 'la Explosión en área también aplica Condena');
  }

  // Pacto Infernal: bloqueo por cada muerte enemiga
  {
    const run = nuevaRun('brujo', 5013);
    const comb = new Combate(run, [GOBLIN_CORTADOR, GOBLIN_ARQUERO], crearRng(5013), uiSilenciosa);
    await comb.iniciar();
    await carta('infernal').jugar(comb.contexto());
    comb.jugador.bloqueo = 0;
    const e = comb.enemigos[0];
    e.pv = 4; e.bloqueo = 0;
    await comb.contexto().atacar(e, 30);
    check(!e.vivo, 'el enemigo cae');
    check(comb.jugador.bloqueo === 8, 'Pacto Infernal: +8 de bloqueo por la muerte');
  }

  // Pacto Final: tu bloqueo se convierte en Condena para todos
  {
    const run = nuevaRun('brujo', 5014);
    const comb = new Combate(run, [GOBLIN_CORTADOR, GOBLIN_ARQUERO], crearRng(5014), uiSilenciosa);
    await comb.iniciar();
    await cartaUnicaDeClase('brujo').jugar(comb.contexto());
    comb.jugador.bloqueo = 13;
    comb.enemigos.forEach((e) => { e.pv = e.pvMax = 80; });
    defender(comb);
    await comb.terminarTurno();
    check(comb.enemigos.every((e) => (e.estados.condena ?? 0) === 13),
      'Pacto Final: 13 de bloqueo → 13 de Condena a todos');
  }

  // Presencia Feérica y Bendición Celestial: efectos de inicio de turno
  {
    const run = nuevaRun('brujo', 5015);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(5015), uiSilenciosa);
    await comb.iniciar();
    const e = comb.enemigos[0];
    check(carta('archifata').coste === 3, 'Presencia Feérica cuesta 3');
    check(carta('archifata').mejora!.coste === 2, 'y su mejora la abarata a 2 (la Oscuridad sigue en 2)');
    check(carta('celestial').coste === 3, 'Bendición Celestial cuesta 3');
    sinOscuridad(comb);
    comb.jugador.pv = comb.jugador.pvMax - 20;
    await carta('archifata').jugar(comb.contexto());
    await carta('celestial').jugar(comb.contexto());
    check((e.estados.oscuridad ?? 0) === 0, 'Presencia Feérica no actúa el turno que la juegas');
    check(comb.jugador.bloqueo === 0, 'el bloqueo de Bendición Celestial tampoco');
    check(comb.jugador.pv === comb.jugador.pvMax - 8, 'Bendición Celestial sí cura 12 PV al jugarla');
    defender(comb);
    await comb.terminarTurno();
    check((e.estados.oscuridad ?? 0) === 2, 'Presencia Feérica: 2 de Oscuridad al inicio del turno');
    check(comb.jugador.bloqueo === 6, 'Bendición Celestial: 6 de bloqueo al inicio del turno');
    check(comb.jugador.pv === comb.jugador.pvMax - 8, 'y ya no cura cada turno (nada de rellenar vida)');
  }


  // Don del Patrón: only armour now, the Blast keeps its cost
  {
    const run = nuevaRun('brujo', 5019);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(5019), uiSilenciosa);
    await comb.iniciar();
    const exp = instanciar(carta('explosion-sobrenatural'));
    check(comb.costeEfectivo(exp.def) === 1, 'la Explosión cuesta 1 de partida');
    await carta('don-del-patron').jugar(comb.contexto());
    check(comb.costeEfectivo(exp.def) === 1, 'Don del Patrón: la Explosión sigue costando 1 (ya no la abarata)');
    comb.jugador.estados.cartasSobrecoste = 1;
    check(comb.costeEfectivo(exp.def) === 2, 'con Sobrecarga cuesta 2');
    delete comb.jugador.estados.cartasSobrecoste;
    // and it can no longer be cast without energy
    comb.jugador.mano = [exp];
    comb.jugador.energia = 0;
    const e = comb.enemigos[0]; e.pv = e.pvMax = 60; e.bloqueo = 0;
    await comb.jugarCarta(exp, e);
    check(e.pv === 60, 'con 0 de energía ya no se puede lanzar');
  }

  // Llamada del Vacío: recupera la Explosión de donde esté
  {
    const run = nuevaRun('brujo', 5020);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(5020), uiSilenciosa);
    await comb.iniciar();
    const enMano = comb.jugador.mano.filter((c) => c.def.id === 'explosion-sobrenatural');
    // la dejamos en el descarte para comprobar que la rescata
    comb.jugador.mano = comb.jugador.mano.filter((c) => c.def.id !== 'explosion-sobrenatural');
    const exp = enMano[0]
      ?? comb.jugador.mazo.find((c) => c.def.id === 'explosion-sobrenatural')!;
    comb.jugador.mazo = comb.jugador.mazo.filter((c) => c.uid !== exp.uid);
    comb.jugador.descarte.push(exp);
    await carta('llamada-vacio').jugar(comb.contexto());
    check(comb.jugador.mano.some((c) => c.uid === exp.uid),
      'Llamada del Vacío trae la Explosión del descarte a la mano');
    check((comb.jugador.estados.explosionTurno ?? 0) === 4, 'y le da +4 de daño este turno');
    // si ya está en la mano no la duplica
    await carta('llamada-vacio').jugar(comb.contexto());
    check(comb.jugador.mano.filter((c) => c.def.id === 'explosion-sobrenatural').length === 1,
      'si ya la tienes en la mano no crea una copia');
    // también la rescata de las agotadas (Rayo Espectral del Contemplador)
    comb.jugador.mano = comb.jugador.mano.filter((c) => c.uid !== exp.uid);
    comb.jugador.agotadas.push(exp);
    await carta('llamada-vacio').jugar(comb.contexto());
    check(comb.jugador.mano.some((c) => c.uid === exp.uid), 'y también de las agotadas');
  }

  // Marchitar: pega y aplica Vulnerable (antes curaba)
  {
    const run = nuevaRun('brujo', 5018);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(5018), uiSilenciosa);
    await comb.iniciar();
    const e = comb.enemigos[0];
    e.pv = e.pvMax = 90; e.bloqueo = 0;
    comb.jugador.pv = comb.jugador.pvMax - 20;
    await carta('marchitar').jugar(comb.contexto(e));
    check(90 - e.pv === 14, 'Marchitar inflige 14 de daño');
    check((e.estados.vulnerable ?? 0) === 2, 'y aplica 2 de Vulnerable');
    check(comb.jugador.pv === comb.jugador.pvMax - 20, 'ya no cura al brujo');
  }

  // Palabra de Ruina y Verbo de Aniquilación
  {
    const run = nuevaRun('brujo', 5016);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(5016), uiSilenciosa);
    await comb.iniciar();
    const e = comb.enemigos[0];
    e.pv = e.pvMax = 50;
    await comb.contexto().aplicarEstado(e, 'condena', 9);
    await carta('palabra-ruina').jugar(comb.contexto(e));
    check((e.estados.condena ?? 0) === 18, 'Palabra de Ruina duplica la Condena (9 → 18)');
    delete e.estados.condena;
    await carta('verbo-aniquilacion').jugar(comb.contexto(e));
    check((e.estados.condena ?? 0) === 16, 'Verbo de Aniquilación: un tercio de sus 50 PV = 16');
    delete e.estados.condena;
    await carta('verbo-aniquilacion').mejora!.jugar!(comb.contexto(e));
    check((e.estados.condena ?? 0) === 25, 'Verbo de Aniquilación+: la mitad de sus 50 PV = 25');
    const verbo = carta('verbo-aniquilacion');
    check(verbo.unUso === true && /se agota/i.test(verbo.texto) && /se agota/i.test(verbo.mejora!.texto!), 'Verbo de Aniquilación se agota (también mejorada)');
    const inst = instanciar(verbo);
    comb.jugador.mano.push(inst);
    comb.jugador.energia = 5;
    await comb.jugarCarta(inst, e);
    check(comb.jugador.agotadas.includes(inst) && !comb.jugador.descarte.includes(inst), 'al jugarla queda agotada durante el combate');
  }
}

console.log('— Druida: transformaciones reforzadas —');
{
  const carta = (id: string) => DRUIDA.find((c) => c.id === id)!;
  const defender = (comb: Combate) => {
    comb.enemigos.filter((e) => e.vivo).forEach((e) => {
      e.intencion = { nombre: 'Cubrirse', intencion: 'defensa', bloqueo: 4 };
    });
  };

  // El druida arranca con su motor de daño en la mano de salida
  {
    const mazo = mazoInicial('druida');
    check(mazo.some((c) => c.def.id === 'forma-lobo'),
      'el mazo inicial del druida trae una Transformación (Forma de Lobo)');
    check(mazo.some((c) => c.def.id === 'zarpazo'), 'y el Zarpazo');
  }

  // Duración y Fuerza de las formas
  {
    const run = nuevaRun('druida', 6001);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(6001), uiSilenciosa);
    await comb.iniciar();
    const e = comb.enemigos[0]; e.pv = e.pvMax = 200; e.bloqueo = 0;
    const base = comb.jugador.estados.fuerza ?? 0;
    await carta('forma-lobo').jugar(comb.contexto(e));
    check((comb.jugador.estados.fuerza ?? 0) === base + 2, 'Forma de Lobo: +2 de Fuerza');
    check(comb.jugador.efectosTemporales[0].turnos === 3, 'y dura 3 turnos');
    check(comb.estaTransformadoPublico(), 'el druida queda transformado');
    // 3 turns: it holds, then drops on the fourth
    for (let i = 0; i < 2; i++) { defender(comb); await comb.terminarTurno(); }
    check((comb.jugador.estados.fuerza ?? 0) === base + 2, 'la Fuerza sigue al tercer turno');
    defender(comb); await comb.terminarTurno();
    check((comb.jugador.estados.fuerza ?? 0) === base, 'y se retira al expirar la forma');
  }

  // Corazón del Cambiante: one more turn and block on every transformation
  for (const [mejorada, bloqueo] of [[false, 6], [true, 8]] as const) {
    const run = nuevaRun('druida', 6002);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(6002), uiSilenciosa);
    await comb.iniciar();
    const base = comb.jugador.estados.fuerza ?? 0;
    const corazon = carta('corazon-cambiante');
    await (mejorada ? corazon.mejora!.jugar! : corazon.jugar)(comb.contexto());
    const n = mejorada ? '+' : '';
    check((comb.jugador.estados.formaProlongada ?? 0) === 1, `Corazón del Cambiante${n}: +1 turno`);
    check(!comb.jugador.estados.formaPotenciada, `Corazón del Cambiante${n}: ya no da Fuerza extra`);
    comb.jugador.bloqueo = 0;
    await carta('forma-lobo').jugar(comb.contexto(comb.enemigos[0]));
    check((comb.jugador.estados.fuerza ?? 0) === base + 2, 'Forma de Lobo sigue dando +2 de Fuerza');
    check(comb.jugador.efectosTemporales[0].turnos === 4, 'y dura 4 turnos (3 + 1)');
    check(comb.jugador.bloqueo === bloqueo, `al transformarte ganas ${bloqueo} de bloqueo`);
    await carta('forma-aguila').jugar(comb.contexto());
    check(comb.jugador.bloqueo === bloqueo * 2, 'cada Transformación vuelve a dar el bloqueo');
  }


  // Forma Lunar: poder permanente que acumula Fuerza y Destreza cada turno
  {
    const lunar = carta('circulo-luna');
    check(lunar.tipo === 'poder', 'Forma Lunar es un poder');
    check(lunar.coste === 3, 'y cuesta 3');
    const run = nuevaRun('druida', 6006);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(6006), uiSilenciosa);
    await comb.iniciar();
    const e = comb.enemigos[0]; e.pv = e.pvMax = 200; e.bloqueo = 0;
    comb.jugador.estados.fuerza = 0;
    comb.jugador.estados.destreza = 0;
    await lunar.jugar(comb.contexto());
    check(e.pv === 200, 'Forma Lunar ya no hace daño');
    check((comb.jugador.estados.fuerza ?? 0) === 0, 'ni da Fuerza el turno que la juegas');
    check(comb.estaTransformadoPublico(), 'pero deja al druida transformado de inmediato');
    defender(comb); await comb.terminarTurno();
    check((comb.jugador.estados.fuerza ?? 0) === 2, 'al turno siguiente: +2 de Fuerza');
    check((comb.jugador.estados.destreza ?? 0) === 1, 'y +1 de Destreza');
    defender(comb); await comb.terminarTurno();
    check((comb.jugador.estados.fuerza ?? 0) === 4, 'y se acumula: +4 de Fuerza al tercer turno');
    check((comb.jugador.estados.destreza ?? 0) === 2, 'y +2 de Destreza');
    // la transformación es permanente: no expira ni retira nada
    for (let i = 0; i < 6; i++) { defender(comb); await comb.terminarTurno(); }
    check(comb.estaTransformadoPublico(), 'la Forma Lunar no expira nunca');
    check((comb.jugador.estados.fuerza ?? 0) === 16, 'tras 8 turnos acumula +16 de Fuerza');
  }

  // Forma de Enjambre: transformación con daño en área
  {
    const run = nuevaRun('druida', 6003);
    const comb = new Combate(run, [GOBLIN_CORTADOR, GOBLIN_ARQUERO], crearRng(6003), uiSilenciosa);
    await comb.iniciar();
    const [a, b] = comb.enemigos;
    a.pv = a.pvMax = 90; a.bloqueo = 0;
    b.pv = b.pvMax = 90; b.bloqueo = 0;
    comb.jugador.estados.fuerza = 0;
    await carta('forma-enjambre').jugar(comb.contexto());
    // da Destreza, así que su propio golpe NO se autopotencia
    check(90 - a.pv === 6 && 90 - b.pv === 6,
      'Forma de Enjambre: 6 de daño a TODOS los enemigos');
    check((comb.jugador.estados.destreza ?? 0) === 2, 'y +2 de Destreza (no de Fuerza)');
    check((comb.jugador.estados.fuerza ?? 0) === 0, 'la Fuerza no se toca');
    check(comb.estaTransformadoPublico(), 'y deja al druida transformado');
  }

  // Raíces Enredaderas ahora alcanzan a todo el grupo
  {
    const run = nuevaRun('druida', 6004);
    const comb = new Combate(run, [GOBLIN_CORTADOR, GOBLIN_ARQUERO], crearRng(6004), uiSilenciosa);
    await comb.iniciar();
    await carta('enredadera').jugar(comb.contexto(comb.enemigos[0]));
    check(comb.enemigos.every((e) => (e.estados.raices ?? 0) === 6),
      'Raíces Enredaderas: 6 de Raíces a TODOS los enemigos');
  }

  // Tormenta de Zarpas: el bono por transformado sobraba (las formas ya dan Fuerza)
  {
    const run = nuevaRun('druida', 6005);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(6005), uiSilenciosa);
    await comb.iniciar();
    const e = comb.enemigos[0]; e.pv = e.pvMax = 200; e.bloqueo = 0;
    comb.jugador.estados.fuerza = 0;
    await carta('zarpa-doble').jugar(comb.contexto(e));
    check(200 - e.pv === 9, 'sin transformar: 3 de daño tres veces = 9');
    e.pv = 200;
    comb.jugador.efectosTemporales.push({ etiqueta: 'Prueba', turnos: 5, fuerza: 0, destreza: 0 });
    await carta('zarpa-doble').jugar(comb.contexto(e));
    check(200 - e.pv === 9, 'transformado sin Fuerza: sigue haciendo 9 (sin bono propio)');
    e.pv = 200;
    comb.jugador.estados.fuerza = 2; // la Fuerza de la forma sí se nota, golpe a golpe
    await carta('zarpa-doble').jugar(comb.contexto(e));
    check(200 - e.pv === 15, 'con +2 de Fuerza: (3+2) tres veces = 15');
  }
}

// ── Sprites de los héroes: esqueleto y animaciones (sin DOM) ─────────────────
console.log('\n🎭 Sprites de los héroes');
{
  for (const c of CLASES) {
    const rig = HERO_RIGS[c];
    check(!!rig && rig.shapes.length >= 15, `${c}: tiene esqueleto con piezas (${rig?.shapes.length ?? 0})`);
  }
  // en reposo: sin efectos de ataque ni de golpe
  const idle = heroPose('barbaro', 1.3, null);
  check(idle.fx.slash === undefined && idle.fx.projectile === undefined && !idle.fx.flash,
    'reposo: sin tajo, proyectil ni destello');
  // cuerpo a cuerpo: a mitad de ataque aparece el tajo
  const slashPose = heroPose('barbaro', 0, { type: 'attack', p: 0.42 });
  check(slashPose.fx.slash !== undefined, 'bárbaro atacando: dibuja el tajo');
  const bones = heroBones('barbaro', slashPose.p);
  const geo = heroEffects('barbaro', bones, slashPose.fx);
  check(!!geo.slash && Number.isFinite(geo.slash.cx) && geo.slash.r1 > geo.slash.r0, 'el tajo tiene geometría válida');
  // magia: lanza un proyectil desde el foco (gema, orbe, llama)
  for (const c of ['druida', 'mago', 'brujo'] as ClaseId[]) {
    const m = heroPose(c, 0, { type: 'attack', p: 0.6 });
    const g = heroEffects(c, heroBones(c, m.p), m.fx);
    check(!!g.orb && Number.isFinite(g.orb.cx) && !geo.orb, `${c} atacando: lanza un proyectil`);
  }
  // hechizo (habilidades y poderes): estallido en el foco, sin proyectil
  const spell = heroPose('mago', 0, { type: 'spell', p: 0.55 });
  check(spell.fx.burst !== undefined && spell.fx.projectile === undefined, 'hechizo: estallido sin proyectil');
  // recibir golpe: destello blanco al principio y retroceso
  const hit = heroPose('picaro', 0, { type: 'hit', p: 0.05 });
  check(!!hit.fx.flash && hit.p.rootX < 0, 'golpe: destello y retroceso');
  // las acciones caducan y el héroe vuelve al reposo
  const acc = { type: 'attack' as const, t0: 10 };
  check(activeAction(acc, 10 + ACTION_DURATION.attack * 0.5)?.type === 'attack', 'la acción está activa a mitad');
  check(activeAction(acc, 10 + ACTION_DURATION.attack + 0.01) === null, 'y termina al cumplir su duración');
}

// ── Transformaciones del druida: misma silueta a contraluz que los héroes ────
console.log('\n🐺 Siluetas de las transformaciones');
{
  const etiquetas: [string, string][] = [
    ['Forma de Lobo', 'lobo'], ['Forma de Oso', 'oso'], ['Forma de Águila', 'aguila'],
    ['Forma de Enjambre', 'enjambre'], ['Forma Lunar', 'lunar'], ['Forma Estelar', 'estelar'],
  ];
  for (const [etiqueta, id] of etiquetas) {
    check(formFromLabel(etiqueta) === id, `«${etiqueta}» usa la silueta ${id}`);
    const rig = FORM_RIGS[id as keyof typeof FORM_RIGS];
    check(!!rig && rig.shapes.length >= 8, `${id}: tiene esqueleto con piezas`);
    const conEfecto = [0.45, 0.6].some((q) => {
      const a = heroPose(id as never, 0, { type: 'attack', p: q });
      const g = heroEffects(id as never, heroBones(id as never, a.p), a.fx);
      return !!(g.slash || g.orb || g.ring);
    });
    check(conEfecto, `${id} atacando: tiene efecto de ataque`);
    const h = heroPose(id as never, 0, { type: 'hit', p: 0.05 });
    check(!!h.fx.flash && h.p.rootX < 0, `${id} golpeado: destello y retroceso`);
  }
  check(formFromLabel('Furia Primaria') === null, 'un efecto que no es forma no cambia la silueta');
  // con varias formas activas, se ve la última que se ha lanzado
  check(currentForm([{ etiqueta: 'Forma de Oso' }, { etiqueta: 'Furia Primaria' }, { etiqueta: 'Forma de Lobo' }]) === 'lobo',
    'con Oso y luego Lobo activas, se ve el Lobo');
  check(currentForm([{ etiqueta: 'Forma de Lobo' }, { etiqueta: 'Forma Lunar' }, { etiqueta: 'Forma de Lobo' }]) === 'lobo',
    'relanzar una forma la vuelve a poner delante');
  check(currentForm([{ etiqueta: 'Furia Primaria' }]) === null, 'sin formas activas se ve el héroe');
  // tono más sombrío: cabezas más pequeñas (menos cabezones) y fieras con la cabeza gacha
  for (const c of CLASES) {
    const h = heroBones(c, heroPose(c, 0, null).p).head;
    check(Math.hypot(h[0], h[1]) < 0.9, `${c}: cabeza reducida en la silueta`);
  }
  for (const f of ['lobo', 'oso', 'lunar'] as const) {
    check((FORM_RIGS[f].rest.head ?? 0) > 0, `${f}: acecha con la cabeza gacha`);
  }
  // el águila no se posa: aletea aunque esté en reposo
  const ala1 = heroPose('aguila' as never, 0.0, null).p.armF, ala2 = heroPose('aguila' as never, 0.15, null).p.armF;
  check(Math.abs(ala1 - ala2) > 5, 'el águila aletea en reposo');
}

// ── Secondary motion: spring chains, bones for hair/cloth and animation kit ──
console.log('\n🧵 Física secundaria y kit de animación');
try {
  const ch = await import('../src/fx/chains.ts');
  const mo = await import('../src/fx/motion.ts');
  const an = await import('../src/fx/animator.ts');
  const pz = await import('../src/fx/puppet.ts');
  const pgpu = await import('../src/fx/puppet-gpu.ts');
  type Rig = import('../src/fx/puppet.ts').PuppetRig;
  type Spec = import('../src/fx/chains.ts').ChainSpec;
  type Act = import('../src/fx/puppet.ts').ActionProgress | null;

  // — bones: generic chain slots on top of the classic skeleton and the wings —
  const idx = Object.values(pgpu.BONE_INDEX);
  check(idx.length === pgpu.BONE_COUNT && new Set(idx).size === idx.length && Math.max(...idx) === pgpu.BONE_COUNT - 1,
    `los ${pgpu.BONE_COUNT} huesos tienen un hueco propio en la GPU`);
  const slots = ch.CHAIN_SLOTS;
  check(slots.length >= 5 && slots.every((s) => ch.CHAIN_BONES[s].length === ch.CHAIN_SEGMENTS && ch.CHAIN_SEGMENTS >= 3),
    `hay ${slots.length} cadenas genéricas de ${ch.CHAIN_SEGMENTS} huesos para pelo y tela`);
  check(slots.every((s) => ch.CHAIN_BONES[s].every((b) => pgpu.BONE_INDEX[b] !== undefined)), 'todos los huesos de cadena llegan a la GPU');
  check(pgpu.BONE_COUNT * 2 <= 128, 'el array de huesos cabe de sobra en los uniformes del shader de vértices');

  // — a test rig: the barbarian with one three-segment lock hanging from the head —
  const base = HERO_RIGS.barbaro;
  const lock = (over: Partial<Spec> = {}): Spec => ({ slot: 'A', parent: 'head', joints: [[50, 58], [45, 70], [42, 82], [40, 94]], freq: 3, damping: 0.3, sway: 0, sag: 0, ...over });
  const withLock = (over: Partial<Spec> = {}, extra: Partial<Rig> = {}): Rig => {
    const spec = lock(over);
    return { ...base, chains: [spec], shapes: [...base.shapes, ...ch.strandShapes(spec, 'hair', [5, 4, 3, 0.8])], ...extra };
  };
  const rig = withLock();
  check(ch.validateChains(rig).length === 0, 'una cadena bien declarada pasa la validación');
  check(ch.validateChains({ ...rig, chains: [lock({ joints: [[0, 0]] })] }).length > 0, 'una cadena sin segmentos no la pasa');
  check(ch.validateChains({ ...rig, chains: [lock(), lock()] }).length > 0, 'ni dos cadenas en el mismo hueco');
  const strand = rig.shapes.filter((s) => ch.CHAIN_BONES.A.includes(s.b as never));
  check(new Set(strand.map((s) => s.b)).size === 3, 'el mechón reparte sus piezas entre los 3 huesos de la cadena');
  // the chain hangs from its parent: turning the head moves the lock
  const still = pz.puppetPose(rig, 0, null).p;
  const tipAt = (p: typeof still) => pz.applyMatrix(pz.puppetBones(rig, p).chA3, 40, 94);
  const tip0 = tipAt(still), tip1 = tipAt({ ...still, head: still.head + 25 });
  check(Math.hypot(tip0[0] - tip1[0], tip0[1] - tip1[1]) > 5, 'la cadena cuelga de su hueso padre (la cabeza)');
  // enemies do not use the chain bones
  const gob = ENEMY_RIGS['goblin-cortador'];
  check(ch.CHAIN_BONES.A.every((b) => pz.puppetPose(gob, 1, null).p[b] === 0), 'los enemigos no mueven los huesos de cadena');
  const pk = pgpu.packRig(rig, 'silhouette');
  const maxBone = Math.max(...rig.shapes.map((_, i) => pk.data[i * pgpu.PIECE_TEXELS * 4 + 1]));
  check(maxBone < pgpu.BONE_COUNT && pk.data.every(Number.isFinite), 'el rig con cadenas se empaqueta para la GPU');

  // — solver: runs a timeline at a given frame rate and samples every 1/6 s —
  const run = (r: Rig, fps: number, secs: number, act: (t: number) => Act, jitter = 0) => {
    const a = new an.PuppetAnimator(r);
    const out: { t: number; f: ReturnType<typeof a.frame> }[] = [];
    let seed = 3;
    for (let i = 0, t = 0; t <= secs + 1e-9; i++) {
      const f = a.frame(t, act(t));
      if ((i * 6) % fps === 0) out.push({ t, f });
      seed = (seed * 16807) % 2147483647;
      t = (i + 1) / fps + (jitter ? ((seed / 2147483647) - 0.5) * jitter / fps : 0);
    }
    return out;
  };
  const attackAt = (t0: number) => (t: number): Act => {
    const q = (t - t0) / ACTION_DURATION.attack;
    return q >= 0 && q < 1 ? { type: 'attack', p: q } : null;
  };
  const off = (f: { p: Record<string, number> }) => [f.p.chA1, f.p.chA2, f.p.chA3];
  const r1 = run(rig, 60, 3, attackAt(0.5)), r2 = run(rig, 60, 3, attackAt(0.5));
  check(r1.every((s, i) => off(s.f).every((v, k) => v === off(r2[i].f)[k])), 'determinista: la misma secuencia da exactamente el mismo resultado');
  // frame-rate independence within a tolerance
  const fr = [30, 60, 144].map((fps) => run(rig, fps, 3, attackAt(0.5)));
  let peor = 0;
  for (let i = 0; i < fr[1].length; i++) {
    for (const other of [fr[0], fr[2]]) {
      const s = other.find((o) => Math.abs(o.t - fr[1][i].t) < 1e-6);
      if (s) off(s.f).forEach((v, k) => { peor = Math.max(peor, Math.abs(v - off(fr[1][i].f)[k])); });
    }
  }
  check(peor < 4, `independiente de los fps: a 30, 60 y 144 fps difiere como mucho ${peor.toFixed(2)}°`);
  // stability: a very stiff, barely damped chain under jittery, huge time steps
  const wild = withLock({ freq: 14, damping: 0.02, sway: 3, sag: 3 });
  const hectic = (t: number): Act => ({ type: (['attack', 'hit', 'spell'] as const)[Math.floor(t * 1.3) % 3], p: (t * 1.3) % 1 });
  let estable = true, maxAng = 0;
  for (const fps of [8, 24, 240]) {
    for (const s of run(wild, fps, 8, hectic, 0.9)) {
      for (const v of off(s.f)) { if (!Number.isFinite(v)) estable = false; maxAng = Math.max(maxAng, Math.abs(v)); }
    }
  }
  check(estable && maxAng <= ch.DEFAULT_LIMIT + 1e-6, `estable: rígida y sin amortiguar, con pasos enormes, no explota (máx. ${maxAng.toFixed(1)}°)`);
  // damping: after the attack the lock wobbles less and less, and comes to rest
  const calm = run(rig, 60, 4.5, attackAt(0));
  const amp = (t0: number, t1: number) => Math.max(...calm.filter((s) => s.t >= t0 && s.t < t1).map((s) => Math.abs(s.f.p.chA3)));
  const pronto = amp(0.8, 1.6), tarde = amp(3.5, 4.6);
  check(pronto > 3 && tarde < pronto * 0.15, `amortiguado: el mechón se agita tras el golpe (${pronto.toFixed(1)}°) y se calma (${tarde.toFixed(2)}°)`);
  // lag: while the body lunges forward the tip trails behind its rigid position
  {
    const a = new an.PuppetAnimator(rig);
    let lagMax = 0;
    for (let i = 0; i <= 60; i++) {
      const t = i / 60, act = attackAt(0)(t);
      const f = a.frame(t, act);
      if (act && act.p > 0.3 && act.p < 0.42) {
        const rigid = pz.applyMatrix(pz.puppetBones(rig, pz.puppetPose(rig, t, act).p).chA3, 40, 94);
        const sim = pz.applyMatrix(f.bones.chA3, 40, 94);
        lagMax = Math.max(lagMax, rigid[0] - sim[0]);
      }
    }
    check(lagMax > 2, `inercia: al lanzarse hacia delante la punta se queda atrás (${lagMax.toFixed(1)} u)`);
  }
  // wind: a breeze sways the lock at rest; without wind or gravity it stays put
  const breezy = run(withLock({ sway: 1.5 }), 60, 4, () => null).slice(6);
  const sw = breezy.map((s) => s.f.p.chA3);
  check(Math.max(...sw) - Math.min(...sw) > 1.5, 'en reposo, el viento mece el mechón');
  const quiet = run(withLock({ sway: 0, sag: 0 }), 60, 3, () => null).slice(6);
  check(quiet.every((s) => off(s.f).every((v) => Math.abs(v) < 1.5)), 'sin viento ni gravedad, el mechón no se mueve en reposo');
  const heavy = run(withLock({ sway: 0, sag: 2, joints: [[50, 58], [58, 58], [66, 58], [74, 58]] }), 60, 3, () => null);
  const last = heavy[heavy.length - 1].f;
  const tipY = pz.applyMatrix(last.bones.chA3, 74, 58)[1], rigidY = pz.applyMatrix(pz.puppetBones(rig, pz.puppetPose(rig, 3, null).p).chA3, 74, 58)[1];
  check(tipY > rigidY + 1, 'la gravedad hace caer un mechón horizontal');
  // the physics is shared: renderers read the bones from the animator
  check(Object.keys(pgpu.BONE_INDEX).every((b) => !!last.bones[b as keyof typeof last.bones]), 'el animador da matriz a todos los huesos (GPU y SVG)');
  // cheap: a whole figure with the six chains in use costs little per frame
  {
    const six: Rig = { ...base, chains: slots.map((s, i) => ({ slot: s, parent: 'torso', joints: [[50 + i, 76], [46 + i, 88], [44 + i, 100], [43 + i, 112]] })) };
    // warm the JIT up, then keep the best of three runs: a single cold run also
    // measured whatever else the machine was doing and failed now and then
    const a = new an.PuppetAnimator(six);
    for (let i = 0; i < 120; i++) a.frame(i / 60, attackAt(1)(i / 60));
    let ms = Infinity;
    for (let intento = 0; intento < 3; intento++) {
      const t0 = performance.now();
      for (let i = 0; i < 300; i++) a.frame(2 + i / 60, attackAt(3)(2 + i / 60));
      ms = Math.min(ms, (performance.now() - t0) / 300);
    }
    check(ms < 0.5, `barato: una figura con 6 cadenas cuesta ${ms.toFixed(3)} ms por fotograma`);
  }

  // — animation kit: easings, strike timelines, hit-stop, squash and smear —
  const eases = Object.entries(mo.EASE);
  check(eases.length >= 8 && eases.every(([, f]) => Math.abs(f(0)) < 1e-9 && Math.abs(f(1) - 1) < 1e-9), `${eases.length} curvas de easing que empiezan en 0 y acaban en 1`);
  check(Math.min(...[0.1, 0.2, 0.3].map(mo.EASE.backIn)) < 0, 'backIn retrocede antes de arrancar (anticipación)');
  check(Math.max(...[0.6, 0.7, 0.8, 0.9].map(mo.EASE.backOut)) > 1, 'backOut se pasa y vuelve (sobrepaso)');
  check(mo.EASE.expoIn(0.5) < 0.1 && mo.EASE.expoOut(0.5) > 0.9, 'expoIn arranca lento y expoOut frena en seco');
  const imp = 0.42;
  const keys = mo.strikeKeys({
    impact: imp, anticipation: { weapon: -60, armF: -80, rootX: -6 }, strike: { weapon: 120, armF: 90, rootX: 10 },
    overshoot: { weapon: 140, armF: 105, rootX: 12 }, hitStop: 0.06,
  });
  const scripted: Rig = { ...rig, impact: imp, actions: { attack: { keys, smear: [imp - 0.1, imp + 0.02], slash: [imp - 0.06, imp + 0.2] } } };
  check(pz.puppetImpact(scripted) === imp, 'el rig puede fijar su momento de impacto');
  const at = (q: number) => pz.puppetPose(scripted, 0, { type: 'attack', p: q });
  const restW = pz.puppetPose(scripted, 0, null).p.weapon;
  const minW = Math.min(...[0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35].map((q) => at(q).p.weapon));
  check(minW < restW - 40, 'anticipación: el arma va hacia atrás antes de golpear');
  check(Math.abs(at(imp).p.weapon - 120 - 0) < 3 && Math.abs(at(imp).p.rootX - 10) < 1.5, 'en el impacto la pose es la del golpe');
  check(Math.abs(at(imp + 0.03).p.weapon - at(imp).p.weapon) < 3, 'hit-stop: se congela un instante en el impacto');
  check(at(imp + 0.14).p.weapon > at(imp).p.weapon + 5, 'sobrepaso: sigue de largo tras el impacto');
  check(Math.abs(at(0.999).p.weapon - restW) < 6, 'y se asienta de vuelta en reposo');
  check(at(imp - 0.03).fx.slash !== undefined && at(imp + 0.3).fx.slash === undefined, 'el guion decide cuándo se ve el tajo');
  check(at(imp - 0.05).fx.smear !== undefined && at(0.9).fx.smear === undefined, 'y cuándo hay smear del arma');
  const lastIn = (from: number) => mo.strikeKeys({ impact: from, anticipation: {}, strike: {} });
  check([0.3, 0.4, 0.55].every((q) => lastIn(q).some((k) => Math.abs(k[0] - q) < 1e-9)), 'strikeKeys siempre pone una clave justo en el impacto');
  // smear ghosts: earlier poses of the weapon, only while the smear is on
  {
    const a = new an.PuppetAnimator(scripted);
    const g = a.frame(10, { type: 'attack', p: imp - 0.04 });
    check(g.ghosts.length >= 2 && g.ghosts.every((h) => h.alpha > 0 && h.alpha <= 1), 'con smear, el animador da estelas del arma');
    const moved = g.ghosts[0].bones.weapon.some((v, i) => Math.abs(v - g.bones.weapon[i]) > 1e-3);
    check(moved, 'las estelas van por detrás del arma');
    check(a.frame(11, null).ghosts.length === 0, 'y en reposo no hay estelas');
    check(ch.CHAIN_BONES.A.every((b) => !(g.smearBones as string[]).includes(b)) && g.smearBones.every((b) => pgpu.BONE_INDEX[b] < 32), 'las estelas usan huesos que caben en la máscara de la GPU');
  }
  // squash & stretch around the feet
  {
    const p0 = pz.puppetPose(rig, 0, null).p;
    const headY = (p: typeof p0) => pz.applyMatrix(pz.puppetBones(rig, p).head, 60, 56)[1];
    const footY = (p: typeof p0) => pz.applyMatrix(pz.puppetBones(rig, p).legF, 70, 125)[1];
    check(headY({ ...p0, squash: 0.2 }) > headY(p0) + 5, 'squash: la silueta se aplasta hacia los pies');
    check(headY({ ...p0, squash: -0.15 }) < headY(p0) - 4, 'stretch: y se estira hacia arriba');
    check(Math.abs(footY({ ...p0, squash: 0.2 }) - footY(p0)) < 1.5, 'los pies se quedan en el suelo');
  }
} catch (e) {
  check(false, `las pruebas de física secundaria revientan: ${(e as Error).stack ?? e}`);
}

// ── Sprites per character: one test file each in scripts/hero-tests/ ────────
// (budget, GPU packing, chains, anticipation… — each class adds its own there)
for (const [titulo, archivo, fn] of [
  ['🪓 Sprite del bárbaro', 'barbaro', 'testBarbaro'],
  ['🌿 Sprites del druida y sus formas', 'druida', 'testDruida'],
  ['🔮 Sprite del mago', 'mago', 'testMago'],
  ['🗡️ Sprite del pícaro', 'picaro', 'testPicaro'],
  ['🔥 Sprite del brujo', 'brujo', 'testBrujo'],
  ['🔨 Sprite del paladín', 'paladin', 'testPaladin'],
] as const) {
  console.log(`\n${titulo}`);
  try {
    const mod = await import(`./hero-tests/${archivo}.ts`);
    mod[fn](check);
  } catch (e) {
    check(false, `las pruebas de ${archivo} revientan: ${(e as Error).stack ?? e}`);
  }
}

// ── Bestiario ilustrado: enemigos normales e invocaciones ────────────────────
console.log('\n👹 Bestiario ilustrado');
{
  const defs = Object.values(ENEMIGOS).filter(
    (v): v is EnemigoDef => typeof v === 'object' && v !== null && 'id' in v && 'pv' in v && 'ia' in v,
  );
  // a placeholder slot (the skeletal adventurers) is drawn as each of its variants
  const normales = defs.filter((d) => !d.esJefe).flatMap((d) => d.variantes ?? [d]);
  check(normales.length >= 40, `hay ${normales.length} enemigos normales y de élite`);
  for (const d of normales) {
    const rig = ENEMY_RIGS[d.id];
    check(!!rig && rig.shapes.length >= 10, `${d.nombre}: tiene marioneta ilustrada`);
  }
  // jefes: marioneta propia, emisores de partículas y ráfagas al atacar y morir
  const jefes = defs.filter((d) => d.esJefe);
  check(jefes.length === 8, `hay ${jefes.length} jefes (los 7 y la filacteria de Vol'guth)`);
  for (const d of jefes) {
    const rig = ENEMY_RIGS[d.id];
    check(!!rig && rig.shapes.length >= 30, `${d.nombre}: marioneta épica (${rig?.shapes.length ?? 0} piezas)`);
    check((rig?.emitters?.length ?? 0) >= 2, `${d.nombre}: emite partículas continuamente`);
    check(!!rig?.bursts?.attack?.length && !!rig?.bursts?.death?.length, `${d.nombre}: ráfagas al atacar y al morir`);
    for (const em of [...(rig?.emitters ?? []), ...Object.values(rig?.bursts ?? {}).flat()]) {
      check(!!EFFECTS[em.effect], `${d.nombre}: el efecto «${em.effect}» existe`);
    }
  }
  const tasa = (id: string) => (ENEMY_RIGS[id]?.emitters ?? []).reduce((a, e) => a + e.rate, 0);
  const acto12 = ['jefe-ogro', 'embaucador-arcano', 'senor-cripta', 'heraldo-culto', 'demonio-mayor'];
  const maxAnterior = Math.max(...acto12.map(tasa));
  check(tasa('ignifax') > maxAnterior && tasa('contemplador') > maxAnterior, 'Ignifax y el Contemplador son los que más partículas echan');
  // los emisores se colocan en el mundo siguiendo a sus huesos
  const ign = ENEMY_RIGS['ignifax'];
  const posIgn = emitterWorld(ign, puppetBones(ign, puppetPose(ign, 0, null).p), ign.emitters![0]);
  check(Number.isFinite(posIgn[0]) && Number.isFinite(posIgn[1]), 'los emisores tienen posición en el mundo');
  // las ascuas suben
  const asc: Particle[] = [];
  for (let i = 0; i < 20; i++) spawnEffect(asc, 'ascua', 0, 0);
  check(asc.reduce((a, p) => a + p.vy, 0) < 0, 'las ascuas de los jefes suben');
  // Vol'guth's phylactery: the soul escapes upwards when it breaks
  {
    const lib = EFFECTS.almaLiberada, cris = EFFECTS.cristalRoto;
    check(!!lib && lib.gravity < 0 && !!lib.glow && lib.life[1] >= 1.5, 'el alma liberada asciende, brilla y tarda en disiparse');
    const ps: Particle[] = [];
    spawnEffect(ps, 'almaLiberada', 0, 0, 1, () => 0.5);
    check(ps.length > 0 && ps.every((p) => p.vy < 0), 'todos los jirones del alma liberada salen hacia arriba');
    check(!!cris && cris.gravity > 0, 'los cristales de la filacteria caen al romperse');
    const fil = ENEMY_RIGS['filacteria-volguth'];
    check(!!fil, 'la filacteria de Vol\'guth tiene marioneta');
    if (fil) {
      const muerte = fil.bursts?.death ?? [];
      check(muerte.some((b) => b.effect === 'almaLiberada') && muerte.some((b) => b.effect === 'cristalRoto'),
        'al morir la filacteria se rompe en cristales y suelta el alma');
      const soul = { bone: 'head' as const, at: fil.focus };
      const at = (act: { type: 'death' | 'hit' | 'spell'; p: number } | null, t = 0) =>
        emitterWorld(fil, puppetBones(fil, puppetPose(fil, t, act).p), soul);
      const quieto = at(null), fuera = at({ type: 'death', p: 0.75 });
      check(quieto[1] - fuera[1] > 20, `el alma sube al romperse la urna (${(quieto[1] - fuera[1]).toFixed(1)} u)`);
      check(Math.abs(quieto[0] - fuera[0]) < 6, 'y sube recta, sin salir disparada a un lado');
      const latidos = Array.from({ length: 30 }, (_, i) => puppetPose(fil, i * 0.05, null).p.squash);
      check(Math.max(...latidos) - Math.min(...latidos) > 0.005, 'en reposo la filacteria late');
      const rot = (q: number) => { const p = puppetPose(fil, 0, { type: 'death', p: q }).p; return Math.abs(p.armB) + Math.abs(p.armF) + Math.abs(p.wingB) + Math.abs(p.wingF); };
      check(rot(0.6) > 80, 'al morir, los fragmentos de cristal se abren');
      const golpe = puppetPose(fil, 0, { type: 'hit', p: 0.15 }).p;
      check(Math.abs(golpe.armB) + Math.abs(golpe.armF) > 4, 'al recibir un golpe, el cristal se agrieta');
      const hechizo = puppetPose(fil, 0, { type: 'spell', p: 0.5 }).p;
      check(hechizo.cape < -20, 'al resucitar a Vol\'guth, la tapa se abre');
    }
  }
  for (const f of ['lobo', 'oso', 'fuego', 'agua', 'aire', 'arbol', 'tierra', 'sabueso', 'demonio']) {
    check(!!INVOCATION_RIGS[f] && INVOCATION_RIGS[f].shapes.length >= 8, `invocación ${f}: tiene marioneta ilustrada`);
  }
  // muerte: destello, se desploma y se desvanece del todo
  const rig = ENEMY_RIGS['goblin-cortador'];
  check(!!puppetPose(rig, 0, { type: 'death', p: 0.03 }).fx.flash, 'muerte: destello al recibir el golpe final');
  check(puppetPose(rig, 0, { type: 'death', p: 0.95 }).fx.opacity === 0, 'muerte: acaba desvanecido');
  // los arqueros disparan flechas; los hechiceros, bolas de energía
  const arquero = ENEMY_RIGS['goblin-arquero'];
  const a = puppetPose(arquero, 0, { type: 'attack', p: 0.6 });
  const g = puppetEffects(arquero, puppetBones(arquero, a.p), a.fx);
  check(!!g.orb && arquero.projectile === 'arrow', 'el Goblin Arquero dispara una flecha');
  const chaman = ENEMY_RIGS['goblin-chaman'];
  const c2 = puppetPose(chaman, 0, { type: 'attack', p: 0.6 });
  check(!!puppetEffects(chaman, puppetBones(chaman, c2.p), c2.fx).orb && chaman.projectile !== 'arrow', 'el Chamán lanza energía');
}

// ── New enemies of Acts I-II: goblin horde, rat swarm, skeletal adventurers, incubus and succubus ──
console.log('\n💀 Marionetas nuevas: horda goblin, ratas, aventureros esqueléticos, íncubo y súcubo');
try {
  const { MAX_FIGURE_PIECES, bodyScreenBox } = await import('../src/fx/puppet-gpu.ts');
  const marco = { x: 100, y: 50, w: 140 }, suelo = marco.y + (129 / 140) * marco.w;
  const aventureros = ['guerrero', 'mago', 'clerigo', 'picaro', 'barbaro', 'paladin', 'explorador', 'brujo', 'bardo'].map((c) => `aventurero-${c}`);
  const nuevos = ['goblin-saqueador', 'goblin-jaleador', 'rata-alcantarilla', 'rata-gigante', ...aventureros, 'incubo', 'sucubo'];
  for (const id of nuevos) {
    const rig = ENEMY_RIGS[id];
    const n = rig?.shapes.length ?? 0;
    check(!!rig && n >= 10 && n <= MAX_FIGURE_PIECES, `${id}: tiene marioneta ilustrada (${n} piezas, tope ${MAX_FIGURE_PIECES})`);
    // every painted key exists in the palette (a missing one renders magenta)
    const sinColor = [...new Set((rig?.shapes ?? []).map((s) => s.k))].filter((k) => k !== 'ink' && !rig?.palette[k]);
    check(!!rig && sinColor.length === 0, `${id}: todos sus colores están en la paleta ${sinColor.join(', ')}`);
    // the body box (Doom chains, hit flashes) stands on the ground and is big enough to hold them
    const fb = rig ? bodyScreenBox(rig, marco, true) : null;
    check(!!fb && fb.w >= marco.w * 0.2 && fb.h >= marco.w * 0.3 && Math.abs(fb.y + fb.h - suelo) < marco.w * 0.03, `${id}: su cuerpo se apoya en el suelo`);
  }
  // each adventurer reads as its class: its own gear (weapon, off-hand, headwear) and its own eye glow
  const firma = (id: string) => JSON.stringify((ENEMY_RIGS[id]?.shapes ?? []).filter((s) => s.b === 'weapon' || s.b === 'offhand' || s.b === 'head'));
  const firmas = aventureros.map(firma);
  check(new Set(firmas).size === aventureros.length, 'los 9 aventureros llevan cada uno su arma, mano secundaria y tocado');
  const ojos = aventureros.map((id) => ENEMY_RIGS[id]?.palette.eyeGlow);
  check(new Set(ojos).size === aventureros.length, 'y cada uno brilla con el color de su clase');
  const conCalavera = aventureros.filter((id) => (ENEMY_RIGS[id]?.shapes ?? []).some((s) => s.b === 'head' && s.k === 'socket')
    && (ENEMY_RIGS[id]?.shapes ?? []).some((s) => s.b === 'armF' && s.k === 'bone'));
  check(conCalavera.length === aventureros.length, `todos son esqueletos: calavera y brazos de hueso (${conCalavera.length}/9)`);
  const arqueros = aventureros.filter((id) => ENEMY_RIGS[id]?.projectile === 'arrow');
  check(arqueros.length === 1 && arqueros[0] === 'aventurero-explorador', 'solo el explorador dispara flechas');
  const magos = ['aventurero-mago', 'aventurero-brujo'].filter((id) => ENEMY_RIGS[id]?.style === 'magic');
  check(magos.length === 2, 'el mago y el brujo lanzan conjuros');
  // the two goblins of the horde are told apart at a glance
  check(firma('goblin-saqueador') !== firma('goblin-jaleador'), 'el saqueador y el jaleador de la horda se distinguen');
  // rats: quadrupeds with a long tail that sways (spring chain) and venom in the mouth
  for (const id of ['rata-alcantarilla', 'rata-gigante']) {
    const rig = ENEMY_RIGS[id];
    check(!!rig?.chains?.length && rig.shapes.some((s) => s.k === 'poison'), `${id}: cola larga con muelle y babas venenosas`);
  }
  check((ENEMY_RIGS['rata-gigante']?.art ?? 0) > (ENEMY_RIGS['rata-alcantarilla']?.art ?? 0), 'la rata gigante es más grande que las de alcantarilla');
  // incubus and succubus: horns, bat wings and tail; different silhouettes
  for (const id of ['incubo', 'sucubo']) {
    const rig = ENEMY_RIGS[id];
    check(!!rig?.wings?.B && !!rig?.wings?.F && rig.shapes.some((s) => s.b === 'head' && s.k === 'horn'), `${id}: cuernos y alas de murciélago`);
  }
  check(firma('incubo') !== firma('sucubo'), 'el íncubo y la súcubo no son la misma figura');
  // barely dressed: bare skin, no cloak or robe, just leather underwear (and a thin harness on him)
  for (const id of ['incubo', 'sucubo']) {
    const rig = ENEMY_RIGS[id]!;
    const de = (k: string) => rig.shapes.filter((s) => s.k === k);
    check(!rig.shapes.some((s) => s.k === 'cloak' || s.k === 'robe') && rig.palette.body === rig.palette.skin,
      `${id}: sin capa ni túnica, con la piel al descubierto`);
    check(de('leather').some((s) => s.t === 'p' && s.b === 'torso'), `${id}: lleva ropa interior de cuero`);
  }
  // his harness is a bulldog one: two shoulder straps with buckles down to a studded chest bar,
  // O-rings at its ends with side straps, and a ring hanging under the bar
  const inc = ENEMY_RIGS['incubo']!.shapes.filter((s) => s.b === 'torso');
  const tirantes = inc.filter((s) => s.t === 'l' && s.k === 'leather' && Math.abs(s.x1 - s.x2) < 1.5 && s.y2 - s.y1 > 5);
  const barra = inc.filter((s) => s.t === 'p' && s.k === 'leather' && s.pts.every(([, y]) => y > 84 && y < 90));
  const metal = inc.filter((s) => s.k === 'metal');
  check(tirantes.length >= 2 && barra.length === 1 && metal.length >= 6,
    `el arnés del íncubo: dos tirantes con hebillas hasta una barra en el pecho con anillas (${tirantes.length} tirantes, ${metal.length} piezas de metal)`);
  const abdominales = inc.filter((s) => s.t === 'l' && s.k === 'ink' && s.w <= 0.5 && Math.min(s.y1, s.y2) >= 88 && Math.max(s.y1, s.y2) <= 98);
  check(abdominales.length >= 3, `y unas líneas sutiles marcan sus abdominales (${abdominales.length})`);
  const suc = ENEMY_RIGS['sucubo']!.shapes.filter((s) => s.b === 'torso');
  const busto = suc.filter((s) => s.t === 'e' && s.k === 'leather' && s.y > 79 && s.y < 86);
  check(busto.length === 2 && busto.every((s) => s.t === 'e' && s.rx >= 3), 'la súcubo tiene más pecho, cubierto por la banda de cuero');
  check(suc.some((s) => s.k === 'ink' && ((s.t === 'c' && s.y > 92 && s.y < 97) || (s.t === 'l' && s.y1 > 92 && s.y1 < 97))), 'y se le dibuja el ombligo');
  check(['incubo', 'sucubo'].every((id) => (ENEMIGOS.ACTOS[1][1].elites[2].find((d) => d.id === id)?.escala ?? 0) >= 1.3),
    'los dos son algo más grandes, para que se aprecie el detalle');
} catch (e) {
  check(false, `las pruebas de las marionetas nuevas revientan: ${(e as Error).stack ?? e}`);
}

// ── New enemies of Act III: dragonborn guards, their bound fire elemental and the mimics ──
console.log('\n📦 Marionetas nuevas: guardas dracónidos, elemental de fuego y mímicos');
try {
  const { MAX_FIGURE_PIECES, bodyScreenBox } = await import('../src/fx/puppet-gpu.ts');
  const { EMISSIVE, applyMatrix, puppetImpact } = await import('../src/fx/puppet.ts');
  type Rig = (typeof ENEMY_RIGS)[string];
  type Piece = Rig['shapes'][number];
  type Act = Parameters<typeof puppetPose>[2];
  const marco = { x: 100, y: 50, w: 140 }, suelo = marco.y + (129 / 140) * marco.w;
  const mimicos = ['mimico-cofre', 'mimico-silla', 'mimico-puerta'];
  for (const id of ['guardia-draconido', 'elemental-fuego', ...mimicos]) {
    const rig = ENEMY_RIGS[id];
    const n = rig?.shapes.length ?? 0;
    check(!!rig && n >= 10 && n <= MAX_FIGURE_PIECES, `${id}: tiene marioneta ilustrada (${n} piezas, tope ${MAX_FIGURE_PIECES})`);
    // every painted key exists in the palette (a missing one renders magenta)
    const sinColor = [...new Set((rig?.shapes ?? []).map((s) => s.k))].filter((k) => k !== 'ink' && !rig?.palette[k]);
    check(!!rig && sinColor.length === 0, `${id}: todos sus colores están en la paleta ${sinColor.join(', ')}`);
    if (id === 'elemental-fuego') continue; // it hovers
    const fb = rig ? bodyScreenBox(rig, marco, true) : null;
    check(!!fb && fb.w >= marco.w * 0.2 && fb.h >= marco.w * 0.2 && Math.abs(fb.y + fb.h - suelo) < marco.w * 0.03, `${id}: se apoya en el suelo`);
  }
  // bind-pose box of a piece
  const caja = (s: Piece) => {
    const pts: [number, number][] = s.t === 'p' ? s.pts : s.t === 'l' ? [[s.x1 - s.w / 2, s.y1 - s.w / 2], [s.x2 + s.w / 2, s.y2 + s.w / 2]]
      : s.t === 'c' ? [[s.x - s.r, s.y - s.r], [s.x + s.r, s.y + s.r]] : [[s.x - s.rx, s.y - s.ry], [s.x + s.rx, s.y + s.ry]];
    return { y0: Math.min(...pts.map((p) => p[1])), y1: Math.max(...pts.map((p) => p[1])) };
  };
  const alto = (ss: Piece[]) => ss.length ? Math.max(...ss.map((s) => caja(s).y1)) - Math.min(...ss.map((s) => caja(s).y0)) : 0;

  // — Dragonborn guard: dragon head, halberd and a tower shield over the body —
  const guardia = ENEMY_RIGS['guardia-draconido'];
  if (guardia) {
    const de = (b: string) => guardia.shapes.filter((s) => s.b === b);
    check(de('head').filter((s) => s.k === 'horn').length >= 2 && de('head').some((s) => s.k === 'eyeGlow') && de('head').some((s) => s.k === 'teeth'),
      'el guarda dracónido tiene cabeza de dragón con cuernos, colmillos y ojos ardientes');
    check(alto(de('weapon')) >= 55, `empuña una alabarda larga (${alto(de('weapon')).toFixed(0)} de alto)`);
    const escudo = guardia.shapes.findIndex((s) => s.b === 'offhand'), cuerpo = guardia.shapes.findIndex((s) => s.b === 'torso' && s.k === 'body');
    check(alto(de('offhand')) >= 30 && escudo > cuerpo, `y un escudo torre por delante del cuerpo (${alto(de('offhand')).toFixed(0)} de alto)`);
    check(guardia.shapes.filter((s) => s.k === 'armor').length >= 2, 'con armadura pesada');
  }

  // — Fire elemental: living flame, not rock —
  const fuego = ENEMY_RIGS['elemental-fuego'];
  if (fuego) {
    const brillan = fuego.shapes.filter((s) => EMISSIVE.has(s.k)).length;
    check(brillan >= fuego.shapes.length * 0.3 && !fuego.shapes.some((s) => s.k === 'rock'), `el elemental de fuego es llama viva (${brillan} piezas que brillan, sin roca)`);
    check(!!fuego.hover && fuego.shapes.some((s) => s.k === 'flameCore') && fuego.shapes.filter((s) => s.k === 'eyeGlow').length >= 2,
      'flota, con un núcleo ardiente y ojos de ascua');
    check(fuego.shapes.filter((s) => s.k === 'magic').length >= 4, 'y bandas de runas que lo atan a los guardas');
    const huesos = [...new Set(fuego.shapes.map((s) => s.b))];
    const vivos = huesos.filter((b) => {
      const v = Array.from({ length: 90 }, (_, i) => puppetPose(fuego, i / 30, null).p[b as 'torso']);
      return v.every(Number.isFinite) && Math.max(...v) - Math.min(...v) > 4;
    });
    check(vivos.length >= 4, `las lenguas de fuego se agitan en reposo (${vivos.length} huesos)`);
    const efectos = (fuego.emitters ?? []).map((e) => e.effect);
    check(efectos.length >= 1 && efectos.every((e) => !!EFFECTS[e]), 'suelta ascuas y llamas');
  }

  // — Mimics: the maw hides behind the furniture at rest —
  // sample points of a piece (bind pose), pushed `grow` units outwards
  const muestras = (s: Piece, grow: number): [number, number][] => {
    if (s.t === 'c' || s.t === 'e') {
      const rx = (s.t === 'c' ? s.r : s.rx) + grow, ry = (s.t === 'c' ? s.r : s.ry) + grow;
      return Array.from({ length: 12 }, (_, i) => [s.x + rx * Math.cos((i * Math.PI) / 6), s.y + ry * Math.sin((i * Math.PI) / 6)]);
    }
    if (s.t === 'l') {
      const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1) || 1, ux = (s.x2 - s.x1) / len, uy = (s.y2 - s.y1) / len, r = s.w / 2 + grow;
      const out: [number, number][] = [[s.x1 - ux * r, s.y1 - uy * r], [s.x2 + ux * r, s.y2 + uy * r]];
      for (let k = 0; k <= 6; k++) {
        const x = s.x1 + ((s.x2 - s.x1) * k) / 6, y = s.y1 + ((s.y2 - s.y1) * k) / 6;
        out.push([x - uy * r, y + ux * r], [x + uy * r, y - ux * r]);
      }
      return out;
    }
    const cx = s.pts.reduce((a, p) => a + p[0], 0) / s.pts.length, cy = s.pts.reduce((a, p) => a + p[1], 0) / s.pts.length;
    const pts = s.pts.flatMap((p, i): [number, number][] => { const q = s.pts[(i + 1) % s.pts.length]; return [p, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]]; });
    return pts.map(([x, y]) => { const d = Math.hypot(x - cx, y - cy) || 1; return [x + ((x - cx) / d) * grow, y + ((y - cy) / d) * grow]; });
  };
  // is a world point inside a piece drawn with the bone matrix m?
  const dentro = (s: Piece, m: number[], wx: number, wy: number) => {
    const det = m[0] * m[3] - m[1] * m[2], dx = wx - m[4], dy = wy - m[5];
    const x = (m[3] * dx - m[2] * dy) / det, y = (-m[1] * dx + m[0] * dy) / det;
    if (s.t === 'c') return Math.hypot(x - s.x, y - s.y) <= s.r;
    if (s.t === 'e') return ((x - s.x) / s.rx) ** 2 + ((y - s.y) / s.ry) ** 2 <= 1;
    if (s.t === 'l') {
      const ex = s.x2 - s.x1, ey = s.y2 - s.y1, k = Math.max(0, Math.min(1, ((x - s.x1) * ex + (y - s.y1) * ey) / (ex * ex + ey * ey || 1)));
      return Math.hypot(x - s.x1 - ex * k, y - s.y1 - ey * k) <= s.w / 2;
    }
    let inside = false;
    for (let i = 0, j = s.pts.length - 1; i < s.pts.length; j = i++) {
      const [xi, yi] = s.pts[i], [xj, yj] = s.pts[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  const OCULTOS = new Set(['maw', 'teeth', 'tongue', 'pod']);
  /** Maw pieces that show in a pose: their fill is not covered by the opaque pieces drawn
   *  after them, or their outline (1.3 units, painted under every fill) peeks out of the figure. */
  const asoman = (rig: Rig, t: number, act: Act) => {
    const huesos = puppetBones(rig, puppetPose(rig, t, act).p);
    const opaca = (o: Piece) => o.k !== 'ink' && !EMISSIVE.has(o.k);
    const tapado = (wx: number, wy: number, cubre: (o: Piece, j: number) => boolean) =>
      rig.shapes.some((o, j) => cubre(o, j) && opaca(o) && dentro(o, huesos[o.b], wx, wy));
    const fuera = (s: Piece, grow: number, cubre: (o: Piece, j: number) => boolean) =>
      muestras(s, grow).some(([x, y]) => { const [wx, wy] = applyMatrix(huesos[s.b], x, y); return !tapado(wx, wy, cubre); });
    return rig.shapes.filter((s, i) => OCULTOS.has(s.k) && (fuera(s, 0, (_, j) => j > i) || fuera(s, 1.3, (o) => !OCULTOS.has(o.k))));
  };
  // rightmost world x of some pieces (the hero is to the right before mirroring)
  const frente = (rig: Rig, act: Act, cual: (s: Piece) => boolean) => {
    const huesos = puppetBones(rig, puppetPose(rig, 0, act).p);
    return Math.max(...rig.shapes.filter(cual).flatMap((s) => muestras(s, 0).map(([x, y]) => applyMatrix(huesos[s.b], x, y)[0])));
  };
  for (const id of mimicos) {
    const rig = ENEMY_RIGS[id];
    if (!rig) continue;
    const acciones = rig.actions ?? {};
    check(!!acciones.attack && !!acciones.hit && !!acciones.death, `${id}: tiene sus propias animaciones de ataque, golpe y muerte`);
    const dientes = rig.shapes.filter((s) => s.k === 'teeth').length;
    check(dientes >= 8 && rig.shapes.some((s) => s.k === 'tongue') && rig.shapes.some((s) => s.k === 'maw'), `${id}: esconde unas fauces con ${dientes} dientes y una lengua`);
    const reposo = [0, 0.7, 1.3, 2.1, 2.9, 3.6].map((t) => asoman(rig, t, null).length);
    check(reposo.every((n) => n === 0), `${id}: en reposo parece un mueble normal (piezas de la boca a la vista: ${reposo.join(', ')})`);
    check([0, 1.1, 2.4, 3.3].every((t) => puppetPose(rig, t, null).fx.blink), `${id}: en reposo tiene los ojos cerrados`);
    const impacto = puppetImpact(rig);
    const ataque = asoman(rig, 0, { type: 'attack', p: impacto });
    const vistos = ataque.filter((s) => s.k === 'teeth').length;
    check(vistos >= 6 && ataque.some((s) => s.k === 'tongue') && ataque.some((s) => s.k === 'maw'), `${id}: al atacar abre las fauces (${vistos} dientes a la vista) y saca la lengua`);
    check(!puppetPose(rig, 0, { type: 'attack', p: impacto }).fx.blink, `${id}: y abre los ojos`);
    const mueble = frente(rig, null, (s) => !OCULTOS.has(s.k)), lengua = frente(rig, { type: 'attack', p: impacto }, (s) => s.k === 'tongue');
    check(lengua > mueble + 10, `${id}: la lengua azota hacia el héroe (${(lengua - mueble).toFixed(0)} u por delante)`);
    check(asoman(rig, 0, { type: 'hit', p: 0.2 }).some((s) => s.k === 'teeth') && !puppetPose(rig, 0, { type: 'hit', p: 0.2 }).fx.blink,
      `${id}: un golpe le abre la boca y los ojos un instante`);
    check(asoman(rig, 0, { type: 'death', p: 0.5 }).some((s) => s.k === 'tongue') && puppetPose(rig, 0, { type: 'death', p: 0.95 }).fx.opacity === 0,
      `${id}: al morir se le escapa la lengua y se desvanece`);
  }
  const cofre = ENEMY_RIGS['mimico-cofre'];
  const patas = cofre ? asoman(cofre, 0, { type: 'attack', p: puppetImpact(cofre) }).filter((s) => s.k === 'pod').length : 0;
  check(patas >= 2, `el cofre saca patitas de pseudópodo al atacar (${patas})`);
} catch (e) {
  check(false, `las pruebas de los guardas dracónidos y los mímicos revientan: ${(e as Error).stack ?? e}`);
}

// ── Galería de sprites del menú principal ────────────────────────────────────
console.log('\n🎭 Galería de sprites');
{
  const secciones = galleryCatalogue();
  const todas = secciones.flatMap((s) => s.cards);
  const de = (kind: string) => todas.filter((f) => f.kind === kind);
  check(de('hero').length === 6, 'la galería muestra los 6 héroes');
  check(de('form').length === 6, 'y las 6 transformaciones del druida');
  check(de('invocation').length === 9, 'y las 9 invocaciones');
  const ids = de('enemy').map((f) => f.id);
  check(new Set(ids).size === ids.length, 'ningún enemigo sale repetido');
  check(Object.keys(ENEMY_RIGS).every((id) => ids.includes(id)), 'están todos los enemigos ilustrados');
  check(ids.every((id) => !!ENEMY_RIGS[id]), 'todos los que salen tienen marioneta');
  check(de('enemy').filter((f) => f.boss).length === 8, 'y los 7 jefes y la filacteria aparecen marcados como jefe');
  check(secciones.filter((s) => s.act !== undefined).length === 6, 'una sección por escenario (3 actos × 2)');
}

// ── Motor gráfico WebGL: empaquetado de marionetas y simulación de partículas ─
console.log('\n🖥️ Motor WebGL (partes puras)');
{
  const rigs = [...Object.values(HERO_RIGS), ...Object.values(FORM_RIGS), ...Object.values(ENEMY_RIGS), ...Object.values(INVOCATION_RIGS)];
  const grandes = rigs.flatMap((r) => r.shapes).filter((s) => s.t === 'p' && s.pts.length > MAX_POLY);
  check(grandes.length === 0, `ningún polígono pasa de ${MAX_POLY} vértices (límite de la GPU)`);
  const gob = ENEMY_RIGS['goblin-cortador'];
  const pk = packRig(gob, 'illustrated');
  check(pk.count === gob.shapes.length && pk.data.length === pk.count * PIECE_TEXELS * 4, 'empaqueta una fila de datos por pieza');
  const fila = (i: number, texel: number, c: number) => pk.data[(i * PIECE_TEXELS + texel) * 4 + c];
  const iInk = gob.shapes.findIndex((s) => s.k === 'ink');
  check((fila(iInk, 0, 2) & 2) === 2, 'las líneas de tinta van marcadas como tinta');
  check(gob.shapes.every((_, i) => fila(i, 0, 1) >= 0 && fila(i, 0, 1) < 12), 'cada pieza apunta a un hueso válido');
  check(Array.from(pk.data).every((v) => Number.isFinite(v)), 'sin valores NaN en los datos de la GPU');
  const sil = packRig(HERO_RIGS.barbaro, 'silhouette');
  const iSkin = HERO_RIGS.barbaro.shapes.findIndex((s) => s.k === 'skin');
  const colorSkin = [0, 1, 2].map((c) => sil.data[(iSkin * PIECE_TEXELS + 3) * 4 + c]);
  check(colorSkin.every((v) => v < 0.08), 'en silueta, la piel se pinta negra');
  // viewBox → píxeles: los pies (58,129) caen donde toca, también en espejo
  const m = spriteMatrix({ x: 100, y: 50, w: 140 }, false, 1);
  const pie = [m[0] * 58 + m[2] * 129 + m[4], m[1] * 58 + m[3] * 129 + m[5]];
  check(Math.abs(pie[0] - 158) < 1e-6 && Math.abs(pie[1] - 179) < 1e-6, 'la matriz de sprite coloca los pies en su sitio');
  const me = spriteMatrix({ x: 100, y: 50, w: 140 }, true, 1);
  check(Math.abs(me[0] * 58 + me[2] * 129 + me[4] - 182) < 1e-6, 'y los enemigos se reflejan para mirar al héroe');
  // partículas: nacen, caen con la gravedad y caducan
  const ps: Particle[] = [];
  spawnEffect(ps, 'tajo', 100, 100);
  check(ps.length === 18, 'un tajo lanza 18 chispas');
  const vy0 = ps[0].vy;
  stepParticles(ps, 0.016);
  check(ps[0].vy > vy0, 'la gravedad tira de las chispas hacia abajo');
  stepParticles(ps, 1);
  check(ps.length === 0, 'y desaparecen al acabar su vida');
}

// ── Actualizaciones mayores: novedades y avisos solo al cambiar de versión mayor ─
console.log('\n🔔 Actualizaciones mayores');
{
  check(majorOf('3.7.0') === 3 && majorOf('10.2.1') === 10, 'lee la versión mayor');
  check(isMajorUpgrade('3.7.0', '4.0.0'), '3.7.0 → 4.0.0 es una actualización mayor');
  check(!isMajorUpgrade('3.6.0', '3.7.0') && !isMajorUpgrade('4.0.0', '4.0.1'), 'las menores y los parches no lo son');
  check(!isMajorUpgrade(null, '4.0.0'), 'en la primera partida no se molesta con novedades');
  const log = [
    { version: '4.1.0', fecha: '', cambios: ['b'] }, { version: '4.0.0', fecha: '', cambios: ['a'] },
    { version: '3.7.0', fecha: '', cambios: ['z'] },
  ];
  check(majorChangelog(log, '4.1.0').map((e) => e.version).join() === '4.1.0,4.0.0', 'las novedades muestran toda la versión mayor actual');
  check(shouldNotifyMajor('3.7.0', '4.0.0', null), 'avisa de una versión mayor nueva');
  check(!shouldNotifyMajor('3.7.0', '4.0.0', '4.0.0'), 'pero solo una vez');
  check(!shouldNotifyMajor('3.7.0', '3.8.0', null), 'y nunca por versiones menores');
  check(!shouldNotifyMajor('4.0.0', '4.0.0', null), 'ni si ya la tienes instalada');
  check(noticesOn('1', null, 'granted') && noticesOn('1', '1', 'default'),
    'el interruptor de avisos sigue encendido al volver a entrar aunque el navegador diga que el permiso está pendiente');
  check(noticesOn(null, '1', 'granted') && !noticesOn('0', '1', 'granted'),
    'si se pierde el almacenamiento local, la elección se recupera de la copia del service worker');
  check(!noticesOn('1', '1', 'denied') && !noticesOn(null, null, 'granted') && !noticesOn('0', null, 'default'),
    'los avisos se ven apagados si están bloqueados o el jugador nunca los activó');
}

// ── Ilustraciones SVG dibujadas a mano (src/arte/cartas) ─────────────────────
console.log('\n🎨 Ilustraciones SVG de las cartas');
{
  const fs = await import('node:fs');
  const dir = new URL('../src/arte/cartas/', import.meta.url);
  const todas = [...BASICAS, ...DRUIDA, ...BARBARO, ...MAGO, ...PICARO, ...BRUJO, ...PALADIN, ...NEUTRALES_ESPECIALES, ...MALDICIONES, CONJURO_PRODIGIOSO, DAGA, GOLPE_SAGRADO, DEFENSA_SAGRADA];
  const ids = new Set(todas.map((c) => c.id));
  /** Minimal XML well-formedness: every opening tag closes, in order. */
  const bienFormado = (xml: string) => {
    const pila: string[] = [];
    for (const m of xml.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<(\/?)([a-zA-Z][\w:-]*)[^>]*?(\/?)>/g)) {
      const [, cierre, tag, auto] = m;
      if (auto) continue;
      if (cierre) { if (pila.pop() !== tag) return false; } else pila.push(tag);
    }
    return pila.length === 0;
  };
  const revisar = (sub: string, viewBox: string, maxKb: number) => {
    const carpeta = new URL(sub, dir);
    if (!fs.existsSync(carpeta)) return [] as string[];
    const archivos = fs.readdirSync(carpeta).filter((f: string) => f.endsWith('.svg'));
    const malos: string[] = [];
    for (const f of archivos) {
      const xml = fs.readFileSync(new URL(f, carpeta), 'utf8');
      const id = f.replace(/\.svg$/, '');
      if (!ids.has(id)) malos.push(`${f}: no es una carta`);
      else if (!xml.trimStart().startsWith('<svg') || !xml.includes(`viewBox="${viewBox}"`)) malos.push(`${f}: formato`);
      else if (/<(text|image|script)\b/.test(xml)) malos.push(`${f}: elemento prohibido`);
      else if (xml.length > maxKb * 1024) malos.push(`${f}: ${Math.round(xml.length / 1024)} KB`);
      else if (!bienFormado(xml)) malos.push(`${f}: XML mal formado`);
    }
    check(malos.length === 0, `${sub || 'normales'}: ${archivos.length} ilustraciones correctas ${malos.slice(0, 5).join(', ')}`);
    return archivos;
  };
  revisar('', '0 0 280 160', 14);
  const full = revisar('full/', '0 0 296 423', 28);
  check(full.every((f: string) => hasFullArt(todas.find((c) => `${c.id}.svg` === f)!)), 'las full art son de cartas con arte a toda carta');
  check(fs.existsSync(new URL('golpe.svg', dir)) && fs.existsSync(new URL('defender.svg', dir)), 'las básicas tienen su ilustración de referencia');
  const sinDibujo = todas.filter((c) => !fs.existsSync(new URL(`${c.id}.svg`, dir))).map((c) => c.id);
  check(sinDibujo.length === 0, `todas las cartas tienen su ilustración dibujada ${sinDibujo.slice(0, 8).join(', ')}`);
  const fullArt = todas.filter(hasFullArt);
  check(fullArt.length === 8 && fullArt.every((c) => fs.existsSync(new URL(`full/${c.id}.svg`, dir))),
    'las 8 cartas full art (6 únicas de clase, Seducir y Deseo) tienen su versión vertical');
  const tabla = { '../arte/cartas/golpe.svg': '/a/golpe.svg', '../arte/cartas/full/deseo.svg': '/a/deseo-full.svg' };
  check(pickSvg(tabla, 'golpe', false) === '/a/golpe.svg', 'la carta usa su SVG si existe');
  check(pickSvg(tabla, 'deseo', true) === '/a/deseo-full.svg' && pickSvg(tabla, 'deseo', false) === null, 'la full art busca en su carpeta');
  check(pickSvg(tabla, 'zarpazo', false) === null, 'sin SVG todavía, sigue con la ilustración anterior');
}

// ── Painted combat backgrounds and card particles ────────────────────────────
console.log('\n🌙 Fondos pintados y partículas de cartas');
{
  const fs = await import('node:fs');
  const fondos = [0, 1, 2].flatMap((c) => [0, 1].map((e) => sceneBackground(c, e)));
  check(new Set(fondos.map((f) => f.id)).size === 6, 'cada uno de los seis escenarios tiene su propio fondo');
  const existe = (f: string) => fs.existsSync(new URL(`../src/arte/fondos/${f}`, import.meta.url));
  check(fondos.every((f) => existe(f.wide) && existe(f.tall)), 'cada fondo tiene su imagen apaisada y la vertical para móvil');
  check(fondos.every((f) => f.wide.endsWith('.webp') && f.tall.endsWith('-movil.webp')), 'los fondos son WebP');
  const peso = (f: string) => fs.statSync(new URL(`../src/arte/fondos/${f}`, import.meta.url)).size;
  check(fondos.every((f) => peso(f.wide) < 450_000 && peso(f.tall) < 350_000), 'los fondos pesan poco para cargar rápido en el móvil');
  check(sceneBackground(1, 0).id === 'cripta' && sceneBackground(0, 0).id === 'asentamiento-ogro', 'el Asentamiento Ogro y la Cripta tienen su fondo temático');
  check(sceneBackground(7, 3).id === sceneBackground(0, 0).id, 'un escenario desconocido usa el primero');
  const motas: Particle[] = [];
  spawnEffect(motas, 'mota', 10, 10, 1, Math.random, '#a8e070');
  check(motas.length === 1 && motas[0].colour === '#a8e070' && motas[0].vy < 0, 'las motas de las cartas full art suben con el color de su clase');
}

// ── Banda sonora original en bucle sin cortes ────────────────────────────────
console.log('\n🎵 Banda sonora');
{
  const fs = await import('node:fs');
  const temas = ['menu', 'cap1', 'cap1-jefe', 'cap2', 'cap2-jefe', 'cap3', 'cap3-jefe'];
  check(temas.every((t) => MUSIC_TRACKS[t]), 'hay pista para el menú y para cada acto y su jefe');
  check(temas.every((t) => fs.existsSync(new URL(`../src/audio/${MUSIC_TRACKS[t].file}`, import.meta.url))), 'todas las pistas existen en src/audio');
  check(temas.every((t) => MUSIC_TRACKS[t].file.endsWith('.mp3') && MUSIC_TRACKS[t].loopSamples > 44100 * 30), 'las pistas son MP3 (suenan en Safari) con la longitud exacta del bucle');
  check(new Set(['cap1', 'cap2', 'cap3', 'menu'].map((t) => MUSIC_TRACKS[t].file)).size === 4, 'cada acto y el menú tienen su propia música');
  // the main theme «Brasas» (scripts/musica/menu-brasas): 28 bars of 4/4 at 84 BPM = 80 s
  check(MUSIC_TRACKS.menu.loopSamples === 3528000, 'el tema del menú «Brasas» dura su bucle exacto de 80 s');
  check(fs.statSync(new URL('../src/audio/menu.mp3', import.meta.url)).size > 1_400_000, 'y el MP3 del menú es el nuevo (VBR de calidad 2)');
  check(MUSIC_TRACKS['cap1-jefe'].file !== MUSIC_TRACKS['cap2-jefe'].file && MUSIC_TRACKS['cap2-jefe'].file !== MUSIC_TRACKS['cap3-jefe'].file, 'cada acto tiene su música de jefe');
  const bucle = 44100 * 60;
  const recortado = loopWindow(60, bucle);
  check(recortado.start === 0 && Math.abs(recortado.end - 60) < 1e-9, 'si el navegador ya quita el relleno del MP3, el bucle es la pista entera');
  const conRelleno = loopWindow(60 + (MP3_DELAY_SAMPLES + 900) / 44100, bucle);
  check(Math.abs(conRelleno.start - MP3_DELAY_SAMPLES / 44100) < 1e-9 && Math.abs(conRelleno.end - conRelleno.start - 60) < 1e-9, 'si el MP3 trae el relleno del códec, el bucle se lo salta y dura lo exacto');
  const corto = loopWindow(59, bucle);
  check(corto.start === 0 && corto.end === 59, 'una pista más corta de lo esperado se repite entera');
}

// ── Combat layout: fighters fit the scene height (landscape phones) ─────────
console.log('\n📐 Luchadores dentro del escenario');
{
  const fs = await import('node:fs');
  const css = fs.readFileSync(new URL('../src/estilos/combate.css', import.meta.url), 'utf8');
  const movil = fs.readFileSync(new URL('../src/estilos/movil.css', import.meta.url), 'utf8');
  check(/\.escenario\s*\{[^}]*container-type:\s*size/.test(css), 'el escenario mide su alto para que los sprites se adapten');
  check(/\.escenario \.sprite-marioneta\s*\{[^}]*max-width:[^;]*cqh/.test(css), 'los sprites no pasan del alto disponible, así la vida y los estados de los jefes no se cortan');
  check(/orientation: portrait[\s\S]*\.escenario\s*\{[^}]*container-type:\s*normal/.test(movil), 'en vertical el escenario crece con su contenido');
  const remHeroe = (texto: string) => Number(/\.sprite-silueta \.sprite-marioneta \{ width: ([\d.]+)rem/.exec(texto)?.[1] ?? 0);
  check(remHeroe(css) >= 11 && remHeroe(movil) >= 8, 'el héroe se ve grande (más que los enemigos normales)');
  check(/\.escenario \.sprite-silueta \.sprite-marioneta\s*\{[^}]*max-width:[^;]*cqh/.test(css), 'el héroe también se adapta al alto disponible, con menos margen porque no tiene intención ni rasgo');

  // Painted background runs under the hand: no strip cutting it on phones
  const ui = fs.readFileSync(new URL('../src/ui/combate.ts', import.meta.url), 'utf8');
  const apaisado = movil.slice(movil.indexOf('@media (orientation: landscape) and (max-height: 540px)'));
  const regla = (texto: string, sel: string) => new RegExp(`(?:^|[\\s,}])${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(texto)?.[1] ?? '';
  check(/montarFondo\(raiz\b/.test(ui), 'el fondo pintado cubre todo el combate, no solo el escenario');
  check(/\.fondo-reflejo\s*\{[^}]*scaleY\(-1\)/.test(css) && /\.fondo-escena img\s*\{[^}]*height:\s*var\(--alto-escenario/.test(css),
    'el escenario se ve igual que antes y el suelo se prolonga por detrás de la mano');
  const alfas = (texto: string) => [...texto.matchAll(/rgba\([^)]*,\s*([\d.]+)\)/g)].map((m) => Number(m[1]));
  const fondoMano = regla(apaisado, '.zona-mano');
  check(/background:/.test(fondoMano) && alfas(fondoMano).every((a) => a <= 0.4), 'en el móvil apaisado la mano no tiene franja opaca, solo una sombra suave');
  const fondoManoVertical = regla(movil.slice(movil.indexOf('@media (orientation: portrait) and (max-width: 700px)')), '.zona-mano');
  check(alfas(fondoManoVertical).length > 0 && Math.min(...alfas(fondoManoVertical)) <= 0.2, 'en vertical el fondo también asoma por detrás del HUD');
  const asomo = Number(/translateY\(calc\(var\(--alza, 0px\) \+ (\d+)px\)\)/.exec(regla(apaisado, '.mano .carta'))?.[1] ?? 999);
  check(asomo < 104 && asomo >= 70, `en el móvil apaisado la mano flota más arriba (${asomo}px ocultos, antes 104)`);
  check(['.orbe', '.btn-fin-turno', '.pila'].every((s) => /shadow/.test(regla(apaisado, s))), 'energía, fin de turno y pilas llevan sombra para leerse sobre el fondo');

  // Enemies keep their slot when others die or a boss summons more
  const slotsMod = await import('../src/ui/enemy-slots.ts').catch(() => null);
  check(slotsMod !== null, 'existe el reparto de huecos de enemigos (src/ui/enemy-slots.ts)');
  if (slotsMod) {
    const { layoutSlots } = slotsMod;
    type E = { id: string; vivo: boolean };
    const vivo = (e: E) => e.vivo;
    const [a, b, c] = ['a', 'b', 'c'].map((id) => ({ id, vivo: true }));
    let huecos = layoutSlots([], [a, b, c], vivo);
    check(huecos.map((e) => e.id).join() === 'a,b,c', 'al empezar, cada enemigo ocupa su hueco en orden');
    b.vivo = false;
    huecos = layoutSlots(huecos, [a, b, c], vivo);
    check(huecos.map((e) => e.id).join() === 'a,b,c', 'si muere el del medio, su hueco se queda y los demás no se mueven');
    const d = { id: 'd', vivo: true };
    huecos = layoutSlots(huecos, [a, b, c, d], vivo);
    check(huecos.map((e) => e.id).join() === 'a,d,c', 'una invocación ocupa el hueco libre del muerto');
    const [e1, e2] = ['e', 'f'].map((id) => ({ id, vivo: true }));
    huecos = layoutSlots(huecos, [a, b, c, d, e1, e2], vivo);
    check(huecos.slice(-3).map((e) => e.id).join() === 'a,d,c' && huecos.length === 5,
      'sin huecos libres, las invocaciones se añaden por la izquierda sin desplazar a los demás');
  }
  check(!/function renderEnemigos\(\)[\s\S]{0,400}if \(!e\.vivo\) return;/.test(ui) && /\.enemigo-hueco\s*\{[^}]*visibility:\s*hidden/.test(css),
    'los enemigos muertos dejan un hueco invisible del mismo tamaño');

  // Many statuses wrap into rows without widening the fighter
  check(/\.estados\s*\{[^}]*contain:\s*inline-size/.test(css), 'los estados se reparten en varias filas sin ensanchar al luchador');
  // Fighters stay put: status rows, temporary effects and long names never move the sprite
  check(!/--alto-estados/.test(css) && !/--alto-estados/.test(ui), 'el tamaño del sprite no depende de cuántos estados tenga (antes cambiaba y el luchador bailaba)');
  check(/\.heroe,\s*\.enemigo\s*\{[^}]*padding-bottom:\s*var\(--reserva-hud/.test(css), 'cada luchador reserva siempre el mismo hueco para dos filas de estados');
  check(/\.estados\s*\{[^}]*position:\s*absolute/.test(css) && /\.temporales\s*\{[^}]*position:\s*absolute/.test(css), 'los estados y los efectos temporales van fuera del flujo: aparecer no empuja al sprite');
  check(/\.enemigo-nombre\s*\{[^}]*white-space:\s*nowrap/.test(css), 'los nombres largos (Abaddon, el Demonio Mayor) no saltan de línea');
}

// ── Recorded-style sound effects (MP3 bank) ──────────────────────────────────
console.log('\n🔊 Efectos de sonido');
{
  const fs = await import('node:fs');
  let bank: typeof import('../src/fx/sfx-bank.ts') | null = null;
  try { bank = await import('../src/fx/sfx-bank.ts'); } catch { bank = null; }
  check(bank !== null, 'existe el banco de efectos de sonido (src/fx/sfx-bank.ts)');
  if (bank) {
    const { SFX_NAMES, FREQUENT_SFX, SFX_FALLBACK, groupSfxFiles, resolveSfx, pickVariant, playbackJitter } = bank;
    const carpeta = new URL('../src/audio/sfx/', import.meta.url);
    const mp3 = fs.existsSync(carpeta) ? fs.readdirSync(carpeta).filter((f: string) => f.endsWith('.mp3')) : [];
    const grupos = groupSfxFiles(Object.fromEntries(mp3.map((f: string) => [`../audio/sfx/${f}`, `/a/${f}`])));
    // Names the engine already uses plus every `fx` key of cards and enemies
    const fuentes = ['cartas.ts', 'enemigos.ts', 'combate.ts']
      .map((f) => fs.readFileSync(new URL(`../src/core/${f}`, import.meta.url), 'utf8')).join('\n');
    const clavesFx = new Set([...fuentes.matchAll(/fx: *'([a-zA-Z]+)'/g)].map((m) => m[1]));
    for (const m of fuentes.matchAll(/fxGolpe\([^)]*'([a-zA-Z]+)'\)/g)) clavesFx.add(m[1]);
    const delJuego = ['tajo', 'impacto', 'golpeEnemigo', 'bloqueo', 'cura', 'muerte', 'furia', 'divino', 'tierra',
      'raices', 'carta', 'estado', 'furiaPerdida', 'ui'];
    const deCartas = ['estrellas', 'sangre', 'abisal', 'luna', 'condena', 'veneno', 'transformacion', 'ola', 'zarpa',
      'oscuridad', 'hojas', 'aullido', 'corazones'];
    const faltanTabla = [...delJuego, ...deCartas, ...clavesFx].filter((n) => !SFX_NAMES.includes(n));
    check(faltanTabla.length === 0, `la tabla de nombres incluye todos los sonidos del juego y las claves fx ${faltanTabla.join(', ')}`);
    check(clavesFx.size >= 20 && deCartas.every((n) => clavesFx.has(n)), `se detectan las claves fx de cartas y enemigos (${clavesFx.size})`);
    const sinMp3 = SFX_NAMES.filter((n) => !(grupos.get(n)?.length));
    check(sinMp3.length === 0, `cada sonido tiene al menos un MP3 en src/audio/sfx ${sinMp3.join(', ')}`);
    const huerfanos = [...grupos.keys()].filter((n) => !SFX_NAMES.includes(n));
    check(huerfanos.length === 0, `no hay MP3 sin nombre en la tabla ${huerfanos.join(', ')}`);
    check(FREQUENT_SFX.every((n) => (grupos.get(n)?.length ?? 0) >= 2), 'los sonidos frecuentes tienen variaciones');
    // Paladin fx keys (docs/clase-paladin.md): each one sounds with its own file
    const delPaladin = ['martillo', 'escudoSagrado', 'bendicion', 'expulsar', 'rayoSagrado',
      ...['Divino', 'Trueno', 'Cegador', 'Fuego', 'Resplandor', 'Destierro'].map((e) => `castigo${e}`),
      ...['Divina', 'Trueno', 'Cegadora', 'Fuego', 'Resplandor', 'Destierro'].map((e) => `carga${e}`)];
    const paladinMudo = delPaladin.filter((n) => !SFX_NAMES.includes(n) || !(grupos.get(n)?.length));
    check(paladinMudo.length === 0, `cada efecto del paladín tiene su propio sonido ${paladinMudo.join(', ')}`);
    check(FREQUENT_SFX.includes('martillo') && (grupos.get('martillo')?.length ?? 0) >= 2, 'el martillo del paladín alterna varias versiones');
    const alias = bank.SFX_RECIPE_ALIAS ?? {};
    check(delPaladin.every((n) => delJuego.includes(alias[n])),
      'mientras cargan los MP3, los efectos del paladín suenan con una receta parecida');
    const peso = (f: string) => fs.statSync(new URL(f, carpeta)).size;
    const pesados = mp3.filter((f: string) => peso(f) > 32_000);
    const total = mp3.reduce((s: number, f: string) => s + peso(f), 0);
    // budget grown with the paladin's 17 sounds (about 170 KB) and the Doom bell and chains (about 67 KB)
    check(mp3.length > 0 && pesados.length === 0 && total < 900_000, `los MP3 pesan poco (${Math.round(total / 1024)} KB en total) ${pesados.join(', ')}`);
    check(resolveSfx('tajo') === 'tajo' && resolveSfx('noExiste') === SFX_FALLBACK && SFX_NAMES.includes(SFX_FALLBACK),
      'un nombre desconocido suena con el efecto de respaldo');
    check(pickVariant(3, 1, () => 0.4) !== 1 && pickVariant(1, 0, Math.random) === 0, 'las variaciones no repiten la anterior');
    const extremos = [playbackJitter(() => 0), playbackJitter(() => 0.999)];
    check(extremos.every((j) => j.rate > 0.9 && j.rate < 1.1 && j.gain > 0.8 && j.gain <= 1), 'la variación de tono y volumen es pequeña');
    check(grupos.get('tajo')?.every((u: string) => u.startsWith('/a/tajo')) === true, 'las variaciones se agrupan por nombre de archivo');
  }
}

// ── Doom (Condena) sounds: funeral bell when applied, spectral chains when it kills ──
console.log('\n🔔 Sonidos de la Condena');
{
  const fs = await import('node:fs');
  const bank = await import('../src/fx/sfx-bank.ts');
  const carpeta = new URL('../src/audio/sfx/', import.meta.url);
  const mp3 = fs.readdirSync(carpeta).filter((f: string) => f.endsWith('.mp3'));
  const grupos = bank.groupSfxFiles(Object.fromEntries(mp3.map((f: string) => [`../audio/sfx/${f}`, `${f}`])));
  const nuevos = ['campanaCondena', 'cadenasCondena'];
  check(nuevos.every((n) => bank.SFX_NAMES.includes(n) && bank.resolveSfx(n) === n), 'la campana y las cadenas de la Condena están en la tabla de sonidos');
  check(nuevos.every((n) => (grupos.get(n)?.length ?? 0) >= 1), 'la campana y las cadenas de la Condena tienen su MP3');
  check((grupos.get('campanaCondena')?.length ?? 0) >= 2, 'la campana de la Condena alterna variaciones (puede sonar varias veces por turno)');
  const motor = ['tajo', 'impacto', 'golpeEnemigo', 'bloqueo', 'cura', 'muerte', 'furia', 'divino', 'tierra',
    'raices', 'carta', 'estado', 'furiaPerdida', 'ui'];
  check(nuevos.every((n) => motor.includes(bank.SFX_RECIPE_ALIAS[n])), 'mientras cargan, la campana y las cadenas suenan con una receta grave parecida');
  // 96 kbps CBR: the size gives the length in seconds
  const segundos = (f: string) => (fs.statSync(new URL(f, carpeta)).size * 8) / 96_000;
  const dura = (n: string, min: number, max: number) => (grupos.get(n) ?? []).length > 0
    && (grupos.get(n) ?? []).every((f: string) => segundos(f) >= min && segundos(f) <= max);
  check(dura('campanaCondena', 1.4, 2.6), 'la campana fúnebre resuena entre 1,5 y 2,5 s');
  check(dura('cadenasCondena', 1.4, 2.1), 'las cadenas arrastran el alma entre 1,5 y 2 s');
}

// ── Articulated wings: shoulder, forearm and fingers with a travelling wave ──
console.log('\n🐉 Alas articuladas');
{
  const alados = ['ignifax', 'draco-joven', 'draco-veterano', 'diablillo', 'demonio-menor', 'demonio-mayor'];
  const rigs = [...alados.map((id) => [id, ENEMY_RIGS[id]] as const), ['invocación demonio', INVOCATION_RIGS['demonio']] as const];
  check(rigs.every(([, r]) => !!r?.wings?.B && !!r?.wings?.F), 'Ignifax, los dracos y los demonios alados tienen alas articuladas por los dos lados');
  // world-space points of a shape (enough to bound it)
  const puntos = (s: (typeof rigs)[number][1]['shapes'][number]): [number, number][] =>
    s.t === 'p' ? s.pts : s.t === 'l' ? [[s.x1, s.y1], [s.x2, s.y2]] : s.t === 'c' ? [[s.x - s.r, s.y - s.r], [s.x + s.r, s.y + s.r]] : [[s.x - s.rx, s.y - s.ry], [s.x + s.rx, s.y + s.ry]];
  const angulo = (m: number[]) => (Math.atan2(m[1], m[0]) * 180) / Math.PI;
  for (const [nombre, rig] of rigs) {
    if (!rig?.wings) continue;
    for (const lado of ['B', 'F'] as const) {
      const [hombro, brazo, ...dedos] = WING_BONES[lado];
      const cadena = boneParent(dedos[0]) === brazo && boneParent(brazo) === hombro;
      const conPiezas = [hombro, brazo, ...dedos].filter((b) => rig.shapes.some((s) => s.b === b)).length;
      check(cadena && conPiezas >= 4, `${nombre} (${lado}): hombro → antebrazo → dedos encadenados, con piezas en ${conPiezas} huesos`);
      const paneles = dedos.filter((b) => rig.shapes.some((s) => s.b === b && s.t === 'p' && s.k === 'wing'));
      check(paneles.length >= 2, `${nombre} (${lado}): la membrana está dividida en paneles unidos a los dedos`);
    }
    // travelling wave: the tip reaches its peak after the shoulder
    const T = 1 / 1.1, N = 240;
    let tHombro = 0, tPunta = 0, maxH = -Infinity, maxP = -Infinity;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * T;
      const p = puppetPose(rig, t, null).p;
      const h = p.wingF, punta = p.wingF + p.wingFArm + p.wingFF1;
      if (h > maxH) { maxH = h; tHombro = t; }
      if (punta > maxP) { maxP = punta; tPunta = t; }
    }
    const retraso = (((tPunta - tHombro) % T) + T) % T;
    check(retraso > 0.03 * T && retraso < 0.5 * T, `${nombre}: la punta va retrasada respecto al hombro (${Math.round((retraso / T) * 360)}°)`);
    // downstroke spreads the wing, upstroke folds it
    let bajada = 0, nb = 0, subida = 0, ns = 0;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * T;
      const a = puppetPose(rig, t, null).p, b = puppetPose(rig, t + 0.004, null).p;
      const span = wingSpan(rig, puppetBones(rig, a), 'F');
      if (b.wingF > a.wingF) { bajada += span; nb++; } else { subida += span; ns++; }
    }
    bajada /= nb; subida /= ns;
    check(bajada > subida * 1.08, `${nombre}: el ala se extiende al bajar y se pliega al subir (${bajada.toFixed(1)} vs ${subida.toFixed(1)})`);
    // actions: open wide to attack, shrink when hit
    const reposo = wingSpan(rig, puppetBones(rig, puppetPose(rig, 0, null).p), 'F');
    const ataque = wingSpan(rig, puppetBones(rig, puppetPose(rig, 0, { type: 'attack', p: 0.5 }).p), 'F');
    const golpe = wingSpan(rig, puppetBones(rig, puppetPose(rig, 0, { type: 'hit', p: 0.2 }).p), 'F');
    check(ataque > golpe * 1.1, `${nombre}: abre las alas al atacar y las encoge al recibir un golpe`);
    // the wing stays inside the puppet box (140×135 viewBox, overflow allowed up to a quarter)
    const art = rig.art ?? 1, alas = new Set<string>([...WING_BONES.B, ...WING_BONES.F]);
    let fuera = 0;
    const momentos: [number, Parameters<typeof puppetPose>[2]][] = [
      ...Array.from({ length: 24 }, (_, i) => [(i / 24) * T, null] as [number, null]),
      ...(['attack', 'spell', 'hit', 'death'] as const).flatMap((type) => [0.2, 0.4, 0.6, 0.8].map((q) => [0, { type, p: q }] as [number, { type: typeof type; p: number }])),
    ];
    for (const [t, accion] of momentos) {
      const huesos = puppetBones(rig, puppetPose(rig, t, accion).p);
      for (const s of rig.shapes) {
        if (!alas.has(s.b)) continue;
        for (const [x, y] of puntos(s)) {
          const m = huesos[s.b];
          const wx = 58 + art * (m[0] * x + m[2] * y + m[4] - 58), wy = 129 + art * (m[1] * x + m[3] * y + m[5] - 129);
          if (wx < -35 || wx > 175 || wy < -34 || wy > 135) fuera++;
        }
      }
    }
    check(fuera === 0, `${nombre}: las alas caben en la caja de la marioneta (${fuera} puntos fuera)`);
  }
  // heroes and druid forms keep their wing bones still
  const aguila = heroPose('aguila' as never, 0.3, null).p;
  check(aguila.wingFArm === 0 && aguila.wingBF1 === 0, 'las formas del druida no usan los huesos nuevos del ala');
  const packed = packRig(ENEMY_RIGS['ignifax'], 'illustrated');
  check(packed.count === ENEMY_RIGS['ignifax'].shapes.length && packed.data.every(Number.isFinite), 'Ignifax se empaqueta para la GPU con sus huesos nuevos');
}

// ── Enemy art: serpentine eye stalks, wings behind the head, the Elder Brain ──
console.log('\n👁️ Contemplador, alas detrás de la cabeza y Cerebro Anciano');
{
  type Rig = (typeof ENEMY_RIGS)[string];
  type Bone = Parameters<typeof boneParent>[0];
  type Act = Parameters<typeof puppetPose>[2];
  // bones from the torso (excluded) down to `tip`
  const chainTo = (rig: Rig, tip: Bone): Bone[] => {
    const out: Bone[] = [];
    for (let b: Bone | null = tip; b && b !== 'torso' && b !== 'root'; b = boneParent(b, rig)) out.unshift(b);
    return out;
  };
  // appendages: chains ending on the bones that carry a piece of `tipKey`, or leaves of `bodyKey` bones
  const appendages = (rig: Rig, tipKey: string, leavesOf?: string): Bone[][] => {
    const own = new Set(rig.shapes.filter((s) => s.k === (leavesOf ?? tipKey) && s.b !== 'torso').map((s) => s.b));
    const tips = leavesOf ? [...own].filter((b) => ![...own].some((o) => o !== b && boneParent(o, rig) === b)) : [...own];
    return tips.map((b) => chainTo(rig, b));
  };
  const series = (rig: Rig, bone: Bone, t0: number, dur: number, act?: (t: number) => Act) =>
    Array.from({ length: Math.round(dur * 60) }, (_, i) => puppetPose(rig, t0 + i / 60, act ? act(i / 60) : null).p[bone as 'torso']);
  // lag (s) of b behind a that best aligns them (positive: b follows a)
  const lagOf = (a: number[], b: number[]) => {
    const ma = a.reduce((s, v) => s + v, 0) / a.length, mb = b.reduce((s, v) => s + v, 0) / b.length;
    let best = 0, bestK = 0;
    for (let k = -30; k <= 45; k++) {
      let c = 0;
      for (let i = 45; i < a.length - 45; i++) c += (a[i] - ma) * (b[i + k] - mb);
      if (c > best) { best = c; bestK = k; }
    }
    return bestK / 60;
  };
  const range = (v: number[]) => Math.max(...v) - Math.min(...v);
  // mean angular speed of a set of bones over a window, optionally mid-action
  const restless = (rig: Rig, bones: Bone[], act?: (q: number) => Act) => {
    let sum = 0;
    for (let i = 1; i < 36; i++) {
      const q0 = 0.25 + ((i - 1) / 35) * 0.5, q1 = 0.25 + (i / 35) * 0.5;
      const a = puppetPose(rig, q0 * 0.8, act ? act(q0) : null).p, b = puppetPose(rig, q1 * 0.8, act ? act(q1) : null).p;
      for (const bone of bones) sum += Math.abs(b[bone as 'torso'] - a[bone as 'torso']);
    }
    return sum;
  };
  const worldBox = (rig: Rig) => {
    const bones = puppetBones(rig, puppetPose(rig, 0, null).p);
    let y0 = Infinity, y1 = -Infinity;
    for (const s of rig.shapes) {
      const pts: [number, number][] = s.t === 'p' ? s.pts : s.t === 'l' ? [[s.x1, s.y1 - s.w / 2], [s.x2, s.y2 + s.w / 2]]
        : s.t === 'c' ? [[s.x, s.y - s.r], [s.x, s.y + s.r]] : [[s.x, s.y - s.ry], [s.x, s.y + s.ry]];
      for (const [x, y] of pts) { const m = bones[s.b]; const wy = m[1] * x + m[3] * y + m[5]; y0 = Math.min(y0, wy); y1 = Math.max(y1, wy); }
    }
    return (y1 - y0) * (rig.art ?? 1);
  };
  const bbox = (s: Rig['shapes'][number]) => {
    const pts: [number, number][] = s.t === 'p' ? s.pts : s.t === 'l' ? [[s.x1, s.y1], [s.x2, s.y2]] : s.t === 'c' ? [[s.x - s.r, s.y - s.r], [s.x + s.r, s.y + s.r]] : [[s.x - s.rx, s.y - s.ry], [s.x + s.rx, s.y + s.ry]];
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  };
  const serpentine = (name: string, rig: Rig, chains: Bone[][]) => {
    const peaks = new Set<number>();
    let lagging = 0, moving = 0;
    for (const chain of chains) {
      const root = series(rig, chain[0], 0, 6), tip = series(rig, chain[chain.length - 1], 0, 6);
      if (lagOf(root, tip) > 0.02) lagging++;
      if (chain.every((b) => range(series(rig, b, 0, 3)) > 3)) moving++;
      peaks.add(Math.round(root.slice(0, 180).indexOf(Math.max(...root.slice(0, 180))) / 6));
    }
    const any = chains.length > 0;
    check(any && moving === chains.length, `${name}: todas las articulaciones se mueven en reposo (${moving}/${chains.length})`);
    check(any && lagging === chains.length, `${name}: una onda viaja de la raíz a la punta de cada apéndice (${lagging}/${chains.length})`);
    check(any && peaks.size >= Math.min(5, chains.length), `${name}: los apéndices van desfasados entre sí (${peaks.size} fases distintas)`);
  };

  // — El Contemplador —
  const beholder = ENEMY_RIGS['contemplador'];
  const stalks = appendages(beholder, 'sclera');
  check(stalks.length >= 10, `el Contemplador tiene ${stalks.length} tallos oculares (≥ 10)`);
  check(stalks.filter((c) => c.length >= 3).length >= 8 && stalks.every((c) => c.length >= 2), 'sus tallos son cadenas de varios segmentos (8 de 3 o más, ninguno de 1)');
  check(new Set(stalks.flat()).size === stalks.flat().length, 'cada tallo tiene sus propias articulaciones');
  check(stalks.flat().every((b) => beholder.shapes.some((s) => s.b === b && s.k === 'flesh')), 'cada segmento del tallo tiene su trozo de carne');
  serpentine('Contemplador', beholder, stalks.filter((c) => c.length >= 3));
  const stalkBones = stalks.flat();
  const calm = restless(beholder, stalkBones), angry = restless(beholder, stalkBones, (q) => ({ type: 'attack', p: q }));
  check(angry > calm * 1.4, `los tallos se agitan más al atacar (${angry.toFixed(0)} vs ${calm.toFixed(0)} en reposo)`);
  const fangs = beholder.shapes.filter((s) => s.k === 'teeth' || s.k === 'fang');
  check(fangs.length >= 14 && fangs.filter((s) => bbox(s).h >= 8).length >= 4, `boca con ${fangs.length} dientes, colmillos largos incluidos`);
  const mouth = beholder.shapes.find((s) => s.k === 'socket' && s.b === 'torso');
  check(!!mouth && bbox(mouth).w >= 36, `la boca es grande (${mouth ? bbox(mouth).w.toFixed(0) : 0} de ancho)`);
  check(beholder.shapes.filter((s) => s.k === 'vein').length >= 4 && ['iris', 'pupil', 'glint'].every((k) => beholder.shapes.some((s) => s.k === k)),
    'el ojo central tiene venas, iris, pupila rasgada y brillo');
  check(beholder.shapes.filter((s) => s.k === 'chitin').length >= 5 && beholder.shapes.filter((s) => s.k === 'scar').length >= 3, 'placas quitinosas y cicatrices en el cuerpo');
  check(!!beholder.aura && beholder.shapes.length <= 110, `conserva el aura y no se pasa de piezas (${beholder.shapes.length} ≤ 110)`);
  const tipBones = new Set(stalks.map((c) => c[c.length - 1]));
  const eyeEmitters = (beholder.emitters ?? []).filter((e) => e.effect === 'ojo');
  check(eyeEmitters.length === stalks.length && eyeEmitters.every((e) => tipBones.has(e.bone)), 'cada ojo de tallo echa sus partículas desde la punta');

  // — Wings always behind the head and the neck —
  const winged = [...Object.entries(ENEMY_RIGS), ...Object.entries(INVOCATION_RIGS).map(([id, r]) => [`invocación ${id}`, r] as const)]
    .filter(([, r]) => !!r.wings);
  check(winged.length >= 7, `${winged.length} figuras con alas articuladas`);
  const wingBones = new Set<string>([...WING_BONES.B, ...WING_BONES.F]);
  for (const [id, rig] of winged) {
    const lastWing = rig.shapes.reduce((m, s, i) => (wingBones.has(s.b) ? i : m), -1);
    const firstHead = rig.shapes.findIndex((s) => s.b === 'head');
    // draw order is the shape order in every pose and action (no renderer sorts pieces)
    check(lastWing >= 0 && firstHead > lastWing, `${id}: las alas se dibujan detrás de la cabeza y el cuello (ala ${lastWing} < cabeza ${firstHead})`);
  }

  // — El Cerebro Anciano —
  const brainRig = ENEMY_RIGS['cerebro-anciano'];
  const tentacles = appendages(brainRig, 'tentacle', 'tentacle');
  check(tentacles.filter((c) => c.length >= 3).length >= 6, `el Cerebro Anciano cuelga ${tentacles.length} tentáculos articulados (≥ 6 de 3 segmentos)`);
  serpentine('Cerebro Anciano', brainRig, tentacles.filter((c) => c.length >= 3));
  const lobes = (['head', 'cape'] as Bone[]).filter((b) => brainRig.shapes.some((s) => s.b === b && s.k === 'flesh'));
  check(lobes.length >= 1 && lobes.every((b) => range(series(brainRig, b, 0, 3)) > 1.5), 'los lóbulos laten y abren y cierran los surcos');
  check(brainRig.shapes.filter((s) => s.k === 'eyeGlow').length >= 3, 'ojos incrustados en la masa cerebral');
  check(brainRig.shapes.filter((s) => s.k === 'magic').length >= 5, 'venas de brillo psiónico');
  check(worldBox(brainRig) >= 80, `el cerebro es enorme (${worldBox(brainRig).toFixed(0)} de alto, antes 64)`);
  check(brainRig.shapes.length <= 90, `y no se pasa de piezas (${brainRig.shapes.length} ≤ 90)`);
}

// ── Spell VFX: one distinct composition per card fx key (pure part) ─────────
console.log('\n✨ Efectos de hechizos');
{
  const sf = await import('../src/fx/spell-fx.ts');
  const { SPELLS, spellFrame, vinePath, SpellSystem, spellSignature, MAX_SPELL_SPRITES, MAX_LIVE_SPRITES } = sf;
  const todas: CartaDef[] = [...BASICAS, ...DRUIDA, ...BARBARO, ...MAGO, ...PICARO, ...BRUJO, ...PALADIN, ...NEUTRALES_ESPECIALES, CONJURO_PRODIGIOSO, DAGA, GOLPE_SAGRADO, DEFENSA_SAGRADA];
  const claves = new Set<string>(todas.map((d) => d.fx).filter((k): k is string => !!k));
  for (const k of ['estrellas', 'tajo', 'bloqueo', 'furia', 'impacto', 'sangre', 'abisal', 'luna', 'condena', 'tierra', 'veneno',
    'transformacion', 'ola', 'muerte', 'zarpa', 'oscuridad', 'hojas', 'aullido', 'raices', 'divino', 'corazones']) claves.add(k);
  const lista = [...claves];
  check(lista.length >= 21, `hay al menos 21 claves fx en las cartas (${lista.length})`);
  for (const k of lista) check(!!SPELLS[k], `la clave fx «${k}» tiene un efecto propio`);
  // enemy signature moves get their own effect too
  for (const k of ['aliento', 'rayoOcular']) check(!!SPELLS[k], `la acción enemiga «${k}» tiene un efecto propio`);
  const todasClaves = [...lista, 'aliento', 'rayoOcular'].filter((k) => SPELLS[k]);
  check(new Set(todasClaves.map((k) => SPELLS[k].build)).size === todasClaves.length, 'cada efecto se compone con su propia función (nada de variantes de un mismo estallido)');
  const firmas = new Map<string, string>();
  for (const k of todasClaves) {
    const f = spellSignature(k);
    const igual = [...firmas].find(([, v]) => v === f);
    check(!igual, `«${k}» se ve distinto de ${igual ? `«${igual[0]}»` : 'los demás'}`);
    firmas.set(k, f);
  }
  const box = { x: 600, y: 200, w: 160, h: 200 };
  const ctx = { box, from: { x: 200, y: 300 }, facing: -1 as const, seed: 7 };
  for (const k of todasClaves) {
    const d = SPELLS[k];
    check(d.duration >= 0.4 && d.duration <= 1.4, `«${k}» dura entre 0,4 y 1,4 s (${d.duration})`);
    check(d.phases[0] > 0 && d.phases[0] < d.phases[1] && d.phases[1] < 1, `«${k}»: anticipación < impacto < disipación`);
    let maximo = 0, roto = 0, enImpacto = 0;
    for (let t = 0; t <= d.duration; t += 1 / 30) {
      const fr = spellFrame(k, ctx, t);
      maximo = Math.max(maximo, fr.length);
      if (t >= d.phases[0] * d.duration && t <= d.phases[1] * d.duration) enImpacto = Math.max(enImpacto, fr.length);
      for (const s of fr) {
        const a = s.alpha ?? 1;
        if (![s.x, s.y, s.size, s.angle, a, s.stretch ?? 1, s.param ?? 0].every(Number.isFinite) || a < 0 || a > 1 || s.size <= 0) roto++;
      }
    }
    check(roto === 0, `«${k}»: todos los elementos tienen posición, tamaño y alfa válidos (${roto} rotos)`);
    check(maximo <= MAX_SPELL_SPRITES, `«${k}» no pasa del tope de ${MAX_SPELL_SPRITES} elementos (${maximo})`);
    check(enImpacto > 0, `«${k}» se ve en su fase de impacto`);
    check(spellFrame(k, ctx, d.duration + 0.01).length === 0, `«${k}» desaparece al terminar`);
  }
  // who receives each effect
  for (const k of ['bloqueo', 'transformacion', 'furia']) check(SPELLS[k].anchor === 'self', `«${k}» se lanza sobre el héroe`);
  for (const k of ['tajo', 'zarpa', 'raices', 'condena', 'veneno', 'luna', 'impacto', 'sangre', 'abisal', 'muerte', 'oscuridad', 'corazones'])
    check(SPELLS[k].anchor === 'target', `«${k}» se lanza sobre el objetivo`);
  // roots: sprout from the ground and end up coiled around the target box
  const xs: number[] = [];
  for (let i = 0; i < 4; i++) {
    const p = vinePath(box, i, 4, 1, 1);
    const base = p[0], punta = p[p.length - 1];
    xs.push(...p.map((q) => q.x));
    check(base.y >= box.y + box.h * 0.95, `raíz ${i}: brota del suelo`);
    check(punta.x >= box.x && punta.x <= box.x + box.w && punta.y >= box.y && punta.y <= box.y + box.h * 0.25, `raíz ${i}: la punta acaba arriba, dentro del objetivo`);
    let cruces = 0;
    for (let j = 1; j < p.length; j++) if ((p[j - 1].x - (box.x + box.w / 2)) * (p[j].x - (box.x + box.w / 2)) < 0) cruces++;
    check(cruces >= 2, `raíz ${i}: se enrosca alrededor del objetivo (${cruces} vueltas)`);
    const media = vinePath(box, i, 4, 0.5, 1);
    check(media[media.length - 1].y > punta.y + box.h * 0.2, `raíz ${i}: crece desde abajo`);
    const apretada = vinePath(box, i, 4, 1, 0.8);
    const ancho = (q: { x: number }[]) => Math.max(...q.map((v) => v.x)) - Math.min(...q.map((v) => v.x));
    check(ancho(apretada) < ancho(p), `raíz ${i}: aprieta al objetivo`);
  }
  check(Math.max(...xs) - Math.min(...xs) >= box.w * 0.85, 'las raíces envuelven todo el ancho del objetivo');
  const dRaiz = SPELLS.raices;
  const enRaiz = spellFrame('raices', ctx, dRaiz.duration * (dRaiz.phases[0] + dRaiz.phases[1]) / 2).filter((s) => s.shape === 'capsula');
  check(enRaiz.length > 20 && enRaiz.every((s) => s.x >= box.x - box.w * 0.15 && s.x <= box.x + box.w * 1.15 && s.y >= box.y - box.h * 0.1 && s.y <= box.y + box.h * 1.12),
    'las lianas se quedan pegadas a la caja del objetivo');
  // shield in front of the hero, beam from above, rune falling, wave travelling from the caster
  const heroe = { box: { x: 100, y: 250, w: 120, h: 180 }, facing: 1 as const, seed: 3 };
  const escudo = spellFrame('bloqueo', heroe, SPELLS.bloqueo.duration * 0.5).filter((s) => s.shape === 'escudo');
  check(escudo.length > 0 && escudo.every((s) => s.x > heroe.box.x + heroe.box.w / 2), 'el escudo se materializa delante del héroe');
  check(spellFrame('divino', ctx, SPELLS.divino.duration * 0.4).some((s) => s.shape === 'haz' && s.y - s.size * (s.stretch ?? 1) < box.y), 'el haz divino baja desde arriba');
  // Doom: a spectral bell tolls over the target (the falling rune, «la estrella que cae», is gone)
  const dCond = SPELLS.condena, tToll = dCond.duration * dCond.phases[0];
  const campana = (t: number) => sf.spellMarks('condena', ctx, t).find((m) => m.kind === 'campana');
  check(!!campana(0.08) && campana(0.08)!.y < box.y + box.h * 0.2 && Math.abs(campana(0.08)!.x - (box.x + box.w / 2)) < box.w * 0.25,
    'la condena hace aparecer una campana espectral sobre el objetivo');
  check([...Array(45).keys()].every((i) => spellFrame('condena', ctx, (i / 44) * dCond.duration).every((s) => s.shape !== 'runa')),
    'ya no cae ninguna runa sobre el objetivo');
  check(sf.spellMarks('condena', ctx, tToll + 0.01).some((m) => m.kind === 'tanido')
    && !sf.spellMarks('condena', ctx, tToll - 0.08).some((m) => m.kind === 'tanido'), 'la campana tañe al final de la anticipación');
  const ondaMax = (t: number) => Math.max(0, ...spellFrame('condena', ctx, t).filter((s) => s.shape === 'anillo').map((s) => s.size * Math.max(1, s.stretch ?? 1)));
  check(ondaMax(tToll + 0.3) > ondaMax(tToll + 0.06) * 1.4 && ondaMax(tToll + 0.3) > box.w * 0.4, 'el tañido expande ondas');
  const labio = [0.05, 0.12, 0.2, 0.28].map((d) => campana(tToll + d)?.x ?? NaN);
  check(labio.every(Number.isFinite) && Math.max(...labio) - Math.min(...labio) > 4, 'la campana se balancea al tañer');
  const { DOOM_TOLL_AT } = await import('../src/fx/doom-chains.ts').catch(() => ({ DOOM_TOLL_AT: NaN }));
  check(Math.abs(DOOM_TOLL_AT - tToll) < 0.02, `el sonido y las cadenas esperan al tañido (${Math.round(DOOM_TOLL_AT * 1000)} ms)`);
  const cresta = (t: number) => { const f = spellFrame('ola', ctx, t).filter((s) => s.shape === 'capsula'); return f.reduce((m, s) => m + s.x, 0) / Math.max(1, f.length); };
  check(cresta(0.45) > cresta(0.15), 'la ola avanza desde el lanzador hacia el objetivo');
  check(spellFrame('zarpa', ctx, SPELLS.zarpa.duration * 0.4).filter((s) => s.shape === 'capsula' && (s.param ?? 0) > 0.5 && (s.stretch ?? 1) > 4).length >= 3, 'la zarpa deja tres surcos');
  check(spellFrame('luna', ctx, SPELLS.luna.duration * 0.4).some((s) => s.shape === 'media-luna'), 'la luna corta con una media luna');
  check(spellFrame('aullido', ctx, SPELLS.aullido.duration * 0.5).filter((s) => s.shape === 'arco' || s.shape === 'anillo').length >= 3, 'el aullido expande ondas');
  check(spellFrame('veneno', ctx, SPELLS.veneno.duration * 0.5).some((s) => s.shape === 'burbuja') && spellFrame('veneno', ctx, SPELLS.veneno.duration * 0.5).some((s) => s.shape === 'gota'), 'el veneno burbujea y gotea');
  const aliento = spellFrame('aliento', { box: heroe.box, from: { x: 700, y: 260 }, seed: 1 }, 0.15);
  check(aliento.some((s) => s.x > 500), 'el aliento de fuego sale de la boca del dragón');
  // live budget across simultaneous spells
  const sys = new SpellSystem();
  for (let i = 0; i < 12; i++) sys.add(todasClaves[i % todasClaves.length], { ...ctx, seed: i }, 0);
  let pico = 0;
  for (let t = 0; t < 1.5; t += 0.05) pico = Math.max(pico, sys.frame(t, MAX_LIVE_SPRITES - 100).length);
  check(pico <= MAX_LIVE_SPRITES - 100, `varios hechizos a la vez respetan el tope de elementos vivos (${pico})`);
  sys.frame(2, MAX_LIVE_SPRITES);
  check(sys.active === 0, 'los hechizos terminados se retiran');
}

// ── Title screen: class choice shows the animated heroes ────────────────────
console.log('\n🎬 Selección de héroe');
{
  const fs = await import('node:fs');
  const titulo = fs.readFileSync(new URL('../src/ui/titulo.ts', import.meta.url), 'utf8');
  check(/new HeroSprite\(/.test(titulo) && /PuppetStage\.create\(/.test(titulo), 'la pantalla de inicio muestra el sprite animado de cada clase');
  check(!/clase-icono">[^<]/.test(titulo), 'ya no quedan emojis en la elección de clase');
  check(/destroy\(\)/.test(titulo), 'los sprites de la portada se liberan al elegir');
}

// ── Hand-drawn relic illustrations (src/arte/reliquias) ──────────────────────
console.log('\n💎 Arte de las reliquias');
{
  const fs = await import('node:fs');
  const relicModule: Record<string, unknown> = await import('../src/core/reliquias.ts');
  const { pickRelicSvg, relicIcon } = await import('../src/ui/relic-art.ts');
  type RelicLike = { id: string; nombre: string; icono: string; texto: string };
  const isRelic = (x: unknown): x is RelicLike =>
    !!x && typeof x === 'object' && typeof (x as RelicLike).id === 'string'
    && typeof (x as RelicLike).icono === 'string' && typeof (x as RelicLike).texto === 'string';
  // Every relic exported by reliquias.ts, alone or inside an exported array/record.
  const relics = new Map<string, RelicLike>();
  for (const value of Object.values(relicModule)) {
    const items = Array.isArray(value) ? value : isRelic(value) ? [value] : value && typeof value === 'object' ? Object.values(value) : [];
    for (const item of items) if (isRelic(item)) relics.set(item.id, item);
  }
  const dir = new URL('../src/arte/reliquias/', import.meta.url);
  const files: string[] = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f: string) => f.endsWith('.svg')) : [];
  const wellFormed = (xml: string) => {
    const stack: string[] = [];
    for (const m of xml.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<(\/?)([a-zA-Z][\w:-]*)[^>]*?(\/?)>/g)) {
      const [, closing, tag, selfClosing] = m;
      if (selfClosing) continue;
      if (closing) { if (stack.pop() !== tag) return false; } else stack.push(tag);
    }
    return stack.length === 0;
  };
  const missing = [...relics.keys()].filter((id) => !files.includes(`${id}.svg`));
  check(relics.size > 0 && missing.length === 0, `las ${relics.size} reliquias tienen su ilustración ${missing.slice(0, 8).join(', ')}`);
  const orphans = files.filter((f) => !relics.has(f.replace(/\.svg$/, '')));
  check(orphans.length === 0, `no sobran SVG sin reliquia ${orphans.slice(0, 5).join(', ')}`);
  const bad: string[] = [];
  for (const f of files) {
    const xml = fs.readFileSync(new URL(f, dir), 'utf8');
    if (!xml.trimStart().startsWith('<svg') || !xml.includes('viewBox="0 0 64 64"')) bad.push(`${f}: formato`);
    else if (/<(text|image|script)\b/.test(xml)) bad.push(`${f}: elemento prohibido`);
    else if (xml.length > 6 * 1024) bad.push(`${f}: ${Math.round(xml.length / 1024)} KB`);
    else if (!wellFormed(xml)) bad.push(`${f}: XML mal formado`);
  }
  check(bad.length === 0, `${files.length} SVG de reliquias con viewBox 64, sin elementos prohibidos, ≤ 6 KB y bien formados ${bad.slice(0, 5).join(', ')}`);
  const table = { '../arte/reliquias/amuleto-salud.svg': '/a/amuleto.svg' };
  check(pickRelicSvg(table, 'amuleto-salud') === '/a/amuleto.svg' && pickRelicSvg(table, 'piedra-ioun') === null, 'la reliquia busca su SVG por id');
  const withArt = relicIcon({ id: 'amuleto-salud', nombre: 'Amuleto de Salud', icono: '🧿' }, 28, table);
  check(/^<img /.test(withArt) && withArt.includes("src='/a/amuleto.svg'") && withArt.includes("alt='Amuleto de Salud'")
    && withArt.includes("width='28'") && !withArt.includes('"'), 'con SVG pinta un <img> con alt y tamaño (sin comillas dobles, apto para data-tip)');
  check(relicIcon({ id: 'piedra-ioun', nombre: 'Piedra Ioun', icono: '💎' }, 24, table) === '💎', 'sin SVG, vuelve al emoji');
  // Vite inlines small SVGs as data URIs quoted with ' — they must not break the attribute.
  const inlined = relicIcon({ id: 'amuleto-salud', nombre: 'Amuleto', icono: '🧿' }, 24,
    { '../arte/reliquias/amuleto-salud.svg': "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%3e" });
  check((inlined.match(/'/g) ?? []).length === 12 && inlined.includes('xmlns=%27http'), 'las SVG incrustadas por Vite (data URI con comillas simples) no rompen el <img>');
  const ui = ['mapa.ts', 'combate.ts', 'recompensa.ts'].map((f) => fs.readFileSync(new URL(`../src/ui/${f}`, import.meta.url), 'utf8'));
  check(ui.every((src) => /relicIcon\(/.test(src) && !/\$\{(r|x|reliquia)\.icono\}/.test(src)), 'la interfaz pinta las reliquias con su ilustración');
}

// ── Expanded relics: effects, class-only rolls and saving ───────────────────
console.log('\n💍 Reliquias ampliadas');
{
  const RQ = await import('../src/core/reliquias.ts');
  const RUN = await import('../src/core/run.ts');
  const { cartaPorId } = await import('../src/core/cartas.ts');
  const { crearEspacios } = await import('../src/core/conjuros.ts');
  type Mov = ReturnType<EnemigoDef['ia']>;
  type Reliquia = NonNullable<ReturnType<typeof RQ.reliquiaPorId>>;

  const R = (id: string): Reliquia => {
    const r = RQ.reliquiaPorId(id);
    if (!r) check(false, `existe la reliquia «${id}»`);
    return r ?? ({ id, nombre: id, icono: '?', texto: '', rareza: 'comun' } as unknown as Reliquia);
  };
  const esperar: Mov = { nombre: 'Esperar', intencion: 'desconocido' };
  /** Training dummy: lots of PV and a fixed move every turn. */
  const muneco = (pv = 200, mov: Mov = esperar, jefe = false): EnemigoDef => ({
    id: 'muneco-pruebas', nombre: 'Muñeco', arte: '🎯', pv: [pv, pv], esJefe: jefe,
    ia: () => ({ ...mov }),
  });
  const atacante = (dano: number, veces = 1) =>
    muneco(200, { nombre: 'Golpe', intencion: 'ataque', dano, veces });
  async function montar(
    clase: ClaseId, ids: string[], defs: EnemigoDef[] = [muneco()],
    op: { elite?: boolean; rng?: () => number } = {},
  ) {
    const run = nuevaRun(clase, 777);
    run.reliquias = ids.map(R);
    const comb = new Combate(run, defs, op.rng ?? crearRng(777), uiSilenciosa, op.elite ?? false);
    await comb.iniciar();
    return { run, comb, ctx: comb.contexto() };
  }
  const enMano = (comb: Combate, id: string) => {
    const inst = instanciar(id === 'daga' ? DAGA : cartaPorId(id)!);
    comb.jugador.mano.push(inst);
    return inst;
  };
  const jugarCon = async (comb: Combate, id: string, energia = 3, obj = comb.enemigos.find((e) => e.vivo)) => {
    comb.jugador.energia = energia;
    await comb.jugarCarta(enMano(comb, id), obj);
  };
  const dagas = (comb: Combate) => comb.jugador.mano.filter((c) => c.def.id === 'daga').length;

  // — Generales: ritmo del combate —
  {
    const { comb, ctx } = await montar('druida', ['guanteletes-ogro'], [muneco(10), muneco()]);
    await ctx.danar(comb.enemigos[0], 50);
    check((comb.jugador.estados.fuerza ?? 0) === 1, 'Guanteletes de Ogro: cada enemigo que matas te da 1 de Fuerza');
  }
  {
    const { comb } = await montar('druida', ['botas-aladas']);
    check(comb.jugador.energia === comb.jugador.energiaMax + 1 && comb.jugador.mano.length === 7,
      'Botas Aladas: el primer turno empiezas con 1 de energía y 2 cartas más');
    await comb.terminarTurno();
    check(comb.jugador.energia === comb.jugador.energiaMax && comb.jugador.mano.length === 5,
      'Botas Aladas: solo en el primer turno');
  }
  {
    const { comb } = await montar('druida', ['capa-desplazamiento'], [atacante(9)]);
    check(comb.jugador.bloqueo === 9, 'Capa de Desplazamiento: el primer turno ganas bloqueo igual al daño anunciado');
    const b = await montar('druida', ['capa-desplazamiento'], [atacante(12, 2)]);
    check(b.comb.jugador.bloqueo === 15, 'Capa de Desplazamiento: como mucho 15 de bloqueo');
  }
  {
    const { comb } = await montar('druida', ['cuerno-valhalla'], [muneco(), muneco()]);
    await comb.terminarTurno();
    check(comb.enemigos.every((e) => e.pv === 200), 'Cuerno de Valhalla: aún no suena en el turno 2');
    await comb.terminarTurno();
    check(comb.enemigos.every((e) => e.pv === 194 && (e.estados.debil ?? 0) === 1),
      'Cuerno de Valhalla: en el turno 3, 6 de daño y 1 de Débil a todos');
  }
  {
    const { comb } = await montar('druida', ['tambor-guerra']);
    comb.jugador.energia = 3;
    for (let i = 0; i < 3; i++) await comb.jugarCarta(enMano(comb, 'golpe'), comb.enemigos[0]);
    check(comb.enemigos[0].pv === 200 - 18 - 3, 'Tambor de Guerra Enano: cada 3 cartas, 3 de daño a un enemigo');
  }
  {
    const { comb, ctx } = await montar('druida', ['bolsa-contencion']);
    comb.jugador.descarte.push(...comb.jugador.mazo);
    comb.jugador.mazo = [];
    const en = comb.jugador.energia;
    await ctx.robar(1);
    check(comb.jugador.energia === en + 1, 'Bolsa de Contención: al barajar el descarte ganas 1 de energía');
  }
  {
    const { comb } = await montar('druida', ['caliz-vacio']);
    // Still cards in hand: nothing happens, even with no energy left
    await jugarCon(comb, 'golpe', 1);
    check(comb.jugador.mano.length === 5, 'Cáliz Vacío: si aún te quedan cartas en la mano, no roba (aunque te quedes sin energía)');
    // Playing the last card of the hand draws 2
    comb.jugador.mano = [];
    await jugarCon(comb, 'golpe', 3);
    check(comb.jugador.mano.length === 2, 'Cáliz Vacío: al jugar la última carta de la mano robas 2');
    // Once per turn: emptying the hand again does nothing (no loops with 0-cost cards)
    comb.jugador.mano = [];
    await jugarCon(comb, 'golpe', 3);
    check(comb.jugador.mano.length === 0, 'Cáliz Vacío: solo una vez por turno');
    // Next turn it works again, also when discarding the last card
    await comb.terminarTurno();
    comb.jugador.mano = comb.jugador.mano.slice(0, 1);
    await comb.descartarCarta(comb.jugador.mano[0]);
    check(comb.jugador.mano.length === 2, 'Cáliz Vacío: al descartar la última carta de la mano también robas 2 (cada turno)');
  }
  {
    const { comb, ctx } = await montar('druida', ['estandarte-terror'], [muneco(10), muneco()]);
    await ctx.danar(comb.enemigos[0], 50);
    const o = comb.enemigos[1];
    check(o.estados.debil === 1 && o.estados.vulnerable === 1,
      'Estandarte del Terror: al morir un enemigo, los demás quedan Débiles y Vulnerables');
  }
  {
    const alta = await montar('druida', ['baraja-maravillas'], [muneco()], { rng: () => 0.999 });
    const e = alta.comb.enemigos[0];
    check(e.estados.vulnerable === 3 && e.estados.debil === 3, 'Baraja de las Maravillas: un 20 debilita y expone a todos');
    const baja = await montar('druida', ['baraja-maravillas'], [muneco()], { rng: () => 0 });
    check(baja.comb.jugador.pv === baja.comb.jugador.pvMax && baja.comb.jugador.mano.some((c) => c.def.id === 'duda'),
      'Baraja de las Maravillas: un 1 mete una Duda en tu mano');
  }
  // — Generales: riesgo y recompensa —
  {
    const { comb } = await montar('druida', ['yelmo-tirano']);
    check(comb.jugador.energiaMax === 4 && comb.jugador.energia === 4 && comb.jugador.pv === comb.jugador.pvMax - 4,
      'Yelmo del Tirano: +1 de energía por turno a cambio de 4 PV por combate');
  }
  {
    const { comb, run } = await montar('druida', ['hoja-sedienta']);
    comb.jugador.pv = comb.jugador.pvMax - 30;
    await jugarCon(comb, 'golpe');
    check(comb.enemigos[0].pv === 200 - 9, 'Hoja Sedienta: +1 de daño por cada 10 PV que te faltan');
    check(RUN.curaDeDescanso(run) === Math.floor(Math.floor(run.pvMax * 0.3) / 2), 'Hoja Sedienta: descansar cura la mitad');
  }
  {
    const { comb } = await montar('druida', ['amuleto-salud'], [atacante(20)]);
    const inicio = Math.floor(comb.jugador.pvMax / 2) + 5;
    comb.jugador.pv = inicio;
    await comb.terminarTurno();
    check(comb.jugador.pv === inicio - 10, 'Amuleto de Salud: al caer por debajo de la mitad te curas 10');
    const tras = comb.jugador.pv;
    await comb.terminarTurno();
    check(comb.jugador.pv === tras - 20, 'Amuleto de Salud: solo una vez por combate');
  }
  {
    const { comb } = await montar('druida', ['piedra-ioun']);
    check(comb.cartasPorTurno() === 6 && comb.jugador.mano.length === 6, 'Piedra Ioun: robas 1 carta más cada turno');
    const cara = [...comb.jugador.mano].sort((a, b) => comb.costeEfectivo(defDe(b)) - comb.costeEfectivo(defDe(a)))[0];
    await comb.terminarTurno();
    check(comb.jugador.mano.includes(cara) && comb.jugador.mano.length === 7,
      'Piedra Ioun: conservas en la mano la carta más cara que no jugaste');
  }
  // — Generales: estados —
  {
    const { comb } = await montar('druida', ['talisman-vorpal'], [muneco(100)]);
    const e = comb.enemigos[0];
    e.pv = 20;
    e.estados.vulnerable = 2;
    await jugarCon(comb, 'golpe', 3, e);
    check(!e.vivo, 'Talismán Vorpal: decapita al Vulnerable que dejas a un 15 % de PV o menos');
    const j = await montar('druida', ['talisman-vorpal'], [muneco(100, esperar, true)]);
    const je = j.comb.enemigos[0];
    je.pv = 20;
    je.estados.vulnerable = 2;
    await jugarCon(j.comb, 'golpe', 3, je);
    check(je.vivo && je.pv === 11, 'Talismán Vorpal: los jefes no pierden la cabeza');
  }
  {
    const { comb, ctx } = await montar('druida', ['vial-drow']);
    await ctx.aplicarEstado(comb.enemigos[0], 'debil', 1);
    check(comb.enemigos[0].estados.veneno === 2, 'Veneno de Drow: al aplicar Débil también aplicas 2 de Veneno');
  }
  {
    const { comb, ctx } = await montar('picaro', ['frasco-plaga'], [muneco(10), muneco(), muneco()]);
    comb.enemigos[0].estados.veneno = 5;
    comb.enemigos[2].estados.veneno = 1;
    await ctx.danar(comb.enemigos[0], 50);
    check(comb.enemigos[1].estados.veneno === 5 && comb.enemigos[2].estados.veneno === 6, 'Frasco de la Plaga: el Veneno de un enemigo muerto se propaga a todos los demás');
    const { reliquiaPorId } = await import('../src/core/reliquias.ts');
    check(reliquiaPorId('frasco-plaga')?.soloClase === 'picaro', 'Frasco de la Plaga es una reliquia del pícaro');
  }
  // — Generales: bloqueo —
  {
    const { comb } = await montar('druida', ['anillo-proteccion']);
    comb.jugador.bloqueo = 12;
    await comb.terminarTurno();
    check(comb.jugador.bloqueo === 5, 'Anillo de Protección: conservas hasta 5 de bloqueo entre turnos');
    comb.jugador.bloqueo = 3;
    await comb.terminarTurno();
    check(comb.jugador.bloqueo === 3, 'Anillo de Protección: si te queda menos, lo conservas entero');
  }
  {
    const { comb } = await montar('druida', ['brazales-defensa'], [atacante(6)]);
    const pv = comb.jugador.pv;
    await comb.terminarTurno();
    check(comb.jugador.pv === pv, 'Brazales de Defensa: si no atacas en el turno, ganas 6 de bloqueo');
    await jugarCon(comb, 'golpe');
    const pv2 = comb.jugador.pv;
    await comb.terminarTurno();
    check(comb.jugador.pv === pv2 - 6, 'Brazales de Defensa: si atacaste, no protegen');
  }
  {
    const { comb } = await montar('druida', ['escudo-centinela'], [atacante(5)]);
    comb.jugador.bloqueo = 10;
    await comb.terminarTurno();
    check(comb.enemigos[0].pv === 196, 'Escudo Centinela: un golpe detenido del todo devuelve 4 de daño');
    comb.jugador.bloqueo = 3;
    await comb.terminarTurno();
    check(comb.enemigos[0].pv === 196, 'Escudo Centinela: un golpe que te atraviesa no devuelve nada');
  }
  {
    const { comb } = await montar('druida', ['manto-espectral']);
    check(comb.jugador.estados.espejismo === 1, 'Manto Espectral: previene el primer ataque del combate');
  }
  // — Generales: mapa, élites y economía —
  {
    const { run, ctx, comb } = await montar('druida', ['manual-ejercicio'], [muneco(10)], { elite: true });
    await ctx.danar(comb.enemigos[0], 50);
    check(comb.terminado === 'victoria' && run.permanentes.fuerza === 1, 'Manual del Ejercicio: vencer a un élite da +1 de Fuerza permanente');
    const n = await montar('druida', ['manual-ejercicio'], [muneco(10)]);
    await n.ctx.danar(n.comb.enemigos[0], 50);
    check(n.run.permanentes.fuerza === 0, 'Manual del Ejercicio: un combate corriente no cuenta');
  }
  {
    const { comb } = await montar('druida', ['cuerno-caza'], [muneco()], { elite: true });
    check(comb.enemigos[0].estados.vulnerable === 2 && comb.jugador.mano.length === 7,
      'Cuerno de Caza: contra élites, 2 de Vulnerable a todos y robas 2');
    const n = await montar('druida', ['cuerno-caza']);
    check(!n.comb.enemigos[0].estados.vulnerable && n.comb.jugador.mano.length === 5, 'Cuerno de Caza: en combates corrientes calla');
  }
  {
    const run = nuevaRun('druida', 1);
    check(RUN.pesoRaroEfectivo(run, 4) === 4, 'sin Piedra de la Buena Suerte, la probabilidad de rara no cambia');
    run.reliquias.push(R('piedra-suerte'));
    check(RUN.pesoRaroEfectivo(run, 4) === 8, 'Piedra de la Buena Suerte: el doble de probabilidad de carta rara');
  }
  {
    const run = nuevaRun('druida', 2);
    check(RUN.curaDeDescanso(run) === Math.floor(run.pvMax * 0.3), 'descansar cura el 30 % sin reliquias');
    run.reliquias.push(R('saco-dormir'));
    const cura45 = () => Math.floor(run.pvMax * 0.3) + Math.floor(run.pvMax * 0.15);
    check(RUN.curaDeDescanso(run) === cura45(), 'Saco de Dormir Élfico: descansar cura un 15 % más (45 %)');
    const max = run.pvMax;
    RUN.descansar(run);
    check(run.pvMax === max + 5 && run.pv === run.pvMax, 'Saco de Dormir Élfico: si ya estabas a tope, +5 PV máximos');
    run.pv = 10;
    RUN.descansar(run);
    check(run.pv === 10 + cura45() && run.pvMax === max + 5, 'Saco de Dormir Élfico: herido, solo cura');
  }
  {
    const run = nuevaRun('druida', 3);
    RUN.afilarCarta(run, run.mazo[0], crearRng(3));
    check(run.mazo.filter((c) => c.mejorada).length === 1, 'afilar mejora 1 carta sin reliquias');
    const run2 = nuevaRun('druida', 3);
    run2.reliquias.push(R('piedra-afilar'));
    RUN.afilarCarta(run2, run2.mazo[0], crearRng(3));
    check(run2.mazo[0].mejorada && run2.mazo.filter((c) => c.mejorada).length === 2,
      'Piedra de Afilar Enana: al afilar se mejora otra carta al azar');
  }
  {
    const run = nuevaRun('druida', 4);
    run.reliquias.push(R('yunque-moradin'));
    const a = RUN.anadirCarta(run, cartaPorId('zarpa-doble')!);
    const h = RUN.anadirCarta(run, cartaPorId('aullido')!);
    check(a.mejorada && !h.mejorada && run.mazo.includes(a) && run.mazo.includes(h),
      'Yunque de Moradin: los ataques que añades al mazo llegan mejorados');
  }
  {
    const run = nuevaRun('druida', 5);
    check(!RUN.cartaExtraEnSala(run, 'cofre'), 'sin Mapa del Tesoro, los cofres no dan carta');
    run.reliquias.push(R('mapa-tesoro'));
    check(RUN.cartaExtraEnSala(run, 'cofre') && !RUN.cartaExtraEnSala(run, 'evento'), 'Mapa del Tesoro: los cofres dan también una carta');
  }
  {
    const run = nuevaRun('druida', 6);
    run.reliquias.push(R('diario-aventurero'));
    RUN.entrarEnSala(run, 'combate', crearRng(6));
    check(run.mazo.every((c) => !c.mejorada), 'Diario del Aventurero: un combate no cuenta');
    const notas = RUN.entrarEnSala(run, 'evento', crearRng(6));
    check(run.mazo.filter((c) => c.mejorada).length === 1 && notas.length === 1,
      'Diario del Aventurero: cada evento mejora 1 carta al azar (y lo anuncia)');
  }

  // — Druida —
  {
    const { comb } = await montar('druida', ['semilla-roble'], [muneco(), muneco()]);
    await jugarCon(comb, 'forma-lobo');
    check(comb.enemigos.every((e) => (e.estados.raices ?? 0) === 3), 'Semilla del Roble Madre: al transformarte, 3 de Raíces a todos');
  }
  {
    const { comb, ctx } = await montar('druida', ['muerdago-sagrado'], [atacante(5)]);
    comb.jugador.pv = 30;
    await ctx.aplicarRaices(comb.enemigos[0], 10, 1);
    await comb.terminarTurno();
    check(comb.jugador.pv === 33, 'Muérdago Sagrado: las raíces que aplastan te curan 3 PV');
  }
  {
    const { comb } = await montar('druida', ['colmillo-cambiaformas']);
    const mano = comb.jugador.mano.length;
    await jugarCon(comb, 'forma-lobo');
    check(comb.jugador.efectosTemporales[0]?.turnos === 6 && comb.jugador.mano.length === mano + 2,
      'Colmillo del Cambiaformas: la primera forma dura 3 turnos más y robas 2');
    await jugarCon(comb, 'forma-lobo');
    check(comb.jugador.efectosTemporales[1]?.turnos === 3, 'Colmillo del Cambiaformas: solo la primera de cada combate');
  }
  {
    const { comb, ctx } = await montar('druida', ['luna-frasco']);
    await ctx.efectoTemporal({ etiqueta: 'Forma de Prueba', turnos: 1, fuerza: 1, destreza: 0 });
    await comb.terminarTurno();
    check(comb.jugador.invocacion?.vida === 6, 'Luna en un Frasco: al terminar una forma, su espíritu te acompaña (invoca 6)');
  }
  // — Bárbaro —
  {
    const { comb, ctx } = await montar('barbaro', ['totem-oso']);
    await ctx.ganarFuria(2);
    await comb.terminarTurno();
    check(comb.jugador.furiaFuerza === 2, 'Tótem del Oso: la primera vez, la Furia aguanta sin recibir daño');
    await comb.terminarTurno();
    check(comb.jugador.furiaFuerza === 0, 'Tótem del Oso: la segunda vez se rompe');
  }
  {
    const { comb, ctx } = await montar('barbaro', ['cinturon-gigante']);
    await ctx.ganarFuria(1);
    check(comb.jugador.bloqueo === 4, 'Cinturón del Gigante: ganar Furia da 4 de bloqueo');
  }
  {
    const { comb } = await montar('barbaro', ['collar-colmillos'], [atacante(3, 2)]);
    await comb.terminarTurno();
    check(comb.jugador.furiaFuerza === 1 && (comb.jugador.estados.fuerza ?? 0) === 1,
      'Collar de Colmillos: el primer golpe que te hiere en cada ronda te da Furia (+1 de Fuerza)');
  }
  {
    const { comb, ctx } = await montar('barbaro', ['jarra-hidromiel']);
    comb.jugador.pv = 40;
    await ctx.ganarFuria(1);
    await comb.terminarTurno();
    check(comb.jugador.furiaFuerza === 0 && comb.jugador.pv === 45, 'Jarra de Hidromiel: al perder la Furia te curas 5 PV');
  }
  {
    const { comb, ctx } = await montar('barbaro', ['garfio-carnicero'], [muneco(10), muneco(10), muneco()]);
    const en = comb.jugador.energia;
    await ctx.danar(comb.enemigos[0], 50);
    check(comb.jugador.energia === en, 'Garfio del Carnicero: sin Furia, matar no da energía');
    await ctx.ganarFuria(1);
    await ctx.danar(comb.enemigos[1], 50);
    check(comb.jugador.energia === en + 1, 'Garfio del Carnicero: en Furia, cada muerte da 1 de energía');
  }
  // — Mago —
  {
    const { comb, ctx } = await montar('mago', ['diadema-intelecto']);
    comb.jugador.conjuros = crearEspacios(2);
    const en = comb.jugador.energia;
    const mano = comb.jugador.mano.length;
    await ctx.gastarConjuro(1);
    check(comb.jugador.energia === en && comb.jugador.mano.length === mano, 'Diadema de Intelecto: gastar un espacio que no es el último no hace nada');
    await ctx.gastarConjuro(1);
    check(comb.jugador.energia === en + 1 && comb.jugador.mano.length === mano + 2,
      'Diadema de Intelecto: al gastar el último espacio, +1 de energía y robas 2');
  }
  {
    const { comb, ctx } = await montar('mago', ['baculo-archimago']);
    comb.jugador.conjuros = crearEspacios(6);
    const fuerza = () => comb.jugador.estados.fuerza ?? 0;
    const f0 = fuerza();
    await ctx.gastarConjuro(1);
    check(fuerza() === f0 + 1, 'Báculo del Archimago: gastar un espacio de nivel 3 da 1 de Fuerza');
    await ctx.gastarConjuro(2);
    await ctx.gastarConjuro(2);
    check(fuerza() === f0 + 3, 'Báculo del Archimago: cada espacio de nivel 2 gastado da 1 de Fuerza, sin límite por combate');
    await ctx.gastarConjuro(1);
    check(fuerza() === f0 + 3, 'Báculo del Archimago: los espacios de nivel 1 no dan Fuerza');
    check(ctx.conjurosLibres() === 2, 'Báculo del Archimago: ya no recupera espacios');
  }
  {
    const { comb, ctx } = await montar('mago', ['pluma-escriba']);
    await ctx.gastarConjuro(1);
    check(comb.jugador.conjuroEscrito === 3, 'Pluma de Escriba: cada espacio gastado Escribe 3 en el Conjuro Prodigioso');
  }
  {
    const { comb, ctx } = await montar('mago', ['reloj-arena-arcano']);
    comb.jugador.conjuros = crearEspacios(3);
    await ctx.gastarConjuro(1);
    await comb.terminarTurno();
    check(ctx.conjurosLibres() === 2, 'Reloj de Arena Arcano: en el turno 2 aún no gira');
    await comb.terminarTurno();
    check(ctx.conjurosLibres() === 3, 'Reloj de Arena Arcano: cada 3 turnos recuperas un espacio');
  }
  {
    const { comb, ctx } = await montar('mago', ['grimorio-contingencia']);
    const n = comb.jugador.conjuros.length;
    await comb.terminarTurno();
    check(comb.jugador.conjuros.length === n + 1, 'Grimorio de Contingencia: un turno sin gastar espacios te da uno más');
    await ctx.gastarConjuro(1);
    await comb.terminarTurno();
    check(comb.jugador.conjuros.length === n + 1, 'Grimorio de Contingencia: si gastaste, no');
  }
  // — Pícaro —
  {
    const { comb } = await montar('picaro', ['vaina-ponzona']);
    await jugarCon(comb, 'daga', 0);
    check(comb.enemigos[0].estados.veneno === 2, 'Vaina Ponzoñosa: tus Dagas aplican 2 de Veneno');
  }
  {
    const { comb } = await montar('picaro', ['capa-acrobata']);
    await comb.descartarCarta(comb.jugador.mano[0]);
    check(comb.jugador.bloqueo === 2 && comb.jugador.bloqueoAplazado.length === 1,
      'Capa del Acróbata: al descartar ganas 2 de bloqueo aplazado (Acrobacias)');
  }
  {
    const { comb } = await montar('picaro', ['mascara-asesino']);
    await jugarCon(comb, 'golpe');
    check(comb.enemigos[0].estados.veneno === 3, 'Máscara del Asesino: el ataque furtivo aplica 3 de Veneno');
    const a = await montar('picaro', ['mascara-asesino'], [atacante(5)]);
    await jugarCon(a.comb, 'golpe');
    check(!a.comb.enemigos[0].estados.veneno, 'Máscara del Asesino: contra quien va a atacar, nada');
  }
  {
    const { comb, ctx } = await montar('picaro', ['bandolera-cuchillos']);
    check(dagas(comb) === 2 && comb.jugador.mano.length === 7, 'Bandolera de Cuchillos: empiezas con 2 Dagas');
    comb.jugador.descarte.push(...comb.jugador.mazo);
    comb.jugador.mazo = [];
    await ctx.robar(1);
    check(dagas(comb) === 3, 'Bandolera de Cuchillos: al barajar, 1 Daga más');
  }
  {
    const run = nuevaRun('picaro', 778);
    const comb = new Combate(run, [muneco()], crearRng(778), uiSilenciosa);
    await comb.iniciar();
    check(run.reliquias[0].id === 'guante-ladron' && comb.jugador.estados.destreza === 1 && dagas(comb) === 1,
      'Guante del Ladrón: 1 de Destreza y una Daga en la mano al empezar');
  }
  // — Brujo —
  {
    const { comb } = await montar('brujo', ['ojo-patron']);
    await jugarCon(comb, 'explosion-sobrenatural');
    check(comb.enemigos[0].estados.condena === 3, 'Ojo del Patrón: la Explosión Sobrenatural (7) aplica 3 de Condena');
  }
  {
    const { comb, ctx } = await montar('brujo', ['corazon-diablillo'], [muneco(), muneco()]);
    await ctx.invocarEfimero('sabueso', 10, 0);
    await comb.terminarTurno();
    check(comb.enemigos.every((e) => e.pv === 195), 'Corazón de Diablillo: la invocación que aguanta estalla (la mitad de su vida a todos)');
  }
  {
    const { comb } = await montar('brujo', ['cadena-condenado'], [muneco(10), muneco()]);
    comb.enemigos[0].estados.condena = 20;
    await comb.terminarTurno();
    check(!comb.enemigos[0].vivo && comb.jugador.energia === comb.jugador.energiaMax + 1,
      'Cadena del Condenado: si muere un enemigo con Condena, tu próximo turno tiene 1 de energía más');
  }
  {
    const { comb } = await montar('brujo', ['colgante-escarcha'], [atacante(6)]);
    comb.jugador.bloqueo = 10;
    await comb.terminarTurno();
    check(comb.enemigos[0].estados.condena === 6, 'Colgante de Escarcha: el daño que bloqueas se vuelve Condena del atacante');
  }

  // — Reparto por clase y rarezas —
  {
    const pool = RQ.POOL_RELIQUIAS;
    const generales = pool.filter((r) => !r.soloClase);
    check(generales.length >= 24, `al menos 24 reliquias generales (${generales.length})`);
    check(pool.every((r) => ['comun', 'rara', 'jefe'].includes(r.rareza)), 'toda reliquia del pool es común, rara o de jefe');
    check(new Set(pool.map((r) => r.nombre)).size === pool.length, 'sin nombres de reliquia repetidos');
    check(pool.every((r) => r.icono.length > 0 && !r.texto.includes('"')), 'todas tienen icono y su texto cabe en un data-tip');
    for (const clase of CLASES) {
      const propias = pool.filter((r) => r.soloClase === clase);
      check(propias.length >= 4, `${clase}: al menos 4 reliquias únicas de clase (${propias.length})`);
      const disponibles = RQ.reliquiasDisponibles(nuevaRun(clase, 1));
      check(disponibles.every((r) => !r.soloClase || r.soloClase === clase), `${clase}: nunca se le ofrecen reliquias de otra clase`);
      const rng = crearRng(4242);
      let ajena = 0;
      let jefeFuera = 0;
      const vistas = new Set<string>();
      for (let i = 0; i < 400; i++) {
        const run = nuevaRun(clase, i);
        const origen = (['cofre', 'elite', 'evento', 'jefe'] as const)[i % 4];
        const r = RQ.sortearReliquia(run, rng, origen);
        if (!r) continue;
        if (r.soloClase && r.soloClase !== clase) ajena++;
        if (r.rareza === 'jefe' && origen !== 'jefe') jefeFuera++;
        if (r.soloClase === clase) vistas.add(r.id);
      }
      check(ajena === 0 && jefeFuera === 0 && vistas.size >= 4,
        `${clase}: 400 sorteos sin reliquias ajenas ni de jefe fuera de los jefes, y salen sus ${vistas.size} de clase`);
    }
    const run = nuevaRun('mago', 9);
    run.reliquias.push(...RQ.reliquiasDisponibles(run));
    check(RQ.sortearReliquia(run, crearRng(9), 'cofre') === undefined, 'con todas las reliquias, el sorteo no repite');
    const jefeRun = nuevaRun('mago', 10);
    check(RQ.sortearReliquia(jefeRun, crearRng(10), 'jefe')?.rareza === 'jefe', 'los jefes sueltan reliquias de jefe');
    // No relic left that only adds a flat stat ("+1 de Fuerza", "+8 PV máximos"…)
    const soloEstadistica = /^(al obtenerlo:?\s*)?(\+?\d+ de \w+ permanente al inicio de cada combate|(empiezas cada combate con\s*)?\+?\d+ (de )?(fuerza|destreza|pv máximos|bloqueo)( al obtenerlo| permanente)?)\.?$/i;
    const todas = [...pool, ...CLASES.map((c) => RQ.reliquiaInicial(c))];
    const planas = todas.filter((r) => soloEstadistica.test(r.texto.trim()));
    check(planas.length === 0, `no quedan reliquias de solo «+N estadística» (${planas.map((r) => r.id).join(', ')})`);
  }
  // — Guardado —
  {
    for (const clase of CLASES) {
      const run = nuevaRun(clase, 31);
      run.reliquias.push(...RQ.reliquiasDisponibles(run));
      const rest = rehidratarRun(JSON.parse(JSON.stringify(serializarRun(run))));
      check(!!rest && rest.reliquias.length === run.reliquias.length
        && rest.reliquias.every((r, i) => r.id === run.reliquias[i].id && r === RQ.reliquiaPorId(r.id)),
      `${clase}: las ${run.reliquias.length} reliquias se guardan y rehidratan con sus efectos`);
    }
  }
}

// ── Cola de acciones del jugador (src/ui/action-queue.ts) ────────────────────
{
  console.log('\n— Cola de acciones —');
  const { ActionQueue, forecastEnergy, checkCardAction } = await import('../src/ui/action-queue.ts');
  const tick = (ms = 0) => new Promise<void>((r) => setTimeout(r, ms));

  // FIFO order and a single action running at a time
  {
    const log: string[] = [];
    let running = 0;
    let maxRunning = 0;
    const q = new ActionQueue<string>({
      execute: async (a) => {
        running++;
        maxRunning = Math.max(maxRunning, running);
        log.push(`start:${a}`);
        await tick(5);
        log.push(`end:${a}`);
        running--;
      },
    });
    q.enqueue('a');
    q.enqueue('b');
    q.enqueue('c');
    check(q.current === 'a' && q.pending.join() === 'b,c', 'la primera acción arranca al momento y las demás esperan en cola');
    check(q.busy, 'la cola está ocupada mientras se resuelve una acción');
    await q.idle();
    check(log.join(' ') === 'start:a end:a start:b end:b start:c end:c', 'las acciones se ejecutan en orden FIFO, una tras otra');
    check(maxRunning === 1, 'nunca hay más de una acción en ejecución a la vez');
    check(!q.busy && q.current === null && q.pending.length === 0, 'al acabar, la cola queda libre y vacía');
  }

  // Cancelling a queued action (the running one cannot be cancelled)
  {
    const log: string[] = [];
    let changes = 0;
    const q = new ActionQueue<string>({
      execute: async (a) => { log.push(a); await tick(2); },
      onChange: () => { changes++; },
    });
    q.enqueue('a');
    q.enqueue('b');
    q.enqueue('c');
    check(q.indexOf((x) => x === 'c') === 1, 'indexOf da la posición de la acción entre las pendientes');
    check(q.remove((x) => x === 'b'), 'se puede sacar de la cola una acción pendiente');
    check(!q.remove((x) => x === 'a'), 'la acción en ejecución no se puede sacar de la cola');
    await q.idle();
    check(log.join() === 'a,c', 'la acción cancelada no llega a ejecutarse');
    check(changes > 0, 'la cola avisa de cada cambio (para repintar)');
  }

  // Validation happens when the action runs, not when it is queued
  {
    const log: string[] = [];
    const discarded: string[] = [];
    let broken = false;
    const q = new ActionQueue<string>({
      validate: (a) => (a === 'b' && broken ? { ok: false, reason: 'ya no se puede' } : { ok: true }),
      execute: async (a) => { log.push(a); if (a === 'a') broken = true; await tick(2); },
      onDiscard: (a, reason) => { discarded.push(`${a}:${reason}`); },
    });
    q.enqueue('a');
    q.enqueue('b');
    q.enqueue('c');
    await q.idle();
    check(log.join() === 'a,c', 'una acción que deja de ser válida se descarta al llegarle el turno');
    check(discarded.join() === 'b:ya no se puede', 'y se avisa con el motivo');
    const q2 = new ActionQueue<string>({
      validate: (a) => ({ ok: true, action: a === 'x' ? 'y' : a }),
      execute: async (a) => { log.push(a); },
    });
    q2.enqueue('x');
    await q2.idle();
    check(log[log.length - 1] === 'y', 'la validación puede sustituir la acción (p. ej. redirigir el objetivo)');
  }

  // A failing action does not jam the queue
  {
    const log: string[] = [];
    const errors: unknown[] = [];
    const q = new ActionQueue<string>({
      execute: async (a) => { if (a === 'a') throw new Error('boom'); log.push(a); },
      onError: (e) => { errors.push(e); },
    });
    q.enqueue('a');
    q.enqueue('b');
    await q.idle();
    check(errors.length === 1 && log.join() === 'b', 'si una acción falla, la cola sigue con la siguiente');
  }

  // End of combat: the queue empties and refuses new actions
  {
    const log: string[] = [];
    const q = new ActionQueue<string>({ execute: async (a) => { log.push(a); await tick(2); } });
    q.enqueue('a');
    q.enqueue('b');
    q.enqueue('c');
    q.close();
    check(q.pending.length === 0, 'al terminar el combate, la cola se vacía');
    check(!q.enqueue('d'), 'y no admite acciones nuevas');
    await q.idle();
    check(log.join() === 'a', 'solo termina la acción que ya estaba en curso');
  }

  // Energy forecast when queueing
  {
    const cost = (a: { c: number }) => a.c;
    check(forecastEnergy(3, [], cost) === 3, 'sin nada en cola, la previsión es la energía actual');
    check(forecastEnergy(3, [{ c: 1 }, { c: 2 }], cost) === 0, 'la previsión descuenta lo ya encolado');
    check(forecastEnergy(1, [{ c: 2 }], cost) === -1, 'la previsión puede quedar negativa (no se admite encolar más)');
  }

  // Card validation at execution time (pure, with a fake environment)
  {
    type T = { id: string; alive: boolean };
    const a: T = { id: 'a', alive: true };
    const b: T = { id: 'b', alive: true };
    const env = {
      inHand: (c: string) => c !== 'fuera',
      canPlay: (c: string) => c !== 'cara',
      reason: () => 'Sin energía suficiente',
      needsTarget: (c: string) => c.startsWith('ataque'),
      isAlive: (t: T) => t.alive,
      livingTargets: () => [a, b].filter((t) => t.alive),
    };
    check(checkCardAction({ card: 'ataque', target: a }, env).ok, 'una carta válida pasa la validación');
    const fuera = checkCardAction({ card: 'fuera' }, env);
    check(!fuera.ok && /mano/.test(fuera.reason), 'una carta que ya no está en la mano se descarta');
    const cara = checkCardAction({ card: 'cara' }, env);
    check(!cara.ok && cara.reason === 'Sin energía suficiente', 'una carta que ya no se puede pagar se descarta con su motivo');
    a.alive = false;
    const red = checkCardAction({ card: 'ataque', target: a }, env);
    check(red.ok && red.action?.target === b, 'si el objetivo ha muerto, la carta se redirige a otro enemigo vivo');
    b.alive = false;
    const nadie = checkCardAction({ card: 'ataque', target: a }, env);
    check(!nadie.ok, 'sin enemigos vivos, la carta se descarta');
  }

  // Integration with the engine: 3 cards + end turn queued at once, with real waits
  {
    const run = nuevaRun('barbaro', 6060);
    const lenta: Presentador = { ...uiSilenciosa, espera: (ms) => tick(Math.min(ms, 3)), fxGolpe: () => tick(2) };
    const comb = new Combate(run, [GOBLIN_CORTADOR, GOBLIN_ARQUERO], crearRng(6060), lenta);
    for (const e of comb.enemigos) { e.pv = 999; e.pvMax = 999; }
    type Accion = { kind: 'card'; card: CartaInstancia; target?: EnemigoCombate } | { kind: 'endTurn' } | { kind: 'start' };
    const hechas: string[] = [];
    const avisos: string[] = [];
    let carreras = 0;
    const env = {
      inHand: (c: CartaInstancia) => comb.jugador.mano.includes(c),
      canPlay: (c: CartaInstancia) => comb.puedeJugar(c),
      reason: () => 'no se puede',
      needsTarget: (c: CartaInstancia) => defDe(c).objetivo === 'enemigo',
      isAlive: (e: EnemigoCombate) => e.vivo,
      livingTargets: () => comb.enemigos.filter((e) => e.vivo),
    };
    const q = new ActionQueue<Accion>({
      validate: (a) => {
        if (a.kind !== 'card') return { ok: true };
        const v = checkCardAction(a, env);
        return v.ok ? { ok: true, action: v.action ? { kind: 'card', ...v.action } : a } : v;
      },
      execute: async (a) => {
        if (comb.enResolucion) carreras++;
        if (a.kind === 'start') await comb.iniciar();
        else if (a.kind === 'endTurn') { hechas.push('fin'); await comb.terminarTurno(); }
        else { hechas.push(a.card.uid); await comb.jugarCarta(a.card, a.target); }
      },
      onDiscard: (_a, reason) => { avisos.push(reason); },
    });
    q.enqueue({ kind: 'start' });
    await q.idle();
    const baratas = comb.jugador.mano.filter((c) => comb.costeEfectivo(defDe(c)) === 1).slice(0, 3);
    const objetivo = comb.enemigos[0];
    const turno = comb.turno;
    const energia = comb.jugador.energia;
    for (const c of baratas) {
      q.enqueue({ kind: 'card', card: c, target: env.needsTarget(c) ? objetivo : undefined });
    }
    q.enqueue({ kind: 'endTurn' });
    // the first card is already running (and paid); the other two are still queued
    check(q.busy && q.pending.length === 3, 'integración: la primera carta arranca y el resto espera en cola');
    check(forecastEnergy(comb.jugador.energia, q.pending.filter((a) => a.kind === 'card'), () => 1) === energia - baratas.length,
      'integración: la previsión de energía cuenta la carta en curso y las encoladas');
    // kill the target of the queued attacks: they are redirected to the other goblin
    objetivo.pv = 0;
    objetivo.vivo = false;
    await q.idle();
    check(baratas.length === 3, 'integración: el mazo inicial trae 3 cartas de coste 1 en la mano');
    check(hechas.join() === [...baratas.map((c) => c.uid), 'fin'].join(),
      'integración: 3 cartas y el fin de turno se resuelven en el orden en que se encolaron');
    check(carreras === 0, 'integración: ninguna acción arranca mientras el motor sigue resolviendo otra');
    check(comb.jugadasCombate === 3 && comb.turno === turno + 1,
      'integración: las cartas se jugaron y el turno avanzó exactamente una vez');
    check(avisos.length === 0, 'integración: ninguna carta se descartó (los ataques se redirigieron al enemigo vivo)');
    check(comb.enemigos[1].pv < 999 || baratas.every((c) => !env.needsTarget(c)),
      'integración: los ataques redirigidos dañan al enemigo que sigue vivo');
  }
}

// ── Blessings: relic blessings, unique cards and the opening offer ──────────
console.log('\n🙏 Bendiciones');
{
  const fs = await import('node:fs');
  const RQ = await import('../src/core/reliquias.ts');
  const BD = await import('../src/core/bendiciones.ts');
  const RUN = await import('../src/core/run.ts');
  const { cartaPorId } = await import('../src/core/cartas.ts');
  const { crearEspacios } = await import('../src/core/conjuros.ts');
  type Mov = ReturnType<EnemigoDef['ia']>;
  type Reliquia = NonNullable<ReturnType<typeof RQ.reliquiaPorId>>;

  const B = (id: string): Reliquia => {
    const r = RQ.reliquiaPorId(id);
    if (!r || r.rareza !== 'bendicion') check(false, `existe la bendición «${id}»`);
    return r ?? ({ id, nombre: id, icono: '?', texto: '', rareza: 'bendicion' } as unknown as Reliquia);
  };
  const esperar: Mov = { nombre: 'Esperar', intencion: 'desconocido' };
  const muneco = (pv = 200, mov: Mov = esperar, jefe = false): EnemigoDef => ({
    id: 'muneco-pruebas', nombre: 'Muñeco', arte: '🎯', pv: [pv, pv], esJefe: jefe,
    ia: () => ({ ...mov }),
  });
  const atacante = (dano: number, veces = 1) =>
    muneco(200, { nombre: 'Golpe', intencion: 'ataque', dano, veces });
  async function montar(
    clase: ClaseId, ids: string[], defs: EnemigoDef[] = [muneco()], op: { elite?: boolean } = {},
  ) {
    const run = nuevaRun(clase, 777);
    run.reliquias = ids.map(B);
    const comb = new Combate(run, defs, crearRng(777), uiSilenciosa, op.elite ?? false);
    await comb.iniciar();
    return { run, comb, ctx: comb.contexto() };
  }
  const enMano = (comb: Combate, id: string) => {
    const inst = instanciar(id === 'daga' ? DAGA : cartaPorId(id)!);
    comb.jugador.mano.push(inst);
    return inst;
  };
  const jugarCon = async (comb: Combate, id: string, energia = 3, obj = comb.enemigos.find((e) => e.vivo)) => {
    comb.jugador.energia = energia;
    await comb.jugarCarta(enMano(comb, id), obj);
  };
  const barajarDescarte = async (comb: Combate, ctx: ReturnType<Combate['contexto']>) => {
    comb.jugador.descarte.push(...comb.jugador.mazo);
    comb.jugador.mazo = [];
    await ctx.robar(1);
  };

  // — Catalogue —
  const todas = RQ.BENDICIONES;
  {
    check(todas.length >= 20, `conjunto amplio de bendiciones-reliquia (${todas.length})`);
    check(todas.every((r) => r.rareza === 'bendicion' && !!r.tipoBendicion), 'toda bendición es una reliquia de rareza «bendición» con su tipo');
    const enPool = todas.filter((r) => RQ.POOL_RELIQUIAS.some((p) => p.id === r.id));
    check(enPool.length === 0, 'las bendiciones no están en el pool de reliquias corrientes');
    const nombres = new Set([...RQ.POOL_RELIQUIAS, ...todas].map((r) => r.nombre));
    check(nombres.size === RQ.POOL_RELIQUIAS.length + todas.length, 'sin nombres repetidos entre reliquias y bendiciones');
    check(todas.every((r) => r.icono.length > 0 && !r.texto.includes('"')), 'todas tienen icono y su texto cabe en un data-tip');
    check(todas.every((r) => (r.tipoBendicion === 'clase' ? !!r.soloClase : r.tipoBendicion === 'unica' || !r.soloClase)),
      'las de clase van ligadas a una clase (y, fuera de ellas, solo las de carta única de clase)');
    for (const t of ['general', 'pacto', 'mapa'] as const) {
      const n = todas.filter((r) => r.tipoBendicion === t).length;
      check(n >= 4, `al menos 4 bendiciones de tipo ${t} (${n})`);
    }
    for (const clase of CLASES) {
      const n = todas.filter((r) => r.soloClase === clase && r.tipoBendicion === 'clase').length;
      check(n >= 2, `${clase}: al menos 2 bendiciones de clase (${n})`);
    }
    for (const r of todas) check(RQ.reliquiaPorId(r.id) === r, `«${r.nombre}» se encuentra por id`);
  }
  // — Never in the normal roll —
  {
    let fugas = 0;
    const rng = crearRng(8080);
    for (const clase of CLASES) {
      for (let i = 0; i < 400; i++) {
        const run = nuevaRun(clase, i);
        const origen = (['cofre', 'elite', 'evento', 'jefe'] as const)[i % 4];
        if (RQ.sortearReliquia(run, rng, origen)?.rareza === 'bendicion') fugas++;
      }
      const llena = nuevaRun(clase, 5);
      llena.reliquias.push(...RQ.reliquiasDisponibles(llena));
      if (RQ.sortearReliquia(llena, rng, 'cofre') !== undefined) fugas++;
    }
    check(fugas === 0, 'las bendiciones nunca salen en cofres, élites, eventos ni jefes (sortearReliquia)');
  }
  // — Opening blessing: 4 varied options —
  {
    let ok = true;
    const firmas = new Set<string>();
    for (const clase of CLASES) {
      for (let s = 1; s <= 30; s++) {
        const run = nuevaRun(clase, s);
        const of = BD.ofrecerBendicionInicial(run, crearRng(s * 13));
        const rel = of.flatMap((o) => (o.tipo === 'reliquia' ? [o.reliquia] : []));
        const ids = rel.map((r) => r.id);
        const tipos = rel.map((r) => r.tipoBendicion);
        if (of.length !== 4 || rel.length !== 4 || new Set(ids).size !== 4
          || !rel.some((r) => r.soloClase === clase) || rel.some((r) => r.soloClase && r.soloClase !== clase)
          || !tipos.includes('general') || !tipos.includes('pacto') || tipos.includes('unica')) {
          ok = false;
          console.error(`    ${clase}/${s}: ${ids.join(', ')}`);
        }
        firmas.add(`${clase}:${[...ids].sort().join(',')}`);
      }
    }
    check(ok, 'la bendición inicial ofrece 4 reliquias sin repetir: una de clase, una general y un pacto (nunca de otra clase ni de carta única)');
    check(firmas.size >= 100, `la bendición inicial cambia de partida a partida (${firmas.size} combinaciones en 150 semillas)`);
  }
  // — Between acts: the unique cards come as blessing relics too —
  {
    const unicas = todas.filter((r) => r.tipoBendicion === 'unica');
    const cartaDe: Record<string, string> = {
      'don-seducir': 'seducir', 'don-deseo': 'deseo',
      'don-tormenta-venganza': 'tormenta-venganza', 'don-furia-indomita': 'furia-indomita',
      'don-maestria-conjuros': 'maestria-conjuros', 'don-danza-mortal': 'danza-mortal', 'don-pacto-final': 'pacto-final',
      'don-angel-vengador': 'angel-vengador',
    };
    check(unicas.length === 8 && unicas.every((r) => cartaDe[r.id] !== undefined),
      `una bendición-reliquia por carta única: Seducir, Deseo y la de cada clase (${unicas.map((r) => r.id).join(', ')})`);
    for (const clase of CLASES) {
      const r = unicas.find((x) => x.soloClase === clase);
      check(!!r && cartaDe[r.id] === cartaUnicaDeClase(clase).id, `${clase}: su carta única tiene su bendición-reliquia`);
    }
    check(unicas.every((r) => !!r.alObtener && /^Añade «[^»]+» a tu mazo/.test(r.texto)),
      'las reliquias de carta única meten la carta al obtenerse y lo dicen en su texto');

    const run = nuevaRun('druida', 21);
    const of = BD.ofrecerBendicionEntreActos(run, crearRng(21));
    const sed = of.find((o) => o.reliquia.tipoBendicion === 'unica');
    check(of.length === 3 && of.every((o) => o.tipo === 'reliquia' && o.reliquia.rareza === 'bendicion')
      && of.filter((o) => o.reliquia.tipoBendicion === 'unica').length === 1 && sed?.reliquia.id === 'don-seducir',
    'entre el Acto I y el II: 3 bendiciones-reliquia, una de ellas la de Seducir');
    const mazo = run.mazo.length;
    const nRel = run.reliquias.length;
    if (sed) BD.aplicarBendicion(run, sed, crearRng(1));
    check(run.mazo.length === mazo + 1 && run.mazo[run.mazo.length - 1].def.id === 'seducir'
      && run.reliquias.length === nRel + 1 && run.reliquias.some((r) => r.id === 'don-seducir'),
    'elegir la de Seducir te da la reliquia (barra superior) y mete «Seducir» en el mazo');
    // Rehydrating does not add the card again
    const rest = rehidratarRun(JSON.parse(JSON.stringify(serializarRun(run))));
    check(!!rest && rest.mazo.length === run.mazo.length
      && rest.mazo.filter((c) => c.def.id === 'seducir').length === 1 && rest.reliquias.some((r) => r.id === 'don-seducir'),
    'al cargar la partida se conserva la reliquia de Seducir sin duplicar la carta');
    const rel = of.find((o) => o.reliquia.tipoBendicion !== 'unica');
    if (rel) BD.aplicarBendicion(run, rel, crearRng(1));
    check(!!rel && run.reliquias.length === nRel + 2 && run.reliquias.includes(rel.reliquia),
      'elegir una bendición-reliquia la añade a tus reliquias (barra superior)');
    // Already owned: not offered again
    const otra = BD.ofrecerBendicionEntreActos(run, crearRng(21));
    check(otra.every((o) => o.reliquia.id !== 'don-seducir'), 'la de Seducir no se ofrece si ya la tienes');

    for (const clase of CLASES) {
      const run2 = nuevaRun(clase, 22);
      run2.capitulo = 1;
      const of2 = BD.ofrecerBendicionEntreActos(run2, crearRng(22));
      const unica = cartaUnicaDeClase(clase);
      const u2 = of2.filter((o) => o.reliquia.tipoBendicion === 'unica');
      check(of2.length === 3 && u2.length === 2
        && u2.some((o) => o.reliquia.soloClase === clase && cartaDe[o.reliquia.id] === unica.id)
        && u2.some((o) => o.reliquia.id === 'don-deseo'),
      `${clase}: entre el Acto II y el III, la reliquia de su carta única, la de Deseo y otra bendición`);
      const u = u2.find((o) => o.reliquia.soloClase === clase);
      const n = run2.mazo.length;
      if (u) BD.aplicarBendicion(run2, u, crearRng(2));
      check(run2.mazo.length === n + 1 && run2.mazo[run2.mazo.length - 1].def.id === unica.id
        && run2.reliquias.includes(u!.reliquia), `${clase}: elegirla te da la reliquia y «${unica.nombre}» en el mazo`);
      const rest2 = rehidratarRun(JSON.parse(JSON.stringify(serializarRun(run2))));
      check(!!rest2 && rest2.mazo.filter((c) => c.def.id === unica.id).length === 1,
        `${clase}: al cargar la partida no se duplica «${unica.nombre}»`);
    }
    const run4 = nuevaRun('picaro', 24);
    run4.capitulo = 1;
    const d = BD.ofrecerBendicionEntreActos(run4, crearRng(24)).find((o) => o.reliquia.id === 'don-deseo');
    if (d) BD.aplicarBendicion(run4, d, crearRng(3));
    check(run4.mazo[run4.mazo.length - 1]?.def.id === 'deseo' && run4.reliquias.some((r) => r.id === 'don-deseo'),
      'elegir la de Deseo te da la reliquia y mete «Deseo» en el mazo');
    // Never outside their act
    let fuera = false;
    for (const clase of CLASES) {
      for (let s = 0; s < 20; s++) {
        const r5 = nuevaRun(clase, s);
        r5.capitulo = 2;
        if (BD.ofrecerBendicionEntreActos(r5, crearRng(s)).some((o) => o.reliquia.tipoBendicion === 'unica')) fuera = true;
        if (BD.bendicionesDisponibles(r5).some((r) => r.tipoBendicion === 'unica')) fuera = true;
      }
    }
    check(!fuera, 'las de carta única solo salen en su momento (nunca en los huecos de bendición normales)');

    // Owned blessings are never offered again
    const run3 = nuevaRun('mago', 23);
    run3.reliquias.push(...todas.filter((r) => r.tipoBendicion !== 'pacto'));
    let repetida = false;
    for (let s = 0; s < 20; s++) {
      for (const o of BD.ofrecerBendicionEntreActos(run3, crearRng(s))) {
        if (o.tipo === 'reliquia' && run3.reliquias.includes(o.reliquia)) repetida = true;
      }
    }
    check(!repetida, 'no se ofrece una bendición que ya tienes');
  }
  // — No flat "+N stat" blessing —
  {
    const soloEstadistica = /^(al obtenerlo:?\s*)?(\+?\d+ de \w+ permanente al inicio de cada combate|(empiezas cada combate con\s*)?\+?\d+ (de )?(fuerza|destreza|pv máximos|bloqueo|energía)( al obtenerlo| permanente)?)\.?$/i;
    const planas = todas.filter((r) => soloEstadistica.test(r.texto.trim()));
    check(planas.length === 0, `ninguna bendición es solo «+N estadística» (${planas.map((r) => r.id).join(', ')})`);
    const ofertas = [
      ...BD.ofrecerBendicionInicial(nuevaRun('picaro', 3), crearRng(3)),
      ...BD.ofrecerBendicionEntreActos(nuevaRun('picaro', 4), crearRng(4)),
    ];
    check(ofertas.every((o) => o.tipo === 'reliquia' && o.reliquia.rareza === 'bendicion'),
      'toda bendición es una reliquia, también las de carta única (ya no hay «+N PV máximos» sueltos)');
    const src = fs.readFileSync(new URL('../src/ui/bendicion.ts', import.meta.url), 'utf8');
    check(/relicIcon\(/.test(src) && !/permanentes\./.test(src), 'la pantalla de bendición pinta las reliquias con su ilustración y no toca estadísticas');
  }

  // — Effects: general —
  {
    const { comb } = await montar('druida', ['bendicion-alba']);
    const max = comb.jugador.energiaMax;
    check(comb.jugador.energia === max + 1 && comb.jugador.mano.length === 6, 'Bendición del Alba: turno 1, +1 de energía y 1 carta más');
    await comb.terminarTurno();
    check(comb.jugador.energia === max + 1 && comb.jugador.mano.length === 6, 'Bendición del Alba: turno 2, otra vez');
    await comb.terminarTurno();
    check(comb.jugador.energia === max && comb.jugador.mano.length === 5, 'Bendición del Alba: desde el turno 3, nada');
  }
  {
    const { comb } = await montar('druida', ['estrella-fugaz']);
    comb.jugador.energia = 10;
    for (let i = 0; i < 3; i++) await comb.jugarCarta(enMano(comb, 'golpe'), comb.enemigos[0]);
    const mano = comb.jugador.mano.length;
    check(comb.jugador.energia === 7, 'Estrella Fugaz: las 3 primeras cartas no devuelven nada');
    await comb.jugarCarta(enMano(comb, 'golpe'), comb.enemigos[0]);
    check(comb.jugador.energia === 7 && comb.jugador.mano.length === mano + 1,
      'Estrella Fugaz: la 4.ª carta del turno devuelve 1 de energía y roba 1');
  }
  {
    const { comb, ctx } = await montar('druida', ['campana-plegaria']);
    comb.jugador.pv = 40;
    await barajarDescarte(comb, ctx);
    check(comb.jugador.pv === 43 && comb.jugador.bloqueo === 5, 'Campana de Plegaria: al barajar el descarte, te curas 3 y ganas 5 de bloqueo');
  }
  {
    const { comb } = await montar('druida', ['mirada-vidente'], [atacante(5), muneco()]);
    const [a, q] = comb.enemigos;
    check(a.estados.debil === 2 && !a.estados.vulnerable && q.estados.vulnerable === 2 && !q.estados.debil,
      'Mirada de la Vidente: quien pretende atacar queda Débil 2; quien no, Vulnerable 2');
  }
  {
    const { comb } = await montar('druida', ['aureola-martir'], [atacante(6, 2)]);
    const pv = comb.jugador.pv;
    await comb.terminarTurno();
    check(comb.jugador.pv === pv - 9, 'Aureola del Mártir: cada golpe que te hiere te da bloqueo (la mitad) contra los siguientes');
  }
  // — Effects: pacts —
  {
    const { comb, ctx } = await montar('druida', ['pacto-sangre']);
    check(comb.jugador.energiaMax === 4 && comb.jugador.energia === 4, 'Pacto de Sangre: +1 de energía por turno');
    const pv = comb.jugador.pv;
    await barajarDescarte(comb, ctx);
    check(comb.jugador.pv === pv - 4, 'Pacto de Sangre: al barajar el descarte pierdes 4 PV');
  }
  {
    const { comb } = await montar('druida', ['corazon-cristal']);
    check(comb.jugador.estados.vulnerable === 2, 'Corazón de Cristal: empiezas cada combate con 2 de Vulnerable');
    await jugarCon(comb, 'golpe');
    check(comb.enemigos[0].pv === 200 - 9, 'Corazón de Cristal: tus ataques hacen 3 más por golpe');
  }
  {
    const { comb } = await montar('druida', ['pacto-insomne']);
    check(comb.jugador.mano.length === 7, 'Pacto del Insomne: robas 2 cartas más');
    const pv = comb.jugador.pv;
    await jugarCon(comb, 'defender');
    check(comb.jugador.pv === pv - 3, 'Pacto del Insomne: la primera carta del turno cuesta 3 PV');
    await jugarCon(comb, 'defender');
    check(comb.jugador.pv === pv - 3, 'Pacto del Insomne: las siguientes, no');
  }
  {
    const run = nuevaRun('barbaro', 30);
    const max = run.pvMax;
    const n = run.reliquias.length;
    RQ.otorgarReliquia(run, B('pacto-codicia'), crearRng(30));
    const nuevas = run.reliquias.slice(n);
    check(nuevas.length === 3 && nuevas[0].id === 'pacto-codicia' && nuevas.slice(1).every((r) => r.rareza === 'comun' || r.rareza === 'rara')
      && run.pvMax === max && run.mazo.some((c) => c.def.id === 'codicia'),
    'Pacto de la Codicia: al sellarlo, 2 reliquias al azar a cambio de la maldición Codicia');
  }
  // — Effects: map —
  {
    const run = nuevaRun('druida', 40);
    run.reliquias.push(B('farol-peregrino'));
    run.pv = 20;
    RUN.entrarEnSala(run, 'combate', crearRng(1));
    check(run.pv === 20, 'Farol del Peregrino: fuera de los campamentos no hace nada');
    const notas = RUN.entrarEnSala(run, 'descanso', crearRng(1));
    check(run.pv === 30 && notas.length === 1, 'Farol del Peregrino: al llegar a un campamento te cura 10 PV');
  }
  {
    const run = nuevaRun('druida', 41);
    run.reliquias.push(B('brujula-sibila'));
    check(RUN.cartaExtraEnSala(run, 'evento') && !RUN.cartaExtraEnSala(run, 'cofre'), 'Brújula de Síbila: tras cada evento eliges también una carta');
  }
  {
    const { run, comb, ctx } = await montar('druida', ['trofeo-cazador'], [muneco(10)], { elite: true });
    await ctx.danar(comb.enemigos[0], 50);
    check(run.mazo.filter((c) => c.mejorada).length === 1, 'Trofeo del Cazador: vencer a un élite mejora 1 carta al azar');
    const n = await montar('druida', ['trofeo-cazador'], [muneco(10)]);
    await n.ctx.danar(n.comb.enemigos[0], 50);
    check(n.run.mazo.every((c) => !c.mejorada), 'Trofeo del Cazador: un combate corriente no cuenta');
  }
  {
    const { comb } = await montar('druida', ['estandarte-cruzada'], [muneco()], { elite: true });
    check(comb.jugador.energiaMax === 4 && comb.jugador.bloqueo === 8, 'Estandarte de Cruzada: contra élites, +1 de energía por turno y 8 de bloqueo');
    const n = await montar('druida', ['estandarte-cruzada']);
    check(n.comb.jugador.energiaMax === 3 && n.comb.jugador.bloqueo === 0, 'Estandarte de Cruzada: en combates corrientes, nada');
  }
  // — Effects: class —
  {
    const { comb } = await montar('druida', ['bendicion-manada']);
    await jugarCon(comb, 'forma-lobo');
    check(comb.jugador.efectosTemporales[0]?.turnos === 3 && comb.jugador.invocacion?.vida === 5,
      'Bendición de la Manada: la forma dura lo normal e Invocas 5');
  }
  {
    const { comb } = await montar('druida', ['bendicion-raices'], [atacante(1)]);
    check(comb.enemigos[0].estados.raices === 2, 'Raíces Profundas: al empezar, 2 de Raíces a todos');
    await comb.terminarTurno();
    check(comb.jugador.mano.length === 6, 'Raíces Profundas: cuando tus Raíces aplastan, robas 1');
  }
  {
    const { comb, ctx } = await montar('barbaro', ['bendicion-trueno'], [muneco(), muneco()]);
    await ctx.ganarFuria(1);
    check(comb.enemigos.every((e) => e.pv === 197), 'Trueno Ancestral: ganar Furia inflige 3 a todos');
  }
  {
    const { comb, ctx } = await montar('barbaro', ['juramento-inquebrantable']);
    await ctx.ganarFuria(1);
    await comb.terminarTurno();
    check(comb.jugador.furiaFuerza === 2, 'Juramento Inquebrantable: la primera Furia perdida vuelve a arder (+2 de Fuerza)');
    await comb.terminarTurno();
    check(comb.jugador.furiaFuerza === 0, 'Juramento Inquebrantable: solo una vez por combate');
  }
  {
    const { run, comb, ctx } = await montar('mago', ['fuente-arcana']);
    check(comb.jugador.conjuros.length === run.espaciosConjuro + 1, 'Fuente Arcana: empiezas el combate con 1 espacio más');
    comb.jugador.conjuros = crearEspacios(3);
    const mano = comb.jugador.mano.length;
    await ctx.gastarConjuro(2);
    check(comb.jugador.mano.length === mano + 1, 'Fuente Arcana: gastar un espacio de nivel 2+ roba 1');
    await ctx.gastarConjuro(1);
    check(comb.jugador.mano.length === mano + 1, 'Fuente Arcana: los de nivel 1, no');
  }
  {
    const { comb, ctx } = await montar('mago', ['bendicion-constelacion']);
    comb.jugador.conjuros = crearEspacios(3);
    const en = comb.jugador.energia;
    await ctx.gastarConjuro(1);
    check(comb.jugador.energia === en, 'Constelación: el primer espacio no da nada');
    await ctx.gastarConjuro(1);
    check(comb.jugador.energia === en + 1, 'Constelación: cada 2 espacios gastados, +1 de energía');
  }
  {
    const { comb } = await montar('picaro', ['filo-consagrado']);
    const mano = comb.jugador.mano.length;
    const pv = comb.enemigos[0].pv;
    await jugarCon(comb, 'daga', 0);
    const golpe1 = pv - comb.enemigos[0].pv;
    check(golpe1 === 4 + 2 && comb.jugador.mano.length === mano + 1, 'Filo Consagrado: la primera Daga del turno hace 2 más (4 + 2) y roba 1');
    await jugarCon(comb, 'daga', 0);
    check(comb.jugador.mano.length === mano + 1 && pv - golpe1 - comb.enemigos[0].pv === golpe1,
      'Filo Consagrado: las siguientes Dagas también hacen 2 más, pero no roban');
  }
  {
    const { comb } = await montar('picaro', ['sombra-veloz']);
    await comb.descartarCarta(comb.jugador.mano[0]);
    check(comb.enemigos[0].estados.veneno === 2, 'Sombra Veloz: cada carta descartada aplica 2 de Veneno a un enemigo');
  }
  {
    const { comb } = await montar('brujo', ['eco-sobrenatural'], [muneco(), muneco()]);
    const [a, b] = comb.enemigos;
    await jugarCon(comb, 'explosion-sobrenatural', 3, a);
    const pvB = b.pv;
    check(pvB === 197, 'Eco Sobrenatural: la primera Explosión del turno inflige además 3 a los demás enemigos');
    await jugarCon(comb, 'explosion-sobrenatural', 3, a);
    check(b.pv === pvB, 'Eco Sobrenatural: solo la primera de cada turno');
  }
  {
    const { comb } = await montar('brujo', ['diablillo-guardian'], [muneco()]);
    check(comb.jugador.invocacion?.vida === 8 && comb.jugador.invocacion?.efimera === true,
      'Diablillo Guardián: empiezas cada combate con un diablillo efímero de 8 de vida');
    await comb.terminarTurno();
    check(comb.enemigos[0].pv === 194 && comb.enemigos[0].estados.condena === 2,
      'Diablillo Guardián: si aguanta la ronda golpea por 6 y aplica 2 de Condena');
  }
  // — Effects: unique-card relics (small themed bonus when you play their card) —
  {
    const CT = await import('../src/core/cartas.ts');
    const defUnica = (id: string) => CT.cartaPorId(id) ?? CT.NEUTRALES_ESPECIALES.find((c) => c.id === id)!;
    const alJugar = async (comb: Combate, relicId: string, cardId: string) => {
      const carta = instanciar(defUnica(cardId));
      await B(relicId).alJugarCarta?.(comb.contexto(), { carta, objetivo: comb.enemigos[0], jugadasTurno: 1, jugadasCombate: 1 });
    };
    {
      const { comb } = await montar('druida', ['don-seducir']);
      comb.jugador.energia = 0;
      await alJugar(comb, 'don-seducir', 'golpe');
      check(comb.jugador.energia === 0, 'Dado del Encanto: otras cartas no devuelven energía');
      await alJugar(comb, 'don-seducir', 'seducir');
      check(comb.jugador.energia === 1, 'Dado del Encanto: la primera Seducir del combate te devuelve su energía');
      await alJugar(comb, 'don-seducir', 'seducir');
      check(comb.jugador.energia === 1, 'Dado del Encanto: solo la primera de cada combate');
    }
    {
      const { comb } = await montar('druida', ['don-deseo']);
      const n = comb.jugador.mano.length;
      await alJugar(comb, 'don-deseo', 'deseo');
      check(comb.jugador.mano.length === n + 1, 'Dado de los Deseos: al jugar Deseo robas 1 carta');
    }
    {
      const { comb } = await montar('druida', ['don-tormenta-venganza']);
      comb.jugador.pv = 30;
      await alJugar(comb, 'don-tormenta-venganza', 'tormenta-venganza');
      check(comb.jugador.pv === 36, 'Tormenta de Venganza (reliquia): al jugar la carta te curas 6 PV');
    }
    {
      const { comb } = await montar('barbaro', ['don-furia-indomita']);
      const f = comb.jugador.estados.fuerza ?? 0;
      await alJugar(comb, 'don-furia-indomita', 'furia-indomita');
      check((comb.jugador.estados.fuerza ?? 0) === f + 1, 'Furia Indómita (reliquia): al jugar la carta ganas Furia (+1 de Fuerza)');
    }
    {
      const { comb } = await montar('mago', ['don-maestria-conjuros']);
      const n = comb.jugador.conjuros.length;
      await alJugar(comb, 'don-maestria-conjuros', 'maestria-conjuros');
      check(comb.jugador.conjuros.length === n + 1, 'Maestría de Conjuros (reliquia): al jugar la carta ganas 1 espacio de conjuro');
    }
    {
      const { comb } = await montar('picaro', ['don-danza-mortal']);
      const n = comb.jugador.mano.filter((c) => c.def.id === 'daga').length;
      await alJugar(comb, 'don-danza-mortal', 'danza-mortal');
      check(comb.jugador.mano.filter((c) => c.def.id === 'daga').length === n + 2, 'Danza Mortal (reliquia): al jugar la carta creas 2 Dagas');
    }
    {
      const { comb } = await montar('brujo', ['don-pacto-final']);
      const b = comb.jugador.bloqueo;
      await alJugar(comb, 'don-pacto-final', 'pacto-final');
      check(comb.jugador.bloqueo === b + 6, 'Pacto Final (reliquia): al jugar la carta ganas 6 de bloqueo');
    }
  }
  // — Saving —
  {
    for (const clase of CLASES) {
      const run = nuevaRun(clase, 51);
      run.reliquias.push(...todas.filter((r) => !r.soloClase || r.soloClase === clase));
      const rest = rehidratarRun(JSON.parse(JSON.stringify(serializarRun(run))));
      check(!!rest && rest.reliquias.length === run.reliquias.length
        && rest.reliquias.every((r, i) => r === run.reliquias[i]),
      `${clase}: las bendiciones-reliquia se guardan y rehidratan con sus efectos`);
    }
    const run = nuevaRun('druida', 52);
    RQ.otorgarReliquia(run, B('pacto-codicia'), crearRng(52));
    const max = run.pvMax;
    const rest = rehidratarRun(JSON.parse(JSON.stringify(serializarRun(run))));
    check(!!rest && rest.pvMax === max && rest.reliquias.length === run.reliquias.length,
      'rehidratar no vuelve a aplicar el pacto de la Codicia');
  }
}

console.log('— Fila de cofres —');
{
  // Every chapter has exactly one row of chests: the central one, all chests
  let malas = 0;
  for (let i = 0; i < 80; i++) {
    const mapa = generarMapa(crearRng(i * 17 + 3));
    const numFilas = Math.max(...mapa.map((n) => n.fila)) + 1;
    const central = Math.floor((numFilas - 1) / 2);
    const filasCofre = new Set(mapa.filter((n) => n.tipo === 'cofre').map((n) => n.fila));
    if (filasCofre.size !== 1) malas++;
    else if (!filasCofre.has(central)) malas++;
    if (!mapa.filter((n) => n.fila === central).every((n) => n.tipo === 'cofre')) malas++;
  }
  check(malas === 0, `80 mapas: una sola fila de cofres, la central, entera de cofres (${malas} fallos)`);
}

console.log('— Taberna y misiones —');
{
  const TB = await import('../src/core/taberna.ts').catch(() => null);
  check(!!TB, 'existe el módulo de la taberna (core/taberna.ts)');
  if (TB) {
    // Map: 1–2 taverns per chapter, never on the first row nor next to the boss
    let malas = 0;
    let sinMision = 0;
    let rumoresMalos = 0;
    let conDos = 0;
    for (let i = 0; i < 80; i++) {
      const mapa = generarMapa(crearRng(i * 13 + 5));
      const tabernas = mapa.filter((n) => n.tipo === 'taberna');
      if (tabernas.length >= 2) conDos++;
      if (tabernas.length < 1 || tabernas.length > 2) malas++;
      if (tabernas.some((t) => t.fila === 0 || t.fila >= 8)) malas++;
      // existing guarantees still hold
      if (!mapa.some((n) => n.tipo === 'elite') || !mapa.some((n) => n.tipo === 'cofre')) malas++;
      if (mapa.filter((n) => n.tipo === 'evento').length < 2) malas++;
      if (mapa.filter((n) => n.tipo === 'descanso' && n.fila < 8).length < 2) malas++;
      for (const t of tabernas) {
        const cands = TB.candidatosMision(mapa, t.id);
        if (cands.length === 0) sinMision++;
        const run = nuevaRun('druida', i + 1);
        run.mapa = mapa;
        run.nodoActual = t.id;
        const rumores = TB.rumoresTaberna(run, t, crearRng(i));
        if (rumores.length < 1 || rumores.length > 2) rumoresMalos++;
        if (new Set(rumores.map((r) => r.nodo)).size !== rumores.length) rumoresMalos++;
        for (const r of rumores) {
          const obj = mapa.find((n) => n.id === r.nodo)!;
          const d = obj.fila - t.fila;
          if (!TB.esAlcanzable(mapa, t.id, obj.id)) rumoresMalos++;
          if (d < 2 || d > 4) rumoresMalos++;
          if (!['combate', 'elite', 'evento', 'cofre'].includes(obj.tipo)) rumoresMalos++;
          if (!r.texto || !r.narrador) rumoresMalos++;
        }
      }
    }
    check(malas === 0, `80 mapas: 1–2 tabernas fuera de la fila 0 y del tramo del jefe, sin romper garantías (${malas} fallos)`);
    check(conDos > 0 && conDos < 80, 'unos capítulos tienen 1 taberna y otros 2');
    check(sinMision === 0, `toda taberna tiene un destino de misión a 2–4 filas (${sinMision} sin destino)`);
    check(rumoresMalos === 0, `los rumores marcan nodos alcanzables a 2–4 filas de tipo válido (${rumoresMalos} fallos)`);

    // Rumour variety: 6–8 texts, and the text reflects the marked node's type
    check(TB.RUMORES.length >= 6 && TB.RUMORES.length <= 8, `hay de 6 a 8 rumores (${TB.RUMORES.length})`);
    for (const tipo of ['combate', 'elite', 'evento', 'cofre'] as const) {
      check(TB.RUMORES.some((r) => r.tipo === tipo), `hay rumores que apuntan a nodos de tipo ${tipo}`);
    }

    // Helper: a run standing on a tavern with an accepted rumour
    const conMision = (semilla: number) => {
      const run = nuevaRun('barbaro', semilla);
      const t = run.mapa.find((n) => n.tipo === 'taberna')!;
      run.nodoActual = t.id;
      t.visitado = true;
      const [rumor] = TB.rumoresTaberna(run, t, crearRng(semilla));
      TB.aceptarRumor(run, rumor);
      return { run, t, rumor };
    };

    // Completing the marked node grants one relic, only once
    {
      const { run, rumor } = conMision(77);
      check(run.mision?.nodo === rumor.nodo, 'aceptar un rumor marca la misión en la run');
      const otro = run.mapa.find((n) => n.id !== rumor.nodo && n.tipo === 'combate')!;
      const antes = run.reliquias.length;
      check(TB.completarMision(run, otro, crearRng(1)) === undefined && run.reliquias.length === antes,
        'completar otro nodo no da la reliquia de la misión');
      const objetivo = run.mapa.find((n) => n.id === rumor.nodo)!;
      const r = TB.completarMision(run, objetivo, crearRng(2));
      check(!!r && run.reliquias.length === antes + 1 && run.reliquias.includes(r!),
        'completar el nodo marcado otorga una reliquia');
      check(!run.mision, 'la misión queda cumplida y se borra');
      check(TB.completarMision(run, objetivo, crearRng(3)) === undefined && run.reliquias.length === antes + 1,
        'la reliquia de la misión solo se da una vez');
    }

    // The mission is lost once the marked node is no longer reachable
    {
      const { run, rumor } = conMision(91);
      const objetivo = run.mapa.find((n) => n.id === rumor.nodo)!;
      check(TB.revisarMision(run) === false && !!run.mision, 'la misión sigue viva mientras el nodo es alcanzable');
      // stand on a node of the target's row that is not the target
      const lejano = run.mapa.find((n) => n.fila === objetivo.fila && n.id !== objetivo.id)
        ?? run.mapa.find((n) => n.fila > objetivo.fila)!;
      run.nodoActual = lejano.id;
      check(TB.revisarMision(run) === true && !run.mision, 'la misión se pierde si el nodo deja de ser alcanzable');
      check(TB.revisarMision(run) === false, 'sin misión no hay nada que perder');
    }
    {
      // standing on the target itself does not lose it (it is resolved after the room)
      const { run, rumor } = conMision(92);
      run.nodoActual = rumor.nodo;
      check(TB.revisarMision(run) === false && !!run.mision, 'estar en el nodo marcado no pierde la misión');
    }

    // Save / load keeps the mission
    {
      const { run, rumor } = conMision(55);
      const rest = rehidratarRun(JSON.parse(JSON.stringify(serializarRun(run))))!;
      check(rest.mision?.nodo === rumor.nodo && rest.mision?.texto === rumor.texto, 'el guardado conserva la misión');
      const sin = nuevaRun('mago', 3);
      const rest2 = rehidratarRun(JSON.parse(JSON.stringify(serializarRun(sin))))!;
      check(!rest2.mision, 'un guardado sin misión se rehidrata sin misión');
    }

    // A new chapter drops the old mission (new map)
    {
      const { run } = conMision(66);
      avanzarCapitulo(run, crearRng(4));
      check(!run.mision, 'al cambiar de capítulo la misión antigua se descarta');
    }

    // Last option: instead of a rumour, someone in the tavern takes a card off your deck
    {
      const run = nuevaRun('picaro', 8);
      const n = run.mazo.length;
      check(TB.cartasEliminables(run).length === n, 'la taberna deja elegir cualquier carta del mazo para eliminarla');
      const carta = run.mazo[0];
      check(TB.eliminarCarta(run, carta) && run.mazo.length === n - 1 && !run.mazo.includes(carta),
        'eliminar una carta en la taberna la quita del mazo');
      check(!TB.eliminarCarta(run, carta) && run.mazo.length === n - 1, 'no se puede eliminar una carta que ya no está en el mazo');
      check(TB.OLVIDOS_TABERNA.length >= 3, `la opción de eliminar tiene varias escenas distintas (${TB.OLVIDOS_TABERNA.length})`);
      const vistos = new Set<string>();
      for (let i = 0; i < 30; i++) vistos.add(TB.olvidoTaberna(crearRng(i)).etiqueta);
      check(vistos.size === TB.OLVIDOS_TABERNA.length, 'cada taberna cuenta la opción de eliminar de una forma al azar');
      check(TB.OLVIDOS_TABERNA.every((o) => /elimina/i.test(o.detalle)), 'todas las escenas dicen claramente que eliminas una carta');
      check(!('beberJarra' in TB), 'la taberna ya no cura con una jarra');
    }
  }
}

// ── Movimiento de cartas (src/ui/card-motion.ts) ─────────────────────────────
{
  console.log('\n— Movimiento de cartas —');
  const CM = await import('../src/ui/card-motion.ts');
  const hero = { x: 100, y: 200, w: 80, h: 120 };
  const ogre = { x: 600, y: 180, w: 100, h: 140 };
  const goblin = { x: 800, y: 220, w: 60, h: 100 };
  const base = { enemies: [ogre, goblin], hero, from: { x: 500, y: 700 }, viewport: { w: 1000, h: 800 } };
  const d1 = CM.playDestination({ ...base, mode: 'enemigo', kind: 'ataque', target: ogre });
  check(d1.aim === 'enemy' && d1.point.x === 650 && d1.point.y === 250,
    'una carta con objetivo vuela al centro del enemigo elegido');
  const d2 = CM.playDestination({ ...base, mode: 'ninguno', kind: 'habilidad' });
  check(d2.aim === 'hero' && d2.point.x === 140 && d2.point.y === 260,
    'una habilidad o defensa sin objetivo vuela hacia el héroe');
  check(CM.playDestination({ ...base, mode: 'propio', kind: 'ataque' }).aim === 'hero',
    'una carta sobre uno mismo vuela hacia el héroe');
  const d3 = CM.playDestination({ ...base, mode: 'todos', kind: 'ataque' });
  check(d3.aim === 'enemies' && d3.point.x === (650 + 830) / 2,
    'una carta de área vuela hacia el centro de los enemigos');
  check(CM.playDestination({ ...base, mode: 'ninguno', kind: 'ataque' }).aim === 'enemies',
    'un ataque sin objetivo concreto vuela hacia los enemigos');
  check(CM.playDestination({ ...base, mode: 'ninguno', kind: 'ataque', selfFx: true }).aim === 'hero',
    'un ataque cuyo efecto brilla en el héroe vuela hacia el héroe');
  const d4 = CM.playDestination({ ...base, enemies: [], mode: 'todos', kind: 'ataque' });
  check(d4.aim === 'up' && d4.point.x === 500 && d4.point.y < 700 && d4.point.y >= 40,
    'sin nadie a quien apuntar, la carta sube');
  check(CM.playDestination({ ...base, mode: 'enemigo', kind: 'ataque', target: null }).aim === 'enemies',
    'una carta de objetivo sin enemigo conocido vuela hacia los enemigos');

  const delays = CM.drawDelays(5);
  const steps = delays.slice(1).map((d, i) => d - delays[i]);
  check(delays.length === 5 && delays[0] === 0 && steps.every((s) => s >= 60 && s <= 90),
    'al robar varias cartas salen escalonadas entre 60 y 90 ms');
  check(CM.drawDelays(3, { after: 200 })[0] === 200, 'el robo espera a que acabe el barajado');
  check(CM.drawDelays(4, { reduced: true, after: 200 }).every((d) => d === 0),
    'con movimiento reducido las cartas robadas no se escalonan');
  check(CM.drawDelays(0).length === 0, 'sin cartas robadas no hay retrasos');

  const durs = [0, 200, 600, 2000].map((d) => CM.playDuration(d));
  check(durs.every((d) => d >= CM.PLAY_MIN_MS && d <= CM.PLAY_MAX_MS) && durs[0] <= durs[3],
    'la duración del vuelo está en rango y crece con la distancia');
  check(CM.playDuration(100, { impactMs: 420 }) >= 420, 'la carta no llega antes que el golpe del héroe');
  check(CM.playDuration(100, { impactMs: 5000 }) === CM.PLAY_MAX_MS, 'un golpe muy lento no alarga el vuelo sin límite');
  check(CM.playDuration(900, { reduced: true }) <= 150, 'con movimiento reducido el vuelo es un fundido breve');
  check(CM.DRAW_MS >= 250 && CM.DRAW_MS <= 500 && CM.DISCARD_MS <= 400, 'robar y descartar duran poco');

  const from = { x: 500, y: 700 };
  const to = { x: 650, y: 250 };
  const soloCompositor = (fs: { [k: string]: unknown }[]) =>
    fs.every((f) => Object.keys(f).every((k) => ['transform', 'opacity', 'offset', 'easing'].includes(k)));
  const play = CM.playFrames(from, to);
  check(soloCompositor(play), 'las animaciones de cartas solo usan transform y opacidad');
  check(play[0].opacity === 1 && play[play.length - 1].opacity === 0
    && play[play.length - 1].transform.includes('translate(150px, -450px)')
    && /scale\(0\.[0-3]/.test(play[play.length - 1].transform),
  'la carta jugada llega al objetivo encogida y se desvanece al llegar');
  check(/rotate\(-?1\d/.test(play[play.length - 1].transform), 'la carta jugada gira mientras vuela');
  check(CM.playFrames(from, to, { prefix: 'translate(-50%, -50%)', startScale: 1.7 }).every((f) => f.transform.startsWith('translate(-50%, -50%)')),
    'el escaparate de las raras conserva su centrado al volar al objetivo');
  const reducedPlay = CM.playFrames(from, to, { reduced: true });
  check(reducedPlay.every((f) => f.transform.includes('translate(0px, 0px)') && !f.transform.includes('rotate')),
    'con movimiento reducido la carta jugada solo se desvanece en su sitio');

  const draw = CM.drawFrames({ x: 40, y: 760 }, { x: 400, y: 700 }, 6);
  const last = draw[draw.length - 1];
  check(soloCompositor(draw) && draw[0].transform.includes('translate(-360px, 60px)')
    && draw[0].transform.includes('rotateY(180deg)') && last.transform.includes('translate(0px, 0px)')
    && last.transform.includes('rotateY(0deg)') && last.transform.includes('rotate(6deg)') && last.opacity === 1,
  'la carta robada sale boca abajo de la pila y llega boca arriba a su hueco de la mano');
  check(CM.drawFrames({ x: 40, y: 760 }, { x: 400, y: 700 }, 6, { reduced: true }).every((f) => !f.transform.includes('rotateY')),
    'con movimiento reducido la carta robada aparece sin volar');
  const disc = CM.discardFrames({ x: 400, y: 700 }, { x: 960, y: 760 });
  check(soloCompositor(disc) && disc[disc.length - 1].transform.includes('translate(560px, 60px)'),
    'al descartar la mano cada carta vuela a la pila de descarte');
  check(CM.shuffleCount(30) === CM.SHUFFLE_MAX_CARDS && CM.shuffleCount(2) === 2 && CM.shuffleCount(30, true) === 0,
    'el barajado muestra pocas cartas y ninguna con movimiento reducido');
  const sh = CM.shuffleFrames({ x: 960, y: 760 }, { x: 40, y: 760 }, 0);
  check(soloCompositor(sh) && sh[sh.length - 1].transform.includes('translate(-920px, 0px)'),
    'al barajar, las cartas van del descarte a la pila de robo');
  // reflow: the cards left in the hand glide to their new slot instead of jumping
  const antes = { x: 300, y: 10, ang: -6, alza: 4 }, ahora = { x: 260, y: 10, ang: -3, alza: 1 };
  const dr = CM.reflowDelta(antes, ahora)!;
  check(dr.dx === 40 && dr.dy === 3 && dr.dAng === -3, 'al reordenar la mano, cada carta sale desde donde estaba');
  check(CM.reflowDelta(ahora, { ...ahora, x: ahora.x + 0.4 }) === null, 'una carta que no se mueve no se anima');
  const rf = CM.reflowFrames(dr);
  check(rf.length === 2 && rf[0].translate === '40px 3px' && rf[0].rotate === '-3deg'
    && rf[1].translate === '0px 0px' && rf[1].rotate === '0deg',
    'el recolocado desliza la carta (translate y rotate) hasta su hueco');
  check(Object.keys(rf[0]).every((k) => ['translate', 'rotate', 'offset', 'easing'].includes(k)),
    'el recolocado solo anima translate y rotate (compositor)');
  check(CM.REFLOW_MS >= 180 && CM.REFLOW_MS <= 320, `el recolocado es corto pero visible (${CM.REFLOW_MS} ms)`);
  check(CM.reflowDuration(false) === CM.REFLOW_MS && CM.reflowDuration(true) === 0, 'con movimiento reducido la mano se recoloca sin animar');
}

// ── Exhausted cards disintegrate (src/ui/card-motion.ts + card-fly.ts) ──────────
console.log('\n— Cartas agotadas: se desintegran —');
{
  const fs = await import('node:fs');
  const CM: any = await import('../src/ui/card-motion.ts');
  const leer = (f: string) => (fs.existsSync(new URL(`../src/${f}`, import.meta.url)) ? fs.readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8') : '');
  const trozo = (src: string, desde: string) => (src.includes(desde) ? src.slice(src.indexOf(desde), src.indexOf('\n}', src.indexOf(desde))) : '');
  const W = 120, H = 170;
  const plan = typeof CM.dissolvePlan === 'function' ? CM.dissolvePlan(W, H, { seed: 3 }) : null;
  check(!!plan, 'existe un plan puro de desintegración de cartas');
  if (plan) {
    check(plan.duration >= 600 && plan.duration <= 900, `la desintegración dura entre 0,6 y 0,9 s (${plan.duration} ms)`);
    const nums = (clip: string) => (clip.match(/-?\d+(\.\d+)?px/g) ?? []).map((s) => parseFloat(s));
    const ys = (clip: string) => nums(clip).filter((_, i) => i % 2 === 1);
    const card = plan.card as { clipPath: string; offset: number }[];
    check(card.length >= 6 && card.every((f) => /^polygon\(/.test(f.clipPath)),
      'la carta se recorta con un polígono animado (clip-path, sin repintar texturas)');
    const vertices = card.map((f) => nums(f.clipPath).length);
    check(vertices.every((n) => n === vertices[0]) && [plan.glow, plan.char, plan.core].every(
      (fr: { clipPath: string }[]) => fr.length === card.length && fr.every((f) => nums(f.clipPath).length === nums(fr[0].clipPath).length)),
    'todos los fotogramas del borde tienen los mismos vértices (se interpolan suave)');
    check(card.every((f, i) => i === 0 || f.offset >= card[i - 1].offset) && card[0].offset === 0 && card[card.length - 1].offset === 1,
      'los fotogramas del recorte van de 0 a 1 en orden');
    const edge0 = CM.dissolveEdge(0, W, H, 3) as { x: number; y: number }[];
    const edge1 = CM.dissolveEdge(1, W, H, 3) as { x: number; y: number }[];
    check(edge0.every((p) => p.y <= 0), 'al empezar el borde está por encima de la carta: se ve entera');
    check(edge1.every((p) => p.y >= H), 'al acabar el borde ha pasado la carta entera: no queda nada');
    const firstY = ys(card[0].clipPath).slice(0, edge0.length);
    const lastY = ys(card[card.length - 1].clipPath).slice(0, edge1.length);
    check(firstY.every((y) => y <= 0) && lastY.every((y) => y >= H), 'el recorte arranca con la carta entera y termina vacío');
    const mid = CM.dissolveEdge(0.5, W, H, 3) as { x: number; y: number }[];
    const alturas = mid.map((p) => p.y);
    check(Math.max(...alturas) - Math.min(...alturas) > 6, 'el borde que avanza es irregular (se quema, no es un corte recto)');
    check(edge0[0].x <= 0 && edge0[edge0.length - 1].x >= W, 'el borde cruza la carta de lado a lado');
    const glowBand = (() => {
      const g = nums(plan.glow[Math.floor(plan.glow.length / 2)].clipPath);
      const n = g.length / 4;
      let max = 0;
      for (let i = 0; i < n; i++) max = Math.max(max, Math.abs(g[(2 * n - 1 - i) * 2 + 1] - g[i * 2 + 1]));
      return max;
    })();
    check(glowBand > 1 && glowBand <= 12, `el filo incandescente es una franja fina (${glowBand.toFixed(1)} px)`);
    const embers = plan.embers as { at: number; x: number; y: number; preset: string }[];
    check(embers.length >= 16 && embers.length <= CM.DISSOLVE_MAX_EMBERS, `se desprenden fragmentos con tope (${embers.length} ≤ ${CM.DISSOLVE_MAX_EMBERS})`);
    check(embers.every((e) => e.x >= 0 && e.x <= W && e.y >= 0 && e.y <= H), 'los fragmentos salen de dentro de la carta');
    check(embers.every((e) => e.at >= 0 && e.at <= plan.duration), 'los fragmentos salen mientras dura la desintegración');
    check(embers.every((e) => {
      const edge = CM.dissolveEdge(CM.dissolveProgress(e.at / plan.duration), W, H, 3) as { x: number; y: number }[];
      const near = edge.reduce((a, p) => (Math.abs(p.x - e.x) < Math.abs(a.x - e.x) ? p : a));
      return Math.abs(near.y - e.y) <= H * 0.12;
    }), 'cada fragmento se desprende del borde que avanza en ese instante');
    check(new Set(embers.map((e) => e.preset)).size >= 2 && embers.every((e) => !!EFFECTS[e.preset]),
      'los fragmentos mezclan brasas y ceniza, con presets de partículas existentes');
    const up = (k: string) => !!EFFECTS[k] && (EFFECTS[k].gravity < 0 || (EFFECTS[k].direction ?? [0, 0])[1] < 0);
    check(up('brasaCarta') && up('cenizaCarta') && !!EFFECTS.brasaCarta.glow,
      'las brasas brillan y brasas y ceniza se las lleva una corriente hacia arriba');
    check(plan.lift.every((f: { [k: string]: unknown }) => Object.keys(f).every((k) => ['transform', 'opacity', 'offset', 'easing'].includes(k)))
      && plan.flash.every((f: { [k: string]: unknown }) => Object.keys(f).every((k) => ['transform', 'opacity', 'offset', 'easing'].includes(k))),
    'el cuerpo de la carta y su destello solo animan transform y opacidad');
    check(Math.max(...plan.flash.map((f: { opacity: number }) => f.opacity)) > 0.3 && plan.flash[0].opacity === 0,
      'hay una anticipación: la carta se enciende antes de deshacerse');
    const fewer = CM.dissolvePlan(W, H, { seed: 3, fewer: true });
    check(fewer.embers.length > 0 && fewer.embers.length <= Math.ceil(embers.length / 2),
      `con «Reducir partículas» salen la mitad de fragmentos (${fewer.embers.length})`);
    const reduced = CM.dissolvePlan(W, H, { seed: 3, reduced: true });
    check(reduced.embers.length === 0 && reduced.card.length === 0 && reduced.duration <= 250
      && reduced.lift[reduced.lift.length - 1].opacity === 0 && reduced.lift.every((f: { transform: string }) => f.transform === reduced.lift[0].transform),
    'con movimiento reducido la carta agotada solo se desvanece, sin partículas');
    const pose = CM.dissolvePlan(W, H, { seed: 3, prefix: 'translate(-50%, -50%) ', dx: 40, dy: -80, angle: 12, scale: 0.8 });
    check(pose.lift.every((f: { transform: string }) => f.transform.startsWith('translate(-50%, -50%)') && f.transform.includes('rotate(1')),
      'la desintegración conserva la pose en que se quedó la carta (escaparate incluido)');
    const batch = CM.dissolveBudget(8, false);
    check(batch * 8 <= CM.DISSOLVE_BATCH_EMBERS && CM.dissolveBudget(1, false) === CM.DISSOLVE_MAX_EMBERS,
      'si se agotan muchas cartas a la vez, el total de fragmentos sigue con tope');
    const st = CM.dissolveDelays(5, false);
    check(st.length === 5 && st[0] === 0 && st[4] > st[3] && CM.dissolveDelays(5, true).every((d: number) => d === 0),
      'varias cartas agotadas a la vez se deshacen escalonadas (a la vez con movimiento reducido)');
    const ex = CM.exhaustFrames({ x: 500, y: 700 }, { x: 700, y: 200 }, {});
    const fin = ex[ex.length - 1];
    check(fin.opacity === 1 && /scale\(0\.[5-9]/.test(fin.transform) && fin.transform.includes('translate(80px, -200px)'),
      'la carta que se agota al jugarla sube hacia el objetivo, visible, y se deshace a medio camino');
  }

  // prediction of the core rules: the play decides, before the flight, whether the card will disintegrate
  if (typeof CM.exhaustsWhenPlayed === 'function') {
    const todas: CartaDef[] = [...DRUIDA, ...BARBARO, ...MAGO, ...PICARO, ...BRUJO, ...PALADIN, ...NEUTRALES_ESPECIALES];
    const poder = todas.find((c) => c.tipo === 'poder' && !c.alTopeDelMazo);
    const unUso = todas.find((c) => c.unUso);
    const tope = todas.find((c) => c.alTopeDelMazo);
    check(CM.exhaustsWhenPlayed(DAGA, {}) && !!poder && CM.exhaustsWhenPlayed(poder, {}) && !!unUso && CM.exhaustsWhenPlayed(unUso, {}),
      'las Dagas, los poderes y las cartas de un uso se desintegran al jugarlas');
    check(!CM.exhaustsWhenPlayed(BASICAS[0], {}) && CM.exhaustsWhenPlayed(BASICAS[0], { cartasAgotan: 1 }),
      'una carta normal va al descarte, salvo con el Rayo Áureo (todas se agotan)');
    check(!tope || !CM.exhaustsWhenPlayed(tope, { cartasAgotan: 1 }), 'la Explosión Sobrenatural vuelve al mazo: no se desintegra');
    // agrees with the real combat engine
    const probar = async (def: CartaDef, estados: Record<string, number>) => {
      const run = nuevaRun('picaro', 5151);
      const c = new Combate(run, [GOBLIN_CORTADOR], crearRng(5151), uiSilenciosa);
      await c.iniciar();
      c.enemigos[0].pv = 500;
      const inst = instanciar(def);
      c.jugador.mano.push(inst);
      c.jugador.energia = 9;
      Object.assign(c.jugador.estados, estados);
      const previsto = CM.exhaustsWhenPlayed(def, c.jugador.estados);
      await c.jugarCarta(inst, c.enemigos[0]);
      return previsto === c.jugador.agotadas.includes(inst);
    };
    const golpe = BASICAS.find((c) => c.tipo === 'ataque' && c.objetivo === 'enemigo') ?? BASICAS[0];
    check(await probar(DAGA, {}) && await probar(golpe, {}) && await probar(golpe, { cartasAgotan: 1 }),
      'la previsión coincide con el motor: la carta acaba en agotadas justo cuando se desintegra');
  } else check(false, 'existe exhaustsWhenPlayed para saber si la carta jugada se desintegrará');

  const vuelo = leer('ui/card-fly.ts');
  const agotar = trozo(vuelo, 'export function flyExhaust');
  check(!!agotar, 'card-fly exporta flyExhaust (desintegra una carta en su sitio)');
  check(/reducedMotion\(\)/.test(agotar) && /menosParticulas\(\)/.test(agotar), 'la desintegración respeta el movimiento reducido y «Reducir partículas»');
  check(/fx\.emitir\(/.test(vuelo) && /clipPath|clip-path/.test(vuelo) && !/filter|box-shadow|boxShadow/.test(agotar),
    'los fragmentos van al lienzo de partículas y el borde es un recorte (sin filtros ni sombras animadas)');
  check(/exhaust/.test(trozo(vuelo, 'export function flyPlay')) && /exhaust/.test(trozo(vuelo, 'export function flyShowcase')),
    'el vuelo de una carta jugada (y el de las raras) puede acabar desintegrándose');
  const combateUi = leer('ui/combate.ts');
  const mano = trozo(combateUi, 'function renderMano()');
  check(/agotadas\.includes\(inst\)[\s\S]{0,120}flyExhaust\(/.test(mano),
    'las cartas que se agotan desde la mano se desintegran en su sitio');
  check(/descarte\.includes\(inst\)\) flyDiscard/.test(mano), 'las descartadas siguen volando al descarte');
  const lanz = trozo(combateUi, 'async function animarLanzamiento');
  check(/exhaustsWhenPlayed\(/.test(lanz) && /flyPlay\([^;]*exhaust/.test(lanz) && /flyShowcase\([^;]*exhaust/.test(lanz),
    'al jugar una carta que se agota, su vuelo termina desintegrándose en vez de desvanecerse');
  const css = leer('estilos/cartas.css');
  check(['carta-brasa', 'carta-quemado', 'carta-filo', 'carta-destello'].every((k) => css.includes(`.${k}`)),
    'la carta que arde tiene su chamuscado, su filo incandescente y su destello');
}

console.log('— Maldiciones —');
{
  const fs = await import('node:fs');
  // Dynamic imports: the section reports failures instead of crashing if something is missing.
  const CT: any = await import('../src/core/cartas.ts');
  const RUNM: any = await import('../src/core/run.ts');
  const RQM: any = await import('../src/core/reliquias.ts');
  const { checkCardAction: checkCurse } = await import('../src/ui/action-queue.ts');
  const MALD: CartaDef[] = CT.MALDICIONES ?? [];
  const M = (id: string): CartaDef | undefined => MALD.find((c) => c.id === id);
  const ESPERADAS = [
    'herida-infectada', 'duda', 'pesadilla', 'deuda-sangre', 'marca-condenado',
    'maldicion-momia', 'remordimiento', 'paralisis', 'codicia', 'grilletes',
  ];
  // 10 shared curses plus the bosses' own (Vol'guth's Phylactery Chain)
  check(MALD.length >= 8 && MALD.length <= 11, `hay entre 8 y 11 maldiciones (${MALD.length})`);
  check(ESPERADAS.every((id) => !!M(id)), `existen todas las maldiciones previstas (faltan: ${ESPERADAS.filter((id) => !M(id)).join(', ')})`);
  check(MALD.every((c) => c.tipo === 'maldicion' && c.clase === 'neutral'), 'todas son de tipo «maldicion»');
  check(MALD.every((c) => !c.mejora), 'las maldiciones no se pueden mejorar en los campamentos');
  check(MALD.every((c) => CT.cartaPorId(c.id) === c), 'el registro por id conoce todas las maldiciones');

  const quieto: EnemigoDef = {
    id: 'muneco-maldito', nombre: 'Muñeco', arte: '🎯', pv: [300, 300],
    ia: () => ({ nombre: 'Esperar', intencion: 'desconocido' }),
  };
  /** Combat against a harmless dummy with a controlled hand (the dealt hand goes to the discard). */
  async function montarM(mano: string[] = [], mazoRun: string[] = [], enemigo: EnemigoDef = quieto) {
    const run = nuevaRun('druida', 4242);
    run.reliquias = [];
    for (const id of mazoRun) run.mazo.push(instanciar(CT.cartaPorId(id)));
    const comb = new Combate(run, [enemigo], crearRng(4242), uiSilenciosa);
    await comb.iniciar();
    comb.jugador.descarte.push(...comb.jugador.mano);
    comb.jugador.mano = [];
    const insts = mano.map((id) => {
      const inst = instanciar(CT.cartaPorId(id));
      comb.jugador.mano.push(inst);
      return inst;
    });
    return { run, comb, insts, ctx: comb.contexto() };
  }
  const idsEn = (pila: CartaInstancia[]) => pila.map((c) => c.def.id);

  if (MALD.length === 0) {
    check(false, 'sin maldiciones no se puede probar el resto');
  } else {
    try {
      // — They cannot be played (only the Blood Debt can be paid off) —
      {
        const injugables = MALD.filter((c) => !c.purgar);
        const { comb, insts } = await montarM(injugables.map((c) => c.id));
        comb.jugador.energia = 3;
        check(insts.every((i) => !comb.puedeJugar(i)), 'ninguna maldición se puede jugar aunque sobre energía');
        await comb.jugarCarta(insts[0]);
        check(comb.jugador.mano.includes(insts[0]) && comb.jugador.energia === 3,
          'intentar jugar una maldición no hace nada (sigue en la mano, no gasta energía)');
        const bloqueadas = insts.filter((i) => !checkCurse({ card: i }, {
          inHand: (c) => comb.jugador.mano.includes(c),
          canPlay: (c) => comb.puedeJugar(c),
          reason: () => 'Las maldiciones no se pueden jugar',
          needsTarget: () => false,
          isAlive: () => true,
          livingTargets: () => [],
        }).ok);
        check(bloqueadas.length === insts.length, 'la cola de acciones rechaza las maldiciones');
      }
      {
        const deuda = M('deuda-sangre')!;
        check(deuda.purgar === 2, 'la Deuda de Sangre se puede saldar pagando 2 de energía');
        const { run, comb } = await montarM([], ['deuda-sangre']);
        const inst = [...comb.jugador.mazo, ...comb.jugador.descarte].find((c) => c.def.id === 'deuda-sangre')!;
        for (const pila of [comb.jugador.mazo, comb.jugador.descarte]) {
          const i = pila.indexOf(inst);
          if (i >= 0) pila.splice(i, 1);
        }
        comb.jugador.mano.push(inst);
        comb.jugador.energia = 1;
        check(!comb.puedeJugar(inst), 'sin 2 de energía no se puede saldar la Deuda');
        comb.jugador.energia = 3;
        const jugadas = comb.jugadasTurno;
        await comb.jugarCarta(inst);
        check(comb.jugador.energia === 1 && !comb.jugador.mano.includes(inst) && comb.jugadasTurno === jugadas,
          'saldar la Deuda cuesta 2 de energía y no cuenta como carta jugada');
        check(!run.mazo.some((c) => c.def.id === 'deuda-sangre'), 'la Deuda saldada desaparece del mazo para siempre');
      }

      // — End-of-turn effects: only while in hand —
      const finDeTurno = async (id: string, enMano: boolean, extra: string[] = []) => {
        const m = await montarM(enMano ? [id, ...extra] : extra);
        if (!enMano) m.comb.jugador.descarte.push(instanciar(CT.cartaPorId(id)));
        const pv = m.comb.jugador.pv;
        await m.comb.terminarTurno();
        return { ...m, perdido: pv - m.comb.jugador.pv };
      };
      {
        const a = await finDeTurno('herida-infectada', true);
        const b = await finDeTurno('herida-infectada', false);
        check(a.perdido === 2 && b.perdido === 0, 'Herida Infectada: pierdes 2 PV solo si está en tu mano');
      }
      {
        const a = await finDeTurno('duda', true);
        const b = await finDeTurno('duda', false);
        check(a.comb.jugador.estados.debil === 1 && !b.comb.jugador.estados.debil, 'Duda: 1 de Débil solo si está en tu mano');
      }
      {
        const a = await finDeTurno('marca-condenado', true);
        check(!a.comb.jugador.estados.vulnerable, 'Marca del Condenado: tenerla en la mano al acabar el turno ya no da Vulnerable');
        const marca = CT.cartaPorId('marca-condenado')!;
        check(/al robarla/i.test(marca.texto) && typeof marca.alRobar === 'function' && !marca.finTurnoEnMano,
          'Marca del Condenado da el Vulnerable al robarla');
      }
      {
        const a = await finDeTurno('maldicion-momia', true);
        const b = await finDeTurno('maldicion-momia', false);
        check(a.comb.jugador.estados.fragil === 1 && !b.comb.jugador.estados.fragil,
          'Maldición de la Momia: 1 de Frágil solo si está en tu mano');
      }
      {
        const a = await finDeTurno('deuda-sangre', true);
        const b = await finDeTurno('deuda-sangre', false);
        check(a.perdido === 3 && b.perdido === 0, 'Deuda de Sangre: pierdes 3 PV solo si está en tu mano');
      }
      {
        const a = await finDeTurno('remordimiento', true, ['golpe', 'golpe']);
        const b = await finDeTurno('remordimiento', false, ['golpe', 'golpe']);
        check(a.perdido === 3 && b.perdido === 0, 'Remordimiento: pierdes 1 PV por carta en la mano, solo si está en ella');
      }
      {
        const a = await finDeTurno('grilletes', true);
        check(a.perdido === 0 && Object.keys(a.comb.jugador.estados).length === 0, 'Grilletes: solo peso muerto');
      }
      {
        const a = await finDeTurno('codicia', true);
        check(a.comb.jugador.mano.includes(a.insts[0]), 'Codicia: no se descarta, se queda ocupando la mano');
      }
      {
        // effects fire before the discard: the curse is still counted in the hand
        const { comb } = await montarM(['duda']);
        await comb.terminarTurno();
        check(comb.jugador.descarte.some((c) => c.def.id === 'duda'), 'tras su efecto, la maldición se descarta con el resto de la mano');
      }
      // — On-draw effects —
      {
        const { comb, ctx } = await montarM(['golpe', 'golpe']);
        const desc = comb.jugador.descarte.length;
        comb.jugador.mazo.push(instanciar(M('pesadilla')!));
        await ctx.robar(1);
        check(idsEn(comb.jugador.mano).includes('pesadilla') && comb.jugador.mano.length === 2 && comb.jugador.descarte.length === desc + 1,
          'Pesadilla: al robarla descartas una carta al azar de tu mano');
      }
      {
        const { comb, ctx } = await montarM([]);
        comb.jugador.energia = 3;
        comb.jugador.mazo.push(instanciar(M('paralisis')!));
        await ctx.robar(1);
        check(comb.jugador.energia === 2, 'Parálisis: al robarla pierdes 1 de energía');
        comb.jugador.mazo.push(instanciar(M('paralisis')!));
        await comb.terminarTurno();
        check(comb.jugador.energia === comb.jugador.energiaMax - 1, 'Parálisis: robada al empezar el turno, empiezas con 1 de energía menos');
        comb.jugador.energia = 0;
        comb.jugador.mazo.push(instanciar(M('paralisis')!));
        await ctx.robar(1);
        check(comb.jugador.energia === 0, 'Parálisis nunca deja la energía en negativo');
      }
      {
        const { comb } = await (async () => {
          const run = nuevaRun('druida', 99);
          run.reliquias = [];
          run.mazo.push(instanciar(M('maldicion-momia')!));
          const comb = new Combate(run, [quieto], crearRng(99), uiSilenciosa);
          await comb.iniciar();
          return { comb };
        })();
        check(idsEn(comb.jugador.mano).includes('maldicion-momia') && comb.jugador.mano.length === 5,
          'Maldición de la Momia: es innata (empieza en la mano y cuenta para el robo)');
      }
      // — They never break a combat —
      {
        const run = nuevaRun('barbaro', 7);
        run.reliquias = [];
        for (const c of MALD) run.mazo.push(instanciar(c), instanciar(c));
        run.pv = 3;
        const comb = new Combate(run, [quieto], crearRng(7), uiSilenciosa);
        let error = '';
        try {
          await comb.iniciar();
          for (let t = 0; t < 15 && !comb.terminado; t++) {
            for (const c of [...comb.jugador.mano]) if (comb.puedeJugar(c)) await comb.jugarCarta(c, comb.enemigos[0]);
            await comb.terminarTurno();
          }
        } catch (e) {
          error = String(e);
        }
        check(!error && comb.jugador.vivo && comb.jugador.pv >= 1 && !comb.terminado,
          `un mazo lleno de maldiciones aguanta 15 turnos sin romper el combate ni matarte ${error}`);
        check(comb.jugador.mano.length <= 10, 'la mano nunca supera 10 cartas con maldiciones');
      }

      // — Never in card rewards nor in the class pools —
      {
        let fugas = 0;
        for (const clase of CLASES) {
          if (poolDeClase(clase).some((c) => c.tipo === 'maldicion')) fugas++;
          if (cartaUnicaDeClase(clase).tipo === 'maldicion') fugas++;
          const rng = crearRng(clase.length * 97);
          for (let i = 0; i < 300; i++) if (recompensaCartas(clase, rng, 50).some((c) => c.tipo === 'maldicion')) fugas++;
        }
        check(fugas === 0, 'las maldiciones nunca salen en las recompensas ni en el pool de clase');
      }

      // — They can be removed (campfire: purify) —
      {
        const run = nuevaRun('mago', 12);
        const maldita = instanciar(M('herida-infectada')!);
        run.mazo.push(maldita);
        check(typeof RUNM.maldicionesDe === 'function' && RUNM.maldicionesDe(run).length === 1, 'se listan las maldiciones del mazo');
        const golpe = run.mazo.find((c) => c.def.id === 'golpe')!;
        check(RUNM.purificar(run, golpe) === false && run.mazo.includes(golpe), 'purificar no quita cartas que no son maldiciones');
        check(RUNM.purificar(run, maldita) === true && !run.mazo.includes(maldita), 'purificar elimina la maldición del mazo');
        check(RUNM.maldicionesDe(run).length === 0, 'tras purificar ya no quedan maldiciones');
      }

      // — Events that now curse instead of costing PV —
      {
        const evento = (id: string) => [...EVENTOS_POSITIVOS, ...EVENTOS_NEGATIVOS].find((e) => e.id === id)!;
        const casos: Array<[string, string, string, () => number]> = [
          ['santuario', 'Saquear el altar', 'marca-condenado', () => 0.5],
          ['buhonero', 'Pagar con sangre', 'deuda-sangre', () => 0.5],
          ['niebla', 'Cruzar despacio', 'pesadilla', () => 0.5],
          ['espiritu', 'Ofrecerle tu esencia', 'remordimiento', () => 0.5],
          ['cofre-extrano', 'Abrirlo', 'herida-infectada', () => 0.9],
        ];
        for (const [ev, etiqueta, maldicion, rng] of casos) {
          const op = evento(ev)?.opciones.find((o) => o.etiqueta === etiqueta);
          if (!op) { check(false, `existe ${ev}/${etiqueta}`); continue; }
          const run = nuevaRun('picaro', 21);
          run.pv = run.pvMax - 20;
          const pv = run.pv;
          const max = run.pvMax;
          const texto = op.aplicar(run, rng);
          check(run.mazo.some((c) => c.def.id === maldicion) && run.pv >= pv && run.pvMax >= max
            && op.detalle.includes(M(maldicion)!.nombre) && texto.includes(M(maldicion)!.nombre),
          `${ev}/${etiqueta}: «${M(maldicion)!.nombre}» entra en tu mazo en vez de perder PV`);
        }
        const foso = evento('foso').opciones.find((o) => o.etiqueta === 'Soltar peso')!;
        let quitadas = 0;
        for (let s = 0; s < 30; s++) {
          const run = nuevaRun('druida', s);
          run.mazo.push(instanciar(M('grilletes')!));
          foso.aplicar(run, crearRng(s));
          if (!run.mazo.some((c) => c.def.id === 'grilletes')) quitadas++;
        }
        check(quitadas === 0, 'perder una carta al azar en un evento nunca te libra de una maldición');
      }

      // — Relics with a drawback that now curse —
      {
        const run = nuevaRun('barbaro', 30);
        const max = run.pvMax;
        RQM.otorgarReliquia(run, RQM.reliquiaPorId('pacto-codicia'), crearRng(30));
        check(run.mazo.some((c) => c.def.id === 'codicia') && run.pvMax >= max,
          'Pacto de la Codicia: la Codicia entra en tu mazo en vez de perder 12 PV máximos');
        check(/Codicia/.test(RQM.reliquiaPorId('pacto-codicia').texto) && !/PV máximos/.test(RQM.reliquiaPorId('pacto-codicia').texto),
          'el texto del Pacto de la Codicia anuncia la maldición');
      }
      {
        const run = nuevaRun('druida', 777);
        run.reliquias = [RQM.reliquiaPorId('baraja-maravillas')];
        const comb = new Combate(run, [quieto], () => 0, uiSilenciosa);
        await comb.iniciar();
        check(idsEn(comb.jugador.mano).includes('duda') && comb.jugador.pv === comb.jugador.pvMax
          && !run.mazo.some((c) => c.def.id === 'duda'),
        'Baraja de las Maravillas: la Calavera mete una Duda en tu mano (solo este combate) en vez de quitar PV');
      }

      // — Enemies that curse you —
      {
        const casos: Array<[EnemigoDef, number, string]> = [
          [ENEMIGOS.MOMIA_REAL, 0, 'maldicion-momia'],
          [ENEMIGOS.ACOLITO_VELADO, 1, 'duda'],
          [ENEMIGOS.HERALDO_CULTO, 1, 'marca-condenado'],
        ];
        for (const [def, turno, maldicion] of casos) {
          const mov: any = def.ia(turno, () => 0, {} as EnemigoCombate, []);
          check(mov.maldicion?.id === maldicion, `${def.nombre}: «${mov.nombre}» te mete «${M(maldicion)!.nombre}»`);
          const { run, comb, ctx } = await montarM([], [], def);
          const e = comb.enemigos[0];
          e.intencion = mov;
          const antes = [...comb.jugador.mazo, ...comb.jugador.descarte, ...comb.jugador.mano].length;
          await ctx.forzarAccion(e);
          const todas = [...comb.jugador.mazo, ...comb.jugador.descarte, ...comb.jugador.mano];
          check(todas.length === antes + 1 && todas.some((c) => c.def.id === maldicion) && !run.mazo.some((c) => c.def.id === maldicion),
            `${def.nombre}: la maldición entra en tus pilas solo durante este combate`);
        }
      }

      // — Saving —
      {
        const run = nuevaRun('brujo', 5);
        for (const c of MALD) run.mazo.push(instanciar(c));
        const rest = rehidratarRun(JSON.parse(JSON.stringify(serializarRun(run))));
        check(!!rest && rest.mazo.length === run.mazo.length
          && rest.mazo.filter((c) => c.def.tipo === 'maldicion').map((c) => c.def.id).join() === MALD.map((c) => c.id).join()
          && rest.mazo.every((c) => typeof c.def.jugar === 'function'),
        'las maldiciones del mazo se guardan y se rehidratan');
      }

      // — Hand-drawn art —
      {
        const malas = MALD.filter((c) => {
          const f = new URL(`../src/arte/cartas/${c.id}.svg`, import.meta.url);
          if (!fs.existsSync(f)) return true;
          const xml = fs.readFileSync(f, 'utf8');
          return !xml.trimStart().startsWith('<svg') || !xml.includes('viewBox="0 0 280 160"');
        }).map((c) => c.id);
        check(malas.length === 0, `cada maldición tiene su ilustración SVG 280×160 ${malas.join(', ')}`);
      }
    } catch (e) {
      check(false, `las pruebas de maldiciones revientan: ${(e as Error).stack ?? e}`);
    }
  }
}

// ── Escena final: el Dungeon Master ──────────────────────────────────────────
console.log('\n🎲 Escena final: el Dungeon Master');
{
  try {
    const DM = (ENEMIGOS as unknown as Record<string, EnemigoDef | undefined>).DUNGEON_MASTER;
    check(!!DM && DM.dungeonMaster === true, 'existe el Dungeon Master con su rasgo propio');
    const { desenlaceCampana, FRASES_DM } = await import('../src/core/escena-final.ts');
    const { reliquiaPorId } = await import('../src/core/reliquias.ts');
    const pz = await import('../src/fx/puppet.ts');
    const { SPELLS, spellFrame, MAX_SPELL_SPRITES } = await import('../src/fx/spell-fx.ts');
    const pgpu = await import('../src/fx/puppet-gpu.ts');

    /** A fresh DM scene with a mid-run hero (some relics and a decent deck). */
    const escena = async (clase: ClaseId, semilla: number, reliquias: string[] = []) => {
      const run = nuevaRun(clase, semilla);
      for (const id of reliquias) run.reliquias.push(reliquiaPorId(id)!);
      const c = new Combate(run, [DM!], crearRng(semilla), uiSilenciosa, true);
      await c.iniciar();
      return { run, c, dm: c.enemigos[0] };
    };

    // — The screen blocks everything —
    {
      const { c, dm } = await escena('barbaro', 501);
      const pv0 = dm.pv;
      const ctx = c.contexto(dm);
      await ctx.atacar(dm, 60, 4);
      await ctx.atacarTodos(80);
      await ctx.danar(dm, 999);
      await ctx.danarPerforante(dm, 999);
      dm.estados.veneno = 40;
      await c.tickVeneno(dm);
      dm.estados.vulnerable = 5;
      await ctx.atacar(dm, 100);
      check(dm.pv === pv0 && dm.vivo, `ningún golpe baja su vida (${dm.pv}/${pv0})`);
      await ctx.matar(dm);
      check(dm.vivo && dm.pv === pv0, 'las muertes instantáneas (Talismán Vorpal, Deseo, Seducir) no le afectan');
      check(!c.terminado, 'el combate sigue: no se le puede ganar');
      // relics that deal direct damage
      await reliquiaPorId('tambor-guerra')!.alJugarCarta!(c.contexto(), { carta: c.jugador.mano[0], jugadasTurno: 3, jugadasCombate: 3 } as never);
      await reliquiaPorId('cuerno-valhalla')!.inicioTurno!(c.contexto(), 3);
      check(dm.pv === pv0 && dm.vivo, 'las reliquias de daño tampoco le hacen nada');
      // lethal Doom is ignored; he gives one harmless turn, then his ray fires
      dm.estados.condena = 99999;
      check(!c.condenaLetal(dm), 'la Condena nunca es letal contra él');
      await c.terminarTurno();
      check(dm.vivo && dm.pv === pv0, 'la Condena letal no lo consume al acabar su turno');
      check(!c.terminado && c.jugador.vivo, 'su primer turno es inofensivo: consulta sus notas');
      check(dm.intencion.mataAlInstante === true, 'y entonces anuncia el rayo');
      await c.terminarTurno();
      check(c.terminado === 'derrota' && !c.jugador.vivo && c.jugador.pv === 0, 'su rayo fulmina al héroe al final del segundo turno');
    }

    // — His intent is announced (with a joke) from the start —
    {
      const { c, dm } = await escena('mago', 502);
      check(!dm.intencion.mataAlInstante && dm.intencion.dano === undefined && !!dm.intencion.cita, 'abre consultando sus notas, con su chiste en la intención');
      await c.terminarTurno();
      check(dm.intencion.mataAlInstante === true, 'su segunda intención es el Rayo del Dungeon Master (muerte instantánea)');
      check(/Rayo del Dungeon Master/.test(dm.intencion.nombre) && /iniciativa/.test(dm.intencion.cita ?? ''), `la intención se llama «${dm.intencion.nombre}» · ${dm.intencion.cita}`);
    }

    // — The ray ignores block, mirror images, invulnerability, summons and saving relics —
    {
      const { c, dm } = await escena('druida', 503, ['manto-espectral', 'anillo-proteccion']);
      c.jugador.bloqueo = 9999;
      c.jugador.estados.espejismo = 9;
      c.jugador.estados.invulnerable = 5;
      c.jugador.estados.espinas = 50;
      await c.invocar('oso', 500);
      await c.terminarTurno();
      c.jugador.bloqueo = 9999;
      c.jugador.estados.invulnerable = 5;
      dm.saltaAccion = true; // Seduce / Wish cannot make him skip it
      dm.estados.raices = 999;
      dm.estados.oscuridad = 999;
      dm.estados.debil = 9;
      await c.terminarTurno();
      check(c.jugador.pv === 0 && !c.jugador.vivo, 'el rayo mata aunque tengas bloqueo, espejismo, invulnerabilidad e invocación');
      check(c.terminado === 'derrota' && c.turno === 2, 'llega al terminar tu segundo turno');
      check(dm.vivo, 'y el Dungeon Master sigue tan tranquilo');
    }
    for (const clase of CLASES) {
      const { c } = await escena(clase, 510 + CLASES.indexOf(clase), ['manto-espectral']);
      await c.terminarTurno();
      await c.terminarTurno();
      check(c.terminado === 'derrota', `${clase}: el rayo lo fulmina`);
    }

    // — Afterwards the run counts as a victory —
    {
      const tras = desenlaceCampana(true, 'derrota');
      check(tras.victoria && tras.epilogoDM && tras.borrarGuardado, 'tras el rayo del DM la partida es una victoria con epílogo');
      check(!tras.finalVerdadero, 'el rayo no abre el final verdadero');
      const seducido = desenlaceCampana(true, 'victoria');
      check(seducido.victoria && seducido.finalVerdadero && !seducido.epilogoDM && seducido.borrarGuardado, 'vencer al DM (solo seduciéndolo) es victoria con final verdadero');
      const muerto = desenlaceCampana(false, null);
      check(!muerto.victoria && !muerto.epilogoDM && muerto.borrarGuardado, 'morir antes sigue siendo una derrota sin epílogo del DM');
      check(!!FRASES_DM.inicio && !!FRASES_DM.bloqueo && !!FRASES_DM.rayo, 'el DM tiene frases para empezar, bloquear y lanzar el rayo');
    }

    // — The secret: a natural 20 on Seduce gets past the screen (true ending) —
    {
      const ef = await import('../src/core/escena-final.ts');
      const fs = await import('node:fs');
      const seducir = NEUTRALES_ESPECIALES.find((d) => d.id === 'seducir')!;
      const deseo = NEUTRALES_ESPECIALES.find((d) => d.id === 'deseo')!;
      /** Plays `def` on the DM with the d20 forced to land on `tirada`. */
      const lanzar = async (def: CartaDef, tirada: number, mejorada = false, semilla = 520) => {
        const { c, dm } = await escena('picaro', semilla);
        const inst = instanciar(def);
        inst.mejorada = mejorada;
        c.jugador.mano.push(inst);
        c.jugador.energia = 5;
        c.rng = () => (tirada - 1 + 0.5) / 20;
        await c.jugarCarta(inst, dm);
        return { c, dm };
      };
      {
        const { c, dm } = await lanzar(seducir, 20);
        check(c.terminado === 'victoria' && c.finalVerdadero && c.jugador.vivo, 'un 20 natural en Seducir derrota al DM y abre el final verdadero');
        check(!dm.vivo, 'el DM queda seducido (sale del combate sin lanzar el rayo)');
      }
      {
        const { c } = await lanzar(seducir, 20, true);
        check(c.terminado === 'victoria' && c.finalVerdadero, 'Seducir+ (con ventaja) también vale si sale el 20');
      }
      for (const t of [1, 5, 11, 15, 19]) {
        const { c, dm } = await lanzar(seducir, t, false, 530 + t);
        check(!c.terminado && dm.vivo && dm.pv === dm.pvMax && !c.finalVerdadero, `con un ${t} en Seducir la pantalla lo bloquea`);
        await c.terminarTurno();
        await c.terminarTurno();
        check(c.terminado === 'derrota' && !c.finalVerdadero, `con un ${t}, el rayo llega igual`);
      }
      {
        const { c, dm } = await lanzar(deseo, 20);
        check(!c.terminado && dm.vivo && !c.finalVerdadero, 'un 20 en Deseo no sirve: solo la seducción funciona');
      }
      // if Seduce is in the deck, the scene makes sure it is in the opening hand
      for (const clase of CLASES) {
        for (let s = 0; s < 4; s++) {
          const run = nuevaRun(clase, 600 + s);
          run.mazo.unshift(instanciar(seducir)); // bottom of the deck
          for (let i = 0; i < 8; i++) run.mazo.unshift(instanciar(BASICAS[0]));
          const c = new Combate(run, [DM!], crearRng(600 + s), uiSilenciosa, true);
          await c.iniciar();
          check(c.jugador.mano.some((x) => x.def.id === 'seducir'), `${clase} (semilla ${600 + s}): Seducir llega a la mano contra el DM`);
        }
      }
      // the unlock is remembered (and a broken storage never throws)
      const datos: Record<string, string> = {};
      const almacen = { getItem: (k: string) => datos[k] ?? null, setItem: (k: string, v: string) => { datos[k] = v; } };
      check(!ef.finalVerdaderoDesbloqueado(almacen), 'al principio el final verdadero está bloqueado');
      ef.marcarFinalVerdadero(almacen);
      check(ef.finalVerdaderoDesbloqueado(almacen), 'tras verlo, queda guardado como desbloqueado');
      const roto = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
      let lanza = false;
      try { ef.marcarFinalVerdadero(roto); lanza = ef.finalVerdaderoDesbloqueado(roto); } catch { lanza = true; }
      check(!lanza, 'sin almacenamiento disponible no revienta');
      check(ef.finalVerdaderoDesbloqueado(null) === false, 'ni aunque no haya localStorage');
      // the scheduling scene: every hero has an excuse, and in the end there is a date
      const quienes = new Set(ef.GUION_AGENDA.map((l) => l.quien));
      check(CLASES.every((k) => quienes.has(k)) && quienes.has('dm'), 'en el final verdadero hablan el DM y los 5 héroes');
      check(/sábado a las 17:00/i.test(ef.GUION_AGENDA[ef.GUION_AGENDA.length - 1].texto), 'y acaban cuadrando una fecha');
      const titulo = fs.readFileSync(new URL('../src/ui/titulo.ts', import.meta.url), 'utf8');
      check(titulo.includes('finalVerdaderoDesbloqueado'), 'el menú principal muestra si el final verdadero está desbloqueado');
      const fv = fs.readFileSync(new URL('../src/ui/final-verdadero.ts', import.meta.url), 'utf8');
      check(fv.includes('HeroSprite') && fv.includes('marcarFinalVerdadero'), 'la escena del final verdadero reúne a los héroes y guarda el desbloqueo');
    }

    // — Puppet: DM screen (illustrated) with a backlit hooded figure behind —
    {
      const rig = ENEMY_RIGS['dungeon-master'];
      check(!!rig && rig.shapes.length >= 30, `el Dungeon Master tiene marioneta propia (${rig?.shapes.length ?? 0} piezas)`);
      check(!!rig?.backlit?.length && rig.shapes.some((s) => rig.backlit!.includes(s.k)), 'el encapuchado se pinta a contraluz');
      check(rig.shapes.some((s) => s.k === 'eyeGlow'), 'y le brillan los ojos');
      const pk = pgpu.packRig(rig, 'illustrated');
      const iRobe = rig.shapes.findIndex((s) => rig.backlit!.includes(s.k));
      check((pk.data[(iRobe * pgpu.PIECE_TEXELS) * 4 + 2] & pgpu.FLAG.backlit) !== 0, 'las piezas a contraluz van marcadas para la GPU');
      const reposo = (t: number) => pz.puppetPose(rig, t, null).p;
      check(Math.abs(reposo(0).wingFF1 - reposo(0.12).wingFF1) + Math.abs(reposo(0).wingBF2 - reposo(0.12).wingBF2) > 1, 'en reposo los dedos tamborilean');
      check(Math.abs(reposo(0).torsoY - reposo(1.2).torsoY) > 0.3, 'y la capucha respira');
      check([...Array(60)].some((_, i) => pz.puppetPose(rig, i * 0.07, null).fx.blink), 'y los ojos parpadean');
      const manos = (a: Parameters<typeof pz.puppetPose>[2]) => {
        const b = pz.puppetBones(rig, pz.puppetPose(rig, 0, a).p);
        const f = pz.applyMatrix(b.armF, 72, 60), k = pz.applyMatrix(b.armB, 56, 60);
        return Math.hypot(f[0] - k[0], f[1] - k[1]);
      };
      check(manos({ type: 'attack', p: 0.6 }) > manos(null) + 15, 'al atacar las manos se separan');
      check(manos({ type: 'spell', p: 0.55 }) > manos(null) + 15, 'y al lanzar un hechizo también');
      const ids = galleryCatalogue().flatMap((s) => s.cards).filter((f) => f.kind === 'enemy').map((f) => f.id);
      check(ids.includes('dungeon-master'), 'el Dungeon Master sale en la galería');
    }

    // — His own ray effect —
    {
      const d = SPELLS.rayoDM;
      check(!!d && d.duration >= 0.4 && d.duration <= 1.4, 'el Rayo del Dungeon Master tiene su propio efecto');
      check(!!d && d.build !== SPELLS.rayoOcular.build, 'distinto del rayo del Contemplador');
      const ctx = { box: { x: 100, y: 200, w: 120, h: 160 }, from: { x: 700, y: 180 }, facing: 1 as const, seed: 3 };
      let maximo = 0, rotos = 0;
      for (let t = 0; d && t <= d.duration; t += 1 / 30) {
        const fr = spellFrame('rayoDM', ctx, t);
        maximo = Math.max(maximo, fr.length);
        for (const s of fr) if (![s.x, s.y, s.size, s.alpha ?? 1].every(Number.isFinite) || s.size <= 0) rotos++;
      }
      check(maximo > 0 && maximo <= MAX_SPELL_SPRITES && rotos === 0, `el rayo se dibuja bien (${maximo} elementos, ${rotos} rotos)`);
      const mitad = spellFrame('rayoDM', ctx, (d?.duration ?? 1) * 0.5);
      check(mitad.some((s) => s.x > 500) && mitad.some((s) => s.x < 250), 'cruza la pantalla desde las manos del DM hasta el héroe');
    }
  } catch (e) {
    check(false, `las pruebas del Dungeon Master revientan: ${(e as Error).stack ?? e}`);
  }
}

// ── Settings menu (top right): sound, volume and performance ────────────────
console.log('\n⚙️ Menú de ajustes');
{
  const fs = await import('node:fs');
  const A = await import('../src/core/ajustes.ts').catch(() => null);
  check(!!A, 'existe el módulo de ajustes (core/ajustes.ts)');
  if (A) {
    const mem = (datos: Record<string, string> = {}) => ({
      getItem: (k: string) => (k in datos ? datos[k] : null), setItem: (k: string, v: string) => { datos[k] = v; }, datos,
    });
    const d = A.leerAjustes(mem());
    check(d.musica && d.sonidos && d.volumenMusica === 1 && d.volumenSonidos === 1 && !d.reducirParticulas && !d.resolucionBaja && d.sacudidas && !d.mostrarFps,
      'por defecto: música y sonidos encendidos a tope, sin recortes de rendimiento y con sacudidas');
    check(A.leerAjustes(mem({ 'mazmorra-musica-apagada': '1' })).musica === false, 'respeta la música apagada con el botón antiguo');
    const m = mem();
    A.guardarAjustes(m, { ...d, sonidos: false, volumenMusica: 0.35, reducirParticulas: true });
    const r = A.leerAjustes(m);
    check(!r.sonidos && r.volumenMusica === 0.35 && r.reducirParticulas && r.musica, 'los ajustes se guardan y se recuperan');
    check(A.leerAjustes(mem({ 'mazmorra-ajustes': '{"volumenSonidos": 7}' })).volumenSonidos === 1, 'los volúmenes se acotan entre 0 y 1');
    check(A.leerAjustes(mem({ 'mazmorra-ajustes': 'basura' })).musica === true, 'unos ajustes corruptos vuelven a los de por defecto');
    check(A.gananciaMusica({ ...d, volumenMusica: 0.5 }) === 0.25 && A.gananciaMusica({ ...d, musica: false }) === 0,
      'la ganancia de la música sigue a su interruptor y a su volumen');
    check(A.gananciaSfx({ ...d, volumenSonidos: 0.5 }) === 0.45 && A.gananciaSfx({ ...d, sonidos: false }) === 0,
      'la de los efectos, a los suyos (la música no la toca)');
  }
  const src = (f: string) => fs.readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
  check(!/crearBoton\(/.test(src('main.ts')) && !/boton-audio/.test(src('fx/audio.ts')), 'ya no hay botón flotante de música abajo a la derecha');
  check(/abrirMenuAjustes|crearMenuAjustes/.test(src('main.ts')), 'el menú de ajustes se monta al arrancar');
  const menu = fs.existsSync(new URL('../src/ui/menu-ajustes.ts', import.meta.url)) ? src('ui/menu-ajustes.ts') : '';
  for (const k of ['musica', 'sonidos', 'volumenMusica', 'volumenSonidos', 'reducirParticulas', 'resolucionBaja', 'sacudidas', 'mostrarFps']) {
    check(menu.includes(`'${k}'`), `el menú de ajustes controla «${k}»`);
  }
  check(/ajustes\(\)\.sacudidas/.test(src('ui/util.ts')), 'las sacudidas de pantalla se pueden desactivar');
  check(/menosParticulas\(\)/.test(src('fx/particulas.ts')), 'el motor de efectos reduce partículas si se pide');
  check(/resolucionBaja/.test(src('ui/puppet-stage.ts')) && /resolucionBaja/.test(src('fx/particulas.ts')), 'la resolución reducida baja el detalle de los lienzos');
  const css = src('estilos/pantallas.css');
  const regla = css.slice(css.indexOf('.seleccion-clase {'), css.indexOf('}', css.indexOf('.seleccion-clase {')));
  check(/grid-template-columns:\s*repeat\(3,/.test(regla), 'las seis clases se reparten en filas iguales de tres');

  // Main-menu shortcuts inside the settings panel
  const titulo = src('ui/titulo.ts');
  check(/export function registrarAccesosMenuPrincipal/.test(menu), 'el menú de ajustes admite accesos del menú principal');
  check(/registrarAccesosMenuPrincipal\(\{/.test(titulo) && /registrarAccesosMenuPrincipal\(null\)/.test(titulo),
    'el título registra sus accesos al montarse y los retira al salir');
  check(!/pantallaCompendio|showGallery/.test(menu) && menu.includes('Compendio de cartas') && menu.includes('Galería de sprites'),
    'compendio y galería salen en ajustes solo a través del menú principal');
  check(/avisosDisponibles\(\)/.test(menu) && /cambiarAvisos\(/.test(menu) && /avisosActivados\(\)/.test(menu),
    'el menú de ajustes activa y desactiva los avisos de nuevas versiones');

  // Main menu: only the classes and «Continue», the rest lives in the settings panel
  check(!/btn-compendio|btn-galeria|btn-avisos/.test(titulo), 'el menú principal ya no lleva compendio, galería ni avisos (están en ajustes)');
  check(titulo.includes('btn-continuar') && titulo.indexOf('btn-continuar') < titulo.indexOf('class="seleccion-clase"'),
    'continuar partida guardada sale arriba, antes de las clases');
  check(/confirmarNuevaPartida\(/.test(titulo) && /puedeContinuar/.test(titulo.slice(titulo.indexOf('const activar'))),
    'empezar partida con una guardada pide confirmación antes de borrarla');
  const principal = src('main.ts');
  check(/run = nuevaRun\(eleccion\.clase\)/.test(principal) && /borrarGuardado\(\);\s*\/\/[^\n]*\n\s*run = nuevaRun\(eleccion\.clase\)/.test(principal),
    'al confirmar una partida nueva, la guardada se borra en el acto');
}

// ── Ink-drawn campaign map (src/arte/mapa/iconos) ────────────────────────────
console.log('\n🗺️ Mapa de aventura a tinta');
try {
  const fs = await import('node:fs');
  const { mapIconFor, bossIconFor, pickMapIcon, MAP_EXTRA_ICONS } = await import('../src/ui/map-icons.ts');
  const dir = new URL('../src/arte/mapa/iconos/', import.meta.url);
  const files: string[] = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f: string) => f.endsWith('.svg')) : [];
  const has = (name: string) => files.includes(`${name}.svg`);
  // node types read from the TipoNodo union itself, so a new type cannot slip through
  const typesSrc = fs.readFileSync(new URL('../src/core/types.ts', import.meta.url), 'utf8');
  const nodeTypes = [...(/export type TipoNodo\s*=([^;]+);/.exec(typesSrc)?.[1] ?? '').matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
  check(nodeTypes.length >= 7, `se leen los tipos de nodo (${nodeTypes.join(', ')})`);
  const missing: string[] = [];
  for (const tipo of nodeTypes) for (let c = 0; c < ACTOS.length; c++) for (let e = 0; e < ACTOS[c].length; e++) {
    const name = mapIconFor(tipo as never, c, e);
    if (!has(name)) missing.push(`${tipo}@${c}.${e}→${name}`);
  }
  check(missing.length === 0, `cada tipo de nodo tiene icono a tinta en cada acto y escenario ${missing.slice(0, 6).join(', ')}`);
  check(nodeTypes.filter((t) => t !== 'jefe').every((t) => has(t)), 'cada tipo de nodo (salvo el jefe) tiene su icono genérico de respaldo');
  const bosses = ACTOS.flatMap((acto, c) => acto.map((esc, e) => ({ c, e, id: esc.jefe[0].id, icon: mapIconFor('jefe', c, e) })));
  check(bosses.length === 6 && new Set(bosses.map((b) => b.icon)).size === bosses.length, `un jefe dibujado distinto por escenario (${bosses.map((b) => b.icon).join(', ')})`);
  check(bosses.every((b) => b.icon === bossIconFor(b.id) && has(b.icon)), 'el icono del jefe sale del jefe del escenario');
  check(bossIconFor('jefe-ogro') === 'jefe-ogro' && bossIconFor('ignifax') === 'jefe-ignifax', 'el nombre del icono del jefe es jefe-<id> sin repetir «jefe»');
  check(['mision', 'heroe'].every((n) => MAP_EXTRA_ICONS.includes(n) && has(n)), 'están el marcador de misión y la chincheta del héroe');
  // — every scenario draws its own locations, not only its boss —
  const MI: any = await import('../src/ui/map-icons.ts');
  const scenarioKeys: string[][] = MI.MAP_SCENARIOS ?? [];
  check(scenarioKeys.length === ACTOS.length && scenarioKeys.every((k, c) => k.length === ACTOS[c].length && k.every(Boolean)),
    `cada escenario de cada acto tiene clave de mapa (${scenarioKeys.flat().join(', ')})`);
  const themed = ['combate', 'elite', 'evento', 'descanso', 'cofre', 'taberna'];
  const read = (name: string) => (has(name) ? fs.readFileSync(new URL(`${name}.svg`, dir), 'utf8') : `missing:${name}`);
  const notOwn: string[] = [];
  const clashes: string[] = [];
  for (let c = 0; c < ACTOS.length; c++) for (let e = 0; e < ACTOS[c].length; e++) {
    const key = scenarioKeys[c]?.[e];
    const names = themed.map((t) => mapIconFor(t as never, c, e));
    names.forEach((n, i) => { if (n !== `${themed[i]}-${key}` || !has(n)) notOwn.push(`${themed[i]}@${key}→${n}`); });
    if (new Set(names.map(read)).size !== names.length) clashes.push(`dentro de ${key}`);
  }
  check(notOwn.length === 0, `cada escenario tiene icono propio de combate, élite, evento, descanso, cofre y taberna ${notOwn.slice(0, 6).join(', ')}`);
  for (const t of themed) {
    const all = ACTOS.flatMap((acto, c) => acto.map((_, e) => mapIconFor(t as never, c, e)));
    if (new Set(all).size !== all.length || new Set(all.map(read)).size !== all.length) clashes.push(t);
  }
  check(clashes.length === 0, `los iconos temáticos son distintos entre escenarios y dentro de cada uno ${clashes.join(', ')}`);
  const only = (...names: string[]) => (n: string) => names.includes(n);
  check(mapIconFor('combate', 0, 1) === 'combate-contrabandistas' && mapIconFor('taberna', 2, 1) === 'taberna-contemplador',
    'mapIconFor elige el icono del escenario');
  check(mapIconFor('combate', 1, 1, only('combate-acto2', 'combate')) === 'combate-acto2' && mapIconFor('combate', 1, 1, only('combate')) === 'combate',
    'si falta el del escenario, el combate cae al del acto y después al genérico');
  check(mapIconFor('evento', 1, 0, only('evento')) === 'evento' && mapIconFor('cofre', 2, 0, () => false) === 'cofre',
    'los demás tipos caen al genérico (y el genérico es el último recurso)');
  check(mapIconFor('combate', 1, 5) === 'combate-acto2' && mapIconFor('elite', 1, 5) === 'elite',
    'un escenario desconocido usa el icono del acto o el genérico');
  check(mapIconFor('combate', 7, 0) === 'combate' && mapIconFor('jefe', 7, 0) === 'jefe' && mapIconFor('elite', 7, 0) === 'elite',
    'fuera de los actos conocidos se usa el icono genérico');
  // — every scenario points to its own painted parchment, falling back to the act's —
  const bgNames = ACTOS.flatMap((acto, c) => acto.map((_, e) => MI.mapBackgroundName?.(c, e)));
  check(bgNames.length === 6 && new Set(bgNames).size === 6 && ACTOS.every((_, c) => MI.mapBackgroundName?.(c, 0) === `mapa-acto${c + 1}`),
    `cada escenario apunta a su fondo propio; el escenario 0 conserva el del acto (${bgNames.join(', ')})`);
  check(['mapa-contrabandistas', 'mapa-templo', 'mapa-contemplador'].every((n, c) => MI.mapBackgroundName?.(c, 1) === n),
    'los escenarios 1 usan mapa-contrabandistas, mapa-templo y mapa-contemplador');
  const bgTable = {
    '../arte/mapa/mapa-acto2.webp': '/a2.webp', '../arte/mapa/mapa-acto2-ancho.webp': '/a2w.webp',
    '../arte/mapa/mapa-contrabandistas.webp': '/c.webp', '../arte/mapa/mapa-contrabandistas-ancho.webp': '/cw.webp',
  };
  const bgA = MI.pickMapBackground?.(bgTable, 0, 1);
  const bgB = MI.pickMapBackground?.(bgTable, 1, 1);
  check(bgA?.tall === '/c.webp' && bgA?.wide === '/cw.webp', 'el mapa usa el fondo pintado de su escenario');
  check(bgB?.tall === '/a2.webp' && bgB?.wide === '/a2w.webp', 'si el fondo del escenario aún no existe, usa el del acto');
  const mapUi = fs.readFileSync(new URL('../src/ui/mapa.ts', import.meta.url), 'utf8');
  check(/mapBackground\(run\.capitulo,\s*run\.escenario\)/.test(mapUi) && /mapa-escenario-/.test(mapUi),
    'la pantalla del mapa pide el fondo del escenario y marca su clase para teñir el pergamino');
  const mainSrc = fs.readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  check(/pantallaMapa\(run,[^)]*cap\.nombre/.test(mainSrc), 'el título del mapa lleva el nombre del escenario');
  const table = { '../arte/mapa/iconos/cofre.svg': '/a/cofre.svg' };
  check(pickMapIcon(table, 'cofre') === '/a/cofre.svg' && pickMapIcon(table, 'evento') === null, 'el icono se busca por nombre en la tabla de Vite');
  const bad: string[] = [];
  for (const f of files) {
    const xml = fs.readFileSync(new URL(f, dir), 'utf8');
    const big = f.startsWith('jefe');
    const viewBoxOk = xml.includes('viewBox="0 0 64 64"') || (big && xml.includes('viewBox="0 0 128 128"'));
    const stack: string[] = [];
    let nested = true;
    for (const m of xml.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<(\/?)([a-zA-Z][\w:-]*)[^>]*?(\/?)>/g)) {
      const [, closing, tag, selfClosing] = m;
      if (selfClosing) continue;
      if (closing) { if (stack.pop() !== tag) nested = false; } else stack.push(tag);
    }
    if (!xml.trimStart().startsWith('<svg') || !viewBoxOk) bad.push(`${f}: formato`);
    else if (/<(text|image|script)\b/.test(xml)) bad.push(`${f}: elemento prohibido`);
    else if (xml.length > 8 * 1024) bad.push(`${f}: ${Math.round(xml.length / 1024)} KB`);
    else if (!nested || stack.length > 0) bad.push(`${f}: XML mal formado`);
  }
  check(files.length > 0 && bad.length === 0, `${files.length} iconos del mapa con viewBox 64 (jefes 128), sin elementos prohibidos, ≤ 8 KB y bien formados ${bad.slice(0, 5).join(', ')}`);
  const mapSrc = fs.readFileSync(new URL('../src/ui/mapa.ts', import.meta.url), 'utf8');
  check(!/⚔️|💀|🏕️|🧰|❓|👹|🍺|📜/.test(mapSrc), 'el mapa ya no pinta los nodos con emojis');
  check(/mapIconFor\(/.test(mapSrc) && /aria-label/.test(mapSrc) && /data-tip|dataset\.tip/.test(mapSrc), 'los nodos usan el icono a tinta, con aria-label y tooltip');
  const mapCss = fs.readFileSync(new URL('../src/estilos/pantallas.css', import.meta.url), 'utf8').split('/* ── Mapa')[1]?.split('/* ── Paneles')[0] ?? '';
  const frames = [...mapCss.matchAll(/@keyframes[^{]*\{(?:[^{}]*\{[^}]*\})*/g)].map((m) => m[0]);
  check(mapCss.length > 0 && frames.length > 0 && frames.every((k) => !/filter|box-shadow/.test(k)), 'las animaciones del mapa solo tocan transform y opacity');
} catch (e) {
  check(false, `las pruebas del mapa a tinta revientan: ${(e as Error).stack ?? e}`);
}

// ── Warlock: stronger Eldritch Blast and a pact with the curses ──────────────
console.log('\n💥 Brujo: Explosión reforzada y pacto con las maldiciones');
try {
  const RQB: any = await import('../src/core/reliquias.ts');
  const CTB: any = await import('../src/core/cartas.ts');
  const quietoB: EnemigoDef = {
    id: 'muneco-brujo', nombre: 'Muñeco', arte: '🎯', pv: [300, 300],
    ia: () => ({ nombre: 'Esperar', intencion: 'desconocido' }),
  };
  const munecoB = (pv = 300, dano?: number): EnemigoDef => ({
    ...quietoB, pv: [pv, pv],
    ia: () => (dano ? { nombre: 'Golpe', intencion: 'ataque', dano } : { nombre: 'Esperar', intencion: 'desconocido' }),
  });
  const cartaB = (id: string): CartaDef => {
    const c = CTB.cartaPorId(id);
    if (!c) throw new Error(`falta la carta «${id}»`);
    return c;
  };
  const reliquiaB = (id: string) => {
    const r = RQB.reliquiaPorId(id);
    if (!r) throw new Error(`falta la reliquia «${id}»`);
    return r;
  };
  /** Warlock fight against dummies, with the chosen relics and an empty hand. */
  async function montarB(reliquias: string[] = [], defs: EnemigoDef[] = [quietoB]) {
    const run = nuevaRun('brujo', 6060);
    run.reliquias = reliquias.map(reliquiaB);
    const comb = new Combate(run, defs, crearRng(6060), uiSilenciosa);
    await comb.iniciar();
    comb.jugador.descarte.push(...comb.jugador.mano);
    comb.jugador.mano = [];
    return { run, comb };
  }
  const aMano = (comb: Combate, id: string, mejorada = false) => {
    const inst = instanciar(cartaB(id));
    inst.mejorada = mejorada;
    comb.jugador.mano.push(inst);
    return inst;
  };
  /** Plays a card from the hand with energy to spare; returns the damage `obj` took. */
  const lanzar = async (comb: Combate, inst: CartaInstancia, obj = comb.enemigos.find((e) => e.vivo)) => {
    comb.jugador.energia = 5;
    const antes = obj?.pv ?? 0;
    await comb.jugarCarta(inst, obj);
    return antes - (obj?.pv ?? 0);
  };
  const exp = (comb: Combate, mejorada = false) => aMano(comb, 'explosion-sobrenatural', mejorada);
  const malditasEn = (comb: Combate) => [...comb.jugador.mazo, ...comb.jugador.mano, ...comb.jugador.descarte]
    .filter((c) => c.def.tipo === 'maldicion').length;

  // — Base damage —
  {
    const { comb } = await montarB();
    check(await lanzar(comb, exp(comb)) === 7, 'Explosión Sobrenatural: 7 de daño base (antes 6)');
    check(await lanzar(comb, exp(comb, true)) === 10, 'Explosión Sobrenatural+: 10 de daño (antes 9)');
  }
  // — Verbo Agonizante: damage and Doom on every enemy it hits —
  {
    const { comb } = await montarB([], [quietoB, quietoB]);
    const [a, b] = comb.enemigos;
    await lanzar(comb, aMano(comb, 'verbo-agonizante'));
    const d = await lanzar(comb, exp(comb), a);
    check(d === 10 && a.estados.condena === 3 && !b.estados.condena,
      `Verbo Agonizante: la Explosión inflige 3 más (${d}) y aplica 3 de Condena al que golpea`);
    await lanzar(comb, aMano(comb, 'explosion-trifurcada'));
    await lanzar(comb, exp(comb), a);
    check(a.estados.condena === 6 && b.estados.condena === 3, 'con Explosión Trifurcada, la Condena del Verbo cae sobre todos');
    const m = await montarB();
    await lanzar(m.comb, aMano(m.comb, 'verbo-agonizante', true));
    check(await lanzar(m.comb, exp(m.comb)) === 12 && m.comb.enemigos[0].estados.condena === 4,
      'Verbo Agonizante+: 5 más y 4 de Condena');
  }
  // — Lanza Sobrenatural: the blast grows with every cast, from the first one —
  {
    const { comb } = await montarB();
    await lanzar(comb, aMano(comb, 'lanza-sobrenatural'));
    const d1 = await lanzar(comb, exp(comb));
    const d2 = await lanzar(comb, exp(comb));
    const d3 = await lanzar(comb, exp(comb));
    check(d1 === 9 && d2 === 11 && d3 === 13, `Lanza Sobrenatural: +2 por cada lanzamiento, ya desde el primero (${d1}, ${d2}, ${d3})`);
    await comb.terminarTurno();
    comb.jugador.mano = [];
    check(await lanzar(comb, exp(comb)) === 15, 'el crecimiento dura todo el combate');
    const m = await montarB();
    await lanzar(m.comb, aMano(m.comb, 'lanza-sobrenatural', true));
    check(await lanzar(m.comb, exp(m.comb)) === 10, 'Lanza Sobrenatural+: crece 3 por lanzamiento');
    check(poolDeClase('brujo').some((c) => c.id === 'lanza-sobrenatural'), 'Lanza Sobrenatural sale en las recompensas del brujo');
  }
  // — Don del Patrón: every Blast shields you —
  for (const [mejorada, bloqueo] of [[false, 5], [true, 7]] as const) {
    const { comb } = await montarB();
    const don = aMano(comb, 'don-del-patron');
    don.mejorada = mejorada;
    await lanzar(comb, don);
    const e = exp(comb);
    check(comb.costeEfectivo(defDe(e)) === 1, `Don del Patrón${mejorada ? '+' : ''}: la Explosión no pasa a costar 0`);
    comb.jugador.bloqueo = 0;
    comb.jugador.energia = 0;
    await comb.jugarCarta(e, comb.enemigos[0]);
    check(comb.enemigos[0].pv === 300, 'sin energía ya no se puede lanzar gratis');
    comb.jugador.energia = 1;
    await comb.jugarCarta(e, comb.enemigos[0]);
    check(comb.jugador.bloqueo === bloqueo && comb.enemigos[0].pv === 293, `Don del Patrón${mejorada ? '+' : ''}: al lanzarla ganas ${bloqueo} de bloqueo`);
  }
  // — Cheaper blast powers —
  {
    const haz = cartaB('haz-desdoblado');
    check(haz.coste === 2 && haz.mejora?.coste === 1, 'Haz Desdoblado cuesta 2 (1 mejorado): golpear dos veces sale caro');
  }
  // — Other warlock numbers —
  {
    const { comb } = await montarB();
    const pv = comb.jugador.pv;
    await lanzar(comb, aMano(comb, 'pacto-sangriento'));
    check(pv - comb.jugador.pv === 3 && comb.jugador.estados.explosionTurno === 6 && comb.jugador.mano.length === 2,
      'Pacto Sangriento: pierdes 3 PV, robas 2 y la Explosión inflige 6 más este turno');
    comb.jugador.mano = [];
    await lanzar(comb, aMano(comb, 'oscuridad'));
    check(comb.enemigos[0].estados.oscuridad === 3 && comb.jugador.mano.length === 1, 'Oscuridad: 3 a todos y roba 1 carta');
    check(cartaB('sabueso-sombra').texto.includes('8 de vida y 6 de daño'), 'Sabueso de Sombra: 8 de vida y 6 de daño');
  }

  // — Curses: Hambre del Patrón —
  {
    const { comb, run } = await montarB();
    check(malditasEn(comb) === 0, 'el brujo empieza sin maldiciones');
    await lanzar(comb, aMano(comb, 'hambre-patron'));
    check(malditasEn(comb) === 1 && comb.jugador.descarte.some((c) => c.def.tipo === 'maldicion')
      && !run.mazo.some((c) => c.def.tipo === 'maldicion'),
    'Hambre del Patrón: al jugarla una maldición entra en tu descarte (solo este combate)');
    check(await lanzar(comb, exp(comb)) === 9, 'Hambre del Patrón: la Explosión inflige 2 más por maldición (1 → 9)');
    comb.jugador.mazo.push(instanciar(cartaB('duda')));
    aMano(comb, 'grilletes');
    check(await lanzar(comb, exp(comb)) === 13, 'cuenta las maldiciones del mazo, la mano y el descarte (3 → 13)');
    const hambre = cartaB('hambre-patron');
    check(hambre.coste === 2 && hambre.mejora?.coste === 1, 'Hambre del Patrón cuesta 2 (1 mejorada)');
  }
  // — Curses: Contrato Maldito —
  {
    const { comb, run } = await montarB();
    const inst = aMano(comb, 'contrato-maldito');
    comb.jugador.energia = 1;
    await comb.jugarCarta(inst);
    check(comb.jugador.energia === 2 && comb.jugador.mano.length === 2, 'Contrato Maldito: cuesta 0, ganas 1 de energía y robas 2');
    check(comb.jugador.mazo.filter((c) => c.def.tipo === 'maldicion').length === 1 && !run.mazo.some((c) => c.def.tipo === 'maldicion'),
      'y una maldición al azar entra en tu mazo de robo (solo este combate)');
    const m = await montarB();
    const mej = aMano(m.comb, 'contrato-maldito', true);
    m.comb.jugador.energia = 1;
    await m.comb.jugarCarta(mej);
    check(m.comb.jugador.energia === 3, 'Contrato Maldito+: ganas 2 de energía');
    check(defDe(inst).tipo !== 'maldicion' && poolDeClase('brujo').some((c) => c.id === 'contrato-maldito'), 'es una carta normal del brujo');
  }
  // — Curses: Ofrenda Maldita —
  {
    const { comb } = await montarB();
    const e = comb.enemigos[0];
    const herida = aMano(comb, 'herida-infectada');
    const d = await lanzar(comb, aMano(comb, 'ofrenda-maldita'), e);
    check(d === 18 && e.estados.condena === 6, `Ofrenda Maldita: consumiendo una maldición, 18 de daño y 6 de Condena (${d})`);
    check(!comb.jugador.mano.includes(herida) && comb.jugador.agotadas.includes(herida), 'la maldición consumida se agota');
    const d2 = await lanzar(comb, aMano(comb, 'ofrenda-maldita'), e);
    check(d2 === 6 && e.estados.condena === 6, 'sin maldiciones en la mano, solo inflige 6');
    aMano(comb, 'duda');
    aMano(comb, 'grilletes');
    await lanzar(comb, aMano(comb, 'ofrenda-maldita'), e);
    check(comb.jugador.mano.filter((c) => c.def.tipo === 'maldicion').length === 1, 'consume una sola maldición');
    const m = await montarB();
    aMano(m.comb, 'grilletes');
    check(await lanzar(m.comb, aMano(m.comb, 'ofrenda-maldita', true)) === 24 && m.comb.enemigos[0].estados.condena === 8,
      'Ofrenda Maldita+: 24 de daño y 8 de Condena');
  }
  // — Curses: Égida de la Aflicción —
  {
    const { comb } = await montarB([], [munecoB(300, 10)]);
    await lanzar(comb, aMano(comb, 'egida-afliccion'));
    aMano(comb, 'grilletes');
    aMano(comb, 'grilletes');
    comb.jugador.bloqueo = 0;
    const pv = comb.jugador.pv;
    await comb.terminarTurno();
    check(pv - comb.jugador.pv === 2, 'Égida de la Aflicción: 4 de bloqueo por maldición en la mano al final del turno (8 contra 10)');
    const m = await montarB();
    await lanzar(m.comb, aMano(m.comb, 'egida-afliccion'));
    await lanzar(m.comb, instanciar(cartaUnicaDeClase('brujo')));
    m.comb.jugador.mano = [];
    aMano(m.comb, 'duda');
    aMano(m.comb, 'grilletes');
    m.comb.jugador.bloqueo = 0;
    await m.comb.terminarTurno();
    check(m.comb.enemigos[0].estados.condena === 8, 'con el Pacto Final, ese bloqueo se vuelve Condena el mismo turno');
  }
  // — Curses: Coleccionista de Maldiciones —
  {
    const { comb } = await montarB(['coleccionista-maldiciones'], [quietoB, quietoB]);
    aMano(comb, 'herida-infectada');
    aMano(comb, 'duda');
    aMano(comb, 'grilletes');
    const pv = comb.jugador.pv;
    await comb.terminarTurno();
    check(comb.jugador.pv === pv && !comb.jugador.estados.debil, 'Coleccionista de Maldiciones: las maldiciones de tu mano ya no te castigan');
    check(comb.enemigos.every((e) => e.estados.condena === 9), 'cada maldición de tu mano aplica 3 de Condena a todos (3 → 9)');
    const sin = await montarB([], [quietoB]);
    aMano(sin.comb, 'herida-infectada');
    const pv2 = sin.comb.jugador.pv;
    await sin.comb.terminarTurno();
    check(pv2 - sin.comb.jugador.pv === 2, 'sin la reliquia, la Herida Infectada sigue doliendo');
    const r = reliquiaB('coleccionista-maldiciones');
    check(r.soloClase === 'brujo' && CLASES.filter((c) => c !== 'brujo')
      .every((c) => !RQB.reliquiasDisponibles(nuevaRun(c, 3)).some((x: { id: string }) => x.id === r.id)),
    'el Coleccionista es del brujo: nunca se ofrece a otra clase');
  }
  // — Curses stay unplayable —
  {
    const { comb } = await montarB(['coleccionista-maldiciones', 'ojo-patron', 'vara-pacto', 'libro-sombras']);
    await lanzar(comb, aMano(comb, 'egida-afliccion'));
    await lanzar(comb, aMano(comb, 'hambre-patron'));
    comb.jugador.mano = [];
    const insts = MALDICIONES.filter((c) => c.purgar === undefined).map((c) => aMano(comb, c.id));
    comb.jugador.energia = 9;
    check(insts.every((i) => !comb.puedeJugar(i)), 'con todo el arsenal del brujo, las maldiciones siguen sin poder jugarse');
    await comb.jugarCarta(insts[0]);
    check(comb.jugador.mano.includes(insts[0]) && comb.jugador.energia === 9, 'intentarlo no hace nada');
    const nuevas = ['lanza-sobrenatural', 'hambre-patron', 'contrato-maldito', 'ofrenda-maldita', 'egida-afliccion'];
    check(nuevas.every((id) => BRUJO.some((c) => c.id === id && c.tipo !== 'maldicion')), 'las cartas nuevas del brujo son jugables (no maldiciones)');
  }

  // — Relics: Ojo del Patrón and Eco Sobrenatural scale with the blast —
  {
    const { comb } = await montarB(['ojo-patron'], [quietoB, quietoB]);
    const [a, b] = comb.enemigos;
    await lanzar(comb, exp(comb), a);
    check(a.estados.condena === 3 && !b.estados.condena, 'Ojo del Patrón: Condena igual a la mitad del daño, mínimo 3 (7 → 3)');
    comb.jugador.estados.explosionFuerza = 13;
    delete a.estados.condena;
    await lanzar(comb, exp(comb), a);
    check(a.estados.condena === 10, 'Ojo del Patrón escala: 20 de daño → 10 de Condena');
    delete a.estados.condena;
    comb.jugador.estados.explosionArea = 1;
    await lanzar(comb, exp(comb), a);
    check(a.estados.condena === 10 && b.estados.condena === 10, 'en área condena a todos los que golpea');
  }
  {
    // area + a second beam: the marked target takes both, the rest only the first
    const { comb } = await montarB([], [quietoB, quietoB, quietoB]);
    const [a, b, c] = comb.enemigos;
    comb.jugador.estados.explosionArea = 1;
    comb.jugador.estados.explosionVeces = 1;
    await lanzar(comb, exp(comb), b);
    check(300 - b.pv === 14 && 300 - a.pv === 7 && 300 - c.pv === 7,
      `en área y con dos rayos, el objetivo marcado recibe los dos y el resto uno (${300 - a.pv}/${300 - b.pv}/${300 - c.pv})`);
  }
  {
    const { comb } = await montarB(['eco-sobrenatural'], [quietoB, quietoB]);
    const [a, b] = comb.enemigos;
    comb.jugador.estados.explosionFuerza = 5;
    await lanzar(comb, exp(comb), a);
    check(a.pv === 300 - 12 && b.pv === 300 - 3, 'Eco Sobrenatural: 3 fijos a todos los demás, no la mitad del daño (12 → 3)');
    await lanzar(comb, exp(comb), a);
    check(b.pv === 297, 'solo la primera Explosión de cada turno');
  }
  {
    // with Explosión Trifurcada the Blast already hits everyone: the echo then reaches them all
    const { comb } = await montarB(['eco-sobrenatural'], [quietoB, quietoB]);
    const [a, b] = comb.enemigos;
    comb.jugador.estados.explosionArea = 1;
    await lanzar(comb, exp(comb), a);
    check(a.pv === 300 - 7 - 3 && b.pv === 300 - 7 - 3, `Eco Sobrenatural + Explosión Trifurcada: todos reciben los 3 de más (${300 - a.pv}, ${300 - b.pv})`);
  }
  // — Relics: Libro de las Sombras —
  {
    const run = nuevaRun('brujo', 6061);
    run.reliquias = [reliquiaB('libro-sombras')];
    const comb = new Combate(run, [quietoB], crearRng(6061), uiSilenciosa);
    await comb.iniciar();
    const enMano = comb.jugador.mano.find((c) => c.def.id === 'explosion-sobrenatural');
    check(!!enMano && comb.jugador.mano.length === 6, 'Libro de las Sombras: la Explosión empieza el combate en tu mano (y robas tus 5)');
    const n = comb.jugador.mano.length;
    if (enMano) await lanzar(comb, enMano);
    check(comb.jugador.mano.length === n && !comb.jugador.mano.includes(enMano!), 'la primera Explosión de cada turno roba 1 carta');
    await lanzar(comb, exp(comb));
    check(comb.jugador.mano.length === n, 'la segunda del turno ya no roba');
  }
  // — Relics: Vara del Pacto —
  {
    const { comb } = await montarB(['vara-pacto'], [munecoB(5), quietoB]);
    const [a, b] = comb.enemigos;
    const e = exp(comb);
    await lanzar(comb, e, a);
    check(!a.vivo && comb.jugador.mano.includes(e) && !comb.jugador.mazo.includes(e), 'Vara del Pacto: si la Explosión mata, vuelve a tu mano');
    await lanzar(comb, e, b);
    check(comb.jugador.mazo[comb.jugador.mazo.length - 1] === e && !comb.jugador.mano.includes(e),
      'si no mata, vuelve a lo alto del mazo como siempre');
  }
  // — New warlock relics are class relics with art —
  {
    const ids = ['libro-sombras', 'vara-pacto', 'coleccionista-maldiciones'];
    check(ids.every((id) => RQB.POOL_RELIQUIAS.some((r: { id: string; soloClase?: string }) => r.id === id && r.soloClase === 'brujo')),
      'Libro de las Sombras, Vara del Pacto y Coleccionista de Maldiciones son reliquias del brujo');
  }
} catch (e) {
  check(false, `las pruebas del brujo reforzado revientan: ${(e as Error).stack ?? e}`);
}

// ── Curse cards stay cheap to paint (no CSS filters) ─────────────────────────
console.log('\n🐢 Rendimiento de las maldiciones');
{
  const fs = await import('node:fs');
  const css = fs.readFileSync(new URL('../src/estilos/cartas.css', import.meta.url), 'utf8');
  const reglas = [...css.matchAll(/([^{}]*carta-maldicion[^{}]*)\{([^}]*)\}/g)];
  check(reglas.length > 0, 'hay estilos propios de las maldiciones');
  check(reglas.every(([, , cuerpo]) => !/(^|[\s;])filter\s*:(?!\s*none)/.test(cuerpo)) && /carta-maldicion\.sin-energia\s*\{\s*filter:\s*none/.test(css), 'las maldiciones no usan filter y anulan el gris de «sin energía» (se repintaba en cada fotograma con la mano llena)');
  check(reglas.every(([, , cuerpo]) => !/inset 0 0 1[0-9]px/.test(cuerpo)), 'sin sombras interiores grandes y difuminadas');
}

// ── 3D d20: rigid-body roll that lands on the requested face ─────────────────
console.log('\n🎲 Física del d20');
try {
  const D = await import('../src/fx/d20-physics.ts');
  const geo = D.d20Geometry();
  const numeros = D.d20Numbering();
  check(geo.faces.length === 20 && geo.vertices.length === 12 && new Set(numeros).size === 20 && numeros.every((n) => n >= 1 && n <= 20),
    'el icosaedro tiene 20 caras numeradas del 1 al 20 sin repetir');
  check(geo.normals.every((nor, f) => {
    const o = D.oppositeFace(f);
    const dot = nor[0] * geo.normals[o][0] + nor[1] * geo.normals[o][1] + nor[2] * geo.normals[o][2];
    return dot < -0.999 && numeros[f] + numeros[o] === 21;
  }), 'las caras opuestas suman 21, como en un d20 real');
  check(Array.from({ length: 20 }, (_, i) => numeros[D.faceOfNumber(i + 1)] === i + 1).every(Boolean), 'cada número se localiza en su cara');

  const UP = [0, 1, 0];
  const dot3 = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  let todasArriba = true, sinGiroFinal = true, enRango = true;
  for (let r = 1; r <= 20; r++) {
    const pista = D.simulateRoll({ result: r, seed: 1000 + r * 7 });
    const fin = D.poseAt(pista, pista.duration);
    const arriba = D.rotateVec(fin.q, geo.normals[D.faceOfNumber(r)]);
    if (dot3(arriba, UP) < 0.995) todasArriba = false;
    // after coming to rest nothing moves or turns any more
    for (const t of [pista.duration + 0.01, pista.duration + 0.5, pista.duration + 3]) {
      const p = D.poseAt(pista, t);
      if (p.q.some((c, i) => Math.abs(c - fin.q[i]) > 1e-9) || p.x.some((c, i) => Math.abs(c - fin.x[i]) > 1e-9)) sinGiroFinal = false;
    }
    // the last simulated frame is already the resting pose (no correction after landing)
    const ultimo = pista.frames[pista.frames.length - 1];
    if (Math.hypot(...ultimo.w) > 1e-9 || Math.hypot(...ultimo.v) > 1e-9) sinGiroFinal = false;
    if (pista.duration < D.ROLL_MIN_S || pista.duration > D.ROLL_MAX_S) enRango = false;
  }
  check(todasArriba, 'para cada resultado del 1 al 20 el dado acaba con esa cara hacia arriba');
  check(sinGiroFinal, 'tras el reposo no hay ninguna rotación ni desplazamiento');
  check(enRango, `la tirada dura entre ${D.ROLL_MIN_S} y ${D.ROLL_MAX_S} s`);

  // the physics does not depend on the result: only the constant compensation changes
  const a7 = D.simulateRoll({ result: 7, seed: 42 });
  const a19 = D.simulateRoll({ result: 19, seed: 42 });
  check(a7.frames.length === a19.frames.length && a7.frames.every((f, i) => f.q.every((c, k) => c === a19.frames[i].q[k])),
    'la trayectoria física es la misma para cualquier resultado (solo cambia la compensación)');
  const otra = D.simulateRoll({ result: 7, seed: 42 });
  check(JSON.stringify(otra) === JSON.stringify(a7), 'la tirada es determinista con la misma semilla');
  check(JSON.stringify(D.simulateRoll({ result: 7, seed: 43 }).frames) !== JSON.stringify(a7.frames), 'otra semilla, otra tirada');
  check(D.isIcosahedralSymmetry(a7.compensation) && D.isIcosahedralSymmetry(a19.compensation),
    'la compensación es una simetría del icosaedro (la forma física no cambia)');

  // energy only goes down (small tolerance for the numerical contact solver)
  let energiaBaja = true, rebotes = true;
  for (let s = 0; s < 12; s++) {
    const p = D.simulateRoll({ result: 20, seed: 300 + s });
    const E = p.frames.map((f) => D.rollEnergy(f));
    const tol = E[0] * 0.01;
    let max = E[0];
    for (const e of E) { if (e > max + tol) energiaBaja = false; max = Math.min(max, e); }
    // at rest only the potential energy of the die lying on a face is left
    if (E[E.length - 1] > E[0] * 0.2) energiaBaja = false;
    const golpes = p.impacts.map((i) => i.strength);
    if (golpes.length < 2 || golpes[golpes.length - 1] >= golpes[0]) rebotes = false;
  }
  check(energiaBaja, 'la energía del dado decrece durante toda la tirada');
  check(rebotes, 'rebota varias veces perdiendo fuerza en cada impacto');

  // two dice (advantage) roll in their own lanes and each lands on its value
  const lanes = D.advantageLanes(D.DEFAULT_BOX);
  const d1 = D.simulateRoll({ result: 3, seed: 77, box: lanes[0] });
  const d2 = D.simulateRoll({ result: 18, seed: 78, box: lanes[1] });
  const fin1 = D.poseAt(d1, d1.duration), fin2 = D.poseAt(d2, d2.duration);
  check(dot3(D.rotateVec(fin1.q, geo.normals[D.faceOfNumber(3)]), UP) > 0.995 && dot3(D.rotateVec(fin2.q, geo.normals[D.faceOfNumber(18)]), UP) > 0.995
    && Math.abs(fin1.x[2] - fin2.x[2]) > 1.5, 'con ventaja, los dos dados caen separados y cada uno en su número');
  // stays inside the zone
  check([a7, d1, d2].every((p) => p.frames.every((f) => f.x[1] > 0.5)), 'el dado nunca atraviesa el suelo');
} catch (e) {
  check(false, `las pruebas del d20 revientan: ${(e as Error).stack ?? e}`);
}

// ── Rare and unique cards: each one plays its own VFX sequence ──────────────
console.log('\n🌟 Secuencias propias de las cartas raras y únicas');
try {
  const sf = await import('../src/fx/spell-fx.ts');
  const cs = await import('../src/fx/card-spells.ts');
  const { SPELLS, spellFrame, spellMarks, spellSignature, SpellSystem, MAX_CARD_SPRITES, MAX_LIVE_SPRITES } = sf;
  const { CARD_FX, cardSpellKey, preludeKey, cardShake, hitSpell } = cs;
  const raras = [...DRUIDA, ...BARBARO, ...MAGO, ...PICARO, ...BRUJO, ...PALADIN, ...NEUTRALES_ESPECIALES]
    .filter((d) => d.rareza === 'rara' || d.rareza === 'especial');
  check(raras.length >= 39, `hay al menos 39 cartas raras o únicas (${raras.length})`);
  const box = { x: 600, y: 200, w: 160, h: 200 };
  const ctx = { box, from: { x: 200, y: 300 }, facing: -1 as const, seed: 7 };
  const firmasGen = new Set(Object.keys(SPELLS).filter((k) => !k.startsWith('carta:')).map((k) => spellSignature(k)));
  const firmas = new Map<string, string>();
  const muestra = (k: string, c: typeof ctx & { reduced?: boolean }) => {
    const d = SPELLS[k];
    let maximo = 0, roto = 0, enImpacto = 0;
    for (let t = 0; t <= d.duration; t += 1 / 30) {
      const fr = spellFrame(k, c, t);
      maximo = Math.max(maximo, fr.length);
      if (t >= d.phases[0] * d.duration && t <= d.phases[1] * d.duration) enImpacto = Math.max(enImpacto, fr.length);
      for (const s of fr) {
        const a = s.alpha ?? 1;
        if (![s.x, s.y, s.size, s.angle, a, s.stretch ?? 1, s.param ?? 0].every(Number.isFinite) || a < 0 || a > 1 || s.size <= 0) roto++;
      }
    }
    return { maximo, roto, enImpacto };
  };
  for (const d of raras) {
    const k = cardSpellKey(d.id, d.fx);
    const def = SPELLS[k];
    check(!!CARD_FX[d.id] && !!def && k !== d.fx, `«${d.nombre}» tiene su secuencia propia`);
    if (!def) continue;
    check(!d.fx || def.build !== SPELLS[d.fx]?.build, `«${d.nombre}» no reutiliza el efecto genérico «${d.fx}»`);
    const f = spellSignature(k);
    const igual = [...firmas].find(([, v]) => v === f);
    check(!firmasGen.has(f) && !igual, `«${d.nombre}» se ve distinta de ${igual ? `«${igual[0]}»` : 'las demás y de los efectos genéricos'}`);
    firmas.set(d.nombre, f);
    check(def.duration >= 0.4 && def.duration <= 1.4, `«${d.nombre}» dura entre 0,4 y 1,4 s (${def.duration})`);
    check(def.phases[0] > 0 && def.phases[0] < def.phases[1] && def.phases[1] < 1, `«${d.nombre}»: anticipación < clímax e impacto < disipación`);
    const m = muestra(k, ctx);
    check(m.roto === 0, `«${d.nombre}»: elementos válidos (${m.roto} rotos)`);
    check(m.maximo > 60 && m.maximo <= MAX_CARD_SPRITES && m.maximo <= (def.cap ?? 0), `«${d.nombre}»: más partículas, con tope (${m.maximo} ≤ ${def.cap})`);
    check(m.enImpacto > 0, `«${d.nombre}» se ve en su impacto`);
    check(spellFrame(k, ctx, def.duration + 0.01).length === 0, `«${d.nombre}» desaparece al terminar`);
    // anticipation while the showcase holds the stage
    const pk = preludeKey(d.id);
    const pre = pk ? SPELLS[pk] : undefined;
    check(!!pre && pre.duration >= 0.6 && pre.duration <= 1.4 && muestra(pk!, ctx).roto === 0 && muestra(pk!, ctx).maximo <= MAX_CARD_SPRITES,
      `«${d.nombre}» anticipa su efecto durante el escaparate`);
    // reduced motion: far fewer particles and no shake
    const r = muestra(k, { ...ctx, reduced: true });
    check(r.maximo < m.maximo * 0.75 && r.enImpacto > 0, `«${d.nombre}» con movimiento reducido dibuja menos (${r.maximo} < ${m.maximo})`);
    check(cardShake(k, true) === null, `«${d.nombre}» no sacude la pantalla con movimiento reducido`);
    // receiver: attacks and targeted skills hit the target, the rest light up the hero
    if (d.objetivo === 'enemigo' || d.objetivo === 'todos') check(def.anchor === 'target', `«${d.nombre}» se dibuja sobre su objetivo`);
    else check(def.anchor === 'self' || def.receiver === 'enemies', `«${d.nombre}» se dibuja sobre el héroe o sobre los enemigos`);
    const sk = cardShake(k, false);
    check(!sk || (sk.delayMs >= 0 && sk.delayMs <= def.duration * 1000 && sk.level >= 1 && sk.level <= 3), `«${d.nombre}»: sacudida breve y dentro del efecto`);
    // attacks: the showcase prelude did the build-up, so the blow lands with the damage number
    if (d.tipo === 'ataque') check(def.phases[0] * def.duration <= 0.2, `«${d.nombre}»: el impacto llega con el daño (${Math.round(def.phases[0] * def.duration * 1000)} ms)`);
  }
  const porId = (id: string) => raras.find((d) => d.id === id)!;
  check(!!cardShake(cardSpellKey('furia-indomita', 'furia'), false), 'Furia Indómita sacude la pantalla');
  check(SPELLS[cardSpellKey('pacto-final', 'condena')]?.receiver === 'enemies', 'Pacto Final ata a los enemigos, no al héroe');
  check(hitSpell({ id: 'circulo-mar', fx: 'ola' }, 'ola') === cardSpellKey('circulo-mar', 'ola'), 'un golpe con la clave de la carta rara usa su secuencia');
  check(hitSpell({ id: 'circulo-mar', fx: 'ola' }, 'tajo') === 'tajo' && hitSpell(null, 'ola') === 'ola' && hitSpell({ id: 'golpe', fx: 'tajo' }, 'tajo') === 'tajo',
    'los demás golpes conservan su efecto');

  // Vengeful Storm: one bolt per hit on every enemy it targets
  const tormenta = porId('tormenta-venganza');
  const golpes: { obj: unknown; fx?: string }[] = [];
  const ui: Presentador = { ...uiSilenciosa, fxGolpe: async (obj, _n, fx) => { golpes.push({ obj, fx }); } };
  const run = nuevaRun('druida', 2024);
  const comb = new Combate(run, [GOBLIN_CORTADOR, GOBLIN_ARQUERO, GOBLIN_FAMELICO], crearRng(2024), ui);
  await comb.iniciar();
  const inst = instanciar(tormenta);
  comb.jugador.mano.push(inst);
  comb.jugador.energia = 9;
  golpes.length = 0;
  await comb.jugarCarta(inst);
  const cajas = new Map(comb.enemigos.map((e, i) => [e as unknown, { x: 380 + i * 190, y: 180, w: 150, h: 190 }]));
  const golpesEnemigo = golpes.filter((g) => cajas.has(g.obj));
  check(golpesEnemigo.length === 3, `la tormenta golpea a los tres enemigos (${golpesEnemigo.length})`);
  const kT = cardSpellKey(tormenta.id, tormenta.fx);
  const dT = SPELLS[kT];
  let rayosOk = 0;
  for (const g of golpesEnemigo) {
    const clave = hitSpell({ id: tormenta.id, fx: tormenta.fx }, g.fx ?? '');
    const caja = cajas.get(g.obj)!;
    const c = { box: caja, from: { x: 120, y: 300 }, facing: -1 as const, seed: 3 };
    let rayos = 0, dentro = true;
    for (let t = 0; t <= dT.duration; t += 1 / 60) {
      const marcas = spellMarks(clave, c, t).filter((q) => q.kind === 'rayo');
      if (marcas.length > 1) dentro = false;
      if (marcas.length) {
        rayos = Math.max(rayos, marcas.length);
        dentro &&= marcas.every((q) => q.x >= caja.x && q.x <= caja.x + caja.w && q.y >= caja.y && q.y <= caja.y + caja.h);
      }
    }
    if (clave === kT && rayos === 1 && dentro) rayosOk++;
  }
  check(rayosOk === 3, `un rayo por impacto, que cae dentro de cada enemigo (${rayosOk}/3)`);
  const tRayo = [...Array(60).keys()].map((i) => (i / 60) * dT.duration).find((t) => spellMarks(kT, ctx, t).some((q) => q.kind === 'rayo'));
  check(tRayo !== undefined && tRayo <= dT.phases[1] * dT.duration && tRayo >= dT.phases[0] * dT.duration * 0.5, 'el rayo cae en la fase de impacto, a la vez que el daño');
  check(!!cardShake(kT, false), 'la tormenta sacude la pantalla al caer el rayo');

  // live budget at the peak of a rare card: prelude + three bolts, a hit every 0.26 s
  const sys = new SpellSystem();
  sys.add(preludeKey(tormenta.id)!, { ...ctx, box: { x: 380, y: 180, w: 530, h: 190 } }, 0);
  for (let i = 0; i < 3; i++) sys.add(kT, { ...ctx, box: { x: 380 + i * 190, y: 180, w: 150, h: 190 }, seed: i + 1 }, 0.9 + i * 0.26);
  let pico = 0, bruto = 0;
  for (let t = 0; t < 2.6; t += 1 / 30) {
    pico = Math.max(pico, sys.frame(t, MAX_LIVE_SPRITES - 150).length);
  }
  for (let t = 0.9; t < 2.6; t += 1 / 30) {
    let s = 0;
    for (let i = 0; i < 3; i++) s += spellFrame(kT, { ...ctx, seed: i + 1 }, t - 0.9 - i * 0.26).length;
    bruto = Math.max(bruto, s);
  }
  check(pico <= MAX_LIVE_SPRITES - 150, `el gestor limita el pico de la rara (${pico})`);
  check(bruto <= MAX_LIVE_SPRITES, `la tormenta sobre tres enemigos cabe en ~${MAX_LIVE_SPRITES} elementos sin recortar (${bruto})`);
  check(MAX_LIVE_SPRITES <= 900, 'el tope global de elementos vivos es de unos 900');
} catch (e) {
  check(false, `las pruebas de las secuencias raras revientan: ${(e as Error).stack ?? e}`);
}

// ── Paladin VFX: hammers of light, holy rays and elemental smites ────────────
console.log('\n🔨 Efectos del paladín');
try {
  const sf = await import('../src/fx/spell-fx.ts');
  const cs = await import('../src/fx/card-spells.ts');
  const hdP = await import('../src/fx/hero-death.ts');
  const psP = await import('../src/fx/particle-sim.ts');
  const CTP: any = await import('../src/core/cartas.ts');
  const { SPELLS, spellFrame, spellMarks, spellSignature, SpellSystem, MAX_SPELL_SPRITES, MAX_CARD_SPRITES, MAX_LIVE_SPRITES } = sf;
  const { CARD_FX, cardSpellKey, preludeKey, cardShake } = cs;
  const cargas = ['Divina', 'Trueno', 'Cegadora', 'Fuego', 'Resplandor', 'Destierro'].map((e) => `carga${e}`);
  const castigos = ['Divino', 'Trueno', 'Cegador', 'Fuego', 'Resplandor', 'Destierro'].map((e) => `castigo${e}`);
  const alHeroe = ['escudoSagrado', 'bendicion', ...cargas];
  const alObjetivo = ['martillo', 'expulsar', 'rayoSagrado', ...castigos];
  const claves = [...alObjetivo, ...alHeroe];
  for (const k of claves) check(!!SPELLS[k], `paladín: «${k}» tiene su efecto propio`);
  for (const k of alHeroe) check(SPELLS[k]?.anchor === 'self', `paladín: «${k}» se dibuja sobre el héroe`);
  for (const k of alObjetivo) check(SPELLS[k]?.anchor === 'target', `paladín: «${k}» se dibuja sobre el objetivo`);
  const hay = claves.filter((k) => SPELLS[k]);
  const otras = Object.keys(SPELLS).filter((k) => !claves.includes(k) && !k.startsWith('carta:'));
  check(new Set(hay.map((k) => SPELLS[k].build)).size === hay.length && hay.every((k) => otras.every((o) => SPELLS[o].build !== SPELLS[k].build)),
    'paladín: cada efecto se compone con su propia función');
  const firmasOtras = new Set(otras.map((k) => spellSignature(k)));
  const firmasPal = new Map<string, string>();
  for (const k of hay) {
    const f = spellSignature(k);
    const igual = [...firmasPal].find(([, v]) => v === f);
    check(!igual && !firmasOtras.has(f), `paladín: «${k}» se ve distinto de ${igual ? `«${igual[0]}»` : 'los demás efectos'}`);
    firmasPal.set(k, f);
  }
  const box = { x: 600, y: 200, w: 160, h: 200 };
  const hero = { x: 100, y: 250, w: 140, h: 180 };
  const ctxE = { box, from: { x: 170, y: 340 }, facing: -1 as const, seed: 7 };
  const ctxH = { box: hero, facing: 1 as const, seed: 5 };
  const ctxDe = (k: string) => (SPELLS[k]?.anchor === 'self' ? ctxH : ctxE);
  const muestra = (k: string, c: { box: typeof box; reduced?: boolean; seed?: number }) => {
    const d = SPELLS[k];
    let maximo = 0, roto = 0, enImpacto = 0, total = 0;
    for (let t = 0; t <= d.duration; t += 1 / 30) {
      const fr = spellFrame(k, c, t);
      maximo = Math.max(maximo, fr.length);
      total += fr.length;
      if (t >= d.phases[0] * d.duration && t <= d.phases[1] * d.duration) enImpacto = Math.max(enImpacto, fr.length);
      for (const s of fr) {
        const a = s.alpha ?? 1;
        if (![s.x, s.y, s.size, s.angle, a, s.stretch ?? 1, s.param ?? 0].every(Number.isFinite) || a < 0 || a > 1 || s.size <= 0) roto++;
      }
    }
    return { maximo, roto, enImpacto, total };
  };
  for (const k of hay) {
    const d = SPELLS[k], c = ctxDe(k);
    check(d.duration >= 0.4 && d.duration <= 1.4, `paladín: «${k}» dura entre 0,4 y 1,4 s (${d.duration})`);
    check(d.phases[0] > 0 && d.phases[0] < d.phases[1] && d.phases[1] < 1, `paladín: «${k}»: anticipación < impacto < disipación`);
    const m = muestra(k, c);
    check(m.roto === 0, `paladín: «${k}»: elementos válidos (${m.roto} rotos)`);
    check(m.maximo > 12 && m.maximo <= (d.cap ?? MAX_SPELL_SPRITES) && m.maximo <= MAX_SPELL_SPRITES, `paladín: «${k}» respeta el tope de ${MAX_SPELL_SPRITES} elementos (${m.maximo})`);
    check(m.enImpacto > 0, `paladín: «${k}» se ve en su impacto`);
    check(spellFrame(k, c, d.duration + 0.01).length === 0, `paladín: «${k}» desaparece al terminar`);
    const t = d.duration * 0.4;
    check(JSON.stringify(spellFrame(k, c, t)) === JSON.stringify(spellFrame(k, c, t)), `paladín: «${k}» es determinista`);
    const r = muestra(k, { ...c, reduced: true });
    check(r.total < m.total * 0.85 && r.enImpacto > 0, `paladín: «${k}» con movimiento reducido dibuja menos (${r.total} < ${m.total})`);
    check(!!psP.EFFECTS[k], `paladín: «${k}» tiene partículas de respaldo`);
  }
  // the hammer: quick, lands with the damage number, from above, and never twice the same
  const dM = SPELLS.martillo;
  if (dM) {
    check(dM.duration >= 0.45 && dM.duration <= 0.65, `el martillo es rápido (${dM.duration} s)`);
    check(dM.phases[0] * dM.duration <= 0.12, `el martillo impacta con el número de daño (${Math.round(dM.phases[0] * dM.duration * 1000)} ms)`);
    const cabeza = (t: number) => spellMarks('martillo', ctxE, t).find((q) => q.kind === 'martillo');
    const golpe = [...Array(40).keys()].map((i) => (i / 40) * dM.duration).map((t) => spellMarks('martillo', ctxE, t).find((q) => q.kind === 'golpe')).find(Boolean);
    check(!!cabeza(0.01) && !!golpe && cabeza(0.01)!.y < golpe.y - 20, 'el martillo cae desde arriba sobre el objetivo');
    check(!!golpe && golpe.x >= box.x && golpe.x <= box.x + box.w && golpe.y >= box.y && golpe.y <= box.y + box.h, 'el martillo golpea dentro del objetivo');
    const firmasM = new Set([1, 2, 3, 4, 5, 6].map((seed) => JSON.stringify(spellFrame('martillo', { ...ctxE, seed }, dM.duration * 0.15).map((s) => [Math.round(s.x), Math.round(s.y)]))));
    check(firmasM.size >= 4, `cada martillazo varía su trazo (${firmasM.size} de 6 distintos)`);
    const sombra = spellFrame('martillo', ctxE, dM.duration * 0.2);
    check(sombra.some((s) => /^#ff[cde]/i.test(s.colour)) && sombra.some((s) => s.shape === 'capsula'), 'el martillo es de luz dorada');
  }
  // smites land with the attack's hit, in their element
  const hex = (c: string) => { const n = parseInt(c.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const tono = (c: string) => {
    if (!/^#[0-9a-f]{6}$/i.test(c)) return { h: -1, s: 0, l: 0 };
    const [r, g2, b2] = hex(c).map((v) => v / 255), mx = Math.max(r, g2, b2), mn = Math.min(r, g2, b2), l = (mx + mn) / 2, dd = mx - mn;
    if (dd < 0.08) return { h: -1, s: 0, l };
    const h = mx === r ? ((g2 - b2) / dd + 6) % 6 : mx === g2 ? (b2 - r) / dd + 2 : (r - g2) / dd + 4;
    return { h: h * 60, s: dd / (1 - Math.abs(2 * l - 1) || 1), l };
  };
  const cuota = (k: string, pred: (t: { h: number; s: number; l: number }) => boolean, c = ctxDe(k)) => {
    let n = 0, sum = 0;
    const d = SPELLS[k];
    for (let t = 0; t <= d.duration; t += d.duration / 12) for (const s of spellFrame(k, c, t)) { sum++; if (pred(tono(s.colour))) n++; }
    return sum ? n / sum : 0;
  };
  const oro = (t: { h: number }) => t.h >= 30 && t.h <= 58;
  const azul = (t: { h: number }) => t.h >= 190 && t.h <= 235;
  const blanco = (t: { h: number; l: number }) => (t.h < 0 && t.l > 0.8) || t.l > 0.9;
  const naranja = (t: { h: number }) => t.h >= 5 && t.h < 38;
  const violeta = (t: { h: number }) => t.h >= 255 && t.h <= 300;
  const elementos: [string, string, (t: { h: number; s: number; l: number }) => boolean][] = [
    ['Divin', 'oro', oro], ['Trueno', 'azul', azul], ['Cegador', 'blanco', blanco], ['Fuego', 'naranja', naranja],
    ['Resplandor', 'oro o melocotón', (t) => t.h >= 15 && t.h <= 58], ['Destierro', 'violeta', violeta],
  ];
  for (const [el, nombre, pred] of elementos) {
    for (const k of [...cargas, ...castigos].filter((x) => x.includes(el) && SPELLS[x])) {
      const q = cuota(k, pred);
      check(q >= 0.3, `paladín: «${k}» es de color ${nombre} (${Math.round(q * 100)} %)`);
    }
  }
  check(!!SPELLS.castigoDestierro && cuota('castigoDestierro', oro) >= 0.1, 'el destierro mezcla violeta y oro');
  for (const k of castigos.filter((x) => SPELLS[x])) {
    const d = SPELLS[k];
    check(d.phases[0] * d.duration <= 0.2, `«${k}» descarga con el golpe (${Math.round(d.phases[0] * d.duration * 1000)} ms)`);
  }
  if (SPELLS.castigoFuego) {
    const d = SPELLS.castigoFuego;
    let fuera = 0;
    for (let t = 0; t <= d.duration; t += 1 / 30) fuera = Math.max(fuera, spellFrame('castigoFuego', ctxE, t).filter((s) => s.x < box.x - box.w * 0.4 || s.x > box.x + box.w * 1.4).length);
    check(fuera >= 4, `el castigo de fuego salpica alrededor del objetivo (${fuera})`);
  }
  if (SPELLS.castigoDestierro) {
    const d = SPELLS.castigoDestierro;
    const sello = spellFrame('castigoDestierro', ctxE, d.duration * (d.phases[0] + 0.05)).filter((s) => s.shape === 'anillo' && s.size * (s.stretch ?? 1) >= box.w * 0.35);
    check(sello.length > 0 && sello.every((s) => s.y >= box.y + box.h * 0.8), 'el sello del destierro se abre bajo el enemigo');
  }
  if (SPELLS.castigoResplandor) {
    const d = SPELLS.castigoResplandor;
    const cerca = spellFrame('castigoResplandor', ctxE, d.duration * 0.75).filter((s) => Math.hypot(s.x - ctxE.from.x, s.y - ctxE.from.y) < 120);
    check(cerca.length > 0, 'el resplandor vuelve hacia el paladín como escudo de luz');
  }
  if (SPELLS.rayoSagrado) {
    const d = SPELLS.rayoSagrado;
    check(spellFrame('rayoSagrado', ctxE, d.duration * (d.phases[0] + 0.03)).some((s) => s.y < box.y - box.h * 0.4), 'el rayo sagrado baja del cielo');
  }
  if (SPELLS.expulsar) {
    const d = SPELLS.expulsar;
    const frente = (t: number) => { const f = spellFrame('expulsar', ctxE, t).filter((s) => s.shape === 'chispa'); return f.reduce((m, s) => m + s.x, 0) / Math.max(1, f.length); };
    check(frente(d.duration * 0.45) > frente(d.duration * 0.1) + 20 && spellFrame('expulsar', ctxE, d.duration * 0.3).some((s) => s.shape === 'arco'), 'la onda de luz barre al enemigo, desde el paladín');
  }
  if (SPELLS.escudoSagrado) {
    const fr = spellFrame('escudoSagrado', ctxH, SPELLS.escudoSagrado.duration * 0.45);
    const mx = fr.reduce((m, s) => m + s.x, 0) / Math.max(1, fr.length);
    check(fr.length > 0 && mx > hero.x + hero.w / 2, 'el sello del escudo sagrado se alza delante del héroe');
  }
  for (const k of cargas.filter((x) => SPELLS[x])) {
    const d = SPELLS[k];
    let lejos = 0;
    for (let t = 0; t <= d.duration; t += 1 / 20) lejos += spellFrame(k, ctxH, t).filter((s) => s.x < hero.x - hero.w * 1.6 || s.x > hero.x + hero.w * 2.6 || s.y < hero.y - hero.h * 1.8).length;
    check(lejos === 0, `«${k}» carga el arma del héroe sin salirse de su zona (${lejos})`);
  }
  // a triple hammer blow with smites on three enemies fits in the live budget
  if (SPELLS.martillo && SPELLS.castigoFuego) {
    let bruto = 0;
    for (let t = 0; t < 1.6; t += 1 / 30) {
      let s = 0;
      for (let i = 0; i < 3; i++) for (let h = 0; h < 3; h++) {
        const c = { ...ctxE, box: { ...box, x: 380 + i * 190 }, seed: i * 3 + h + 1 };
        s += spellFrame('martillo', c, t - h * 0.26).length + (h === 0 ? spellFrame('castigoFuego', c, t - 0.05).length + spellFrame('castigoTrueno', c, t - 0.05).length : 0);
      }
      bruto = Math.max(bruto, s);
    }
    check(bruto <= MAX_LIVE_SPRITES, `tres martillazos con castigos sobre tres enemigos caben en el tope (${bruto} ≤ ${MAX_LIVE_SPRITES})`);
  }

  // rare and unique cards: their own sequences
  const ids = ['juramento-devocion', 'juramento-gloria', 'juramento-antiguos', 'juramento-venganza', 'colera-celestial', 'angel-vengador'];
  const firmasGen = new Set(Object.keys(SPELLS).filter((k) => !k.startsWith('carta:')).map((k) => spellSignature(k)));
  const firmasR = new Map<string, string>();
  const buildsGen = new Set(Object.keys(SPELLS).filter((k) => !k.startsWith('carta:')).map((k) => SPELLS[k].build));
  const pico: Record<string, number> = {};
  for (const id of ids) {
    const k = `carta:${id}`, def = SPELLS[k];
    check(!!CARD_FX[id] && !!def && cardSpellKey(id, 'martillo') === k, `«${id}» tiene su secuencia propia`);
    if (!def) continue;
    check(!buildsGen.has(def.build), `«${id}» no reutiliza un efecto genérico`);
    const f = spellSignature(k), igual = [...firmasR].find(([, v]) => v === f);
    check(!firmasGen.has(f) && !igual, `«${id}» se ve distinta de ${igual ? `«${igual[0]}»` : 'los efectos genéricos'}`);
    firmasR.set(id, f);
    const c = def.anchor === 'self' ? ctxH : ctxE;
    check(def.duration >= 0.4 && def.duration <= 1.4 && def.phases[0] > 0 && def.phases[0] < def.phases[1] && def.phases[1] < 1, `«${id}»: duración y fases válidas`);
    const m = muestra(k, c);
    pico[id] = m.maximo;
    check(m.roto === 0 && m.maximo > 60 && m.maximo <= (def.cap ?? 0) && m.maximo <= MAX_CARD_SPRITES, `«${id}»: más partículas, con tope (${m.maximo} ≤ ${def.cap})`);
    check(spellFrame(k, c, def.duration + 0.01).length === 0, `«${id}» desaparece al terminar`);
    const r = muestra(k, { ...c, reduced: true });
    check(r.maximo < m.maximo * 0.75 && r.enImpacto > 0, `«${id}» con movimiento reducido dibuja menos (${r.maximo} < ${m.maximo})`);
    check(cardShake(k, true) === null, `«${id}» no sacude con movimiento reducido`);
    const pk = preludeKey(id), pre = pk ? SPELLS[pk] : undefined;
    check(!!pre && muestra(pk!, c).roto === 0 && muestra(pk!, c).maximo <= MAX_CARD_SPRITES, `«${id}» anticipa su efecto durante el escaparate`);
  }
  for (const id of ids.filter((x) => x.startsWith('juramento') || x === 'angel-vengador')) check(SPELLS[`carta:${id}`]?.anchor === 'self', `«${id}» se dibuja sobre el héroe`);
  const col = SPELLS['carta:colera-celestial'];
  check(!!col && col.anchor === 'target' && (col.cap ?? 999) <= 280 && col.phases[0] * col.duration <= 0.2, 'Cólera Celestial cae sobre cada enemigo, ligera y con el daño');
  check(!!cardShake('carta:colera-celestial', false), 'Cólera Celestial sacude la pantalla');
  if (col) {
    let bruto = 0;
    for (let t = 0; t < 2.4; t += 1 / 30) {
      let s = 0;
      for (let h = 0; h < 3; h++) for (let i = 0; i < 3; i++) s += spellFrame('carta:colera-celestial', { ...ctxE, box: { ...box, x: 380 + i * 190 }, seed: h * 3 + i + 1 }, t - (h * 3 + i) * 0.26).length;
      bruto = Math.max(bruto, s);
    }
    check(bruto <= MAX_LIVE_SPRITES, `Cólera Celestial ×3 sobre tres enemigos cabe en el tope (${bruto})`);
  }
  check(!!pico['angel-vengador'] && ids.slice(0, 4).every((id) => (pico[id] ?? 0) < pico['angel-vengador']), 'Ángel Vengador es la secuencia más épica del paladín');
  const cartasPal: CartaDef[] = CTP.PALADIN ?? [];
  const rarasPal = cartasPal.filter((d) => d.rareza === 'rara' || d.rareza === 'especial');
  check(rarasPal.length >= 6 && rarasPal.every((d) => !!CARD_FX[d.id]), `las raras y la única del paladín tienen secuencia (${rarasPal.length})`);
  const clavesPal = new Set(cartasPal.map((d) => d.fx).filter((k): k is string => !!k));
  check(clavesPal.size > 0 && [...clavesPal].every((k) => !!SPELLS[k]), 'todas las claves fx de las cartas del paladín tienen efecto');

  // death
  const muerte = hdP.heroDeathFx('paladin');
  check(muerte.spell === 'muertePaladin' && !!SPELLS.muertePaladin && SPELLS.muertePaladin.anchor === 'self', 'el paladín tiene su propia muerte');
} catch (e) {
  check(false, `las pruebas de los efectos del paladín revientan: ${(e as Error).stack ?? e}`);
}

// ── Smite impacts: each one its own blow, in the colours of its flames ──────
console.log('\n🔥 Impactos de los Castigos');
try {
  const sf = await import('../src/fx/spell-fx.ts');
  const hf = await import('../src/fx/holy-flames.ts');
  const { SPELLS, spellFrame, spellSignature, MAX_SPELL_SPRITES } = sf;
  const impactos: [string, keyof typeof hf.FLAME_PALETTES][] = [
    ['castigoGenerico', 'holy'], ['castigoDivino', 'divino'], ['castigoTrueno', 'trueno'],
    ['castigoCegador', 'cegador'], ['castigoFuego', 'fuego'], ['castigoResplandor', 'resplandor'],
  ];
  // an enemy about 130 px wide, as on a phone
  const box = { x: 600, y: 200, w: 130, h: 160 };
  const ctx = { box, from: { x: 170, y: 300 }, facing: -1 as const, seed: 4 };
  const extent = (s: ReturnType<typeof spellFrame>[number]) =>
    s.shape === 'estrella' ? s.size * 2 : s.shape === 'chispa' ? s.size * 1.8 : s.size * Math.max(1, s.stretch ?? 1);
  check(!!SPELLS.castigoGenerico && SPELLS.castigoGenerico.anchor === 'target', 'existe el impacto del Castigo genérico («castigoGenerico»), sobre el objetivo');
  if (SPELLS.castigoGenerico) {
    check(SPELLS.castigoGenerico.build !== SPELLS.martillo?.build && SPELLS.castigoGenerico.build !== SPELLS.castigoDivino?.build
      && spellSignature('castigoGenerico') !== spellSignature('martillo') && spellSignature('castigoGenerico') !== spellSignature('castigoDivino'),
      'el Castigo genérico se ve distinto del martillo y del Castigo Divino');
    const d = SPELLS.castigoGenerico;
    check(spellFrame('castigoGenerico', ctx, d.duration * (d.phases[0] + 0.1)).some((s) => s.shape === 'gota'), 'el Castigo genérico prende al enemigo en llamas sagradas');
  }
  const firmas = new Map<string, string>();
  for (const [k, pal] of impactos) {
    const d = SPELLS[k];
    if (!d) { check(false, `«${k}» existe`); continue; }
    const p = hf.FLAME_PALETTES[pal];
    const propios = new Set([...p.outer, ...p.core, ...p.ember, '#ffffff'].map((c) => c.toLowerCase()));
    let total = 0, enPaleta = 0, exterior = 0, maximo = 0;
    let ancho = 0, alto = 0, grande = 0, visibles = 0;
    for (let t = 0; t <= d.duration; t += 1 / 30) {
      const fr = spellFrame(k, ctx, t);
      maximo = Math.max(maximo, fr.length);
      for (const s of fr) {
        total++;
        const c = s.colour.toLowerCase();
        if (propios.has(c)) enPaleta++;
        if (p.outer.includes(c)) exterior++;
      }
      if (t < d.phases[0] * d.duration || t > d.phases[1] * d.duration) continue;
      const vivos = fr.filter((s) => (s.alpha ?? 1) >= 0.25);
      if (!vivos.length) continue;
      const x0 = Math.min(...vivos.map((s) => s.x - extent(s))), x1 = Math.max(...vivos.map((s) => s.x + extent(s)));
      const y0 = Math.min(...vivos.map((s) => s.y - extent(s))), y1 = Math.max(...vivos.map((s) => s.y + extent(s)));
      ancho = Math.max(ancho, x1 - x0); alto = Math.max(alto, y1 - y0);
      grande = Math.max(grande, ...vivos.filter((s) => (s.alpha ?? 1) >= 0.5).map(extent));
      visibles = Math.max(visibles, vivos.length);
    }
    const cuota = total ? enPaleta / total : 0;
    check(cuota >= 0.75 && exterior > 0, `«${k}» usa los colores de sus llamas «${pal}» (${Math.round(cuota * 100)} %)`);
    check(ancho >= box.w && alto >= box.h * 0.8 && visibles >= 10,
      `«${k}» se lee sobre un enemigo de ${box.w} px (${Math.round(ancho)}×${Math.round(alto)} px, ${visibles} elementos)`);
    check(grande >= box.w * 0.3, `«${k}» tiene una pieza central grande (${Math.round(grande)} px)`);
    check(d.duration <= 1.0 && d.phases[0] * d.duration <= 0.2 && maximo <= MAX_SPELL_SPRITES,
      `«${k}» es corto, descarga con el golpe y respeta el tope (${d.duration} s, ${Math.round(d.phases[0] * d.duration * 1000)} ms, ${maximo})`);
    let r = 0, n = 0;
    for (let t = 0; t <= d.duration; t += 1 / 30) { r += spellFrame(k, { ...ctx, reduced: true }, t).length; n += spellFrame(k, ctx, t).length; }
    check(r < n * 0.85, `«${k}» con movimiento reducido dibuja menos (${r} < ${n})`);
    const f = spellSignature(k), igual = [...firmas].find(([, v]) => v === f);
    check(!igual, `«${k}» tiene su propio impacto${igual ? ` (igual que «${igual[0]}»)` : ''}`);
    firmas.set(k, f);
  }
  // the Divine Smite: an amber sun sigil falls onto the enemy and stamps on it
  if (SPELLS.castigoDivino) {
    const d = SPELLS.castigoDivino;
    const sello = (t: number) => spellFrame('castigoDivino', ctx, t).filter((s) => s.shape === 'anillo').sort((a, b) => b.size - a.size)[0];
    const antes = sello(d.duration * d.phases[0] * 0.4), despues = sello(d.duration * (d.phases[0] + 0.08));
    check(!!antes && antes.y < box.y + box.h * 0.2 && !!despues && despues.y > box.y && despues.y < box.y + box.h,
      'el sello solar del Castigo Divino cae del cielo y se estampa en el enemigo');
  }
  // Banishing is untouched
  const fnv = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); };
  const huella = (k: string) => {
    const d = SPELLS[k];
    return fnv([0.1, 0.3, 0.5, 0.7, 0.9].map((q) => spellFrame(k, ctx, q * d.duration)
      .map((s) => [s.shape, s.colour, Math.round(s.x), Math.round(s.y), Math.round(s.size * 10), Math.round((s.alpha ?? 1) * 100)].join(':')).join('|')).join('#'));
  };
  check(spellSignature('castigoDestierro') === 'anillo2,capsula6,disco1,runa8@48,40|anillo2,capsula66,disco16,haz2,runa8@48,33|anillo2,capsula66,disco27,haz2,runa8@48,35|anillo2,capsula6,disco6,runa8@48,39'
    && huella('castigoDestierro') === '39ff00de' && SPELLS.castigoDestierro.duration === 1.1, 'el Castigo Desterrador no ha cambiado');
  check(huella('cargaDestierro') === '5cb9c698', 'la carga del Castigo Desterrador no ha cambiado');
} catch (e) {
  check(false, `las pruebas de los impactos de los Castigos revientan: ${(e as Error).stack ?? e}`);
}

// ── Magic Missile: one weaving dart per hit, in a quick volley ──────────────
console.log('\n🔮 Proyectil Mágico: dardos que serpentean y caen en arco');
try {
  const sf = await import('../src/fx/spell-fx.ts');
  const cs = await import('../src/fx/card-spells.ts');
  const { SPELLS, spellFrame, spellMarks, spellSignature, MAX_LIVE_SPRITES, SpellSystem } = sf;
  const { CARD_FX, cardSpellKey, hitSpell, volleyTiming } = cs;
  const carta = MAGO.find((d) => d.id === 'proyectil-magico')!;
  const k = cardSpellKey(carta.id, carta.fx);
  const def = SPELLS[k];
  check(!!CARD_FX[carta.id] && !!def && k !== carta.fx, 'Proyectil Mágico tiene su propio efecto');
  check(hitSpell({ id: carta.id, fx: carta.fx }, carta.fx ?? '') === k, 'cada golpe de Proyectil Mágico lanza su dardo');
  check(!!def && def.anchor === 'target' && def.build !== SPELLS[carta.fx ?? '']?.build, 'el dardo se dibuja sobre el objetivo y no reutiliza «estrellas»');
  const firmasOtras = new Set(Object.keys(SPELLS).filter((x) => x !== k).map((x) => spellSignature(x)));
  check(!firmasOtras.has(spellSignature(k)), 'el dardo se ve distinto de los demás efectos');
  check(def.duration >= 0.4 && def.duration <= 1.4, `el dardo dura entre 0,4 y 1,4 s (${def.duration})`);
  const vuelo = def.phases[0] * def.duration;
  check(vuelo >= 0.42 && vuelo <= 0.5, `vuelo corto pero visible: el dardo impacta a los ${Math.round(vuelo * 1000)} ms`);
  check(def.phases[0] < def.phases[1] && def.phases[1] < 1, 'vuelo < impacto < disipación');
  // volley timing: quick, and the feedback waits for the impact
  const r = volleyTiming(k, false)!, rr = volleyTiming(k, true)!;
  check(!!r && r.gapMs >= 130 && r.gapMs <= 180, `los dardos salen en ráfaga, uno tras otro (${r?.gapMs} ms entre ellos)`);
  check(!!r && r.impactMs === Math.round(vuelo * 1000), 'el daño de cada dardo se muestra cuando impacta');
  check(!!rr && rr.gapMs > r.gapMs && rr.impactMs === r.impactMs, 'con movimiento reducido los dardos se espacian para leer cada número');
  check(['estrellas', 'tajo', 'impacto', cardSpellKey('tormenta-venganza', 'raices'), ''].every((x) => volleyTiming(x, false) === null),
    'los demás golpes conservan su ritmo');
  // geometry: born at the caster, weaving, ends in an arc inside the target
  const box = { x: 620, y: 180, w: 150, h: 200 };
  const from = { x: 180, y: 330 };
  const ctx = (seed: number, b = box) => ({ box: b, from, facing: -1 as const, seed });
  const cabeza = (seed: number, b = box) => {
    const pts: { x: number; y: number }[] = [];
    for (let t = 0; t <= vuelo; t += 1 / 240) {
      const m = spellMarks(k, ctx(seed, b), t).find((q) => q.kind === 'dardo');
      if (m) pts.push(m);
    }
    return pts;
  };
  const rumbo = (pts: { x: number; y: number }[]) => pts.slice(1).map((p, i) => Math.atan2(p.y - pts[i].y, p.x - pts[i].x));
  const giros = (a: number[]) => a.slice(1).map((v, i) => { let d = v - a[i]; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; });
  let dentro = 0, serpentea = 0, arco = 0, nace = 0, unImpacto = 0;
  const semillas = [...Array(24).keys()].map((i) => i + 1);
  for (const s of semillas) {
    const pts = cabeza(s);
    if (pts.length && Math.hypot(pts[0].x - from.x, pts[0].y - from.y) < 90) nace++;
    const gi = giros(rumbo(pts));
    const n = gi.length, ida = gi.slice(Math.round(n * 0.05), Math.round(n * 0.6));
    let cambios = 0;
    for (let i = 1; i < ida.length; i++) if (Math.sign(ida[i]) !== Math.sign(ida[i - 1]) && Math.abs(ida[i]) > 1e-4) cambios++;
    if (cambios >= 2) serpentea++;
    const final = gi.slice(Math.round(n * 0.78));
    const total = final.reduce((a, b) => a + b, 0);
    if (Math.abs(total) > 0.25 && final.every((d) => Math.sign(d) === Math.sign(total) || Math.abs(d) < 1e-3)) arco++;
    const impactos: { x: number; y: number; t: number }[] = [];
    for (let t = 0; t <= def.duration; t += 1 / 120) {
      for (const m of spellMarks(k, ctx(s), t)) if (m.kind === 'impacto') impactos.push({ ...m, t });
    }
    if (impactos.length && impactos.every((m) => m.x >= box.x && m.x <= box.x + box.w && m.y >= box.y && m.y <= box.y + box.h)) dentro++;
    if (impactos.length && Math.abs(impactos[0].t - vuelo) < 0.02) unImpacto++;
  }
  check(nace === semillas.length, `los dardos salen del héroe (${nace}/${semillas.length})`);
  check(serpentea === semillas.length, `los dardos serpentean durante el vuelo (${serpentea}/${semillas.length})`);
  check(arco === semillas.length, `los dardos acaban en un arco hacia el enemigo (${arco}/${semillas.length})`);
  check(dentro === semillas.length, `el impacto cae dentro de la caja del objetivo (${dentro}/${semillas.length})`);
  check(unImpacto === semillas.length, `el destello de impacto llega al final del vuelo (${unImpacto}/${semillas.length})`);
  const otraCaja = { x: 900, y: 60, w: 90, h: 120 };
  check(spellMarks(k, ctx(3, otraCaja), vuelo + 0.01).some((m) => m.kind === 'impacto' && m.x >= otraCaja.x && m.x <= otraCaja.x + otraCaja.w && m.y >= otraCaja.y && m.y <= otraCaja.y + otraCaja.h),
    'también acierta a un enemigo pequeño y lejano');
  // deterministic by seed, and each dart flies its own way
  check(JSON.stringify(spellFrame(k, ctx(5), 0.2)) === JSON.stringify(spellFrame(k, ctx(5), 0.2)), 'el dardo es determinista por semilla');
  const a1 = cabeza(1), a2 = cabeza(2);
  const mitad = Math.floor(Math.min(a1.length, a2.length) / 2);
  check(a1.length > 10 && Math.hypot(a1[mitad].x - a2[mitad].x, a1[mitad].y - a2[mitad].y) > 8, 'dos dardos siguen trayectorias distintas');
  // varied routes: some weave above the hero→enemy line and some below, now and then one loops
  const lado = (pts: { x: number; y: number }[]) => {
    const a = pts[0], z = pts[pts.length - 1], dx = z.x - a.x, dy = z.y - a.y, d = Math.hypot(dx, dy) || 1;
    const medio = pts.slice(Math.round(pts.length * 0.15), Math.round(pts.length * 0.6));
    // signed distance to the chord: positive = above it on screen (for a rightward throw)
    const m = medio.reduce((acc, p) => acc + ((p.x - a.x) * dy - (p.y - a.y) * dx) / d, 0) / Math.max(1, medio.length);
    return m > 0 ? 'arriba' : 'abajo';
  };
  const cruza = (pts: { x: number; y: number }[]) => {
    const seg = (p: { x: number; y: number }, q: { x: number; y: number }, r2: { x: number; y: number }, s2: { x: number; y: number }) => {
      const o = (a: typeof p, b: typeof p, c: typeof p) => Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
      return o(p, q, r2) * o(p, q, s2) < 0 && o(r2, s2, p) * o(r2, s2, q) < 0;
    };
    for (let i = 0; i + 1 < pts.length; i++) for (let j = i + 2; j + 1 < pts.length; j++) if (seg(pts[i], pts[i + 1], pts[j], pts[j + 1])) return true;
    return false;
  };
  const rutas = [...Array(24).keys()].map((i) => cabeza(i + 1));
  const lados = rutas.map(lado);
  check(lados.includes('arriba') && lados.includes('abajo'), `hay dardos por arriba y por abajo de la recta (${lados.filter((l) => l === 'arriba').length} arriba, ${lados.filter((l) => l === 'abajo').length} abajo)`);
  const mezcladas = [...Array(22).keys()].every((i) => new Set(lados.slice(i, i + 3)).size === 2);
  check(mezcladas, 'en cualquier ráfaga de tres dardos seguidos se mezclan los dos lados');
  const bucles = rutas.filter(cruza).length;
  check(bucles >= 3 && bucles <= 12, `alguno que otro dardo hace un bucle, no todos (${bucles}/24)`);
  const conBucle = rutas.findIndex(cruza);
  check(conBucle >= 0 && JSON.stringify(cabeza(conBucle + 1)) === JSON.stringify(rutas[conBucle]), 'el bucle es determinista por semilla');
  // on screen: high arcs and loops stay inside the viewport, also near its edges and on phones
  const escenas = [
    { nombre: 'escritorio', view: { w: 800, h: 450 }, from, box },
    { nombre: 'móvil apaisado', view: { w: 640, h: 300 }, from: { x: 80, y: 200 }, box: { x: 520, y: 40, w: 100, h: 130 } },
    { nombre: 'móvil vertical', view: { w: 390, h: 760 }, from: { x: 70, y: 470 }, box: { x: 250, y: 300, w: 120, h: 160 } },
  ];
  for (const e of escenas) {
    let fuera = 0;
    for (let sd = 1; sd <= 30; sd++) {
      for (let t = 0; t <= def.duration; t += 1 / 120) {
        for (const sp of spellFrame(k, { box: e.box, from: e.from, facing: -1, seed: sd, lane: sd % 5, view: e.view }, t)) {
          if (sp.shape === 'disco' && sp.size > 10) continue; // soft glows may bleed over the edge
          if (sp.x < 0 || sp.x > e.view.w || sp.y < 0 || sp.y > e.view.h) fuera++;
        }
      }
    }
    check(fuera === 0, `los dardos no se salen de la pantalla (${e.nombre}: ${fuera} fuera)`);
  }
  // each dart of a volley takes its own lane: the routes spread out instead of bunching up
  const ruta = (seed: number, lane: number) => {
    const pts: { x: number; y: number }[] = [];
    for (let t = vuelo * 0.2; t <= vuelo * 0.75; t += vuelo / 40) {
      const m = spellMarks(k, { box, from, facing: -1, seed, lane, view: { w: 800, h: 450 } }, t).find((q) => q.kind === 'dardo');
      if (m) pts.push(m);
    }
    return pts;
  };
  let peorSeparacion = Infinity;
  for (const n of [3, 4, 5]) {
    for (const base of [1, 17, 40]) {
      const rs = [...Array(n).keys()].map((i) => ruta(base + i, i));
      for (let a = 0; a < n; a++) for (let b2 = a + 1; b2 < n; b2++) {
        const m = Math.min(rs[a].length, rs[b2].length);
        let d = 0;
        for (let i = 0; i < m; i++) d += Math.hypot(rs[a][i].x - rs[b2][i].x, rs[a][i].y - rs[b2][i].y);
        peorSeparacion = Math.min(peorSeparacion, d / Math.max(1, m));
      }
    }
  }
  check(peorSeparacion >= 25, `cada dardo de la ráfaga va por su propio carril (separación media mínima ${Math.round(peorSeparacion)} px)`);
  // the fx system numbers the darts of one volley (lanes 0, 1, 2…) and starts over after a pause
  const sysR = new SpellSystem();
  const cR = { box, from, facing: -1 as const, view: { w: 800, h: 450 } };
  [0, 0.09, 0.18, 2, 2.09].forEach((at, i) => sysR.add(k, { ...cR, seed: 50 + i }, at));
  const esperado = (tt: number) => [[4, 1, 2.09], [3, 0, 2]].flatMap(([i, lane, at]) => spellFrame(k, { ...cR, seed: 50 + i, lane }, tt - at));
  check(JSON.stringify(sysR.frame(2.2)) === JSON.stringify(esperado(2.2)), 'el gestor reparte carriles a los dardos seguidos y reinicia tras una pausa');
  const sysP = new SpellSystem();
  [0, 0.09, 0.18].forEach((at, i) => sysP.add(k, { ...cR, seed: 60 + i }, at));
  const esperadoP = [[2, 2, 0.18], [1, 1, 0.09], [0, 0, 0]].flatMap(([i, lane, at]) => spellFrame(k, { ...cR, seed: 60 + i, lane }, 0.3 - at));
  check(JSON.stringify(sysP.frame(0.3)) === JSON.stringify(esperadoP), 'los tres dardos de una ráfaga toman los carriles 0, 1 y 2');
  const bajo = Math.max(...rutas.map((pts) => Math.max(...pts.map((p) => p.y))));
  check(bajo <= box.y + box.h, `las rutas por abajo no bajan del suelo del objetivo (${Math.round(bajo)} ≤ ${box.y + box.h})`);
  // budget: few sprites per dart, a five-dart volley fits the live cap
  let maximo = 0, roto = 0, rafaga = 0, reducido = 0;
  for (let t = 0; t <= def.duration; t += 1 / 60) {
    const fr = spellFrame(k, ctx(4), t);
    maximo = Math.max(maximo, fr.length);
    reducido = Math.max(reducido, spellFrame(k, { ...ctx(4), reduced: true }, t).length);
    for (const s of fr) if (![s.x, s.y, s.size, s.angle, s.alpha ?? 1].every(Number.isFinite) || s.size <= 0) roto++;
  }
  for (let t = 0; t <= def.duration + 5 * 0.1; t += 1 / 60) {
    let s = 0;
    for (let i = 0; i < 5; i++) s += spellFrame(k, ctx(i + 1), t - (i * r.gapMs) / 1000).length;
    rafaga = Math.max(rafaga, s);
  }
  check(roto === 0, `el dardo solo dibuja elementos válidos (${roto} rotos)`);
  check(maximo > 12 && maximo <= 90 && maximo <= (def.cap ?? 0), `pocas partículas por dardo (${maximo})`);
  check(reducido < maximo, `con movimiento reducido el dardo dibuja menos (${reducido} < ${maximo})`);
  check(rafaga <= MAX_LIVE_SPRITES / 2, `una ráfaga de cinco dardos cabe de sobra en el tope (${rafaga})`);
  check(spellFrame(k, ctx(4), def.duration + 0.01).length === 0, 'el dardo desaparece al terminar');
  // the feedback of each dart waits for its impact; settle() waits for them all
  const { ImpactQueue } = await import('../src/ui/impact-queue.ts');
  const q = new ImpactQueue(() => {});
  const orden: string[] = [];
  const t0 = performance.now();
  q.schedule(40, () => orden.push('a'));
  q.schedule(20, () => orden.push('b'));
  check(q.size === 2 && orden.length === 0, 'el feedback del dardo espera a su impacto');
  await q.settle();
  check(orden.join('') === 'ba' && q.size === 0 && performance.now() - t0 >= 38, 'asentar espera a que lleguen todos los dardos pendientes');
  q.schedule(10, () => { throw new Error('boom'); });
  q.schedule(15, () => orden.push('c'));
  await q.settle();
  check(orden.join('') === 'bac' && q.size === 0, 'un fallo en un impacto no deja la cola colgada');
  await q.settle();
  check(true, 'asentar sin dardos pendientes termina al instante');
} catch (e) {
  check(false, `las pruebas de Proyectil Mágico revientan: ${(e as Error).stack ?? e}`);
}

// ── Eldritch Blast: a thick dart of dark energy along Magic Missile's routes ──
console.log('\n🟣 Explosión Sobrenatural: proyectil de energía oscura en ráfaga');
try {
  const sf = await import('../src/fx/spell-fx.ts');
  const cs = await import('../src/fx/card-spells.ts');
  const { SPELLS, spellFrame, spellMarks, spellSignature, MAX_LIVE_SPRITES } = sf;
  const { CARD_FX, cardSpellKey, hitSpell, volleyTiming } = cs;
  const carta = BRUJO.find((d) => d.id === 'explosion-sobrenatural')!;
  const k = cardSpellKey(carta.id, carta.fx);
  const kM = cardSpellKey('proyectil-magico', 'estrellas');
  const def = SPELLS[k], defM = SPELLS[kM];
  check(!!CARD_FX[carta.id] && !!def && k === 'carta:explosion-sobrenatural', 'Explosión Sobrenatural tiene su propio proyectil');
  check(cardSpellKey('explosion-sobrenatural', 'abisal') === k && hitSpell({ id: carta.id, fx: 'abisal' }, 'abisal') === k,
    'cada golpe «abisal» de la Explosión lanza su proyectil');
  check(hitSpell({ id: 'sacudida-abisal', fx: 'abisal' }, 'abisal') === 'abisal' && hitSpell(null, 'abisal') === 'abisal',
    'el resto de golpes abisales conservan su grieta');
  check(!!def && def.anchor === 'target' && def.build !== SPELLS.abisal.build && def.build !== defM.build,
    'el proyectil se dibuja sobre el objetivo con su propia composición');
  const firmasOtras = new Set(Object.keys(SPELLS).filter((x) => x !== k).map((x) => spellSignature(x)));
  check(!firmasOtras.has(spellSignature(k)), 'el proyectil oscuro se ve distinto de los demás efectos (también del Proyectil Mágico)');
  check(def.duration >= 0.4 && def.duration <= 1.4 && def.phases[0] < def.phases[1] && def.phases[1] < 1,
    `dura entre 0,4 y 1,4 s y va vuelo < impacto < disipación (${def.duration})`);
  // same volley rhythm as Magic Missile: numbers wait for each impact
  const r = volleyTiming(k, false), rM = volleyTiming(kM, false), rr = volleyTiming(k, true);
  check(!!r && !!rM && r.impactMs === rM.impactMs && r.gapMs === rM.gapMs, `sale en ráfaga con el ritmo del Proyectil Mágico (${r?.impactMs} ms de vuelo, ${r?.gapMs} ms entre golpes)`);
  check(!!rr && !!r && rr.gapMs > r.gapMs, 'con movimiento reducido los golpes se espacian');
  check(volleyTiming('abisal', false) === null, 'la grieta abisal genérica conserva su ritmo');
  const vuelo = def.phases[0] * def.duration;
  // the same route: the head follows Magic Missile's path exactly, lane by lane
  const box = { x: 620, y: 180, w: 150, h: 200 }, from = { x: 180, y: 330 }, view = { w: 800, h: 450 };
  const ctx = (seed: number, lane?: number, b = box) => ({ box: b, from, facing: -1 as const, seed, lane, view });
  let igual = 0, total = 0;
  for (let s = 1; s <= 12; s++) {
    for (let t = 0.02; t < vuelo; t += vuelo / 20) {
      const a = spellMarks(k, ctx(s, s % 5), t).find((q) => q.kind === 'dardo');
      const b2 = spellMarks(kM, ctx(s, s % 5), t).find((q) => q.kind === 'dardo');
      total++;
      if (a && b2 && Math.hypot(a.x - b2.x, a.y - b2.y) < 0.5) igual++;
    }
  }
  check(total > 0 && igual === total, `sigue la misma ruta serpenteante que el Proyectil Mágico (${igual}/${total})`);
  let dentro = 0;
  for (let s = 1; s <= 12; s++) {
    const imp = spellMarks(k, ctx(s, s % 5), vuelo + 0.01).find((m) => m.kind === 'impacto');
    if (imp && imp.x >= box.x && imp.x <= box.x + box.w && imp.y >= box.y && imp.y <= box.y + box.h) dentro++;
  }
  check(dentro === 12, `impacta dentro de la caja del objetivo al final del vuelo (${dentro}/12)`);
  // thicker than the magic missile: bolder trail and core
  const grosor = (key: string) => {
    let max = 0, nucleo = 0;
    for (let t = vuelo * 0.3; t < vuelo * 0.9; t += vuelo / 12) {
      for (const sp of spellFrame(key, ctx(3, 0), t)) {
        if (sp.shape === 'capsula') max = Math.max(max, sp.size);
        if (sp.shape === 'capsula' && !sp.glow) nucleo = Math.max(nucleo, sp.size);
      }
    }
    return { max, nucleo };
  };
  const gB = grosor(k), gM = grosor(kM);
  check(gB.max >= gM.max * 1.8, `la estela es mucho más gruesa que la del Proyectil Mágico (${gB.max.toFixed(1)} vs ${gM.max.toFixed(1)} px)`);
  check(gB.nucleo >= gM.nucleo * 2, `el núcleo también es más grueso (${gB.nucleo.toFixed(1)} vs ${gM.nucleo.toFixed(1)} px)`);
  // dark energy: purple and black, with some white flashes
  const rgb = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  let violeta = 0, negro = 0, blanco = 0, otros = 0;
  for (let t = 0; t <= def.duration; t += 1 / 30) {
    for (const sp of spellFrame(k, ctx(5, 1), t)) {
      const [R, G, B] = rgb(sp.colour);
      if (R > 235 && G > 235 && B > 235) blanco++;
      else if (Math.max(R, G, B) < 70) negro++;
      else if (B >= G + 40 && R >= G) violeta++;
      else otros++;
    }
  }
  check(violeta > 0 && negro > 0 && blanco > 0, `violeta, negro y destellos blancos (${violeta} violeta, ${negro} negro, ${blanco} blanco)`);
  check(otros <= (violeta + negro + blanco) * 0.05, `sin colores ajenos a la energía oscura (${otros})`);
  // budget: a volley of five fits easily; reduced motion draws less
  let maximo = 0, roto = 0, reducido = 0, rafaga = 0;
  for (let t = 0; t <= def.duration; t += 1 / 60) {
    const fr = spellFrame(k, ctx(4, 2), t);
    maximo = Math.max(maximo, fr.length);
    reducido = Math.max(reducido, spellFrame(k, { ...ctx(4, 2), reduced: true }, t).length);
    for (const s of fr) if (![s.x, s.y, s.size, s.angle, s.alpha ?? 1, s.stretch ?? 1, s.param ?? 0].every(Number.isFinite) || s.size <= 0 || (s.alpha ?? 1) > 1) roto++;
  }
  for (let t = 0; t <= def.duration + 0.8; t += 1 / 60) {
    let s = 0;
    for (let i = 0; i < 5; i++) s += spellFrame(k, ctx(i + 1, i), t - (i * (r?.gapMs ?? 150)) / 1000).length;
    rafaga = Math.max(rafaga, s);
  }
  check(roto === 0, `solo dibuja elementos válidos (${roto} rotos)`);
  check(maximo > 20 && maximo <= (def.cap ?? 0) && maximo <= 140, `pocas partículas por proyectil (${maximo} ≤ ${def.cap})`);
  check(reducido < maximo, `con movimiento reducido dibuja menos (${reducido} < ${maximo})`);
  check(rafaga <= MAX_LIVE_SPRITES / 2, `una ráfaga de cinco proyectiles cabe de sobra en el tope (${rafaga})`);
  check(spellFrame(k, ctx(4), def.duration + 0.01).length === 0, 'el proyectil desaparece al terminar');
  // on screen also on phones
  const escenas = [
    { nombre: 'móvil apaisado', view: { w: 640, h: 300 }, from: { x: 80, y: 200 }, box: { x: 520, y: 40, w: 100, h: 130 } },
    { nombre: 'móvil vertical', view: { w: 390, h: 760 }, from: { x: 70, y: 470 }, box: { x: 250, y: 300, w: 120, h: 160 } },
  ];
  for (const e of escenas) {
    let fuera = 0;
    for (let sd = 1; sd <= 20; sd++) for (let t = 0; t <= def.duration; t += 1 / 60) {
      for (const sp of spellFrame(k, { box: e.box, from: e.from, facing: -1, seed: sd, lane: sd % 5, view: e.view }, t)) {
        if (sp.shape === 'disco' && sp.size > 10) continue;
        if (sp.x < 0 || sp.x > e.view.w || sp.y < 0 || sp.y > e.view.h) fuera++;
      }
    }
    check(fuera === 0, `el proyectil no se sale de la pantalla (${e.nombre}: ${fuera} fuera)`);
  }
  // in a real fight: every hit of a repeated or area Blast is an «abisal» hit that draws the dart
  const muneco: EnemigoDef = { id: 'muneco-rafaga', nombre: 'Muñeco', arte: '🎯', pv: [300, 300], ia: () => ({ nombre: 'Esperar', intencion: 'desconocido' }) };
  const golpesDe = async (estados: Record<string, number>, n: number) => {
    const golpes: string[] = [];
    const ui: Presentador = { ...uiSilenciosa, fxGolpe: async (obj, _d, fx) => { if (obj !== comb.jugador) golpes.push(hitSpell({ id: carta.id, fx: carta.fx }, fx ?? '')); } };
    const run = nuevaRun('brujo', 7070);
    run.reliquias = [];
    const comb = new Combate(run, Array(n).fill(muneco), crearRng(7070), ui);
    await comb.iniciar();
    Object.assign(comb.jugador.estados, estados);
    const inst = instanciar(carta);
    comb.jugador.mano = [inst];
    comb.jugador.energia = 3;
    await comb.jugarCarta(inst, comb.enemigos[0]);
    return golpes;
  };
  const tres = await golpesDe({ explosionVeces: 2 }, 1);
  check(tres.length === 3 && tres.every((x) => x === k), `con dos golpes extra salen tres proyectiles en ráfaga (${tres.length})`);
  const area = await golpesDe({ explosionArea: 1 }, 3);
  check(area.length === 3 && area.every((x) => x === k), `en área sale un proyectil hacia cada enemigo (${area.length})`);
  const { prodigiousPool } = await import('../src/ui/prodigious-fx.ts');
  check((['basic', 'rare', 'unique', 'dm'] as const).every((t) => !prodigiousPool(t).includes(k)), 'el Conjuro Prodigioso no saca el proyectil de la Explosión');
} catch (e) {
  check(false, `las pruebas del proyectil de la Explosión Sobrenatural revientan: ${(e as Error).stack ?? e}`);
}

// ── Doom chains: they climb the enemy the closer its Condena gets to its health ──
console.log('\n⛓️ Condena: cadenas que trepan según la amenaza');
try {
  const dc = await import('../src/fx/doom-chains.ts');
  const { MAX_LIVE_SPRITES } = await import('../src/fx/spell-fx.ts');
  const {
    doomChainLevel: nivel, DOOM_LEVEL_LETHAL: LETAL, doomChainPath, DOOM_CHAIN_COUNT: N, doomChainSprites,
    DoomChainTracker, MAX_DOOM_CHAIN_SPRITES: TOPE, isDoomConsumption,
  } = dc;
  // ratio → height
  check(nivel(0, 40) === 0 && nivel(-3, 40) === 0, 'sin Condena no hay cadenas');
  check(nivel(1, 60) >= 0.1 && nivel(1, 60) <= 0.25, `con poca Condena asoman alrededor de los pies (${nivel(1, 60).toFixed(2)})`);
  const serie = [2, 6, 10, 14, 18, 19].map((c) => nivel(c, 20));
  check(serie.every((v, i) => i === 0 || v > serie[i - 1]), `cuanto menor es la diferencia entre Condena y PV, más suben (${serie.map((v) => v.toFixed(2)).join(' → ')})`);
  check(nivel(20, 20) === LETAL && LETAL >= 0.88 && LETAL < 1 && nivel(35, 20) === LETAL, `con Condena ≥ PV casi lo cubren por completo (${LETAL})`);
  check(LETAL - nivel(19, 20) >= 0.08, 'la Condena letal se distingue de la que se queda a un punto');
  check(Math.abs(nivel(5, 50) - nivel(1, 10)) < 1e-9, 'depende de la proporción, no de las cifras');
  check(nivel(10, 20) > nivel(10, 30), 'si bajan los PV, las cadenas suben');
  // paths: from the ground, coiled round the target, ending inside it at the level's height
  const box = { x: 600, y: 200, w: 140, h: 180 }, suelo = box.y + box.h, cx = box.x + box.w / 2;
  check(N >= 3 && N <= 5, `${N} cadenas alrededor del enemigo`);
  for (let i = 0; i < N; i++) for (const lv of [0.3, LETAL]) {
    const p = doomChainPath(box, i, lv), base = p[0], punta = p[p.length - 1];
    check(base.y >= suelo - box.h * 0.03 && base.x >= box.x - box.w * 0.1 && base.x <= box.x + box.w * 1.1, `cadena ${i}: brota del suelo bajo el enemigo`);
    check(Math.abs(punta.y - (suelo - lv * box.h)) <= box.h * 0.04 && punta.x >= box.x && punta.x <= box.x + box.w,
      `cadena ${i} al ${Math.round(lv * 100)} %: acaba a esa altura, dentro del enemigo`);
  }
  check([...Array(N).keys()].every((i) => {
    const p = doomChainPath(box, i, LETAL);
    return p.some((q) => q.x < cx - box.w * 0.15) && p.some((q) => q.x > cx + box.w * 0.15);
  }), 'las cadenas se enroscan alrededor del enemigo');
  const corta = doomChainPath(box, 1, 0.4), larga = doomChainPath(box, 1, 0.8);
  check(corta.slice(0, -1).every((q) => larga.some((r) => Math.hypot(r.x - q.x, r.y - q.y) < 0.5)), 'al crecer, los eslabones de abajo no se mueven');
  const apretada = doomChainPath(box, 0, LETAL, 0.6);
  const anchoDe = (l: { x: number }[]) => Math.max(...l.map((q) => q.x)) - Math.min(...l.map((q) => q.x));
  check(anchoDe(apretada) < anchoDe(doomChainPath(box, 0, LETAL)) * 0.8, 'pueden cerrarse sobre el enemigo');
  // the persistent overlay
  const vista = (level: number, lethal = level >= LETAL) => ({ level, lethal, flash: 0, alpha: 1 });
  const fr = (lv: number, extra: { reduced?: boolean; layered?: boolean } = {}, t = 1.3) => doomChainSprites(box, vista(lv), t, extra);
  const cima = (l: { y: number }[]) => Math.min(...l.map((s) => s.y));
  check(cima(fr(0.25)) > cima(fr(0.6)) + box.h * 0.2 && cima(fr(0.6)) > cima(fr(LETAL)) + box.h * 0.1, 'más Condena, cadenas más altas');
  check(cima(fr(LETAL)) <= box.y + box.h * 0.15, 'cuando es letal llegan casi hasta arriba');
  check(cima(fr(0.2)) >= suelo - 0.32 * box.h, 'con poca Condena se quedan abajo');
  let roto = 0, fuera = 0, maximo = 0;
  for (const lv of [0.15, 0.4, 0.7, LETAL]) for (const t of [0, 0.7, 2.1, 5.3]) {
    const l = doomChainSprites(box, { level: lv, lethal: lv >= LETAL, flash: t === 0.7 ? 1 : 0, alpha: 1 }, t, {});
    maximo = Math.max(maximo, l.length);
    for (const s of l) {
      if (![s.x, s.y, s.size, s.angle, s.alpha, s.stretch ?? 1, s.param ?? 0].every(Number.isFinite) || s.size <= 0 || s.alpha > 1 || s.alpha < 0) roto++;
      if (s.x < box.x - box.w * 0.2 || s.x > box.x + box.w * 1.2 || s.y < box.y - box.h * 0.1 || s.y > suelo + box.h * 0.14) fuera++;
    }
  }
  check(roto === 0, `las cadenas solo dibujan elementos válidos (${roto} rotos)`);
  check(fuera === 0, `y se quedan pegadas al enemigo (${fuera} fuera)`);
  check(maximo <= TOPE && TOPE <= 110, `cada enemigo condenado cuesta poco (${maximo} ≤ ${TOPE} elementos)`);
  check(fr(0.6).some((s) => s.front) && fr(0.6).some((s) => !s.front), 'unos eslabones pasan por delante del enemigo y otros por detrás');
  check(fr(LETAL, { reduced: true }).length < fr(LETAL).length, 'con menos partículas, menos elementos');
  const sinCapas = fr(0.6, { layered: false }), conCapas = fr(0.6, { layered: true });
  const alfaDetras = (l: typeof sinCapas) => l.filter((s) => !s.front).reduce((a, s) => a + s.alpha, 0);
  check(alfaDetras(sinCapas) < alfaDetras(conCapas), 'sin escenario WebGL, los eslabones de detrás se atenúan');
  const rgb = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const colores = fr(LETAL).map((s) => rgb(s.colour));
  check(colores.every(([, G, B]) => B >= G - 4) && colores.some(([R, G, B]) => Math.max(R, G, B) < 70) && colores.some(([R, G, B]) => R > 150 && B > 200),
    'cadenas negro-violeta con brillo violeta');
  const brillo = (l: typeof sinCapas) => l.filter((s) => s.glow).reduce((a, s) => a + s.alpha * s.size, 0);
  const latido = [0.2, 0.6, 1.0, 1.4].map((t) => brillo(doomChainSprites(box, vista(LETAL, true), t, {})));
  check(Math.min(...latido) > brillo(doomChainSprites(box, vista(LETAL, false), 0.2, {})) && Math.max(...latido) - Math.min(...latido) > 1,
    'cuando la Condena es letal, las cadenas laten con un brillo violeta');
  check(brillo(doomChainSprites(box, { ...vista(0.5), flash: 1 }, 1, {})) > brillo(doomChainSprites(box, vista(0.5), 1, {})) * 1.3, 'el tañido hace destellar las cadenas');
  check(doomChainSprites(box, { ...vista(0.6), alpha: 0 }, 1, {}).length === 0, 'invisibles no dibujan nada');
  check(maximo * 5 <= MAX_LIVE_SPRITES * 0.6, `cinco enemigos condenados caben en el tope (${maximo * 5})`);
  // the tracker: it survives re-renders, grows smoothly and waits for the toll
  const tr = new DoomChainTracker<string>();
  check(tr.step('nadie', 0) === null, 'sin Condena no hay nada que seguir');
  tr.set('a', 10, 40, 0);
  const obj = nivel(10, 40);
  let prev = 0, salto = 0, llega = NaN, renders = true;
  for (let t = 0; t <= 2.5; t += 1 / 60) {
    if (Math.abs(t - 0.4) < 1 / 120) { const antes = tr.step('a', t)!.level; tr.set('a', 10, 40, t); if (tr.step('a', t)!.level < antes - 1e-9) renders = false; }
    const v = tr.step('a', t)!.level;
    salto = Math.max(salto, Math.abs(v - prev));
    if (Number.isNaN(llega) && Math.abs(v - obj) < 0.01) llega = t;
    prev = v;
  }
  check(salto < 0.04, `las cadenas crecen suaves, sin saltos (${salto.toFixed(3)} por fotograma)`);
  check(llega >= 0.25 && llega <= 1.6, `y se ve cómo suben (${Math.round(llega * 1000)} ms)`);
  check(renders, 'volver a pintar al enemigo no reinicia su crecimiento');
  const antesBajar = tr.step('a', 3)!.level;
  tr.set('a', 10, 12, 3);
  check(Math.abs(tr.step('a', 3.02)!.level - antesBajar) < 0.04 && tr.step('a', 5)!.level > antesBajar + 0.2, 'si le bajan los PV, suben desde donde estaban');
  tr.toll('b', 0.5);
  tr.set('b', 10, 20, 0);
  check(tr.step('b', 0.45)!.level < 0.01 && tr.step('b', 0.9)!.level > 0.05, 'esperan al tañido de la campana para crecer');
  check(tr.step('b', 0.6)!.flash > 0.4 && tr.step('b', 2)!.flash === 0, 'y destellan con él');
  tr.set('c', 20, 20, 0);
  check(tr.step('c', 0.1)!.lethal === false && tr.step('c', 3)!.lethal === true, 'el latido letal llega cuando terminan de subir');
  tr.set('a', 0, 20, 6);
  const quitar = [6.05, 6.3, 6.6].map((t) => tr.step('a', t)?.level ?? 0);
  check(quitar[0] > quitar[1] && quitar[1] > quitar[2], 'si se va la Condena, las cadenas se hunden en el suelo');
  check(tr.step('a', 9) === null && !tr.has('a'), 'y desaparecen');
  tr.drop('c');
  check(tr.step('c', 3.1) === null, 'al morir por Condena, el alma toma el relevo de las cadenas');
  // the chains hug the figure's body, from the ground line up, whatever its rig
  const { bodyScreenBox } = await import('../src/fx/puppet-gpu.ts');
  const { ENEMY_RIGS: rigs } = await import('../src/fx/enemy-rigs.ts');
  const marco = { x: 100, y: 50, w: 140 };
  let malCaja: string[] = [];
  for (const [id, rig] of Object.entries(rigs)) {
    const fb = bodyScreenBox(rig, marco, true), suelo2 = marco.y + (129 / 140) * marco.w;
    const ok = [fb.x, fb.y, fb.w, fb.h].every(Number.isFinite) && fb.w >= marco.w * 0.2 && fb.h >= marco.w * 0.3
      && Math.abs(fb.y + fb.h - suelo2) < marco.w * 0.03 && fb.x >= marco.x - marco.w * 0.6 && fb.x + fb.w <= marco.x + marco.w * 1.6;
    if (!ok) malCaja.push(id);
  }
  check(malCaja.length === 0, `las cadenas abrazan el cuerpo de cada enemigo, desde el suelo ${malCaja.join(', ')}`);
  // the killing blow by Doom shows nothing falling on the target: the death plays its own
  check(isDoomConsumption('condena', false) && !isDoomConsumption('condena', true) && !isDoomConsumption('tajo', false),
    'el golpe con que la Condena remata no lanza ningún efecto encima');
  const fs = await import('node:fs');
  const ui = fs.readFileSync(new URL('../src/ui/combate.ts', import.meta.url), 'utf8');
  check(/isDoomConsumption\(/.test(ui) && /DoomChainTracker/.test(ui), 'el combate sigue las cadenas de cada enemigo y omite el golpe de la Condena');
  check(ui.includes("'campanaCondena'") && ui.includes("'cadenasCondena'"), 'suena la campana al condenar y las cadenas al arrastrar el alma');
} catch (e) {
  check(false, `las pruebas de las cadenas de la Condena revientan: ${(e as Error).stack ?? e}`);
}

// ── Death by Doom: the chains close, the soul tries to flee and is dragged under ──
console.log('\n⛓️ Muerte por Condena: las cadenas arrastran el alma al inframundo');
try {
  const sf = await import('../src/fx/spell-fx.ts');
  await import('../src/fx/card-spells.ts');
  await import('../src/fx/hero-death.ts');
  const dc = await import('../src/fx/doom-chains.ts');
  const { SPELLS, spellFrame, spellMarks, spellSignature, MAX_LIVE_SPRITES, SpellSystem } = sf;
  const { doomSoulPose, doomChainPath, DOOM_LEVEL_LETHAL, DOOM_DRAG_AT, DOOM_CHAIN_COUNT, DOOMED_SOUL_DURATION } = dc;
  const def = SPELLS.almaCondenada;
  check(!!def, 'la muerte por Condena tiene su efecto propio («almaCondenada»)');
  check(def.anchor === 'target', 'se dibuja sobre el enemigo que muere');
  check(def.duration === DOOMED_SOUL_DURATION && def.duration >= 2.2 && def.duration <= 3.2, `dura entre 2,2 y 3,2 s: el arrastre es lento (${def.duration})`);
  check(def.phases[0] > 0 && def.phases[0] < def.phases[1] && def.phases[1] < 1, 'las cadenas lo atrapan < lo arrastran < se cierra el suelo');
  check(Math.abs(DOOM_DRAG_AT - def.phases[1] * def.duration) < 0.02, `el sonido de las cadenas entra con el arrastre (${Math.round(DOOM_DRAG_AT * 1000)} ms)`);
  const otras = Object.keys(SPELLS).filter((x) => x !== 'almaCondenada');
  check(otras.every((x) => SPELLS[x].build !== def.build), 'se compone con su propia función');
  check(!new Set(otras.map((x) => spellSignature(x))).has(spellSignature('almaCondenada')), 'se ve distinta de los demás efectos (también de «muerte», «condena» y el alma del héroe)');
  const box = { x: 600, y: 200, w: 140, h: 180 }, suelo = box.y + box.h, cx = box.x + box.w / 2;
  const ctx = (b = box, seed = 7) => ({ box: b, from: { x: 200, y: 300 }, facing: -1 as const, seed });
  const D = def.duration, tA = def.phases[0] * D, tB = def.phases[1] * D;
  const marcas = (t: number, b = box) => spellMarks('almaCondenada', ctx(b), t);
  // 1. the chains that already surrounded it close on it
  const eslabones = (t: number) => marcas(t).filter((m) => m.kind === 'eslabon');
  const inicio = eslabones(0.01);
  check(inicio.length >= 12, `empieza con las cadenas que ya lo rodeaban (${inicio.length} eslabones)`);
  check(Math.min(...inicio.map((m) => m.y)) <= suelo - (DOOM_LEVEL_LETHAL - 0.06) * box.h, 'a la altura de la Condena letal');
  const caminos = [...Array(DOOM_CHAIN_COUNT).keys()].map((i) => doomChainPath(box, i, DOOM_LEVEL_LETHAL));
  const cerca = (m: { x: number; y: number }) => caminos.some((p) => p.some((q, j) => j > 0 && Math.hypot(q.x - m.x, q.y - m.y) < box.w * 0.08));
  check(inicio.every(cerca), 'en el mismo sitio que las cadenas persistentes: no hay salto');
  const ancho = (l: { x: number }[]) => l.reduce((a, m) => a + Math.abs(m.x - cx), 0) / Math.max(1, l.length);
  check(ancho(eslabones(tA * 0.8)) < ancho(inicio) * 0.8, 'las cadenas se cierran sobre él');
  // 2. a faceless soul rises out and tries to escape
  const alma = (t: number) => marcas(t).find((m) => m.kind === 'alma');
  const primera = [...Array(120).keys()].map((i) => (i / 120) * D).find((t) => !!alma(t));
  check(primera !== undefined && primera < tA + 0.1, 'el alma sale mientras las cadenas lo aprietan');
  const sale = alma(primera!)!;
  check(sale.y > box.y + box.h * 0.2 && sale.y < suelo && Math.abs(sale.x - cx) < box.w * 0.25, 'el alma sale del cuerpo del enemigo');
  const subida = [...Array(40).keys()].map((i) => alma(primera! + ((tB - primera!) * i) / 39)).filter((m) => !!m) as { x: number; y: number }[];
  check(Math.min(...subida.map((m) => m.y)) < box.y + box.h * 0.1, 'sube por encima del enemigo intentando escapar');
  check(Math.max(...subida.map((m) => m.x)) - Math.min(...subida.map((m) => m.x)) >= box.w * 0.15, 'se revuelve a los lados buscando salida');
  const rgb = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  let conCara = 0;
  for (let t = primera!; t < D * 0.9; t += 0.1) {
    const p = doomSoulPose(box, t / D);
    if (p.alpha < 0.2 || p.y > suelo - box.h * 0.15) continue;
    for (const s of spellFrame('almaCondenada', ctx(), t)) {
      if (Math.hypot(s.x - p.x, s.y - p.y) < p.core * 0.9 && Math.max(...rgb(s.colour)) < 110) conCara++;
    }
  }
  check(conCara === 0, `el alma no tiene cara: nada oscuro sobre su cabeza (${conCara})`);
  const coloresAlma = new Set(spellFrame('almaCondenada', ctx(), (primera! + tB) / 2).map((s) => s.colour));
  check(coloresAlma.has('#9fe8ff') && coloresAlma.has('#ffffff'), 'el alma es la misma estela pálida que la del héroe');
  // 3. the chains latch onto it and drag it down, slowly, into the ground
  const grilletes = (t: number) => marcas(t).filter((m) => m.kind === 'grillete');
  const enArrastre = (tB + D) / 2;
  const pM = doomSoulPose(box, enArrastre / D);
  check(grilletes(enArrastre).length >= 2 && grilletes(enArrastre).every((g) => Math.hypot(g.x - pM.x, g.y - pM.y) < pM.halo * 2.5),
    'las cadenas atrapan el alma');
  check(grilletes(primera!).length === 0, 'al principio aún no la sujetan');
  const ys: number[] = [];
  for (let t = tB; t <= D; t += 1 / 30) ys.push(doomSoulPose(box, t / D).y);
  let tirones = 0;
  for (let i = 2; i < ys.length; i++) if (ys[i] < ys[i - 1] - 0.3 && ys[i - 1] >= ys[i - 2] - 0.3) tirones++;
  check(ys[ys.length - 1] >= suelo && ys[0] < suelo - box.h * 0.5, `la arrastran hasta meterla bajo tierra (${Math.round(ys[0])} → ${Math.round(ys[ys.length - 1])})`);
  check(tirones >= 2, `forcejea hacia arriba mientras la arrastran (${tirones} tirones)`);
  const llegaSuelo = [...Array(200).keys()].map((i) => tB + ((D - tB) * i) / 199).find((t) => doomSoulPose(box, t / D).y >= suelo);
  check(llegaSuelo !== undefined && llegaSuelo - tB >= 1.1, `despacio: tarda ${Math.round(((llegaSuelo ?? tB) - tB) * 1000)} ms en hundirse`);
  check(marcas(enArrastre).some((m) => m.kind === 'grieta' && Math.abs(m.y - suelo) < box.h * 0.08), 'se abre una grieta al inframundo bajo el enemigo');
  let bajoTierra = 0;
  for (let t = tB; t <= D; t += 0.05) {
    for (const s of spellFrame('almaCondenada', ctx(), t)) if ((s.colour === '#9fe8ff' || s.colour === '#d8fff0' || s.colour === '#ffffff') && s.y > suelo + box.h * 0.08) bajoTierra++;
  }
  check(bajoTierra === 0, `lo que se hunde bajo tierra deja de verse (${bajoTierra})`);
  check(doomSoulPose(box, 0.5).alpha > 0.7 && doomSoulPose(box, 0.99).alpha < 0.2, 'el alma se desvanece al final');
  // legible at real size
  for (const h of [100, 150, 200]) {
    const b = { x: 300, y: 200, w: h * 0.75, h };
    const p = doomSoulPose(b, (def.phases[0] + def.phases[1]) / 2);
    check(p.core >= h * 0.055 && p.halo >= h * 0.14, `el alma se lee sobre un enemigo de ${h} px (núcleo ${Math.round(p.core)}, halo ${Math.round(p.halo)} px)`);
    const cola = marcas((def.phases[0] + def.phases[1]) / 2 * D, b).find((m) => m.kind === 'almaCola');
    check(!!cola && Math.hypot(cola.x - p.x, cola.y - p.y) >= h * 0.3, `con una estela larga (${Math.round(cola ? Math.hypot(cola.x - p.x, cola.y - p.y) : 0)} px)`);
  }
  // valid, capped, fewer with reduced motion, gone at the end
  let maximo = 0, roto = 0, reducido = 0;
  for (let t = 0; t <= D; t += 1 / 30) {
    const fr = spellFrame('almaCondenada', ctx(), t);
    maximo = Math.max(maximo, fr.length);
    reducido = Math.max(reducido, spellFrame('almaCondenada', { ...ctx(), reduced: true }, t).length);
    for (const s of fr) if (![s.x, s.y, s.size, s.angle, s.alpha ?? 1, s.stretch ?? 1, s.param ?? 0].every(Number.isFinite) || s.size <= 0 || (s.alpha ?? 1) > 1) roto++;
  }
  check(roto === 0, `solo dibuja elementos válidos (${roto} rotos)`);
  check(maximo > 60 && maximo <= (def.cap ?? 220) && maximo <= 260, `tiene cuerpo pero con tope (${maximo})`);
  check(reducido < maximo, `con movimiento reducido dibuja menos (${reducido} < ${maximo})`);
  check(spellFrame('almaCondenada', ctx(), D + 0.01).length === 0, 'desaparece al terminar');
  const cadenas = spellFrame('almaCondenada', ctx(), enArrastre).map((s) => rgb(s.colour)).filter(([R, G, B]) => !(G > 200 && B > 230));
  check(cadenas.length > 10 && cadenas.every(([, G, B]) => B >= G - 4) && cadenas.some(([R, G, B]) => Math.max(R, G, B) < 60), 'cadenas y grieta en la paleta violeta de la condena');
  // three dooms at once still fit the live budget
  const sys = new SpellSystem();
  for (let i = 0; i < 3; i++) sys.add('almaCondenada', { ...ctx({ x: 300 + i * 180, y: 200, w: 140, h: 180 }), seed: i + 1 }, i * 0.1);
  let pico = 0;
  for (let t = 0; t < D + 0.3; t += 1 / 30) pico = Math.max(pico, sys.frame(t).length);
  check(pico <= MAX_LIVE_SPRITES * 0.75, `tres almas condenadas a la vez caben en el tope (${pico})`);
} catch (e) {
  check(false, `las pruebas del alma condenada revientan: ${(e as Error).stack ?? e}`);
}

// ── Actions blend in and out of the idle breathing (no pop at the edges) ─────
console.log('\n🫁 Transición suave entre reposo y acción');
{
  const { puppetPose } = await import('../src/fx/puppet.ts');
  const { HERO_RIGS: H, FORM_RIGS: F } = await import('../src/fx/hero-rig.ts');
  const salto = (rig: any, tipo: 'attack' | 'spell' | 'hit', q: number, t: number) => {
    const a = puppetPose(rig, t, { type: tipo, p: q }).p as any, b = puppetPose(rig, t, null).p as any;
    return Math.max(...['torso', 'head', 'armF', 'armB', 'weapon', 'torsoY'].map((k) => Math.abs((a[k] ?? 0) - (b[k] ?? 0))));
  };
  const figuras = [...Object.values(H), ...Object.values(F)];
  const t = 0.6; // mid-breath, where the old damping jump was largest
  check(figuras.every((r) => salto(r, 'attack', 0, t) < 0.5 && salto(r, 'spell', 0, t) < 0.5), 'al empezar una acción la pose no da un salto respecto al reposo');
  check(figuras.every((r) => salto(r, 'attack', 0.999, t) < 0.8 && salto(r, 'hit', 0.999, t) < 0.8), 'al terminar una acción vuelve al reposo sin salto');
}

// ── Endless animations must not repaint (only transform/opacity) ─────────────
console.log('\n🎞️ Animaciones continuas sin repintado');
{
  const fs = await import('node:fs');
  const malas: string[] = [];
  for (const f of ['combate.css', 'cartas.css', 'movil.css']) {
    const css = fs.readFileSync(new URL(`../src/estilos/${f}`, import.meta.url), 'utf8');
    const infinitas = new Set([...css.matchAll(/animation:\s*([\w-]+)[^;]*infinite/g)].map((m) => m[1]));
    for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^}]*\})*)\s*\}/g)) {
      if (!infinitas.has(m[1])) continue;
      const props = [...m[2].matchAll(/([a-z-]+)\s*:/g)].map((x) => x[1]).filter((x) => !['transform', 'opacity', 'animation-timing-function'].includes(x));
      if (props.length) malas.push(`${m[1]} (${[...new Set(props)].join(', ')})`);
    }
  }
  check(malas.length === 0, `las animaciones que no paran solo mueven transform/opacity (repintaban la mano en cada fotograma) ${malas.join('; ')}`);
}

// ── Game name ────────────────────────────────────────────────────────────────
console.log('\n🐉 Nombre del juego');
{
  const fs = await import('node:fs');
  const leer = (f: string) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
  const sitios = ['index.html', 'vite.config.ts', 'src/ui/titulo.ts', 'src/ui/actualizacion.ts', 'public/sw-avisos.js'];
  check(sitios.every((f) => /Dracs/.test(leer(f)) && !/Mazo y Mazmorra|<span>Mazo<\/span>/.test(leer(f))), 'el juego se llama «Dracs & Rogues» en la portada, la pestaña, el manifest y los avisos');
}

// ── A creature released on death keeps its place (Malachar → Abaddon) ────────
console.log('\n😈 Abaddon no se desplaza');
{
  const { layoutSlots } = await import('../src/ui/enemy-slots.ts');
  const heraldo = { id: 'heraldo', vivo: true }, abaddon = { id: 'abaddon', vivo: true };
  const vivo = (e: { vivo: boolean }) => e.vivo;
  let huecos = layoutSlots([], [heraldo], vivo);
  heraldo.vivo = false;
  huecos = layoutSlots(huecos, [heraldo, abaddon], vivo);
  const tras = huecos.map((e) => e.id).join();
  let estable = true;
  for (let i = 0; i < 5; i++) { const n = layoutSlots(huecos, [heraldo, abaddon], vivo); estable &&= n.map((e) => e.id).join() === tras; huecos = n; }
  check(tras === 'abaddon' && estable, `Abaddon ocupa el sitio del Heraldo y no se mueve en los siguientes renders (${tras})`);
}

// ── Clairvoyance pays off from the next turn, not the moment it is played ────
console.log('\n🔮 Clarividencia');
{
  const clari = MAGO.find((c) => c.nombre === 'Clarividencia')!;
  for (const mejorada of [false, true]) {
    const run = nuevaRun('mago', 21);
    const comb = new Combate(run, [GOBLIN_CORTADOR], () => 0.5, uiSilenciosa);
    await comb.iniciar();
    comb.jugador.energia = 3;
    const inst = { uid: 9100 + Number(mejorada), def: clari, mejorada };
    comb.jugador.mano.push(inst);
    const max = comb.jugador.energiaMax;
    await comb.jugarCarta(inst, undefined);
    check(comb.jugador.energia === 3 - defDe(inst).coste, `Clarividencia${mejorada ? '+' : ''}: al jugarla no da energía en ese turno`);
    comb.enemigos[0].intencion = { nombre: 'Espera', intencion: 'defensa', bloqueo: 1 } as any;
    await comb.terminarTurno();
    check(comb.jugador.energiaMax === max + 1 && comb.jugador.energia === max + 1, `Clarividencia${mejorada ? '+' : ''}: desde el siguiente turno empiezas con 1 de energía más`);
  }
  check(/al inicio de cada turno/i.test(clari.texto), 'el texto dice que la energía llega al inicio de cada turno');
}

// ── Illustrated narrative scenes (src/arte/escenas) ──────────────────────────
console.log('\n🖼️ Escenas ilustradas');
try {
  const fs = await import('node:fs');
  const SA: any = await import('../src/ui/scene-art.ts');
  const dir = new URL('../src/arte/escenas/', import.meta.url);
  const files: string[] = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f: string) => f.endsWith('.svg')) : [];
  const has = (id: string) => files.includes(`${id}.svg`);
  // — every screen or event with art has its SVG —
  const chapterIds = ACTOS.flatMap((acto) => acto.map((cap) => SA.chapterSceneId(cap) as string));
  check(chapterIds.length === 6 && new Set(chapterIds).size === 6 && chapterIds.every((id) => /^capitulo-[a-z-]+$/.test(id)),
    `cada escenario tiene su propia vista de capítulo (${chapterIds.join(', ')})`);
  const eventos = [...EVENTOS_POSITIVOS, ...EVENTOS_NEGATIVOS];
  const eventIds = eventos.map((e) => SA.eventSceneId(e.id) as string);
  const portraits: string[] = SA.PORTRAIT_SCENES ?? [];
  check(['aldric', 'sibila'].every((id) => portraits.includes(id)), 'Aldric y Síbila son retratos verticales');
  const expected = [...portraits, 'taberna', 'campamento', ...chapterIds, ...eventIds];
  const missing = expected.filter((id) => !has(id));
  check(missing.length === 0, `cada pantalla o evento con arte tiene su SVG (${expected.length}) ${missing.slice(0, 8).join(', ')}`);
  check(files.every((f) => expected.includes(f.replace(/\.svg$/, ''))), `no sobran SVG de escenas sin pantalla ${files.filter((f) => !expected.includes(f.replace(/\.svg$/, ''))).join(', ')}`);
  // — SVG validation: viewBox, forbidden elements, weight, well-formed XML —
  const bad: string[] = [];
  for (const f of files) {
    const xml = fs.readFileSync(new URL(f, dir), 'utf8');
    const portrait = portraits.includes(f.replace(/\.svg$/, ''));
    const [viewBox, maxKb] = portrait ? ['0 0 240 300', 24] : ['0 0 320 180', 18];
    const stack: string[] = [];
    let nested = true;
    for (const m of xml.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<(\/?)([a-zA-Z][\w:-]*)[^>]*?(\/?)>/g)) {
      const [, closing, tag, selfClosing] = m;
      if (selfClosing) continue;
      if (closing) { if (stack.pop() !== tag) nested = false; } else stack.push(tag);
    }
    if (!xml.trimStart().startsWith('<svg') || !xml.includes(`viewBox="${viewBox}"`)) bad.push(`${f}: formato`);
    else if (/<(text|image|script)\b/.test(xml) || /href="(?!#)/.test(xml)) bad.push(`${f}: elemento prohibido`);
    else if (xml.length > maxKb * 1024) bad.push(`${f}: ${Math.round(xml.length / 1024)} KB`);
    else if (!nested || stack.length > 0) bad.push(`${f}: XML mal formado`);
  }
  check(files.length > 0 && bad.length === 0, `${files.length} escenas con su viewBox (retratos 240×300, viñetas 320×180), sin elementos prohibidos, dentro de su peso y bien formadas ${bad.slice(0, 5).join(', ')}`);
  // — the loader: the image when drawn, the emoji only as fallback —
  const table = { '../arte/escenas/aldric.svg': '/a/aldric.svg' };
  check(SA.pickSceneArt(table, 'aldric') === '/a/aldric.svg' && SA.pickSceneArt(table, 'sibila') === null, 'la escena se busca por id en la tabla de Vite');
  const withArt: string = SA.sceneFigure('/a/aldric.svg', '🧓', 'bendicion-arte', 'Aldric', true);
  const withoutArt: string = SA.sceneFigure(null, '🧓', 'bendicion-arte', 'Aldric', true);
  check(/<img[^>]+src="\/a\/aldric\.svg"/.test(withArt) && /alt="Aldric"/.test(withArt) && !withArt.includes('🧓') && /escena-retrato/.test(withArt),
    'con imagen se pinta la ilustración (con marco de retrato) y no el emoji');
  check(!/<img/.test(withoutArt) && withoutArt.includes('🧓') && /bendicion-arte/.test(withoutArt), 'sin imagen queda el emoji de respaldo');
  // — the screens use the image and keep the emoji only as fallback —
  const ui = (f: string) => fs.readFileSync(new URL(`../src/ui/${f}`, import.meta.url), 'utf8');
  const bendicion = ui('bendicion.ts'), capitulo = ui('capitulo.ts'), taberna = ui('taberna.ts'), evento = ui('evento.ts'), descanso = ui('recompensa.ts');
  check(/sceneArt\('aldric'/.test(bendicion) && /sceneArt\('sibila'/.test(bendicion) && !/class="bendicion-arte">/.test(bendicion),
    'la bendición muestra a Aldric y a Síbila ilustrados, con el emoji solo de respaldo');
  check(/sceneArt\(chapterSceneId\(cap\)/.test(capitulo), 'el inicio de capítulo muestra la vista de su escenario');
  check(/sceneArt\('taberna'/.test(taberna) && !/taberna-arte">🍺/.test(taberna), 'la taberna muestra su ilustración');
  check(/sceneArt\(eventSceneId\(evento\.id\),\s*evento\.arte/.test(evento) && !/evento-arte">\$\{evento\.arte\}/.test(evento),
    'cada evento muestra su viñeta y usa su emoji solo de respaldo');
  check(/sceneArt\('campamento'/.test(descanso) && !/class="hoguera">🔥/.test(descanso), 'el campamento muestra la hoguera ilustrada');
  // — the frame fits on desktop, 844×390 and 375×812 —
  const css = fs.readFileSync(new URL('../src/estilos/pantallas.css', import.meta.url), 'utf8');
  const movil = fs.readFileSync(new URL('../src/estilos/movil.css', import.meta.url), 'utf8');
  const rule = (src: string, sel: string) => new RegExp(`${sel.replace(/[.]/g, '\\.')}[^{]*\\{[^}]*`).exec(src)?.[0] ?? '';
  check(/border/.test(rule(css, '.escena-img')) && /box-shadow/.test(rule(css, '.escena-img')), 'la ilustración lleva marco y sombra');
  check(/max-height:[^;]*vh/.test(css.split('.escena-img')[1] ?? '') || /max-height:[^;]*(vh|dvh)/.test(rule(css, '.escena-img')), 'la ilustración limita su alto a la pantalla');
  check(/@media[^{]*max-height[^{]*\{[\s\S]*escena-img/.test(movil) && /escena-img/.test(movil),
    'en móvil apaisado y vertical la ilustración se encoge para no empujar los botones');
} catch (err) {
  check(false, `las escenas ilustradas se cargan (${(err as Error).message})`);
}

// ── Epic hero death: slow motion, class burst, soul, tombstone ───────────────
console.log('\n☠️ Muerte épica del héroe');
try {
  const hd = await import('../src/fx/hero-death.ts');
  const sfx = await import('../src/fx/spell-fx.ts');
  const ep = await import('../src/core/epitafio.ts');
  const lp = await import('../src/ui/lapida.ts');
  const { desenlaceCampana } = await import('../src/core/escena-final.ts');
  const fs = await import('node:fs');

  // sequence and timings
  const seq = hd.heroDeathSequence(false);
  const at = (s: typeof seq, id: string) => s.cues.find((c) => c.id === id)?.at ?? NaN;
  check(seq.total >= 2500 && seq.total <= 3500, `la muerte dura entre 2,5 y 3,5 s antes de la derrota (${seq.total} ms)`);
  const pasos = ['golpe', 'caida', 'estallido', 'alma', 'vineta', 'risa', 'gong', 'fin'];
  check(pasos.every((p) => seq.cues.some((c) => c.id === p)), 'la secuencia tiene golpe, caída, estallido, alma, viñeta, risa, gong y fin');
  check(seq.cues.every((c, i) => i === 0 || c.at >= seq.cues[i - 1].at), 'los pasos van en orden de tiempo');
  check(at(seq, 'golpe') === 0 && at(seq, 'fin') === seq.total, 'empieza con el golpe y acaba con el fin');
  check(at(seq, 'caida') <= at(seq, 'estallido') && at(seq, 'estallido') < at(seq, 'alma') && at(seq, 'alma') < seq.total,
    'el héroe cae, estalla su efecto y después sube el alma');
  check(seq.cues.every((c) => c.at >= 0 && c.at <= seq.total), 'ningún paso se sale de la duración total');
  check(!!seq.slowMotion && seq.slowMotion.scale >= 0.2 && seq.slowMotion.scale <= 0.5, 'hay cámara lenta (factor entre 0,2 y 0,5)');
  const escalas = Array.from({ length: 80 }, (_, i) => hd.deathTimeScale(seq, (i / 79) * (seq.total + 500)));
  check(escalas.every((k) => k > 0 && k <= 1), 'el factor de tiempo siempre está entre 0 y 1');
  check(Math.min(...escalas) === seq.slowMotion!.scale, 'el reloj llega a la cámara lenta');
  check(hd.deathTimeScale(seq, seq.total) === 1 && hd.deathTimeScale(seq, seq.total + 100) === 1, 'al pasar a la derrota el reloj vuelve a velocidad normal');
  check(seq.shake === 3 && seq.flash, 'golpe mortal con sacudida fuerte y destello rojo');
  check(seq.vignette.from >= 0 && seq.vignette.from + seq.vignette.ms <= seq.total, 'el viñeteado se cierra antes del final');
  check(hd.realEnd(seq, at(seq, 'caida'), ACTION_DURATION.death) <= seq.total, 'la animación de muerte termina entera, a cámara lenta, antes del final');
  const temas = CLASES.map((c) => hd.heroDeathFx(c));
  for (const [k, desde] of [...temas.map((t) => [t.spell, 'estallido'] as const), [hd.SOUL_SPELL, 'alma'] as const]) {
    check(hd.realEnd(seq, at(seq, desde), sfx.SPELLS[k]?.duration ?? 99) <= seq.total, `«${k}» termina antes de la pantalla de derrota`);
  }

  // reduced motion: short version, no slow motion, no shake
  const red = hd.heroDeathSequence(true);
  check(red.slowMotion === null && red.shake === 0, 'con movimiento reducido no hay cámara lenta ni sacudida');
  check(red.total >= 1000 && red.total < seq.total, `con movimiento reducido es más corta (${red.total} ms)`);
  check(Array.from({ length: 30 }, (_, i) => hd.deathTimeScale(red, i * 100)).every((k) => k === 1), 'con movimiento reducido el reloj no se frena');
  check(red.cues.every((c) => c.at <= red.total) && red.vignette.from + red.vignette.ms <= red.total, 'la versión corta también cierra a tiempo');
  check(pasos.every((p) => red.cues.some((c) => c.id === p)), 'la versión corta conserva todos los pasos');

  // class-themed burst
  check(new Set(temas.map((t) => t.spell)).size === CLASES.length, 'cada clase tiene su propio estallido de muerte');
  check(new Set(temas.map((t) => sfx.SPELLS[t.spell]?.build)).size === CLASES.length, 'cada estallido se compone con su propia función');
  const cajaH = { x: 120, y: 160, w: 140, h: 170 };
  const ctxH = { box: cajaH, facing: 1 as const, seed: 5 };
  const todas = (k: string) => {
    const d = sfx.SPELLS[k];
    const frames: Sprite2[] = [];
    let maximo = 0, roto = 0;
    for (let t = 0; t <= d.duration; t += 1 / 30) {
      const fr = sfx.spellFrame(k, ctxH, t);
      maximo = Math.max(maximo, fr.length);
      for (const s of fr) {
        const a = s.alpha ?? 1;
        if (![s.x, s.y, s.size, s.angle, a].every(Number.isFinite) || a < 0 || a > 1 || s.size <= 0) roto++;
        frames.push(s);
      }
    }
    return { frames, maximo, roto, d };
  };
  type Sprite2 = ReturnType<typeof sfx.spellFrame>[number];
  const esperado: Record<string, (fr: Sprite2[]) => boolean> = {
    barbaro: (fr) => fr.some((s) => s.shape === 'chispa' && /^#ff[89ab]/i.test(s.colour)),
    druida: (fr) => fr.some((s) => s.shape === 'hoja') && fr.some((s) => /#[0-9a-f]{2}[c-f][0-9a-f]/i.test(s.colour) && s.shape === 'disco'),
    mago: (fr) => fr.filter((s) => s.shape === 'runa').length >= 3,
    picaro: (fr) => fr.filter((s) => s.shape === 'colmillo').length >= 3,
    brujo: (fr) => fr.some((s) => /^#(b4|8a|9b|6c|c9)/i.test(s.colour)) && fr.some((s) => s.shape === 'gota' || s.shape === 'capsula'),
    paladin: (fr) => fr.filter((s) => s.shape === 'colmillo' && /^#(ff[cde]|e0a|c9a)/i.test(s.colour)).length >= 3 && fr.some((s) => s.shape === 'anillo'),
  };
  const motivo: Record<string, string> = {
    barbaro: 'brasas', druida: 'hojas y espíritu', mago: 'runas', picaro: 'dagas que caen', brujo: 'llamas violetas', paladin: 'el martillo de luz que se hace añicos',
  };
  CLASES.forEach((c, i) => {
    const k = temas[i].spell;
    const { frames, maximo, roto, d } = todas(k);
    check(!!d && d.duration >= 0.4 && d.duration <= 1.4, `${c}: su estallido dura entre 0,4 y 1,4 s`);
    check(roto === 0 && maximo > 0 && maximo <= sfx.MAX_SPELL_SPRITES, `${c}: elementos válidos y bajo el tope (${maximo})`);
    check(esperado[c](frames), `${c}: el estallido muestra ${motivo[c]}`);
    check(sfx.spellFrame(k, ctxH, d.duration + 0.01).length === 0, `${c}: el estallido desaparece al terminar`);
    check(temas[i].colours.length >= 2, `${c}: el tema de muerte tiene su paleta`);
  });
  check(hd.heroDeathFx('desconocido').spell === temas[0].spell || !!sfx.SPELLS[hd.heroDeathFx('desconocido').spell], 'una clase desconocida tiene un estallido por defecto');
  check(temas.some((t, i) => t.spell !== temas[(i + 1) % temas.length].spell && sfx.spellSignature(t.spell) !== sfx.spellSignature(temas[(i + 1) % temas.length].spell)),
    'los estallidos de clase se ven distintos entre sí');
  // the soul rises
  const alma = sfx.SPELLS[hd.SOUL_SPELL];
  check(!!alma && alma.duration >= 0.4 && alma.duration <= 1.4, 'el alma del héroe tiene su efecto');
  const cy = (t: number) => { const fr = sfx.spellFrame(hd.SOUL_SPELL, ctxH, t); return fr.reduce((m, s) => m + s.y, 0) / Math.max(1, fr.length); };
  check(cy(alma.duration * 0.85) < cy(alma.duration * 0.2) - 30, 'el alma sube desde el cuerpo');
  check(todas(hd.SOUL_SPELL).maximo <= sfx.MAX_SPELL_SPRITES, 'el alma respeta el tope de elementos');
  const reducido = sfx.spellFrame(temas[0].spell, { ...ctxH, reduced: true }, sfx.SPELLS[temas[0].spell].duration * 0.4).length;
  const completo = sfx.spellFrame(temas[0].spell, ctxH, sfx.SPELLS[temas[0].spell].duration * 0.4).length;
  check(reducido < completo, 'con movimiento reducido el estallido lleva menos partículas');

  // the Dungeon Master's ray is a victory: no defeat sequence
  const DMdef = (ENEMIGOS as unknown as Record<string, EnemigoDef>).DUNGEON_MASTER;
  check(hd.playsDefeatSequence('derrota', [GOBLIN_CORTADOR]), 'morir contra un enemigo normal lanza la secuencia de derrota');
  check(!hd.playsDefeatSequence('derrota', [DMdef]), 'el rayo del Dungeon Master no lanza la secuencia de derrota');
  check(!hd.playsDefeatSequence('victoria', [GOBLIN_CORTADOR]) && !hd.playsDefeatSequence('victoria', [DMdef]), 'ganar un combate no lanza la secuencia de derrota');
  check(desenlaceCampana(true, 'derrota').victoria, 'el rayo del DM sigue contando como victoria');

  // epitaph
  const datos = {
    clase: 'barbaro', capitulo: 1, subtitulo: 'Capítulo II', escenario: 'La Cripta', asesino: 'Ogro <Joven>', salas: 7, turnos: 4, semilla: 1234,
  };
  const l = ep.lapida(datos);
  check(/Bárbaro/.test(l.clase), 'la lápida nombra la clase');
  check(/La Cripta/.test(l.lugar) && /Capítulo II/.test(l.lugar), 'la lápida dice el acto y el escenario donde cayó');
  check(!!l.asesino && /Ogro <Joven>/.test(l.asesino), 'la lápida dice quién lo mató');
  check(/7 salas/.test(l.cuenta) && /4 turnos/.test(l.cuenta), 'la lápida cuenta salas y turnos');
  check(ep.EPITAFIOS.length >= 12 && ep.EPITAFIOS.includes('Tiró un 1 en el momento menos oportuno.'), `hay una lista de epitafios con humor negro (${ep.EPITAFIOS.length})`);
  check(ep.lapida(datos).epitafio === l.epitafio, 'el epitafio es estable para la misma partida');
  const distintos = new Set(Array.from({ length: 40 }, (_, i) => ep.lapida({ ...datos, semilla: i * 7919 + 3 }).epitafio));
  check(distintos.size >= 6, `el epitafio cambia de una partida a otra (${distintos.size} distintos)`);
  const sinAsesino = ep.lapida({ ...datos, asesino: null, salas: 1, turnos: 1 });
  check(sinAsesino.asesino === null && /1 sala\b/.test(sinAsesino.cuenta) && /1 turno\b/.test(sinAsesino.cuenta), 'sin asesino no hay línea de asesino, y el singular es correcto');
  check(Array.from({ length: 40 }, (_, i) => ep.lapida({ ...datos, asesino: null, semilla: i }).epitafio).every((e) => !/[{}]/.test(e)),
    'ningún epitafio deja huecos sin rellenar');
  check(Array.from({ length: 40 }, (_, i) => ep.lapida({ ...datos, semilla: i }).epitafio).every((e) => !/[{}]/.test(e)), 'los epitafios con asesino se rellenan');
  check(ep.lapida({ ...datos, turnos: null }).cuenta === '7 salas', 'sin turnos solo cuenta las salas');

  // defeat screen
  const html = lp.htmlDerrota(l);
  const texto = html.replace(/<[^>]+>/g, '');
  check(/class="lapida[" ]/.test(html), 'la pantalla de derrota muestra la lápida');
  check(/HAS CAÍDO/.test(texto) && (html.match(/class="letra"/g) ?? []).length >= 8, 'el título «HAS CAÍDO» va letra a letra para su entrada');
  check(/btn-reintentar[^>]*>[^<]*Volver a intentarlo/.test(html), 'hay botón «Volver a intentarlo»');
  check(/btn-titulo/.test(html), 'se conserva el botón de volver al título');
  check(texto.includes(l.epitafio) && texto.includes('7 salas'), 'la lápida lleva el epitafio y la cuenta');
  check(/caido-silueta/.test(html), 'hay hueco para la silueta del héroe caído');
  check(!/<Joven>/.test(html) && /&lt;Joven&gt;/.test(html), 'los nombres se escapan en el HTML');

  // mobile: only transform/opacity animate, and reduced motion is honoured
  const css = fs.readFileSync(new URL('../src/estilos/muerte.css', import.meta.url), 'utf8');
  const malas: string[] = [];
  for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^}]*\})*)\s*\}/g)) {
    const props = [...m[2].matchAll(/([a-z-]+)\s*:/g)].map((x) => x[1]).filter((x) => !['transform', 'opacity', 'animation-timing-function'].includes(x));
    if (props.length) malas.push(`${m[1]} (${[...new Set(props)].join(', ')})`);
  }
  check(malas.length === 0, `las animaciones de la muerte solo mueven transform/opacity ${malas.join('; ')}`);
  check(/transition[^;]*(box-shadow|filter)/.test(css) === false, 'ninguna transición anima box-shadow ni filter');
  check(/prefers-reduced-motion/.test(css), 'la hoja de la muerte respeta prefers-reduced-motion');
  check(!!EFFECTS.ceniza && EFFECTS.ceniza.gravity > 0 && EFFECTS.ceniza.count <= 2, 'la ceniza cae poco a poco en la pantalla de derrota');
} catch (err) {
  check(false, `la muerte épica se carga (${(err as Error).message})`);
}

// ── Mandatory discards cannot be cancelled (only «descarta hasta X» can) ─────
console.log('\n🗑️ Descartes obligatorios');
{
  const fs = await import('node:fs');
  const todas = [...PICARO, ...MAGO, ...DRUIDA, ...BARBARO, ...BRUJO, ...PALADIN, ...BASICAS];
  const probar = async (id: string) => {
    const def = todas.find((c) => c.id === id)!;
    const run = nuevaRun('picaro', 31);
    const pedidas: boolean[] = [];
    // a player who always tries to cancel
    const ui = { ...uiSilenciosa, elegirCarta: async (_c: any, _t: string, op?: { cancelable?: boolean }) => { pedidas.push(op?.cancelable !== false); return null; } };
    const comb = new Combate(run, [GOBLIN_CORTADOR], () => 0.5, ui as any);
    await comb.iniciar();
    comb.jugador.energia = 5;
    const inst = { uid: 9200, def, mejorada: false };
    comb.jugador.mano.push(inst);
    const antes = comb.jugador.descarte.length;
    await comb.jugarCarta(inst, def.objetivo === 'enemigo' ? comb.enemigos[0] : undefined);
    return { pedidas, descartadas: comb.jugador.descarte.length - antes - (comb.jugador.descarte.includes(inst) ? 1 : 0) };
  };
  const obligatorias = todas.filter((c) => /descarta 1 carta/i.test(c.texto) && !/hasta/i.test(c.texto)).map((c) => c.id);
  check(obligatorias.length >= 2, `hay cartas con descarte obligatorio (${obligatorias.join(', ')})`);
  for (const id of obligatorias) {
    const r = await probar(id);
    check(r.pedidas.length > 0 && r.pedidas.every((c) => !c) && r.descartadas >= 1, `${id}: el descarte no se puede cancelar y siempre se descarta`);
  }
  const hasta = todas.filter((c) => /descarta hasta/i.test(c.texto)).map((c) => c.id);
  for (const id of hasta) {
    const r = await probar(id);
    check(r.pedidas.length > 0 && r.pedidas.every((c) => c) && r.descartadas === 0, `${id}: «descarta hasta» sí deja cancelar`);
  }
  const ui = fs.readFileSync(new URL('../src/ui/combate.ts', import.meta.url), 'utf8');
  check(/cancelable/.test(ui), 'la ventana de elegir carta oculta «Cancelar» cuando no se puede cancelar');
}

// ── Dungeon Master: an exclusive metalcore track ─────────────────────────────
console.log('\n🎸 Música del DM');
{
  const fs = await import('node:fs');
  const mt = await import('../src/fx/music-tracks.ts') as unknown as Record<string, any>;
  const tracks = mt.MUSIC_TRACKS as Record<string, { file: string; loopSamples: number; introSamples?: number }>;
  const dm = tracks['dm'];
  const ruta = (t: string) => new URL(`../src/audio/${tracks[t].file}`, import.meta.url);
  check(!!dm && dm.file === 'dm.mp3' && fs.existsSync(ruta('dm')), 'existe la pista exclusiva del Dungeon Master (dm.mp3)');
  const otros = ['menu', 'cap1', 'cap1-jefe', 'cap2', 'cap2-jefe', 'cap3', 'cap3-jefe'];
  const segundos = (t: string) => (tracks[t].loopSamples + (tracks[t].introSamples ?? 0)) / 44100;
  const bytesPorSegundo = (t: string) => fs.statSync(ruta(t)).size / segundos(t);
  const maxOtros = Math.max(...otros.map(bytesPorSegundo));
  check(!!dm && fs.existsSync(ruta('dm')) && fs.statSync(ruta('dm')).size > 2_000_000 && bytesPorSegundo('dm') <= maxOtros * 1.03,
    'la pista del DM pesa más de 2 MB y no más que las otras a la misma tasa de bits');
  check(!!dm && segundos('dm') >= 120 && segundos('dm') <= 180, 'la pista del DM dura entre 2 y 3 minutos');
  const combatTheme = mt.combatTheme as ((c: number, jefe: boolean, defs: EnemigoDef[]) => string) | undefined;
  const DMdef = (ENEMIGOS as unknown as Record<string, EnemigoDef>).DUNGEON_MASTER;
  check(typeof combatTheme === 'function' && combatTheme(2, true, [DMdef]) === 'dm', 'el combate contra el Dungeon Master suena con su propia pista');
  const sinActoIII = Object.fromEntries(Object.entries(mt.MUSIC_TRACKS as Record<string, unknown>).filter(([k]) => !k.startsWith('cap3-')));
  check(typeof combatTheme === 'function' && combatTheme(0, true, [ENEMIGOS.JEFE_OGRO]) === 'cap1-e0-jefe'
    && mt.combatTheme(2, true, [ENEMIGOS.JEFE_OGRO], 0, sinActoIII) === 'cap3-jefe' && mt.combatTheme(2, false, [ENEMIGOS.JEFE_OGRO], 0, sinActoIII) === 'cap3',
    'los jefes normales y los combates de cada acto siguen con su pista');
  if (dm) {
    const intro = (dm.introSamples ?? 0) / 44100, bucle = dm.loopSamples / 44100;
    const w = loopWindow(intro + bucle + (MP3_DELAY_SAMPLES + 900) / 44100, dm.loopSamples, dm.introSamples ?? 0) as { start: number; end: number; begin?: number };
    check(intro > 0 && Math.abs(w.start - (MP3_DELAY_SAMPLES / 44100 + intro)) < 1e-9 && Math.abs(w.end - w.start - bucle) < 1e-9
      && Math.abs((w.begin ?? -1) - MP3_DELAY_SAMPLES / 44100) < 1e-9, 'la intro atmosférica del DM suena una vez y queda fuera del bucle');
  } else check(false, 'la intro atmosférica del DM suena una vez y queda fuera del bucle');
  const audioSrc = fs.readFileSync(new URL('../src/fx/audio.ts', import.meta.url), 'utf8');
  const chip = /'dm':\s*\{([^}]*)\}/.exec(audioSrc)?.[1] ?? '';
  const bpmChip = Number(/bpm:\s*(\d+)/.exec(chip)?.[1] ?? 0);
  check(bpmChip >= 150 && /bateria:\s*true/.test(chip) && /epico:\s*true/.test(chip), 'hay chiptune agresivo de respaldo para el DM si falla el archivo');
  const combateSrc = fs.readFileSync(new URL('../src/ui/combate.ts', import.meta.url), 'utf8');
  check(/audio\.reproducirTema\(combatTheme\(run\.capitulo, esJefe, defs, run\.escenario\)\)/.test(combateSrc), 'la pantalla de combate elige la música con combatTheme');
  const mainSrc = fs.readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  check(/escenaDM = await pantallaCombate\([^\n]*\n[^\n]*audio\.menu\(\)/.test(mainSrc), 'tras el combate del DM vuelve la música del tema principal');
}

// ── Parchment / cracked-rock card textures (WebGL, rendered once) ────────────
console.log('\n📜 Textura de pergamino');
try {
  const fs = await import('node:fs');
  const T = await import('../src/fx/card-textures.ts');
  const todas = [...DRUIDA, ...BARBARO, ...MAGO, ...PICARO, ...BRUJO, ...PALADIN, ...BASICAS];

  // pure part: variant choice and texture size
  const clases = todas.map((d) => T.textureClassFor(d));
  check(clases.every((c) => /^tex-perg-\d$/.test(c)) && new Set(clases).size === T.PARCHMENT_VARIANTS && T.PARCHMENT_VARIANTS >= 2 && T.PARCHMENT_VARIANTS <= 3,
    `las cartas normales usan pergamino y se reparten entre sus ${T.PARCHMENT_VARIANTS} variantes`);
  check(todas.every((d) => T.textureClassFor(d) === T.textureClassFor({ ...d })), 'la variante de cada carta es siempre la misma (depende de su id)');
  check(MALDICIONES.every((d) => T.textureClassFor(d) === 'tex-roca'), 'las maldiciones usan la textura de roca agrietada');
  const s1 = T.textureSize(1), s3 = T.textureSize(3);
  check(s1.w >= 140 && s3.w === T.textureSize(2).w && s3.w <= 512 && s3.h <= 768 && Math.abs(s3.w / s3.h - 148 / 208) < 0.02,
    `la textura tiene la proporción de la carta y se acota (dpr ≤ 2, ${s3.w}×${s3.h} como máximo)`);

  // generator: one context, one render per variant, cached
  const cuenta = { canvas: 0, ctx: 0, draws: 0, lost: 0, blobs: 0 };
  const vars: Record<string, string> = {};
  const gl = new Proxy({}, {
    get: (_t, k: string) => {
      if (k === 'drawArrays') return () => { cuenta.draws++; };
      if (k === 'getExtension') return (n: string) => (n === 'WEBGL_lose_context' ? { loseContext: () => { cuenta.lost++; } } : null);
      if (k === 'getShaderParameter' || k === 'getProgramParameter') return () => true;
      if (k === 'isContextLost') return () => false;
      if (/^[A-Z_0-9]+$/.test(k)) return 1;
      return () => ({});
    },
  });
  const entorno = (conGl: boolean) => ({
    dpr: 2,
    createCanvas: () => {
      cuenta.canvas++;
      return {
        width: 0, height: 0,
        getContext: () => { cuenta.ctx++; return conGl ? gl : null; },
        toBlob: (cb: (b: Blob | null) => void) => { cuenta.blobs++; cb(new Blob(['x'])); },
      } as unknown as HTMLCanvasElement;
    },
    setVar: (n: string, v: string) => { vars[n] = v; },
    toURL: () => `blob:fake/${cuenta.blobs}`,
  });
  const gen = T.createCardTextureGenerator(entorno(true));
  const r1 = await gen.ensure();
  const r2 = await gen.ensure();
  await gen.ensure();
  check(r1.ok && r1 === r2 && cuenta.canvas === 1 && cuenta.ctx === 1, 'el generador crea un único contexto WebGL y las llamadas repetidas reutilizan el resultado');
  check(cuenta.draws === T.PARCHMENT_VARIANTS + 1 && cuenta.blobs === T.PARCHMENT_VARIANTS + 1, 'se renderiza una sola vez cada variante (pergaminos + roca)');
  check(cuenta.lost === 1, 'libera el contexto WebGL al terminar (WEBGL_lose_context)');
  check(T.TEXTURE_VARS.every((n) => /^url\("blob:fake\/\d+"\)$/.test(vars[n] ?? '')), 'publica cada textura como variable CSS en :root');

  // fallback: no WebGL, and no DOM at all (node)
  for (const k of Object.keys(vars)) delete vars[k];
  const sinGl = await T.createCardTextureGenerator(entorno(false)).ensure();
  check(!sinGl.ok && Object.keys(vars).length === 0, 'sin WebGL no publica texturas: queda el CSS de siempre');
  let sinDom: { ok: boolean } | null = null;
  try { sinDom = await T.ensureCardTextures(); } catch { sinDom = null; }
  check(sinDom !== null && !sinDom.ok, 'sin DOM (tests de node) el generador no revienta');

  // renderCarta never creates a canvas
  const g = globalThis as Record<string, unknown>;
  const previo = { document: g.document, requestAnimationFrame: g.requestAnimationFrame };
  const creados: string[] = [];
  const nodo = (): Record<string, unknown> => {
    const n: Record<string, unknown> = {
      className: '', innerHTML: '', dataset: {}, style: { setProperty: () => {} },
      prepend: () => {}, append: () => {}, querySelector: () => null,
    };
    n.classList = { add: (...c: string[]) => { n.className = `${n.className} ${c.join(' ')}`; } };
    return n;
  };
  g.document = {
    createElement: (tag: string) => { creados.push(tag); return tag === 'canvas' ? { getContext: () => null } : nodo(); },
    documentElement: { style: { setProperty: () => {} } },
    querySelectorAll: () => [],
  };
  g.requestAnimationFrame = () => 0;
  try {
    const { renderCarta } = await import('../src/ui/carta.ts');
    const primera = renderCarta(DRUIDA[0]) as unknown as { className: string };
    const trasPrimera = creados.filter((t) => t === 'canvas').length;
    creados.length = 0;
    const hechas = [...todas.slice(0, 30), ...MALDICIONES].map((d) => renderCarta(d) as unknown as { className: string });
    check(trasPrimera <= 1 && !creados.includes('canvas'), 'renderCarta no crea ningún canvas por carta');
    check(/\btex-perg-\d\b/.test(primera.className) && hechas.slice(30).every((c) => /\btex-roca\b/.test(c.className)),
      'renderCarta marca cada carta con su textura (pergamino o roca)');
  } finally {
    g.document = previo.document;
    g.requestAnimationFrame = previo.requestAnimationFrame;
  }

  // CSS: textures wired through variables, nothing animated in a loop
  const css = fs.readFileSync(new URL('../src/estilos/cartas.css', import.meta.url), 'utf8');
  const regla = (sel: string) => new RegExp(`(^|\\}|\\*\\/)\\s*${sel.replace(/\./g, '\\.')}\\s*\\{([^}]*)\\}`).exec(css)?.[2] ?? '';
  check(/var\(--tex-carta/.test(regla('.carta')) && /background-blend-mode/.test(regla('.carta')), 'las cartas mezclan su textura de pergamino con su color');
  check([...Array(T.PARCHMENT_VARIANTS).keys()].every((i) => new RegExp(`\\.tex-perg-${i}\\s*\\{[^}]*--tex-carta:\\s*var\\(${T.TEXTURE_VARS[i]}[,)]`).test(css)),
    'cada variante de pergamino apunta a su variable CSS');
  check(/var\(--tex-roca/.test(regla('.carta.carta-maldicion')) && !/--tex-carta/.test(regla('.carta.carta-maldicion')), 'las maldiciones pintan la roca, no el pergamino');
  const infinitas = new Set([...css.matchAll(/animation:\s*([\w-]+)[^;]*infinite/g)].map((m) => m[1]));
  const bucles = [...css.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^}]*\})*)\s*\}/g)].filter((m) => infinitas.has(m[1]));
  check(bucles.every((m) => !/(filter|box-shadow|background)[\w-]*\s*:/.test(m[2])) && !/transition[^;]*background/.test(css),
    'ninguna animación en bucle de las cartas toca filter, box-shadow ni background');
  const cartaSrc = fs.readFileSync(new URL('../src/ui/carta.ts', import.meta.url), 'utf8');
  check(!/createElement\(\s*'canvas'|el\(\s*'canvas'|<canvas|OffscreenCanvas/.test(cartaSrc), 'el render de carta no crea canvas en su código');
} catch (e) {
  check(false, `las pruebas de la textura de pergamino revientan: ${(e as Error).stack ?? e}`);
}

// ── Angry glowing eyes on every hero and druid form, as in the card art ─────
console.log('\n👁️ Ojos enfadados');
try {
  const { angryEyeChecks } = await import('./hero-tests/common.ts');
  const { MAX_FIGURE_PIECES } = await import('../src/fx/puppet-gpu.ts');
  // pieces before the eyes: at most 4 more per figure, always under the cap
  const antes: Record<string, number> = {
    druida: 74, barbaro: 52, mago: 51, picaro: 50, brujo: 50, paladin: 52,
    lobo: 33, oso: 31, aguila: 25, enjambre: 84, lunar: 41, estelar: 50,
  };
  const ojos: Record<string, 1 | 2> = {
    druida: 2, barbaro: 2, mago: 2, picaro: 2, brujo: 2, paladin: 2,
    lobo: 1, oso: 1, aguila: 1, enjambre: 2, lunar: 1, estelar: 1,
  };
  const rigs = { ...HERO_RIGS, ...FORM_RIGS } as Record<string, { shapes: unknown[] }>;
  check(Object.keys(rigs).every((id) => id in ojos), 'se revisan los ojos de todos los héroes y formas');
  for (const id of Object.keys(ojos)) {
    angryEyeChecks(check, id as ClaseId, ojos[id]);
    const n = rigs[id].shapes.length;
    check(n <= antes[id] + 4 && n <= MAX_FIGURE_PIECES, `${id}: ${n} piezas con los ojos (antes ${antes[id]}, tope ${MAX_FIGURE_PIECES})`);
  }
  const quieto = heroPose('barbaro', 0.5, null).fx.blink;
  check(!quieto, 'fuera de la muerte los ojos solo parpadean de vez en cuando');
} catch (e) {
  check(false, `las pruebas de los ojos enfadados revientan: ${(e as Error).stack ?? e}`);
}

// ── Druid summons hit harder: Alma de la Manada, Estampida and two relics ──────
console.log('\n🐺 Invocaciones del druida');
{
  const { reliquiaPorId } = await import('../src/core/reliquias.ts');
  const montar = async (clase: ClaseId, ids: string[] = []) => {
    const run = nuevaRun(clase, 778);
    run.reliquias = ids.map((id) => reliquiaPorId(id)).filter((r): r is NonNullable<typeof r> => !!r);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(778), uiSilenciosa);
    await comb.iniciar();
    return { comb };
  };
  const todas = [...DRUIDA];
  const vinculo = todas.find((c) => c.id === 'alma-manada');
  const estampida = todas.find((c) => c.id === 'estampida');
  check(!!vinculo && vinculo.tipo === 'poder' && vinculo.clase === 'druida', 'existe el poder Alma de la Manada');
  check(!!estampida && estampida.tipo === 'ataque' && estampida.clase === 'druida', 'existe el ataque Estampida');
  const golpe = async (reliquias: string[], prep: (comb: Combate) => Promise<void>) => {
    const { comb } = await montar('druida', reliquias);
    const e = comb.enemigos[0]; e.pv = e.pvMax = 300; e.bloqueo = 0;
    await comb.contexto().invocar('lobo', 10); // 30 % of 10 = 3 per hit
    await prep(comb);
    const antes = e.pv;
    await comb.contexto().atacarInvocacion();
    return antes - e.pv;
  };
  if (vinculo && estampida) {
    check(await golpe([], async () => {}) === 3, 'una invocación de 10 de vida pega 3');
    check(await golpe([], async (c) => { await vinculo.jugar(c.contexto()); }) === 6, 'Alma de la Manada: +3 de daño en cada ataque de tu invocación');
    check(await golpe([], async (c) => { await vinculo.mejora!.jugar!(c.contexto()); }) === 8, 'Alma de la Manada+: +5 de daño');
    const { comb } = await montar('druida');
    const e = comb.enemigos[0]; e.pv = e.pvMax = 300; e.bloqueo = 0;
    await estampida.jugar(comb.contexto(e));
    check(e.pv === 300, 'Estampida sin invocación no hace nada');
    await comb.contexto().invocar('lobo', 10);
    await estampida.jugar(comb.contexto(e));
    check(300 - e.pv === 9, 'Estampida: tu invocación ataca 3 veces (3 × 3)');
    e.pv = 300;
    await estampida.mejora!.jugar!(comb.contexto(e));
    check(300 - e.pv === 12, 'Estampida+: ataca 4 veces');
  }
  const collar = reliquiaPorId('collar-alfa');
  const cuerno = reliquiaPorId('cuerno-manada');
  check(collar?.soloClase === 'druida' && cuerno?.soloClase === 'druida', 'Collar del Alfa y Cuerno de la Manada son reliquias del druida');
  if (collar) check(await golpe(['collar-alfa'], async () => {}) === 5, 'Collar del Alfa: los ataques de tu invocación infligen +2');
  if (cuerno) {
    const { comb } = await montar('druida', ['cuerno-manada']);
    await comb.contexto().invocar('lobo', 4);
    check(comb.jugador.invocacion?.vida === 7 && comb.jugador.invocacion?.vidaMax === 7, 'Cuerno de la Manada: cada vez que invocas, +3 de vida');
    await comb.contexto().invocar('oso', 8);
    check(comb.jugador.invocacion?.vida === 18, 'también al hacerla crecer');
  }
  const { comb } = await montar('brujo', ['collar-alfa']);
  const e = comb.enemigos[0]; e.pv = e.pvMax = 300; e.bloqueo = 0;
  await comb.contexto().invocarEfimero('sabueso', 8, 5);
  await comb.contexto().atacarInvocacion();
  check(300 - e.pv === 5, 'el bonus del Alma de la Manada y del Collar no se aplica a las efímeras del brujo');
}

// ── Typography: two families only (Almendra for titles, Philosopher for text) ─
console.log('\n🔤 Tipografía');
{
  const fs = await import('node:fs');
  const leer = (r: string) => fs.readFileSync(new URL(r, import.meta.url), 'utf8');
  const estilos = fs.readdirSync(new URL('../src/estilos/', import.meta.url)).map((f: string) => leer(`../src/estilos/${f}`)).join('\n');
  const base = leer('../src/estilos/base.css');
  const cartasCss = leer('../src/estilos/cartas.css');
  const html = leer('../index.html');
  check(/--fuente-cuerpo:\s*'Philosopher'/.test(base), 'los párrafos usan Philosopher');
  check(/--fuente-titulo:\s*'Almendra SC'/.test(base) && /--fuente-display:\s*'Almendra'/.test(base), 'los títulos siguen en Almendra');
  const familias = new Set([...html.matchAll(/family=([A-Za-z+]+)/g)].map((m) => m[1].replace(/\+SC$/, '')));
  check(familias.size === 2 && familias.has('Almendra') && familias.has('Philosopher'), `solo se cargan dos familias: Almendra y Philosopher (${[...familias].join(', ')})`);
  check(!/Marcellus|Fira|Alegreya|--fuente-pequena/.test(estilos), 'ningún estilo pide otra tipografía (ni Marcellus, ni Fira, ni Alegreya)');
  check(!fs.existsSync(new URL('../src/ui/carta-texto.ts', import.meta.url)) && !/texto-denso/.test(leer('../src/ui/carta.ts') + cartasCss),
    'el texto de todas las cartas usa la misma fuente, tenga una línea o veinticinco');
  check(/\.carta-tipo\s*\{[^}]*var\(--fuente-cuerpo\)/.test(cartasCss), 'el tipo de carta usa la fuente de párrafo');
  // paragraphs that used to inherit Almendra (from a button or a title block)
  const parrafos = ['clase-desc', 'op-detalle', 'titulo-sub', 'bendicion-cura', 'bocadillo-dm',
    'lapida-lugar', 'lapida-asesino', 'lapida-cuenta', 'lapida-epitafio'];
  const reglaCuerpo = (clase: string) => new RegExp(`\\.${clase}\\b[^{]*\\{[^}]*font-family:\\s*var\\(--fuente-cuerpo\\)`).test(estilos)
    || new RegExp(`\\.${clase}\\b[^{]*\\{`).test(estilos) && new RegExp(`[,\\s]\\.${clase}\\b[^{]*\\{[^}]*--fuente-cuerpo`).test(estilos);
  const sinCuerpo = parrafos.filter((c) => !reglaCuerpo(c));
  check(sinCuerpo.length === 0, `todos los párrafos usan Philosopher: descripciones de héroe, de opciones, subtítulos, bocadillos y lápida (faltan: ${sinCuerpo.join(', ') || '—'})`);
}

console.log('\n🎯 Intención = daño real');
{
  const { reliquiaPorId } = await import('../src/core/reliquias.ts');
  const CTI = await import('../src/core/cartas.ts');
  type Mov = EnemigoCombate['intencion'];
  // Every enemy of the game with at least one attack intent (the DM's ray is not damage)
  const defs = (Object.values(ENEMIGOS) as unknown[]).filter(
    (d): d is EnemigoDef => !!d && typeof d === 'object' && typeof (d as EnemigoDef).ia === 'function'
      && !(d as EnemigoDef).dungeonMaster,
  );
  /** Distinct attack intents an enemy can show (a few turns, both boss phases). */
  const ataquesDe = (def: EnemigoDef): Mov[] => {
    const vistos = new Map<string, Mov>();
    for (const seed of [1, 2, 3]) {
      for (const fase of [false, true]) {
        const rng = crearRng(seed);
        const self = ENEMIGOS.crearEnemigo(def, rng);
        if (fase) { self.filacteriaUsada = true; self.pv = 1; }
        for (let t = 0; t < 10; t++) {
          const m = def.ia(t, rng, self, []);
          if (m.dano === undefined || m.mataAlInstante) continue;
          vistos.set(`${m.nombre}|${m.dano}|${m.veces ?? 1}`, { ...m });
        }
      }
    }
    return [...vistos.values()].slice(0, 4);
  };
  type Escenario = {
    nombre: string; clase?: ClaseId; reliquias?: string[];
    /** true when a relic can move damage between block and PV mid-attack */
    soloTotal?: boolean;
    prep?: (c: Combate, e: EnemigoCombate) => Promise<void> | void;
  };
  const raices = (e: EnemigoCombate, n: number) => {
    e.raicesInstancias = [{ cantidad: n, turnos: 1 }];
    e.estados.raices = n;
  };
  const ESC: Escenario[] = [
    { nombre: 'sin nada' },
    { nombre: 'jugador con 1 de Vulnerable', prep: (c) => { c.jugador.estados.vulnerable = 1; } },
    { nombre: 'jugador con 2 de Vulnerable', prep: (c) => { c.jugador.estados.vulnerable = 2; } },
    { nombre: 'jugador con 3 de Vulnerable y bloqueo 5', prep: (c) => { c.jugador.estados.vulnerable = 3; c.jugador.bloqueo = 5; } },
    {
      nombre: 'Marca del Condenado en la mano',
      prep: (c) => { c.jugador.mano.push(instanciar(CTI.cartaPorId('marca-condenado'))); },
    },
    {
      nombre: '1 de Vulnerable y Marca del Condenado en la mano',
      prep: (c) => { c.jugador.estados.vulnerable = 1; c.jugador.mano.push(instanciar(CTI.cartaPorId('marca-condenado'))); },
    },
    { nombre: 'jugador con Débil y Frágil', prep: (c) => { c.jugador.estados.debil = 2; c.jugador.estados.fragil = 2; } },
    { nombre: 'enemigo con 1 de Débil', prep: (_c, e) => { e.estados.debil = 1; } },
    { nombre: 'enemigo con 3 de Fuerza', prep: (_c, e) => { e.estados.fuerza = 3; } },
    { nombre: 'enemigo con 3 de Fuerza y 2 de Débil', prep: (_c, e) => { e.estados.fuerza = 3; e.estados.debil = 2; } },
    { nombre: 'enemigo con 2 de Raíces', prep: (_c, e) => raices(e, 2) },
    { nombre: 'enemigo aplastado por 40 de Raíces', prep: (_c, e) => raices(e, 40) },
    { nombre: 'enemigo con 2 de Oscuridad', prep: (_c, e) => { e.estados.oscuridad = 2; } },
    { nombre: 'enemigo con 40 de Oscuridad', prep: (_c, e) => { e.estados.oscuridad = 40; } },
    {
      nombre: 'Raíces y Oscuridad que juntas anulan el ataque (con Espejismo)',
      prep: (c, e) => {
        const n = e.intencion.dano! - 1;
        raices(e, Math.max(1, Math.floor(n / 2)));
        e.estados.oscuridad = Math.max(1, n - Math.floor(n / 2)) + 1;
        c.jugador.estados.espejismo = 1;
      },
    },
    { nombre: 'bloqueo 7', prep: (c) => { c.jugador.bloqueo = 7; } },
    { nombre: 'bloqueo 999', prep: (c) => { c.jugador.bloqueo = 999; } },
    {
      nombre: 'bloqueo 6, Vulnerable 2 y Fuerza 2 del enemigo',
      prep: (c, e) => { c.jugador.bloqueo = 6; c.jugador.estados.vulnerable = 2; e.estados.fuerza = 2; },
    },
    { nombre: 'invocación del druida (10)', prep: (c) => c.invocar('oso', 10) },
    { nombre: 'bloqueo 4 e invocación (5)', prep: async (c) => { c.jugador.bloqueo = 4; await c.invocar('lobo', 5); } },
    { nombre: 'invocación efímera del brujo (8)', clase: 'brujo', prep: (c) => c.invocarEfimero('sabueso', 8, 4) },
    { nombre: 'Espejismo 1', prep: (c) => { c.jugador.estados.espejismo = 1; } },
    { nombre: 'Espejismo 2 y bloqueo 3', prep: (c) => { c.jugador.estados.espejismo = 2; c.jugador.bloqueo = 3; } },
    { nombre: 'Espinas 3', prep: (c) => { c.jugador.estados.espinas = 3; } },
    { nombre: 'Armadura de Agathys y bloqueo 10', clase: 'brujo', prep: (c) => { c.jugador.estados.agathys = 1; c.jugador.bloqueo = 10; } },
    // its block arrives at the end of the turn, after the forecast: only the total is exact
    { nombre: 'Brazales de Defensa (bloqueo al acabar el turno)', reliquias: ['brazales-defensa'], soloTotal: true },
    { nombre: 'Escudo Centinela y bloqueo 30', reliquias: ['escudo-centinela'], prep: (c) => { c.jugador.bloqueo = 30; } },
    { nombre: 'Colgante de Escarcha y bloqueo 4', clase: 'brujo', reliquias: ['colgante-escarcha'], prep: (c) => { c.jugador.bloqueo = 4; } },
    { nombre: 'Amuleto de Salud', reliquias: ['amuleto-salud'] },
    { nombre: 'Aureola del Mártir', reliquias: ['aureola-martir'], soloTotal: true },
  ];

  let casos = 0;
  const fallosI: string[] = [];
  for (const def of defs) {
    for (const mov of ataquesDe(def)) {
      for (const esc of ESC) {
        casos++;
        let soakInv = 0;
        const ui: Presentador = { ...uiSilenciosa, fxInvocacionGolpe: async (n: number) => { soakInv += n; } };
        const run = nuevaRun(esc.clase ?? 'druida', 4242);
        run.reliquias = (esc.reliquias ?? []).map((id) => reliquiaPorId(id)!);
        run.pvMax = run.pv = 5000;
        const comb = new Combate(run, [def], crearRng(4242), ui);
        await comb.iniciar();
        const j = comb.jugador;
        j.descarte.push(...j.mano);
        j.mano = [];
        j.estados = {};
        j.bloqueo = 0;
        const e = comb.enemigos[0];
        e.pv = e.pvMax = 5000;
        e.estados = {};
        e.raicesInstancias = [];
        e.bloqueo = 0;
        e.saltaAccion = false;
        e.intencion = { ...mov };
        if (e.def.durmiente) e.despierto = true; // a sleeping mimic never attacks: measure it awake
        await esc.prep?.(comb, e);
        // What the player is shown during their turn
        const mostrado = comb.danoIntencion(e);
        const prev = comb.previsionAtaques().get(e);
        // What really happens when this enemy acts
        let medido: { bloqueado: number; pv: number; inv: number; prevenidos: number } | undefined;
        const orig = comb.ejecutarMovimiento.bind(comb);
        comb.ejecutarMovimiento = async (x: EnemigoCombate) => {
          if (x !== e) return orig(x);
          const b0 = comb.danoBloqueadoEsteTurno, r0 = comb.danoRecibidoEsteTurno;
          const esp0 = j.estados.espejismo ?? 0;
          soakInv = 0;
          await orig(x);
          medido = {
            bloqueado: comb.danoBloqueadoEsteTurno - b0,
            pv: comb.danoRecibidoEsteTurno - r0,
            inv: soakInv,
            prevenidos: esp0 - (j.estados.espejismo ?? 0),
          };
        };
        await comb.terminarTurno();
        const veces = mov.veces ?? 1;
        const donde = `${def.nombre} · ${mov.nombre} (${mov.dano}×${veces}) · ${esc.nombre}`;
        if (!medido) { fallosI.push(`${donde}: no llegó a actuar`); continue; }
        const golpes = veces - medido.prevenidos;
        const llega = medido.bloqueado + medido.pv + medido.inv;
        if (mostrado * golpes !== llega) {
          fallosI.push(`${donde}: muestra ${mostrado}×${golpes}, llega ${llega} (bloqueo ${medido.bloqueado}, PV ${medido.pv}, invocación ${medido.inv})`);
          continue;
        }
        if (!prev) { fallosI.push(`${donde}: sin previsión del ataque`); continue; }
        const cuadra = prev.porGolpe === mostrado && prev.veces === veces && prev.prevenidos === medido.prevenidos
          && (esc.soloTotal
            ? prev.bloqueado + prev.pv + prev.invocacion === llega
            : prev.bloqueado === medido.bloqueado && prev.pv === medido.pv && prev.invocacion === medido.inv);
        if (!cuadra) {
          fallosI.push(`${donde}: previsión ${JSON.stringify(prev)} ≠ real ${JSON.stringify(medido)}`);
        }
      }
    }
  }
  for (const f of fallosI.slice(0, 12)) console.error(`    · ${f}`);
  check(fallosI.length === 0,
    `la intención y su desglose coinciden con el golpe real (${casos - fallosI.length}/${casos} casos, ${defs.length} enemigos, ${ESC.length} escenarios)`);

  // Your Vulnerable lasts through the enemy turn: Vol'guth's Life Drain feels it
  {
    const run = nuevaRun('druida', 12);
    run.reliquias = [];
    const comb = new Combate(run, [SENOR_CRIPTA], crearRng(12), uiSilenciosa);
    await comb.iniciar();
    const v = comb.enemigos[0];
    v.intencion = { nombre: 'Drenar Vida', intencion: 'ataque', dano: 15, cura: 9 };
    comb.jugador.estados.vulnerable = 1;
    comb.jugador.bloqueo = 0;
    check(comb.danoIntencion(v) === 22, 'con 1 de Vulnerable la intención lo cuenta (15 × 1,5 = 22)');
    const pv = comb.jugador.pv;
    await comb.terminarTurno();
    check(comb.jugador.pv === pv - 22, 'y el Drenar Vida hace 22, lo anunciado: tu Vulnerable dura hasta el final del turno enemigo');
    check(!comb.jugador.estados.vulnerable, 'y se acaba al terminar el turno del enemigo');
  }

  // Roots plus Darkness that bring the attack to 0 crush it: no 0-damage hit eats a Mirror Image
  {
    const run = nuevaRun('druida', 13);
    run.reliquias = [];
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(13), uiSilenciosa);
    await comb.iniciar();
    const g = comb.enemigos[0];
    g.estados = {};
    g.intencion = { nombre: 'Puñalada', intencion: 'ataque', dano: 6 };
    g.raicesInstancias = [{ cantidad: 3, turnos: 1 }];
    g.estados.raices = 3;
    g.estados.oscuridad = 5;
    comb.jugador.estados.espejismo = 1;
    check(comb.danoIntencion(g) === 0 && comb.previsionAtaques().get(g)?.aplastado === true,
      'Raíces 3 y Oscuridad 5 contra un ataque de 6: la intención anuncia que las raíces lo aplastan');
    const pv = g.pv;
    await comb.terminarTurno();
    check(g.pv === pv - 2 && comb.jugador.estados.espejismo === 1,
      'y lo aplastan: pierde 2 (6 − 3 − 5) y tu Espejismo sigue intacto');
  }

  // Two attackers share the same block: the forecast spends it in turn order
  {
    const golpe = (dano: number): EnemigoDef => ({
      id: 'muneco-intencion', nombre: 'Muñeco', arte: '🎯', pv: [500, 500],
      ia: () => ({ nombre: 'Golpe', intencion: 'ataque', dano }),
    });
    const run = nuevaRun('druida', 11);
    run.reliquias = [];
    const comb = new Combate(run, [golpe(6), golpe(8)], crearRng(11), uiSilenciosa);
    await comb.iniciar();
    comb.jugador.bloqueo = 10;
    const [a, b] = comb.enemigos;
    const p = comb.previsionAtaques();
    check(p.get(a)?.bloqueado === 6 && p.get(a)?.pv === 0 && p.get(b)?.bloqueado === 4 && p.get(b)?.pv === 4,
      'el bloqueo se reparte entre los atacantes en el orden en que actúan');
    const pv = comb.jugador.pv;
    await comb.terminarTurno();
    check(comb.jugador.pv === pv - 4, 'y el golpe real coincide: 6 + 8 contra 10 de bloqueo son 4 PV');
  }
}

// ── Live card numbers: what the card shows is exactly what it does ─────────
console.log('\n🔢 Números calculados');
{
  const { reliquiaPorId } = await import('../src/core/reliquias.ts');
  const { cartaPorId } = await import('../src/core/cartas.ts');
  const { crearEspacios } = await import('../src/core/conjuros.ts');
  const { formatearTexto } = await import('../src/ui/carta.ts');
  const fs = await import('node:fs');
  type Mov = ReturnType<EnemigoDef['ia']>;
  const esperar: Mov = { nombre: 'Esperar', intencion: 'desconocido' };
  const golpear: Mov = { nombre: 'Golpe', intencion: 'ataque', dano: 5 };
  const muneco = (mov: Mov = esperar): EnemigoDef => ({
    id: 'muneco-numeros', nombre: 'Muñeco', arte: '🎯', pv: [500, 500], ia: () => ({ ...mov }),
  });

  /** Combat states the cards are checked in. */
  interface Escenario {
    nombre: string;
    reliquias?: string[];
    mov?: Mov;
    preparar(comb: Combate, e: EnemigoCombate): void | Promise<void>;
  }
  const ESCENARIOS: Escenario[] = [
    { nombre: 'sin modificadores', preparar: () => {} },
    {
      nombre: 'Fuerza 3, Destreza 2 y objetivo Vulnerable',
      preparar: (comb, e) => {
        Object.assign(comb.jugador.estados, { fuerza: 3, destreza: 2 });
        e.estados.vulnerable = 2;
      },
    },
    {
      nombre: 'Débil y Frágil, Fuerza 2 y Destreza -1',
      preparar: (comb) => Object.assign(comb.jugador.estados, { debil: 2, fragil: 2, fuerza: 2, destreza: -1 }),
    },
    {
      nombre: 'reliquias de daño, Furia, Condena, Veneno, invocación y mejoras de clase',
      reliquias: ['corazon-cristal', 'hoja-sedienta'],
      preparar: async (comb, e) => {
        const j = comb.jugador;
        j.pv = j.pvMax - 25; // Hoja Sedienta: +2 per hit
        j.furiaFuerza = 2;
        Object.assign(j.estados, {
          fuerza: 2, destreza: 2, ventajaFurtiva: 3, dagasFuerza: 3, dagasDestreza: 1,
          explosionFuerza: 3, explosionTurno: 2, explosionCrece: 1, explosionVeces: 1,
          formaPotenciada: 1,
        });
        j.conjuroEscrito = 7;
        Object.assign(e.estados, { veneno: 5, condena: 4, hemorragia: 6, vulnerable: 1 });
        comb.descartadasEsteTurno = 2;
        comb.descartadasEsteCombate = 5;
        await comb.contexto().invocarEfimero('sabueso', 9, 5);
        j.mano.push(instanciar(cartaPorId('grilletes')!)); // a curse to offer
      },
    },
    {
      nombre: 'enemigo que va a atacar y bloqueo previo',
      mov: golpear,
      preparar: (comb) => {
        comb.jugador.bloqueo = 4;
        comb.jugador.estados.fuerza = 1;
      },
    },
  ];

  // Cards whose play does not come from their text numbers (dice, summon attacks)
  const SIN_COMPARAR = new Set(['seducir', 'deseo', 'vinculo-feroz', 'estampida']);
  const todas: CartaDef[] = [
    ...BASICAS, ...DRUIDA, ...BARBARO, ...MAGO, ...PICARO, ...BRUJO, ...PALADIN, CONJURO_PRODIGIOSO, DAGA, GOLPE_SAGRADO, DEFENSA_SAGRADA,
  ].filter((d) => !SIN_COMPARAR.has(d.id));

  async function montarNumeros(def: CartaDef, esc: Escenario) {
    const clase = (def.clase === 'neutral' ? 'druida' : def.clase) as ClaseId;
    const run = nuevaRun(clase, 4242);
    run.reliquias = (esc.reliquias ?? []).map((id) => reliquiaPorId(id)!);
    const comb = new Combate(run, [muneco(esc.mov)], crearRng(4242), uiSilenciosa);
    await comb.iniciar();
    const e = comb.enemigos[0];
    e.bloqueo = 0;
    comb.jugador.conjuros = crearEspacios(6); // every spell level is free
    await esc.preparar(comb, e);
    return { comb, e };
  }

  const errores: string[] = [];
  let comprobadas = 0;
  for (const esc of ESCENARIOS) {
    for (const base of todas) {
      for (const mejorada of [false, true]) {
        if (mejorada && !base.mejora) continue;
        const { comb, e } = await montarNumeros(base, esc);
        const inst = instanciar(base);
        inst.mejorada = mejorada;
        const def = defDe(inst);
        const valores = comb.valoresDeCarta(def, e);
        const aplican = valores.filter((v) => v.aplica !== false);
        const suma = (tipos: string[]) =>
          aplican.filter((v) => tipos.includes(v.tipo)).reduce((s, v) => s + v.real * (v.veces ?? 1), 0);
        const danoEsperado = suma(['ataque', 'directo']);
        const bloqueoEsperado = suma(['bloqueo']);
        const estadosAntes = { ...e.estados };
        const pv0 = e.pv, bloqueo0 = comb.jugador.bloqueo;
        comb.jugador.mano.push(inst);
        comb.jugador.energia = 10;
        await comb.jugarCarta(inst, e);
        const hecho = pv0 - e.pv;
        const ganado = comb.jugador.bloqueo - bloqueo0;
        const nombre = `${def.nombre} [${esc.nombre}]`;
        if (hecho !== danoEsperado) errores.push(`${nombre}: muestra ${danoEsperado} de daño y hace ${hecho}`);
        if (ganado !== bloqueoEsperado) errores.push(`${nombre}: muestra ${bloqueoEsperado} de bloqueo y da ${ganado}`);
        for (const v of aplican.filter((x) => x.tipo === 'estado')) {
          const delta = (e.estados[v.estado!] ?? 0) - (estadosAntes[v.estado!] ?? 0);
          if (delta !== v.real) errores.push(`${nombre}: muestra ${v.real} de ${v.estado} y aplica ${delta}`);
        }
        // every live number points at a real number of the text (or at its anchor)
        const numeros = def.texto.match(/\d+/g) ?? [];
        for (const v of valores) {
          const bien = v.indice !== undefined ? v.indice < numeros.length : !!v.tras && def.texto.includes(v.tras);
          if (!bien) errores.push(`${nombre}: un valor no encaja con el texto`);
        }
        comprobadas++;
      }
    }
  }
  for (const err of errores.slice(0, 25)) console.error(`    · ${err}`);
  check(errores.length === 0,
    `en ${comprobadas} jugadas (cada carta y su mejora en ${ESCENARIOS.length} estados) el número mostrado es el efecto real (${errores.length} discrepancias)`);

  // — Special cases, one by one —
  const valor = async (id: string, esc: Escenario, i = 0, mejorada = false) => {
    const d = id === 'daga' ? DAGA : id === 'conjuro-prodigioso' ? CONJURO_PRODIGIOSO : cartaPorId(id)!;
    const { comb, e } = await montarNumeros(d, esc);
    const inst = instanciar(d);
    inst.mejorada = mejorada;
    return comb.valoresDeCarta(defDe(inst), e).filter((v) => v.aplica !== false)[i]?.real;
  };
  const [, fuerte, debil, reliquias, atacante] = ESCENARIOS;
  check(await valor('golpe-demoledor', fuerte) === 22, 'Golpe Demoledor: 6 + 3× Fuerza (3) contra un Vulnerable muestra 22');
  check(await valor('golpe-demoledor', fuerte, 0, true) === 30, 'Golpe Demoledor+: 8 + 4× Fuerza (3) contra un Vulnerable muestra 30');
  check(await valor('postura-firme', fuerte) === 10, 'Postura Firme: 5 + Fuerza (3) + Destreza (2) de bloqueo');
  check(await valor('reflejos-acero', fuerte) === 9, 'Reflejos de Acero: 3 + 3× Destreza (2) de bloqueo');
  check(await valor('reflejos-acero', debil) === 1, 'Reflejos de Acero con Destreza negativa y Frágil no suma el triple de nada');
  check(await valor('zarpa-doble', fuerte) === 9, 'Tormenta de Zarpas: el daño es por golpe (3 + 3 Fuerza, ×1,5)');
  check(await valor('golpe', debil) === 6, 'Golpe con Débil y Fuerza 2: (6 + 2) × 0,75 = 6');
  check(await valor('defender', debil) === 3, 'Defender con Frágil y Destreza -1: (5 - 1) × 0,75 = 3');
  check(await valor('golpe', reliquias) === 24, 'Golpe con Corazón de Cristal, Hoja Sedienta, Oportunista y Fuerza 2 contra un Vulnerable: 24');
  check(await valor('punalada-trapera', reliquias) === 37 && await valor('punalada-trapera', atacante) === 9,
    'Puñalada Trapera suma su extra solo si el enemigo no pretende atacar');
  check(await valor('golpe-septico', reliquias) === 30, 'Golpe Séptico suma el Veneno del objetivo');
  check(await valor('tempestad-acero', reliquias) === 55, 'Tempestad de Acero suma 3 por cada descarte del combate');
  check(await valor('sangre-caliente', reliquias) === 30 && await valor('sangre-caliente', fuerte) === 10,
    'Sangre Caliente muestra como vigente la rama de Furia solo con Furia activa');
  check(await valor('senda-fanatico', reliquias, 1) === 14, 'Senda del Fanático: el bloqueo suma el doble de la Furia');
  check(await valor('forma-lobo', fuerte) === 16, 'Forma de Lobo cuenta la Fuerza que da antes de golpear');
  check(await valor('furia-sanguinaria', fuerte) === 13, 'Furia Sanguinaria cuenta la Fuerza de su Furia');
  check(await valor('conjuro-prodigioso', reliquias) === 40, 'Conjuro Prodigioso: 10 + lo escrito (7), con reliquias y Vulnerable');
  check(await valor('daga', reliquias) === 28, 'Daga: Maestría con Cuchillas y Danza Mortal se suman');
  check(await valor('explosion-sobrenatural', reliquias) === 34, 'Explosión Sobrenatural: mejoras de poder, del turno y la carga que crece al lanzarla');
  check(await valor('ofrenda-maldita', reliquias) === 42 && await valor('ofrenda-maldita', fuerte) === 13,
    'Ofrenda Maldita: con maldición en mano vale la rama grande; sin ella, la pequeña');
  check(await valor('sacrificio-familiar', reliquias) === 18, 'Sacrificio del Familiar: el doble de la vida de la invocación');
  check(await valor('festin-carmesi', reliquias) === 6, 'Festín Carmesí: tanta Fuerza como Hemorragia hay en juego');
  check(await valor('verbo-aniquilacion', reliquias) === 166, 'Verbo de Aniquilación: Condena de un tercio de los PV actuales');
  check(await valor('nube-nauseabunda', reliquias) === 9, 'Nube Nauseabunda: el Veneno que detona (el que había más el nuevo)');
  check(await valor('reabrir-heridas', reliquias, 1) === 6, 'Reabrir Heridas: la Hemorragia que añade al duplicarla');
  check(await valor('escudo-arcano', fuerte) === 36, 'Escudo Arcano: 4 + 3 por cada nivel libre (10) + Destreza');
  check(await valor('proyectil-magico', fuerte) === 2, 'Proyectil Mágico ignora Fuerza y Vulnerable (daño directo)');
  check(await valor('bola-fuego', ESCENARIOS[0]) === 30, 'Bola de Fuego suma su bonus por el nivel del espacio que gastará (3)');

  // — Several enemies: Vulnerable counts only when it is known who takes the hit —
  {
    const run = nuevaRun('druida', 4242);
    const comb = new Combate(run, [muneco(), muneco()], crearRng(4242), uiSilenciosa);
    await comb.iniciar();
    const golpe = cartaPorId('golpe')!;
    comb.enemigos[0].estados.vulnerable = 2;
    check(comb.valoresDeCarta(golpe)[0].real === 6, 'sin objetivo y con enemigos distintos, el daño no supone Vulnerable');
    check(comb.valoresDeCarta(golpe, comb.enemigos[0])[0].real === 9, 'sobre el enemigo Vulnerable, el daño lo incluye');
    comb.enemigos[1].estados.vulnerable = 1;
    check(comb.valoresDeCarta(golpe)[0].real === 9, 'si todos son Vulnerables, se muestra aunque no haya objetivo');
  }

  // — Text: coloured live values, base text outside combat —
  {
    const { comb, e } = await montarNumeros(cartaPorId('golpe-demoledor')!, fuerte);
    const def = cartaPorId('golpe-demoledor')!;
    const html = formatearTexto(def.texto, { valores: comb.valoresDeCarta(def, e) });
    check(html.includes('<span class="val-arriba">22</span>') && html.includes('3×'),
      'el texto pinta 22 en verde y deja el «3×» del texto');
    const { comb: c2 } = await montarNumeros(cartaPorId('golpe')!, debil);
    c2.jugador.estados.fuerza = 0;
    check(formatearTexto('Inflige 6 de daño.', { valores: c2.valoresDeCarta(cartaPorId('golpe')!) }).includes('<span class="val-abajo">4</span>'),
      'un valor que empeora sale en rojo');
    const { comb: c3, e: e3 } = await montarNumeros(cartaPorId('festin-carmesi')!, reliquias);
    const fest = cartaPorId('festin-carmesi')!;
    check(formatearTexto(fest.texto, { valores: c3.valoresDeCarta(fest, e3) }).includes('(6)'),
      'una carta sin número en el texto muestra su valor calculado entre paréntesis');
    check(formatearTexto('Inflige 6 de daño.') === 'Inflige 6 de daño.', 'fuera de combate se ve el valor base');
    const ui = fs.readFileSync(new URL('../src/ui/combate.ts', import.meta.url), 'utf8');
    const zoom = ui.slice(ui.indexOf('function ampliarCarta'), ui.indexOf('function ampliarCarta') + 600);
    check(/renderCarta\(def, modsEnCombate\(/.test(zoom) || /renderCarta\(defDe\(inst\), modsEnCombate\(/.test(zoom),
      'la carta ampliada del combate usa los mismos modificadores que la de la mano');
    // .carta-texto is a grid: without a single wrapper each coloured number would sit on its own row
    const cartaUi = fs.readFileSync(new URL('../src/ui/carta.ts', import.meta.url), 'utf8');
    check((cartaUi.match(/<span class="carta-texto-cuerpo">\$\{formatearTexto\(/g) ?? []).length === 2,
      'el número coloreado sigue en su línea: el texto va envuelto en un solo bloque (al pintar y al apuntar)');
  }
}

// ── Player Vulnerable lasts until the end of the enemy turn ──────────────────
console.log('\n🎯 Vulnerable del jugador');
{
  const fs = await import('node:fs');
  const CTV = await import('../src/core/cartas.ts');
  const montarV = async () => {
    const run = nuevaRun('barbaro', 44);
    run.reliquias = [];
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(44), uiSilenciosa);
    await comb.iniciar();
    comb.jugador.bloqueo = 0;
    comb.enemigos[0].intencion = { nombre: 'Tajo', intencion: 'ataque', dano: 10 } as any;
    return comb;
  };
  {
    const comb = await montarV();
    comb.jugador.estados.vulnerable = 2;
    comb.jugador.estados.debil = 2;
    await comb.terminarTurno();
    check(comb.jugador.estados.vulnerable === 1, 'tu Vulnerable baja 1 al final del turno del enemigo (2 → 1)');
    check(comb.jugador.estados.debil === 1, 'los demás estados siguen bajando al final de tu turno');
  }
  {
    // an enemy that makes you Vulnerable during its turn: it must reach its next hit
    const comb = await montarV();
    const e = comb.enemigos[0];
    e.intencion = { nombre: 'Marcar', intencion: 'perjuicio', aplicar: { estado: 'vulnerable', n: 1 } } as any;
    const orig = (comb as any).ejecutarMovimiento.bind(comb);
    (comb as any).ejecutarMovimiento = async (en: any) => { await orig(en); comb.jugador.estados.vulnerable = (comb.jugador.estados.vulnerable ?? 0) + 1; };
    await comb.terminarTurno();
    check(comb.jugador.estados.vulnerable === 1, 'el Vulnerable que te pone un enemigo en su turno sigue en el siguiente');
    e.intencion = { nombre: 'Tajo', intencion: 'ataque', dano: 10 } as any;
    (comb as any).ejecutarMovimiento = orig;
    comb.jugador.bloqueo = 0;
    check(comb.danoIntencion(e) === 15, 'y amplifica su próximo golpe (10 → 15)');
    const pv = comb.jugador.pv;
    await comb.terminarTurno();
    check(comb.jugador.pv === pv - 15 && !comb.jugador.estados.vulnerable, 'el golpe hace 15 y después el Vulnerable se acaba');
  }
  {
    const comb = await montarV();
    comb.jugador.mazo.push(instanciar(CTV.cartaPorId('marca-condenado')!));
    await comb.contexto().robar(1);
    check(comb.jugador.estados.vulnerable === 1, 'Marca del Condenado: al robarla recibes 1 de Vulnerable');
    check(comb.danoIntencion(comb.enemigos[0]) === 15, 'la intención ya muestra el golpe amplificado');
    const pv = comb.jugador.pv;
    await comb.terminarTurno();
    check(comb.jugador.pv === pv - 15 && !comb.jugador.estados.vulnerable, 'dura el turno del enemigo y se acaba');
  }
  const ui = fs.readFileSync(new URL('../src/ui/combate.ts', import.meta.url), 'utf8');
  check(!/int-neto|Perderás|absorbe/.test(ui), 'la intención muestra el daño del golpe, sin descontar bloqueo ni invocaciones');
}

// ── Card texts: the shown number is the total, the scaling goes in brackets ──
console.log('\n📝 Textos con números calculados');
{
  const CTX = await import('../src/core/cartas.ts');
  const ids = ['postura-firme', 'golpe-demoledor', 'reflejos-acero', 'ataque-sutil', 'golpe-septico', 'tempestad-acero',
    'punalada-trapera', 'emboscada', 'diezmo-sangre', 'escudo-arcano', 'manos-ardientes', 'bola-fuego', 'arma-magica',
    'toque-vampirico', 'escuela-evocacion'];
  for (const id of ids) {
    const def = CTX.cartaPorId(id)!;
    for (const [t, nombre] of [[def.texto, def.nombre], [def.mejora?.texto ?? def.texto, def.nombre + '+']] as const) {
      check(/\(aplica [^)]+\)/.test(t) && !/\d+ más|más \d+×|más tu|\n\+\d+ por|\(\+\d+ por/.test(t),
        `${nombre}: el número es el total y el extra va entre paréntesis «(aplica …)» (${t.replaceAll('\n', ' ')})`);
    }
  }
  const dem = CTX.cartaPorId('golpe-demoledor')!;
  check(/Inflige 6 de daño\s+\(aplica 3× tu Fuerza\)/.test(dem.texto), 'Golpe Demoledor: «Inflige 6 de daño (aplica 3× tu Fuerza)»');
}

// ── A multi-hit attacker killed by Thorns stops hitting ─────────────────────
console.log('\n🌵 Espinas en un multigolpe');
{
  const run = nuevaRun('druida', 55);
  run.reliquias = [];
  const comb = new Combate(run, [GOBLIN_CORTADOR, GOBLIN_CORTADOR], crearRng(55), uiSilenciosa);
  await comb.iniciar();
  const [e] = comb.enemigos;
  e.pv = 5; e.bloqueo = 0;
  e.intencion = { nombre: 'Ráfaga', intencion: 'ataque', dano: 3, veces: 4, aplicar: undefined } as any;
  comb.jugador.estados.espinas = 3;
  comb.jugador.bloqueo = 0;
  const pv = comb.jugador.pv;
  await comb.ejecutarMovimiento(e);
  check(!e.vivo, 'las Espinas matan al atacante a mitad de su ráfaga');
  check(pv - comb.jugador.pv === 6, `su ataque se corta al morir: solo llegan los 2 golpes previos (${pv - comb.jugador.pv} de daño)`);
}

// ── Paladin: Fervor, Smites, holy Strikes and Defends ──────────────────────
console.log('\n🔨 Paladín');
{
  const CT = await import('../src/core/cartas.ts');
  const RQ = await import('../src/core/reliquias.ts');
  const TBn = await import('../src/core/taberna.ts');
  const esperarP: Mov = { nombre: 'Esperar', intencion: 'defensa', bloqueo: 0 } as Mov;
  const dummy = (pv = 300, jefe = false): EnemigoDef => ({
    id: 'muneco-pruebas', nombre: 'Muñeco', arte: '🎯', pv: [pv, pv], esJefe: jefe, ia: () => ({ ...esperarP }),
  });
  async function montarP(defs: EnemigoDef[] = [dummy()], reliquias: string[] = [], clase: ClaseId = 'paladin') {
    const run = nuevaRun(clase, 909);
    run.reliquias = reliquias.map((id) => RQ.reliquiaPorId(id)!);
    const comb = new Combate(run, defs, crearRng(909), uiSilenciosa);
    await comb.iniciar();
    comb.jugador.descarte.push(...comb.jugador.mano);
    comb.jugador.mano = [];
    comb.jugador.energia = 99;
    return { run, comb, ctx: comb.contexto() };
  }
  const jugar = async (comb: Combate, id: string, obj?: any, mejorada = false) => {
    const inst = instanciar(CT.cartaPorId(id)!);
    inst.mejorada = mejorada;
    comb.jugador.mano.push(inst);
    comb.jugador.energia = 99;
    await comb.jugarCarta(inst, obj ?? comb.enemigos.find((e) => e.vivo));
    return inst;
  };
  const fervor = (comb: Combate) => comb.jugador.estados.fervor ?? 0;

  // — new class basics —
  {
    const run = nuevaRun('paladin', 1);
    check(run.pvMax === 76, `el paladín empieza con 76 PV (${run.pvMax})`);
    const ids = run.mazo.map((c) => c.def.id);
    check(run.mazo.length === 11 && ids.includes('castigo-divino') && ids.includes('escudo-fe'),
      'mazo inicial del paladín: 5 Golpe, 4 Defender, Castigo Divino y Escudo de la Fe');
    check(run.reliquias[0]?.id === 'simbolo-sagrado', 'la reliquia inicial del paladín es el Símbolo Sagrado');
    check(CT.poolDeClase('paladin').length >= 25, `el paladín tiene su repertorio de cartas (${CT.poolDeClase('paladin').length})`);
    check(CT.cartaUnicaDeClase('paladin')?.id === 'angel-vengador', 'la carta única del paladín es Ángel Vengador');
    check(!CT.poolDeClase('paladin').some((c) => c.id === 'golpe-sagrado' || c.id === 'defensa-sagrada'),
      'Golpe Sagrado y Defensa Sagrada no salen en las recompensas');
  }

  // — Fervor: every Strike and Defend played gives 1 —
  {
    const { comb } = await montarP();
    await jugar(comb, 'golpe');
    await jugar(comb, 'defender');
    check(fervor(comb) === 2, `cada Golpe y Defensa que juega el paladín le da 1 de Fervor (${fervor(comb)})`);
    await jugar(comb, 'golpe-sagrado');
    await jugar(comb, 'defensa-sagrada');
    check(fervor(comb) === 4, 'Golpe Sagrado y Defensa Sagrada también dan Fervor');
    const otro = await montarP([dummy()], [], 'barbaro');
    await jugar(otro.comb, 'golpe');
    check(fervor(otro.comb) === 0, 'las demás clases no ganan Fervor');
  }

  // — Divine Smite: consumes Fervor, charges the next attack, not a skill —
  {
    const { comb } = await montarP();
    const e = comb.enemigos[0];
    comb.jugador.estados.fervor = 2;
    const pv0 = e.pv;
    await jugar(comb, 'castigo-divino');
    check(fervor(comb) === 0, 'el Castigo consume todo el Fervor');
    check((comb.jugador.estados.castigo ?? 0) === 1, 'el Castigo queda preparado (indicador)');
    check(e.pv === pv0, 'preparar un Castigo no hace daño');
    const golpe = CT.cartaPorId('golpe')!;
    check(comb.valoresDeCarta(golpe, e)[0].real === 20, `el Golpe en la mano muestra el Castigo preparado (${comb.valoresDeCarta(golpe, e)[0].real})`);
    await jugar(comb, 'defender');
    check(comb.jugador.castigos.length === 1, 'una habilidad no descarga el Castigo');
    const antes = e.pv;
    await jugar(comb, 'golpe');
    check(antes - e.pv === 20, `Castigo Divino con 2 de Fervor: el Golpe inflige 6 + 8 + 3×2 = 20 (${antes - e.pv})`);
    check(comb.jugador.castigos.length === 0 && !(comb.jugador.estados.castigo), 'el ataque descarga y gasta el Castigo');
    const d2 = e.pv;
    await jugar(comb, 'golpe');
    check(d2 - e.pv === 6, 'el siguiente ataque ya va sin Castigo');
  }

  // — elemental smites —
  {
    const { comb } = await montarP();
    const e = comb.enemigos[0];
    comb.jugador.estados.fervor = 4;
    await jugar(comb, 'castigo-atronador');
    const cegador = instanciar(CT.cartaPorId('castigo-cegador')!);
    comb.jugador.mano.push(cegador);
    check(!comb.puedeJugar(cegador), 'solo puede haber un Castigo preparado: no se puede cargar otro');
    comb.jugador.mano.pop();
    await jugar(comb, 'golpe');
    check((e.estados.vulnerable ?? 0) === 4, `Castigo Atronador con 4 de Fervor aplica 2 + 2 de Vulnerable (${e.estados.vulnerable})`);
    check(comb.puedeJugar(cegador), 'tras descargarlo se puede preparar el siguiente');
    await jugar(comb, 'castigo-cegador');
    await jugar(comb, 'golpe');
    check((e.estados.debil ?? 0) === 2, 'Castigo Cegador aplica 2 de Débil');
  }
  {
    const { comb } = await montarP([dummy(), dummy(), dummy()]);
    const [a, b, c] = comb.enemigos;
    await jugar(comb, 'castigo-abrasador');
    await jugar(comb, 'golpe', a);
    check(300 - a.pv === 12 && 300 - b.pv === 6 && 300 - c.pv === 6,
      `Castigo Abrasador: el objetivo recibe el Golpe y la llamarada; los demás, la llamarada (${300 - a.pv}/${300 - b.pv}/${300 - c.pv})`);
  }
  {
    const { comb } = await montarP([dummy(18), dummy(300, true)]);
    const [debil, jefe] = comb.enemigos;
    await jugar(comb, 'castigo-desterrador');
    await jugar(comb, 'golpe', debil);
    check(!debil.vivo, 'Castigo Desterrador: si el enemigo queda con 12 PV o menos, lo destierra');
    delete comb.jugador.estados.fervor; // the first Strike gave 1
    await jugar(comb, 'castigo-desterrador');
    const pj = jefe.pv;
    await jugar(comb, 'golpe', jefe);
    check(jefe.vivo && pj - jefe.pv === 18, `contra un jefe, el Destierro inflige su umbral como daño (${pj - jefe.pv})`);
  }
  {
    const { comb } = await montarP();
    comb.jugador.bloqueo = 0;
    await jugar(comb, 'castigo-resplandeciente');
    await jugar(comb, 'golpe');
    check(comb.jugador.bloqueo === 10, `Castigo Resplandeciente: +4 al Golpe y bloqueo igual al daño hecho (${comb.jugador.bloqueo})`);
  }
  {
    const { comb } = await montarP();
    const e = comb.enemigos[0];
    await jugar(comb, 'castigo-atronador');
    const pv0 = e.pv;
    await jugar(comb, 'martillo-juicio');
    check((e.estados.vulnerable ?? 0) === 4 && pv0 - e.pv === 14, 'Martillo del Juicio: los Castigos que descarga se aplican dos veces');
  }

  // — an area attack carries the Smite to every enemy; only the Searing splash lands once —
  {
    const { comb } = await montarP([dummy(), dummy(), dummy()]);
    await jugar(comb, 'castigo-abrasador');
    await jugar(comb, 'expulsar-mal');
    const danos = comb.enemigos.map((e) => 300 - e.pv);
    check(danos.every((d) => d === 16), `Castigo Abrasador + Expulsar el Mal: 10 del ataque y la llamarada una sola vez a cada uno (${danos.join('/')})`);
  }
  {
    const { comb } = await montarP([dummy(), dummy(), dummy()]);
    await jugar(comb, 'castigo-divino');
    await jugar(comb, 'expulsar-mal');
    const danos = comb.enemigos.map((e) => 300 - e.pv);
    check(danos.join() === '18,18,18', `Castigo Divino + ataque de área: el daño extra a cada enemigo (${danos.join('/')})`);
  }
  {
    // the upgrade: 11 plus 4 per Fervor (the same scaling as Castigo Abrasador+)
    const { comb } = await montarP();
    const e = comb.enemigos[0];
    comb.jugador.estados.fervor = 2;
    const div = instanciar(CT.cartaPorId('castigo-divino')!);
    div.mejorada = true;
    comb.jugador.mano.push(div);
    await comb.jugarCarta(div);
    const antes = e.pv;
    await jugar(comb, 'golpe');
    check(antes - e.pv === 6 + 11 + 4 * 2, `Castigo Divino+ con 2 de Fervor: 6 + 11 + 4×2 = 25 (${antes - e.pv})`);
  }
  {
    const { comb } = await montarP([dummy(), dummy()]);
    await jugar(comb, 'castigo-atronador');
    await jugar(comb, 'colera-celestial');
    const vul = comb.enemigos.map((e) => e.estados.vulnerable ?? 0);
    check(vul.join() === '2,2', `Castigo Atronador + Cólera Celestial: Vulnerable a cada enemigo, una vez por enemigo (${vul.join('/')})`);
  }

  {
    const fxs: string[] = [];
    const ui = { ...uiSilenciosa, fxParticulas: async (_o: any, k: string) => { fxs.push(k); } };
    const run = nuevaRun('paladin', 910);
    run.reliquias = [];
    const comb = new Combate(run, [dummy()], crearRng(910), ui);
    await comb.iniciar();
    comb.jugador.mano = [];
    await jugar(comb, 'martillo-luz');
    fxs.length = 0;
    await jugar(comb, 'golpe');
    check(fxs.includes('castigoGenerico') && !fxs.includes('castigoDivino'), `un Castigo genérico se descarga con su efecto propio (${fxs.join(',')})`);
    await jugar(comb, 'castigo-divino');
    fxs.length = 0;
    await jugar(comb, 'golpe');
    check(fxs.includes('castigoDivino'), 'el Castigo Divino se descarga con el suyo');
  }

  // — holy Strike and Defend —  // — holy Strike and Defend —
  {
    const { comb } = await montarP();
    const e = comb.enemigos[0];
    let pv0 = e.pv;
    await jugar(comb, 'golpe-sagrado');
    check(pv0 - e.pv === 14, 'Golpe Sagrado inflige 14');
    pv0 = e.pv;
    await jugar(comb, 'golpe-sagrado', e, true);
    check(pv0 - e.pv === 20, 'Golpe Sagrado+ inflige 20');
    comb.jugador.bloqueo = 0;
    await jugar(comb, 'defensa-sagrada');
    check(comb.jugador.bloqueo === 11, 'Defensa Sagrada da 11 de bloqueo');
    await jugar(comb, 'defensa-sagrada', undefined, true);
    check(comb.jugador.bloqueo === 27, 'Defensa Sagrada+ da 16 de bloqueo');
    check(CT.cartaPorId('golpe-sagrado')!.coste === 1 && CT.cartaPorId('defensa-sagrada')!.coste === 1, 'los dos cuestan 1');
  }

  // — Holy Symbol: removing a Strike or Defend turns it holy —
  {
    const run = nuevaRun('paladin', 3);
    const golpe = run.mazo.find((c) => c.def.id === 'golpe')!;
    golpe.mejorada = true;
    const n = run.mazo.length;
    const r = TBn.eliminarCarta(run, golpe);
    const sagrado = run.mazo.find((c) => c.def.id === 'golpe-sagrado');
    check(!!r && run.mazo.length === n && !!sagrado && !run.mazo.includes(golpe),
      'Símbolo Sagrado: al eliminar un Golpe en la taberna, se convierte en Golpe Sagrado');
    check(sagrado?.mejorada === true, 'la versión sagrada conserva la mejora');
    const def = run.mazo.find((c) => c.def.id === 'defender')!;
    TBn.eliminarCarta(run, def);
    check(run.mazo.some((c) => c.def.id === 'defensa-sagrada'), 'al eliminar un Defender, se convierte en Defensa Sagrada');
    const castigo = run.mazo.find((c) => c.def.id === 'castigo-divino')!;
    TBn.eliminarCarta(run, castigo);
    check(run.mazo.length === n - 1, 'las demás cartas se eliminan normalmente');
    const sin = nuevaRun('barbaro', 3);
    const m = sin.mazo.length;
    TBn.eliminarCarta(sin, sin.mazo.find((c) => c.def.id === 'golpe')!);
    check(sin.mazo.length === m - 1 && !sin.mazo.some((c) => c.def.id === 'golpe-sagrado'), 'sin el Símbolo, eliminar un Golpe lo quita');
  }

  // — Shield of Faith spends the Fervor on block; Hammer of Light leaves a Smite —
  {
    const { comb } = await montarP();
    comb.jugador.estados.fervor = 3;
    comb.jugador.bloqueo = 0;
    check(comb.valoresDeCarta(CT.cartaPorId('escudo-fe')!)[0].real === 14, 'Escudo de la Fe muestra 5 + 3×3 de bloqueo');
    await jugar(comb, 'escudo-fe');
    check(comb.jugador.bloqueo === 14 && fervor(comb) === 0, `Escudo de la Fe: 5 de bloqueo más 3 por Fervor gastado (${comb.jugador.bloqueo})`);
    const mas = instanciar(CT.cartaPorId('escudo-fe')!);
    mas.mejorada = true;
    comb.jugador.estados.fervor = 3;
    comb.jugador.bloqueo = 0;
    comb.jugador.mano.push(mas);
    await comb.jugarCarta(mas);
    check(comb.jugador.bloqueo === 7 + 4 * 3, `Escudo de la Fe+: 7 más 4 por Fervor gastado (${comb.jugador.bloqueo})`);
  }
  {
    const { comb } = await montarP();
    const e = comb.enemigos[0];
    comb.jugador.estados.fervor = 2;
    let pv0 = e.pv;
    await jugar(comb, 'martillo-luz');
    check(pv0 - e.pv === 7 && fervor(comb) === 2, 'Martillo de Luz inflige 7 y no toca el Fervor');
    check(comb.jugador.castigos.length === 1, 'Martillo de Luz deja preparado un Castigo');
    pv0 = e.pv;
    await jugar(comb, 'golpe');
    check(pv0 - e.pv === 10, 'el siguiente ataque descarga los 4 de Martillo de Luz (6 + 4)');
    await jugar(comb, 'castigo-atronador');
    pv0 = e.pv;
    await jugar(comb, 'martillo-luz');
    check((e.estados.vulnerable ?? 0) >= 2 && comb.jugador.castigos.length === 1,
      'Martillo de Luz descarga los Castigos que había y prepara el suyo después');
  }

  // — powers —
  {
    const { comb } = await montarP();
    await jugar(comb, 'juramento-venganza');
    const cd = CT.cartaPorId('castigo-desterrador')!;
    check(comb.costeEfectivo(cd) === 0, 'Juramento de Venganza: tus Castigos cuestan 0');
    check(comb.costeEfectivo(CT.cartaPorId('golpe')!) === 1, 'Juramento de Venganza no abarata lo demás');
  }
  {
    const { comb } = await montarP();
    const e = comb.enemigos[0];
    await jugar(comb, 'juramento-devocion');
    comb.jugador.estados.fervor = 3;
    const pv0 = e.pv;
    await jugar(comb, 'golpe-sagrado');
    check(pv0 - e.pv === 17 && fervor(comb) === 4, `Juramento de Devoción: los ataques suman tu Fervor sin gastarlo (${pv0 - e.pv})`);
  }
  {
    const { comb } = await montarP();
    const e = comb.enemigos[0];
    await jugar(comb, 'arma-consagrada');
    const pv0 = e.pv;
    await jugar(comb, 'golpe');
    check(pv0 - e.pv === 9, 'Arma Consagrada: tus Golpes infligen 3 más');
    check(comb.valoresDeCarta(CT.cartaPorId('golpe')!, e)[0].real === 9, 'el Golpe lo muestra en su texto');
    await jugar(comb, 'egida-divina');
    comb.jugador.bloqueo = 0;
    await jugar(comb, 'defender');
    check(comb.jugador.bloqueo === 8, 'Égida Divina: tus Defensas dan 3 más');
  }
  {
    const { comb } = await montarP();
    await jugar(comb, 'bastion-fe');
    comb.jugador.bloqueo = 25;
    await comb.terminarTurno();
    check(comb.jugador.bloqueo === 10, `Bastión de Fe: conservas hasta 10 de bloqueo (${comb.jugador.bloqueo})`);
  }
  {
    const { comb } = await montarP();
    await jugar(comb, 'celo-inquebrantable');
    const f0 = fervor(comb);
    await comb.terminarTurno();
    check(fervor(comb) === f0 + 1, 'Celo Inquebrantable: +1 de Fervor al inicio de cada turno');
  }
  {
    const { comb } = await montarP();
    await jugar(comb, 'juramento-antiguos');
    comb.jugador.estados.fervor = 3;
    comb.jugador.bloqueo = 0;
    comb.enemigos[0].intencion = { nombre: 'Golpe', intencion: 'ataque', dano: 4 };
    const pv0 = comb.jugador.pv;
    await comb.terminarTurno();
    check(pv0 - comb.jugador.pv === 1, 'Juramento de los Antiguos: al final del turno ganas 1 de bloqueo por Fervor (3 de los 4 del golpe enemigo)');
  }
  {
    const { comb } = await montarP();
    await jugar(comb, 'juramento-gloria');
    const f0 = comb.jugador.estados.fuerza ?? 0;
    await jugar(comb, 'castigo-divino');
    await jugar(comb, 'golpe');
    check((comb.jugador.estados.fuerza ?? 0) === f0 + 1, 'Juramento de Gloria: cada Castigo descargado da 1 de Fuerza');
  }
  {
    const { comb } = await montarP([dummy(), dummy()]);
    await jugar(comb, 'palabra-radiante');
    check(fervor(comb) === 2 && comb.enemigos.every((e) => e.pv === 295), 'Palabra Radiante: 5 a todos y 1 de Fervor por enemigo');
    await jugar(comb, 'expulsar-mal');
    check(comb.enemigos.every((e) => e.pv === 285 && (e.estados.debil ?? 0) === 1), 'Expulsar el Mal: 10 a todos y 1 de Débil');
  }
  {
    const { comb } = await montarP();
    comb.jugador.mano = [instanciar(CT.cartaPorId('golpe')!), instanciar(CT.cartaPorId('defender')!), instanciar(CT.cartaPorId('castigo-divino')!)];
    comb.jugador.bloqueo = 0;
    await jugar(comb, 'muro-fe');
    check(comb.jugador.bloqueo === 8, 'Muro de Fe: 4 de bloqueo por cada Golpe y Defensa en la mano');
    await jugar(comb, 'voto-hierro');
    check(fervor(comb) === 2, 'Voto de Hierro: 1 de Fervor por cada Golpe y Defensa en la mano');
  }
  {
    const { comb } = await montarP();
    comb.jugador.mazo = [instanciar(CT.cartaPorId('castigo-divino')!), instanciar(CT.cartaPorId('golpe')!), instanciar(CT.cartaPorId('defender')!), instanciar(CT.cartaPorId('plegaria-alba')!)];
    await jugar(comb, 'instruccion-armas');
    const ids = comb.jugador.mano.map((c) => c.def.id).sort();
    check(ids.join() === 'defender,golpe', `Instrucción de Armas roba 1 Golpe y 1 Defensa (${ids.join()})`);
  }
  {
    const { comb } = await montarP();
    await jugar(comb, 'angel-vengador');
    await comb.terminarTurno();
    check(comb.jugador.castigos.length === 1 && comb.jugador.castigos[0].dano === 8,
      'Ángel Vengador: al inicio del turno, sin Castigo preparado, genera uno de 8');
    await comb.terminarTurno();
    check(comb.jugador.castigos.length === 1 && comb.jugador.castigos[0].dano === 16,
      'Ángel Vengador: si ya tienes un Castigo preparado, lo incrementa en 8');
    check(!('fervorPorTurno' in comb.jugador.estados) && fervor(comb) === 0, 'Ángel Vengador ya no da Fervor');
  }

  // — the prepared Smite's badge beside the hero —
  {
    const { resumenCastigo } = await import('../src/ui/castigo-ficha.ts');
    const div = resumenCastigo({ nombre: 'Castigo Divino', elemento: 'divino', dano: 10 });
    check(div.icono === '🌟' && div.corto === '+10' && /10 de daño/.test(div.texto), 'la ficha del Castigo Divino muestra +10');
    const res = resumenCastigo({ nombre: 'Castigo Resplandeciente', elemento: 'resplandor', dano: 4, bloqueoPorDano: true });
    check(/4 de daño más y te da bloqueo/.test(res.texto), `la ficha describe el Castigo entero (${res.texto})`);
    check(resumenCastigo({ nombre: 'x', elemento: 'destierro', destierro: 12 }).corto === '≤12', 'el Destierro muestra su umbral');
    const fuente = (await import('node:fs')).readFileSync(new URL('../src/ui/combate.ts', import.meta.url), 'utf8');
    check(/castigo-ficha/.test(fuente) && /resumenCastigo/.test(fuente), 'el combate pinta la ficha del Castigo junto al héroe');
  }

  // — relics —
  {
    const { comb } = await montarP([dummy()], ['guantelete-cruzado']);
    check(fervor(comb) === 2, 'Guantelete del Cruzado: empiezas el combate con 2 de Fervor');
  }
  {
    const { comb } = await montarP([dummy()], ['estandarte-sagrado']);
    comb.jugador.bloqueo = 0;
    await jugar(comb, 'castigo-divino');
    await jugar(comb, 'golpe');
    check(comb.jugador.bloqueo === 4, 'Estandarte Sagrado: 4 de bloqueo al descargar un Castigo');
  }
  {
    const { comb } = await montarP([dummy()], ['rosario-plata']);
    await jugar(comb, 'golpe');
    await jugar(comb, 'golpe');
    check(fervor(comb) === 3, 'Rosario de Plata: el primer Golpe o Defensa del turno da 1 de Fervor más');
  }
  {
    const { comb } = await montarP([dummy()], ['yelmo-juramento']);
    comb.jugador.mazo = [instanciar(CT.cartaPorId('plegaria-alba')!)];
    await jugar(comb, 'golpe'); await jugar(comb, 'defender');
    const m = comb.jugador.mano.length;
    await jugar(comb, 'golpe');
    check(comb.jugador.mano.length === m + 1, 'Yelmo del Juramento: al 3.er Golpe o Defensa del turno robas 1');
  }
}

// ── Combat HUD: energy at the left edge, end turn at the right edge ─────────
console.log('\n🎛️ HUD del combate');
{
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../src/ui/combate.ts', import.meta.url), 'utf8');
  const zona = src.slice(src.indexOf('<div class="zona-mano">'), src.indexOf('<div class="linea-lanzamiento">'));
  const orden = ['energia', 'pila-robo', 'mano', 'pila-descarte', 'btn-fin-turno'].map((c) => zona.search(new RegExp(`class="([\\w-]+ )*${c}"`)));
  check(orden.every((p, i) => p >= 0 && (i === 0 || p > orden[i - 1])), 'la zona de la mano va de energía (izquierda) a fin de turno (derecha)');
  const css = fs.readFileSync(new URL('../src/estilos/combate.css', import.meta.url), 'utf8');
  const regla = css.slice(css.indexOf('.zona-mano {'), css.indexOf('}', css.indexOf('.zona-mano {')));
  check(/justify-content:\s*space-between/.test(regla), 'la energía y el botón de fin de turno van pegados a los extremos');
  const movil = fs.readFileSync(new URL('../src/estilos/movil.css', import.meta.url), 'utf8');
  check(/\.energia \{ order: 1; \}/.test(movil) && /\.btn-fin-turno \{ order: 4; \}/.test(movil),
    'en vertical, la energía abre la fila del HUD y el fin de turno la cierra');
}

// ── Deck viewer and the campfire's health ──────────────────────────────────
console.log('\n🃏 Visor del mazo y vida en la hoguera');
{
  const fs = await import('node:fs');
  const V = await import('../src/ui/visor-mazo-orden.ts').catch(() => null);
  check(!!V, 'existe el orden del visor del mazo (ui/visor-mazo-orden.ts)');
  if (V) {
    const CT = await import('../src/core/cartas.ts');
    const ids = ['defender', 'golpe', 'castigo-divino', 'golpe', 'arma-consagrada', 'herida-infectada'];
    const mazo = ids.map((id) => instanciar(CT.cartaPorId(id)!));
    mazo[1].mejorada = true;
    const orden = V.ordenarParaVisor(mazo).map((c) => `${c.def.id}${c.mejorada ? '+' : ''}`);
    check(orden.join() === 'golpe,golpe+,castigo-divino,defender,arma-consagrada,herida-infectada',
      `el visor ordena ataques, habilidades, poderes y maldiciones; por coste y nombre, con las mejoradas detrás (${orden.join()})`);
    check(mazo.map((c) => c.def.id).join() === ids.join(), 'ordenar para el visor no cambia el mazo');
  }
  const ui = (f: string) => fs.readFileSync(new URL(`../src/ui/${f}`, import.meta.url), 'utf8');
  check(/verCartas\(/.test(ui('mapa.ts')), 'en el mapa, tocar el mazo abre el visor de tus cartas');
  check(/verCartas\(/.test(ui('combate.ts')), 'en combate, tocar las pilas abre el visor de sus cartas');
  check(/descanso-pv/.test(ui('recompensa.ts')), 'la hoguera muestra tus puntos de golpe');
}

// ── Smite cards grey out while one is prepared; no "queue" wording for the player ──
console.log('\n🌟 Castigo activo en la mano');
{
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../src/ui/combate.ts', import.meta.url), 'utf8');
  const noEncolable = src.slice(src.indexOf('function motivoNoEncolable'), src.indexOf('/** Queues a card'));
  check(/def\.castigo/.test(noEncolable), 'con un Castigo preparado, las cartas de Castigo salen en gris como sin energía');
  check(!/sale de la cola/.test(src) && !/en cola<\/span>/.test(src), 'los mensajes y el botón de fin de turno no hablan de «cola»');
}

// ── Title screen scrolls on desktop; notification wording; Smite glow ──────
console.log('\n🏰 Título y aura del Castigo');
{
  const fs = await import('node:fs');
  const css = fs.readFileSync(new URL('../src/estilos/pantallas.css', import.meta.url), 'utf8');
  const regla = css.slice(css.indexOf('.titulo {'), css.indexOf('}', css.indexOf('.titulo {')));
  check(/overflow-y:\s*auto/.test(regla), 'el menú principal tiene scroll también en escritorio (no se corta el botón de continuar)');
  const titulo = fs.readFileSync(new URL('../src/ui/titulo.ts', import.meta.url), 'utf8');
  const ajustesMenu = fs.readFileSync(new URL('../src/ui/menu-ajustes.ts', import.meta.url), 'utf8');
  check(/Notificar nuevas versiones/.test(ajustesMenu) && !/versiones mayores/.test(ajustesMenu + titulo), 'el interruptor de avisos dice «Notificar nuevas versiones»');
  const combate = fs.readFileSync(new URL('../src/ui/combate.ts', import.meta.url), 'utf8');
  check(!/castigos\.length > 0 \? '#fff3c4'/.test(combate), 'el Castigo preparado no pone un halo encima del héroe (solo las llamas por detrás)');
  check(/con-castigo/.test(combate), 'con un Castigo preparado el héroe lleva la clase con-castigo');
  const cssC = fs.readFileSync(new URL('../src/estilos/combate.css', import.meta.url), 'utf8');
  check(!/@keyframes aura-castigo/.test(cssC) && !/con-castigo \.sprite-silueta::/.test(cssC), 'el aura del Castigo no es un resplandor CSS encima del héroe');
}

// ── Stage flames write alpha (pure additive pixels vanish outside the figure's halo) ──
console.log('\n🔥 Llamas del escenario con alfa');
{
  const fs = await import('node:fs');
  const gl = fs.readFileSync(new URL('../src/fx/particle-gl.ts', import.meta.url), 'utf8');
  const stage = fs.readFileSync(new URL('../src/ui/puppet-stage.ts', import.meta.url), 'utf8');
  check(/uniform float uCover;/.test(gl) && /max\(1\.0 - additive, uCover\)/.test(gl), 'el lote de sprites puede escribir alfa además de sumar luz (uCover)');
  check(/flameBatch\.draw\([^)]*,\s*1\)/.test(stage), 'las llamas del escenario cubren con alfa: no se recortan fuera del halo de la figura');
  // alpha-0 light is invalid premultiplied data: desktop compositors drop it (mobile ones add it)
  const capa = gl.slice(gl.indexOf('class ParticleRendererGL'));
  check(/this\.batch\.draw\(list, w, h, dpr, 0, 0, 1\)/.test(capa), 'las partículas con brillo escriben alfa: se ven también en PC, no solo en móvil');
}

// ── Each Smite burns in its own colour (generic ones keep the holy yellow) ──
console.log('\n🎨 Color de las llamas por Castigo');
{
  const HF = await import('../src/fx/holy-flames.ts');
  const CF = await import('../src/ui/castigo-ficha.ts');
  const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const tonos = ['holy', 'divino', 'trueno', 'cegador', 'fuego', 'resplandor', 'destierro'] as const;
  check(tonos.every((k) => !!HF.FLAME_PALETTES[k]), 'hay una paleta de llamas para cada Castigo y otra para los genéricos');
  const firma = (k: string) => HF.FLAME_PALETTES[k as keyof typeof HF.FLAME_PALETTES].outer.join();
  check(new Set(tonos.map(firma)).size === tonos.length, 'cada Castigo arde con un color distinto');
  check(HF.FLAME_PALETTES.holy.outer.join() === HF.HOLY_FLAME_COLOURS.slice(0, 3).join(), 'los genéricos conservan el amarillo sagrado de siempre');
  const azul = HF.FLAME_PALETTES.trueno.outer.every((c) => { const [r, , b] = hex(c); return b > r; });
  const naranja = HF.FLAME_PALETTES.fuego.outer.every((c) => { const [r, g, b] = hex(c); return r > g && g > b; });
  const violeta = HF.FLAME_PALETTES.destierro.outer.some((c) => { const [r, g, b] = hex(c); return b > g && r > g; });
  check(azul && naranja && violeta, 'el trueno arde azul, el fuego naranja y el destierro violeta');
  const pts = Array.from({ length: 12 }, (_, i) => ({ x: 100 + Math.cos(i) * 40, y: 200 + Math.sin(i) * 60 }));
  const usados = new Set(HF.holyFlameFrame(1.2, pts, { level: 1, unit: 1, kind: 'trueno' }).map((f) => f.colour));
  const pal = HF.FLAME_PALETTES.trueno;
  check([...usados].every((c) => [...pal.outer, ...pal.core, ...pal.ember].includes(c)), 'un fotograma de llamas usa solo los colores de su Castigo');
  check(CF.llamasDeCastigo({ nombre: 'Castigo Atronador', elemento: 'trueno', vulnerable: 2 }) === 'trueno', 'las llamas de un Castigo de carta llevan su color');
  check(CF.llamasDeCastigo({ nombre: 'Martillo de Luz', elemento: 'divino', dano: 4, generico: true }) === 'holy', 'las de un Castigo genérico, el amarillo sagrado');
  const CT = await import('../src/core/cartas.ts');
  const run = nuevaRun('paladin', 5);
  const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(5), uiSilenciosa);
  await comb.iniciar();
  comb.jugador.energia = 9;
  const ml = instanciar(CT.cartaPorId('martillo-luz')!);
  comb.jugador.mano.push(ml);
  comb.enemigos[0].pv = 99;
  await comb.jugarCarta(ml, comb.enemigos[0]);
  check(comb.jugador.castigos[0]?.generico === true, 'el Castigo de Martillo de Luz es genérico');
  const fs = await import('node:fs');
  check(/llamasDeCastigo\(/.test(fs.readFileSync(new URL('../src/ui/combate.ts', import.meta.url), 'utf8')), 'el combate enciende las llamas con el color del Castigo preparado');
}

// ── PWA icons: the manifest points at existing files, with new names so Android refreshes them ─
console.log('\n📱 Iconos de la app instalada');
{
  const fs = await import('node:fs');
  const conf = fs.readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
  const iconos = [...conf.matchAll(/src: '([^']+\.png)'/g)].map((m) => m[1]);
  check(iconos.length >= 3 && iconos.every((f) => fs.existsSync(new URL(`../public/${f}`, import.meta.url))),
    `los iconos del manifiesto existen en public/ (${iconos.join(', ')})`);
  check(iconos.every((f) => !/^icono-(192|512|maskable-512)\.png$/.test(f)),
    'los iconos no reutilizan los nombres del icono antiguo (Android no vería el cambio)');
  check(/id: '\/mazos-y-mazmorras\/'/.test(conf), 'el manifiesto fija su id igual al de la app ya instalada');
  const aviso = fs.readFileSync(new URL('../public/sw-avisos.js', import.meta.url), 'utf8');
  check([...aviso.matchAll(/'([\w-]+\.png)'/g)].every((m) => iconos.includes(m[1])), 'las notificaciones usan el icono actual');
}

// ── Paladin: holy flames around the hero while a Smite is prepared ──────────
console.log('\n🕯️ Aura de llamas sagradas del Castigo preparado');
try {
  const hf = await import('../src/fx/holy-flames.ts');
  const { flameAnchors, flameScreenPoints, holyFlameFrame, FlameFade, FLAME_FADE_IN, FLAME_FADE_OUT, MAX_FLAME_SPRITES, HOLY_FLAME_COLOURS,
    tongueHead, TONGUE_PERIOD, TONGUE_SPRITES, flameLayerFor } = hf;
  // back layer: with a WebGL stage the flames are painted by the stage before the figure, not on #fx-canvas
  const fsP = await import('node:fs');
  const srcStage = fsP.readFileSync(new URL('../src/ui/puppet-stage.ts', import.meta.url), 'utf8');
  const srcSprite = fsP.readFileSync(new URL('../src/ui/puppet-sprite.ts', import.meta.url), 'utf8');
  const cuerpo = srcStage.slice(srcStage.indexOf('private drawSprite('));
  check(flameLayerFor(true) === 'stage' && flameLayerFor(false) === 'fx', 'llama sagrada: con escenario WebGL las llamas van en la capa del escenario, no en #fx-canvas');
  check(cuerpo.indexOf('this.drawFlames(') > 0 && cuerpo.indexOf('this.drawFlames(') < cuerpo.indexOf('if (v.aura)') && cuerpo.indexOf('this.drawFlames(') < cuerpo.indexOf('pass(1,'),
    'llama sagrada: el escenario pinta las llamas antes que la figura (quedan detrás del héroe)');
  check(/flameLayerFor\(!!this\.gpu\)/.test(srcSprite) && /this\.gpu\.flames\s*=/.test(srcSprite), 'llama sagrada: el sprite entrega sus llamas al escenario cuando lo hay');
  const rigP = HERO_RIGS.paladin;
  const anclas = flameAnchors(rigP);
  check(anclas.length >= 8, `llama sagrada: la silueta del paladín tiene puntos de llama (${anclas.length})`);
  check(anclas.every((a) => a.bone !== 'weapon' && !String(a.bone).startsWith('ch')), 'llama sagrada: las llamas nacen del cuerpo, no del martillo ni de la capa');
  check(JSON.stringify(flameAnchors(rigP)) === JSON.stringify(anclas), 'llama sagrada: los puntos de la silueta son deterministas');
  const xs = anclas.map((a) => a.at[0]), ys = anclas.map((a) => a.at[1]);
  check(Math.min(...ys) < 50 && Math.max(...ys) > 115, 'llama sagrada: rodea al héroe de los pies a la cabeza');
  check(Math.max(...xs) - Math.min(...xs) > 25, 'llama sagrada: rodea al héroe por ambos lados');
  const huesos = heroBones('paladin', heroPose('paladin', 0.3, null).p);
  const unit = 1.2, rect = { x: 80, y: 220, w: 140 * unit };
  const pts = flameScreenPoints(anclas, huesos, spriteMatrix(rect, false, rigP.art ?? 1));
  check(pts.length === anclas.length && pts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)), 'llama sagrada: los puntos se llevan a pantalla');
  const fr = holyFlameFrame(1.3, pts, { level: 1, unit });
  check(fr.length > 0, 'llama sagrada: con el Castigo preparado hay llamas');
  // readable size: the longest tongues reach at least a fifth of the figure (140·unit wide)
  const grupos: number[] = [];
  for (let t = 0.5; t < 3; t += 0.25) {
    const f = holyFlameFrame(t, pts, { level: 1, unit });
    for (let g = 0; g + TONGUE_SPRITES <= f.length && f[g].shape === 'colmillo'; g += TONGUE_SPRITES) {
      const seg = f.slice(g, g + TONGUE_SPRITES).filter((s) => (s.alpha ?? 1) > 0.3);
      if (seg.length) grupos.push(Math.max(...seg.map((s) => s.y + s.size)) - Math.min(...seg.map((s) => s.y - s.size * (s.stretch ?? 1) * 2)));
    }
  }
  check(Math.max(...grupos) >= 0.2 * 140 * unit, `llama sagrada: las lenguas se leen a tamaño real (${Math.round(Math.max(...grupos))} px en una figura de ${140 * unit} px)`);
  // rise and snake: each tongue climbs well above its birthplace and weaves from side to side
  let subidas = 0, serpentea = 0, ciclos = 0, periodoOk = true;
  for (let i = 0; i < 8; i++) {
    const muestras: { x: number; y: number; u: number; cycle: number; period: number }[] = [];
    for (let t = 0; t < 8; t += 1 / 60) muestras.push(tongueHead(i, t, pts, unit));
    const porCiclo = new Map<number, typeof muestras>();
    for (const m of muestras) { if (!porCiclo.has(m.cycle)) porCiclo.set(m.cycle, []); porCiclo.get(m.cycle)!.push(m); }
    for (const c of porCiclo.values()) {
      if (c[0].u > 0.05 || c[c.length - 1].u < 0.95) continue;
      ciclos++;
      periodoOk &&= c[0].period >= TONGUE_PERIOD[0] && c[0].period <= TONGUE_PERIOD[1];
      const sube = (c[0].y - c[c.length - 1].y) / unit;
      if (sube >= 25 && sube <= 60) subidas++;
      const x0 = c[0].x, x1 = c[c.length - 1].x;
      const desvio = Math.max(...c.map((m) => Math.abs(m.x - (x0 + (x1 - x0) * m.u)))) / unit;
      let giros = 0;
      for (let j = 2; j < c.length; j++) if (Math.sign(c[j].x - c[j - 1].x) * Math.sign(c[j - 1].x - c[j - 2].x) < 0) giros++;
      if (desvio >= 1.5 && desvio <= 10 && giros >= 1) serpentea++;
    }
  }
  check(ciclos > 10 && periodoOk && TONGUE_PERIOD[0] >= 0.9 && TONGUE_PERIOD[1] <= 1.8, `llama sagrada: cada lengua sube a velocidad intermedia (${TONGUE_PERIOD.join('–')} s por ciclo)`);
  check(subidas === ciclos, `llama sagrada: las lenguas ascienden entre 25 y 60 unidades por ciclo (${subidas}/${ciclos})`);
  check(serpentea === ciclos, `llama sagrada: las lenguas serpentean de lado a lado al subir (${serpentea}/${ciclos})`);
  check(JSON.stringify(holyFlameFrame(1.3, pts, { level: 1, unit })) === JSON.stringify(fr), 'llama sagrada: el fotograma es determinista');
  const rgb = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const amarillo = (c: string) => { const [r, g, b] = rgb(c); return r > 220 && g > 170 && b < 170; };
  const blanco = (c: string) => rgb(c).every((v) => v > 190); // white, or a warm white
  check(HOLY_FLAME_COLOURS.every((c) => amarillo(c) || blanco(c)), 'llama sagrada: la paleta es solo de amarillos y blancos');
  const colores = new Set<string>();
  let maxN = 0, maxA = 0, saltos = 0, fuera = 0, reducidoMax = 0, sobreCabeza = 0;
  const bx0 = Math.min(...pts.map((p) => p.x)), bx1 = Math.max(...pts.map((p) => p.x));
  const by0 = Math.min(...pts.map((p) => p.y)), by1 = Math.max(...pts.map((p) => p.y));
  let prev = holyFlameFrame(0, pts, { level: 1, unit });
  for (let t = 1 / 60; t < 6; t += 1 / 60) {
    const f = holyFlameFrame(t, pts, { level: 1, unit });
    maxN = Math.max(maxN, f.length);
    reducidoMax = Math.max(reducidoMax, holyFlameFrame(t, pts, { level: 1, unit, reduced: true }).length);
    if (f.some((s) => s.shape === 'colmillo' && (s.alpha ?? 1) > 0.3 && s.y < by0 - 10 * unit)) sobreCabeza++;
    for (const s of f) {
      colores.add(s.colour);
      maxA = Math.max(maxA, s.alpha ?? 1);
      if (s.x < bx0 - 30 * unit || s.x > bx1 + 30 * unit || s.y < by0 - 70 * unit || s.y > by1 + 10 * unit) fuera++;
    }
    // stable: each flame moves smoothly, it only jumps while invisible
    if (f.length === prev.length) {
      f.forEach((s, i) => {
        const p = prev[i];
        if (Math.hypot(s.x - p.x, s.y - p.y) > 3 * unit && Math.max(s.alpha ?? 1, p.alpha ?? 1) > 0.06) saltos++;
      });
    } else saltos++;
    prev = f;
  }
  check([...colores].some(amarillo) && [...colores].some(blanco), 'llama sagrada: arde en amarillo y blanco');
  check(saltos === 0, `llama sagrada: las llamas se mueven con suavidad, sin saltos visibles (${saltos})`);
  check(maxA >= 0.6 && maxA <= 0.9, `llama sagrada: bien visible pero sin volverse opaca (alfa máx. ${maxA.toFixed(2)})`);
  check(fuera === 0, `llama sagrada: las llamas se quedan alrededor de la silueta (${fuera} fuera)`);
  check(sobreCabeza > 0, `llama sagrada: las lenguas suben por encima de la cabeza (${sobreCabeza} fotogramas)`);
  // not a cut-out: a minority of thin, fainter tongues is drawn in front, licking the outline
  let delante = 0, detras = 0, alfaDelante = 0, alfaDetras = 0, tamDelante = 0, tamDetras = 0;
  for (let t = 0; t < 6; t += 1 / 30) {
    for (const s of holyFlameFrame(t, pts, { level: 1, unit })) {
      if (s.shape !== 'colmillo') continue;
      if (s.front) { delante++; alfaDelante = Math.max(alfaDelante, s.alpha ?? 1); tamDelante += s.size; }
      else { detras++; alfaDetras = Math.max(alfaDetras, s.alpha ?? 1); tamDetras += s.size; }
    }
  }
  const parteDelante = delante / (delante + detras);
  check(delante > 0 && detras > 0, 'llama sagrada: hay lenguas delante y detrás del héroe (la figura se funde con el fuego)');
  check(parteDelante >= 0.15 && parteDelante <= 0.35, `llama sagrada: las de delante son minoría (${Math.round(parteDelante * 100)} %)`);
  check(alfaDelante <= alfaDetras * 0.65 && tamDelante / delante < tamDetras / detras,
    `llama sagrada: las de delante son más finas y translúcidas (alfa ${alfaDelante.toFixed(2)} frente a ${alfaDetras.toFixed(2)})`);
  const ultima = cuerpo.lastIndexOf('this.drawFlames(');
  check(ultima > cuerpo.indexOf('this.drawFlames(') && ultima > cuerpo.indexOf("pass(0, [0, 0, 0, 0], { skip: FLAG.backlit })") && ultima > cuerpo.indexOf('pass(1, [0, 0, 0, 0]);'),
    'llama sagrada: el escenario pinta las lenguas de delante después de la figura');
  check(maxN <= MAX_FLAME_SPRITES && MAX_FLAME_SPRITES <= 80, `llama sagrada: respeta el tope de partículas (${maxN} de ${MAX_FLAME_SPRITES})`);
  check(reducidoMax > 0 && reducidoMax < maxN, `llama sagrada: con movimiento reducido hay menos llamas (${reducidoMax} < ${maxN})`);
  const muchos = Array.from({ length: 200 }, (_, i) => ({ x: i * 3, y: 300 + (i % 7) }));
  check(holyFlameFrame(2, muchos, { level: 1, unit }).length <= MAX_FLAME_SPRITES, 'llama sagrada: el tope aguanta aunque la silueta tenga muchos puntos');
  const mov = pts.map((p) => ({ x: p.x + 50, y: p.y - 20 }));
  const a = holyFlameFrame(2.2, pts, { level: 1, unit }), b = holyFlameFrame(2.2, mov, { level: 1, unit });
  check(a.length === b.length && a.every((s, i) => Math.abs(b[i].x - s.x - 50) < 1e-6 && Math.abs(b[i].y - s.y + 20) < 1e-6),
    'llama sagrada: las llamas siguen al sprite cuando se mueve');
  const ataque = flameScreenPoints(anclas, heroBones('paladin', heroPose('paladin', 0.3, { type: 'attack', p: 0.35 }).p), spriteMatrix(rect, false, rigP.art ?? 1));
  check(ataque.some((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y) > 3), 'llama sagrada: las llamas acompañan la pose (al atacar se mueven con el cuerpo)');
  const media = holyFlameFrame(2.2, pts, { level: 0.5, unit });
  check(media.length > 0 && media.every((s, i) => Math.abs((s.alpha ?? 1) - (a[i].alpha ?? 1) * 0.5) < 1e-6), 'llama sagrada: el fundido atenúa las llamas');
  check(holyFlameFrame(2.2, pts, { level: 0, unit }).length === 0, 'llama sagrada: apagada no dibuja nada');
  // fade in on preparing a Smite, fade out when it is released
  const fade = new FlameFade();
  check(fade.level(5) === 0 && !fade.active(5), 'llama sagrada: sin Castigo, sin aura');
  fade.set(true, 10);
  check(fade.level(10) === 0 && fade.level(10 + FLAME_FADE_IN / 2) > 0.2 && fade.level(10 + FLAME_FADE_IN / 2) < 0.8 && fade.level(10 + FLAME_FADE_IN) === 1,
    'llama sagrada: aparece con un fundido al preparar el Castigo');
  check(FLAME_FADE_IN >= 0.3 && FLAME_FADE_IN <= 1 && FLAME_FADE_OUT >= 0.3 && FLAME_FADE_OUT <= 1.2, 'llama sagrada: fundidos de entrada y salida suaves pero breves');
  fade.set(true, 11);
  check(fade.level(11) === 1, 'llama sagrada: volver a pedirla no reinicia el fundido');
  fade.set(false, 20);
  check(fade.level(20) === 1 && fade.level(20 + FLAME_FADE_OUT / 2) < 1 && fade.level(20 + FLAME_FADE_OUT) === 0 && !fade.active(20 + FLAME_FADE_OUT),
    'llama sagrada: se apaga con un fundido al descargar el Castigo');
  const corte = new FlameFade();
  corte.set(true, 0);
  const aMitad = corte.level(FLAME_FADE_IN / 2);
  corte.set(false, FLAME_FADE_IN / 2);
  check(Math.abs(corte.level(FLAME_FADE_IN / 2) - aMitad) < 1e-9, 'llama sagrada: apagarla a medio fundido no da saltos');
} catch (e) {
  check(false, `las pruebas de la llama sagrada revientan: ${(e as Error).stack ?? e}`);
}

// ── Prodigious Spell: a random spell effect whose grandeur follows its power ─
console.log('\n📜 Efecto del Conjuro Prodigioso');
{
  const { prodigiousTier, prodigiousPool, prodigiousSpell } = await import('../src/ui/prodigious-fx.ts');
  const { SPELLS } = await import('../src/fx/spell-fx.ts');
  const { cartaPorId: porId } = await import('../src/core/cartas.ts');
  check(prodigiousTier(10) === 'basic' && prodigiousTier(29) === 'basic', 'Conjuro Prodigioso: por debajo de 30, efecto de conjuro normal');
  check(prodigiousTier(30) === 'rare' && prodigiousTier(49) === 'rare', 'Conjuro Prodigioso: de 30 a 49, efecto de carta rara');
  check(prodigiousTier(50) === 'unique' && prodigiousTier(79) === 'unique', 'Conjuro Prodigioso: de 50 a 79, efecto de carta única');
  check(prodigiousTier(80) === 'dm' && prodigiousTier(200) === 'dm', 'Conjuro Prodigioso: desde 80, el rayo del Dungeon Master');
  for (const tier of ['basic', 'rare', 'unique', 'dm'] as const) {
    const pool = prodigiousPool(tier);
    check(pool.length > 0 && pool.every((k) => !!SPELLS[k]), `Conjuro Prodigioso: el repertorio «${tier}» existe y son efectos registrados`);
    check(pool.every((k) => SPELLS[k].anchor === 'target'), `Conjuro Prodigioso: el repertorio «${tier}» solo tiene efectos que caen sobre el objetivo`);
  }
  check(prodigiousPool('rare').every((k) => porId(k.replace(/^carta:/, ''))?.rareza === 'rara'),
    'Conjuro Prodigioso: el repertorio raro sale de secuencias de cartas raras');
  check(prodigiousPool('unique').every((k) => porId(k.replace(/^carta:/, ''))?.rareza === 'especial'),
    'Conjuro Prodigioso: el repertorio único sale de secuencias de cartas únicas');
  check(prodigiousPool('dm').length === 1 && prodigiousPool('dm')[0] === 'rayoDM', 'Conjuro Prodigioso: el rayo del DM es el único efecto desde 80');
  const vistos = new Set<string>();
  for (let i = 0; i < 40; i++) vistos.add(prodigiousSpell(12, () => i / 40));
  check(vistos.size === prodigiousPool('basic').length, 'Conjuro Prodigioso: el efecto se elige al azar entre todo el repertorio');
  check(prodigiousPool('basic').includes(prodigiousSpell(12, () => 0.999)), 'Conjuro Prodigioso: el azar nunca se sale del repertorio');
}

// ── Interface sounds: cards drawn, zoomed, played, discarded and shuffled; soft button clicks ──
console.log('\n🖱️ Sonidos de interfaz');
{
  const fs = await import('node:fs');
  const bank = await import('../src/fx/sfx-bank.ts');
  const leer = (f: string) => (fs.existsSync(new URL(`../src/${f}`, import.meta.url)) ? fs.readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8') : '');
  const nuevos = ['click', 'robar', 'verCarta', 'jugarCarta', 'descartar', 'barajar'];
  const faltan = nuevos.filter((n) => !bank.SFX_NAMES.includes(n));
  check(faltan.length === 0, `la tabla de sonidos tiene los de interfaz ${faltan.join(', ')}`);
  check(['click', 'robar', 'jugarCarta'].every((n) => bank.FREQUENT_SFX.includes(n)), 'clic, robar y jugar carta alternan variaciones (se oyen muchísimo)');
  check(nuevos.every((n) => ['carta', 'ui'].includes(bank.SFX_RECIPE_ALIAS[n])), 'mientras cargan, los de interfaz suenan con la receta de carta o de interfaz');
  const vuelo = leer('ui/card-fly.ts');
  const trozo = (src: string, desde: string) => src.slice(src.indexOf(desde), src.indexOf('\n}', src.indexOf(desde)));
  check(/sfx\('robar'/.test(trozo(vuelo, 'export function flyDraw')), 'cada carta robada suena al salir de su pila');
  check(/sfx\('descartar'/.test(trozo(vuelo, 'export function flyDiscard')), 'descartar la mano suena');
  check(/sfx\('barajar'/.test(trozo(vuelo, 'export function flyShuffle')), 'barajar el descarte en la pila de robo suena');
  const combate = leer('ui/combate.ts');
  check(/sfx\('verCarta'/.test(trozo(combate, 'function ampliarCarta')), 'ampliar una carta en combate suena');
  check(/sfx\('verCarta'/.test(leer('ui/compendio.ts')), 'ampliar una carta en el compendio suena');
  check(/sfx\('jugarCarta'/.test(combate) && !/sfx\('carta'\);\s*\n\s*const r = desde\.getBoundingClientRect/.test(combate), 'jugar una carta tiene su propio sonido');
  const sonidoUi = leer('ui/sonido-interfaz.ts');
  check(/export function activarSonidoInterfaz/.test(sonidoUi) && /sfx\('click'/.test(sonidoUi), 'hay un clic suave común para los botones de la interfaz');
  check(/activarSonidoInterfaz\(\)/.test(leer('main.ts')), 'el clic de interfaz se activa al arrancar');
}

// ── Rogue: discard synergies, a harder-hitting Quick Blade, stronger sneak attacks ──
console.log('\n🗡️ Pícaro: descartes y ataques furtivos');
{
  const carta = (id: string) => PICARO.find((c) => c.id === id);
  const montar = async (semilla: number) => {
    const comb = new Combate(nuevaRun('picaro', semilla), [GOBLIN_CORTADOR], crearRng(semilla), uiSilenciosa);
    await comb.iniciar();
    comb.run.reliquias.length = 0;
    comb.jugador.estados = {};
    const e = comb.enemigos[0]; e.pv = e.pvMax = 99; e.bloqueo = 0;
    return { comb, e };
  };
  // Quick Blade: far more damage, and it discards instead of drawing
  {
    const filo = carta('filo-rapido')!;
    const { comb, e } = await montar(9101);
    const mano = comb.jugador.mano.length, mazo = comb.jugador.mazo.length;
    await filo.jugar(comb.contexto(e));
    check(99 - e.pv === 10, `Filo Rápido inflige 10 de daño (${99 - e.pv})`);
    check(comb.jugador.mano.length === mano - 1 && comb.jugador.mazo.length === mazo && comb.descartadasEsteTurno === 1,
      'Filo Rápido descarta 1 carta en vez de robar');
    const inst = instanciar(filo); inst.mejorada = true;
    const { comb: c2, e: e2 } = await montar(9102);
    await defDe(inst).jugar(c2.contexto(e2));
    check(99 - e2.pv === 14, 'Filo Rápido+ inflige 14 de daño');
  }
  // Roll is gone (old saves swap it for a card that still exists)
  check(!carta('rodar'), 'Rodar ya no está entre las cartas del pícaro');
  const g = serializarRun(nuevaRun('picaro', 9103));
  g.mazo.push({ id: 'rodar', mejorada: false });
  const rehecha = rehidratarRun(g);
  check(!!rehecha && rehecha.mazo.length === g.mazo.length && rehecha.mazo.every((c) => !!c.def),
    'una partida guardada con Rodar sigue cargando (la carta se cambia por otra)');
  // New cards that pay off being discarded
  const nuevas = ['esquiva-refleja', 'juego-sucio', 'cuchillo-oculto', 'tormenta-filos'];
  check(nuevas.every((id) => !!carta(id)), `hay cartas nuevas de descartes (${nuevas.filter((id) => !carta(id)).join(', ') || 'todas'})`);
  const descartarla = async (id: string, semilla: number) => {
    const { comb, e } = await montar(semilla);
    const inst = instanciar(carta(id)!);
    comb.jugador.mano.push(inst);
    await comb.descartarCarta(inst);
    return { comb, e };
  };
  if (nuevas.every((id) => !!carta(id))) {
    {
      const { comb } = await montar(9104);
      const antes = comb.jugador.mano.length;
      const inst = instanciar(carta('esquiva-refleja')!);
      comb.jugador.mano.push(inst);
      await comb.descartarCarta(inst);
      check(comb.jugador.mano.length === antes + 2, 'Esquiva Refleja: si la descartas, robas 2 cartas');
    }
    {
      const { comb } = await montar(9105);
      const energia = comb.jugador.energia;
      const inst = instanciar(carta('juego-sucio')!);
      comb.jugador.mano.push(inst);
      await comb.descartarCarta(inst);
      check(comb.jugador.energia === energia + 2, 'Juego Sucio: si la descartas, ganas 2 de energía');
    }
    {
      const { e } = await descartarla('cuchillo-oculto', 9106);
      check(99 - e.pv === 8, `Cuchillo Oculto: si lo descartas, apuñala a un enemigo (${99 - e.pv})`);
    }
    {
      const { comb, e } = await montar(9107);
      const tormenta = carta('tormenta-filos')!;
      const enMano = comb.jugador.mano.length;
      await tormenta.jugar(comb.contexto(e));
      const dagas = comb.jugador.mano.filter((c) => c.def.id === 'daga').length;
      check(comb.descartadasEsteTurno === enMano && dagas === enMano && comb.jugador.mano.length === enMano,
        `Tormenta de Filos: descarta la mano y te da una Daga por cada carta (${dagas} de ${enMano})`);
    }
  }
  const conDescartes = PICARO.filter((c) => /[Dd]escart/.test(c.texto)).length;
  check(conDescartes >= 10, `el pícaro tiene muchas sinergias de descarte (${conDescartes} cartas)`);
  // Sneak attacks: more base damage and a bigger bonus against a foe that is not attacking
  const golpe = async (id: string, ataca: boolean, mejorada = false) => {
    const { comb, e } = await montar(9110);
    e.intencion = ataca ? { nombre: 'Tajo', intencion: 'ataque', dano: 8 } : { nombre: 'Cubrirse', intencion: 'defensa', bloqueo: 4 };
    const inst = instanciar(carta(id)!); inst.mejorada = mejorada;
    await defDe(inst).jugar(comb.contexto(e));
    return 99 - e.pv;
  };
  check(await golpe('punalada-trapera', true) === 8 && await golpe('punalada-trapera', false) === 15, 'Puñalada Trapera: 8, o 8 + 7 si no pretende atacar');
  check(await golpe('punalada-trapera', false, true) === 21, 'Puñalada Trapera+: 11 + 10 si no pretende atacar');
  check(await golpe('emboscada', true) === 13 && await golpe('emboscada', false) === 31, 'Emboscada: 13, o 13 + 18 si no pretende atacar');
  check(await golpe('emboscada', false, true) === 41, 'Emboscada+: 17 + 24 si no pretende atacar');
  // Smoke Bomb replaces Vanish (which did the same as Pirouette)
  {
    check(!carta('esfumarse'), 'Esfumarse ya no existe (hacía lo mismo que Pirueta)');
    const bomba = carta('bomba-humo');
    check(!!bomba && bomba.coste === 2, 'Bomba de Humo cuesta 2 de energía');
    if (bomba) {
      const comb = new Combate(nuevaRun('picaro', 9130), [GOBLIN_CORTADOR, GOBLIN_ARQUERO], crearRng(9130), uiSilenciosa);
      await comb.iniciar();
      comb.run.reliquias.length = 0;
      await bomba.jugar(comb.contexto());
      check(comb.enemigos.every((e) => e.estados.oscuridad === 5), 'Bomba de Humo: 5 de Oscuridad a todos los enemigos');
      const inst = instanciar(bomba); inst.mejorada = true;
      const c2 = new Combate(nuevaRun('picaro', 9131), [GOBLIN_CORTADOR, GOBLIN_ARQUERO], crearRng(9131), uiSilenciosa);
      await c2.iniciar();
      await defDe(inst).jugar(c2.contexto());
      check(c2.enemigos.every((e) => e.estados.oscuridad === 7), 'Bomba de Humo+: 7 de Oscuridad a todos');
    }
    const g2 = serializarRun(nuevaRun('picaro', 9132));
    g2.mazo.push({ id: 'esfumarse', mejorada: true });
    const r2 = rehidratarRun(g2);
    check(!!r2 && r2.mazo.at(-1)?.def.id === 'bomba-humo' && r2.mazo.at(-1)?.mejorada === true,
      'una partida guardada con Esfumarse la cambia por Bomba de Humo (y conserva la mejora)');
  }
  // Steel Tempest: a big hit that grows with every card discarded this combat
  {
    const { comb, e } = await montar(9120);
    for (let t = 0; t < 3; t++) {
      const inst = instanciar(carta('esquiva-refleja')!);
      comb.jugador.mano.push(inst);
      await comb.descartarCarta(inst);
      if (t < 2) { e.intencion = { nombre: 'Cubrirse', intencion: 'defensa', bloqueo: 0 }; comb.jugador.bloqueo = 999; await comb.terminarTurno(); }
    }
    check(comb.descartadasEsteCombate === 3 && comb.descartadasEsteTurno === 1, 'los descartes se cuentan durante todo el combate (y aparte los del turno)');
    e.pv = 99; e.bloqueo = 0; comb.jugador.estados = {};
    await carta('tempestad-acero')!.jugar(comb.contexto(e));
    check(99 - e.pv === 21, `Tempestad de Acero: 12 + 3 por cada carta descartada en el combate (${99 - e.pv})`);
    const nueva = await montar(9121);
    check(nueva.comb.descartadasEsteCombate === 0, 'cada combate empieza la cuenta desde cero');
  }
}

// ── Soundtrack: one song per scenario in two synced versions (map ↔ combat) ──
console.log('\n🎼 Versiones de exploración y combate sincronizadas');
{
  const fs = await import('node:fs');
  const mt = await import('../src/fx/music-tracks.ts') as any;
  check(typeof mt.loopPosition === 'function' && typeof mt.sameSong === 'function' && typeof mt.exploreTheme === 'function',
    'el motor de música sabe en qué punto del bucle va una pista y qué pistas son la misma canción');
  if (typeof mt.loopPosition === 'function') {
    // loop from 0.025 s to 10.025 s, started at buffer offset 0 (MP3 delay skipped)
    check(Math.abs(mt.loopPosition(3, 0, 0.025, 10.025) - 3) < 1e-9, 'antes de dar la vuelta, la posición es lo que lleva sonando');
    check(Math.abs(mt.loopPosition(13, 0, 0.025, 10.025) - 3) < 1e-9, 'tras dar la vuelta al bucle, vuelve al mismo compás');
    check(Math.abs(mt.loopPosition(1, 2.5, 0.5, 10.5) - 3.5) < 1e-9, 'cuenta desde el punto en que arrancó la pista');
  }
  if (typeof mt.sameSong === 'function') {
    const tabla = {
      a: { file: 'a.mp3', loopSamples: 441000, group: 'ogros' },
      b: { file: 'b.mp3', loopSamples: 441000, group: 'ogros' },
      c: { file: 'c.mp3', loopSamples: 441000 },
      d: { file: 'd.mp3', loopSamples: 400000, group: 'ogros' },
    };
    check(mt.sameSong('a', 'b', tabla) && !mt.sameSong('a', 'c', tabla) && !mt.sameSong('a', 'd', tabla) && !mt.sameSong('a', 'a', tabla),
      'dos pistas son la misma canción si comparten grupo y duración exacta de bucle');
    const conEscenario = { ...mt.MUSIC_TRACKS, 'cap1-e1': { file: 'x.mp3', loopSamples: 1 }, 'cap1-e1-combate': { file: 'y.mp3', loopSamples: 1 }, 'cap1-e1-jefe': { file: 'z.mp3', loopSamples: 1 } };
    check(mt.exploreTheme(0, 1, conEscenario) === 'cap1-e1' && mt.combatTheme(0, false, [], 1, conEscenario) === 'cap1-e1-combate'
      && mt.combatTheme(0, true, [], 1, conEscenario) === 'cap1-e1-jefe', 'cada escenario puede tener su exploración, su combate y su jefe');
    const sinEscenarios = Object.fromEntries(Object.entries(mt.MUSIC_TRACKS as Record<string, unknown>).filter(([k]) => !k.startsWith('cap3-')));
    check(mt.exploreTheme(2, 0, sinEscenarios) === 'cap3' && mt.combatTheme(2, false, [], 0, sinEscenarios) === 'cap3'
      && mt.combatTheme(2, true, [], 0, sinEscenarios) === 'cap3-jefe',
      'si un escenario aún no tiene música propia, suena la del acto');
  }
  // Act I: each scenario has its song in two versions plus its own boss (sample-based)
  const T = mt.MUSIC_TRACKS as Record<string, { file: string; loopSamples: number; group?: string }>;
  const actoI: Array<[string, number]> = [
    ['cap1-e0', 3528000], ['cap1-e0-combate', 3528000], ['cap1-e0-jefe', 3704400],
    ['cap1-e1', 3528000], ['cap1-e1-combate', 3528000], ['cap1-e1-jefe', 3528000],
  ];
  check(actoI.every(([id, n]) => T[id]?.loopSamples === n && fs.existsSync(new URL(`../src/audio/${T[id].file}`, import.meta.url))),
    'el Acto I tiene su música por escenario: exploración, combate y jefe, con su bucle exacto');
  check(mt.sameSong('cap1-e0', 'cap1-e0-combate') && mt.sameSong('cap1-e1', 'cap1-e1-combate') && !mt.sameSong('cap1-e0', 'cap1-e1')
    && !mt.sameSong('cap1-e0-combate', 'cap1-e0-jefe'), 'mapa y combate de cada escenario son la misma canción; el jefe y el otro escenario no');
  check(mt.exploreTheme(0, 1) === 'cap1-e1' && mt.combatTheme(0, false, [], 1) === 'cap1-e1-combate' && mt.combatTheme(0, true, [], 0) === 'cap1-e0-jefe',
    'el Acto I ya usa la música de su escenario');
  const E2DEF = (k: string) => (ENEMIGOS as any)[k];
  // Act II: the same layout, plus Malachar and Abaddon as two versions of one boss song
  const actoII: Array<[string, number]> = [
    ['cap2-e0', 3528000], ['cap2-e0-combate', 3528000], ['cap2-e0-jefe', 4116000],
    ['cap2-e1', 3704400], ['cap2-e1-combate', 3704400], ['cap2-e1-jefe', 3704400], ['cap2-e1-jefe-fase2', 3704400],
  ];
  check(actoII.every(([id, n]) => T[id]?.loopSamples === n && fs.existsSync(new URL(`../src/audio/${T[id].file}`, import.meta.url))),
    `el Acto II tiene su música por escenario y sus jefes, con su bucle exacto (${actoII.filter(([id, n]) => T[id]?.loopSamples !== n).map(([id]) => id).join(', ') || 'todas'})`);
  // Act III: La Guarida (e0, «Tesoro maldito») and El Laberinto (e1, «Fractura»), map and combat
  const actoIII: Array<[string, number]> = [
    ['cap3-e0', 3402000], ['cap3-e0-combate', 3402000], ['cap3-e1', 3628800], ['cap3-e1-combate', 3628800],
  ];
  check(actoIII.every(([id, n]) => T[id]?.loopSamples === n && fs.existsSync(new URL(`../src/audio/${T[id].file}`, import.meta.url)))
    && mt.sameSong('cap3-e0', 'cap3-e0-combate') && mt.sameSong('cap3-e1', 'cap3-e1-combate') && !mt.sameSong('cap3-e0', 'cap3-e1')
    && mt.exploreTheme(2, 1) === 'cap3-e1' && mt.combatTheme(2, false, [], 0) === 'cap3-e0-combate',
    'el Acto III tiene su canción por escenario en dos versiones, mapa y combate, con su bucle exacto');
  check(T['cap3-e1-jefe']?.loopSamples === 3553200 && fs.existsSync(new URL('../src/audio/cap3-e1-jefe.mp3', import.meta.url))
    && mt.combatTheme(2, true, [ENEMIGOS.CONTEMPLADOR], 1) === 'cap3-e1-jefe' && !mt.sameSong('cap3-e1-combate', 'cap3-e1-jefe'),
    'el Contemplador tiene su propia pista de jefe');
  check(T['cap3-e0-jefe']?.loopSamples === 3549000 && fs.existsSync(new URL('../src/audio/cap3-e0-jefe.mp3', import.meta.url))
    && mt.combatTheme(2, true, [ENEMIGOS.IGNIFAX], 0) === 'cap3-e0-jefe' && !mt.sameSong('cap3-e0-combate', 'cap3-e0-jefe'),
    'Ignifax tiene su propia pista de jefe, el clímax del Acto III');
  check(mt.sameSong('cap2-e0', 'cap2-e0-combate') && mt.sameSong('cap2-e1', 'cap2-e1-combate') && mt.sameSong('cap2-e1-jefe', 'cap2-e1-jefe-fase2')
    && !mt.sameSong('cap2-e1-combate', 'cap2-e1-jefe'), 'mapa/combate y Malachar/Abaddon son la misma canción; el Templo y su jefe no');
  check(mt.combatTheme(1, true, [E2DEF('DEMONIO_MAYOR')], 1) === 'cap2-e1-jefe-fase2' && mt.combatTheme(1, true, [E2DEF('HERALDO_CULTO')], 1) === 'cap2-e1-jefe',
    'en el juego, al alzarse Abaddon suena su versión del tema del jefe');
  // a boss in two phases (Malachar → Abaddon): the second phase is the other version of its song
  const E2: any = ENEMIGOS;
  check(E2.DEMONIO_MAYOR?.faseMusical === 2 && !E2.HERALDO_CULTO?.faseMusical, 'Abaddon es la segunda fase musical del jefe del Templo');
  const conFase = { ...T, 'cap2-e1-jefe': { file: 'a.mp3', loopSamples: 9, group: 'malachar' }, 'cap2-e1-jefe-fase2': { file: 'b.mp3', loopSamples: 9, group: 'malachar' } };
  check(mt.combatTheme(1, true, [E2.HERALDO_CULTO], 1, conFase) === 'cap2-e1-jefe' && mt.combatTheme(1, true, [E2.DEMONIO_MAYOR], 1, conFase) === 'cap2-e1-jefe-fase2'
    && mt.sameSong('cap2-e1-jefe', 'cap2-e1-jefe-fase2', conFase), 'cuando se alza Abaddon suena la segunda fase, que es la misma canción');
  check(mt.combatTheme(1, true, [E2.DEMONIO_MAYOR], 1, { 'cap2-e1-jefe': { file: 'a.mp3', loopSamples: 9 } }) === 'cap2-e1-jefe',
    'sin pista de segunda fase, sigue la del jefe');
  const uiCombate = fs.readFileSync(new URL('../src/ui/combate.ts', import.meta.url), 'utf8');
  check(/combatTheme\(run\.capitulo, true, combate\.enemigos\.filter\(\(e\) => e\.vivo\)\.map\(\(e\) => e\.def\), run\.escenario\)/.test(uiCombate),
    'durante el combate de jefe la música sigue a los enemigos vivos (cambio de fase)');
  // the calm returns as soon as the last enemy falls: rewards are chosen to the map version
  check(typeof mt.themeAfterCombat === 'function', 'hay una regla para la música al acabar un combate');
  if (typeof mt.themeAfterCombat === 'function') {
    check(mt.themeAfterCombat('victoria', 0, 1, []) === 'cap1-e1' && mt.themeAfterCombat('victoria', 0, 0, [{}]) === 'cap1-e0',
      'al ganar un combate vuelve la versión tranquila del escenario');
    check(mt.themeAfterCombat('derrota', 0, 0, []) === null && mt.themeAfterCombat('victoria', 2, 0, [{ dungeonMaster: true }]) === null,
      'una derrota o la escena del Dungeon Master no cambian la música');
  }
  const combateFin = fs.readFileSync(new URL('../src/ui/combate.ts', import.meta.url), 'utf8');
  const finalCombate = combateFin.slice(combateFin.indexOf('function comprobarFinal'), combateFin.indexOf('setTimeout', combateFin.indexOf('function comprobarFinal')));
  check(/themeAfterCombat\(combate\.terminado, run\.capitulo, run\.escenario, defs\)/.test(finalCombate),
    'la música cambia en cuanto cae el último enemigo, antes de las recompensas');
  const motor = fs.readFileSync(new URL('../src/fx/audio.ts', import.meta.url), 'utf8');
  check(/sameSong\(/.test(motor) && /loopPosition\(/.test(motor), 'al pasar entre versiones de la misma canción, el audio sigue desde el mismo punto');
  const juego = fs.readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  const combateUi = fs.readFileSync(new URL('../src/ui/combate.ts', import.meta.url), 'utf8');
  check(/exploreTheme\(run\.capitulo, run\.escenario\)/.test(juego) && /combatTheme\(run\.capitulo, esJefe, defs, run\.escenario\)/.test(combateUi),
    'el mapa y el combate piden la música de su escenario');
}

// ── Barbarian: Crimson Feast turns every Bleed in play into Rage Strength ──────
console.log('\n🍷 Festín Carmesí: la Hemorragia se vuelve Furia');
{
  const fest = BARBARO.find((c) => c.id === 'festin-carmesi')!;
  check(fest.tipo === 'habilidad' && fest.objetivo === 'todos' && /^Furia:/.test(fest.texto), 'Festín Carmesí es una habilidad de Furia sobre todos los enemigos');
  const comb = new Combate(nuevaRun('barbaro', 9150), [GOBLIN_CORTADOR, GOBLIN_ARQUERO], crearRng(9150), uiSilenciosa);
  await comb.iniciar();
  comb.run.reliquias.length = 0;
  comb.jugador.estados = {};
  comb.jugador.furiaFuerza = 0;
  comb.enemigos[0].estados.hemorragia = 4;
  comb.enemigos[1].estados.hemorragia = 3;
  const visto = comb.valoresDeCarta(fest).find((v) => v.aplica !== false)?.real;
  await fest.jugar(comb.contexto());
  check(visto === 7 && (comb.jugador.estados.fuerza ?? 0) === 7 && comb.jugador.furiaFuerza === 7,
    `consume toda la Hemorragia (4 + 3) y la gana como Fuerza de Furia (${comb.jugador.estados.fuerza ?? 0})`);
  check(comb.enemigos.every((e) => !e.estados.hemorragia), 'y la Hemorragia desaparece de todos los enemigos');
  check(fest.mejora?.coste === 1, 'Festín Carmesí+ cuesta 1');
}

// ── Paladin: Holy Charge counts as both a Strike and a Defend ────────────────
console.log('\n⚒️ Carga Sagrada: Golpe y Defensa a la vez');
{
  const carga = PALADIN.find((c) => c.id === 'carga-sagrada')!;
  const montar = async (semilla: number) => {
    const comb = new Combate(nuevaRun('paladin', semilla), [GOBLIN_CORTADOR], crearRng(semilla), uiSilenciosa);
    await comb.iniciar();
    comb.run.reliquias.length = 0;
    comb.jugador.estados = { golpesMas: 3, defensasMas: 2 };
    comb.jugador.bloqueo = 0;
    const e = comb.enemigos[0]; e.pv = e.pvMax = 99; e.bloqueo = 0; e.estados = {};
    return { comb, e };
  };
  {
    const { comb, e } = await montar(9140);
    const valores = comb.valoresDeCarta(carga, e).filter((v) => v.aplica !== false);
    check(valores.some((v) => v.tipo === 'ataque' && v.real === 15) && valores.some((v) => v.tipo === 'bloqueo' && v.real === 8),
      'Carga Sagrada muestra +3 de daño (Arma Consagrada) y +2 de bloqueo (Égida Divina)');
    const inst = instanciar(carga);
    comb.jugador.mano.push(inst);
    comb.jugador.energia = 10;
    await comb.jugarCarta(inst, e);
    check(99 - e.pv === 15 && comb.jugador.bloqueo === 8, `Carga Sagrada: 12 + 3 de daño y 6 + 2 de bloqueo (${99 - e.pv} y ${comb.jugador.bloqueo})`);
    check((comb.jugador.estados.fervor ?? 0) === 1, 'y da 1 de Fervor, como cualquier Golpe o Defensa (no 2)');
  }
  {
    const inst = instanciar(carga); inst.mejorada = true;
    const { comb, e } = await montar(9141);
    await defDe(inst).jugar(comb.contexto(e));
    check(99 - e.pv === 19 && comb.jugador.bloqueo === 10, 'Carga Sagrada+: 16 + 3 de daño y 8 + 2 de bloqueo');
  }
  for (const familia of ['golpe', 'defensa'] as const) {
    const { comb } = await montar(9142);
    comb.jugador.mazo = [instanciar(carga)];
    comb.jugador.mano = [];
    const ok = await comb.contexto().robarFamilia(familia);
    check(ok && comb.jugador.mano[0]?.def.id === 'carga-sagrada', `buscar un${familia === 'golpe' ? ' Golpe' : 'a Defensa'} puede traer Carga Sagrada`);
  }
}

// ── Enemy difficulty: the Beholder, Act II/III elites and normals ─────────────
console.log('\n👁️ Dificultad de enemigos (Contemplador, élites y normales II–III)');
{
  const E: any = ENEMIGOS;
  const T = (t: number, r = 0.5, self: any = { pv: 100, pvMax: 100, estados: {} }, al: any[] = []) =>
    (d: EnemigoDef) => d.ia(t, () => r, self, al);
  // Every move an enemy can pick (sampled over turns, rolls and «has allies or not»)
  const movimientos = (d: EnemigoDef) => {
    const out: any[] = [];
    for (let t = 0; t < 12; t++) for (const r of [0.05, 0.3, 0.5, 0.7, 0.95]) for (const al of [[], [{}]]) {
      out.push(T(t, r, { pv: 100, pvMax: 100, estados: {} }, al)(d));
      out.push(T(t, r, { pv: 30, pvMax: 100, estados: {} }, al)(d));
    }
    return out;
  };
  const total = (m: any) => (m.dano ?? 0) * (m.veces ?? 1);

  // The Beholder: harder rays that still twist your turn, plus a Disintegration Ray
  const rayos = movimientos(E.CONTEMPLADOR).filter((m) => m.intencion === 'ataque');
  const desintegrador = rayos.find((m) => /desintegr/i.test(m.nombre));
  check(!!desintegrador && desintegrador.dano >= 40 && (desintegrador.veces ?? 1) === 1 && !desintegrador.efectos?.length,
    `el Contemplador tiene un Rayo Desintegrador: un solo golpe enorme sin efectos (${desintegrador?.dano ?? '—'})`);
  const cromaticos = rayos.filter((m) => m !== desintegrador && m.efectos?.length);
  check(cromaticos.length >= 5 && cromaticos.every((m) => m.dano >= 14),
    'sus rayos de color siguen aplicando efectos y hacen al menos 14 de daño');
  const coste = async (jefe: EnemigoDef) => {
    let perdidos = 0, n = 0;
    for (const clase of CLASES) for (let s = 1; s <= 3; s++) {
      const r = await simular(clase, s * 977 + 5, [jefe], { extra: 16, mejoras: 6, pv: 1500 });
      perdidos += r.combate.jugador.pvMax - Math.max(0, r.combate.jugador.pv); n++;
    }
    return perdidos / n;
  };
  const [cIgn, cCon] = [await coste(E.IGNIFAX), await coste(E.CONTEMPLADOR)];
  check(E.CONTEMPLADOR.pv[0] === 336 && E.CONTEMPLADOR.pv[1] === 336, 'el Contemplador tiene 336 PV (un 20 % más que los 280 de antes)');
  check(E.FILACTERIA_VOLGUTH.pv[0] === 60 && E.FILACTERIA_VOLGUTH.pv[1] === 60, "la filacteria de Vol'guth tiene 60 PV");
  check(cCon >= cIgn * 0.8, `el Contemplador cuesta casi tanta vida como Ignifax (${Math.round(cCon)} frente a ${Math.round(cIgn)} PV)`);

  // Unique abilities: every Act II/III elite and every Act III normal has one (★ trait)
  const elites = [...new Set(ACTOS.slice(1).flatMap((a) => a.flatMap((c) => c.elites.flat())))]; // a group may repeat a def
  const normales3 = [...new Set(ACTOS[2].flatMap((c) => c.normales.flat()))];
  for (const d of [...elites, ...normales3]) check(!!d.rasgo?.nombre && !!d.rasgo?.texto, `${d.nombre}: tiene una habilidad única (★)`);
  const nombresRasgo = [...elites, ...normales3].map((d) => d.rasgo?.nombre);
  check(new Set(nombresRasgo).size === nombresRasgo.length, 'ninguna habilidad única se repite');

  // Act II normals: more stats; Act III normals: better stats
  const antes2: Record<string, [number, number]> = {
    'esqueleto-guerrero': [24, 12], 'esqueleto-arquero': [18, 10], zombi: [34, 12], espectro: [26, 9], necrofago: [28, 12],
    'acolito-velado': [20, 8], 'lanzador-vacio': [18, 10], diablillo: [16, 8], 'sabueso-infernal': [30, 11], poseido: [26, 12], flagelante: [22, 8],
  };
  const antes3: Record<string, [number, number]> = {
    'kobold-lancero': [30, 14], 'kobold-hechicero': [28, 10], 'cultista-dragon': [36, 16], 'draco-joven': [44, 13], 'elemental-magma': [38, 14],
    azotamentes: [34, 12], 'lacayo-engendrado': [30, 11], 'cubo-gelatinoso': [44, 13], 'reptador-carronero': [30, 10], 'ojo-flotante': [22, 9], 'horror-tentacular': [38, 13],
  };
  for (const [antes, acto, pvMult] of [[antes2, 1, 1.12], [antes3, 2, 1.15]] as const) {
    for (const d of [...new Set(ACTOS[acto].flatMap((c) => c.normales.flat()))]) {
      const [pv0, golpe0] = antes[d.id] ?? [0, 0];
      const golpe = Math.max(...movimientos(d).map(total));
      check(d.pv[0] >= Math.floor(pv0 * pvMult) && golpe >= golpe0 + 2,
        `${d.nombre}: más PV (${pv0} → ${d.pv[0]}) y más daño (${golpe0} → ${golpe})`);
    }
  }

  // Engine: the mechanics behind the new abilities
  const probar = async (defs: EnemigoDef[], semilla = 8100) => {
    const c = new Combate(nuevaRun('mago', semilla), defs, crearRng(semilla), uiSilenciosa);
    await c.iniciar();
    c.run.reliquias.length = 0; // clean numbers: no relic reacts to anything
    c.jugador.bloqueo = 0;
    c.jugador.estados = {};
    return c;
  };
  const quieto = (id: string, extra: Partial<EnemigoDef> = {}): EnemigoDef =>
    ({ id, nombre: id, arte: '?', pv: [60, 60], ia: () => ({ nombre: 'Esperar', intencion: 'defensa', bloqueo: 0 }), ...extra });
  {
    const c = await probar([quieto('acorazado', { estadosIniciales: { coraza: 3 } as any })]);
    await c.contexto(c.enemigos[0]).atacar(c.enemigos[0], 10);
    check(c.danoRecibido(c.enemigos[0], 10) === 7 && c.enemigos[0].pv === 53, 'Coraza: cada golpe que recibe se reduce en esa cantidad');
  }
  {
    const c = await probar([quieto('regenera', { estadosIniciales: { regeneracion: 5 } as any })]);
    c.enemigos[0].pv = 40;
    c.jugador.bloqueo = 999;
    await c.terminarTurno();
    check(c.enemigos[0].pv === 45, 'un enemigo con Regeneración se cura al inicio de su turno');
  }
  {
    const muro: EnemigoDef = quieto('muro', { conservaBloqueo: true, ia: () => ({ nombre: 'Muro', intencion: 'defensa', bloqueo: 10 }) } as any);
    const c = await probar([muro]);
    await c.terminarTurno(); await c.terminarTurno();
    check(c.enemigos[0].bloqueo === 20, 'con Juramento Inquebrantable su bloqueo se acumula de un turno a otro');
  }
  {
    const vamp: EnemigoDef = quieto('vampiro', { vampirico: 0.5, ia: () => ({ nombre: 'Mordisco', intencion: 'ataque', dano: 10 }) } as any);
    const c = await probar([vamp]);
    c.enemigos[0].pv = 30;
    await c.terminarTurno();
    check(c.enemigos[0].pv === 35, 'un enemigo vampírico se cura la mitad del daño que te hace');
  }
  {
    const fan: EnemigoDef = quieto('fanatico', { alMorirAliado: { efectos: [['fuerza', 3]], cura: 5 } } as any);
    const c = await probar([fan, quieto('victima', { pv: [5, 5] })]);
    c.enemigos[0].pv = 40;
    await c.infligir(c.enemigos[1], 99);
    check((c.enemigos[0].estados.fuerza ?? 0) === 3 && c.enemigos[0].pv === 45, 'cuando muere un aliado, el fanático gana Fuerza y se cura');
  }
  {
    const bomba: EnemigoDef = quieto('bomba', { alMorir: { nombre: 'Estallido', dano: 9, efectos: [['fragil', 1, true]] } } as any);
    const c = await probar([bomba]);
    const pv = c.jugador.pv;
    await c.infligir(c.enemigos[0], 999);
    check(c.jugador.pv === pv - 9 && (c.jugador.estados.fragil ?? 0) === 1, 'al morir, estalla: te hace daño y te aplica su efecto');
  }
  {
    const colmena: EnemigoDef = quieto('colmena', { protegidoPorAliados: true } as any);
    const c = await probar([colmena, quieto('ojo')]);
    await c.contexto(c.enemigos[0]).atacar(c.enemigos[0], 10);
    const conOjo = 60 - c.enemigos[0].pv;
    await c.infligir(c.enemigos[1], 999);
    await c.contexto(c.enemigos[0]).atacar(c.enemigos[0], 10);
    check(conOjo === 5 && c.enemigos[0].pv === 45, 'Mente Colmena: recibe la mitad de daño mientras le quede algún aliado');
  }
  {
    const lector: EnemigoDef = quieto('lector', { ia: () => ({ nombre: 'Leer', intencion: 'perjuicio', efectos: [['robaMenos', 2, true]] }) } as any);
    const c = await probar([lector]);
    c.jugador.bloqueo = 999;
    await c.terminarTurno();
    check(c.jugador.mano.length === 3 && !(c.jugador.estados.robaMenos ?? 0), 'Mente Fracturada: robas esa cantidad de cartas menos y se va');
  }
  {
    const ojo: EnemigoDef = quieto('mirada', { ia: () => ({ nombre: 'Mirada', intencion: 'ataque', dano: 8, perforante: true }) } as any);
    const c = await probar([ojo]);
    const pv = c.jugador.pv;
    c.jugador.bloqueo = 20;
    await c.terminarTurno();
    check(c.jugador.pv === pv - 8, 'un ataque perforante ignora tu bloqueo');
  }
  {
    const escudero: EnemigoDef = quieto('escudero', { ia: () => ({ nombre: 'Escudo', intencion: 'defensa', bloqueoAliados: 6 }) } as any);
    const c = await probar([quieto('aliado'), escudero]);
    c.jugador.bloqueo = 999;
    // the ally acts first (its block resets at its turn), then the escudero shields everyone
    await c.terminarTurno();
    check(c.enemigos[0].bloqueo === 6 && c.enemigos[1].bloqueo === 6, 'Protector del Nido: da bloqueo a todos los enemigos');
  }
  const util = await import('../src/ui/util.ts').catch(() => null) as any;
  if (util) for (const k of ['coraza', 'robaMenos']) check(!!util.ICONO_ESTADO?.[k] && !!util.NOMBRE_ESTADO?.[k] && !!util.DESCRIPCION_ESTADO?.[k], `el estado «${k}» tiene icono, nombre y descripción`);
}

// ── Wizard rebalance (v8.3.0): more ways to win spell slots back ────────────
console.log('\n🔮 Reequilibrio del mago');
{
  const { crearEspacios } = await import('../src/core/conjuros.ts');
  const { cartaPorId, CARTAS_RETIRADAS } = await import('../src/core/cartas.ts');
  const objetivo = (): EnemigoDef => ({ id: 'muneco-mago', nombre: 'Muñeco', arte: '🎯', pv: [300, 300], ia: () => ({ nombre: 'Esperar', intencion: 'defensa' }) } as any);
  async function montarMago(espacios = 6, enemigos = 1) {
    const run = nuevaRun('mago', 8080);
    run.reliquias = [];
    const comb = new Combate(run, Array.from({ length: enemigos }, objetivo), crearRng(8080), uiSilenciosa);
    await comb.iniciar();
    comb.jugador.descarte.push(...comb.jugador.mano);
    comb.jugador.mano = [];
    comb.jugador.energia = 99;
    comb.jugador.conjuros = crearEspacios(espacios);
    comb.enemigos.forEach((e) => { e.bloqueo = 0; e.estados = {}; });
    return comb;
  }
  async function jugar(comb: Combate, id: string, mejorada = false, objetivoI = 0) {
    const inst = instanciar(cartaPorId(id)!);
    inst.mejorada = mejorada;
    comb.jugador.mano.push(inst);
    await comb.jugarCarta(inst, comb.enemigos[objetivoI]);
    return inst;
  }
  const danoDe = async (id: string, mejorada = false, espacios = 6) => {
    const comb = await montarMago(espacios);
    const pv = comb.enemigos[0].pv;
    await jugar(comb, id, mejorada);
    return pv - comb.enemigos[0].pv;
  };
  const bloqueoDe = async (id: string, mejorada = false, espacios = 6) => {
    const comb = await montarMago(espacios);
    await jugar(comb, id, mejorada);
    return comb.jugador.bloqueo;
  };
  const def = (id: string, mejorada = false) => { const i = instanciar(cartaPorId(id)!); i.mejorada = mejorada; return defDe(i); };

  check(await bloqueoDe('armadura-mago') === 7 && await bloqueoDe('armadura-mago', true) === 10, 'Armadura de Mago: 7 / 10 de bloqueo');
  check(def('bola-fuego').coste === 2 && def('bola-fuego', true).coste === 2, 'Bola de Fuego cuesta 2');
  check(await danoDe('bola-fuego') === 30 && await danoDe('bola-fuego', true) === 36, 'Bola de Fuego: 18 / 24 (+4 por nivel; nivel 3 gastado)');
  {
    const comb = await montarMago(1);
    await jugar(comb, 'canalizar-mana', true);
    check(comb.jugador.conjuros.length === 3 && def('canalizar-mana', true).coste === 1, 'Canalizar Maná+: cuesta 1 y gana 2 espacios de conjuro');
    const base = await montarMago(1);
    await jugar(base, 'canalizar-mana');
    check(base.jugador.conjuros.length === 2, 'Canalizar Maná: gana 1 espacio de conjuro');
  }
  check(await danoDe('dictado-veloz') === 8 && await danoDe('dictado-veloz', true) === 12, 'Dictado Veloz: 4 / 6 de daño dos veces');
  {
    const comb = await montarMago();
    await jugar(comb, 'dictado-veloz', true);
    check(comb.jugador.conjuroEscrito === 8, 'Dictado Veloz+: sigue escribiendo 4 por golpe');
  }
  check(await bloqueoDe('escudo-arcano') === 34 && await bloqueoDe('escudo-arcano', true) === 37, 'Escudo Arcano: 4 / 7 (+3 por cada nivel libre)');
  check(!/siguiente turno/.test(def('escuela-abjuracion').texto) && !/siguiente turno/.test(def('escuela-abjuracion', true).texto),
    'Clarividencia ya no dice «a partir del siguiente turno»');
  {
    const comb = await montarMago();
    const e0 = comb.jugador.energiaMax;
    await jugar(comb, 'escuela-abjuracion');
    check(comb.jugador.energiaMax === e0 + 1, 'Clarividencia: sigue dando +1 de energía máxima');
  }
  check(await danoDe('escuela-evocacion') === 38 && await danoDe('escuela-evocacion', true) === 44, 'Desintegrar: 20 / 26 (+6 por nivel)');
  {
    const comb = await montarMago(6, 2);
    await jugar(comb, 'glifo-mordiente');
    check(comb.jugador.conjuroEscrito === 4 && comb.enemigos.every((e) => e.estados.debil === 1), 'Glifo Mordiente: Escribir 4 y 1 de Débil a todos');
    const m = await montarMago(6, 2);
    await jugar(m, 'glifo-mordiente', true);
    check(m.jugador.conjuroEscrito === 5 && m.enemigos.every((e) => e.estados.debil === 2), 'Glifo Mordiente+: Escribir 5 y 2 de Débil a todos');
    check(m.enemigos.every((e) => e.pv === 300) && comb.enemigos.every((e) => e.pv === 300), 'Glifo Mordiente ya no hace daño');
    check(def('glifo-mordiente').tipo === 'habilidad' && def('glifo-mordiente').rareza === 'infrecuente', 'Glifo Mordiente es una habilidad poco común');
    check(def('dictado-veloz').rareza === 'comun', 'Dictado Veloz es común');
  }
  check(await danoDe('manos-ardientes') === 10 && await danoDe('manos-ardientes', true) === 13, 'Manos Ardientes: 4 / 7 (+2 por nivel)');
  check(await danoDe('rayo-escarcha') === 7 && await danoDe('rayo-escarcha', true) === 8, 'Rayo de Escarcha: 7 / 8 de daño');
  {
    const comb = await montarMago();
    const pv = comb.jugador.pv;
    comb.jugador.conjuros.forEach((e) => (e.gastado = true));
    await jugar(comb, 'sacrificio-arcano');
    check(comb.jugador.pv === pv - 4 && comb.jugador.conjuros.filter((e) => !e.gastado).map((e) => e.nivel).join() === '3',
      'Sacrificio Arcano: pierde 4 PV y recupera el de mayor nivel');
    const m = await montarMago();
    m.jugador.conjuros.forEach((e) => (e.gastado = true));
    await jugar(m, 'sacrificio-arcano', true);
    check(m.jugador.pv === pv - 3 && m.jugador.conjuros.filter((e) => !e.gastado).map((e) => e.nivel).sort().join() === '1,3',
      'Sacrificio Arcano+: pierde 3 PV, recupera el de mayor nivel y también uno de nivel 1');
    const sinUno = await montarMago();
    sinUno.jugador.conjuros.filter((e) => e.nivel > 1).forEach((e) => (e.gastado = true));
    await jugar(sinUno, 'sacrificio-arcano', true);
    check(sinUno.jugador.conjuros.filter((e) => e.gastado).map((e) => e.nivel).sort().join() === '2,2',
      'Sacrificio Arcano+: si no falta ninguno de nivel 1, solo recupera el de mayor nivel');
  }
  check(def('toque-vampirico').requiereConjuro === 1, 'Toque Vampírico ya no exige un espacio de nivel 2+');
  check(await danoDe('toque-vampirico', false, 1) === 15 && await danoDe('toque-vampirico', true) === 23, 'Toque Vampírico: 12 / 14 (+3 por nivel)');
  {
    const comb = await montarMago();
    comb.jugador.mazo.push(...['golpe', 'golpe', 'golpe'].map((id) => instanciar(cartaPorId(id)!)));
    await jugar(comb, 'truco-magia');
    check(comb.jugador.mano.length === 2 && def('truco-magia').coste === 1 && def('truco-magia', true).coste === 0,
      'Truco de Magia: roba 2 cartas y cuesta 1 / 0');
  }
  // Arma Mágica replaces Rayo Abrasador
  check(!cartaPorId('rayo-abrasador') && CARTAS_RETIRADAS['rayo-abrasador'] === 'arma-magica', 'Rayo Abrasador se retira en favor de Arma Mágica');
  {
    const arma = cartaPorId('arma-magica')!;
    check(arma?.tipo === 'poder' && arma.clase === 'mago' && arma.requiereConjuro === 1, 'Arma Mágica: poder del mago que gasta un conjuro');
    const comb = await montarMago();
    await jugar(comb, 'arma-magica'); // spends the level 3 slot: 2 + 3
    const pv = comb.enemigos[0].pv;
    await jugar(comb, 'golpe');
    await jugar(comb, 'defender');
    check(pv - comb.enemigos[0].pv === 11 && comb.jugador.bloqueo === 10, 'Arma Mágica (nivel 3): tus Golpes +5 de daño y tus Defender +5 de bloqueo');
    const m = await montarMago(1);
    await jugar(m, 'arma-magica', true); // level 1: 4 + 1
    const pv2 = m.enemigos[0].pv;
    await jugar(m, 'golpe');
    check(pv2 - m.enemigos[0].pv === 11, 'Arma Mágica+ (nivel 1): tus Golpes +5 de daño');
    const util = await import('../src/ui/util.ts') as any;
    check(!!util.ICONO_ESTADO?.armaMagica && !!util.NOMBRE_ESTADO?.armaMagica && !!util.DESCRIPCION_ESTADO?.armaMagica, 'el estado «armaMagica» tiene icono, nombre y descripción');
  }
}

// ── The Senescal and Síbila speak of the map that was actually drawn ─────────
console.log('\n🗺️ Discursos según el mapa');
{
  const BD = await import('../src/core/bendiciones.ts');
  const fs = await import('node:fs');
  const [ogro, contrabandistas] = [BD.discursoSenescal(0), BD.discursoSenescal(1)];
  check(/Gorzug/.test(ogro) && !/Vexis/.test(ogro), 'el Senescal habla de Gorzug en el Asentamiento Ogro');
  check(/Vexis/.test(contrabandistas) && !/Gorzug/.test(contrabandistas), 'el Senescal habla de Vexis en la Guarida de los Contrabandistas');
  check([ogro, contrabandistas].every((t) => !/muertos|cripta|Vol'guth|Malachar/i.test(t)),
    'el Senescal no adelanta el Acto II (aún no se ha sorteado)');
  const sibila = [[1, 0, /Vol'guth/], [1, 1, /Malachar/], [2, 0, /Ignifax/], [2, 1, /Contemplador/]] as const;
  for (const [cap, esc, jefe] of sibila) {
    check(jefe.test(BD.discursoSibila(cap, esc)), `Síbila anuncia al jefe del Acto ${cap + 1}, escenario ${esc + 1} (${jefe.source})`);
  }
  check(new Set(sibila.map(([cap, esc]) => BD.discursoSibila(cap, esc))).size === 4, 'cada mapa de los Actos II y III tiene su propio mensaje de Síbila');
  const run = nuevaRun('mago', 31);
  avanzarCapitulo(run, crearRng(5), 1);
  check(run.capitulo === 1 && run.escenario === 1, 'avanzarCapitulo respeta el escenario ya sorteado (el que anunció Síbila)');
  const main = fs.readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  check(/pantallaBendicion\(run, rng, 'entreActos', siguiente\)[\s\S]*avanzarCapitulo\(run, rng, siguiente\)/.test(main),
    'el mapa del acto siguiente se sortea antes de Síbila y es el mismo que se juega');
}

// ── Phones in landscape: the spell pyramid fits in the 88 px hand strip ─────
console.log('\n📱 Pirámide de conjuros en el móvil');
{
  const fs = await import('node:fs');
  const movil = fs.readFileSync(new URL('../src/estilos/movil.css', import.meta.url), 'utf8');
  const apaisado = [...movil.matchAll(/@media \(orientation: landscape\) and \(max-height: 540px\) \{([\s\S]*?)\n\}/g)].map((m) => m[1]).join('\n');
  check(/\.energia\s*\{[^}]*flex-direction:\s*row/.test(apaisado), 'en el móvil apaisado la pirámide va al lado del orbe, no debajo');
  const tam = (sel: string) => Number(new RegExp(`${sel.replace('.', '\\.')}\\s*\\{[^}]*font-size:\\s*([\\d.]+)rem`).exec(apaisado)?.[1] ?? 99);
  check(tam('.espacio.nivel-3') <= 1.3 && tam('.espacio.nivel-2') <= 1.15 && tam('.espacio') <= 1,
    'y sus espacios son más pequeños, para que la pirámide entera quepa en la franja de la mano');
}

// ── Deaths in parallel: a kill does not hold up the rest of an area or multi-hit ──
console.log('\n💀 Muertes en paralelo');
{
  const { DeathQueue } = await import('../src/ui/death-queue.ts');
  const q = new DeathQueue();
  const fin: string[] = [];
  const t0 = performance.now();
  q.start('a', 40, () => fin.push('a'));
  q.start('b', 20, () => fin.push('b'));
  check(q.dying('a') && q.dying('b') && fin.length === 0, 'dos enemigos pueden estar muriendo a la vez');
  check(q.elapsed('a') >= 0 && q.elapsed('a') < 40 && q.elapsed('zz') === 0, 'se sabe cuánto lleva cada muerte (para retomar su animación)');
  await q.wait('b');
  check(fin.join('') === 'b' && q.dying('a') && !q.dying('b'), 'esperar una muerte no espera a las demás');
  await q.settle();
  check(fin.join('') === 'ba' && !q.dying('a') && performance.now() - t0 >= 38, 'asentar espera a que terminen todas las muertes');
  await q.wait('nadie');
  check(true, 'esperar a quien no está muriendo termina al instante');

  // the engine names the cause of death and waits for a body to fall before another takes its slot
  const registro: string[] = [];
  const ui: Presentador = {
    ...uiSilenciosa,
    fxMuerte: async (e: EnemigoCombate, causa?: string) => { registro.push(`muere:${e.def.id}:${causa ?? ''}`); },
    fxEsperarMuerte: async (e: EnemigoCombate) => { registro.push(`espera:${e.def.id}`); },
    fxMensaje: async (t: string) => { if (/se alza/.test(t)) registro.push('alza'); },
  } as Presentador;
  const run = nuevaRun('brujo', 77);
  run.reliquias = [];
  const comb = new Combate(run, [HERALDO_CULTO], crearRng(77), ui);
  await comb.iniciar();
  const [heraldo] = comb.enemigos;
  heraldo.estados.condena = 999;
  await comb.infligir(heraldo, heraldo.pv, 'condena', true, true);
  check(registro[0] === 'muere:heraldo-culto:condena', `la muerte por Condena llega a la interfaz con su causa (${registro[0]})`);
  check(registro.indexOf('espera:heraldo-culto') > 0 && registro.indexOf('espera:heraldo-culto') < registro.indexOf('alza'),
    'Abaddon no ocupa el hueco de Malachar hasta que este termina de caer');
  const run2 = nuevaRun('brujo', 78);
  run2.reliquias = [];
  const comb2 = new Combate(run2, [SENOR_CRIPTA], crearRng(78), ui);
  await comb2.iniciar();
  registro.length = 0;
  await comb2.infligir(comb2.enemigos[0], 999);
  check(registro[0] === 'muere:senor-cripta:' && registro[1] === 'espera:senor-cripta',
    "la filacteria no ocupa el sitio de Vol'guth hasta que su cuerpo termina de caer");
  const fs = await import('node:fs');
  const uiComb = fs.readFileSync(new URL('../src/ui/combate.ts', import.meta.url), 'utf8');
  const muerte = /async fxMuerte\(e, causa\) \{([\s\S]*?)\n      \},/.exec(uiComb)?.[1] ?? '';
  check(/causa === 'condena'/.test(muerte) && /fx\.hechizo\('almaCondenada'/.test(muerte),
    'quien muere por Condena suelta su alma, y unas cadenas la retienen hasta que se deshace');
}

// ── Vexis: your attacks on him land on him or on his illusions, at random ────
console.log('\n🃏 Las ilusiones de Vexis');
{
  const E = ENEMIGOS;
  const montarVexis = async (semilla: number, ilusiones = 2) => {
    const run = nuevaRun('barbaro', semilla);
    run.reliquias = [];
    const comb = new Combate(run, [E.EMBAUCADOR_ARCANO], crearRng(semilla), uiSilenciosa);
    await comb.iniciar();
    for (let i = 0; i < ilusiones; i++) comb.enemigos.push(E.crearEnemigo(E.IMAGEN_ILUSORIA, crearRng(semilla + i)));
    for (const e of comb.enemigos) { e.pv = e.pvMax = 999; e.bloqueo = 0; e.estados = {}; }
    comb.jugador.energia = 99;
    comb.jugador.estados = {};
    return comb;
  };
  const golpeA = async (comb: Combate, id: string, objetivo: EnemigoCombate) => {
    const inst = instanciar(cartaPorId(id)!);
    comb.jugador.mano.push(inst);
    const antes = comb.enemigos.map((e) => e.pv);
    await comb.jugarCarta(inst, objetivo);
    return comb.enemigos.findIndex((e, i) => e.pv < antes[i]);
  };
  const { cartaPorId } = await import('../src/core/cartas.ts');
  let aVexis = 0, aIlusion = 0;
  for (let s = 0; s < 40; s++) {
    const comb = await montarVexis(500 + s);
    const quien = await golpeA(comb, 'golpe', comb.enemigos[0]);
    if (quien === 0) aVexis++; else if (quien > 0) aIlusion++;
  }
  check(aVexis > 0 && aIlusion > 0 && aVexis + aIlusion === 40,
    `con sus ilusiones en pie, un ataque a Vexis cae al azar sobre él o sobre una ilusión (${aVexis} a Vexis, ${aIlusion} a ilusiones)`);
  check(aIlusion >= 15, `y las ilusiones se llevan su parte (unos dos tercios: ${aIlusion}/40)`);
  {
    let siempre = true;
    for (let s = 0; s < 10; s++) {
      const comb = await montarVexis(600 + s, 0);
      if ((await golpeA(comb, 'golpe', comb.enemigos[0])) !== 0) siempre = false;
    }
    check(siempre, 'sin ilusiones, el ataque llega siempre a Vexis');
  }
  {
    let coincide = 0;
    for (let s = 0; s < 10; s++) {
      const comb = await montarVexis(700 + s);
      const inst = instanciar(cartaPorId('golpe')!);
      const previsto = comb.objetivoReal(inst, comb.enemigos[0]);
      comb.jugador.mano.push(inst);
      const antes = comb.enemigos.map((e) => e.pv);
      await comb.jugarCarta(inst, comb.enemigos[0]);
      const golpeado = comb.enemigos.find((e, i) => e.pv < antes[i]);
      if (golpeado === previsto) coincide++;
    }
    check(coincide === 10, 'el objetivo que la interfaz prevé (adonde vuela la carta) es el que recibe el golpe');
  }
  {
    const comb = await montarVexis(800);
    const inst = instanciar(cartaPorId('golpe')!);
    check(comb.objetivoReal(inst, comb.enemigos[1]) === comb.enemigos[1], 'atacar directamente a una ilusión la golpea a ella');
  }
  const parpadeo = E.IMAGEN_ILUSORIA.ia(1, () => 0, {} as EnemigoCombate, []); // rng 0: Parpadeo
  check((parpadeo?.bloqueo ?? 0) > 4, `las ilusiones se protegen más con Parpadeo (${parpadeo?.bloqueo} de bloqueo)`);
}

// ── An enemy's poisoned hit only poisons if it gets past your block and summon ──
console.log('\n🧪 Veneno de los ataques');
{
  const venenoso: EnemigoDef = {
    id: 'muneco-venenoso', nombre: 'Muñeco', arte: '🎯', pv: [200, 200],
    ia: () => ({ nombre: 'Daga Untada', intencion: 'ataque', dano: 5, efectos: [['veneno', 3, true]] }),
  };
  const nube: EnemigoDef = {
    id: 'muneco-nube', nombre: 'Muñeco', arte: '🎯', pv: [200, 200],
    ia: () => ({ nombre: 'Nube', intencion: 'perjuicio', efectos: [['veneno', 2, true]] }),
  };
  const turno = async (def: EnemigoDef, preparar: (c: Combate) => void | Promise<void>) => {
    const run = nuevaRun('druida', 4321);
    run.reliquias = [];
    const comb = new Combate(run, [def], crearRng(4321), uiSilenciosa);
    await comb.iniciar();
    comb.jugador.estados = {};
    await preparar(comb);
    await comb.terminarTurno();
    // the poison ticks once at the start of your turn (and drops by 1): add it back
    return (comb.jugador.estados.veneno ?? 0) + (comb.jugador.estados.veneno ? 1 : 0);
  };
  check(await turno(venenoso, (c) => { c.jugador.bloqueo = 10; }) === 0, 'si tu bloqueo para todo el golpe, el veneno no entra');
  check(await turno(venenoso, (c) => { c.jugador.bloqueo = 2; }) === 3, 'si el golpe atraviesa el bloqueo, te envenena');
  check(await turno(venenoso, async (c) => { c.jugador.bloqueo = 0; await c.contexto().invocar('lobo', 10); }) === 0,
    'si tu invocación se lo traga entero, tampoco');
  check(await turno(nube, () => {}) === 2, 'el veneno que no viene con un golpe se aplica como siempre');
}

// ── A third elite per scenario: multi-enemy elites with their own mechanics ──
console.log('\n👥 Élites de grupo');
{
  const E = ENEMIGOS;
  const quieta = { nombre: 'Esperar', intencion: 'defensa' as const };
  const montarG = async (defs: EnemigoDef[], semilla = 9100, clase: ClaseId = 'barbaro') => {
    const run = nuevaRun(clase, semilla);
    run.reliquias = [];
    const comb = new Combate(run, defs, crearRng(semilla), uiSilenciosa, true);
    await comb.iniciar();
    comb.jugador.estados = {};
    comb.jugador.mano = [];
    return comb;
  };
  for (const [acto, esc, nombre] of [[0, 0, 'Asentamiento'], [0, 1, 'Contrabandistas'], [1, 0, 'Cripta'], [1, 1, 'Templo'], [2, 0, 'Dragón'], [2, 1, 'Laberinto']] as const) {
    const elites = ACTOS[acto][esc].elites;
    // the mimic chest comes alone, but wakes with a chair and a door
    const cuantos = elites[2].length + elites[2].reduce((n, d) => n + (d.durmiente?.despertar.length ?? 0), 0);
    check(elites.length === 3 && cuantos >= 2, `${nombre}: tiene un tercer élite, de varios enemigos (${elites[2].map((d) => d.id).join(', ')})`);
  }

  // Act I · Goblin horde: 4 weak goblins that take turns attacking and cheering
  {
    const horda = ACTOS[0][0].elites[2];
    check(horda.length === 4 && horda.every((d) => d.pv[1] <= 25), 'Horda Goblin: 4 goblins débiles (cada uno, poca vida)');
    for (const turno of [0, 1, 2]) {
      const movs = horda.map((d) => d.ia(turno, () => 0.5, {} as EnemigoCombate, []));
      const atacan = movs.filter((m) => m.intencion === 'ataque').length;
      const jalean = movs.filter((m) => (m.fuerzaAliados ?? 0) > 0).length;
      check(atacan === 2 && jalean === 2, `turno ${turno}: dos atacan y dos se dan Fuerza`);
    }
    const [a, b] = horda;
    check(a.ia(0, () => 0.5, {} as EnemigoCombate, []).intencion !== a.ia(1, () => 0.5, {} as EnemigoCombate, []).intencion
      && a.ia(0, () => 0.5, {} as EnemigoCombate, []).intencion !== b.ia(0, () => 0.5, {} as EnemigoCombate, []).intencion,
      'y se van alternando: el que atacó jalea al turno siguiente');
  }

  // Act I · Rat swarm: poison, and bites that grow with your poison
  {
    const enjambre = ACTOS[0][1].elites[2];
    check(enjambre.length >= 4 && enjambre.every((d) => /rata/.test(d.id)), `Enjambre de ratas (${enjambre.length} ratas)`);
    const rata = enjambre[0];
    const movs = Array.from({ length: 12 }, (_, i) => rata.ia(i, () => i / 12, {} as EnemigoCombate, []));
    check(movs.some((m) => m.efectos?.some(([e]) => e === 'veneno')), 'las ratas envenenan');
    const roer = movs.find((m) => m.masPorVeneno)!;
    check(!!roer, 'y tienen un mordisco que crece con tu veneno');
    const comb = await montarG([rata]);
    const r = comb.enemigos[0];
    r.intencion = { ...roer };
    comb.jugador.estados.veneno = 4;
    comb.jugador.bloqueo = 0;
    check(comb.danoIntencion(r) === (roer.dano ?? 0) + 4, `la intención ya cuenta tu veneno (${comb.danoIntencion(r)})`);
    const pv = comb.jugador.pv;
    await comb.terminarTurno();
    // the hero's poison ticks 4 at the start of the turn
    check(pv - comb.jugador.pv === (roer.dano ?? 0) + 4 + 4, `el mordisco hace ${(roer.dano ?? 0)} + tu veneno (4) de daño`);
  }

  // Act II · Skeletal adventurers: three different classes out of a bigger pool
  {
    const grupo = ACTOS[1][0].elites[2];
    check(grupo.length === 3 && grupo.every((d) => (d.variantes?.length ?? 0) >= 8), 'Aventureros esqueléticos: tres huecos que salen de un conjunto de 8+ clases');
    const vistos = new Set<string>();
    let distintos = true;
    for (let s = 0; s < 12; s++) {
      const comb = await montarG(grupo, 9200 + s);
      const ids = comb.enemigos.map((e) => e.def.id);
      ids.forEach((id) => vistos.add(id));
      if (new Set(ids).size !== 3 || ids.some((id) => !/^aventurero-/.test(id))) distintos = false;
    }
    check(distintos, 'cada combate trae tres clases distintas');
    check(vistos.size >= 6, `y van variando entre combates (${vistos.size} clases vistas en 12)`);
    const variantes = grupo[0].variantes!;
    check(variantes.every((d) => !!d.rasgo?.nombre) && new Set(variantes.map((d) => d.rasgo!.nombre)).size === variantes.length,
      'cada clase tiene su poder único (★)');
    const clerigo = variantes.find((d) => d.id === 'aventurero-clerigo')!;
    const cura = Array.from({ length: 6 }, (_, i) => clerigo.ia(i, () => 0.5, {} as EnemigoCombate, [])).find((m) => (m.curaAliados ?? 0) > 0)!;
    const comb = await montarG([clerigo, E.CABALLERO_TUMBARIO]);
    const [c, aliado] = comb.enemigos;
    aliado.pv = aliado.pvMax - 20;
    c.intencion = { ...cura };
    aliado.intencion = quieta as any;
    comb.jugador.bloqueo = 999;
    await comb.terminarTurno();
    check(aliado.pvMax - aliado.pv < 20, 'el clérigo cura a sus compañeros');
  }

  // Act II · Incubus and succubus: while one seduces you, the other strikes
  {
    const pareja = ACTOS[1][1].elites[2];
    check(pareja.map((d) => d.id).sort().join() === 'incubo,sucubo', 'Íncubo y Súcubo');
    let alternan = true;
    for (let t = 0; t < 6; t++) {
      const [m1, m2] = pareja.map((d) => d.ia(t, () => 0.5, {} as EnemigoCombate, []));
      const seduce = (m: Movimiento) => m.intencion === 'perjuicio';
      if (!((seduce(m1) && m2.intencion === 'ataque') || (seduce(m2) && m1.intencion === 'ataque'))) alternan = false;
    }
    check(alternan, 'cada turno uno te seduce y el otro clava sus garras, por turnos');
  }

  // Act III · Dragonborn guards and the fire elemental bound to them
  {
    const guardas = ACTOS[2][0].elites[2];
    check(guardas.length === 3 && guardas.every((d) => d.id === 'guardia-draconido'), 'Guardas dracónidos: tres');
    const comb = await montarG(guardas);
    const [g1, g2, g3] = comb.enemigos;
    await comb.infligir(g1, 999);
    const ele = comb.enemigos.find((e) => e.def.id === 'elemental-fuego' && e.vivo);
    check(!!ele, 'al caer un dracónido aparece un elemental de fuego');
    await comb.infligir(ele!, 999);
    check(ele!.vivo && ele!.pv >= 1, 'el elemental no muere mientras quede algún dracónido');
    await comb.contexto().matar(ele!);
    check(ele!.vivo, 'ni siquiera con una muerte instantánea');
    await comb.infligir(g2, 999);
    const vivosEle = () => comb.enemigos.filter((e) => e.def.id === 'elemental-fuego' && e.vivo).length;
    check(vivosEle() === 2, 'cada dracónido que cae suelta su elemental');
    await comb.infligir(g3, 999);
    check(vivosEle() === 0 && comb.terminado === 'victoria', 'al caer el último dracónido, los elementales se extinguen (y ninguno nuevo)');
  }

  // Act III · The mimic: a chest that sleeps until hit, then the chair and the door attack too
  {
    const mimico = ACTOS[2][1].elites[2];
    check(mimico[0]?.id === 'mimico-cofre', 'Mímico: empieza siendo un cofre');
    const comb = await montarG(mimico);
    const cofre = comb.enemigos[0];
    check(/dormid/i.test(cofre.intencion.nombre) && cofre.intencion.dano === undefined, `está dormido (${cofre.intencion.nombre})`);
    const pv0 = comb.jugador.pv;
    await comb.terminarTurno();
    check(comb.jugador.pv === pv0 && comb.enemigos.length === 1, 'dormido no hace nada');
    const pv1 = comb.jugador.pv;
    comb.jugador.bloqueo = 0;
    await comb.infligir(cofre, 5);
    const ids = comb.enemigos.map((e) => e.def.id);
    check(ids.includes('mimico-silla') && ids.includes('mimico-puerta'), 'al golpearlo despierta y acuden la silla y la puerta mímicas');
    check(comb.jugador.pv < pv1, 'que atacan por sorpresa en el acto');
    check(cofre.intencion.intencion === 'ataque', 'y el cofre ya va a por ti');
    // without being hit, it wakes by itself after 3 turns
    const otro = await montarG(mimico, 9301);
    for (let t = 0; t < 3; t++) { otro.jugador.bloqueo = 999; await otro.terminarTurno(); }
    check(otro.enemigos.some((e) => e.def.id === 'mimico-silla'), 'si no lo tocas, despierta solo a los 3 turnos');
  }

  // Every new elite is in the gallery with its puppet (variants and summons included)
  const galeria = galleryCatalogue().flatMap((s) => s.cards).map((c) => c.id);
  const nuevos = ['goblin-saqueador', 'goblin-jaleador', 'rata-alcantarilla', 'rata-gigante', 'incubo', 'sucubo', 'guardia-draconido', 'elemental-fuego',
    'mimico-cofre', 'mimico-silla', 'mimico-puerta', ...ACTOS[1][0].elites[2][0].variantes!.map((d) => d.id)];
  check(nuevos.every((id) => galeria.includes(id)), `los enemigos nuevos salen en la galería (faltan: ${nuevos.filter((id) => !galeria.includes(id)).join(', ') || '—'})`);
}

console.log(fallos === 0 ?'\n✅ Todo correcto' : `\n❌ ${fallos} fallos`);
process.exit(fallos === 0 ? 0 : 1);
