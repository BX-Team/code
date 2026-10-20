export interface Env {
  GITHUB_APP_ID: string;

  /** PKCS#8 PEM; GitHub hands out PKCS#1, which WebCrypto cannot import. */
  GITHUB_APP_PRIVATE_KEY: string;
  GITHUB_WEBHOOK_SECRET: string;
}
