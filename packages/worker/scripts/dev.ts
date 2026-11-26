import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { $ } from 'bun';

/** Copies `.dev.vars.example` once, then fills each empty or missing variable with its `make()`. */
export function devVars(app: string, fill: Record<string, () => string>): void {
  const path = join(app, '.dev.vars');
  if (!existsSync(path)) copyFileSync(join(app, '.dev.vars.example'), path);
  let text = readFileSync(path, 'utf8');
  for (const [name, make] of Object.entries(fill)) {
    if (new RegExp(`^${name}=\\S`, 'm').test(text)) continue;
    text = new RegExp(`^${name}=`, 'm').test(text)
      ? text.replace(new RegExp(`^${name}=.*$`, 'm'), `${name}=${make()}`)
      : `${text.trimEnd()}\n${name}=${make()}\n`;
  }
  writeFileSync(path, text);
}

/** Applies the app's migrations to its local D1, then runs `seed` SQL when given. */
export async function migrate(app: string, database: string, seed?: string): Promise<void> {
  await $`wrangler d1 migrations apply ${database} --local`
    .cwd(app)
    .env({ ...process.env, CI: '1' })
    .quiet();
  if (!seed) return;
  const file = join(app, '.wrangler', 'dev-seed.sql');
  writeFileSync(file, seed);
  await $`wrangler d1 execute ${database} --local --file ${file}`.cwd(app).quiet();
}
