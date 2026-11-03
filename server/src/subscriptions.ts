// Web Push subscriptions of the player's devices.

import { Hono } from 'hono';
import { requireUser } from './session.ts';
import type { AppEnv } from './types.ts';
import { readJson } from './validate.ts';

const BASE64URL = /^[\w-]+$/;

export function pushRoutes() {
  const app = new Hono<AppEnv>();

  /** Public VAPID key the browser needs to subscribe; null when the server has no push keys configured. */
  app.get('/push/key', (c) => c.json({ key: c.env.VAPID_PUBLIC_KEY || null }));

  app.post('/push/subscribe', requireUser, async (c) => {
    const b = await readJson<{ endpoint: unknown; keys: { p256dh?: unknown; auth?: unknown } }>(c.req);
    const { endpoint } = b;
    const p256dh = b.keys?.p256dh;
    const auth = b.keys?.auth;
    const valid =
      typeof endpoint === 'string' && endpoint.startsWith('https://') && endpoint.length <= 1024 &&
      typeof p256dh === 'string' && p256dh.length >= 80 && p256dh.length <= 90 && BASE64URL.test(p256dh) &&
      typeof auth === 'string' && auth.length >= 20 && auth.length <= 30 && BASE64URL.test(auth);
    if (!valid) return c.json({ error: 'invalid_subscription' }, 400);
    await c.env.DB.prepare(
      `INSERT INTO push_subscriptions (endpoint, user_id, p256dh, auth, created_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`,
    ).bind(endpoint, c.var.user.id, p256dh, auth, Date.now()).run();
    return c.body(null, 204);
  });

  app.delete('/push/subscribe', requireUser, async (c) => {
    const { endpoint } = await readJson<{ endpoint: unknown }>(c.req);
    if (typeof endpoint !== 'string') return c.json({ error: 'invalid_subscription' }, 400);
    await c.env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?').bind(endpoint, c.var.user.id).run();
    return c.body(null, 204);
  });

  return app;
}
