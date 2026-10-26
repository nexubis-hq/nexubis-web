import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { regenerateReport } from "@/app/audit/admin/actions";
import { readShared, patchShared } from "./share";
import { detectProspectContext } from "./detect";
import { generateScorecard } from "./generate";
import { sendResendEmail } from "@/lib/resend";
import { createFunnelrClient } from "@/lib/funnelr/client";
import { submitScorecardLeadToFunnelr } from "./lead-funnelr";
import { sendCapiEvent } from "@/lib/meta/capi";
import { trackMeta } from "@/lib/meta/track";
import type { SharedScorecard } from "./share";
import type { DetectionResult } from "./detect";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "test-session" }) }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("./auth", () => ({ SESSION_COOKIE: "test-session", isValidSession: vi.fn(() => true) }));
vi.mock("./share", () => ({ readShared: vi.fn(), patchShared: vi.fn() }));
vi.mock("./leads", () => ({ updateLead: vi.fn() }));
vi.mock("./detect", async (original) => ({ ...await original<typeof import("./detect")>(), detectProspectContext: vi.fn() }));
vi.mock("./generate", () => ({ generateScorecard: vi.fn() }));
vi.mock("@/lib/resend", () => ({ sendResendEmail: vi.fn() }));
vi.mock("@/lib/funnelr/client", () => ({ createFunnelrClient: vi.fn() }));
vi.mock("./lead-funnelr", () => ({ submitScorecardLeadToFunnelr: vi.fn() }));
vi.mock("@/lib/meta/capi", () => ({ sendCapiEvent: vi.fn() }));
vi.mock("@/lib/meta/track", () => ({ trackMeta: vi.fn() }));

const saved = {
  prospectData: { name: "  Original Contact  ", role: "CEO", company: "Example", url: "https://example.com", productOneLiner: "", competitors: [] },
  result: { meta: { contactName: "  Original Contact  ", role: "CEO" }, routing: { roleSeniority: "ceo" } },
} as unknown as SharedScorecard;
const detection: DetectionResult = {
  companyName: "Example Machines", industryFit: "manufacturer", productOneLiner: "Makes magnetic drilling machines", competitors: ["rival.example"], flags: [],
  fingerprint: { industries: ["metalworking"], productFamilies: ["Magnetic drills"], certifications: [], salesModel: "direct", buyerPersona: "metal fabricators and contractors" },
};

beforeEach(() => {
  vi.mocked(readShared).mockResolvedValue(saved);
  vi.mocked(detectProspectContext).mockResolvedValue(detection);
  vi.mocked(generateScorecard).mockResolvedValue({ result: {
    meta: { contactName: "", role: "" }, routing: { roleSeniority: "unknown" }, flags: [],
  } } as unknown as Awaited<ReturnType<typeof generateScorecard>>);
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected external request"); }));
});
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });

it("regenerates with a fresh detection and evidence, preserving the slug and exact contact name without side effects", async () => {
  const form = new FormData(); form.set("slug", "existing123");
  await regenerateReport(form);
  await regenerateReport(form);
  expect(detectProspectContext).toHaveBeenCalledTimes(2);
  expect(detectProspectContext).toHaveBeenCalledWith(saved.prospectData, { fresh: true });
  expect(generateScorecard).toHaveBeenCalledWith(expect.objectContaining({
    name: "  Original Contact  ", url: "https://example.com", productOneLiner: detection.productOneLiner,
    competitors: [{ raw: "rival.example" }], fingerprint: detection.fingerprint,
  }), { fresh: true });
  expect(patchShared).toHaveBeenCalledWith("existing123", expect.objectContaining({
    qualifiedDecision: { qualified: true, reason: "manufacturer with named products" },
    result: expect.objectContaining({ meta: { contactName: "  Original Contact  ", role: "CEO" }, routing: { roleSeniority: "ceo" } }),
  }));
  for (const forbidden of [sendResendEmail, createFunnelrClient, submitScorecardLeadToFunnelr, sendCapiEvent, trackMeta, fetch]) {
    expect(forbidden).not.toHaveBeenCalled();
  }
});

it("records a failed re-read and removes stale product context", async () => {
  vi.mocked(readShared).mockResolvedValue({ ...saved, prospectData: { ...saved.prospectData, fingerprint: detection.fingerprint! } });
  vi.mocked(detectProspectContext).mockResolvedValue({ ...detection, productOneLiner: "", competitors: [], fingerprint: null, flags: ["Auto-detect could not read the site (403)"] });
  const form = new FormData(); form.set("slug", "existing123");
  await regenerateReport(form);
  expect(generateScorecard).toHaveBeenCalledWith(expect.objectContaining({ fingerprint: undefined, productOneLiner: "", competitors: [] }), { fresh: true });
  expect(patchShared).toHaveBeenCalledWith("existing123", expect.objectContaining({
    qualifiedDecision: { qualified: false, reason: "site read or detection failed" },
    result: expect.objectContaining({ flags: ["Auto-detect could not read the site (403)"] }),
  }));
});
