import type { CartaDef, CartaInstancia, ClaseId, ContextoEfecto, Rareza } from './types.ts';

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
    innato: m.innato ?? inst.def.innato,
    jugar: m.jugar ?? inst.def.jugar,
  };
}

/** Suma de los niveles de los espacios de conjuro libres (mago). */
function nivelesLibres(c: ContextoEfecto): number {
  return c.jugador.conjuros.filter((e) => !e.gastado).reduce((s, e) => s + e.nivel, 0);
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
    texto: 'Inflige 5 de daño.\nAplica 2 de Vulnerable.',
    fx: 'zarpa',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 5, 1, 'zarpa');
      await c.aplicarEstado(c.objetivo!, 'vulnerable', 2);
    },
    mejora: {
      texto: 'Inflige 8 de daño.\nAplica 3 de Vulnerable.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 8, 1, 'zarpa');
        await c.aplicarEstado(c.objetivo!, 'vulnerable', 3);
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
    texto: 'Inflige 5 de daño.\nSi estás transformado,\nrecuperas 1 de energía.',
    fx: 'zarpa',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 5, 1, 'zarpa');
      if (c.estaTransformado()) c.ganarEnergia(1);
    },
    mejora: {
      texto: 'Inflige 8 de daño.\nSi estás transformado,\nrecuperas 1 de energía.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 8, 1, 'zarpa');
        if (c.estaTransformado()) c.ganarEnergia(1);
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
    nombre: 'Raíces Enredaderas',
    clase: 'druida',
    tipo: 'habilidad',
    rareza: 'comun',
    coste: 1,
    objetivo: 'todos',
    fx: 'raices',
    texto: 'Aplica 6 de Raíces a TODOS\nlos enemigos durante 1 turno.',
    jugar: async (c) => {
      for (const e of c.enemigos.filter((x) => x.vivo)) await c.aplicarRaices(e, 6, 1);
    },
    mejora: {
      texto: 'Aplica 9 de Raíces a TODOS\nlos enemigos durante 1 turno.',
      jugar: async (c) => {
        for (const e of c.enemigos.filter((x) => x.vivo)) await c.aplicarRaices(e, 9, 1);
      },
    },
  },
  {
    id: 'zarpa-doble',
    nombre: 'Tormenta de Zarpas',
    clase: 'druida',
    tipo: 'ataque',
    rareza: 'comun',
    coste: 1,
    objetivo: 'enemigo',
    texto: 'Inflige 3 de daño tres veces.',
    fx: 'zarpa',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 3, 3, 'zarpa');
    },
    mejora: {
      texto: 'Inflige 4 de daño tres veces.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 4, 3, 'zarpa');
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
    texto: 'Aplica 2 de Débil.',
    fx: 'aullido',
    jugar: async (c) => {
      await c.aplicarEstado(c.objetivo!, 'debil', 2);
    },
    mejora: {
      texto: 'Aplica 3 de Débil.',
      jugar: async (c) => {
        await c.aplicarEstado(c.objetivo!, 'debil', 3);
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
    texto: 'Transformación: +2 de Fuerza durante 4 turnos.\nInflige 6 de daño.',
    jugar: async (c) => {
      await c.efectoTemporal({ etiqueta: 'Forma de Lobo', turnos: 4, fuerza: 2, destreza: 0 });
      await c.atacar(c.objetivo!, 6, 1, 'zarpa');
    },
    mejora: {
      texto: 'Transformación: +3 de Fuerza durante 4 turnos.\nInflige 8 de daño.',
      jugar: async (c) => {
        await c.efectoTemporal({ etiqueta: 'Forma de Lobo', turnos: 4, fuerza: 3, destreza: 0 });
        await c.atacar(c.objetivo!, 8, 1, 'zarpa');
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
    texto: 'Transformación: +3 de Fuerza durante 4 turnos.\nGana 10 de bloqueo.',
    jugar: async (c) => {
      await c.efectoTemporal({ etiqueta: 'Forma de Oso', turnos: 4, fuerza: 3, destreza: 0 });
      await c.ganarBloqueo(10);
    },
    mejora: {
      texto: 'Transformación: +4 de Fuerza durante 4 turnos.\nGana 13 de bloqueo.',
      jugar: async (c) => {
        await c.efectoTemporal({ etiqueta: 'Forma de Oso', turnos: 4, fuerza: 4, destreza: 0 });
        await c.ganarBloqueo(13);
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
    texto: 'Transformación: +1 de Destreza durante 4 turnos.\nRoba 2 cartas.',
    jugar: async (c) => {
      await c.efectoTemporal({ etiqueta: 'Forma de Águila', turnos: 4, fuerza: 0, destreza: 1 });
      await c.robar(2);
    },
    mejora: {
      texto: 'Transformación: +2 de Destreza durante 4 turnos.\nRoba 3 cartas.',
      jugar: async (c) => {
        await c.efectoTemporal({ etiqueta: 'Forma de Águila', turnos: 4, fuerza: 0, destreza: 2 });
        await c.robar(3);
      },
    },
  },
  {
    id: 'forma-enjambre',
    nombre: 'Forma de Enjambre',
    clase: 'druida',
    tipo: 'ataque',
    rareza: 'infrecuente',
    coste: 2,
    objetivo: 'todos',
    fx: 'transformacion',
    texto: 'Transformación: +2 de Destreza durante 4 turnos.\nInflige 6 de daño a TODOS los enemigos.',
    jugar: async (c) => {
      await c.efectoTemporal({ etiqueta: 'Forma de Enjambre', turnos: 4, fuerza: 0, destreza: 2 });
      await c.atacarTodos(6, 'hojas');
    },
    mejora: {
      texto: 'Transformación: +3 de Destreza durante 4 turnos.\nInflige 9 de daño a TODOS los enemigos.',
      jugar: async (c) => {
        await c.efectoTemporal({ etiqueta: 'Forma de Enjambre', turnos: 4, fuerza: 0, destreza: 3 });
        await c.atacarTodos(9, 'hojas');
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
    objetivo: 'todos',
    fx: 'raices',
    texto: 'Aplica 11 de Raíces a TODOS\nlos enemigos durante 1 turno.',
    jugar: async (c) => {
      for (const e of c.enemigos.filter((x) => x.vivo)) await c.aplicarRaices(e, 11, 1);
    },
    mejora: {
      texto: 'Aplica 14 de Raíces a TODOS\nlos enemigos durante 1 turno.',
      jugar: async (c) => {
        for (const e of c.enemigos.filter((x) => x.vivo)) await c.aplicarRaices(e, 14, 1);
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
    texto: 'Gana 4 de Espinas.',
    fx: 'hojas',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'espinas', 4);
    },
    mejora: {
      texto: 'Gana 7 de Espinas.',
      jugar: async (c) => {
        await c.aplicarEstado(c.jugador, 'espinas', 7);
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
    objetivo: 'todos',
    fx: 'luna',
    texto: 'Inflige 9 de daño a TODOS los enemigos.\nSi estás transformado, aplica 2 de Vulnerable.',
    jugar: async (c) => {
      await c.atacarTodos(9, 'luna');
      if (c.estaTransformado())
        for (const e of c.enemigos.filter((x) => x.vivo)) await c.aplicarEstado(e, 'vulnerable', 2);
    },
    mejora: {
      texto: 'Inflige 13 de daño a TODOS los enemigos.\nSi estás transformado, aplica 3 de Vulnerable.',
      jugar: async (c) => {
        await c.atacarTodos(13, 'luna');
        if (c.estaTransformado())
          for (const e of c.enemigos.filter((x) => x.vivo)) await c.aplicarEstado(e, 'vulnerable', 3);
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
  // — Invocaciones: aliado que absorbe daño y ataca cada turno —
  {
    id: 'comunion-salvaje',
    nombre: 'Comunión Salvaje',
    clase: 'druida',
    tipo: 'habilidad',
    rareza: 'comun',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'hojas',
    texto: 'Invoca 4.\nCura hasta 10 de vida a tu invocación.',
    jugar: async (c) => {
      await c.invocar('lobo', 4);
      await c.curarInvocacion(10);
    },
    mejora: {
      texto: 'Invoca 6.\nCura hasta 10 de vida a tu invocación.',
      jugar: async (c) => {
        await c.invocar('lobo', 6);
        await c.curarInvocacion(10);
      },
    },
  },
  {
    id: 'oso-espiritual',
    nombre: 'Oso Espiritual',
    clase: 'druida',
    tipo: 'habilidad',
    rareza: 'comun',
    coste: 2,
    objetivo: 'ninguno',
    fx: 'tierra',
    texto: 'Invoca 8.',
    jugar: async (c) => {
      await c.invocar('oso', 8);
    },
    mejora: {
      texto: 'Invoca 11.',
      jugar: async (c) => {
        await c.invocar('oso', 11);
      },
    },
  },
  {
    id: 'elemental-agua',
    nombre: 'Elemental de Agua',
    clase: 'druida',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'ola',
    texto: 'Invoca 6.\nForma Agua: te cura 2 PV\nal inicio de cada turno.',
    jugar: async (c) => {
      await c.invocar('agua', 6);
    },
    mejora: {
      texto: 'Invoca 8.\nForma Agua: te cura 2 PV\nal inicio de cada turno.',
      jugar: async (c) => {
        await c.invocar('agua', 8);
      },
    },
  },
  {
    id: 'elemental-fuego',
    nombre: 'Elemental de Fuego',
    clase: 'druida',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 2,
    objetivo: 'ninguno',
    fx: 'furia',
    texto: 'Invoca 7.\nForma Fuego: sus ataques hacen\nel doble de daño al bloqueo.',
    jugar: async (c) => {
      await c.invocar('fuego', 7);
    },
    mejora: {
      texto: 'Invoca 10.\nForma Fuego: sus ataques hacen\nel doble de daño al bloqueo.',
      jugar: async (c) => {
        await c.invocar('fuego', 10);
      },
    },
  },
  {
    id: 'elemental-aire',
    nombre: 'Elemental de Aire',
    clase: 'druida',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 2,
    objetivo: 'ninguno',
    fx: 'aullido',
    texto: 'Invoca 5.\nForma Aire: ataca a dos enemigos\n(o dos veces si solo hay uno).',
    jugar: async (c) => {
      await c.invocar('aire', 5);
    },
    mejora: {
      texto: 'Invoca 7.\nForma Aire: ataca a dos enemigos\n(o dos veces si solo hay uno).',
      jugar: async (c) => {
        await c.invocar('aire', 7);
      },
    },
  },
  {
    id: 'vinculo-feroz',
    nombre: 'Vínculo Feroz',
    clase: 'druida',
    tipo: 'ataque',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'zarpa',
    texto: 'Tu invocación ataca de inmediato\ne inflige 5 de daño adicional.',
    jugar: async (c) => {
      if (c.hayInvocacion()) await c.atacarInvocacion(5);
      else await c.mensaje('No tienes ninguna invocación…');
    },
    mejora: {
      texto: 'Tu invocación ataca de inmediato\ne inflige 8 de daño adicional.',
      jugar: async (c) => {
        if (c.hayInvocacion()) await c.atacarInvocacion(8);
        else await c.mensaje('No tienes ninguna invocación…');
      },
    },
  },
  // — Cartas raras: una por subclase de druida (D&D 2024) —
  {
    id: 'corazon-cambiante',
    nombre: 'Corazón del Cambiante',
    clase: 'druida',
    tipo: 'poder',
    rareza: 'rara',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'transformacion',
    animRara: 'anim-arbol',
    texto: 'Poder: tus Transformaciones duran\n2 turnos más y otorgan +1 de\nFuerza (o de Destreza).',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'formaProlongada', 2);
      await c.aplicarEstado(c.jugador, 'formaPotenciada', 1);
    },
    mejora: {
      texto: 'Poder: tus Transformaciones duran\n4 turnos más y otorgan +1 de\nFuerza (o de Destreza).',
      jugar: async (c) => {
        await c.aplicarEstado(c.jugador, 'formaProlongada', 4);
        await c.aplicarEstado(c.jugador, 'formaPotenciada', 1);
      },
    },
  },
  {
    id: 'circulo-tierra',
    nombre: 'Raíces Profundas',
    clase: 'druida',
    tipo: 'poder',
    rareza: 'rara',
    coste: 2,
    objetivo: 'ninguno',
    subclase: 'Círculo de la Tierra',
    fx: 'tierra',
    animRara: 'anim-tierra',
    texto: 'Poder: cada carta de Raíces que juegues\ndura 1 turno más.',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'raizProlongada', 1);
    },
    mejora: {
      coste: 1,
      texto: 'Poder: cada carta de Raíces que juegues\ndura 1 turno más.',
      jugar: async (c) => {
        await c.aplicarEstado(c.jugador, 'raizProlongada', 1);
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
    texto: 'Transformación: +4 de Fuerza durante 5 turnos.\nInflige 8 de daño dos veces.',
    jugar: async (c) => {
      await c.efectoTemporal({ etiqueta: 'Forma Lunar', turnos: 5, fuerza: 4, destreza: 0 });
      await c.atacar(c.objetivo!, 8, 2, 'luna');
    },
    mejora: {
      texto: 'Transformación: +5 de Fuerza durante 5 turnos.\nInflige 11 de daño dos veces.',
      jugar: async (c) => {
        await c.efectoTemporal({ etiqueta: 'Forma Lunar', turnos: 5, fuerza: 5, destreza: 0 });
        await c.atacar(c.objetivo!, 11, 2, 'luna');
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
    texto: 'Inflige 10 de daño a TODOS los enemigos\ny les aplica 2 de Débil.',
    jugar: async (c) => {
      await c.atacarTodos(10, 'ola');
      for (const e of c.enemigos.filter((x) => x.vivo)) await c.aplicarEstado(e, 'debil', 2);
    },
    mejora: {
      texto: 'Inflige 13 de daño a TODOS los enemigos\ny les aplica 3 de Débil.',
      jugar: async (c) => {
        await c.atacarTodos(13, 'ola');
        for (const e of c.enemigos.filter((x) => x.vivo)) await c.aplicarEstado(e, 'debil', 3);
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
    exhumar: true,
    texto: 'Roba 2 cartas.\nDurante 3 turnos: roba 1 carta extra\ny cura 1 PV al inicio del turno.\nSe agota.',
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
      texto: 'Roba 3 cartas.\nDurante 4 turnos: roba 1 carta extra\ny cura 1 PV al inicio del turno.\nSe agota.',
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
  // — Raras de invocación —
  {
    id: 'guardian-roble',
    nombre: 'Guardián de Roble',
    clase: 'druida',
    tipo: 'habilidad',
    rareza: 'rara',
    coste: 2,
    objetivo: 'ninguno',
    fx: 'hojas',
    animRara: 'anim-arbol',
    texto: 'Invoca 9.\nForma Árbol: cuando ataca,\naplica 2 de Raíces.',
    jugar: async (c) => {
      await c.invocar('arbol', 9);
    },
    mejora: {
      texto: 'Invoca 12.\nForma Árbol: cuando ataca,\naplica 2 de Raíces.',
      jugar: async (c) => {
        await c.invocar('arbol', 12);
      },
    },
  },
  {
    id: 'elemental-tierra',
    nombre: 'Elemental de Tierra',
    clase: 'druida',
    tipo: 'habilidad',
    rareza: 'rara',
    coste: 2,
    objetivo: 'ninguno',
    fx: 'tierra',
    animRara: 'anim-tierra',
    texto: 'Invoca 8.\nForma Tierra: al inicio de tu turno\nganas 6 de bloqueo.',
    jugar: async (c) => {
      await c.invocar('tierra', 8);
    },
    mejora: {
      texto: 'Invoca 11.\nForma Tierra: al inicio de tu turno\nganas 6 de bloqueo.',
      jugar: async (c) => {
        await c.invocar('tierra', 11);
      },
    },
  },
  // — Carta única de clase (don del inicio del Acto III) —
  {
    id: 'tormenta-venganza',
    nombre: 'Tormenta de Venganza',
    clase: 'druida',
    tipo: 'ataque',
    rareza: 'especial',
    coste: 3,
    objetivo: 'todos',
    fx: 'ola',
    animRara: 'anim-mar',
    exhumar: true,
    texto: 'Inflige 18 de daño a TODOS los enemigos,\nles aplica 2 Débil, 2 Vulnerable y 9 Raíces.\nGana 8 de bloqueo. Se agota.',
    jugar: async (c) => {
      await c.atacarTodos(18, 'ola');
      for (const e of c.enemigos.filter((x) => x.vivo)) {
        await c.aplicarEstado(e, 'debil', 2);
        await c.aplicarEstado(e, 'vulnerable', 2);
        await c.aplicarRaices(e, 9, 1);
      }
      await c.ganarBloqueo(8);
    },
    mejora: {
      texto: 'Inflige 24 de daño a TODOS los enemigos,\nles aplica 3 Débil, 3 Vulnerable y 12 Raíces.\nGana 12 de bloqueo. Se agota.',
      jugar: async (c) => {
        await c.atacarTodos(24, 'ola');
        for (const e of c.enemigos.filter((x) => x.vivo)) {
          await c.aplicarEstado(e, 'debil', 3);
          await c.aplicarEstado(e, 'vulnerable', 3);
          await c.aplicarRaices(e, 12, 1);
        }
        await c.ganarBloqueo(12);
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
    texto: 'Furia: gana 2 de Fuerza\ny 1 de Destreza.',
    jugar: async (c) => {
      await c.ganarFuria(2, 1);
    },
    mejora: {
      texto: 'Furia: gana 3 de Fuerza\ny 2 de Destreza.',
      jugar: async (c) => {
        await c.ganarFuria(3, 2);
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
      texto: 'Inflige 11 de daño.\nRecibes 1 de daño.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 11);
        await c.perderPV(1);
      },
    },
  },
  {
    id: 'tajo-brutal',
    nombre: 'Hendidura',
    clase: 'barbaro',
    tipo: 'ataque',
    rareza: 'comun',
    coste: 2,
    objetivo: 'todos',
    texto: 'Golpea 3 veces a enemigos\naleatorios: 6 de daño cada vez.',
    fx: 'tajo',
    jugar: async (c) => {
      for (let i = 0; i < 3; i++) {
        const vivos = c.enemigos.filter((e) => e.vivo);
        if (vivos.length === 0) break;
        await c.atacar(vivos[Math.floor(c.rng() * vivos.length)], 6, 1, 'tajo');
      }
    },
    mejora: {
      texto: 'Golpea 3 veces a enemigos\naleatorios: 9 de daño cada vez.',
      jugar: async (c) => {
        for (let i = 0; i < 3; i++) {
          const vivos = c.enemigos.filter((e) => e.vivo);
          if (vivos.length === 0) break;
          await c.atacar(vivos[Math.floor(c.rng() * vivos.length)], 9, 1, 'tajo');
        }
      },
    },
  },
  {
    id: 'postura-firme',
    nombre: 'Postura Firme',
    clase: 'barbaro',
    tipo: 'habilidad',
    rareza: 'comun',
    coste: 1,
    objetivo: 'ninguno',
    texto: 'Gana 5 de bloqueo, más tu Fuerza.',
    fx: 'bloqueo',
    jugar: async (c) => {
      await c.ganarBloqueo(5 + Math.max(0, c.jugador.estados.fuerza ?? 0));
    },
    mejora: {
      texto: 'Gana 8 de bloqueo, más tu Fuerza.',
      jugar: async (c) => {
        await c.ganarBloqueo(8 + Math.max(0, c.jugador.estados.fuerza ?? 0));
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
    texto: 'Inflige 6 de daño.\nGana 3 de bloqueo.',
    fx: 'tajo',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 6);
      await c.ganarBloqueo(3);
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
    texto: 'Furia: gana 3 de Fuerza.',
    fx: 'furia',
    jugar: async (c) => {
      await c.ganarFuria(3);
    },
    mejora: {
      texto: 'Furia: gana 5 de Fuerza.',
      jugar: async (c) => {
        await c.ganarFuria(5);
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
    texto: 'Furia: gana 3 de Destreza.',
    fx: 'furia',
    jugar: async (c) => {
      await c.ganarFuria(0, 3);
    },
    mejora: {
      texto: 'Furia: gana 5 de Destreza.',
      jugar: async (c) => {
        await c.ganarFuria(0, 5);
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
    texto: 'Inflige 6 de daño\nmás 3× tu Fuerza adicional.',
    jugar: async (c) => {
      const extra = Math.max(0, c.jugador.estados.fuerza ?? 0) * 2; // base ya suma fuerza 1×
      await c.atacar(c.objetivo!, 6 + extra, 1, 'impacto');
    },
    mejora: {
      texto: 'Inflige 8 de daño\nmás 4× tu Fuerza adicional.',
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
    texto: 'Inflige 4 de daño.\nSi tienes Furia activa, inflige 10.',
    jugar: async (c) => {
      const conFuria = c.jugador.furiaFuerza + c.jugador.furiaDestreza > 0;
      await c.atacar(c.objetivo!, conFuria ? 10 : 4, 1, conFuria ? 'furia' : 'tajo');
    },
    mejora: {
      texto: 'Inflige 6 de daño.\nSi tienes Furia activa, inflige 13.',
      jugar: async (c) => {
        const conFuria = c.jugador.furiaFuerza + c.jugador.furiaDestreza > 0;
        await c.atacar(c.objetivo!, conFuria ? 13 : 6, 1, conFuria ? 'furia' : 'tajo');
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
    texto: 'Inflige 6 de daño a TODOS los enemigos.',
    fx: 'tajo',
    jugar: async (c) => {
      await c.atacarTodos(6);
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
  // — Hemorragia: sangrado que persiste mientras lo mantengas herido —
  {
    id: 'corte-sangrante',
    nombre: 'Corte Sangrante',
    clase: 'barbaro',
    tipo: 'ataque',
    rareza: 'comun',
    coste: 1,
    objetivo: 'enemigo',
    fx: 'sangre',
    texto: 'Inflige 5 de daño.\nAplica 4 de Hemorragia.',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 5, 1, 'sangre');
      await c.aplicarEstado(c.objetivo!, 'hemorragia', 4);
    },
    mejora: {
      texto: 'Inflige 7 de daño.\nAplica 5 de Hemorragia.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 7, 1, 'sangre');
        await c.aplicarEstado(c.objetivo!, 'hemorragia', 5);
      },
    },
  },
  {
    id: 'doble-tajo',
    nombre: 'Doble Tajo',
    clase: 'barbaro',
    tipo: 'ataque',
    rareza: 'comun',
    coste: 1,
    objetivo: 'enemigo',
    fx: 'tajo',
    texto: 'Inflige 3 de daño dos veces.\nAplica 3 de Hemorragia.',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 3, 2, 'tajo');
      await c.aplicarEstado(c.objetivo!, 'hemorragia', 3);
    },
    mejora: {
      texto: 'Inflige 4 de daño dos veces.\nAplica 4 de Hemorragia.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 4, 2, 'tajo');
        await c.aplicarEstado(c.objetivo!, 'hemorragia', 4);
      },
    },
  },
  {
    id: 'desgarro',
    nombre: 'Desgarro',
    clase: 'barbaro',
    tipo: 'ataque',
    rareza: 'infrecuente',
    coste: 2,
    objetivo: 'enemigo',
    fx: 'sangre',
    texto: 'Inflige 8 de daño.\nAplica 6 de Hemorragia.',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 8, 1, 'sangre');
      await c.aplicarEstado(c.objetivo!, 'hemorragia', 6);
    },
    mejora: {
      texto: 'Inflige 10 de daño.\nAplica 8 de Hemorragia.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 10, 1, 'sangre');
        await c.aplicarEstado(c.objetivo!, 'hemorragia', 8);
      },
    },
  },
  {
    id: 'hacha-carnicera',
    nombre: 'Hacha Carnicera',
    clase: 'barbaro',
    tipo: 'ataque',
    rareza: 'infrecuente',
    coste: 2,
    objetivo: 'todos',
    fx: 'sangre',
    texto: 'Inflige 5 de daño a TODOS los enemigos.\nAplica 3 de Hemorragia a todos.',
    jugar: async (c) => {
      await c.atacarTodos(5, 'sangre');
      for (const e of c.enemigos.filter((x) => x.vivo)) await c.aplicarEstado(e, 'hemorragia', 3);
    },
    mejora: {
      texto: 'Inflige 7 de daño a TODOS los enemigos.\nAplica 4 de Hemorragia a todos.',
      jugar: async (c) => {
        await c.atacarTodos(7, 'sangre');
        for (const e of c.enemigos.filter((x) => x.vivo)) await c.aplicarEstado(e, 'hemorragia', 4);
      },
    },
  },
  {
    id: 'furia-sanguinaria',
    nombre: 'Furia Sanguinaria',
    clase: 'barbaro',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'todos',
    fx: 'furia',
    texto: 'Furia: gana 2 de Fuerza.\nInflige 4 de daño a TODOS los enemigos.\nAplica 4 de Hemorragia a TODOS los enemigos.',
    jugar: async (c) => {
      await c.ganarFuria(2);
      await c.atacarTodos(4, 'sangre');
      for (const e of c.enemigos.filter((x) => x.vivo)) await c.aplicarEstado(e, 'hemorragia', 4);
    },
    mejora: {
      texto: 'Furia: gana 3 de Fuerza.\nInflige 6 de daño a TODOS los enemigos.\nAplica 5 de Hemorragia a TODOS los enemigos.',
      jugar: async (c) => {
        await c.ganarFuria(3);
        await c.atacarTodos(6, 'sangre');
        for (const e of c.enemigos.filter((x) => x.vivo)) await c.aplicarEstado(e, 'hemorragia', 5);
      },
    },
  },
  {
    id: 'sed-de-sangre',
    nombre: 'Sed de Sangre',
    clase: 'barbaro',
    tipo: 'poder',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'sangre',
    texto: 'Poder: cada vez que un enemigo pierde PV\npor Hemorragia, ganas 1 de bloqueo.',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'sedSangre', 1);
    },
    mejora: {
      texto: 'Poder: cada vez que un enemigo pierde PV\npor Hemorragia, ganas 2 de bloqueo.',
      jugar: async (c) => {
        await c.aplicarEstado(c.jugador, 'sedSangre', 2);
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
    texto: 'Cura 6 PV.\nFuria: gana 2 de Fuerza.',
    jugar: async (c) => {
      await c.curar(6);
      await c.ganarFuria(2);
    },
    mejora: {
      texto: 'Cura 9 PV.\nFuria: gana 4 de Fuerza.',
      jugar: async (c) => {
        await c.curar(9);
        await c.ganarFuria(4);
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
    texto: 'Inflige 9 de daño y gana 8 de bloqueo;\ntu bonus de Furia cuenta doble en ambos.',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 9 + c.jugador.furiaFuerza, 1, 'divino');
      await c.ganarBloqueo(8 + 2 * c.jugador.furiaFuerza);
    },
    mejora: {
      texto: 'Inflige 12 de daño y gana 11 de bloqueo;\ntu bonus de Furia cuenta doble en ambos.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 12 + c.jugador.furiaFuerza, 1, 'divino');
        await c.ganarBloqueo(11 + 2 * c.jugador.furiaFuerza);
      },
    },
  },
  // — Raras de Hemorragia: pagan el sangrado acumulado —
  {
    id: 'reabrir-heridas',
    nombre: 'Reabrir Heridas',
    clase: 'barbaro',
    tipo: 'ataque',
    rareza: 'rara',
    coste: 1,
    objetivo: 'enemigo',
    fx: 'sangre',
    animRara: 'anim-berserker',
    texto: 'Inflige 6 de daño.\nDuplica la Hemorragia del objetivo.',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 6, 1, 'sangre');
      const hem = c.objetivo!.estados.hemorragia ?? 0;
      if (hem > 0) await c.aplicarEstado(c.objetivo!, 'hemorragia', hem);
    },
    mejora: {
      texto: 'Inflige 8 de daño.\nDuplica la Hemorragia del objetivo.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 8, 1, 'sangre');
        const hem = c.objetivo!.estados.hemorragia ?? 0;
        if (hem > 0) await c.aplicarEstado(c.objetivo!, 'hemorragia', hem);
      },
    },
  },
  {
    id: 'festin-carmesi',
    nombre: 'Festín Carmesí',
    clase: 'barbaro',
    tipo: 'ataque',
    rareza: 'rara',
    coste: 2,
    objetivo: 'enemigo',
    fx: 'sangre',
    animRara: 'anim-berserker',
    texto: 'Consume la Hemorragia del objetivo\ne inflige el doble de esa cantidad.',
    jugar: async (c) => {
      const hem = c.objetivo!.estados.hemorragia ?? 0;
      if (hem > 0) {
        await c.danar(c.objetivo!, hem * 2, 'sangre');
        delete c.objetivo!.estados.hemorragia;
      } else {
        await c.mensaje('El objetivo no sangra…');
      }
    },
    mejora: {
      texto: 'Consume la Hemorragia del objetivo,\ninflige el doble de esa cantidad\ny cúrate esa cantidad.',
      jugar: async (c) => {
        const hem = c.objetivo!.estados.hemorragia ?? 0;
        if (hem > 0) {
          await c.danar(c.objetivo!, hem * 2, 'sangre');
          delete c.objetivo!.estados.hemorragia;
          await c.curar(hem);
        } else {
          await c.mensaje('El objetivo no sangra…');
        }
      },
    },
  },
  // — Carta única de clase (don del inicio del Acto III) —
  {
    id: 'furia-indomita',
    nombre: 'Furia Indómita',
    clase: 'barbaro',
    tipo: 'poder',
    rareza: 'especial',
    coste: 2,
    objetivo: 'ninguno',
    fx: 'furia',
    animRara: 'anim-berserker',
    texto: 'Poder: mientras estés en Furia, al inicio\nde tu turno ganas bloqueo igual a tu Fuerza.\nLa Furia no se rompe si bloqueaste daño\ny te queda menos de 10 de bloqueo.',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'furiaIndomita', 1);
    },
    mejora: {
      coste: 1,
      texto: 'Poder: mientras estés en Furia, al inicio\nde tu turno ganas bloqueo igual a tu Fuerza.\nLa Furia no se rompe si bloqueaste daño\ny te queda menos de 10 de bloqueo.',
      jugar: async (c) => {
        await c.aplicarEstado(c.jugador, 'furiaIndomita', 1);
      },
    },
  },
];

// ── Mago ─────────────────────────────────────────────────────────────────────

/**
 * Conjuro Prodigioso: carta generada (no aparece en recompensas). Las cartas
 * «Escribir X» suman daño a su base de 10 durante el combate y, algunas, le
 * añaden un efecto permanente. Su estado vive en el JugadorCombate, así que la
 * misma instancia refleja siempre el daño acumulado aunque se baraje.
 */
export const CONJURO_PRODIGIOSO: CartaDef = {
  id: 'conjuro-prodigioso',
  nombre: 'Conjuro Prodigioso',
  clase: 'mago',
  tipo: 'ataque',
  rareza: 'especial',
  coste: 2,
  objetivo: 'enemigo',
  fx: 'estrellas',
  retener: true,
  texto: 'Inflige 10 de daño. Retener.\nSu daño y sus efectos crecen\ncon las cartas «Escribir».',
  jugar: async (c) => {
    const dmg = 10 + (c.jugador.conjuroEscrito ?? 0);
    const ef = c.jugador.conjuroEfectos ?? [];
    const area = ef.includes('area');
    const perforante = ef.includes('perforante');
    const vulnera = ef.includes('vulnerable');
    if (ef.includes('bloqueo')) await c.ganarBloqueo(6);
    if (area) {
      if (perforante) for (const e of c.enemigos.filter((x) => x.vivo)) await c.danarPerforante(e, dmg, 'estrellas');
      else await c.atacarTodos(dmg, 'estrellas');
      if (vulnera) for (const e of c.enemigos.filter((x) => x.vivo)) await c.aplicarEstado(e, 'vulnerable', 2);
    } else {
      if (perforante) await c.danarPerforante(c.objetivo!, dmg, 'impacto');
      else await c.atacar(c.objetivo!, dmg, 1, 'estrellas');
      if (vulnera && c.objetivo!.vivo) await c.aplicarEstado(c.objetivo!, 'vulnerable', 2);
    }
  },
};

/**
 * Daga: carta generada por el pícaro (no aparece en recompensas ni en el
 * Compendio). Cuesta 0, se agota al jugarse y su daño crece con «Maestría con
 * Cuchillas» (dagasFuerza). Escala con la Fuerza como cualquier ataque.
 */
export const DAGA: CartaDef = {
  id: 'daga',
  nombre: 'Daga',
  clase: 'picaro',
  tipo: 'ataque',
  rareza: 'especial',
  coste: 0,
  objetivo: 'enemigo',
  fx: 'tajo',
  exhumar: true,
  texto: 'Inflige 4 de daño. Se agota.',
  jugar: async (c) => {
    const porDestreza = (c.jugador.estados.dagasDestreza ?? 0) > 0
      ? Math.max(0, c.jugador.estados.destreza ?? 0)
      : 0;
    const bonus = (c.jugador.estados.dagasFuerza ?? 0) + porDestreza;
    await c.atacar(c.objetivo!, 4 + bonus, 1, 'tajo');
  },
};

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
    texto: 'Gasta un conjuro: inflige 4 de daño\n(+4 por nivel) y aplica 1 Vulnerable por\nespacio de conjuro a TODOS los enemigos.',
    jugar: async (c) => {
      const nivel = await c.gastarConjuro(1);
      const vuln = c.jugador.conjuros.length;
      await c.atacarTodos(4 + 4 * nivel, 'furia');
      for (const e of c.enemigos.filter((x) => x.vivo)) await c.aplicarEstado(e, 'vulnerable', vuln);
    },
    mejora: {
      texto: 'Gasta un conjuro: inflige 6 de daño\n(+5 por nivel) y aplica 1 Vulnerable por\nespacio de conjuro a TODOS los enemigos.',
      jugar: async (c) => {
        const nivel = await c.gastarConjuro(1);
        const vuln = c.jugador.conjuros.length;
        await c.atacarTodos(6 + 5 * nivel, 'furia');
        for (const e of c.enemigos.filter((x) => x.vivo)) await c.aplicarEstado(e, 'vulnerable', vuln);
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
    texto: 'Inflige 2 de daño 3 veces.\nIgnora el bloqueo.',
    fx: 'estrellas',
    jugar: async (c) => {
      for (let i = 0; i < 3; i++) if (c.objetivo!.vivo) await c.danarPerforante(c.objetivo!, 2, 'estrellas');
    },
    mejora: {
      texto: 'Inflige 2 de daño 4 veces.\nIgnora el bloqueo.',
      jugar: async (c) => {
        for (let i = 0; i < 4; i++) if (c.objetivo!.vivo) await c.danarPerforante(c.objetivo!, 2, 'estrellas');
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
    texto: 'Inflige 9 de daño.\nDevuelve una carta del descarte\na lo alto de tu mazo.',
    fx: 'impacto',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 9, 1, 'impacto');
      await c.recuperarDelDescarte();
    },
    mejora: {
      texto: 'Inflige 12 de daño.\nDevuelve una carta del descarte\na lo alto de tu mazo.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 12, 1, 'impacto');
        await c.recuperarDelDescarte();
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
    texto: 'Gana 4 de bloqueo\n+2 por cada NIVEL de espacio disponible.',
    jugar: async (c) => {
      await c.ganarBloqueo(4 + 2 * nivelesLibres(c));
    },
    mejora: {
      texto: 'Gana 6 de bloqueo\n+3 por cada NIVEL de espacio disponible.',
      jugar: async (c) => {
        await c.ganarBloqueo(6 + 3 * nivelesLibres(c));
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
    texto: 'Gasta un conjuro: inflige 14 de daño\n(+6 por nivel del espacio).',
    jugar: async (c) => {
      const nivel = await c.gastarConjuro(1);
      await c.atacar(c.objetivo!, 14 + 6 * nivel, 1, 'impacto');
    },
    mejora: {
      texto: 'Gasta un conjuro: inflige 18 de daño\n(+8 por nivel del espacio).',
      jugar: async (c) => {
        const nivel = await c.gastarConjuro(1);
        await c.atacar(c.objetivo!, 18 + 8 * nivel, 1, 'impacto');
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
    texto: 'Gasta un conjuro de nivel 2+:\ninflige 8 de daño (+4 por nivel)\ny cura la mitad del daño.',
    jugar: async (c) => {
      const nivel = await c.gastarConjuro(2);
      const hecho = await c.atacar(c.objetivo!, 8 + 4 * nivel, 1, 'muerte');
      await c.curar(Math.ceil(hecho / 2));
    },
    mejora: {
      texto: 'Gasta un conjuro de nivel 2+:\ninflige 10 de daño (+5 por nivel)\ny cura la mitad del daño.',
      jugar: async (c) => {
        const nivel = await c.gastarConjuro(2);
        const hecho = await c.atacar(c.objetivo!, 10 + 5 * nivel, 1, 'muerte');
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
    texto: 'Recupera el espacio de conjuro gastado\nde MAYOR nivel.',
    jugar: async (c) => {
      const nivel = await c.recuperarConjuro(true);
      if (nivel === 0) await c.mensaje('No había conjuros gastados…');
    },
    mejora: {
      coste: 0,
      texto: 'Recupera el espacio de conjuro gastado\nde MAYOR nivel.',
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
    tipo: 'poder',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'ninguno',
    texto: 'Poder: roba 1 carta adicional al inicio\nde tus turnos. Se disipa si te quedas\nsin cartas en la mano.',
    fx: 'estrellas',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'roboAcelerado', 1);
    },
    mejora: {
      innato: true,
      texto: 'Innata: empiezas cada combate con ella.\nPoder: roba 1 carta adicional al inicio\nde tus turnos. Se disipa si te quedas\nsin cartas en la mano.',
      jugar: async (c) => {
        await c.aplicarEstado(c.jugador, 'roboAcelerado', 1);
      },
    },
  },
  // — Creación de conjuros: escriben en el Conjuro Prodigioso —
  {
    id: 'inscripcion-arcana',
    nombre: 'Inscripción Arcana',
    clase: 'mago',
    tipo: 'habilidad',
    rareza: 'comun',
    coste: 0,
    objetivo: 'ninguno',
    fx: 'estrellas',
    texto: 'Escribir 5 en el Conjuro Prodigioso.',
    jugar: async (c) => {
      await c.escribir(5);
    },
    mejora: {
      texto: 'Escribir 8 en el Conjuro Prodigioso.',
      jugar: async (c) => {
        await c.escribir(8);
      },
    },
  },
  {
    id: 'glifo-mordiente',
    nombre: 'Glifo Mordiente',
    clase: 'mago',
    tipo: 'ataque',
    rareza: 'comun',
    coste: 1,
    objetivo: 'enemigo',
    fx: 'impacto',
    texto: 'Inflige 5 de daño.\nEscribir 4 en el Conjuro Prodigioso.',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 5, 1, 'impacto');
      await c.escribir(4);
    },
    mejora: {
      texto: 'Inflige 7 de daño.\nEscribir 6 en el Conjuro Prodigioso.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 7, 1, 'impacto');
        await c.escribir(6);
      },
    },
  },
  {
    id: 'dictado-veloz',
    nombre: 'Dictado Veloz',
    clase: 'mago',
    tipo: 'ataque',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'enemigo',
    fx: 'estrellas',
    texto: 'Inflige 4 de daño dos veces.\nEscribir 3 por cada golpe.',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 4, 1, 'estrellas');
      await c.escribir(3);
      if (c.objetivo!.vivo) await c.atacar(c.objetivo!, 4, 1, 'estrellas');
      await c.escribir(3);
    },
    mejora: {
      texto: 'Inflige 5 de daño dos veces.\nEscribir 4 por cada golpe.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 5, 1, 'estrellas');
        await c.escribir(4);
        if (c.objetivo!.vivo) await c.atacar(c.objetivo!, 5, 1, 'estrellas');
        await c.escribir(4);
      },
    },
  },
  {
    id: 'runa-flamigera',
    nombre: 'Runa Flamígera',
    clase: 'mago',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'impacto',
    texto: 'Escribir 7.\nEl Conjuro Prodigioso pasa a golpear\na TODOS los enemigos.',
    jugar: async (c) => {
      await c.escribir(7, 'area');
    },
    mejora: {
      texto: 'Escribir 9.\nEl Conjuro Prodigioso pasa a golpear\na TODOS los enemigos.',
      jugar: async (c) => {
        await c.escribir(9, 'area');
      },
    },
  },
  {
    id: 'runa-de-ruina',
    nombre: 'Runa de Ruina',
    clase: 'mago',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'muerte',
    texto: 'Escribir 7.\nEl Conjuro Prodigioso pasa a aplicar\n2 de Vulnerable.',
    jugar: async (c) => {
      await c.escribir(7, 'vulnerable');
    },
    mejora: {
      texto: 'Escribir 9.\nEl Conjuro Prodigioso pasa a aplicar\n2 de Vulnerable.',
      jugar: async (c) => {
        await c.escribir(9, 'vulnerable');
      },
    },
  },
  {
    id: 'runa-egida',
    nombre: 'Runa Égida',
    clase: 'mago',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'bloqueo',
    texto: 'Escribir 6.\nAl lanzar el Conjuro Prodigioso\nganas 6 de bloqueo.',
    jugar: async (c) => {
      await c.escribir(6, 'bloqueo');
    },
    mejora: {
      texto: 'Escribir 8.\nAl lanzar el Conjuro Prodigioso\nganas 6 de bloqueo.',
      jugar: async (c) => {
        await c.escribir(8, 'bloqueo');
      },
    },
  },
  // — Cartas raras: una por escuela de magia —
  {
    id: 'escuela-evocacion',
    nombre: 'Desintegrar',
    clase: 'mago',
    tipo: 'ataque',
    rareza: 'rara',
    coste: 2,
    objetivo: 'enemigo',
    subclase: 'Evocación',
    requiereConjuro: 2,
    fx: 'impacto',
    animRara: 'anim-evocacion',
    texto: 'Gasta un conjuro de nivel 2+:\ninflige 20 de daño (+10 por nivel).\nIgnora y destruye el bloqueo.',
    jugar: async (c) => {
      const nivel = await c.gastarConjuro(2);
      await c.danarPerforante(c.objetivo!, 20 + 10 * nivel, 'impacto');
    },
    mejora: {
      texto: 'Gasta un conjuro de nivel 2+:\ninflige 28 de daño (+12 por nivel).\nIgnora y destruye el bloqueo.',
      jugar: async (c) => {
        const nivel = await c.gastarConjuro(2);
        await c.danarPerforante(c.objetivo!, 28 + 12 * nivel, 'impacto');
      },
    },
  },
  {
    id: 'escuela-abjuracion',
    nombre: 'Clarividencia',
    clase: 'mago',
    tipo: 'poder',
    rareza: 'rara',
    coste: 1,
    objetivo: 'ninguno',
    subclase: 'Adivinación',
    fx: 'estrellas',
    animRara: 'anim-abjuracion',
    texto: 'Poder: ganas 1 de energía\nal inicio de cada turno.',
    jugar: async (c) => {
      c.jugador.energiaMax += 1;
      c.ganarEnergia(1);
    },
    mejora: {
      innato: true,
      texto: 'Innata: empiezas cada combate con ella.\nPoder: ganas 1 de energía\nal inicio de cada turno.',
      jugar: async (c) => {
        c.jugador.energiaMax += 1;
        c.ganarEnergia(1);
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
    texto: 'Gasta un conjuro. Copias ilusorias 1 turno:\n60 % de esquivar +20 % por nivel del\nespacio (un golpe recibido las disipa).',
    jugar: async (c) => {
      const nivel = await c.gastarConjuro(1);
      await c.aplicarEstado(c.jugador, 'espejismo', 3 + nivel); // 60 % base + 20 % por nivel
    },
    mejora: {
      coste: 0,
      texto: 'Gasta un conjuro. Copias ilusorias 1 turno:\n60 % de esquivar +20 % por nivel del\nespacio (un golpe recibido las disipa).',
    },
  },
  // — Raras de Creación de conjuros —
  {
    id: 'tratado-prohibido',
    nombre: 'Tratado Prohibido',
    clase: 'mago',
    tipo: 'poder',
    rareza: 'rara',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'estrellas',
    animRara: 'anim-evocacion',
    texto: 'Poder: al inicio de cada turno,\nEscribir 4 en el Conjuro Prodigioso.',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'escribania', 4);
    },
    mejora: {
      texto: 'Poder: al inicio de cada turno,\nEscribir 5 en el Conjuro Prodigioso.',
      jugar: async (c) => {
        await c.aplicarEstado(c.jugador, 'escribania', 5);
      },
    },
  },
  {
    id: 'palabra-de-poder',
    nombre: 'Palabra de Poder',
    clase: 'mago',
    tipo: 'habilidad',
    rareza: 'rara',
    coste: 2,
    objetivo: 'ninguno',
    fx: 'impacto',
    animRara: 'anim-evocacion',
    texto: 'Escribir 16.\nEl Conjuro Prodigioso pasa a ignorar\ny destruir el bloqueo.',
    jugar: async (c) => {
      await c.escribir(16, 'perforante');
    },
    mejora: {
      texto: 'Escribir 20.\nEl Conjuro Prodigioso pasa a ignorar\ny destruir el bloqueo.',
      jugar: async (c) => {
        await c.escribir(20, 'perforante');
      },
    },
  },
  // — Carta única de clase (don del inicio del Acto III) —
  {
    id: 'maestria-conjuros',
    nombre: 'Maestría de Conjuros',
    clase: 'mago',
    tipo: 'poder',
    rareza: 'especial',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'estrellas',
    animRara: 'anim-evocacion',
    texto: 'Poder: al inicio de cada turno\nañades un Proyectil Mágico a tu mano.',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'maestria', 1);
    },
    mejora: {
      innato: true,
      texto: 'Innata: empiezas cada combate con ella.\nPoder: al inicio de cada turno añades\nun Proyectil Mágico+ a tu mano.',
      jugar: async (c) => {
        // valor 2 = añade la versión mejorada del Proyectil Mágico
        await c.aplicarEstado(c.jugador, 'maestria', 2);
      },
    },
  },
];

// ── Pícaro ───────────────────────────────────────────────────────────────────
// Mecánicas: Acrobacias (el bloqueo persiste), Destreza y ataques que escalan
// con ella, robo/descarte con sinergias, ataques furtivos y Dagas. Subclases
// raras: Asesino (Veneno), Psiónico (Dagas) y Embaucador Arcano (ilusiones).

export const PICARO: CartaDef[] = [
  {
    id: 'filo-rapido',
    nombre: 'Filo Rápido',
    clase: 'picaro',
    tipo: 'ataque',
    rareza: 'inicial',
    coste: 1,
    objetivo: 'enemigo',
    fx: 'tajo',
    texto: 'Inflige 6 de daño.\nRoba 1 carta.',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 6);
      await c.robar(1);
    },
    mejora: {
      texto: 'Inflige 8 de daño.\nRoba 1 carta.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 8);
        await c.robar(1);
      },
    },
  },
  // — Comunes —
  {
    id: 'pirueta',
    nombre: 'Pirueta',
    clase: 'picaro',
    tipo: 'habilidad',
    rareza: 'comun',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'bloqueo',
    texto: 'Acrobacias: gana 5 de bloqueo\ny vuelve a ganarlo el próximo turno.',
    jugar: async (c) => {
      await c.ganarBloqueoAcrobatico(5);
    },
    mejora: {
      texto: 'Acrobacias: gana 8 de bloqueo\ny vuelve a ganarlo el próximo turno.',
      jugar: async (c) => {
        await c.ganarBloqueoAcrobatico(8);
      },
    },
  },
  {
    id: 'daga-veloz',
    nombre: 'Daga Veloz',
    clase: 'picaro',
    tipo: 'ataque',
    rareza: 'comun',
    coste: 0,
    objetivo: 'enemigo',
    fx: 'tajo',
    texto: 'Inflige 4 de daño.',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 4);
    },
    mejora: {
      texto: 'Inflige 6 de daño.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 6);
      },
    },
  },
  {
    id: 'lanzamiento-daga',
    nombre: 'Lanzamiento de Daga',
    clase: 'picaro',
    tipo: 'ataque',
    rareza: 'comun',
    coste: 1,
    objetivo: 'enemigo',
    fx: 'tajo',
    texto: 'Inflige 9 de daño.\nRoba 1 carta, luego descarta 1 carta.',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 9);
      await c.robar(1);
      await c.descartar(1);
    },
    mejora: {
      texto: 'Inflige 12 de daño.\nRoba 1 carta, luego descarta 1 carta.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 12);
        await c.robar(1);
        await c.descartar(1);
      },
    },
  },
  {
    id: 'finta',
    nombre: 'Finta',
    clase: 'picaro',
    tipo: 'habilidad',
    rareza: 'comun',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'bloqueo',
    texto: 'Gana 5 de bloqueo.\nSi no tenías bloqueo, gánalo de nuevo.',
    jugar: async (c) => {
      const sinBloqueo = c.jugador.bloqueo === 0;
      await c.ganarBloqueo(5);
      if (sinBloqueo) await c.ganarBloqueo(5);
    },
    mejora: {
      texto: 'Gana 7 de bloqueo.\nSi no tenías bloqueo, gánalo de nuevo.',
      jugar: async (c) => {
        const sinBloqueo = c.jugador.bloqueo === 0;
        await c.ganarBloqueo(7);
        if (sinBloqueo) await c.ganarBloqueo(7);
      },
    },
  },
  {
    id: 'golpe-bajo',
    nombre: 'Golpe Bajo',
    clase: 'picaro',
    tipo: 'ataque',
    rareza: 'comun',
    coste: 1,
    objetivo: 'enemigo',
    fx: 'tajo',
    texto: 'Inflige 7 de daño.\nAplica 1 de Débil.',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 7);
      if (c.objetivo!.vivo) await c.aplicarEstado(c.objetivo!, 'debil', 1);
    },
    mejora: {
      texto: 'Inflige 9 de daño.\nAplica 2 de Débil.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 9);
        if (c.objetivo!.vivo) await c.aplicarEstado(c.objetivo!, 'debil', 2);
      },
    },
  },
  {
    id: 'rodar',
    nombre: 'Rodar',
    clase: 'picaro',
    tipo: 'habilidad',
    rareza: 'comun',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'bloqueo',
    texto: 'Gana 4 de bloqueo dos veces.',
    jugar: async (c) => {
      await c.ganarBloqueo(4);
      await c.ganarBloqueo(4);
    },
    mejora: {
      texto: 'Gana 5 de bloqueo dos veces.',
      jugar: async (c) => {
        await c.ganarBloqueo(5);
        await c.ganarBloqueo(5);
      },
    },
  },
  {
    id: 'distraccion',
    nombre: 'Distracción',
    clase: 'picaro',
    tipo: 'habilidad',
    rareza: 'comun',
    coste: 0,
    objetivo: 'ninguno',
    fx: 'estrellas',
    texto: 'Roba 2 cartas.\nDescarta 1 carta.',
    jugar: async (c) => {
      await c.robar(2);
      await c.descartar(1);
    },
    mejora: {
      texto: 'Roba 3 cartas.\nDescarta 1 carta.',
      jugar: async (c) => {
        await c.robar(3);
        await c.descartar(1);
      },
    },
  },
  {
    id: 'punalada-trapera',
    nombre: 'Puñalada Trapera',
    clase: 'picaro',
    tipo: 'ataque',
    rareza: 'comun',
    coste: 1,
    objetivo: 'enemigo',
    fx: 'tajo',
    texto: 'Inflige 6 de daño.\nInflige 4 más si el enemigo\nno pretende atacar.',
    jugar: async (c) => {
      const extra = c.noPretendeAtacar(c.objetivo!) ? 4 : 0;
      await c.atacar(c.objetivo!, 6 + extra);
    },
    mejora: {
      texto: 'Inflige 8 de daño.\nInflige 6 más si el enemigo\nno pretende atacar.',
      jugar: async (c) => {
        const extra = c.noPretendeAtacar(c.objetivo!) ? 6 : 0;
        await c.atacar(c.objetivo!, 8 + extra);
      },
    },
  },
  // — Infrecuentes —
  {
    id: 'ataque-sutil',
    nombre: 'Ataque Sutil',
    clase: 'picaro',
    tipo: 'ataque',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'enemigo',
    fx: 'tajo',
    texto: 'Inflige 4 de daño.\nInflige 1 más por cada\npunto de Destreza.',
    jugar: async (c) => {
      const dex = Math.max(0, c.jugador.estados.destreza ?? 0);
      await c.atacar(c.objetivo!, 4 + dex);
    },
    mejora: {
      texto: 'Inflige 6 de daño.\nInflige 1 más por cada\npunto de Destreza.',
      jugar: async (c) => {
        const dex = Math.max(0, c.jugador.estados.destreza ?? 0);
        await c.atacar(c.objetivo!, 6 + dex);
      },
    },
  },
  {
    id: 'trabajo-de-pies',
    nombre: 'Trabajo de Pies',
    clase: 'picaro',
    tipo: 'poder',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'estrellas',
    texto: 'Poder: gana 2 de Destreza.',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'destreza', 2);
    },
    mejora: {
      texto: 'Poder: gana 3 de Destreza.',
      jugar: async (c) => {
        await c.aplicarEstado(c.jugador, 'destreza', 3);
      },
    },
  },
  {
    id: 'esfumarse',
    nombre: 'Esfumarse',
    clase: 'picaro',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'luna',
    texto: 'Acrobacias: gana 8 de bloqueo\ny vuelve a ganarlo el próximo turno.',
    jugar: async (c) => {
      await c.ganarBloqueoAcrobatico(8);
    },
    mejora: {
      texto: 'Acrobacias: gana 11 de bloqueo\ny vuelve a ganarlo el próximo turno.',
      jugar: async (c) => {
        await c.ganarBloqueoAcrobatico(11);
      },
    },
  },
  {
    id: 'mano-rapida',
    nombre: 'Mano Rápida',
    clase: 'picaro',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 0,
    objetivo: 'ninguno',
    fx: 'estrellas',
    texto: 'Descarta hasta 2 cartas.\nRoba esa cantidad +1.',
    jugar: async (c) => {
      const d = await c.descartar(2);
      await c.robar(d + 1);
    },
    mejora: {
      texto: 'Descarta hasta 3 cartas.\nRoba esa cantidad +1.',
      jugar: async (c) => {
        const d = await c.descartar(3);
        await c.robar(d + 1);
      },
    },
  },
  {
    id: 'cuchilladas',
    nombre: 'Cuchilladas',
    clase: 'picaro',
    tipo: 'ataque',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'enemigo',
    fx: 'tajo',
    texto: 'Inflige 3 de daño tres veces.',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 3, 3, 'tajo');
    },
    mejora: {
      texto: 'Inflige 4 de daño tres veces.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 4, 3, 'tajo');
      },
    },
  },
  {
    id: 'preparacion',
    nombre: 'Preparación',
    clase: 'picaro',
    tipo: 'poder',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'bloqueo',
    texto: 'Poder: cada vez que descartes\nuna carta, gana 3 de bloqueo.',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'preparacion', 3);
    },
    mejora: {
      texto: 'Poder: cada vez que descartes\nuna carta, gana 4 de bloqueo.',
      jugar: async (c) => {
        await c.aplicarEstado(c.jugador, 'preparacion', 4);
      },
    },
  },
  {
    id: 'cambiazo',
    nombre: 'Cambiazo',
    clase: 'picaro',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 0,
    objetivo: 'enemigo',
    fx: 'luna',
    texto: 'El enemigo cambia su intención por otra\nsuya que no sea de ataque (la actual la\nhará después). Si solo sabe atacar, se\nqueda desconcertado y no actúa.',
    jugar: async (c) => {
      await c.intercambiarIntencion(c.objetivo!);
    },
    mejora: {
      texto: 'El enemigo cambia su intención por otra\nsuya que no sea de ataque (la actual la\nhará después). Si solo sabe atacar, se\nqueda desconcertado y no actúa.\nRoba 1 carta.',
      jugar: async (c) => {
        await c.intercambiarIntencion(c.objetivo!);
        await c.robar(1);
      },
    },
  },
  {
    id: 'emboscada',
    nombre: 'Emboscada',
    clase: 'picaro',
    tipo: 'ataque',
    rareza: 'infrecuente',
    coste: 2,
    objetivo: 'enemigo',
    fx: 'impacto',
    texto: 'Inflige 10 de daño.\nInflige 14 más si el enemigo\nno pretende atacar.',
    jugar: async (c) => {
      const extra = c.noPretendeAtacar(c.objetivo!) ? 14 : 0;
      await c.atacar(c.objetivo!, 10 + extra, 1, 'impacto');
    },
    mejora: {
      texto: 'Inflige 14 de daño.\nInflige 18 más si el enemigo\nno pretende atacar.',
      jugar: async (c) => {
        const extra = c.noPretendeAtacar(c.objetivo!) ? 18 : 0;
        await c.atacar(c.objetivo!, 14 + extra, 1, 'impacto');
      },
    },
  },
  {
    id: 'filo-toxico',
    nombre: 'Filo Tóxico',
    clase: 'picaro',
    tipo: 'ataque',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'enemigo',
    fx: 'veneno',
    texto: 'Inflige 5 de daño.\nAplica 4 de Veneno.',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 5, 1, 'veneno');
      if (c.objetivo!.vivo) await c.aplicarEstado(c.objetivo!, 'veneno', 4);
    },
    mejora: {
      texto: 'Inflige 6 de daño.\nAplica 6 de Veneno.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 6, 1, 'veneno');
        if (c.objetivo!.vivo) await c.aplicarEstado(c.objetivo!, 'veneno', 6);
      },
    },
  },
  {
    id: 'giro-veloz',
    nombre: 'Giro Veloz',
    clase: 'picaro',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'bloqueo',
    texto: 'Gana 4 de bloqueo dos veces.\nRoba 1 carta.',
    jugar: async (c) => {
      await c.ganarBloqueo(4);
      await c.ganarBloqueo(4);
      await c.robar(1);
    },
    mejora: {
      texto: 'Gana 5 de bloqueo dos veces.\nRoba 1 carta.',
      jugar: async (c) => {
        await c.ganarBloqueo(5);
        await c.ganarBloqueo(5);
        await c.robar(1);
      },
    },
  },
  {
    id: 'atraco',
    nombre: 'Atraco',
    clase: 'picaro',
    tipo: 'ataque',
    rareza: 'infrecuente',
    coste: 2,
    objetivo: 'enemigo',
    fx: 'tajo',
    texto: 'Inflige 7 de daño.\nRoba 2 cartas.',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 7);
      await c.robar(2);
    },
    mejora: {
      texto: 'Inflige 10 de daño.\nRoba 2 cartas.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 10);
        await c.robar(2);
      },
    },
  },
  {
    id: 'lluvia-de-dagas',
    nombre: 'Lluvia de Dagas',
    clase: 'picaro',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'tajo',
    texto: 'Añade 3 Dagas a tu mano.',
    jugar: async (c) => {
      await c.crearDagas(3);
    },
    mejora: {
      texto: 'Añade 4 Dagas a tu mano.',
      jugar: async (c) => {
        await c.crearDagas(4);
      },
    },
  },
  {
    id: 'guardia-de-cuchillas',
    nombre: 'Guardia de Cuchillas',
    clase: 'picaro',
    tipo: 'poder',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'bloqueo',
    texto: 'Poder: cada vez que juegues\nuna Daga, gana 3 de bloqueo.',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'dagasBloqueo', 3);
    },
    mejora: {
      texto: 'Poder: cada vez que juegues\nuna Daga, gana 4 de bloqueo.',
      jugar: async (c) => {
        await c.aplicarEstado(c.jugador, 'dagasBloqueo', 4);
      },
    },
  },
  {
    id: 'golpe-septico',
    nombre: 'Golpe Séptico',
    clase: 'picaro',
    tipo: 'ataque',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'enemigo',
    fx: 'veneno',
    texto: 'Inflige 5 de daño.\nInflige 1 más por cada punto\nde Veneno del enemigo.',
    jugar: async (c) => {
      const ven = c.objetivo!.estados.veneno ?? 0;
      await c.atacar(c.objetivo!, 5 + ven, 1, 'veneno');
    },
    mejora: {
      texto: 'Inflige 7 de daño.\nInflige 1 más por cada punto\nde Veneno del enemigo.',
      jugar: async (c) => {
        const ven = c.objetivo!.estados.veneno ?? 0;
        await c.atacar(c.objetivo!, 7 + ven, 1, 'veneno');
      },
    },
  },
  {
    id: 'toxina-paralizante',
    nombre: 'Toxina Paralizante',
    clase: 'picaro',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'enemigo',
    fx: 'veneno',
    texto: 'Aplica 5 de Veneno.\nAplica el doble si el enemigo\nno pretende atacar.',
    jugar: async (c) => {
      const n = c.noPretendeAtacar(c.objetivo!) ? 10 : 5;
      await c.aplicarEstado(c.objetivo!, 'veneno', n);
    },
    mejora: {
      texto: 'Aplica 7 de Veneno.\nAplica el doble si el enemigo\nno pretende atacar.',
      jugar: async (c) => {
        const n = c.noPretendeAtacar(c.objetivo!) ? 14 : 7;
        await c.aplicarEstado(c.objetivo!, 'veneno', n);
      },
    },
  },
  // — Raras: subclases del pícaro y remates —
  {
    id: 'asesino',
    nombre: 'Golpe del Asesino',
    clase: 'picaro',
    tipo: 'poder',
    rareza: 'rara',
    coste: 1,
    objetivo: 'ninguno',
    subclase: 'Asesino',
    fx: 'veneno',
    animRara: 'anim-veneno',
    texto: 'Poder: tus ataques aplican\n1 de Veneno al objetivo.',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'filoVenenoso', 1);
    },
    mejora: {
      coste: 0,
      texto: 'Poder: tus ataques aplican\n1 de Veneno al objetivo.',
      jugar: async (c) => {
        await c.aplicarEstado(c.jugador, 'filoVenenoso', 1);
      },
    },
  },
  {
    id: 'psionico',
    nombre: 'Alma de Cuchillas',
    clase: 'picaro',
    tipo: 'poder',
    rareza: 'rara',
    coste: 1,
    objetivo: 'ninguno',
    subclase: 'Psiónico',
    fx: 'estrellas',
    animRara: 'anim-psionico',
    texto: 'Poder: al inicio de cada turno\nañades 1 Daga a tu mano.',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'dagasPorTurno', 1);
    },
    mejora: {
      coste: 0,
      texto: 'Poder: al inicio de cada turno\nañades 1 Daga a tu mano.',
      jugar: async (c) => {
        await c.aplicarEstado(c.jugador, 'dagasPorTurno', 1);
      },
    },
  },
  {
    id: 'embaucador-arcano',
    nombre: 'Mano Fantasmal',
    clase: 'picaro',
    tipo: 'habilidad',
    rareza: 'rara',
    coste: 1,
    objetivo: 'ninguno',
    subclase: 'Embaucador Arcano',
    fx: 'luna',
    animRara: 'anim-ilusion',
    texto: 'Copias ilusorias 1 turno (60 % de esquiva).\nRoba 2 cartas.',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'espejismo', 3);
      await c.robar(2);
    },
    mejora: {
      coste: 0,
      texto: 'Copias ilusorias 1 turno (60 % de esquiva).\nRoba 2 cartas.',
      jugar: async (c) => {
        await c.aplicarEstado(c.jugador, 'espejismo', 3);
        await c.robar(2);
      },
    },
  },
  {
    id: 'maestria-cuchillas',
    nombre: 'Maestría con Cuchillas',
    clase: 'picaro',
    tipo: 'poder',
    rareza: 'rara',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'tajo',
    animRara: 'anim-psionico',
    texto: 'Poder: tus Dagas infligen\n3 de daño adicional.',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'dagasFuerza', 3);
    },
    mejora: {
      texto: 'Poder: tus Dagas infligen\n4 de daño adicional.',
      jugar: async (c) => {
        await c.aplicarEstado(c.jugador, 'dagasFuerza', 4);
      },
    },
  },
  {
    id: 'nube-nauseabunda',
    nombre: 'Nube Nauseabunda',
    clase: 'picaro',
    tipo: 'habilidad',
    rareza: 'rara',
    coste: 2,
    objetivo: 'todos',
    fx: 'veneno',
    animRara: 'anim-veneno',
    texto: 'Aplica 4 de Veneno a TODOS los enemigos\ny activa al instante el Veneno de todos.',
    jugar: async (c) => {
      for (const e of c.enemigos.filter((x) => x.vivo)) {
        await c.aplicarEstado(e, 'veneno', 4);
      }
      await c.detonarVenenos();
    },
    mejora: {
      texto: 'Aplica 6 de Veneno a TODOS los enemigos\ny activa al instante el Veneno de todos.',
      jugar: async (c) => {
        for (const e of c.enemigos.filter((x) => x.vivo)) {
          await c.aplicarEstado(e, 'veneno', 6);
        }
        await c.detonarVenenos();
      },
    },
  },
  {
    id: 'oportunista',
    nombre: 'Oportunista',
    clase: 'picaro',
    tipo: 'poder',
    rareza: 'rara',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'luna',
    animRara: 'anim-ilusion',
    texto: 'Poder: tus ataques infligen 3 de daño\nadicional por golpe a los enemigos\nque no pretenden atacar.',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'ventajaFurtiva', 3);
    },
    mejora: {
      texto: 'Poder: tus ataques infligen 5 de daño\nadicional por golpe a los enemigos\nque no pretenden atacar.',
      jugar: async (c) => {
        await c.aplicarEstado(c.jugador, 'ventajaFurtiva', 5);
      },
    },
  },
  {
    id: 'tempestad-acero',
    nombre: 'Tempestad de Acero',
    clase: 'picaro',
    tipo: 'ataque',
    rareza: 'rara',
    coste: 2,
    objetivo: 'enemigo',
    fx: 'impacto',
    animRara: 'anim-psionico',
    texto: 'Inflige 6 de daño.\nInflige 3 más por cada carta que\nhayas descartado este turno.',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 6 + 3 * c.descartadasEsteTurno(), 1, 'impacto');
    },
    mejora: {
      texto: 'Inflige 8 de daño.\nInflige 4 más por cada carta que\nhayas descartado este turno.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 8 + 4 * c.descartadasEsteTurno(), 1, 'impacto');
      },
    },
  },
  // — Carta única de clase (don del inicio del Acto III) —
  {
    id: 'danza-mortal',
    nombre: 'Danza Mortal',
    clase: 'picaro',
    tipo: 'poder',
    rareza: 'especial',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'tajo',
    animRara: 'anim-psionico',
    texto: 'Poder: tus Dagas infligen daño\nadicional igual a tu Destreza.',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'dagasDestreza', 1);
    },
    mejora: {
      coste: 0,
      texto: 'Poder: tus Dagas infligen daño\nadicional igual a tu Destreza.',
      jugar: async (c) => {
        await c.aplicarEstado(c.jugador, 'dagasDestreza', 1);
      },
    },
  },
];

