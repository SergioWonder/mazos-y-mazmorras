import { Hono } from 'hono';
import { requireUser } from './session.ts';
import type { AppEnv } from './types.ts';
import { isCount, isHeroClass, readJson, UUID_RE } from './validate.ts';

interface RunBody {
  runId: unknown; heroClass: unknown; result: unknown; chapter: unknown; floor: unknown;
  turns: unknown; seed: unknown; gameVersion: unknown; stats: unknown;
}

const MAX_STATS_BYTES = 8 * 1024;

/** Best run first: victories, then the furthest chapter and floor, then the fewest turns (earliest wins ties). */
const ranking = (t: string) =>
  `(${t}.result = 'victory') DESC, ${t}.chapter DESC, ${t}.floor DESC, ${t}.turns ASC, ${t}.created_at ASC`;

export function runsRoutes() {
  const app = new Hono<AppEnv>();

  app.post('/runs', requireUser, async (c) => {
    const b = await readJson<RunBody>(c.req);
    const stats = b.stats === undefined ? null : JSON.stringify(b.stats);
    const valid =
      typeof b.runId === 'string' && UUID_RE.test(b.runId) &&
      isHeroClass(b.heroClass) &&
      (b.result === 'victory' || b.result === 'defeat') &&
      isCount(b.chapter, 10) && isCount(b.floor, 100) && isCount(b.turns, 100_000) &&
      Number.isSafeInteger(b.seed) &&
      typeof b.gameVersion === 'string' && b.gameVersion.length <= 20 &&
      (stats === null || stats.length <= MAX_STATS_BYTES);
    if (!valid) return c.json({ error: 'invalid_run' }, 400);

    const inserted = await c.env.DB.prepare(
      `INSERT INTO runs (id, user_id, hero_class, result, chapter, floor, turns, seed, game_version, stats, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`,
    ).bind(b.runId, c.var.user.id, b.heroClass, b.result, b.chapter, b.floor, b.turns, b.seed, b.gameVersion, stats, Date.now()).run();
    // A replayed upload (same runId) is accepted without counting twice.
    return c.json({ runId: b.runId }, inserted.meta.changes > 0 ? 201 : 200);
  });

  app.get('/runs/mine', requireUser, async (c) => {
    const { results } = await c.env.DB.prepare(
      `SELECT id AS runId, hero_class AS heroClass, result, chapter, floor, turns, game_version AS gameVersion, created_at AS createdAt
         FROM runs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    ).bind(c.var.user.id).all();
    return c.json({ runs: results });
  });

  app.get('/leaderboard', async (c) => {
    const heroClass = c.req.query('class');
    if (heroClass !== undefined && !isHeroClass(heroClass)) return c.json({ error: 'unknown_class' }, 400);
    const limit = Math.min(Math.max(Number.parseInt(c.req.query('limit') ?? '20', 10) || 20, 1), 100);
    const { results } = await c.env.DB.prepare(
      `SELECT r.user_id AS userId, u.display_name AS displayName, r.hero_class AS heroClass, r.result,
              r.chapter, r.floor, r.turns, r.created_at AS createdAt
         FROM (SELECT runs.*, ROW_NUMBER() OVER (PARTITION BY runs.user_id ORDER BY ${ranking('runs')}) AS rank_in_user
                 FROM runs WHERE ?1 IS NULL OR runs.hero_class = ?1) r
         JOIN users u ON u.id = r.user_id
        WHERE r.rank_in_user = 1
        ORDER BY ${ranking('r')}
        LIMIT ?2`,
    ).bind(heroClass ?? null, limit).all();
    return c.json({ entries: results });
  });

  return app;
}
