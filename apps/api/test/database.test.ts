import { env } from 'cloudflare:workers';
import { expect, it } from 'vitest';
import { commitsOf, db } from '../src/database/downloads';
import { attach, ensureVersion, upsertBuild } from '../src/database/publish';

it('reads the commits of more builds than one D1 statement can bind', async () => {
  await db(env.DB).insertInto('projects').values({ key: 'p', name: 'P' }).execute();
  const version = await ensureVersion(env.DB, 'p', '1.0');
  const ids: number[] = [];
  for (let number = 1; number <= 150; number++) {
    const build = await upsertBuild(env.DB, version!.id, number, 'stable', null);
    await attach(env.DB, build!.id, [{ sha: `s${number}`, summary: 'fix', at: '2026-01-01T00:00:00.000Z' }], {
      name: 'server',
      fileName: 'p.jar',
      filePath: `p/${number}.jar`,
      size: 1,
      sha256: 'x',
    });
    ids.push(build!.id);
  }
  const commits = await commitsOf(env.DB, ids);
  expect(commits.size).toBe(150);
});

it('keeps a build commit when a later artifact of the same build arrives without one', async () => {
  await db(env.DB).insertInto('projects').values({ key: 'q', name: 'Q' }).execute();
  const version = await ensureVersion(env.DB, 'q', '1.0');
  await upsertBuild(env.DB, version!.id, 1, 'beta', 'abc');
  const again = await upsertBuild(env.DB, version!.id, 1, 'stable', null);
  expect(again).toMatchObject({ channel: 'stable', commit_sha: 'abc' });
});
