import {
  type CompiledQuery,
  type DatabaseConnection,
  type Dialect,
  type Driver,
  Kysely,
  type QueryResult,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
} from 'kysely';

/** The part of a Workers `D1Database` binding used here; this package has no Workers types of its own. */
export interface D1 {
  prepare(sql: string): D1Statement;
  batch(statements: D1Statement[]): Promise<unknown[]>;
}

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  all<T>(): Promise<{ results: T[]; meta: { changes?: number; last_row_id?: number } }>;
}

class D1Connection implements DatabaseConnection {
  constructor(private readonly d1: D1) {}

  async executeQuery<R>(query: CompiledQuery): Promise<QueryResult<R>> {
    const { results, meta } = await this.d1
      .prepare(query.sql)
      .bind(...query.parameters)
      .all<R>();
    const changes = meta.changes ?? 0;
    return {
      rows: results,
      numAffectedRows: BigInt(changes),
      insertId: changes > 0 && meta.last_row_id != null ? BigInt(meta.last_row_id) : undefined,
    };
  }

  // biome-ignore lint/correctness/useYield: D1 has no cursors; Kysely only needs the method to exist.
  async *streamQuery(): AsyncIterableIterator<never> {
    throw new Error('D1 cannot stream query results');
  }
}

class D1Driver implements Driver {
  constructor(private readonly d1: D1) {}
  async init() {}
  async acquireConnection() {
    return new D1Connection(this.d1);
  }
  // D1 has no interactive transactions: atomic writes go through `batch`.
  async beginTransaction() {
    throw new Error('D1 has no transactions; use batch()');
  }
  async commitTransaction() {}
  async rollbackTransaction() {}
  async releaseConnection() {}
  async destroy() {}
}

function dialect(d1: D1): Dialect {
  return {
    createAdapter: () => new SqliteAdapter(),
    createDriver: () => new D1Driver(d1),
    createIntrospector: db => new SqliteIntrospector(db),
    createQueryCompiler: () => new SqliteQueryCompiler(),
  };
}

/** A typed query builder over a D1 binding; `Tables` comes from the app's generated `src/tables.ts`. */
export function database<Tables>(d1: D1): Kysely<Tables> {
  return new Kysely<Tables>({ dialect: dialect(d1) });
}

/** Runs the queries as one D1 batch: all of them or none. */
export async function batch(d1: D1, queries: { compile(): CompiledQuery }[]): Promise<void> {
  await d1.batch(
    queries.map(query => {
      const { sql, parameters } = query.compile();
      return d1.prepare(sql).bind(...parameters);
    }),
  );
}
