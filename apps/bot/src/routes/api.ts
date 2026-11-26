import { type PublishEvent, PublishEventSchema } from '@bx-team/types/schema/downloads';
import { badRequest, unauthorized } from '@bx-team/worker/error';
import { verifySignature } from '@bx-team/worker/signature';
import { Hono } from 'hono';
import { RELEASES_CHANNEL } from '../config/routing';
import type { BotEnv } from '../context';
import { postEmbeds } from '../discord/rest';
import { getBuild, getProject, type Project } from '../downloads/client';
import { buildPublishedEmbed } from '../downloads/embeds';

export const api = new Hono<BotEnv>();

// The payload only names the build; the embed comes from a read-back, so a corrected row shows up too.
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

  await postEmbeds(c.get('discord'), RELEASES_CHANNEL, [embed]);
  return c.json({ ok: true, announced: 1 });
});

async function render(project: Project, event: PublishEvent) {
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
