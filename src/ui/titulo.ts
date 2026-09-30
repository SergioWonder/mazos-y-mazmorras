import type { ClaseId } from '../core/types.ts';
import { PV_POR_CLASE } from '../core/run.ts';
import { fx } from '../fx/particulas.ts';
import { el } from './util.ts';
import { VERSION } from '../version.ts';
import { pantallaCompendio } from './compendio.ts';
import { showGallery } from './gallery.ts';
import { registrarAccesosMenuPrincipal } from './menu-ajustes.ts';
import { PuppetStage } from './puppet-stage.ts';
import { HeroSprite } from './hero-sprite.ts';
import { finalVerdaderoDesbloqueado } from '../core/escena-final.ts';

export type EleccionTitulo = { tipo: 'nueva'; clase: ClaseId } | { tipo: 'continuar' };

export function pantallaTitulo(puedeContinuar: boolean): Promise<EleccionTitulo> {
  return new Promise((resolver) => {
    const app = document.getElementById('app')!;
    app.innerHTML = '';
    app.className = 'pantalla-titulo';
    fx.ambiente(true);

    const raiz = el('div', 'titulo');
    raiz.innerHTML = `
      <div class="titulo-marco">
        <h1 class="titulo-juego"><span>Dracs</span> <em>&</em> <span>Rogues</span></h1>
        <p class="titulo-sub">Seis clases, tres actos y dos caminos posibles en cada uno</p>
        ${
          puedeContinuar
            ? `<button class="btn-tomar btn-continuar">📜 Continuar partida guardada</button>`
            : ''
        }
        <p class="titulo-intro">
          Los tambores de guerra resuenan en el valle. Una banda de goblins, al servicio
          del temible <strong>Gorzug</strong>, asola las aldeas del condado.
          Elige tu héroe y arrasa su campamento.
        </p>
        <div class="seleccion-clase">
          <button class="clase-carta clase-druida" data-clase="druida">
            <span class="clase-icono"></span>
            <span class="clase-nombre">Druida</span>
            <span class="clase-pv">❤️ ${PV_POR_CLASE.druida} PV</span>
            <span class="clase-desc">Transformaciones salvajes, raíces que
            estrangulan y el poder de los Círculos.</span>
          </button>
          <button class="clase-carta clase-barbaro" data-clase="barbaro">
            <span class="clase-icono"></span>
            <span class="clase-nombre">Bárbaro</span>
            <span class="clase-pv">❤️ ${PV_POR_CLASE.barbaro} PV</span>
            <span class="clase-desc">Furia imparable que crece golpe a golpe…
            pero que se apaga si no derramas sangre.</span>
          </button>
          <button class="clase-carta clase-mago" data-clase="mago">
            <span class="clase-icono"></span>
            <span class="clase-nombre">Mago</span>
            <span class="clase-pv">❤️ ${PV_POR_CLASE.mago} PV</span>
            <span class="clase-desc">Espacios de conjuro que crecen en pirámide
            y conjuros devastadores que los consumen.</span>
          </button>
          <button class="clase-carta clase-picaro" data-clase="picaro">
            <span class="clase-icono"></span>
            <span class="clase-nombre">Pícaro</span>
            <span class="clase-pv">❤️ ${PV_POR_CLASE.picaro} PV</span>
            <span class="clase-desc">Acrobacias, dagas y ataques furtivos;
            roba, descarta y envenena desde las sombras.</span>
          </button>
          <button class="clase-carta clase-brujo" data-clase="brujo">
            <span class="clase-icono"></span>
            <span class="clase-nombre">Brujo</span>
            <span class="clase-pv">❤️ ${PV_POR_CLASE.brujo} PV</span>
            <span class="clase-desc">Una Explosión que siempre vuelve, pactos
            que condenan a muerte y bloqueo que muerde.</span>
          </button>
          <button class="clase-carta clase-paladin" data-clase="paladin">
            <span class="clase-icono"></span>
            <span class="clase-nombre">Paladín</span>
            <span class="clase-pv">❤️ ${PV_POR_CLASE.paladin} PV</span>
            <span class="clase-desc">Martillo y escudo: Castigos que cargan su
            siguiente golpe y Fervor que brota de cada Golpe y Defensa.</span>
          </button>
        </div>
        <p class="titulo-ayuda">←→ y Enter, o haz clic para elegir</p>
        <p class="titulo-version">v${VERSION}${
          finalVerdaderoDesbloqueado()
            ? ' · <span class="titulo-final-verdadero" title="Has visto el final verdadero">🎲 Final verdadero desbloqueado</span>'
            : ''
        }</p>
      </div>
    `;
    app.appendChild(raiz);

    // Each class card shows its hero as the backlit puppet, idle. One fixed WebGL stage
    // draws them all over the cards (SVG fallback without WebGL2).
    const stage = PuppetStage.create(raiz, { fixed: true, style: 'z-index:6;' });
    const heroes = [...raiz.querySelectorAll<HTMLButtonElement>('.clase-carta')].map((carta) => {
      const heroe = new HeroSprite(carta.dataset.clase as ClaseId, stage);
      carta.querySelector('.clase-icono')!.appendChild(heroe.element);
      return heroe;
    });

    const botones = [...raiz.querySelectorAll<HTMLButtonElement>('.clase-carta, .btn-continuar')];
    let idx = 0;
    const marcar = () => botones.forEach((b, i) => b.classList.toggle('clase-activa', i === idx));
    marcar();

    const activar = async (b: HTMLButtonElement) => {
      if (b.classList.contains('btn-continuar')) return terminar({ tipo: 'continuar' });
      // a new run overwrites the saved one: ask first
      if (puedeContinuar && !(await superponer(confirmarNuevaPartida))) return;
      terminar({ tipo: 'nueva', clase: b.dataset.clase as ClaseId });
    };

    const teclado = (ev: KeyboardEvent) => {
      if (ev.code === 'ArrowLeft' || ev.code === 'ArrowRight') {
        idx = (idx + (ev.code === 'ArrowRight' ? 1 : -1) + botones.length) % botones.length;
        marcar();
      } else if (ev.code === 'Enter' || ev.code === 'Space') {
        ev.preventDefault();
        void activar(botones[idx]);
      }
    };
    window.addEventListener('keydown', teclado);

    function terminar(eleccion: EleccionTitulo) {
      window.removeEventListener('keydown', teclado);
      registrarAccesosMenuPrincipal(null);
      for (const h of heroes) h.destroy();
      stage?.destroy();
      resolver(eleccion);
    }

    botones.forEach((b) => b.addEventListener('click', () => void activar(b)));

    // Overlays (compendium, gallery, confirmation) pause the title's keyboard navigation
    // while open; only one at a time, whether opened here or from the settings panel
    let superpuesta = false;
    async function superponer<T>(abrir: () => Promise<T>): Promise<T | undefined> {
      if (superpuesta) return undefined;
      superpuesta = true;
      window.removeEventListener('keydown', teclado);
      try {
        return await abrir();
      } finally {
        window.addEventListener('keydown', teclado);
        superpuesta = false;
      }
    }
    // The compendium and the sprite gallery open from the settings panel (⚙️)
    registrarAccesosMenuPrincipal({
      compendio: () => void superponer(pantallaCompendio),
      galeria: () => void superponer(showGallery),
    });
  });
}

