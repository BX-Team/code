import type { Env } from '../env';

/**
 * Read side of Analytics Engine, queried over the SQL API with an account-scoped token.
 * The API has no bind parameters, so every dynamic value is inlined through the escaping
 * helpers below. Timestamps come back as 'YYYY-MM-DD HH:MM:SS' UTC strings.
 */
export async function aeQuery<T = Record<string, unknown>>(env: Env, sql: string): Promise<T[]> {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/analytics_engine/sql`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.AE_SQL_TOKEN}`, 'content-type': 'text/plain' },
    body: sql,
  });
  if (!res.ok) {
    throw new Error(`AE SQL query failed (${res.status}): ${await res.text()}`);
  }
  const body = (await res.json()) as { data?: T[] };
  return body.data ?? [];
}

/** Escapes and single-quotes a string literal for inlining into AE SQL. */
export function sqlString(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

export function sqlStringList(values: string[]): string {
  return values.map(sqlString).join(', ');
}

/** Inlines an epoch-milliseconds instant as an AE SQL DateTime expression. */
export function sqlDateTime(epochMs: number): string {
  return `toDateTime(${Math.floor(epochMs / 1000)})`;
}
