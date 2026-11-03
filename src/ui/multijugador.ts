// Multiplayer lobby: invite a player (or the debugging bot), answer invitations, resume games and switch on Web Push.
// Opens from the title screen's «Multijugador» button, or on a given game from a notification (`?sala=<id>`).

import { nube, type PartidaMulti, type ResultadoInvitar } from '../core/nube.ts';
import type { ClaseId } from '../core/types.ts';
import { PV_POR_CLASE } from '../core/run.ts';
import { alEventoBuzon } from './avisos-multi.ts';
import { abrirMenuAjustes } from './menu-ajustes.ts';
import { NOMBRE_CLASE } from './nube-juego.ts';
import { jugarPartidaMulti } from './partida-multi.ts';
import { el } from './util.ts';
import '../estilos/multi.css';

const CLASES: ClaseId[] = ['druida', 'barbaro', 'mago', 'picaro', 'brujo', 'paladin'];
const nombreClase = (c: string | null) => (c ? NOMBRE_CLASE[c] ?? c : '…');

const ERRORES_INVITAR: Record<Exclude<ResultadoInvitar['estado'], 'ok'>, string> = {
  'no-existe': 'No hay ningún aventurero con ese nombre.',
  'ya-invitado': 'Ya le has invitado: espera a que responda.',
  'a-ti-mismo': 'No puedes invitarte a ti mismo.',
  'sin-nombre': 'Necesitas un nombre de jugador para invitar (⚙️ Ajustes).',
  'sin-sesion': 'Tu sesión ha caducado: vuelve a entrar.',
  'sin-conexion': 'Sin conexión con el servidor. Inténtalo de nuevo.',
  error: 'Algo ha fallado. Inténtalo de nuevo en un rato.',
};

/** Small modal to pick the hero class for an invitation. Resolves null when cancelled. */
function elegirClase(titulo: string): Promise<ClaseId | null> {
  return new Promise((resolver) => {
    const capa = el('div', 'confirmar-fondo multi-clase');
    capa.setAttribute('role', 'dialog');
    capa.setAttribute('aria-label', titulo);
    const caja = el('div', 'confirmar');
    caja.appendChild(el('h3', '', titulo));
    const rejilla = el('div', 'multi-clases');
    const ultima = nube.ultimaClase();
    for (const clase of CLASES) {
      const b = el('button', `btn-tomar multi-clase-boton${clase === ultima ? ' multi-clase-ultima' : ''}`) as HTMLButtonElement;
      b.type = 'button';
      b.appendChild(el('strong', '', NOMBRE_CLASE[clase]));
      b.appendChild(el('small', '', `❤️ ${PV_POR_CLASE[clase]} PV`));
      b.addEventListener('click', () => cerrar(clase));
      rejilla.appendChild(b);
    }
    caja.appendChild(rejilla);
    const cancelar = el('button', 'btn-tomar btn-cancelar', 'Cancelar') as HTMLButtonElement;
    cancelar.type = 'button';
    cancelar.addEventListener('click', () => cerrar(null));
    caja.appendChild(cancelar);
    capa.appendChild(caja);
    document.body.appendChild(capa);
    const cerrar = (clase: ClaseId | null) => {
      window.removeEventListener('keydown', teclado, true);
      capa.remove();
      resolver(clase);
    };
    const teclado = (ev: KeyboardEvent) => {
      if (ev.code === 'Escape') { ev.preventDefault(); ev.stopImmediatePropagation(); cerrar(null); }
    };
    window.addEventListener('keydown', teclado, true);
    capa.addEventListener('click', (ev) => { if (ev.target === capa) cerrar(null); });
    capa.querySelector<HTMLButtonElement>('.multi-clase-ultima, .multi-clase-boton')!.focus();
  });
}

// ── Web Push ──────────────────────────────────────────────────────────────────
type EstadoPush = 'no-soportado' | 'sin-clave' | 'bloqueado' | 'activo' | 'inactivo';

