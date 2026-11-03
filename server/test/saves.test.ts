import { describe, expect, it } from 'vitest';
import { fakeMailer, login, put, testApp } from './helpers.ts';

const partida = { v: 1, clase: 'druida', pv: 50, piso: 3 };

describe('progreso en la nube', () => {
  it('guarda una ranura y la devuelve en otro dispositivo con su revisión', async () => {
    const { mailer, sent } = fakeMailer();
    const call = testApp(mailer);
    const { auth } = await login(call, sent);

    const saved = await call('/saves/run', auth(put({ data: partida, baseRevision: 0 })));
    expect(saved.status).toBe(200);
    expect(await saved.json()).toMatchObject({ revision: 1 });

    const res = await call('/saves/run', auth());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ data: partida, revision: 1 });
  });

  it('rechaza con 409 y devuelve la copia del servidor si otro dispositivo guardó antes', async () => {
    const { mailer, sent } = fakeMailer();
    const call = testApp(mailer);
    const { auth } = await login(call, sent);
    await call('/saves/run', auth(put({ data: partida, baseRevision: 0 })));

    const stale = await call('/saves/run', auth(put({ data: { ...partida, piso: 1 }, baseRevision: 0 })));
    expect(stale.status).toBe(409);
    expect(await stale.json()).toMatchObject({ data: partida, revision: 1 });
  });

  it('una ranura vacía responde 404 y cada jugador solo ve la suya', async () => {
    const { mailer, sent } = fakeMailer();
    const call = testApp(mailer);
    const ana = await login(call, sent);
    const bea = await login(call, sent);
    await call('/saves/run', ana.auth(put({ data: partida, baseRevision: 0 })));

    expect((await call('/saves/run', bea.auth())).status).toBe(404);
  });

  it('borrar la ranura (la run terminó) la deja vacía en todos los dispositivos', async () => {
    const { mailer, sent } = fakeMailer();
    const call = testApp(mailer);
    const { auth } = await login(call, sent);
    await call('/saves/run', auth(put({ data: partida, baseRevision: 0 })));

    expect((await call('/saves/run', auth({ method: 'DELETE' }))).status).toBe(204);
    expect((await call('/saves/run', auth())).status).toBe(404);
  });

  it('rechaza ranuras desconocidas y datos de más de 256 KB', async () => {
    const { mailer, sent } = fakeMailer();
    const call = testApp(mailer);
    const { auth } = await login(call, sent);

    expect((await call('/saves/cualquiera', auth(put({ data: partida, baseRevision: 0 })))).status).toBe(400);
    const huge = { blob: 'x'.repeat(300 * 1024) };
    expect((await call('/saves/run', auth(put({ data: huge, baseRevision: 0 })))).status).toBe(413);
  });
});
