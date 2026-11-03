import path from 'node:path';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';
import { generateVapidKeys } from './scripts/vapid-keys.mjs';

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      // Throwaway Web Push keys, new on every run: nothing secret is ever committed.
      const vapid = await generateVapidKeys();
      return {
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          bindings: {
            // Test-only binding so the setup file can apply the D1 migrations.
            TEST_MIGRATIONS: await readD1Migrations(path.join(import.meta.dirname, 'migrations')),
            VAPID_PUBLIC_KEY: vapid.publicKey,
            VAPID_PRIVATE_KEY: vapid.privateKey,
          },
        },
      };
    }),
  ],
  test: { setupFiles: ['./test/apply-migrations.ts'] },
});
