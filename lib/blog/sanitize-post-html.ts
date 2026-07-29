import * as cheerio from "cheerio";
import { createHeadingId } from "@/lib/blog/heading-ids";
import type { TableOfContentsItem } from "@/lib/blog/types";

export type SanitizedPostHtml = {
  html: string;
  toc: TableOfContentsItem[];
};

const INTERNAL_ORIGIN = "https://www.nexubis.io";

function rewriteHref(href: string) {
  const trimmed = href.trim();
  if (!trimmed || trimmed.toLowerCase().startsWith("javascript:")) return null;

  if (trimmed.startsWith(INTERNAL_ORIGIN)) {
    return trimmed.slice(INTERNAL_ORIGIN.length) || "/";
  }

  return trimmed;
}

export function sanitizeBlogPostHtml(sourceHtml: string): SanitizedPostHtml {
  const $ = cheerio.load(`<div data-blog-post-root>${sourceHtml}</div>`, null, false);
  const root = $("[data-blog-post-root]");
  const toc: TableOfContentsItem[] = [];
  const headingIds = new Map<string, number>();

  root.find("script, style, noscript").remove();
  root.find("iframe").remove();

  root.find("*").each((_, element) => {
    const node = $(element);
    const tagName = element.tagName.toLowerCase();

    for (const attribute of Object.keys(element.attribs ?? {})) {
      const normalized = attribute.toLowerCase();
      if (
        normalized.startsWith("on") ||
        normalized.startsWith("data-") ||
        normalized.startsWith("vdx-") ||
        normalized.startsWith("wf-")
      ) {
        node.removeAttr(attribute);
      }
    }

    if (tagName === "a") {
      const href = node.attr("href");
      const rewritten = href ? rewriteHref(href) : null;
      if (rewritten) {
        node.attr("href", rewritten);
      } else {
        node.removeAttr("href");
      }
    }

    if (tagName === "img") {
      node.attr("loading", "lazy");
      node.attr("decoding", "async");
    }
  });

  root.find("h2, h3, h4, h5, h6").each((_, element) => {
    const node = $(element);
    const text = node.text().trim();
    if (!text) return;

    const id = createHeadingId(text, headingIds);
    node.attr("id", id);
    toc.push({
      id,
      text,
      level: Number(element.tagName.slice(1)) as TableOfContentsItem["level"],
    });
  });

  return {
    html: root.html() ?? "",
    toc,
  };
}
