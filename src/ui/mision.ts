import type { CartaInstancia, EstadoRun } from '../core/types.ts';
import { fx } from '../fx/particulas.ts';
import { el, anuncio } from './util.ts';
import { renderCarta } from './carta.ts';
import { elegirCarta } from './recompensa.ts';
import { instanciar, poolDeClase } from '../core/cartas.ts';
import { elegir } from '../core/rng.ts';

/**
 * Encuentro inicial: Aldric, el Senescal del Valle, encomienda la misión
 * y ofrece una pequeña ayuda de partida (más floja que la bendición entre actos).
 */
export function pantallaMision(run: EstadoRun, rng: () => number): Promise<void> {
  return new Promise((resolver) => {
    const app = document.getElementById('app')!;
    app.innerHTML = '';
    app.className = 'pantalla-fin pantalla-mision';
    fx.ambiente(true);

    const raiz = el('div', 'fin');
    raiz.innerHTML = `
      <p class="titulo-sub">El encargo</p>
      <div class="bendicion-arte">🧓</div>
      <h1 class="fin-titulo capitulo-nombre">Aldric, Senescal del Valle</h1>
      <p class="fin-texto">«Los goblins de Gorzug queman nuestras granjas, y bajo sus ruinas
      algo peor remueve a los muertos. Acaba con ambos y el valle no lo olvidará.
      Toma: no es mucho, pero es todo lo que el torreón puede ofrecerte.»</p>
      <div class="evento-opciones bendicion-opciones"></div>
    `;
    app.appendChild(raiz);

    const cont = raiz.querySelector('.bendicion-opciones') as HTMLElement;
    const opciones = [
      {
        icono: '🗡️', nombre: 'Adiestramiento espartano',
        detalle: 'Elimina 1 carta de tu mazo',
        accion: () => vistaEliminar(1, 0),
      },
      {
        icono: '📖', nombre: 'El tomo prohibido',
        detalle: 'Elige 1 carta rara (entre 3)… a cambio de 8 PV',
        accion: async () => {
          run.pv = Math.max(1, run.pv - 8);
          anuncio('−8 PV', 'anuncio-error');
          await elegirCarta(run, rng, 100); // garantiza raras
          terminar();
        },
      },
      {
        icono: '⚔️', nombre: 'Sangre y disciplina',
        detalle: 'Elimina 2 cartas… pero pierdes 5 PV máximos',
        accion: () => vistaEliminar(2, 5),
      },
      {
        icono: '🔁', nombre: 'Capricho del destino',
        detalle: 'Transforma 1 carta en otra al azar de tu clase',
        accion: () => vistaTransformar(),
      },
    ];

    const botones: HTMLButtonElement[] = opciones.map((op, i) => {
      const b = el('button', 'evento-opcion') as HTMLButtonElement;
      b.innerHTML = `<span class="op-etiqueta">${op.icono} ${op.nombre}</span>
        <span class="op-detalle">${op.detalle}</span>`;
      b.style.setProperty('--retraso', `${0.3 + i * 0.08}s`);
      b.addEventListener('click', () => {
        window.removeEventListener('keydown', teclado);
        void op.accion();
      });
      cont.appendChild(b);
      return b;
    });

    let idx = 0;
    const marcar = () => botones.forEach((b, i) => b.classList.toggle('op-foco', i === idx));
    marcar();

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
        window.removeEventListener('keydown', teclado);
        void opciones[idx].accion();
      }
    };
    window.addEventListener('keydown', teclado);

    function terminar() {
      const overlay = document.getElementById('overlay')!;
      overlay.className = '';
      overlay.innerHTML = '';
      resolver();
    }

    /** Rejilla para eliminar `restantes` cartas; al acabar resta `pvMaxCoste`. */
    function vistaEliminar(restantes: number, pvMaxCoste: number) {
      const overlay = document.getElementById('overlay')!;
      overlay.innerHTML = '';
      overlay.className = 'overlay-activo';
      const panel = el('div', 'panel-recompensa panel-mejora');
      const aviso = pvMaxCoste > 0 ? ` · al terminar: −${pvMaxCoste} PV máximos` : '';
      panel.innerHTML = `
        <h2>🗡️ Sacrificio</h2>
        <p>Elige una carta para eliminarla (te quedan ${restantes})${aviso}</p>
        <div class="mejora-rejilla"></div>
      `;
      overlay.appendChild(panel);
      const rejilla = panel.querySelector('.mejora-rejilla') as HTMLElement;

      const aplicarCoste = () => {
        if (pvMaxCoste > 0) {
          run.pvMax = Math.max(20, run.pvMax - pvMaxCoste);
          run.pv = Math.min(run.pv, run.pvMax);
          anuncio(`−${pvMaxCoste} PV máximos`, 'anuncio-error');
        }
      };

      run.mazo.forEach((inst, i) => {
        const c = renderCarta(inst.def);
        c.classList.add('carta-recompensa');
        c.style.setProperty('--retraso', `${Math.min(i * 0.03, 0.4)}s`);
        c.addEventListener('click', () => {
          run.mazo.splice(run.mazo.indexOf(inst), 1);
          anuncio(`🗑️ ${inst.def.nombre} eliminada`, 'anuncio-botin');
          if (restantes > 1 && run.mazo.length > 5) vistaEliminar(restantes - 1, pvMaxCoste);
          else { aplicarCoste(); terminar(); }
        });
        rejilla.appendChild(c);
      });
    }

    /** Rejilla para transformar 1 carta en otra al azar de la clase. */
    function vistaTransformar() {
      const overlay = document.getElementById('overlay')!;
      overlay.innerHTML = '';
      overlay.className = 'overlay-activo';
      const panel = el('div', 'panel-recompensa panel-mejora');
      panel.innerHTML = `
        <h2>🔁 Capricho del destino</h2>
        <p>Elige la carta que quieres transformar</p>
        <div class="mejora-rejilla"></div>
      `;
      overlay.appendChild(panel);
      const rejilla = panel.querySelector('.mejora-rejilla') as HTMLElement;

      run.mazo.forEach((inst: CartaInstancia, i) => {
        const c = renderCarta(inst.def);
        c.classList.add('carta-recompensa');
        c.style.setProperty('--retraso', `${Math.min(i * 0.03, 0.4)}s`);
        c.addEventListener('click', () => {
          const idx = run.mazo.indexOf(inst);
          const nueva = instanciar(elegir(rng, poolDeClase(run.clase)));
          run.mazo.splice(idx, 1, nueva);
          anuncio(`🔁 ${inst.def.nombre} → ${nueva.def.nombre}`, 'anuncio-botin');
          terminar();
        });
        rejilla.appendChild(c);
      });
    }
  });
}
