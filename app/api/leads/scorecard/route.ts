import { NextRequest, NextResponse } from "next/server";
import { normalizeScorecardLeadInput, scorecardSlugFromReportUrl, submitScorecardLeadToFunnelr, type ScorecardLeadInput } from "@/lib/scorecard/lead-funnelr";
import { readShared } from "@/lib/scorecard/share";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function originOf(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "https://www.nexubis.io";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const validation = normalizeScorecardLeadInput(body);
  if ("error" in validation) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  let savedReport: Awaited<ReturnType<typeof readShared>> | null = null;
  if (validation.reportUrl) {
    const slug = scorecardSlugFromReportUrl(validation.reportUrl, originOf(req));
    if (!slug) {
      return NextResponse.json({ ok: false, error: "Report URL is not a valid Nexubis Scorecard URL." }, { status: 400 });
    }
    savedReport = await readShared(slug).catch(() => null);
    if (!savedReport) {
      return NextResponse.json({ ok: false, error: "Report URL does not match a saved Scorecard." }, { status: 400 });
    }
  }

  const lead: ScorecardLeadInput = {
    firstName: validation.firstName,
    lastName: validation.lastName,
    email: validation.email,
    company: validation.company ?? savedReport?.result.meta.company,
    marketingConsent: validation.marketingConsent,
    reportUrl: validation.reportUrl,
  };

  const result = await submitScorecardLeadToFunnelr(lead);
  if (!result.ok) {
    console.error("[scorecard-lead] Funnelr integration failed:", result.error);
    return NextResponse.json({ ok: false, error: "Lead capture is temporarily unavailable." }, { status: 200 });
  }

  return NextResponse.json({
    ok: true,
    listMembershipConfirmed: result.listMembershipConfirmed,
    customFieldsUpdated: result.customFieldsUpdated,
    missingCustomFields: result.missingCustomFields,
  });
}
