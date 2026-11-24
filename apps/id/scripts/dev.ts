import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { $ } from 'bun';

const PORT = 8787;
const app = resolve(import.meta.dir, '..');
const root = resolve(app, '../..');
const web = !process.argv.includes('--no-web');
/** `--crowd` befriends alice and bob with many made-up players, for checking long lists. */
const crowd = process.argv.includes('--crowd');

const users = ['alice', 'bob', 'carol'] as const;
const token = (name: string) => `dev${name}token`;

function devVars() {
  const path = join(app, '.dev.vars');
  if (!existsSync(path)) copyFileSync(join(app, '.dev.vars.example'), path);
  const text = readFileSync(path, 'utf8');
  if (/^BETTER_AUTH_SECRET=\S/m.test(text)) return;
  const secret = randomBytes(32).toString('hex');
  const filled = /^BETTER_AUTH_SECRET=/m.test(text)
    ? text.replace(/^BETTER_AUTH_SECRET=.*$/m, `BETTER_AUTH_SECRET=${secret}`)
    : `${text.trimEnd()}\nBETTER_AUTH_SECRET=${secret}\n`;
  writeFileSync(path, filled);
}

/** Fixed codes so a test can type them: alice is DEVA-0001, bob DEVB-0001, carol DEVC-0001. */
function friendCode(name: string): string {
  return `DEV${name[0]?.toUpperCase()}0001`;
}

function seed() {
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const rows = users.flatMap(name => [
    `insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt", "username", "displayUsername", "friendCode")
     values ('dev-${name}', '${name[0]?.toUpperCase()}${name.slice(1)}', '${name}@bxid.test', 1, '${now}', '${now}', '${name}', '${name}', '${friendCode(name)}')
     on conflict ("id") do update set "name" = excluded."name", "displayUsername" = excluded."displayUsername", "friendCode" = excluded."friendCode";`,
    `insert into "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "userAgent", "userId")
     values ('dev-${name}', '${expires}', '${token(name)}', '${now}', '${now}', 'BX-Team/Riven/dev', 'dev-${name}')
     on conflict ("id") do update set "expiresAt" = excluded."expiresAt", "userAgent" = excluded."userAgent";`,
    `insert into "connectedApp" values ('dev-${name}', 'riven', '${now}') on conflict do nothing;`,
  ]);
  rows.push(
    `insert into "friendship" values ('dev-alice', 'dev-carol', 'accepted', '${now}') on conflict do nothing;`,
    `insert into "friendship" values ('dev-carol', 'dev-bob', 'pending', '${now}') on conflict do nothing;`,
  );
  if (crowd) {
    for (let i = 1; i <= 30; i++) {
      const name = `player${String(i).padStart(2, '0')}`;
      rows.push(
        `insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt", "username", "displayUsername", "friendCode")
         values ('dev-${name}', 'Player ${i}', '${name}@bxid.test', 1, '${now}', '${now}', '${name}', '${name}', 'DEVP00${String(i).padStart(2, '0')}')
         on conflict ("id") do update set "name" = excluded."name", "displayUsername" = excluded."displayUsername", "friendCode" = excluded."friendCode";`,
        `insert into "friendship" values ('dev-${name}', 'dev-alice', '${i > 27 ? 'pending' : 'accepted'}', '${now}') on conflict do nothing;`,
        `insert into "friendship" values ('dev-${name}', 'dev-bob', 'accepted', '${now}') on conflict do nothing;`,
      );
    }
  }
  return rows.join('\n');
}

devVars();
await $`bunx wrangler d1 migrations apply id-db --local`
  .cwd(app)
  .env({ ...process.env, CI: '1' })
  .quiet();
const seedFile = join(app, '.wrangler', 'dev-seed.sql');
writeFileSync(seedFile, seed());
await $`bunx wrangler d1 execute id-db --local --file ${seedFile}`.cwd(app).quiet();

const children = [
  Bun.spawn(['bunx', 'wrangler', 'dev', '--port', String(PORT)], {
    cwd: app,
    stdio: ['inherit', 'inherit', 'inherit'],
  }),
];
if (web)
  children.push(
    Bun.spawn(['bun', 'run', 'dev'], { cwd: join(root, 'apps/web'), stdio: ['inherit', 'inherit', 'inherit'] }),
  );

const stop = () => {
  for (const child of children) child.kill();
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

// wrangler listens on 127.0.0.1 only, and `localhost` may resolve to ::1 first.
while (children.every(child => child.exitCode === null)) {
  if (
    await fetch(`http://127.0.0.1:${PORT}/v1/auth/ok`).then(
      r => r.ok,
      () => false,
    )
  )
    break;
  await Bun.sleep(500);
}
console.log(`
BX ID and play on http://localhost:${PORT}${web ? ', the site on http://localhost:3000' : ''}.
Accounts: ${users.map(name => `${name}@bxid.test`).join(', ')}; sign-in codes for them are printed below.
Friend codes: ${users.map(name => `${name} ${friendCode(name).replace(/(.{4})/, '$1-')}`).join(', ')}.
Launchers for Alice and Bob, each in its own sandbox, from the Riven checkout:

  scripts/bxid-dev.sh
`);

await Promise.race(children.map(child => child.exited));
stop();
