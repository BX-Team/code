import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { devVars, migrate } from '@bx-team/worker/dev';

const app = resolve(import.meta.dir, '..');
/** `CROWD=1 bun dev` befriends alice and bob with many made-up players, for checking long lists. */
const crowd = process.env.CROWD === '1';

const users = ['alice', 'bob', 'carol'] as const;

/** Fixed codes so a test can type them: alice is DEVA-0001, bob DEVB-0001, carol DEVC-0001. */
const friendCode = (name: string) => `DEV${name[0]?.toUpperCase()}0001`;

function user(id: string, name: string, email: string, username: string, code: string, now: string) {
  return `insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt", "username", "displayUsername", "friendCode")
    values ('${id}', '${name}', '${email}', 1, '${now}', '${now}', '${username}', '${username}', '${code}')
    on conflict ("id") do update set "name" = excluded."name", "displayUsername" = excluded."displayUsername", "friendCode" = excluded."friendCode";`;
}

function seed(): string {
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const rows = users.flatMap(name => [
    user(`dev-${name}`, `${name[0]?.toUpperCase()}${name.slice(1)}`, `${name}@bxid.test`, name, friendCode(name), now),
    // The launcher's bearer token for this account is `dev<name>token`.
    `insert into "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "userAgent", "userId")
     values ('dev-${name}', '${expires}', 'dev${name}token', '${now}', '${now}', 'BX-Team/Riven/dev', 'dev-${name}')
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
        user(`dev-${name}`, `Player ${i}`, `${name}@bxid.test`, name, `DEVP00${String(i).padStart(2, '0')}`, now),
        `insert into "friendship" values ('dev-${name}', 'dev-alice', '${i > 27 ? 'pending' : 'accepted'}', '${now}') on conflict do nothing;`,
        `insert into "friendship" values ('dev-${name}', 'dev-bob', 'accepted', '${now}') on conflict do nothing;`,
      );
    }
  }
  return rows.join('\n');
}

devVars(app, { BETTER_AUTH_SECRET: () => randomBytes(32).toString('hex') });
await migrate(app, 'id-db', seed());
console.log(
  `Dev accounts ${users.map(name => `${name}@bxid.test (${friendCode(name).replace(/(.{4})/, '$1-')})`).join(', ')}; sign-in codes print below. Skins: cd ../skins && bun dev.`,
);
