export const RESOURCES = {
  website: 'https://bxteam.org',
  docs: 'https://bxteam.org/docs',
  downloads: 'https://bxteam.org/downloads',
  api: 'https://api.bxteam.org',
  github: 'https://github.com/BX-Team',
} as const;

/** Projects that have a documentation section under `apps/meridian/content/docs`. */
export const DOC_PROJECTS = [
  { name: 'DivineMC', value: 'divinemc' },
  { name: 'Quark', value: 'quark' },
  { name: 'NDailyRewards', value: 'ndailyrewards' },
] as const;
