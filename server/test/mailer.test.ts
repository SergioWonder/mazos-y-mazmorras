import { describe, expect, it } from 'vitest';
import { resendMailer } from '../src/mailer.ts';

describe('envío de correo con Resend', () => {
  it('manda el enlace a la API de Resend con la clave y el remitente configurados', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init! });
      return new Response('{"id":"x"}', { status: 200 });
    };
    const mailer = resendMailer({ apiKey: 're_test', from: 'Dracs <no-reply@dracs.test>', fetch: fetchFn });

    await mailer.sendMagicLink({ to: 'ana@ejemplo.com', link: 'https://juego.test/?login=abc' });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.resend.com/emails');
    expect(new Headers(calls[0].init.headers).get('authorization')).toBe('Bearer re_test');
    const body = JSON.parse(String(calls[0].init.body));
    expect(body).toMatchObject({ from: 'Dracs <no-reply@dracs.test>', to: ['ana@ejemplo.com'] });
    expect(body.html).toContain('https://juego.test/?login=abc');
    expect(body.text).toContain('https://juego.test/?login=abc');
  });

  it('si Resend rechaza el envío, falla en vez de fingir que salió', async () => {
    const fetchFn = async () => new Response('{"message":"domain not verified"}', { status: 403 });
    const mailer = resendMailer({ apiKey: 're_test', from: 'x@y.z', fetch: fetchFn });

    await expect(mailer.sendMagicLink({ to: 'ana@ejemplo.com', link: 'https://juego.test/' })).rejects.toThrow(/403/);
  });
});
