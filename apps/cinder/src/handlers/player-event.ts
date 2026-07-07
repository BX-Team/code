import type { PlayerEvent } from '@bx-team/types/schema/pulsify';
import type { Env } from '../env';

/**
 * Bridges player join/quit through the per-project session Durable Object, which holds the
 * open session and writes a single completed row to Analytics Engine on quit. `countryCode`
 * is resolved from the player IP at join time; quit needs no IP (the DO carries the country).
 */
export async function handlePlayerEvent(env: Env, event: PlayerEvent, projectId: string, countryCode: string) {
  const stub = env.SESSION_BRIDGE.get(env.SESSION_BRIDGE.idFromName(projectId));

  if (event.event === 'player_join') {
    await stub.join(
      projectId,
      event.payload.player_uuid,
      event.timestamp,
      event.payload.client_version ?? '',
      countryCode,
    );
    return;
  }

  if (event.event === 'player_quit') {
    await stub.quit(projectId, event.payload.player_uuid, event.timestamp);
  }
}
