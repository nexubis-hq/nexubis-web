import { afterEach, beforeEach, expect, test, vi } from "vitest";

const store: string[] = [];
vi.mock("@/lib/scorecard/kv", () => ({
  getKv: () => ({
    lpush: async (_: string, ...v: string[]) => store.unshift(...v.reverse()),
    lrange: async () => [...store],
    del: async () => { store.length = 0; return 1; },
  }),
}));

import { flushSequenceOutbox, sendSequenceEvent, sequenceMode } from "./client";

const fetchMock = vi.fn();

beforeEach(() => {
  store.length = 0;
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("SEQUENCE_MODE", "app");
  vi.stubEnv("SEQUENCES_URL", "https://app.test/");
  vi.stubEnv("SEQUENCES_API_KEY", "key");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

test("funnelr mode never calls the app", async () => {
  vi.stubEnv("SEQUENCE_MODE", "");
  expect(sequenceMode()).toBe("funnelr");
  await sendSequenceEvent("reply", { email: "a@x.com" }, "k");
  expect(fetchMock).not.toHaveBeenCalled();
});

test("sends the brand key and the idempotency key", async () => {
  fetchMock.mockResolvedValue(new Response('{"outcome":"enrolled"}'));
  const result = await sendSequenceEvent("audit_finished", { email: "a@x.com" }, "audit-1");
  expect(result).toEqual({ ok: true, outcome: "enrolled" });
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("https://app.test/api/v1/events");
  expect(init.headers.Authorization).toBe("Bearer key");
  expect(init.headers["Idempotency-Key"]).toBe("audit-1");
});

test("a failed event is queued, then replayed in order", async () => {
  fetchMock.mockRejectedValue(new Error("down"));
  expect((await sendSequenceEvent("reply", { email: "a@x.com" }, "1")).queued).toBe(true);
  expect((await sendSequenceEvent("booking_created", { email: "b@x.com" }, "2")).queued).toBe(true);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => new Response("{}"));
  expect(await flushSequenceOutbox()).toEqual({ sent: 2, left: 0 });
  expect(fetchMock.mock.calls.map((c) => c[1].headers["Idempotency-Key"])).toEqual(["1", "2"]);
  expect(store.length).toBe(0);
});
