import { ORGANISATION, PROJECT_NUMBER } from '../config/repositories';
import type { Github } from '../github/client';

let projectId: string | null = null;

/**
 * Adds an issue or pull request to the organisation board. Idempotent on GitHub's side, so a
 * redelivery or the board's own auto-add workflow cannot create a duplicate item.
 */
export async function addToProject(gh: Github, owner: string, author: { type: string }, contentId: string) {
  if (owner !== ORGANISATION || author.type === 'Bot') return false;

  projectId ??= await lookupProject(gh);
  await gh.graphql(
    `mutation($project: ID!, $content: ID!) {
      addProjectV2ItemById(input: { projectId: $project, contentId: $content }) { item { id } }
    }`,
    { project: projectId, content: contentId },
  );
  return true;
}

async function lookupProject(gh: Github): Promise<string> {
  const data = await gh.graphql<{ organization: { projectV2: { id: string } | null } }>(
    `query($org: String!, $number: Int!) { organization(login: $org) { projectV2(number: $number) { id } } }`,
    { org: ORGANISATION, number: PROJECT_NUMBER },
  );
  if (!data.organization.projectV2) throw new Error(`${ORGANISATION} has no project #${PROJECT_NUMBER}`);
  return data.organization.projectV2.id;
}
