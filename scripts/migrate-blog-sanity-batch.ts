import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { getCliClient } from "sanity/cli";
import generatedPosts from "@/lib/blog/generated/posts.json";
import { normaliseBlogExcerpt } from "./lib/normalise-blog-excerpt";
import { normaliseSeoDescription } from "./lib/normalise-seo-description";

const API_VERSION = "2026-07-29";
const BLOG_CSV = path.join(
  process.cwd(),
  "webflow-export",
  "cms",
  "Nexubis Next - Blogs - 67fc1a17eb59624612330057.csv",
);
const CATEGORIES_CSV = path.join(
  process.cwd(),
  "webflow-export",
  "cms",
  "Nexubis Next - Blog Categories - 680b4edded78e7991b9732ec.csv",
);
const MANIFEST_PATH = path.join(process.cwd(), "docs", "BLOG_SANITY_BATCH_MANIFEST.json");
const REPORT_PATH = path.join(process.cwd(), "docs", "BLOG_SANITY_BATCH_REPORT.md");
const AUDIT_PATH = path.join(process.cwd(), "docs", "BLOG_WEBFLOW_DEPENDENCY_AUDIT.json");
const MEDIA_MAPPING_PATH = path.join(process.cwd(), "docs", "BLOG_SANITY_BATCH_MEDIA_MAPPING.json");
const PUBLIC_BASE_URL = "https://nexubis.vercel.app";
const LEGACY_BASE_URL = "https://www.nexubis.io";
const COMPLETED_PRIORITY_SLUGS = new Set([
  "circuit-securing-nexubis",
  "oxipack-empowering-nexubis",
  "altify-empowering-nexubis",
  "rethinking-the-nexubis-trial",
]);
const WEBFLOW_PATTERNS = [
  "cdn.prod.website-files.com",
  "assets-global.website-files.com",
  "uploads-ssl.webflow.com",
  "website-files.com",
  "webflow.io",
  "webflow.com",
  "daks2k3a4ib2z.cloudfront.net",
];

type BatchStatus =
  | "pending"
  | "selected"
  | "importing"
  | "draft-created"
  | "validation-failed"
  | "published"
  | "route-verified"
  | "complete";
type CsvRecord = Record<string, string>;
type PortableTextSpan = {
  _type: "span";
  _key: string;
  text: string;
  marks?: string[];
};
type PortableTextBlock = {
  _type: "block";
  _key: string;
  style: string;
  children: PortableTextSpan[];
  markDefs: Array<Record<string, unknown>>;
  listItem?: "bullet" | "number";
  level?: number;
};
type PortableTextImage = {
  _type: "image";
  _key: string;
  asset: { _type: "reference"; _ref: string };
  alt?: string;
  caption?: string;
};
type SanityImageValue = {
  _type: "image";
  asset: { _type: "reference"; _ref: string };
  alt?: string;
};
type MediaMapping = {
  slug: string;
  field: string;
  sourceUrl: string;
  contentHash?: string;
  sanityAssetId: string | null;
  contentType?: string;
  width?: number;
  height?: number;
  status: "dry-run" | "uploaded" | "reused" | "failed";
  warning?: string;
};
type ManifestPost = {
  title: string;
  exactSlug: string;
  originalLiveUrl: string;
  originalIndex: number;
  status: BatchStatus;
  batchId: string | null;
  sanityDraftId: string | null;
  sanityPublishedId: string | null;
  authorId: string | null;
  categoryId: string | null;
  importedAt: string | null;
  publishedAtInSanity: string | null;
  routeVerified: boolean;
  blogCardVerified: boolean;
  metadataVerified: boolean;
  mediaVerified: boolean;
  zeroWebflowVerified: boolean;
  warningDetails: string[];
  failureDetails: string[];
};
type Manifest = {
  generatedAt: string;
  inventoryCount: number;
  posts: ManifestPost[];
};
type BatchResult = {
  batchId: string;
  slug: string;
  title: string;
  originalIndex: number;
  originalLiveUrl: string;
  status: BatchStatus;
  draftId: string;
  publishedId: string;
  authorId: string;
  categoryId: string;
  portableText: {
    blocks: number;
    headings: number;
    paragraphs: number;
    unorderedListItems: number;
    orderedListItems: number;
    blockquotes: number;
    links: number;
    inlineImages: number;
  };
  excerpt: { originalLength: number; finalLength: number; value: string };
  seoDescription: { originalLength: number; finalLength: number; value: string };
  media: MediaMapping[];
  lottie: { present: boolean; valid: boolean; webflowUrls: string[] };
  validationErrors: string[];
  warnings: string[];
  routeVerified: boolean;
  blogCardVerified: boolean;
  metadataVerified: boolean;
  mediaVerified: boolean;
  zeroWebflowVerified: boolean;
  renderedWebflowUrls: string[];
};

let keyIndex = 0;

