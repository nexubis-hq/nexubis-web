import { describe, expect, it } from "vitest";
import { normaliseBlogExcerpt } from "../../scripts/lib/normalise-blog-excerpt";

describe("normaliseBlogExcerpt", () => {
  it("keeps excerpts below 300 characters unchanged", () => {
    const excerpt = "Short excerpt with useful context.";

    expect(normaliseBlogExcerpt(excerpt)).toBe(excerpt);
  });

  it("keeps excerpts exactly 300 characters unchanged", () => {
    const excerpt = "a".repeat(300);

    expect(normaliseBlogExcerpt(excerpt)).toBe(excerpt);
  });

  it("truncates excerpts above 300 characters at a whole-word boundary", () => {
    const excerpt = `${"word ".repeat(70)}tail`;
    const normalised = normaliseBlogExcerpt(excerpt);

    expect(normalised.length).toBeLessThanOrEqual(300);
    expect(normalised.endsWith("…")).toBe(true);
    expect(normalised).not.toContain("tail");
  });

  it("includes the ellipsis inside the 300-character total", () => {
    const normalised = normaliseBlogExcerpt("Nexubis ".repeat(80));

    expect(normalised.length).toBeLessThanOrEqual(300);
    expect(normalised.at(-1)).toBe("…");
  });

  it("removes HTML tags and decodes normal HTML entities", () => {
    expect(normaliseBlogExcerpt("<p>Nexubis &amp; Circuit&nbsp;work</p>")).toBe(
      "Nexubis & Circuit work",
    );
  });

  it("collapses repeated whitespace", () => {
    expect(normaliseBlogExcerpt("One\n\n   two\tthree")).toBe("One two three");
  });

  it("returns an empty value for empty source text", () => {
    expect(normaliseBlogExcerpt("  <p> </p>  ")).toBe("");
  });
});
