// The unlock endpoint: name, work email and role unlock the full report. On
// success the run record is promoted to its permanent shared slug, and the
// lead plumbing (KV lead record, signed Funnelr webhook with retries, team
// notification, flag-gated Email 1) runs AFTER the response via after(), so
// the user's unlock never waits on it. Double submits are idempotent: the
// same email + run returns the same link and fires nothing twice.
import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import {
  validateUnlockInput,
  verifyTurnstile,
  promoteRun,
  readExistingUnlock,
  markUnlocked,
  runLeadPlumbing,
  type UnlockInput,
} from "@/lib/scorecard/unlock";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function parse(body: unknown): UnlockInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.runId !== "string" || b.runId.length === 0 || b.runId.length > 64) return null;
  return {
    runId: b.runId,
    firstName: typeof b.firstName === "string" ? b.firstName : "",
    email: typeof b.email === "string" ? b.email : "",
    role: typeof b.role === "string" ? b.role : "",
    honeypot: typeof b.honeypot === "string" ? b.honeypot : "",
    turnstileToken: typeof b.turnstileToken === "string" ? b.turnstileToken : undefined,
    elapsedMs: typeof b.elapsedMs === "number" ? b.elapsedMs : undefined,
  };
}

function originOf(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "https://www.nexubis.io";
}

export async function POST(req: NextRequest) {
  const input = parse(await req.json().catch(() => null));
  if (!input) {
    return NextResponse.json({ error: "Something went wrong with the form. Reload and try again." }, { status: 400 });
  }

  const validation = validateUnlockInput(input);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null;
  const human = await verifyTurnstile(input.turnstileToken, ip);
  if (!human) {
    return NextResponse.json({ error: "The bot check did not pass. Reload the page and try again." }, { status: 400 });
  }

  try {
    // Idempotency: a repeat unlock returns the existing link, fires nothing.
    const existing = await readExistingUnlock(input);
    if (existing) {
      return NextResponse.json({ reportUrl: `/audit/r/${existing}`, slug: existing });
    }

    const outcome = await promoteRun(input);
    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    }
    await markUnlocked(input, outcome.slug);

    const origin = originOf(req);
    after(async () => {
      try {
        await runLeadPlumbing(outcome.record, input, outcome.slug, origin);
      } catch (err) {
        console.error("[scorecard-unlock] lead plumbing failed:", err instanceof Error ? err.message : err);
      }
    });

    return NextResponse.json({ reportUrl: outcome.reportUrl, slug: outcome.slug });
  } catch (err) {
    console.error("[scorecard-unlock] failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Something went wrong on our side. Give it another try in a moment." }, { status: 500 });
  }
}
