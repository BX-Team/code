import { ArtifactPathSchema } from '@bx-team/types/schema/github';
import { badRequest, notFound } from '@bx-team/worker/error';
import { Hono } from 'hono';
import { ORGANISATION } from '../config/organisation';
import type { BotEnv } from '../context';
import { repositoryClient } from '../github/app';
import { GithubApiError } from '../github/client';

export const artifacts = new Hono<BotEnv>();

/**
 * Anonymous download of a pull request's CI artifact, the link in the bot's artifacts
 * comment: GitHub only hands artifacts to signed-in users, so the bot asks as the
 * installation and redirects to the short-lived URL it gets back. Public repositories only.
 */
artifacts.get('/:owner/:repo/:id', async c => {
  const parsed = ArtifactPathSchema.safeParse(c.req.param());
  if (!parsed.success) throw badRequest('Not an artifact path');

  const { owner, repo, id } = parsed.data;
  const full = `${owner}/${repo}`;
  if (owner.toLowerCase() !== ORGANISATION.toLowerCase()) throw notFound(`No artifact ${id} in ${full}`);

  const location = await orNotFound(full, id, async () => {
    const gh = await repositoryClient(c.env, full);
    const repository = await gh.request<{ private: boolean }>('GET', `/repos/${full}`);
    if (repository.private) return null;

    const artifact = await gh.request<{ expired: boolean }>('GET', `/repos/${full}/actions/artifacts/${id}`);
    if (artifact.expired) return null;

    return gh.location(`/repos/${full}/actions/artifacts/${id}/zip`);
  });
  return c.redirect(location, 302);
});

async function orNotFound(repo: string, id: number, find: () => Promise<string | null>): Promise<string> {
  let location: string | null;
  try {
    location = await find();
  } catch (error) {
    // Not installed there, no such repository, or no such artifact.
    if (!(error instanceof GithubApiError) || error.status !== 404) throw error;
    location = null;
  }
  if (!location) throw notFound(`No artifact ${id} in ${repo}`);
  return location;
}
