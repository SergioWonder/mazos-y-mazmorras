import type { CartaDef, CartaInstancia, ClaseId, Rareza } from './types.ts';

let uidSiguiente = 1;
export function instanciar(def: CartaDef): CartaInstancia {
  return { uid: uidSiguiente++, def, mejorada: false };
}

/** Definición efectiva de una instancia: aplica la mejora si la tiene. */
export function defDe(inst: CartaInstancia): CartaDef {
  if (!inst.mejorada || !inst.def.mejora) return inst.def;
  const m = inst.def.mejora;
  return {
    ...inst.def,
    nombre: `${inst.def.nombre}+`,
    texto: m.texto,
    coste: m.coste ?? inst.def.coste,
    requiereConjuro: m.requiereConjuro ?? inst.def.requiereConjuro,
    jugar: m.jugar ?? inst.def.jugar,
  };
}

// ── Cartas básicas ───────────────────────────────────────────────────────────

export const BASICAS: CartaDef[] = [
  {
    id: 'golpe',
    nombre: 'Golpe',
    clase: 'neutral',
    tipo: 'ataque',
    rareza: 'inicial',
    coste: 1,
    objetivo: 'enemigo',
    texto: 'Inflige 6 de daño.',
    fx: 'tajo',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 6);
    },
    mejora: {
      texto: 'Inflige 9 de daño.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 9);
      },
    },
  },
  {
    id: 'defender',
    nombre: 'Defender',
    clase: 'neutral',
    tipo: 'habilidad',
    rareza: 'inicial',
    coste: 1,
    objetivo: 'ninguno',
    texto: 'Gana 5 de bloqueo.',
    fx: 'bloqueo',
    jugar: async (c) => {
      await c.ganarBloqueo(5);
    },
    mejora: {
      texto: 'Gana 8 de bloqueo.',
      jugar: async (c) => {
        await c.ganarBloqueo(8);
      },
    },
  },
];

// ── Druida ───────────────────────────────────────────────────────────────────

