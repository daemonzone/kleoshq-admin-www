import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/guard";
import { card, fmt, td, th } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  await requireAdmin();
  const [stuck, months] = await Promise.all([
    query<{ id: string; created_at: string; event_type: string | null; name: string | null; url: string | null }>(
      `SELECT r.id, r.created_at, r.event_type, w.name, w.url
         FROM scan_reports r
         LEFT JOIN sources s ON s.id = r.source_id
         LEFT JOIN websites w ON w.id = s.website_id
        WHERE r.analyzed_at IS NULL AND r.created_at < now() - interval '15 minutes'
        ORDER BY r.created_at DESC LIMIT 100`,
    ),
    query<{ month: string; ai: number; official: number; none: number; pending: number }>(
      `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
              count(*) FILTER (WHERE ai_used) AS ai,
              count(*) FILTER (WHERE ai_used = false AND analysis_results->>'verified_by' IS NOT NULL) AS official,
              count(*) FILTER (WHERE ai_used = false AND analysis_results->>'verified_by' IS NULL) AS none,
              count(*) FILTER (WHERE ai_used IS NULL) AS pending
         FROM scan_reports GROUP BY 1 ORDER BY 1 DESC LIMIT 12`,
    ),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Pipeline &amp; AI</h1>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">Report non analizzati da più di 15 minuti ({stuck.length})</h2>
        <div className={`${card} overflow-x-auto p-0`}>
          <table className="w-full divide-y divide-zinc-200 dark:divide-zinc-800">
            <thead><tr><th className={th}>Ricevuto</th><th className={th}>Sito</th><th className={th}>Tipo</th><th className={th}>Report</th></tr></thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {stuck.map((r) => (
                <tr key={r.id}>
                  <td className={td}>{fmt(r.created_at)}</td>
                  <td className={td}>{r.name ?? "—"}<div className="break-all text-xs text-zinc-500">{r.url ?? ""}</div></td>
                  <td className={td}>{r.event_type ?? "—"}</td>
                  <td className={`${td} font-mono text-xs`}>{r.id.slice(0, 8)}</td>
                </tr>
              ))}
              {stuck.length === 0 && (
                <tr>
                  <td className={td} colSpan={4}>
                    <span className="inline-flex items-center gap-2 font-medium text-green-700 dark:text-green-400">
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                      </svg>
                      OK, tutto regolare
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-500">Un report non analizzato viene ritentato al successivo invio dello stesso sito.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">Analisi per mese</h2>
        <div className={`${card} overflow-x-auto p-0`}>
          <table className="w-full divide-y divide-zinc-200 dark:divide-zinc-800">
            <thead><tr><th className={th}>Mese</th><th className={th}>Con AI</th><th className={th}>Checksum ufficiali</th><th className={th}>Senza AI (baseline, vuoti)</th><th className={th}>In attesa / fallite</th></tr></thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {months.map((m) => (
                <tr key={m.month}><td className={td}>{m.month}</td><td className={td}>{m.ai}</td><td className={td}>{m.official}</td><td className={td}>{m.none}</td><td className={td}>{m.pending}</td></tr>
              ))}
              {months.length === 0 && <tr><td className={td} colSpan={5}>Nessun dato.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
