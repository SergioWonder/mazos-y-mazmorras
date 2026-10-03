import { Combate, esDungeonMaster, type Presentador, type PrevisionAtaque } from '../core/combate.ts';
import { FRASES_DM } from '../core/escena-final.ts';
import type {
  CartaDef, CartaInstancia, EnemigoCombate, EnemigoDef, EstadoId, EstadoRun, Luchador,
} from '../core/types.ts';
import { fx, menosParticulas } from '../fx/particulas.ts';
import {
  DOOMED_SOUL_DURATION, DOOM_DRAG_AT, DOOM_TOLL_AT, DoomChainTracker, doomChainSprites, isDoomConsumption,
} from '../fx/doom-chains.ts';
import { audio } from '../fx/audio.ts';
import { combatTheme, themeAfterCombat } from '../fx/music-tracks.ts';
import { rodarDado, rodarDados } from '../fx/dado.ts';
import {
  anuncio, centroDe, el, espera, ICONO_ESTADO, NOMBRE_ESTADO, numeroFlotante, sacudir, tipEstado,
} from './util.ts';
import { renderCarta, actualizarTextoCarta, cuadroPalabrasClave, EFECTO_CONJURO, type ModsCarta } from './carta.ts';
import { defDe } from '../core/cartas.ts';
import { HeroSprite } from './hero-sprite.ts';
import { PuppetSprite, LUZ_LUNA } from './puppet-sprite.ts';
import { PuppetStage } from './puppet-stage.ts';
import { sceneBackground } from '../fx/background.ts';
import { ENEMY_RIGS, INVOCATION_RIGS } from '../fx/enemy-rigs.ts';
import { currentForm, type FormId } from '../fx/hero-rig.ts';
import { layoutSlots } from './enemy-slots.ts';
import { relicIcon } from './relic-art.ts';
import { ActionQueue, checkCardAction, forecastEnergy } from './action-queue.ts';
import { playDestination, drawDelays, exhaustsWhenPlayed, type Point, type SlotPose } from './card-motion.ts';
import { flyDiscard, flyDraw, flyExhaust, flyPlay, flyShowcase, flyShuffle, glideToSlot, reducedMotion, slotPose } from './card-fly.ts';
import { cardSpellKey, hitSpell, preludeKey, sweepImpactMs } from '../fx/card-spells.ts';
import type { SpellCtx } from '../fx/spell-fx.ts';
import { ImpactQueue, SweepClock } from './impact-queue.ts';
import { DeathQueue } from './death-queue.ts';
import { prodigiousSpell } from './prodigious-fx.ts';
import { llamasDeCastigo, resumenCastigo } from './castigo-ficha.ts';
import {
  deathTimeScale, heroDeathFx, heroDeathSequence, playsDefeatSequence, SOUL_SPELL, type DeathCueId,
} from '../fx/hero-death.ts';
import { setSpriteTimeScale } from './puppet-sprite.ts';
import { verCartas } from './visor-mazo.ts';
import '../estilos/muerte.css';

/** How long an enemy takes to fall: its puppet's death, or the CSS one of the emoji enemies. */
const MUERTE_SPRITE_MS = 750;
const MUERTE_CSS_MS = 550;

/** How the hero fell in the last lost combat (for the tombstone). */
let ultimaCaida: { asesino: string | null; turnos: number } | null = null;
export const caidaDelHeroe = () => ultimaCaida;

/** Player actions go through a FIFO queue: one resolves at a time, the rest wait. */
type AccionJugador =
  | { kind: 'start' }
  | { kind: 'card'; card: CartaInstancia; target?: EnemigoCombate }
  | { kind: 'endTurn' };
type AccionCarta = Extract<AccionJugador, { kind: 'card' }>;

const NOMBRE_CLASE: Record<string, string> = {
  druida: '🌿 Druida', barbaro: '🪓 Bárbaro', mago: '🔮 Mago', picaro: '🗡️ Pícaro',
  brujo: '🕳️ Brujo', paladin: '🔨 Paladín',
};
const SPRITE_INVOCACION: Record<string, string> = {
  lobo: '🐺', oso: '🐻', fuego: '🔥', agua: '💧', aire: '🌬️', arbol: '🌳', tierra: '⛰️',
  sabueso: '🐕‍🦺', demonio: '👹',
};
const PASIVA_INVOCACION: Record<string, string> = {
  fuego: 'Doble daño al bloqueo',
  agua: 'Te cura 2 PV al inicio de tu turno',
  aire: 'Ataca a dos enemigos',
  arbol: 'Aplica 2 de Raíces al atacar',
  tierra: 'Te da 6 de bloqueo al inicio de tu turno',
};

