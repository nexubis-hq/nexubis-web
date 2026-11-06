import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const sendSequenceEvent = vi.fn();
const applyRepliedTag = vi.fn();
vi.mock("@/lib/sequences/client", async (orig) => ({
  ...(await orig<typeof import("@/lib/sequences/client")>()),
  sendSequenceEvent: (...a: unknown[]) => sendSequenceEvent(...a),
}));
vi.mock("@/lib/funnelr/client", () => ({ createFunnelrClient: () => ({}) }));
vi.mock("@/lib/funnelr/reply-tagger", async (orig) => ({
  ...(await orig<typeof import("@/lib/funnelr/reply-tagger")>()),
  applyRepliedTag: (...a: unknown[]) => applyRepliedTag(...a),
}));

import { POST } from "@/app/api/inbound/reply/route";

const call = () =>
  POST(new NextRequest("https://www.nexubis.io/api/inbound/reply", {
    method: "POST",
    headers: { "x-reply-secret": "s", "content-type": "application/json" },
    body: JSON.stringify({ from: "Lead <lead@factory.nl>" }),
  }));

beforeEach(() => {
  sendSequenceEvent.mockReset();
  applyRepliedTag.mockReset();
  vi.stubEnv("REPLY_WEBHOOK_SECRET", "s");
  vi.stubEnv("FUNNELR_API_KEY", "f");
  vi.stubEnv("REPLY_TAGGING_ENABLED", "true");
});
afterEach(() => vi.unstubAllEnvs());

test("a lead only the app knows still counts, so the script forwards it to Laine", async () => {
  sendSequenceEvent.mockResolvedValue({ ok: true, outcome: "stopped" });
  applyRepliedTag.mockResolvedValue({ ok: true, applied: false, reason: "not-a-contact" });
  expect(await (await call()).json()).toMatchObject({ applied: true, reason: "applied", source: "sequence-app" });
});

test("a Funnelr lead answers exactly as before", async () => {
  sendSequenceEvent.mockResolvedValue({ ok: true, outcome: "no_contact" });
  applyRepliedTag.mockResolvedValue({ ok: true, applied: true, reason: "applied" });
  expect(await (await call()).json()).toEqual({ ok: true, applied: true, reason: "applied" });
});

test("someone neither knows is still not a contact", async () => {
  sendSequenceEvent.mockResolvedValue({ ok: true, outcome: "no_contact" });
  applyRepliedTag.mockResolvedValue({ ok: true, applied: false, reason: "not-a-contact" });
  expect(await (await call()).json()).toMatchObject({ applied: false, reason: "not-a-contact" });
});

test("after Funnelr is cancelled, app contacts still count and strangers do not", async () => {
  vi.stubEnv("FUNNELR_API_KEY", "");
  sendSequenceEvent.mockResolvedValue({ ok: true, outcome: "stopped" });
  expect(await (await call()).json()).toMatchObject({ applied: true, reason: "applied" });
  sendSequenceEvent.mockResolvedValue({ ok: true, outcome: "no_contact" });
  expect(await (await call()).json()).toMatchObject({ applied: false, reason: "not-a-contact" });
  expect(applyRepliedTag).not.toHaveBeenCalled();
});
