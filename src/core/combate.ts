import type {
  CartaInstancia, ContextoEfecto, EfectoTemporal, EnemigoCombate, EnemigoDef,
  EstadoId, EstadoRun, JugadorCombate, Luchador, Movimiento,
} from './types.ts';
import { barajar } from './rng.ts';
import { crearEnemigo } from './enemigos.ts';
import { crearEspacios } from './conjuros.ts';
import { defDe, cartaPorId, instanciar, CONJURO_PRODIGIOSO } from './cartas.ts';
import type { EfectoConjuro } from './types.ts';

/** Eventos que el motor comunica a la interfaz para renderizar y animar. */
export interface Presentador {
  render(): void;
  espera(ms: number): Promise<void>;
  fxGolpe(obj: Luchador, dano: number, fx?: string): Promise<void>;
  fxBloqueo(obj: Luchador, n: number): Promise<void>;
  fxEstado(obj: Luchador, estado: EstadoId, n: number): Promise<void>;
  fxCura(obj: Luchador, n: number): Promise<void>;
  fxMuerte(e: EnemigoCombate): Promise<void>;
  fxMensaje(txt: string): Promise<void>;
  fxEnemigoActua(e: EnemigoCombate): Promise<void>;
  fxFuriaPerdida(): Promise<void>;
  /** Anima el lanzamiento de un dado de `caras` que cae en `n`. */
  fxDado(n: number, caras: number): Promise<void>;
  fxDadoVentaja(a: number, b: number, caras: number): Promise<void>;
  /** Lanza partículas sobre un luchador, sin número ni texto. */
  fxParticulas(obj: Luchador, efecto: string): Promise<void>;
  /** Deja al jugador elegir una carta de una lista (o cancelar). */
  elegirCarta(cartas: CartaInstancia[], titulo: string): Promise<CartaInstancia | null>;
}

export class Combate {
  jugador: JugadorCombate;
  enemigos: EnemigoCombate[];
  turno = 0;
  danoHechoEsteTurno = 0;
  danoRecibidoEsteTurno = 0; // daño real (no bloqueado) sufrido en la ronda
  danoBloqueadoEsteTurno = 0; // daño absorbido por el bloqueo en la ronda
  terminado: 'victoria' | 'derrota' | null = null;
  enResolucion = false;
  run: EstadoRun;
  rng: () => number;
  ui: Presentador;

  constructor(
    run: EstadoRun,
    defs: EnemigoDef[],
    rng: () => number,
    ui: Presentador,
    eliteOJefe = false,
  ) {
    this.run = run;
    this.rng = rng;
    this.ui = ui;
    const nombres = { druida: 'Druida', barbaro: 'Bárbaro', mago: 'Mago' };
    const energiaMax =
      3 + run.permanentes.energia + (eliteOJefe ? run.permanentes.energiaElite : 0);
    this.jugador = {
      nombre: nombres[run.clase],
      pvMax: run.pvMax, pv: run.pv, bloqueo: 0, estados: {}, vivo: true,
      energia: energiaMax, energiaMax,
      mazo: barajar(rng, [...run.mazo]),
      mano: [], descarte: [], agotadas: [],
      efectosTemporales: [], furiaFuerza: 0, furiaDestreza: 0,
      conjuros: crearEspacios(run.espaciosConjuro),
      conjuroEscrito: 0, conjuroEfectos: [], conjuroActivo: false,
    };
    this.enemigos = defs.map((d) => crearEnemigo(d, rng));
  }

  // ── Cálculo de daño/bloqueo (reglas StS) ──────────────────────────────────

  danoDeAtaque(atacante: Luchador, base: number): number {
    let dano = base + (atacante.estados.fuerza ?? 0) - (atacante.estados.raices ?? 0);
    if ((atacante.estados.debil ?? 0) > 0) dano = Math.floor(dano * 0.75);
    return Math.max(0, dano);
  }

  danoRecibido(objetivo: Luchador, dano: number): number {
    if ((objetivo.estados.vulnerable ?? 0) > 0) dano = Math.floor(dano * 1.5);
    return Math.max(0, dano);
  }

  bloqueoDeCarta(base: number): number {
    let b = base + (this.jugador.estados.destreza ?? 0);
    if ((this.jugador.estados.fragil ?? 0) > 0) b = Math.floor(b * 0.75);
    return Math.max(0, b);
  }

