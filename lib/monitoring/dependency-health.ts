// Dependency health monitor. A scheduled cron runs these checks and emails
// hello@nexubis.io when an external tool the site depends on is running low or
// has stopped answering. Born from a live incident: the Serper search account
// silently ran out of credits, which quietly stripped competitor benchmarks
// from every Scorecard report with nothing to warn us.
//
// Coverage is honest about what each provider exposes:
//   - Serper bills in credits and exposes a balance, so we threshold on it.
//   - Anthropic and Resend are postpaid / quota and expose no simple balance,
//     so we validate the key is live (a dead key is the failure we can catch).
// Adding a provider is one entry in runDependencyChecks(); keep each check
// resilient (never throw) so one bad provider cannot mask the others.

export type CheckStatus = "ok" | "low" | "error";

export interface DependencyCheck {
  /** Human name, used in the alert email. */
  name: string;
  status: CheckStatus;
  /** One line explaining the status, shown in the email. */
  message: string;
  /** Remaining balance, when the provider exposes one (Serper). */
  balance?: number;
  /** The low-balance threshold that was compared against. */
  threshold?: number;
}

type Opts = { fetchImpl?: typeof fetch };

const SERPER_DEFAULT_LOW = 5000; // credits; a scan spends ~5-30, so this is real runway
const ALERT_TTL_S = 7 * 24 * 60 * 60; // cooldown-state key lifetime

// ── Serper: web search behind competitor discovery, resolution and offsite ────
export async function checkSerper(opts: Opts = {}): Promise<DependencyCheck> {
  const name = "Serper (web search)";
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return { name, status: "error", message: "SERPER_API_KEY is not set." };
  const threshold = Number(process.env.SERPER_LOW_BALANCE) || SERPER_DEFAULT_LOW;
  const f = opts.fetchImpl ?? fetch;
  try {
    const res = await f("https://google.serper.dev/account", { headers: { "X-API-KEY": apiKey } });
    if (!res.ok) return { name, status: "error", message: `Serper /account returned ${res.status}.` };
    const body = (await res.json()) as { balance?: number };
    const balance = Number(body?.balance);
    if (!Number.isFinite(balance)) return { name, status: "error", message: "Serper /account returned no balance." };
    if (balance < threshold) {
      return { name, status: "low", message: `only ${balance.toLocaleString()} credits left (alert threshold ${threshold.toLocaleString()}). Competitor benchmarks and offsite evidence stop when this hits zero.`, balance, threshold };
    }
    return { name, status: "ok", message: `${balance.toLocaleString()} credits.`, balance, threshold };
  } catch (err) {
    return { name, status: "error", message: `check failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ── Anthropic: the scoring and copy models. No public balance; validate the key.
export async function checkAnthropic(opts: Opts = {}): Promise<DependencyCheck> {
  const name = "Anthropic (Claude)";
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { name, status: "error", message: "ANTHROPIC_API_KEY is not set." };
  const f = opts.fetchImpl ?? fetch;
  try {
    const res = await f("https://api.anthropic.com/v1/models?limit=1", {
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    });
    if (res.status === 401 || res.status === 403) return { name, status: "error", message: `key rejected (${res.status}). Scans cannot score without it.` };
    if (!res.ok) return { name, status: "error", message: `API returned ${res.status}.` };
    return { name, status: "ok", message: "key valid (no balance API; watch spend in the console)." };
  } catch (err) {
    return { name, status: "error", message: `check failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ── Resend: delivery email + these very alerts. ──────────────────────────────
// There is no read endpoint a sending-scoped key can hit, so 401/403 on
// /domains means "restricted key, cannot verify" NOT "dead key": we must not
// alert on it or a perfectly good send-only key would cry wolf every run. Only
// a hard outage (5xx) or a network failure is a real error. The key's true
// health is exercised by every lead and alert email regardless.
export async function checkResend(opts: Opts = {}): Promise<DependencyCheck> {
  const name = "Resend (email)";
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { name, status: "error", message: "RESEND_API_KEY is not set." };
  const f = opts.fetchImpl ?? fetch;
  try {
    const res = await f("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${apiKey}` } });
    if (res.ok) return { name, status: "ok", message: "key valid." };
    if (res.status === 401 || res.status === 403) {
      return { name, status: "ok", message: "send-scoped key (cannot read /domains); exercised by every email." };
    }
    return { name, status: "error", message: `API returned ${res.status} (report delivery and these alerts depend on it).` };
  } catch (err) {
    return { name, status: "error", message: `check failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// The registry. Add a provider here and it is monitored.
export async function runDependencyChecks(opts: Opts = {}): Promise<DependencyCheck[]> {
  return Promise.all([checkSerper(opts), checkAnthropic(opts), checkResend(opts)]);
}

export function problemsFrom(checks: DependencyCheck[]): DependencyCheck[] {
  return checks.filter((c) => c.status !== "ok");
}

// The alert email body. Leads with what is low or failing; the healthy ones are
// summarised at the foot so a glance confirms the rest is fine.
export function formatAlertEmail(problems: DependencyCheck[], healthy: DependencyCheck[]): { subject: string; text: string } {
  const low = problems.filter((p) => p.status === "low").length;
  const failing = problems.filter((p) => p.status === "error").length;
  const bits: string[] = [];
  if (low) bits.push(`${low} running low`);
  if (failing) bits.push(`${failing} failing`);
  const subject = `Nexubis tools: ${bits.join(", ") || "attention needed"}`;

  const lines = ["A scheduled check found tool dependencies that need attention:", ""];
  for (const p of problems) lines.push(`• ${p.name} — ${p.status.toUpperCase()}: ${p.message}`);
  if (healthy.length) {
    lines.push("", "Healthy:");
    for (const h of healthy) lines.push(`• ${h.name} — ${h.message}`);
  }
  lines.push("", "Top up or check the relevant account. Automated alert from the Nexubis dependency monitor.");
  return { subject, text: lines.join("\n") };
}

export function alertRecipient(): string {
  return (process.env.MONITOR_ALERT_EMAIL || "hello@nexubis.io").trim();
}

export function cooldownMs(): number {
  // Default 20h so a daily cron always alerts while a problem persists, but a
  // manual re-trigger within the day does not spam.
  return (Number(process.env.MONITOR_ALERT_COOLDOWN_HOURS) || 20) * 60 * 60 * 1000;
}

export function alertStateKey(name: string): string {
  return `monitor-alert:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

export const MONITOR_ALERT_TTL_S = ALERT_TTL_S;
