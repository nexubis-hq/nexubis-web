import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readLinkedinWebsite } from "./linkedin-website";
const network = vi.fn();
beforeEach(() => {
  network.mockReset();
  vi.stubGlobal("fetch", network);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("W1 reads the footer company link and a team profile with nearby name", async () => {
  network
    .mockResolvedValueOnce(
      new Response(
        '<footer><a href="https://nl.linkedin.com/company/example">Our LinkedIn</a></footer><a href="/ons-team">Team</a>'
      )
    )
    .mockResolvedValueOnce(
      new Response(
        '<article>Jan Blom, director <span><a href="https://za.linkedin.com/in/jan-blom">LinkedIn</a></span></article>'
      )
    );
  expect(await readLinkedinWebsite("https://example.com/path")).toEqual([
    expect.objectContaining({
      url: "https://nl.linkedin.com/company/example",
      text: "Our LinkedIn",
    }),
    expect.objectContaining({
      url: "https://za.linkedin.com/in/jan-blom",
      surrounding: expect.stringContaining("Jan Blom"),
    }),
  ]);
  expect(network.mock.calls.map(([url]) => String(url))).toEqual([
    "https://example.com/",
    "https://example.com/ons-team",
  ]);
  expect(network.mock.calls[0][1]).toMatchObject({
    redirect: "manual",
    headers: { "User-Agent": expect.stringContaining("Mozilla/5.0") },
  });
});
it.each([403, 500, 200])(
  "W1 quietly ignores HTTP/challenge failures (%s)",
  async (status) => {
    network.mockResolvedValue(
      new Response(
        '<title>Just a moment...</title><a href="https://linkedin.com/company/wrong">LinkedIn</a>',
        { status }
      )
    );
    expect(await readLinkedinWebsite("example.com")).toEqual([]);
  }
);
it("W1 times out at six seconds and never throws", async () => {
  vi.useFakeTimers();
  network.mockImplementation(
    (_url, { signal }) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(new Error("aborted")))
      )
  );
  const work = readLinkedinWebsite("example.com");
  await vi.advanceTimersByTimeAsync(6000);
  expect(await work).toEqual([]);
});
it("W1 never fetches another host, including redirects, and caps extra pages at four", async () => {
  network.mockImplementation(async (url) =>
    String(url) === "https://example.com/"
      ? new Response(
          '<a href="https://other.com/team">team</a><a href="//evil.com/about">about</a>' +
            [
              "team",
              "about",
              "over-ons",
              "ons-team",
              "wie-zijn-wij",
              "medewerkers",
              "contact",
            ]
              .map((path) => `<a href="/${path}">${path}</a>`)
              .join("")
        )
      : new Response(null, {
          status: 302,
          headers: { location: "https://evil.com/team" },
        })
  );
  expect(await readLinkedinWebsite("example.com")).toEqual([]);
  expect(network).toHaveBeenCalledTimes(5);
  expect(
    network.mock.calls.every(
      ([url]) => new URL(String(url)).host === "example.com"
    )
  ).toBe(true);
});
it("W1 rejects oversized declared and streamed HTML", async () => {
  network.mockResolvedValueOnce(
    new Response("small", { headers: { "content-length": "1500001" } })
  );
  expect(await readLinkedinWebsite("example.com")).toEqual([]);
  network.mockResolvedValueOnce(new Response("x".repeat(1_500_001)));
  expect(await readLinkedinWebsite("example.com")).toEqual([]);
});
it("W1 contains network errors and malformed input", async () => {
  network.mockRejectedValue(new Error("network down"));
  expect(await readLinkedinWebsite("example.com")).toEqual([]);
  expect(await readLinkedinWebsite("https://[")).toEqual([]);
});
