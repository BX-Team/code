import { type AuthDb, type PulsifyDb, projects, user } from '@bx-team/stratus/d1';
import { eq, inArray } from 'drizzle-orm';

/** Time ranges shared by the Pulsify dashboard widgets (interval + AE bucket function). */
export const RANGES = {
  '24h': { interval: "INTERVAL '24' HOUR", bucket: 'toStartOfFiveMinutes' },
  '7d': { interval: "INTERVAL '7' DAY", bucket: 'toStartOfHour' },
  '30d': { interval: "INTERVAL '30' DAY", bucket: 'toStartOfHour' },
} as const;

export type RangeKey = keyof typeof RANGES;

export function rangeFromQuery(value: string | undefined, fallback: RangeKey): RangeKey {
  return value && value in RANGES ? (value as RangeKey) : fallback;
}

const UUID_RE = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
const IPV4_RE = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;

/**
 * Strips player-identifying data (IP addresses, UUIDs) from text shown to a plugin
 * author in cross-server aggregation. The author must never see who the players or
 * servers behind a crash are — only the crash itself.
 */
export function anonymize(text: string): string {
  if (!text) return text;
  return text.replace(UUID_RE, '<uuid>').replace(IPV4_RE, '<ip>');
}

/** Fetches a project only if it is owned by the given user (the standard access check). */
export async function ownedProject(db: PulsifyDb, id: string, userId: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project || project.ownerId !== userId) return undefined;
  return project;
}

/**
 * Confirms a user still exists in auth-db before a write attaches them to a project.
 * Owner ids are plain TEXT with no cross-database FK, and a valid session can outlive
 * a deleted/banned user, so this check stands in for referential integrity.
 */
export async function userExists(authDb: AuthDb, userId: string): Promise<boolean> {
  const [row] = await authDb.select({ id: user.id }).from(user).where(eq(user.id, userId)).limit(1);
  return row !== undefined;
}

export interface OwnerInfo {
  id: string;
  name: string;
  email: string;
}

/** Batched owner lookup against auth-db for pulsify-db rows, assembled app-side. */
export async function resolveOwners(authDb: AuthDb, ownerIds: string[]): Promise<Map<string, OwnerInfo>> {
  const unique = [...new Set(ownerIds)];
  if (!unique.length) return new Map();
  const rows = await authDb
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(inArray(user.id, unique));
  return new Map(rows.map(row => [row.id, row]));
}
