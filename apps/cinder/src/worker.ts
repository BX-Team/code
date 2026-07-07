import { createPulsifyDb } from '@bx-team/stratus/d1';
import { IngestBatchSchema } from '@bx-team/types/schema/pulsify';
import type { Env, HandlerContext, IngestMessage } from './env';
import { handleErrorEvent } from './handlers/error-event';
import { handleHeartbeat } from './handlers/heartbeat';
import { handleMetric } from './handlers/metric';
import { handlePlayerEvent } from './handlers/player-event';
import { writeEvent } from './lib/analytics';
import { resolveCountries } from './lib/geoip';
import { evaluateSpikes } from './lib/spikes';

export { SessionBridge } from './lib/session';

export default {
  /**
   * Consumes `pulsify-ingest`: validates each event, resolves the batch's IPs to country
   * codes in one bulk lookup, routes to the type handler, and mirrors the raw event to AE.
   * Messages are acked individually; a thrown handler retries just that message (DLQ after
   * max_retries).
   */
  async queue(batch: MessageBatch<IngestMessage>, env: Env): Promise<void> {
    const db = createPulsifyDb(env.PULSIFY_DB);
    const ctx: HandlerContext = { env, db };

    const parsed = batch.messages.map(message => {
      const result = IngestBatchSchema.element.safeParse(message.body.event);
      return {
        message,
        projectId: message.body.projectId,
        ip: message.body.ip,
        event: result.success ? result.data : null,
      };
    });

    const ips: string[] = [];
    for (const p of parsed) {
      if (!p.event) continue;
      if (p.event.type === 'heartbeat' && p.ip) ips.push(p.ip);
      if (p.event.type === 'event' && p.event.event === 'player_join' && p.event.payload.player_ip) {
        ips.push(p.event.payload.player_ip);
      }
    }
    const countries = await resolveCountries(env, ips);

    for (const p of parsed) {
      if (!p.event) {
        p.message.ack();
        continue;
      }
      try {
        const e = p.event;
        writeEvent(env, p.projectId, e.type, e);

        if (e.type === 'heartbeat') {
          await handleHeartbeat(ctx, e, p.projectId, p.ip ? (countries.get(p.ip) ?? '') : '');
        } else if (e.type === 'event') {
          const cc = e.event === 'player_join' && e.payload.player_ip ? (countries.get(e.payload.player_ip) ?? '') : '';
          await handlePlayerEvent(env, e, p.projectId, cc);
        } else if (e.type === 'error') {
          await handleErrorEvent(ctx, e, p.projectId);
        } else if (e.type === 'metric') {
          handleMetric(env, e, p.projectId);
        }

        p.message.ack();
      } catch (err) {
        console.error('[cinder] message processing failed:', err);
        p.message.retry();
      }
    }
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(evaluateSpikes(env).catch(err => console.error('[cinder] spike eval failed:', err)));
  },
} satisfies ExportedHandler<Env, IngestMessage>;
