// Inbound-reply webhook: a lead replied to a sequence email -> apply Pipeline:
// Nexubis | Replied (tag-only; Funnelr's Replied-exit automation does the rest).
//
// Provider-agnostic: whatever monitors the reply inbox (a Gmail Apps Script poller,
// an inbound-parse service like Mailgun/SendGrid, a Cloudflare Email Worker, or a
// manual call) just POSTs the sender address here. Secured with REPLY_WEBHOOK_SECRET.
//
// SAFE BY DEFAULT: reports only (dry-run) until REPLY_TAGGING_ENABLED === "true",
// and no-ops without FUNNELR_API_KEY — so it can be wired and tested before go-live.
import { NextRequest, NextResponse } from "next/server";
import { createFunnelrClient } from "@/lib/funnelr/client";
import { applyRepliedTag, extractEmail } from "@/lib/funnelr/reply-tagger";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Funnelr is slow.

function authorized(req: NextRequest): boolean {
  const secret = process.env.REPLY_WEBHOOK_SECRET;
  if (!secret) return false;
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  if (req.headers.get("x-reply-secret") === secret) return true;
  return req.nextUrl.searchParams.get("secret") === secret;
}

export async function POST(req: NextRequest) {
  if (!process.env.REPLY_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: "REPLY_WEBHOOK_SECRET not configured" }, { status: 503 });
  }
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Accept the common shapes inbound-parse services send: from / sender / email,
  // each possibly "Name <email>".
  const body = (await req.json().catch(() => null)) as { from?: string; sender?: string; email?: string } | null;
  const senderEmail = extractEmail(body?.from) ?? extractEmail(body?.sender) ?? extractEmail(body?.email);
  if (!senderEmail) {
    return NextResponse.json({ ok: false, error: "no sender email found" }, { status: 400 });
  }

  if (!process.env.FUNNELR_API_KEY) {
    return NextResponse.json({ ok: true, applied: false, skipped: "no-api-key" });
  }

  const dryRun = process.env.REPLY_TAGGING_ENABLED !== "true" || req.nextUrl.searchParams.get("dryRun") === "1";
  const result = await applyRepliedTag(senderEmail, { client: createFunnelrClient(), dryRun });

  return NextResponse.json(
    { ok: result.ok, applied: result.applied, reason: result.reason, ...(result.error ? { error: result.error } : {}) },
    { status: result.ok ? 200 : 500 },
  );
}
