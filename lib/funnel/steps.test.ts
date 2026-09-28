import { describe, expect, it } from "vitest";
import {
  CLIENT_FUNNEL_STEPS,
  adLabel,
  adSourceFromSearch,
  cleanAdSource,
  funnelSourceFromSearch,
  isClientFunnelStep,
} from "./steps";

describe("audit funnel steps", () => {
  it("reads all five UTMs from an ad link", () => {
    expect(adSourceFromSearch("?utm_source=ig&utm_medium=paid_social&utm_campaign=NL&utm_content=AD1_A_NL_NEW%20-%20CLEAN&utm_term=industrial")).toEqual({
      utm_source: "ig", utm_medium: "paid_social", utm_campaign: "NL", utm_content: "AD1_A_NL_NEW - CLEAN", utm_term: "industrial",
    });
  });

  it("returns null when a link has no UTMs", () => expect(adSourceFromSearch("?fbclid=secret")).toBeNull());

  it("drops fbclid and unknown keys", () => {
    expect(cleanAdSource({ utm_source: "ig", fbclid: "secret", unknown: "nope" })).toEqual({ utm_source: "ig" });
  });

  it("strips control characters, collapses whitespace and caps values", () => {
    expect(cleanAdSource({ utm_content: ` a\u0000  b\n${"x".repeat(130)}` })).toEqual({ utm_content: `a b ${"x".repeat(116)}` });
  });

  it("recognises paid social as ad traffic", () => expect(funnelSourceFromSearch("?utm_medium=paid_social")).toBe("ad"));

  it("recognises complete source/content and fbclid as ad traffic", () => {
    expect(funnelSourceFromSearch("?utm_source=ig&utm_content=creative")).toBe("ad");
    expect(funnelSourceFromSearch("?fbclid=present")).toBe("ad");
  });

  it("otherwise classifies traffic as other", () => expect(funnelSourceFromSearch("?utm_source=ig")).toBe("other"));

  it("keeps submitted server-only and formats ad labels", () => {
    expect(CLIENT_FUNNEL_STEPS).not.toContain("submitted");
    expect(isClientFunnelStep("submitted")).toBe(false);
    expect(adLabel({ utm_content: "AD1_A_NL_NEW", utm_source: "ig" })).toBe("AD1_A_NL_NEW  ig");
  });
});
