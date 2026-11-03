// The coin of the two-player game: heads (Cara) is the host, tails (Cruz) the guest. A CSS 3D coin tossed up and
// spinning like the d20 rolls across the screen (fx/dado.ts): it lands on the face the engine already decided, and the
// screen then says whose it is. The result never comes from here: it is only drawn.

import type { Hueco, ResultadoMoneda } from '../core/multi/index.ts';
import { audio } from '../fx/audio.ts';
import { fx } from '../fx/particulas.ts';
import { reducedMotion } from './card-fly.ts';
import { el, espera } from './util.ts';

const MOTIVO: Record<ResultadoMoneda['motivo'], string> = {
  mapa: 'Distinto camino: lo decide la moneda',
  reliquia: 'La misma reliquia: lo decide la moneda',
};
const LANZAMIENTO_MS = 2200;

/** Tosses the coin on screen. Resolves once the result has been read. */
export async function lanzarMoneda(r: ResultadoMoneda, nombres: Record<Hueco, string>): Promise<void> {
  const capa = el('div', 'moneda-fondo');
  capa.setAttribute('role', 'status');
  const cara = (h: Hueco) => {
    const f = el('div', `moneda-faz moneda-${h}`);
    f.append(el('span', 'moneda-lado', h === 'cara' ? 'CARA' : 'CRUZ'), el('span', 'moneda-nombre'));
    (f.lastChild as HTMLElement).textContent = nombres[h];
    return f;
  };
  const titulo = el('p', 'moneda-titulo', MOTIVO[r.motivo]);
  const moneda = el('div', 'moneda');
  // the edge, a few thin discs between the two faces: it reads as a thick piece when it turns
  const canto = el('div', 'moneda-canto');
  for (let i = -3; i <= 3; i++) {
    const d = el('div', 'moneda-disco');
    d.style.transform = `translateZ(${i * 2}px)`;
    canto.appendChild(d);
  }
  moneda.append(cara('cara'), canto, cara('cruz'));
  const resultado = el('p', 'moneda-resultado');
  resultado.textContent = `${r.ganador === 'cara' ? 'Cara' : 'Cruz'}: gana ${nombres[r.ganador]}`;
  const escena = el('div', 'moneda-escena');
  escena.appendChild(moneda);
  capa.append(titulo, escena, resultado);
  document.body.appendChild(capa);

  // whole turns plus the landing face: heads rests at 0°, tails at 180°
  const vueltas = reducedMotion() ? 0 : 5;
  const final = vueltas * 360 + (r.ganador === 'cara' ? 0 : 180);
  audio.sfx('carta');
  const giro = moneda.animate(
    [
      { transform: 'translateY(0) rotateX(0deg) scale(0.7)' },
      { transform: `translateY(-26vh) rotateX(${final * 0.55}deg) scale(1.15)`, offset: 0.45 },
      { transform: `translateY(0) rotateX(${final}deg) scale(1)` },
    ],
    { duration: reducedMotion() ? 200 : LANZAMIENTO_MS, easing: 'cubic-bezier(0.3, 0.1, 0.4, 1)', fill: 'forwards' },
  );
  await giro.finished.catch(() => undefined);
  moneda.classList.add('moneda-quieta');
  escena.classList.add('moneda-quieta'); // the glow goes on the scene: a filter on the coin itself would flatten its 3D
  resultado.classList.add('visible');
  fx.estallido('estrellas');
  await espera(1400);
  capa.classList.add('saliendo');
  await espera(260);
  capa.remove();
}
