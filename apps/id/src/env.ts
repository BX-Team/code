import type { D1Database, DurableObjectNamespace, Flagship, Service } from '@cloudflare/workers-types';
import type { SkinsService } from '../../skins/src/service';
import type { UserHub } from './play/hub';
import type { Lobby } from './play/lobby';

export interface Env {
  DB: D1Database;
  HUB: DurableObjectNamespace<UserHub>;
  LOBBY: DurableObjectNamespace<Lobby>;
  /** Skins keep their own storage; deleting a BX ID asks them to forget it. */
  SKINS: Service<SkinsService>;
  /** Kill switches and limits, see `@bx-team/worker/flags`. */
  FLAGS: Flagship;

  BASE_URL: string;
  SITE_URL: string;
  TRUSTED_ORIGINS: string;
  BETTER_AUTH_SECRET: string;

  SMTP_HOST: string;
  SMTP_PORT: string;
  SMTP_USERNAME: string;
  SMTP_PASSWORD: string;
  MAIL_FROM: string;

  /** nginx on stockholm in front of Mojang's session server, which refuses Cloudflare's addresses. */
  MOJANG_PROXY_URL: string;
  MOJANG_PROXY_KEY: string;

  TURNSTILE_SECRET_KEY: string;
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;

  /** A Cloudflare Realtime TURN key the launchers' ICE servers are minted from. */
  TURN_KEY_ID: string;
  TURN_KEY_API_TOKEN: string;
}
