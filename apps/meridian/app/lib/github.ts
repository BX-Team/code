export interface RepoInfo {
  version: string | null;
}

export function githubHeaders(): Record<string, string> {
  const token = import.meta.server ? process.env.GITHUB_TOKEN : undefined;
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Accept: 'application/vnd.github.v3+json',
  };
}

async function fetchRepo(repo: string): Promise<RepoInfo> {
  const release = await $fetch<{ tag_name: string }>(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: githubHeaders(),
  }).catch(() => null);
  return { version: release?.tag_name ?? null };
}

export function useGithubRepos(key: string, repos: string[]) {
  return useAsyncData(
    `github:${key}`,
    async () => {
      if (import.meta.client) return {} as Record<string, RepoInfo>;
      const entries = await Promise.all(repos.map(async repo => [repo, await fetchRepo(repo)] as const));
      return Object.fromEntries(entries);
    },
    { default: () => ({}) as Record<string, RepoInfo> },
  );
}