// ── Brujo ────────────────────────────────────────────────────────────────────
// Mecánicas: la Explosión Sobrenatural (vuelve a lo alto del mazo y se mejora
// con poderes permanentes y con cartas del turno), Condena (mata al enemigo al
// final de su turno cuando iguala sus PV actuales), invocaciones efímeras que
// solo aguantan una ronda, Oscuridad (baja el ataque de todos) y bloqueo que
// muerde con la Armadura de Agathys. Subclases raras: Archifata, Celestial,
// Infernal y Gran Antiguo.

/** Daño real de la Explosión Sobrenatural con todas sus mejoras acumuladas. */
function danoExplosion(c: ContextoEfecto, base: number): number {
  return base
    + (c.jugador.estados.explosionFuerza ?? 0)
    + (c.jugador.estados.explosionTurno ?? 0);
}

/** Lanza la Explosión: 1 golpe (+ los que sumen los poderes), a uno o a todos. */
async function lanzarExplosion(c: ContextoEfecto, base: number) {
  const dmg = danoExplosion(c, base);
  const golpes = 1 + (c.jugador.estados.explosionVeces ?? 0);
  const area = (c.jugador.estados.explosionArea ?? 0) > 0;
  for (let i = 0; i < golpes; i++) {
    if (area) await c.atacarTodos(dmg, 'abisal');
    else {
      const obj = c.objetivo!.vivo ? c.objetivo! : c.enemigos.find((e) => e.vivo);
      if (!obj) break;
      await c.atacar(obj, dmg, 1, 'abisal');
    }
  }
}

