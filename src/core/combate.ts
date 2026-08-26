import type {
  CartaDef, CartaInstancia, ContextoEfecto, EfectoTemporal, EnemigoCombate, EnemigoDef,
  EstadoId, EstadoRun, JugadorCombate, Luchador, Movimiento,
} from './types.ts';
import { barajar } from './rng.ts';
import { crearEnemigo } from './enemigos.ts';
import { crearEspacios } from './conjuros.ts';
import { defDe, cartaPorId, instanciar, CONJURO_PRODIGIOSO, DAGA } from './cartas.ts';
import type { EfectoConjuro, EfectoInvocacion, FormaInvocacion } from './types.ts';

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
  /** La invocación absorbe daño (número rojo sobre ella). */
  fxInvocacionGolpe(dano: number): Promise<void>;
  /** La invocación muere. */
  fxInvocacionMuerte(): Promise<void>;
  /** La invocación ataca (pequeña sacudida + partículas). */
  fxInvocacionAtaca(): Promise<void>;
  /** La invocación se cura (número verde sobre ella). */
  fxInvocacionCura(n: number): Promise<void>;
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
  descartadasEsteTurno = 0; // cartas descartadas por efectos este turno (pícaro)
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
    const nombres = {
      druida: 'Druida', barbaro: 'Bárbaro', mago: 'Mago', picaro: 'Pícaro', brujo: 'Brujo',
    };
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
      bloqueoAplazado: [],
    };
    this.enemigos = defs.map((d) => crearEnemigo(d, rng));
  }

  // ── Cálculo de daño/bloqueo (reglas StS) ──────────────────────────────────

  danoDeAtaque(atacante: Luchador, base: number): number {
    let dano = base + (atacante.estados.fuerza ?? 0)
      - (atacante.estados.raices ?? 0)
      - (atacante.estados.oscuridad ?? 0);
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

  /** Coste real de una carta este turno (el Rayo Carmesí del Contemplador lo encarece). */
  costeEfectivo(def: CartaDef): number {
    return def.coste + ((this.jugador.estados.cartasSobrecoste ?? 0) > 0 ? 1 : 0);
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

  /** El enemigo no va a atacarte este turno: base de los ataques furtivos del
   *  pícaro (se defiende, se potencia, está desconcertado o pierde el turno). */
  noPretendeAtacar(e: EnemigoCombate): boolean {
    if (e.saltaAccion) return true;
    return e.intencion.intencion !== 'ataque' && e.intencion.dano === undefined;
  }

  /** Condena (brujo): la Condena acumulada alcanza los PV actuales del enemigo,
   *  así que al final de su turno morirá. */
  condenaLetal(e: EnemigoCombate): boolean {
    return e.vivo && (e.estados.condena ?? 0) >= e.pv;
  }

  /** Oportunista (pícaro): daño extra por golpe contra quien no pretende atacar. */
  ventajaFurtivaContra(e: EnemigoCombate): number {
    const v = this.jugador.estados.ventajaFurtiva ?? 0;
    return v > 0 && this.noPretendeAtacar(e) ? v : 0;
  }

  /** Activa el Veneno de un enemigo: pierde PV igual a su Veneno (ignorando el
   *  bloqueo) y su Veneno baja 1. */
  async tickVeneno(e: EnemigoCombate) {
    const ven = e.estados.veneno ?? 0;
    if (ven <= 0) return;
    await this.infligir(e, ven, 'veneno', true, true);
    e.estados.veneno = ven - 1;
    if ((e.estados.veneno ?? 0) <= 0) delete e.estados.veneno;
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
        // Oportunista (pícaro): más daño por golpe si el objetivo no pretende atacar
        const furtivo = self.ventajaFurtivaContra(obj);
        for (let i = 0; i < veces; i++) {
          if (!obj.vivo) break;
          const dano = self.danoRecibido(obj, self.danoDeAtaque(self.jugador, base + furtivo));
          total += await self.infligir(obj, dano, fx);
          // Espinas del enemigo (Escamas Ígneas, etc.): devuelven daño al atacante
          const espinas = obj.estados.espinas ?? 0;
          if (espinas > 0 && self.jugador.vivo) await self.infligir(self.jugador, espinas, 'raices');
          if (veces > 1) await self.ui.espera(220);
        }
        // Filo Venenoso (Asesino): cada ataque envenena al objetivo
        const filo = self.jugador.estados.filoVenenoso ?? 0;
        if (filo > 0 && obj.vivo) {
          obj.estados.veneno = (obj.estados.veneno ?? 0) + filo;
          await self.ui.fxEstado(obj, 'veneno', filo);
        }
        // Mente del Gran Antiguo (brujo): cada ataque condena al objetivo
        const cond = self.jugador.estados.condenaPorAtaque ?? 0;
        if (cond > 0 && obj.vivo) {
          obj.estados.condena = (obj.estados.condena ?? 0) + cond;
          await self.ui.fxEstado(obj, 'condena', cond);
        }
        return total;
      },
      async atacarTodos(base, fx) {
        // Los añadidos «por ataque» (Filo Venenoso, Gran Antiguo) también valen
        // aquí: en un golpe de área todos los enemigos son el objetivo.
        const filo = self.jugador.estados.filoVenenoso ?? 0;
        const cond = self.jugador.estados.condenaPorAtaque ?? 0;
        for (const e of self.enemigos.filter((x) => x.vivo)) {
          const extra = self.ventajaFurtivaContra(e);
          const dano = self.danoRecibido(e, self.danoDeAtaque(self.jugador, base + extra));
          await self.infligir(e, dano, fx);
          if (!e.vivo) continue;
          if (filo > 0) {
            e.estados.veneno = (e.estados.veneno ?? 0) + filo;
            await self.ui.fxEstado(e, 'veneno', filo);
          }
          if (cond > 0) {
            e.estados.condena = (e.estados.condena ?? 0) + cond;
            await self.ui.fxEstado(e, 'condena', cond);
          }
        }
      },
      async ganarBloqueo(base) {
        const b = self.bloqueoDeCarta(base);
        self.jugador.bloqueo += b;
        await self.ui.fxBloqueo(self.jugador, b);
      },
      async ganarBloqueoAcrobatico(base) {
        const b = self.bloqueoDeCarta(base);
        self.jugador.bloqueo += b;
        await self.ui.fxBloqueo(self.jugador, b);
        // Piruetas: reaplica este bloqueo al inicio del próximo turno. Es SOLO el
        // bloqueo de esta carta.
        self.jugador.bloqueoAplazado.push({ cantidad: b, turnos: 1 });
        self.actualizarIndicadorAcrobacias();
        self.ui.render();
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
      invocar: (forma, vida) => self.invocar(forma, vida),
      atacarInvocacion: (bono) => self.atacarInvocacion(bono),
      curarInvocacion: (n) => self.curarInvocacion(n),
      hayInvocacion: () => !!self.jugador.invocacion && self.jugador.invocacion.vida > 0,
      invocarEfimero: (forma, vida, dano) => self.invocarEfimero(forma, vida, dano),
      vidaInvocacion: () => self.jugador.invocacion?.vida ?? 0,
      async sacrificarInvocacion() {
        const inv = self.jugador.invocacion;
        if (!inv || inv.vida <= 0) return 0;
        const vida = inv.vida;
        self.jugador.invocacion = undefined;
        await self.ui.fxInvocacionMuerte();
        self.ui.render();
        return vida;
      },
      run: self.run,
      danoIntencion: (e) => self.danoIntencion(e),
      noPretendeAtacar: (e) => self.noPretendeAtacar(e),
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
          if (e.intencionForzada) {
            e.intencion = e.intencionForzada;
            delete e.intencionForzada;
          } else {
            e.intencion = e.def.ia(e.turnosVisto, self.rng, e, self.enemigos.filter((x) => x.vivo && x !== e));
          }
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
      async descartar(n) {
        let hechos = 0;
        for (let i = 0; i < n; i++) {
          const mano = self.jugador.mano.slice();
          if (mano.length === 0) break;
          const elegida = await self.ui.elegirCarta(mano, `Descarta una carta (${i + 1}/${n})`);
          if (!elegida) break; // se puede descartar menos de N
          await self.descartarCarta(elegida);
          hechos++;
        }
        return hechos;
      },
      descartadasEsteTurno: () => self.descartadasEsteTurno,
      crearDagas: (n) => self.crearDagas(n),
      async detonarVenenos() {
        const envenenados = self.enemigos.filter((e) => e.vivo && (e.estados.veneno ?? 0) > 0);
        if (envenenados.length === 0) {
          await self.ui.fxMensaje('Nadie está envenenado…');
          return;
        }
        for (const e of envenenados) {
          if (!e.vivo || self.terminado) break;
          await self.tickVeneno(e);
        }
        self.ui.render();
      },
      async intercambiarIntencion(e) {
        if (!e.vivo || self.terminado) return;
        const aliados = self.enemigos.filter((x) => x.vivo && x !== e);
        // Busca entre sus próximos movimientos uno que NO sea de ataque.
        let pacifica: Movimiento | undefined;
        for (let i = 1; i <= 16 && !pacifica; i++) {
          const m = e.def.ia(e.turnosVisto + i, self.rng, e, aliados);
          if (m.intencion !== 'ataque' && m.dano === undefined) pacifica = m;
        }
        e.intencionForzada = e.intencion; // lo que iba a hacer → lo hará después
        if (pacifica) {
          e.intencion = pacifica;
          await self.ui.fxMensaje(`🎭 Confundes a ${e.nombre}`);
        } else {
          // Solo sabe atacar: se queda desconcertado y pierde el turno.
          e.saltaAccion = true;
          e.intencion = { nombre: 'Desconcertado', intencion: 'desconocido' };
          await self.ui.fxMensaje(`🎭 ${e.nombre} se queda desconcertado`);
        }
        e.danoBaseMax = Math.max(e.danoBaseMax, e.intencion.dano ?? 0);
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
   *  Si `perforante`, ignora el bloqueo; además lo destruye (lo pone a 0) salvo
   *  que se pida `conservarBloqueo` (el Veneno lo ignora, pero no lo rompe). */
  async infligir(
    obj: Luchador, dano: number, fx?: string, perforante = false, conservarBloqueo = false,
  ): Promise<number> {
    // Invulnerable: no recibe daño alguno
    if ((obj.estados.invulnerable ?? 0) > 0) {
      await this.ui.fxGolpe(obj, 0, fx);
      return 0;
    }
    let absorbido = 0;
    if (perforante) {
      if (!conservarBloqueo) obj.bloqueo = 0; // destruye el bloqueo
    } else {
      absorbido = Math.min(obj.bloqueo, dano);
      obj.bloqueo -= absorbido;
    }
    if (obj === this.jugador) this.danoBloqueadoEsteTurno += absorbido;
    let real = dano - absorbido;
    // Invocación del druida: absorbe el daño tras el bloqueo y antes que el héroe.
    let soakInv = 0;
    if (obj === this.jugador && real > 0) {
      const inv = this.jugador.invocacion;
      if (inv && inv.vida > 0) {
        soakInv = Math.min(inv.vida, real);
        inv.vida -= soakInv;
        real -= soakInv;
        await this.ui.fxInvocacionGolpe(soakInv);
        if (inv.vida <= 0) {
          this.jugador.invocacion = undefined;
          await this.ui.fxInvocacionMuerte();
        }
      }
    }
    obj.pv = Math.max(0, obj.pv - real);
    if (obj !== this.jugador) {
      this.danoHechoEsteTurno += real;
      if (real > 0) (obj as EnemigoCombate).heridoEsteTurno = true; // mantiene la Hemorragia
    } else this.danoRecibidoEsteTurno += real; // solo el daño que atraviesa el bloqueo
    // El héroe no muestra golpe si la invocación absorbió todo el daño.
    if (!(obj === this.jugador && soakInv > 0 && real === 0)) await this.ui.fxGolpe(obj, real, fx);
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
        // Pacto Infernal (brujo): cada muerte enemiga te blinda
        const bend = this.jugador.estados.bendicionOscura ?? 0;
        if (obj !== this.jugador && bend > 0 && this.jugador.vivo) {
          this.jugador.bloqueo += bend;
          await this.ui.fxBloqueo(this.jugador, bend);
        }
        // Disparador de muerte: el Heraldo del Culto libera a su Demonio Mayor
        if (obj !== this.jugador && e.def.invocaAlMorir) {
          const liberado = crearEnemigo(e.def.invocaAlMorir, this.rng);
          this.enemigos.push(liberado);
          await this.ui.fxMensaje(`¡De las entrañas de ${e.nombre} se alza ${liberado.nombre}!`);
          this.ui.render();
        }
      }
    }
    // Armadura de Agathys (brujo): lo que tu bloqueo absorbe se devuelve a TODOS
    if (obj === this.jugador && absorbido > 0 && (this.jugador.estados.agathys ?? 0) > 0) {
      await this.rebotarAgathys(absorbido);
    }
    await this.comprobarFin();
    return real;
  }

  /** Devuelve `n` de daño a todos los enemigos vivos (Armadura de Agathys).
   *  El flag evita reentrar si el rebote mata y desencadena más daño. */
  private rebotandoAgathys = false;
  private async rebotarAgathys(n: number) {
    if (this.rebotandoAgathys || n <= 0) return;
    this.rebotandoAgathys = true;
    try {
      await this.ui.fxMensaje(`🩸 Armadura de Agathys: ${n} a todos`);
      for (const e of this.enemigos.filter((x) => x.vivo)) {
        if (this.terminado) break;
        await this.infligir(e, n, 'agathys');
      }
    } finally {
      this.rebotandoAgathys = false;
    }
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

  /** Invoca (druida): crea la invocación o le suma vida (actual y máxima).
   *  La forma visual la fija la primera; las pasivas de todas se combinan. */
  async invocar(forma: FormaInvocacion, vida: number) {
    const j = this.jugador;
    // Solo las formas elementales del druida aportan pasiva (lobo, oso y las
    // formas efímeras del brujo no aportan ninguna).
    const PASIVAS: EfectoInvocacion[] = ['fuego', 'agua', 'aire', 'arbol', 'tierra'];
    const pasiva = PASIVAS.find((x) => x === forma) ?? null;
    if (!j.invocacion) {
      j.invocacion = { forma, vida, vidaMax: vida, efectos: pasiva ? [pasiva] : [] };
      await this.ui.fxMensaje(`🐾 ¡Invocas (${vida} de vida)!`);
    } else {
      j.invocacion.vida += vida;
      j.invocacion.vidaMax += vida;
      if (pasiva && !j.invocacion.efectos.includes(pasiva)) j.invocacion.efectos.push(pasiva);
      await this.ui.fxMensaje(`🐾 La invocación crece (+${vida} de vida)`);
    }
    this.ui.render();
  }

  /** Invoca (brujo): criatura efímera, más gorda y pegona que la del druida
   *  porque solo aguanta una ronda. Si ya hay una, suma vida y se queda con el
   *  mayor daño de las dos. */
  async invocarEfimero(forma: FormaInvocacion, vida: number, dano: number) {
    const j = this.jugador;
    if (!j.invocacion) {
      j.invocacion = { forma, vida, vidaMax: vida, efectos: [], efimera: true, dano };
      await this.ui.fxMensaje(`👁️ ¡Invocas algo del más allá (${vida} de vida)!`);
    } else {
      j.invocacion.vida += vida;
      j.invocacion.vidaMax += vida;
      j.invocacion.dano = Math.max(j.invocacion.dano ?? 0, dano);
      await this.ui.fxMensaje(`👁️ La invocación crece (+${vida} de vida)`);
    }
    this.ui.render();
  }

  /** Cierre de ronda de la invocación efímera: si sobrevivió, golpea y se va. */
  private async resolverInvocacionEfimera() {
    const inv = this.jugador.invocacion;
    if (!inv?.efimera) return;
    if (inv.vida > 0 && !this.terminado) await this.atacarInvocacion();
    this.jugador.invocacion = undefined;
    await this.ui.fxInvocacionMuerte();
    await this.ui.fxMensaje('👁️ La invocación se desvanece');
    this.ui.render();
  }

  /** La invocación ataca: daño = 30 % de su vida actual (+ bonus opcional).
   *  Las efímeras del brujo pegan por su daño fijo, no por su vida. */
  async atacarInvocacion(bono = 0) {
    const inv = this.jugador.invocacion;
    if (!inv || inv.vida <= 0) return;
    const base = (inv.efimera ? (inv.dano ?? 0) : Math.max(1, Math.round(inv.vida * 0.3))) + bono;
    const fuego = inv.efectos.includes('fuego');
    const arbol = inv.efectos.includes('arbol');
    const golpes = inv.efectos.includes('aire') ? 2 : 1; // Aire golpea dos veces
    for (let i = 0; i < golpes; i++) {
      const vivos = this.enemigos.filter((e) => e.vivo);
      if (vivos.length === 0 || this.terminado) break;
      const e = vivos[Math.min(i, vivos.length - 1)]; // Aire reparte entre 2 si los hay
      await this.ui.fxInvocacionAtaca();
      await this.golpeInvocacion(e, base, fuego);
      if (arbol && e.vivo) {
        e.raicesInstancias = e.raicesInstancias ?? [];
        e.raicesInstancias.push({ cantidad: 2, turnos: 1 });
        e.estados.raices = e.raicesInstancias.reduce((s, r) => s + r.cantidad, 0);
        await this.ui.fxEstado(e, 'raices', 2);
      }
    }
  }

  /** Cura a la invocación hasta su vida máxima. */
  async curarInvocacion(n: number) {
    const inv = this.jugador.invocacion;
    if (!inv || inv.vida <= 0) return;
    const real = Math.min(n, inv.vidaMax - inv.vida);
    if (real > 0) {
      inv.vida += real;
      await this.ui.fxInvocacionCura(real);
    }
    this.ui.render();
  }

  /** Golpe de la invocación (no escala con la Fuerza del jugador).
   *  Fuego: el daño contra el bloqueo cuenta doble (lo destruye al doble de ritmo). */
  private async golpeInvocacion(e: EnemigoCombate, dano: number, fuego: boolean) {
    if (fuego && e.bloqueo > 0) {
      const gastado = Math.min(dano, Math.ceil(e.bloqueo / 2));
      e.bloqueo = Math.max(0, e.bloqueo - gastado * 2);
      dano -= gastado;
    }
    await this.infligir(e, dano, fuego ? 'furia' : 'zarpa');
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

  /** Descarta una carta concreta de la mano y dispara la sinergia de Preparación. */
  async descartarCarta(carta: CartaInstancia) {
    const idx = this.jugador.mano.indexOf(carta);
    if (idx < 0) return;
    this.jugador.mano.splice(idx, 1);
    this.jugador.descarte.push(carta);
    this.descartadasEsteTurno++;
    await this.ui.fxMensaje(`🗑 Descartas «${defDe(carta).nombre}»`);
    // Preparación: ganas bloqueo por cada carta descartada
    const prep = this.jugador.estados.preparacion ?? 0;
    if (prep > 0) {
      this.jugador.bloqueo += prep;
      await this.ui.fxBloqueo(this.jugador, prep);
    }
    this.ui.render();
  }

  /** Añade N Dagas a la mano (pícaro), si hay hueco. */
  async crearDagas(n: number) {
    let creadas = 0;
    for (let i = 0; i < n; i++) {
      if (this.jugador.mano.length >= 10) break;
      this.jugador.mano.push(instanciar(DAGA));
      creadas++;
    }
    if (creadas > 0) await this.ui.fxMensaje(`🗡️ +${creadas} Daga${creadas > 1 ? 's' : ''}`);
    this.ui.render();
  }

  /** Refresca el indicador «🤸 Acrobacias» = bloqueo aplazado total pendiente. */
  private actualizarIndicadorAcrobacias() {
    const total = this.jugador.bloqueoAplazado.reduce((s, p) => s + p.cantidad, 0);
    if (total > 0) this.jugador.estados.acrobacias = total;
    else delete this.jugador.estados.acrobacias;
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
    this.descartadasEsteTurno = 0;
    for (const e of this.enemigos) e.heridoEsteTurno = false; // reinicia el control de Hemorragia
    if (!primero) {
      this.jugador.bloqueo = 0;
      // Piruetas (pícaro): reaplica el bloqueo aplazado de la carta jugada antes.
      const pendientes = this.jugador.bloqueoAplazado;
      this.jugador.bloqueoAplazado = [];
      for (const p of pendientes) {
        this.jugador.bloqueo += p.cantidad;
        await this.ui.fxBloqueo(this.jugador, p.cantidad);
        if (p.turnos - 1 > 0) this.jugador.bloqueoAplazado.push({ cantidad: p.cantidad, turnos: p.turnos - 1 });
      }
      this.actualizarIndicadorAcrobacias();
    }
    // Veneno: pierdes PV al inicio del turno (ignora bloqueo) y baja 1
    const ven = this.jugador.estados.veneno ?? 0;
    if (ven > 0) {
      this.jugador.pv = Math.max(0, this.jugador.pv - ven);
      this.danoRecibidoEsteTurno += ven;
      await this.ui.fxGolpe(this.jugador, ven, 'veneno');
      this.jugador.estados.veneno = ven - 1;
      if ((this.jugador.estados.veneno ?? 0) <= 0) delete this.jugador.estados.veneno;
      if (this.jugador.pv <= 0) {
        this.jugador.vivo = false;
        await this.comprobarFin();
        this.ui.render();
        return;
      }
    }
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
    // Invocación del druida: efectos de inicio de turno y ataque
    const inv = this.jugador.invocacion;
    if (inv && inv.vida > 0) {
      if (inv.efectos.includes('agua')) { // cura al inicio del turno
        const real = Math.min(2, this.jugador.pvMax - this.jugador.pv);
        if (real > 0) {
          this.jugador.pv += real;
          await this.ui.fxCura(this.jugador, real);
        }
      }
      if (inv.efectos.includes('tierra')) { // bloqueo fijo al inicio del turno
        this.jugador.bloqueo += 6;
        await this.ui.fxBloqueo(this.jugador, 6);
      }
      // Las efímeras del brujo ya atacaron al cerrar la ronda anterior.
      if (!primero && !inv.efimera) await this.atacarInvocacion();
    }
    // Presencia Feérica (brujo): Oscuridad a todos al inicio de cada turno
    const oxt = this.jugador.estados.oscuridadPorTurno ?? 0;
    if (oxt > 0) {
      for (const e of this.enemigos.filter((x) => x.vivo)) {
        e.estados.oscuridad = (e.estados.oscuridad ?? 0) + oxt;
        await this.ui.fxEstado(e, 'oscuridad', oxt);
      }
    }
    // Bendición Celestial (brujo): bloqueo al inicio de cada turno
    const bxt = this.jugador.estados.bloqueoPorTurno ?? 0;
    if (bxt > 0) {
      this.jugador.bloqueo += bxt;
      await this.ui.fxBloqueo(this.jugador, bxt);
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
    // Psiónico (Alma de Cuchillas): Dagas por turno.
    const dpt = this.jugador.estados.dagasPorTurno ?? 0;
    if (dpt > 0) await this.crearDagas(dpt);
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
    if (this.jugador.energia < this.costeEfectivo(def)) return false;
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
    this.jugador.energia -= this.costeEfectivo(def);
    this.ui.render();
    await def.jugar(this.contexto(objetivo));
    // Guardia de Cuchillas (pícaro): cada Daga que juegas te da bloqueo
    const guardia = this.jugador.estados.dagasBloqueo ?? 0;
    if (guardia > 0 && carta.def.id === DAGA.id && !this.terminado) {
      this.jugador.bloqueo += guardia;
      await this.ui.fxBloqueo(this.jugador, guardia);
    }
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
    } else if (carta.def.alTopeDelMazo) {
      // Explosión Sobrenatural: siempre vuelve, incluso con el Rayo Áureo activo
      this.jugador.mazo.push(carta); // pop() roba del final = lo alto del mazo
    } else if (carta.def.exhumar || carta.def.tipo === 'poder') {
      this.jugador.agotadas.push(carta);
    } else if ((this.jugador.estados.cartasAgotan ?? 0) > 0) {
      this.jugador.agotadas.push(carta); // Rayo Áureo del Contemplador
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
    for (const k of [
      'vulnerable', 'debil', 'fragil', 'invulnerable', 'quemadura',
      'cartasAgotan', 'cartasSobrecoste', 'cartasEtereas',
    ] as EstadoId[]) {
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

    // Pacto Final (brujo): tu bloqueo se convierte en Condena para todos
    const cxb = j.estados.condenaPorBloqueo ?? 0;
    if (cxb > 0 && j.bloqueo > 0) {
      const n = j.bloqueo;
      await this.ui.fxMensaje(`🕳️ Pacto Final: ${n} de Condena a todos`);
      for (const e of this.enemigos.filter((x) => x.vivo)) {
        e.estados.condena = (e.estados.condena ?? 0) + n;
        await this.ui.fxEstado(e, 'condena', n);
      }
    }

    this.decrementarEstados(j);

    // Descartar mano (salvo las cartas con Retener, que se quedan). Con el Rayo
    // Espectral del Contemplador, lo que no jugaste se agota en vez de descartarse.
    const retenidas = j.mano.filter((c) => defDe(c).retener);
    const sobrantes = j.mano.filter((c) => !defDe(c).retener);
    if ((j.estados.cartasEtereas ?? 0) > 0) j.agotadas.push(...sobrantes);
    else j.descarte.push(...sobrantes);
    j.mano = retenidas;
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
      // Veneno: al inicio de su turno pierde PV (ignora bloqueo) y baja 1 (pícaro)
      await this.tickVeneno(e);
      if (!e.vivo || this.terminado) continue; // el Veneno pudo matarlo
      e.bloqueo = 0;
      await this.ejecutarMovimiento(e);
      this.decrementarEstados(e);
      this.envejecerRaices(e); // cada instancia de raíces pierde 1 turno
      e.turnosVisto++;
      // Cambiazo: si tiene una intención forzada, la ejecuta ahora en vez de
      // generar una nueva; si no, la IA decide su siguiente movimiento.
      if (e.intencionForzada) {
        e.intencion = e.intencionForzada;
        delete e.intencionForzada;
      } else {
        e.intencion = e.def.ia(
          e.turnosVisto, this.rng, e,
          this.enemigos.filter((x) => x.vivo && x !== e),
        );
      }
      e.danoBaseMax = Math.max(e.danoBaseMax, e.intencion.dano ?? 0);
      this.ui.render();
      await this.ui.espera(250);
    }

    // Invocación efímera del brujo: si aguantó la ronda, golpea y se desvanece
    await this.resolverInvocacionEfimera();

    // Condena (brujo): al final del turno enemigo, quien tenga Condena ≥ sus PV
    // actuales sucumbe. Va por la vía normal de daño, así que respeta la
    // filacteria del liche y dispara los efectos de muerte (Heraldo, Infernal).
    for (const e of [...this.enemigos]) {
      if (this.terminado) break;
      if (!this.condenaLetal(e)) continue;
      await this.ui.fxMensaje(`🕳️ La Condena consume a ${e.nombre}`);
      await this.infligir(e, e.pv, 'condena', true, true);
    }

    // Imagen Espejo dura 1 turno: lo que quede se disipa
    delete j.estados.espejismo;
    // Armadura de Agathys y las mejoras de un solo turno de la Explosión
    delete j.estados.agathys;
    delete j.estados.explosionTurno;

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
    else this.ui.render(); // cierra el combate (p. ej. si la Hemorragia mató al último enemigo)
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
      // atacar el enemigo pierde PV igual a la DIFERENCIA (cuánto superan las
      // raíces a su ataque), ignorando el bloqueo. Sin daño base extra.
      const raices = e.estados.raices ?? 0;
      let efectivo = m.dano + (e.estados.fuerza ?? 0) - raices;
      if ((e.estados.debil ?? 0) > 0) efectivo = Math.floor(efectivo * 0.75);
      if (raices > 0 && efectivo <= 0) {
        const dolor = -efectivo; // solo el exceso de raíces sobre el ataque
        await this.ui.fxMensaje('🌿 ¡Las raíces lo aplastan!');
        if (dolor > 0) await this.infligir(e, dolor, 'raices');
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
