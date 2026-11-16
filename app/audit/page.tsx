import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/guard";
import { card, fmt, td, th } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  await requireAdmin();
  const rows = await query<{ id: number; at: string; action: string; target_type: string | null; target_id: string | null; before: unknown; after: unknown; ip: string | null }>(
    "SELECT id, at, action, target_type, target_id, before, after, ip FROM audit_logs ORDER BY at DESC, id DESC LIMIT 300",
  );
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Audit log</h1>
      <div className={`${card} overflow-x-auto p-0`}>
        <table className="w-full min-w-[820px] divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead><tr><th className={th}>Quando</th><th className={th}>Azione</th><th className={th}>Oggetto</th><th className={th}>Prima → dopo</th><th className={th}>IP</th></tr></thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className={td}>{fmt(r.at)}</td>
                <td className={`${td} font-mono text-xs`}>{r.action}</td>
                <td className={`${td} text-xs`}>{r.target_type ? `${r.target_type} ${String(r.target_id ?? "").slice(0, 8)}` : "—"}</td>
                <td className={`${td} font-mono text-xs`}>{r.before ? JSON.stringify(r.before) : ""}{r.before && r.after ? " → " : ""}{r.after ? JSON.stringify(r.after) : ""}</td>
                <td className={`${td} text-xs`}>{r.ip ?? ""}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className={td} colSpan={5}>Vuoto.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