  /** Daño que hará la intención actual de un enemigo (para mostrar y para Raíces). */
  danoIntencion(e: EnemigoCombate): number {
    if (e.intencion.dano === undefined) return 0;
    return this.danoRecibido(this.jugador, this.danoDeAtaque(e, e.intencion.dano));
  }

  /** Ataque anulado: SOLO si el enemigo pretende atacar este turno y ese ataque,
   *  con su Fuerza actual (Raíces incluidas), queda en ≤ 0. Las raíces solo
   *  "aprietan" cuando hay un ataque real que neutralizar. */
  ataqueAnulado(e: EnemigoCombate): boolean {
    if (e.intencion.dano === undefined) return false; // no ataca este turno
    return this.danoDeAtaque(e, e.intencion.dano) <= 0;
  }

  // ── Contexto que se pasa a las cartas y reliquias ─────────────────────────

  contexto(objetivo?: EnemigoCombate): ContextoEfecto {
    const self = this;
    return {
      objetivo,
      jugador: self.jugador,
      enemigos: self.enemigos,
      rng: self.rng,
      async atacar(obj, base, veces = 1, fx) {
        let total = 0;
        for (let i = 0; i < veces; i++) {
          if (!obj.vivo) break;
          const dano = self.danoRecibido(obj, self.danoDeAtaque(self.jugador, base));
          total += await self.infligir(obj, dano, fx);
          // Espinas del enemigo (Escamas Ígneas, etc.): devuelven daño al atacante
          const espinas = obj.estados.espinas ?? 0;
          if (espinas > 0 && self.jugador.vivo) await self.infligir(self.jugador, espinas, 'raices');
          if (veces > 1) await self.ui.espera(220);
        }
        return total;
      },
      async atacarTodos(base, fx) {
        for (const e of self.enemigos.filter((x) => x.vivo)) {
          const dano = self.danoRecibido(e, self.danoDeAtaque(self.jugador, base));
          await self.infligir(e, dano, fx);
        }
      },
      async ganarBloqueo(base) {
        const b = self.bloqueoDeCarta(base);
        self.jugador.bloqueo += b;
        await self.ui.fxBloqueo(self.jugador, b);
      },
      async aplicarEstado(obj, estado, n) {
        obj.estados[estado] = (obj.estados[estado] ?? 0) + n;
        await self.ui.fxEstado(obj, estado, n);
      },
      async aplicarRaices(e, cantidad, turnos) {
        // Cada carta de Raíces es una instancia con su propia duración. Raíces
        // Profundas (raizProlongada) suma turnos a cada nueva instancia.
        const extra = self.jugador.estados.raizProlongada ?? 0;
        e.raicesInstancias = e.raicesInstancias ?? [];
        e.raicesInstancias.push({ cantidad, turnos: turnos + extra });
        e.estados.raices = e.raicesInstancias.reduce((s, r) => s + r.cantidad, 0);
        await self.ui.fxEstado(e, 'raices', cantidad);
      },
      async curar(n) {
        const real = Math.min(n, self.jugador.pvMax - self.jugador.pv);
        self.jugador.pv += real;
        await self.ui.fxCura(self.jugador, real);
      },
      async perderPV(n) {
        const real = Math.min(n, self.jugador.pv - 1); // nunca mata
        if (real <= 0) return;
        self.jugador.pv -= real;
        self.danoRecibidoEsteTurno += real; // alimenta la Furia del bárbaro
        await self.ui.fxGolpe(self.jugador, real, 'golpeEnemigo');
      },
      async robar(n) {
        self.robarCartas(n);
        self.ui.render();
        await self.ui.espera(150);
      },
      ganarEnergia(n) {
        self.jugador.energia += n;
        self.ui.render();
      },
      async efectoTemporal(e: EfectoTemporal) {
        self.jugador.efectosTemporales.push({ ...e });
        if (e.fuerza) self.jugador.estados.fuerza = (self.jugador.estados.fuerza ?? 0) + e.fuerza;
        if (e.destreza) self.jugador.estados.destreza = (self.jugador.estados.destreza ?? 0) + e.destreza;
        await self.ui.fxMensaje(`✦ ${e.etiqueta} (${e.turnos} turnos)`);
      },
      async ganarFuria(fuerza, destreza = 0) {
        self.jugador.furiaFuerza += fuerza;
        self.jugador.furiaDestreza += destreza;
        if (fuerza) self.jugador.estados.fuerza = (self.jugador.estados.fuerza ?? 0) + fuerza;
        if (destreza) self.jugador.estados.destreza = (self.jugador.estados.destreza ?? 0) + destreza;
        await self.ui.fxMensaje(`🔥 ¡Furia! +${fuerza} Fuerza${destreza ? ` +${destreza} Destreza` : ''}`);
      },
      async gastarConjuro(nivelMin) {
        // Por defecto se gasta el espacio de mayor nivel disponible
        const libres = self.jugador.conjuros
          .filter((c) => !c.gastado && c.nivel >= nivelMin)
          .sort((a, b) => b.nivel - a.nivel);
        if (libres.length === 0) return 0;
        libres[0].gastado = true;
        await self.ui.fxMensaje(`◈ Conjuro de nivel ${libres[0].nivel} gastado`);
        for (const r of self.run.reliquias) {
          if (r.alGastarConjuro) await r.alGastarConjuro(self.contexto());
        }
        return libres[0].nivel;
      },
      async ganarConjuro(permanente = false) {
        if (permanente) self.run.espaciosConjuro++;
        // reconstruye la pirámide conservando cuántos espacios estaban gastados
        const gastados = self.jugador.conjuros.filter((c) => c.gastado).length;
        self.jugador.conjuros = crearEspacios(self.jugador.conjuros.length + 1);
        self.jugador.conjuros.slice(0, gastados).forEach((s) => (s.gastado = true));
        await self.ui.fxMensaje(
          permanente ? '◈ ¡Espacio de conjuro permanente!' : '◈ Espacio de conjuro (este combate)',
        );
      },
      async recuperarConjuro(masAlto = false) {
        // por defecto se recupera el espacio gastado de MENOR nivel;
        // con `masAlto` (Sacrificio Arcano) se recupera el de MAYOR nivel.
        const gastados = self.jugador.conjuros
          .filter((c) => c.gastado)
          .sort((a, b) => (masAlto ? b.nivel - a.nivel : a.nivel - b.nivel));
        if (gastados.length === 0) return 0;
        gastados[0].gastado = false;
        await self.ui.fxMensaje(`◈ Conjuro de nivel ${gastados[0].nivel} recuperado`);
        return gastados[0].nivel;
      },
      conjurosLibres(nivelMin = 1) {
        return self.jugador.conjuros.filter((c) => !c.gastado && c.nivel >= nivelMin).length;
      },
      escribir: (n, efecto) => self.escribirConjuro(n, efecto),
      run: self.run,
      danoIntencion: (e) => self.danoIntencion(e),
      ataqueAnulado: (e) => self.ataqueAnulado(e),
      estaTransformado: () => self.jugador.efectosTemporales.length > 0,
      mensaje: (txt) => self.ui.fxMensaje(txt),
      async tirarDado(caras) {
        const n = 1 + Math.floor(self.rng() * caras);
        await self.ui.fxDado(n, caras);
        return n;
      },
      async tirarDadoVentaja(caras) {
        const a = 1 + Math.floor(self.rng() * caras);
        const b = 1 + Math.floor(self.rng() * caras);
        await self.ui.fxDadoVentaja(a, b, caras);
        return Math.max(a, b);
      },
      async forzarAccion(e) {
        if (!e.vivo || self.terminado) return;
        await self.ejecutarMovimiento(e);
        if (e.vivo && !self.terminado) {
          e.turnosVisto++;
          e.intencion = e.def.ia(e.turnosVisto, self.rng, e, self.enemigos.filter((x) => x.vivo && x !== e));
          e.danoBaseMax = Math.max(e.danoBaseMax, e.intencion.dano ?? 0);
          self.ui.render();
        }
      },
      saltarAccion(e) {
        e.saltaAccion = true;
      },
      async danar(obj, n, fx) {
        await self.infligir(obj, n, fx ?? 'golpeEnemigo');
      },
      async danarPerforante(obj, n, fx) {
        await self.infligir(obj, n, fx ?? 'impacto', true);
      },
      async recuperarDelDescarte() {
        const pila = self.jugador.descarte;
        if (pila.length === 0) {
          await self.ui.fxMensaje('No hay nada en el descarte…');
          return;
        }
        const elegida = await self.ui.elegirCarta(pila, 'Devuelve una carta a lo alto del mazo');
        if (!elegida) return;
        pila.splice(pila.indexOf(elegida), 1);
        self.jugador.mazo.push(elegida); // pop() roba del final = lo alto del mazo
        self.ui.render();
      },
      async matar(e) {
        if (!e.vivo) return;
        e.pv = 0;
        e.vivo = false;
        await self.ui.fxMuerte(e);
        await self.comprobarFin();
      },
      async sanar(obj, n) {
        const real = Math.min(n, obj.pvMax - obj.pv);
        if (real > 0) {
          obj.pv += real;
          await self.ui.fxCura(obj, real);
        }
      },
      esJefe: (e) => e.def.esJefe === true,
      manaCero() {
        self.jugador.energia = 0;
        self.jugador.energiaCero = true;
        self.ui.render();
      },
      efectoEn: (obj, efecto) => self.ui.fxParticulas(obj, efecto),
    };
  }

