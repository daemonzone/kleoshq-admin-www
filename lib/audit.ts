import "server-only";
import { headers } from "next/headers";
import { query, type Db } from "@/lib/db";

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Append one row to audit_logs (the admin role can INSERT and SELECT there, never UPDATE or DELETE).
 * Pass `db` to write inside the same transaction as the change it records: then the change and its
 * trace commit together or not at all.
 */
export async function audit(
  entry: { action: string; targetType?: string; targetId?: string; before?: unknown; after?: unknown },
  db?: Db,
): Promise<void> {
  const h = await headers();
  const run = db ? db.query.bind(db) : (text: string, params: unknown[]) => query(text, params);
  await run(
    `INSERT INTO audit_logs (actor, action, target_type, target_id, before, after, ip, user_agent)
     VALUES ('admin', $1, $2, $3, $4, $5, $6, $7)`,
    [
      entry.action,
      entry.targetType ?? null,
      entry.targetId ?? null,
      entry.before === undefined ? null : JSON.stringify(entry.before),
      entry.after === undefined ? null : JSON.stringify(entry.after),
      await clientIp(),
      (h.get("user-agent") ?? "").slice(0, 300),
    ],
  );
}
