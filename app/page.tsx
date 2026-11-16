import Link from "next/link";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/guard";
import { card } from "@/lib/ui";

export const dynamic = "force-dynamic";

function Stat({ label, value, href, warn }: { label: string; value: number | string; href?: string; warn?: boolean }) {
  const body = (
    <div className={`${card} ${warn ? "border-amber-300 dark:border-amber-500/50" : ""}`}>
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${warn ? "text-amber-600" : ""}`}>{value}</p>
    </div>
  );
  return href ? <Link href={href} className="block hover:opacity-90">{body}</Link> : body;
}

export default async function Overview() {
  await requireAdmin();
  const [beta, stuck, sites, plans, ai] = await Promise.all([
    query<{ status: string; n: number }>("SELECT status, count(*) AS n FROM beta_testing_applications GROUP BY status"),
    query<{ n: number }>("SELECT count(*) AS n FROM scan_reports WHERE analyzed_at IS NULL AND created_at < now() - interval '15 minutes'"),
    query<{ n: number }>("SELECT count(*) AS n FROM websites"),
    query<{ plan: string; n: number }>("SELECT plan, count(*) AS n FROM subscriptions WHERE status = 'active' AND (current_period_end IS NULL OR current_period_end > now()) GROUP BY plan ORDER BY plan"),
    query<{ ai: number; total: number }>("SELECT count(*) FILTER (WHERE ai_used) AS ai, count(*) AS total FROM scan_reports WHERE created_at > now() - interval '30 days'"),
  ]);
  const b = (s: string) => beta.find((r) => r.status === s)?.n ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Panoramica</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Beta in attesa" value={b("pending")} href="/beta?status=pending" warn={b("pending") > 0} />
        <Stat label="Beta approvate / attive" value={`${b("approved")} / ${b("activated")}`} href="/beta?status=approved" />
        <Stat label="Report non analizzati (>15 min)" value={stuck[0].n} href="/pipeline" warn={stuck[0].n > 0} />
        <Stat label="Siti monitorati" value={sites[0].n} href="/sites" />
        <Stat label="Analisi con AI (30 gg)" value={`${ai[0].ai} / ${ai[0].total}`} href="/pipeline" />
        {plans.map((p) => <Stat key={p.plan} label={`Abbonamenti ${p.plan}`} value={p.n} />)}
      </div>
    </div>
  );
}
