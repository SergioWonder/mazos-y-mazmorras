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
  recompensaCartas, DRUIDA, BARBARO, MAGO, PICARO, BRUJO, BASICAS, NEUTRALES_ESPECIALES, instanciar, mazoInicial, defDe,
  poolDeClase, cartaUnicaDeClase, CONJURO_PRODIGIOSO, DAGA, MALDICIONES,
} from '../src/core/cartas.ts';
import { piramideConjuros } from '../src/core/conjuros.ts';
import { EVENTOS_POSITIVOS, EVENTOS_NEGATIVOS, elegirEvento } from '../src/core/eventos.ts';
import { ARTE_CARTA } from '../src/ui/carta.ts';
import * as ENEMIGOS from '../src/core/enemigos.ts';
import { ENEMY_RIGS, INVOCATION_RIGS } from '../src/fx/enemy-rigs.ts';
import { galleryCatalogue } from '../src/ui/gallery-catalogue.ts';
import { pickSvg } from '../src/ui/card-svgs.ts';
import { packRig, spriteMatrix, MAX_POLY, PIECE_TEXELS } from '../src/fx/puppet-gpu.ts';
import { majorOf, isMajorUpgrade, majorChangelog, shouldNotifyMajor } from '../src/core/versions.ts';
import { hasFullArt } from '../src/ui/card-looks.ts';
import { spawnEffect, stepParticles, EFFECTS, type Particle } from '../src/fx/particle-sim.ts';
import { sceneBackground } from '../src/fx/background.ts';
import { MUSIC_TRACKS, loopWindow, MP3_DELAY_SAMPLES } from '../src/fx/music-tracks.ts';
import { puppetPose, puppetBones, puppetEffects, emitterWorld, boneParent } from '../src/fx/puppet.ts';
import { WING_BONES, wingSpan } from '../src/fx/wing.ts';
import { HERO_RIGS, FORM_RIGS, formFromLabel, currentForm, heroPose, heroBones, heroEffects, activeAction, ACTION_DURATION } from '../src/fx/hero-rig.ts';
import type { CartaDef, CartaInstancia, ClaseId, EnemigoCombate, EnemigoDef } from '../src/core/types.ts';

const CLASES = ['druida', 'barbaro', 'mago', 'picaro', 'brujo'] as ClaseId[];

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
interface OpcionesSim { extra?: number; mejoras?: number }

