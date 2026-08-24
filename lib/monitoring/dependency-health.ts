// Dependency health monitor. A scheduled cron runs these checks and emails
// hello@nexubis.io when an external tool the site depends on is running low or
// has stopped answering. Born from a live incident: the Serper search account
// silently ran out of credits, which quietly stripped competitor benchmarks
// from every Scorecard report with nothing to warn us.
//
// Coverage is honest about what each provider exposes:
//   - Serper and ScreenshotOne bill in credits and expose a live balance, so we
//     threshold on the actual number remaining.
//   - Anthropic has no balance endpoint (usage-based billing). With an Admin key
//     + a monthly budget we threshold on month-to-date SPEND via the Admin cost
//     report; without them we fall back to validating the key is live.
//   - PageSpeed and Resend are validated for a live key (no balance to read).
//   - Upstash (the KV store behind runs, leads and dedupe) gets a health ping.
// Free or gracefully-degrading dependencies (Turnstile, Funnelr, Sanity, the JS
// render key) are deliberately NOT alerted here. Adding a provider is one entry
// in runDependencyChecks(); keep each check resilient (never throw).

export type CheckStatus = "ok" | "low" | "error";

export interface DependencyCheck {
  name: string;
  status: CheckStatus;
  /** One line explaining the status, shown in the email. */
  message: string;
  /** Remaining balance/headroom, when the provider exposes one. */
  balance?: number;
  /** The threshold that was compared against. */
  threshold?: number;
}

type Opts = { fetchImpl?: typeof fetch };

const ALERT_TTL_S = 7 * 24 * 60 * 60; // cooldown-state key lifetime
const SERPER_DEFAULT_LOW = 5000; // credits; a scan spends ~5-30 in searches
const SCREENSHOTONE_DEFAULT_LOW = 200; // screenshots; a scan spends ~2-8

// Shared shape for the credit-balance providers: compare a live number to a
// threshold and phrase it the same way.
function balanceResult(name: string, balance: number, threshold: number, unit: string, whenEmpty: string): DependencyCheck {
  if (balance < threshold) {
    return { name, status: "low", message: `only ${balance.toLocaleString()} ${unit} left (alert threshold ${threshold.toLocaleString()}). ${whenEmpty}`, balance, threshold };
  }
  return { name, status: "ok", message: `${balance.toLocaleString()} ${unit}.`, balance, threshold };
}

