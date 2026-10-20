import { type PublishEvent, PublishEventSchema } from '@bx-team/types/schema/downloads';
import { badRequest, unauthorized } from '@bx-team/worker/error';
import { verifySignature } from '@bx-team/worker/signature';
import type { EmbedBuilder } from '@discordjs/builders';
import { Hono } from 'hono';
import { RELEASES_CHANNEL } from '../config/routing';
import type { BotEnv } from '../context';
import { postEmbeds } from '../discord/rest';
import { getBuild, getProject, getRelease, type Project } from '../downloads/client';
import { buildPublishedEmbed, releasePublishedEmbed } from '../downloads/embeds';

export const api = new Hono<BotEnv>();

/**
 * Receiver for the API's publish notification. The payload carries only the identity of
 * what was published, so the embed is rendered off a read-back and a correction to the
 * row shows up in Discord without the notification having to grow a copy of it.
 */
api.post('/webhook', async c => {
  const raw = await c.req.arrayBuffer();
  const signature = c.req.header('X-Api-Signature') ?? null;

  if (!(await verifySignature(c.env.API_WEBHOOK_SECRET, signature, raw))) throw unauthorized();

  const parsed = PublishEventSchema.safeParse(parsePayload(raw));
  if (!parsed.success) return c.json({ ok: true, skipped: 'unsupported event' });

  const event = parsed.data;
  const project = await getProject(event.project);
  if (!project) return c.json({ ok: true, skipped: 'unknown project' });

  const embed = await render(project, event);
  if (!embed) return c.json({ ok: true, skipped: 'nothing to announce' });

  await postEmbeds(c.get('rest'), RELEASES_CHANNEL, [embed]);
  return c.json({ ok: true, announced: 1 });
});

async function render(project: Project, event: PublishEvent): Promise<EmbedBuilder | null> {
  if (event.kind === 'release') {
    const release = await getRelease(project.key, event.tag);
    return release ? releasePublishedEmbed(project, release) : null;
  }

  const build = await getBuild(project.key, event.version, event.build);
  return build ? buildPublishedEmbed(project, build) : null;
}

function parsePayload(raw: ArrayBuffer): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(raw) || '{}');
  } catch {
    throw badRequest('Unparseable payload');
  }
}
