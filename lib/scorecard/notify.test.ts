import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { sendResendEmail } from "@/lib/resend";
import type { LeadRecord } from "./leads";

vi.mock("@/lib/resend", () => ({ sendResendEmail: vi.fn(async () => true) }));
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXUBIS_TEAM_EMAIL", "hello@nexubis.io");
  vi.stubEnv("SCORECARD_EMAIL_FROM", "Nexubis <alerts@nexubis.io>");
  vi.stubEnv("SCORECARD_LEAD_EMAILS", "laine@nexubis.io,hello@nexubis.io");
  vi.stubEnv("SCORECARD_SEND_EMAIL1", "true");
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

const lead: LeadRecord = {
  name: "Shannah", email: "shannah+alerttest@nexubis.io", role: "CEO",
  company: "Test Company", url: "https://example.com", productOneLiner: "Test product",
  competitors: [{ name: "Rival", url: "https://rival.example", resolved: true }],
  credibilityScore: 47, verdict: "wide", firstFixCategory: null, reportSlug: "abcdefgh",
  routing: { roleSeniority: "ceo", verticalGuess: "other-industrial", geoGuess: "unknown", followUpTiming: "Personal follow-up", loomCandidate: false },
  webhookStatus: "skipped", note: "", loomStatus: "none",
  createdAt: "2026-10-13T00:00:00Z", updatedAt: "2026-10-13T00:00:00Z",
};
const report = "https://www.nexubis.io/audit/r/abcdefgh";
const admin = "https://www.nexubis.io/audit/admin/abcdefgh";

it.each([
  ["SHANNAH@nexubis.io,hello@nexubis.io,HELLO@nexubis.io", ["SHANNAH@nexubis.io", "hello@nexubis.io"]],
  ["laine@nexubis.io,hello@nexubis.io", ["laine@nexubis.io", "hello@nexubis.io", "shannah@nexubis.io"]],
  [" laine@nexubis.io, ,hello@nexubis.io,shannah@nexubis.io ", ["laine@nexubis.io", "hello@nexubis.io", "shannah@nexubis.io"]],
  ["", ["hello@nexubis.io", "laine@nexubis.io", "shannah@nexubis.io"]],
  [" , ", ["hello@nexubis.io", "laine@nexubis.io", "shannah@nexubis.io"]],
])("adds Shannah once to audit lead alerts with recipient config %s", async (config, recipients) => {
  vi.stubEnv("SCORECARD_LEAD_EMAILS", config);
  const { notifyTeam } = await import("./notify");
  await notifyTeam(lead, report, admin);
  expect(sendResendEmail).toHaveBeenCalledExactlyOnceWith({
    from: "Nexubis <alerts@nexubis.io>", to: recipients,
    subject: "Audit lead: Test Company, 47/100, wide gap",
    text: [
      "New audit lead.", "", "Company: Test Company (https://example.com)",
      "Contact: Shannah, CEO, shannah+alerttest@nexubis.io", "Product: Test product",
      "Competitors: Rival", "", "Gap Score: 47/100 (wide gap)", "First fix: n/a",
      "Routing: ceo / other-industrial / unknown", "Follow-up: Personal follow-up",
      "Loom candidate: no", "", "", `Report: ${report}`, `Admin: ${admin}`,
    ].join("\n"),
    replyTo: lead.email,
  });
});

it("adds Shannah to failed scans while leaving capacity and customer recipients unchanged", async () => {
  const { notifyFailedScan, notifyBreakerTripped, sendFallbackEmail1 } = await import("./notify");
  await notifyFailedScan(lead.email, lead.url, "Mock failure");
  await notifyBreakerTripped(10);
  await sendFallbackEmail1(lead, report);
  const calls = vi.mocked(sendResendEmail).mock.calls;
  expect(calls).toHaveLength(3);
  expect(calls.map(([args]) => args.to)).toEqual([
    ["laine@nexubis.io", "hello@nexubis.io", "shannah@nexubis.io"],
    ["laine@nexubis.io", "hello@nexubis.io"],
    [lead.email],
  ]);
});

it.each([
  ["Auto-detect could not read the site (Site responded with status 403.)", "Site responded with status 403."],
  ["Auto-detect of product and competitors failed (Model unavailable (timeout))", "Model unavailable (timeout)"],
])("includes the same detection failure in both internal alerts: %s", async (flag, reason) => {
  const { notifyTeam, notifyFailedScan } = await import("./notify");
  await notifyTeam(lead, report, admin, [flag]);
  await notifyFailedScan(lead.email, lead.url, "report-not-ready: only 2 of 5 pillars scored", [flag]);
  const calls = vi.mocked(sendResendEmail).mock.calls;
  expect(calls).toHaveLength(2);
  for (const [args] of calls) expect(args.text).toContain(`Site read: failed (${reason})`);
  expect(calls[1][0].text).toContain("Reason: report-not-ready: only 2 of 5 pillars scored");
});

it("deduplicates failed-scan recipients case-insensitively", async () => {
  vi.stubEnv("SCORECARD_LEAD_EMAILS", "SHANNAH@nexubis.io,hello@nexubis.io,HELLO@nexubis.io");
  const { notifyFailedScan } = await import("./notify");
  await notifyFailedScan(lead.email, lead.url, "Mock failure");
  expect(vi.mocked(sendResendEmail).mock.calls[0][0].to).toEqual(["SHANNAH@nexubis.io", "hello@nexubis.io"]);
});

it("does not label missing competitors as a site-read failure", async () => {
  const { notifyTeam } = await import("./notify");
  await notifyTeam(lead, report, admin, ["Auto-detect found no competitors to benchmark against"]);
  expect(vi.mocked(sendResendEmail).mock.calls[0][0].text).not.toContain("Site read: failed");
});

it("admin metadata leaves team and fallback email bytes and recipients unchanged",async()=>{
 const {notifyTeam,sendFallbackEmail1}=await import("./notify");
 await notifyTeam(lead,report,admin);await sendFallbackEmail1(lead,report);
 const before=JSON.stringify(vi.mocked(sendResendEmail).mock.calls);
 vi.mocked(sendResendEmail).mockClear();
 const enriched={...lead,ad:{utm_source:"facebook"},source:"ad" as const,qualifiedDecision:{qualified:true,reason:"manufacturer"}};
 await notifyTeam(enriched,report,admin);await sendFallbackEmail1(enriched,report);
 expect(JSON.stringify(vi.mocked(sendResendEmail).mock.calls)).toBe(before);
});
