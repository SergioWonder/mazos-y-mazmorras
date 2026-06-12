import type { CartaInstancia, EstadoRun } from '../core/types.ts';
import { fx } from '../fx/particulas.ts';
import { el, anuncio } from './util.ts';
import { renderCarta } from './carta.ts';
import { elegirCarta } from './recompensa.ts';

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
        detalle: 'Elimina hasta 2 cartas de tu mazo',
        accion: () => vistaEliminar(2),
      },
      {
        icono: '⚒️', nombre: 'La forja del torreón',
        detalle: 'Mejora 1 carta a tu elección',
        accion: () => vistaMejorar(),
      },
      {
        icono: '📖', nombre: 'El tomo prohibido',
        detalle: 'Elige 1 carta rara… pero su saber pesa: −5 PV máximos',
        accion: async () => {
          run.pvMax = Math.max(20, run.pvMax - 5);
          run.pv = Math.min(run.pv, run.pvMax);
          anuncio('−5 PV máximos', 'anuncio-error');
          await elegirCarta(run, rng, 100); // garantiza raras
          terminar();
        },
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

    /** Rejilla para eliminar hasta `restantes` cartas del mazo. */
    function vistaEliminar(restantes: number) {
      const overlay = document.getElementById('overlay')!;
      overlay.innerHTML = '';
      overlay.className = 'overlay-activo';
      const panel = el('div', 'panel-recompensa panel-mejora');
      panel.innerHTML = `
        <h2>🗡️ Adiestramiento</h2>
        <p>Elige una carta para eliminarla (te quedan ${restantes})</p>
        <div class="mejora-rejilla"></div>
        <button class="btn-saltar">Terminar <span class="atajo">[Esc]</span></button>
      `;
      overlay.appendChild(panel);
      const rejilla = panel.querySelector('.mejora-rejilla') as HTMLElement;

      run.mazo.forEach((inst, i) => {
        const c = renderCarta(inst.def);
        c.classList.add('carta-recompensa');
        c.style.setProperty('--retraso', `${Math.min(i * 0.03, 0.4)}s`);
        c.addEventListener('click', () => {
          run.mazo.splice(run.mazo.indexOf(inst), 1);
          anuncio(`🗑️ ${inst.def.nombre} eliminada`, 'anuncio-botin');
          if (restantes > 1 && run.mazo.length > 5) vistaEliminar(restantes - 1);
          else terminar();
        });
        rejilla.appendChild(c);
      });

      const fin = (ev?: KeyboardEvent) => {
        if (ev && ev.code !== 'Escape') return;
        window.removeEventListener('keydown', fin);
        terminar();
      };
      window.addEventListener('keydown', fin);
      panel.querySelector('.btn-saltar')!.addEventListener('click', () => fin());
    }

    /** Rejilla para mejorar 1 carta a elección. */
    function vistaMejorar() {
      const overlay = document.getElementById('overlay')!;
      overlay.innerHTML = '';
      overlay.className = 'overlay-activo';
      const mejorables = run.mazo.filter((c: CartaInstancia) => !c.mejorada && c.def.mejora);
      const panel = el('div', 'panel-recompensa panel-mejora');
      panel.innerHTML = `
        <h2>⚒️ La forja del torreón</h2>
        <p>Elige la carta que quieres mejorar</p>
        <div class="mejora-rejilla"></div>
      `;
      overlay.appendChild(panel);
      const rejilla = panel.querySelector('.mejora-rejilla') as HTMLElement;

      mejorables.forEach((inst, i) => {
        const c = renderCarta(inst.def);
        const m = inst.def.mejora!;
        c.dataset.tip = `<strong>⚒️ ${inst.def.nombre}+</strong><br>${m.texto.replaceAll('\n', '<br>')}`;
        c.classList.add('carta-recompensa');
        c.style.setProperty('--retraso', `${Math.min(i * 0.03, 0.4)}s`);
        c.addEventListener('click', () => {
          inst.mejorada = true;
          anuncio(`⚒️ ${inst.def.nombre} → ${inst.def.nombre}+`, 'anuncio-botin');
          terminar();
        });
        rejilla.appendChild(c);
      });
    }
  });
}
