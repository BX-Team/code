import { createPulsifyDb, issues, pluginInstallations } from '@bx-team/stratus/d1';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../../env';
import { aeQuery, sqlString, sqlStringList } from '../../lib/analytics-sql';
import { anonymize, ownedProject } from '../../lib/pulsify';
import type { SessionVariables } from '../../middleware/auth';

type PulsifyEnv = { Bindings: Env; Variables: SessionVariables };

type IssueStatus = 'open' | 'resolved' | 'ignored' | 'muted';

interface GroupedErrorRow {
  id: string;
  plugin: string;
  msg: string;
  level: string;
  cnt: number;
  first_seen_at: string;
  last_seen_at: string;
  server_version: string;
  server_software: string;
  plugin_version: string;
}

interface StoredErrorPayload {
  plugin: string;
  message: string;
  stacktrace: string;
  level: string;
  server_version: string;
  server_software: string;
  plugin_version: string;
  timestamp: number;
}

const SORT_COLUMNS: Record<string, string> = {
  last_seen: 'last_seen_at',
  first_seen: 'first_seen_at',
  events: 'cnt',
};

const statusBodySchema = z.object({
  fingerprint: z.string().min(1).max(64),
  action: z.enum(['resolve', 'ignore', 'mute', 'reopen']),
  // Mute duration in hours; defaults to 24h. Ignored for other actions.
  hours: z.number().int().min(1).max(720).optional(),
});

/**
 * Latest full payload for a fingerprint from the R2 archive. Keys are
 * `${projectId}/${fingerprint}/${epochMs}.json` with fixed-width epoch-ms suffixes, so
 * keys sort chronologically and the last key overall is the newest. A single list page
 * caps at 1000 keys, so pagination runs to the final page rather than truncating.
 */
async function latestPayload(
  env: Env,
  projectId: string,
  fingerprint: string,
): Promise<StoredErrorPayload | undefined> {
  const prefix = `${projectId}/${fingerprint}/`;
  let cursor: string | undefined;
  let lastKey: string | undefined;
  do {
    const listing = await env.ERROR_PAYLOADS.list({ prefix, cursor });
    if (listing.objects.length) lastKey = listing.objects[listing.objects.length - 1].key;
    cursor = listing.truncated ? listing.cursor : undefined;
  } while (cursor);

  if (!lastKey) return undefined;
  const object = await env.ERROR_PAYLOADS.get(lastKey);
  if (!object) return undefined;
  return (await object.json()) as StoredErrorPayload;
}

export const errorRoutes = new Hono<PulsifyEnv>();

