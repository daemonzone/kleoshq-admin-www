import "server-only";

// kleoshq-notifications client (POST /api/send). Throws when the mail could not be sent: the admin must know.
export async function sendNotification(input: {
  type: "beta_approved" | "beta_declined";
  to: string;
  locale: string;
  data: Record<string, unknown>;
}): Promise<void> {
  const base = process.env.NOTIFICATIONS_SERVICE_URL;
  const secret = process.env.NOTIFICATIONS_INTERNAL_SECRET;
  if (!base || !secret) throw new Error("notifications service not configured");
  const res = await fetch(`${base.replace(/\/+$/, "")}/api/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`notifications ${res.status}`);
}
