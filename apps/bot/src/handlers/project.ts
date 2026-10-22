import { ORGANISATION, PROJECT_NUMBER, STATUS_DONE, STATUS_REJECTED } from '../config/organisation';
import type { Github } from '../github/client';

interface Board {
  id: string;
  statusField: string;
  statusOptions: Map<string, string>;
}

let board: Board | null = null;

/**
 * Adds an issue or pull request a person opened to the organisation board. Idempotent on
 * GitHub's side, so a redelivery or the board's own auto-add workflow cannot create a duplicate item.
 */
export async function addToProject(gh: Github, owner: string, byPerson: boolean, contentId: string) {
  if (owner !== ORGANISATION || !byPerson) return false;

  board ??= await lookupBoard(gh);
  await gh.graphql(
    `mutation($project: ID!, $content: ID!) {
      addProjectV2ItemById(input: { projectId: $project, contentId: $content }) { item { id } }
    }`,
    { project: board.id, content: contentId },
  );
  return true;
}

/**
 * Moves a closed issue or pull request on the board: Done when its work landed, Closed/Rejected
 * otherwise. The board's built-in "Item closed" workflow has to stay off, since it cannot tell the
 * two apart and would race this. Items not on the board are left off it.
 */
export async function moveClosed(gh: Github, owner: string, contentId: string, completed: boolean) {
  if (owner !== ORGANISATION) return false;

  board ??= await lookupBoard(gh);
  const data = await gh.graphql<{ node: { projectItems?: { nodes: { id: string; project: { id: string } }[] } } }>(
    `query($content: ID!) {
      node(id: $content) {
        ... on Issue { projectItems(first: 20) { nodes { id project { id } } } }
        ... on PullRequest { projectItems(first: 20) { nodes { id project { id } } } }
      }
    }`,
    { content: contentId },
  );
  const item = data.node.projectItems?.nodes.find(node => node.project.id === board?.id);
  if (!item) return false;

  const status = completed ? STATUS_DONE : STATUS_REJECTED;
  const option = board.statusOptions.get(status);
  if (!option) throw new Error(`Project #${PROJECT_NUMBER} has no "${status}" status`);

  await gh.graphql(
    `mutation($project: ID!, $item: ID!, $field: ID!, $option: String!) {
      updateProjectV2ItemFieldValue(
        input: { projectId: $project, itemId: $item, fieldId: $field, value: { singleSelectOptionId: $option } }
      ) { projectV2Item { id } }
    }`,
    { project: board.id, item: item.id, field: board.statusField, option },
  );
  return status;
}

async function lookupBoard(gh: Github): Promise<Board> {
  const data = await gh.graphql<{
    organization: {
      projectV2: { id: string; field: { id: string; options: { id: string; name: string }[] } | null } | null;
    };
  }>(
    `query($org: String!, $number: Int!) {
      organization(login: $org) {
        projectV2(number: $number) {
          id
          field(name: "Status") { ... on ProjectV2SingleSelectField { id options { id name } } }
        }
      }
    }`,
    { org: ORGANISATION, number: PROJECT_NUMBER },
  );
  const project = data.organization.projectV2;
  if (!project) throw new Error(`${ORGANISATION} has no project #${PROJECT_NUMBER}`);
  if (!project.field) throw new Error(`Project #${PROJECT_NUMBER} has no Status field`);
  return {
    id: project.id,
    statusField: project.field.id,
    statusOptions: new Map(project.field.options.map(option => [option.name, option.id])),
  };
}
