import { Combate, type Presentador } from '../core/combate.ts';
import type {
  CartaInstancia, EnemigoCombate, EnemigoDef, EstadoId, EstadoRun, Luchador,
} from '../core/types.ts';
import { fx } from '../fx/particulas.ts';
import {
  anuncio, centroDe, el, espera, ICONO_ESTADO, NOMBRE_ESTADO, numeroFlotante, sacudir, tipEstado,
} from './util.ts';
import { renderCarta, actualizarTextoCarta, type ModsCarta } from './carta.ts';
import { defDe } from '../core/cartas.ts';

const SPRITE_JUGADOR: Record<string, string> = { druida: '🧝‍♂️', barbaro: '🧔‍♂️', mago: '🧙‍♂️' };
const NOMBRE_CLASE: Record<string, string> = {
  druida: '🌿 Druida', barbaro: '🪓 Bárbaro', mago: '🔮 Mago',
};
const SPRITE_FORMA: Record<string, string> = {
  'Forma de Lobo': '🐺', 'Forma de Oso': '🐻', 'Forma de Águila': '🦅',
  'Forma Lunar': '🐺', 'Forma Estelar': '🦌',
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

    const ui: Presentador = {
      render,
      espera,
      async fxGolpe(obj, dano, efecto = 'tajo') {
        const elem = elemDe(obj);
        const { x, y } = centroDe(elem);
        fx.emitir(efecto, x, y);
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
        numeroFlotante(elem, `+${n} 🛡`, 'bloqueo');
        render();
        await espera(200);
      },
      async fxEstado(obj, estado, n) {
        const elem = elemDe(obj);
        const signo = n > 0 ? '+' : '';
        numeroFlotante(elem, `${ICONO_ESTADO[estado]} ${signo}${n} ${NOMBRE_ESTADO[estado]}`, 'estado');
        render();
        await espera(260);
      },
      async fxCura(obj, n) {
        const elem = elemDe(obj);
        const { x, y } = centroDe(elem);
        fx.emitir('cura', x, y);
        numeroFlotante(elem, `+${n}`, 'cura');
        render();
        await espera(220);
      },
      async fxMuerte(e) {
        const elem = elemDe(e);
        const { x, y } = centroDe(elem);
        fx.emitir('muerte', x, y);
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
        anuncio('💨 ¡La Furia se desvanece!', 'anuncio-furia-perdida');
        sacudir(1);
        await espera(500);
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
        .filter(([, v]) => v !== 0 && v !== undefined)
        .map(
          ([k, v]) =>
            `<span class="estado ${v! < 0 || k === 'raices' ? 'estado-neg' : ''}" data-tip="${tipEstado(k, v!)}">${ICONO_ESTADO[k]}${v}</span>`,
        )
        .join('');
      return `<div class="estados">${fichas}</div>`;
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
      $('.lado-jugador').innerHTML = `
        <div class="heroe ${furiaActiva ? 'con-furia' : ''} ${forma ? 'transformado' : ''} ${
          (j.estados.espejismo ?? 0) > 0 ? 'con-espejismo' : ''
        }" data-luchador="jugador">
          ${j.bloqueo > 0 ? `<div class="bloqueo-ficha">🛡️${j.bloqueo}</div>` : ''}
          <div class="sprite sprite-jugador">${sprite}</div>
          ${barraVida(j)}
          ${fichasEstados(j)}
          <div class="temporales">${temporales}</div>
          ${furiaActiva ? `<div class="furia-ficha" data-tip="<strong>🔥 Furia</strong><br>Fuerza/Destreza acumulada. Se rompe si acabas la ronda sin recibir daño (lo bloqueado no cuenta).">🔥 Furia +${j.furiaFuerza}F${j.furiaDestreza ? ` +${j.furiaDestreza}D` : ''}</div>` : ''}
        </div>`;
    }

    function textoIntencion(e: EnemigoCombate): string {
      const m = e.intencion;
      if (m.dano !== undefined) {
        const d = combate.danoIntencion(e);
        const veces = m.veces && m.veces > 1 ? `×${m.veces}` : '';
        return `<span class="int-ataque">⚔️ ${d}${veces}</span>`;
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
        '<em>Crecen en pirámide: cada nivel exige más espacios del nivel inferior ' +
        '(1 → 2 → 2+1 de nivel 2… máx. nivel 3).</em>';
      const conjuros = combate.jugador.conjuros.length
        ? `<div class="conjuros">
            ${combate.jugador.conjuros
              .map(
                (c) =>
                  `<span class="espacio nivel-${c.nivel} ${c.gastado ? 'gastado' : ''}"
                    data-tip="${tipPiramide}<br><em>Este espacio: nivel ${c.nivel} · ${
                      c.gastado ? 'gastado' : 'libre'
                    }.</em>">◈<i>${c.nivel}</i></span>`,
              )
              .join('')}
          </div>`
        : '';
      $('.energia').innerHTML = `
        <div class="orbe ${combate.jugador.energia === 0 ? 'orbe-vacio' : ''}"
          data-tip="<strong>Energía</strong><br>Coste para jugar cartas. Se recupera cada turno.">
          ${combate.jugador.energia}<span>/${combate.jugador.energiaMax}</span>
        </div>${conjuros}`;
    }

    /** Modificadores en vivo para el texto de las cartas (Fuerza, Débil,
     *  Destreza, Frágil… y Vulnerable del objetivo si se conoce). */
    function modsEnCombate(objetivo?: EnemigoCombate | null): ModsCarta {
      return {
        dano: (base) => {
          const d = combate.danoDeAtaque(combate.jugador, base);
          return objetivo?.vivo ? combate.danoRecibido(objetivo, d) : d;
        },
        bloqueo: (base) => combate.bloqueoDeCarta(base),
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
        const c = renderCarta(defDe(inst), modsEnCombate(objetivo));
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
      const grande = renderCarta(defDe(inst));
      if (inst.mejorada) grande.classList.add('carta-mejorada');
      zoom.appendChild(grande);
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
                modsEnCombate(idx >= 0 ? combate.enemigos[idx] : null),
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
