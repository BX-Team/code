import { githubHeaders } from '~/lib/github';

export interface GithubContributor {
  login: string;
  html_url: string;
  avatar_url: string;
  contributions: number;
  type: string;
}

const REPOS = ['DivineMC', 'NDailyRewards', 'Quark', 'Nyx', 'code'];

/** Everyone who has committed to our main repositories, merged across them and fetched once at prerender. */
export function useContributors() {
  return useAsyncData<GithubContributor[]>(
    'contributors',
    async () => {
      const results = await Promise.all(
        REPOS.map(repo =>
          $fetch<GithubContributor[]>(`https://api.github.com/repos/BX-Team/${repo}/contributors?per_page=100`, {
            headers: githubHeaders(),
          }).catch(() => [] as GithubContributor[]),
        ),
      );
      const merged = results.flat().reduce(
        (acc, c) => {
          if (c.type !== 'User') return acc;
          acc[c.login] = { ...c, contributions: (acc[c.login]?.contributions ?? 0) + c.contributions };
          return acc;
        },
        {} as Record<string, GithubContributor>,
      );
      return Object.values(merged).sort((a, b) => b.contributions - a.contributions || a.login.localeCompare(b.login));
    },
    { default: () => [] as GithubContributor[] },
  );
}
