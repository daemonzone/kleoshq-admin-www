import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/session-token";

export const SESSION_COOKIE = "sw_admin";

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value, process.env.ADMIN_SESSION_SECRET);
}

/** Every page and every server action calls this itself: the proxy is a convenience, not the only gate. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/login");
}
