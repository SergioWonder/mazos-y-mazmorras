import { Combate, esDungeonMaster, type Presentador, type VinculoDuo } from '../combate.ts';
import type { ContextoEncuentro } from '../dificultad.ts';
import type { CartaInstancia, EnemigoCombate, EnemigoDef, EstadoRun } from '../types.ts';
import { HUECOS, type Hueco } from './tipos.ts';

/** D1: with two heroes every enemy has this much HP more than solo, by act (+80 % / +95 % / +110 %),
 *  the ones that join later included (the damage does not change). The Dungeon Master is never scaled. */
export const FACTORES_PV_DUO = [1.8, 1.95, 2.1];
export const factorPvDuo = (capitulo: number) => FACTORES_PV_DUO[Math.min(Math.max(capitulo, 0), FACTORES_PV_DUO.length - 1)];
/** D3: a downed hero gets back up with this share of his max HP when the partner wins. */
export const PV_AL_LEVANTARSE = 0.25;

/**
 * Two heroes against the same enemies. Each hero has his own `Combate` (deck, hand, energy,
 * statuses, relics); both point at the same enemy objects. The heroes' turn is simultaneous:
 * every `jugar` resolves at once. When all the heroes still standing have ended the turn there
 * is one single enemy turn, whose every attack reaches every living hero (D2), each with his
 * own block and statuses; then both heroes start their next turn. Nothing here touches the rng
 * but the game itself.
 */
export class CombateDuo implements VinculoDuo {
  readonly combates: Record<Hueco, Combate>;
  readonly rng: () => number;
  /** Set once the party won (downed heroes already up) or lost (every hero down). */
  terminado: 'victoria' | 'derrota' | null = null;
  /** Who has ended the turn (the next round starts when every living hero has). */
  finTurno: Record<Hueco, boolean> = { cara: false, cruz: false };

  constructor(
    runs: Record<Hueco, EstadoRun>,
    defs: EnemigoDef[],
    rng: () => number,
    ui: Record<Hueco, Presentador>,
    eliteOJefe = false,
    contexto?: ContextoEncuentro,
  ) {
    this.rng = rng;
    const cara = new Combate(runs.cara, defs, rng, ui.cara, eliteOJefe, contexto);
    const factorPv = factorPvDuo(runs.cara.capitulo);
    // D1: the enemies are built (and tuned) once, by the first hero's combat
    for (const e of cara.enemigos) {
      if (!esDungeonMaster(e)) e.pv = e.pvMax = Math.max(1, Math.round(e.pvMax * factorPv));
    }
    const cruz = new Combate(runs.cruz, defs, rng, ui.cruz, eliteOJefe, contexto, cara.lado);
    cara.lado.factorPv = factorPv; // the ones that join the fight later get it too
    this.combates = { cara, cruz };
    for (const h of HUECOS) {
      const c = this.combates[h];
      c.hueco = h; // roots and darkness only protect the hero who cast them
      c.vinculo = this;
      c.sinTiradasDePresentacion = true;
    }
  }

  get enemigos(): EnemigoCombate[] { return this.combates.cara.enemigos; }

  // ── VinculoDuo ─────────────────────────────────────────────────────────────

  heroes(): Combate[] { return HUECOS.map((h) => this.combates[h]); }

  luchaAcabada(): boolean {
    return this.terminado !== null || this.enemigos.every((e) => !e.vivo) || !this.heroes().some((c) => c.jugador.vivo);
  }

  // ── State ──────────────────────────────────────────────────────────────────

  private vivos(): Array<{ h: Hueco; c: Combate }> {
    return HUECOS.map((h) => ({ h, c: this.combates[h] })).filter(({ c }) => c.jugador.vivo);
  }

  /** The hero's own combat says whether the card can be played; the rest is the party's. */
  puedeJugar(h: Hueco, carta: CartaInstancia): boolean {
    const c = this.combates[h];
    return !this.terminado && c.jugador.vivo && !this.finTurno[h] && c.puedeJugar(carta);
  }

