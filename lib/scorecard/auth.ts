import { createHash, timingSafeEqual } from "node:crypto";

// Shared-password gate for the Scorecard admin area. Fresh Nexubis values
// only (SCORECARD_ADMIN_PASSWORD / SCORECARD_SESSION_SECRET are generated for
// this product, never reused from other tools, per the credential policy).

export const SESSION_COOKIE = "scorecard_admin_session";

// Deterministic session token derived from the password + a server secret.
// The cookie stores this hash; every admin request recomputes and compares.
export function expectedSessionToken(): string {
  const password = process.env.SCORECARD_ADMIN_PASSWORD ?? "";
  const secret = process.env.SCORECARD_SESSION_SECRET ?? "";
  return createHash("sha256").update(`${password}:${secret}`).digest("hex");
}

export function isValidSession(token: string | undefined | null): boolean {
  if (!token) return false;
  const expected = expectedSessionToken();
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function adminConfigured(): boolean {
  return Boolean(process.env.SCORECARD_ADMIN_PASSWORD && process.env.SCORECARD_SESSION_SECRET);
}

export function passwordMatches(candidate: string): boolean {
  const password = process.env.SCORECARD_ADMIN_PASSWORD ?? "";
  if (!password || !candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(password);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
