import type { PlayerEvent } from '@bx-team/types/schema/pulsify';
import { clickhouse } from '../lib/clickhouse';
import { lookupCountry } from '../lib/geoip';
import { redis } from '../lib/redis';

interface SessionMeta {
  joined_at: string;
  client_version: string;
  country_code: string;
}

function sessionKey(projectId: string, uuid: string) {
  return `pulsify:session:${projectId}:${uuid}`;
}

export async function handlePlayerEvent(event: PlayerEvent, projectId: string, serverCountryCode: string) {
  const countryCode = event.payload.player_ip
    ? lookupCountry(event.payload.player_ip) || serverCountryCode
    : serverCountryCode;
  const ts = new Date(event.timestamp).toISOString().slice(0, 19).replace('T', ' ');

  if (event.event === 'player_join') {
    const meta: SessionMeta = {
      joined_at: ts,
      client_version: event.payload.client_version ?? '',
      country_code: countryCode,
    };
    await Promise.all([
      clickhouse.insert({
        table: 'player_sessions',
        values: [{ project_id: projectId, player_uuid: event.payload.player_uuid, ...meta, left_at: null, ver: 0 }],
        format: 'JSONEachRow',
      }),
      redis.set(sessionKey(projectId, event.payload.player_uuid), JSON.stringify(meta), 'EX', 86400),
    ]);
    return;
  }

  if (event.event === 'player_quit') {
    const key = sessionKey(projectId, event.payload.player_uuid);
    const raw = await redis.get(key);
    if (!raw) return;

    const meta: SessionMeta = JSON.parse(raw);
    await Promise.all([
      clickhouse.insert({
        table: 'player_sessions',
        values: [{ project_id: projectId, player_uuid: event.payload.player_uuid, ...meta, left_at: ts, ver: 1 }],
        format: 'JSONEachRow',
      }),
      redis.del(key),
    ]);
  }
}
