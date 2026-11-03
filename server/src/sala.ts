// Sala: one Durable Object per multiplayer game. It runs the real two-player engine (see motor.ts): it validates and
// numbers the players' entries, applies them one at a time, keeps the log since the last room save (and the save, which
// the server computes) in SQLite, and broadcasts every accepted entry with the hash of the resulting state. Against the
// bot, it also plays the `cruz` seat.

import { DurableObject } from 'cloudflare:workers';
import { crearRng } from '../../src/core/rng.ts';
import type { Env } from './env.ts';
import { registrarPartidaDuo, type ResumenDuo } from './duo-runs.ts';
import { crearMotor, esEntrada, rehidratarMotor, type EntradaSellada, type Hueco, type MotorSala } from './motor.ts';
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

const RETARDO_BOT_MS = 700;

export class Sala extends DurableObject<Env> {
  private motor: MotorSala | null = null;
  /** Entries (and bot moves) are applied one at a time: `aplicar` is async. */
  private cola: Promise<void> = Promise.resolve();

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
  /** The engine, rebuilt from the last save (or the seed) plus the log when this instance has just woken up. */
  private async motorActual(): Promise<MotorSala> {
    if (this.motor) return this.motor;
    const guardado = this.leer('guardado');
    const motor = guardado !== null
      ? rehidratarMotor(JSON.parse(guardado))
      : crearMotor({ semilla: Number(this.leer('semilla')), clases: this.info().clases });
    for (const { entrada } of this.registro()) await motor.aplicar(entrada);
    return (this.motor = motor);
  }
  private encolar(trabajo: () => Promise<void>): Promise<void> {
    this.cola = this.cola.then(trabajo).catch((err) => { console.error('room job failed', err); this.motor = null; });
    return this.cola;
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
    let msg: { t?: unknown; entrada?: unknown };
    try { msg = JSON.parse(raw); } catch { return this.enviar(ws, { t: 'error', motivo: 'mensaje_invalido' }); }

    switch (msg.t) {
      case 'listo': return this.alEstarListo(ws, adjunto);
      case 'entrada': return this.encolar(() => this.alRecibirEntrada(ws, adjunto, msg.entrada));
      case 'resync': return this.encolar(async () => { if (adjunto.enPartida) this.enviar(ws, this.empieza()); });
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

  /** What a client needs to (re)build the game: the last room save (or the seed) and the entries since. */
  private empieza() {
    const info = this.info();
    const guardado = this.leer('guardado');
    return {
      t: 'empieza',
      semilla: Number(this.leer('semilla')),
      clases: info.clases,
      nombres: info.nombres,
      bot: info.bot,
      guardado: guardado === null ? null : JSON.parse(guardado),
      log: this.registro(),
    };
  }

  /** Sends `empieza` to every ready socket that has not got it yet, once both seats are connected and ready. */
  private intentarEmpezar(): void {
    if (!HUECOS.every((h) => this.conectado(h) && this.listo(h))) return;
    if (this.leer('empezada') !== '1') {
      this.escribir('semilla', String(crypto.getRandomValues(new Uint32Array(1))[0]));
      this.escribir('empezada', '1');
    }
    const empieza = this.empieza();
    for (const s of this.abiertos()) {
      const a = this.adjunto(s);
      if (!a || !a.listo || a.enPartida) continue;
      s.serializeAttachment({ ...a, enPartida: true } satisfies Adjunto);
      this.enviar(s, empieza);
    }
    this.difundir(this.estado());
    void this.encolar(async () => this.vigilarBot(await this.motorActual()));
  }

  /** Validates, numbers, applies, persists and broadcasts an entry from a player. */
  private async alRecibirEntrada(ws: WebSocket, adjunto: Adjunto, crudo: unknown): Promise<void> {
    if (!adjunto.enPartida) return this.enviar(ws, { t: 'error', motivo: 'no_empezada' });
    if (!esEntrada(crudo) || JSON.stringify(crudo).length > MAX_ENTRADA) return this.enviar(ws, { t: 'error', motivo: 'entrada_invalida' });
    const motor = await this.motorActual();
    // The seat comes from the socket, never from what the client says.
    const sellada = { ...crudo, seq: Number(this.leer('seq') ?? 0) + 1, de: adjunto.hueco } as EntradaSellada;
    if (!motor.esValida(sellada)) return this.enviar(ws, { t: 'error', motivo: 'invalida' });
    await this.procesar(motor, sellada);
  }

  /** Applies an already valid sealed entry, then persists and broadcasts it in one synchronous step. */
  private async procesar(motor: MotorSala, sellada: EntradaSellada): Promise<void> {
    await motor.aplicar(sellada);
    const hash = motor.hash();
    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec('INSERT INTO log (seq, entrada, hash) VALUES (?, ?, ?)', sellada.seq, JSON.stringify(sellada), hash);
      this.escribir('seq', String(sellada.seq));
      this.escribir('hash', hash);
      // A room save: the server computes it and the log restarts from it.
      if (motor.esPuntoDeGuardado()) {
        this.escribir('guardado', JSON.stringify(motor.serializar()));
        this.ctx.storage.sql.exec('DELETE FROM log');
      }
    });
    this.difundir({ t: 'entrada', entrada: sellada, hash }, true);
    if (motor.terminada()) this.ctx.waitUntil(this.marcarTerminada(motor.resumenFinal()));
    this.vigilarBot(motor);
  }

  /** The game is over: mark it finished and record it for the duo leaderboard (the server's word, no client POST). */
  private async marcarTerminada(resumen: ResumenDuo | null): Promise<void> {
    try {
      await this.env.DB.prepare(`UPDATE multi_games SET status = 'finished', updated_at = ? WHERE id = ?`).bind(Date.now(), this.info().id).run();
    } catch (err) { console.error('could not mark the game as finished', err); }
    if (!resumen) return;
    try { await registrarPartidaDuo(this.env.DB, this.info(), resumen); } catch (err) { console.error('could not record the duo run', err); }
  }

  // ── bot ────────────────────────────────────────────────────────────────────
  /** Wakes the alarm when the bot seat has something to decide (a short pause so the human sees it play). */
  private vigilarBot(motor: MotorSala): void {
    if (!this.info().bot || motor.terminada() || motor.pendiente('cruz') === null) return;
    const espera = Number(this.env.BOT_RETARDO_MS ?? RETARDO_BOT_MS);
    void this.ctx.storage.setAlarm(Date.now() + (Number.isFinite(espera) ? espera : RETARDO_BOT_MS));
  }

  async alarm(): Promise<void> {
    await this.encolar(async () => {
      if (this.leer('empezada') !== '1' || !this.info().bot) return;
      const motor = await this.motorActual();
      const seq = Number(this.leer('seq') ?? 0) + 1;
      // seeded from the game seed and the entry number: reproducible, whatever instance wakes up
      const rng = crearRng((Number(this.leer('semilla')) ^ Math.imul(seq, 0x9e3779b1)) >>> 0);
      const entrada = motor.decisionBot('cruz', rng);
      if (!entrada) return;
      const sellada = { ...entrada, seq, de: 'cruz' } as EntradaSellada;
      if (motor.esValida(sellada)) await this.procesar(motor, sellada);
    });
  }

  webSocketClose(ws: WebSocket, code: number): void {
    try { ws.close(code >= 1000 && code < 1005 ? code : 1000); } catch { /* already closed */ }
    this.difundir(this.estado(ws), false, ws);
  }

  webSocketError(ws: WebSocket): void {
    this.difundir(this.estado(ws), false, ws);
  }
}