export const BRUJO: CartaDef[] = [
  // — Iniciales —
  {
    id: 'explosion-sobrenatural',
    nombre: 'Explosión Sobrenatural',
    clase: 'brujo',
    tipo: 'ataque',
    rareza: 'inicial',
    coste: 1,
    objetivo: 'enemigo',
    fx: 'abisal',
    alTopeDelMazo: true,
    texto: 'Inflige 6 de daño.\nAl jugarla vuelve a lo alto de tu mazo.',
    jugar: async (c) => {
      await lanzarExplosion(c, 6);
    },
    mejora: {
      texto: 'Inflige 9 de daño.\nAl jugarla vuelve a lo alto de tu mazo.',
      jugar: async (c) => {
        await lanzarExplosion(c, 9);
      },
    },
  },
  {
    id: 'armadura-agathys',
    nombre: 'Armadura de Agathys',
    clase: 'brujo',
    tipo: 'habilidad',
    rareza: 'inicial',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'bloqueo',
    texto: 'Gana 8 de bloqueo.\nEste turno, el daño que bloquees\nse devuelve a TODOS los enemigos.',
    jugar: async (c) => {
      await c.ganarBloqueo(8);
      await c.aplicarEstado(c.jugador, 'agathys', 1);
    },
    mejora: {
      texto: 'Gana 11 de bloqueo.\nEste turno, el daño que bloquees\nse devuelve a TODOS los enemigos.',
      jugar: async (c) => {
        await c.ganarBloqueo(11);
        await c.aplicarEstado(c.jugador, 'agathys', 1);
      },
    },
  },
  // — Comunes —
  {
    id: 'sacudida-abisal',
    nombre: 'Sacudida Abisal',
    clase: 'brujo',
    tipo: 'ataque',
    rareza: 'comun',
    coste: 1,
    objetivo: 'enemigo',
    fx: 'abisal',
    texto: 'Inflige 9 de daño.',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 9, 1, 'abisal');
    },
    mejora: {
      texto: 'Inflige 12 de daño.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 12, 1, 'abisal');
      },
    },
  },
  {
    id: 'manto-sombras',
    nombre: 'Manto de Sombras',
    clase: 'brujo',
    tipo: 'habilidad',
    rareza: 'comun',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'bloqueo',
    texto: 'Gana 7 de bloqueo.',
    jugar: async (c) => {
      await c.ganarBloqueo(7);
    },
    mejora: {
      texto: 'Gana 10 de bloqueo.',
      jugar: async (c) => {
        await c.ganarBloqueo(10);
      },
    },
  },
  {
    id: 'marca-condena',
    nombre: 'Marca de Condena',
    clase: 'brujo',
    tipo: 'habilidad',
    rareza: 'comun',
    coste: 1,
    objetivo: 'enemigo',
    fx: 'condena',
    texto: 'Aplica 8 de Condena.',
    jugar: async (c) => {
      await c.aplicarEstado(c.objetivo!, 'condena', 8);
    },
    mejora: {
      texto: 'Aplica 11 de Condena.',
      jugar: async (c) => {
        await c.aplicarEstado(c.objetivo!, 'condena', 11);
      },
    },
  },
  {
    id: 'susurro-maldito',
    nombre: 'Susurro Maldito',
    clase: 'brujo',
    tipo: 'ataque',
    rareza: 'comun',
    coste: 1,
    objetivo: 'enemigo',
    fx: 'condena',
    texto: 'Inflige 6 de daño.\nAplica 4 de Condena.',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 6, 1, 'condena');
      if (c.objetivo!.vivo) await c.aplicarEstado(c.objetivo!, 'condena', 4);
    },
    mejora: {
      texto: 'Inflige 8 de daño.\nAplica 6 de Condena.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 8, 1, 'condena');
        if (c.objetivo!.vivo) await c.aplicarEstado(c.objetivo!, 'condena', 6);
      },
    },
  },
  {
    id: 'sabueso-sombra',
    nombre: 'Sabueso de Sombra',
    clase: 'brujo',
    tipo: 'habilidad',
    rareza: 'comun',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'oscuridad',
    texto: 'Invoca un Sabueso: 7 de vida y 5 de daño.\nSolo dura este turno.',
    jugar: async (c) => {
      await c.invocarEfimero('sabueso', 7, 5);
    },
    mejora: {
      texto: 'Invoca un Sabueso: 9 de vida y 7 de daño.\nSolo dura este turno.',
      jugar: async (c) => {
        await c.invocarEfimero('sabueso', 9, 7);
      },
    },
  },
  {
    id: 'oscuridad',
    nombre: 'Oscuridad',
    clase: 'brujo',
    tipo: 'habilidad',
    rareza: 'comun',
    coste: 1,
    objetivo: 'todos',
    fx: 'oscuridad',
    texto: 'Aplica 2 de Oscuridad a todos\nlos enemigos (baja su ataque).',
    jugar: async (c) => {
      for (const e of c.enemigos.filter((x) => x.vivo)) {
        await c.aplicarEstado(e, 'oscuridad', 2);
      }
    },
    mejora: {
      texto: 'Aplica 3 de Oscuridad a todos\nlos enemigos (baja su ataque).',
      jugar: async (c) => {
        for (const e of c.enemigos.filter((x) => x.vivo)) {
          await c.aplicarEstado(e, 'oscuridad', 3);
        }
      },
    },
  },
  {
    id: 'canalizar-pacto',
    nombre: 'Canalizar el Pacto',
    clase: 'brujo',
    tipo: 'habilidad',
    rareza: 'comun',
    coste: 0,
    objetivo: 'ninguno',
    fx: 'abisal',
    texto: 'Este turno tu Explosión Sobrenatural\ninflige 5 más. Roba 1 carta.',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'explosionTurno', 5);
      await c.robar(1);
    },
    mejora: {
      texto: 'Este turno tu Explosión Sobrenatural\ninflige 7 más. Roba 1 carta.',
      jugar: async (c) => {
        await c.aplicarEstado(c.jugador, 'explosionTurno', 7);
        await c.robar(1);
      },
    },
  },
  {
    id: 'diezmo-sangre',
    nombre: 'Diezmo de Sangre',
    clase: 'brujo',
    tipo: 'ataque',
    rareza: 'comun',
    coste: 1,
    objetivo: 'enemigo',
    fx: 'sangre',
    texto: 'Inflige 7 de daño.\nInflige 4 más si el enemigo\nya tiene Condena.',
    jugar: async (c) => {
      const extra = (c.objetivo!.estados.condena ?? 0) > 0 ? 4 : 0;
      await c.atacar(c.objetivo!, 7 + extra, 1, 'sangre');
    },
    mejora: {
      texto: 'Inflige 9 de daño.\nInflige 6 más si el enemigo\nya tiene Condena.',
      jugar: async (c) => {
        const extra = (c.objetivo!.estados.condena ?? 0) > 0 ? 6 : 0;
        await c.atacar(c.objetivo!, 9 + extra, 1, 'sangre');
      },
    },
  },
  // — Infrecuentes —
  {
    id: 'brazos-hadar',
    nombre: 'Brazos de Hadar',
    clase: 'brujo',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'todos',
    fx: 'condena',
    texto: 'Aplica 6 de Condena y 1 de Débil\na TODOS los enemigos.',
    jugar: async (c) => {
      for (const e of c.enemigos.filter((x) => x.vivo)) {
        await c.aplicarEstado(e, 'condena', 6);
        await c.aplicarEstado(e, 'debil', 1);
      }
    },
    mejora: {
      texto: 'Aplica 8 de Condena y 2 de Débil\na TODOS los enemigos.',
      jugar: async (c) => {
        for (const e of c.enemigos.filter((x) => x.vivo)) {
          await c.aplicarEstado(e, 'condena', 8);
          await c.aplicarEstado(e, 'debil', 2);
        }
      },
    },
  },
  {
    id: 'invocacion-sobrenatural',
    nombre: 'Invocación Sobrenatural',
    clase: 'brujo',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 2,
    objetivo: 'ninguno',
    fx: 'abisal',
    texto: 'Invoca un Demonio: 12 de vida y 9 de daño,\ny su golpe aplica 6 de Condena.\nSolo dura este turno.',
    jugar: async (c) => {
      await c.invocarEfimero('demonio', 12, 9, 6);
    },
    mejora: {
      texto: 'Invoca un Demonio: 15 de vida y 11 de daño,\ny su golpe aplica 8 de Condena.\nSolo dura este turno.',
      jugar: async (c) => {
        await c.invocarEfimero('demonio', 15, 11, 8);
      },
    },
  },
  {
    id: 'blindaje-infernal',
    nombre: 'Blindaje Infernal',
    clase: 'brujo',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 2,
    objetivo: 'ninguno',
    fx: 'bloqueo',
    texto: 'Gana 14 de bloqueo.\nEste turno, el daño que bloquees\nse devuelve a TODOS los enemigos.',
    jugar: async (c) => {
      await c.ganarBloqueo(14);
      await c.aplicarEstado(c.jugador, 'agathys', 1);
    },
    mejora: {
      texto: 'Gana 18 de bloqueo.\nEste turno, el daño que bloquees\nse devuelve a TODOS los enemigos.',
      jugar: async (c) => {
        await c.ganarBloqueo(18);
        await c.aplicarEstado(c.jugador, 'agathys', 1);
      },
    },
  },
  {
    id: 'cosecha-almas',
    nombre: 'Cosecha de Almas',
    clase: 'brujo',
    tipo: 'ataque',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'todos',
    fx: 'muerte',
    texto: 'Inflige 5 de daño a TODOS los enemigos\ny aplica 3 de Condena a todos.',
    jugar: async (c) => {
      await c.atacarTodos(5, 'muerte');
      for (const e of c.enemigos.filter((x) => x.vivo)) {
        await c.aplicarEstado(e, 'condena', 3);
      }
    },
    mejora: {
      texto: 'Inflige 7 de daño a TODOS los enemigos\ny aplica 4 de Condena a todos.',
      jugar: async (c) => {
        await c.atacarTodos(7, 'muerte');
        for (const e of c.enemigos.filter((x) => x.vivo)) {
          await c.aplicarEstado(e, 'condena', 4);
        }
      },
    },
  },
  {
    id: 'palabra-ruina',
    nombre: 'Palabra de Ruina',
    clase: 'brujo',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 2,
    objetivo: 'enemigo',
    fx: 'condena',
    texto: 'Duplica la Condena del enemigo.',
    jugar: async (c) => {
      const n = c.objetivo!.estados.condena ?? 0;
      if (n <= 0) await c.mensaje('El objetivo no está condenado…');
      else await c.aplicarEstado(c.objetivo!, 'condena', n);
    },
    mejora: {
      coste: 1,
      texto: 'Duplica la Condena del enemigo.',
      jugar: async (c) => {
        const n = c.objetivo!.estados.condena ?? 0;
        if (n <= 0) await c.mensaje('El objetivo no está condenado…');
        else await c.aplicarEstado(c.objetivo!, 'condena', n);
      },
    },
  },
  {
    id: 'velo-tinieblas',
    nombre: 'Velo de Tinieblas',
    clase: 'brujo',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'oscuridad',
    texto: 'Gana 8 de bloqueo y aplica 2 de\nOscuridad a todos los enemigos.',
    jugar: async (c) => {
      await c.ganarBloqueo(8);
      for (const e of c.enemigos.filter((x) => x.vivo)) {
        await c.aplicarEstado(e, 'oscuridad', 2);
      }
    },
    mejora: {
      texto: 'Gana 11 de bloqueo y aplica 3 de\nOscuridad a todos los enemigos.',
      jugar: async (c) => {
        await c.ganarBloqueo(11);
        for (const e of c.enemigos.filter((x) => x.vivo)) {
          await c.aplicarEstado(e, 'oscuridad', 3);
        }
      },
    },
  },
  {
    id: 'sacrificio-familiar',
    nombre: 'Sacrificio del Familiar',
    clase: 'brujo',
    tipo: 'ataque',
    rareza: 'infrecuente',
    coste: 0,
    objetivo: 'enemigo',
    fx: 'sangre',
    texto: 'Sacrifica tu invocación: inflige daño\nigual a su vida restante.\nGana 1 de energía.',
    jugar: async (c) => {
      if (!c.hayInvocacion()) {
        await c.mensaje('No tienes ninguna invocación…');
        return;
      }
      const vida = await c.sacrificarInvocacion();
      await c.danar(c.objetivo!, vida, 'sangre');
      c.ganarEnergia(1);
    },
    mejora: {
      texto: 'Sacrifica tu invocación: inflige daño\nigual a su vida restante y aplica\nesa misma Condena. Gana 2 de energía.',
      jugar: async (c) => {
        if (!c.hayInvocacion()) {
          await c.mensaje('No tienes ninguna invocación…');
          return;
        }
        const vida = await c.sacrificarInvocacion();
        await c.danar(c.objetivo!, vida, 'sangre');
        if (c.objetivo!.vivo) await c.aplicarEstado(c.objetivo!, 'condena', vida);
        c.ganarEnergia(2);
      },
    },
  },
  {
    id: 'pacto-sangriento',
    nombre: 'Pacto Sangriento',
    clase: 'brujo',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 0,
    objetivo: 'ninguno',
    fx: 'sangre',
    texto: 'Pierde 4 PV. Roba 2 cartas y este turno\ntu Explosión Sobrenatural inflige 4 más.',
    jugar: async (c) => {
      await c.perderPV(4);
      await c.robar(2);
      await c.aplicarEstado(c.jugador, 'explosionTurno', 4);
    },
    mejora: {
      texto: 'Pierde 2 PV. Roba 2 cartas y este turno\ntu Explosión Sobrenatural inflige 6 más.',
      jugar: async (c) => {
        await c.perderPV(2);
        await c.robar(2);
        await c.aplicarEstado(c.jugador, 'explosionTurno', 6);
      },
    },
  },
  {
    id: 'verbo-agonizante',
    nombre: 'Verbo Agonizante',
    clase: 'brujo',
    tipo: 'poder',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'abisal',
    texto: 'Poder: tu Explosión Sobrenatural\ninflige 3 de daño adicional.',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'explosionFuerza', 3);
    },
    mejora: {
      texto: 'Poder: tu Explosión Sobrenatural\ninflige 5 de daño adicional.',
      jugar: async (c) => {
        await c.aplicarEstado(c.jugador, 'explosionFuerza', 5);
      },
    },
  },
  {
    id: 'don-del-patron',
    nombre: 'Don del Patrón',
    clase: 'brujo',
    tipo: 'poder',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'abisal',
    texto: 'Poder: tu Explosión Sobrenatural\ncuesta 0.',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'explosionGratis', 1);
    },
    mejora: {
      coste: 0,
      texto: 'Poder: tu Explosión Sobrenatural\ncuesta 0.',
      jugar: async (c) => {
        await c.aplicarEstado(c.jugador, 'explosionGratis', 1);
      },
    },
  },
  {
    id: 'llamada-vacio',
    nombre: 'Llamada del Vacío',
    clase: 'brujo',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 0,
    objetivo: 'ninguno',
    fx: 'abisal',
    texto: 'Pon tu Explosión Sobrenatural en tu mano.\nEste turno inflige 3 más.',
    jugar: async (c) => {
      await c.traerALaMano('explosion-sobrenatural');
      await c.aplicarEstado(c.jugador, 'explosionTurno', 3);
    },
    mejora: {
      texto: 'Pon tu Explosión Sobrenatural en tu mano.\nEste turno inflige 6 más.',
      jugar: async (c) => {
        await c.traerALaMano('explosion-sobrenatural');
        await c.aplicarEstado(c.jugador, 'explosionTurno', 6);
      },
    },
  },
  {
    id: 'cadenas-carceri',
    nombre: 'Cadenas de Carceri',
    clase: 'brujo',
    tipo: 'habilidad',
    rareza: 'infrecuente',
    coste: 1,
    objetivo: 'enemigo',
    fx: 'oscuridad',
    texto: 'Aplica 3 de Oscuridad y 2 de Vulnerable.',
    jugar: async (c) => {
      await c.aplicarEstado(c.objetivo!, 'oscuridad', 3);
      await c.aplicarEstado(c.objetivo!, 'vulnerable', 2);
    },
    mejora: {
      texto: 'Aplica 4 de Oscuridad y 3 de Vulnerable.',
      jugar: async (c) => {
        await c.aplicarEstado(c.objetivo!, 'oscuridad', 4);
        await c.aplicarEstado(c.objetivo!, 'vulnerable', 3);
      },
    },
  },
  {
    id: 'marchitar',
    nombre: 'Marchitar',
    clase: 'brujo',
    tipo: 'ataque',
    rareza: 'infrecuente',
    coste: 2,
    objetivo: 'enemigo',
    fx: 'muerte',
    texto: 'Inflige 12 de daño.\nAplica 2 de Vulnerable.',
    jugar: async (c) => {
      await c.atacar(c.objetivo!, 12, 1, 'muerte');
      if (c.objetivo!.vivo) await c.aplicarEstado(c.objetivo!, 'vulnerable', 2);
    },
    mejora: {
      texto: 'Inflige 16 de daño.\nAplica 3 de Vulnerable.',
      jugar: async (c) => {
        await c.atacar(c.objetivo!, 16, 1, 'muerte');
        if (c.objetivo!.vivo) await c.aplicarEstado(c.objetivo!, 'vulnerable', 3);
      },
    },
  },
  // — Raras: subclases del brujo y remates —
  {
    id: 'archifata',
    nombre: 'Presencia Feérica',
    clase: 'brujo',
    tipo: 'poder',
    rareza: 'rara',
    coste: 3,
    objetivo: 'ninguno',
    subclase: 'Archifata',
    fx: 'luna',
    animRara: 'anim-ilusion',
    texto: 'Poder: al inicio de cada turno aplicas\n2 de Oscuridad a todos los enemigos.',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'oscuridadPorTurno', 2);
    },
    mejora: {
      coste: 2,
      texto: 'Poder: al inicio de cada turno aplicas\n2 de Oscuridad a todos los enemigos.',
      jugar: async (c) => {
        await c.aplicarEstado(c.jugador, 'oscuridadPorTurno', 2);
      },
    },
  },
  {
    id: 'celestial',
    nombre: 'Bendición Celestial',
    clase: 'brujo',
    tipo: 'poder',
    rareza: 'rara',
    coste: 3,
    objetivo: 'ninguno',
    subclase: 'Celestial',
    fx: 'divino',
    animRara: 'anim-divino',
    texto: 'Cúrate 12 PV al jugarla.\nPoder: al inicio de cada turno\ngana 6 de bloqueo.',
    jugar: async (c) => {
      await c.curar(12);
      await c.aplicarEstado(c.jugador, 'bloqueoPorTurno', 6);
    },
    mejora: {
      texto: 'Cúrate 16 PV al jugarla.\nPoder: al inicio de cada turno\ngana 8 de bloqueo.',
      jugar: async (c) => {
        await c.curar(16);
        await c.aplicarEstado(c.jugador, 'bloqueoPorTurno', 8);
      },
    },
  },
  {
    id: 'infernal',
    nombre: 'Pacto Infernal',
    clase: 'brujo',
    tipo: 'poder',
    rareza: 'rara',
    coste: 1,
    objetivo: 'ninguno',
    subclase: 'Infernal',
    fx: 'furia',
    animRara: 'anim-evocacion',
    texto: 'Poder: cada vez que un enemigo\nmuera, gana 8 de bloqueo.',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'bendicionOscura', 8);
    },
    mejora: {
      texto: 'Poder: cada vez que un enemigo\nmuera, gana 11 de bloqueo.',
      jugar: async (c) => {
        await c.aplicarEstado(c.jugador, 'bendicionOscura', 11);
      },
    },
  },
  {
    id: 'gran-antiguo',
    nombre: 'Mente del Gran Antiguo',
    clase: 'brujo',
    tipo: 'poder',
    rareza: 'rara',
    coste: 1,
    objetivo: 'ninguno',
    subclase: 'Gran Antiguo',
    fx: 'condena',
    animRara: 'anim-psionico',
    texto: 'Poder: tus ataques aplican\n2 de Condena al objetivo.',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'condenaPorAtaque', 2);
    },
    mejora: {
      texto: 'Poder: tus ataques aplican\n3 de Condena al objetivo.',
      jugar: async (c) => {
        await c.aplicarEstado(c.jugador, 'condenaPorAtaque', 3);
      },
    },
  },
  {
    id: 'explosion-trifurcada',
    nombre: 'Explosión Trifurcada',
    clase: 'brujo',
    tipo: 'poder',
    rareza: 'rara',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'abisal',
    animRara: 'anim-evocacion',
    texto: 'Poder: tu Explosión Sobrenatural\ngolpea a TODOS los enemigos.',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'explosionArea', 1);
    },
    mejora: {
      coste: 0,
      texto: 'Poder: tu Explosión Sobrenatural\ngolpea a TODOS los enemigos.',
      jugar: async (c) => {
        await c.aplicarEstado(c.jugador, 'explosionArea', 1);
      },
    },
  },
  {
    id: 'haz-desdoblado',
    nombre: 'Haz Desdoblado',
    clase: 'brujo',
    tipo: 'poder',
    rareza: 'rara',
    coste: 2,
    objetivo: 'ninguno',
    fx: 'abisal',
    animRara: 'anim-psionico',
    texto: 'Poder: tu Explosión Sobrenatural\ngolpea 1 vez más.',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'explosionVeces', 1);
    },
    mejora: {
      coste: 1,
      texto: 'Poder: tu Explosión Sobrenatural\ngolpea 1 vez más.',
      jugar: async (c) => {
        await c.aplicarEstado(c.jugador, 'explosionVeces', 1);
      },
    },
  },
  {
    id: 'verbo-aniquilacion',
    nombre: 'Verbo de Aniquilación',
    clase: 'brujo',
    tipo: 'habilidad',
    rareza: 'rara',
    coste: 2,
    objetivo: 'enemigo',
    fx: 'condena',
    animRara: 'anim-veneno',
    texto: 'Aplica Condena igual a la mitad\nde los PV actuales del enemigo.',
    jugar: async (c) => {
      await c.aplicarEstado(c.objetivo!, 'condena', Math.floor(c.objetivo!.pv / 2));
    },
    mejora: {
      texto: 'Aplica Condena igual a dos tercios\nde los PV actuales del enemigo.',
      jugar: async (c) => {
        await c.aplicarEstado(c.objetivo!, 'condena', Math.floor((c.objetivo!.pv * 2) / 3));
      },
    },
  },
  // — Carta única de clase (don del inicio del Acto III) —
  {
    id: 'pacto-final',
    nombre: 'Pacto Final',
    clase: 'brujo',
    tipo: 'poder',
    rareza: 'especial',
    coste: 1,
    objetivo: 'ninguno',
    fx: 'condena',
    animRara: 'anim-veneno',
    texto: 'Poder: al final de cada turno aplicas\nCondena igual a tu bloqueo\na TODOS los enemigos.',
    jugar: async (c) => {
      await c.aplicarEstado(c.jugador, 'condenaPorBloqueo', 1);
    },
    mejora: {
      coste: 0,
      texto: 'Poder: al final de cada turno aplicas\nCondena igual a tu bloqueo\na TODOS los enemigos.',
      jugar: async (c) => {
        await c.aplicarEstado(c.jugador, 'condenaPorBloqueo', 1);
      },
    },
  },
];

