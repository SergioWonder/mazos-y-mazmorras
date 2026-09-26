import type { EstadoRun, NodoMapa, ReliquiaDef } from '../core/types.ts';
import { rumoresTaberna, aceptarRumor, beberJarra, curaJarra } from '../core/taberna.ts';
import { NOMBRE_RAREZA_RELIQUIA } from '../core/reliquias.ts';
import { fx } from '../fx/particulas.ts';
import { el, anuncio } from './util.ts';
import { relicIcon } from './relic-art.ts';

const LUGAR_MISION: Record<string, string> = {
  combate: '⚔️ Combate', elite: '💀 Élite', evento: '❓ Evento', cofre: '🧰 Tesoro',
};

/** Tavern screen: pick one of two rumours (it marks a quest on the map) or
 *  just drink a tankard and heal a little. */
export function pantallaTaberna(run: EstadoRun, taberna: NodoMapa, rng: () => number): Promise<void> {
  return new Promise((resolver) => {
    const rumores = rumoresTaberna(run, taberna, rng);
    const cura = Math.min(curaJarra(run), run.pvMax - run.pv);

    const overlay = document.getElementById('overlay')!;
    overlay.innerHTML = '';
    overlay.className = 'overlay-activo';

    const panel = el('div', 'panel-recompensa panel-evento panel-taberna');
    panel.innerHTML = `
      <p class="evento-tono">✦ Taberna</p>
      <div class="evento-arte taberna-arte">🍺</div>
      <h2>La Jarra Tuerta</h2>
      <p class="evento-texto">Humo de pipa, risas roncas y un fuego que calienta los huesos.
        Entre jarra y jarra, las lenguas se sueltan. Escucha bien: algún rumor puede valer una reliquia.</p>
      <div class="evento-opciones"></div>
    `;
    overlay.appendChild(panel);

    const cont = panel.querySelector('.evento-opciones') as HTMLElement;
    const opciones: Array<{ etiqueta: string; detalle: string; accion: () => void }> = rumores.map((r) => ({
      etiqueta: `${r.icono} ${r.narrador}`,
      detalle: `«${r.texto}» <span class="rumor-destino">📜 Marca: ${LUGAR_MISION[r.tipo] ?? r.tipo}</span>`,
      accion: () => {
        aceptarRumor(run, r);
        anuncio('📜 Misión marcada en el mapa', 'anuncio-botin');
      },
    }));
    opciones.push({
      etiqueta: '🍻 Pedir una jarra y descansar',
      detalle: cura > 0 ? `Cura ${cura} PV, pero no sigues ningún rumor.` : 'Ya estás en plena forma: solo por el gusto de beber.',
      accion: () => {
        const curado = beberJarra(run);
        if (curado > 0) anuncio(`+${curado} PV`, 'anuncio-botin');
      },
    });

    const botones = opciones.map((op, i) => {
      const b = el('button', 'evento-opcion') as HTMLButtonElement;
      b.innerHTML = `<span class="op-etiqueta">${op.etiqueta}</span><span class="op-detalle">${op.detalle}</span>`;
      b.style.setProperty('--retraso', `${0.15 + i * 0.08}s`);
      b.addEventListener('click', () => elegir(i));
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
        elegir(idx);
      }
    };
    window.addEventListener('keydown', teclado);

    function elegir(i: number) {
      window.removeEventListener('keydown', teclado);
      opciones[i].accion();
      overlay.className = '';
      overlay.innerHTML = '';
      resolver();
    }
  });
}

/** Announces the relic earned by completing a tavern quest. */
export function panelMisionCumplida(reliquia: ReliquiaDef): Promise<void> {
  return new Promise((resolver) => {
    const overlay = document.getElementById('overlay')!;
    overlay.innerHTML = '';
    overlay.className = 'overlay-activo';
    const panel = el('div', 'panel-recompensa panel-reliquia panel-mision');
    panel.innerHTML = `
      <p class="evento-tono">📜 Misión cumplida</p>
      <h2>¡El rumor era cierto!</h2>
      <div class="reliquia-grande">${relicIcon(reliquia, 96)}</div>
      <h3>${reliquia.nombre}</h3>
      <p class="reliquia-rareza">${NOMBRE_RAREZA_RELIQUIA[reliquia.rareza]}${reliquia.soloClase ? ' · de tu clase' : ''}</p>
      <p>${reliquia.texto}</p>
      <button class="btn-tomar">Tomar <span class="atajo">[Enter]</span></button>
    `;
    overlay.appendChild(panel);
    fx.estallido('divino');

    const cerrar = () => {
      window.removeEventListener('keydown', teclado);
      overlay.className = '';
      overlay.innerHTML = '';
      resolver();
    };
    const teclado = (ev: KeyboardEvent) => {
      if (ev.code === 'Enter' || ev.code === 'Space') {
        ev.preventDefault();
        cerrar();
      }
    };
    window.addEventListener('keydown', teclado);
    panel.querySelector('.btn-tomar')!.addEventListener('click', cerrar);
  });
}
