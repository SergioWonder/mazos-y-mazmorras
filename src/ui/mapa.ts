import type { EstadoRun, NodoMapa, TipoNodo } from '../core/types.ts';
import { nodosDisponibles } from '../core/mapa.ts';
import { ACTOS } from '../core/enemigos.ts';
import { fx } from '../fx/particulas.ts';
import { el } from './util.ts';
import { relicIcon } from './relic-art.ts';
import { cardArtBitmap } from './card-svgs.ts';
import { mapIconFor, mapIconUrl, hasMapIcon, mapBackground, mapScenarioKey } from './map-icons.ts';

const NODE_NAME: Record<TipoNodo, string> = {
  combate: 'Combate', elite: 'Élite', descanso: 'Campamento', cofre: 'Cofre',
  evento: 'Evento', jefe: 'Jefe', taberna: 'Taberna',
};
const NODE_HINT: Record<TipoNodo, string> = {
  combate: 'Un encuentro hostil en el camino',
  elite: 'Un enemigo temible y bien armado',
  descanso: 'Una hoguera para descansar o mejorar una carta',
  cofre: 'Un tesoro sin vigilancia… en apariencia',
  evento: 'Algo desconocido te aguarda',
  jefe: 'El señor de estas tierras',
  taberna: 'Rumores, bebida y compañía',
};

/** Ink-drawn map icon as a one-time rasterised bitmap (empty when not drawn). */
function inkImg(name: string, cls: string, alt = ''): string {
  const url = mapIconUrl(name) ?? (name.startsWith('jefe') ? mapIconUrl('elite') : null);
  if (!url) return '';
  return `<img class="${cls}" src="${cardArtBitmap(url)}" data-arte="${url}" alt="${alt}" draggable="false">`;
}

