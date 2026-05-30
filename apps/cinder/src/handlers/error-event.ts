import type { ErrorEvent } from '@bx-team/types/schema/pulsify';
import { computeFingerprint, scrub } from '@bx-team/types/scrub';
import { notifyIssue } from '../lib/alerts';
import { clickhouse } from '../lib/clickhouse';
import { recordIssue } from '../lib/issues';

export async function handleErrorEvent(event: ErrorEvent, projectId: string) {
  // Scrub player-identifying data before anything is persisted, then derive the grouping
  // fingerprint from the already-scrubbed text so it is stored identically on the ClickHouse
  // event row and the Postgres issue registry.
  const message = scrub(event.error.message);
  const stacktrace = scrub(event.error.stacktrace ?? '');
  const level = event.error.level;
  const version = event.error.plugin_version ?? '';
  const fingerprint = computeFingerprint(event.plugin, message, level, stacktrace);

  await clickhouse.insert({
    table: 'error_events',
    values: [
      {
        project_id: projectId,
        plugin: event.plugin,
        message,
        stacktrace,
        level,
        server_version: event.error.server_version ?? '',
        server_software: event.error.server_software ?? '',
        plugin_version: version,
        fingerprint,
        timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      },
    ],
    format: 'JSONEachRow',
  });

  const transition = await recordIssue({ projectId, fingerprint, plugin: event.plugin, version });
  if (transition) {
    await notifyIssue({ projectId, kind: transition, plugin: event.plugin, message, level, fingerprint, version });
  }
}