// ── Cartas únicas incoloras (recompensa de la Vidente entre actos) ───────────

/** Resuelve el efecto de Seducir según la tirada de 1d20. */
async function resolverSeducir(c: ContextoEfecto, r: number) {
  const e = c.objetivo!;
  if (r === 1) {
    await c.mensaje('💢 ¡Se revuelve furioso!');
    await c.forzarAccion(e);
  } else if (r <= 5) {
    await c.aplicarEstado(c.jugador, 'fuerza', -1);
  } else if (r <= 11) {
    await c.aplicarEstado(c.jugador, 'fuerza', 1);
  } else if (r <= 15) {
    await c.aplicarEstado(e, 'debil', 3);
    await c.aplicarEstado(c.jugador, 'fuerza', 2);
  } else if (r <= 19) {
    c.saltarAccion(e);
    await c.aplicarEstado(c.jugador, 'fuerza', 2);
    await c.mensaje('💗 Queda prendado: no atacará');
  } else {
    await c.efectoEn(e, 'corazones');
    if (c.esJefe(e)) {
      await c.danar(e, 40, 'corazones');
      await c.aplicarEstado(e, 'debil', 3);
      await c.aplicarEstado(c.jugador, 'fuerza', 3);
    } else {
      await c.mensaje('💘 ¡Sucumbe por completo!');
      await c.matar(e);
      await c.aplicarEstado(c.jugador, 'fuerza', 3);
    }
  }
}

