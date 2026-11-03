import { Hono } from 'hono';
import { requireUser } from './session.ts';
import type { AppEnv } from './types.ts';

/** run: the run in progress; profile: settings, endings seen and other per-player state. */
const SLOTS = new Set(['run', 'profile']);
const MAX_SAVE_BYTES = 256 * 1024;

interface SaveRow { data: string | null; revision: number; updated_at: number }

export function savesRoutes() {
  const app = new Hono<AppEnv>();
  app.use('/saves/*', requireUser);

  const current = (db: D1Database, userId: string, slot: string) =>
    db.prepare('SELECT data, revision, updated_at FROM saves WHERE user_id = ? AND slot = ?').bind(userId, slot).first<SaveRow>();

  const view = (row: SaveRow) => ({
    data: row.data === null ? null : JSON.parse(row.data),
    revision: row.revision,
    updatedAt: row.updated_at,
  });

  app.get('/saves/:slot', async (c) => {
    const slot = c.req.param('slot');
    if (!SLOTS.has(slot)) return c.json({ error: 'unknown_slot' }, 400);
    const row = await current(c.env.DB, c.var.user.id, slot);
    if (!row || row.data === null) return c.json({ error: 'empty', revision: row?.revision ?? 0 }, 404);
    return c.json(view(row));
  });

  app.put('/saves/:slot', async (c) => {
    const slot = c.req.param('slot');
    if (!SLOTS.has(slot)) return c.json({ error: 'unknown_slot' }, 400);
    const raw = await c.req.text();
    if (raw.length > MAX_SAVE_BYTES) return c.json({ error: 'too_large' }, 413);
    let body: { data?: unknown; baseRevision?: unknown };
    try { body = JSON.parse(raw); } catch { return c.json({ error: 'invalid_json' }, 400); }
    if (body.data === undefined || body.data === null || !Number.isInteger(body.baseRevision)) {
      return c.json({ error: 'invalid_body' }, 400);
    }
    const base = body.baseRevision as number;
    const now = Date.now();
    const data = JSON.stringify(body.data);
    // Compare-and-swap: the write only lands if nobody saved since the device last synced.
    const written = await c.env.DB.prepare(
      `INSERT INTO saves (user_id, slot, data, revision, updated_at) VALUES (?1, ?2, ?3, 1, ?4)
         ON CONFLICT (user_id, slot) DO UPDATE SET data = ?3, revision = revision + 1, updated_at = ?4
         WHERE saves.revision = ?5
       RETURNING revision, updated_at`,
    ).bind(c.var.user.id, slot, data, now, base).first<{ revision: number; updated_at: number }>();
    if (written) {
      return c.json({ revision: written.revision, updatedAt: written.updated_at });
    }
    const row = await current(c.env.DB, c.var.user.id, slot);
    return c.json({ error: 'conflict', ...(row ? view(row) : { data: null, revision: 0 }) }, 409);
  });

  app.delete('/saves/:slot', async (c) => {
    const slot = c.req.param('slot');
    if (!SLOTS.has(slot)) return c.json({ error: 'unknown_slot' }, 400);
    await c.env.DB.prepare('UPDATE saves SET data = NULL, revision = revision + 1, updated_at = ? WHERE user_id = ? AND slot = ?')
      .bind(Date.now(), c.var.user.id, slot).run();
    return c.body(null, 204);
  });

  return app;
}
