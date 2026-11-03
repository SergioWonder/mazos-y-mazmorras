import { describe, expect, it } from 'vitest';
import { fakeMailer, json, loginNamed, openSocket, testApp } from './helpers.ts';

type Call = ReturnType<typeof testApp>;
const setup = async () => {
  const { mailer, sent } = fakeMailer();
  const call = testApp(mailer);
  return { call, sent };
};
const listGames = async (call: Call, p: { auth: (i?: RequestInit) => RequestInit }) =>
  (await (await call('/multi/games', p.auth())).json<{ games: any[] }>()).games;

/** Ana invites Bea, who accepts: returns the active game's id. */
async function activeGame(call: Call, ana: Awaited<ReturnType<typeof loginNamed>>, bea: Awaited<ReturnType<typeof loginNamed>>) {
  const created = await call('/multi/games', ana.auth(json({ guest: bea.name, heroClass: 'mago' })));
  const { id } = await created.json<{ id: string }>();
  await call(`/multi/games/${id}/accept`, bea.auth(json({ heroClass: 'druida' })));
  return id;
}

describe('invitaciones', () => {
  it('invitar → el invitado la ve → acepta → los dos la tienen activa con el nombre del otro', async () => {
    const { call, sent } = await setup();
    const ana = await loginNamed(call, sent, 'Ana');
    const bea = await loginNamed(call, sent, 'Bea');

    const created = await call('/multi/games', ana.auth(json({ guest: bea.name.toLowerCase(), heroClass: 'mago' })));
    expect(created.status).toBe(201);
    const { id } = await created.json<{ id: string }>();

    const received = (await listGames(call, bea)).find((g) => g.id === id);
    expect(received).toMatchObject({ status: 'invited', direction: 'received', other: { displayName: ana.name } });
    expect((await listGames(call, ana)).find((g) => g.id === id)).toMatchObject({ status: 'invited', direction: 'sent', other: { displayName: bea.name } });

    expect((await call(`/multi/games/${id}/accept`, bea.auth(json({ heroClass: 'druida' })))).status).toBe(200);
    expect((await listGames(call, ana)).find((g) => g.id === id)).toMatchObject({ status: 'active', hueco: 'cara', hostClass: 'mago', guestClass: 'druida' });
    expect((await listGames(call, bea)).find((g) => g.id === id)).toMatchObject({ status: 'active', hueco: 'cruz', other: { displayName: ana.name } });
  });

  it('rechaza una segunda invitación pendiente al mismo jugador (409) y una invitación rechazada desaparece de la lista', async () => {
    const { call, sent } = await setup();
    const ana = await loginNamed(call, sent, 'Ana');
    const bea = await loginNamed(call, sent, 'Bea');
    const { id } = await (await call('/multi/games', ana.auth(json({ guest: bea.name, heroClass: 'mago' })))).json<{ id: string }>();

    expect((await call('/multi/games', ana.auth(json({ guest: bea.name, heroClass: 'picaro' })))).status).toBe(409);
    expect((await call(`/multi/games/${id}/decline`, bea.auth({ method: 'POST' }))).status).toBe(200);
    expect((await listGames(call, bea)).some((g) => g.id === id)).toBe(false);
  });

  it('una partida contra el bot nace activa, con clase aleatoria para el bot', async () => {
    const { call, sent } = await setup();
    const ana = await loginNamed(call, sent, 'Ana');

    const res = await call('/multi/games', ana.auth(json({ guest: 'bot', heroClass: 'mago' })));
    expect(res.status).toBe(201);
    const { id } = await res.json<{ id: string }>();
    const game = (await listGames(call, ana)).find((g) => g.id === id);
    expect(game).toMatchObject({ status: 'active', hueco: 'cara', other: { bot: true } });
    expect(['druida', 'barbaro', 'mago', 'picaro', 'brujo', 'paladin']).toContain(game.guestClass);
  });

  it('sin nombre de jugador no se puede invitar', async () => {
    const { call, sent } = await setup();
    const { login } = await import('./helpers.ts');
    const anon = await login(call, sent);
    expect((await call('/multi/games', anon.auth(json({ guest: 'bot', heroClass: 'mago' })))).status).toBe(400);
  });

  it('un tercer perfil recibe 403 al aceptar, retomar o conectarse', async () => {
    const { call, sent } = await setup();
    const ana = await loginNamed(call, sent, 'Ana');
    const bea = await loginNamed(call, sent, 'Bea');
    const cato = await loginNamed(call, sent, 'Cato');
    const id = await activeGame(call, ana, bea);

    expect((await call(`/multi/games/${id}/accept`, cato.auth(json({ heroClass: 'mago' })))).status).toBe(403);
    expect((await call(`/multi/games/${id}/resume`, cato.auth({ method: 'POST' }))).status).toBe(403);
    expect((await openSocket(call, `/multi/games/${id}/ws`, cato.session)).status).toBe(403);
  });
});

