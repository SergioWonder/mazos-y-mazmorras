import { describe, expect, it } from 'vitest';
import { fakeMailer, json, testApp, uniqueEmail } from './helpers.ts';

describe('acceso con enlace mágico', () => {
  it('pedir un enlace envía un correo con un enlace al juego que lleva el token', async () => {
    const { mailer, sent } = fakeMailer();
    const call = testApp(mailer);

    const res = await call('/auth/magic-link', json({ email: 'Ana@Ejemplo.com ' }));

    expect(res.status).toBe(202);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('ana@ejemplo.com');
    const link = new URL(sent[0].link);
    expect(`${link.origin}${link.pathname}`).toBe('https://sergiowonder.github.io/mazos-y-mazmorras/');
    expect(link.searchParams.get('login')).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('rechaza un email no válido sin enviar nada', async () => {
    const { mailer, sent } = fakeMailer();
    const res = await testApp(mailer)('/auth/magic-link', json({ email: 'no-es-un-email' }));

    expect(res.status).toBe(400);
    expect(sent).toHaveLength(0);
  });

  it('canjear el enlace da una sesión con la que /me devuelve al jugador', async () => {
    const email = uniqueEmail();
    const { mailer, sent } = fakeMailer();
    const call = testApp(mailer);
    await call('/auth/magic-link', json({ email }));
    const token = new URL(sent[0].link).searchParams.get('login');

    const res = await call('/auth/verify', json({ token }));
    expect(res.status).toBe(200);
    const { session, user } = await res.json<{ session: string; user: { id: string; email: string } }>();
    expect(user.email).toBe(email);

    const me = await call('/me', { headers: { authorization: `Bearer ${session}` } });
    expect(me.status).toBe(200);
    expect(await me.json()).toMatchObject({ id: user.id, email: email, displayName: null });
  });

  it('un enlace solo sirve una vez', async () => {
    const email = uniqueEmail();
    const { mailer, sent } = fakeMailer();
    const call = testApp(mailer);
    await call('/auth/magic-link', json({ email }));
    const token = new URL(sent[0].link).searchParams.get('login');

    expect((await call('/auth/verify', json({ token }))).status).toBe(200);
    expect((await call('/auth/verify', json({ token }))).status).toBe(401);
  });

  it('sin sesión válida /me responde 401', async () => {
    const res = await testApp()('/me', { headers: { authorization: 'Bearer inventado' } });
    expect(res.status).toBe(401);
  });

  it('no envía más de 3 enlaces al mismo email cada 15 minutos', async () => {
    const email = uniqueEmail();
    const { mailer, sent } = fakeMailer();
    const call = testApp(mailer);
    for (let i = 0; i < 3; i++) expect((await call('/auth/magic-link', json({ email }))).status).toBe(202);

    const res = await call('/auth/magic-link', json({ email }));
    expect(res.status).toBe(429);
    expect(sent).toHaveLength(3);
  });

  it('cerrar sesión invalida el token', async () => {
    const email = uniqueEmail();
    const { mailer, sent } = fakeMailer();
    const call = testApp(mailer);
    await call('/auth/magic-link', json({ email }));
    const { session } = await (await call('/auth/verify', json({ token: new URL(sent[0].link).searchParams.get('login') }))).json<{ session: string }>();

    expect((await call('/auth/logout', json({}, session))).status).toBe(204);
    expect((await call('/me', { headers: { authorization: `Bearer ${session}` } })).status).toBe(401);
  });
});
