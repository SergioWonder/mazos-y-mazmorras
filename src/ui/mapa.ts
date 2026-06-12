import type { EstadoRun, NodoMapa } from '../core/types.ts';
import { nodosDisponibles } from '../core/mapa.ts';
import { fx } from '../fx/particulas.ts';
import { el } from './util.ts';

const ICONO_NODO: Record<string, string> = {
  combate: '⚔️', elite: '💀', descanso: '🏕️', cofre: '🧰', evento: '❓', jefe: '👹',
};
const NOMBRE_NODO: Record<string, string> = {
  combate: 'Combate', elite: 'Élite', descanso: 'Campamento', cofre: 'Cofre',
  evento: 'Evento', jefe: 'Jefe',
};

export function pantallaMapa(run: EstadoRun, nombreCapitulo: string): Promise<NodoMapa> {
  return new Promise((resolver) => {
    const app = document.getElementById('app')!;
    app.innerHTML = '';
    app.className = 'pantalla-mapa';
    fx.ambiente(true);

    const disponibles = nodosDisponibles(run.mapa, run.nodoActual);
    const raiz = el('div', 'mapa');
    raiz.innerHTML = `
      <div class="barra-superior">
        <span class="bs-clase">${
          { druida: '🌿 Druida', barbaro: '🪓 Bárbaro', mago: '🔮 Mago' }[run.clase]
        }</span>
        <span class="bs-pv">❤️ ${run.pv}/${run.pvMax}</span>
        <span class="bs-reliquias">${run.reliquias
          .map((r) => `<span class="reliquia" data-tip="<strong>${r.icono} ${r.nombre}</strong><br>${r.texto}">${r.icono}</span>`)
          .join('')}</span>
        <span class="bs-piso">🃏 ${run.mazo.length} cartas</span>
      </div>
      <h2 class="mapa-titulo">${nombreCapitulo}</h2>
      <div class="mapa-lienzo">
        <svg class="mapa-svg"></svg>
        <div class="mapa-nodos"></div>
      </div>
      <p class="titulo-ayuda">Elige tu siguiente paso · ←→ y Enter, o haz clic</p>
    `;
    app.appendChild(raiz);

    const lienzo = raiz.querySelector('.mapa-nodos') as HTMLElement;
    const svg = raiz.querySelector('.mapa-svg') as SVGSVGElement;
    const filas = Math.max(...run.mapa.map((n) => n.fila)) + 1;

    // posición porcentual de cada nodo (fila 0 abajo)
    const pos = (n: NodoMapa) => {
      const enFila = run.mapa.filter((x) => x.fila === n.fila).length;
      const x = ((n.col + 0.5) / enFila) * 80 + 10;
      const y = 90 - (n.fila / (filas - 1)) * 82;
      return { x, y };
    };

    // aristas
    let caminos = '';
    for (const n of run.mapa) {
      const a = pos(n);
      for (const sid of n.siguientes) {
        const b = pos(run.mapa.find((x) => x.id === sid)!);
        caminos += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"
          class="${n.visitado ? 'camino-visitado' : 'camino'}" />`;
      }
    }
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.innerHTML = caminos;

    // nodos
    const botones: HTMLButtonElement[] = [];
    for (const n of run.mapa) {
      const { x, y } = pos(n);
      const b = el('button', `nodo nodo-${n.tipo}`) as HTMLButtonElement;
      b.style.left = `${x}%`;
      b.style.top = `${y}%`;
      b.dataset.tip = `<strong>${ICONO_NODO[n.tipo]} ${NOMBRE_NODO[n.tipo]}</strong>`;
      b.innerHTML = `<span>${ICONO_NODO[n.tipo]}</span>`;
      if (n.visitado) b.classList.add('nodo-visitado');
      if (n.id === run.nodoActual) b.classList.add('nodo-actual');
      const esElegible = disponibles.includes(n);
      if (esElegible) {
        b.classList.add('nodo-disponible');
        b.addEventListener('click', () => terminar(n));
        botones.push(b);
      } else {
        b.disabled = true;
      }
      lienzo.appendChild(b);
    }

    let idx = 0;
    const marcar = () => botones.forEach((b, i) => b.classList.toggle('nodo-foco', i === idx));
    marcar();

    const teclado = (ev: KeyboardEvent) => {
      if (ev.code === 'ArrowLeft' || ev.code === 'ArrowRight') {
        ev.preventDefault();
        idx = (idx + (ev.code === 'ArrowRight' ? 1 : -1) + botones.length) % botones.length;
        marcar();
      } else if ((ev.code === 'Enter' || ev.code === 'Space') && botones[idx]) {
        ev.preventDefault();
        const id = botones[idx];
        const nodo = disponibles[botones.indexOf(id)];
        terminar(nodo);
      }
    };
    window.addEventListener('keydown', teclado);

    function terminar(n: NodoMapa) {
      window.removeEventListener('keydown', teclado);
      resolver(n);
    }
  });
}
