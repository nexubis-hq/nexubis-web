import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/meta-event/route";
import { trackMeta } from "./track";
import { sendCapiEvent } from "./capi";

vi.mock("./capi", () => ({ sendCapiEvent: vi.fn(async () => ({ ok: true, skipped: false })) }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
const cookie = (marketing: boolean, decided = true) => `nx_consent=${encodeURIComponent(JSON.stringify({ analytics: false, marketing, decided, ts: Date.now() }))}`;

it("blocks browser events, cookie writes and relay requests before consent and after withdrawal", () => {
  const fbq = vi.fn();
  const fetch = vi.fn(async () => ({}));
  let jar = "";
  let writes = 0;
  vi.stubGlobal("document", { get cookie() { return jar; }, set cookie(_value: string) { writes++; } });
  vi.stubGlobal("window", { fbq, location: { host: "nexubis.io", href: "https://nexubis.io/audit", search: "?fbclid=ad", protocol: "https:" } });
  vi.stubGlobal("fetch", fetch);
  trackMeta("Lead", {}, { eventId: "consent-test" });
  jar = cookie(true, false);
  trackMeta("Lead", {}, { eventId: "consent-test" });
  expect(writes).toBe(0);
  expect(fbq).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  jar = cookie(true);
  trackMeta("Lead", {}, { eventId: "consent-test" });
  expect(fbq).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(writes).toBe(3);
  jar = cookie(false);
  trackMeta("Lead", {}, { eventId: "withdrawn" });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(writes).toBe(3);
});

it.each(["", cookie(false), cookie(true, false), "nx_consent=invalid"])("blocks direct relay requests without valid marketing consent: %s", async (value) => {
  const response = await POST(new NextRequest("https://nexubis.io/api/meta-event", {
    method: "POST", headers: { cookie: value }, body: JSON.stringify({ eventName: "PageView", eventId: "test", eventSourceUrl: "https://nexubis.io/" }),
  }));
  expect(await response.json()).toEqual({ ok: true, skipped: true });
  expect(sendCapiEvent).not.toHaveBeenCalled();
});

it("relays a consented event", async () => {
  await POST(new NextRequest("https://nexubis.io/api/meta-event", {
    method: "POST", headers: { cookie: cookie(true) }, body: JSON.stringify({ eventName: "PageView", eventId: "test", eventSourceUrl: "https://nexubis.io/" }),
  }));
  expect(sendCapiEvent).toHaveBeenCalledOnce();
});
