import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/session-token";

// First gate: anything but /login needs a valid session cookie. Pages and actions check again (lib/guard.ts).
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/login") return NextResponse.next();
  const ok = verifySessionToken(request.cookies.get("sw_admin")?.value, process.env.ADMIN_SESSION_SECRET);
  if (ok) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
