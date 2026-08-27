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
  poolDeClase, cartaUnicaDeClase, CONJURO_PRODIGIOSO, DAGA,
} from '../src/core/cartas.ts';
import { piramideConjuros } from '../src/core/conjuros.ts';
import { EVENTOS_POSITIVOS, EVENTOS_NEGATIVOS, elegirEvento } from '../src/core/eventos.ts';
import { ARTE_CARTA } from '../src/ui/carta.ts';
import type { CartaInstancia, ClaseId, EnemigoCombate, EnemigoDef } from '../src/core/types.ts';

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
    ...NEUTRALES_ESPECIALES, CONJURO_PRODIGIOSO, DAGA,
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
  check(espejo.nombre === 'Imagen Espejo' && espejo.coste === 1, 'Imagen Espejo: coste 1');
  check(espejo.requiereConjuro === 1, 'gasta un espacio de conjuro');

  // al jugarse: 60 % base (3 cargas) + 20 % (1 carga) por nivel del espacio gastado
  const runE = nuevaRun('mago', 13);
  const combE = new Combate(runE, [GOBLIN_CORTADOR], () => 0.5, uiSilenciosa);
  await combE.iniciar();
  combE.jugador.conjuros = [{ nivel: 1, gastado: false }, { nivel: 2, gastado: false }];
  combE.jugador.energia = 3;
  const instE = { uid: 9999, def: espejo, mejorada: false };
  combE.jugador.mano.push(instE);
  await combE.jugarCarta(instE, undefined);
  check((combE.jugador.estados.espejismo ?? 0) === 5, 'nivel 2 gastado → 5 cargas (60 % + 40 %)');
  check(combE.jugador.conjuros.filter((c) => !c.gastado).length === 1, 'consume el espacio de mayor nivel');

  // rng constante 0.01 → siempre esquiva (0.01 < cargas×0.2)
  const runA = nuevaRun('mago', 11);
  const combA = new Combate(runA, [GOBLIN_CORTADOR], () => 0.01, uiSilenciosa);
  await combA.iniciar();
  combA.jugador.estados.espejismo = 4;
  combA.enemigos[0].intencion = { nombre: 'Puñalada', intencion: 'ataque', dano: 7 };
  const pvAntes = combA.jugador.pv;
  await combA.terminarTurno();
  check(combA.jugador.pv === pvAntes, 'esquiva el ataque sin recibir daño');
  check((combA.jugador.estados.espejismo ?? 0) === 0, 'el espejismo expira tras 1 turno');

  // rng constante 0.99 → nunca esquiva: el golpe disipa el conjuro
  const runB = nuevaRun('mago', 12);
  const combB = new Combate(runB, [GOBLIN_CORTADOR], () => 0.99, uiSilenciosa);
  await combB.iniciar();
  combB.jugador.estados.espejismo = 4;
  combB.enemigos[0].intencion = { nombre: 'Puñalada', intencion: 'ataque', dano: 7 };
  const pvAntesB = combB.jugador.pv;
  await combB.terminarTurno();
  check(combB.jugador.pv < pvAntesB, 'si el golpe entra, recibe el daño');
  check((combB.jugador.estados.espejismo ?? 0) === 0, 'y las imágenes se disipan');
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
    check(60 - e.pv === 6, 'la Explosión inflige 6 de daño base');
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
    check(200 - a.pv === 9, 'Verbo Agonizante: 6 + 3 = 9');

    a.pv = 200;
    comb.jugador.estados.explosionTurno = 5; // Canalizar el Pacto
    await exp.jugar(comb.contexto(a));
    check(200 - a.pv === 14, 'con mejora de turno: 6 + 3 + 5 = 14');

    a.pv = 200;
    comb.jugador.estados.explosionVeces = 1; // Haz Desdoblado
    await exp.jugar(comb.contexto(a));
    check(200 - a.pv === 28, 'Haz Desdoblado: golpea dos veces (14 + 14)');

    a.pv = 200; b.pv = 200;
    delete comb.jugador.estados.explosionVeces;
    comb.jugador.estados.explosionArea = 1; // Explosión Trifurcada
    await exp.jugar(comb.contexto(a));
    check(200 - a.pv === 14 && 200 - b.pv === 14, 'Explosión Trifurcada: golpea a todos');

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
    check(comb.enemigos.every((x) => (x.estados.oscuridad ?? 0) === 2), 'Oscuridad: 2 a todos');
    check(comb.danoIntencion(e) === 8, 'la Oscuridad le resta 2 al ataque');
    defender(comb);
    await comb.terminarTurno();
    check((e.estados.oscuridad ?? 0) === 1, 'la Oscuridad baja 1 por turno');
    defender(comb);
    await comb.terminarTurno();
    check((e.estados.oscuridad ?? 0) === 0, 'y se agota al segundo turno');
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
    await carta('sabueso-sombra').jugar(comb.contexto()); // 7 de vida
    const energiaAntes = comb.jugador.energia;
    await carta('sacrificio-familiar').jugar(comb.contexto(e));
    check(60 - e.pv === 7, 'Sacrificio del Familiar inflige los 7 de vida que quedaban');
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
    check(60 - e.pv === 6, 'se lanza con 0 de energía');
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
    check((comb.jugador.estados.explosionTurno ?? 0) === 3, 'y le da +3 de daño este turno');
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
    check(90 - e.pv === 12, 'Marchitar inflige 12 de daño');
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
    check((comb.jugador.estados.fuerza ?? 0) === base + 3, 'Forma de Lobo: +3 de Fuerza');
    check(comb.jugador.efectosTemporales[0].turnos === 4, 'y dura 4 turnos');
    check(comb.estaTransformadoPublico(), 'el druida queda transformado');
    // 4 turnos: aguanta y al quinto se cae
    for (let i = 0; i < 3; i++) { defender(comb); await comb.terminarTurno(); }
    check((comb.jugador.estados.fuerza ?? 0) === base + 3, 'la Fuerza sigue al cuarto turno');
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
    check((comb.jugador.estados.formaPotenciada ?? 0) === 2, 'y +2 de Fuerza por forma');
    await carta('forma-lobo').jugar(comb.contexto(comb.enemigos[0]));
    check((comb.jugador.estados.fuerza ?? 0) === base + 5, 'Forma de Lobo pasa a dar +5 de Fuerza');
    check(comb.jugador.efectosTemporales[0].turnos === 6, 'y a durar 6 turnos');
    // el refuerzo va al atributo propio de la forma: Águila da Destreza
    const dex = comb.jugador.estados.destreza ?? 0;
    await carta('forma-aguila').jugar(comb.contexto());
    check((comb.jugador.estados.destreza ?? 0) === dex + 4, 'Forma de Águila pasa a dar +4 de Destreza');
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
    // la propia forma da +3 de Fuerza antes de repartir el golpe
    check(90 - a.pv === 9 && 90 - b.pv === 9,
      'Forma de Enjambre: 6 + 3 de Fuerza propia = 9 a TODOS los enemigos');
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

  // Tormenta de Zarpas pega más si estás transformado
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
    check(200 - e.pv === 15, 'transformado: 5 de daño tres veces = 15');
  }
}

console.log(fallos === 0 ? '\n✅ Todo correcto' : `\n❌ ${fallos} fallos`);
process.exit(fallos === 0 ? 0 : 1);
