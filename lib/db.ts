import { Pool, type QueryResult, type QueryResultRow } from "pg";

const globalForDb = globalThis as unknown as { __permaPool?: Pool };

export function db(): Pool {
  if (!globalForDb.__permaPool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("Falta la variable DATABASE_URL");
    globalForDb.__permaPool = new Pool({ connectionString: url, max: 10 });
  }
  return globalForDb.__permaPool;
}

export function q<R extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<R>> {
  return db().query<R>(text, params as never[]);
}
