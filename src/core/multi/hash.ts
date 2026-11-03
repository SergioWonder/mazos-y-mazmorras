import type { Combate } from '../combate.ts';
import type { EstadoRun } from '../types.ts';
import type { PartidaMulti } from './estado.ts';
import { HUECOS, type Hueco } from './tipos.ts';

// The hash two machines compare after every entry: a stable string over everything the players
// can observe (and the state of the shared rng, so a different number of draws shows at once).

const estados = (e: Partial<Record<string, number>>) =>
  Object.keys(e).sort().filter((k) => e[k]).map((k) => `${k}=${e[k]}`).join(',');

const uids = (l: Array<{ uid: number }>) => l.map((c) => c.uid).join(',');

function heroeEnCombate(c: Combate): string {
  const j = c.jugador;
  return [
    `pv${j.pv}/${j.pvMax}`, `bl${j.bloqueo}`, `en${j.energia}/${j.energiaMax}`, j.vivo ? 'v' : 'x', `t${c.turno}`,
    `E[${estados(j.estados)}]`, `M[${uids(j.mano)}]`, `Z[${uids(j.mazo)}]`, `D[${uids(j.descarte)}]`, `A[${uids(j.agotadas)}]`,
    `inv${j.invocacion ? `${j.invocacion.vida}/${j.invocacion.vidaMax}` : '-'}`,
    `r${c.enResolucion ? 1 : 0}`,
    `cj${j.conjuros.map((s) => (s.gastado ? 0 : s.nivel)).join('')}`, `ef${j.efectosTemporales.length}`, `ca${j.castigos.length}`,
    `fu${j.furiaFuerza}/${j.furiaDestreza}`, c.terminado ?? '-',
  ].join(' ');
}

function heroeFueraDeCombate(run: EstadoRun): string {
  const perm = run.permanentes;
  return [
    run.clase, `pv${run.pv}/${run.pvMax}`, `ms${run.mision ? run.mision.nodo : '-'}`,
    `mz[${run.mazo.map((c) => `${c.uid}:${c.def.id}${c.mejorada ? '+' : ''}`).join(',')}]`,
    `re[${run.reliquias.map((r) => r.id).join(',')}]`,
    `pm${perm.fuerza}.${perm.destreza}.${perm.energia}.${perm.energiaElite}.${perm.energiaInicial}.${perm.robo}`,
    `cj${run.espaciosConjuro}`, `ev${run.eventosVistos.length}`, `el${(run.elitesVistos ?? []).join('|')}`,
  ].join(' ');
}

/** Everything observable about the game, as text. */
export function resumenPartida(p: PartidaMulti): string {
  const out: string[] = [];
  const cara = p.runs.cara;
  out.push(`P${p.punto} rng${p.estadoRng()} uid${p.uidSiguiente} fase:${p.fase.tipo}`);
  out.push(`mapa c${cara.capitulo}.${cara.escenario} nodo${cara.nodoActual} piso${cara.piso} vis[${cara.mapa.filter((n) => n.visitado).map((n) => n.id).join(',')}]`);
  for (const h of HUECOS) out.push(`${h}: ${heroeFueraDeCombate(p.runs[h])}`);
  const f = p.fase;
  if (f.tipo === 'bendicion') {
    out.push(`bend ${HUECOS.map((h) => `${h}:${f.ofertas[h].join('|')}:${f.hechos[h]}`).join(' ')}`);
  } else if (f.tipo === 'mapa') {
    out.push(`votos ${HUECOS.map((h) => f.votos[h] ?? '-').join(',')}`);
  } else if (f.tipo === 'fin') {
    out.push(`fin ${f.victoria}/${f.finalVerdadero}/${f.epilogoDM}`);
  } else {
    const s = f.sala;
    out.push(`sala n${s.nodo.id} ${s.nodo.tipo} etapa:${s.etapa} sig${s.siguiente ?? '-'} ev${s.evento?.id ?? '-'}`);
    if (s.reliquias) {
      out.push(`rel ${s.reliquias.origen} [${s.reliquias.ofertas.map((r) => r.id).join(',')}] ${HUECOS.map((h) => s.reliquias!.elecciones[h] ?? (s.reliquias!.sinOpciones[h] ? '/' : '-')).join(',')}`);
    }
    for (const h of HUECOS) {
      const he = s.heroes[h];
      out.push(`${h} sala: cola[${he.cola.map((x) => x.k).join(',')}] listo${he.listo} q${he.abierta ? `${he.abierta.pregunta.clave}:${he.abierta.pregunta.opciones.join('|')}` : '-'}`);
    }
    if (s.combate) {
      const d = s.combate;
      out.push(`duo ${d.terminado ?? '-'} fin${HUECOS.map((h) => (d.finTurno[h] ? 1 : 0)).join('')}`);
      for (const h of HUECOS) out.push(`${h} c: ${heroeEnCombate(d.combates[h])}`);
      for (const e of d.enemigos) {
        out.push(`e ${e.def.id} ${e.vivo ? 'v' : 'x'} ${e.pv}/${e.pvMax} bl${e.bloqueo} [${estados(e.estados)}] ${e.intencion.nombre} t${e.turnosVisto}`);
      }
    }
  }
  if (p.pausa) out.push(`pausa ${p.pausa.hueco} ${p.pausa.clave} [${uids(p.pausa.cartas)}]`);
  return out.join('\n');
}

/** Two independent 32-bit FNV-1a lanes: 64 bits of hash as 16 hex digits. Cheap and stable. */
export function hash64(texto: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ (c + i), 0x85ebca6b) ^ (b >>> 13);
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return hex(a) + hex(b);
}

export function hashPartida(p: PartidaMulti): string {
  return hash64(resumenPartida(p));
}

export type { Hueco };
