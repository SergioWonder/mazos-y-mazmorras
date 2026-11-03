// Live multiplayer alerts: one Buzón WebSocket stays open while the game is open and the player is logged in.
// It reconnects with backoff and is silent on failure (the game never depends on it). Events become an in-game
// alert over any screen with «Unirme» / «Ahora no», unless the lobby is open and handles them itself.

import { nube } from '../core/nube.ts';
import { el } from './util.ts';
import '../estilos/multi.css';

/** What the server's Buzón pushes (see server/src/notify.ts). `partida` is the multiplayer game id. */
export type EventoBuzon =
  | { t: 'invitacion'; partida: string; de: string; clase: string }
  | { t: 'invitacion-respondida'; partida: string; por: string; aceptada: boolean }
  | { t: 'retomar-pedido'; partida: string; de: string }
  | { t: 'sala-lista'; partida: string; de: string };

/** A listener returns true when it handled the event itself (no alert is shown then). */
type Oyente = (evento: EventoBuzon) => boolean | void;

const oyentes = new Set<Oyente>();
const RETARDO_MAX_MS = 60_000;
const LATIDO_MS = 25_000;

/** The lobby (and tests) listen to inbox events here. */
export function alEventoBuzon(oyente: Oyente): () => void {
  oyentes.add(oyente);
  return () => void oyentes.delete(oyente);
}

// ── «Unirme»: the title opens the lobby in place; anywhere else the page reloads onto `?sala=<id>` ──
let unirseAqui: ((partida: string) => void) | null = null;

/** The title screen registers how to open the lobby on a game without leaving the page (null on leaving). */
export function registrarUnirse(abrir: ((partida: string) => void) | null) {
  unirseAqui = abrir;
}