async function simular(
  clase: ClaseId, semilla: number, defs: EnemigoDef[], op: OpcionesSim = {},
) {
  const run = nuevaRun(clase, semilla);
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
  while (!combate.terminado && turnos < 60) {
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
    ...BASICAS, ...DRUIDA, ...BARBARO, ...MAGO, ...PICARO, ...BRUJO,
    ...NEUTRALES_ESPECIALES, ...MALDICIONES, CONJURO_PRODIGIOSO, DAGA,
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

  const canalizar = instanciar(MAGO.find((c) => c.id === 'canalizar-mana')!);
  canalizar.mejorada = true;
  check(defDe(canalizar).coste === 0, 'la mejora puede reducir el coste (Canalizar Maná+ = 0)');

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

  // Vol'guth: la filacteria lo revive con 60 PV, invulnerable 1 turno y sediento
  const run2 = nuevaRun('mago', 6666);
  const combate2 = new Combate(run2, [SENOR_CRIPTA], crearRng(6666), uiSilenciosa);
  await combate2.iniciar();
  const liche = combate2.enemigos[0];
  liche.pv = 5;
  await combate2.contexto(liche).atacar(liche, 99);
  check(liche.vivo && liche.pv === 60, 'la filacteria lo revive con 60 PV');
  check((liche.estados.invulnerable ?? 0) === 1, 'y queda invulnerable');
  await combate2.contexto(liche).atacar(liche, 999);
  check(liche.vivo && liche.pv === 60, 'invulnerable: no recibe daño ese turno');
  combate2.jugador.bloqueo = 999;
  await combate2.terminarTurno(); // su turno consume la invulnerabilidad
  check((liche.estados.invulnerable ?? 0) === 0, 'la invulnerabilidad dura 1 turno');
  const drena = ['Drenar Vida', 'Lluvia de Huesos Voraz', 'Nova Necrótica Voraz', 'Maldición del Despertar'];
  for (let t = 0; t < 4 && liche.vivo; t++) {
    if (liche.intencion.cura && liche.intencion.dano) break;
    combate2.jugador.bloqueo = 999;
    combate2.jugador.pv = combate2.jugador.pvMax;
    await combate2.terminarTurno();
  }
  check(
    drena.includes(liche.intencion.nombre) || liche.filacteriaUsada === true,
    'tras despertar, sus ataques drenan vida',
  );
  await combate2.contexto(liche).atacar(liche, 999);
  check(!liche.vivo && combate2.terminado === 'victoria', 'la segunda muerte es definitiva');
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
  check(!recu.exhumar, 'Recuperación Arcana ya no se agota');
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
    check(60 - e.pv === 24, 'Emboscada: 10 + 14 = 24 si el enemigo no ataca');
    const e2 = comb.enemigos[0]; e2.pv = e2.pvMax = 60; e2.bloqueo = 0;
    e2.intencion = { nombre: 'Tajo', intencion: 'ataque', dano: 8 };
    await emboscada.jugar(comb.contexto(e2));
    check(60 - e2.pv === 10, 'Emboscada: solo 10 si el enemigo sí ataca');
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
    check(60 - b.pv === 5, 'y el otro enemigo también (rebota a todos)');
    check((comb.jugador.estados.agathys ?? 0) === 0, 'Agathys solo dura ese turno');
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
    check(60 - e.pv === 8, 'Sacrificio del Familiar inflige los 8 de vida que quedaban');
    check(comb.jugador.invocacion === undefined, 'la invocación desaparece');
    check(comb.jugador.energia === energiaAntes + 1, 'y devuelve 1 de energía');
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


  // Don del Patrón: la Explosión pasa a costar 0
  {
    const run = nuevaRun('brujo', 5019);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(5019), uiSilenciosa);
    await comb.iniciar();
    const exp = instanciar(carta('explosion-sobrenatural'));
    check(comb.costeEfectivo(exp.def) === 1, 'la Explosión cuesta 1 de partida');
    await carta('don-del-patron').jugar(comb.contexto());
    check(comb.costeEfectivo(exp.def) === 0, 'Don del Patrón: la Explosión cuesta 0');
    check(comb.costeEfectivo(carta('sacudida-abisal')) === 1, 'y no abarata otras cartas');
    // el Rayo Carmesí del Contemplador sigue encareciendo por encima
    comb.jugador.estados.cartasSobrecoste = 1;
    check(comb.costeEfectivo(exp.def) === 1, 'con Sobrecarga vuelve a costar 1');
    delete comb.jugador.estados.cartasSobrecoste;
    // y se puede lanzar sin gastar energía
    comb.jugador.mano = [exp];
    comb.jugador.energia = 0;
    const e = comb.enemigos[0]; e.pv = e.pvMax = 60; e.bloqueo = 0;
    await comb.jugarCarta(exp, e);
    check(60 - e.pv === 7, 'se lanza con 0 de energía');
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
    check((e.estados.condena ?? 0) === 25, 'Verbo de Aniquilación: la mitad de sus 50 PV = 25');
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
    check(comb.jugador.efectosTemporales[0].turnos === 4, 'y dura 4 turnos');
    check(comb.estaTransformadoPublico(), 'el druida queda transformado');
    // 4 turnos: aguanta y al quinto se cae
    for (let i = 0; i < 3; i++) { defender(comb); await comb.terminarTurno(); }
    check((comb.jugador.estados.fuerza ?? 0) === base + 2, 'la Fuerza sigue al cuarto turno');
    defender(comb); await comb.terminarTurno();
    check((comb.jugador.estados.fuerza ?? 0) === base, 'y se retira al expirar la forma');
  }

  // Corazón del Cambiante: más turnos y más Fuerza por forma
  {
    const run = nuevaRun('druida', 6002);
    const comb = new Combate(run, [GOBLIN_CORTADOR], crearRng(6002), uiSilenciosa);
    await comb.iniciar();
    const base = comb.jugador.estados.fuerza ?? 0;
    await carta('corazon-cambiante').jugar(comb.contexto());
    check((comb.jugador.estados.formaProlongada ?? 0) === 2, 'Corazón del Cambiante: +2 turnos');
    check((comb.jugador.estados.formaPotenciada ?? 0) === 1, 'y +1 de Fuerza por forma');
    await carta('forma-lobo').jugar(comb.contexto(comb.enemigos[0]));
    check((comb.jugador.estados.fuerza ?? 0) === base + 3, 'Forma de Lobo pasa a dar +3 de Fuerza');
    check(comb.jugador.efectosTemporales[0].turnos === 6, 'y a durar 6 turnos');
    // el refuerzo va al atributo propio de la forma: Águila da Destreza
    const dex = comb.jugador.estados.destreza ?? 0;
    await carta('forma-aguila').jugar(comb.contexto());
    check((comb.jugador.estados.destreza ?? 0) === dex + 3, 'Forma de Águila pasa a dar +3 de Destreza');
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
    const a = new an.PuppetAnimator(six);
    const t0 = performance.now();
    for (let i = 0; i < 600; i++) a.frame(i / 60, attackAt(1)(i / 60));
    const ms = (performance.now() - t0) / 600;
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
  const normales = defs.filter((d) => !d.esJefe);
  check(normales.length >= 40, `hay ${normales.length} enemigos normales y de élite`);
  for (const d of normales) {
    const rig = ENEMY_RIGS[d.id];
    check(!!rig && rig.shapes.length >= 10, `${d.nombre}: tiene marioneta ilustrada`);
  }
  // jefes: marioneta propia, emisores de partículas y ráfagas al atacar y morir
  const jefes = defs.filter((d) => d.esJefe);
  check(jefes.length === 7, `hay ${jefes.length} jefes`);
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

// ── Galería de sprites del menú principal ────────────────────────────────────
console.log('\n🎭 Galería de sprites');
{
  const secciones = galleryCatalogue();
  const todas = secciones.flatMap((s) => s.cards);
  const de = (kind: string) => todas.filter((f) => f.kind === kind);
  check(de('hero').length === 5, 'la galería muestra los 5 héroes');
  check(de('form').length === 6, 'y las 6 transformaciones del druida');
  check(de('invocation').length === 9, 'y las 9 invocaciones');
  const ids = de('enemy').map((f) => f.id);
  check(new Set(ids).size === ids.length, 'ningún enemigo sale repetido');
  check(Object.keys(ENEMY_RIGS).every((id) => ids.includes(id)), 'están todos los enemigos ilustrados');
  check(ids.every((id) => !!ENEMY_RIGS[id]), 'todos los que salen tienen marioneta');
  check(de('enemy').filter((f) => f.boss).length === 7, 'y los 7 jefes aparecen marcados como jefe');
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
}

// ── Ilustraciones SVG dibujadas a mano (src/arte/cartas) ─────────────────────
console.log('\n🎨 Ilustraciones SVG de las cartas');
{
  const fs = await import('node:fs');
  const dir = new URL('../src/arte/cartas/', import.meta.url);
  const todas = [...BASICAS, ...DRUIDA, ...BARBARO, ...MAGO, ...PICARO, ...BRUJO, ...NEUTRALES_ESPECIALES, ...MALDICIONES, CONJURO_PRODIGIOSO, DAGA];
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
  check(fullArt.length === 7 && fullArt.every((c) => fs.existsSync(new URL(`full/${c.id}.svg`, dir))),
    'las 7 cartas full art (5 únicas de clase, Seducir y Deseo) tienen su versión vertical');
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
    const peso = (f: string) => fs.statSync(new URL(f, carpeta)).size;
    const pesados = mp3.filter((f: string) => peso(f) > 32_000);
    const total = mp3.reduce((s: number, f: string) => s + peso(f), 0);
    check(mp3.length > 0 && pesados.length === 0 && total < 700_000, `los MP3 pesan poco (${Math.round(total / 1024)} KB en total) ${pesados.join(', ')}`);
    check(resolveSfx('tajo') === 'tajo' && resolveSfx('noExiste') === SFX_FALLBACK && SFX_NAMES.includes(SFX_FALLBACK),
      'un nombre desconocido suena con el efecto de respaldo');
    check(pickVariant(3, 1, () => 0.4) !== 1 && pickVariant(1, 0, Math.random) === 0, 'las variaciones no repiten la anterior');
    const extremos = [playbackJitter(() => 0), playbackJitter(() => 0.999)];
    check(extremos.every((j) => j.rate > 0.9 && j.rate < 1.1 && j.gain > 0.8 && j.gain <= 1), 'la variación de tono y volumen es pequeña');
    check(grupos.get('tajo')?.every((u: string) => u.startsWith('/a/tajo')) === true, 'las variaciones se agrupan por nombre de archivo');
  }
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

// ── Spell VFX: one distinct composition per card fx key (pure part) ─────────
console.log('\n✨ Efectos de hechizos');
{
  const sf = await import('../src/fx/spell-fx.ts');
  const { SPELLS, spellFrame, vinePath, SpellSystem, spellSignature, MAX_SPELL_SPRITES, MAX_LIVE_SPRITES } = sf;
  const todas: CartaDef[] = [...BASICAS, ...DRUIDA, ...BARBARO, ...MAGO, ...PICARO, ...BRUJO, ...NEUTRALES_ESPECIALES, CONJURO_PRODIGIOSO, DAGA];
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
  const runa = (t: number) => spellFrame('condena', ctx, t).filter((s) => s.shape === 'runa').sort((a, b) => b.size - a.size)[0];
  check(!!runa(0.05) && runa(0.05).y < box.y, 'la runa de condena empieza por encima del objetivo');
  const tImp = SPELLS.condena.duration * SPELLS.condena.phases[0] + 0.02;
  check(!!runa(tImp) && Math.abs(runa(tImp).y - (box.y + box.h / 2)) < box.h * 0.3, 'la runa de condena cae sobre el objetivo');
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
    check(comb.jugador.efectosTemporales[0]?.turnos === 7 && comb.jugador.mano.length === mano + 2,
      'Colmillo del Cambiaformas: la primera forma dura 3 turnos más y robas 2');
    await jugarCon(comb, 'forma-lobo');
    check(comb.jugador.efectosTemporales[1]?.turnos === 4, 'Colmillo del Cambiaformas: solo la primera de cada combate');
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
    await ctx.gastarConjuro(3);
    check(ctx.conjurosLibres(3) === 1 && ctx.conjurosLibres() === 6, 'Báculo del Archimago: el primer nivel 3 recupera un espacio');
    await ctx.gastarConjuro(3);
    check(ctx.conjurosLibres(3) === 0, 'Báculo del Archimago: solo el primero de cada combate');
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
    };
    check(unicas.length === 7 && unicas.every((r) => cartaDe[r.id] !== undefined),
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
    check(comb.jugador.efectosTemporales[0]?.turnos === 5 && comb.jugador.invocacion?.vida === 4,
      'Bendición de la Manada: la forma dura 1 turno más e Invocas 4');
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
    check(pvB === 197, 'Eco Sobrenatural: la primera Explosión del turno inflige además 3 a todos');
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

    // Optional tankard: small heal instead of a rumour, capped at max PV
    {
      const run = nuevaRun('picaro', 8);
      run.pv = run.pvMax - 3;
      check(TB.beberJarra(run) === 3 && run.pv === run.pvMax, 'la jarra cura sin pasar del máximo');
      run.pv = 10;
      const curado = TB.beberJarra(run);
      check(curado > 0 && run.pv === 10 + curado, 'la jarra cura unos PV');
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
  check(MALD.length >= 8 && MALD.length <= 10, `hay entre 8 y 10 maldiciones (${MALD.length})`);
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
        const b = await finDeTurno('marca-condenado', false);
        check(a.comb.jugador.estados.vulnerable === 1 && !b.comb.jugador.estados.vulnerable,
          'Marca del Condenado: 1 de Vulnerable solo si está en tu mano');
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

// ── Floating button: music only ──────────────────────────────────────────────
console.log('\n🎵 Botón de música');
{
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../src/fx/audio.ts', import.meta.url), 'utf8');
  const toggle = /toggleMusica\(\)\s*\{([\s\S]*?)\n  \}/.exec(src)?.[1] ?? '';
  check(toggle.length > 0 && !/maestro/.test(toggle), 'el botón solo apaga o enciende la música (no el volumen general)');
  const sfx = /\n  sfx\(nombre: string[^)]*\)\s*\{([\s\S]*?)\n  \}/.exec(src)?.[1] ?? '';
  check(sfx.length > 0 && !/musicaApagada|silenciado/.test(sfx), 'los efectos de sonido siguen sonando con la música apagada');
  check(/🎵/.test(src) && !/🔇|🔊/.test(src), 'el botón lleva un icono de música');
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
  // — Don del Patrón: free and it shields you —
  {
    const { comb } = await montarB();
    await lanzar(comb, aMano(comb, 'don-del-patron'));
    const e = exp(comb);
    check(comb.costeEfectivo(defDe(e)) === 0, 'Don del Patrón: la Explosión sigue costando 0');
    comb.jugador.bloqueo = 0;
    comb.jugador.energia = 0;
    await comb.jugarCarta(e, comb.enemigos[0]);
    check(comb.jugador.bloqueo === 3 && comb.enemigos[0].pv === 293, 'Don del Patrón: al lanzarla ganas 3 de bloqueo');
  }
  // — Cheaper blast powers —
  {
    const haz = cartaB('haz-desdoblado');
    check(haz.coste === 1 && haz.mejora?.coste === 0, 'Haz Desdoblado cuesta 1 (0 mejorado; antes 2 y 1)');
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
    check(await lanzar(comb, exp(comb)) === 10, 'Hambre del Patrón: la Explosión inflige 3 más por maldición (1 → 10)');
    comb.jugador.mazo.push(instanciar(cartaB('duda')));
    aMano(comb, 'grilletes');
    check(await lanzar(comb, exp(comb)) === 16, 'cuenta las maldiciones del mazo, la mano y el descarte (3 → 16)');
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
    const { comb } = await montarB(['eco-sobrenatural'], [quietoB, quietoB]);
    const [a, b] = comb.enemigos;
    comb.jugador.estados.explosionFuerza = 5;
    await lanzar(comb, exp(comb), a);
    check(a.pv === 300 - 12 - 6 && b.pv === 300 - 6, 'Eco Sobrenatural: repite la mitad del daño a todos (12 → 6)');
    await lanzar(comb, exp(comb), a);
    check(b.pv === 294, 'solo la primera Explosión de cada turno');
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
  const raras = [...DRUIDA, ...BARBARO, ...MAGO, ...PICARO, ...BRUJO, ...NEUTRALES_ESPECIALES]
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

console.log(fallos === 0 ?'\n✅ Todo correcto' : `\n❌ ${fallos} fallos`);
process.exit(fallos === 0 ? 0 : 1);
