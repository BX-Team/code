export const DISCORD_URL = 'https://discord.gg/qNyybSSPm5';
export const GITHUB_URL = 'https://github.com/BX-Team';

const DOCS_GITHUB_ORG = 'BX-Team';
const DOCS_GITHUB_REPO = 'docs';
const DOCS_GITHUB_BRANCH = 'master';

export function docsEditUrl(stem: string, extension = 'md'): string {
  return `https://github.com/${DOCS_GITHUB_ORG}/${DOCS_GITHUB_REPO}/edit/${DOCS_GITHUB_BRANCH}/${stem}.${extension}`;
}

export function docsIssueUrl(title?: string): string {
  const base = `https://github.com/${DOCS_GITHUB_ORG}/${DOCS_GITHUB_REPO}/issues/new`;
  return title ? `${base}?title=${encodeURIComponent(`Issue with: ${title}`)}&labels=documentation` : base;
}
