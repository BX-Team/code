/** A fork chain: Purpur is downstream of Paper, DivineMC of Purpur. */
export type Software = 'paper' | 'purpur' | 'divinemc';

export const SOFTWARE_ORDER: Software[] = ['paper', 'purpur', 'divinemc'];

export const SOFTWARE_LABELS: Record<Software, string> = {
  paper: 'Paper',
  purpur: 'Purpur',
  divinemc: 'DivineMC',
};

/** True when `software` is `required` or a fork downstream of it. */
export function includes(software: Software, required: Software): boolean {
  return SOFTWARE_ORDER.indexOf(software) >= SOFTWARE_ORDER.indexOf(required);
}

export type FileId =
  | 'server.properties'
  | 'bukkit.yml'
  | 'spigot.yml'
  | 'paper-global.yml'
  | 'paper-world-defaults.yml'
  | 'purpur.yml'
  | 'divinemc.yml';

export interface ConfigFile {
  id: FileId;
  /** Relative to the server directory. */
  path: string;
  format: 'properties' | 'yaml';
  since: Software;
  blurb: string;
  reference: string;
}

export const CONFIG_FILES: ConfigFile[] = [
  {
    id: 'server.properties',
    path: 'server.properties',
    format: 'properties',
    since: 'paper',
    blurb:
      'Vanilla settings. View and simulation distance live here, and they decide more than anything else on this page.',
    reference: 'https://docs.papermc.io/paper/reference/server-properties',
  },
  {
    id: 'bukkit.yml',
    path: 'bukkit.yml',
    format: 'yaml',
    since: 'paper',
    blurb: 'Mob spawn limits and how often the server tries to spawn each group.',
    reference: 'https://docs.papermc.io/paper/reference/bukkit-configuration',
  },
  {
    id: 'spigot.yml',
    path: 'spigot.yml',
    format: 'yaml',
    since: 'paper',
    blurb: 'Entity activation and tracking ranges, the largest single win on a survival server.',
    reference: 'https://docs.papermc.io/paper/reference/spigot-configuration',
  },
  {
    id: 'paper-global.yml',
    path: 'config/paper-global.yml',
    format: 'yaml',
    since: 'paper',
    blurb: 'Server-wide Paper settings: chunk system threads, packet limits, proxy handshake.',
    reference: 'https://docs.papermc.io/paper/reference/global-configuration',
  },
  {
    id: 'paper-world-defaults.yml',
    path: 'config/paper-world-defaults.yml',
    format: 'yaml',
    since: 'paper',
    blurb: 'Per-world Paper settings, applied to every world that has no override of its own.',
    reference: 'https://docs.papermc.io/paper/reference/world-configuration',
  },
  {
    id: 'purpur.yml',
    path: 'purpur.yml',
    format: 'yaml',
    since: 'purpur',
    blurb: 'Purpur additions: villager lobotomy, keepalive handling, armour stand movement.',
    reference: 'https://purpurmc.org/docs/Configuration/',
  },
  {
    id: 'divinemc.yml',
    path: 'divinemc.yml',
    format: 'yaml',
    since: 'divinemc',
    blurb: 'What DivineMC adds on top of Purpur: parallel ticking, DAB, region format, secure seed.',
    reference: '/docs/divinemc/reference/configuration',
  },
];

export function filesFor(software: Software): ConfigFile[] {
  return CONFIG_FILES.filter(file => includes(software, file.since));
}

export function getFile(id: FileId): ConfigFile {
  return CONFIG_FILES.find(file => file.id === id) as ConfigFile;
}
