import { Hono } from 'hono';
import { randomToken, sha256 } from './crypto.ts';
import { bearerToken, createSession, requireUser } from './session.ts';
import type { AppEnv, Deps, User } from './types.ts';
import { readJson } from './validate.ts';

const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Links per email inside one TTL window: keeps the free email quota from being drained. */
const MAX_LINKS_PER_WINDOW = 3;


export function authRoutes(deps: Deps) {
  const app = new Hono<AppEnv>();

  app.post('/auth/magic-link', async (c) => {
    const body = await readJson<{ email: unknown }>(c.req);
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!EMAIL_RE.test(email) || email.length > 254) return c.json({ error: 'invalid_email' }, 400);
    const now = Date.now();
    const recent = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM login_tokens WHERE email = ? AND created_at > ?')
      .bind(email, now - LOGIN_TOKEN_TTL_MS).first<{ n: number }>();
    if ((recent?.n ?? 0) >= MAX_LINKS_PER_WINDOW) return c.json({ error: 'too_many_requests' }, 429);
    const token = randomToken();
    await c.env.DB.prepare('INSERT INTO login_tokens (token_hash, email, expires_at, created_at) VALUES (?, ?, ?, ?)')
      .bind(await sha256(token), email, now + LOGIN_TOKEN_TTL_MS, now)
      .run();
    const link = new URL(c.env.APP_URL);
    link.searchParams.set('login', token);
    await deps.mailer.sendMagicLink({ to: email, link: link.toString() });
    return c.body(null, 202);
  });

  app.post('/auth/verify', async (c) => {
    const body = await readJson<{ token: unknown }>(c.req);
    if (typeof body.token !== 'string' || !body.token) return c.json({ error: 'invalid_token' }, 401);
    const now = Date.now();
    // Atomic one-use: only the request that flips used_at gets the email back.
    const claimed = await c.env.DB.prepare(
      `UPDATE login_tokens SET used_at = ?
        WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?
        RETURNING email`,
    ).bind(now, await sha256(body.token), now).first<{ email: string }>();
    if (!claimed) return c.json({ error: 'invalid_token' }, 401);

    await c.env.DB.prepare('INSERT INTO users (id, email, created_at) VALUES (?, ?, ?) ON CONFLICT (email) DO NOTHING')
      .bind(crypto.randomUUID(), claimed.email, now)
      .run();
    const user = await c.env.DB.prepare('SELECT id, email, display_name AS displayName FROM users WHERE email = ?')
      .bind(claimed.email).first<User>();
    const session = await createSession(c.env.DB, user!.id);
    return c.json({ session, user });
  });

  app.get('/me', requireUser, (c) => c.json(c.var.user));

  app.patch('/me', requireUser, async (c) => {
    const body = await readJson<{ displayName: unknown }>(c.req);
    const name = typeof body.displayName === 'string' ? body.displayName.trim().replace(/\s+/g, ' ') : '';
    if ([...name].length < 2 || [...name].length > 24) return c.json({ error: 'invalid_display_name' }, 400);
    await c.env.DB.prepare('UPDATE users SET display_name = ? WHERE id = ?').bind(name, c.var.user.id).run();
    return c.json({ ...c.var.user, displayName: name });
  });

  app.post('/auth/logout', requireUser, async (c) => {
    const token = bearerToken(c.req.header('authorization'))!;
    await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
    return c.body(null, 204);
  });

  return app;
}
