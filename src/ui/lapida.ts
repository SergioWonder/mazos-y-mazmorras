// Markup of the defeat screen (pure string, no DOM, so the smoke test can check it):
// the cracked «HAS CAÍDO» title letter by letter, the backlit fallen hero, the
// engraved tombstone and the buttons.

import type { Lapida } from '../core/epitafio.ts';

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Title split into letters so each one can fall and settle on its own (CSS --i). */
function tituloLetras(txt: string): string {
  return [...txt].map((ch, i) => (ch === ' '
    ? '<span class="hueco"> </span>'
    : `<span class="letra" style="--i:${i}">${escape(ch)}</span>`)).join('');
}

export function htmlDerrota(l: Lapida): string {
  return `
    <div class="derrota-contraluz" aria-hidden="true"></div>
    <h1 class="fin-titulo titulo-caido" aria-label="Has caído">${tituloLetras('HAS CAÍDO')}<span class="grieta" aria-hidden="true"></span></h1>
    <div class="derrota-tumba">
      <div class="caido-silueta" aria-hidden="true"></div>
      <div class="lapida" role="group" aria-label="Lápida">
        <p class="lapida-rip">R.I.P.</p>
        <p class="lapida-clase">${escape(l.clase)}</p>
        <p class="lapida-lugar">${escape(l.lugar).replace(/ (\S+)$/, '&nbsp;$1')}</p>
        ${l.asesino ? `<p class="lapida-asesino">${escape(l.asesino)}</p>` : ''}
        <p class="lapida-cuenta">${escape(l.cuenta)}</p>
        <p class="lapida-epitafio">${escape(l.epitafio)}</p>
      </div>
    </div>
    <div class="derrota-botones">
      <button class="btn-tomar btn-reintentar">Volver a intentarlo <span class="atajo">[Enter]</span></button>
      <button class="btn-tomar btn-secundario btn-titulo">Volver al título <span class="atajo">[Esc]</span></button>
    </div>`;
}
