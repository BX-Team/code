import {
  createAuthDb,
  createPulsifyDb,
  issues,
  pluginInstallations,
  projects,
  quotas,
  serverMetadata,
} from '@bx-team/stratus/d1';
import { and, count, eq, inArray, ne } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../../env';
import { aeQuery, sqlStringList } from '../../lib/analytics-sql';
import { ownedProject, resolveOwners, userExists } from '../../lib/pulsify';
import type { SessionVariables } from '../../middleware/auth';

type PulsifyEnv = { Bindings: Env; Variables: SessionVariables };

const createBodySchema = z.object({
  name: z.string().min(1).max(64),
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/),
  type: z.enum(['server', 'plugin', 'mod']),
  description: z.string().max(256).optional(),
});

const verifyBodySchema = z.object({ verified: z.boolean() });

export const projectRoutes = new Hono<PulsifyEnv>();

/**
 * Open (unsuppressed) error fingerprint counts per project — the AE `errors` dataset
 * grouped by fingerprint, minus fingerprints suppressed in the D1 issue registry.
 */
async function countOpenErrors(
  env: Env,
  db: ReturnType<typeof createPulsifyDb>,
  projectIds: string[],
): Promise<Map<string, number>> {
  const [suppressedRows, fingerprintRows] = await Promise.all([
    db
      .select({ projectId: issues.projectId, fingerprint: issues.fingerprint })
      .from(issues)
      .where(and(inArray(issues.projectId, projectIds), ne(issues.status, 'open'))),
    aeQuery<{ project_id: string; fingerprint: string }>(
      env,
      `SELECT index1 AS project_id, blob3 AS fingerprint
       FROM errors
       WHERE index1 IN (${sqlStringList(projectIds)}) AND blob3 != ''
       GROUP BY project_id, fingerprint`,
    ).catch(() => []),
  ]);

  const suppressedByProject = new Map<string, Set<string>>();
  for (const row of suppressedRows) {
    if (!suppressedByProject.has(row.projectId)) suppressedByProject.set(row.projectId, new Set());
    suppressedByProject.get(row.projectId)?.add(row.fingerprint);
  }

  const openByProject = new Map<string, number>();
  for (const row of fingerprintRows) {
    if (suppressedByProject.get(row.project_id)?.has(row.fingerprint)) continue;
    openByProject.set(row.project_id, (openByProject.get(row.project_id) ?? 0) + 1);
  }
  return openByProject;
}

projectRoutes.get('/projects', async c => {
  const session = c.get('authSession');
  if (!session) return c.json({ message: 'Unauthorized' }, 401);
  const db = createPulsifyDb(c.env.PULSIFY_DB);

  // Admin view of another user's projects — authorization is a role check on the same endpoint.
  const ownerParam = c.req.query('owner');
  if (ownerParam) {
    if (session.user.role !== 'admin') return c.json({ message: 'Forbidden' }, 403);

    const [rows, owners] = await Promise.all([
      db
        .select({
          id: projects.id,
          name: projects.name,
          slug: projects.slug,
          type: projects.type,
          description: projects.description,
          verified: projects.verified,
          createdAt: projects.createdAt,
        })
        .from(projects)
        .where(eq(projects.ownerId, ownerParam)),
      resolveOwners(createAuthDb(c.env.AUTH_DB), [ownerParam]),
    ]);
    return c.json(rows.map(row => ({ ...row, owner: owners.get(ownerParam) ?? null })));
  }

  const owned = await db
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      type: projects.type,
      description: projects.description,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(eq(projects.ownerId, session.user.id));

  if (!owned.length) return c.json([]);

  const projectIds = owned.map(p => p.id);
  const [lastSeenRows, errorsByProject] = await Promise.all([
    db
      .select({ projectId: serverMetadata.projectId, lastSeenAt: serverMetadata.lastSeenAt })
      .from(serverMetadata)
      .where(inArray(serverMetadata.projectId, projectIds)),
    countOpenErrors(c.env, db, projectIds),
  ]);

  const lastSeenByProject = new Map(lastSeenRows.map(r => [r.projectId, r.lastSeenAt]));

  return c.json(
    owned.map(p => ({
      ...p,
      lastSeenAt: lastSeenByProject.get(p.id) ?? null,
      errors: errorsByProject.get(p.id) ?? 0,
    })),
  );
});

