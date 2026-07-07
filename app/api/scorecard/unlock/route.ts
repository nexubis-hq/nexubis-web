// The unlock endpoint: name, work email and role unlock the full report. On
// success the run record is promoted to its permanent shared slug. The lead
// plumbing (KV lead record, Funnelr webhook, team notification, Email 1
// fallback) chains after the promote and never blocks the user's unlock.
import { NextRequest, NextResponse } from "next/server";
import { validateUnlockInput, verifyTurnstile, promoteRun, type UnlockInput } from "@/lib/scorecard/unlock";

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
    const outcome = await promoteRun(input);
    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    }
    // Lead plumbing chains here (fire-and-forget) once the unlock prompt
    // lands: lead record, Funnelr webhook, team notification, Email 1 flag.
    return NextResponse.json({ reportUrl: outcome.reportUrl, slug: outcome.slug });
  } catch (err) {
    console.error("[scorecard-unlock] failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Something went wrong on our side. Give it another try in a moment." }, { status: 500 });
  }
}
