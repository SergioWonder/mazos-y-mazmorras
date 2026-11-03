import type { EstadoRun } from '../core/types.ts';
import { abrirEvento, type EventoDef } from '../core/eventos.ts';
import { fx } from '../fx/particulas.ts';
import { el } from './util.ts';
import { sceneArt, eventSceneId } from './scene-art.ts';

/** Pantalla de evento narrativo con elecciones. */
export async function pantallaEvento(run: EstadoRun, rng: () => number): Promise<void> {
  const evento = abrirEvento([run], rng);
  await panelEvento(evento, (i) => evento.opciones[i].aplicar(run, rng));
}

/**
 * The event screen (scene art, text, options). With `aplicar`, the chosen option is applied right away and its
 * outcome is shown with «Continuar» (solo). Without it, the screen resolves with the chosen index as soon as it is
 * picked and leaves the panel on screen: the caller sends the choice (multiplayer, the room applies it).
 */
export function panelEvento(evento: EventoDef, aplicar?: (i: number) => string): Promise<number> {
  return new Promise((resolver) => {
    const overlay = document.getElementById('overlay')!;
    overlay.innerHTML = '';
    overlay.className = 'overlay-activo';

    const panel = el('div', `panel-recompensa panel-evento evento-${evento.tono}`);
    panel.innerHTML = `
      <p class="evento-tono">${evento.tono === 'positivo' ? '✦ Encuentro' : '☠ Percance'}</p>
      ${sceneArt(eventSceneId(evento.id), evento.arte, 'evento-arte', evento.titulo)}
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

    let elegido = -1;
    function elegir(i: number) {
      if (elegido >= 0) return;
      elegido = i;
      if (!aplicar) {
        window.removeEventListener('keydown', teclado);
        botones.forEach((b) => { b.disabled = true; });
        return resolver(i);
      }
      const resultado = aplicar(i);
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
      resolver(elegido);
    }
  });
}
