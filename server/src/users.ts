import { Hono } from 'hono';
import { requireUser } from './session.ts';
import type { AppEnv } from './types.ts';

export function usersRoutes() {
  const app = new Hono<AppEnv>();

  /** Looks a player up by display name (case-insensitive) for the invite box. Needs a session so names cannot be scraped anonymously. */
  app.get('/users/by-name/:name', requireUser, async (c) => {
    const name = c.req.param('name').trim().replace(/\s+/g, ' ');
    const row = await c.env.DB.prepare('SELECT id, display_name AS displayName FROM users WHERE lower(display_name) = lower(?)')
      .bind(name).first<{ id: string; displayName: string }>();
    return row ? c.json(row) : c.json({ error: 'not_found' }, 404);
  });

  return app;
}
