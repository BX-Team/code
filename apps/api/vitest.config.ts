import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => ({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations('./migrations'),
          BOT_WEBHOOK_SECRET: 'x',
          BOT_WEBHOOK_URL: '',
        },
      },
    }),
  ],
  test: { setupFiles: ['./test/setup.ts'] },
}));
