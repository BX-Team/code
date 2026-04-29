const GITHUB_TOKEN = process.env.GITHUB_TOKEN as string;

export async function fetchFromGitHub(endpoint: string) {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  return response.json();
}
