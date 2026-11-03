// Cloud client: optional account, run sync, finished-runs outbox and leaderboard.
// Pure (no DOM): fetch, storage, clock and ids are injectable so the smoke test can drive it.
// Rule: the cloud never gets in the way. Every call has a timeout, never throws and reports
// failure through its return value; the game works the same without an account or offline.

import { CLAVE_FINAL_VERDADERO } from './escena-final.ts';

const CLAVE_SESION = 'mym-nube-sesion';
const CLAVE_REVISION_RUN = 'mym-nube-revision-run';
const CLAVE_REVISION_PERFIL = 'mym-nube-revision-perfil';
const CLAVE_COLA = 'mym-nube-cola';
const CLAVE_ULTIMA_CLASE = 'mym-ultima-clase';

const API_POR_DEFECTO = 'https://dracs-rogues-api.sergiowonder.workers.dev';
const PLAZO_MS = 8000;
const MAX_COLA = 20;

export interface AlmacenNube {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
  removeItem(clave: string): void;
}

export interface DepsNube {
  fetch?: typeof fetch;
  almacen?: AlmacenNube | null;
  apiUrl?: string;
  plazoMs?: number;
  uuid?: () => string;
}

export interface Usuario { id: string; email: string; displayName: string | null }
interface Sesion { token: string; usuario: Usuario }

/** A finished run waiting to go up (the server dedupes by runId). */
export interface PartidaTerminada {
  runId: string;
  heroClass: string;
  result: 'victory' | 'defeat';
  /** True ending: the Dungeon Master fell. */
  dmDefeated?: boolean;
  chapter: number;
  floor: number;
  turns: number;
  seed: number;
  gameVersion: string;
  stats?: unknown;
}

export interface PartidaRemota { data: unknown; revision: number; updatedAt: number }
export interface EntradaClasificacion {
  userId: string; displayName: string | null; heroClass: string; result: 'victory' | 'defeat';
  dmDefeated?: boolean; chapter: number; floor: number; turns: number; createdAt: number;
}
/** Best run of a pair of profiles (the host first). */
export interface EntradaClasificacionDuo {
  players: Array<{ userId: string; displayName: string | null; heroClass: string }>;
  result: 'victory' | 'defeat'; dmDefeated?: boolean; chapter: number; floor: number; turns: number; createdAt: number;
}

export type ResultadoEnlace = 'enviado' | 'email-invalido' | 'demasiados' | 'correo-no-disponible' | 'sin-conexion' | 'error';
export type ResultadoNombre = 'ok' | 'invalido' | 'ocupado' | 'sin-sesion' | 'sin-conexion';
export type ResultadoSubida = 'subida' | 'conflicto' | 'sin-sesion' | 'error';
export type EstadoRemoto =
  | { estado: 'hay'; partida: PartidaRemota }
  | { estado: 'vacia'; revision: number }
  | { estado: 'sin-sesion' }
  | { estado: 'error' };

interface Respuesta { estado: number; cuerpo: any }

export type Hueco = 'cara' | 'cruz';
/** One of the player's multiplayer games as the lobby shows it (an invitation or a game to resume). */
export interface PartidaMulti {
  id: string;
  estado: 'invitada' | 'activa';
  /** The seat of this player: `cara` invited, `cruz` accepted. */
  hueco: Hueco;
  /** Only for invitations: sent by this player or received from the other. */
  direccion: 'enviada' | 'recibida' | null;
  otro: { id: string | null; nombre: string; bot: boolean };
  claseCara: string;
  claseCruz: string | null;
  actualizada: number;
}
export type ResultadoInvitar =
  | { estado: 'ok'; id: string; bot: boolean }
  | { estado: 'no-existe' | 'ya-invitado' | 'a-ti-mismo' | 'sin-nombre' | 'sin-sesion' | 'sin-conexion' | 'error' };
export type ResultadoMulti = 'ok' | 'no-existe' | 'no-pendiente' | 'no-activa' | 'prohibido' | 'sin-sesion' | 'sin-conexion' | 'error';

function almacenGlobal(): AlmacenNube | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}

function apiDelEntorno(): string {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return env?.VITE_API_URL || API_POR_DEFECTO;
}

