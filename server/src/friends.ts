// Friends: the players you have already played with (an accepted multiplayer game, not the bot) and the ones of them
// you saved as friends, to pick them quickly when inviting. The list is one-way: each player keeps their own.

import { Hono } from 'hono';
import { requireUser } from './session.ts';
import type { AppEnv } from './types.ts';

/** Everyone I have shared an accepted game with (active or finished), most recent first, flagged if saved. */
const COMPANIONS_SQL = `
  WITH played AS (
    SELECT CASE WHEN host_user_id = ?1 THEN guest_user_id ELSE host_user_id END AS other_id, MAX(updated_at) AS last_at
      FROM multi_games
     WHERE (host_user_id = ?1 OR guest_user_id = ?1) AND guest_user_id IS NOT NULL AND status IN ('active', 'finished')
     GROUP BY other_id
  )
  SELECT u.id AS userId, u.display_name AS displayName, (f.friend_id IS NOT NULL) AS friend
    FROM played p
    JOIN users u ON u.id = p.other_id
    LEFT JOIN friends f ON f.user_id = ?1 AND f.friend_id = p.other_id
   WHERE u.display_name IS NOT NULL
   ORDER BY friend DESC, p.last_at DESC
   LIMIT 100`;

export function friendRoutes() {
  const app = new Hono<AppEnv>();

  app.get('/friends', requireUser, async (c) => {
    const { results } = await c.env.DB.prepare(COMPANIONS_SQL).bind(c.var.user.id)
      .all<{ userId: string; displayName: string; friend: number }>();
    return c.json({ companions: results.map((r) => ({ ...r, friend: r.friend === 1 })) });
  });

  app.put('/friends/:id', requireUser, async (c) => {
    const me = c.var.user.id;
    const other = c.req.param('id');
    const played = await c.env.DB.prepare(
      `SELECT 1 FROM multi_games
        WHERE status IN ('active', 'finished')
          AND ((host_user_id = ?1 AND guest_user_id = ?2) OR (host_user_id = ?2 AND guest_user_id = ?1)) LIMIT 1`,
    ).bind(me, other).first();
    if (!played) return c.json({ error: 'not_played_together' }, 403);
    await c.env.DB.prepare('INSERT OR IGNORE INTO friends (user_id, friend_id, created_at) VALUES (?, ?, ?)')
      .bind(me, other, Date.now()).run();
    return c.json({ ok: true });
  });

  app.delete('/friends/:id', requireUser, async (c) => {
    await c.env.DB.prepare('DELETE FROM friends WHERE user_id = ? AND friend_id = ?').bind(c.var.user.id, c.req.param('id')).run();
    return c.json({ ok: true });
  });

  return app;
}