/** Resuelve el efecto de Deseo según la tirada de 1d20. */
async function resolverDeseo(c: ContextoEfecto, r: number) {
  const vivos = () => c.enemigos.filter((e) => e.vivo);
  if (r === 1) {
    c.manaCero();
    await c.mensaje('🌀 El deseo se vuelve en tu contra…');
  } else if (r <= 5) {
    for (const e of vivos()) await c.sanar(e, 20);
    await c.aplicarEstado(c.jugador, 'vulnerable', 2);
  } else if (r <= 12) {
    for (const e of vivos()) {
      await c.aplicarEstado(e, 'vulnerable', 2);
      await c.aplicarEstado(e, 'debil', 2);
    }
  } else if (r <= 16) {
    for (const e of vivos()) {
      await c.aplicarEstado(e, 'vulnerable', 99);
      await c.aplicarEstado(e, 'debil', 99);
    }
  } else if (r <= 19) {
    for (const e of vivos()) {
      await c.aplicarEstado(e, 'vulnerable', 99);
      await c.aplicarEstado(e, 'debil', 99);
      c.saltarAccion(e);
    }
  } else {
    for (const e of vivos()) {
      if (c.esJefe(e)) {
        await c.danar(e, 50, 'ola');
        await c.aplicarEstado(e, 'vulnerable', 99);
        await c.aplicarEstado(e, 'debil', 99);
      } else {
        await c.matar(e);
      }
    }
  }
}

