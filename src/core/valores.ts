import type { CartaDef, ContextoEfecto, EnemigoCombate, ValorCarta, ValorMostrado } from './types.ts';

/**
 * Live numbers of the card texts, worked out from the combat state without
 * touching it. Pure: the combat engine lends the modifiers through
 * `EntornoValores`, so the numbers use the very same sums the cards apply.
 */

/** Integers of a text, in order (the `n` handed to CartaDef.valores). */
export function numerosDelTexto(texto: string): number[] {
  return (texto.match(/\d+/g) ?? []).map(Number);
}

const VECES: Record<string, number> = { dos: 2, tres: 3, cuatro: 4, cinco: 5 };

const cacheTexto = new Map<string, ValorCarta[]>();

/**
 * Plain numbers read from the text, for cards that declare no `valores`:
 * «Inflige N de daño» is an attack hit (not «…de daño adicional», which is a
 * summon's) and «Gana N de bloqueo» is card block, with their «dos/tres veces».
 * Powers and curses keep their text: their numbers act later, not when played.
 */
export function valoresDelTexto(def: CartaDef): ValorCarta[] {
  if (def.tipo === 'poder' || def.tipo === 'maldicion') return [];
  const guardado = cacheTexto.get(def.texto);
  if (guardado) return guardado;
  const texto = def.texto;
  const valores: ValorCarta[] = [];
  let indice = 0;
  for (const m of texto.matchAll(/\d+/g)) {
    const antes = texto.slice(0, m.index);
    const despues = texto.slice(m.index + m[0].length);
    const veces = (tras: RegExp) => {
      const r = despues.match(tras)?.[1];
      return r === undefined ? 1 : (VECES[r] ?? Number(r));
    };
    if (/[Ii]nflige $/.test(antes) && /^ de daño(?! adicional)/.test(despues)) {
      valores.push({ tipo: 'ataque', indice, base: Number(m[0]), veces: veces(/^ de daño (dos|tres|cuatro|cinco|\d+) veces/) });
    } else if (/[Gg]ana $/.test(antes) && despues.startsWith(' de bloqueo')) {
      valores.push({ tipo: 'bloqueo', indice, base: Number(m[0]), veces: veces(/^ de bloqueo (dos|tres|cuatro|cinco) veces/) });
    }
    indice++;
  }
  cacheTexto.set(texto, valores);
  return valores;
}

/** What the combat engine lends to work the numbers out. */
export interface EntornoValores {
  /** Card context aimed at `objetivo` (or at nobody). */
  contexto(objetivo?: EnemigoCombate): ContextoEfecto;
  /** One hit of a player attack, as atacar() deals it. */
  danoGolpe(objetivo: EnemigoCombate | undefined, base: number, fuerzaExtra: number): number;
  /** Card block, as ganarBloqueo() grants it. */
  bloqueo(base: number): number;
  /** Living enemies: the possible targets when none is chosen. */
  enemigosVivos: EnemigoCombate[];
}

/** Live numbers the card declares for a context. */
export function valoresDeclarados(def: CartaDef, ctx: ContextoEfecto): ValorCarta[] {
  return def.valores ? def.valores(ctx, numerosDelTexto(def.texto)) : valoresDelTexto(def);
}

function realDe(v: ValorCarta, objetivo: EnemigoCombate | undefined, ent: EntornoValores): number {
  if (v.tipo === 'ataque') return ent.danoGolpe(objetivo, v.base, v.fuerzaPrevia ?? 0);
  if (v.tipo === 'bloqueo') return ent.bloqueo(v.base);
  return Math.max(0, v.base);
}

const clave = (v: ValorCarta) => (v.indice !== undefined ? `#${v.indice}` : `@${v.tras}`);

/**
 * Effective numbers of a card. With a target they are exact. Without one, the
 * possible targets are all living enemies: a number they all agree on is shown
 * as is (a lone enemy counts as the target); one that changes with the target
 * shows the lowest (the damage it is sure to do), and a bracketed one is left out.
 */
export function calcularValores(
  def: CartaDef, objetivo: EnemigoCombate | undefined, ent: EntornoValores,
): ValorMostrado[] {
  const evaluar = (obj?: EnemigoCombate): ValorMostrado[] =>
    valoresDeclarados(def, ent.contexto(obj)).map((v) => ({ ...v, real: realDe(v, obj, ent) }));
  if (objetivo) return evaluar(objetivo);
  const candidatos = ent.enemigosVivos;
  if (candidatos.length === 0) return evaluar();
  const listas = candidatos.map((e) => evaluar(e));
  const sinObjetivo = evaluar();
  const resultado: ValorMostrado[] = [];
  const vistas = new Set<string>();
  for (const v of [...listas[0], ...sinObjetivo]) {
    const k = clave(v);
    if (vistas.has(k)) continue;
    vistas.add(k);
    const iguales = listas.map((l) => l.find((w) => clave(w) === k));
    const todos = iguales.every((w) => w && w.aplica === v.aplica && (w.veces ?? 1) === (v.veces ?? 1));
    if (todos && iguales.every((w) => w!.real === v.real)) resultado.push(v);
    else if (todos && v.indice !== undefined) {
      resultado.push({ ...v, real: Math.min(...iguales.map((w) => w!.real)) });
    } else {
      const libre = sinObjetivo.find((w) => clave(w) === k);
      if (libre && libre.indice !== undefined) resultado.push(libre);
    }
  }
  return resultado;
}