  /** Aplica daño real a un luchador (atraviesa bloqueo primero).
   *  Si `perforante`, ignora el bloqueo y además lo destruye (lo pone a 0). */
  async infligir(obj: Luchador, dano: number, fx?: string, perforante = false): Promise<number> {
    // Invulnerable: no recibe daño alguno
    if ((obj.estados.invulnerable ?? 0) > 0) {
      await this.ui.fxGolpe(obj, 0, fx);
      return 0;
    }
    let absorbido = 0;
    if (perforante) {
      obj.bloqueo = 0; // destruye el bloqueo
    } else {
      absorbido = Math.min(obj.bloqueo, dano);
      obj.bloqueo -= absorbido;
    }
    if (obj === this.jugador) this.danoBloqueadoEsteTurno += absorbido;
    const real = dano - absorbido;
    obj.pv = Math.max(0, obj.pv - real);
    if (obj !== this.jugador) {
      this.danoHechoEsteTurno += real;
      if (real > 0) (obj as EnemigoCombate).heridoEsteTurno = true; // mantiene la Hemorragia
    } else this.danoRecibidoEsteTurno += real; // solo el daño que atraviesa el bloqueo
    await this.ui.fxGolpe(obj, real, fx);
    if (obj.pv <= 0 && obj.vivo) {
      const e = obj as EnemigoCombate;
      // Pasiva del liche: la primera muerte no cuenta
      if (obj !== this.jugador && e.def.pasiva === 'filacteria' && !e.filacteriaUsada) {
        e.filacteriaUsada = true;
        e.pv = 60;
        e.estados.invulnerable = 1; // un turno intocable mientras se recompone
        await this.ui.fxMensaje('☠️ ¡Su filacteria lo devuelve a la no-vida!');
        this.ui.render();
      } else {
        obj.vivo = false;
        if (obj !== this.jugador) await this.ui.fxMuerte(e);
      }
    }
    await this.comprobarFin();
    return real;
  }

