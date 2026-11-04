import type { CartaInstancia, EstadoRun, NodoMapa, ReliquiaDef } from '../core/types.ts';
import { rumoresTaberna, aceptarRumor, olvidoTaberna, cartasEliminables, eliminarCarta } from '../core/taberna.ts';
import { defDe } from '../core/cartas.ts';
import { NOMBRE_RAREZA_RELIQUIA } from '../core/reliquias.ts';
import { fx } from '../fx/particulas.ts';
import { el, anuncio } from './util.ts';
import { relicIcon } from './relic-art.ts';
import { sceneArt } from './scene-art.ts';
import { renderCarta } from './carta.ts';

const LUGAR_MISION: Record<string, string> = {
  combate: '⚔️ Combate', elite: '💀 Élite', evento: '❓ Evento', cofre: '🧰 Tesoro',
};

type Rumor = ReturnType<typeof rumoresTaberna>[number];
type Olvido = ReturnType<typeof olvidoTaberna>;

/** What the player decided in the tavern (`olvidar`: a vote for forgetting, two-player tavern). */
export type DecisionTaberna =
  | { accion: 'rumor'; rumor: Rumor } | { accion: 'olvido'; carta: CartaInstancia } | { accion: 'olvidar' };

/** Two-player tavern: `voto` resolves the main choice as a vote (forgetting without picking a card, which comes
 *  later); `soloOlvido` opens straight on the card to forget, with no way back. */
export interface ModoTaberna { voto?: { olvidoActivo: boolean; nota: string }; soloOlvido?: boolean }

/** Tavern screen: pick one of two rumours (it marks a quest on the map) or
 *  let someone in the tavern take a card off your deck. */
export async function pantallaTaberna(run: EstadoRun, taberna: NodoMapa, rng: () => number): Promise<void> {
  const rumores = rumoresTaberna(run, taberna, rng);
  const olvido = olvidoTaberna(rng);
  const d = await panelTaberna(run, rumores, olvido);
  if (d.accion === 'rumor') {
    aceptarRumor(run, d.rumor);
    anuncio('📜 Misión marcada en el mapa', 'anuncio-botin');
  } else if (d.accion === 'olvido') {
    const nombre = defDe(d.carta).nombre;
    if (eliminarCarta(run, d.carta)) anuncio(olvido.anuncio.replace('{carta}', nombre), 'anuncio-botin');
  }
}

/** The tavern screens (rumours or the forgetting, then the card): resolves with the decision and changes
 *  nothing, the caller applies it (solo here, the room engine in multiplayer). */
