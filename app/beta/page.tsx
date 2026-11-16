import Link from "next/link";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/guard";
import { btnDanger, btnGhost, btnPrimary, card, fmt } from "@/lib/ui";
import ConfirmButton from "@/components/ConfirmButton";
import { decide } from "./actions";

export const dynamic = "force-dynamic";

const STATUSES = ["pending", "approved", "activated", "declined", "unconfirmed", "expired", "cancelled", "revoked"] as const;
const LABEL: Record<string, string> = {
  pending: "In attesa", approved: "Approvate", activated: "Attive", declined: "Rifiutate",
  unconfirmed: "Non confermate", expired: "Scadute", cancelled: "Annullate", revoked: "Revocate",
};
const FLASH: Record<string, [string, string]> = {
  ok: ["Fatto.", "border-green-200 bg-green-50 text-green-800"],
  mail_failed: ["Decisione salvata, ma la mail NON è partita: usa «Reinvia» (se approvata) o scrivi a mano.", "border-amber-300 bg-amber-50 text-amber-900"],
  note_required: ["Per revocare serve un motivo: scrivilo nel campo nota.", "border-amber-300 bg-amber-50 text-amber-900"],
  invalid: ["Operazione non valida: la richiesta potrebbe essere già stata gestita.", "border-red-200 bg-red-50 text-red-800"],
};

type App = {
  id: string; status: string; first_name: string; last_name: string; email: string; applicant_kind: string; company_name: string | null;
  site_url: string; site_type: string; hosting: string | null; description: string; locale: string; created_at: string;
  confirmed_at: string | null; decided_at: string | null; decision_note: string | null; activated_at: string | null; beta_until: string | null; terms_version: string;
  user_id: string | null; connected: { name: string; url: string | null }[];
};

// "https://www.Example.com/path" and "example.com" are the same site for this comparison.
function hostOf(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).host.toLowerCase().replace(/^www\./, "");
  } catch {
    return url.toLowerCase();
  }
}

