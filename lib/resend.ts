export const DEFAULT_NEXUBIS_EMAIL_FROM = "Nexubis <hello@nexubis.io>";

export interface SendResendEmailInput {
  from?: string;
  to: string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export async function sendResendEmail(input: SendResendEmailInput, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[resend] RESEND_API_KEY is not set; email skipped.");
    return false;
  }

  const to = input.to.map((address) => address.trim()).filter(Boolean);
  if (!to.length) {
    console.error(`[resend] no valid recipients for "${input.subject}"; send skipped.`);
    return false;
  }

  try {
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: input.from ?? process.env.SCORECARD_EMAIL_FROM ?? DEFAULT_NEXUBIS_EMAIL_FROM,
        to,
        subject: input.subject,
        text: input.text,
        ...(input.html ? { html: input.html } : {}),
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });

    if (!res.ok) {
      console.error(`[resend] Resend returned ${res.status} for "${input.subject}".`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[resend] send failed:", err instanceof Error ? err.message : err);
    return false;
  }
}