  async comprobarFin() {
    if (this.terminado) return;
    if (!this.jugador.vivo || this.jugador.pv <= 0) this.terminado = 'derrota';
    else if (this.enemigos.every((e) => !e.vivo)) this.terminado = 'victoria';
  }

  /** Escribe en el Conjuro Prodigioso: suma daño, añade efecto (sin apilar) y
   *  lo genera en la mano si no está ya en ninguna pila del combate. */
  async escribirConjuro(n: number, efecto?: EfectoConjuro) {
    const j = this.jugador;
    j.conjuroEscrito += n;
    j.conjuroActivo = true;
    if (efecto && !j.conjuroEfectos.includes(efecto)) j.conjuroEfectos.push(efecto);
    const existe = [...j.mano, ...j.mazo, ...j.descarte, ...j.agotadas].some(
      (c) => c.def.id === 'conjuro-prodigioso',
    );
    if (existe) {
      await this.ui.fxMensaje(`✍️ Conjuro Prodigioso: ${10 + j.conjuroEscrito} de daño`);
    } else {
      const inst = instanciar(CONJURO_PRODIGIOSO);
      if (j.mano.length < 10) j.mano.push(inst);
      else j.descarte.push(inst);
      await this.ui.fxMensaje(`📜 ¡Conjuro Prodigioso! ${10 + j.conjuroEscrito} de daño`);
    }
    this.ui.render();
  }

