// The two-player game, client side. The room (a Durable Object) runs the real engine and numbers every entry; this
// loop opens its socket, rebuilds the engine from the save plus the log it sends, and then applies every echoed entry
// strictly in order, one at a time, awaiting its animations, comparing its hash with the room's. The local player only
// ever SENDS entries: nothing is applied before the room echoes it (no prediction), so both screens play the exact same
// sequence. Out of combat each hero sees only his own question; in combat the screen is the solo one (ui/combate.ts).

import { ACTOS } from '../core/enemigos.ts';
import {
  aplicar, crearPartidaMulti, hashPartida, otroHueco, pendiente, rehidratarPartidaMulti,
  type Entrada, type EntradaSellada, type Hueco, type PartidaMulti, type Pregunta, type PresentadoresMulti,
} from '../core/multi/index.ts';
import { cartaPorId } from '../core/cartas.ts';
import { nube, type PartidaMulti as PartidaLobby } from '../core/nube.ts';
import { reliquiaPorId } from '../core/reliquias.ts';
import type { ClaseId, EstadoRun } from '../core/types.ts';
import { audio } from '../fx/audio.ts';
import { exploreTheme } from '../fx/music-tracks.ts';
import { fx } from '../fx/particulas.ts';
import { renderCarta } from './carta.ts';
import { pantallaCombate, type VistaCombateMulti } from './combate.ts';
import { pantallaFin } from './fin.ts';
import { pantallaFinalVerdadero } from './final-verdadero.ts';
import { pantallaMapa } from './mapa.ts';
import { lanzarMoneda } from './moneda.ts';
import { relicIcon } from './relic-art.ts';
import { refrescarTitulo } from './titulo.ts';
import { anuncio, el, espera } from './util.ts';
import '../estilos/multi.css';

const RETARDO_MAX_MS = 15_000;
const MAX_INTENTOS_SIN_ENTRAR = 4;
const NOMBRE_CLASE: Record<string, string> = {
  druida: '🌿 Druida', barbaro: '🪓 Bárbaro', mago: '🔮 Mago', picaro: '🗡️ Pícaro', brujo: '🕳️ Brujo', paladin: '🔨 Paladín',
};

interface Huecos { cara: { conectado: boolean; listo: boolean }; cruz: { conectado: boolean; listo: boolean } }
type PreguntaEleccion = Extract<Pregunta, { tipo: 'eleccion' }>;
type MapaApi = { votos(v: Partial<Record<Hueco, number>>): void; ayuda(t: string): void };

