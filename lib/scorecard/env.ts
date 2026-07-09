// Environment surface for the Scorecard engine, in one module so every key is
// documented, validated and mockable in a single place. Nothing here hard-crashes
// at import time: the rest of the site must build and run without Scorecard keys.
// Routes validate at call time and degrade gracefully.
//
// CREDENTIAL POLICY (from the Part 2B build pack). We deliberately reuse the
// LekkeWeb accounts and keys for: ANTHROPIC_API_KEY, SERPER_API_KEY,
// SCREENSHOTONE_ACCESS_KEY / SCREENSHOTONE_SECRET_KEY, PAGESPEED_API_KEY and
// RENDER_API_KEY. Three exceptions where the same value would break or leak
// across products:
//   1. KV_REST_API_URL / KV_REST_API_TOKEN: same Upstash account but a NEW
//      database for Nexubis. Sharing the LekkeWeb instance would mix rate
//      limits, run records and leads between the two tools. warnSharedInfra()
//      shouts if the known LekkeWeb host shows up here.
//   2. RESEND_API_KEY: same Resend account is fine, but sending MUST come from
//      a verified nexubis.io domain and NEXUBIS_TEAM_EMAIL, never the
//      lekkeweb.co.za sender.
//   3. TURNSTILE keys: domain-scoped. Either add nexubis.io as a hostname on
//      the existing widget or create a new site key pair. The LekkeWeb pair
//      will not validate on nexubis.io as-is.
// SCORECARD_ADMIN_PASSWORD and SCORECARD_SESSION_SECRET are generated fresh,
// never reused from LekkeWeb's internal auth. FUNNELR_* is Nexubis-specific.

export const MODEL_HAIKU = process.env.ANTHROPIC_MODEL_HAIKU || "claude-haiku-4-5-20251001";
export const MODEL_SONNET = process.env.ANTHROPIC_MODEL_SONNET || "claude-sonnet-4-6";
export const TEAM_EMAIL = process.env.NEXUBIS_TEAM_EMAIL || "hello@nexubis.io";

// Token pricing per 1M tokens (USD), for the per-run cost log. Update alongside
// model IDs if the models change.
export const PRICE_PER_MTOK = {
  haiku: { input: 1.0, output: 5.0 },
  sonnet: { input: 3.0, output: 15.0 },
} as const;

// Mock mode: the whole pipeline runs locally with zero API spend. Canned,
// input-varying content from mock.ts. Read at call time (not module init) so
// tests can toggle per case.
export function isMockMode(): boolean {
  return process.env.SCORECARD_MOCK === "1";
}

// Email 1 fallback flag: while Funnelr is not live, the tool itself sends the
// on-submit confirmation via Resend. Once Funnelr owns the sequence this stays
// false and the tool never emails the lead.
export function shouldSendEmail1(): boolean {
  return process.env.SCORECARD_SEND_EMAIL1 === "true";
}

// The full env surface, grouped by subsystem. Used by envReport() and the
// launch checklist so nothing is forgotten at deploy time.
export const ENV_SURFACE = {
  ai: ["ANTHROPIC_API_KEY"],
  retrieval: ["SERPER_API_KEY"],
  screenshots: ["SCREENSHOTONE_ACCESS_KEY", "SCREENSHOTONE_SECRET_KEY"],
  pagespeed: ["PAGESPEED_API_KEY"],
  jsRender: ["RENDER_API_KEY"],
  kv: ["KV_REST_API_URL", "KV_REST_API_TOKEN"],
  email: ["RESEND_API_KEY", "NEXUBIS_TEAM_EMAIL"],
  botCheck: ["NEXT_PUBLIC_TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"],
  funnelr: ["FUNNELR_WEBHOOK_URL", "FUNNELR_WEBHOOK_SECRET"],
  admin: ["SCORECARD_ADMIN_PASSWORD", "SCORECARD_SESSION_SECRET"],
} as const;

export type EnvSubsystem = keyof typeof ENV_SURFACE;

export interface EnvCheck {
  ok: boolean;
  missing: string[];
}

// Which keys of a subsystem are missing. Mock mode reports everything present,
// because mock mode needs nothing.
export function checkEnv(...subsystems: EnvSubsystem[]): EnvCheck {
  if (isMockMode()) return { ok: true, missing: [] };
  const missing: string[] = [];
  for (const sub of subsystems) {
    for (const key of ENV_SURFACE[sub]) {
      if (!process.env[key]) missing.push(key);
    }
  }
  return { ok: missing.length === 0, missing };
}

// Call-time guard for a route that cannot run without its keys. The error
// message names exactly what is missing so misconfiguration is a 10-second fix.
export function requireEnv(...subsystems: EnvSubsystem[]): void {
  const check = checkEnv(...subsystems);
  if (!check.ok) {
    throw new Error(
      `Scorecard env missing: ${check.missing.join(", ")}. ` +
        `See lib/scorecard/env.ts for the credential policy (which keys reuse LekkeWeb accounts and which must be Nexubis-specific).`,
    );
  }
}

// The known LekkeWeb infrastructure values that must NEVER appear in the
// Nexubis env. If they do, the two products would share rate limits, leads and
// sender identity. Called from the KV client and the unlock plumbing.
const LEKKEWEB_KV_HOST = "climbing-hagfish-95991";
const LEKKEWEB_EMAIL_DOMAIN = "lekkeweb.co.za";

export function warnSharedInfra(): string[] {
  const warnings: string[] = [];
  if ((process.env.KV_REST_API_URL ?? "").includes(LEKKEWEB_KV_HOST)) {
    warnings.push(
      "KV_REST_API_URL points at the LekkeWeb Upstash database. Create a NEW database for Nexubis (same account is fine); sharing the instance mixes rate limits, run records and leads between the two tools.",
    );
  }
  if ((process.env.NEXUBIS_TEAM_EMAIL ?? "").endsWith(LEKKEWEB_EMAIL_DOMAIN)) {
    warnings.push(
      "NEXUBIS_TEAM_EMAIL is a lekkeweb.co.za address. Sending must come from a verified nexubis.io identity.",
    );
  }
  for (const w of warnings) console.warn(`[scorecard-env] ${w}`);
  return warnings;
}

// One line per subsystem: set / MISSING / mocked. Powers the launch checklist
// and the admin diagnostics view.
export function envReport(): Array<{ subsystem: EnvSubsystem; ok: boolean; missing: string[] }> {
  return (Object.keys(ENV_SURFACE) as EnvSubsystem[]).map((subsystem) => {
    const { ok, missing } = checkEnv(subsystem);
    return { subsystem, ok, missing };
  });
}
