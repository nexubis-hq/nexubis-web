import type { TableOfContentsItem } from "@/lib/blog/types";

export function slugifyHeading(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function uniqueHeadingId(base: string, seen: Map<string, number>) {
  const normalized = base || "section";
  const count = seen.get(normalized) ?? 0;
  seen.set(normalized, count + 1);
  return count === 0 ? normalized : `${normalized}-${count + 1}`;
}

export function createHeadingId(text: string, seen: Map<string, number>) {
  return uniqueHeadingId(slugifyHeading(text), seen);
}

export function collectPortableTextHeadings(blocks: unknown[]): TableOfContentsItem[] {
  const seen = new Map<string, number>();

  return blocks
    .filter((block): block is { style?: string; children?: Array<{ text?: string }> } => {
      if (!block || typeof block !== "object") return false;
      const style = (block as { style?: string }).style;
      return style === "h2" || style === "h3" || style === "h4" || style === "h5" || style === "h6";
    })
    .map((block) => {
      const text = (block.children ?? []).map((child) => child.text ?? "").join("").trim();
      const level = Number(block.style?.slice(1)) as TableOfContentsItem["level"];

      return {
        id: createHeadingId(text, seen),
        text,
        level,
      };
    })
    .filter((item) => item.text);
}