export const NEUTRALES_ESPECIALES: CartaDef[] = [
  {
    id: 'seducir',
    nombre: 'Seducir',
    clase: 'neutral',
    tipo: 'habilidad',
    rareza: 'rara',
    coste: 1,
    objetivo: 'enemigo',
    fx: 'corazones',
    animRara: 'anim-corazon',
    exhumar: true,
    texto: 'Tira 1d20 y seduce al enemigo.\nEl azar decide tu suerte… o tu perdición.\nSe agota.',
    jugar: async (c) => {
      await resolverSeducir(c, await c.tirarDado(20));
    },
    mejora: {
      texto: 'Con ventaja: tira 2d20 y usa el mejor.\nSeduce al enemigo. Se agota.',
      jugar: async (c) => {
        await resolverSeducir(c, await c.tirarDadoVentaja(20));
      },
    },
  },
  {
    id: 'deseo',
    nombre: 'Deseo',
    clase: 'neutral',
    tipo: 'habilidad',
    rareza: 'rara',
    coste: 2,
    objetivo: 'ninguno',
    fx: 'estrellas',
    animRara: 'anim-estrellas',
    exhumar: true,
    texto: 'Tira 1d20 y formula tu deseo.\nLa fortuna —o la ruina— responderá.\nSe agota.',
    jugar: async (c) => {
      await resolverDeseo(c, await c.tirarDado(20));
    },
    mejora: {
      texto: 'Con ventaja: tira 2d20 y usa el mejor.\nFormula tu deseo. Se agota.',
      jugar: async (c) => {
        await resolverDeseo(c, await c.tirarDadoVentaja(20));
      },
    },
  },
];

