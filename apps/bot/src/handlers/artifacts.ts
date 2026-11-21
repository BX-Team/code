import type { WorkflowRunEvent } from '@bx-team/types/schema/github';
import { ARTIFACTS_LABEL } from '../config/organisation';
import { RESOURCES } from '../config/resources';
import type { Github } from '../github/client';
import { repoRef } from './repo';

interface Pull {
  number: number;
  head: { sha: string };
  labels: { name: string }[];
}

interface Artifact {
  id: number;
  name: string;
  size_in_bytes: number;
  expired: boolean;
  expires_at: string | null;
}

interface Comment {
  id: number;
  body?: string;
  user: { type: string } | null;
}

/**
 * Comments on a labelled pull request with the downloads its successful CI run uploaded. One
 * comment per workflow, rewritten by every later run, so new pushes do not pile up comments.
 */
export async function onArtifactsRun(gh: Github, event: WorkflowRunEvent): Promise<number[]> {
  const run = event.workflow_run;
  if (event.action !== 'completed' || run.event !== 'pull_request' || run.conclusion !== 'success') return [];

  const repo = repoRef(event.repository);
  const pulls = (await runPulls(gh, repo.full, event)).filter(
    pull => pull.head.sha === run.head_sha && pull.labels.some(label => label.name === ARTIFACTS_LABEL),
  );
  if (!pulls.length) return [];

  const { artifacts } = await gh.request<{ artifacts: Artifact[] }>(
    'GET',
    `/repos/${repo.full}/actions/runs/${run.id}/artifacts?per_page=100`,
  );
  const live = artifacts.filter(artifact => !artifact.expired);
  if (!live.length) return [];

  const marker = `<!-- bx-team:artifacts:${run.workflow_id} -->`;
  const body = [
    marker,
    `### 📦 Builds of \`${run.head_sha.slice(0, 7)}\``,
    '',
    '| Artifact | Size | Expires |',
    '| -------- | ---- | ------- |',
    ...live.map(
      artifact =>
        `| [${artifact.name}](${RESOURCES.bot}/artifacts/${repo.full}/${artifact.id}) | ${formatSize(artifact.size_in_bytes)} | ${artifact.expires_at?.slice(0, 10) ?? '—'} |`,
    ),
    '',
    `From [${run.name ?? 'the workflow run'}](${run.html_url}) on ${run.head_sha}. The links work without a GitHub account.`,
  ].join('\n');

  for (const pull of pulls) {
    const previous = await findComment(gh, repo.full, pull.number, marker);
    if (previous) await gh.request('PATCH', `/repos/${repo.full}/issues/comments/${previous}`, { body });
    else await gh.request('POST', `/repos/${repo.full}/issues/${pull.number}/comments`, { body });
  }
  return pulls.map(pull => pull.number);
}

async function runPulls(gh: Github, repo: string, event: WorkflowRunEvent): Promise<Pull[]> {
  const run = event.workflow_run;
  if (run.pull_requests.length) {
    return Promise.all(
      run.pull_requests.map(({ number }) => gh.request<Pull>('GET', `/repos/${repo}/pulls/${number}`)),
    );
  }

  // A fork's pull request is not listed on the run; it is found by the fork's branch instead.
  const owner = run.head_repository?.owner.login;
  if (!owner || !run.head_branch) return [];
  const head = encodeURIComponent(`${owner}:${run.head_branch}`);
  return gh.request<Pull[]>('GET', `/repos/${repo}/pulls?state=open&head=${head}&per_page=100`);
}

async function findComment(gh: Github, repo: string, number: number, marker: string): Promise<number | undefined> {
  for (let page = 1; ; page++) {
    const comments = await gh.request<Comment[]>(
      'GET',
      `/repos/${repo}/issues/${number}/comments?per_page=100&page=${page}`,
    );
    const found = comments.find(comment => comment.user?.type === 'Bot' && comment.body?.startsWith(marker));
    if (found) return found.id;
    if (comments.length < 100) return undefined;
  }
}

function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${unit ? size.toFixed(1) : size} ${units[unit]}`;
}
