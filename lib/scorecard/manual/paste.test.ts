import { describe, expect, it } from "vitest";
import { cleanPastedText, parseCompetitors } from "./paste";

describe("cleanPastedText", () => {
  it("rejects missing and short text before adding labels", () => {
    expect(() => cleanPastedText(" \n\t")).toThrow("nopaste");
    expect(() => cleanPastedText("a".repeat(399))).toThrow("short");
    expect(cleanPastedText("a".repeat(400))).toContain("## [pasted page 1]");
  });
  it.each([
    "Just a moment",
    "Checking your browser",
    "Verify you are human",
    "Enable JavaScript and cookies",
    "Attention required",
    "Cloudflare",
  ])("rejects the challenge phrase %s", (phrase) => {
    expect(() => cleanPastedText(`${phrase} ${"x".repeat(900)}`)).toThrow(
      "challenge"
    );
  });
  it("only checks the first 800 content characters for a challenge", () => {
    expect(cleanPastedText(`${"x".repeat(801)} Cloudflare`)).toContain(
      "Cloudflare"
    );
  });
  it("normalises controls/whitespace, labels page separators and is idempotent for stored text", () => {
    const text = cleanPastedText(
      `Home\u0000\t title\r\n${"a ".repeat(210)}\r\n --- \r\n Inner   page\ninline --- stays`
    );
    expect(text).toContain("## [pasted page 1]\nHome title");
    expect(text).toContain("## [pasted page 2]\nInner page inline --- stays");
    expect(cleanPastedText(text)).toBe(text);
  });
  it("caps the complete labelled text at 12,000 characters, homepage first", () => {
    const text = cleanPastedText(
      `HOMEPAGE ${"x".repeat(14_000)}\n---\nOther page`
    );
    expect(text).toHaveLength(12_000);
    expect(text.startsWith("## [pasted page 1]\nHOMEPAGE")).toBe(true);
    expect(cleanPastedText(text)).toBe(text);
  });
});

it("parses optional competitors, trims and caps at three", () => {
  expect(parseCompetitors()).toEqual([]);
  expect(parseCompetitors(" a, b\n c ,d\n ")).toEqual(["a", "b", "c"]);
});
