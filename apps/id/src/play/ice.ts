import { IceServersSchema } from '@bx-team/types/schema/play';
import { internal } from '@bx-team/worker/error';
import { isOn } from '@bx-team/worker/flags';

const TTL_SECONDS = 6 * 60 * 60;

/** Address discovery only: players still connect directly, nothing is relayed through us. */
const STUN_ONLY = { iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }] };

/** STUN and TURN (UDP, TCP and TLS on 443) from Cloudflare Realtime, with short-lived credentials. */
export async function iceServers(env: Env) {
  if (!(await isOn(env.FLAGS, 'turn-relay'))) return STUN_ONLY;
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
