"use server";

// Decisions on beta applications. Each one: gate (requireAdmin) → state change + audit row in ONE transaction
// → then the e-mail. A mail that fails does not undo the decision: the page says so and "Reinvia" retries it.
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { withTransaction } from "@/lib/db";
import { requireAdmin } from "@/lib/guard";
import { sendNotification } from "@/lib/notify";

type Row = { id: string; status: string; first_name: string; email: string; locale: string; user_id: string | null };
type Decision = "approve" | "decline" | "cancel" | "revoke" | "resend";

// status the application may be in for each decision, and the status it moves to
const RULES: Record<Exclude<Decision, "resend">, { from: string[]; to: string }> = {
  revoke: { from: ["approved", "activated"], to: "revoked" },
  approve: { from: ["pending", "declined"], to: "approved" },
  decline: { from: ["pending", "approved"], to: "declined" },
  cancel: { from: ["unconfirmed", "pending", "approved"], to: "cancelled" },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function site(): string {
  return (process.env.PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");
}

async function mailApproved(r: Row): Promise<void> {
  await sendNotification({
    type: "beta_approved",
    to: r.email,
    locale: r.locale,
    data: { first_name: r.first_name, email: r.email, login_url: `${site()}/login`, register_url: `${site()}/login?mode=register`, months: 3 },
  });
}

export async function decide(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "") as Decision;
  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null;
  const back = String(formData.get("back") ?? "pending");
  if (!UUID_RE.test(id) || !["approve", "decline", "cancel", "revoke", "resend"].includes(decision)) redirect(`/beta?status=${back}&flash=invalid`);

  // A revocation needs its reason on record (audit_logs + decision_note).
  if (decision === "revoke" && (note ?? "").length < 3) redirect(`/beta?status=${back}&flash=note_required`);

  let row: Row | null = null;
  let flash = "ok";

  if (decision === "resend") {
    row = await withTransaction(async (db) => {
      const { rows } = await db.query<Row>("SELECT id, status, first_name, email, locale, user_id FROM beta_testing_applications WHERE id = $1", [id]);
      if (!rows[0] || rows[0].status !== "approved") return null;
      await audit({ action: "beta.resend", targetType: "beta_application", targetId: id }, db);
      return rows[0];
    });
    if (!row) redirect(`/beta?status=${back}&flash=invalid`);
    try { await mailApproved(row); } catch { flash = "mail_failed"; }
    redirect(`/beta?status=${back}&flash=${flash}`);
  }

  const rule = RULES[decision];
  row = await withTransaction(async (db) => {
    const { rows } = await db.query<Row>(
      "SELECT id, status, first_name, email, locale, user_id FROM beta_testing_applications WHERE id = $1 FOR UPDATE",
      [id],
    );
    const current = rows[0];
    if (!current || !rule.from.includes(current.status)) return null;
    await db.query(
      "UPDATE beta_testing_applications SET status = $2, decided_at = now(), decision_note = $3, updated_at = now() WHERE id = $1",
      [id, rule.to, note],
    );
    // Revoking an activated beta ends the pro_beta plan now (status 'canceled' → resolvePlan() falls back to the
    // default plan). Only while the subscription is still pro_beta: someone who has since bought a plan keeps it.
    let planEnded = false;
    if (decision === "revoke" && current.user_id) {
      const ended = await db.query(
        "UPDATE subscriptions SET status = 'canceled', current_period_end = now(), updated_at = now() WHERE user_id = $1 AND plan = 'pro_beta' AND status = 'active'",
        [current.user_id],
      );
      planEnded = (ended.rowCount ?? 0) > 0;
    }
    await audit(
      {
        action: `beta.${decision}`, targetType: "beta_application", targetId: id,
        before: { status: current.status },
        after: decision === "revoke" ? { status: rule.to, note, plan_ended: planEnded, user_id: current.user_id } : { status: rule.to, note },
      },
      db,
    );
    return current;
  });
  if (!row) redirect(`/beta?status=${back}&flash=invalid`); // already decided elsewhere, or a status that doesn't allow it

  try {
    if (decision === "approve") await mailApproved(row);
    if (decision === "decline") {
      await sendNotification({ type: "beta_declined", to: row.email, locale: row.locale, data: { first_name: row.first_name } });
    }
  } catch (err) {
    console.error("[admin] beta mail failed:", err instanceof Error ? err.message : err);
    await audit({ action: "beta.mail_failed", targetType: "beta_application", targetId: id, after: { decision } }).catch(() => {});
    flash = "mail_failed";
  }
  redirect(`/beta?status=${back}&flash=${flash}`);
}