describe('Buzón', () => {
  it('una invitación llega por WebSocket al invitado con la sesión en el query o en el subprotocolo', async () => {
    const { call, sent } = await setup();
    const ana = await loginNamed(call, sent, 'Ana');
    const bea = await loginNamed(call, sent, 'Bea');
    const byQuery = await openSocket(call, '/inbox/ws', bea.session, 'query');
    const byProtocol = await openSocket(call, '/inbox/ws', bea.session, 'protocol');
    expect(byQuery.status).toBe(101);
    expect(byProtocol.status).toBe(101);

    const { id } = await (await call('/multi/games', ana.auth(json({ guest: bea.name, heroClass: 'mago' })))).json<{ id: string }>();

    expect(await byQuery.until((m) => m.t === 'invitacion')).toMatchObject({ t: 'invitacion', partida: id, de: ana.name });
    expect(await byProtocol.until((m) => m.t === 'invitacion')).toMatchObject({ partida: id });
  });

  it('retomar avisa al otro jugador, y aceptar avisa al anfitrión', async () => {
    const { call, sent } = await setup();
    const ana = await loginNamed(call, sent, 'Ana');
    const bea = await loginNamed(call, sent, 'Bea');
    const anaInbox = await openSocket(call, '/inbox/ws', ana.session);
    const beaInbox = await openSocket(call, '/inbox/ws', bea.session);
    const id = await activeGame(call, ana, bea);

    expect(await anaInbox.until((m) => m.t === 'invitacion-respondida')).toMatchObject({ partida: id, aceptada: true, por: bea.name });
    expect((await call(`/multi/games/${id}/resume`, ana.auth({ method: 'POST' }))).status).toBe(200);
    expect(await beaInbox.until((m) => m.t === 'retomar-pedido')).toMatchObject({ partida: id, de: ana.name });
  });

  it('sin sesión no hay WebSocket', async () => {
    const { call } = await setup();
    expect((await openSocket(call, '/inbox/ws', 'token-falso')).status).toBe(401);
  });
});