errorRoutes.get('/projects/:id/errors', async c => {
  const session = c.get('authSession');
  if (!session) return c.json({ message: 'Unauthorized' }, 401);
  const db = createPulsifyDb(c.env.PULSIFY_DB);
  const id = c.req.param('id');

  const statusFilter = (c.req.query('status') ?? 'unresolved') as 'unresolved' | 'resolved' | 'ignored' | 'all';
  const sortQuery = c.req.query('sort') ?? '';
  const sortKey = (SORT_COLUMNS[sortQuery] ? sortQuery : 'last_seen') as 'last_seen' | 'first_seen' | 'events';
  const sortColumn = SORT_COLUMNS[sortKey];

  const project = await ownedProject(db, id, session.user.id);
  if (!project) return c.json({ message: 'Project not found' }, 404);

  const [rows, totalRows, issueRows] = await Promise.all([
    aeQuery<GroupedErrorRow>(
      c.env,
      `SELECT
         blob3 AS id,
         argMax(blob1, timestamp) AS plugin,
         argMax(blob6, timestamp) AS msg,
         argMax(blob2, timestamp) AS level,
         SUM(_sample_interval) AS cnt,
         MIN(timestamp) AS first_seen_at,
         MAX(timestamp) AS last_seen_at,
         argMax(blob4, timestamp) AS server_version,
         argMax(blob5, timestamp) AS server_software,
         argMax(blob7, timestamp) AS plugin_version
       FROM errors
       WHERE index1 = ${sqlString(id)} AND blob3 != ''
       GROUP BY id
       ORDER BY ${sortColumn} DESC
       LIMIT 200`,
    ),
    aeQuery<{ total: number }>(
      c.env,
      `SELECT COUNT(DISTINCT blob3) AS total FROM errors WHERE index1 = ${sqlString(id)} AND blob3 != ''`,
    ),
    db
      .select({
        fingerprint: issues.fingerprint,
        status: issues.status,
        mutedUntil: issues.mutedUntil,
        resolvedAt: issues.resolvedAt,
        firstVersion: issues.firstVersion,
        lastVersion: issues.lastVersion,
      })
      .from(issues)
      .where(eq(issues.projectId, id)),
  ]);

  const issueMap = new Map(issueRows.map(r => [r.fingerprint, r]));
  const now = Date.now();

  // A mute auto-expires: a 'muted' issue past its window behaves as open again until the next
  // event flips it back in the registry, so listing reflects that immediately.
  const effectiveStatus = (rec: (typeof issueRows)[number] | undefined): IssueStatus => {
    if (!rec) return 'open';
    if (rec.status === 'muted' && rec.mutedUntil && rec.mutedUntil.getTime() < now) return 'open';
    return rec.status;
  };

  // Full stacktraces live in R2, not AE — the dashboard fetches them lazily per
  // fingerprint via /errors/payload instead of receiving them inline in the list.
  const all = rows.map(r => {
    const rec = issueMap.get(r.id);
    const eff = effectiveStatus(rec);
    return {
      id: r.id,
      plugin: r.plugin,
      message: r.msg,
      stacktrace: '',
      level: r.level,
      count: Number(r.cnt),
      firstSeenAt: r.first_seen_at,
      lastSeenAt: r.last_seen_at,
      status: eff,
      mutedUntil: rec?.mutedUntil ? new Date(rec.mutedUntil).toISOString() : null,
      resolvedAt: rec?.resolvedAt ? new Date(rec.resolvedAt).toISOString() : null,
      firstVersion: rec?.firstVersion ?? null,
      lastVersion: rec?.lastVersion ?? null,
      serverVersion: r.server_version || null,
      serverSoftware: r.server_software || null,
      pluginVersion: r.plugin_version || null,
    };
  });

  const counts = {
    unresolved: all.filter(r => r.status === 'open').length,
    resolved: all.filter(r => r.status === 'resolved').length,
    ignored: all.filter(r => r.status === 'ignored').length,
    all: all.length,
  };

  const filtered = all.filter(r => {
    if (statusFilter === 'unresolved') return r.status === 'open';
    if (statusFilter === 'resolved') return r.status === 'resolved';
    if (statusFilter === 'ignored') return r.status === 'ignored';
    return true;
  });

  return c.json({
    errors: filtered,
    total: Number(totalRows[0]?.total ?? 0),
    counts,
    sort: sortKey,
    status: statusFilter,
  });
});

errorRoutes.get('/projects/:id/errors/payload', async c => {
  const session = c.get('authSession');
  if (!session) return c.json({ message: 'Unauthorized' }, 401);
  const db = createPulsifyDb(c.env.PULSIFY_DB);
  const id = c.req.param('id');
  const fingerprint = c.req.query('fingerprint') ?? '';
  if (!fingerprint) return c.json({ message: 'Missing fingerprint' }, 400);

  const project = await ownedProject(db, id, session.user.id);
  if (!project) return c.json({ message: 'Project not found' }, 404);

  const payload = await latestPayload(c.env, id, fingerprint);
  if (!payload) return c.json({ message: 'Payload not found' }, 404);
  return c.json(payload);
});

