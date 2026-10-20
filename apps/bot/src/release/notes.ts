export interface Commit {
  sha: string;
  message: string;
  url: string;
}

interface ChangelogConfig {
  categories?: { title: string; labels: string[] }[];
  label_extractor?: { pattern: string; on_property?: string; target: string }[];
}

/**
 * Groups commits the way `release-changelog-builder-action` will in the real notes, from the
 * repository's own `changelog_configuration.json`, so the release PR previews what ships.
 */
export function previewNotes(commits: Commit[], configText: string | null): string {
  const lines = (list: Commit[]) => list.map(line).join('\n');
  const config = parseConfig(configText);
  if (!config?.categories?.length) return lines(commits);

  const extractors = (config.label_extractor ?? [])
    .filter(extractor => (extractor.on_property ?? 'title') === 'title')
    .map(extractor => ({ pattern: new RegExp(extractor.pattern), target: extractor.target }));

  const fallback = config.categories.find(category => category.labels.length === 0);
  const groups = new Map(config.categories.map(category => [category, [] as Commit[]]));

  for (const commit of commits) {
    const title = summary(commit);
    const labels = extractors.flatMap(({ pattern, target }) => {
      const match = pattern.exec(title);
      return match ? [target.replace(/\$(\d)/g, (_, n: string) => match[+n] ?? '')] : [];
    });
    const category = config.categories.find(c => c.labels.some(label => labels.includes(label))) ?? fallback;
    if (category) groups.get(category)!.push(commit);
  }

  return [...groups]
    .filter(([, list]) => list.length > 0)
    .map(([category, list]) => `${category.title.replace(/^#+ /, '#### ')}\n\n${lines(list)}`)
    .join('\n\n');
}

export function summary(commit: Commit): string {
  return commit.message.split('\n')[0] ?? '';
}

function line(commit: Commit): string {
  return `- [\`${commit.sha.slice(0, 7)}\`](${commit.url}) ${summary(commit)}`;
}

function parseConfig(text: string | null): ChangelogConfig | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as ChangelogConfig;
  } catch {
    return null;
  }
}
