// Email sends via Resend: the internal team notification on every unlock, and
// the fallback Email 1 to the lead, which exists ONLY for the window before
// Funnelr is live (SCORECARD_SEND_EMAIL1=true). When the flag is false, the
// tool never emails the lead: Funnelr owns Email 1.
//
// Credential policy: sends must come from a verified nexubis.io identity,
// never the LekkeWeb sender.
import { TEAM_EMAIL, shouldSendEmail1 } from "./env";
import { EMAIL_1 } from "./copy";
import type { LeadRecord } from "./leads";

const FROM = process.env.SCORECARD_EMAIL_FROM || "Nexubis <hello@nexubis.io>";
const SENDER_FIRST_NAME = process.env.SCORECARD_SENDER_FIRST_NAME || "Hannes";

// Who gets the internal "new lead" alert: a comma list (SCORECARD_LEAD_EMAILS),
// falling back to the single team address. Parsed + empty-filtered because ONE
// empty recipient makes Resend reject the WHOLE send, silently dropping every
// alert — never trust `?? fallback` against an env that may be "" (see
// docs/funnel-audit-checklist.md §4).
export function leadNotifyRecipients(): string[] {
  const configured = (process.env.SCORECARD_LEAD_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return configured.length ? configured : [TEAM_EMAIL].filter(Boolean);
}

async function sendEmail(args: { to: string | string[]; subject: string; text: string; replyTo?: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[scorecard-notify] RESEND_API_KEY not set; email skipped:", args.subject);
    return false;
  }
  const to = (Array.isArray(args.to) ? args.to : [args.to]).map((a) => a.trim()).filter(Boolean);
  if (!to.length) {
    // All-blank recipients would 422 the whole send and lose the alert. Refuse
    // loudly rather than silently drop it.
    console.error(`[scorecard-notify] no valid recipients for "${args.subject}"; send skipped`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to,
        subject: args.subject,
        text: args.text,
        ...(args.replyTo ? { reply_to: args.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      console.error(`[scorecard-notify] Resend ${res.status} for "${args.subject}"`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[scorecard-notify] send failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

// Internal notification: new Scorecard lead, the working details, links to the
// report and the admin view. Subject pattern per the build pack.
export async function notifyTeam(lead: LeadRecord, absoluteReportUrl: string, adminUrl: string): Promise<boolean> {
  const subject = `Scorecard lead: ${lead.company}, ${lead.credibilityScore}/100, ${lead.verdict} gap`;
  const lines = [
    `New Scorecard lead.`,
    ``,
    `Company: ${lead.company} (${lead.url})`,
    `Contact: ${lead.name}, ${lead.role}, ${lead.email}`,
    `Product: ${lead.productOneLiner}`,
    `Competitors: ${lead.competitors.map((c) => c.name).join(", ")}`,
    ``,
    `Credibility Score: ${lead.credibilityScore}/100 (${lead.verdict} gap)`,
    `First fix: ${lead.firstFixCategory ?? "n/a"}`,
    `Routing: ${lead.routing.roleSeniority} / ${lead.routing.verticalGuess} / ${lead.routing.geoGuess}`,
    `Follow-up: ${lead.routing.followUpTiming}`,
    `Loom candidate: ${lead.routing.loomCandidate ? "yes" : "no"}`,
    lead.webhookStatus === "failed" ? `WARNING: the Funnelr webhook FAILED for this lead. Add them by hand.` : ``,
    ``,
    `Report: ${absoluteReportUrl}`,
    `Admin: ${adminUrl}`,
  ].filter((l) => l !== null);
  return sendEmail({ to: leadNotifyRecipients(), subject, text: lines.join("\n"), replyTo: lead.email });
}

// Fallback Email 1, exact copy from the build doc. Only while the flag is on.
export async function sendFallbackEmail1(lead: LeadRecord, absoluteReportUrl: string): Promise<"sent" | "skipped" | "failed"> {
  if (!shouldSendEmail1()) return "skipped";
  const ok = await sendEmail({
    to: lead.email,
    subject: EMAIL_1.subject(lead.name),
    text: EMAIL_1.body(lead.name, absoluteReportUrl, SENDER_FIRST_NAME),
  });
  return ok ? "sent" : "failed";
}
