import { fx } from '../fx/particulas.ts';
import { el } from './util.ts';

export function pantallaFin(victoria: boolean, clase: string): Promise<void> {
  return new Promise((resolver) => {
    const app = document.getElementById('app')!;
    app.innerHTML = '';
    app.className = `pantalla-fin ${victoria ? 'fin-victoria' : 'fin-derrota'}`;

    const raiz = el('div', 'fin');
    const nombreClase = { druida: 'Druida 🌿', barbaro: 'Bárbaro 🪓', mago: 'Mago 🔮' }[clase] ?? clase;
    raiz.innerHTML = victoria
      ? `
        <h1 class="fin-titulo">🏆 ¡VICTORIA!</h1>
        <p class="fin-texto">La filacteria de Vol'guth estalla en mil esquirlas de luz fría.
        Los muertos vuelven a su descanso y, arriba, el asentamiento no es más que ceniza.
        Las aldeas del condado vuelven a respirar.</p>
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