describe('Sala', () => {
  async function entrar(call: Call, player: { session: string }, id: string) {
    const socket = await openSocket(call, `/multi/games/${id}/ws`, player.session);
    expect(socket.status).toBe(101);
    return socket;
  }

  it('dice a cada cliente su hueco y empieza cuando los dos están listos', async () => {
    const { call, sent } = await setup();
    const ana = await loginNamed(call, sent, 'Ana');
    const bea = await loginNamed(call, sent, 'Bea');
    const id = await activeGame(call, ana, bea);

    const a = await entrar(call, ana, id);
    const b = await entrar(call, bea, id);
    expect(await a.until((m) => m.t === 'hueco')).toMatchObject({ hueco: 'cara' });
    expect(await b.until((m) => m.t === 'hueco')).toMatchObject({ hueco: 'cruz' });

    a.send({ t: 'listo' });
    await new Promise((r) => setTimeout(r, 100));
    expect(a.messages.some((m) => m.t === 'empieza')).toBe(false); // the other one is not ready yet
    b.send({ t: 'listo' });

    const startA = await a.until((m) => m.t === 'empieza');
    const startB = await b.until((m) => m.t === 'empieza');
    expect(startA).toMatchObject({ clases: { cara: 'mago', cruz: 'druida' }, guardado: null, log: [] });
    expect(startA.semilla).toBe(startB.semilla);
    expect(Number.isInteger(startA.semilla)).toBe(true);
  });

  it('numera las entradas en orden, las difunde con su hash y reenvía el log a quien se reconecta', async () => {
    const { call, sent } = await setup();
    const ana = await loginNamed(call, sent, 'Ana');
    const bea = await loginNamed(call, sent, 'Bea');
    const id = await activeGame(call, ana, bea);
    const a = await entrar(call, ana, id);
    const b = await entrar(call, bea, id);
    a.send({ t: 'listo' });
    b.send({ t: 'listo' });
    const first = await a.until((m) => m.t === 'empieza');
    await b.until((m) => m.t === 'empieza');

    a.send({ t: 'entrada', entrada: { tipo: 'mapa', nodo: 3 } });
    b.send({ t: 'entrada', entrada: { tipo: 'finTurno' } });
    await b.until((m) => m.t === 'entrada' && m.entrada.seq === 2);
    await a.until((m) => m.t === 'entrada' && m.entrada.seq === 2);

    const seen = a.messages.filter((m) => m.t === 'entrada');
    expect(seen.map((m) => [m.entrada.seq, m.entrada.de, m.entrada.tipo])).toEqual([[1, 'cara', 'mapa'], [2, 'cruz', 'finTurno']]);
    expect(seen[0].hash).not.toBe(seen[1].hash);
    expect(b.messages.filter((m) => m.t === 'entrada').map((m) => m.hash)).toEqual(seen.map((m) => m.hash));

    // Ana drops and comes back: she gets the whole log again
    a.ws!.close(1000, 'bye');
    const again = await entrar(call, ana, id);
    again.send({ t: 'listo' });
    const resumed = await again.until((m) => m.t === 'empieza');
    expect(resumed.semilla).toBe(first.semilla);
    expect(resumed.log.map((e: any) => [e.entrada.seq, e.entrada.tipo])).toEqual([[1, 'mapa'], [2, 'finTurno']]);
  });

  it('el guardado de sala lo manda cara y al retomar llega con las entradas posteriores', async () => {
    const { call, sent } = await setup();
    const ana = await loginNamed(call, sent, 'Ana');
    const bea = await loginNamed(call, sent, 'Bea');
    const id = await activeGame(call, ana, bea);
    const a = await entrar(call, ana, id);
    const b = await entrar(call, bea, id);
    a.send({ t: 'listo' });
    b.send({ t: 'listo' });
    await a.until((m) => m.t === 'empieza');

    a.send({ t: 'entrada', entrada: { tipo: 'finTurno' } });
    await a.until((m) => m.t === 'entrada' && m.entrada.seq === 1);
    a.send({ t: 'guardado', guardado: { sala: 4 } });
    b.send({ t: 'guardado', guardado: { sala: 'trampa' } }); // only `cara` may save for now
    a.send({ t: 'entrada', entrada: { tipo: 'finTurno' } });
    await a.until((m) => m.t === 'entrada' && m.entrada.seq === 2);
    await b.until((m) => m.t === 'error');

    const c = await entrar(call, bea, id);
    c.send({ t: 'listo' });
    const resumed = await c.until((m) => m.t === 'empieza');
    expect(resumed.guardado).toEqual({ sala: 4 });
    expect(resumed.log.map((e: any) => e.entrada.seq)).toEqual([2]);
  });

  it('contra el bot el hueco cruz siempre está conectado y listo: empieza con un solo jugador', async () => {
    const { call, sent } = await setup();
    const ana = await loginNamed(call, sent, 'Ana');
    const { id } = await (await call('/multi/games', ana.auth(json({ guest: 'bot', heroClass: 'mago' })))).json<{ id: string }>();

    const a = await entrar(call, ana, id);
    a.send({ t: 'listo' });

    const start = await a.until((m) => m.t === 'empieza');
    expect(start.clases.cara).toBe('mago');
    expect((await a.until((m) => m.t === 'estado')).huecos.cruz.conectado).toBe(true);
  });

  it('rechaza entradas antes de empezar o mal formadas', async () => {
    const { call, sent } = await setup();
    const ana = await loginNamed(call, sent, 'Ana');
    const { id } = await (await call('/multi/games', ana.auth(json({ guest: 'bot', heroClass: 'mago' })))).json<{ id: string }>();
    const a = await entrar(call, ana, id);

    a.send({ t: 'entrada', entrada: { tipo: 'finTurno' } });
    expect(await a.until((m) => m.t === 'error')).toMatchObject({ motivo: 'no_empezada' });
    a.send({ t: 'listo' });
    await a.until((m) => m.t === 'empieza');
    a.send({ t: 'entrada', entrada: { tipo: 'inventada' } });
    await a.until((m) => m.t === 'error' && m.motivo === 'entrada_invalida');
  });
});

describe('Web Push', () => {
  it('suscribir y desuscribir, y la clave pública se publica', async () => {
    const { call, sent } = await setup();
    const ana = await loginNamed(call, sent, 'Ana');
    const sub = { endpoint: 'https://push.example.test/send/xyz', keys: { p256dh: 'BP'.padEnd(87, 'A'), auth: 'A'.repeat(22) } };

    expect((await call('/push/subscribe', ana.auth(json(sub)))).status).toBe(204);
    expect((await call('/push/subscribe', ana.auth({ ...json({ endpoint: sub.endpoint }), method: 'DELETE' }))).status).toBe(204);
    expect((await call('/push/subscribe', json(sub))).status).toBe(401);
    expect(await (await call('/push/key')).json()).toHaveProperty('key');
  });
});