export function pantallaCombate(
  run: EstadoRun,
  defs: EnemigoDef[],
  rng: () => number,
  esJefe: boolean,
  nombreCapitulo: string,
  esElite = false,
): Promise<'victoria' | 'derrota'> {
  return new Promise((resolver) => {
    ultimaCaida = null;
    const app = document.getElementById('app')!;
    app.innerHTML = '';
    app.className = `pantalla-combate ${esJefe ? 'combate-jefe' : ''}`;
    fx.ambiente(true);
    audio.reproducirTema(combatTheme(run.capitulo, esJefe, defs, run.escenario)); // scenario combat version, boss or the DM

    // ── Estructura ──────────────────────────────────────────────────────────
    const raiz = el('div', 'combate');
    raiz.innerHTML = `
      <div class="escenario">
        <div class="cielo"><div class="luna"></div></div>
        <div class="silueta-fondo"></div>
        <div class="barra-superior"></div>
        <div class="campo">
          <div class="lado-jugador"></div>
          <div class="lado-enemigos"></div>
        </div>
        <div class="aviso-jefe">${esJefe ? '☠️ JEFE ☠️' : ''}</div>
      </div>
      <div class="zona-mano">
        <div class="energia"></div>
        <div class="pila pila-robo" data-tip="<strong>Pila de robo</strong><br>Cartas que quedan por robar. Toca para verlas."></div>
        <div class="mano"></div>
        <div class="pila pila-descarte" data-tip="<strong>Descarte</strong><br>Vuelve a barajarse cuando se agota la pila de robo. Toca para verlo."></div>
        <button class="btn-fin-turno">Fin de turno<span class="atajo">[E]</span></button>
      </div>
      <div class="linea-lanzamiento">Suelta aquí para lanzar</div>
      <div class="ayuda-teclas">←→ elegir · Enter jugar · Esc cancelar · E fin de turno</div>
    `;
    app.appendChild(raiz);

    const $ = (s: string) => raiz.querySelector(s) as HTMLElement;

    // Persistent hero puppet: re-attached on every render so it keeps animating
    // WebGL stage between the sky and the UI (null: SVG fallback without WebGL2)
    const escenarioEl = $('.escenario');
    // The stage covers the scene plus a margin over the hand strip, so spell effects and
    // lunges near the bottom are not cut off (on portrait phones the scene is short).
    const stage = PuppetStage.create(raiz, {
      before: raiz.querySelector('.zona-mano'),
      style: 'z-index:16;height:calc(var(--alto-escenario, 60%) + 170px);',
    });
    const altoEscenario = () => raiz.style.setProperty('--alto-escenario', `${escenarioEl.offsetHeight}px`);
    altoEscenario();
    const medirEscenario = new ResizeObserver(altoEscenario);
    medirEscenario.observe(escenarioEl);
    montarFondo(raiz, escenarioEl, run.capitulo, run.escenario);
    const heroSprite = new HeroSprite(run.clase, stage);
    // druid forms get their own backlit puppet, created on first use
    const formSprites = new Map<FormId, HeroSprite>();
    const formaActual = (): FormId | null => currentForm(combate.jugador.efectosTemporales);
    let formaMostrada: FormId | null = null;
    // illustrated enemies and invocations (bosses keep their emoji for now)
    const luzLuna = LUZ_LUNA[run.capitulo] ?? LUZ_LUNA[0];
    const spritesEnemigo = new Map<EnemigoCombate, PuppetSprite>();
    /** Doom's chains on each enemy: kept here, apart from the DOM rebuilt on every render. */
    const cadenas = new DoomChainTracker<EnemigoCombate>();
    const ahora = () => performance.now() / 1000;
    /** Until when a death by Doom is still dragging its soul under (the end screen waits). */
    let almaHasta = 0;
    const spriteEnemigo = (e: EnemigoCombate): PuppetSprite | null => {
      const rig = ENEMY_RIGS[e.def.id];
      if (!rig) return null;
      let s = spritesEnemigo.get(e);
      if (!s) {
        s = new PuppetSprite(rig, { style: 'illustrated', mirrored: true, rim: luzLuna, stage });
        spritesEnemigo.set(e, s);
        // the chains climb its body as its Condena nears its health (drawn by the puppet)
        s.setOverlay((caja, opacidad, capas) => {
          const t = ahora(), v = cadenas.step(e, t);
          return v ? doomChainSprites(caja, { ...v, alpha: v.alpha * opacidad }, t, { reduced: menosParticulas(), layered: capas }) : [];
        });
      }
      return s;
    };
    /** The figure's body when it has a puppet (Doom's bell and chains hug it), else its box. */
    const cuerpoDe = (obj: Luchador) => {
      const s = obj === combate.jugador ? undefined : spritesEnemigo.get(obj as EnemigoCombate);
      return s ? s.bodyBox() : cajaDe(elemDe(obj));
    };
    /** The funeral bell of Doom, heard once for every enemy it tolls over at the same time. */
    let ultimaCampana = 0;
    const tanerCampana = () => {
      const t = performance.now();
      if (t - ultimaCampana < 400) return;
      ultimaCampana = t;
      setTimeout(() => audio.sfx('campanaCondena'), DOOM_TOLL_AT * 1000);
    };
    const spritesInvocacion = new Map<string, PuppetSprite>();
    const spriteInvocacion = (): PuppetSprite | null => {
      const inv = combate.jugador.invocacion;
      const rig = inv && INVOCATION_RIGS[inv.forma];
      if (!inv || !rig) return null;
      let s = spritesInvocacion.get(inv.forma);
      if (!s) { s = new PuppetSprite(rig, { style: 'illustrated', rim: luzLuna, stage }); spritesInvocacion.set(inv.forma, s); }
      return s;
    };
    const spriteActual = (): HeroSprite => {
      const f = formaActual();
      if (!f) return heroSprite;
      let s = formSprites.get(f);
      if (!s) { s = new HeroSprite(f, stage); formSprites.set(f, s); }
      return s;
    };

    // ── Estado de entrada ────────────────────────────────────────────────────
    let seleccion = 0;               // índice de carta seleccionada (teclado)
    let modoObjetivo = false;        // eligiendo objetivo con teclado/clic
    let objetivoIdx = 0;
    let huecosEnemigos: EnemigoCombate[] = []; // fixed enemy slots, left to right
    let cartaPendiente: CartaInstancia | null = null;
    let arrastrando: HTMLElement | null = null;

    // ── Card flights: what the hand looked like at the last render ──────────
    /** Element of each hand card at the last render (the source of discard flights). */
    let elemPorCarta = new Map<CartaInstancia, HTMLElement>();
    let descartePrevio = new Set<CartaInstancia>();
    /** Drawn cards whose flying copy has not landed yet (hidden in their slot). */
    const llegando = new Set<CartaInstancia>();
    /** Played cards: they already fly on their own, not to the discard pile. */
    const lanzadas = new Set<CartaInstancia>();
    /** Where a dragged card was dropped, so its flight leaves from there. */
    let soltada: { inst: CartaInstancia; center: Point; scale: number; at: number } | null = null;

    // ── Presentador: efectos visuales que pide el motor ──────────────────────
    const elemDe = (obj: Luchador): HTMLElement | null => {
      if (obj === combate.jugador) return raiz.querySelector('.heroe');
      const idx = combate.enemigos.indexOf(obj as EnemigoCombate);
      return raiz.querySelector(`.enemigo[data-idx="${idx}"]`);
    };
    const elemInvocacion = (): HTMLElement | null => raiz.querySelector('.invocacion');

    // ── Spell VFX: each card fx key has its own composition (fx/spell-fx.ts) ─
    /** Effect of the card being played and who has already shown it. */
    /** `clave` is the spell drawn (a rare card's own sequence, card-spells.ts); `fx` its generic key. */
    let hechizoCarta: {
      clave: string; id: string; fx: string; tipo: string; modo: string; objetivo?: EnemigoCombate; hecho: Set<Luchador>;
    } | null = null;
    /** Enemy acting right now (source of breaths and eye rays) and its move. */
    let actor: { e: EnemigoCombate; movimiento: string } | null = null;
    /** Spell effect the Prodigious Spell being cast shows on each enemy it hits. */
    let hechizoProdigio: string | null = null;
    const ESTADO_HECHIZO: Partial<Record<EstadoId, string>> = { veneno: 'veneno', raices: 'raices', condena: 'condena' };
    const TINTE_RAYO: [RegExp, string][] = [
      [/carmes/i, '#ff3b3b'], [/áureo|aureo/i, '#ffd75a'], [/espectral/i, '#6bd8ff'],
      [/pútrido|putrido/i, '#7cff5a'], [/necr/i, '#b46bff'],
    ];
    const cajaDe = (elem: HTMLElement | null) => {
      if (!elem) return { x: window.innerWidth / 2 - 60, y: window.innerHeight / 2 - 80, w: 120, h: 160 };
      // the figure itself, not its name plate and health bar
      const r = (elem.querySelector('.sprite') ?? elem).getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    };
    /** Smallest screen box around all of `cajas`. */
    const unirCajas = (cajas: { x: number; y: number; w: number; h: number }[]) => {
      if (!cajas.length) return cajaDe(null);
      const x0 = Math.min(...cajas.map((b) => b.x)), y0 = Math.min(...cajas.map((b) => b.y));
      const x1 = Math.max(...cajas.map((b) => b.x + b.w)), y1 = Math.max(...cajas.map((b) => b.y + b.h));
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    };
    /** Casts spell `clave` on a fighter (from the hero when the receiver is an enemy). */
    const lanzarHechizo = (clave: string, obj: Luchador, desde?: { x: number; y: number }, tinte?: string) => {
      const heroe = obj === combate.jugador;
      const campana = clave === 'condena';
      const ok = fx.hechizo(clave, campana ? cuerpoDe(obj) : cajaDe(elemDe(obj)), {
        desde: desde ?? (heroe ? undefined : centroDe(elemDe(combate.jugador))), mirando: heroe ? 1 : -1, tinte,
      });
      // Doom: the bell tolls, and the enemy's chains wait for the toll to climb
      if (ok && campana) {
        tanerCampana();
        if (!heroe) cadenas.toll(obj as EnemigoCombate, ahora() + DOOM_TOLL_AT);
      }
      // rare sequences may ask for a brief shake at their climax (never with reduced motion)
      const sacudida = ok ? fx.sacudidaHechizo(clave) : null;
      if (sacudida) setTimeout(() => sacudir(sacudida.level), sacudida.delayMs);
      return ok;
    };
    const hechizoAlHeroe = (h: NonNullable<typeof hechizoCarta>) =>
      fx.receptorHechizo(h.clave) !== 'enemies'
      && (fx.anclaHechizo(h.clave) === 'self' || h.modo === 'ninguno' || h.modo === 'propio');
    /** Shows the card's effect on `obj` if it is one of its receivers and has not shown it yet. */
    const hechizoPara = (obj: Luchador): boolean => {
      const h = hechizoCarta;
      if (!h || h.hecho.has(obj) || !fx.tieneHechizo(h.clave)) return false;
      if (obj === combate.jugador && fx.receptorHechizo(h.clave) === 'enemies') return false;
      if (h.hecho.size > 0 && (obj === combate.jugador || h.hecho.has(combate.jugador))) return false;
      if (h.modo === 'enemigo' && obj !== combate.jugador && h.objetivo && obj !== h.objetivo) return false;
      h.hecho.add(obj);
      lanzarHechizo(h.clave, obj);
      return true;
    };
    /** Card starts resolving: defences and buffs light up on the hero at once. */
    const abrirHechizoCarta = (def: CartaDef, objetivo?: EnemigoCombate) => {
      actor = null;
      barrido.reset();
      hechizoCarta = def.fx
        ? { clave: cardSpellKey(def.id, def.fx), id: def.id, fx: def.fx, tipo: def.tipo, modo: def.objetivo, objetivo, hecho: new Set() }
        : null;
      if (hechizoCarta && fx.anclaHechizo(hechizoCarta.clave) === 'self') hechizoPara(combate.jugador);
      // the Prodigious Spell looks like a random spell, grander the more it deals
      hechizoProdigio = def.id === 'conjuro-prodigioso' ? prodigiousSpell(10 + combate.jugador.conjuroEscrito) : null;
    };
    /** Card resolved: if nothing showed its effect yet, show it on its natural receivers. */
    const cerrarHechizoCarta = () => {
      const h = hechizoCarta;
      hechizoCarta = null;
      hechizoProdigio = null;
      barrido.reset();
      if (!h || h.hecho.size > 0 || !fx.tieneHechizo(h.clave)) return;
      if (hechizoAlHeroe(h)) lanzarHechizo(h.clave, combate.jugador);
      else if (h.modo === 'enemigo' && h.objetivo) lanzarHechizo(h.clave, h.objetivo);
      else for (const e of combate.enemigos.filter((x) => x.vivo)) lanzarHechizo(h.clave, e);
    };
    /** Brief white flash over the whole screen (the Dungeon Master's ray). */
    const destelloPantalla = () => {
      const capa = el('div', 'destello-dm');
      capa.setAttribute('aria-hidden', 'true');
      document.body.appendChild(capa);
      setTimeout(() => capa.remove(), 1600);
    };
    /** Speech bubble over an enemy (the Dungeon Master's lines). */
    const bocadillo = (e: EnemigoCombate, txt: string) => {
      const r = cajaDe(elemDe(e));
      const b = el('div', 'bocadillo-dm', txt);
      b.setAttribute('role', 'status');
      document.body.appendChild(b);
      // above the hood, kept inside the viewport on phones
      const w = Math.min(260, window.innerWidth - 24);
      b.style.maxWidth = `${w}px`;
      const left = Math.max(12, Math.min(window.innerWidth - w - 12, r.x + r.w / 2 - w / 2));
      b.style.left = `${left}px`;
      // above the intent chip, not over it
      const arriba = elemDe(e)?.getBoundingClientRect().top ?? r.y;
      // translateY(-100%) lifts it by its own height: keep it inside the top edge
      b.style.top = `${Math.max(b.offsetHeight + 8, Math.min(arriba, r.y) - 6)}px`;
      setTimeout(() => b.classList.add('saliendo'), 2300);
      setTimeout(() => b.remove(), 2700);
    };
    /** Feedback of volley darts still in flight (Magic Missile): each hit's runs when its dart lands. */
    const impactos = new ImpactQueue();
    /** The card's area sweep (Wrath of the Sea's wave): cast once, over every enemy. */
    const barrido = new SweepClock();
    let ctxBarrido: SpellCtx | null = null;
    /** A hit of sweep `clave` on `obj`: the first one casts the wave across every living enemy,
     *  the rest join it. Returns the ms until its crest reaches `obj`. */
    const golpeDeBarrido = (clave: string, obj: EnemigoCombate, duracionMs: number): number => {
      const h = barrido.hit(clave, obj, performance.now(), duracionMs);
      if (h.cast || !ctxBarrido) {
        const cajas = combate.enemigos.filter((e) => e.vivo || e === obj).map((e) => cajaDe(elemDe(e)));
        ctxBarrido = {
          box: unirCajas(cajas), targets: cajas, from: centroDe(elemDe(combate.jugador)), view: { w: window.innerWidth, h: window.innerHeight },
        };
        fx.hechizo(clave, ctxBarrido.box, { desde: ctxBarrido.from, mirando: -1, objetivos: cajas });
        const sacudida = fx.sacudidaHechizo(clave);
        if (sacudida) setTimeout(() => sacudir(sacudida.level), sacudida.delayMs);
      }
      return sweepImpactMs(clave, ctxBarrido, cajaDe(elemDe(obj)), h.elapsedMs) ?? 0;
    };
    /** Enemies still falling: their death plays on while the fight goes on. */
    const muertes = new DeathQueue<EnemigoCombate>();
    /** Health each fighter shows while darts fly at it, and its value after each pending dart. */
    const vidaEnVuelo = new Map<Luchador, { shown: number; queue: number[] }>();
    /** Health last drawn on each bar (where a volley's bar starts from). */
    const pvPintado = new WeakMap<Luchador, number>();
    /** Hit effect: its own spell when there is one. Returns false to fall back to particles. */
    const hechizoGolpe = (obj: Luchador, efecto: string): boolean => {
      if (actor && obj === combate.jugador && actor.e.intencion.mataAlInstante) {
        // the Dungeon Master's ray leaves his flung hands, with a full-screen flash
        const r = cajaDe(elemDe(actor.e));
        destelloPantalla();
        return lanzarHechizo('rayoDM', obj, { x: r.x + r.w * 0.45, y: r.y + r.h * 0.4 });
      }
      if (efecto === 'aliento' && actor && obj === combate.jugador) {
        // Ignifax's breath pours from the mouth; the Beholder's rays leave its eye
        const r = elemDe(actor.e)?.getBoundingClientRect();
        const rayo = /^(rayo|mirada)/i.test(actor.movimiento);
        const desde = r ? { x: r.left + r.width * (rayo ? 0.4 : 0.22), y: r.top + r.height * (rayo ? 0.3 : 0.32) } : undefined;
        const tinte = rayo ? TINTE_RAYO.find(([re]) => re.test(actor!.movimiento))?.[1] ?? '#ff5ad8' : undefined;
        return lanzarHechizo(rayo ? 'rayoOcular' : 'aliento', obj, desde, tinte);
      }
      if (hechizoProdigio && !actor && obj !== combate.jugador) {
        hechizoCarta?.hecho.add(obj);
        if (hechizoProdigio === 'rayoDM') destelloPantalla();
        return lanzarHechizo(hechizoProdigio, obj);
      }
      // thorns also deal 'raices' damage: only real roots (the card, or roots crushing) coil
      if (efecto === 'raices' && hechizoCarta?.fx !== 'raices' && !(actor && obj === actor.e)) return false;
      // a rare card's hit draws its own sequence (one storm bolt per enemy hit…); only attacks
      // repeat it on a receiver that already showed it (the poison a skill then triggers is plain)
      const repetida = !!hechizoCarta?.hecho.has(obj) && hechizoCarta.tipo !== 'ataque';
      const clave = hitSpell(actor || repetida ? null : hechizoCarta, efecto);
      if (!fx.tieneHechizo(clave)) return false;
      if (hechizoCarta && efecto === hechizoCarta.fx) hechizoCarta.hecho.add(obj);
      return lanzarHechizo(clave, obj, obj === combate.jugador && actor ? centroDe(elemDe(actor.e)) : undefined);
    };

    const ui: Presentador = {
      render,
      espera,
      async fxGolpe(obj, dano, efecto = 'tajo') {
        // volley darts (Magic Missile) fly one right after another: each one's number, hit and
        // shake wait for it to land. Any other hit first lets the pending darts land.
        // An area sweep (Wrath of the Sea) casts one wave for every enemy: each hit joins it
        // and its feedback waits for the crest to reach that enemy.
        const clave = actor ? '' : hitSpell(hechizoCarta, efecto);
        let rafaga = actor ? null : fx.rafagaHechizo(clave);
        // Doom consuming an enemy: nothing lands on it, its death by Doom plays instead
        const remate = obj !== combate.jugador && isDoomConsumption(efecto, !!hechizoCarta);
        const barre = obj !== combate.jugador && !actor && !remate ? fx.barridoHechizo(clave) : null;
        if (!rafaga && barre === null) await impactos.settle();
        if (remate) rafaga = null;
        else if (barre !== null) {
          hechizoCarta?.hecho.add(obj);
          rafaga = { impactMs: golpeDeBarrido(clave, obj as EnemigoCombate, barre), gapMs: 0 };
        } else if (!hechizoGolpe(obj, efecto)) {
          const { x, y } = centroDe(elemDe(obj));
          fx.emitir(efecto, x, y);
          rafaga = null; // no dart to wait for
        }
        const alImpactar = () => {
          const vuelo = vidaEnVuelo.get(obj);
          if (rafaga && vuelo) {
            vuelo.shown = vuelo.queue.shift() ?? obj.pv;
            if (!vuelo.queue.length) vidaEnVuelo.delete(obj);
          }
          const elem = elemDe(obj);
          if (!remate) audio.sfx(dano > 0 ? efecto : 'bloqueo');
          if (remate && dano > 0) {
            numeroFlotante(elem, `${dano}`, 'dano');
          } else if (dano > 0) {
            if (obj === combate.jugador) spriteActual().play('hit');
            else spriteEnemigo(obj as EnemigoCombate)?.play('hit');
            numeroFlotante(elem, `${dano}`, 'dano');
            elem?.classList.add('golpeado');
            setTimeout(() => elem?.classList.remove('golpeado'), 350);
            sacudir(dano >= 12 ? 3 : dano >= 7 ? 2 : 1);
          } else if (esDungeonMaster(obj)) {
            // the screen takes the blow and shakes; the DM does not even blink
            spriteEnemigo(obj as EnemigoCombate)?.play('hit');
            numeroFlotante(elem, '🛡️ ∞', 'bloqueo');
          } else {
            numeroFlotante(elem, 'Bloqueado', 'bloqueo');
          }
          render();
        };
        if (rafaga) {
          const vuelo = vidaEnVuelo.get(obj) ?? { shown: pvPintado.get(obj) ?? obj.pv, queue: [] };
          vuelo.queue.push(obj.pv);
          vidaEnVuelo.set(obj, vuelo);
          impactos.schedule(rafaga.impactMs, alImpactar);
          await espera(rafaga.gapMs);
          return;
        }
        alImpactar();
        await espera(260);
      },
      async fxBloqueo(obj, n) {
        await impactos.settle();
        const elem = elemDe(obj);
        // the card's own effect (a shield, bark, moonlight…) stands for the block it grants
        const yaMostrado = obj === combate.jugador && !!hechizoCarta?.hecho.has(obj);
        if (!yaMostrado && !hechizoPara(obj)) lanzarHechizo('bloqueo', obj);
        audio.sfx('bloqueo');
        numeroFlotante(elem, `+${n} 🛡`, 'bloqueo');
        render();
        await espera(200);
      },
      async fxEstado(obj, estado, n) {
        await impactos.settle();
        const elem = elemDe(obj);
        const signo = n > 0 ? '+' : '';
        if (!hechizoPara(obj)) {
          // poison, roots and doom from other sources (relics, powers, enemies) show theirs too
          const clave = n > 0 ? ESTADO_HECHIZO[estado] : undefined;
          if (clave && !(hechizoCarta?.fx === clave && hechizoCarta.hecho.has(obj))) lanzarHechizo(clave, obj);
        }
        audio.sfx('estado');
        numeroFlotante(elem, `${ICONO_ESTADO[estado]} ${signo}${n} ${NOMBRE_ESTADO[estado]}`, 'estado');
        render();
        await espera(260);
      },
      async fxCura(obj, n) {
        await impactos.settle();
        const elem = elemDe(obj);
        const { x, y } = centroDe(elem);
        hechizoPara(obj);
        fx.emitir('cura', x, y);
        audio.sfx('cura');
        numeroFlotante(elem, `+${n}`, 'cura');
        render();
        await espera(220);
      },
      async fxMuerte(e, causa) {
        // the darts already cast land (and show their numbers) before it falls
        await impactos.settle();
        const elem = elemDe(e);
        const { x, y } = centroDe(elem);
        const s = spriteEnemigo(e);
        audio.sfx('muerte');
        if (causa === 'condena') {
          // consumed by Doom: its chains close on it, the soul flees and is dragged under
          const caja = s ? s.bodyBox() : cajaDe(elem);
          cadenas.drop(e);
          fx.hechizo('almaCondenada', caja);
          setTimeout(() => audio.sfx('cadenasCondena'), DOOM_DRAG_AT * 1000);
          almaHasta = Math.max(almaHasta, performance.now() + DOOMED_SOUL_DURATION * 1000);
        } else fx.emitir('muerte', x, y);
        // the body falls in parallel: the rest of an area attack or a multi-hit does not wait
        if (s) s.play('death');
        else elem?.classList.add('muriendo');
        muertes.start(e, s ? MUERTE_SPRITE_MS : MUERTE_CSS_MS, () => {
          if (s) {
            s.destroy();
            spritesEnemigo.delete(e);
          }
          render();
        });
      },
      async fxEsperarMuerte(e) {
        await muertes.wait(e);
      },
      async fxMensaje(txt) {
        await impactos.settle();
        anuncio(txt);
        await espera(350);
      },
      async fxDialogo(e, txt) {
        bocadillo(e, txt);
        await espera(900);
      },
      async fxMuerteHeroe() {
        // wait for the bolt to land, then the hero collapses and fades for good
        await espera(380);
        audio.sfx('muerte');
        sacudir(3);
        spriteActual().play('death');
        await espera(1100);
      },
      async fxEnemigoActua(e) {
        actor = { e, movimiento: e.intencion.nombre ?? '' };
        const s = spriteEnemigo(e);
        if (s) {
          // the damage waits for the blow (or the spell) to land
          const impacto = s.play(e.intencion.dano !== undefined || e.intencion.mataAlInstante ? 'attack' : 'spell');
          await espera(impacto || 350);
          return;
        }
        const elem = elemDe(e);
        elem?.classList.add('actuando');
        setTimeout(() => elem?.classList.remove('actuando'), 450);
        await espera(300);
      },
      async fxFuriaPerdida() {
        audio.sfx('furiaPerdida');
        anuncio('💨 ¡La Furia se desvanece!', 'anuncio-furia-perdida');
        sacudir(1);
        await espera(500);
      },
      async fxParticulas(obj, efecto) {
        await impactos.settle();
        const { x, y } = centroDe(elemDe(obj));
        if (!hechizoGolpe(obj, efecto)) fx.emitir(efecto, x, y);
        render();
        await espera(220);
      },
      async fxInvocacionGolpe(dano) {
        const elem = elemInvocacion();
        const { x, y } = centroDe(elem);
        fx.emitir('golpeEnemigo', x, y);
        audio.sfx(dano > 0 ? 'golpeEnemigo' : 'bloqueo');
        if (dano > 0) {
          spriteInvocacion()?.play('hit');
          numeroFlotante(elem, `${dano}`, 'dano');
          elem?.classList.add('golpeado');
          setTimeout(() => elem?.classList.remove('golpeado'), 350);
        }
        render();
        await espera(240);
      },
      async fxInvocacionMuerte() {
        const elem = elemInvocacion();
        const { x, y } = centroDe(elem);
        fx.emitir('muerte', x, y);
        audio.sfx('muerte');
        const s = spriteInvocacion();
        if (s) {
          s.play('death');
          await espera(750);
        } else {
          elem?.classList.add('muriendo');
          await espera(450);
        }
        render();
      },
      async fxInvocacionAtaca() {
        const elem = elemInvocacion();
        const { x, y } = centroDe(elem);
        const s = spriteInvocacion();
        if (s) {
          await espera(s.play('attack'));
          fx.emitir('zarpa', x, y);
          return;
        }
        fx.emitir('zarpa', x, y);
        elem?.classList.add('inv-ataca');
        setTimeout(() => elem?.classList.remove('inv-ataca'), 300);
        await espera(120);
      },
      async fxInvocacionCura(n) {
        const elem = elemInvocacion();
        const { x, y } = centroDe(elem);
        fx.emitir('cura', x, y);
        audio.sfx('cura');
        numeroFlotante(elem, `+${n}`, 'cura');
        render();
        await espera(220);
      },
      async fxDado(n, caras, theme) {
        audio.sfx('carta');
        await rodarDado(n, caras, theme); // icosaedro 3D (WebGL) rodando por la pantalla
        if (n === caras) fx.estallido('estrellas');
      },
      async fxDadoVentaja(a, b, caras, theme) {
        audio.sfx('carta');
        await rodarDados([a, b], caras, theme); // los dos dados ruedan a la vez
        if (Math.max(a, b) === caras) fx.estallido('estrellas');
      },
      elegirCarta(cartas, titulo, opciones) {
        // mandatory choices (a forced discard) show no way out
        const cancelable = opciones?.cancelable !== false;
        return new Promise((resolver) => {
          const overlay = document.getElementById('overlay')!;
          overlay.innerHTML = '';
          overlay.className = 'overlay-activo';
          const panel = el('div', 'panel-recompensa panel-mejora');
          panel.innerHTML = `<h2>🔎 ${titulo}</h2><div class="mejora-rejilla"></div>
            ${cancelable ? '<button class="btn-saltar">Cancelar <span class="atajo">[Esc]</span></button>' : ''}`;
          overlay.appendChild(panel);
          const rejilla = panel.querySelector('.mejora-rejilla') as HTMLElement;

          const cerrar = (elegida: CartaInstancia | null) => {
            window.removeEventListener('keydown', teclado);
            overlay.className = '';
            overlay.innerHTML = '';
            resolver(elegida);
          };
          cartas.forEach((inst, i) => {
            const c = renderCarta(defDe(inst), modsEnCombate(null, defDe(inst)));
            if (inst.mejorada) c.classList.add('carta-mejorada');
            c.classList.add('carta-recompensa');
            c.style.setProperty('--retraso', `${Math.min(i * 0.04, 0.5)}s`);
            c.addEventListener('click', () => cerrar(inst));
            rejilla.appendChild(c);
          });
          const teclado = (ev: KeyboardEvent) => {
            if (ev.code === 'Escape' && cancelable) cerrar(null);
          };
          window.addEventListener('keydown', teclado);
          panel.querySelector('.btn-saltar')?.addEventListener('click', () => cerrar(null));
        });
      },
    };

    const combate = new Combate(run, defs, rng, ui, esJefe || esElite);

    // ── Action queue ─────────────────────────────────────────────────────────
    // Cards and "end turn" chosen while something resolves wait here instead of
    // being refused. Each one is validated when its turn comes, not when queued.
    const cola = new ActionQueue<AccionJugador>({
      validate: (a) => {
        if (a.kind !== 'card') return { ok: true };
        const v = checkCardAction(a, {
          inHand: (c) => combate.jugador.mano.includes(c),
          canPlay: (c) => combate.puedeJugar(c),
          reason: (c) => motivoNoJugable(c),
          needsTarget: (c) => defDe(c).objetivo === 'enemigo',
          isAlive: (e) => e.vivo,
          // screen order, so a redirect goes to the nearest enemy on the left
          livingTargets: () => huecosEnemigos.filter((e) => e.vivo),
        });
        if (!v.ok) return v;
        if (v.action && v.action.target) {
          anuncio(`«${defDe(a.card).nombre}» cambia de objetivo: ${v.action.target.nombre}`);
          return { ok: true, action: { kind: 'card', card: a.card, target: v.action.target } };
        }
        return { ok: true };
      },
      execute: async (a) => {
        if (a.kind === 'start') {
          await combate.iniciar();
          // final scene: the Dungeon Master opens with his classic line
          const dm = combate.enemigos.find((e) => esDungeonMaster(e));
          if (dm && !combate.terminado) await ui.fxDialogo!(dm, FRASES_DM.inicio);
        }
        else if (a.kind === 'endTurn') await combate.terminarTurno();
        else await jugar(a.card, a.target);
        // the next action starts once the enemies it killed have finished falling
        await muertes.settle();
      },
      onDiscard: (a, motivo) => {
        if (a.kind === 'card') anuncio(motivo, 'anuncio-error');
      },
      onChange: () => render(),
    });
    const esCartaEnCola = (inst: CartaInstancia) => (a: AccionJugador) => a.kind === 'card' && a.card === inst;
    const finTurnoEnCola = (a: AccionJugador) => a.kind === 'endTurn';
    /** Queued cards plus the running one if it has not been paid yet (still in hand). */
    function cartasPorPagar(): AccionCarta[] {
      const cartas = cola.pending.filter((a): a is AccionCarta => a.kind === 'card');
      const actual = cola.current;
      if (actual?.kind === 'card' && combate.jugador.mano.includes(actual.card)) cartas.unshift(actual);
      return cartas;
    }
    /** Why `inst` cannot be queued now (energy and spell slots left after the queue), or null. */
    function motivoNoEncolable(inst: CartaInstancia): string | null {
      if (combate.terminado || cola.isClosed) return 'El combate ha terminado';
      if (cola.indexOf(finTurnoEnCola) >= 0) return 'Fin de turno pendiente (tócalo para cancelarlo)';
      const def = defDe(inst);
      if (def.tipo === 'maldicion' && def.purgar === undefined) return '☠️ Las maldiciones no se pueden jugar';
      const porPagar = cartasPorPagar();
      const energia = forecastEnergy(combate.jugador.energia, porPagar, (a) => combate.costeEfectivo(defDe(a.card)));
      if (energia < combate.costeEfectivo(def)) return 'Sin energía suficiente';
      // (paladin) one Smite at a time: greyed out while one is prepared (or about to be)
      if (def.castigo && (combate.jugador.castigos.length > 0 || porPagar.some((a) => defDe(a.card).castigo))) {
        return '🌟 Ya tienes un Castigo preparado';
      }
      if (def.requiereConjuro) {
        const libres = combate.jugador.conjuros.filter((c) => !c.gastado && c.nivel >= def.requiereConjuro!).length;
        const reservados = porPagar.filter((a) => defDe(a.card).requiereConjuro).length;
        if (libres - reservados <= 0) return `◈ Necesitas un espacio de conjuro de nivel ${def.requiereConjuro}+`;
      }
      return null;
    }
    /** Queues a card (it runs at once if nothing is resolving). */
    function encolarCarta(inst: CartaInstancia, objetivo?: EnemigoCombate) {
      if (cola.current?.kind === 'card' && cola.current.card === inst) return; // already flying
      const motivo = motivoNoEncolable(inst);
      if (motivo) {
        anuncio(motivo, 'anuncio-error');
        return;
      }
      if (cartaPendiente === inst) {
        cartaPendiente = null;
        modoObjetivo = false;
      }
      cola.enqueue({ kind: 'card', card: inst, target: objetivo });
    }
    /** Takes a queued card back to the hand. True if it was queued. */
    function sacarDeCola(inst: CartaInstancia): boolean {
      return cola.remove(esCartaEnCola(inst));
    }
    /** "End turn" toggles: queues it, or cancels it if already waiting. */
    function pulsarFinTurno() {
      if (combate.terminado || cola.isClosed) return;
      if (cola.remove(finTurnoEnCola)) return;
      // the enemy turn (and the draw of the next hand) is already an end turn running:
      // a second one would skip the player's next turn
      if (cola.current?.kind === 'endTurn') return;
      cartaPendiente = null;
      modoObjetivo = false;
      cola.enqueue({ kind: 'endTurn' });
    }
    /** A pointer gesture on a hand card is in progress: the hand must not be rebuilt under it. */
    let gestoMano = false;

    // ── Render ───────────────────────────────────────────────────────────────
    function render() {
      // a boss phase change (Abaddon rising) crossfades to the other version of the boss song
      if (esJefe && !combate.terminado && combate.enemigos.some((e) => e.vivo)) {
        audio.reproducirTema(combatTheme(run.capitulo, true, combate.enemigos.filter((e) => e.vivo).map((e) => e.def), run.escenario));
      }
      renderBarra();
      renderJugador();
      renderEnemigos();
      // Doom's chains follow each enemy's Condena against its health
      for (const e of combate.enemigos) cadenas.set(e, e.vivo ? e.estados.condena ?? 0 : 0, e.pv, ahora());
      renderMano();
      renderBotonFinTurno();
      renderEnergia();
      $('.pila-robo').innerHTML = `🂠<span>${combate.jugador.mazo.length}</span>`;
      $('.pila-descarte').innerHTML = `🗑<span>${combate.jugador.descarte.length}</span>`;
      altoEscenario(); // the scene grows with its fighters (portrait phones)
      comprobarFinal();
    }

    function renderBarra() {
      const r = run.reliquias
        .map((x) => `<span class="reliquia" data-tip="<strong>${relicIcon(x, 20)} ${x.nombre}</strong><br>${x.texto}">${relicIcon(x)}</span>`)
        .join('');
      $('.barra-superior').innerHTML = `
        <span class="bs-clase">${NOMBRE_CLASE[run.clase]}</span>
        <span class="bs-pv">❤️ ${combate.jugador.pv}/${combate.jugador.pvMax}</span>
        <span class="bs-reliquias">${r}</span>
        <span class="bs-piso">${nombreCapitulo} · Sala ${run.piso}</span>
      `;
    }

    function barraVida(l: Luchador): string {
      // while volley darts fly, the bar keeps the health they have not taken yet
      const pv = vidaEnVuelo.get(l)?.shown ?? l.pv;
      pvPintado.set(l, pv);
      const pct = Math.max(0, (pv / l.pvMax) * 100);
      return `
        <div class="vida">
          <div class="vida-relleno" style="width:${pct}%"></div>
          <span class="vida-texto">${pv}/${l.pvMax}</span>
        </div>`;
    }

    const ESTADOS_MALOS = ['raices', 'oscuridad', 'condena'];
    function fichasEstados(l: Luchador): string {
      const fichas = Object.entries(l.estados)
        .filter(([k, v]) => v !== 0 && v !== undefined && k !== 'raicesExtra')
        .map(([k, v]) => {
          // Condena que ya alcanza sus PV: el enemigo morirá al final de su turno
          const letal = k === 'condena' && v! >= l.pv;
          const clase = letal ? 'estado-letal' : (v! < 0 || ESTADOS_MALOS.includes(k)) ? 'estado-neg' : '';
          return `<span class="estado ${clase}" data-tip="${tipEstado(k, v!)}">${ICONO_ESTADO[k]}${v}</span>`;
        })
        .join('');
      return `<div class="estados">${fichas}</div>`;
    }

    /** Panel de la invocación del druida (vida, forma y pasivas). */
    function renderInvocacionHTML(): string {
      const inv = combate.jugador.invocacion;
      if (!inv || inv.vida <= 0) return '';
      const emoji = SPRITE_INVOCACION[inv.forma] ?? '🐾';
      const dmg = inv.efimera ? (inv.dano ?? 0) : Math.max(1, Math.round(inv.vida * 0.3));
      const pasivas = inv.efectos.map((e) => PASIVA_INVOCACION[e]).filter(Boolean);
      const cuando = inv.efimera
        ? `Si sobrevive al turno enemigo, golpea por ${dmg} y se desvanece.`
        : `Ataca por ${dmg} cada turno.`;
      const tip = `<strong>${emoji} Invocación</strong><br>Vida ${inv.vida}/${inv.vidaMax}<br>${cuando}${
        pasivas.length ? `<br>${pasivas.map((p) => `· ${p}`).join('<br>')}` : ''
      }`.replace(/"/g, '&quot;');
      const pct = Math.max(0, (inv.vida / inv.vidaMax) * 100);
      return `
        <div class="invocacion ${inv.efimera ? 'inv-efimera' : ''}" data-tip="${tip}">
          ${spriteInvocacion() ? '<div class="sprite sprite-invocacion sprite-ilustrado"></div>' : `<div class="sprite sprite-invocacion">${emoji}</div>`}
          <div class="vida vida-inv">
            <div class="vida-relleno vida-relleno-inv" style="width:${pct}%"></div>
            <span class="vida-texto">${inv.vida}/${inv.vidaMax}</span>
          </div>
        </div>`;
    }

    /** Indicador flotante del Conjuro Prodigioso (daño y efectos actuales). */
    function indicadorConjuro(): string {
      const j = combate.jugador;
      const dmg = 10 + (j.conjuroEscrito ?? 0);
      const efectos = (j.conjuroEfectos ?? []).map((e) => `· ${EFECTO_CONJURO[e]}`).join('<br>');
      const tip = `<strong>📜 Conjuro Prodigioso</strong><br>Inflige ${dmg} de daño.${
        efectos ? `<br>${efectos}` : ''
      }`.replace(/"/g, '&quot;');
      return `<div class="conjuro-ficha" data-tip="${tip}">📜 ${dmg}</div>`;
    }

    /** Floating badge of the paladin's prepared Smite (what the next attack carries). */
    function indicadorCastigo(): string {
      const c = combate.jugador.castigos[0];
      if (!c) return '';
      const ficha = resumenCastigo(c);
      const tip = `<strong>${ficha.icono} ${c.nombre}</strong><br>${ficha.texto}`.replace(/"/g, '&quot;');
      return `<div class="castigo-ficha castigo-${c.elemento}" data-tip="${tip}">${ficha.icono} ${ficha.corto}</div>`;
    }

    function renderJugador() {
      const j = combate.jugador;
      const forma = formaActual();
      const sprite = '<div class="sprite sprite-jugador sprite-silueta"></div>';
      const furiaActiva = j.furiaFuerza + j.furiaDestreza > 0;
      const temporales = j.efectosTemporales
        .map(
          (e) =>
            `<span class="efecto-temporal" data-tip="<strong>✦ ${e.etiqueta}</strong><br>${[
              e.fuerza ? `+${e.fuerza} Fuerza` : '',
              e.destreza ? `+${e.destreza} Destreza` : '',
              e.robaExtra ? `+${e.robaExtra} carta/turno` : '',
              e.curaTurno ? `cura ${e.curaTurno}/turno` : '',
            ]
              .filter(Boolean)
              .join(' · ')} — quedan ${e.turnos} turnos.">✦ ${e.etiqueta} (${e.turnos})</span>`,
        )
        .join('');
      const conjuro = j.conjuroActivo ? indicadorConjuro() : '';
      $('.lado-jugador').innerHTML = `
        <div class="heroe ${furiaActiva ? 'con-furia' : ''} ${forma ? 'transformado' : ''} ${
          (j.estados.espejismo ?? 0) > 0 ? 'con-espejismo' : ''
        } ${j.castigos.length > 0 ? 'con-castigo' : ''}" data-luchador="jugador" style="--acento-heroe:${spriteActual().accent}">
          ${j.bloqueo > 0 ? `<div class="bloqueo-ficha">🛡️${j.bloqueo}</div>` : ''}
          ${conjuro}
          ${indicadorCastigo()}
          ${sprite}
          ${barraVida(j)}
          ${fichasEstados(j)}
          <div class="temporales">${temporales}</div>
          ${furiaActiva ? `<div class="furia-ficha" data-tip="<strong>🔥 Furia</strong><br>Fuerza/Destreza acumulada. Se rompe si acabas la ronda sin recibir daño (lo bloqueado no cuenta).">🔥 Furia +${j.furiaFuerza}F${j.furiaDestreza ? ` +${j.furiaDestreza}D` : ''}</div>` : ''}
        </div>
        ${renderInvocacionHTML()}`;
      const actual = spriteActual();
      $('.sprite-silueta')?.appendChild(actual.element);
      // glows that used to be CSS filters on the emoji: Fury, druid form, Mirror Image
      actual.setAura(furiaActiva ? '#ff6b35' : forma ? '#7dba4e' : null);
      actual.setEchoes((j.estados.espejismo ?? 0) > 0);
      actual.setFlames(j.castigos[0] ? llamasDeCastigo(j.castigos[0]) : null);
      const inv = spriteInvocacion();
      if (inv) {
        $('.sprite-invocacion.sprite-ilustrado')?.appendChild(inv.element);
        inv.setAura(combate.jugador.invocacion?.efimera ? '#a15ce0' : null);
      }
      // a new form arrives with a roar and a burst of its colour
      if (forma !== formaMostrada) {
        if (forma) actual.play('spell');
        formaMostrada = forma;
      }
    }

    function textoIntencion(e: EnemigoCombate, p?: PrevisionAtaque): string {
      const m = e.intencion;
      // the Dungeon Master's ray: nobody knows what is coming… or everybody does
      if (m.cita) return `<span class="int-ataque int-dm">${m.mataAlInstante ? '⚡' : '📜'} ??? <small>· ${m.cita}</small></span>`;
      if (e.saltaAccion) return '<span class="int-dormido">💤</span>'; // saltará su acción
      if (m.dano !== undefined) {
        const d = combate.danoIntencion(e);
        // daño "natural" del enemigo (su Fuerza propia) sin Débil/Raíces ni Vulnerable
        const natural = Math.max(0, m.dano + (e.estados.fuerza ?? 0));
        // verde si lo hemos reducido (Débil/Raíces); rojo si Vulnerable lo amplifica
        const mod = d < natural ? 'int-mod-baja' : d > natural ? 'int-mod-alta' : '';
        const veces = m.veces && m.veces > 1 ? `×${m.veces}` : '';
        // the raw hit (block and summons are not taken off); 🌿 if the roots will crush it
        const raices = p?.aplastado ? ' <small class="int-raices">🌿</small>' : '';
        return `<span class="int-ataque">⚔️ <span class="${mod}">${d}</span>${veces}${raices}</span>`;
      }
      if (m.invocar) return `<span class="int-mejora">👥</span>`;
      if (m.devorar) return `<span class="int-mejora">🍖</span>`;
      if (m.intencion === 'defensa') return `<span class="int-defensa">🛡️ ${m.bloqueo ?? ''}</span>`;
      if (m.intencion === 'mejora') return `<span class="int-mejora">⬆️</span>`;
      if (m.intencion === 'perjuicio') return `<span class="int-perjuicio">☠️</span>`;
      return '<span>?</span>';
    }

    /** Tooltip lines that break an attack intent down: how each hit is worked out. */
    function desgloseIntencion(e: EnemigoCombate, p?: PrevisionAtaque): string {
      const m = e.intencion;
      if (!p || m.dano === undefined || m.cita) return '';
      const st = e.estados;
      const partes = [`${m.dano} base`];
      if (st.fuerza) partes.push(`${st.fuerza > 0 ? '+' : '−'}${Math.abs(st.fuerza)} Fuerza`);
      if (st.raices) partes.push(`−${st.raices} Raíces`);
      if (st.oscuridad) partes.push(`−${st.oscuridad} Oscuridad`);
      if ((st.debil ?? 0) > 0) partes.push('Débil −25 %');
      if (combate.vulnerableAlGolpe() > 0) partes.push('tu Vulnerable +50 %');
      const lineas: string[] = [];
      if (partes.length > 1) lineas.push(`Cada golpe: ${partes.join(' · ')} = ${p.porGolpe}`);
      if (p.veces > 1) lineas.push(`${p.porGolpe} × ${p.veces} = ${p.porGolpe * p.veces} en total`);
      if (p.aplastado) lineas.push('🌿 Las raíces lo aplastan: no llegará a atacarte');
      return lineas.map((l) => `<br>${l}`).join('');
    }

    function renderEnemigos() {
      const cont = $('.lado-enemigos');
      cont.innerHTML = '';
      huecosEnemigos = layoutSlots(huecosEnemigos, combate.enemigos, (e) => e.vivo);
      const prevision = combate.previsionAtaques();
      for (const e of huecosEnemigos) {
        const idx = combate.enemigos.indexOf(e);
        if (!e.vivo) {
          cont.appendChild(huecoEnemigo(e));
          continue;
        }
        const div = el('div', 'enemigo');
        div.dataset.idx = String(idx);
        const escala = e.def.escala ?? 1;
        const objetivoSel = (modoObjetivo || cartaPendiente) && idx === objetivoIdxValido();
        if (cartaPendiente || modoObjetivo) div.classList.add('targeteable');
        if (objetivoSel) div.classList.add('objetivo-activo');
        const tipInt: Record<string, string> = {
          ataque: 'Pretende atacarte', defensa: 'Va a defenderse',
          mejora: 'Va a potenciarse', perjuicio: 'Va a debilitarte', desconocido: '…',
        };
        // its next move is only revealed when the player's turn begins
        const intencion = combate.intencionOculta(e)
          ? '<div class="intencion intencion-oculta" data-tip="Ya ha actuado: verás qué trama cuando empiece tu turno.">…</div>'
          : `<div class="intencion" data-tip="<strong>${e.intencion.nombre}</strong><br>${
            tipInt[e.intencion.intencion]
          }.${desgloseIntencion(e, prevision.get(e))}${e.intencion.maldicion ? '<br>☠️ Te mete una maldición entre tus cartas (solo este combate).' : ''}${e.intencion.perforante ? '<br>🎯 Atraviesa tu bloqueo (sin romperlo).' : ''}${e.intencion.bloqueoAliados ? `<br>🛡️ Da ${e.intencion.bloqueoAliados} de bloqueo a todos los enemigos.` : ''}">${textoIntencion(e, prevision.get(e))}</div>`;
        div.innerHTML = `
          ${intencion}
          ${esDungeonMaster(e)
            ? '<div class="bloqueo-ficha bloqueo-dm" data-tip="<strong>🛡️ Pantalla del DM</strong><br>Bloqueo infinito: nada de lo que hagas le llega.">🛡️∞ <small>Pantalla del DM</small></div>'
            : e.bloqueo > 0 ? `<div class="bloqueo-ficha">🛡️${e.bloqueo}</div>` : ''}
          ${spriteEnemigo(e)
            ? `<div class="sprite sprite-enemigo sprite-ilustrado" style="--esc:${escala}"></div>`
            : `<div class="sprite sprite-enemigo" style="font-size:${escala * 4.2}rem">${e.def.arte}</div>`}
          <div class="enemigo-nombre">${e.nombre}</div>
          ${
            e.def.rasgo
              ? `<div class="rasgo-jefe" data-tip="<strong>★ ${e.def.rasgo.nombre}</strong><br>${e.def.rasgo.texto}">★ ${e.def.rasgo.nombre}</div>`
              : ''
          }
          ${barraVida(e)}
          ${fichasEstados(e)}
        `;
        div.addEventListener('click', () => {
          if (cartaPendiente) jugarSobre(idx);
        });
        const se = spriteEnemigo(e);
        if (se) {
          div.querySelector('.sprite-ilustrado')?.appendChild(se.element);
          // bosses burn brighter once enraged or back from the phylactery
          se.setIntensity(e.rasgoUsado || e.filacteriaUsada ? 2 : 1);
        }
        cont.appendChild(div);
      }
    }

    /** Invisible stand-in with the dead enemy's footprint, so the others keep their place. */
    function huecoEnemigo(e: EnemigoCombate): HTMLElement {
      const div = el('div', 'enemigo enemigo-hueco');
      div.setAttribute('aria-hidden', 'true');
      const escala = e.def.escala ?? 1;
      // still falling: its body stays visible in the gap until the death ends
      const cayendo = muertes.dying(e);
      if (cayendo) {
        div.classList.add('hueco-muriendo');
        div.style.setProperty('--retraso-muerte', `-${Math.round(muertes.elapsed(e))}ms`);
      }
      div.innerHTML = `
        <div class="intencion">·</div>
        ${ENEMY_RIGS[e.def.id]
          ? `<div class="sprite sprite-enemigo sprite-ilustrado" style="--esc:${escala}"><div class="sprite-marioneta"></div></div>`
          : `<div class="sprite sprite-enemigo" style="font-size:${escala * 4.2}rem">${e.def.arte}</div>`}
        <div class="enemigo-nombre">${e.nombre}</div>
        ${e.def.rasgo ? `<div class="rasgo-jefe">★ ${e.def.rasgo.nombre}</div>` : ''}
        ${barraVida(e)}
        <div class="estados"></div>`;
      const se = cayendo ? spritesEnemigo.get(e) : undefined;
      if (se) div.querySelector('.sprite-marioneta')?.replaceWith(se.element); // the stand-in makes way for the body
      return div;
    }

    function objetivoIdxValido(): number {
      const vivos = combate.enemigos.map((e, i) => (e.vivo ? i : -1)).filter((i) => i >= 0);
      if (vivos.length === 0) return -1;
      if (!vivos.includes(objetivoIdx)) objetivoIdx = vivos[0];
      return objetivoIdx;
    }

    function renderEnergia() {
      const tipPiramide =
        '<strong>◈ Espacios de conjuro</strong><br>' +
        'Las cartas de conjuro gastan el espacio libre de MAYOR nivel y escalan con él. ' +
        'No se recuperan hasta acabar el combate (salvo cartas de recuperación).<br>' +
        '<em>Se disponen en pirámide (nivel 1 abajo, nivel 3 arriba). La recuperación ' +
        'devuelve el de MENOR nivel; Sacrificio Arcano, el de MAYOR.</em>';
      // Pirámide: una fila por nivel, el más alto arriba y centrado.
      const filas = [3, 2, 1]
        .map((nivel) => {
          const espacios = combate.jugador.conjuros.filter((c) => c.nivel === nivel);
          if (espacios.length === 0) return '';
          return `<div class="fila-conjuro">${espacios
            .map(
              (c) =>
                `<span class="espacio nivel-${c.nivel} ${c.gastado ? 'gastado' : ''}"
                  data-tip="${tipPiramide}<br><em>Este espacio: nivel ${c.nivel} · ${
                    c.gastado ? 'gastado' : 'libre'
                  }.</em>">◈<i>${c.nivel}</i></span>`,
            )
            .join('')}</div>`;
        })
        .join('');
      const conjuros = combate.jugador.conjuros.length
        ? `<div class="conjuros piramide">${filas}</div>`
        : '';
      $('.energia').innerHTML = `
        <div class="orbe ${combate.jugador.energia === 0 ? 'orbe-vacio' : ''}"
          data-tip="<strong>Energía</strong><br>Coste para jugar cartas. Se recupera cada turno.">
          ${combate.jugador.energia}<span>/${combate.jugador.energiaMax}</span>
        </div>${conjuros}`;
    }

    /** Live modifiers for a card's text: every state-dependent number (Strength,
     *  Dexterity, Weak, Frail, relics, Fury, Doom… and the target's Vulnerable
     *  when the target is known) and the real cost. Hand and zoom share it. */
    function modsEnCombate(objetivo: EnemigoCombate | null | undefined, def: CartaDef): ModsCarta {
      return {
        valores: combate.valoresDeCarta(def, objetivo?.vivo ? objetivo : undefined),
        coste: () => combate.costeEfectivo(def),
      };
    }

    /** The button tells whether an end turn is queued or the enemy turn is running. */
    function renderBotonFinTurno() {
      const btn = $('.btn-fin-turno');
      const pendiente = cola.indexOf(finTurnoEnCola) >= 0;
      const enCurso = cola.current?.kind === 'endTurn';
      btn.classList.toggle('fin-pendiente', pendiente);
      btn.classList.toggle('turno-enemigo', enCurso && !pendiente);
      const html = pendiente
        ? 'Fin de turno<span class="atajo">⏳</span>'
        : enCurso
          ? 'Turno enemigo<span class="atajo">…</span>'
          : 'Fin de turno<span class="atajo">[E]</span>';
      if (btn.innerHTML !== html) btn.innerHTML = html;
      btn.title = pendiente ? 'Toca para cancelar el fin de turno' : '';
    }

    function renderMano() {
      // rebuilding the hand under a finger (or mouse) would drop the gesture: repaint on release
      if (gestoMano) return;
      const mano = $('.mano');
      const jugador = combate.jugador;
      const cartas = jugador.mano;
      // cards gone from the hand to the discard pile (end of turn, discard effects) fly there;
      // the exhausted ones (Spectral Ray, effects that exhaust from the hand) burn away in place
      const enMano = new Set(cartas);
      let nDescartes = 0;
      const agotadas: HTMLElement[] = [];
      for (const [inst, viejo] of elemPorCarta) {
        if (enMano.has(inst)) continue;
        llegando.delete(inst);
        if (lanzadas.delete(inst)) continue;
        if (jugador.descarte.includes(inst)) {
          // what you could not afford (or a curse you cannot play) flies dimmed, as it was in hand
          const def = defDe(inst);
          const apagada = combate.costeEfectivo(def) > jugador.energia || (def.tipo === 'maldicion' && def.purgar === undefined);
          flyDiscard(viejo, $('.pila-descarte'), nDescartes++, apagada);
        }
        else if (jugador.agotadas.includes(inst)) agotadas.push(viejo);
      }
      agotadas.forEach((viejo, k) => flyExhaust(viejo, k, agotadas.length));
      // reshuffle: cards of the last discard pile are back in the draw pile
      const mazoAhora = new Set(jugador.mazo);
      let barajados = 0;
      for (const c of descartePrevio) if (mazoAhora.has(c)) barajados++;
      const tiempoBarajado = barajados > 0 ? flyShuffle($('.pila-descarte'), $('.pila-robo'), barajados) : 0;
      const nuevas = cartas.filter((c) => !elemPorCarta.has(c));
      const retrasos = drawDelays(nuevas.length, { reduced: reducedMotion(), after: tiempoBarajado * 0.6 });
      const origenes = nuevas.map((c) => (descartePrevio.has(c) && barajados === 0 ? $('.pila-descarte') : $('.pila-robo')));
      for (const c of nuevas) llegando.add(c);
      descartePrevio = new Set(jugador.descarte);
      // the cards that stay glide to their new slot instead of jumping under the pointer
      const posePrevia = new Map<CartaInstancia, SlotPose>();
      for (const [inst, viejo] of elemPorCarta) if (enMano.has(inst) && viejo.isConnected) posePrevia.set(inst, slotPose(viejo));
      elemPorCarta = new Map();
      mano.innerHTML = '';
      if (seleccion >= cartas.length) seleccion = Math.max(0, cartas.length - 1);
      cartas.forEach((inst, i) => {
        // la carta pendiente de objetivo muestra el daño contra el enemigo marcado
        const objetivo =
          cartaPendiente === inst ? combate.enemigos[objetivoIdxValido()] : undefined;
        const c = renderCarta(defDe(inst), modsEnCombate(objetivo, defDe(inst)));
        if (inst.mejorada) c.classList.add('carta-mejorada');
        c.dataset.mano = String(i);
        const n = cartas.length;
        const ang = (i - (n - 1) / 2) * Math.min(5, 40 / n);
        const alza = Math.abs(i - (n - 1) / 2) * Math.min(6, 30 / n);
        c.style.setProperty('--ang', `${ang}deg`);
        c.style.setProperty('--alza', `${alza}px`);
        const orden = cola.indexOf(esCartaEnCola(inst));
        const enCurso = cola.current?.kind === 'card' && cola.current.card === inst;
        if (orden >= 0) {
          // queued: lifted, translucent and numbered by its place in the queue
          c.classList.add('en-cola');
          c.appendChild(el('span', 'orden-cola', String(orden + 1)));
        } else if (enCurso) {
          c.classList.add('en-curso');
        } else if (motivoNoEncolable(inst)) {
          c.classList.add('sin-energia');
        }
        if (i === seleccion && !cartaPendiente) c.classList.add('seleccionada');
        if (cartaPendiente === inst) c.classList.add('pendiente');
        if (llegando.has(inst)) c.classList.add('carta-llegando');
        enlazarArrastre(c, inst);
        elemPorCarta.set(inst, c);
        mano.appendChild(c);
      });
      for (const [inst, antes] of posePrevia) {
        const c = elemPorCarta.get(inst);
        if (c) glideToSlot(c, antes);
      }
      // new cards fly in from their pile, one after another
      nuevas.forEach((inst, k) => {
        const c = elemPorCarta.get(inst);
        if (!c) return;
        flyDraw(c, origenes[k], retrasos[k], () => {
          llegando.delete(inst);
          elemPorCarta.get(inst)?.classList.remove('carta-llegando');
        });
      });
    }

    // ── Jugar cartas ─────────────────────────────────────────────────────────
    /** Where a played card flies: its enemy, the hero, the enemies' middle or straight up. */
    function destinoLanzamiento(def: CartaDef, objetivo: EnemigoCombate | undefined, desde: Point): Point {
      const caja = (elem: HTMLElement | null) => (elem ? cajaDe(elem) : null);
      const clave = def.fx ? cardSpellKey(def.id, def.fx) : '';
      // curses the card casts on every foe (Final Pact…) fly to the enemies, not the hero
      const aLosEnemigos = !!clave && fx.receptorHechizo(clave) === 'enemies';
      return playDestination({
        mode: aLosEnemigos ? 'todos' : def.objetivo,
        kind: def.tipo === 'maldicion' ? 'habilidad' : def.tipo, // a paid-off curse flies like a skill
        selfFx: !!clave && fx.anclaHechizo(clave) === 'self',
        target: objetivo ? caja(elemDe(objetivo)) : null,
        hero: caja(elemDe(combate.jugador)),
        enemies: combate.enemigos.filter((e) => e.vivo).map((e) => caja(elemDe(e))).filter((b) => b !== null),
        from: desde,
        viewport: { w: window.innerWidth, h: window.innerHeight },
      }).point;
    }

    /** Screen box around whoever will show a rare card's sequence (for its prelude). */
    function cajaReceptores(def: CartaDef, objetivo: EnemigoCombate | undefined, clave: string) {
      const alHeroe = fx.receptorHechizo(clave) !== 'enemies'
        && (fx.anclaHechizo(clave) === 'self' || def.objetivo === 'ninguno' || def.objetivo === 'propio');
      const quienes: Luchador[] = alHeroe ? [combate.jugador]
        : def.objetivo === 'enemigo' && objetivo ? [objetivo] : combate.enemigos.filter((e) => e.vivo);
      return unirCajas(quienes.map((q) => cajaDe(elemDe(q))));
    }

    /** The card flies to its target and vanishes on arrival, when its effect goes off. */
    async function animarLanzamiento(
      inst: CartaInstancia, desde: HTMLElement | null, objetivo: EnemigoCombate | undefined, impactoMs: number,
    ) {
      const def = inst.def;
      const suelta = soltada?.inst === inst && performance.now() - soltada.at < 1500 ? soltada : null;
      soltada = null;
      // a card that will end up exhausted burns away on the way instead of fading on arrival
      const exhaust = exhaustsWhenPlayed(def, combate.jugador.estados);
      // Animación especial de cartas raras: carta gigante + estallido de partículas
      if (def.animRara) {
        const grande = renderCarta(def);
        grande.classList.add('carta-showcase', def.animRara);
        document.body.appendChild(grande);
        // its own sequence starts gathering over its receivers (anticipation) while the showcase
        // holds the stage; the climax goes off on the hit. Cards without one keep the burst.
        const preludio = preludeKey(def.id);
        if (preludio) {
          fx.hechizo(preludio, cajaReceptores(def, objetivo, cardSpellKey(def.id, def.fx)), {
            desde: centroDe(elemDe(combate.jugador)), mirando: fx.anclaHechizo(preludio) === 'self' ? 1 : -1,
          });
        } else fx.estallido(def.fx ?? 'impacto');
        audio.sfxRara(def.fx ?? 'divino');
        anuncio(def.subclase ? `✦ ${def.subclase} ✦` : def.nombre, 'anuncio-rara');
        // the showcase holds the stage, then dives onto the target like any other card
        await espera(600);
        const r = grande.getBoundingClientRect();
        await flyShowcase(grande, destinoLanzamiento(def, objetivo, { x: r.left + r.width / 2, y: r.top + r.height / 2 }), { exhaust });
      } else if (desde) {
        audio.sfx('jugarCarta');
        const r = desde.getBoundingClientRect();
        const origen = suelta?.center ?? { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        await flyPlay(desde, destinoLanzamiento(def, objetivo, origen), { from: suelta, impactMs: impactoMs, exhaust });
      }
    }

    async function jugar(inst: CartaInstancia, objetivo?: EnemigoCombate) {
      if (!combate.puedeJugar(inst)) return;
      // targeting another card meanwhile is left alone: only this card's own mode ends
      if (cartaPendiente === inst) {
        cartaPendiente = null;
        modoObjetivo = false;
      }
      // Vexis' illusions: the card flies where the blow will really land
      objetivo = combate.objetivoReal(inst, objetivo);
      const elem = raiz.querySelector(
        `.carta[data-mano="${combate.jugador.mano.indexOf(inst)}"]`,
      ) as HTMLElement | null;
      // the hero swings (or casts) while the card flies; damage waits for the blow
      const inicio = performance.now();
      const impacto = spriteActual().play(defDe(inst).tipo === 'ataque' ? 'attack' : 'spell');
      lanzadas.add(inst);
      await animarLanzamiento(inst, elem, objetivo, impacto);
      const restante = impacto - (performance.now() - inicio);
      if (restante > 0) await espera(restante);
      abrirHechizoCarta(defDe(inst), objetivo);
      try {
        await combate.jugarCarta(inst, objetivo);
      } finally {
        // the last darts of a volley land before the next card (or the end of the turn)
        await impactos.settle();
        vidaEnVuelo.clear();
        cerrarHechizoCarta();
        // still in hand (the play did not go through): it may be discarded later
        if (combate.jugador.mano.includes(inst)) lanzadas.delete(inst);
      }
    }

    /** Vista ampliada de una carta (toque en móvil: leer, no jugar). */
    function ampliarCarta(inst: CartaInstancia) {
      const zoom = el('div', 'zoom-carta');
      const fila = el('div', 'zoom-fila');
      // same live numbers as the card in the hand (and its target, if it has one)
      const objetivo = cartaPendiente === inst ? combate.enemigos[objetivoIdxValido()] : undefined;
      const grande = renderCarta(defDe(inst), modsEnCombate(objetivo, defDe(inst)));
      if (inst.mejorada) grande.classList.add('carta-mejorada');
      fila.appendChild(grande);
      fila.appendChild(cuadroPalabrasClave(defDe(inst)));
      zoom.appendChild(fila);
      zoom.appendChild(el('p', 'zoom-ayuda', 'Arrastra la carta para jugarla · toca para cerrar'));
      zoom.addEventListener('pointerdown', () => zoom.remove());
      document.body.appendChild(zoom);
      audio.sfx('verCarta');
    }

    function jugarSobre(idxEnemigo: number) {
      const inst = cartaPendiente;
      if (!inst) return;
      const enemigo = combate.enemigos[idxEnemigo];
      if (!enemigo?.vivo) return;
      encolarCarta(inst, enemigo);
    }

    function motivoNoJugable(inst: CartaInstancia): string {
      const def = defDe(inst);
      if (def.tipo === 'maldicion' && def.purgar === undefined) return '☠️ Las maldiciones no se pueden jugar';
      if (combate.jugador.energia < combate.costeEfectivo(def)) return 'Sin energía suficiente';
      if (def.castigo && combate.jugador.castigos.length > 0) return '🌟 Ya tienes un Castigo preparado';
      if (def.requiereConjuro)
        return `◈ Necesitas un espacio de conjuro de nivel ${def.requiereConjuro}+`;
      return 'No puedes jugar esa carta ahora';
    }

    function activarCarta(inst: CartaInstancia) {
      // touching a queued card again takes it back to the hand
      if (sacarDeCola(inst)) return;
      if (cola.current?.kind === 'card' && cola.current.card === inst) return;
      const motivo = motivoNoEncolable(inst);
      if (motivo) {
        anuncio(motivo, 'anuncio-error');
        return;
      }
      if (inst.def.objetivo === 'enemigo') {
        const vivos = combate.enemigos.filter((e) => e.vivo);
        if (vivos.length === 1) {
          encolarCarta(inst, vivos[0]);
        } else {
          cartaPendiente = inst;
          modoObjetivo = true;
          objetivoIdxValido();
          render();
        }
      } else {
        encolarCarta(inst);
      }
    }

    // ── Arrastrar y soltar ───────────────────────────────────────────────────
    function enlazarArrastre(elemCarta: HTMLElement, inst: CartaInstancia) {
      elemCarta.addEventListener('pointerdown', (ev) => {
        // while something resolves the card is queued instead; the card flying right now is out of reach
        if (combate.terminado || (cola.current?.kind === 'card' && cola.current.card === inst)) return;
        ev.preventDefault();
        const inicioX = ev.clientX;
        const inicioY = ev.clientY;
        let movido = false;
        // a queued card is not dragged: a tap takes it back to the hand
        const enCola = cola.indexOf(esCartaEnCola(inst)) >= 0;
        gestoMano = true;

        let idxSobre = -1; // enemigo bajo el cursor (para el texto dinámico)
        const alMover = (e: PointerEvent) => {
          const dx = e.clientX - inicioX;
          const dy = e.clientY - inicioY;
          if (!movido && !enCola && Math.hypot(dx, dy) > 10) {
            movido = true;
            arrastrando = elemCarta;
            elemCarta.classList.add('arrastrando');
            document.body.classList.add('arrastre-activo');
            if (inst.def.objetivo !== 'enemigo') raiz.classList.add('mostrar-linea');
          }
          if (!movido) return;
          elemCarta.style.setProperty('--dx', `${dx}px`);
          elemCarta.style.setProperty('--dy', `${dy}px`);
          // resalta enemigo bajo el cursor
          raiz.querySelectorAll('.enemigo').forEach((en) => en.classList.remove('objetivo-activo'));
          if (inst.def.objetivo === 'enemigo') {
            const sobre = document
              .elementFromPoint(e.clientX, e.clientY)
              ?.closest('.enemigo');
            sobre?.classList.add('objetivo-activo');
            // el texto refleja el daño real contra el enemigo concreto (Vulnerable)
            const idx = sobre ? Number((sobre as HTMLElement).dataset.idx) : -1;
            if (idx !== idxSobre) {
              idxSobre = idx;
              actualizarTextoCarta(
                elemCarta,
                defDe(inst),
                modsEnCombate(idx >= 0 ? combate.enemigos[idx] : null, defDe(inst)),
              );
            }
          }
        };

        const alSoltar = (e: PointerEvent) => {
          window.removeEventListener('pointermove', alMover);
          window.removeEventListener('pointerup', alSoltar);
          window.removeEventListener('pointercancel', alSoltar);
          gestoMano = false;
          // IMPORTANTE: detecta el enemigo bajo el cursor ANTES de soltar la carta.
          // Mientras se arrastra, la carta tiene pointer-events:none; si quitáramos
          // la clase primero, elementFromPoint devolvería la propia carta (aún bajo
          // el cursor por la transición de vuelta a la mano) y el drop fallaría.
          const sobre = movido
            ? document.elementFromPoint(e.clientX, e.clientY)?.closest('.enemigo')
            : null;
          if (movido) {
            // a dropped card flies to its target from where it was let go
            const r = elemCarta.getBoundingClientRect();
            soltada = {
              inst,
              center: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
              scale: elemCarta.offsetWidth > 0 ? r.width / elemCarta.offsetWidth : 1,
              at: performance.now(),
            };
          }
          elemCarta.classList.remove('arrastrando');
          elemCarta.style.removeProperty('--dx');
          elemCarta.style.removeProperty('--dy');
          document.body.classList.remove('arrastre-activo');
          raiz.classList.remove('mostrar-linea');
          arrastrando = null;

          if (e.type === 'pointercancel') {
            render();
            return;
          }
          if (!movido) {
            // tapping a queued card again (mouse or touch) takes it out of the queue
            if (sacarDeCola(inst)) return;
            if (e.pointerType === 'touch') {
              // en táctil un toque AMPLÍA la carta (para leerla); se juega arrastrando
              ampliarCarta(inst);
              render(); // the hand may have changed during the gesture
              return;
            }
            // clic de ratón: seleccionar / activar
            seleccion = combate.jugador.mano.indexOf(inst);
            activarCarta(inst);
            render();
            return;
          }
          if (inst.def.objetivo === 'enemigo') {
            const objetivo = sobre ? combate.enemigos[Number((sobre as HTMLElement).dataset.idx)] : undefined;
            if (objetivo?.vivo) encolarCarta(inst, objetivo);
          } else if (e.clientY < window.innerHeight * 0.62) {
            encolarCarta(inst);
          }
          render(); // back to the hand, queued or not
        };

        window.addEventListener('pointermove', alMover);
        window.addEventListener('pointerup', alSoltar);
        window.addEventListener('pointercancel', alSoltar);
      });
    }

    // ── Teclado (simulando mando) ────────────────────────────────────────────
    function alTeclar(ev: KeyboardEvent) {
      if (combate.terminado) return;
      // a card selector (discard N, pick a card…) owns the keyboard until the player chooses
      if (document.getElementById('overlay')?.classList.contains('overlay-activo')) return;
      const mano = combate.jugador.mano;
      switch (ev.code) {
        case 'ArrowLeft':
        case 'ArrowRight': {
          ev.preventDefault();
          const dir = ev.code === 'ArrowRight' ? 1 : -1;
          if (modoObjetivo) {
            // screen order (fixed slots), not the engine's list order
            const vivos = huecosEnemigos.filter((e) => e.vivo).map((e) => combate.enemigos.indexOf(e));
            const pos = vivos.indexOf(objetivoIdxValido());
            objetivoIdx = vivos[(pos + dir + vivos.length) % vivos.length];
          } else if (mano.length > 0) {
            seleccion = (seleccion + dir + mano.length) % mano.length;
          }
          render();
          break;
        }
        case 'Enter':
        case 'Space': {
          ev.preventDefault();
          if (modoObjetivo && cartaPendiente) {
            jugarSobre(objetivoIdxValido());
          } else if (mano[seleccion]) {
            activarCarta(mano[seleccion]);
          }
          break;
        }
        case 'Escape': {
          cartaPendiente = null;
          modoObjetivo = false;
          render();
          break;
        }
        case 'KeyE': {
          pulsarFinTurno();
          break;
        }
      }
    }
    window.addEventListener('keydown', alTeclar);

    $('.btn-fin-turno').addEventListener('click', pulsarFinTurno);
    // the piles open the deck viewer (the draw pile shown sorted, never in drawing order)
    $('.pila-robo').addEventListener('click', () =>
      verCartas('🂠 Pila de robo', combate.jugador.mazo, 'Ordenadas por tipo y coste, no en el orden en que las robarás.'));
    $('.pila-descarte').addEventListener('click', () => verCartas('🗑 Descarte', combate.jugador.descarte));

    // ── Final del combate ────────────────────────────────────────────────────
    let resuelto = false;
    /** Length of the running death sequence (ms), null when there is none. */
    let muerteMs: number | null = null;
    function comprobarFinal() {
      if (!combate.terminado || resuelto) return;
      resuelto = true;
      cola.close(); // whatever was still queued is dropped
      window.removeEventListener('keydown', alTeclar);
      // the last enemy just fell: the calm version comes back, from the same point of the song
      const calma = themeAfterCombat(combate.terminado, run.capitulo, run.escenario, defs);
      if (calma) audio.reproducirTema(calma);
      // a real defeat plays the hero's death (the Dungeon Master's ray has its own scene)
      const muerte = playsDefeatSequence(combate.terminado, defs) ? muerteHeroe() : null;
      // time to read the DM's last line; a soul dragged under by Doom is seen to the end
      const pausa = Math.max(muerteMs ?? (defs.some((d) => d.dungeonMaster) ? 1800 : 700), almaHasta - performance.now());
      // the last enemies finish falling before the screen goes
      void Promise.all([espera(pausa), muertes.settle()]).then(() => {
        muerte?.();
        run.pv = Math.max(0, combate.jugador.pv);
        if (combate.terminado === 'victoria') {
          for (const r of run.reliquias) r.finCombate?.(run);
        }
        heroSprite.destroy();
        for (const s of formSprites.values()) s.destroy();
        for (const s of spritesEnemigo.values()) s.destroy();
        for (const s of spritesInvocacion.values()) s.destroy();
        stage?.destroy();
        medirEscenario.disconnect();
        resolver(combate.terminado!);
      });
    }

    /**
     * The hero's last moments (fx/hero-death.ts): red heartbeat and shake, slow motion
     * of sprites and particles, the full death animation, the class burst, the soul
     * rising, a vignette closing in and the killer's gloat. Returns the cleanup.
     */
    function muerteHeroe(): () => void {
      const seq = heroDeathSequence(reducedMotion());
      muerteMs = seq.total;
      ultimaCaida = { asesino: actor?.e.nombre ?? null, turnos: combate.turno };
      const asesino = actor && actor.e.vivo ? actor.e : null;
      const heroe = spriteActual();
      const caja = cajaDe(elemDe(combate.jugador));
      const tema = heroDeathFx(run.clase);
      raiz.classList.add('heroe-muriendo');

      const velo = el('div', 'muerte-velo');
      velo.setAttribute('aria-hidden', 'true');
      const cx = ((caja.x + caja.w / 2) / window.innerWidth) * 100, cy = ((caja.y + caja.h / 2) / window.innerHeight) * 100;
      velo.style.cssText = `--mx:${cx.toFixed(1)}%;--my:${cy.toFixed(1)}%;--vineta-ms:${seq.vignette.ms}ms;--vineta-desde:${seq.vignette.from}ms`;
      velo.innerHTML = `${seq.flash ? '<div class="muerte-destello"></div>' : ''}<div class="muerte-vineta"></div>`;
      document.body.appendChild(velo);

      // slow motion: one global factor for the sprite clock and the fx canvas
      const t0 = performance.now();
      let reloj = 0;
      const escala = (k: number) => { fx.escalaTiempo = k; setSpriteTimeScale(k); };
      if (seq.slowMotion) {
        const paso = () => {
          const ms = performance.now() - t0;
          escala(deathTimeScale(seq, ms));
          if (ms < seq.total) reloj = requestAnimationFrame(paso);
        };
        reloj = requestAnimationFrame(paso);
      }

      const pasos: Record<DeathCueId, () => void> = {
        golpe: () => {
          if (seq.shake) sacudir(seq.shake);
          audio.sfx('muerte');
          audio.sfx('impacto', 0.7);
          audio.fundirMusica(seq.music.level, seq.music.seconds);
        },
        caida: () => heroe.play('death'),
        estallido: () => { fx.hechizo(tema.spell, caja, { mirando: 1 }); },
        vineta: () => {}, // CSS: the vignette starts on its own delay
        gong: () => audio.gongFunebre(),
        alma: () => { fx.hechizo(SOUL_SPELL, caja, { mirando: 1 }); },
        risa: () => {
          if (!asesino) return;
          const s = spriteEnemigo(asesino);
          if (s) { s.play('spell'); return; }
          const elem = elemDe(asesino);
          elem?.classList.add('actuando');
          setTimeout(() => elem?.classList.remove('actuando'), 450);
        },
        fin: () => {},
      };
      const temporizadores = seq.cues.map((c) => setTimeout(pasos[c.id], c.at));

      return () => {
        for (const t of temporizadores) clearTimeout(t);
        cancelAnimationFrame(reloj);
        escala(1);
        velo.remove();
      };
    }

    // ¡Empieza el combate!
    anuncio(
      esJefe ? `☠️ ¡${defs[0].nombre.toUpperCase()}! ☠️` : '⚔️ ¡Combate!',
      esJefe ? 'anuncio-jefe' : '',
    );
    // the intro runs through the queue too, so cards chosen meanwhile wait for it
    cola.enqueue({ kind: 'start' });
  });
}

// Hashed URLs, so a repainted background replaces the cached one.
const BACKGROUND_URLS = import.meta.glob('../arte/fondos/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

/**
 * Painted scenario background: a static image under the WebGL stage (no per-frame
 * cost). The CSS sky and silhouettes stay underneath until it has loaded.
 * The layer covers the whole combat screen: the scene shows the painting exactly as
 * before, and a mirrored copy carries its ground on under the hand, so no strip cuts it.
 */
function montarFondo(raiz: HTMLElement, escenarioEl: HTMLElement, capitulo: number, escenario: number) {
  const fondo = sceneBackground(capitulo, escenario);
  const wide = BACKGROUND_URLS[`../arte/fondos/${fondo.wide}`];
  const tall = BACKGROUND_URLS[`../arte/fondos/${fondo.tall}`] ?? wide;
  if (!wide) return;
  // pick by the scene's own shape: on a portrait phone the scene strip is still wide
  const { clientWidth: w, clientHeight: h } = escenarioEl;
  const src = h > w ? tall : wide;
  const capa = document.createElement('div');
  capa.className = 'fondo-escena';
  const img = document.createElement('img');
  img.alt = '';
  img.decoding = 'async';
  img.addEventListener('load', () => raiz.classList.add('fondo-pintado'), { once: true });
  img.src = src;
  const reflejo = document.createElement('img');
  reflejo.className = 'fondo-reflejo';
  reflejo.alt = '';
  reflejo.decoding = 'async';
  reflejo.src = src;
  capa.append(img, reflejo);
  raiz.prepend(capa);
}
