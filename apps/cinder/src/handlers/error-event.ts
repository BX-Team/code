import type { ErrorEvent } from '@bx-team/types/schema/pulsify';
import { computeFingerprint, scrub } from '@bx-team/types/scrub';
import type { HandlerContext } from '../env';
import { notifyIssue } from '../lib/alerts';
import { writeError } from '../lib/analytics';
import { putErrorPayload } from '../lib/error-payloads';
import { recordIssue } from '../lib/issues';

export async function handleErrorEvent(ctx: HandlerContext, event: ErrorEvent, projectId: string) {
  const { db, env } = ctx;

  // Scrub player-identifying data before anything is persisted, then derive the grouping
  // fingerprint from the already-scrubbed text so the AE error index and the R2 payload
  // share an identical key with the pulsify-db issue registry.
  const message = scrub(event.error.message);
  const stacktrace = scrub(event.error.stacktrace ?? '');
  const level = event.error.level;
  const version = event.error.plugin_version ?? '';
  const serverVersion = event.error.server_version ?? '';
  const serverSoftware = event.error.server_software ?? '';
  const fingerprint = computeFingerprint(event.plugin, message, level, stacktrace);
  const timestamp = Date.now();

  // Searchable index → AE; full (scrubbed) payload → R2.
  writeError(env, projectId, {
    plugin: event.plugin,
    level,
    fingerprint,
    serverVersion,
    serverSoftware,
    message,
    pluginVersion: version,
  });
  await putErrorPayload(env, projectId, fingerprint, {
    plugin: event.plugin,
    message,
    stacktrace,
    level,
    server_version: serverVersion,
    server_software: serverSoftware,
    plugin_version: version,
    timestamp,
  });

  const transition = await recordIssue(db, { projectId, fingerprint, plugin: event.plugin, version });
  if (transition) {
    await notifyIssue(db, env, {
      projectId,
      kind: transition,
      plugin: event.plugin,
      message,
      level,
      fingerprint,
      version,
    });
  }
}