/** Asks before a new run overwrites the saved one. Resolves true to go ahead. */
function confirmarNuevaPartida(): Promise<boolean> {
  return new Promise((resolver) => {
    const capa = el('div', 'confirmar-fondo');
    capa.setAttribute('role', 'alertdialog');
    capa.setAttribute('aria-modal', 'true');
    capa.innerHTML = `
      <div class="confirmar">
        <h3>⚠️ ¿Empezar una partida nueva?</h3>
        <p>Tienes una partida guardada. Si empiezas otra, <strong>se borrará para siempre</strong>.</p>
        <div class="confirmar-acciones">
          <button class="btn-tomar btn-cancelar">Volver</button>
          <button class="btn-tomar btn-borrar">🗑️ Borrar y empezar</button>
        </div>
      </div>`;
    document.body.appendChild(capa);
    const cerrar = (ok: boolean) => {
      window.removeEventListener('keydown', teclado, true);
      capa.remove();
      resolver(ok);
    };
    // capture phase: Escape cancels and no key reaches the title underneath
    const teclado = (ev: KeyboardEvent) => {
      if (ev.code === 'Escape') { ev.preventDefault(); ev.stopImmediatePropagation(); cerrar(false); }
    };
    window.addEventListener('keydown', teclado, true);
    capa.querySelector('.btn-cancelar')!.addEventListener('click', () => cerrar(false));
    capa.querySelector('.btn-borrar')!.addEventListener('click', () => cerrar(true));
    capa.addEventListener('click', (ev) => { if (ev.target === capa) cerrar(false); });
    capa.querySelector<HTMLButtonElement>('.btn-cancelar')!.focus(); // the safe choice by default
  });
}
