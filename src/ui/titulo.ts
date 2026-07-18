import type { ClaseId } from '../core/types.ts';
import { PV_POR_CLASE } from '../core/run.ts';
import { fx } from '../fx/particulas.ts';
import { el } from './util.ts';
import { VERSION } from '../version.ts';
import { pantallaCompendio } from './compendio.ts';

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
        <p class="titulo-sub">Del Asentamiento Ogro a la Guarida del Dragón</p>
        <p class="titulo-intro">
          Los tambores de guerra resuenan en el valle. Una banda de goblins, al servicio
          del temible <strong>Gorzug</strong>, asola las aldeas del condado.
          Elige tu héroe y arrasa su campamento.
        </p>
        <div class="seleccion-clase">
          <button class="clase-carta clase-druida" data-clase="druida">
            <span class="clase-icono">🌿</span>
            <span class="clase-nombre">Druida</span>
            <span class="clase-pv">❤️ ${PV_POR_CLASE.druida} PV</span>
            <span class="clase-desc">Transformaciones salvajes, raíces que
            estrangulan y el poder de los Círculos.</span>
          </button>
          <button class="clase-carta clase-barbaro" data-clase="barbaro">
            <span class="clase-icono">🪓</span>
            <span class="clase-nombre">Bárbaro</span>
            <span class="clase-pv">❤️ ${PV_POR_CLASE.barbaro} PV</span>
            <span class="clase-desc">Furia imparable que crece golpe a golpe…
            pero que se apaga si no derramas sangre.</span>
          </button>
          <button class="clase-carta clase-mago" data-clase="mago">
            <span class="clase-icono">🔮</span>
            <span class="clase-nombre">Mago</span>
            <span class="clase-pv">❤️ ${PV_POR_CLASE.mago} PV</span>
            <span class="clase-desc">Espacios de conjuro que crecen en pirámide
            y conjuros devastadores que los consumen.</span>
          </button>
          <button class="clase-carta clase-picaro" data-clase="picaro">
            <span class="clase-icono">🗡️</span>
            <span class="clase-nombre">Pícaro</span>
            <span class="clase-pv">❤️ ${PV_POR_CLASE.picaro} PV</span>
            <span class="clase-desc">Acrobacias, dagas y ataques furtivos;
            roba, descarta y envenena desde las sombras.</span>
          </button>
        </div>
        ${
          puedeContinuar
            ? `<button class="btn-tomar btn-continuar">📜 Continuar partida guardada</button>`
            : ''
        }
        <button class="btn-tomar btn-compendio">📖 Compendio de cartas</button>
        <p class="titulo-ayuda">←→ y Enter, o haz clic para elegir</p>
        <p class="titulo-version">v${VERSION}</p>
      </div>
    `;
    app.appendChild(raiz);

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
      resolver(eleccion);
    }

    botones.forEach((b) => b.addEventListener('click', () => activar(b)));

    // Compendio: pausa la navegación por teclado del título mientras está abierto
    raiz.querySelector('.btn-compendio')!.addEventListener('click', async () => {
      window.removeEventListener('keydown', teclado);
      await pantallaCompendio();
      window.addEventListener('keydown', teclado);
    });
  });
}
