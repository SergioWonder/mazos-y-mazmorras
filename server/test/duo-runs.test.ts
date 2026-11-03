import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { registrarPartidaDuo } from '../src/duo-runs.ts';
import type { InfoSala } from '../src/sala.ts';
import { fakeMailer, loginNamed, testApp } from './helpers.ts';

type Entry = { players: Array<{ userId: string; displayName: string; heroClass: string }>; result: string; dmDefeated: boolean; chapter: number; floor: number; turns: number };

const infoDe = (id: string, cara: { userId: string; name: string }, cruz: { userId: string; name: string } | null, clases: [string, string]): InfoSala => ({
  id, hueco: 'cara', bot: cruz === null, clases: { cara: clases[0], cruz: clases[1] },
  nombres: { cara: cara.name, cruz: cruz?.name ?? 'Bot' }, usuarios: { cara: cara.userId, cruz: cruz?.userId ?? null },
});

describe('clasificación dúo', () => {
  it('una partida de dos terminada sale con los dos nombres y clases, una sola vez por pareja; la del bot no sale', async () => {
    const { mailer, sent } = fakeMailer();
    const call = testApp(mailer);
    const ana = await loginNamed(call, sent, 'Ana');
    const bea = await loginNamed(call, sent, 'Bea');

    const mejor = { victory: true, dmDefeated: false, chapter: 2, floor: 14, turns: 120 };
    await registrarPartidaDuo(env.DB, infoDe(crypto.randomUUID(), ana, bea, ['mago', 'druida']), { ...mejor, victory: false, chapter: 1, floor: 6, turns: 40 });
    // the same pair again, seats swapped: only their best run counts
    await registrarPartidaDuo(env.DB, infoDe(crypto.randomUUID(), bea, ana, ['picaro', 'mago']), mejor);
    // a game against the bot is never recorded
    expect(await registrarPartidaDuo(env.DB, infoDe(crypto.randomUUID(), ana, null, ['mago', 'brujo']), { ...mejor, dmDefeated: true })).toBe(false);

    const res = await call('/leaderboard?mode=duo&limit=100');
    expect(res.status).toBe(200);
    const { entries } = await res.json<{ entries: Entry[] }>();
    const delPar = entries.filter((e) => e.players.some((p) => p.userId === ana.userId));
    expect(delPar).toHaveLength(1);
    expect(delPar[0]).toMatchObject({ result: 'victory', dmDefeated: false, chapter: 2, floor: 14, turns: 120 });
    expect(delPar[0].players.map((p) => [p.displayName, p.heroClass])).toEqual([[bea.name, 'picaro'], [ana.name, 'mago']]);
  });
});
