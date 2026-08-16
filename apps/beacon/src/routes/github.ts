import { Hono } from 'hono';
import { type GithubEvent, githubRoutesFor } from '../config/routing';
import type { BeaconEnv } from '../context';
import { postEmbeds } from '../discord/rest';
import { type GithubPayload, renderEvent } from '../github/events';
import { verifyGithubSignature } from '../github/verify';
import { badRequest, unauthorized } from '../util/error';

export const github = new Hono<BeaconEnv>();

const SUPPORTED: GithubEvent[] = ['push', 'pull_request', 'release'];

/**
 * Receiver for the BX-Team organisation webhook. Deliveries are answered only after the
 * announcement lands, so a failure shows up as a failed delivery in GitHub's UI and can
 * be redelivered from there.
 */
github.post('/github', async c => {
  const raw = await c.req.arrayBuffer();
  const signature = c.req.header('X-Hub-Signature-256') ?? null;

  if (!(await verifyGithubSignature(c.env.GITHUB_WEBHOOK_SECRET, signature, raw))) throw unauthorized();

  const event = c.req.header('X-GitHub-Event');
  if (event === 'ping') return c.json({ ok: true });
  if (!isSupported(event)) return c.json({ ok: true, skipped: 'unsupported event' });

  const payload = parsePayload(raw, c.req.header('Content-Type'));
  const repo = payload.repository;
  if (!repo) return c.json({ ok: true, skipped: 'no repository' });

  const rendered = renderEvent(event, payload);
  if (!rendered) return c.json({ ok: true, skipped: 'nothing to announce' });

  const routes = githubRoutesFor(repo.full_name ?? repo.name, event, rendered.branch, repo.default_branch);
  if (routes.length === 0) return c.json({ ok: true, skipped: 'no route' });

  const rest = c.get('rest');
  for (const route of routes) {
    await postEmbeds(rest, route.channelId, [rendered.embed]);
  }

  return c.json({ ok: true, announced: routes.length });
});

function isSupported(event: string | undefined): event is GithubEvent {
  return SUPPORTED.includes(event as GithubEvent);
}

function parsePayload(raw: ArrayBuffer, contentType: string | undefined): GithubPayload {
  const text = new TextDecoder().decode(raw);

  try {
    if (contentType?.includes('application/x-www-form-urlencoded')) {
      return JSON.parse(new URLSearchParams(text).get('payload') ?? '{}');
    }
    return JSON.parse(text || '{}');
  } catch {
    throw badRequest('Unparseable payload');
  }
}
