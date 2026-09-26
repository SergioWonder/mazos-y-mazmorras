import type { ClaseId } from '../core/types.ts';
import { PV_POR_CLASE } from '../core/run.ts';
import { fx } from '../fx/particulas.ts';
import { el } from './util.ts';
import { VERSION } from '../version.ts';
import { pantallaCompendio } from './compendio.ts';
import { showGallery } from './gallery.ts';
import { avisosDisponibles, avisosActivados, cambiarAvisos } from './actualizacion.ts';
import { PuppetStage } from './puppet-stage.ts';
import { HeroSprite } from './hero-sprite.ts';

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
        <h1 class="titulo-juego"><span>Mazo</span> <em>&</em> <span>Mazmorra</span></h1>
        <p class="titulo-sub">Cinco clases, tres actos y dos caminos posibles en cada uno</p>
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
        </div>
        ${
          puedeContinuar
            ? `<button class="btn-tomar btn-continuar">📜 Continuar partida guardada</button>`
            : ''
        }
        <button class="btn-tomar btn-compendio">📖 Compendio de cartas</button>
        <button class="btn-tomar btn-galeria">🎭 Galería de sprites</button>
        ${avisosDisponibles() ? '<button class="btn-tomar btn-avisos"></button>' : ''}
        <p class="titulo-ayuda">←→ y Enter, o haz clic para elegir</p>
        <p class="titulo-version">v${VERSION}</p>
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

    const activar = (b: HTMLButtonElement) => {
      if (b.classList.contains('btn-continuar')) terminar({ tipo: 'continuar' });
      else terminar({ tipo: 'nueva', clase: b.dataset.clase as ClaseId });
    };

    const teclado = (ev: KeyboardEvent) => {
      if (ev.code === 'ArrowLeft' || ev.code === 'ArrowRight') {
        idx = (idx + (ev.code === 'ArrowRight' ? 1 : -1) + botones.length) % botones.length;
        marcar();
      } else if (ev.code === 'Enter' || ev.code === 'Space') {
        ev.preventDefault();
        activar(botones[idx]);
      }
    };
    window.addEventListener('keydown', teclado);

    function terminar(eleccion: EleccionTitulo) {
      window.removeEventListener('keydown', teclado);
      for (const h of heroes) h.destroy();
      stage?.destroy();
      resolver(eleccion);
    }

    botones.forEach((b) => b.addEventListener('click', () => activar(b)));

    // Compendio: pausa la navegación por teclado del título mientras está abierto
    raiz.querySelector('.btn-compendio')!.addEventListener('click', async () => {
      window.removeEventListener('keydown', teclado);
      await pantallaCompendio();
      window.addEventListener('keydown', teclado);
    });

    // Major-version notifications: the browser asks for permission on this click
    const btnAvisos = raiz.querySelector<HTMLButtonElement>('.btn-avisos');
    const pintarAvisos = () => {
      if (!btnAvisos) return;
      const bloqueados = Notification.permission === 'denied';
      btnAvisos.disabled = bloqueados;
      btnAvisos.textContent = bloqueados
        ? '🔕 Avisos bloqueados en el navegador'
        : avisosActivados() ? '🔔 Avisos de versiones mayores: activados' : '🔕 Avisarme de versiones mayores';
    };
    pintarAvisos();
    btnAvisos?.addEventListener('click', async () => {
      await cambiarAvisos(!avisosActivados());
      pintarAvisos();
    });

    // Sprite gallery: heroes, druid forms, invocations and enemies, animated
    raiz.querySelector('.btn-galeria')!.addEventListener('click', async () => {
      window.removeEventListener('keydown', teclado);
      await showGallery();
      window.addEventListener('keydown', teclado);
    });
  });
}
