import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { devVars, migrate } from '@bx-team/worker/dev';

const app = resolve(import.meta.dir, '..');

devVars(app, {
  TEXTURES_SIGNING_KEY: () =>
    generateKeyPairSync('rsa', { modulusLength: 4096 })
      .privateKey.export({ type: 'pkcs8', format: 'der' })
      .toString('base64'),
  GAME_TOKEN_SECRET: () => randomBytes(32).toString('hex'),
  // Locally the Worker reaches Mojang itself; the stockholm proxy wants its key.
  MOJANG_PROXY_URL: () => 'https://sessionserver.mojang.com',
  MOJANG_API_URL: () => 'https://api.mojang.com',
});
await migrate(app, 'skins-db');
