import Link from "next/link";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/guard";
import { card, fmt } from "@/lib/ui";

export const dynamic = "force-dynamic";

type Row = {
  id: string; created_at: string; email: string; name: string | null; topic: string | null; message: string | null;
  quarantined: boolean; spam_score: number | null; spam_reasons: string | null; ip: string | null;
};

const TOPIC: Record<string, string> = { info: "Informazioni", quote: "Preventivo", support: "Supporto", other: "Altro" };
const VIEWS = [["all", "Tutti"], ["quarantined", "In quarantena (spam?)"], ["text", "Con testo"]] as const;

export default async function ContactMessagesPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const view = VIEWS.some(([v]) => v === sp.view) ? sp.view! : "all";
  const q = (sp.q ?? "").trim().slice(0, 100);

  const [rows, totals] = await Promise.all([
    query<Row>(
      `SELECT id, created_at, email, name, topic, message, quarantined, spam_score, spam_reasons, ip
         FROM contact_submissions
        WHERE ($1 <> 'quarantined' OR quarantined) AND ($1 <> 'text' OR message IS NOT NULL)
          AND ($2 = '' OR email ILIKE '%' || $2 || '%' OR name ILIKE '%' || $2 || '%' OR message ILIKE '%' || $2 || '%')
        ORDER BY created_at DESC LIMIT 200`,
      [view, q],
    ),
    query<{ total: number; quarantined: number; with_text: number }>(
      "SELECT count(*) AS total, count(*) FILTER (WHERE quarantined) AS quarantined, count(*) FILTER (WHERE message IS NOT NULL) AS with_text FROM contact_submissions",
    ),
  ]);
  const t = totals[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold">Messaggi ricevuti <span className="text-sm font-normal text-zinc-500">(form contatti)</span></h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{t.total} invii · {t.quarantined} in quarantena · {t.with_text} con testo salvato</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-2 text-sm">
          {VIEWS.map(([v, label]) => (
            <Link key={v} href={`/email?view=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={`rounded-full border px-3 py-1 ${v === view ? "border-blue-600 bg-blue-600 text-white" : "border-zinc-300 hover:border-blue-500 dark:border-zinc-700"}`}>{label}</Link>
          ))}
        </nav>
        <form className="flex gap-2">
          <input type="hidden" name="view" value={view} />
          <input name="q" defaultValue={q} placeholder="Cerca email, nome, testo" className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        </form>
      </div>

      {rows.map((r) => (
        <article key={r.id} className={`${card} ${r.quarantined ? "border-amber-300 dark:border-amber-500/50" : ""}`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{r.name || <span className="font-normal text-zinc-400">(senza nome)</span>} <span className="font-normal text-zinc-600 dark:text-zinc-300">&lt;{r.email}&gt;</span></p>
              <p className="text-xs text-zinc-500">{fmt(r.created_at)}{r.topic ? ` · ${TOPIC[r.topic] ?? r.topic}` : ""}{r.ip ? ` · ${r.ip}` : ""}</p>
            </div>
            {r.quarantined
              ? <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">quarantena · punteggio {r.spam_score ?? "?"}</span>
              : <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{r.message ? "con testo" : "inoltrato al supporto"}</span>}
          </div>
          {r.message
            ? <p className="mt-3 whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-800/60">{r.message}</p>
            : <p className="mt-3 text-xs text-zinc-500">Testo non salvato: il messaggio è stato inviato per email al supporto.</p>}
          {r.spam_reasons && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Motivi: {r.spam_reasons}</p>}
        </article>
      ))}
      {rows.length === 0 && <p className="text-sm text-zinc-500">Nessun messaggio.</p>}
    </div>
  );
}
