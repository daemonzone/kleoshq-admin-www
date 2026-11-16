import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/guard";
import StatusBadge from "@/components/StatusBadge";
import { card, fmt, td, th } from "@/lib/ui";

export const dynamic = "force-dynamic";

type Site = {
  id: string; name: string; url: string | null; enabled: boolean; status: string | null; last_report_at: string | null;
  scans: number; ai_scans: number; plan: string | null; plan_end: string | null;
  members: number; invited: number; owner_email: string | null; owner_email_source: string | null;
};

export default async function SitesPage() {
  await requireAdmin();
  const sites = await query<Site>(
    `SELECT w.id, w.name, w.url, w.enabled, s.status, s.last_report_at,
            (SELECT count(*) FROM scan_reports r WHERE r.source_id = s.id) AS scans,
            (SELECT count(*) FROM scan_reports r WHERE r.source_id = s.id AND r.ai_used) AS ai_scans,
            sub.plan, sub.current_period_end AS plan_end,
            (SELECT count(*) FROM team_members m WHERE m.principal_id = w.user_id AND m.status = 'active' AND w.id = ANY (m.website_ids)) AS members,
            (SELECT count(*) FROM team_members m WHERE m.principal_id = w.user_id AND m.status = 'pending' AND w.id = ANY (m.website_ids)) AS invited,
            o.email AS owner_email, o.source AS owner_email_source
       FROM websites w
       LEFT JOIN LATERAL (
         SELECT email, source FROM (
           SELECT principal_email AS email, 'team' AS source, 1 AS rank FROM team_members WHERE principal_id = w.user_id AND principal_email IS NOT NULL
           UNION ALL
           SELECT user_email, 'collegamento plugin', 2 FROM connect_codes WHERE user_id = w.user_id AND user_email IS NOT NULL
           UNION ALL
           SELECT billing_email, 'ordine', 3 FROM orders WHERE user_id = w.user_id AND billing_email IS NOT NULL
         ) c ORDER BY rank LIMIT 1
       ) o ON true
       LEFT JOIN sources s ON s.website_id = w.id AND s.channel_code = 'sitewitness'
       LEFT JOIN subscriptions sub ON sub.user_id = w.user_id
      ORDER BY s.last_report_at DESC NULLS LAST, w.created_at DESC
      LIMIT 300`,
  );
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Siti monitorati <span className="text-sm font-normal text-zinc-500">({sites.length})</span></h1>
      <div className={`${card} overflow-x-auto p-0`}>
        <table className="w-full min-w-[980px] divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead><tr><th className={th}>Sito</th><th className={th}>Stato</th><th className={th}>Ultimo report</th><th className={th}>Scansioni</th><th className={th}>di cui AI</th><th className={th}>Titolare</th><th className={th}>Membri</th><th className={th}>Piano</th></tr></thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {sites.map((s) => (
              <tr key={s.id}>
                <td className={td}><div className="font-medium">{s.name}{!s.enabled && <span className="ml-2 text-xs text-zinc-400">(disattivato)</span>}</div><div className="break-all text-xs text-zinc-500">{s.url ?? "—"}</div></td>
                <td className={td}><StatusBadge status={s.status} /></td>
                <td className={td}>{fmt(s.last_report_at)}</td>
                <td className={td}>{s.scans}</td>
                <td className={td}>{s.ai_scans}</td>
                <td className={td}>{s.owner_email ?? "—"}{s.owner_email_source ? <span className="block text-xs text-zinc-400">da {s.owner_email_source}</span> : null}</td>
                <td className={td}>{s.members}{s.invited > 0 ? <span className="block text-xs text-zinc-500">+{s.invited} invitati</span> : null}</td>
                <td className={td}>{s.plan ?? "free"}{s.plan_end ? <span className="block text-xs text-zinc-500">fino al {fmt(s.plan_end)}</span> : null}</td>
              </tr>
            ))}
            {sites.length === 0 && <tr><td className={td} colSpan={8}>Nessun sito.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
