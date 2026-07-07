import type { Env } from '../env';

export interface ErrorPayload {
  plugin: string;
  message: string;
  stacktrace: string;
  level: string;
  server_version: string;
  server_software: string;
  plugin_version: string;
  timestamp: number;
}

/**
 * Stores the full (already-scrubbed) error payload in R2, keyed
 * `${projectId}/${fingerprint}/${timestamp}.json` — the searchable index lives in AE
 * `errors`, keeping the raw body out of AE's 16 KB blob ceiling.
 */
export async function putErrorPayload(
  env: Env,
  projectId: string,
  fingerprint: string,
  payload: ErrorPayload,
): Promise<void> {
  const key = `${projectId}/${fingerprint}/${payload.timestamp}.json`;
  await env.ERROR_PAYLOADS.put(key, JSON.stringify(payload), {
    httpMetadata: { contentType: 'application/json' },
  });
}