// ── Serper: web search behind competitor discovery, resolution and offsite ────
export async function checkSerper(opts: Opts = {}): Promise<DependencyCheck> {
  const name = "Serper (web search)";
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return { name, status: "error", message: "SERPER_API_KEY is not set." };
  const threshold = Number(process.env.SERPER_LOW_BALANCE) || SERPER_DEFAULT_LOW;
  const f = opts.fetchImpl ?? fetch;
  try {
    const res = await f("https://google.serper.dev/account", { headers: { "X-API-KEY": apiKey } });
    if (!res.ok) return { name, status: "error", message: `/account returned ${res.status}.` };
    const body = (await res.json()) as { balance?: number };
    const balance = Number(body?.balance);
    if (!Number.isFinite(balance)) return { name, status: "error", message: "/account returned no balance." };
    return balanceResult(name, balance, threshold, "credits", "Competitor benchmarks and offsite evidence stop when this hits zero.");
  } catch (err) {
    return { name, status: "error", message: `check failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ── ScreenshotOne: the first-impression desktop + mobile screenshots ─────────
export async function checkScreenshotOne(opts: Opts = {}): Promise<DependencyCheck> {
  const name = "ScreenshotOne (screenshots)";
  const accessKey = process.env.SCREENSHOTONE_ACCESS_KEY;
  if (!accessKey) return { name, status: "error", message: "SCREENSHOTONE_ACCESS_KEY is not set." };
  const threshold = Number(process.env.SCREENSHOTONE_LOW_BALANCE) || SCREENSHOTONE_DEFAULT_LOW;
  const f = opts.fetchImpl ?? fetch;
  try {
    const res = await f(`https://api.screenshotone.com/usage?access_key=${encodeURIComponent(accessKey)}`);
    if (!res.ok) return { name, status: "error", message: `/usage returned ${res.status}.` };
    const body = (await res.json()) as { available?: number };
    const available = Number(body?.available);
    if (!Number.isFinite(available)) return { name, status: "error", message: "/usage returned no available count." };
    return balanceResult(name, available, threshold, "screenshots", "First-impression reads fall back to blank when this hits zero.");
  } catch (err) {
    return { name, status: "error", message: `check failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ── Anthropic: scoring + copy + detection. ───────────────────────────────────
// No balance endpoint exists. With an Admin key (sk-ant-admin...) and a monthly
// budget we threshold on month-to-date spend via the Admin cost report; else we
// validate the ordinary key. Set ANTHROPIC_ADMIN_KEY + ANTHROPIC_MONTHLY_BUDGET_USD
// to switch on the spend view.
export function monthStartIso(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

// Sum every cost item's `amount` (a decimal string in cents) across all buckets.
export function sumCostCents(body: unknown): number {
  const data = (body as { data?: Array<{ results?: Array<{ amount?: string }> }> })?.data;
  if (!Array.isArray(data)) return 0;
  let cents = 0;
  for (const bucket of data) {
    for (const r of bucket?.results ?? []) {
      const n = Number(r?.amount);
      if (Number.isFinite(n)) cents += n;
    }
  }
  return cents;
}

export async function checkAnthropic(opts: Opts & { now?: Date } = {}): Promise<DependencyCheck> {
  const name = "Anthropic (Claude)";
  const f = opts.fetchImpl ?? fetch;
  const adminKey = process.env.ANTHROPIC_ADMIN_KEY;
  const budget = Number(process.env.ANTHROPIC_MONTHLY_BUDGET_USD);

  // Spend-vs-budget (opt-in): needs an Admin key AND a budget.
  if (adminKey && Number.isFinite(budget) && budget > 0) {
    try {
      const startingAt = monthStartIso(opts.now ?? new Date());
      const url = `https://api.anthropic.com/v1/organizations/cost_report?starting_at=${startingAt}&bucket_width=1d&limit=31`;
      const res = await f(url, { headers: { "x-api-key": adminKey, "anthropic-version": "2023-06-01" } });
      if (res.status === 401 || res.status === 403) return { name, status: "error", message: `Admin key rejected (${res.status}); cannot read spend.` };
      if (!res.ok) return { name, status: "error", message: `cost report returned ${res.status}.` };
      const usd = sumCostCents(await res.json()) / 100;
      const remaining = budget - usd;
      const spent = `$${usd.toFixed(2)} of $${budget.toFixed(0)} this month`;
      if (remaining <= 0) return { name, status: "low", message: `spend ${spent} — budget reached. Scans stop if the account's own cap is hit.`, balance: Number(remaining.toFixed(2)), threshold: budget };
      if (remaining <= budget * 0.15) return { name, status: "low", message: `spend ${spent} ($${remaining.toFixed(2)} of budget left).`, balance: Number(remaining.toFixed(2)), threshold: budget };
      return { name, status: "ok", message: `spend ${spent}.`, balance: Number(remaining.toFixed(2)), threshold: budget };
    } catch (err) {
      return { name, status: "error", message: `spend check failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  // Validity (default): the ordinary key can list models but cannot read spend.
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { name, status: "error", message: "ANTHROPIC_API_KEY is not set." };
  try {
    const res = await f("https://api.anthropic.com/v1/models?limit=1", { headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" } });
    if (res.status === 401 || res.status === 403) return { name, status: "error", message: `key rejected (${res.status}). Scans cannot score without it.` };
    if (!res.ok) return { name, status: "error", message: `API returned ${res.status}.` };
    return { name, status: "ok", message: "key valid (set ANTHROPIC_ADMIN_KEY + ANTHROPIC_MONTHLY_BUDGET_USD for spend alerts)." };
  } catch (err) {
    return { name, status: "error", message: `check failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ── PageSpeed (Google): site speed. Free quota; validate the key only. ───────
// Tolerant: only a rejected key is an error. Timeouts, quota (429) and transient
// 5xx are not alarmed — PageSpeed degrades gracefully and resets its quota daily.
export async function checkPageSpeed(opts: Opts = {}): Promise<DependencyCheck> {
  const name = "PageSpeed (Google)";
  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) return { name, status: "error", message: "PAGESPEED_API_KEY is not set." };
  const f = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const url = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://example.com&strategy=mobile&key=${encodeURIComponent(apiKey)}`;
    const res = await f(url, { signal: controller.signal });
    if (res.status === 400 || res.status === 403) return { name, status: "error", message: `key rejected (${res.status}); site-speed scoring falls back to not-assessable.` };
    return { name, status: "ok", message: res.ok ? "key valid." : `reachable (HTTP ${res.status}); key not rejected.` };
  } catch {
    // Timeout / network blip: PageSpeed is slow and non-critical; do not alarm.
    return { name, status: "ok", message: "not verified this run (slow or unreachable); non-critical." };
  } finally {
    clearTimeout(timer);
  }
}

// ── Upstash KV: runs, leads, dedupe, the scan log. A dead store loses leads. ──
export async function checkUpstash(opts: Opts = {}): Promise<DependencyCheck> {
  const name = "Upstash KV (store)";
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return { name, status: "error", message: "KV_REST_API_URL / KV_REST_API_TOKEN not set; runs and leads cannot persist." };
  const f = opts.fetchImpl ?? fetch;
  try {
    const res = await f(`${url.replace(/\/$/, "")}/ping`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return { name, status: "error", message: `ping returned ${res.status}.` };
    return { name, status: "ok", message: "reachable." };
  } catch (err) {
    return { name, status: "error", message: `ping failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ── Resend: delivery email + these alerts. Tolerant of send-scoped keys. ─────
export async function checkResend(opts: Opts = {}): Promise<DependencyCheck> {
  const name = "Resend (email)";
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { name, status: "error", message: "RESEND_API_KEY is not set." };
  const f = opts.fetchImpl ?? fetch;
  try {
    const res = await f("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${apiKey}` } });
    if (res.ok) return { name, status: "ok", message: "key valid." };
    // A sending-only key legitimately cannot read /domains — not a dead key.
    if (res.status === 401 || res.status === 403) return { name, status: "ok", message: "send-scoped key (cannot read /domains); exercised by every email." };
    return { name, status: "error", message: `API returned ${res.status} (report delivery and these alerts depend on it).` };
  } catch (err) {
    return { name, status: "error", message: `check failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// The registry. Add a provider here and it is monitored.
export async function runDependencyChecks(opts: Opts = {}): Promise<DependencyCheck[]> {
  return Promise.all([
    checkSerper(opts),
    checkScreenshotOne(opts),
    checkAnthropic(opts),
    checkPageSpeed(opts),
    checkUpstash(opts),
    checkResend(opts),
  ]);
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
