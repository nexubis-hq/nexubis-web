// The team/test-email suppression list, in ONE place, driven by one env var so
// internal traffic never pollutes conversions, the CRM, or lead alerts. Every
// leg (Meta CAPI, cal.com relay, future Funnelr bridge, notify) checks this.
// See docs/funnel-audit-checklist.md §3 (AUDIT_INTERNAL_EMAILS) and §9.
//
// Default-safe: if the env is unset we still suppress the known internal
// addresses, so a forgotten env var can't silently send team test runs to Meta.
import { TEAM_EMAIL } from "./scorecard/env";

const BUILTIN_INTERNAL = [TEAM_EMAIL, "hello@nexubis.io", "shannah@nexubis.io"];

// Parse a comma list, lowercase, trim, drop blanks. NEVER trust `?? fallback`
// against an env that may be "" — an empty string is not unset (§4, §7).
function parseList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function internalEmailSet(): Set<string> {
  const configured = parseList(process.env.AUDIT_INTERNAL_EMAILS);
  return new Set([...BUILTIN_INTERNAL.map((e) => e.toLowerCase()), ...configured]);
}

export function isInternalEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return internalEmailSet().has(email.trim().toLowerCase());
}