export function crearNube(deps: DepsNube = {}) {
  const memoria = new Map<string, string>(); // fallback when localStorage is unavailable
  const base = (deps.almacen === undefined ? almacenGlobal() : deps.almacen) ?? {
    getItem: (k: string) => memoria.get(k) ?? null,
    setItem: (k: string, v: string) => void memoria.set(k, v),
    removeItem: (k: string) => void memoria.delete(k),
  };
  const leer = (k: string) => { try { return base.getItem(k); } catch { return null; } };
  const escribir = (k: string, v: string) => { try { base.setItem(k, v); } catch { /* storage full */ } };
  const quitar = (k: string) => { try { base.removeItem(k); } catch { /* nothing */ } };
  const apiUrl = (deps.apiUrl ?? apiDelEntorno()).replace(/\/+$/, '');
  const plazo = deps.plazoMs ?? PLAZO_MS;
  const nuevoId = deps.uuid ?? (() => crypto.randomUUID());

  let conflicto: { data: unknown; revision: number; updatedAt?: number } | null = null;
  const oyentes = new Set<() => void>();
  const avisar = () => oyentes.forEach((f) => { try { f(); } catch { /* listener bug */ } });

  function leerJson<T>(clave: string): T | null {
    try { const crudo = leer(clave); return crudo === null ? null : (JSON.parse(crudo) as T); } catch { return null; }
  }
  const leerRevision = (clave: string): number | null => {
    const n = Number(leer(clave));
    return leer(clave) !== null && Number.isInteger(n) ? n : null;
  };

  const sesion = (): Sesion | null => leerJson<Sesion>(CLAVE_SESION);
  function cerrarLocal() {
    quitar(CLAVE_SESION); quitar(CLAVE_REVISION_RUN); quitar(CLAVE_REVISION_PERFIL);
    conflicto = null;
    avisar();
  }

  /** One request: null on network error or timeout, never throws. A 401 on a signed call clears the session. */
  async function pedir(metodo: string, ruta: string, cuerpo?: unknown, firmar = true): Promise<Respuesta | null> {
    const s = firmar ? sesion() : null;
    if (firmar && !s) return { estado: 401, cuerpo: null };
    const control = new AbortController();
    const temporizador = setTimeout(() => control.abort(), plazo);
    try {
      const impl = deps.fetch ?? fetch;
      const res = await impl(`${apiUrl}${ruta}`, {
        method: metodo,
        headers: {
          ...(cuerpo !== undefined ? { 'content-type': 'application/json' } : {}),
          ...(s ? { authorization: `Bearer ${s.token}` } : {}),
        },
        body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
        signal: control.signal,
      });
      let json: any = null;
      try { json = await res.json(); } catch { /* 204 or empty body */ }
      if (res.status === 401 && s) cerrarLocal();
      return { estado: res.status, cuerpo: json };
    } catch {
      return null;
    } finally {
      clearTimeout(temporizador);
    }
  }
  const ok = (r: Respuesta | null) => !!r && r.estado >= 200 && r.estado < 300;

  // ── Account ────────────────────────────────────────────────────────────────
  async function pedirEnlace(email: string): Promise<ResultadoEnlace> {
    const r = await pedir('POST', '/auth/magic-link', { email }, false);
    if (!r) return 'sin-conexion';
    if (r.estado === 202 || ok(r)) return 'enviado';
    if (r.estado === 400) return 'email-invalido';
    if (r.estado === 429) return 'demasiados';
    if (r.estado === 503) return 'correo-no-disponible';
    return 'error';
  }

  async function canjearEnlace(token: string): Promise<Usuario | null> {
    const r = await pedir('POST', '/auth/verify', { token }, false);
    if (!ok(r) || !r!.cuerpo?.session) return null;
    const usuario = r!.cuerpo.user as Usuario;
    escribir(CLAVE_SESION, JSON.stringify({ token: r!.cuerpo.session, usuario } satisfies Sesion));
    quitar(CLAVE_REVISION_RUN); quitar(CLAVE_REVISION_PERFIL);
    conflicto = null;
    avisar();
    return usuario;
  }

  async function cerrarSesion(): Promise<void> {
    if (sesion()) await pedir('POST', '/auth/logout');
    cerrarLocal();
  }

  /** Fresh user data from the server (null when offline or logged out). */
  async function yo(): Promise<Usuario | null> {
    const s = sesion();
    const r = await pedir('GET', '/me');
    if (!s || !ok(r)) return null;
    const usuario = r!.cuerpo as Usuario;
    escribir(CLAVE_SESION, JSON.stringify({ token: s.token, usuario } satisfies Sesion));
    return usuario;
  }

  async function cambiarNombre(displayName: string): Promise<ResultadoNombre> {
    if (!sesion()) return 'sin-sesion';
    const r = await pedir('PATCH', '/me', { displayName });
    if (!r) return 'sin-conexion';
    if (r.estado === 401) return 'sin-sesion';
    if (r.estado === 400) return 'invalido';
    if (r.estado === 409) return 'ocupado'; // another adventurer already uses that name
    if (!ok(r)) return 'sin-conexion';
    const s = sesion();
    if (s) escribir(CLAVE_SESION, JSON.stringify({ token: s.token, usuario: r.cuerpo as Usuario } satisfies Sesion));
    avisar();
    return 'ok';
  }

  // ── Run slot ───────────────────────────────────────────────────────────────
  // Writes to the run slot go one at a time: two quick saves must not race on the same revision.
  let cadena: Promise<unknown> = Promise.resolve();
  const enFila = <T>(tarea: () => Promise<T>): Promise<T> => {
    const p = cadena.then(tarea, tarea);
    cadena = p.catch(() => undefined);
    return p;
  };
  async function partidaRemota(): Promise<EstadoRemoto> {
    if (!sesion()) return { estado: 'sin-sesion' };
    const r = await pedir('GET', '/saves/run');
    if (!r) return { estado: 'error' };
    if (r.estado === 401) return { estado: 'sin-sesion' };
    if (r.estado === 404) return { estado: 'vacia', revision: Number(r.cuerpo?.revision ?? 0) };
    if (!ok(r)) return { estado: 'error' };
    return { estado: 'hay', partida: r.cuerpo as PartidaRemota };
  }

  /** Uploads the local run. Without a known revision it checks the server first so it never overwrites by accident. */
  async function subirDirecto(guardado: unknown): Promise<ResultadoSubida> {
    if (!sesion()) return 'sin-sesion';
    if (conflicto) return 'conflicto'; // the player has not chosen yet
    let revision = leerRevision(CLAVE_REVISION_RUN);
    if (revision === null) {
      const remota = await partidaRemota();
      if (remota.estado === 'sin-sesion') return 'sin-sesion';
      if (remota.estado === 'error') return 'error';
      if (remota.estado === 'hay') {
        conflicto = { data: remota.partida.data, revision: remota.partida.revision, updatedAt: remota.partida.updatedAt };
        avisar();
        return 'conflicto';
      }
      revision = remota.revision;
    }
    const r = await pedir('PUT', '/saves/run', { data: guardado, baseRevision: revision });
    if (!r) return 'error';
    if (r.estado === 401) return 'sin-sesion';
    if (r.estado === 409) {
      if (r.cuerpo?.data === null || r.cuerpo?.data === undefined) {
        // the server copy is just a tombstone newer than ours: take its revision and try once more
        escribir(CLAVE_REVISION_RUN, String(r.cuerpo?.revision ?? 0));
        const segundo = await pedir('PUT', '/saves/run', { data: guardado, baseRevision: Number(r.cuerpo?.revision ?? 0) });
        if (ok(segundo)) { escribir(CLAVE_REVISION_RUN, String(segundo!.cuerpo.revision)); return 'subida'; }
        return 'error';
      }
      conflicto = { data: r.cuerpo.data, revision: r.cuerpo.revision, updatedAt: r.cuerpo.updatedAt };
      avisar();
      return 'conflicto';
    }
    if (!ok(r)) return 'error';
    escribir(CLAVE_REVISION_RUN, String(r.cuerpo.revision));
    return 'subida';
  }

  const subirPartida = (guardado: unknown) => enFila(() => subirDirecto(guardado));

  /** The run ended: empties the cloud copy. The next upload learns the new revision from the server. */
  const borrarPartida = () => enFila(borrarDirecto);
  async function borrarDirecto(): Promise<boolean> {
    if (!sesion()) return false;
    if (conflicto) {
      // another device holds a newer run: do not wipe it, the title offers it again next time
      conflicto = null;
      avisar();
      return false;
    }
    quitar(CLAVE_REVISION_RUN);
    return ok(await pedir('DELETE', '/saves/run'));
  }

  const conflictoPendiente = () => conflicto;
  const revisionRun = () => leerRevision(CLAVE_REVISION_RUN);

  /** The player chose the cloud copy: remember its revision and forget the conflict. */
  function aceptarRemota(revision: number): void {
    escribir(CLAVE_REVISION_RUN, String(revision));
    conflicto = null;
    avisar();
  }

  /** The player chose this device: overwrite the cloud using the server revision they just saw. */
  async function imponerLocal(guardado: unknown, revisionServidor: number): Promise<boolean> {
    return enFila(() => imponerDirecto(guardado, revisionServidor));
  }
  async function imponerDirecto(guardado: unknown, revisionServidor: number): Promise<boolean> {
    if (!sesion()) return false;
    const r = await pedir('PUT', '/saves/run', { data: guardado, baseRevision: revisionServidor });
    conflicto = null;
    if (ok(r)) { escribir(CLAVE_REVISION_RUN, String(r!.cuerpo.revision)); avisar(); return true; }
    if (r?.estado === 409) { // somebody saved in between: ask again with the fresh copy
      conflicto = { data: r.cuerpo.data, revision: r.cuerpo.revision, updatedAt: r.cuerpo.updatedAt };
    }
    avisar();
    return false;
  }

  // ── Profile slot: { finalVerdadero } merged with OR both ways ──────────────
  async function sincronizarPerfil(): Promise<boolean | null> {
    if (!sesion()) return null;
    const local = leer(CLAVE_FINAL_VERDADERO) === '1';
    for (let intento = 0; intento < 2; intento++) {
      const r = await pedir('GET', '/saves/profile');
      if (!r || (r.estado !== 404 && !ok(r))) return null;
      const hay = r.estado !== 404;
      const remoto = hay && r.cuerpo?.data?.finalVerdadero === true;
      const revision = Number(r.cuerpo?.revision ?? 0);
      const fusion = local || remoto;
      if (fusion && !local) escribir(CLAVE_FINAL_VERDADERO, '1');
      if (fusion && !remoto) {
        const p = await pedir('PUT', '/saves/profile', { data: { finalVerdadero: true }, baseRevision: revision });
        if (p?.estado === 409) continue; // lost the race: merge again
        if (!ok(p)) return fusion;
        escribir(CLAVE_REVISION_PERFIL, String(p!.cuerpo.revision));
      }
      return fusion;
    }
    return local;
  }

  // ── Finished runs outbox ───────────────────────────────────────────────────
  const cola = () => leerJson<PartidaTerminada[]>(CLAVE_COLA) ?? [];

  function registrarPartidaTerminada(datos: Omit<PartidaTerminada, 'runId'>): void {
    const nueva: PartidaTerminada = { runId: nuevoId(), ...datos };
    escribir(CLAVE_COLA, JSON.stringify([...cola(), nueva].slice(-MAX_COLA)));
  }

  const longitudCola = () => cola().length;

  let vaciando: Promise<void> | null = null;
  /** Sends the queue in order; drops each run on 2xx/400, keeps it (and stops) on network errors, 5xx or a lost session. */
  function vaciarCola(): Promise<void> {
    if (!vaciando) {
      vaciando = (async () => {
        while (sesion()) {
          const pendiente = cola()[0];
          if (!pendiente) return;
          const r = await pedir('POST', '/runs', pendiente);
          if (!r || !(ok(r) || r.estado === 400)) return;
          escribir(CLAVE_COLA, JSON.stringify(cola().filter((p) => p.runId !== pendiente.runId)));
        }
      })().finally(() => { vaciando = null; });
    }
    return vaciando;
  }

  // ── Leaderboard ────────────────────────────────────────────────────────────
  async function clasificacion(clase: string, limite = 20): Promise<EntradaClasificacion[] | null> {
    const r = await pedir('GET', `/leaderboard?class=${encodeURIComponent(clase)}&limit=${limite}`, undefined, false);
    if (!ok(r) || !Array.isArray(r!.cuerpo?.entries)) return null;
    return r!.cuerpo.entries as EntradaClasificacion[];
  }

  /** Multiplayer leaderboard: the best run of each pair of profiles. */
  async function clasificacionDuo(limite = 20): Promise<EntradaClasificacionDuo[] | null> {
    const r = await pedir('GET', `/leaderboard?mode=duo&limit=${limite}`, undefined, false);
    if (!ok(r) || !Array.isArray(r!.cuerpo?.entries)) return null;
    return r!.cuerpo.entries as EntradaClasificacionDuo[];
  }

  const recordarClase = (clase: string) => escribir(CLAVE_ULTIMA_CLASE, clase);
  const ultimaClase = () => leer(CLAVE_ULTIMA_CLASE);

  // ── Multiplayer: invitations, games, Web Push ──────────────────────────────
  function resultadoMulti(r: Respuesta | null): ResultadoMulti {
    if (!r) return 'sin-conexion';
    if (ok(r)) return 'ok';
    if (r.estado === 401) return 'sin-sesion';
    if (r.estado === 403) return 'prohibido';
    if (r.estado === 404) return 'no-existe';
    if (r.estado === 409) return r.cuerpo?.error === 'not_active' ? 'no-activa' : 'no-pendiente';
    return 'error';
  }

  /** Invites a player by display name (or `'bot'` for a debugging game against the bot). */
  async function invitar(invitado: string, claseHeroe: string): Promise<ResultadoInvitar> {
    const r = await pedir('POST', '/multi/games', { guest: invitado, heroClass: claseHeroe });
    if (!r) return { estado: 'sin-conexion' };
    if (ok(r)) return { estado: 'ok', id: String(r.cuerpo?.id), bot: r.cuerpo?.bot === true };
    if (r.estado === 401) return { estado: 'sin-sesion' };
    if (r.estado === 404) return { estado: 'no-existe' };
    if (r.estado === 409) return { estado: 'ya-invitado' };
    if (r.estado === 400) {
      return { estado: r.cuerpo?.error === 'name_required' ? 'sin-nombre' : r.cuerpo?.error === 'cannot_invite_self' ? 'a-ti-mismo' : 'error' };
    }
    return { estado: 'error' };
  }

  /** Pending invitations (received and sent) and active games; null offline or logged out. */
  async function partidasMulti(): Promise<PartidaMulti[] | null> {
    const r = await pedir('GET', '/multi/games');
    if (!ok(r) || !Array.isArray(r!.cuerpo?.games)) return null;
    return (r!.cuerpo.games as any[]).map((g) => ({
      id: g.id,
      estado: g.status === 'invited' ? 'invitada' : 'activa',
      hueco: g.hueco,
      direccion: g.direction === 'sent' ? 'enviada' : g.direction === 'received' ? 'recibida' : null,
      otro: { id: g.other?.id ?? null, nombre: g.other?.displayName ?? 'Aventurero anónimo', bot: g.other?.bot === true },
      claseCara: g.hostClass,
      claseCruz: g.guestClass ?? null,
      actualizada: g.updatedAt,
    }));
  }

  const aceptarInvitacion = async (id: string, claseHeroe: string) =>
    resultadoMulti(await pedir('POST', `/multi/games/${encodeURIComponent(id)}/accept`, { heroClass: claseHeroe }));
  const rechazarInvitacion = async (id: string) => resultadoMulti(await pedir('POST', `/multi/games/${encodeURIComponent(id)}/decline`, {}));
  /** Asks the other player to resume (they get an alert); the room opens when both connect. */
  const pedirRetomar = async (id: string) => resultadoMulti(await pedir('POST', `/multi/games/${encodeURIComponent(id)}/resume`, {}));

  /** Public VAPID key to subscribe to Web Push with; null when the server has none (push unavailable). */
  async function claveVapid(): Promise<string | null> {
    const r = await pedir('GET', '/push/key', undefined, false);
    return ok(r) && typeof r!.cuerpo?.key === 'string' && r!.cuerpo.key ? (r!.cuerpo.key as string) : null;
  }
  const suscribirPush = async (suscripcion: unknown) => resultadoMulti(await pedir('POST', '/push/subscribe', suscripcion));
  const anularPush = async (endpoint: string) => resultadoMulti(await pedir('DELETE', '/push/subscribe', { endpoint }));

  /** WebSocket address of a server route. The session rides as the subprotocol (browsers cannot set headers on a WebSocket). */
  function direccionSocket(ruta: string): { url: string; protocolo: string } | null {
    const s = sesion();
    return s ? { url: `${apiUrl.replace(/^http/, 'ws')}${ruta}`, protocolo: s.token } : null;
  }

  return {
    haySesion: () => sesion() !== null,
    usuario: () => sesion()?.usuario ?? null,
    alCambiar: (f: () => void) => { oyentes.add(f); return () => void oyentes.delete(f); },
    pedirEnlace, canjearEnlace, cerrarSesion, yo, cambiarNombre,
    partidaRemota, subirPartida, borrarPartida, conflictoPendiente, revisionRun, aceptarRemota, imponerLocal,
    sincronizarPerfil,
    registrarPartidaTerminada, longitudCola, vaciarCola,
    clasificacion, clasificacionDuo, recordarClase, ultimaClase,
    invitar, partidasMulti, aceptarInvitacion, rechazarInvitacion, pedirRetomar,
    claveVapid, suscribirPush, anularPush, direccionSocket,
  };
}

export type Nube = ReturnType<typeof crearNube>;

/** The game's own instance (real fetch and localStorage). */
export const nube: Nube = crearNube();