  puedeTerminarTurno(h: Hueco): boolean {
    const c = this.combates[h];
    return !this.terminado && c.jugador.vivo && !this.finTurno[h] && !c.enResolucion && !c.terminado;
  }

  /** Looks at the fight after every action: victory (downed heroes stand up) or defeat. */
  async evaluar() {
    if (this.terminado) return;
    for (const c of this.heroes()) await c.comprobarFin();
    if (!this.heroes().some((c) => c.jugador.vivo)) {
      this.terminado = 'derrota';
      return;
    }
    if (this.enemigos.every((e) => !e.vivo)) {
      this.terminado = 'victoria';
      for (const c of this.heroes()) {
        // D3: a hero who fell gets back up with the party
        if (!c.jugador.vivo) {
          c.jugador.vivo = true;
          c.jugador.pv = Math.max(1, Math.round(c.jugador.pvMax * PV_AL_LEVANTARSE));
        }
        c.terminado = 'victoria';
        c.notificarVictoria();
        c.enResolucion = false;
      }
    }
  }

  /** The rules that close the fight for both heroes (HP back to the runs, healing relics). */
  cerrar() {
    for (const c of this.heroes()) c.cerrarCombate();
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async iniciar() {
    for (const c of this.heroes()) {
      await c.iniciar();
      await this.evaluar();
    }
  }

  async jugar(h: Hueco, carta: CartaInstancia, objetivo?: EnemigoCombate) {
    if (!this.puedeJugar(h, carta)) return;
    await this.combates[h].jugarCarta(carta, objetivo);
    await this.evaluar();
    await this.cerrarRondaSiProcede();
  }

  async terminarTurno(h: Hueco) {
    if (!this.puedeTerminarTurno(h)) return;
    this.finTurno[h] = true;
    await this.cerrarRondaSiProcede();
  }

  /** The enemy turn comes when every hero still standing has ended his turn. */
  private async cerrarRondaSiProcede() {
    await this.evaluar();
    if (this.terminado) return;
    const vivos = this.vivos();
    if (vivos.length === 0 || !vivos.every(({ h }) => this.finTurno[h])) return;
    await this.rondaEnemiga();
  }

  private async rondaEnemiga() {
    // 1. each living hero's end of turn, in a fixed order
    for (const { c } of this.vivos()) {
      if (!c.jugador.vivo) continue;
      await c.finDeTurnoHeroe();
      await this.evaluar();
      if (this.terminado) return;
    }
    // 2. one enemy turn (on a copy: summons do not act the turn they arrive). The first living
    //    hero pays each enemy's upkeep (poison, bleeding…); the move itself reaches every hero.
    for (const e of [...this.enemigos]) {
      if (!e.vivo || this.luchaAcabada()) continue;
      const lider = this.vivos()[0]?.c;
      if (!lider) break;
      await lider.turnoDeEnemigo(e);
      await this.evaluar();
    }
    if (this.terminado) return;
    this.combates.cara.coordinarGrupo(); // groups of three or more take turns for the coming round
    // 3. the closing of the round: each hero's side, the Doom of the enemies once, the rest
    for (const { c } of this.vivos()) await c.cierreDeRondaA();
    await this.evaluar();
    if (this.terminado) return;
    await this.vivos()[0].c.condenaFinal();
    await this.evaluar();
    if (this.terminado) return;
    for (const { c } of this.vivos()) await c.cierreDeRondaB();
    await this.evaluar();
    if (this.terminado) {
      for (const c of this.heroes()) c.ui.render();
      return;
    }
    // 4. next round
    this.finTurno = { cara: false, cruz: false };
    for (const { c } of this.vivos()) {
      c.enResolucion = false;
      await c.inicioTurnoJugador();
      await this.evaluar();
      if (this.terminado) return;
    }
  }
}
