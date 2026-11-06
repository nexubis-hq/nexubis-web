import { isTestContact } from "@/lib/scorecard/admin/test-contacts";

// While QUIET_TEST_ALERTS_TO is set, team alerts about our own test addresses
// (anything @nexubis.io, or shannahdt9...) go only to that address, so testing
// does not flood Laine. Real leads always alert the team as normal.
// Unset it to send test alerts to the whole team again.
export function quietTestRecipients(leadEmail: string | null | undefined): string[] | null {
  const to = (process.env.QUIET_TEST_ALERTS_TO ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!to.length || !isTestContact(leadEmail)) return null;
  return to;
}