export const DRUIDA: CartaDef[] = [
  {
    id: 'zarpazo',
    nombre: 'Zarpazo',
    clase: 'druida',
    tipo: 'ataque',
    rareza: 'inicial',
    coste: 1,
    objetivo: 'enemigo',
    texto: 'Inflige 4 de daño.\nAplica 1 de Vulnerable.',
    fx: 'zarpa',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 4, 1, 'zarpa');
      await c.aplicarEstado(c.objetivo!, 'vulnerable', 1);
    },
    mejora: {
      texto: 'Inflige 6 de daño.\nAplica 2 de Vulnerable.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 6, 1, 'zarpa');
        await c.aplicarEstado(c.objetivo!, 'vulnerable', 2);
      },
    },
  },
  {
    id: 'mordisco',
    nombre: 'Mordisco Feroz',
    clase: 'druida',
    tipo: 'ataque',
    rareza: 'comun',
    coste: 1,
    objetivo: 'enemigo',
    texto: 'Inflige 5 de daño.\nSi estás transformado, inflige 9.',
    fx: 'zarpa',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, c.estaTransformado() ? 9 : 5, 1, 'zarpa');
    },
    mejora: {
      texto: 'Inflige 7 de daño.\nSi estás transformado, inflige 12.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, c.estaTransformado() ? 12 : 7, 1, 'zarpa');
      },
    },
  },
  {
    id: 'piel-corteza',
    nombre: 'Piel de Corteza',
    clase: 'druida',
    tipo: 'habilidad',
    rareza: 'comun',
    coste: 1,
    objetivo: 'ninguno',
    texto: 'Gana 8 de bloqueo.',
    fx: 'hojas',
    jugar: async (c) => {
      await c.ganarBloqueo(8);
    },
    mejora: {
      texto: 'Gana 12 de bloqueo.',
      jugar: async (c) => {
        await c.ganarBloqueo(12);
      },
    },
  },
  {
    id: 'enredadera',
    nombre: 'Enredadera',
    clase: 'druida',
    tipo: 'habilidad',
    rareza: 'comun',
    coste: 1,
    objetivo: 'enemigo',
    fx: 'raices',
    texto: 'Raíces: −6 de Fuerza al enemigo\ndurante 1 turno. Si su ataque queda\nanulado (0 o menos), inflige 8 de daño.',
    jugar: async (c) => {
      await c.aplicarEstado(c.objetivo!, 'raices', 6);
      if (c.ataqueAnulado(c.objetivo!)) {
        await c.mensaje('¡Las raíces aprietan!');
        await c.atacar(c.objetivo!, 8, 1, 'raices');
      }
    },
    mejora: {
      texto: 'Raíces: −8 de Fuerza al enemigo\ndurante 1 turno. Si su ataque queda\nanulado (0 o menos), inflige 12 de daño.',
      jugar: async (c) => {
        await c.aplicarEstado(c.objetivo!, 'raices', 8);
        if (c.ataqueAnulado(c.objetivo!)) {
          await c.mensaje('¡Las raíces aprietan!');
          await c.atacar(c.objetivo!, 12, 1, 'raices');
        }
      },
    },
  },
  {
    id: 'zarpa-doble',
    nombre: 'Zarpa Doble',
    clase: 'druida',
    tipo: 'ataque',
    rareza: 'comun',
    coste: 1,
    objetivo: 'enemigo',
    texto: 'Inflige 4 de daño dos veces.',
    fx: 'zarpa',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 4, 2, 'zarpa');
    },
    mejora: {
      texto: 'Inflige 6 de daño dos veces.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 6, 2, 'zarpa');
      },
    },
  },
  {
    id: 'aullido',
    nombre: 'Aullido',
    clase: 'druida',
    tipo: 'habilidad',
    rareza: 'comun',
    coste: 0,
    objetivo: 'enemigo',
    texto: 'Aplica 1 de Débil.',
    fx: 'aullido',
    jugar: async (c) => {
      await c.aplicarEstado(c.objetivo!, 'debil', 1);
    },
    mejora: {
      texto: 'Aplica 2 de Débil.',
      jugar: async (c) => {
        await c.aplicarEstado(c.objetivo!, 'debil', 2);
      },
    },
  },
  {
    id: 'forma-lobo',
    nombre: 'Forma de Lobo',
    clase: 'druida',
    tipo: 'ataque',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'enemigo',
    fx: 'transformacion',
    texto: 'Transformación: +2 de Fuerza durante 3 turnos.\nInflige 5 de daño.',
    jugar: async (c) => {
      await c.efectoTemporal({ etiqueta: 'Forma de Lobo', turnos: 3, fuerza: 2, destreza: 0 });
      await c.atacar(c.objetivo!, 5, 1, 'zarpa');
    },
    mejora: {
      texto: 'Transformación: +3 de Fuerza durante 3 turnos.\nInflige 7 de daño.',
      jugar: async (c) => {
        await c.efectoTemporal({ etiqueta: 'Forma de Lobo', turnos: 3, fuerza: 3, destreza: 0 });
        await c.atacar(c.objetivo!, 7, 1, 'zarpa');
      },
    },
  },
  {
    id: 'forma-oso',
    nombre: 'Forma de Oso',
    clase: 'druida',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 2,
    objetivo: 'ninguno',
    fx: 'transformacion',
    texto: 'Transformación: +3 de Fuerza durante 2 turnos.\nGana 8 de bloqueo.',
    jugar: async (c) => {
      await c.efectoTemporal({ etiqueta: 'Forma de Oso', turnos: 2, fuerza: 3, destreza: 0 });
      await c.ganarBloqueo(8);
    },
    mejora: {
      texto: 'Transformación: +4 de Fuerza durante 2 turnos.\nGana 11 de bloqueo.',
      jugar: async (c) => {
        await c.efectoTemporal({ etiqueta: 'Forma de Oso', turnos: 2, fuerza: 4, destreza: 0 });
        await c.ganarBloqueo(11);
      },
    },
  },
  {
    id: 'forma-aguila',
    nombre: 'Forma de Águila',
    clase: 'druida',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'transformacion',
    texto: 'Transformación: +2 de Destreza durante 2 turnos.\nRoba 2 cartas.',
    jugar: async (c) => {
      await c.efectoTemporal({ etiqueta: 'Forma de Águila', turnos: 2, fuerza: 0, destreza: 2 });
      await c.robar(2);
    },
    mejora: {
      texto: 'Transformación: +3 de Destreza durante 2 turnos.\nRoba 3 cartas.',
      jugar: async (c) => {
        await c.efectoTemporal({ etiqueta: 'Forma de Águila', turnos: 2, fuerza: 0, destreza: 3 });
        await c.robar(3);
      },
    },
  },
  {
    id: 'raices-estranguladoras',
    nombre: 'Raíces Estranguladoras',
    clase: 'druida',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 2,
    objetivo: 'enemigo',
    fx: 'raices',
    texto: 'Raíces: −12 de Fuerza al enemigo\ndurante 1 turno. Si su ataque queda\nanulado (0 o menos), inflige 16 de daño.',
    jugar: async (c) => {
      await c.aplicarEstado(c.objetivo!, 'raices', 12);
      if (c.ataqueAnulado(c.objetivo!)) {
        await c.mensaje('¡Las raíces trituran!');
        await c.atacar(c.objetivo!, 16, 1, 'raices');
      }
    },
    mejora: {
      texto: 'Raíces: −16 de Fuerza al enemigo\ndurante 1 turno. Si su ataque queda\nanulado (0 o menos), inflige 22 de daño.',
      jugar: async (c) => {
        await c.aplicarEstado(c.objetivo!, 'raices', 16);
        if (c.ataqueAnulado(c.objetivo!)) {
          await c.mensaje('¡Las raíces trituran!');
          await c.atacar(c.objetivo!, 22, 1, 'raices');
        }
      },
    },
  },
  {
    id: 'espinas',
    nombre: 'Manto de Espinas',
    clase: 'druida',
    tipo: 'poder',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'ninguno',
    texto: 'Gana 3 de Espinas.\n(Devuelve daño a los atacantes.)',
    fx: 'hojas',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'espinas', 3);
    },
    mejora: {
      texto: 'Gana 5 de Espinas.\n(Devuelve daño a los atacantes.)',
      jugar: async (c) => {
        await c.aplicarEstado(c.jugador, 'espinas', 5);
      },
    },
  },
  {
    id: 'luna-creciente',
    nombre: 'Luna Creciente',
    clase: 'druida',
    tipo: 'ataque',
    rareza: 'infrecuente',
    coste: 2,
    objetivo: 'enemigo',
    fx: 'luna',
    texto: 'Inflige 10 de daño.\nSi estás transformado, aplica 2 de Vulnerable.',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 10, 1, 'luna');
      if (c.estaTransformado()) await c.aplicarEstado(c.objetivo!, 'vulnerable', 2);
    },
    mejora: {
      texto: 'Inflige 14 de daño.\nSi estás transformado, aplica 3 de Vulnerable.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 14, 1, 'luna');
        if (c.estaTransformado()) await c.aplicarEstado(c.objetivo!, 'vulnerable', 3);
      },
    },
  },
  {
    id: 'pacto-bosque',
    nombre: 'Pacto con el Bosque',
    clase: 'druida',
    tipo: 'poder',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'tierra',
    unUso: true,
    texto: '+7 PV máximos y cúrate 7.\n1 uso: se consume para siempre.',
    jugar: async (c) => {
      c.run.pvMax += 7;
      c.jugador.pvMax += 7;
      await c.curar(7);
    },
    mejora: {
      texto: '+10 PV máximos y cúrate 10.\n1 uso: se consume para siempre.',
      jugar: async (c) => {
        c.run.pvMax += 10;
        c.jugador.pvMax += 10;
        await c.curar(10);
      },
    },
  },
  // — Cartas raras: una por subclase de druida (D&D 2024) —
  {
    id: 'circulo-tierra',
    nombre: 'Raíces Profundas',
    clase: 'druida',
    tipo: 'poder',
    rareza: 'rara',
    coste: 1,
    objetivo: 'ninguno',
    subclase: 'Círculo de la Tierra',
    fx: 'tierra',
    animRara: 'anim-tierra',
    texto: 'Poder: tus Raíces reducen la Fuerza\ndel enemigo 1 turno adicional.',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'raizProlongada', 1);
    },
    mejora: {
      texto: 'Poder: tus Raíces reducen la Fuerza\ndel enemigo 2 turnos adicionales.',
      jugar: async (c) => {
        await c.aplicarEstado(c.jugador, 'raizProlongada', 2);
      },
    },
  },
  {
    id: 'circulo-luna',
    nombre: 'Forma Lunar',
    clase: 'druida',
    tipo: 'ataque',
    rareza: 'rara',
    coste: 3,
    objetivo: 'enemigo',
    subclase: 'Círculo de la Luna',
    fx: 'luna',
    animRara: 'anim-luna',
    texto: 'Transformación: +3 de Fuerza durante 3 turnos.\nInflige 8 de daño dos veces.',
    jugar: async (c) => {
      await c.efectoTemporal({ etiqueta: 'Forma Lunar', turnos: 3, fuerza: 3, destreza: 0 });
      await c.atacar(c.objetivo!, 8, 2, 'luna');
    },
    mejora: {
      texto: 'Transformación: +4 de Fuerza durante 3 turnos.\nInflige 10 de daño dos veces.',
      jugar: async (c) => {
        await c.efectoTemporal({ etiqueta: 'Forma Lunar', turnos: 3, fuerza: 4, destreza: 0 });
        await c.atacar(c.objetivo!, 10, 2, 'luna');
      },
    },
  },
  {
    id: 'circulo-mar',
    nombre: 'Cólera del Mar',
    clase: 'druida',
    tipo: 'ataque',
    rareza: 'rara',
    coste: 2,
    objetivo: 'todos',
    subclase: 'Círculo del Mar',
    fx: 'ola',
    animRara: 'anim-mar',
    texto: 'Inflige 10 de daño a TODOS los enemigos\ny les aplica 1 de Débil.',
    jugar: async (c) => {
      await c.atacarTodos(10, 'ola');
      for (const e of c.enemigos.filter((x) => x.vivo)) await c.aplicarEstado(e, 'debil', 1);
    },
    mejora: {
      texto: 'Inflige 13 de daño a TODOS los enemigos\ny les aplica 2 de Débil.',
      jugar: async (c) => {
        await c.atacarTodos(13, 'ola');
        for (const e of c.enemigos.filter((x) => x.vivo)) await c.aplicarEstado(e, 'debil', 2);
      },
    },
  },
  {
    id: 'circulo-estrellas',
    nombre: 'Forma Estelar',
    clase: 'druida',
    tipo: 'habilidad',
    rareza: 'rara',
    coste: 1,
    objetivo: 'ninguno',
    subclase: 'Círculo de las Estrellas',
    fx: 'estrellas',
    animRara: 'anim-estrellas',
    texto: 'Roba 2 cartas.\nDurante 3 turnos: roba 1 carta extra\ny cura 1 PV al inicio del turno.',
    jugar: async (c) => {
      await c.robar(2);
      await c.efectoTemporal({
        etiqueta: 'Forma Estelar',
        turnos: 3,
        fuerza: 0,
        destreza: 0,
        robaExtra: 1,
        curaTurno: 1,
      });
    },
    mejora: {
      texto: 'Roba 3 cartas.\nDurante 4 turnos: roba 1 carta extra\ny cura 1 PV al inicio del turno.',
      jugar: async (c) => {
        await c.robar(3);
        await c.efectoTemporal({
          etiqueta: 'Forma Estelar',
          turnos: 4,
          fuerza: 0,
          destreza: 0,
          robaExtra: 1,
          curaTurno: 1,
        });
      },
    },
  },
];

