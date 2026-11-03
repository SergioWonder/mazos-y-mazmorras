export interface Env {
  DB: D1Database;
  APP_URL: string;
  ALLOWED_ORIGINS: string;
  EMAIL_FROM: string;
  RESEND_API_KEY?: string;
}

declare global {
  // Types `env` from `cloudflare:workers` (used by the tests) with the same bindings.
  namespace Cloudflare {
    interface Env {
      DB: D1Database;
      APP_URL: string;
      ALLOWED_ORIGINS: string;
      EMAIL_FROM: string;
      RESEND_API_KEY?: string;
      TEST_MIGRATIONS?: import('cloudflare:test').D1Migration[];
    }
  }
}
