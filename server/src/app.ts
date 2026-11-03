import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './auth.ts';
import { runsRoutes } from './runs.ts';
import { savesRoutes } from './saves.ts';
import { friendRoutes } from './friends.ts';
import { multiRoutes } from './multi.ts';
import { pushRoutes } from './subscriptions.ts';
import { usersRoutes } from './users.ts';
import type { AppEnv, Deps } from './types.ts';

export type { Deps, Mailer, MagicLinkEmail } from './types.ts';

export function createApp(deps: Deps) {
  const app = new Hono<AppEnv>();
  app.use('*', (c, next) => {
    const allowed = c.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
    return cors({
      origin: (origin) => (allowed.includes(origin) ? origin : null),
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['authorization', 'content-type'],
      maxAge: 86400,
    })(c, next);
  });
  app.get('/health', (c) => c.json({ ok: true }));
  app.route('/', authRoutes(deps));
  app.route('/', savesRoutes());
  app.route('/', runsRoutes());
  app.route('/', usersRoutes());
  app.route('/', multiRoutes());
  app.route('/', friendRoutes());
  app.route('/', pushRoutes());
  return app;
}
