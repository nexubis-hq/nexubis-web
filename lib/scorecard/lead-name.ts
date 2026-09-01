// The landing form asks for a URL and an email, nothing else. Funnelr and the
// notification emails still want a first name, so we derive a best-effort one
// from the email's local part ("mark.jansen@x.nl" -> "Mark") and stay silent
// when the mailbox is generic ("info@", "sales@"). Client-safe: no server
// imports, usable from both the flow component and the lead plumbing.

const GENERIC_MAILBOXES = new Set([
  "info", "sales", "hello", "contact", "office", "admin", "mail", "hi",
  "team", "support", "enquiries", "inquiries", "marketing", "post",
  "verkoop", "kontakt", "vertrieb", "service", "noreply", "no-reply",
]);

export function firstNameFromEmail(email: string): string | null {
  const local = email.split("@")[0]?.trim().toLowerCase() ?? "";
  if (!local) return null;
  const first = local.split(/[._\-+]/)[0];
  if (!first || first.length < 2 || first.length > 30) return null;
  if (GENERIC_MAILBOXES.has(first)) return null;
  if (!/^[a-z]+$/.test(first)) return null;
  return first.charAt(0).toUpperCase() + first.slice(1);
}
