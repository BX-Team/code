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

export const MARKETPLACE = 'BX-Team/code';
export const PLUGIN = 'minecraft-server';

// Bundled from the skills Claude Code reads in this repository, so the zip is never a stale copy.
const files = import.meta.glob('../../../../.claude/skills/**/*.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

/** claude.ai wants the skill's own folder at the root of the archive. */
export async function downloadSkill(name: string): Promise<void> {
  const prefix = `../../../../.claude/skills/${name}/`;
  const entries = await Promise.all(
    Object.entries(files)
      .filter(([path]) => path.startsWith(prefix))
      .map(async ([path, load]) => ({ path: `${name}/${path.slice(prefix.length)}`, text: await load() })),
  );
  downloadZip(`${name}.zip`, entries);
}
