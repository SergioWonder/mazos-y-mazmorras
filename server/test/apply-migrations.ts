import { applyD1Migrations } from 'cloudflare:test';
import { env } from 'cloudflare:workers';

// Applies every migration to the shared test D1 database before the tests run.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS ?? []);
