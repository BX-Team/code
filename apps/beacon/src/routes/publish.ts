import { type PublishEvent, PublishEventSchema } from '@bx-team/types/schema/downloads';
import type { EmbedBuilder } from '@discordjs/builders';
import { Hono } from 'hono';
import { publishRoutesFor } from '../config/routing';
import type { BeaconEnv } from '../context';
import { postEmbeds } from '../discord/rest';
import { getBuild, getProject, getRelease, type Project } from '../downloads/client';
import { buildPublishedEmbed, releasePublishedEmbed } from '../downloads/embeds';
import { badRequest, unauthorized } from '../util/error';
import { verifySignature } from '../util/signature';

export const publish = new Hono<BeaconEnv>();

/**
 * Receiver for azimuth's publish notification. The payload carries only the identity of
 * what was published, so the embed is rendered off a read-back and a correction to the
 * row shows up in Discord without the notification having to grow a copy of it.
 */
publish.post('/hooks/publish', async c => {
  const raw = await c.req.arrayBuffer();
  const signature = c.req.header('X-Azimuth-Signature') ?? null;

  if (!(await verifySignature(c.env.AZIMUTH_WEBHOOK_SECRET, signature, raw))) throw unauthorized();

  const parsed = PublishEventSchema.safeParse(parsePayload(raw));
  if (!parsed.success) return c.json({ ok: true, skipped: 'unsupported event' });

  const event = parsed.data;
  const project = await getProject(event.project);
  if (!project) return c.json({ ok: true, skipped: 'unknown project' });

  const embed = await render(project, event);
  if (!embed) return c.json({ ok: true, skipped: 'nothing to announce' });

  const rest = c.get('rest');
  const channels = publishRoutesFor(project.key);
  for (const channelId of channels) {
    await postEmbeds(rest, channelId, [embed]);
  }

  return c.json({ ok: true, announced: channels.length });
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
