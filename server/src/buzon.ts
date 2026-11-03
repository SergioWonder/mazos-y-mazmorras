// Buzón: one Durable Object per user. Keeps the player's WebSockets open while the game is open (hibernation API)
// and fans events out to them; with no socket open it sends a Web Push to every subscribed device instead.

import { DurableObject } from 'cloudflare:workers';
import type { Env } from './env.ts';
import type { EventoBuzon } from './notify.ts';
import { sendWebPush, type PushMessage, type PushSubscriptionData, type VapidConfig } from './push.ts';

export function vapidDe(env: Env): VapidConfig | null {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return null;
  return { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT ?? 'mailto:no-reply@morghur.es' };
}

export class Buzon extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Heartbeat answered without waking the object up.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/ws') return this.conectar(request);
    if (pathname === '/notificar' && request.method === 'POST') {
      const { userId, evento, push } = await request.json<{ userId: string; evento: EventoBuzon; push?: PushMessage }>();
      await this.entregar(userId, evento, push);
      return new Response(null, { status: 204 });
    }
    return new Response('not found', { status: 404 });
  }

  private conectar(request: Request): Response {
    if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') return new Response('expected websocket', { status: 426 });
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    // A token sent as a subprotocol must be echoed back or the browser drops the connection.
    const protocol = request.headers.get('sec-websocket-protocol')?.split(',')[0]?.trim();
    return new Response(null, { status: 101, webSocket: client, headers: protocol ? { 'Sec-WebSocket-Protocol': protocol } : {} });
  }

  private async entregar(userId: string, evento: EventoBuzon, push?: PushMessage): Promise<void> {
    const sockets = this.ctx.getWebSockets().filter((s) => s.readyState === WebSocket.READY_STATE_OPEN);
    if (sockets.length > 0) {
      const text = JSON.stringify(evento);
      for (const s of sockets) {
        try { s.send(text); } catch { /* it just closed */ }
      }
      return;
    }
    const vapid = vapidDe(this.env);
    if (!push || !vapid) return;
    const { results } = await this.env.DB.prepare('SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?')
      .bind(userId).all<PushSubscriptionData>();
    await Promise.all(results.map(async (sub) => {
      // A gone subscription (404/410) is dropped so it is never tried again.
      if (await sendWebPush(sub, push, vapid) === 'caducada') {
        await this.env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(sub.endpoint).run();
      }
    }));
  }

  webSocketMessage(): void {
    // The inbox is one-way: clients only listen (heartbeats are auto-answered).
  }

  webSocketClose(ws: WebSocket, code: number): void {
    try { ws.close(code >= 1000 && code < 1005 ? code : 1000); } catch { /* already closed */ }
  }
}