function pushSoportado(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function registro(): Promise<ServiceWorkerRegistration | null> {
  try { return (await navigator.serviceWorker.getRegistration()) ?? null; } catch { return null; }
}

async function clavePublica(): Promise<string | null> {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return env?.VITE_VAPID_PUBLIC_KEY || (await nube.claveVapid());
}

function aBytes(base64Url: string): Uint8Array {
  const base64 = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

async function estadoPush(): Promise<EstadoPush> {
  if (!pushSoportado()) return 'no-soportado';
  const reg = await registro();
  if (!reg) return 'no-soportado'; // no service worker (development build)
  if (Notification.permission === 'denied') return 'bloqueado';
  const sub = await reg.pushManager.getSubscription();
  if (sub && Notification.permission === 'granted') {
    void nube.suscribirPush(sub.toJSON()); // binds the device to whoever is logged in now (an upsert)
    return 'activo';
  }
  return (await clavePublica()) ? 'inactivo' : 'sin-clave';
}

/** Asks for permission and subscribes (true), or unsubscribes (false). Returns the resulting state. */
async function cambiarPush(activar: boolean): Promise<EstadoPush> {
  const reg = await registro();
  if (!reg) return 'no-soportado';
  if (!activar) {
    const sub = await reg.pushManager.getSubscription();
    if (sub) { void nube.anularPush(sub.endpoint); await sub.unsubscribe(); }
    return 'inactivo';
  }
  if ((await Notification.requestPermission()) !== 'granted') return Notification.permission === 'denied' ? 'bloqueado' : 'inactivo';
  const clave = await clavePublica();
  if (!clave) return 'sin-clave';
  try {
    const sub = (await reg.pushManager.getSubscription())
      ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(clave) as BufferSource });
    return (await nube.suscribirPush(sub.toJSON())) === 'ok' ? 'activo' : 'inactivo';
  } catch {
    return 'inactivo';
  }
}

// ── Lobby ─────────────────────────────────────────────────────────────────────
export interface OpcionesLobby {
  /** Game to land on (from a notification): an active one opens its room, an invitation gets highlighted. */
  sala?: string | null;
}