projectRoutes.post('/projects', async c => {
  const session = c.get('authSession');
  if (!session) return c.json({ message: 'Unauthorized' }, 401);
  const db = createPulsifyDb(c.env.PULSIFY_DB);

  const parsed = createBodySchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ message: parsed.error.message }, 400);
  const { name, slug, type, description } = parsed.data;

  // Confirm the user still exists before writing an owner reference — a valid session
  // can outlive a deleted user, and there is no cross-database FK to catch it.
  if (!(await userExists(createAuthDb(c.env.AUTH_DB), session.user.id))) {
    return c.json({ message: 'User account no longer exists' }, 403);
  }

  // Enforce the per-user project quota (defaults apply when the user has no quota row yet).
  const [[quota], [projectCount]] = await Promise.all([
    db.select({ maxProjects: quotas.maxProjects }).from(quotas).where(eq(quotas.userId, session.user.id)),
    db.select({ count: count() }).from(projects).where(eq(projects.ownerId, session.user.id)),
  ]);
  const maxProjects = quota?.maxProjects ?? 10;
  if ((projectCount?.count ?? 0) >= maxProjects) {
    return c.json({ message: `Project limit reached (${maxProjects}).` }, 403);
  }

  // Plugin/mod names are globally unique — they are the key cross-server error aggregation
  // matches on, so two projects can't claim the same name.
  if (type === 'plugin' || type === 'mod') {
    const [existing] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.name, name), inArray(projects.type, ['plugin', 'mod'])));
    if (existing) {
      return c.json({ message: `A plugin or mod named "${name}" already exists.` }, 409);
    }
  }

  const [project] = await db
    .insert(projects)
    .values({ name, slug, type, description, ownerId: session.user.id })
    .returning({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      type: projects.type,
    });

  return c.json(project, 201);
});

projectRoutes.delete('/projects/:id', async c => {
  const session = c.get('authSession');
  if (!session) return c.json({ message: 'Unauthorized' }, 401);
  const db = createPulsifyDb(c.env.PULSIFY_DB);
  const id = c.req.param('id');

  const [deleted] = await db
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.ownerId, session.user.id)))
    .returning({ id: projects.id });

  if (!deleted) return c.json({ message: 'Project not found' }, 404);
  return c.json({ success: true });
});

projectRoutes.patch('/projects/:id/verify', async c => {
  const session = c.get('authSession');
  if (!session) return c.json({ message: 'Unauthorized' }, 401);
  if (session.user.role !== 'admin') return c.json({ message: 'Forbidden' }, 403);
  const db = createPulsifyDb(c.env.PULSIFY_DB);
  const id = c.req.param('id');

  const parsed = verifyBodySchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ message: parsed.error.message }, 400);

  const [project] = await db.select({ id: projects.id, type: projects.type }).from(projects).where(eq(projects.id, id));
  if (!project) return c.json({ message: 'Project not found' }, 404);
  if (project.type === 'server') return c.json({ message: 'Only plugin/mod projects can be verified' }, 400);

  const [updated] = await db
    .update(projects)
    .set({ verified: parsed.data.verified, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning({ id: projects.id, verified: projects.verified });

  return c.json(updated);
});

projectRoutes.get('/projects/:id/plugins', async c => {
  const session = c.get('authSession');
  if (!session) return c.json({ message: 'Unauthorized' }, 401);
  const db = createPulsifyDb(c.env.PULSIFY_DB);
  const id = c.req.param('id');

  const project = await ownedProject(db, id, session.user.id);
  if (!project) return c.json({ message: 'Project not found' }, 404);
  if (project.type === 'server') return c.json({ message: 'Not applicable for server projects' }, 400);

  const installs = await db
    .select({
      version: pluginInstallations.version,
      enabled: pluginInstallations.enabled,
      lastSeenAt: pluginInstallations.lastSeenAt,
    })
    .from(pluginInstallations)
    .where(eq(pluginInstallations.pluginId, id));

  const total = installs.length;
  const enabled = installs.filter(i => i.enabled).length;

  const versionCounts = new Map<string, number>();
  for (const install of installs) {
    versionCounts.set(install.version, (versionCounts.get(install.version) ?? 0) + 1);
  }

  const versions = [...versionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([version, versionCount]) => ({
      version,
      count: versionCount,
      pct: total > 0 ? Math.round((versionCount / total) * 1000) / 10 : 0,
    }));

  const latestVersion = versions[0]?.version ?? null;

  return c.json({
    total_installs: total,
    enabled_installs: enabled,
    latest_version: latestVersion,
    latest_version_adoption: latestVersion ? (versions.find(v => v.version === latestVersion)?.pct ?? 0) : 0,
    versions,
  });
});
