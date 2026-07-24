// Daily cron: sales -> nurture handoff. Applies ONLY the nurture Trigger tag to
// eligible leads; Funnelr automations do the rest (Shannah's handover doc, ISSUE 2).
//
// SAFE BY DEFAULT: writes nothing unless FUNNELR_NURTURE_ENABLED === "true". While
// the Nexubis sequences are paused during setup this stays a dry-run, so it can be
// wired to the cron now without risk (the doc warns not to hand off while a
// sequence is paused). Auth via CRON_SECRET (Vercel Cron sends it as a Bearer).
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createFunnelrClient } from "@/lib/funnelr/client";
import { getKv } from "@/lib/scorecard/kv";
import { listLeads } from "@/lib/scorecard/leads";
import {
  runNurtureHandoff,
  DEFAULT_NURTURE_AFTER_DAYS,
  type NurtureLead,
} from "@/lib/funnelr/nurture-scheduler";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Funnelr is slow (20-100s+ per call); process sequentially.

const HANDOFF_TTL_S = 60 * 86_400; // 60 days: long enough to cover the automation window.
const handoffKey = (email: string) => `funnelr-nurture-handoff:${createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 24)}`;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  // Allow manual triggering with ?secret= for testing.
  return req.nextUrl.searchParams.get("secret") === secret;
}

function parseFrom(): Date | null {
  const raw = process.env.FUNNELR_NURTURE_FROM?.trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.FUNNELR_API_KEY) {
    return NextResponse.json({ ok: true, skipped: "no-api-key" });
  }

  // Enabled = actually apply tags. Otherwise (or with ?dryRun=1) report only.
  const enabled = process.env.FUNNELR_NURTURE_ENABLED === "true";
  const dryRun = !enabled || req.nextUrl.searchParams.get("dryRun") === "1";

  const afterDays = Number(process.env.FUNNELR_NURTURE_AFTER_DAYS) || DEFAULT_NURTURE_AFTER_DAYS;
  const kv = getKv();

  let result;
  try {
    result = await runNurtureHandoff({
      client: createFunnelrClient(),
      listLeads: async (): Promise<NurtureLead[]> =>
        (await listLeads(10_000)).map((l) => ({ email: l.email, createdAt: l.createdAt, reportSlug: l.reportSlug })),
      now: new Date(),
      config: { afterDays, from: parseFrom() },
      alreadyHandedOff: async (lead) => Boolean(await kv.get<string>(handoffKey(lead.email))),
      markHandedOff: async (lead) => {
        await kv.set(handoffKey(lead.email), new Date().toISOString(), { ex: HANDOFF_TTL_S });
      },
      dryRun,
    });
  } catch (err) {
    console.error("[nurture-handoff] run failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: "nurture handoff failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, enabled, ...result });
}
