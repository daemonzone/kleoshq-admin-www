"use server";

// TOTP login. Layers: a lock after repeated failures (counted in audit_logs, per IP and overall), the
// code check (±1 step), no reuse of an accepted code (its time-step counter is stored in the audit row),
// then a signed 8-hour cookie. Every outcome is audited.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { audit, clientIp } from "@/lib/audit";
import { query } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/guard";
import { createSessionToken, SESSION_TTL_MS } from "@/lib/session-token";
import { verifyTotp } from "@/lib/totp";

const LOCK_WINDOW = "15 minutes";
const MAX_FAILS_PER_IP = 5;
const MAX_FAILS_TOTAL = 20;

export type LoginState = { error: "invalid" | "locked" | "config" | null };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const secret = process.env.ADMIN_TOTP_SECRET;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || !sessionSecret) {
    console.error("[admin] ADMIN_TOTP_SECRET / ADMIN_SESSION_SECRET are not set: login is disabled");
    return { error: "config" };
  }

  const ip = await clientIp();
  const fails = await query<{ by_ip: number; total: number }>(
    `SELECT count(*) FILTER (WHERE ip = $1) AS by_ip, count(*) AS total
       FROM audit_logs
      WHERE action = 'admin.login_failed' AND at > now() - interval '${LOCK_WINDOW}'`,
    [ip],
  );
  if (fails[0].by_ip >= MAX_FAILS_PER_IP || fails[0].total >= MAX_FAILS_TOTAL) {
    return { error: "locked" };
  }

  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  const counter = verifyTotp(secret, code);
  let replay = false;
  if (counter !== null) {
    const used = await query<{ n: number }>(
      "SELECT count(*) AS n FROM audit_logs WHERE action = 'admin.login' AND after->>'counter' = $1",
      [String(counter)],
    );
    replay = used[0].n > 0;
  }
  if (counter === null || replay) {
    await audit({ action: "admin.login_failed", after: { reason: replay ? "code_reused" : "bad_code" } });
    return { error: "invalid" };
  }

  await audit({ action: "admin.login", after: { counter } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, createSessionToken(sessionSecret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  redirect("/");
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  await audit({ action: "admin.logout" }).catch(() => {});
  redirect("/login");
}