  // ── Flujo de turnos ────────────────────────────────────────────────────────

  robarCartas(n: number) {
    for (let i = 0; i < n; i++) {
      if (this.jugador.mazo.length === 0) {
        if (this.jugador.descarte.length === 0) return;
        this.jugador.mazo = barajar(this.rng, this.jugador.descarte);
        this.jugador.descarte = [];
      }
      if (this.jugador.mano.length >= 10) return; // mano llena
      this.jugador.mano.push(this.jugador.mazo.pop()!);
    }
  }

  async iniciar() {
    // Efectos permanentes (cartas de 1 uso, bendiciones)
    if (this.run.permanentes.fuerza > 0) {
      this.jugador.estados.fuerza =
        (this.jugador.estados.fuerza ?? 0) + this.run.permanentes.fuerza;
      await this.ui.fxEstado(this.jugador, 'fuerza', this.run.permanentes.fuerza);
    }
    if (this.run.permanentes.destreza > 0) {
      this.jugador.estados.destreza =
        (this.jugador.estados.destreza ?? 0) + this.run.permanentes.destreza;
      await this.ui.fxEstado(this.jugador, 'destreza', this.run.permanentes.destreza);
    }
    for (const r of this.run.reliquias) {
      if (r.inicioCombate) await r.inicioCombate(this.contexto());
    }
    await this.inicioTurnoJugador(true);
  }

  cartasPorTurno(): number {
    let n = 5 + this.run.permanentes.robo;
    for (const r of this.run.reliquias) n += r.robaExtraPorTurno ?? 0;
    for (const e of this.jugador.efectosTemporales) n += e.robaExtra ?? 0;
    if ((this.jugador.estados.roboAcelerado ?? 0) > 0) n += 1; // Acelerar
    return n;
  }

  async inicioTurnoJugador(primero = false) {
    this.turno++;
    this.danoHechoEsteTurno = 0;
    this.danoRecibidoEsteTurno = 0;
    this.danoBloqueadoEsteTurno = 0;
    for (const e of this.enemigos) e.heridoEsteTurno = false; // reinicia el control de Hemorragia
    if (!primero) this.jugador.bloqueo = 0;
    this.jugador.energia = this.jugador.energiaMax;
    if (this.jugador.energiaCero) { // penalización de Deseo
      this.jugador.energia = 0;
      this.jugador.energiaCero = false;
    } else if (this.turno <= 2) {
      // Don del Maná Eterno: energía extra solo en los 2 primeros turnos
      this.jugador.energia += this.run.permanentes.energiaInicial;
    }
    // Furia Indómita: bloqueo igual a tu Fuerza mientras tengas Furia activa
    if (
      (this.jugador.estados.furiaIndomita ?? 0) > 0 &&
      this.jugador.furiaFuerza + this.jugador.furiaDestreza > 0
    ) {
      const f = Math.max(0, this.jugador.estados.fuerza ?? 0);
      if (f > 0) {
        this.jugador.bloqueo += f;
        await this.ui.fxBloqueo(this.jugador, f);
      }
    }
    // Tratado Prohibido: escribe en el Conjuro Prodigioso al inicio de cada turno
    const escribania = this.jugador.estados.escribania ?? 0;
    if (escribania > 0) await this.escribirConjuro(escribania);
    // Maestría de Conjuros: añade un Proyectil Mágico a la mano cada turno
    const maestria = this.jugador.estados.maestria ?? 0;
    if (maestria > 0 && this.jugador.mano.length < 10) {
      const inst = instanciar(cartaPorId('proyectil-magico')!);
      if (maestria >= 2) inst.mejorada = true;
      this.jugador.mano.push(inst);
    }
    // regeneración y curas de efectos temporales
    const regen = this.jugador.estados.regeneracion ?? 0;
    const curaExtra = this.jugador.efectosTemporales.reduce((s, e) => s + (e.curaTurno ?? 0), 0);
    if (regen + curaExtra > 0) {
      const real = Math.min(regen + curaExtra, this.jugador.pvMax - this.jugador.pv);
      if (real > 0) {
        this.jugador.pv += real;
        await this.ui.fxCura(this.jugador, real);
      }
    }
    let aRobar = this.cartasPorTurno();
    if (primero) {
      // Cartas innatas: empiezan en la mano y cuentan para el robo inicial
      const innatas = this.jugador.mazo.filter((c) => defDe(c).innato);
      for (const c of innatas) {
        this.jugador.mazo.splice(this.jugador.mazo.indexOf(c), 1);
        if (this.jugador.mano.length < 10) this.jugador.mano.push(c);
      }
      aRobar = Math.max(0, aRobar - innatas.length);
    }
    this.robarCartas(aRobar);
    this.ui.render();
  }

