import type { PlayerEvent } from '@bx-team/types/schema/pulsify';
import { clickhouse } from '../lib/clickhouse';

export async function handlePlayerEvent(event: PlayerEvent, projectId: string, countryCode: string) {
  const ts = new Date(event.timestamp).toISOString().replace('T', ' ').replace('Z', '');

  if (event.event === 'player_join') {
    await clickhouse.insert({
      table: 'player_sessions',
      values: [
        {
          project_id: projectId,
          player_uuid: event.payload.player_uuid,
          joined_at: ts,
          left_at: null,
          client_version: event.payload.client_version,
          country_code: countryCode,
        },
      ],
      format: 'JSONEachRow',
    });
  }

  // player_quit is written to events table only — session duration is derived in queries
}
