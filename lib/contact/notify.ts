import { sendResendEmail } from "@/lib/resend";

const SUBJECT = "New onboarding message from a client on contact-form";
const RECIPIENTS = ["hello@nexubis.io", "laine@nexubis.io"];

export interface ContactNotificationInput {
  name: string;
  email: string;
  companyName: string;
  websiteLink: string;
  package: string;
  additionalNotes: string;
  funnelrContactId: number;
  contactCreated: boolean;
  submittedAt?: Date;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function contactNotificationRecipients(): string[] {
  return RECIPIENTS;
}

export function contactNotificationFrom(): string {
  return process.env.CONTACT_EMAIL_FROM || process.env.SCORECARD_EMAIL_FROM || "Nexubis Onboarding <hello@nexubis.io>";
}

export function formatContactNotification(input: ContactNotificationInput) {
  const submittedAt = (input.submittedAt ?? new Date()).toISOString();
  const rows = [
    ["Name", input.name],
    ["Email", input.email],
    ["Company Name", input.companyName],
    ["Website Link", input.websiteLink || "Not supplied"],
    ["Selected Package", input.package],
    ["Additional Notes", input.additionalNotes || "Not supplied"],
    ["Submission date and time", submittedAt],
    ["Source", "Nexubis Contact Form"],
    ["Funnelr contact ID", String(input.funnelrContactId)],
    ["Funnelr contact state", input.contactCreated ? "Created" : "Updated"],
  ];

  const text = [
    "New onboarding message from contact-form.",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;color:#1d1c1a;line-height:1.5">
      <h2 style="margin:0 0 16px">New onboarding message from contact-form</h2>
      <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:680px">
        ${rows
          .map(
            ([label, value]) => `
              <tr>
                <th align="left" style="border-bottom:1px solid #eeeeec;padding:10px 12px 10px 0;vertical-align:top;width:190px">${escapeHtml(label)}</th>
                <td style="border-bottom:1px solid #eeeeec;padding:10px 0;vertical-align:top;white-space:pre-wrap">${escapeHtml(value)}</td>
              </tr>
            `,
          )
          .join("")}
      </table>
    </div>
  `;

  return { subject: SUBJECT, text, html };
}

export async function notifyContactSubmission(input: ContactNotificationInput): Promise<boolean> {
  const email = formatContactNotification(input);
  return sendResendEmail({
    from: contactNotificationFrom(),
    to: contactNotificationRecipients(),
    subject: email.subject,
    text: email.text,
    html: email.html,
    replyTo: input.email,
  });
}
