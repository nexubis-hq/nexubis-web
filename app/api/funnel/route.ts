import { isTrackingHost } from "@/lib/meta/config";
import { bumpFunnel } from "@/lib/funnel/counter";
import { isClientFunnelStep, isFunnelSource } from "@/lib/funnel/steps";

export const dynamic = "force-dynamic";

const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom|uptime/i;

export async function POST(req: Request): Promise<Response> {
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (!isTrackingHost(host) || BOT_RE.test(req.headers.get("user-agent") ?? "")) return new Response(null, { status: 204 });
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || !isClientFunnelStep((body as Record<string, unknown>).step)) return new Response(null, { status: 204 });
    const source = (body as Record<string, unknown>).source;
    await bumpFunnel((body as Record<string, unknown>).step as "arrived" | "touched", isFunnelSource(source) ? source : "other");
  } catch {
    // The endpoint always stays invisible to a visitor.
  }
  return new Response(null, { status: 204 });
}