/** Deterministic pseudo-random value in [-1, 1] for a pair of nodes. */
function wobble(a: number, b: number, k: number): number {
  const x = Math.sin(a * 127.1 + b * 311.7 + k * 74.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

/** Hand-inked trail between two points: a gently bent, slightly shaky line
 *  that stops short of both icons. */
function inkTrail(ax: number, ay: number, bx: number, by: number, ida: number, idb: number, gap: number): string {
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const nx = -uy, ny = ux;
  const t0 = Math.min(0.45, gap / len), t1 = 1 - Math.min(0.45, (gap * 0.85) / len);
  const bend = wobble(ida, idb, 1) * len * 0.12;
  const steps = 6;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = t0 + ((t1 - t0) * i) / steps;
    const arc = Math.sin(Math.PI * t) * bend;
    const shake = i === 0 || i === steps ? 0 : wobble(ida + i, idb, 2) * 1.6;
    pts.push(`${(ax + dx * t + nx * (arc + shake)).toFixed(1)} ${(ay + dy * t + ny * (arc + shake)).toFixed(1)}`);
  }
  return `M${pts[0]} L${pts.slice(1).join(' ')}`;
}

export function pantallaMapa(run: EstadoRun, nombreCapitulo: string): Promise<NodoMapa> {
  return new Promise((resolver) => {
    const app = document.getElementById('app')!;
    app.innerHTML = '';
    app.className = 'pantalla-mapa';
    fx.ambiente(true);

    const act = run.capitulo + 1;
    const scenario = ACTOS[run.capitulo]?.[run.escenario];
    const disponibles = nodosDisponibles(run.mapa, run.nodoActual);
    const scenarioKey = mapScenarioKey(run.capitulo, run.escenario);
    const raiz = el('div', `mapa mapa-acto-${act}${scenarioKey ? ` mapa-escenario-${scenarioKey}` : ''}`);
    raiz.innerHTML = `
      <div class="barra-superior">
        <span class="bs-clase">${
          {
            druida: '🌿 Druida', barbaro: '🪓 Bárbaro', mago: '🔮 Mago',
            picaro: '🗡️ Pícaro', brujo: '🕳️ Brujo', paladin: '🔨 Paladín',
          }[run.clase]
        }</span>
        <span class="bs-pv">❤️ ${run.pv}/${run.pvMax}</span>
        <span class="bs-reliquias">${run.reliquias
          .map((r) => `<span class="reliquia" data-tip="<strong>${relicIcon(r, 20)} ${r.nombre}</strong><br>${r.texto}">${relicIcon(r)}</span>`)
          .join('')}</span>
        <span class="bs-piso">🃏 ${run.mazo.length} cartas</span>
      </div>
      <div class="mapa-cartela"><h2 class="mapa-titulo">${nombreCapitulo}</h2></div>
      <div class="mapa-scroll">
        <div class="mapa-lienzo" role="group" aria-label="Mapa de ${nombreCapitulo}">
          <svg class="mapa-svg" aria-hidden="true"></svg>
          <div class="mapa-nodos"></div>
        </div>
      </div>
      <p class="titulo-ayuda">Elige tu siguiente paso · ←→ y Enter, o haz clic</p>
    `;
    app.appendChild(raiz);

    // painted parchment for this scenario (the act's one while it is missing;
    // the CSS parchment when neither exists)
    const bg = mapBackground(run.capitulo, run.escenario);
    const lienzoEl = raiz.querySelector('.mapa-lienzo') as HTMLElement;
    if (bg.tall) lienzoEl.style.setProperty('--mapa-fondo', `url("${bg.tall}")`);
    if (bg.wide) raiz.style.setProperty('--mapa-fondo-ancho', `url("${bg.wide}")`);
    lienzoEl.classList.toggle('mapa-pintado', !!bg.tall);

    const lienzo = raiz.querySelector('.mapa-nodos') as HTMLElement;
    const scroll = raiz.querySelector('.mapa-scroll') as HTMLElement;
    const svg = raiz.querySelector('.mapa-svg') as SVGSVGElement;
    const filas = Math.max(...run.mapa.map((n) => n.fila)) + 1;
    const byId = new Map(run.mapa.map((n) => [n.id, n]));

    // percentage position of each node (row 0 at the bottom)
    const pos = (n: NodoMapa) => {
      const enFila = run.mapa.filter((x) => x.fila === n.fila).length;
      const x = ((n.col + 0.5) / enFila) * 80 + 10;
      const y = 90 - (n.fila / (filas - 1)) * 82;
      return { x, y };
    };

    // ink trails, drawn in pixels so dashes and pen width stay true on any size
    const drawTrails = () => {
      const w = lienzoEl.clientWidth || 680;
      const h = lienzoEl.clientHeight || 960;
      const gap = w < 560 ? 26 : 32;
      let pale = '', open = '', walked = '';
      for (const n of run.mapa) {
        const a = pos(n);
        for (const sid of n.siguientes) {
          const m = byId.get(sid)!;
          const b = pos(m);
          const d = inkTrail((a.x * w) / 100, (a.y * h) / 100, (b.x * w) / 100, (b.y * h) / 100, n.id, sid, m.tipo === 'jefe' ? gap * 1.5 : gap);
          if (n.visitado && m.visitado) walked += `<path d="${d}" class="camino-visitado"/>`;
          else if (n.id === run.nodoActual) open += `<path d="${d}" class="camino-abierto"/>`;
          else pale += `<path d="${d}" class="camino"/>`;
        }
      }
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.innerHTML = pale + open + walked;
    };
    drawTrails();

    // nodes
    const botones: HTMLButtonElement[] = [];
    const elegibles: NodoMapa[] = [];
    let heroEl: HTMLElement | null = null;
    for (const n of run.mapa) {
      const { x, y } = pos(n);
      const b = el('button', `nodo nodo-${n.tipo}`) as HTMLButtonElement;
      b.style.left = `${x}%`;
      b.style.top = `${y}%`;
      const place = n.tipo === 'jefe' && scenario ? scenario.jefe[0].nombre : NODE_NAME[n.tipo];
      let label = n.tipo === 'jefe' ? `Jefe: ${place}` : place;
      b.dataset.tip = `<strong>${place}</strong><br><em>${NODE_HINT[n.tipo]}</em>`;
      let html = inkImg(mapIconFor(n.tipo, run.capitulo, run.escenario, hasMapIcon), 'nodo-icono');
      if (run.mision?.nodo === n.id) {
        // tavern quest target: sealed «X» marker and the rumour in the tooltip
        b.classList.add('nodo-mision');
        html += inkImg('mision', 'mision-insignia');
        b.dataset.tip += `<br><strong>Misión:</strong> ${run.mision.texto}<br>Complétalo para ganar una reliquia.`;
        label += ' (misión de la taberna)';
      }
      const esElegible = disponibles.includes(n);
      if (n.id === run.nodoActual) {
        b.classList.add('nodo-actual');
        html += `<span class="nodo-heroe">${inkImg('heroe', 'nodo-heroe-img')}</span>`;
        label += ', estás aquí';
      } else if (n.visitado) {
        b.classList.add('nodo-visitado');
        html += inkImg('tachado', 'nodo-tachado');
        label += ', visitado';
      }
      if (esElegible) {
        html = inkImg('aro', 'nodo-aro') + html;
        b.classList.add('nodo-disponible');
        b.addEventListener('click', () => terminar(n));
        botones.push(b);
        elegibles.push(n);
      } else {
        b.disabled = true;
        if (!n.visitado && n.id !== run.nodoActual) b.classList.add('nodo-lejano');
      }
      b.setAttribute('aria-label', label);
      b.innerHTML = html;
      if (n.id === run.nodoActual) heroEl = b;
      lienzo.appendChild(b);
    }

    let idx = 0;
    const marcar = (desplazar = true) =>
      botones.forEach((b, i) => {
        b.classList.toggle('nodo-foco', i === idx);
        if (i === idx && desplazar) b.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    marcar(false);
    // open with the hero and the next steps in view (the map scrolls vertically)
    requestAnimationFrame(() => {
      const ys = [heroEl, botones[0]].filter(Boolean).map((e) => (e as HTMLElement).offsetTop);
      if (!ys.length) return;
      const mid = ys.reduce((s, v) => s + v, 0) / ys.length;
      scroll.scrollTop = Math.max(0, mid - scroll.clientHeight / 2);
    });

    const onResize = () => drawTrails();
    window.addEventListener('resize', onResize);

    const teclado = (ev: KeyboardEvent) => {
      if (ev.code === 'ArrowLeft' || ev.code === 'ArrowRight') {
        ev.preventDefault();
        idx = (idx + (ev.code === 'ArrowRight' ? 1 : -1) + botones.length) % botones.length;
        marcar();
      } else if ((ev.code === 'Enter' || ev.code === 'Space') && botones[idx]) {
        ev.preventDefault();
        terminar(elegibles[idx]);
      }
    };
    window.addEventListener('keydown', teclado);

    function terminar(n: NodoMapa) {
      window.removeEventListener('keydown', teclado);
      window.removeEventListener('resize', onResize);
      resolver(n);
    }
  });
}
