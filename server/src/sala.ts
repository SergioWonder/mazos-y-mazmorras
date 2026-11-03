// Sala: one Durable Object per multiplayer game. A generic relay: it numbers the players' entries, keeps the log and
// the latest room save in SQLite, and broadcasts every accepted entry with the hash of the resulting state. The engine
// is plugged in through `MotorSala` (see motor.ts).

import { DurableObject } from 'cloudflare:workers';
import type { Env } from './env.ts';
import { crearMotorGenerico, esEntrada, HASH_INICIAL, type EntradaSellada, type Hueco, type MotorSala } from './motor.ts';
import { avisarBuzon, urlSala } from './notify.ts';

/** What the Worker tells the room about the game (read from D1 after checking the player belongs to it). */
export interface InfoSala {
  id: string;
  hueco: Hueco;
  bot: boolean;
  clases: Record<Hueco, string>;
  nombres: Record<Hueco, string>;
  usuarios: Record<Hueco, string | null>;
}

interface Adjunto { hueco: Hueco; listo: boolean; enPartida: boolean }

const MAX_MENSAJE = 300 * 1024;
const MAX_ENTRADA = 2 * 1024;
const HUECOS: Hueco[] = ['cara', 'cruz'];
const otro = (h: Hueco): Hueco => (h === 'cara' ? 'cruz' : 'cara');

