// Finished multiplayer games for the duo leaderboard (D1 `duo_runs`). The Sala records them itself: no client POST.

import type { InfoSala } from './sala.ts';

/** What the engine says about a game that has just ended. */
export interface ResumenDuo {
  victory: boolean;
  dmDefeated: boolean;
  chapter: number;
  floor: number;
  turns: number;
}

/** Records a finished game. Bot games are never recorded. Returns whether a row was written. */
export async function registrarPartidaDuo(db: D1Database, info: InfoSala, r: ResumenDuo): Promise<boolean> {
  const { cara, cruz } = info.usuarios;
  if (info.bot || !cara || !cruz) return false;
  const res = await db.prepare(
    `INSERT INTO duo_runs (id, host_user_id, guest_user_id, host_class, guest_class, result, dm_defeated, chapter, floor, turns, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`,
  ).bind(
    info.id, cara, cruz, info.clases.cara, info.clases.cruz, r.victory ? 'victory' : 'defeat', r.victory && r.dmDefeated ? 1 : 0,
    r.chapter, r.floor, r.turns, Date.now(),
  ).run();
  return res.meta.changes > 0;
}