// ── Bárbaro ──────────────────────────────────────────────────────────────────

export const BARBARO: CartaDef[] = [
  {
    id: 'furia-primaria',
    nombre: 'Furia Primaria',
    clase: 'barbaro',
    tipo: 'habilidad',
    rareza: 'inicial',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'furia',
    texto: 'Furia: gana 1 de Fuerza.',
    jugar: async (c) => {
      await c.ganarFuria(1);
    },
    mejora: {
      texto: 'Furia: gana 2 de Fuerza.',
      jugar: async (c) => {
        await c.ganarFuria(2);
      },
    },
  },
  {
    id: 'golpe-imprudente',
    nombre: 'Golpe Imprudente',
    clase: 'barbaro',
    tipo: 'ataque',
    rareza: 'comun',
    coste: 0,
    objetivo: 'enemigo',
    texto: 'Inflige 8 de daño.\nRecibes 2 de daño.',
    fx: 'tajo',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 8);
      await c.perderPV(2);
    },
    mejora: {
      texto: 'Inflige 11 de daño.\nRecibes 2 de daño.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 11);
        await c.perderPV(2);
      },
    },
  },
  {
    id: 'tajo-brutal',
    nombre: 'Tajo Brutal',
    clase: 'barbaro',
    tipo: 'ataque',
    rareza: 'comun',
    coste: 2,
    objetivo: 'enemigo',
    texto: 'Inflige 12 de daño.',
    fx: 'tajo',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 12);
    },
    mejora: {
      texto: 'Inflige 17 de daño.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 17);
      },
    },
  },
  {
    id: 'postura-firme',
    nombre: 'Postura Firme',
    clase: 'barbaro',
    tipo: 'habilidad',
    rareza: 'comun',
    coste: 2,
    objetivo: 'ninguno',
    texto: 'Gana 7 de bloqueo, más tu Fuerza.',
    fx: 'bloqueo',
    jugar: async (c) => {
      await c.ganarBloqueo(7 + (c.jugador.estados.fuerza ?? 0));
    },
    mejora: {
      texto: 'Gana 11 de bloqueo, más tu Fuerza.',
      jugar: async (c) => {
        await c.ganarBloqueo(11 + (c.jugador.estados.fuerza ?? 0));
      },
    },
  },
  {
    id: 'grito-intimidante',
    nombre: 'Grito Intimidante',
    clase: 'barbaro',
    tipo: 'habilidad',
    rareza: 'comun',
    coste: 1,
    objetivo: 'ninguno',
    texto: 'Aplica 2 de Débil a TODOS los enemigos.',
    fx: 'aullido',
    jugar: async (c) => {
      for (const e of c.enemigos.filter((x) => x.vivo)) await c.aplicarEstado(e, 'debil', 2);
    },
    mejora: {
      texto: 'Aplica 3 de Débil a TODOS los enemigos.',
      jugar: async (c) => {
        for (const e of c.enemigos.filter((x) => x.vivo)) await c.aplicarEstado(e, 'debil', 3);
      },
    },
  },
  {
    id: 'golpe-pomo',
    nombre: 'Golpe con el Pomo',
    clase: 'barbaro',
    tipo: 'ataque',
    rareza: 'comun',
    coste: 1,
    objetivo: 'enemigo',
    texto: 'Inflige 6 de daño.\nGana 2 de bloqueo.',
    fx: 'tajo',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 6);
      await c.ganarBloqueo(2);
    },
    mejora: {
      texto: 'Inflige 8 de daño.\nGana 4 de bloqueo.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 8);
        await c.ganarBloqueo(4);
      },
    },
  },
  {
    id: 'furia-creciente',
    nombre: 'Furia Creciente',
    clase: 'barbaro',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'ninguno',
    texto: 'Furia: gana 2 de Fuerza.',
    fx: 'furia',
    jugar: async (c) => {
      await c.ganarFuria(2);
    },
    mejora: {
      texto: 'Furia: gana 3 de Fuerza.',
      jugar: async (c) => {
        await c.ganarFuria(3);
      },
    },
  },
  {
    id: 'furia-agil',
    nombre: 'Furia Ágil',
    clase: 'barbaro',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'ninguno',
    texto: 'Furia: gana 1 de Fuerza\ny 1 de Destreza.',
    fx: 'furia',
    jugar: async (c) => {
      await c.ganarFuria(1, 1);
    },
    mejora: {
      texto: 'Furia: gana 2 de Fuerza\ny 1 de Destreza.',
      jugar: async (c) => {
        await c.ganarFuria(2, 1);
      },
    },
  },
  {
    id: 'golpe-demoledor',
    nombre: 'Golpe Demoledor',
    clase: 'barbaro',
    tipo: 'ataque',
    rareza: 'infrecuente',
    coste: 2,
    objetivo: 'enemigo',
    fx: 'impacto',
    texto: 'Inflige 4 de daño\nmás 3× tu Fuerza adicional.',
    jugar: async (c) => {
      const extra = Math.max(0, c.jugador.estados.fuerza ?? 0) * 2; // base ya suma fuerza 1×
      await c.atacar(c.objetivo!, 4 + extra, 1, 'impacto');
    },
    mejora: {
      texto: 'Inflige 6 de daño\nmás 4× tu Fuerza adicional.',
      jugar: async (c) => {
        const extra = Math.max(0, c.jugador.estados.fuerza ?? 0) * 3;
        await c.atacar(c.objetivo!, 6 + extra, 1, 'impacto');
      },
    },
  },
  {
    id: 'reflejos-acero',
    nombre: 'Reflejos de Acero',
    clase: 'barbaro',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'bloqueo',
    texto: 'Gana 3 de bloqueo\nmás 3× tu Destreza adicional.',
    jugar: async (c) => {
      const extra = Math.max(0, c.jugador.estados.destreza ?? 0) * 2; // base ya suma destreza 1×
      await c.ganarBloqueo(3 + extra);
    },
    mejora: {
      texto: 'Gana 5 de bloqueo\nmás 4× tu Destreza adicional.',
      jugar: async (c) => {
        const extra = Math.max(0, c.jugador.estados.destreza ?? 0) * 3;
        await c.ganarBloqueo(5 + extra);
      },
    },
  },
  {
    id: 'sangre-caliente',
    nombre: 'Sangre Caliente',
    clase: 'barbaro',
    tipo: 'ataque',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'enemigo',
    fx: 'furia',
    texto: 'Inflige 5 de daño.\nSi tienes Furia activa, inflige 9.',
    jugar: async (c) => {
      const conFuria = c.jugador.furiaFuerza + c.jugador.furiaDestreza > 0;
      await c.atacar(c.objetivo!, conFuria ? 9 : 5, 1, conFuria ? 'furia' : 'tajo');
    },
    mejora: {
      texto: 'Inflige 7 de daño.\nSi tienes Furia activa, inflige 12.',
      jugar: async (c) => {
        const conFuria = c.jugador.furiaFuerza + c.jugador.furiaDestreza > 0;
        await c.atacar(c.objetivo!, conFuria ? 12 : 7, 1, conFuria ? 'furia' : 'tajo');
      },
    },
  },
  {
    id: 'torbellino',
    nombre: 'Torbellino',
    clase: 'barbaro',
    tipo: 'ataque',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'todos',
    texto: 'Inflige 5 de daño a TODOS los enemigos.',
    fx: 'tajo',
    jugar: async (c) => {
      await c.atacarTodos(5);
    },
    mejora: {
      texto: 'Inflige 8 de daño a TODOS los enemigos.',
      jugar: async (c) => {
        await c.atacarTodos(8);
      },
    },
  },
  {
    id: 'voto-sangre',
    nombre: 'Voto de Sangre',
    clase: 'barbaro',
    tipo: 'poder',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'furia',
    unUso: true,
    texto: 'A partir de ahora empiezas cada combate\ncon +1 de Fuerza.\n1 uso: se consume para siempre.',
    jugar: async (c) => {
      c.run.permanentes.fuerza += 1;
      await c.aplicarEstado(c.jugador, 'fuerza', 1);
    },
    mejora: {
      texto: 'A partir de ahora empiezas cada combate\ncon +2 de Fuerza.\n1 uso: se consume para siempre.',
      jugar: async (c) => {
        c.run.permanentes.fuerza += 2;
        await c.aplicarEstado(c.jugador, 'fuerza', 2);
      },
    },
  },
  // — Cartas raras: una por subclase de bárbaro (D&D 2024) —
  {
    id: 'senda-berserker',
    nombre: 'Frenesí',
    clase: 'barbaro',
    tipo: 'ataque',
    rareza: 'rara',
    coste: 1,
    objetivo: 'enemigo',
    subclase: 'Senda del Berserker',
    fx: 'furia',
    animRara: 'anim-berserker',
    texto: 'Inflige 4 de daño 3 veces.\nDuplica tu Furia, pero se romperá al final del turno.',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 4, 3, 'furia');
      if (c.jugador.furiaFuerza + c.jugador.furiaDestreza > 0)
        await c.ganarFuria(c.jugador.furiaFuerza, c.jugador.furiaDestreza);
      await c.aplicarEstado(c.jugador, 'frenesi', 1);
    },
    mejora: {
      texto: 'Inflige 6 de daño 3 veces.\nDuplica tu Furia, pero se romperá al final del turno.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 6, 3, 'furia');
        if (c.jugador.furiaFuerza + c.jugador.furiaDestreza > 0)
          await c.ganarFuria(c.jugador.furiaFuerza, c.jugador.furiaDestreza);
        await c.aplicarEstado(c.jugador, 'frenesi', 1);
      },
    },
  },
  {
    id: 'senda-corazon-salvaje',
    nombre: 'Corazón Salvaje',
    clase: 'barbaro',
    tipo: 'poder',
    rareza: 'rara',
    coste: 1,
    objetivo: 'ninguno',
    subclase: 'Senda del Corazón Salvaje',
    fx: 'tierra',
    animRara: 'anim-corazon',
    texto: 'Cuando pierdas tu Furia,\nganas 1 de Fuerza y 1 de Destreza\npara este combate.',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'corazonSalvaje', 1);
    },
    mejora: {
      texto: 'Cuando pierdas tu Furia,\nganas 2 de Fuerza y 2 de Destreza\npara este combate.',
      jugar: async (c) => {
        await c.aplicarEstado(c.jugador, 'corazonSalvaje', 1);
      },
    },
  },
  {
    id: 'senda-arbol-mundo',
    nombre: 'Savia del Árbol del Mundo',
    clase: 'barbaro',
    tipo: 'habilidad',
    rareza: 'rara',
    coste: 1,
    objetivo: 'ninguno',
    subclase: 'Senda del Árbol del Mundo',
    fx: 'tierra',
    animRara: 'anim-arbol',
    texto: 'Cura 6 PV.\nFuria: gana 1 de Fuerza.',
    jugar: async (c) => {
      await c.curar(6);
      await c.ganarFuria(1);
    },
    mejora: {
      texto: 'Cura 9 PV.\nFuria: gana 2 de Fuerza.',
      jugar: async (c) => {
        await c.curar(9);
        await c.ganarFuria(2);
      },
    },
  },
  {
    id: 'senda-fanatico',
    nombre: 'Furia Divina',
    clase: 'barbaro',
    tipo: 'ataque',
    rareza: 'rara',
    coste: 2,
    objetivo: 'enemigo',
    subclase: 'Senda del Fanático',
    fx: 'divino',
    animRara: 'anim-divino',
    texto: 'Inflige 9 de daño; tu bonus de Furia\ncuenta doble. Gana 8 de bloqueo.',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 9 + c.jugador.furiaFuerza, 1, 'divino');
      await c.ganarBloqueo(8);
    },
    mejora: {
      texto: 'Inflige 12 de daño; tu bonus de Furia\ncuenta doble. Gana 11 de bloqueo.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 12 + c.jugador.furiaFuerza, 1, 'divino');
        await c.ganarBloqueo(11);
      },
    },
  },
];

