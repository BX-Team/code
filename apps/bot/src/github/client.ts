const API = 'https://api.github.com';

/** A non-2xx answer from the GitHub API, kept with its status so callers can branch on it. */
export class GithubApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    message: string,
  ) {
    super(`GitHub ${status} on ${path}: ${message}`);
  }
}

/** A token-bound GitHub REST and GraphQL client; one per installation and request. */
export class Github {
  constructor(private readonly token: string) {}

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await this.send(method, path, body, 'application/vnd.github+json');
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  /** A file's contents at `ref`, or null when it does not exist there. */
  async file(repo: string, path: string, ref: string): Promise<string | null> {
    try {
      const response = await this.send(
        'GET',
        `/repos/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`,
        undefined,
        'application/vnd.github.raw+json',
      );
      return await response.text();
    } catch (error) {
      if (error instanceof GithubApiError && error.status === 404) return null;
      throw error;
    }
  }

  async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const result = await this.request<{ data?: T; errors?: { message: string }[] }>('POST', '/graphql', {
      query,
      variables,
    });
    if (result.errors?.length) {
      throw new GithubApiError(200, '/graphql', result.errors.map(error => error.message).join('; '));
    }
    return result.data as T;
  }

  private async send(method: string, path: string, body: unknown, accept: string): Promise<Response> {
    const response = await fetch(`${API}${path}`, {
      method,
      headers: {
        Accept: accept,
        Authorization: `Bearer ${this.token}`,
        'User-Agent': 'bx-team-bot',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      let message = text;
      try {
        message = (JSON.parse(text) as { message?: string }).message ?? text;
      } catch {}
      throw new GithubApiError(response.status, path, message);
    }
    return response;
  }
}

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}
