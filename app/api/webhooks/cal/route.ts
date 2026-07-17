import { NextRequest, NextResponse } from "next/server";
import { handleCalWebhook } from "@/lib/cal-webhook/handler";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const result = await handleCalWebhook(rawBody, req.headers.get("x-cal-signature-256"));
  return NextResponse.json(result.body, { status: result.status });
}
