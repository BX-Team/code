import { RestTreeSchema } from '@bx-team/types/schema/github';
import { GITHUB_API } from './releases';
import { downloadZip } from './zip';

/** Title and description are `tools.skillList.<name>.*`. */
export interface Skill {
  name: string;
  /** The tool on this site that does the same job without a model; its name is `tools.<tool>.name`. */
  tool?: { key: string; to: string };
}

export const SKILLS: Skill[] = [
  {
    name: 'jvm-flags',
    tool: { key: 'flags', to: '/tools/server-flags-generator' },
  },
  {
    name: 'server-config',
  },
];

export const REPOSITORY = 'BX-Team/claude-skills';
export const MARKETPLACE = REPOSITORY;
export const PLUGIN = 'minecraft-server';

/** claude.ai wants the skill's folder at the archive root; files come from `master`, so the zip is never stale. */
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
