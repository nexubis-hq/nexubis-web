// Receives Content Security Policy violation reports from browsers and writes
// a short line to the server logs (Vercel > Logs, search "csp-report").
// Used while the CSP runs in report-only mode to check nothing would break.
const MAX_BODY = 8 * 1024;

export async function POST(req: Request): Promise<Response> {
  try {
    const text = (await req.text()).slice(0, MAX_BODY);
    const parsed = JSON.parse(text) as unknown;
    const reports = Array.isArray(parsed) ? parsed : [parsed];
    for (const entry of reports.slice(0, 10)) {
      const r = entry as Record<string, unknown>;
      const body = (r["csp-report"] ?? r.body ?? {}) as Record<string, unknown>;
      const pick = (...keys: string[]) => {
        for (const k of keys) if (typeof body[k] === "string") return (body[k] as string).slice(0, 300);
        return "";
      };
      console.warn(
        "[csp-report]",
        JSON.stringify({
          page: pick("document-uri", "documentURL"),
          directive: pick("effective-directive", "effectiveDirective", "violated-directive"),
          blocked: pick("blocked-uri", "blockedURL"),
        })
      );
    }
  } catch {
    // Malformed reports are ignored.
  }
  return new Response(null, { status: 204 });
}
