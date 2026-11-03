import { describe, expect, it } from 'vitest';
import { fakeMailer, json, login, testApp } from './helpers.ts';

const patchName = (displayName: string): RequestInit => ({ ...json({ displayName }), method: 'PATCH' });
const unique = (prefix: string) => `${prefix}${crypto.randomUUID().slice(0, 8)}`;

describe('nombres únicos', () => {
  it('rechaza con 409 name_taken un nombre ya usado, sin distinguir mayúsculas ni espacios', async () => {
    const { mailer, sent } = fakeMailer();
    const call = testApp(mailer);
    const ana = await login(call, sent);
    const bea = await login(call, sent);
    const name = unique('Morghur');

    expect((await call('/me', ana.auth(patchName(name)))).status).toBe(200);
    const res = await call('/me', bea.auth(patchName(`  ${name.toLowerCase()} `)));

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'name_taken' });
  });

  it('quien ya tiene el nombre puede reescribirlo con otras mayúsculas', async () => {
    const { mailer, sent } = fakeMailer();
    const call = testApp(mailer);
    const ana = await login(call, sent);
    const name = unique('Ana');
    await call('/me', ana.auth(patchName(name)));

    expect((await call('/me', ana.auth(patchName(name.toUpperCase())))).status).toBe(200);
  });

  it('GET /users/by-name/:name devuelve id y nombre, o 404', async () => {
    const { mailer, sent } = fakeMailer();
    const call = testApp(mailer);
    const ana = await login(call, sent);
    const bea = await login(call, sent);
    const name = unique('Bea');
    await call('/me', bea.auth(patchName(name)));

    const found = await call(`/users/by-name/${encodeURIComponent(name.toLowerCase())}`, ana.auth());
    expect(found.status).toBe(200);
    expect(await found.json()).toEqual({ id: bea.userId, displayName: name });
    expect((await call('/users/by-name/nadie-con-este-nombre', ana.auth())).status).toBe(404);
  });
});