// ── Mago ─────────────────────────────────────────────────────────────────────

export const MAGO: CartaDef[] = [
  {
    id: 'manos-ardientes',
    nombre: 'Manos Ardientes',
    clase: 'mago',
    tipo: 'ataque',
    rareza: 'inicial',
    coste: 0,
    objetivo: 'todos',
    requiereConjuro: 1,
    fx: 'furia',
    texto: 'Gasta un conjuro: inflige 4 de daño\n(+4 por nivel del espacio)\na TODOS los enemigos.',
    jugar: async (c) => {
      const nivel = await c.gastarConjuro(1);
      await c.atacarTodos(4 + 4 * nivel, 'furia');
    },
    mejora: {
      texto: 'Gasta un conjuro: inflige 6 de daño\n(+5 por nivel del espacio)\na TODOS los enemigos.',
      jugar: async (c) => {
        const nivel = await c.gastarConjuro(1);
        await c.atacarTodos(6 + 5 * nivel, 'furia');
      },
    },
  },
  {
    id: 'canalizar-mana',
    nombre: 'Canalizar Maná',
    clase: 'mago',
    tipo: 'poder',
    rareza: 'inicial',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'estrellas',
    texto: 'Gana 1 espacio de conjuro\ndurante este combate.',
    jugar: async (c) => {
      await c.ganarConjuro(false);
    },
    mejora: {
      coste: 0,
      texto: 'Gana 1 espacio de conjuro\ndurante este combate.',
    },
  },
  {
    id: 'proyectil-magico',
    nombre: 'Proyectil Mágico',
    clase: 'mago',
    tipo: 'ataque',
    rareza: 'comun',
    coste: 0,
    objetivo: 'enemigo',
    texto: 'Inflige 3 de daño.\nNunca falla.',
    fx: 'estrellas',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 3, 1, 'estrellas');
    },
    mejora: {
      texto: 'Inflige 3 de daño dos veces.\nNunca falla.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 3, 2, 'estrellas');
      },
    },
  },
  {
    id: 'rayo-escarcha',
    nombre: 'Rayo de Escarcha',
    clase: 'mago',
    tipo: 'ataque',
    rareza: 'comun',
    coste: 1,
    objetivo: 'enemigo',
    texto: 'Inflige 5 de daño.\nAplica 1 de Débil.',
    fx: 'ola',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 5, 1, 'ola');
      await c.aplicarEstado(c.objetivo!, 'debil', 1);
    },
    mejora: {
      texto: 'Inflige 7 de daño.\nAplica 2 de Débil.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 7, 1, 'ola');
        await c.aplicarEstado(c.objetivo!, 'debil', 2);
      },
    },
  },
  {
    id: 'toque-electrizante',
    nombre: 'Toque Electrizante',
    clase: 'mago',
    tipo: 'ataque',
    rareza: 'comun',
    coste: 1,
    objetivo: 'enemigo',
    texto: 'Inflige 7 de daño.',
    fx: 'impacto',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 7, 1, 'impacto');
    },
    mejora: {
      texto: 'Inflige 10 de daño.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 10, 1, 'impacto');
      },
    },
  },
  {
    id: 'armadura-mago',
    nombre: 'Armadura de Mago',
    clase: 'mago',
    tipo: 'habilidad',
    rareza: 'comun',
    coste: 1,
    objetivo: 'ninguno',
    texto: 'Gana 6 de bloqueo.\nRoba 1 carta.',
    fx: 'bloqueo',
    jugar: async (c) => {
      await c.ganarBloqueo(6);
      await c.robar(1);
    },
    mejora: {
      texto: 'Gana 9 de bloqueo.\nRoba 1 carta.',
      jugar: async (c) => {
        await c.ganarBloqueo(9);
        await c.robar(1);
      },
    },
  },
  {
    id: 'truco-magia',
    nombre: 'Truco de Magia',
    clase: 'mago',
    tipo: 'habilidad',
    rareza: 'comun',
    coste: 0,
    objetivo: 'ninguno',
    texto: 'Roba 1 carta.',
    fx: 'estrellas',
    jugar: async (c) => {
      await c.robar(1);
    },
    mejora: {
      texto: 'Roba 2 cartas.',
      jugar: async (c) => {
        await c.robar(2);
      },
    },
  },
  {
    id: 'escudo-arcano',
    nombre: 'Escudo Arcano',
    clase: 'mago',
    tipo: 'habilidad',
    rareza: 'comun',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'bloqueo',
    texto: 'Gana 4 de bloqueo\n+2 por cada espacio de conjuro disponible.',
    jugar: async (c) => {
      await c.ganarBloqueo(4 + 2 * c.conjurosLibres());
    },
    mejora: {
      texto: 'Gana 6 de bloqueo\n+3 por cada espacio de conjuro disponible.',
      jugar: async (c) => {
        await c.ganarBloqueo(6 + 3 * c.conjurosLibres());
      },
    },
  },
  {
    id: 'bola-fuego',
    nombre: 'Bola de Fuego',
    clase: 'mago',
    tipo: 'ataque',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'todos',
    requiereConjuro: 1,
    fx: 'impacto',
    texto: 'Gasta un conjuro: inflige 8 de daño\n(+4 por nivel) a TODOS los enemigos.',
    jugar: async (c) => {
      const nivel = await c.gastarConjuro(1);
      await c.atacarTodos(8 + 4 * nivel, 'impacto');
    },
    mejora: {
      texto: 'Gasta un conjuro: inflige 11 de daño\n(+5 por nivel) a TODOS los enemigos.',
      jugar: async (c) => {
        const nivel = await c.gastarConjuro(1);
        await c.atacarTodos(11 + 5 * nivel, 'impacto');
      },
    },
  },
  {
    id: 'rayo-abrasador',
    nombre: 'Rayo Abrasador',
    clase: 'mago',
    tipo: 'ataque',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'enemigo',
    requiereConjuro: 1,
    fx: 'impacto',
    texto: 'Gasta un conjuro: inflige 10 de daño\n(+6 por nivel del espacio).',
    jugar: async (c) => {
      const nivel = await c.gastarConjuro(1);
      await c.atacar(c.objetivo!, 10 + 6 * nivel, 1, 'impacto');
    },
    mejora: {
      texto: 'Gasta un conjuro: inflige 13 de daño\n(+8 por nivel del espacio).',
      jugar: async (c) => {
        const nivel = await c.gastarConjuro(1);
        await c.atacar(c.objetivo!, 13 + 8 * nivel, 1, 'impacto');
      },
    },
  },
  {
    id: 'toque-vampirico',
    nombre: 'Toque Vampírico',
    clase: 'mago',
    tipo: 'ataque',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'enemigo',
    requiereConjuro: 2,
    fx: 'muerte',
    texto: 'Gasta un conjuro de nivel 2+:\ninflige 9 de daño (+5 por nivel)\ny cura la mitad del daño.',
    jugar: async (c) => {
      const nivel = await c.gastarConjuro(2);
      const hecho = await c.atacar(c.objetivo!, 9 + 5 * nivel, 1, 'muerte');
      await c.curar(Math.ceil(hecho / 2));
    },
    mejora: {
      texto: 'Gasta un conjuro de nivel 2+:\ninflige 12 de daño (+6 por nivel)\ny cura la mitad del daño.',
      jugar: async (c) => {
        const nivel = await c.gastarConjuro(2);
        const hecho = await c.atacar(c.objetivo!, 12 + 6 * nivel, 1, 'muerte');
        await c.curar(Math.ceil(hecho / 2));
      },
    },
  },
  {
    id: 'meditacion-arcana',
    nombre: 'Meditación Arcana',
    clase: 'mago',
    tipo: 'poder',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'estrellas',
    texto: 'Gana 1 espacio de conjuro\ndurante este combate.\nRoba 1 carta.',
    jugar: async (c) => {
      await c.ganarConjuro(false);
      await c.robar(1);
    },
    mejora: {
      texto: 'Gana 1 espacio de conjuro\ndurante este combate.\nRoba 2 cartas.',
      jugar: async (c) => {
        await c.ganarConjuro(false);
        await c.robar(2);
      },
    },
  },
  {
    id: 'sacrificio-arcano',
    nombre: 'Sacrificio Arcano',
    clase: 'mago',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'muerte',
    texto: 'Pierde 5 PV.\nRecupera el espacio de conjuro\ngastado de MAYOR nivel.',
    jugar: async (c) => {
      await c.perderPV(5);
      const nivel = await c.recuperarConjuro(true);
      if (nivel === 0) await c.mensaje('No había conjuros gastados…');
    },
    mejora: {
      texto: 'Recupera el espacio de conjuro\ngastado de MAYOR nivel.\nSin coste de vida.',
      jugar: async (c) => {
        const nivel = await c.recuperarConjuro(true);
        if (nivel === 0) await c.mensaje('No había conjuros gastados…');
      },
    },
  },
  {
    id: 'estudio-arcano',
    nombre: 'Estudio Arcano',
    clase: 'mago',
    tipo: 'poder',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'estrellas',
    unUso: true,
    texto: 'Gana 1 espacio de conjuro permanente\n1 uso: se consume para siempre.',
    jugar: async (c) => {
      await c.ganarConjuro(true);
    },
    mejora: {
      coste: 0,
      texto: 'Gana 1 espacio de conjuro permanente\n1 uso: se consume para siempre.',
    },
  },
  {
    id: 'recuperacion-arcana',
    nombre: 'Recuperación Arcana',
    clase: 'mago',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'estrellas',
    texto: 'Recupera el espacio de conjuro gastado\nde menor nivel.',
    jugar: async (c) => {
      const nivel = await c.recuperarConjuro();
      if (nivel === 0) await c.mensaje('No había conjuros gastados…');
    },
    mejora: {
      coste: 0,
      texto: 'Recupera el espacio de conjuro gastado\nde menor nivel.',
    },
  },
  {
    id: 'marea-arcana',
    nombre: 'Marea Arcana',
    clase: 'mago',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 2,
    objetivo: 'ninguno',
    fx: 'ola',
    texto: 'Recupera los 2 espacios de conjuro\ngastados de menor nivel.',
    jugar: async (c) => {
      const a = await c.recuperarConjuro();
      const b = await c.recuperarConjuro();
      if (a + b === 0) await c.mensaje('No había conjuros gastados…');
    },
    mejora: {
      coste: 1,
      texto: 'Recupera los 2 espacios de conjuro\ngastados de menor nivel.',
    },
  },
  {
    id: 'acelerar',
    nombre: 'Acelerar',
    clase: 'mago',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'ninguno',
    texto: 'Gana 1 de energía.\nRoba 1 carta.',
    fx: 'estrellas',
    jugar: async (c) => {
      c.ganarEnergia(1);
      await c.robar(1);
    },
    mejora: {
      texto: 'Gana 2 de energía.\nRoba 1 carta.',
      jugar: async (c) => {
        c.ganarEnergia(2);
        await c.robar(1);
      },
    },
  },
  // — Cartas raras: una por escuela de magia —
  {
    id: 'escuela-evocacion',
    nombre: 'Meteorito',
    clase: 'mago',
    tipo: 'ataque',
    rareza: 'rara',
    coste: 2,
    objetivo: 'todos',
    subclase: 'Evocación',
    requiereConjuro: 1,
    fx: 'impacto',
    animRara: 'anim-evocacion',
    texto: 'Gasta un conjuro: inflige 14 de daño\n(+6 por nivel) a TODOS los enemigos.',
    jugar: async (c) => {
      const nivel = await c.gastarConjuro(1);
      await c.atacarTodos(14 + 6 * nivel, 'impacto');
    },
    mejora: {
      texto: 'Gasta un conjuro: inflige 18 de daño\n(+8 por nivel) a TODOS los enemigos.',
      jugar: async (c) => {
        const nivel = await c.gastarConjuro(1);
        await c.atacarTodos(18 + 8 * nivel, 'impacto');
      },
    },
  },
  {
    id: 'escuela-abjuracion',
    nombre: 'Globo de Invulnerabilidad',
    clase: 'mago',
    tipo: 'habilidad',
    rareza: 'rara',
    coste: 1,
    objetivo: 'ninguno',
    subclase: 'Abjuración',
    requiereConjuro: 1,
    fx: 'bloqueo',
    animRara: 'anim-abjuracion',
    texto: 'Gasta un conjuro: gana 12 de bloqueo\n(+6 por nivel) y elimina tus estados\nnegativos (Débil, Vulnerable, Frágil).',
    jugar: async (c) => {
      const nivel = await c.gastarConjuro(1);
      await c.ganarBloqueo(12 + 6 * nivel);
      delete c.jugador.estados.debil;
      delete c.jugador.estados.vulnerable;
      delete c.jugador.estados.fragil;
      await c.mensaje('✨ Estados negativos disipados');
    },
    mejora: {
      texto: 'Gasta un conjuro: gana 16 de bloqueo\n(+8 por nivel) y elimina tus estados\nnegativos (Débil, Vulnerable, Frágil).',
      jugar: async (c) => {
        const nivel = await c.gastarConjuro(1);
        await c.ganarBloqueo(16 + 8 * nivel);
        delete c.jugador.estados.debil;
        delete c.jugador.estados.vulnerable;
        delete c.jugador.estados.fragil;
        await c.mensaje('✨ Estados negativos disipados');
      },
    },
  },
  {
    id: 'escuela-ilusion',
    nombre: 'Imagen Espejo',
    clase: 'mago',
    tipo: 'habilidad',
    rareza: 'rara',
    coste: 1,
    objetivo: 'ninguno',
    subclase: 'Ilusión',
    fx: 'luna',
    animRara: 'anim-ilusion',
    requiereConjuro: 1,
    texto: 'Gasta un conjuro. Copias ilusorias 1 turno:\n40 % de esquivar +20 % por nivel del\nespacio (un golpe recibido las disipa).',
    jugar: async (c) => {
      const nivel = await c.gastarConjuro(1);
      await c.aplicarEstado(c.jugador, 'espejismo', 2 + nivel); // 40 % base + 20 % por nivel
    },
    mejora: {
      coste: 0,
      texto: 'Gasta un conjuro. Copias ilusorias 1 turno:\n40 % de esquivar +20 % por nivel del\nespacio (un golpe recibido las disipa).',
    },
  },
];

