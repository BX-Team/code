import { randomBytes } from 'node:crypto';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => ({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations('./migrations'),
          BASE_URL: 'https://api.example.test',
          SITE_URL: 'https://example.test',
          TRUSTED_ORIGINS: 'https://example.test',
          BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
          SMTP_PASSWORD: 'x',
          TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
          DISCORD_CLIENT_ID: 'x',
          DISCORD_CLIENT_SECRET: 'x',
          GITHUB_CLIENT_ID: 'x',
          GITHUB_CLIENT_SECRET: 'x',
          TURN_KEY_ID: 'x',
          TURN_KEY_API_TOKEN: 'x',
        },
        workers: [
          {
            name: 'skins',
            modules: true,
            compatibilityDate: '2026-03-12',
            script: `
              import { WorkerEntrypoint } from 'cloudflare:workers';
              export class SkinsService extends WorkerEntrypoint { async forget() {} }
              export default { fetch: () => new Response(null, { status: 404 }) };
            `,
          },
        ],
      },
    }),
  ],
  test: { setupFiles: ['./test/setup.ts'] },
}));
