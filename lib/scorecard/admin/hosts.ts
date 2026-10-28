export function normalHost(url: string): string {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname
      .toLowerCase()
      .replace(/^www\./, "");
  } catch {
    return "";
  }
}
// Run timestamps are terminal times, so allow time for generation after capture.
export function inLeadWindow(runAt: string, leadAt: string): boolean {
  const delta = Date.parse(runAt) - Date.parse(leadAt);
  return delta >= -2 * 60000 && delta <= 10 * 60000;
}