export default async function BetaPage({ searchParams }: { searchParams: Promise<{ status?: string; flash?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = (STATUSES as readonly string[]).includes(sp.status ?? "") ? sp.status! : "pending";
  const slots = Number(process.env.BETA_SLOTS) || 10;

  const [counts, apps] = await Promise.all([
    query<{ status: string; n: number }>("SELECT status, count(*) AS n FROM beta_testing_applications GROUP BY status"),
    query<App>(
      `SELECT a.id, a.status, a.first_name, a.last_name, a.email, a.applicant_kind, a.company_name, a.site_url, a.site_type, a.hosting, a.description, a.locale,
              a.created_at, a.confirmed_at, a.decided_at, a.decision_note, a.activated_at, a.beta_until, a.terms_version, a.user_id,
              CASE WHEN a.user_id IS NULL THEN '[]'::json ELSE
                (SELECT coalesce(json_agg(json_build_object('name', w.name, 'url', w.url) ORDER BY w.created_at), '[]'::json) FROM websites w WHERE w.user_id = a.user_id)
              END AS connected
         FROM beta_testing_applications a WHERE a.status = $1 ORDER BY coalesce(a.confirmed_at, a.created_at) ${status === "pending" ? "ASC" : "DESC"} LIMIT 200`,
      [status],
    ),
  ]);
  const n = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;
  const taken = n("approved") + n("activated");
  const flash = sp.flash ? FLASH[sp.flash] : undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold">Beta testing</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">Posti: <strong className={taken >= slots ? "text-red-600" : ""}>{taken} / {slots}</strong> (approvate + attive)</p>
      </div>

      {flash && <p role="status" className={`rounded-lg border px-3.5 py-2.5 text-sm ${flash[1]}`}>{flash[0]}</p>}

      <nav className="flex flex-wrap gap-2 text-sm">
        {STATUSES.map((s) => (
          <Link key={s} href={`/beta?status=${s}`} className={`rounded-full border px-3 py-1 ${s === status ? "border-blue-600 bg-blue-600 text-white" : "border-zinc-300 hover:border-blue-500 dark:border-zinc-700"}`}>
            {LABEL[s]} <span className="opacity-70">{n(s)}</span>
          </Link>
        ))}
      </nav>

      {apps.length === 0 && <p className="text-sm text-zinc-500">Nessuna richiesta in questo stato.</p>}

      {apps.map((a) => (
        <article key={a.id} className={card}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">{a.first_name} {a.last_name}{a.applicant_kind === "company" && a.company_name ? <span className="font-normal text-zinc-500"> · {a.company_name}</span> : <span className="font-normal text-zinc-500"> · privato</span>}</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">{a.email} <span className="text-zinc-400">({a.locale})</span></p>
            </div>
            <p className="text-xs text-zinc-500">richiesta {fmt(a.created_at)}{a.confirmed_at ? ` · confermata ${fmt(a.confirmed_at)}` : ""}</p>
          </div>

          <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
            <div><dt className="text-xs text-zinc-500">Sito</dt><dd>{/^https?:\/\//.test(a.site_url) ? <a className="break-all text-blue-600 hover:underline" href={a.site_url} target="_blank" rel="noopener noreferrer nofollow">{a.site_url}</a> : a.site_url}</dd></div>
            <div><dt className="text-xs text-zinc-500">Tipo</dt><dd>{a.site_type}</dd></div>
            <div><dt className="text-xs text-zinc-500">Hosting</dt><dd>{a.hosting ?? "—"}</dd></div>
          </dl>
          <p className="mt-3 whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-800/60">{a.description}</p>

          {a.user_id && (
            <div className="mt-3 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-700">
              <p className="text-xs text-zinc-500">Siti collegati dall&apos;utente (dichiarato: {hostOf(a.site_url) || "—"})</p>
              {a.connected.length === 0 && <p className="mt-1 text-zinc-500">Nessun sito collegato ancora.</p>}
              {a.connected.map((c, i) => {
                const same = hostOf(c.url) === hostOf(a.site_url);
                return (
                  <p key={i} className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="break-all">{c.name}{c.url ? <span className="text-zinc-500"> · {c.url}</span> : null}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${same ? "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/20 dark:text-green-400" : "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/20 dark:text-amber-400"}`}>
                      {same ? "coincide con la richiesta" : "diverso da quello dichiarato"}
                    </span>
                  </p>
                );
              })}
            </div>
          )}

          {(a.decided_at || a.activated_at) && (
            <p className="mt-3 text-xs text-zinc-500">
              {a.decided_at && <>decisa {fmt(a.decided_at)}{a.decision_note ? ` — «${a.decision_note}»` : ""}</>}
              {a.activated_at && <> · attivata {fmt(a.activated_at)}, fino al {fmt(a.beta_until)}</>}
              {" · termini "}{a.terms_version}
            </p>
          )}

          {["pending", "approved", "declined", "unconfirmed", "activated"].includes(a.status) && (
            <form action={decide} className="mt-4 flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={a.id} />
              <input type="hidden" name="back" value={status} />
              <input name="note" maxLength={500} placeholder={a.status === "activated" ? "Motivo (obbligatorio per revocare)" : "Nota interna (facoltativa)"} className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
              {(a.status === "pending" || a.status === "declined") && <button name="decision" value="approve" className={btnPrimary}>Approva e invia mail</button>}
              {(a.status === "pending" || a.status === "approved") && <button name="decision" value="decline" className={btnGhost}>Rifiuta e invia mail</button>}
              {a.status === "approved" && <button name="decision" value="resend" className={btnGhost}>Reinvia mail di approvazione</button>}
              {(a.status === "approved" || a.status === "activated") && (
                <ConfirmButton name="decision" value="revoke" className={btnDanger}
                  message={a.status === "activated" ? "Revocare la beta? Il piano Pro Beta Testing finisce subito e l'utente torna a Free. Serve un motivo nella nota." : "Revocare l'approvazione? Serve un motivo nella nota."}>
                  Revoca dalla beta
                </ConfirmButton>
              )}
              {a.status !== "declined" && a.status !== "activated" && <button name="decision" value="cancel" className={btnDanger}>Annulla</button>}
            </form>
          )}
        </article>
      ))}
    </div>
  );
}
