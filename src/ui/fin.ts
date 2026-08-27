import { fx } from '../fx/particulas.ts';
import { el } from './util.ts';

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
): Promise<void> {
  return new Promise((resolver) => {
    const app = document.getElementById('app')!;
    app.innerHTML = '';
    app.className = `pantalla-fin ${victoria ? 'fin-victoria' : 'fin-derrota'}`;

    const raiz = el('div', 'fin');
    const nombreClase = {
    druida: 'Druida 🌿', barbaro: 'Bárbaro 🪓', mago: 'Mago 🔮',
    picaro: 'Pícaro 🗡️', brujo: 'Brujo 🕳️',
  }[clase] ?? clase;
    raiz.innerHTML = victoria
      ? `
        <h1 class="fin-titulo">🏆 ¡VICTORIA!</h1>
        <p class="fin-texto">${EPILOGO[jefeFinal] ?? EPILOGO.ignifax}</p>
        <p class="fin-sub">Campaña completada con el ${nombreClase}</p>
        <button class="btn-tomar">Volver al título <span class="atajo">[Enter]</span></button>`
      : `
        <h1 class="fin-titulo">☠️ HAS CAÍDO</h1>
        <p class="fin-texto">Tu aventura termina lejos de casa.
        Los bardos cantarán tu valor… tus enemigos, tu derrota.</p>
        <button class="btn-tomar">Intentarlo de nuevo <span class="atajo">[Enter]</span></button>`;
    app.appendChild(raiz);

    if (victoria) {
      fx.estallido('divino');
      setTimeout(() => fx.estallido('estrellas'), 400);
    }

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
