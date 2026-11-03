// Events pushed to a player through their Buzón (inbox) Durable Object.

import type { Env } from './env.ts';
import type { PushMessage } from './push.ts';

/** Messages the Buzón sends to the client over its WebSocket. `partida` is the multiplayer game id. */
export type EventoBuzon =
  | { t: 'invitacion'; partida: string; de: string; clase: string }
  | { t: 'invitacion-respondida'; partida: string; por: string; aceptada: boolean }
  | { t: 'retomar-pedido'; partida: string; de: string }
  | { t: 'sala-lista'; partida: string; de: string };

/** Deep link to the lobby on a game: the service worker opens it from a push notification. */
export function urlSala(env: Pick<Env, 'APP_URL'>, partida: string): string {
  const url = new URL(env.APP_URL);
  url.searchParams.set('sala', partida);
  return url.toString();
}

/**
 * Hands an event to the player's Buzón: it reaches every open socket, or becomes a Web Push when there is none.
 * Never throws: an alert that cannot be delivered must not break the request that caused it.
 */
export async function avisarBuzon(env: Env, userId: string, evento: EventoBuzon, push?: PushMessage): Promise<void> {
  try {
    const stub = env.BUZON.get(env.BUZON.idFromName(userId));
    await stub.fetch('https://buzon/notificar', {
      method: 'POST',
      body: JSON.stringify({ userId, evento, push }),
    });
  } catch (err) {
    console.error('inbox notification failed', err);
  }
}
