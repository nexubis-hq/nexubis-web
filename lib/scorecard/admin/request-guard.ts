// Request-level guard for the admin area, run by proxy.ts before any admin
// page renders or any admin form post reaches a server action.
//
// 1. CSRF: every non-GET/HEAD request must carry an Origin (or, failing that,
//    a Referer) whose host matches the host it was sent to. Next.js already
//    rejects a mismatched Origin on server actions, but lets a request with no
//    Origin at all through; this closes that gap for the admin area.
// 2. Auth gate: signed-out visitors to any admin page other than the login
//    screen (/audit/admin) get a bare redirect, so no admin page content is
//    ever rendered or sent with the redirect.
import { SESSION_COOKIE, isValidSession } from "@/lib/scorecard/auth";

export const ADMIN_LOGIN_PATH = "/audit/admin";

export type GuardInput = {
  method: string;
  pathname: string;
  host: string | null;
  origin: string | null;
  referer: string | null;
  sessionCookie: string | undefined;
};

export type GuardDecision =
  | { action: "allow" }
  | { action: "forbid" }
  | { action: "redirect"; location: string };

function hostOf(value: string | null): string | null {
  if (!value || value === "null") return null;
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

export function sameOriginRequest(input: GuardInput): boolean {
  const host = input.host?.toLowerCase() ?? null;
  if (!host) return false;
  const sourceHost = hostOf(input.origin) ?? hostOf(input.referer);
  return sourceHost === host;
}

export function guardAdminRequest(input: GuardInput): GuardDecision {
  const method = input.method.toUpperCase();
  const safeMethod = method === "GET" || method === "HEAD";

  if (!safeMethod && !sameOriginRequest(input)) return { action: "forbid" };

  const isLoginScreen =
    input.pathname === ADMIN_LOGIN_PATH ||
    input.pathname === `${ADMIN_LOGIN_PATH}/`;
  if (safeMethod && !isLoginScreen && !isValidSession(input.sessionCookie)) {
    return { action: "redirect", location: ADMIN_LOGIN_PATH };
  }
  return { action: "allow" };
}

export { SESSION_COOKIE };