/** Joins a game: straight from the title, or by reloading onto the lobby. A solo run in progress stays saved at its last room. */
export function unirse(partida: string) {
  if (unirseAqui) return unirseAqui(partida);
  const url = new URL(location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('sala', partida);
  location.assign(url.toString());
}

/** `?sala=<id>` (from a notification): returns the game id once and cleans the address bar. */
export function tomarSalaDeLaUrl(): string | null {
  try {
    const url = new URL(location.href);
    const sala = url.searchParams.get('sala');
    if (!sala) return null;
    url.searchParams.delete('sala');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
    return sala;
  } catch {
    return null;
  }
}

// ── Alerts ────────────────────────────────────────────────────────────────────
function contenedor(): HTMLElement {
  let c = document.querySelector<HTMLElement>('.multi-avisos');
  if (!c) {
    c = el('div', 'multi-avisos');
    c.setAttribute('role', 'region');
    c.setAttribute('aria-label', 'Avisos de multijugador');
    document.body.appendChild(c);
  }
  return c;
}

function textoAviso(e: EventoBuzon): { texto: string; unirme: boolean } {
  switch (e.t) {
    case 'invitacion': return { texto: `👥 ${e.de} te invita a una partida multijugador`, unirme: true };
    case 'retomar-pedido': return { texto: `⚔️ ${e.de} quiere retomar vuestra partida`, unirme: true };
    case 'sala-lista': return { texto: `🚪 ${e.de} te espera en la sala`, unirme: true };
    case 'invitacion-respondida':
      return e.aceptada
        ? { texto: `✅ ${e.por} ha aceptado tu invitación`, unirme: true }
        : { texto: `${e.por} ha rechazado tu invitación`, unirme: false };
  }
}

/** Shows the alert (replacing an older one about the same game) until the player answers it. */
export function mostrarAviso(e: EventoBuzon) {
  const { texto, unirme } = textoAviso(e);
  const c = contenedor();
  c.querySelector(`[data-partida="${CSS.escape(e.partida)}"]`)?.remove();
  const aviso = el('div', 'multi-aviso');
  aviso.dataset.partida = e.partida;
  aviso.setAttribute('role', 'alert');
  const mensaje = el('span', 'multi-aviso-texto');
  mensaje.textContent = texto;
  aviso.appendChild(mensaje);
  const cerrar = () => { aviso.remove(); };
  const acciones = el('span', 'multi-aviso-acciones');
  if (unirme) {
    const si = el('button', 'btn-tomar', 'Unirme') as HTMLButtonElement;
    si.type = 'button';
    si.addEventListener('click', () => { cerrar(); unirse(e.partida); });
    acciones.appendChild(si);
  }
  const no = el('button', 'btn-tomar multi-aviso-no', unirme ? 'Ahora no' : 'Entendido') as HTMLButtonElement;
  no.type = 'button';
  no.addEventListener('click', cerrar);
  acciones.appendChild(no);
  aviso.appendChild(acciones);
  // Outside the title a solo run may be going on: it stays saved at its last room
  if (unirme && !unirseAqui) aviso.appendChild(el('small', 'multi-aviso-nota', 'Tu partida en solitario queda guardada en la última sala.'));
  c.appendChild(aviso);
  window.setTimeout(cerrar, 90_000);
}

function alRecibir(e: EventoBuzon) {
  let atendido = false;
  for (const o of oyentes) {
    try { if (o(e) === true) atendido = true; } catch { /* a listener bug never breaks the others */ }
  }
  if (!atendido) mostrarAviso(e);
}

// ── Connection ────────────────────────────────────────────────────────────────
let socket: WebSocket | null = null;
let intentos = 0;
let reintento: number | undefined;
let latido: number | undefined;
let iniciado = false;

function esEvento(v: unknown): v is EventoBuzon {
  const e = v as { t?: unknown; partida?: unknown } | null;
  return !!e && typeof e.partida === 'string' &&
    (e.t === 'invitacion' || e.t === 'invitacion-respondida' || e.t === 'retomar-pedido' || e.t === 'sala-lista');
}

function cerrarSocket() {
  window.clearInterval(latido);
  window.clearTimeout(reintento);
  const s = socket;
  socket = null;
  if (s) { s.onclose = null; s.onerror = null; s.onmessage = null; try { s.close(1000); } catch { /* closing */ } }
}

function programarReintento() {
  window.clearTimeout(reintento);
  if (!nube.haySesion()) return;
  const espera = Math.min(RETARDO_MAX_MS, 1000 * 2 ** intentos++) + Math.random() * 500;
  reintento = window.setTimeout(conectar, espera);
}

function conectar() {
  if (socket || !nube.haySesion()) return;
  const destino = nube.direccionSocket('/inbox/ws');
  if (!destino) return;
  let ws: WebSocket;
  try { ws = new WebSocket(destino.url, destino.protocolo); } catch { return programarReintento(); }
  socket = ws;
  ws.onopen = () => {
    intentos = 0;
    latido = window.setInterval(() => { try { ws.send('ping'); } catch { /* it just closed */ } }, LATIDO_MS);
  };
  ws.onmessage = (m) => {
    if (typeof m.data !== 'string' || m.data === 'pong') return;
    try { const e = JSON.parse(m.data); if (esEvento(e)) alRecibir(e); } catch { /* not ours */ }
  };
  ws.onerror = () => { /* silent: onclose follows and schedules the retry */ };
  ws.onclose = () => {
    window.clearInterval(latido);
    if (socket === ws) { socket = null; programarReintento(); }
  };
}

/** Keeps the Buzón connected while there is a session (call once at startup). */
export function iniciarAvisosMulti() {
  if (iniciado) return;
  iniciado = true;
  const sincronizar = () => {
    if (nube.haySesion()) { if (!socket) conectar(); } else { cerrarSocket(); intentos = 0; }
  };
  nube.alCambiar(sincronizar);
  window.addEventListener('online', () => { if (!socket) { intentos = 0; sincronizar(); } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !socket) sincronizar(); });
  sincronizar();
}
