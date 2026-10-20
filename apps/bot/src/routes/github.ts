import {
  IssueCommentEventSchema,
  IssuesEventSchema,
  PullRequestEventSchema,
  PushEventSchema,
  ReleaseEventSchema,
} from '@bx-team/types/schema/github';
import { badRequest, unauthorized } from '@bx-team/worker/error';
import { verifySignature } from '@bx-team/worker/signature';
import type { EmbedBuilder } from '@discordjs/builders';
import type { REST } from '@discordjs/rest';
import { Hono } from 'hono';
import type { z } from 'zod';
import { ACTIVITY_CHANNELS } from '../config/routing';
import type { BotEnv } from '../context';
import { postEmbeds } from '../discord/rest';
import { installationClient } from '../github/app';
import { mergedEmbed, pushEmbed, releaseEmbed } from '../github/embeds';
import { onComment } from '../handlers/commands';
import { addToProject } from '../handlers/project';
import { onPush, onReleaseMerged } from '../handlers/release';
import { checkTitle } from '../handlers/title';

export const github = new Hono<BotEnv>();

/**
 * Receiver for the GitHub App's webhook, from every repository the app is installed on.
 * Repository work is answered after it is done, so a failure shows up as a failed delivery
 * in the app's Advanced settings and can be redelivered from there. The Discord
 * announcement is not: a redelivery would also rerun the work, and shipping a release
 * twice is worse than a missing message.
 */
github.post('/webhook', async c => {
  const raw = await c.req.arrayBuffer();
  const signature = c.req.header('X-Hub-Signature-256') ?? null;
  if (!(await verifySignature(c.env.GITHUB_WEBHOOK_SECRET, signature, raw))) throw unauthorized();

  const event = c.req.header('X-GitHub-Event');
  const json = parseJson(raw);
  const client = (installation: { id: number }) => installationClient(c.env, installation.id);
  const rest = c.get('rest');

  switch (event) {
    case 'push': {
      const payload = parse(PushEventSchema, json);
      const release = await onPush(await client(payload.installation), payload);
      return c.json({
        ok: true,
        release,
        announced: await announce(rest, payload.repository.full_name, pushEmbed(payload)),
      });
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
        announced: await announce(rest, payload.repository.full_name, mergedEmbed(payload)),
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

    case 'release': {
      const payload = parse(ReleaseEventSchema, json);
      return c.json({
        ok: true,
        announced: await announce(rest, payload.repository.full_name, releaseEmbed(payload)),
      });
    }

    default:
      return c.json({ ok: true, skipped: event ?? 'no event' });
  }
});

/** Posts into the repository's activity thread; a Discord failure is logged, not thrown. */
async function announce(rest: REST, repository: string, embed: EmbedBuilder | null) {
  const channel = ACTIVITY_CHANNELS[repository];
  if (!embed || !channel) return false;

  try {
    await postEmbeds(rest, channel, [embed]);
    return true;
  } catch (error) {
    console.error(`Announcing to ${channel} failed`, error);
    return 'failed';
  }
}

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
