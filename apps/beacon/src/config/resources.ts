export const RESOURCES = {
  website: 'https://bxteam.org',
  docs: 'https://bxteam.org/docs',
  downloads: 'https://bxteam.org/downloads',
  /** azimuth, the downloads API this bot reads a publish back from. */
  api: 'https://api.bxteam.org/v1',
  github: 'https://github.com/BX-Team',
} as const;

/** Projects that have a documentation section under `apps/meridian/content/docs`. */
export const DOC_PROJECTS = [
  { name: 'DivineMC', value: 'divinemc' },
  { name: 'Quark', value: 'quark' },
  { name: 'NDailyRewards', value: 'ndailyrewards' },
] as const;
