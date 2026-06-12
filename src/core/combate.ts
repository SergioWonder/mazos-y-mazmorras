import type {
  CartaInstancia, ContextoEfecto, EfectoTemporal, EnemigoCombate, EnemigoDef,
  EstadoId, EstadoRun, JugadorCombate, Luchador, Movimiento,
} from './types.ts';
import { barajar } from './rng.ts';
import { crearEnemigo } from './enemigos.ts';
import { crearEspacios } from './conjuros.ts';
import { defDe } from './cartas.ts';

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
}

export class Combate {
  jugador: JugadorCombate;
  enemigos: EnemigoCombate[];
  turno = 0;
  danoHechoEsteTurno = 0;
  danoRecibidoEsteTurno = 0; // daño real (no bloqueado) sufrido en la ronda
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

  /** Ataque anulado: su mejor ataque conocido, con su Fuerza actual, queda en ≤ 0.
   *  Funciona aunque este turno no esté atacando (defensa, mejoras…). */
  ataqueAnulado(e: EnemigoCombate): boolean {
    const base = Math.max(e.intencion.dano ?? 0, e.danoBaseMax);
    if (base <= 0) return false; // aún no se le conoce ningún ataque
    return this.danoDeAtaque(e, base) <= 0;
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
      async recuperarConjuro() {
        const gastados = self.jugador.conjuros
          .filter((c) => c.gastado)
          .sort((a, b) => b.nivel - a.nivel);
        if (gastados.length === 0) return 0;
        gastados[0].gastado = false;
        await self.ui.fxMensaje(`◈ Conjuro de nivel ${gastados[0].nivel} recuperado`);
        return gastados[0].nivel;
      },
      conjurosLibres(nivelMin = 1) {
        return self.jugador.conjuros.filter((c) => !c.gastado && c.nivel >= nivelMin).length;
      },
      run: self.run,
      danoIntencion: (e) => self.danoIntencion(e),
      ataqueAnulado: (e) => self.ataqueAnulado(e),
      estaTransformado: () => self.jugador.efectosTemporales.length > 0,
      mensaje: (txt) => self.ui.fxMensaje(txt),
    };
  }

  /** Aplica daño real a un luchador (atraviesa bloqueo primero). */
  async infligir(obj: Luchador, dano: number, fx?: string): Promise<number> {
    // Invulnerable: no recibe daño alguno
    if ((obj.estados.invulnerable ?? 0) > 0) {
      await this.ui.fxGolpe(obj, 0, fx);
      return 0;
    }
    const absorbido = Math.min(obj.bloqueo, dano);
    obj.bloqueo -= absorbido;
    const real = dano - absorbido;
    obj.pv = Math.max(0, obj.pv - real);
    if (obj !== this.jugador) this.danoHechoEsteTurno += real;
    else this.danoRecibidoEsteTurno += real; // solo el daño que atraviesa el bloqueo
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
    return n;
  }

  async inicioTurnoJugador(primero = false) {
    this.turno++;
    this.danoHechoEsteTurno = 0;
    this.danoRecibidoEsteTurno = 0;
    if (!primero) this.jugador.bloqueo = 0;
    this.jugador.energia = this.jugador.energiaMax;
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
    this.robarCartas(this.cartasPorTurno());
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
    this.enResolucion = false;
    this.ui.render();
  }

  /** Reduce contadores temporales (débil, vulnerable, frágil…) de un luchador. */
  private decrementarEstados(l: Luchador) {
    for (const k of ['vulnerable', 'debil', 'fragil', 'invulnerable'] as EstadoId[]) {
      if ((l.estados[k] ?? 0) > 0) l.estados[k]!--;
    }
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
      e.bloqueo = 0;
      await this.ejecutarMovimiento(e);
      this.decrementarEstados(e);
      delete e.estados.raices; // las raíces solo aprietan durante un turno
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
    if (
      !this.terminado &&
      (this.danoRecibidoEsteTurno === 0 || frenesi) &&
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
    const m = e.intencion;
    await this.ui.fxEnemigoActua(e);

    if (m.dano !== undefined) {
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
        await this.infligir(this.jugador, dano, 'golpeEnemigo');
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
