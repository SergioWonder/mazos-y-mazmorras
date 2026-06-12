import type { Capitulo } from '../core/enemigos.ts';
import { fx } from '../fx/particulas.ts';
import { el } from './util.ts';

/** Pantalla de introducción de capítulo. */
export function pantallaCapitulo(cap: Capitulo): Promise<void> {
  return new Promise((resolver) => {
    const app = document.getElementById('app')!;
    app.innerHTML = '';
    app.className = 'pantalla-fin pantalla-capitulo';
    fx.ambiente(true);

    const raiz = el('div', 'fin');
    raiz.innerHTML = `
      <p class="titulo-sub">${cap.subtitulo}</p>
      <h1 class="fin-titulo capitulo-nombre">${cap.nombre}</h1>
      <p class="fin-texto">${cap.intro}</p>
      <button class="btn-tomar">Adentrarse <span class="atajo">[Enter]</span></button>
    `;
    app.appendChild(raiz);

    const cerrar = () => {
      window.removeEventListener('keydown', teclado);
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
