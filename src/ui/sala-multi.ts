// Multiplayer room screen. For now a placeholder: it connects to the Sala, says who it is waiting for and, once both
// players are in, lists them with their classes and the entries the room relays. Unit C replaces it with the real game.

import { nube, type Hueco, type PartidaMulti } from '../core/nube.ts';
import { el } from './util.ts';
import { NOMBRE_CLASE } from './nube-juego.ts';
import '../estilos/multi.css';

interface EntradaRelayada { entrada: { seq: number; de: Hueco; tipo: string }; hash: string }
interface Huecos { cara: { conectado: boolean; listo: boolean }; cruz: { conectado: boolean; listo: boolean } }

const RETARDO_MAX_MS = 15_000;
const MAX_INTENTOS_SIN_ENTRAR = 4;
const otro = (h: Hueco): Hueco => (h === 'cara' ? 'cruz' : 'cara');

/** Opens the room of an active game. Resolves when the player leaves («Salir»). */
export function pantallaSalaMulti(partida: PartidaMulti): Promise<void> {
  return new Promise((resolver) => {
    const capa = el('div', 'confirmar-fondo multi-fondo multi-sala-fondo');
    capa.setAttribute('role', 'dialog');
    capa.setAttribute('aria-label', 'Partida multijugador');
    const panel = el('div', 'clasif-panel multi-panel');
    const cab = el('div', 'clasif-cab');
    cab.appendChild(el('h2', '', '👥 Partida multijugador'));
    const salir = el('button', 'btn-tomar multi-salir', 'Salir') as HTMLButtonElement;
    salir.type = 'button';
    cab.appendChild(salir);
    const estado = el('p', 'multi-estado');
    const cuerpo = el('div', 'multi-sala-cuerpo');
    panel.append(cab, estado, cuerpo);
    capa.appendChild(panel);
    document.body.appendChild(capa);

    // What the room told us
    let miHueco: Hueco = partida.hueco;
    let nombres: Record<Hueco, string> = { cara: '', cruz: '' };
    let clases: Record<Hueco, string> = { cara: partida.claseCara, cruz: partida.claseCruz ?? '' };
    nombres[miHueco] = nube.usuario()?.displayName ?? 'Tú';
    nombres[otro(miHueco)] = partida.otro.nombre;
    let huecos: Huecos | null = null;
    let semilla: number | null = null;
    let empezada = false;
    let entradas: EntradaRelayada[] = [];

    let ws: WebSocket | null = null;
    let cerrado = false;
    let intentos = 0;
    let entro = false; // got at least one message from the room on this attempt
    let sinEntrar = 0;
    let reintento: number | undefined;
    let latido: number | undefined;

    const companero = () => nombres[otro(miHueco)] || partida.otro.nombre;
    const nombreClase = (c: string) => NOMBRE_CLASE[c] ?? (c || '…');

    function pintar() {
      if (cerrado) return;
      const sinConexion = !ws || ws.readyState !== WebSocket.OPEN;
      if (sinNube) estado.textContent = 'No se pudo entrar en la sala. Comprueba tu sesión y tu conexión.';
      else if (sinConexion) estado.textContent = 'Conectando con la sala…';
      else if (!empezada) {
        const c = huecos?.[otro(miHueco)];
        estado.textContent = !c || !c.conectado ? `Esperando a ${companero()}…` : `${companero()} se está conectando…`;
      } else estado.textContent = 'Partida multijugador lista (próximamente)';
      estado.classList.toggle('multi-estado-lista', empezada);

      cuerpo.replaceChildren();
      const jugadores = el('ul', 'multi-jugadores');
      for (const h of ['cara', 'cruz'] as Hueco[]) {
        const li = el('li', `multi-jugador${h === miHueco ? ' multi-jugador-yo' : ''}`);
        const conectado = partida.otro.bot && h !== miHueco ? true : huecos?.[h].conectado === true;
        li.appendChild(el('span', `multi-punto${conectado ? ' multi-punto-on' : ''}`));
        const quien = el('span', 'multi-jugador-nombre');
        quien.textContent = `${nombres[h] || (h === miHueco ? 'Tú' : companero())}${h === miHueco ? ' (tú)' : partida.otro.bot ? ' 🤖' : ''}`;
        li.append(quien, el('span', 'multi-jugador-clase', nombreClase(clases[h])));
        jugadores.appendChild(li);
      }
      cuerpo.appendChild(jugadores);
      if (!empezada) return;

      cuerpo.appendChild(el('p', 'multi-semilla', `Semilla de la partida: ${semilla}`));
      cuerpo.appendChild(el('h3', 'multi-subtitulo', `Entradas recibidas (${entradas.length})`));
      const lista = el('ol', 'multi-entradas');
      if (entradas.length === 0) lista.appendChild(el('li', 'multi-entradas-vacia', 'Todavía no ha llegado ninguna.'));
      for (const { entrada, hash } of entradas.slice(-30)) {
        const li = el('li');
        li.textContent = `#${entrada.seq} · ${nombres[entrada.de] || entrada.de} · ${entrada.tipo} · hash ${hash}`;
        lista.appendChild(li);
      }
      cuerpo.appendChild(lista);
      const prueba = el('button', 'btn-tomar multi-prueba', 'Enviar entrada de prueba (fin de turno)') as HTMLButtonElement;
      prueba.type = 'button';
      prueba.addEventListener('click', () => enviar({ t: 'entrada', entrada: { tipo: 'finTurno' } }));
      cuerpo.appendChild(prueba);
    }

    let sinNube = false;
    function enviar(msg: unknown) {
      try { ws?.send(JSON.stringify(msg)); } catch { /* reconnecting */ }
    }

    function alMensaje(m: any) {
      entro = true;
      switch (m.t) {
        case 'hueco':
          miHueco = m.hueco;
          nombres = m.nombres ?? nombres;
          clases = m.clases ?? clases;
          enviar({ t: 'listo' }); // the player came here on purpose: ready as soon as connected
          break;
        case 'estado': huecos = m.huecos; break;
        case 'empieza':
          empezada = true;
          semilla = m.semilla;
          nombres = m.nombres ?? nombres;
          clases = m.clases ?? clases;
          entradas = Array.isArray(m.log) ? (m.log as EntradaRelayada[]) : [];
          break;
        case 'entrada': entradas = [...entradas, { entrada: m.entrada, hash: m.hash }]; break;
        case 'error': estado.textContent = `La sala ha respondido: ${m.motivo}`; return;
      }
      pintar();
    }

    function conectar() {
      if (cerrado) return;
      const destino = nube.direccionSocket(`/multi/games/${encodeURIComponent(partida.id)}/ws`);
      if (!destino) { sinNube = true; return pintar(); }
      entro = false;
      let s: WebSocket;
      try { s = new WebSocket(destino.url, destino.protocolo); } catch { return programar(); }
      ws = s;
      s.onopen = () => {
        intentos = 0;
        latido = window.setInterval(() => { try { s.send('ping'); } catch { /* closing */ } }, 25_000);
        pintar();
      };
      s.onmessage = (ev) => {
        if (typeof ev.data !== 'string' || ev.data === 'pong') return;
        try { alMensaje(JSON.parse(ev.data)); } catch { /* not ours */ }
      };
      s.onerror = () => { /* onclose follows */ };
      s.onclose = (ev) => {
        window.clearInterval(latido);
        if (ws !== s || cerrado) return;
        ws = null;
        empezada = false; // a new connection gets its own `empieza` (with the log) when both are ready
        huecos = null;
        // 4000: another tab of ours took the seat. Never got in (refused upgrade): stop trying after a few times
        if (ev.code === 4000) { estado.textContent = 'Has abierto esta partida en otra pestaña.'; return; }
        sinEntrar = entro ? 0 : sinEntrar + 1;
        if (sinEntrar >= MAX_INTENTOS_SIN_ENTRAR) { sinNube = true; return pintar(); }
        programar();
      };
      pintar();
    }

    function programar() {
      if (cerrado) return;
      pintar();
      reintento = window.setTimeout(conectar, Math.min(RETARDO_MAX_MS, 800 * 2 ** intentos++));
    }

    const cerrar = () => {
      if (cerrado) return;
      cerrado = true;
      window.clearTimeout(reintento);
      window.clearInterval(latido);
      window.removeEventListener('keydown', teclado, true);
      const s = ws;
      ws = null;
      if (s) { s.onclose = null; try { s.close(1000); } catch { /* closing */ } }
      capa.remove();
      resolver();
    };
    // capture phase: no key reaches the screens underneath; Escape leaves the room
    const teclado = (ev: KeyboardEvent) => {
      if (ev.code === 'Escape') { ev.preventDefault(); ev.stopImmediatePropagation(); cerrar(); }
      else if (!(ev.target instanceof HTMLButtonElement)) ev.stopImmediatePropagation();
    };
    window.addEventListener('keydown', teclado, true);
    salir.addEventListener('click', cerrar);

    pintar();
    conectar();
  });
}
