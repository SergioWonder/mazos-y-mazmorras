import type { EstadoRun } from '../core/types.ts';
import { reliquiaAleatoria } from '../core/eventos.ts';
import { barajar } from '../core/rng.ts';
import { fx } from '../fx/particulas.ts';
import { el, anuncio } from './util.ts';

interface Don {
  icono: string;
  nombre: string;
  detalle: string;
  aplicar: (run: EstadoRun, rng: () => number) => void;
}

const DONES: Don[] = [
  {
    icono: '💎', nombre: 'Don del Vigor',
    detalle: '+1 de energía máxima… pero solo contra élites y jefes',
    aplicar: (run) => { run.permanentes.energiaElite += 1; },
  },
  {
    icono: '❤️', nombre: 'Don de la Vida',
    detalle: '+20 PV máximos',
    aplicar: (run) => { run.pvMax += 20; },
  },
  {
    icono: '🧠', nombre: 'Don de la Mente',
    detalle: 'Robas 1 carta adicional cada turno y +5 PV máximos',
    aplicar: (run) => {
      run.permanentes.robo += 1;
      run.pvMax += 5;
    },
  },
  {
    icono: '💪', nombre: 'Don de la Fuerza',
    detalle: '+1 de Fuerza al inicio de cada combate',
    aplicar: (run) => { run.permanentes.fuerza += 1; },
  },
  {
    icono: '🌀', nombre: 'Don de la Destreza',
    detalle: '+1 de Destreza al inicio de cada combate',
    aplicar: (run) => { run.permanentes.destreza += 1; },
  },
  {
    icono: '👑', nombre: 'Don del Tesoro',
    detalle: 'Obtienes 2 reliquias al azar',
    aplicar: (run, rng) => {
      reliquiaAleatoria(run, rng);
      reliquiaAleatoria(run, rng);
    },
  },
];

/**
 * Encuentro especial entre actos: Síbila, la Vidente del Manantial.
 * Cura por completo y ofrece 3 dones (de un pool mayor) a elegir 1.
 */
export function pantallaBendicion(run: EstadoRun, rng: () => number): Promise<void> {
  return new Promise((resolver) => {
    const ofrecidos = barajar(rng, DONES).slice(0, 3);

    const app = document.getElementById('app')!;
    app.innerHTML = '';
    app.className = 'pantalla-fin pantalla-bendicion';
    fx.ambiente(true);
    fx.estallido('estrellas');

    const raiz = el('div', 'fin');
    raiz.innerHTML = `
      <p class="titulo-sub">Encuentro especial</p>
      <div class="bendicion-arte">🧝‍♀️</div>
      <h1 class="fin-titulo capitulo-nombre">Síbila, la Vidente del Manantial</h1>
      <p class="fin-texto">La encuentras donde el agua nace de la roca, como si llevara
      siglos esperándote. «Has hecho retroceder a la oscuridad, peregrino. Descansa:
      el manantial cerrará tus heridas… y yo te daré algo más para el camino.»</p>
      <p class="bendicion-cura">✨ Te cura por completo (${run.pv} → ${run.pvMax} PV)</p>
      <div class="evento-opciones bendicion-opciones"></div>
    `;
    app.appendChild(raiz);

    const cont = raiz.querySelector('.bendicion-opciones') as HTMLElement;
    const botones: HTMLButtonElement[] = ofrecidos.map((don, i) => {
      const b = el('button', 'evento-opcion') as HTMLButtonElement;
      b.innerHTML = `<span class="op-etiqueta">${don.icono} ${don.nombre}</span>
        <span class="op-detalle">${don.detalle}</span>`;
      b.style.setProperty('--retraso', `${0.3 + i * 0.1}s`);
      b.addEventListener('click', () => elegirDon(don));
      cont.appendChild(b);
      return b;
    });

    let idx = 0;
    const marcar = () => botones.forEach((b, i) => b.classList.toggle('op-foco', i === idx));
    marcar();

    function elegirDon(don: Don) {
      don.aplicar(run, rng);
      run.pv = run.pvMax; // curación completa
      fx.estallido('divino');
      anuncio(`${don.icono} ${don.nombre}`, 'anuncio-rara');
      window.removeEventListener('keydown', teclado);
      setTimeout(resolver, 900);
    }

    const teclado = (ev: KeyboardEvent) => {
      if (ev.code === 'ArrowDown' || ev.code === 'ArrowRight') {
        ev.preventDefault();
        idx = (idx + 1) % botones.length;
        marcar();
      } else if (ev.code === 'ArrowUp' || ev.code === 'ArrowLeft') {
        ev.preventDefault();
        idx = (idx - 1 + botones.length) % botones.length;
        marcar();
      } else if (ev.code === 'Enter' || ev.code === 'Space') {
        ev.preventDefault();
        elegirDon(ofrecidos[idx]);
      }
    };
    window.addEventListener('keydown', teclado);
  });
}
