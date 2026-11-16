import "server-only";
import { Pool, types, type PoolClient } from "pg";

// The admin connects with its own Postgres role (stuff/db/scripts/create-admin-role.sql): read access to
// what it shows, UPDATE on beta applications, INSERT on audit_logs. Anything else fails at the database.

const isoTimestamp = (value: string) => new Date(value).toISOString();
const typeParsers = {
  getTypeParser(oid: number, format?: string) {
    if (oid === types.builtins.TIMESTAMPTZ || oid === types.builtins.TIMESTAMP) return isoTimestamp;
    // count(*) and sums come back as int8 → string; the numbers here are small
    if (oid === types.builtins.INT8) return (v: string) => Number(v);
    return types.getTypeParser(oid, format as "text");
  },
};

const globalForDb = globalThis as unknown as { adminPool?: Pool };

function pool(): Pool {
  if (!globalForDb.adminPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    globalForDb.adminPool = new Pool({ connectionString, max: 3, types: typeParsers });
  }
  return globalForDb.adminPool;
}

export type Db = Pick<PoolClient, "query">;

export async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const { rows } = await pool().query(text, params);
  return rows as T[];
}

export async function withTransaction<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
