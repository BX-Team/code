import { IceServersSchema } from '@bx-team/types/schema/play';
import { internal } from '@bx-team/worker/error';
import type { Env } from '../env';

const TTL_SECONDS = 6 * 60 * 60;

/** STUN and TURN (UDP, TCP and TLS on 443) from Cloudflare Realtime, with short-lived credentials. */
export async function iceServers(env: Env) {
  const response = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: TTL_SECONDS }),
    },
  );
  if (!response.ok) throw internal(`Cloudflare TURN answered ${response.status}`);
  const parsed = IceServersSchema.safeParse(await response.json());
  if (!parsed.success) throw internal('Cloudflare TURN sent unexpected ICE servers');
  return parsed.data;
}