export class Sala extends DurableObject<Env> {
  private motor: MotorSala | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)');
      ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS log (seq INTEGER PRIMARY KEY, entrada TEXT NOT NULL, hash TEXT NOT NULL)');
    });
  }

  // ── storage ────────────────────────────────────────────────────────────────
  private leer(k: string): string | null {
    const row = this.ctx.storage.sql.exec('SELECT v FROM meta WHERE k = ?', k).toArray()[0];
    return row ? String(row.v) : null;
  }
  private escribir(k: string, v: string): void {
    this.ctx.storage.sql.exec('INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v', k, v);
  }
  private info(): InfoSala { return JSON.parse(this.leer('sala')!) as InfoSala; }
  private motorActual(): MotorSala {
    return (this.motor ??= crearMotorGenerico(this.leer('hash') ?? HASH_INICIAL));
  }
  /** Entries after the last room save (all of them while there is no save yet). */
  private registro(): { entrada: EntradaSellada; hash: string }[] {
    return this.ctx.storage.sql.exec('SELECT entrada, hash FROM log ORDER BY seq').toArray()
      .map((r) => ({ entrada: JSON.parse(String(r.entrada)) as EntradaSellada, hash: String(r.hash) }));
  }

  // ── sockets ────────────────────────────────────────────────────────────────
  private abiertos(excepto?: WebSocket): WebSocket[] {
    return this.ctx.getWebSockets().filter((s) => s !== excepto && s.readyState === WebSocket.READY_STATE_OPEN);
  }
  private adjunto(ws: WebSocket): Adjunto | null { return ws.deserializeAttachment() as Adjunto | null; }
  private enviar(ws: WebSocket, msg: unknown): void {
    try { ws.send(JSON.stringify(msg)); } catch { /* it just closed */ }
  }
  private difundir(msg: unknown, soloEnPartida = false, excepto?: WebSocket): void {
    for (const s of this.abiertos(excepto)) {
      if (!soloEnPartida || this.adjunto(s)?.enPartida) this.enviar(s, msg);
    }
  }
  private conectado(h: Hueco, excepto?: WebSocket): boolean {
    if (h === 'cruz' && this.info().bot) return true; // the bot never leaves
    return this.abiertos(excepto).some((s) => this.adjunto(s)?.hueco === h);
  }
  private listo(h: Hueco): boolean {
    if (h === 'cruz' && this.info().bot) return true;
    return this.abiertos().some((s) => { const a = this.adjunto(s); return a?.hueco === h && a.listo; });
  }
  private estado(excepto?: WebSocket) {
    const huecos = Object.fromEntries(HUECOS.map((h) => [h, { conectado: this.conectado(h, excepto), listo: this.listo(h) }]));
    return { t: 'estado', huecos, empezada: this.leer('empezada') === '1' };
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') return new Response('expected websocket', { status: 426 });
    const info = JSON.parse(request.headers.get('x-sala') ?? 'null') as InfoSala | null;
    if (!info) return new Response('missing room info', { status: 400 });
    this.escribir('sala', JSON.stringify(info));

    // A new connection of the same seat replaces the old one (reconnect, second tab).
    for (const s of this.abiertos()) {
      if (this.adjunto(s)?.hueco === info.hueco) { try { s.close(4000, 'replaced'); } catch { /* closing */ } }
    }
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server, [info.hueco]);
    server.serializeAttachment({ hueco: info.hueco, listo: false, enPartida: false } satisfies Adjunto);
    this.enviar(server, { t: 'hueco', hueco: info.hueco, nombres: info.nombres, clases: info.clases, bot: info.bot });
    this.difundir(this.estado());

    const protocol = request.headers.get('sec-websocket-protocol')?.split(',')[0]?.trim();
    return new Response(null, { status: 101, webSocket: client, headers: protocol ? { 'Sec-WebSocket-Protocol': protocol } : {} });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const adjunto = this.adjunto(ws);
    if (!adjunto || typeof raw !== 'string' || raw.length > MAX_MENSAJE) return this.enviar(ws, { t: 'error', motivo: 'mensaje_invalido' });
    let msg: { t?: unknown; entrada?: unknown; guardado?: unknown };
    try { msg = JSON.parse(raw); } catch { return this.enviar(ws, { t: 'error', motivo: 'mensaje_invalido' }); }

    switch (msg.t) {
      case 'listo': return this.alEstarListo(ws, adjunto);
      case 'entrada': return this.alRecibirEntrada(ws, adjunto, msg.entrada);
      case 'guardado': return this.alRecibirGuardado(ws, adjunto, msg.guardado);
      default: return this.enviar(ws, { t: 'error', motivo: 'mensaje_desconocido' });
    }
  }

  private alEstarListo(ws: WebSocket, adjunto: Adjunto): void {
    ws.serializeAttachment({ ...adjunto, listo: true } satisfies Adjunto);
    this.difundir(this.estado());
    const info = this.info();
    const companero = otro(adjunto.hueco);
    const idCompanero = info.usuarios[companero];
    // Nobody on the other seat: nudge them (alert in game, or Web Push when the game is closed).
    if (idCompanero && !this.conectado(companero)) {
      const de = info.nombres[adjunto.hueco];
      this.ctx.waitUntil(avisarBuzon(this.env, idCompanero, { t: 'sala-lista', partida: info.id, de }, {
        title: 'Tu compañero te espera', body: `${de} está en la sala de vuestra partida`, url: urlSala(this.env, info.id), tag: `sala-${info.id}`,
      }));
    }
    this.intentarEmpezar();
  }

  /** Sends `empieza` to every ready socket that has not got it yet, once both seats are connected and ready. */
  private intentarEmpezar(): void {
    if (!HUECOS.every((h) => this.conectado(h) && this.listo(h))) return;
    const info = this.info();
    if (this.leer('empezada') !== '1') {
      this.escribir('semilla', String(crypto.getRandomValues(new Uint32Array(1))[0]));
      this.escribir('empezada', '1');
    }
    const guardado = this.leer('guardado');
    const empieza = {
      t: 'empieza',
      semilla: Number(this.leer('semilla')),
      clases: info.clases,
      nombres: info.nombres,
      bot: info.bot,
      guardado: guardado === null ? null : JSON.parse(guardado),
      log: this.registro(),
    };
    for (const s of this.abiertos()) {
      const a = this.adjunto(s);
      if (!a || !a.listo || a.enPartida) continue;
      s.serializeAttachment({ ...a, enPartida: true } satisfies Adjunto);
      this.enviar(s, empieza);
    }
    this.difundir(this.estado());
  }

  private alRecibirEntrada(ws: WebSocket, adjunto: Adjunto, crudo: unknown): void {
    if (!adjunto.enPartida) return this.enviar(ws, { t: 'error', motivo: 'no_empezada' });
    if (!esEntrada(crudo) || JSON.stringify(crudo).length > MAX_ENTRADA) return this.enviar(ws, { t: 'error', motivo: 'entrada_invalida' });
    // The seat comes from the socket, never from what the client says.
    const seq = Number(this.leer('seq') ?? 0) + 1;
    const sellada = { ...crudo, seq, de: adjunto.hueco } as EntradaSellada;
    const motor = this.motorActual();
    motor.aplicar(sellada);
    const hash = motor.hash();
    this.ctx.storage.sql.exec('INSERT INTO log (seq, entrada, hash) VALUES (?, ?, ?)', seq, JSON.stringify(sellada), hash);
    this.escribir('seq', String(seq));
    this.escribir('hash', hash);
    this.difundir({ t: 'entrada', entrada: sellada, hash }, true);
  }

  /** Room save sent by the client of `cara` (unit C will make the server compute it): it replaces the log up to now. */
  private alRecibirGuardado(ws: WebSocket, adjunto: Adjunto, guardado: unknown): void {
    if (adjunto.hueco !== 'cara') return this.enviar(ws, { t: 'error', motivo: 'solo_cara' });
    if (!adjunto.enPartida || guardado === undefined) return this.enviar(ws, { t: 'error', motivo: 'guardado_invalido' });
    const sql = this.ctx.storage.sql;
    this.escribir('guardado', JSON.stringify(guardado));
    sql.exec('DELETE FROM log WHERE seq <= ?', Number(this.leer('seq') ?? 0));
  }

  webSocketClose(ws: WebSocket, code: number): void {
    try { ws.close(code >= 1000 && code < 1005 ? code : 1000); } catch { /* already closed */ }
    this.difundir(this.estado(ws), false, ws);
  }

  webSocketError(ws: WebSocket): void {
    this.difundir(this.estado(ws), false, ws);
  }
}
