import { describe, expect, it } from 'vitest';
import {
  aplicar, crearPartidaMulti, decisionBot, hashPartida, rehidratarPartidaMulti, type EntradaSellada, type PartidaMulti,
} from '../../src/core/multi/index.ts';
import { fakeMailer, json, loginNamed, openSocket, testApp } from './helpers.ts';

// The room runs the real engine. The tests mirror what a client does: rebuild the engine from `empieza`
// and apply every echoed entry, checking the hash the room sends along.

type Call = ReturnType<typeof testApp>;
type Socket = Awaited<ReturnType<typeof openSocket>>;

async function botGame() {
  const { mailer, sent } = fakeMailer();
  const call = testApp(mailer);
  const ana = await loginNamed(call, sent, 'Ana');
  const { id } = await (await call('/multi/games', ana.auth(json({ guest: 'bot', heroClass: 'mago' })))).json<{ id: string }>();
  return { call, ana, id };
}

async function entrar(call: Call, player: { session: string }, id: string) {
  const socket = await openSocket(call, `/multi/games/${id}/ws`, player.session);
  expect(socket.status).toBe(101);
  socket.send({ t: 'listo' });
  return socket;
}

async function reconstruir(start: any): Promise<PartidaMulti> {
  const p = start.guardado ? rehidratarPartidaMulti(start.guardado) : crearPartidaMulti({ semilla: start.semilla, clases: start.clases });
  for (const { entrada } of start.log) await aplicar(p, entrada as EntradaSellada);
  return p;
}

/** Plays as the human (`cara`) with the engine's bot policy until `parar` holds; echoed entries are mirrored and checked. */
async function conducir(socket: Socket, p: PartidaMulti, desde: number, parar: (p: PartidaMulti) => boolean, humano?: (p: PartidaMulti) => any) {
  let cursor = desde;
  let enviadas = 0;
  let esperando = false;
  for (let i = 0; i < 600; i++) {
    while (cursor < socket.messages.length) {
      const m = socket.messages[cursor++];
      if (m.t !== 'entrada') continue;
      await aplicar(p, m.entrada);
      expect(hashPartida(p)).toBe(m.hash);
      if (m.entrada.de === 'cara') esperando = false;
    }
    if (parar(p)) return cursor;
    const e = esperando ? null : (humano ?? ((q) => decisionBot(q, 'cara', Math.random)))(p);
    if (e) { socket.send({ t: 'entrada', entrada: e }); esperando = true; enviadas++; }
    await new Promise((r) => setTimeout(r, 15));
  }
  throw new Error(`did not reach the goal (sent ${enviadas})`);
}

const enCombate = (p: PartidaMulti) => p.fase.tipo === 'sala' && (p.fase.sala.etapa === 'combate' || p.fase.sala.etapa === 'dm');

describe('Sala con el motor real', () => {
  it('contra el bot, tras el finTurno del humano el bot juega su turno y el combate avanza solo', async () => {
    const { call, ana, id } = await botGame();
    const a = await entrar(call, ana, id);
    const start = await a.until((m) => m.t === 'empieza');
    const p = await reconstruir(start);

    let cursor = await conducir(a, p, a.messages.indexOf(start) + 1, enCombate);
    if (p.fase.tipo !== 'sala') throw new Error('not in a room');
    const duo = p.fase.sala.combate!;
    expect(duo.combates.cara.turno).toBe(1);

    a.send({ t: 'entrada', entrada: { tipo: 'finTurno' } });
    cursor = await conducir(a, p, cursor, () => duo.combates.cara.turno === 2 || duo.terminado !== null, () => null);
    // only what was applied up to turn 2: by then the bot may already be playing its next turn
    const delBot = a.messages.slice(0, cursor).filter((m) => m.t === 'entrada' && m.entrada.de === 'cruz');
    expect(delBot.length).toBeGreaterThan(0);
    // the bot ended its turn by itself (its next turn may already have started, depending on timing)
    expect(delBot.some((m) => m.entrada.tipo === 'finTurno')).toBe(true);
  });

  it('rechaza una entrada que el motor no admite y no la guarda en el log', async () => {
    const { call, ana, id } = await botGame();
    const a = await entrar(call, ana, id);
    await a.until((m) => m.t === 'empieza');

    a.send({ t: 'entrada', entrada: { tipo: 'jugar', carta: '999', objetivo: 0 } });
    expect(await a.until((m) => m.t === 'error')).toMatchObject({ motivo: 'invalida' });
    // (the bot may already be answering its own blessing: only the human's bad entry must be absent)
    expect(a.messages.some((m) => m.t === 'entrada' && m.entrada.tipo === 'jugar')).toBe(false);

    a.ws!.close(1000, 'bye');
    const again = await entrar(call, ana, id);
    const log = (await again.until((m) => m.t === 'empieza')).log;
    expect(log.some((e: any) => e.entrada.tipo === 'jugar')).toBe(false);
  });

  it('al reconectar llega el guardado y solo las entradas posteriores, y se reconstruye el mismo hash', async () => {
    const { call, ana, id } = await botGame();
    const a = await entrar(call, ana, id);
    const start = await a.until((m) => m.t === 'empieza');
    const p = await reconstruir(start);

    // the opening blessings close, the game reaches the map (a save point), and the human votes
    const cursor = await conducir(a, p, a.messages.indexOf(start) + 1, (q) => q.fase.tipo === 'sala');
    a.ws!.close(1000, 'bye');

    const again = await entrar(call, ana, id);
    const resumed = await again.until((m) => m.t === 'empieza');
    expect(resumed.guardado).not.toBeNull();
    expect(resumed.log.length).toBeGreaterThan(0);
    // the bot may have gone on playing: what counts is the hash the room stored for the last entry
    expect(hashPartida(await reconstruir(resumed))).toBe(resumed.log.at(-1).hash);
  });

  it('resync: el cliente pide el estado y recibe de nuevo guardado + log', async () => {
    const { call, ana, id } = await botGame();
    const a = await entrar(call, ana, id);
    const start = await a.until((m) => m.t === 'empieza');
    a.send({ t: 'resync' });
    await a.until((m) => m.t === 'empieza' && m !== start);
    expect(a.messages.filter((m) => m.t === 'empieza').length).toBe(2);
  });
});
