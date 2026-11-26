import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

/** Mojang as the tests see it: one taken name, nobody joined. */
async function mojang(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === '/users/profiles/minecraft/Notch')
    return Response.json({ id: '069a79f444e94726a5befca90e38aaf5', name: 'Notch' });
  if (url.pathname.startsWith('/users/profiles/minecraft/')) return new Response(null, { status: 404 });
  if (url.pathname === '/session/minecraft/hasJoined') return new Response(null, { status: 204 });
  return new Response('unexpected request', { status: 500 });
}

export default defineConfig(async () => ({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations('./migrations'),
          BASE_URL: 'https://api.example.test',
          MOJANG_PROXY_URL: 'https://mojang.test',
          MOJANG_API_URL: 'https://mojang.test',
          MOJANG_PROXY_KEY: 'key',
          TEXTURES_SIGNING_KEY: generateKeyPairSync('rsa', { modulusLength: 2048 })
            .privateKey.export({ type: 'pkcs8', format: 'der' })
            .toString('base64'),
          GAME_TOKEN_SECRET: randomBytes(32).toString('hex'),
        },
        outboundService: mojang,
        workers: [
          {
            // BX ID, reduced to what skins asks of it: `Bearer <userId>` is that user.
            name: 'id',
            modules: true,
            compatibilityDate: '2026-03-12',
            script: `
              import { WorkerEntrypoint } from 'cloudflare:workers';
              export class IdService extends WorkerEntrypoint {
                async userId({ authorization }) { return authorization?.startsWith('Bearer ') ? authorization.slice(7) : null; }
                async profilesChanged() {}
              }
              export default { fetch: () => new Response(null, { status: 404 }) };
            `,
          },
        ],
      },
    }),
  ],
  test: { setupFiles: ['./test/setup.ts'] },
}));