  puedeJugar(carta: CartaInstancia): boolean {
    if (this.enResolucion || this.terminado) return false;
    const def = defDe(carta);
    if (this.jugador.energia < def.coste) return false;
    if (def.requiereConjuro) {
      const libres = this.jugador.conjuros.filter(
        (c) => !c.gastado && c.nivel >= def.requiereConjuro!,
      );
      if (libres.length === 0) return false;
    }
    return true;
  }

  async jugarCarta(carta: CartaInstancia, objetivo?: EnemigoCombate) {
    if (!this.puedeJugar(carta)) return;
    this.enResolucion = true;
    const def = defDe(carta);
    const idx = this.jugador.mano.indexOf(carta);
    if (idx >= 0) this.jugador.mano.splice(idx, 1);
    this.jugador.energia -= def.coste;
    this.ui.render();
    await def.jugar(this.contexto(objetivo));
    // Quemadura (Aliento de Dragón): cada carta jugada cuesta 3 PV mientras dure
    if ((this.jugador.estados.quemadura ?? 0) > 0 && !this.terminado) {
      const real = Math.min(3, this.jugador.pv - 1); // no mata
      if (real > 0) {
        this.jugador.pv -= real;
        await this.ui.fxGolpe(this.jugador, real, 'aliento');
        this.ui.render();
      }
    }
    if (carta.def.unUso) {
      // Se elimina del mazo para el resto de la partida
      const enRun = this.run.mazo.findIndex((c) => c.uid === carta.uid);
      if (enRun >= 0) this.run.mazo.splice(enRun, 1);
      this.jugador.agotadas.push(carta);
      await this.ui.fxMensaje(`«${carta.def.nombre}» se consume para siempre`);
    } else if (carta.def.exhumar || carta.def.tipo === 'poder') {
      this.jugador.agotadas.push(carta);
    } else {
      this.jugador.descarte.push(carta);
    }
    // Acelerar: si te quedas sin cartas en la mano, el efecto desaparece
    if ((this.jugador.estados.roboAcelerado ?? 0) > 0 && this.jugador.mano.length === 0) {
      delete this.jugador.estados.roboAcelerado;
      await this.ui.fxMensaje('💨 El impulso de Acelerar se disipa');
    }
    this.enResolucion = false;
    this.ui.render();
  }

  /** Reduce contadores temporales (débil, vulnerable, frágil…) de un luchador. */
  private decrementarEstados(l: Luchador) {
    for (const k of ['vulnerable', 'debil', 'fragil', 'invulnerable', 'quemadura'] as EstadoId[]) {
      if ((l.estados[k] ?? 0) > 0) l.estados[k]!--;
    }
  }

  /** Tras el turno del enemigo, cada instancia de Raíces pierde 1 turno. */
  private envejecerRaices(e: EnemigoCombate) {
    if (!e.raicesInstancias?.length) { delete e.estados.raices; return; }
    e.raicesInstancias = e.raicesInstancias
      .map((r) => ({ cantidad: r.cantidad, turnos: r.turnos - 1 }))
      .filter((r) => r.turnos > 0);
    const total = e.raicesInstancias.reduce((s, r) => s + r.cantidad, 0);
    if (total > 0) e.estados.raices = total;
    else delete e.estados.raices;
  }

