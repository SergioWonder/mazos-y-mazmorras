// Multiplayer games (D1 `multi_games`): invitations, the lists the lobby shows, resuming, and the entry points to
// the Buzón and Sala Durable Objects.

import { Hono } from 'hono';
import type { Context } from 'hono';
import { avisarBuzon, urlSala } from './notify.ts';
import type { InfoSala } from './sala.ts';
import { requireUser, requireUserWs } from './session.ts';
import type { AppEnv } from './types.ts';
import { HERO_CLASSES, isHeroClass, readJson } from './validate.ts';

interface GameRow {
  id: string; status: 'invited' | 'declined' | 'active' | 'finished';
  host_user_id: string; guest_user_id: string | null; host_class: string; guest_class: string | null;
  host_name: string | null; guest_name: string | null; created_at: number; updated_at: number;
}

const GAME_SQL = `SELECT g.*, h.display_name AS host_name, u.display_name AS guest_name
                    FROM multi_games g JOIN users h ON h.id = g.host_user_id LEFT JOIN users u ON u.id = g.guest_user_id`;

const loadGame = (c: Context<AppEnv>, id: string) =>
  c.env.DB.prepare(`${GAME_SQL} WHERE g.id = ?`).bind(id).first<GameRow>();

const isPlayer = (g: GameRow, userId: string) => g.host_user_id === userId || g.guest_user_id === userId;

/** The other human of a game (null in a bot game). */
const otherPlayer = (g: GameRow, userId: string) => {
  const hostIsMe = g.host_user_id === userId;
  return hostIsMe
    ? { id: g.guest_user_id, displayName: g.guest_name ?? 'Bot', bot: g.guest_user_id === null }
    : { id: g.host_user_id, displayName: g.host_name ?? 'Aventurero anónimo', bot: false };
};

/** Runs in the background after the response; never rejects. */
function inBackground(c: Context<AppEnv>, task: Promise<unknown>): void {
  try { c.executionCtx.waitUntil(task); } catch { /* no execution context (plain call): the task still runs */ }
}

