export function githubHeaders(): Record<string, string> {
  const token = import.meta.server ? process.env.GITHUB_TOKEN : undefined;
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Accept: 'application/vnd.github.v3+json',
  };
}