  async terminarTurno() {
    if (this.enResolucion || this.terminado) return;
    this.enResolucion = true;
    const j = this.jugador;

    // Efectos temporales del druida: expiran
    for (const e of [...j.efectosTemporales]) {
      e.turnos--;
      if (e.turnos <= 0) {
        j.estados.fuerza = (j.estados.fuerza ?? 0) - e.fuerza;
        j.estados.destreza = (j.estados.destreza ?? 0) - e.destreza;
        j.efectosTemporales.splice(j.efectosTemporales.indexOf(e), 1);
        await this.ui.fxMensaje(`${e.etiqueta} termina`);
      }
    }

    // Reliquias de fin de turno
    for (const r of this.run.reliquias) {
      if (r.finTurno) await r.finTurno(this.contexto());
    }

    this.decrementarEstados(j);

    // Descartar mano
    j.descarte.push(...j.mano);
    j.mano = [];
    this.ui.render();
    await this.ui.espera(300);

    // Turno enemigo (sobre una copia: las invocaciones no actúan el turno en que llegan)
    for (const e of [...this.enemigos]) {
      if (!e.vivo || this.terminado) continue;
      // Hemorragia: al inicio de su turno pierde PV (ignora bloqueo). Tras el tic
      // se cierra si durante tu turno no recibió daño no bloqueado.
      const hem = e.estados.hemorragia ?? 0;
      if (hem > 0) {
        const mantenida = e.heridoEsteTurno === true;
        await this.infligir(e, hem, 'sangre', true);
        const sed = j.estados.sedSangre ?? 0;
        if (sed > 0 && j.vivo) {
          j.bloqueo += sed;
          await this.ui.fxBloqueo(j, sed);
        }
        if (!mantenida && e.vivo) {
          delete e.estados.hemorragia;
          await this.ui.fxMensaje(`🩸 La herida de ${e.nombre} se cierra`);
        }
      }
      if (!e.vivo || this.terminado) continue; // la Hemorragia pudo matarlo
      e.bloqueo = 0;
      await this.ejecutarMovimiento(e);
      this.decrementarEstados(e);
      this.envejecerRaices(e); // cada instancia de raíces pierde 1 turno
      e.turnosVisto++;
      e.intencion = e.def.ia(
        e.turnosVisto, this.rng, e,
        this.enemigos.filter((x) => x.vivo && x !== e),
      );
      e.danoBaseMax = Math.max(e.danoBaseMax, e.intencion.dano ?? 0);
      this.ui.render();
      await this.ui.espera(250);
    }

    // Imagen Espejo dura 1 turno: lo que quede se disipa
    delete j.estados.espejismo;

    // Furia del bárbaro: se rompe si la ronda acaba sin recibir daño real
    // (el daño absorbido por el bloqueo no cuenta). El Frenesí la rompe siempre.
    const frenesi = (j.estados.frenesi ?? 0) > 0;
    // Furia Indómita: la Furia aguanta si bloqueaste daño y te queda poco bloqueo
    const indomitaSalva =
      !frenesi &&
      (j.estados.furiaIndomita ?? 0) > 0 &&
      this.danoBloqueadoEsteTurno > 0 &&
      j.bloqueo < 10;
    if (
      !this.terminado &&
      (this.danoRecibidoEsteTurno === 0 || frenesi) &&
      !indomitaSalva &&
      j.furiaFuerza + j.furiaDestreza > 0
    ) {
      j.estados.fuerza = (j.estados.fuerza ?? 0) - j.furiaFuerza;
      j.estados.destreza = (j.estados.destreza ?? 0) - j.furiaDestreza;
      j.furiaFuerza = 0;
      j.furiaDestreza = 0;
      await this.ui.fxFuriaPerdida();
      // Corazón Salvaje: la Furia perdida deja un poso de Fuerza y Destreza
      const cs = j.estados.corazonSalvaje ?? 0;
      if (cs > 0) {
        j.estados.fuerza = (j.estados.fuerza ?? 0) + cs;
        j.estados.destreza = (j.estados.destreza ?? 0) + cs;
        await this.ui.fxMensaje(`🐾 Corazón Salvaje: +${cs} Fuerza y +${cs} Destreza`);
      }
    }
    delete j.estados.frenesi; // el Frenesí solo dura este turno

    this.enResolucion = false;
    if (!this.terminado) await this.inicioTurnoJugador();
  }

