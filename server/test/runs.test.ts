import { describe, expect, it } from 'vitest';
import { fakeMailer, json, login, testApp } from './helpers.ts';

const run = (over: Record<string, unknown> = {}) => ({
  runId: crypto.randomUUID(),
  heroClass: 'mago',
  result: 'defeat',
  chapter: 1,
  floor: 4,
  turns: 60,
  seed: 1234,
  gameVersion: '9.0.2',
  ...over,
});

describe('partidas terminadas y clasificación', () => {
  it('registrar una partida terminada la añade al historial del jugador', async () => {
    const { mailer, sent } = fakeMailer();
    const call = testApp(mailer);
    const { auth } = await login(call, sent);

    expect((await call('/runs', auth(json(run({ floor: 7 }))))).status).toBe(201);

    const mine = await (await call('/runs/mine', auth())).json<{ runs: Array<{ floor: number }> }>();
    expect(mine.runs.map((r) => r.floor)).toEqual([7]);
  });

  it('enviar dos veces la misma partida solo la cuenta una vez', async () => {
    const { mailer, sent } = fakeMailer();
    const call = testApp(mailer);
    const { auth } = await login(call, sent);
    const once = run();

    expect((await call('/runs', auth(json(once)))).status).toBe(201);
    expect((await call('/runs', auth(json(once)))).status).toBe(200);
    const mine = await (await call('/runs/mine', auth())).json<{ runs: unknown[] }>();
    expect(mine.runs).toHaveLength(1);
  });

  it('la clasificación de una clase pone primero las victorias, luego quien llegó más lejos y a igualdad quien tardó menos', async () => {
    const { mailer, sent } = fakeMailer();
    const call = testApp(mailer);
    const heroClass = 'paladin';
    const lejos = await login(call, sent);
    const rapido = await login(call, sent);
    const lento = await login(call, sent);
    const campeon = await login(call, sent);
    await call('/me', lejos.auth({ method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ displayName: 'Lejos' }) }));

    await call('/runs', lejos.auth(json(run({ heroClass, chapter: 2, floor: 5, turns: 300 }))));
    await call('/runs', rapido.auth(json(run({ heroClass, chapter: 1, floor: 9, turns: 80 }))));
    await call('/runs', lento.auth(json(run({ heroClass, chapter: 1, floor: 9, turns: 120 }))));
    await call('/runs', campeon.auth(json(run({ heroClass, result: 'victory', chapter: 2, floor: 15, turns: 500 }))));
    // a worse run of the champion does not push them down: only their best one counts
    await call('/runs', campeon.auth(json(run({ heroClass, chapter: 0, floor: 1, turns: 5 }))));

    const res = await call(`/leaderboard?class=${heroClass}`);
    expect(res.status).toBe(200);
    const { entries } = await res.json<{ entries: Array<{ userId: string; displayName: string | null }> }>();
    expect(entries.map((e) => e.userId)).toEqual([campeon.userId, lejos.userId, rapido.userId, lento.userId]);
    expect(entries[1].displayName).toBe('Lejos');
    expect(entries[0]).not.toHaveProperty('email');
  });

  it('rechaza partidas con clase o datos imposibles', async () => {
    const { mailer, sent } = fakeMailer();
    const call = testApp(mailer);
    const { auth } = await login(call, sent);

    expect((await call('/runs', auth(json(run({ heroClass: 'ninja' }))))).status).toBe(400);
    expect((await call('/runs', auth(json(run({ floor: -3 }))))).status).toBe(400);
    expect((await call('/runs', auth(json(run({ result: 'empate' }))))).status).toBe(400);
  });

  it('el nombre visible se valida: de 2 a 24 caracteres', async () => {
    const { mailer, sent } = fakeMailer();
    const call = testApp(mailer);
    const { auth } = await login(call, sent);
    const patch = (displayName: unknown) => auth({ method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ displayName }) });

    expect((await call('/me', patch('X'))).status).toBe(400);
    const ok = await call('/me', patch('  Gandalf el Gris  '));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ displayName: 'Gandalf el Gris' });
  });
});
