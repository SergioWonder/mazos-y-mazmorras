import { fx } from '../fx/particulas.ts';
import { el } from './util.ts';
import { EPILOGO_DM } from '../core/escena-final.ts';
import { lapida, type DatosCaida } from '../core/epitafio.ts';
import type { ClaseId } from '../core/types.ts';
import { ACTION_DURATION } from '../fx/hero-rig.ts';
import { HeroSprite } from './hero-sprite.ts';
import { spriteClock } from './puppet-sprite.ts';
import { reducedMotion } from './card-fly.ts';
import { htmlDerrota } from './lapida.ts';
import '../estilos/muerte.css';

/** What the player picks on the end screen. */
export type EleccionFin = 'reintentar' | 'titulo';

/** Still silhouette of the hero on his knees (a single frame of his death, no live animation). */
function siluetaCaida(clase: string): Node | null {
  try {
    const s = new HeroSprite(clase as ClaseId);
    s.play('death');
    s.tick(spriteClock() + ACTION_DURATION.death * 0.3);
    const copia = s.element.cloneNode(true);
    s.destroy();
    return copia;
  } catch {
    return null;
  }
}

/** Cierre de campaña por escenario final: el Acto III tiene dos jefes posibles. */
const EPILOGO: Record<string, string> = {
  ignifax:
    `Ignifax se desploma y la montaña entera tiembla con su último rugido. El oro de su
     tesoro ya no calienta a nadie. Arriba, el asentamiento es ceniza, los muertos
     descansan… y el valle, por fin, vuelve a respirar. Los bardos tienen canción para
     décadas.`,
  contemplador:
    `El último ojo del Contemplador se apaga y sus rayos de colores se deshacen en el aire.
     El laberinto deja de retorcerse y las paredes vuelven a ser piedra y nada más. Arriba,
     el asentamiento es ceniza, los muertos descansan… y el valle, por fin, vuelve a
     respirar. Los bardos tienen canción para décadas.`,
};

export function pantallaFin(
  victoria: boolean,
  clase: string,
  jefeFinal = 'ignifax',
  epilogoDM = false,
  caida: DatosCaida | null = null,
): Promise<EleccionFin> {
  return new Promise((resolver) => {
    const app = document.getElementById('app')!;
    app.innerHTML = '';
    app.className = `pantalla-fin ${victoria ? 'fin-victoria' : 'fin-derrota'}`;

    const raiz = el('div', 'fin');
    const nombreClase = {
    druida: 'Druida 🌿', barbaro: 'Bárbaro 🪓', mago: 'Mago 🔮',
    picaro: 'Pícaro 🗡️', brujo: 'Brujo 🕳️', paladin: 'Paladín 🔨',
  }[clase] ?? clase;
    raiz.innerHTML = victoria
      ? `
        <h1 class="fin-titulo">🏆 ¡VICTORIA!</h1>
        <p class="fin-texto">${EPILOGO[jefeFinal] ?? EPILOGO.ignifax}</p>
        ${epilogoDM ? `<p class="fin-epilogo-dm">🎲 ${EPILOGO_DM}</p>` : ''}
        <p class="fin-sub">Campaña completada con el ${nombreClase}</p>
        <button class="btn-tomar">Volver al título <span class="atajo">[Enter]</span></button>`
      : htmlDerrota(lapida(caida ?? {
        clase, capitulo: 0, subtitulo: '', escenario: 'tierras lejanas', asesino: null, salas: 0, turnos: null, semilla: Date.now(),
      }));
    app.appendChild(raiz);

    let ceniza = 0;
    if (victoria) {
      fx.estallido('divino');
      setTimeout(() => fx.estallido('estrellas'), 400);
    } else {
      const silueta = siluetaCaida(clase);
      if (silueta) raiz.querySelector('.caido-silueta')?.appendChild(silueta);
      // ash drifting down over the tombstone (one flake per tick, a few dozen alive)
      ceniza = window.setInterval(() => {
        fx.emitir('ceniza', Math.random() * window.innerWidth, -8);
      }, reducedMotion() ? 600 : 170);
    }

    const cerrar = (eleccion: EleccionFin) => {
      window.removeEventListener('keydown', teclado);
      clearInterval(ceniza);
      resolver(eleccion);
    };
    const teclado = (ev: KeyboardEvent) => {
      if (ev.code === 'Enter' || ev.code === 'Space') {
        ev.preventDefault();
        cerrar(victoria ? 'titulo' : 'reintentar');
      } else if (ev.code === 'Escape' && !victoria) {
        ev.preventDefault();
        cerrar('titulo');
      }
    };
    window.addEventListener('keydown', teclado);
    if (victoria) raiz.querySelector('.btn-tomar')!.addEventListener('click', () => cerrar('titulo'));
    else {
      raiz.querySelector('.btn-reintentar')!.addEventListener('click', () => cerrar('reintentar'));
      raiz.querySelector('.btn-titulo')!.addEventListener('click', () => cerrar('titulo'));
    }
  });
}
