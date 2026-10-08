import type { Capitulo } from '../core/enemigos.ts';
import type { ClaseId } from '../core/types.ts';
import { fx } from '../fx/particulas.ts';
import { el } from './util.ts';
import { sceneArt, chapterSceneId } from './scene-art.ts';
import { chapterLayers } from './chapter-layers.ts';
import { HeroBackSprite } from './hero-back-sprite.ts';

/** Chapter opening: the scenario's view and, when it is layered, the hero walking into it. */
export function pantallaCapitulo(cap: Capitulo, clase: ClaseId): Promise<void> {
  return new Promise((resolver) => {
    const app = document.getElementById('app')!;
    app.innerHTML = '';
    app.className = 'pantalla-fin pantalla-capitulo';
    fx.ambiente(true);

    const capas = chapterLayers(chapterSceneId(cap), cap.nombre);
    const raiz = el('div', 'fin');
    raiz.innerHTML = `
      <p class="titulo-sub">${cap.subtitulo}</p>
      ${capas ? capas.html : sceneArt(chapterSceneId(cap), '', 'capitulo-arte', cap.nombre)}
      <h1 class="fin-titulo capitulo-nombre">${cap.nombre}</h1>
      <p class="fin-texto">${cap.intro}</p>
      <button class="btn-tomar">Adentrarse <span class="atajo">[Enter]</span></button>
    `;
    app.appendChild(raiz);
    const heroe = capas ? new HeroBackSprite(clase) : null;
    if (capas && heroe) capas.place(raiz, heroe.element);

    const cerrar = () => {
      window.removeEventListener('keydown', teclado);
      heroe?.destroy();
      resolver();
    };
    const teclado = (ev: KeyboardEvent) => {
      if (ev.code === 'Enter' || ev.code === 'Space') {
        ev.preventDefault();
        cerrar();
      }
    };
    window.addEventListener('keydown', teclado);
    raiz.querySelector('.btn-tomar')!.addEventListener('click', cerrar);
  });
}
