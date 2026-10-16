import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { ScorecardFlow } from "./ScorecardFlow";
import { POST as relay } from "@/app/api/meta-event/route";
import { NextRequest } from "next/server";
import { sendCapiEvent } from "@/lib/meta/capi";

vi.mock("@/lib/meta/capi", () => ({ sendCapiEvent: vi.fn(async () => ({ ok: true, skipped: false })) }));

const hooks = vi.hoisted(() => ({ values: [] as unknown[], index: 0 }));
vi.mock("react", async () => ({
  ...await vi.importActual<typeof import("react")>("react"),
  // Supply the filled form without mounting a browser or running effects.
  useState: (initial: unknown) => [hooks.values[hooks.index++] ?? initial, vi.fn()],
  useRef: (initial: unknown) => ({ current: initial }),
  useEffect: vi.fn(),
}));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); });

type FormProps = { children?: ReactNode; onSubmit: (event: { preventDefault(): void }) => void };
function findForm(node: ReactNode): ReactElement<FormProps> | undefined {
  if (!isValidElement<FormProps>(node)) return;
  if (node.type === "form") return node;
  for (const child of Children.toArray(node.props.children)) {
    const form = findForm(child);
    if (form) return form;
  }
}

it.each([
  ["declined", "submit"],
  ["malformed _fbc", "submit"],
  ["throwing cookie access", "submit"],
  ["malformed _fbc", "done"],
  ["throwing cookie access", "done"],
])(
  "hands the audit to Funnelr with %s at %s and sends no Meta data",
  async (scenario, phase) => {
    hooks.index = 0;
    hooks.values = [undefined, "example.com", "Shannah", "shannah+funneltest1@nexubis.io"];
    vi.stubEnv("NEXT_PUBLIC_META_TRACKING_FORCE", "0");
    const consentCookie = (marketing: boolean) => `nx_consent=${encodeURIComponent(JSON.stringify({
      analytics: false, marketing, decided: true, ts: Date.now(),
    }))}`;
    let scanStarted = false;
    const cookieReads = vi.fn(() => {
      if (phase === "done" && !scanStarted) return consentCookie(false);
      if (scenario === "throwing cookie access") throw new Error("Cookie access denied");
      return `${consentCookie(scenario !== "declined")}; _fbc=%ZZ`;
    });
    const cookieWrites = vi.fn();
    vi.stubGlobal("document", { get cookie() { return cookieReads(); }, set cookie(value: string) { cookieWrites(value); } });
    const fbq = vi.fn();
    const assign = vi.fn();
    vi.stubGlobal("window", {
      fbq,
      location: { host: "www.nexubis.io", origin: "https://www.nexubis.io", href: "https://www.nexubis.io/audit", protocol: "https:", search: "", assign },
    });
    const fetchMock = vi.fn<typeof fetch>(async (url) => {
      if (url === "/api/scorecard/run") {
        scanStarted = true;
        return new Response('data: {"type":"done","reportUrl":"/audit/r/abcdefgh","slug":"abcdefgh"}\n\n');
      }
      return Response.json({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    const form = findForm(ScorecardFlow());
    expect(form).toBeDefined();
    form!.props.onSubmit({ preventDefault: vi.fn() });

    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith("/audit/r/abcdefgh"));
    expect(cookieReads).toHaveBeenCalled();
    expect(cookieWrites).not.toHaveBeenCalled();
    expect(fbq).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/api/scorecard/run", "/api/leads/scorecard"]);
    const init = fetchMock.mock.calls[1][1];
    expect(init?.method).toBe("POST");
    expect(init?.keepalive).toBe(true);
    expect(JSON.parse(String(init?.body))).toEqual({
      firstName: "Shannah", first_name: "Shannah", email: "shannah+funneltest1@nexubis.io",
      marketingConsent: true, reportUrl: "https://www.nexubis.io/audit/r/abcdefgh",
    });
  },
);

it.each(["accepted", "declined", "withdrawn"])("QualifiedAudit shares its ID across pixel and relay, once only, with consent %s", async (consent) => {
  hooks.index = 0;
  hooks.values = [undefined, "example.com", "Test", "qa@example.com"];
  vi.stubEnv("NEXT_PUBLIC_META_TRACKING_FORCE", "0");
  let scanStarted = false;
  const auditId = `qualified-${consent}`;
  const jar = () => `nx_consent=${encodeURIComponent(JSON.stringify({
    analytics: false, marketing: consent === "accepted" || (consent === "withdrawn" && !scanStarted), decided: true, ts: Date.now(),
  }))}`;
  vi.stubGlobal("document", { get cookie() { return jar(); }, set cookie(_value: string) {} });
  const fbq = vi.fn();
  const assign = vi.fn();
  vi.stubGlobal("window", {
    fbq,
    location: { host: "www.nexubis.io", origin: "https://www.nexubis.io", href: "https://www.nexubis.io/audit", protocol: "https:", search: "", assign },
  });
  const fetchMock = vi.fn<typeof fetch>(async (url, init) => {
    if (url === "/api/scorecard/run") {
      scanStarted = true;
      // Duplicate stream delivery must still produce only one Meta event.
      return new Response([
        { type: "qualified", auditId }, { type: "qualified", auditId },
        { type: "done", reportUrl: "/audit/r/abcdefgh", slug: "abcdefgh" },
      ].map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""));
    }
    if (url === "/api/meta-event") {
      return relay(new NextRequest("https://www.nexubis.io/api/meta-event", {
        method: "POST", headers: { cookie: jar() }, body: String(init?.body),
      }));
    }
    return Response.json({ ok: true });
  });
  vi.stubGlobal("fetch", fetchMock);
  findForm(ScorecardFlow())!.props.onSubmit({ preventDefault: vi.fn() });
  await vi.waitFor(() => expect(assign).toHaveBeenCalledWith("/audit/r/abcdefgh"));
  const pixelCalls = fbq.mock.calls.filter((call) => call[1] === "QualifiedAudit");
  const relayCalls = fetchMock.mock.calls.filter(([url, init]) => url === "/api/meta-event" && JSON.parse(String(init?.body)).eventName === "QualifiedAudit");
  const capiCalls = vi.mocked(sendCapiEvent).mock.calls.filter(([event]) => event.eventName === "QualifiedAudit");
  if (consent === "accepted") {
    expect(pixelCalls).toEqual([["trackCustom", "QualifiedAudit", { content_category: "scorecard", content_name: "example.com" }, { eventID: auditId }]]);
    expect(relayCalls).toHaveLength(1);
    expect(capiCalls).toHaveLength(1);
    expect(capiCalls[0][0]).toMatchObject({ eventId: auditId, eventSourceUrl: "https://www.nexubis.io/audit", email: "qa@example.com" });
  } else {
    expect(pixelCalls).toHaveLength(0);
    expect(relayCalls).toHaveLength(0);
    expect(capiCalls).toHaveLength(0);
  }
});
