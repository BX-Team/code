import { PROJECTS } from '@bx-team/projects';

export const RESOURCES = {
  website: 'https://bxteam.org',
  docs: 'https://bxteam.org/docs',
  downloads: 'https://bxteam.org/downloads',
  /** The downloads API this bot reads a publish back from. */
  api: 'https://api.bxteam.org',
  github: 'https://github.com/BX-Team',
} as const;

/** Projects that have a documentation section under `apps/web/content/docs`. */
export const DOC_PROJECTS = PROJECTS.filter(project => project.docs).map(project => ({
  name: project.name,
  value: project.key,
}));
