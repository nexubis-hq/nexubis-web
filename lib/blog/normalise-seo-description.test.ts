import { describe, expect, it } from "vitest";
import { normaliseSeoDescription } from "../../scripts/lib/normalise-seo-description";

describe("normaliseSeoDescription", () => {
  it("keeps descriptions below 170 characters unchanged", () => {
    const description = "Short description with useful context.";

    expect(normaliseSeoDescription(description)).toBe(description);
  });

  it("keeps descriptions exactly 170 characters unchanged", () => {
    const description = "a".repeat(170);

    expect(normaliseSeoDescription(description)).toBe(description);
  });

  it("truncates descriptions above 170 characters at a whole-word boundary", () => {
    const description = `${"Nexubis builds clear migration systems ".repeat(7)}tail`;
    const normalised = normaliseSeoDescription(description);

    expect(normalised.length).toBeLessThanOrEqual(170);
    expect(normalised.endsWith("…")).toBe(true);
    expect(normalised).not.toContain("tail");
  });

  it("includes the ellipsis inside the 170-character total", () => {
    const normalised = normaliseSeoDescription("Nexubis ".repeat(40));

    expect(normalised.length).toBeLessThanOrEqual(170);
    expect(normalised.at(-1)).toBe("…");
  });

  it("removes HTML tags and decodes normal HTML entities", () => {
    expect(normaliseSeoDescription("<p>Nexubis &amp; Circuit&nbsp;work</p>")).toBe(
      "Nexubis & Circuit work",
    );
  });

  it("collapses repeated whitespace", () => {
    expect(normaliseSeoDescription("One\n\n   two\tthree")).toBe("One two three");
  });

  it("returns an empty value for empty source text", () => {
    expect(normaliseSeoDescription("  <p> </p>  ")).toBe("");
  });
});
