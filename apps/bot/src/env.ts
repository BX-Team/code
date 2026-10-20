export interface Env {
  DISCORD_APPLICATION_ID: string;
  GUILD_ID: string;
  GITHUB_APP_ID: string;

  DISCORD_BOT_TOKEN: string;
  DISCORD_PUBLIC_KEY: string;
  /** PKCS#8 PEM; GitHub hands out PKCS#1, which WebCrypto cannot import. */
  GITHUB_APP_PRIVATE_KEY: string;
  GITHUB_WEBHOOK_SECRET: string;
  /** The same value the API signs `X-Api-Signature` with. */
  API_WEBHOOK_SECRET: string;
}