// ── Mazos iniciales y recompensas ────────────────────────────────────────────

/** Las 2 cartas de clase con las que arranca cada mazo. */
const INICIALES_DE_CLASE: Record<ClaseId, [string, string]> = {
  // identidad desde el turno 1: zarpa + su motor, la Transformación. Sin una
  // forma en la mano de salida el druida no tiene de dónde sacar daño.
  druida: ['zarpazo', 'forma-lobo'],
  // furia + ataque temerario que la alimenta
  barbaro: ['furia-primaria', 'golpe-imprudente'],
  // un poder que genera espacio de conjuro y una carta que lo gasta
  mago: ['canalizar-mana', 'manos-ardientes'],
  // un ataque con robo + una defensa con Acrobacias
  picaro: ['filo-rapido', 'pirueta'],
  // el cañón que siempre vuelve + la defensa que muerde
  brujo: ['explosion-sobrenatural', 'armadura-agathys'],
};

const POOLS: Record<ClaseId, CartaDef[]> = {
  druida: DRUIDA, barbaro: BARBARO, mago: MAGO, picaro: PICARO, brujo: BRUJO,
};

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
  // 'especial' (cartas únicas de clase) no aparecen en recompensas normales:
  // solo se obtienen como don de la Vidente al iniciar el Acto III.
  return POOLS[clase].filter((c) => c.rareza !== 'inicial' && c.rareza !== 'especial');
}

/** Devuelve la carta única de clase (rareza 'especial') de cada clase. */
export function cartaUnicaDeClase(clase: ClaseId): CartaDef {
  return POOLS[clase].find((c) => c.rareza === 'especial')!;
}

/** Registro completo (para guardar/cargar partidas por id). */
export function cartaPorId(id: string): CartaDef | undefined {
  return [
    ...BASICAS, ...DRUIDA, ...BARBARO, ...MAGO, ...PICARO, ...BRUJO,
    CONJURO_PRODIGIOSO, DAGA,
  ].find(
    (c) => c.id === id,
  );
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
