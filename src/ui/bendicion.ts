import type { EstadoRun, TipoBendicion } from '../core/types.ts';
import {
  ofrecerBendicionInicial, ofrecerBendicionEntreActos, aplicarBendicion, type OfertaBendicion,
} from '../core/bendiciones.ts';
import { fx } from '../fx/particulas.ts';
import { el, anuncio } from './util.ts';
import { relicIcon } from './relic-art.ts';

/** When the Seer shows up: at the start of the run or between two acts. */
export type MomentoBendicion = 'inicial' | 'entreActos';

/** Visible label of each kind of blessing relic. */
const ETIQUETA_TIPO: Record<TipoBendicion, string> = {
  general: 'Bendición', pacto: 'Pacto · riesgo y recompensa', mapa: 'Del camino', clase: 'De tu clase',
};

/** HTML of one option button (blessing relic with its art, or unique card). */
function contenidoOpcion(o: OfertaBendicion): string {
  if (o.tipo === 'carta') {
    return `<span class="op-etiqueta">${o.icono} ${o.nombre}</span>
      <span class="op-detalle">${o.detalle}</span>`;
  }
  const r = o.reliquia;
  const tipo = r.tipoBendicion ?? 'general';
  return `<span class="bendicion-icono">${relicIcon(r, 48)}</span>
    <span class="bendicion-texto">
      <span class="bendicion-tipo bendicion-tipo-${tipo}">${ETIQUETA_TIPO[tipo]}</span>
      <span class="op-etiqueta">${r.nombre}</span>
      <span class="op-detalle">${r.texto}</span>
    </span>`;
}

/**
 * Blessing screens: the Senescal's task at the start, and Síbila, the Seer of the Spring, between acts.
 * - `inicial`: before setting off, 4 blessing relics (class, general, pact, wildcard).
 * - `entreActos`: full heal plus the unique cards and blessing relics up to 3 options.
 */
export function pantallaBendicion(
  run: EstadoRun, rng: () => number, momento: MomentoBendicion = 'entreActos',
): Promise<void> {
  return new Promise((resolver) => {
    const inicial = momento === 'inicial';
    const ofrecidos = inicial ? ofrecerBendicionInicial(run, rng) : ofrecerBendicionEntreActos(run, rng);
    if (ofrecidos.length === 0) return resolver();

    const app = document.getElementById('app')!;
    app.innerHTML = '';
    app.className = `pantalla-fin pantalla-bendicion${inicial ? ' bendicion-inicial' : ''}`;
    fx.ambiente(true);
    fx.estallido('estrellas');

    const raiz = el('div', 'fin');
    raiz.innerHTML = inicial
      ? `
      <p class="titulo-sub">El encargo</p>
      <div class="bendicion-arte">🧓</div>
      <h1 class="fin-titulo capitulo-nombre">Aldric, Senescal del Valle</h1>
      <p class="fin-texto">«Los goblins de Gorzug queman nuestras granjas, y bajo sus ruinas
      algo peor remueve a los muertos. Acaba con ambos y el valle no lo olvidará. El
      torreón guarda viejos tesoros bendecidos: llévate el que mejor te sirva.»</p>
      <div class="evento-opciones bendicion-opciones"></div>
    `
      : `
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
    const botones: HTMLButtonElement[] = ofrecidos.map((o, i) => {
      const b = el('button', `evento-opcion${o.tipo === 'reliquia' ? ' opcion-bendicion' : ''}`) as HTMLButtonElement;
      b.innerHTML = contenidoOpcion(o);
      b.style.setProperty('--retraso', `${0.3 + i * 0.1}s`);
      b.addEventListener('click', () => elegir(o));
      cont.appendChild(b);
      return b;
    });

    let idx = 0;
    const marcar = () => botones.forEach((b, i) => b.classList.toggle('op-foco', i === idx));
    marcar();

    let elegido = false;
    function elegir(o: OfertaBendicion) {
      if (elegido) return;
      elegido = true;
      aplicarBendicion(run, o, rng);
      if (!inicial) run.pv = run.pvMax; // full heal between acts
      fx.estallido('divino');
      anuncio(o.tipo === 'carta' ? `${o.icono} ${o.nombre}` : `✨ ${o.reliquia.nombre}`, 'anuncio-rara');
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
        elegir(ofrecidos[idx]);
      }
    };
    window.addEventListener('keydown', teclado);
  });
}
