// Interface sounds shared by every screen: a soft click on buttons and toggles, and
// the sound of a card taken into the deck when a reward card is chosen. One delegated
// listener, so new buttons get their click without wiring anything.

import { audio } from '../fx/audio.ts';

/** Controls that click when pressed (disabled buttons fire no click event at all). */
const CLICABLES = 'button, [role="button"], input[type="checkbox"], summary';
/** Reward cards: choosing one sounds like a card going into the deck. */
const CARTA_ELEGIBLE = '.carta-recompensa';

let activo = false;

/** Installs the delegated listener (once). */
export function activarSonidoInterfaz() {
  if (activo) return;
  activo = true;
  // capture phase: it still sounds when a handler stops the event or removes the button
  document.addEventListener('click', (ev) => {
    const objetivo = ev.target instanceof Element ? ev.target : null;
    if (!objetivo) return;
    if (objetivo.closest(CARTA_ELEGIBLE)) audio.sfx('robar');
    else if (objetivo.closest(CLICABLES)) audio.sfx('click');
  }, true);
}