errorRoutes.post('/projects/:id/errors/status', async c => {
  const session = c.get('authSession');
  if (!session) return c.json({ message: 'Unauthorized' }, 401);
  const db = createPulsifyDb(c.env.PULSIFY_DB);
  const id = c.req.param('id');

  const parsed = statusBodySchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ message: parsed.error.message }, 400);
  const { fingerprint, action, hours } = parsed.data;

  const project = await ownedProject(db, id, session.user.id);
  if (!project) return c.json({ message: 'Project not found' }, 404);

  const [existing] = await db
    .select({ id: issues.id, lastVersion: issues.lastVersion })
    .from(issues)
    .where(and(eq(issues.projectId, id), eq(issues.fingerprint, fingerprint)));

  const now = new Date();
  const set: Partial<typeof issues.$inferInsert> = { resolvedBy: session.user.id };

  if (action === 'resolve') {
    set.status = 'resolved';
    set.resolvedAt = now;
    // Baseline for regression: recurrence on a version newer than this reopens the issue.
    set.statusVersion = existing?.lastVersion ?? null;
    set.mutedUntil = null;
  } else if (action === 'ignore') {
    set.status = 'ignored';
    set.resolvedAt = null;
    set.statusVersion = null;
    set.mutedUntil = null;
  } else if (action === 'mute') {
    set.status = 'muted';
    set.mutedUntil = new Date(now.getTime() + (hours ?? 24) * 3600_000);
    set.resolvedAt = null;
  } else {
    set.status = 'open';
    set.resolvedAt = null;
    set.statusVersion = null;
    set.mutedUntil = null;
  }

  if (existing) {
    await db.update(issues).set(set).where(eq(issues.id, existing.id));
  } else {
    // The registry row is normally created by cinder at ingest; fall back to creating it here
    // so a status set never silently no-ops on a not-yet-registered fingerprint.
    await db
      .insert(issues)
      .values({ projectId: id, fingerprint, firstSeenAt: now, lastSeenAt: now, ...set })
      .onConflictDoNothing({ target: [issues.projectId, issues.fingerprint] });
  }

  return c.json({ ok: true, fingerprint, status: set.status });
});

errorRoutes.get('/projects/:id/errors/versions', async c => {
  const session = c.get('authSession');
  if (!session) return c.json({ message: 'Unauthorized' }, 401);
  const db = createPulsifyDb(c.env.PULSIFY_DB);
  const id = c.req.param('id');
  const fingerprint = c.req.query('fingerprint') ?? '';
  if (!fingerprint) return c.json({ message: 'Missing fingerprint' }, 400);

  const project = await ownedProject(db, id, session.user.id);
  if (!project) return c.json({ message: 'Project not found' }, 404);

  const rows = await aeQuery<{ version: string; cnt: number; first_seen: string; last_seen: string }>(
    c.env,
    `SELECT
       blob7 AS version,
       SUM(_sample_interval) AS cnt,
       MIN(timestamp) AS first_seen,
       MAX(timestamp) AS last_seen
     FROM errors
     WHERE index1 = ${sqlString(id)} AND blob3 = ${sqlString(fingerprint)}
     GROUP BY version
     ORDER BY cnt DESC`,
  );

  return c.json({
    versions: rows.map(r => ({
      version: r.version || null,
      count: Number(r.cnt),
      firstSeen: r.first_seen,
      lastSeen: r.last_seen,
    })),
  });
});

