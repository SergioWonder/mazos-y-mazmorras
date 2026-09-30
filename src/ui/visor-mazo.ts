// Deck viewer: a full-screen list of cards (the run deck from the map, the draw
// or discard pile in combat). It swallows the keys while open so the screen
// underneath does not react, and closes with Esc, the ✕ or a tap outside.

import type { CartaInstancia } from '../core/types.ts';
import { defDe } from '../core/cartas.ts';
import { el } from './util.ts';
import { renderCarta } from './carta.ts';
import { ordenarParaVisor } from './visor-mazo-orden.ts';

export function verCartas(titulo: string, cartas: CartaInstancia[], nota = ''): void {
  if (document.querySelector('.visor-mazo')) return;
  const capa = el('div', 'visor-mazo');
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-label', titulo);
  capa.innerHTML = `
    <div class="visor-panel">
      <div class="visor-cabecera">
        <h2>${titulo} <small>(${cartas.length})</small></h2>
        <button class="visor-cerrar" aria-label="Cerrar">✕</button>
      </div>
      ${nota ? `<p class="visor-nota">${nota}</p>` : ''}
      <div class="visor-rejilla"></div>
    </div>`;
  const rejilla = capa.querySelector('.visor-rejilla') as HTMLElement;
  if (cartas.length === 0) rejilla.innerHTML = '<p class="visor-vacio">No hay ninguna carta.</p>';
  for (const inst of ordenarParaVisor(cartas)) rejilla.appendChild(renderCarta(defDe(inst)));
  document.body.appendChild(capa);

  const cerrar = () => {
    window.removeEventListener('keydown', teclado, true);
    capa.remove();
  };
  // capture phase: the keys never reach the map or the combat underneath
  const teclado = (ev: KeyboardEvent) => {
    ev.stopImmediatePropagation();
    if (ev.code === 'Escape' || ev.code === 'Enter' || ev.code === 'Space') {
      ev.preventDefault();
      cerrar();
    }
  };
  window.addEventListener('keydown', teclado, true);
  capa.querySelector('.visor-cerrar')!.addEventListener('click', cerrar);
  capa.addEventListener('click', (ev) => { if (ev.target === capa) cerrar(); });
}
