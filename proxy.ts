import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  guardAdminRequest,
} from "@/lib/scorecard/admin/request-guard";

// Runs before every admin request (see matcher). Pages and server actions
// still re-check the session themselves; this is the outer gate.
export function proxy(request: NextRequest) {
  const decision = guardAdminRequest({
    method: request.method,
    pathname: request.nextUrl.pathname,
    host: request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    origin: request.headers.get("origin"),
    referer: request.headers.get("referer"),
    sessionCookie: request.cookies.get(SESSION_COOKIE)?.value,
  });

  if (decision.action === "forbid") {
    return new NextResponse("Forbidden", { status: 403 });
  }
  if (decision.action === "redirect") {
    return NextResponse.redirect(new URL(decision.location, request.url), 307);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/audit/admin", "/audit/admin/:path*"],
};
