export interface Env {
  DB: D1Database;
  /** One Buzón (inbox) Durable Object per user. */
  BUZON: DurableObjectNamespace;
  /** One Sala (room) Durable Object per multiplayer game. */
  SALA: DurableObjectNamespace;
  APP_URL: string;
  ALLOWED_ORIGINS: string;
  EMAIL_FROM: string;
  RESEND_API_KEY?: string;
  /** Web Push (VAPID). Without the pair, push is disabled and the rest keeps working. */
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  /** Pause (ms) between the bot's entries so the human sees it play (default 700; tests set 0). */
  BOT_RETARDO_MS?: string;
}

declare global {
  // Types `env` from `cloudflare:workers` (used by the tests) with the same bindings.
  namespace Cloudflare {
    interface Env {
      DB: D1Database;
      BUZON: DurableObjectNamespace;
      SALA: DurableObjectNamespace;
      APP_URL: string;
      ALLOWED_ORIGINS: string;
      EMAIL_FROM: string;
      RESEND_API_KEY?: string;
      VAPID_PUBLIC_KEY?: string;
      VAPID_PRIVATE_KEY?: string;
      VAPID_SUBJECT?: string;
      BOT_RETARDO_MS?: string;
      TEST_MIGRATIONS?: import('cloudflare:test').D1Migration[];
    }
  }
}
