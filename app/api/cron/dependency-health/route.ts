// Scheduled dependency-health check. Runs the external-tool checks and emails
// hello@nexubis.io (MONITOR_ALERT_EMAIL) when one is low or failing, so a dry
// API account never again silently degrades the product (Serper credits running
// out stripped competitor benchmarks with no warning). Read-only: it only reads
// balances/validity and sends mail. Auth via CRON_SECRET (Vercel Cron sends it
// as a Bearer); add ?dryRun=1 to run the checks and see the JSON without mailing.
import { NextRequest, NextResponse } from "next/server";
import { getKv } from "@/lib/scorecard/kv";
import { sendResendEmail } from "@/lib/resend";
import {
  runDependencyChecks,
  problemsFrom,
  formatAlertEmail,
  alertRecipient,
  cooldownMs,
  alertStateKey,
  MONITOR_ALERT_TTL_S,
} from "@/lib/monitoring/dependency-health";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  // Allow manual triggering with ?secret= for testing.
  return req.nextUrl.searchParams.get("secret") === secret;
}

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";
  const checks = await runDependencyChecks();
  const problems = problemsFrom(checks);

  // Per-dependency cooldown so a persistent problem does not mail every run, but
  // a newly-affected dependency still alerts even if another alerted recently.
  let due = problems;
  if (problems.length && !dryRun) {
    const kv = getKv();
    const now = Date.now();
    const window = cooldownMs();
    const filtered: typeof problems = [];
    for (const p of problems) {
      const last = await kv.get<string>(alertStateKey(p.name)).catch(() => null);
      if (!last || now - new Date(last).getTime() > window) filtered.push(p);
    }
    due = filtered;
  }

  let emailed = false;
  if (due.length && !dryRun) {
    const healthy = checks.filter((c) => c.status === "ok");
    const { subject, text } = formatAlertEmail(due, healthy);
    emailed = await sendResendEmail({ to: [alertRecipient()], subject, text });
    if (emailed) {
      const kv = getKv();
      const stamp = new Date().toISOString();
      await Promise.all(due.map((p) => kv.set(alertStateKey(p.name), stamp, { ex: MONITOR_ALERT_TTL_S })));
    } else {
      // The alert channel itself failed: make it loud in the logs at least.
      console.error("[dependency-health] problems found but alert email failed to send:", due.map((p) => p.name).join(", "));
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    checks,
    problems: problems.length,
    alerted: due.map((p) => p.name),
    emailed,
  });
}