export function panelTaberna(run: EstadoRun, rumores: Rumor[], olvido: Olvido, modo: ModoTaberna = {}): Promise<DecisionTaberna> {
  return new Promise((resolver) => {
    const overlay = document.getElementById('overlay')!;

    function cerrar(decision: DecisionTaberna) {
      overlay.className = '';
      overlay.innerHTML = '';
      resolver(decision);
    }

    /** Arrow keys move the focus, Enter picks, Esc (if given) goes back. */
    function navegar(
      botones: HTMLElement[], elegir: (i: number) => void, clase: string, salir?: () => void,
    ): () => void {
      let idx = 0;
      const marcar = () => botones.forEach((b, i) => {
        b.classList.toggle(clase, i === idx);
        if (i === idx) b.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
      });
      marcar();
      const teclado = (ev: KeyboardEvent) => {
        if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(ev.code)) {
          ev.preventDefault();
          const dir = ev.code === 'ArrowDown' || ev.code === 'ArrowRight' ? 1 : -1;
          idx = (idx + dir + botones.length) % botones.length;
          marcar();
        } else if (ev.code === 'Enter' || ev.code === 'Space') {
          ev.preventDefault();
          elegir(idx);
        } else if (ev.code === 'Escape' && salir) {
          ev.preventDefault();
          salir();
        }
      };
      window.addEventListener('keydown', teclado);
      return () => window.removeEventListener('keydown', teclado);
    }

    function vistaPrincipal() {
      overlay.innerHTML = '';
      overlay.className = 'overlay-activo';
      const panel = el('div', 'panel-recompensa panel-evento panel-taberna');
      panel.innerHTML = `
        <p class="evento-tono">✦ Taberna</p>
        ${sceneArt('taberna', '🍺', 'evento-arte taberna-arte', 'El tabernero de La Jarra Tuerta')}
        <h2>La Jarra Tuerta</h2>
        <p class="evento-texto">Humo de pipa, risas roncas y un fuego que calienta los huesos.
          Entre jarra y jarra, las lenguas se sueltan. Escucha bien: algún rumor puede valer una reliquia.</p>
        <div class="evento-opciones"></div>
      `;
      overlay.appendChild(panel);
      if (modo.voto) panel.querySelector('.evento-texto')!.insertAdjacentHTML('afterend', `<p class="taberna-voto">${modo.voto.nota}</p>`);

      const cont = panel.querySelector('.evento-opciones') as HTMLElement;
      const opciones: Array<{ etiqueta: string; detalle: string; accion: () => void; activa?: boolean }> = rumores.map((r) => ({
        etiqueta: `${r.icono} ${r.narrador}`,
        detalle: `«${r.texto}» <span class="rumor-destino">📜 Marca: ${LUGAR_MISION[r.tipo] ?? r.tipo}</span>`,
        accion: () => cerrar({ accion: 'rumor', rumor: r }),
      }));
      const eliminables = cartasEliminables(run);
      opciones.push({
        etiqueta: olvido.etiqueta,
        detalle: olvido.detalle,
        activa: modo.voto ? modo.voto.olvidoActivo : eliminables.length > 0,
        // voting: forgetting is the choice; the card comes after, once the tavern is decided
        accion: () => (modo.voto ? cerrar({ accion: 'olvidar' }) : vistaOlvido()),
      });

      const botones = opciones.map((op, i) => {
        const b = el('button', 'evento-opcion') as HTMLButtonElement;
        b.innerHTML = `<span class="op-etiqueta">${op.etiqueta}</span><span class="op-detalle">${op.detalle}</span>`;
        b.style.setProperty('--retraso', `${0.15 + i * 0.08}s`);
        b.disabled = op.activa === false;
        b.addEventListener('click', () => elegir(i));
        cont.appendChild(b);
        return b;
      });
      const soltar = navegar(botones, (i) => elegir(i), 'op-foco');
      function elegir(i: number) {
        if (opciones[i].activa === false) return;
        soltar();
        opciones[i].accion();
      }
    }

    /** Picks the card the tavern takes off the deck. */
    function vistaOlvido() {
      overlay.innerHTML = '';
      overlay.className = 'overlay-activo';
      const eliminables = cartasEliminables(run);
      const panel = el('div', 'panel-recompensa panel-mejora panel-olvido');
      panel.innerHTML = `
        <h2>${olvido.etiqueta}</h2>
        <p>${olvido.titulo}</p>
        <div class="mejora-rejilla"></div>
        ${modo.soloOlvido ? '' : '<button class="btn-saltar">Volver <span class="atajo">[Esc]</span></button>'}
      `;
      overlay.appendChild(panel);

      const rejilla = panel.querySelector('.mejora-rejilla') as HTMLElement;
      const cartas = eliminables.map((inst, i) => {
        const c = renderCarta(defDe(inst));
        c.classList.add('carta-recompensa');
        c.style.setProperty('--retraso', `${Math.min(i * 0.04, 0.5)}s`);
        c.addEventListener('click', () => quitar(i));
        rejilla.appendChild(c);
        return c;
      });
      const salir = () => {
        soltar();
        vistaPrincipal();
      };
      const soltar = navegar(cartas, (i) => quitar(i), 'seleccionada', modo.soloOlvido ? undefined : salir);
      panel.querySelector('.btn-saltar')?.addEventListener('click', salir);

      function quitar(i: number) {
        soltar();
        cerrar({ accion: 'olvido', carta: eliminables[i] });
      }
    }

    if (modo.soloOlvido) vistaOlvido();
    else vistaPrincipal();
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
