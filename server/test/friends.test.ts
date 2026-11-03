import { describe, expect, it } from 'vitest';
import { fakeMailer, json, loginNamed, testApp } from './helpers.ts';

type Call = ReturnType<typeof testApp>;
type Player = Awaited<ReturnType<typeof loginNamed>>;
interface Companion { userId: string; displayName: string; friend: boolean }

const setup = () => {
  const { mailer, sent } = fakeMailer();
  return { call: testApp(mailer), sent };
};
const companions = async (call: Call, p: Player) =>
  (await (await call('/friends', p.auth())).json<{ companions: Companion[] }>()).companions;

/** Ana invites Bea, who accepts: they have played together. */
async function playTogether(call: Call, ana: Player, bea: Player) {
  const { id } = await (await call('/multi/games', ana.auth(json({ guest: bea.name, heroClass: 'mago' })))).json<{ id: string }>();
  await call(`/multi/games/${id}/accept`, bea.auth(json({ heroClass: 'druida' })));
}

describe('amigos', () => {
  it('quien ha jugado contigo aparece como compañero y puedes guardarlo como amigo (y quitarlo)', async () => {
    const { call, sent } = setup();
    const ana = await loginNamed(call, sent, 'Ana');
    const bea = await loginNamed(call, sent, 'Bea');
    await playTogether(call, ana, bea);

    expect(await companions(call, ana)).toEqual([{ userId: bea.userId, displayName: bea.name, friend: false }]);
    expect(await companions(call, bea)).toEqual([{ userId: ana.userId, displayName: ana.name, friend: false }]);

    expect((await call(`/friends/${bea.userId}`, ana.auth({ method: 'PUT' }))).status).toBe(200);
    expect(await companions(call, ana)).toEqual([{ userId: bea.userId, displayName: bea.name, friend: true }]);
    // being someone's friend is one-way: Bea decides her own list
    expect((await companions(call, bea))[0].friend).toBe(false);

    expect((await call(`/friends/${bea.userId}`, ana.auth({ method: 'DELETE' }))).status).toBe(200);
    expect((await companions(call, ana))[0].friend).toBe(false);
  });

  it('no deja guardar como amigo a alguien con quien no has jugado, ni una invitación sin aceptar cuenta', async () => {
    const { call, sent } = setup();
    const ana = await loginNamed(call, sent, 'Ana');
    const bea = await loginNamed(call, sent, 'Bea');
    await call('/multi/games', ana.auth(json({ guest: bea.name, heroClass: 'mago' })));

    expect(await companions(call, ana)).toEqual([]);
    expect((await call(`/friends/${bea.userId}`, ana.auth({ method: 'PUT' }))).status).toBe(403);
    expect((await call('/friends', { method: 'GET' })).status).toBe(401);
  });
});
