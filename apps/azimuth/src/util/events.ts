import type { AtlasEvent } from '@bx-team/types/schema/events';
import type { Queue } from '@cloudflare/workers-types';

export function publishEvent(
  queue: Queue<AtlasEvent>,
  ctx: { waitUntil(promise: Promise<unknown>): void },
  event: AtlasEvent,
): void {
  ctx.waitUntil(queue.send(event).catch(error => console.error('Failed to publish atlas event', error)));
}