errorRoutes.get('/projects/:id/cross-errors', async c => {
  const session = c.get('authSession');
  if (!session) return c.json({ message: 'Unauthorized' }, 401);
  const db = createPulsifyDb(c.env.PULSIFY_DB);
  const id = c.req.param('id');

  const project = await ownedProject(db, id, session.user.id);
  if (!project) return c.json({ message: 'Project not found' }, 404);
  if (project.type === 'server') return c.json({ message: 'Only available for plugin/mod projects' }, 400);

  // Cross-server aggregation surfaces crashes from servers the author does not own, so it
  // is gated behind name-ownership verification — otherwise anyone could register a project
  // named "EssentialsX" and harvest everyone else's crashes.
  if (!project.verified) {
    return c.json({ errors: [], total: 0, totalServers: 0, sharingServers: 0, verified: false });
  }

  const installations = await db
    .select({ serverId: pluginInstallations.serverId, shareErrors: pluginInstallations.shareErrors })
    .from(pluginInstallations)
    .where(eq(pluginInstallations.pluginId, id));

  const totalServers = installations.length;
  const sharingServers = installations.filter(i => i.shareErrors);
  const serverIds = sharingServers.map(i => i.serverId);

  if (serverIds.length === 0) {
    return c.json({ errors: [], total: 0, totalServers, sharingServers: 0, verified: true });
  }

  // Grouping uses the fingerprint stored at ingest, so the same logical crash collapses
  // into one group across servers instead of fanning out on dynamic data.
  const rows = await aeQuery<Omit<GroupedErrorRow, 'plugin'> & { server_count: number }>(
    c.env,
    `SELECT
       blob3 AS id,
       argMax(blob6, timestamp) AS msg,
       argMax(blob2, timestamp) AS level,
       SUM(_sample_interval) AS cnt,
       COUNT(DISTINCT index1) AS server_count,
       MIN(timestamp) AS first_seen_at,
       MAX(timestamp) AS last_seen_at,
       argMax(blob5, timestamp) AS server_software,
       argMax(blob4, timestamp) AS server_version,
       argMax(blob7, timestamp) AS plugin_version
     FROM errors
     WHERE index1 IN (${sqlStringList(serverIds)})
       AND blob1 = ${sqlString(project.name)}
       AND blob3 != ''
     GROUP BY id
     ORDER BY cnt DESC
     LIMIT 100`,
  );

  return c.json({
    errors: rows.map(r => ({
      id: r.id,
      message: anonymize(r.msg),
      stacktrace: '',
      level: r.level,
      count: Number(r.cnt),
      serverCount: Number(r.server_count),
      firstSeenAt: r.first_seen_at,
      lastSeenAt: r.last_seen_at,
      serverSoftware: r.server_software || null,
      serverVersion: r.server_version || null,
      pluginVersion: r.plugin_version || null,
    })),
    total: rows.length,
    totalServers,
    sharingServers: sharingServers.length,
    verified: true,
  });
});

errorRoutes.get('/projects/:id/cross-errors/payload', async c => {
  const session = c.get('authSession');
  if (!session) return c.json({ message: 'Unauthorized' }, 401);
  const db = createPulsifyDb(c.env.PULSIFY_DB);
  const id = c.req.param('id');
  const fingerprint = c.req.query('fingerprint') ?? '';
  if (!fingerprint) return c.json({ message: 'Missing fingerprint' }, 400);

  const project = await ownedProject(db, id, session.user.id);
  if (!project) return c.json({ message: 'Project not found' }, 404);
  if (project.type === 'server' || !project.verified) return c.json({ message: 'Not available' }, 400);

  const installations = await db
    .select({ serverId: pluginInstallations.serverId })
    .from(pluginInstallations)
    .where(and(eq(pluginInstallations.pluginId, id), eq(pluginInstallations.shareErrors, true)));

  // The payload lives under whichever sharing server reported the crash; probe a bounded
  // number of them and return the newest match, anonymized for the plugin author.
  let newest: StoredErrorPayload | undefined;
  for (const { serverId } of installations.slice(0, 20)) {
    const payload = await latestPayload(c.env, serverId, fingerprint);
    if (payload && (!newest || payload.timestamp > newest.timestamp)) newest = payload;
  }

  if (!newest) return c.json({ message: 'Payload not found' }, 404);
  return c.json({
    ...newest,
    message: anonymize(newest.message),
    stacktrace: anonymize(newest.stacktrace),
  });
});