  async ejecutarMovimiento(e: EnemigoCombate) {
    // Seducción/Deseo: el enemigo se salta esta acción
    if (e.saltaAccion) {
      e.saltaAccion = false;
      await this.ui.fxMensaje(`💤 ${e.nombre} no actúa este turno`);
      return;
    }
    const m = e.intencion;
    await this.ui.fxEnemigoActua(e);

    if (m.dano !== undefined) {
      // Raíces: el ataque baja en esa cantidad. Si queda en 0 o menos, en vez de
      // atacar el enemigo pierde PV = 3 + el exceso negativo (ignorando bloqueo).
      const raices = e.estados.raices ?? 0;
      let efectivo = m.dano + (e.estados.fuerza ?? 0) - raices;
      if ((e.estados.debil ?? 0) > 0) efectivo = Math.floor(efectivo * 0.75);
      if (raices > 0 && efectivo <= 0) {
        const dolor = 3 + (-efectivo);
        await this.ui.fxMensaje('🌿 ¡Las raíces lo aplastan!');
        await this.infligir(e, dolor, 'raices');
        return;
      }
      const veces = m.veces ?? 1;
      for (let i = 0; i < veces; i++) {
        if (this.terminado) return;
        // Imagen Espejo: 20% de esquiva por carga; esquivar gasta una carga,
        // recibir un golpe disipa el conjuro entero
        const cargas = this.jugador.estados.espejismo ?? 0;
        if (cargas > 0) {
          if (this.rng() < cargas * 0.2) {
            this.jugador.estados.espejismo = cargas - 1;
            if (this.jugador.estados.espejismo <= 0) delete this.jugador.estados.espejismo;
            await this.ui.fxMensaje('🪞 ¡Esquivado!');
            this.ui.render();
            if (veces > 1) await this.ui.espera(220);
            continue;
          }
          delete this.jugador.estados.espejismo; // el golpe rompe las imágenes
          await this.ui.fxMensaje('🪞 Las imágenes se desvanecen…');
        }
        const dano = this.danoRecibido(this.jugador, this.danoDeAtaque(e, m.dano));
        await this.infligir(this.jugador, dano, m.fx ?? 'golpeEnemigo');
        // Espinas: devuelve daño al atacante
        const espinas = this.jugador.estados.espinas ?? 0;
        if (espinas > 0 && e.vivo) await this.infligir(e, espinas, 'raices');
        if (veces > 1) await this.ui.espera(220);
      }
    }
    if (m.bloqueo) {
      e.bloqueo += m.bloqueo;
      await this.ui.fxBloqueo(e, m.bloqueo);
    }
    if (m.cura && e.vivo) {
      const real = Math.min(m.cura, e.pvMax - e.pv);
      if (real > 0) {
        e.pv += real;
        await this.ui.fxCura(e, real);
      }
    }
    if (m.fuerzaAliados) {
      for (const aliado of this.enemigos.filter((x) => x.vivo)) {
        aliado.estados.fuerza = (aliado.estados.fuerza ?? 0) + m.fuerzaAliados;
        await this.ui.fxEstado(aliado, 'fuerza', m.fuerzaAliados);
      }
    }
    if (m.efectos) {
      for (const [estado, n, sobreJugador] of m.efectos) {
        const obj = sobreJugador ? this.jugador : e;
        obj.estados[estado] = (obj.estados[estado] ?? 0) + n;
        await this.ui.fxEstado(obj, estado, n);
      }
    }
    if (m.invocar) {
      for (const inv of m.invocar) {
        if (this.enemigos.filter((x) => x.vivo).length >= 5) break; // campo lleno
        const nuevo = crearEnemigo(inv.def, this.rng);
        nuevo.pv = nuevo.pvMax = inv.pv;
        this.enemigos.push(nuevo);
        await this.ui.fxMensaje(`¡${e.nombre} invoca a ${nuevo.nombre}!`);
        this.ui.render();
      }
    }
    if (m.devorar) {
      const presa = this.enemigos
        .filter((x) => x.vivo && x !== e)
        .sort((a, b) => a.pv - b.pv)[0];
      if (presa) {
        await this.ui.fxMensaje(`🍖 ¡${e.nombre} devora a ${presa.nombre}!`);
        presa.pv = 0;
        presa.vivo = false;
        await this.ui.fxMuerte(presa);
        const real = Math.min(m.devorar.cura, e.pvMax - e.pv);
        if (real > 0) {
          e.pv += real;
          await this.ui.fxCura(e, real);
        }
        e.estados.fuerza = (e.estados.fuerza ?? 0) + m.devorar.fuerza;
        await this.ui.fxEstado(e, 'fuerza', m.devorar.fuerza);
      } else {
        await this.ui.fxMensaje(`${e.nombre} busca algo que devorar… y no encuentra nada.`);
      }
    }
  }
}
