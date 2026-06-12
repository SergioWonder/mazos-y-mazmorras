import type { EstadoRun } from '../core/types.ts';
import { elegirEvento } from '../core/eventos.ts';
import { fx } from '../fx/particulas.ts';
import { el } from './util.ts';

/** Pantalla de evento narrativo con elecciones. */
export function pantallaEvento(run: EstadoRun, rng: () => number): Promise<void> {
  return new Promise((resolver) => {
    const evento = elegirEvento(rng, new Set(run.eventosVistos));
    run.eventosVistos.push(evento.id);

    const overlay = document.getElementById('overlay')!;
    overlay.innerHTML = '';
    overlay.className = 'overlay-activo';

    const panel = el('div', `panel-recompensa panel-evento evento-${evento.tono}`);
    panel.innerHTML = `
      <p class="evento-tono">${evento.tono === 'positivo' ? '✦ Encuentro' : '☠ Percance'}</p>
      <div class="evento-arte">${evento.arte}</div>
      <h2>${evento.titulo}</h2>
      <p class="evento-texto">${evento.texto}</p>
      <div class="evento-opciones"></div>
    `;
    overlay.appendChild(panel);
    if (evento.tono === 'negativo') fx.estallido('muerte');

    const cont = panel.querySelector('.evento-opciones') as HTMLElement;
    const botones: HTMLButtonElement[] = evento.opciones.map((op, i) => {
      const b = el('button', 'evento-opcion') as HTMLButtonElement;
      b.innerHTML = `<span class="op-etiqueta">${op.etiqueta}</span>
        <span class="op-detalle">${op.detalle}</span>`;
      b.style.setProperty('--retraso', `${0.15 + i * 0.08}s`);
      b.addEventListener('click', () => elegir(i));
      cont.appendChild(b);
      return b;
    });

    let idx = 0;
    const marcar = () => botones.forEach((b, i) => b.classList.toggle('op-foco', i === idx));
    marcar();

    function elegir(i: number) {
      const resultado = evento.opciones[i].aplicar(run, rng);
      // muestra el desenlace
      cont.innerHTML = '';
      const res = el('p', 'evento-resultado', resultado);
      const btn = el('button', 'btn-tomar', `Continuar <span class="atajo">[Enter]</span>`);
      btn.addEventListener('click', cerrar);
      cont.append(res, btn);
      modo = 'resultado';
    }

    let modo: 'opciones' | 'resultado' = 'opciones';
    const teclado = (ev: KeyboardEvent) => {
      if (modo === 'opciones') {
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
          elegir(idx);
        }
      } else if (ev.code === 'Enter' || ev.code === 'Space') {
        ev.preventDefault();
        cerrar();
      }
    };
    window.addEventListener('keydown', teclado);

    function cerrar() {
      window.removeEventListener('keydown', teclado);
      overlay.className = '';
      overlay.innerHTML = '';
      resolver();
    }
  });
}
