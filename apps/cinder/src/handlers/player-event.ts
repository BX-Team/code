import type { PlayerEvent } from '@bx-team/types/schema/pulsify';
import { clickhouse } from '../lib/clickhouse';

export async function handlePlayerEvent(event: PlayerEvent, projectId: string, countryCode: string) {
  const ts = new Date(event.timestamp).toISOString().slice(0, 19).replace('T', ' ');

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
    return;
  }

  if (event.event === 'player_quit') {
    await clickhouse.command({
      query: `
        ALTER TABLE player_sessions
        UPDATE left_at = {left_at:DateTime}
        WHERE project_id = {project_id:String}
          AND player_uuid = {player_uuid:String}
          AND left_at IS NULL
      `,
      query_params: {
        left_at: ts,
        project_id: projectId,
        player_uuid: event.payload.player_uuid,
      },
    });
  }
}
