export type ManualErrorCode =
  | "url"
  | "short"
  | "challenge"
  | "nopaste"
  | "notready"
  | "timeout"
  | "failed";

export class ManualAuditError extends Error {
  constructor(public readonly code: ManualErrorCode) {
    super(code);
    this.name = "ManualAuditError";
  }
}

export function cleanPastedText(raw: string): string {
  // Preserve line breaks until page boundaries have been identified.
  const text = raw
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, "");
  if (!text.trim()) throw new ManualAuditError("nopaste");
  const pages = text
    .split(/^(?:[\t ]*---[\t ]*|## \[pasted page \d+\])$/m)
    .map((page) =>
      page
        .replace(/^## \[pasted page \d+\]\s*/gm, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);
  const content = pages.join("\n");
  if (
    /just a moment|checking your browser|verify you are human|enable javascript and cookies|attention required|cloudflare/i.test(
      content.slice(0, 800)
    )
  ) {
    throw new ManualAuditError("challenge");
  }
  if (content.length < 400) throw new ManualAuditError("short");
  return pages
    .map((page, i) => `## [pasted page ${i + 1}]\n${page}`)
    .join("\n\n")
    .slice(0, 12_000);
}

export function parseCompetitors(raw = ""): string[] {
  return raw
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 3);
}

export function pastedSiteTitle(text: string): string | null {
  return (
    text
      .replace(/^## \[pasted page \d+\]\s*/, "")
      .split("\n")[0]
      ?.slice(0, 120) || null
  );
}
