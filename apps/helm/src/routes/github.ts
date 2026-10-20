import {
  IssueCommentEventSchema,
  IssuesEventSchema,
  PullRequestEventSchema,
  PushEventSchema,
} from '@bx-team/types/schema/github';
import { badRequest, unauthorized } from '@bx-team/worker/error';
import { verifySignature } from '@bx-team/worker/signature';
import { Hono } from 'hono';
import type { z } from 'zod';
import type { HelmEnv } from '../context';
import { installationClient } from '../github/app';
import { onComment } from '../handlers/commands';
import { addToProject } from '../handlers/project';
import { onPush, onReleaseMerged } from '../handlers/release';
import { checkTitle } from '../handlers/title';

export const github = new Hono<HelmEnv>();

/**
 * Receiver for the GitHub App's webhook, from every repository the app is installed on.
 * Deliveries are answered after the work is done, so a failure shows up as a failed
 * delivery in the app's Advanced settings and can be redelivered from there.
 */
github.post('/github', async c => {
  const raw = await c.req.arrayBuffer();
  const signature = c.req.header('X-Hub-Signature-256') ?? null;
  if (!(await verifySignature(c.env.GITHUB_WEBHOOK_SECRET, signature, raw))) throw unauthorized();

  const event = c.req.header('X-GitHub-Event');
  const json = parseJson(raw);
  const client = (installation: { id: number }) => installationClient(c.env, installation.id);

  switch (event) {
    case 'push': {
      const payload = parse(PushEventSchema, json);
      const release = await onPush(await client(payload.installation), payload);
      return c.json({ ok: true, release });
    }

    case 'pull_request': {
      const payload = parse(PullRequestEventSchema, json);
      const gh = await client(payload.installation);
      const pull = payload.pull_request;
      return c.json({
        ok: true,
        shipped: await onReleaseMerged(gh, payload),
        checked: await checkTitle(gh, payload),
        tracked:
          payload.action === 'opened' &&
          (await addToProject(gh, payload.repository.owner.login, pull.user, pull.node_id)),
      });
    }

    case 'issues': {
      const payload = parse(IssuesEventSchema, json);
      if (payload.action !== 'opened') return c.json({ ok: true, skipped: payload.action });
      const gh = await client(payload.installation);
      const { issue } = payload;
      return c.json({
        ok: true,
        tracked: await addToProject(gh, payload.repository.owner.login, issue.user, issue.node_id),
      });
    }

    case 'issue_comment': {
      const payload = parse(IssueCommentEventSchema, json);
      return c.json({ ok: true, command: await onComment(await client(payload.installation), payload) });
    }

    default:
      return c.json({ ok: true, skipped: event ?? 'no event' });
  }
});

function parseJson(raw: ArrayBuffer): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(raw) || '{}');
  } catch {
    throw badRequest('Unparseable payload');
  }
}

function parse<T extends z.ZodType>(schema: T, json: unknown): z.infer<T> {
  const result = schema.safeParse(json);
  if (!result.success)
    throw badRequest(result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; '));
  return result.data;
}