// ── Mazos iniciales y recompensas ────────────────────────────────────────────

/** Las 2 cartas de clase con las que arranca cada mazo. */
const INICIALES_DE_CLASE: Record<ClaseId, [string, string]> = {
  // identidad desde el turno 1: zarpa + raíces
  druida: ['zarpazo', 'enredadera'],
  // furia + ataque temerario que la alimenta
  barbaro: ['furia-primaria', 'golpe-imprudente'],
  // un poder que genera espacio de conjuro y una carta que lo gasta
  mago: ['canalizar-mana', 'manos-ardientes'],
};

const POOLS: Record<ClaseId, CartaDef[]> = { druida: DRUIDA, barbaro: BARBARO, mago: MAGO };

export function mazoInicial(clase: ClaseId): CartaInstancia[] {
  const golpe = BASICAS.find((c) => c.id === 'golpe')!;
  const defender = BASICAS.find((c) => c.id === 'defender')!;
  const extras = INICIALES_DE_CLASE[clase].map((id) => POOLS[clase].find((c) => c.id === id)!);
  return [
    ...Array.from({ length: 5 }, () => instanciar(golpe)),
    ...Array.from({ length: 4 }, () => instanciar(defender)),
    ...extras.map(instanciar),
  ];
}

export function poolDeClase(clase: ClaseId): CartaDef[] {
  return POOLS[clase].filter((c) => c.rareza !== 'inicial');
}

/** Registro completo (para guardar/cargar partidas por id). */
export function cartaPorId(id: string): CartaDef | undefined {
  return [...BASICAS, ...DRUIDA, ...BARBARO, ...MAGO].find((c) => c.id === id);
}

/** Elige 3 cartas de recompensa con pesos por rareza. */
export function recompensaCartas(clase: ClaseId, rng: () => number, pesoRaro = 4): CartaDef[] {
  const pool = poolDeClase(clase);
  const elegidas: CartaDef[] = [];
  let intentos = 0;
  while (elegidas.length < 3 && intentos++ < 100) {
    const tirada = rng() * 100;
    const rareza: Rareza = tirada < pesoRaro ? 'rara' : tirada < pesoRaro + 35 ? 'infrecuente' : 'comun';
    const candidatas = pool.filter((c) => c.rareza === rareza && !elegidas.includes(c));
    if (candidatas.length === 0) continue;
    elegidas.push(candidatas[Math.floor(rng() * candidatas.length)]);
  }
  return elegidas;
}