/** Plays an active multiplayer game. Resolves when the player leaves («Salir») or the run is over. */
export function jugarPartidaMulti(partida: PartidaLobby): Promise<void> {
  return new Promise((resolver) => {
    // ── What the room told us ───────────────────────────────────────────────
    let yo: Hueco = partida.hueco;
    let nombres: Record<Hueco, string> = { cara: '', cruz: '' };
    let clases: Record<Hueco, ClaseId> = { cara: partida.claseCara as ClaseId, cruz: (partida.claseCruz ?? 'mago') as ClaseId };
    nombres[yo] = nube.usuario()?.displayName ?? 'Tú';
    nombres[otroHueco(yo)] = partida.otro.nombre;
    let huecos: Huecos | null = null;
    const companero = () => nombres[otroHueco(yo)] || partida.otro.nombre;

    // ── Socket ───────────────────────────────────────────────────────────────
    let ws: WebSocket | null = null;
    let cerrado = false;
    let intentos = 0;
    let entro = false; // got at least one message from the room on this attempt
    let sinEntrar = 0;
    let sinNube = false;
    let reintento: number | undefined;
    let latido: number | undefined;

    // ── Game state ───────────────────────────────────────────────────────────
    let p: PartidaMulti | null = null;
    let semilla = 0;
    let seqAplicada: number | null = null; // last entry applied (null: right after a save, unknown until the next)
    let generacion = 0; // bumps on every (re)build: queued work of an older one is dropped
    let esperandoResync = false;
    let resyncs = 0;
    /** Everything incoming is handled strictly one after the other (animations included). */
    let cola: Promise<void> = Promise.resolve();

    // ── Screens ──────────────────────────────────────────────────────────────
    let vista: VistaCombateMulti | null = null;
    let finVista: Promise<unknown> = Promise.resolve();
    let mapaApi = null as { votos(v: Partial<Record<Hueco, number>>): void; ayuda(t: string): void } | null;
    let mapaPunto = -1;
    let eleccionAbierta: string | null = null; // key of the question my panel is showing
    let esperandoEco = false; // I answered and the room has not echoed it yet
    let enCartaAbierta: string | null = null;
    let overlayPropio = false;
    let finMostrado = false;

    // ── Frame: banner at the top ─────────────────────────────────────────────
    const banner = el('div', 'multi-banner');
    banner.setAttribute('role', 'status');
    const bannerTexto = el('span', 'multi-banner-texto');
    const salir = el('button', 'multi-banner-salir', 'Salir') as HTMLButtonElement;
    salir.type = 'button';
    banner.append(bannerTexto, salir);
    document.body.appendChild(banner);

    function pintarBanner() {
      if (cerrado) return;
      const conectado = ws?.readyState === WebSocket.OPEN;
      const otroConectado = partida.otro.bot || huecos?.[otroHueco(yo)].conectado === true;
      const estado = sinNube ? '⚠️ sin conexión con la sala'
        : !conectado ? '⏳ reconectando…'
        : otroConectado ? '● conectado' : '○ desconectado';
      bannerTexto.textContent = `👥 ${companero()}${partida.otro.bot ? ' 🤖' : ''} · ${estado}`;
      banner.classList.toggle('multi-banner-off', sinNube || !conectado || !otroConectado);
    }

    const salirDelJuego = () => {
      if (cerrado) return;
      cerrado = true;
      window.clearTimeout(reintento);
      window.clearInterval(latido);
      const s = ws;
      ws = null;
      if (s) { s.onclose = null; try { s.close(1000); } catch { /* closing */ } }
      vista?.destruir();
      limpiarOverlay();
      banner.remove();
      document.body.classList.remove('multi-activa');
      refrescarTitulo(); // the title was drawn over by the game screens
      resolver();
    };
    salir.addEventListener('click', salirDelJuego);
    document.body.classList.add('multi-activa');

    // ── Overlay helpers (the choice panels and the «waiting» message) ─────────
    const overlay = () => document.getElementById('overlay')!;
    function limpiarOverlay() {
      if (!overlayPropio) return;
      overlayPropio = false;
      overlay().className = '';
      overlay().innerHTML = '';
    }
    function mostrarEspera(texto?: string) {
      const o = overlay();
      o.innerHTML = '';
      o.className = 'overlay-activo';
      overlayPropio = true;
      const panel = el('div', 'panel-recompensa multi-espera');
      const t = el('p', 'multi-espera-texto');
      t.textContent = texto ?? `Esperando a ${companero()}…`;
      panel.append(el('div', 'multi-espera-giro'), t);
      o.appendChild(panel);
    }

    // ── Sending ──────────────────────────────────────────────────────────────
    function enviar(msg: unknown) {
      try { ws?.send(JSON.stringify(msg)); } catch { /* reconnecting */ }
    }
    const enviarEntrada = (entrada: Entrada) => enviar({ t: 'entrada', entrada });

    // ── Combat view (built the moment the engine starts a fight) ─────────────
    function vistaActual(): VistaCombateMulti | null {
      if (!p || p.fase.tipo !== 'sala' || !p.fase.sala.combate) return null;
      const sala = p.fase.sala;
      const duo = sala.combate!;
      if (vista && vista.duo === duo) return vista;
      limpiarOverlay();
      mapaApi = null;
      const run = p.runs[yo];
      ambientar(run);
      const cap = ACTOS[run.capitulo][run.escenario];
      finVista = pantallaCombate(
        run, duo.enemigos.map((e) => e.def), () => 0, sala.nodo.tipo === 'jefe' || sala.etapa === 'dm', cap.nombre,
        sala.nodo.tipo === 'elite', undefined,
        { duo, yo, clases, nombres, enviar: enviarEntrada, alMontar: (v) => { vista = v; } },
      );
      return vista;
    }
    /** What the engine plugs into each entry it applies: the combat screen's presenters and the new hooks. */
    const presentadores: PresentadoresMulti = {
      get cara() { return vistaActual()?.presentadores.cara; },
      get cruz() { return vistaActual()?.presentadores.cruz; },
      moneda: (r) => lanzarMoneda(r, nombres),
      async votoMapa() {
        if (p?.fase.tipo === 'mapa') mapaApi?.votos(p.fase.votos);
        await espera(350);
      },
      esperandoAlCompanero(h) { if (h === yo && !vistaActual()) mostrarEsperaSiProcede(); },
      async aviso(h, texto) {
        anuncio(h === yo ? texto : `${companero()}: ${texto}`, 'anuncio-botin');
        await espera(h === yo ? 900 : 500);
      },
    };
    /** «Waiting for the partner» over whatever the choice screens left, unless the map is up. */
    function mostrarEsperaSiProcede() {
      if (p?.fase.tipo === 'mapa') return;
      mostrarEspera();
    }

    function ambientar(run: EstadoRun) {
      const cap = ACTOS[run.capitulo][run.escenario];
      document.body.dataset.capitulo = String(run.capitulo);
      document.body.dataset.escenario = String(run.escenario);
      fx.estiloAmbiente = cap.ambiente;
    }

    // ── Applying entries ─────────────────────────────────────────────────────
    async function aplicarEcoado(e: EntradaSellada, hash: string, gen: number) {
      if (!p || gen !== generacion || esperandoResync) return;
      if (seqAplicada !== null && e.seq <= seqAplicada) return; // already in the rebuild
      if (seqAplicada !== null && e.seq !== seqAplicada + 1) return pedirResync('hueco en la secuencia');
      try {
        const v = vistaActual();
        let carta;
        if (e.tipo === 'jugar' && v) {
          carta = v.duo.combates[e.de].jugador.mano.find((c) => String(c.uid) === e.carta);
          if (carta) await v.jugada(e.de, carta, e.objetivo !== undefined ? v.duo.enemigos[e.objetivo] : undefined);
        }
        try {
          await aplicar(p, e, presentadores);
        } finally {
          if (carta) await v?.cerrarJugada();
        }
      } catch (err) {
        console.error('entry failed', err);
        return pedirResync('error al aplicar');
      }
      if (gen !== generacion) return;
      seqAplicada = e.seq;
      if (e.de === yo) { esperandoEco = false; enCartaAbierta = null; }
      if (hashPartida(p) !== hash) return pedirResync('hash distinto');
      resyncs = 0;
      await refrescar();
    }

    function pedirResync(motivo: string) {
      console.warn('out of sync, asking the room for the state:', motivo);
      if (resyncs++ >= 3) { sinNube = true; pintarBanner(); return; }
      esperandoResync = true;
      enviar({ t: 'resync' });
    }

    /** (Re)builds the engine from the save (or the seed) and replays the log silently. */
    async function reconstruir(m: any, gen: number) {
      vista?.destruir();
      vista = null;
      mapaApi = null;
      mapaPunto = -1;
      eleccionAbierta = null;
      esperandoEco = false;
      enCartaAbierta = null;
      limpiarOverlay();
      const nueva = m.guardado ? rehidratarPartidaMulti(m.guardado) : crearPartidaMulti({ semilla: m.semilla, clases: m.clases });
      let ultimo: number | null = null;
      let hashUltimo: string | null = null;
      for (const { entrada, hash } of m.log as { entrada: EntradaSellada; hash: string }[]) {
        if (gen !== generacion) return;
        await aplicar(nueva, entrada);
        ultimo = entrada.seq;
        hashUltimo = hash;
      }
      if (gen !== generacion) return;
      if (hashUltimo !== null && hashPartida(nueva) !== hashUltimo) console.warn('the rebuild does not match the room hash');
      p = nueva;
      semilla = m.semilla;
      seqAplicada = ultimo;
      esperandoResync = false;
      await refrescar();
    }

    // ── What to show now ─────────────────────────────────────────────────────
    async function refrescar() {
      if (cerrado || !p) return;
      const f = p.fase;
      const sala = f.tipo === 'sala' ? f.sala : null;
      // 1. a fight: the combat screen follows the engine's state
      if (sala?.combate) {
        limpiarOverlay();
        const v = vistaActual()!;
        v.actualizar();
        atenderPreguntaDeCarta(v);
        return;
      }
      // 2. the fight that just ended finishes its screen (death sequence, last enemies falling)
      if (vista) {
        vista.actualizar();
        await Promise.race([finVista, espera(8000)]);
        vista = null;
      }
      if (f.tipo === 'fin') return void (await mostrarFin());
      if (f.tipo === 'mapa') return mostrarMapa();
      const q = pendiente(p, yo);
      if (q && q.tipo === 'eleccion') return mostrarEleccion(q);
      mostrarEspera();
    }

    /** A card in play asked me something (discard, recover…): the solo card picker, answered with an entry. */
    function atenderPreguntaDeCarta(v: VistaCombateMulti) {
      const q = pendiente(p!, yo);
      if (!q || q.tipo !== 'eleccion' || q.contexto !== 'enCarta' || !p!.pausa || enCartaAbierta === q.clave) return;
      enCartaAbierta = q.clave;
      void v.elegirCarta(p!.pausa.cartas, q.titulo ?? 'Elige una carta', q.opciones.includes(null)).then((c) => {
        enviarEntrada({ tipo: 'eleccion', clave: q.clave, valor: c ? c.uid : null });
      });
    }

    function mostrarMapa() {
      const f = p!.fase as Extract<PartidaMulti['fase'], { tipo: 'mapa' }>;
      const run = p!.runs[yo];
      const miVoto = f.votos[yo];
      if (mapaApi && mapaPunto === p!.punto) {
        mapaApi.votos(f.votos);
        mapaApi.ayuda(miVoto === undefined ? 'Elige tu siguiente paso · el voto de tu compañero aparece marcado' : `Esperando a ${companero()}…`);
        return;
      }
      limpiarOverlay();
      ambientar(run);
      const cap = ACTOS[run.capitulo][run.escenario];
      audio.reproducirTema(exploreTheme(run.capitulo, run.escenario));
      mapaPunto = p!.punto;
      mapaApi = null;
      void pantallaMapa(run, `${cap.subtitulo} · ${cap.nombre}`, {
        yo, nombres, alMontar: (api) => { mapaApi = api; },
      }).then((nodo) => {
        if (p?.fase.tipo !== 'mapa' || p.fase.votos[yo] !== undefined) return;
        enviarEntrada({ tipo: 'mapa', nodo: nodo.id });
        mapaApi?.ayuda(`Esperando a ${companero()}…`);
      });
      const api = mapaApi as MapaApi | null; // set synchronously by pantallaMapa's alMontar
      api?.votos(f.votos);
      api?.ayuda(miVoto === undefined ? 'Elige tu siguiente paso · el voto de tu compañero aparece marcado' : `Esperando a ${companero()}…`);
    }

    function mostrarEleccion(q: PreguntaEleccion) {
      const clave = `${q.clave}|${JSON.stringify(q.opciones)}`;
      if (esperandoEco) return mostrarEspera();
      if (eleccionAbierta === clave && overlayPropio) return;
      eleccionAbierta = clave;
      const sala = p!.fase.tipo === 'sala' ? p!.fase.sala : null;
      const run = p!.runs[yo];
      const datos = sala?.heroes[yo].abierta?.datos;
      const o = overlay();
      o.innerHTML = '';
      o.className = 'overlay-activo';
      overlayPropio = true;
      const panel = el('div', 'panel-recompensa multi-eleccion');
      const titulo = el('h2');
      const sub = el('p');
      const fila = el('div', 'multi-opciones');
      panel.append(titulo, sub, fila);
      o.appendChild(panel);
      const elegir = (valor: number | string | null) => {
        eleccionAbierta = null;
        esperandoEco = true;
        enviarEntrada({ tipo: 'eleccion', clave: q.clave, valor });
        mostrarEspera();
      };
      const boton = (html: string, valor: number | string | null, clase = '') => {
        const b = el('button', `btn-tomar multi-opcion ${clase}`) as HTMLButtonElement;
        b.type = 'button';
        b.innerHTML = html;
        b.addEventListener('click', () => elegir(valor));
        fila.appendChild(b);
        return b;
      };
      const carta = (uid: string) => run.mazo.find((c) => String(c.uid) === uid);
      const saltar = q.opciones.includes(null);

      switch (q.contexto) {
        case 'bendicion':
        case 'reliquia':
          titulo.textContent = q.contexto === 'bendicion' ? '✨ Elige tu bendición' : '🧰 Elige una reliquia';
          sub.textContent = q.contexto === 'reliquia' ? 'Si los dos elegís la misma, la moneda decide quién se la queda.' : 'Una reliquia para empezar la aventura.';
          for (const id of q.opciones) {
            const r = reliquiaPorId(String(id));
            if (r) boton(`<span class="multi-opcion-icono">${relicIcon(r, 40)}</span><strong>${r.nombre}</strong><small>${r.texto}</small>`, r.id, 'multi-opcion-reliquia');
          }
          break;
        case 'carta':
          titulo.textContent = '🏆 Botín de guerra';
          sub.textContent = 'Añade una carta a tu mazo';
          fila.className = 'recompensa-cartas';
          q.opciones.forEach((id, i) => {
            const def = id === null ? undefined : cartaPorId(String(id));
            if (!def) return;
            const c = renderCarta(def);
            c.classList.add('carta-recompensa');
            c.style.setProperty('--retraso', `${i * 0.12}s`);
            c.addEventListener('click', () => elegir(def.id));
            fila.appendChild(c);
          });
          break;
        case 'descanso':
          titulo.textContent = '🔥 Campamento';
          sub.textContent = 'Descansa, afila una carta o purifica una maldición.';
          for (const op of q.opciones) {
            const [accion, uid] = String(op).split(':');
            const c = uid ? carta(uid) : undefined;
            if (accion === 'descansar') boton('🛌 <strong>Descansar</strong><small>Recupera PV</small>', op);
            else if (accion === 'afilar' && c) boton(`⚒️ <strong>Afilar «${c.def.nombre}»</strong><small>Mejora esta carta</small>`, op);
            else if (accion === 'purificar' && c) boton(`🕯️ <strong>Quemar «${c.def.nombre}»</strong><small>Purifica la maldición</small>`, op);
          }
          break;
        case 'evento': {
          const ev = sala?.evento;
          titulo.textContent = ev ? `${ev.arte} ${ev.titulo}` : 'Un suceso';
          sub.textContent = ev?.texto ?? '';
          for (const op of q.opciones) {
            const opcion = ev?.opciones[Number(op)];
            if (opcion) boton(`<strong>${opcion.etiqueta}</strong><small>${opcion.detalle}</small>`, op);
          }
          break;
        }
        case 'taberna':
          titulo.textContent = '🍺 La taberna';
          sub.textContent = 'Escucha un rumor o deja que olviden una carta tuya.';
          for (const op of q.opciones) {
            const [accion, id] = String(op).split(':');
            if (datos?.k !== 'taberna') break;
            if (accion === 'rumor') {
              const r = datos.rumores.find((x) => String(x.nodo) === id);
              if (r) boton(`${r.icono} <strong>${r.narrador}</strong><small>${r.texto}</small>`, op);
            } else {
              const c = carta(id);
              if (c) boton(`🍷 <strong>${datos.olvido.etiqueta}: «${c.def.nombre}»</strong><small>${datos.olvido.detalle}</small>`, op);
            }
          }
          break;
        default:
          titulo.textContent = 'Elige';
          for (const op of q.opciones) if (op !== null) boton(String(op), op);
      }
      if (saltar) boton('Seguir sin elegir', null, 'multi-opcion-saltar');
    }

    async function mostrarFin() {
      if (finMostrado || !p) return;
      finMostrado = true;
      const f = p.fase as Extract<PartidaMulti['fase'], { tipo: 'fin' }>;
      limpiarOverlay();
      const run = p.runs[yo];
      document.body.dataset.capitulo = String(run.capitulo);
      if (f.finalVerdadero) await pantallaFinalVerdadero(run.clase);
      else {
        const actoFinal = ACTOS[ACTOS.length - 1][run.escenario];
        const caida = f.victoria ? null : {
          clase: run.clase, capitulo: run.capitulo, subtitulo: ACTOS[run.capitulo][run.escenario].subtitulo,
          escenario: ACTOS[run.capitulo][run.escenario].nombre, asesino: null, salas: run.piso, turnos: null, semilla: semilla + run.piso,
        };
        await pantallaFin(f.victoria, run.clase, actoFinal.jefe[0].id, f.epilogoDM, caida);
      }
      salirDelJuego();
    }

    // ── Room messages ────────────────────────────────────────────────────────
    function alMensaje(m: any) {
      entro = true;
      switch (m.t) {
        case 'hueco':
          yo = m.hueco;
          nombres = m.nombres ?? nombres;
          clases = m.clases ?? clases;
          enviar({ t: 'listo' }); // the player came here on purpose: ready as soon as connected
          if (!p) mostrarEspera(`Esperando a ${companero()}…`);
          break;
        case 'estado': huecos = m.huecos; break;
        case 'empieza': {
          nombres = m.nombres ?? nombres;
          clases = m.clases ?? clases;
          const gen = ++generacion;
          esperandoResync = false;
          cola = cola.then(() => reconstruir(m, gen)).catch((err) => { console.error('rebuild failed', err); });
          break;
        }
        case 'entrada': {
          const gen = generacion;
          cola = cola.then(() => aplicarEcoado(m.entrada, m.hash, gen)).catch((err) => { console.error('entry failed', err); });
          break;
        }
        case 'error':
          if (m.motivo === 'invalida') {
            vista?.rechazada();
            anuncio('La sala no ha admitido esa acción', 'anuncio-error');
            if (esperandoEco) { esperandoEco = false; eleccionAbierta = null; void refrescar(); }
          }
          return;
      }
      pintarBanner();
    }

    function conectar() {
      if (cerrado) return;
      const destino = nube.direccionSocket(`/multi/games/${encodeURIComponent(partida.id)}/ws`);
      if (!destino) { sinNube = true; return pintarBanner(); }
      entro = false;
      let s: WebSocket;
      try { s = new WebSocket(destino.url, destino.protocolo); } catch { return programar(); }
      ws = s;
      s.onopen = () => {
        intentos = 0;
        latido = window.setInterval(() => { try { s.send('ping'); } catch { /* closing */ } }, 25_000);
        pintarBanner();
      };
      s.onmessage = (ev) => {
        if (typeof ev.data !== 'string' || ev.data === 'pong') return;
        try { alMensaje(JSON.parse(ev.data)); } catch (err) { console.error('bad room message', err); }
      };
      s.onerror = () => { /* onclose follows */ };
      s.onclose = (ev) => {
        window.clearInterval(latido);
        if (ws !== s || cerrado) return;
        ws = null;
        huecos = null;
        // 4000: another tab of ours took the seat. Never got in (refused upgrade): stop trying after a few times
        if (ev.code === 4000) { sinNube = true; bannerTexto.textContent = 'Has abierto esta partida en otra pestaña'; return; }
        sinEntrar = entro ? 0 : sinEntrar + 1;
        if (sinEntrar >= MAX_INTENTOS_SIN_ENTRAR) { sinNube = true; return pintarBanner(); }
        programar();
      };
      pintarBanner();
    }

    function programar() {
      if (cerrado) return;
      pintarBanner();
      reintento = window.setTimeout(conectar, Math.min(RETARDO_MAX_MS, 800 * 2 ** intentos++));
    }

    pintarBanner();
    mostrarEspera('Conectando con la sala…');
    conectar();
  });
}
