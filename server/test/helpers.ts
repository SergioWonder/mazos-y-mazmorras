import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { createApp, type Mailer, type MagicLinkEmail } from '../src/app.ts';

/** Mailer double that keeps every email so tests can follow the magic link. */
export function fakeMailer() {
  const sent: MagicLinkEmail[] = [];
  const mailer: Mailer = { async sendMagicLink(m) { sent.push(m); } };
  return { mailer, sent };
}

export function testApp(mailer: Mailer = fakeMailer().mailer) {
  const app = createApp({ mailer });
  return async (path: string, init: RequestInit = {}) => {
    const ctx = createExecutionContext();
    const res = await app.fetch(new Request(`https://api.test${path}`, init), env, ctx);
    await waitOnExecutionContext(ctx);
    return res;
  };
}

export const json = (body: unknown, token?: string): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify(body),
});

/** Tests share one D1 database, so every test plays with its own player. */
export const uniqueEmail = () => `jugador-${crypto.randomUUID()}@ejemplo.com`;

/** Logs a fresh player in through the real magic-link flow and returns its session. */
export async function login(call: ReturnType<typeof testApp>, sent: MagicLinkEmail[], email = uniqueEmail()) {
  await call('/auth/magic-link', json({ email }));
  const token = new URL(sent.at(-1)!.link).searchParams.get('login');
  const { session, user } = await (await call('/auth/verify', json({ token }))).json<{ session: string; user: { id: string } }>();
  const auth = (init: RequestInit = {}): RequestInit => ({
    ...init,
    headers: { ...(init.headers as Record<string, string>), authorization: `Bearer ${session}` },
  });
  return { session, userId: user.id, email, auth };
}

export const put = (body: unknown): RequestInit => ({
  method: 'PUT',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

/** Logs in a fresh player and gives them a unique display name (multiplayer requires one). */
export async function loginNamed(call: ReturnType<typeof testApp>, sent: MagicLinkEmail[], prefix = 'Jugador') {
  const player = await login(call, sent);
  const name = `${prefix}${crypto.randomUUID().slice(0, 8)}`;
  await call('/me', player.auth({ ...json({ displayName: name }), method: 'PATCH' }));
  return { ...player, name };
}

/** A WebSocket opened through the app, with every received message collected. */
export async function openSocket(call: ReturnType<typeof testApp>, path: string, token: string, via: 'query' | 'protocol' = 'query') {
  const res = await call(via === 'query' ? `${path}?token=${token}` : path, {
    headers: { Upgrade: 'websocket', ...(via === 'protocol' ? { 'Sec-WebSocket-Protocol': token } : {}) },
  });
  if (res.status !== 101 || !res.webSocket) return { status: res.status, ws: null, messages: [] as any[], send() {}, until: async () => undefined as any };
  const ws = res.webSocket;
  ws.accept();
  const messages: any[] = [];
  ws.addEventListener('message', (ev) => messages.push(JSON.parse(ev.data as string)));
  return {
    status: res.status,
    ws,
    messages,
    send: (msg: unknown) => ws.send(JSON.stringify(msg)),
    /** Waits for the first received message that matches; fails the test after ~2 s. */
    async until(match: (m: any) => boolean): Promise<any> {
      for (let i = 0; i < 100; i++) {
        const found = messages.find(match);
        if (found) return found;
        await new Promise((r) => setTimeout(r, 20));
      }
      throw new Error(`no matching message; got ${JSON.stringify(messages)}`);
    },
  };
}