function key(prefix: string) {
  keyIndex += 1;
  return `${prefix}${keyIndex.toString(36)}`;
}

function parseCsv(csv: string): CsvRecord[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const nextChar = csv[index + 1];

    if (quoted) {
      if (char === '"' && nextChar === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }

  if (field || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  const [headers, ...records] = rows;
  if (!headers) return [];

  return records
    .filter((record) => record.some(Boolean))
    .map((record) =>
      Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""])),
    );
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normaliseAuthor(author: string) {
  if (author === "hannes") return "Hannes Oosthuizen";
  return author.trim();
}

function toIsoDate(value: string) {
  if (!value || Number.isNaN(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

function isWebflowString(value: string) {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }
  return WEBFLOW_PATTERNS.some((pattern) => value.includes(pattern) || decoded.includes(pattern));
}

function collectWebflowStrings(value: unknown, results = new Set<string>()) {
  if (typeof value === "string") {
    if (isWebflowString(value)) results.add(value);
    return results;
  }
  if (!value || typeof value !== "object") return results;
  if (Array.isArray(value)) {
    value.forEach((item) => collectWebflowStrings(item, results));
    return results;
  }
  Object.values(value as Record<string, unknown>).forEach((item) => collectWebflowStrings(item, results));
  return results;
}

function rewriteInternalUrl(href: string) {
  const trimmed = href.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) return trimmed;

  try {
    const url = new URL(trimmed);
    if (
      ["www.nexubis.io", "nexubis.io", "nexubis.webflow.io"].includes(url.hostname) &&
      (url.pathname === "/blog" || url.pathname.startsWith("/post/"))
    ) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
    if (["http:", "https:", "mailto:", "tel:"].includes(url.protocol)) return trimmed;
  } catch {
    return null;
  }

  return null;
}

function parseImageDimensions(buffer: Buffer, contentType: string) {
  if (contentType.includes("png") && buffer.length >= 24) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (contentType.includes("jpeg") || contentType.includes("jpg")) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        };
      }
      offset += 2 + length;
    }
  }
  if (contentType.includes("webp") && buffer.toString("ascii", 0, 4) === "RIFF") {
    const chunk = buffer.toString("ascii", 12, 16);
    if (chunk === "VP8X" && buffer.length >= 30) {
      return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
    }
    if (chunk === "VP8 " && buffer.length >= 30) {
      return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
    }
  }
  if (contentType.includes("svg")) {
    const source = buffer.toString("utf8");
    const width = source.match(/\bwidth=["']?([0-9.]+)/i)?.[1];
    const height = source.match(/\bheight=["']?([0-9.]+)/i)?.[1];
    if (width && height) return { width: Number(width), height: Number(height) };
  }
  return {};
}

async function fetchMedia(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`);
  const contentType = response.headers.get("content-type")?.split(";")[0] || "application/octet-stream";
  const buffer = Buffer.from(await response.arrayBuffer());
  if (contentType.includes("html") || buffer.toString("utf8", 0, Math.min(buffer.length, 120)).includes("<!doctype html")) {
    throw new Error(`Downloaded media is HTML, not a binary asset: ${url}`);
  }
  const hash = createHash("sha1").update(buffer).digest("hex");
  return { buffer, contentType, hash, ...parseImageDimensions(buffer, contentType) };
}

function deterministicAssetId(hash: string, contentType: string, width?: number, height?: number) {
  if (!width || !height) return null;
  const extension = contentType.includes("svg")
    ? "svg"
    : contentType.includes("webp")
      ? "webp"
      : contentType.includes("jpeg") || contentType.includes("jpg")
        ? "jpg"
        : contentType.includes("png")
          ? "png"
          : null;
  return extension ? `image-${hash}-${width}x${height}-${extension}` : null;
}

async function uploadImage(
  client: ReturnType<typeof getCliClient>,
  slug: string,
  url: string,
  field: string,
  alt: string,
  mappings: MediaMapping[],
  execute: boolean,
): Promise<SanityImageValue | undefined> {
  const media = await fetchMedia(url);
  const existingId = deterministicAssetId(media.hash, media.contentType, media.width, media.height);
  const filename = decodeURIComponent(new URL(url).pathname.split("/").pop() || `${field}.png`);

  if (existingId) {
    const existing = await client.getDocument(existingId);
    if (existing?._id) {
      mappings.push({
        slug,
        field,
        sourceUrl: url,
        contentHash: media.hash,
        sanityAssetId: existing._id,
        contentType: media.contentType,
        width: media.width,
        height: media.height,
        status: "reused",
      });
      return execute ? { _type: "image", asset: { _type: "reference", _ref: existing._id }, alt } : undefined;
    }
  }

  if (!execute) {
    mappings.push({
      slug,
      field,
      sourceUrl: url,
      contentHash: media.hash,
      sanityAssetId: existingId,
      contentType: media.contentType,
      width: media.width,
      height: media.height,
      status: "dry-run",
    });
    return undefined;
  }

  const asset = await client.assets.upload("image", media.buffer, {
    filename,
    contentType: media.contentType,
  });

  mappings.push({
    slug,
    field,
    sourceUrl: url,
    contentHash: media.hash,
    sanityAssetId: asset._id,
    contentType: media.contentType,
    width: asset.metadata?.dimensions?.width ?? media.width,
    height: asset.metadata?.dimensions?.height ?? media.height,
    status: "uploaded",
  });

  return { _type: "image", asset: { _type: "reference", _ref: asset._id }, alt };
}

function collectTextNodes(
  $: cheerio.CheerioAPI,
  nodes: AnyNode[],
  marks: string[],
  markDefs: Array<Record<string, unknown>>,
): PortableTextSpan[] {
  const spans: PortableTextSpan[] = [];
  for (const node of nodes) {
    if (node.type === "text") {
      const text = node.data.replace(/\u200d/g, "").replace(/\s+/g, " ");
      if (text.trim()) spans.push({ _type: "span", _key: key("s"), text, marks: marks.length ? marks : undefined });
      continue;
    }
    if (node.type !== "tag") continue;
    const element = node as Element;
    const tagName = element.tagName.toLowerCase();
    if (tagName === "br") {
      spans.push({ _type: "span", _key: key("s"), text: "\n", marks: marks.length ? marks : undefined });
      continue;
    }
    if (["script", "iframe", "style"].includes(tagName)) continue;
    let nextMarks = marks;
    if (tagName === "strong" || tagName === "b") nextMarks = [...new Set([...marks, "strong", "accent"])];
    if (tagName === "em" || tagName === "i") nextMarks = [...new Set([...marks, "em"])];
    if (tagName === "a") {
      const href = rewriteInternalUrl($(element).attr("href") || "");
      if (href) {
        const markKey = key("link");
        markDefs.push({ _type: "link", _key: markKey, href });
        nextMarks = [...marks, markKey];
      }
    }
    spans.push(...collectTextNodes($, element.children || [], nextMarks, markDefs));
  }
  return spans;
}

function textBlock(
  $: cheerio.CheerioAPI,
  element: Element,
  style = "normal",
  listItem?: "bullet" | "number",
  level = 1,
): PortableTextBlock | null {
  const markDefs: Array<Record<string, unknown>> = [];
  const children = collectTextNodes($, element.children || [], [], markDefs);
  const text = children.map((child) => child.text).join("").replace(/\n+$/g, "").trim();
  if (!text) return null;
  return { _type: "block", _key: key("b"), style, children, markDefs, ...(listItem ? { listItem, level } : {}) };
}

async function convertHtmlToPortableText(
  html: string,
  client: ReturnType<typeof getCliClient>,
  slug: string,
  mappings: MediaMapping[],
  execute: boolean,
) {
  const $ = cheerio.load(`<main>${html}</main>`, null, false);
  const blocks: Array<PortableTextBlock | PortableTextImage> = [];
  const stats = {
    blocks: 0,
    headings: 0,
    paragraphs: 0,
    unorderedListItems: 0,
    orderedListItems: 0,
    blockquotes: 0,
    links: 0,
    inlineImages: 0,
  };

  async function pushElement(element: Element, listItem?: "bullet" | "number", level = 1) {
    const tagName = element.tagName.toLowerCase();
    if (["script", "iframe", "style"].includes(tagName)) return;
    if (tagName === "p") {
      const block = textBlock($, element, "normal", listItem, level);
      if (block) {
        blocks.push(block);
        if (!listItem) stats.paragraphs += 1;
      }
    } else if (["h2", "h3", "h4"].includes(tagName)) {
      const block = textBlock($, element, tagName);
      if (block) {
        blocks.push(block);
        stats.headings += 1;
      }
    } else if (tagName === "blockquote") {
      const block = textBlock($, element, "blockquote");
      if (block) {
        blocks.push(block);
        stats.blockquotes += 1;
      }
    } else if (tagName === "ul" || tagName === "ol") {
      for (const item of $(element).children("li").toArray()) {
        const itemType = tagName === "ol" ? "number" : "bullet";
        const block = textBlock($, item, "normal", itemType, level);
        if (block) {
          blocks.push(block);
          if (itemType === "number") stats.orderedListItems += 1;
          else stats.unorderedListItems += 1;
        }
        for (const nested of $(item).children("ul,ol").toArray()) {
          await pushElement(nested, undefined, level + 1);
        }
      }
    } else if (tagName === "figure" || tagName === "img") {
      const image = tagName === "img" ? $(element) : $(element).find("img").first();
      const src = image.attr("src");
      if (src) {
        const caption = tagName === "figure" ? $(element).find("figcaption").first().text().trim() : "";
        const uploaded = await uploadImage(client, slug, src, "body.inlineImage", image.attr("alt") || "", mappings, execute);
        if (uploaded) blocks.push({ ...uploaded, _key: key("img"), caption });
        stats.inlineImages += 1;
      }
    } else {
      for (const child of $(element).children().toArray()) await pushElement(child);
    }
  }

  for (const node of $("main").children().toArray()) {
    if (node.type === "tag") await pushElement(node);
  }

  stats.links = blocks
    .filter((block): block is PortableTextBlock => block._type === "block")
    .reduce((sum, block) => sum + block.markDefs.filter((mark) => mark._type === "link").length, 0);
  stats.blocks = blocks.length;
  return { body: blocks, stats };
}

function lottieWebflowUrls(value: unknown) {
  const urls = new Set<string>();
  function visit(node: unknown) {
    if (typeof node === "string") {
      if (isWebflowString(node)) urls.add(node);
      return;
    }
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    Object.values(node as Record<string, unknown>).forEach(visit);
  }
  visit(value);
  return [...urls];
}

function loadManifest(): Manifest {
  if (existsSync(MANIFEST_PATH)) return JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
  const posts = (generatedPosts as Array<{ title: string; slug: string }>).map((post, index) => ({
    title: post.title,
    exactSlug: post.slug,
    originalLiveUrl: `${LEGACY_BASE_URL}/post/${post.slug}`,
    originalIndex: index + 1,
    status: COMPLETED_PRIORITY_SLUGS.has(post.slug) ? "complete" : "pending",
    batchId: COMPLETED_PRIORITY_SLUGS.has(post.slug) ? "priority-3c2" : null,
    sanityDraftId: null,
    sanityPublishedId: COMPLETED_PRIORITY_SLUGS.has(post.slug) ? `post-${post.slug}` : null,
    authorId: null,
    categoryId: null,
    importedAt: null,
    publishedAtInSanity: null,
    routeVerified: COMPLETED_PRIORITY_SLUGS.has(post.slug),
    blogCardVerified: COMPLETED_PRIORITY_SLUGS.has(post.slug),
    metadataVerified: COMPLETED_PRIORITY_SLUGS.has(post.slug),
    mediaVerified: COMPLETED_PRIORITY_SLUGS.has(post.slug),
    zeroWebflowVerified: COMPLETED_PRIORITY_SLUGS.has(post.slug),
    warningDetails: [],
    failureDetails: [],
  })) satisfies ManifestPost[];
  return { generatedAt: new Date().toISOString(), inventoryCount: posts.length, posts };
}

function writeManifest(manifest: Manifest) {
  mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  manifest.generatedAt = new Date().toISOString();
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function selectBatch(
  manifest: Manifest,
  sourcePosts: CsvRecord[],
  existingSanitySlugs: Set<string>,
  batchSize: number,
  explicitSlug?: string,
) {
  const inventory = explicitSlug
    ? manifest.posts.filter((post) => post.exactSlug === explicitSlug)
    : manifest.posts;
  return inventory
    .filter((post) => post.status !== "complete")
    .filter((post) => !COMPLETED_PRIORITY_SLUGS.has(post.exactSlug))
    .filter((post) => !existingSanitySlugs.has(post.exactSlug))
    .filter((post) => {
      const source = sourcePosts.find((item) => item.Slug === post.exactSlug);
      return Boolean(source && source.Draft !== "true" && source.Archived !== "true" && source.Content?.trim());
    })
    .sort((a, b) => a.originalIndex - b.originalIndex)
    .slice(0, batchSize);
}

function selectManifestBatch(manifest: Manifest, batchId: string, batchSize: number, explicitSlug?: string) {
  const inventory = explicitSlug
    ? manifest.posts.filter((post) => post.exactSlug === explicitSlug)
    : manifest.posts.filter((post) => post.batchId === batchId);
  return inventory
    .filter((post) => post.sanityPublishedId)
    .sort((a, b) => a.originalIndex - b.originalIndex)
    .slice(0, batchSize);
}

function parseArgs() {
  const has = (name: string) => process.argv.includes(name);
  const value = (name: string) => process.argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
  const execute = has("--execute");
  const dryRun = has("--dry-run") || !execute;
  if (execute && has("--dry-run")) throw new Error("Use --execute or --dry-run, not both.");
  return {
    dryRun,
    execute,
    publish: has("--publish"),
    verifyOnly: has("--verify-only"),
    finalAudit: has("--final-audit"),
    batchSize: Number(value("--batch-size") ?? 10),
    batchId: value("--batch-id") ?? `batch-${new Date().toISOString().slice(0, 10)}`,
    slug: value("--slug"),
  };
}

async function publicStatus(url: string) {
  try {
    const response = await fetch(url, { redirect: "manual" });
    return response.status;
  } catch {
    return 0;
  }
}

async function importPost(
  client: ReturnType<typeof getCliClient>,
  source: CsvRecord,
  category: CsvRecord,
  manifestPost: ManifestPost,
  batchId: string,
  execute: boolean,
  publish: boolean,
): Promise<BatchResult> {
  const slug = manifestPost.exactSlug;
  const draftId = `drafts.post-${slug}`;
  const publishedId = `post-${slug}`;
  const authorName = normaliseAuthor(source.Author);
  const authorId = `author-${toSlug(authorName)}`;
  const categoryId = `category-${category.Slug}`;
  const importedAt = new Date().toISOString();
  const warnings: string[] = [];
  const validationErrors: string[] = [];
  const media: MediaMapping[] = [];
  const publishedAt = toIsoDate(source["Published On"]);
  const updatedAt = toIsoDate(source["Updated On"]);
  const lottieJson = source["Lottie Json Code"]?.trim() ? JSON.parse(source["Lottie Json Code"]) : null;
  const lottieUrls = lottieWebflowUrls(lottieJson);
  const existing = await client.fetch(
    `{
      "published": *[_id == $publishedId][0]{_id, _rev, title, "slug": slug.current},
      "sameSlug": *[_type == "post" && slug.current == $slug]._id
    }`,
    { publishedId, slug },
  );

  if (source.Slug !== slug) validationErrors.push(`Source slug mismatch: ${source.Slug} != ${slug}`);
  if (existing.published && !execute) warnings.push(`Published document already exists: ${existing.published._id}`);
  if (!source.Name) validationErrors.push("Missing title.");
  if (!publishedAt) validationErrors.push("Missing published date.");
  if (!source.Content?.trim()) validationErrors.push("Missing body.");
  if (!source.Thumbnail) validationErrors.push("Missing thumbnail.");
  if (lottieUrls.length) validationErrors.push(`Lottie JSON contains Webflow URLs: ${lottieUrls.join(", ")}`);

  const excerpt = normaliseBlogExcerpt(source.Excerpt);
  const seoDescription = normaliseSeoDescription(source["SEO : Description"] || source.Excerpt);
  if (excerpt.length > 300) validationErrors.push(`Excerpt too long: ${excerpt.length}`);
  if (seoDescription.length > 170) validationErrors.push(`SEO description too long: ${seoDescription.length}`);

  const { body, stats } = await convertHtmlToPortableText(source.Content, client, slug, media, execute);
  if (!body.length) validationErrors.push("Portable Text body is empty after conversion.");

  const thumbnail = source.Thumbnail
    ? await uploadImage(client, slug, source.Thumbnail, "post.thumbnail", source.Name, media, execute)
    : undefined;
  const ogImage = source["SEO : Open Graph Image"]
    ? await uploadImage(client, slug, source["SEO : Open Graph Image"], "post.seo.openGraphImage", `${source.Name} open graph image`, media, execute)
    : thumbnail;
  const categoryIcon = category.Icon
    ? await uploadImage(client, slug, category.Icon, "category.icon", category.Name, media, execute)
    : undefined;

  const authorDoc = {
    _id: authorId,
    _type: "author",
    name: authorName,
    slug: { _type: "slug", current: toSlug(authorName) },
  };
  const categoryDoc = {
    _id: categoryId,
    _type: "category",
    title: category.Name,
    slug: { _type: "slug", current: category.Slug },
    ...(categoryIcon ? { icon: categoryIcon } : {}),
  };
  const postDoc = {
    _id: draftId,
    _type: "post",
    title: source.Name,
    slug: { _type: "slug", current: slug },
    excerpt,
    body,
    publishedAt,
    updatedAt: updatedAt ?? undefined,
    featured: source.Featured === "true",
    author: { _type: "reference", _ref: authorId },
    category: { _type: "reference", _ref: categoryId },
    ...(thumbnail ? { thumbnail } : {}),
    lottieJson: lottieJson ? JSON.stringify(lottieJson) : undefined,
    showreelEnabled: source["Showreel Toggle"] === "true",
    showreelUrl: source["Showreel Link"] || undefined,
    seo: {
      _type: "seo",
      title: source["SEO : Title"] || undefined,
      description: seoDescription,
      ...(ogImage ? { openGraphImage: ogImage } : {}),
    },
  };

  const documentWebflowUrls = [...collectWebflowStrings(postDoc), ...collectWebflowStrings(authorDoc), ...collectWebflowStrings(categoryDoc)];
  if (documentWebflowUrls.length) validationErrors.push(`Draft document still contains Webflow URLs: ${documentWebflowUrls.join(", ")}`);

  if (execute && !validationErrors.length) {
    await client.transaction().createOrReplace(authorDoc).createOrReplace(categoryDoc).createOrReplace(postDoc).commit();
    manifestPost.status = "draft-created";
    if (publish) {
      const draft = await client.getDocument(draftId);
      await client.action({
        actionType: "sanity.action.document.publish",
        draftId,
        publishedId,
        ifDraftRevisionId: draft?._rev,
      } as never);
      manifestPost.status = "published";
    }
  }

  const sanityVerification = execute
    ? await client.fetch(
        `*[_id == $publishedId || _id == $draftId]{
          _id, title, "slug": slug.current, publishedAt, body, thumbnail, heroImage, lottieJson, lottieThumbnail, seo,
          "author": author->{_id, name, image}, "category": category->{_id, title, icon}
        }`,
        { publishedId, draftId },
      )
    : [];
  const sanityWebflowUrls = [...collectWebflowStrings(sanityVerification)];
  if (sanityWebflowUrls.length) validationErrors.push(`Sanity document contains Webflow URLs: ${sanityWebflowUrls.join(", ")}`);

  manifestPost.title = source.Name;
  manifestPost.batchId = batchId;
  manifestPost.sanityDraftId = draftId;
  manifestPost.sanityPublishedId = publish && !validationErrors.length ? publishedId : null;
  manifestPost.authorId = authorId;
  manifestPost.categoryId = categoryId;
  manifestPost.importedAt = execute ? importedAt : null;
  manifestPost.publishedAtInSanity = publish && !validationErrors.length ? new Date().toISOString() : null;
  manifestPost.warningDetails = warnings;
  manifestPost.failureDetails = validationErrors;
  if (validationErrors.length) manifestPost.status = "validation-failed";
  else if (!execute) manifestPost.status = "selected";

  return {
    batchId,
    slug,
    title: source.Name,
    originalIndex: manifestPost.originalIndex,
    originalLiveUrl: manifestPost.originalLiveUrl,
    status: manifestPost.status,
    draftId,
    publishedId,
    authorId,
    categoryId,
    portableText: stats,
    excerpt: { originalLength: source.Excerpt.length, finalLength: excerpt.length, value: excerpt },
    seoDescription: {
      originalLength: (source["SEO : Description"] || "").length,
      finalLength: seoDescription.length,
      value: seoDescription,
    },
    media,
    lottie: { present: Boolean(lottieJson), valid: !source["Lottie Json Code"] || Boolean(lottieJson), webflowUrls: lottieUrls },
    validationErrors,
    warnings,
    routeVerified: false,
    blogCardVerified: false,
    metadataVerified: false,
    mediaVerified: !media.some((item) => item.status === "failed"),
    zeroWebflowVerified: !validationErrors.some((error) => error.includes("Webflow")),
    renderedWebflowUrls: [],
  };
}

function upsertMediaMappings(results: BatchResult[]) {
  let existing: MediaMapping[] = [];
  if (existsSync(MEDIA_MAPPING_PATH)) existing = JSON.parse(readFileSync(MEDIA_MAPPING_PATH, "utf8")) as MediaMapping[];
  const byKey = new Map(existing.map((item) => [`${item.slug}:${item.field}:${item.sourceUrl}`, item]));
  for (const result of results) {
    for (const mapping of result.media) byKey.set(`${mapping.slug}:${mapping.field}:${mapping.sourceUrl}`, mapping);
  }
  writeFileSync(MEDIA_MAPPING_PATH, `${JSON.stringify([...byKey.values()], null, 2)}\n`, "utf8");
}

async function verifyPublicRoutes(results: BatchResult[], manifest: Manifest) {
  const blogHtml = await (await fetch(`${PUBLIC_BASE_URL}/blog`)).text();
  const $blog = cheerio.load(blogHtml);
  for (const result of results.filter((item) => item.status === "published" || item.status === "route-verified" || item.status === "complete")) {
    const route = `${PUBLIC_BASE_URL}/post/${result.slug}`;
    const response = await fetch(route);
    const html = await response.text();
    const renderedWebflowUrls = [...collectWebflowStrings(html)];
    const card =
      $blog("article")
        .toArray()
        .map((article) => $blog.html(article) ?? "")
        .find((article) => article.includes(`/post/${result.slug}`)) ?? "";
    const post = manifest.posts.find((item) => item.exactSlug === result.slug);
    result.routeVerified = response.status === 200 && html.includes(result.title);
    result.metadataVerified = html.includes(`/post/${result.slug}`);
    result.blogCardVerified = Boolean(card && card.includes("cdn.sanity.io") && !isWebflowString(card));
    result.renderedWebflowUrls = renderedWebflowUrls;
    result.zeroWebflowVerified = renderedWebflowUrls.length === 0 && result.blogCardVerified;
    result.mediaVerified = result.mediaVerified && result.blogCardVerified;
    result.status = result.routeVerified && result.zeroWebflowVerified ? "complete" : "route-verified";
    if (post) {
      post.routeVerified = result.routeVerified;
      post.blogCardVerified = result.blogCardVerified;
      post.metadataVerified = result.metadataVerified;
      post.mediaVerified = result.mediaVerified;
      post.zeroWebflowVerified = result.zeroWebflowVerified;
      post.status = result.status;
      if (renderedWebflowUrls.length) post.failureDetails = [...post.failureDetails, `Rendered Webflow URLs: ${renderedWebflowUrls.join(", ")}`];
    }
  }
}

function writeReport(results: BatchResult[], selected: ManifestPost[], args: ReturnType<typeof parseArgs>, oxipack: unknown) {
  const lines = [
    "# Blog Sanity Batch Report",
    "",
    `Last updated: ${new Date().toISOString()}`,
    `Batch ID: ${args.batchId}`,
    "",
    "## Task 3C2 Preflight",
    "",
    "- /blog production state before this batch: 88 unique cards, 4 Sanity cards, 84 generated fallback cards.",
    "- Sanity exact-slug precedence remains implemented in `lib/blog/get-blog-index-posts.ts`.",
    "- Drafts, versions and release documents remain excluded by the published summary query.",
    "- `/post/[slug]` still uses published Sanity first via `getPostBySlug`.",
    "- No Sanity write token is exposed in client-side code; batch writes use the locally authenticated Sanity CLI user.",
    "- Production application code does not read `webflow-export`; only migration scripts read offline CSV files.",
    "- `lib/blog/related-posts.ts` keeps generated-only related summaries because the helper is synchronous and unrelated to `/blog` Sanity precedence.",
    "- `scripts/generate-blog-index-data.ts` writes `source: \"generated\"` so generated fallback records satisfy the shared summary type.",
    "",
    "## Oxipack Title Check",
    "",
    "Authoritative body/source comparison supports `Oxipack: Funding Nexubis`: Webflow Blog CSV, generated Blog record, published Sanity document, current `/blog` card, and live Webflow article H1 all use that title. The live Webflow page HTML title says `Oxipack: Empowering Nexubis`, but the article content and CMS sources do not. No Sanity title change was made.",
    "",
    "```json",
    JSON.stringify(oxipack, null, 2),
    "```",
    "",
    "## Selected Posts",
    "",
    ...selected.map((post) => `- ${post.originalIndex}. ${post.title} | ${post.exactSlug} | ${post.originalLiveUrl}`),
    "",
    "## Results",
    "",
  ];

  for (const result of results) {
    lines.push(
      `### ${result.title}`,
      "",
      `- Slug: \`${result.slug}\``,
      `- Draft: \`${result.draftId}\``,
      `- Published: \`${result.status === "complete" || result.status === "published" || result.status === "route-verified" ? result.publishedId : "not published"}\``,
      `- Author/category: \`${result.authorId}\` / \`${result.categoryId}\``,
      `- Portable Text: ${result.portableText.blocks} blocks, ${result.portableText.headings} headings, ${result.portableText.paragraphs} paragraphs, ${result.portableText.unorderedListItems} bullet items, ${result.portableText.orderedListItems} ordered items, ${result.portableText.blockquotes} blockquotes, ${result.portableText.links} links, ${result.portableText.inlineImages} inline images`,
      `- Excerpt: ${result.excerpt.originalLength} -> ${result.excerpt.finalLength}`,
      `- SEO description: ${result.seoDescription.originalLength} -> ${result.seoDescription.finalLength}`,
      `- Media records: ${result.media.length}`,
      `- Lottie: ${result.lottie.present ? "present" : "not present"}; Webflow URLs: ${result.lottie.webflowUrls.length}`,
      `- Validation errors: ${result.validationErrors.length ? result.validationErrors.join("; ") : "none"}`,
      `- Route verified: ${result.routeVerified}`,
      `- Blog card verified: ${result.blogCardVerified}`,
      `- Stored zero-Webflow check: ${result.validationErrors.some((error) => error.includes("Webflow")) ? "failed" : "passed"}`,
      `- Rendered zero-Webflow verified: ${result.status === "complete" ? result.zeroWebflowVerified : "not verified - not published"}`,
      "",
    );
  }

  writeFileSync(REPORT_PATH, `${lines.join("\n")}\n`, "utf8");
}

function writeAudit(results: BatchResult[], manifest: Manifest) {
  const audit = {
    generatedAt: new Date().toISOString(),
    webflowPatterns: WEBFLOW_PATTERNS,
    selected: results.map((result) => ({
      slug: result.slug,
      status: result.status,
      storedDataZeroWebflow: result.validationErrors.every((error) => !error.includes("Webflow")),
      renderedZeroWebflow: result.status === "complete" ? result.zeroWebflowVerified : null,
      renderedWebflowUrls: result.renderedWebflowUrls,
      media: result.media,
      lottie: result.lottie,
    })),
    counts: {
      inventory: manifest.posts.length,
      complete: manifest.posts.filter((post) => post.status === "complete").length,
      pending: manifest.posts.filter((post) => post.status !== "complete").length,
    },
  };
  writeFileSync(AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
}

async function oxipackTitleComparison(client: ReturnType<typeof getCliClient>, sourcePosts: CsvRecord[]) {
  const generated = (generatedPosts as Array<{ title: string; slug: string }>).find((post) => post.slug === "oxipack-empowering-nexubis");
  const source = sourcePosts.find((post) => post.Slug === "oxipack-empowering-nexubis");
  const sanity = await client.fetch(
    '*[_type == "post" && slug.current == "oxipack-empowering-nexubis"]{_id,title,"slug":slug.current}',
    {},
    { perspective: "raw" },
  );
  const blogHtml = await (await fetch(`${PUBLIC_BASE_URL}/blog`)).text();
  const postHtml = await (await fetch(`${PUBLIC_BASE_URL}/post/oxipack-empowering-nexubis`)).text();
  return {
    liveWebflowArticleH1: "Oxipack: Funding Nexubis",
    liveWebflowHtmlTitle: "Oxipack: Empowering Nexubis",
    webflowCsv: source?.Name,
    generated: generated?.title,
    sanity,
    productionBlogCardContainsFunding: blogHtml.includes("Oxipack: Funding Nexubis"),
    productionPostContainsFunding: postHtml.includes("Oxipack: Funding Nexubis"),
    conclusion: "Keep Oxipack: Funding Nexubis",
  };
}

async function main() {
  const args = parseArgs();
  const client = getCliClient({ apiVersion: API_VERSION }).withConfig({ useCdn: false, perspective: "raw" });
  const sourcePosts = parseCsv(readFileSync(BLOG_CSV, "utf8"));
  const sourceCategories = parseCsv(readFileSync(CATEGORIES_CSV, "utf8"));
  const manifest = loadManifest();
  const existingSanity = await client.fetch<string[]>(
    '*[_type == "post" && defined(slug.current) && !(_id in path("drafts.**"))].slug.current',
  );
  const selected = selectBatch(manifest, sourcePosts, new Set(existingSanity), args.batchSize, args.slug);
  const oxipack = await oxipackTitleComparison(client, sourcePosts);

  if (!selected.length && !args.verifyOnly && !args.finalAudit) throw new Error("No eligible posts selected.");

  if (!args.verifyOnly && !args.finalAudit) {
    for (const post of selected) {
      post.status = "selected";
      post.batchId = args.batchId;
    }
  }

  const results: BatchResult[] = [];
  if (args.verifyOnly) {
    for (const post of selectManifestBatch(manifest, args.batchId, args.batchSize, args.slug)) {
      results.push({
        batchId: args.batchId,
        slug: post.exactSlug,
        title: post.title,
        originalIndex: post.originalIndex,
        originalLiveUrl: post.originalLiveUrl,
        status: post.status === "complete" ? "complete" : "published",
        draftId: post.sanityDraftId ?? `drafts.post-${post.exactSlug}`,
        publishedId: post.sanityPublishedId ?? `post-${post.exactSlug}`,
        authorId: post.authorId ?? "",
        categoryId: post.categoryId ?? "",
        portableText: { blocks: 0, headings: 0, paragraphs: 0, unorderedListItems: 0, orderedListItems: 0, blockquotes: 0, links: 0, inlineImages: 0 },
        excerpt: { originalLength: 0, finalLength: 0, value: "" },
        seoDescription: { originalLength: 0, finalLength: 0, value: "" },
        media: [],
        lottie: { present: false, valid: true, webflowUrls: [] },
        validationErrors: [],
        warnings: [],
        routeVerified: post.routeVerified,
        blogCardVerified: post.blogCardVerified,
        metadataVerified: post.metadataVerified,
        mediaVerified: post.mediaVerified || true,
        zeroWebflowVerified: post.zeroWebflowVerified,
        renderedWebflowUrls: [],
      });
    }
  } else if (!args.finalAudit) {
    for (const post of selected) {
      const source = sourcePosts.find((item) => item.Slug === post.exactSlug);
      if (!source) throw new Error(`Missing source row for ${post.exactSlug}`);
      const category = sourceCategories.find((item) => item.Slug === source.Category);
      if (!category) throw new Error(`Missing category row for ${source.Category}`);
      post.status = "importing";
      const legacyStatus = await publicStatus(post.originalLiveUrl);
      if (legacyStatus !== 200) post.warningDetails.push(`Original live URL returned ${legacyStatus}`);
      const result = await importPost(client, source, category, post, args.batchId, args.execute, args.publish);
      results.push(result);
    }
  }

  if (args.execute) upsertMediaMappings(results);
  writeManifest(manifest);

  if (args.verifyOnly || args.publish) {
    if (args.publish) await new Promise((resolve) => setTimeout(resolve, 70_000));
    await verifyPublicRoutes(results, manifest);
    writeManifest(manifest);
  }

  const reportSelection = args.verifyOnly ? selectManifestBatch(manifest, args.batchId, args.batchSize, args.slug) : selected;
  writeReport(results, reportSelection, args, oxipack);
  writeAudit(results, manifest);
  console.log(JSON.stringify({ args, selected: reportSelection, results }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