/** Opens the lobby. Resolves when the player closes it. */
export function pantallaMultijugador(opciones: OpcionesLobby = {}): Promise<void> {
  return new Promise((resolver) => {
    const capa = el('div', 'confirmar-fondo multi-fondo');
    capa.setAttribute('role', 'dialog');
    capa.setAttribute('aria-label', 'Multijugador');
    const panel = el('div', 'clasif-panel multi-panel');
    const cab = el('div', 'clasif-cab');
    cab.appendChild(el('h2', '', '👥 Multijugador'));
    const cerrarBoton = el('button', 'menu-ajustes-cerrar', '✕') as HTMLButtonElement;
    cerrarBoton.setAttribute('aria-label', 'Cerrar');
    cab.appendChild(cerrarBoton);
    const cuerpo = el('div', 'multi-cuerpo');
    panel.append(cab, cuerpo);
    capa.appendChild(panel);
    document.body.appendChild(capa);

    let partidas: PartidaMulti[] | null = null;
    let cargando = true;
    let nota = '';
    let notaError = false;
    let nombreInvitado = '';
    let resaltada: string | null = opciones.sala ?? null;
    let push: EstadoPush | 'cargando' = 'cargando';
    let ocupado = false; // an action is in flight: buttons stay disabled
    let cerrado = false;
    let jugando = false; // a game is on screen: the lobby is hidden underneath
    const pidenRetomar = new Set<string>(); // games whose other player already asked to resume
    let peticion = 0;

    const avisar = (texto: string, error = false) => { nota = texto; notaError = error; };

    async function cargar() {
      const mia = ++peticion;
      cargando = true;
      pintar();
      const lista = await nube.partidasMulti();
      if (mia !== peticion || cerrado) return;
      partidas = lista;
      cargando = false;
      if (lista === null && nube.haySesion()) avisar('Sin conexión: no se pudo cargar tu lista de partidas.', true);
      pintar();
      const objetivo = resaltada ? lista?.find((p) => p.id === resaltada) : undefined;
      if (resaltada && !objetivo) { avisar('Esa partida ya no está disponible.', true); resaltada = null; pintar(); }
      else if (objetivo?.estado === 'activa') { // arrived through «Unirme» or a notification: straight into the room
        resaltada = null;
        void entrar(objetivo, false);
      } else if (objetivo) {
        cuerpo.querySelector(`[data-partida="${CSS.escape(objetivo.id)}"]`)?.scrollIntoView({ block: 'center' });
      }
    }

    /** Opens the room of an active game; asks the other player to join first when they might not know. */
    async function entrar(p: PartidaMulti, avisarAlOtro: boolean) {
      if (ocupado) return;
      ocupado = true; pintar();
      if (avisarAlOtro && !p.otro.bot) {
        const res = await nube.pedirRetomar(p.id);
        if (res === 'no-activa' || res === 'prohibido' || res === 'no-existe') {
          ocupado = false; avisar('Esa partida ya no se puede retomar.', true); return void cargar();
        }
        // any other failure (offline…) still opens the room: the other player may be waiting already
      }
      ocupado = false;
      pintar();
      // the game takes the whole screen: the lobby waits hidden (and its key capture stands down) and closes on exit
      jugando = true;
      capa.style.display = 'none';
      await jugarPartidaMulti(p);
      jugando = false;
      cerrar(); // back to the title; the game is listed under «Retomar» next time
    }

    async function invitar(nombre: string) {
      const clase = await elegirClase(nombre === 'bot' ? 'Tu clase contra el bot' : `Tu clase para jugar con ${nombre}`);
      if (!clase || cerrado) return;
      ocupado = true; avisar(''); pintar();
      const res = await nube.invitar(nombre, clase);
      ocupado = false;
      if (res.estado !== 'ok') { avisar(ERRORES_INVITAR[res.estado], true); return pintar(); }
      nube.recordarClase(clase);
      if (res.bot) {
        await cargar();
        const juego = partidas?.find((p) => p.id === res.id);
        if (juego) void entrar(juego, false);
        return;
      }
      nombreInvitado = '';
      avisar(`Invitación enviada a ${nombre}. Te avisaremos cuando responda.`);
      void cargar();
    }

    async function aceptar(p: PartidaMulti) {
      const clase = await elegirClase(`Tu clase para jugar con ${p.otro.nombre}`);
      if (!clase || cerrado) return;
      ocupado = true; pintar();
      const res = await nube.aceptarInvitacion(p.id, clase);
      ocupado = false;
      if (res !== 'ok') {
        avisar(res === 'no-pendiente' ? 'Esa invitación ya no está disponible.' : 'No se pudo aceptar. Inténtalo de nuevo.', true);
        return void cargar();
      }
      nube.recordarClase(clase);
      await cargar();
      const juego = partidas?.find((q) => q.id === p.id);
      if (juego) void entrar(juego, false); // the host was already told by the server
    }

    async function rechazar(p: PartidaMulti) {
      ocupado = true; pintar();
      await nube.rechazarInvitacion(p.id);
      ocupado = false;
      void cargar();
    }

    // ── drawing ─────────────────────────────────────────────────────────────────
    const seccion = (titulo: string, ayuda?: string) => {
      const s = el('section', 'multi-seccion');
      s.appendChild(el('h3', '', titulo));
      if (ayuda) s.appendChild(el('p', 'multi-ayuda', ayuda));
      return s;
    };
    const boton = (texto: string, accion: () => void, clase = '') => {
      const b = el('button', `btn-tomar ${clase}`.trim(), texto) as HTMLButtonElement;
      b.type = 'button';
      b.disabled = ocupado;
      b.addEventListener('click', accion);
      return b;
    };
    const fila = (p: PartidaMulti, texto: string, ...acciones: HTMLElement[]) => {
      const f = el('li', `multi-fila${p.id === resaltada ? ' multi-resaltada' : ''}`);
      f.dataset.partida = p.id;
      const t = el('span', 'multi-fila-texto');
      t.textContent = texto;
      const a = el('span', 'multi-fila-acciones');
      a.append(...acciones);
      f.append(t, a);
      return f;
    };

    function pintar() {
      if (cerrado) return;
      cuerpo.replaceChildren();
      const usuario = nube.usuario();
      if (!usuario || !usuario.displayName) {
        const s = seccion('Necesitas un nombre');
        s.appendChild(el('p', 'multi-ayuda', !usuario
          ? 'Para jugar en multijugador tienes que iniciar sesión y elegir un nombre: así tus amigos podrán invitarte.'
          : 'Para jugar en multijugador elige un nombre de aventurero: así tus amigos podrán invitarte.'));
        s.appendChild(boton('⚙️ Abrir la cuenta', () => abrirMenuAjustes()));
        cuerpo.appendChild(s);
        return;
      }
      if (nota) cuerpo.appendChild(el('p', `multi-nota${notaError ? ' multi-nota-error' : ''}`, '')).textContent = nota;

      // 1. Invite
      const invitar_ = seccion('✉️ Invitar a un jugador', 'Escribe el nombre exacto de un aventurero (no importan las mayúsculas).');
      const form = el('form', 'cuenta-form');
      const input = el('input', 'cuenta-input') as HTMLInputElement;
      input.type = 'text';
      input.maxLength = 24;
      input.placeholder = 'Nombre del jugador';
      input.setAttribute('aria-label', 'Nombre del jugador a invitar');
      input.value = nombreInvitado;
      input.disabled = ocupado;
      input.addEventListener('input', () => { nombreInvitado = input.value; });
      const enviar = el('button', 'btn-tomar', 'Invitar') as HTMLButtonElement;
      enviar.type = 'submit';
      enviar.disabled = ocupado;
      form.append(input, enviar);
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const nombre = input.value.trim();
        if (!nombre || ocupado) return;
        if (nombre.toLowerCase() === usuario.displayName!.toLowerCase()) return pintarError(ERRORES_INVITAR['a-ti-mismo']);
        void invitar(nombre);
      });
      invitar_.appendChild(form);
      invitar_.appendChild(boton('🤖 Jugar con un bot', () => void invitar('bot'), 'multi-bot'));
      invitar_.appendChild(el('small', 'cuenta-ayuda', 'El bot es para depurar: de momento no juega nada.'));
      cuerpo.appendChild(invitar_);

      if (cargando && !partidas) { cuerpo.appendChild(el('p', 'multi-ayuda', 'Cargando tus partidas…')); }
      const todas = partidas ?? [];

      // 2. Invitations received
      const recibidas = todas.filter((p) => p.estado === 'invitada' && p.direccion === 'recibida');
      if (recibidas.length) {
        const s = seccion('📨 Invitaciones recibidas');
        const ul = el('ul', 'multi-lista');
        for (const p of recibidas) {
          ul.appendChild(fila(p, `${p.otro.nombre} te invita (juega de ${nombreClase(p.claseCara)})`,
            boton('Aceptar', () => void aceptar(p)), boton('Rechazar', () => void rechazar(p), 'multi-aviso-no')));
        }
        s.appendChild(ul);
        cuerpo.appendChild(s);
      }

      // 3. Games to resume
      const activas = todas.filter((p) => p.estado === 'activa');
      if (activas.length) {
        const s = seccion('⚔️ Partidas para retomar', 'Al retomar, tu compañero recibe un aviso; la partida sigue cuando los dos estáis dentro.');
        const ul = el('ul', 'multi-lista');
        for (const p of activas) {
          const mia = p.hueco === 'cara' ? p.claseCara : p.claseCruz;
          const suya = p.hueco === 'cara' ? p.claseCruz : p.claseCara;
          const espera = pidenRetomar.has(p.id);
          ul.appendChild(fila(p, `${p.otro.bot ? '🤖 ' : ''}${p.otro.nombre} · tú ${nombreClase(mia)}, ${p.otro.bot ? 'el bot' : 'él/ella'} ${nombreClase(suya)}${espera ? ' · ¡te espera!' : ''}`,
            boton(espera ? 'Unirme' : 'Retomar', () => void entrar(p, !espera))));
        }
        s.appendChild(ul);
        cuerpo.appendChild(s);
      }

      // 4. Invitations sent
      const enviadas = todas.filter((p) => p.estado === 'invitada' && p.direccion === 'enviada');
      if (enviadas.length) {
        const s = seccion('⏳ Invitaciones enviadas');
        const ul = el('ul', 'multi-lista');
        for (const p of enviadas) ul.appendChild(fila(p, `Esperando a que ${p.otro.nombre} responda…`));
        s.appendChild(ul);
        cuerpo.appendChild(s);
      }
      if (!cargando && partidas && !recibidas.length && !activas.length && !enviadas.length) {
        cuerpo.appendChild(el('p', 'multi-ayuda multi-vacio', 'Todavía no tienes partidas ni invitaciones.'));
      }

      // 5. Web Push
      if (push !== 'no-soportado') {
        const s = seccion('🔔 Avisos');
        const filaPush = el('label', 'menu-ajustes-fila ajuste-interruptor');
        filaPush.innerHTML = '<span class="ajuste-texto"><span class="ajuste-etiqueta">🔔 Avisarme aunque tenga el juego cerrado</span><small></small></span>';
        const check = el('input') as HTMLInputElement;
        check.type = 'checkbox';
        check.checked = push === 'activo';
        check.disabled = push === 'cargando' || push === 'bloqueado' || push === 'sin-clave';
        filaPush.classList.toggle('ajuste-apagado', check.disabled);
        filaPush.append(check, el('span', 'ajuste-conmutador'));
        filaPush.querySelector('small')!.textContent =
          push === 'bloqueado' ? 'Bloqueados en el navegador: permítelos en los ajustes del sitio.'
          : push === 'sin-clave' ? 'El servidor todavía no tiene los avisos configurados.'
          : 'Una notificación del sistema cuando te inviten o te esperen. En iPhone solo funciona con el juego instalado.';
        check.addEventListener('change', async () => {
          check.disabled = true;
          push = await cambiarPush(check.checked);
          pintar();
        });
        s.appendChild(filaPush);
        cuerpo.appendChild(s);
      }
    }
    function pintarError(texto: string) { avisar(texto, true); pintar(); }

    // ── lifecycle ───────────────────────────────────────────────────────────────
    const dejarDeOirBuzon = alEventoBuzon((e) => {
      if (e.t === 'retomar-pedido' || e.t === 'sala-lista') pidenRetomar.add(e.partida);
      if (e.t === 'invitacion-respondida') avisar(e.aceptada ? `${e.por} ha aceptado tu invitación.` : `${e.por} ha rechazado tu invitación.`, !e.aceptada);
      void cargar();
      return true; // the lobby shows it by itself
    });
    const dejarDeOirNube = nube.alCambiar(() => { void cargar(); });

    const cerrar = () => {
      if (cerrado) return;
      cerrado = true;
      peticion++;
      dejarDeOirBuzon();
      dejarDeOirNube();
      window.removeEventListener('keydown', teclado, true);
      capa.remove();
      resolver();
    };
    // capture phase: no key reaches the title underneath; Escape closes (unless a dialog above has it)
    const teclado = (ev: KeyboardEvent) => {
      if (jugando || document.querySelector('.multi-clase, .multi-sala-fondo, .menu-ajustes')) return;
      if (ev.code === 'Escape') { ev.preventDefault(); ev.stopImmediatePropagation(); cerrar(); }
      else if (!(ev.target instanceof HTMLElement && ['BUTTON', 'INPUT'].includes(ev.target.tagName))) ev.stopImmediatePropagation();
    };
    window.addEventListener('keydown', teclado, true);
    cerrarBoton.addEventListener('click', cerrar);
    capa.addEventListener('click', (ev) => { if (ev.target === capa) cerrar(); });

    pintar();
    void cargar();
    void estadoPush().then((e) => { push = e; pintar(); });
  });
}