export function multiRoutes() {
  const app = new Hono<AppEnv>();

  app.post('/multi/games', requireUser, async (c) => {
    const me = c.var.user;
    const body = await readJson<{ guest: unknown; heroClass: unknown }>(c.req);
    if (!me.displayName) return c.json({ error: 'name_required' }, 400);
    if (!isHeroClass(body.heroClass) || typeof body.guest !== 'string') return c.json({ error: 'invalid_game' }, 400);
    const now = Date.now();
    const id = crypto.randomUUID();

    if (body.guest === 'bot') {
      const botClass = HERO_CLASSES[Math.floor(Math.random() * HERO_CLASSES.length)];
      await c.env.DB.prepare(
        `INSERT INTO multi_games (id, host_user_id, guest_user_id, host_class, guest_class, status, created_at, updated_at)
         VALUES (?, ?, NULL, ?, ?, 'active', ?, ?)`,
      ).bind(id, me.id, body.heroClass, botClass, now, now).run();
      return c.json({ id, status: 'active', bot: true }, 201);
    }

    const name = body.guest.trim().replace(/\s+/g, ' ');
    const guest = await c.env.DB.prepare('SELECT id, display_name AS displayName FROM users WHERE lower(display_name) = lower(?)')
      .bind(name).first<{ id: string; displayName: string }>();
    if (!guest) return c.json({ error: 'user_not_found' }, 404);
    if (guest.id === me.id) return c.json({ error: 'cannot_invite_self' }, 400);
    try {
      await c.env.DB.prepare(
        `INSERT INTO multi_games (id, host_user_id, guest_user_id, host_class, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'invited', ?, ?)`,
      ).bind(id, me.id, guest.id, body.heroClass, now, now).run();
    } catch (err) {
      // Partial unique index: one pending invitation per host/guest pair
      if (String(err).includes('UNIQUE')) return c.json({ error: 'already_invited' }, 409);
      throw err;
    }
    inBackground(c, avisarBuzon(c.env, guest.id, { t: 'invitacion', partida: id, de: me.displayName, clase: body.heroClass }, {
      title: 'Te han invitado a una partida', body: `${me.displayName} te invita a jugar en cooperativo`, url: urlSala(c.env, id), tag: `sala-${id}`,
    }));
    return c.json({ id, status: 'invited', bot: false }, 201);
  });

  app.get('/multi/games', requireUser, async (c) => {
    const me = c.var.user.id;
    const { results } = await c.env.DB.prepare(
      `${GAME_SQL} WHERE (g.host_user_id = ?1 OR g.guest_user_id = ?1) AND g.status IN ('invited', 'active')
        ORDER BY g.updated_at DESC LIMIT 100`,
    ).bind(me).all<GameRow>();
    return c.json({
      games: results.map((g) => ({
        id: g.id,
        status: g.status,
        hueco: g.host_user_id === me ? 'cara' : 'cruz',
        direction: g.status === 'invited' ? (g.host_user_id === me ? 'sent' : 'received') : null,
        other: otherPlayer(g, me),
        hostClass: g.host_class,
        guestClass: g.guest_class,
        createdAt: g.created_at,
        updatedAt: g.updated_at,
      })),
    });
  });

  app.post('/multi/games/:id/accept', requireUser, async (c) => {
    const me = c.var.user;
    const game = await loadGame(c, c.req.param('id'));
    if (!game) return c.json({ error: 'not_found' }, 404);
    if (game.guest_user_id !== me.id) return c.json({ error: 'forbidden' }, 403);
    const body = await readJson<{ heroClass: unknown }>(c.req);
    if (!isHeroClass(body.heroClass)) return c.json({ error: 'invalid_class' }, 400);
    if (!me.displayName) return c.json({ error: 'name_required' }, 400);
    const res = await c.env.DB.prepare(
      `UPDATE multi_games SET status = 'active', guest_class = ?, updated_at = ? WHERE id = ? AND status = 'invited'`,
    ).bind(body.heroClass, Date.now(), game.id).run();
    if (res.meta.changes === 0) return c.json({ error: 'not_pending' }, 409);
    inBackground(c, avisarBuzon(c.env, game.host_user_id, { t: 'invitacion-respondida', partida: game.id, por: me.displayName, aceptada: true }, {
      title: 'Invitación aceptada', body: `${me.displayName} ha aceptado tu invitación`, url: urlSala(c.env, game.id), tag: `sala-${game.id}`,
    }));
    return c.json({ id: game.id, status: 'active' });
  });

  app.post('/multi/games/:id/decline', requireUser, async (c) => {
    const me = c.var.user;
    const game = await loadGame(c, c.req.param('id'));
    if (!game) return c.json({ error: 'not_found' }, 404);
    if (game.guest_user_id !== me.id) return c.json({ error: 'forbidden' }, 403);
    const res = await c.env.DB.prepare(`UPDATE multi_games SET status = 'declined', updated_at = ? WHERE id = ? AND status = 'invited'`)
      .bind(Date.now(), game.id).run();
    if (res.meta.changes === 0) return c.json({ error: 'not_pending' }, 409);
    inBackground(c, avisarBuzon(c.env, game.host_user_id, { t: 'invitacion-respondida', partida: game.id, por: me.displayName ?? 'Aventurero', aceptada: false }));
    return c.json({ id: game.id, status: 'declined' });
  });

  app.post('/multi/games/:id/resume', requireUser, async (c) => {
    const me = c.var.user;
    const game = await loadGame(c, c.req.param('id'));
    if (!game) return c.json({ error: 'not_found' }, 404);
    if (!isPlayer(game, me.id)) return c.json({ error: 'forbidden' }, 403);
    if (game.status !== 'active') return c.json({ error: 'not_active' }, 409);
    const other = otherPlayer(game, me.id);
    if (other.id) {
      const name = me.displayName ?? 'Tu compañero';
      inBackground(c, avisarBuzon(c.env, other.id, { t: 'retomar-pedido', partida: game.id, de: name }, {
        title: 'Quieren retomar vuestra partida', body: `${name} te espera para seguir jugando`, url: urlSala(c.env, game.id), tag: `sala-${game.id}`,
      }));
    }
    return c.json({ id: game.id, bot: other.bot });
  });

  /** WebSocket of a game's room: only the two profiles of an active game get in. */
  app.get('/multi/games/:id/ws', requireUserWs, async (c) => {
    const me = c.var.user;
    const game = await loadGame(c, c.req.param('id'));
    if (!game) return c.json({ error: 'not_found' }, 404);
    if (!isPlayer(game, me.id)) return c.json({ error: 'forbidden' }, 403);
    if (game.status !== 'active') return c.json({ error: 'not_active' }, 409);
    const info: InfoSala = {
      id: game.id,
      hueco: game.host_user_id === me.id ? 'cara' : 'cruz',
      bot: game.guest_user_id === null,
      clases: { cara: game.host_class, cruz: game.guest_class ?? 'mago' },
      nombres: { cara: game.host_name ?? 'Aventurero anónimo', cruz: game.guest_name ?? 'Bot' },
      usuarios: { cara: game.host_user_id, cruz: game.guest_user_id },
    };
    const headers = new Headers(c.req.raw.headers);
    headers.set('x-sala', JSON.stringify(info));
    const stub = c.env.SALA.get(c.env.SALA.idFromName(game.id));
    return stub.fetch('https://sala/ws', { headers });
  });

  /** WebSocket of the player's own Buzón: live alerts while the game is open. */
  app.get('/inbox/ws', requireUserWs, (c) => {
    const stub = c.env.BUZON.get(c.env.BUZON.idFromName(c.var.user.id));
    return stub.fetch('https://buzon/ws', { headers: c.req.raw.headers });
  });

  return app;
}
