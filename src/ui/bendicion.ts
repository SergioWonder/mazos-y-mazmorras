import type { EstadoRun } from '../core/types.ts';
import { reliquiaAleatoria } from '../core/eventos.ts';
import { instanciar, NEUTRALES_ESPECIALES, cartaUnicaDeClase } from '../core/cartas.ts';
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
    icono: '👑', nombre: 'Don del Tesoro',
    detalle: 'Obtienes 2 reliquias al azar',
    aplicar: (run, rng) => {
      reliquiaAleatoria(run, rng);
      reliquiaAleatoria(run, rng);
    },
  },
  {
    icono: '🔮', nombre: 'Don del Maná Eterno',
    detalle: '+1 de energía en los 2 primeros turnos de cada combate',
    aplicar: (run) => { run.permanentes.energiaInicial += 1; },
  },
  {
    icono: '⚡', nombre: 'Don del Berserker',
    detalle: '+1 de Fuerza y +1 de Destreza al inicio de cada combate',
    aplicar: (run) => {
      run.permanentes.fuerza += 1;
      run.permanentes.destreza += 1;
    },
  },
  {
    icono: '🍀', nombre: 'Don del Peregrino',
    detalle: '+10 PV máximos y obtienes 1 reliquia al azar',
    aplicar: (run, rng) => {
      run.pvMax += 10;
      reliquiaAleatoria(run, rng);
    },
  },
];

/** Cartas únicas incoloras que ofrece la Vidente según el acto que vas a empezar. */
const DON_CARTA: Record<string, Don> = {
  seducir: {
    icono: '💘', nombre: 'Carta única: Seducir',
    detalle: 'Añade «Seducir» a tu mazo (incolora, tira 1d20)',
    aplicar: (run) => { run.mazo.push(instanciar(NEUTRALES_ESPECIALES.find((c) => c.id === 'seducir')!)); },
  },
  deseo: {
    icono: '🌠', nombre: 'Carta única: Deseo',
    detalle: 'Añade «Deseo» a tu mazo (incolora, tira 1d20)',
    aplicar: (run) => { run.mazo.push(instanciar(NEUTRALES_ESPECIALES.find((c) => c.id === 'deseo')!)); },
  },
};

/**
 * Encuentro especial entre actos: Síbila, la Vidente del Manantial.
 * Cura por completo y ofrece 3 dones (de un pool mayor) a elegir 1.
 */
export function pantallaBendicion(run: EstadoRun, rng: () => number): Promise<void> {
  return new Promise((resolver) => {
    // Al pasar al Acto II se ofrece «Seducir»; al Acto III, «Deseo» + la carta
    // única de tu clase (rareza especial).
    const especiales: Don[] = [];
    if (run.capitulo === 0) {
      especiales.push(DON_CARTA.seducir);
    } else if (run.capitulo === 1) {
      const unica = cartaUnicaDeClase(run.clase);
      especiales.push({
        icono: '🌟', nombre: `Carta única: ${unica.nombre}`,
        detalle: `Añade «${unica.nombre}» a tu mazo (única de clase)`,
        aplicar: (r) => { r.mazo.push(instanciar(unica)); },
      });
      especiales.push(DON_CARTA.deseo);
    }
    const ofrecidos = [...especiales, ...barajar(rng, DONES).slice(0, Math.max(1, 3 - especiales.length))];

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
