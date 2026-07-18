import { Combate, type Presentador } from '../core/combate.ts';
import type {
  CartaDef, CartaInstancia, EnemigoCombate, EnemigoDef, EstadoId, EstadoRun, Luchador,
} from '../core/types.ts';
import { fx } from '../fx/particulas.ts';
import { audio } from '../fx/audio.ts';
import { rodarDado, rodarDados } from '../fx/dado.ts';
import {
  anuncio, centroDe, el, espera, ICONO_ESTADO, NOMBRE_ESTADO, numeroFlotante, sacudir, tipEstado,
} from './util.ts';
import { renderCarta, actualizarTextoCarta, cuadroPalabrasClave, EFECTO_CONJURO, type ModsCarta } from './carta.ts';
import { defDe } from '../core/cartas.ts';

const SPRITE_JUGADOR: Record<string, string> = { druida: '🧝‍♂️', barbaro: '🧔‍♂️', mago: '🧙‍♂️', picaro: '🥷' };
const NOMBRE_CLASE: Record<string, string> = {
  druida: '🌿 Druida', barbaro: '🪓 Bárbaro', mago: '🔮 Mago', picaro: '🗡️ Pícaro',
};
const SPRITE_FORMA: Record<string, string> = {
  'Forma de Lobo': '🐺', 'Forma de Oso': '🐻', 'Forma de Águila': '🦅',
  'Forma Lunar': '🐺', 'Forma Estelar': '🦌',
};
const SPRITE_INVOCACION: Record<string, string> = {
  lobo: '🐺', oso: '🐻', fuego: '🔥', agua: '💧', aire: '🌬️', arbol: '🌳', tierra: '⛰️',
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
    const app = document.getElementById('app')!;
    app.innerHTML = '';
    app.className = `pantalla-combate ${esJefe ? 'combate-jefe' : ''}`;
    fx.ambiente(true);
    audio.musica(run.capitulo, esJefe); // tema normal del acto, o épico si es jefe

    // ── Estructura ──────────────────────────────────────────────────────────
    const raiz = el('div', 'combate');
    raiz.innerHTML = `
      <div class="escenario">
        <div class="silueta-fondo"></div>
        <div class="barra-superior"></div>
        <div class="campo">
          <div class="lado-jugador"></div>
          <div class="lado-enemigos"></div>
        </div>
        <div class="aviso-jefe">${esJefe ? '☠️ JEFE ☠️' : ''}</div>
      </div>
      <div class="zona-mano">
        <div class="pila pila-robo" data-tip="<strong>Pila de robo</strong><br>Cartas que quedan por robar."></div>
        <div class="energia"></div>
        <div class="mano"></div>
        <button class="btn-fin-turno">Fin de turno<span class="atajo">[E]</span></button>
        <div class="pila pila-descarte" data-tip="<strong>Descarte</strong><br>Vuelve a barajarse cuando se agota la pila de robo."></div>
      </div>
      <div class="linea-lanzamiento">Suelta aquí para lanzar</div>
      <div class="ayuda-teclas">←→ elegir · Enter jugar · Esc cancelar · E fin de turno</div>
    `;
    app.appendChild(raiz);

    const $ = (s: string) => raiz.querySelector(s) as HTMLElement;

    // ── Estado de entrada ────────────────────────────────────────────────────
    let seleccion = 0;               // índice de carta seleccionada (teclado)
    let modoObjetivo = false;        // eligiendo objetivo con teclado/clic
    let objetivoIdx = 0;
    let cartaPendiente: CartaInstancia | null = null;
    let arrastrando: HTMLElement | null = null;

    // ── Presentador: efectos visuales que pide el motor ──────────────────────
    const elemDe = (obj: Luchador): HTMLElement | null => {
      if (obj === combate.jugador) return raiz.querySelector('.heroe');
      const idx = combate.enemigos.indexOf(obj as EnemigoCombate);
      return raiz.querySelector(`.enemigo[data-idx="${idx}"]`);
    };
    const elemInvocacion = (): HTMLElement | null => raiz.querySelector('.invocacion');

    const ui: Presentador = {
      render,
      espera,
      async fxGolpe(obj, dano, efecto = 'tajo') {
        const elem = elemDe(obj);
        const { x, y } = centroDe(elem);
        fx.emitir(efecto, x, y);
        audio.sfx(dano > 0 ? efecto : 'bloqueo');
        if (dano > 0) {
          numeroFlotante(elem, `${dano}`, 'dano');
          elem?.classList.add('golpeado');
          setTimeout(() => elem?.classList.remove('golpeado'), 350);
          sacudir(dano >= 12 ? 3 : dano >= 7 ? 2 : 1);
        } else {
          numeroFlotante(elem, 'Bloqueado', 'bloqueo');
        }
        render();
        await espera(260);
      },
      async fxBloqueo(obj, n) {
        const elem = elemDe(obj);
        const { x, y } = centroDe(elem);
        fx.emitir('bloqueo', x, y);
        audio.sfx('bloqueo');
        numeroFlotante(elem, `+${n} 🛡`, 'bloqueo');
        render();
        await espera(200);
      },
      async fxEstado(obj, estado, n) {
        const elem = elemDe(obj);
        const signo = n > 0 ? '+' : '';
        audio.sfx('estado');
        numeroFlotante(elem, `${ICONO_ESTADO[estado]} ${signo}${n} ${NOMBRE_ESTADO[estado]}`, 'estado');
        render();
        await espera(260);
      },
      async fxCura(obj, n) {
        const elem = elemDe(obj);
        const { x, y } = centroDe(elem);
        fx.emitir('cura', x, y);
        audio.sfx('cura');
        numeroFlotante(elem, `+${n}`, 'cura');
        render();
        await espera(220);
      },
      async fxMuerte(e) {
        const elem = elemDe(e);
        const { x, y } = centroDe(elem);
        fx.emitir('muerte', x, y);
        audio.sfx('muerte');
        elem?.classList.add('muriendo');
        await espera(550);
        render();
      },
      async fxMensaje(txt) {
        anuncio(txt);
        await espera(350);
      },
      async fxEnemigoActua(e) {
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
        const { x, y } = centroDe(elemDe(obj));
        fx.emitir(efecto, x, y);
        render();
        await espera(220);
      },
      async fxInvocacionGolpe(dano) {
        const elem = elemInvocacion();
        const { x, y } = centroDe(elem);
        fx.emitir('golpeEnemigo', x, y);
        audio.sfx(dano > 0 ? 'golpeEnemigo' : 'bloqueo');
        if (dano > 0) {
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
        elem?.classList.add('muriendo');
        await espera(450);
        render();
      },
      async fxInvocacionAtaca() {
        const elem = elemInvocacion();
        const { x, y } = centroDe(elem);
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
      async fxDado(n, caras) {
        audio.sfx('carta');
        await rodarDado(n, caras); // icosaedro 3D (WebGL) rodando por la pantalla
        if (n === caras) fx.estallido('estrellas');
      },
      async fxDadoVentaja(a, b, caras) {
        audio.sfx('carta');
        await rodarDados([a, b], caras); // los dos dados ruedan a la vez
        if (Math.max(a, b) === caras) fx.estallido('estrellas');
      },
      elegirCarta(cartas, titulo) {
        return new Promise((resolver) => {
          const overlay = document.getElementById('overlay')!;
          overlay.innerHTML = '';
          overlay.className = 'overlay-activo';
          const panel = el('div', 'panel-recompensa panel-mejora');
          panel.innerHTML = `<h2>🔎 ${titulo}</h2><div class="mejora-rejilla"></div>
            <button class="btn-saltar">Cancelar <span class="atajo">[Esc]</span></button>`;
          overlay.appendChild(panel);
          const rejilla = panel.querySelector('.mejora-rejilla') as HTMLElement;

          const cerrar = (elegida: CartaInstancia | null) => {
            window.removeEventListener('keydown', teclado);
            overlay.className = '';
            overlay.innerHTML = '';
            resolver(elegida);
          };
          cartas.forEach((inst, i) => {
            const c = renderCarta(defDe(inst), modsEnCombate());
            if (inst.mejorada) c.classList.add('carta-mejorada');
            c.classList.add('carta-recompensa');
            c.style.setProperty('--retraso', `${Math.min(i * 0.04, 0.5)}s`);
            c.addEventListener('click', () => cerrar(inst));
            rejilla.appendChild(c);
          });
          const teclado = (ev: KeyboardEvent) => {
            if (ev.code === 'Escape') cerrar(null);
          };
          window.addEventListener('keydown', teclado);
          panel.querySelector('.btn-saltar')!.addEventListener('click', () => cerrar(null));
        });
      },
    };

    const combate = new Combate(run, defs, rng, ui, esJefe || esElite);

    // ── Render ───────────────────────────────────────────────────────────────
    function render() {
      renderBarra();
      renderJugador();
      renderEnemigos();
      renderMano();
      renderEnergia();
      $('.pila-robo').innerHTML = `🂠<span>${combate.jugador.mazo.length}</span>`;
      $('.pila-descarte').innerHTML = `🗑<span>${combate.jugador.descarte.length}</span>`;
      comprobarFinal();
    }

    function renderBarra() {
      const r = run.reliquias
        .map((x) => `<span class="reliquia" data-tip="<strong>${x.icono} ${x.nombre}</strong><br>${x.texto}">${x.icono}</span>`)
        .join('');
      $('.barra-superior').innerHTML = `
        <span class="bs-clase">${NOMBRE_CLASE[run.clase]}</span>
        <span class="bs-pv">❤️ ${combate.jugador.pv}/${combate.jugador.pvMax}</span>
        <span class="bs-reliquias">${r}</span>
        <span class="bs-piso">${nombreCapitulo} · Sala ${run.piso}</span>
      `;
    }

    function barraVida(l: Luchador): string {
      const pct = Math.max(0, (l.pv / l.pvMax) * 100);
      return `
        <div class="vida">
          <div class="vida-relleno" style="width:${pct}%"></div>
          <span class="vida-texto">${l.pv}/${l.pvMax}</span>
        </div>`;
    }

    function fichasEstados(l: Luchador): string {
      const fichas = Object.entries(l.estados)
        .filter(([k, v]) => v !== 0 && v !== undefined && k !== 'raicesExtra')
        .map(
          ([k, v]) =>
            `<span class="estado ${v! < 0 || k === 'raices' ? 'estado-neg' : ''}" data-tip="${tipEstado(k, v!)}">${ICONO_ESTADO[k]}${v}</span>`,
        )
        .join('');
      return `<div class="estados">${fichas}</div>`;
    }

    /** Panel de la invocación del druida (vida, forma y pasivas). */
    function renderInvocacionHTML(): string {
      const inv = combate.jugador.invocacion;
      if (!inv || inv.vida <= 0) return '';
      const emoji = SPRITE_INVOCACION[inv.forma] ?? '🐾';
      const dmg = Math.max(1, Math.round(inv.vida * 0.3));
      const pasivas = inv.efectos.map((e) => PASIVA_INVOCACION[e]).filter(Boolean);
      const tip = `<strong>${emoji} Invocación</strong><br>Vida ${inv.vida}/${inv.vidaMax}<br>Ataca por ${dmg} cada turno.${
        pasivas.length ? `<br>${pasivas.map((p) => `· ${p}`).join('<br>')}` : ''
      }`.replace(/"/g, '&quot;');
      const pct = Math.max(0, (inv.vida / inv.vidaMax) * 100);
      return `
        <div class="invocacion" data-tip="${tip}">
          <div class="sprite sprite-invocacion">${emoji}</div>
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

    function renderJugador() {
      const j = combate.jugador;
      const forma = j.efectosTemporales.find((e) => SPRITE_FORMA[e.etiqueta]);
      const sprite = forma ? SPRITE_FORMA[forma.etiqueta] : SPRITE_JUGADOR[run.clase];
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
        }" data-luchador="jugador">
          ${j.bloqueo > 0 ? `<div class="bloqueo-ficha">🛡️${j.bloqueo}</div>` : ''}
          ${conjuro}
          <div class="sprite sprite-jugador">${sprite}</div>
          ${barraVida(j)}
          ${fichasEstados(j)}
          <div class="temporales">${temporales}</div>
          ${furiaActiva ? `<div class="furia-ficha" data-tip="<strong>🔥 Furia</strong><br>Fuerza/Destreza acumulada. Se rompe si acabas la ronda sin recibir daño (lo bloqueado no cuenta).">🔥 Furia +${j.furiaFuerza}F${j.furiaDestreza ? ` +${j.furiaDestreza}D` : ''}</div>` : ''}
        </div>
        ${renderInvocacionHTML()}`;
    }

    function textoIntencion(e: EnemigoCombate): string {
      if (e.saltaAccion) return '<span class="int-dormido">💤</span>'; // saltará su acción
      const m = e.intencion;
      if (m.dano !== undefined) {
        const d = combate.danoIntencion(e);
        // daño "natural" del enemigo (su Fuerza propia) sin Débil/Raíces ni Vulnerable
        const natural = Math.max(0, m.dano + (e.estados.fuerza ?? 0));
        // verde si lo hemos reducido (Débil/Raíces); rojo si Vulnerable lo amplifica
        const mod = d < natural ? 'int-mod-baja' : d > natural ? 'int-mod-alta' : '';
        const veces = m.veces && m.veces > 1 ? `×${m.veces}` : '';
        return `<span class="int-ataque">⚔️ <span class="${mod}">${d}</span>${veces}</span>`;
      }
      if (m.invocar) return `<span class="int-mejora">👥</span>`;
      if (m.devorar) return `<span class="int-mejora">🍖</span>`;
      if (m.intencion === 'defensa') return `<span class="int-defensa">🛡️ ${m.bloqueo ?? ''}</span>`;
      if (m.intencion === 'mejora') return `<span class="int-mejora">⬆️</span>`;
      if (m.intencion === 'perjuicio') return `<span class="int-perjuicio">☠️</span>`;
      return '<span>?</span>';
    }

    function renderEnemigos() {
      const cont = $('.lado-enemigos');
      cont.innerHTML = '';
      combate.enemigos.forEach((e, idx) => {
        if (!e.vivo) return;
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
        div.innerHTML = `
          <div class="intencion" data-tip="<strong>${e.intencion.nombre}</strong><br>${
            tipInt[e.intencion.intencion]
          }.">${textoIntencion(e)}</div>
          ${e.bloqueo > 0 ? `<div class="bloqueo-ficha">🛡️${e.bloqueo}</div>` : ''}
          <div class="sprite sprite-enemigo" style="font-size:${escala * 4.2}rem">${e.def.arte}</div>
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
        cont.appendChild(div);
      });
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

    /** Modificadores en vivo para el texto de las cartas (Fuerza, Débil,
     *  Destreza, Frágil… y Vulnerable del objetivo si se conoce). */
    function modsEnCombate(objetivo?: EnemigoCombate | null, def?: CartaDef): ModsCarta {
      // El Conjuro Prodigioso muestra su daño acumulado (10 base + lo escrito).
      const extra = def?.id === 'conjuro-prodigioso' ? (combate.jugador.conjuroEscrito ?? 0) : 0;
      return {
        dano: (base) => {
          const d = combate.danoDeAtaque(combate.jugador, base + extra);
          return objetivo?.vivo ? combate.danoRecibido(objetivo, d) : d;
        },
        bloqueo: (base) => combate.bloqueoDeCarta(base),
        coste: (base) => (def ? combate.costeEfectivo(def) : base),
      };
    }

    function renderMano() {
      const mano = $('.mano');
      mano.innerHTML = '';
      const cartas = combate.jugador.mano;
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
        if (!combate.puedeJugar(inst)) c.classList.add('sin-energia');
        if (i === seleccion && !cartaPendiente) c.classList.add('seleccionada');
        if (cartaPendiente === inst) c.classList.add('pendiente');
        enlazarArrastre(c, inst);
        mano.appendChild(c);
      });
    }

    // ── Jugar cartas ─────────────────────────────────────────────────────────
    async function animarLanzamiento(inst: CartaInstancia, desde: HTMLElement | null) {
      const def = inst.def;
      // Animación especial de cartas raras: carta gigante + estallido de partículas
      if (def.animRara) {
        const grande = renderCarta(def);
        grande.classList.add('carta-showcase', def.animRara);
        document.body.appendChild(grande);
        fx.estallido(def.fx ?? 'impacto');
        audio.sfxRara(def.fx ?? 'divino');
        anuncio(def.subclase ? `✦ ${def.subclase} ✦` : def.nombre, 'anuncio-rara');
        await espera(850);
        grande.remove();
      } else if (desde) {
        const r = desde.getBoundingClientRect();
        const clon = desde.cloneNode(true) as HTMLElement;
        clon.classList.add('carta-volando');
        clon.style.left = `${r.left}px`;
        clon.style.top = `${r.top}px`;
        document.body.appendChild(clon);
        requestAnimationFrame(() => clon.classList.add('carta-volando-fin'));
        setTimeout(() => clon.remove(), 420);
        audio.sfx('carta');
        await espera(160);
      }
    }

    async function jugar(inst: CartaInstancia, objetivo?: EnemigoCombate) {
      if (!combate.puedeJugar(inst)) return;
      cartaPendiente = null;
      modoObjetivo = false;
      const elem = raiz.querySelector(
        `.carta[data-mano="${combate.jugador.mano.indexOf(inst)}"]`,
      ) as HTMLElement | null;
      await animarLanzamiento(inst, elem);
      await combate.jugarCarta(inst, objetivo);
    }

    /** Vista ampliada de una carta (toque en móvil: leer, no jugar). */
    function ampliarCarta(inst: CartaInstancia) {
      const zoom = el('div', 'zoom-carta');
      const fila = el('div', 'zoom-fila');
      const grande = renderCarta(defDe(inst));
      if (inst.mejorada) grande.classList.add('carta-mejorada');
      fila.appendChild(grande);
      fila.appendChild(cuadroPalabrasClave(defDe(inst)));
      zoom.appendChild(fila);
      zoom.appendChild(el('p', 'zoom-ayuda', 'Arrastra la carta para jugarla · toca para cerrar'));
      zoom.addEventListener('pointerdown', () => zoom.remove());
      document.body.appendChild(zoom);
    }

    function jugarSobre(idxEnemigo: number) {
      const inst = cartaPendiente;
      if (!inst) return;
      const enemigo = combate.enemigos[idxEnemigo];
      if (!enemigo?.vivo) return;
      void jugar(inst, enemigo);
    }

    function motivoNoJugable(inst: CartaInstancia): string {
      const def = defDe(inst);
      if (combate.jugador.energia < def.coste) return 'Sin energía suficiente';
      if (def.requiereConjuro)
        return `◈ Necesitas un espacio de conjuro de nivel ${def.requiereConjuro}+`;
      return 'No puedes jugar esa carta ahora';
    }

    function activarCarta(inst: CartaInstancia) {
      if (!combate.puedeJugar(inst)) {
        anuncio(motivoNoJugable(inst), 'anuncio-error');
        return;
      }
      if (inst.def.objetivo === 'enemigo') {
        const vivos = combate.enemigos.filter((e) => e.vivo);
        if (vivos.length === 1) {
          void jugar(inst, vivos[0]);
        } else {
          cartaPendiente = inst;
          modoObjetivo = true;
          objetivoIdxValido();
          render();
        }
      } else {
        void jugar(inst);
      }
    }

    // ── Arrastrar y soltar ───────────────────────────────────────────────────
    function enlazarArrastre(elemCarta: HTMLElement, inst: CartaInstancia) {
      elemCarta.addEventListener('pointerdown', (ev) => {
        if (combate.enResolucion || combate.terminado) return;
        ev.preventDefault();
        const inicioX = ev.clientX;
        const inicioY = ev.clientY;
        let movido = false;

        let idxSobre = -1; // enemigo bajo el cursor (para el texto dinámico)
        const alMover = (e: PointerEvent) => {
          const dx = e.clientX - inicioX;
          const dy = e.clientY - inicioY;
          if (!movido && Math.hypot(dx, dy) > 10) {
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
          // IMPORTANTE: detecta el enemigo bajo el cursor ANTES de soltar la carta.
          // Mientras se arrastra, la carta tiene pointer-events:none; si quitáramos
          // la clase primero, elementFromPoint devolvería la propia carta (aún bajo
          // el cursor por la transición de vuelta a la mano) y el drop fallaría.
          const sobre = movido
            ? document.elementFromPoint(e.clientX, e.clientY)?.closest('.enemigo')
            : null;
          elemCarta.classList.remove('arrastrando');
          elemCarta.style.removeProperty('--dx');
          elemCarta.style.removeProperty('--dy');
          document.body.classList.remove('arrastre-activo');
          raiz.classList.remove('mostrar-linea');
          arrastrando = null;

          if (!movido) {
            if (e.pointerType === 'touch') {
              // en táctil un toque AMPLÍA la carta (para leerla); se juega arrastrando
              ampliarCarta(inst);
              return;
            }
            // clic de ratón: seleccionar / activar
            seleccion = combate.jugador.mano.indexOf(inst);
            activarCarta(inst);
            return;
          }
          if (inst.def.objetivo === 'enemigo') {
            if (sobre) {
              const idx = Number((sobre as HTMLElement).dataset.idx);
              if (combate.puedeJugar(inst)) void jugar(inst, combate.enemigos[idx]);
              else anuncio(motivoNoJugable(inst), 'anuncio-error');
              return;
            }
          } else if (e.clientY < window.innerHeight * 0.62) {
            if (combate.puedeJugar(inst)) void jugar(inst);
            else anuncio(motivoNoJugable(inst), 'anuncio-error');
            return;
          }
          render(); // vuelve a la mano
        };

        window.addEventListener('pointermove', alMover);
        window.addEventListener('pointerup', alSoltar);
      });
    }

    // ── Teclado (simulando mando) ────────────────────────────────────────────
    function alTeclar(ev: KeyboardEvent) {
      if (combate.terminado) return;
      const mano = combate.jugador.mano;
      switch (ev.code) {
        case 'ArrowLeft':
        case 'ArrowRight': {
          ev.preventDefault();
          const dir = ev.code === 'ArrowRight' ? 1 : -1;
          if (modoObjetivo) {
            const vivos = combate.enemigos.map((e, i) => (e.vivo ? i : -1)).filter((i) => i >= 0);
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
          if (combate.enResolucion) return;
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
          if (!combate.enResolucion) void combate.terminarTurno();
          break;
        }
      }
    }
    window.addEventListener('keydown', alTeclar);

    $('.btn-fin-turno').addEventListener('click', () => {
      if (!combate.enResolucion) void combate.terminarTurno();
    });

    // ── Final del combate ────────────────────────────────────────────────────
    let resuelto = false;
    function comprobarFinal() {
      if (!combate.terminado || resuelto) return;
      resuelto = true;
      window.removeEventListener('keydown', alTeclar);
      setTimeout(() => {
        run.pv = Math.max(0, combate.jugador.pv);
        if (combate.terminado === 'victoria') {
          for (const r of run.reliquias) r.finCombate?.(run);
        }
        resolver(combate.terminado!);
      }, 700);
    }

    // ¡Empieza el combate!
    anuncio(
      esJefe ? `☠️ ¡${defs[0].nombre.toUpperCase()}! ☠️` : '⚔️ ¡Combate!',
      esJefe ? 'anuncio-jefe' : '',
    );
    void combate.iniciar();
  });
}
