import { Hono } from 'hono';
import { requireUser } from './session.ts';
import type { AppEnv } from './types.ts';
import { isCount, isHeroClass, readJson, UUID_RE } from './validate.ts';

interface RunBody {
  runId: unknown; heroClass: unknown; result: unknown; chapter: unknown; floor: unknown;
  turns: unknown; seed: unknown; gameVersion: unknown; stats: unknown; dmDefeated: unknown;
}

const MAX_STATS_BYTES = 8 * 1024;

/** Best run first: the Dungeon Master defeated (true ending), then victories, then the furthest chapter and floor, then the fewest turns (earliest wins ties). */
const ranking = (t: string) =>
  `${t}.dm_defeated DESC, (${t}.result = 'victory') DESC, ${t}.chapter DESC, ${t}.floor DESC, ${t}.turns ASC, ${t}.created_at ASC`;

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
      (stats === null || stats.length <= MAX_STATS_BYTES) &&
      (b.dmDefeated === undefined || typeof b.dmDefeated === 'boolean') &&
      !(b.dmDefeated === true && b.result !== 'victory');
    if (!valid) return c.json({ error: 'invalid_run' }, 400);

    const inserted = await c.env.DB.prepare(
      `INSERT INTO runs (id, user_id, hero_class, result, dm_defeated, chapter, floor, turns, seed, game_version, stats, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`,
    ).bind(b.runId, c.var.user.id, b.heroClass, b.result, b.dmDefeated === true ? 1 : 0, b.chapter, b.floor, b.turns, b.seed, b.gameVersion, stats, Date.now()).run();
    // A replayed upload (same runId) is accepted without counting twice.
    return c.json({ runId: b.runId }, inserted.meta.changes > 0 ? 201 : 200);
  });

  app.get('/runs/mine', requireUser, async (c) => {
    const { results } = await c.env.DB.prepare(
      `SELECT id AS runId, hero_class AS heroClass, result, dm_defeated = 1 AS dmDefeated, chapter, floor, turns, game_version AS gameVersion, created_at AS createdAt
         FROM runs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    ).bind(c.var.user.id).all();
    return c.json({ runs: results.map((r) => ({ ...r, dmDefeated: r.dmDefeated === 1 })) });
  });

  app.get('/leaderboard', async (c) => {
    const mode = c.req.query('mode');
    if (mode !== undefined && mode !== 'solo' && mode !== 'duo') return c.json({ error: 'unknown_mode' }, 400);
    const limit = Math.min(Math.max(Number.parseInt(c.req.query('limit') ?? '20', 10) || 20, 1), 100);
    if (mode === 'duo') {
      // best run of each pair of profiles (whoever hosted), ranked like the solo board
      const { results } = await c.env.DB.prepare(
        `SELECT r.host_user_id AS hostId, h.display_name AS hostName, r.host_class AS hostClass,
                r.guest_user_id AS guestId, g.display_name AS guestName, r.guest_class AS guestClass,
                r.result, r.dm_defeated AS dmDefeated, r.chapter, r.floor, r.turns, r.created_at AS createdAt
           FROM (SELECT duo_runs.*, ROW_NUMBER() OVER (
                         PARTITION BY min(duo_runs.host_user_id, duo_runs.guest_user_id), max(duo_runs.host_user_id, duo_runs.guest_user_id)
                         ORDER BY ${ranking('duo_runs')}) AS rank_in_pair
                   FROM duo_runs) r
           JOIN users h ON h.id = r.host_user_id
           JOIN users g ON g.id = r.guest_user_id
          WHERE r.rank_in_pair = 1
          ORDER BY ${ranking('r')}
          LIMIT ?1`,
      ).bind(limit).all();
      return c.json({
        entries: results.map((e) => ({
          players: [
            { userId: e.hostId, displayName: e.hostName, heroClass: e.hostClass },
            { userId: e.guestId, displayName: e.guestName, heroClass: e.guestClass },
          ],
          result: e.result, dmDefeated: e.dmDefeated === 1, chapter: e.chapter, floor: e.floor, turns: e.turns, createdAt: e.createdAt,
        })),
      });
    }
    const heroClass = c.req.query('class');
    if (heroClass !== undefined && !isHeroClass(heroClass)) return c.json({ error: 'unknown_class' }, 400);
    const { results } = await c.env.DB.prepare(
      `SELECT r.user_id AS userId, u.display_name AS displayName, r.hero_class AS heroClass, r.result, r.dm_defeated AS dmDefeated,
              r.chapter, r.floor, r.turns, r.created_at AS createdAt
         FROM (SELECT runs.*, ROW_NUMBER() OVER (PARTITION BY runs.user_id ORDER BY ${ranking('runs')}) AS rank_in_user
                 FROM runs WHERE ?1 IS NULL OR runs.hero_class = ?1) r
         JOIN users u ON u.id = r.user_id
        WHERE r.rank_in_user = 1
        ORDER BY ${ranking('r')}
        LIMIT ?2`,
    ).bind(heroClass ?? null, limit).all();
    // D1 returns SQLite integers: expose the flag as a boolean
    return c.json({ entries: results.map((e) => ({ ...e, dmDefeated: e.dmDefeated === 1 })) });
  });

  return app;
}
