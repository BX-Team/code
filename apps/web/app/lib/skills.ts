import { RestTreeSchema } from '@bx-team/types/schema/github';
import { GITHUB_API } from './releases';
import { downloadZip } from './zip';

export interface Skill {
  name: string;
  title: string;
  body: string;
  /** The tool on this site that does the same job without a model. */
  tool?: { label: string; to: string };
}

export const SKILLS: Skill[] = [
  {
    name: 'jvm-flags',
    title: 'JVM flags',
    body: 'Picks a flag set for your Java, JVM, OS, CPU and heap, explains every flag and writes start.sh, start.bat or a panel line. Also reads a failed start and says which flag broke it.',
    tool: { label: 'Server flags generator', to: '/tools/server-flags-generator' },
  },
  {
    name: 'server-config',
    title: 'Server config',
    body: 'Tunes server.properties, bukkit.yml, spigot.yml, paper, purpur and divinemc configs for your kind of server, and reviews a config you already have.',
  },
];

export const REPOSITORY = 'BX-Team/claude-skills';
export const MARKETPLACE = REPOSITORY;
export const PLUGIN = 'minecraft-server';

/** claude.ai wants the skill's own folder at the root of the archive. The files are read from `master`, so the zip is never a stale copy. */
export async function downloadSkill(name: string): Promise<void> {
  const prefix = `skills/${name}/`;
  const raw = await $fetch(`${GITHUB_API}/repos/${REPOSITORY}/git/trees/master`, {
    query: { recursive: 1 },
    headers: { Accept: 'application/vnd.github+json' },
  });
  const paths = RestTreeSchema.parse(raw)
    .tree.filter(entry => entry.type === 'blob' && entry.path.startsWith(prefix))
    .map(entry => entry.path);
  if (paths.length === 0) throw new Error(`No skill named ${name} in ${REPOSITORY}`);
  const entries = await Promise.all(
    paths.map(async path => ({
      path: `${name}/${path.slice(prefix.length)}`,
      text: await $fetch<string>(`https://raw.githubusercontent.com/${REPOSITORY}/master/${path}`, {
        responseType: 'text',
      }),
    })),
  );
  downloadZip(`${name}.zip`, entries);
}
