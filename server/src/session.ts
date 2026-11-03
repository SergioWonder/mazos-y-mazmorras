import { createMiddleware } from 'hono/factory';
import { randomToken, sha256 } from './crypto.ts';
import type { AppEnv, User } from './types.ts';

export const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export async function createSession(db: D1Database, userId: string): Promise<string> {
  const token = randomToken();
  const now = Date.now();
  await db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256(token), userId, now + SESSION_TTL_MS, now)
    .run();
  return token;
}

export function bearerToken(header: string | undefined): string | null {
  const m = /^Bearer\s+(\S+)$/i.exec(header ?? '');
  return m ? m[1] : null;
}

/** Requires a valid session; puts the player in `c.var.user`. */
export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  const token = bearerToken(c.req.header('authorization'));
  if (!token) return c.json({ error: 'unauthorized' }, 401);
  const row = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.display_name AS displayName
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ?`,
  ).bind(await sha256(token), Date.now()).first<User>();
  if (!row) return c.json({ error: 'unauthorized' }, 401);
  c.set('user', row);
  await next();
});
