import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readCompanyWebsite } from "./linkedin-website";
import { companySocial, strongestSocial } from "./company-socials";
const network = vi.fn();
beforeEach(() => {
  network.mockReset();
  vi.stubGlobal("fetch", network);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("C4 collects footer socials from the existing read and prefers brand paths across team pages", async () => {
  network
    .mockResolvedValueOnce(
      new Response(
        "<footer>" +
          [
            "https://facebook.com/other",
            "https://instagram.com/acme",
            "https://youtube.com/@acme",
            "https://tiktok.com/@acme",
            "https://pinterest.co.uk/acme",
            "https://twitter.com/acme",
            "https://linkedin.com/company/acme",
          ]
            .map((url) => `<a href="${url}">Social</a>`)
            .join("") +
          '</footer><a href="/team">Team</a>'
      )
    )
    .mockResolvedValueOnce(
      new Response('<a href="https://facebook.com/acme-co">Facebook</a>')
    );
  const result = await readCompanyWebsite("acme.example", "Acme Co");
  expect(result.linkedin).toHaveLength(1);
  expect(result.companySocials).toEqual([
    { network: "facebook", url: "https://facebook.com/acme-co" },
    { network: "instagram", url: "https://instagram.com/acme" },
    { network: "youtube", url: "https://youtube.com/@acme" },
    { network: "tiktok", url: "https://tiktok.com/@acme" },
    { network: "pinterest", url: "https://pinterest.co.uk/acme" },
    { network: "x", url: "https://twitter.com/acme" },
  ]);
  expect(network.mock.calls.map(([url]) => String(url))).toEqual([
    "https://acme.example/",
    "https://acme.example/team",
  ]);
});
it.each([
  "https://facebook.com/sharer/sharer.php?u=https://example.com",
  "https://facebook.com/share?u=test",
  "https://facebook.com/dialog/share?href=test",
  "https://twitter.com/intent/tweet?url=test",
  "https://twitter.com/share?text=test",
  "https://pinterest.com/pin/create/button/?url=test",
  "https://facebook.com/wix",
  "https://instagram.com/webflow",
  "https://youtube.com/@Squarespace",
  "https://x.com/WordPresscom",
  "https://instagram.com/",
  "https://facebook.com.evil.com/acme",
  "https://pinterest.evil.com/acme",
  "https://user@facebook.com/acme",
  "javascript:alert(1)",
])("C4 ignores sharing, builder defaults and invalid socials: %s", (url) =>
  expect(companySocial(url)).toBeNull()
);
it("C4 keeps the first link per network without a brand match and treats X/twitter as one network", async () => {
  network.mockResolvedValue(
    new Response(
      '<a href="https://x.com/first">X</a><a href="https://twitter.com/second">Twitter</a><a href="https://facebook.com/first">Facebook</a><a href="https://facebook.com/second">Facebook</a>'
    )
  );
  expect(
    (await readCompanyWebsite("example.com", "Brand")).companySocials
  ).toEqual([
    { network: "facebook", url: "https://facebook.com/first" },
    { network: "x", url: "https://x.com/first" },
  ]);
  expect(network).toHaveBeenCalledOnce();
});
it("C4 retains socials collected before the shared six-second deadline", async () => {
  vi.useFakeTimers();
  network
    .mockResolvedValueOnce(
      new Response(
        '<a href="https://facebook.com/acme">Facebook</a><a href="/team">Team</a>'
      )
    )
    .mockImplementationOnce(() => new Promise(() => {}));
  const work = readCompanyWebsite("example.com", "Acme");
  await vi.advanceTimersByTimeAsync(6000);
  expect((await work).companySocials).toEqual([
    { network: "facebook", url: "https://facebook.com/acme" },
  ]);
});
it("C4 strongest social prefers Facebook, then Instagram, then the first other network", () => {
  const x = { network: "x" as const, url: "https://x.com/acme" };
  const instagram = {
    network: "instagram" as const,
    url: "https://instagram.com/acme",
  };
  const facebook = {
    network: "facebook" as const,
    url: "https://facebook.com/acme",
  };
  expect(strongestSocial([x, instagram, facebook])).toBe(facebook);
  expect(strongestSocial([x, instagram])).toBe(instagram);
  expect(strongestSocial([x])).toBe(x);
  expect(strongestSocial([])).toBeUndefined();
});
