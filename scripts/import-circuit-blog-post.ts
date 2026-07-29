import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { getCliClient } from "sanity/cli";
import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { normaliseBlogExcerpt } from "./lib/normalise-blog-excerpt";

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

const SLUG = "circuit-securing-nexubis";
const POST_ID = `drafts.post-${SLUG}`;
const AUTHOR_ID = "author-hannes-oosthuizen";
const CATEGORY_ID = "category-empowering-dreams";
const API_VERSION = "2026-07-29";
const REPORT_PATH = path.join(process.cwd(), "docs", "BLOG_CIRCUIT_SANITY_IMPORT_REPORT.md");
const MEDIA_MAPPING_PATH = path.join(process.cwd(), "docs", "BLOG_CIRCUIT_MEDIA_MAPPING.json");
const TEMP_DIR = path.join(process.cwd(), ".tmp-sanity-import", SLUG);

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
type PortableTextValue = Array<PortableTextBlock | PortableTextImage>;
type SanityImageValue = {
  _type: "image";
  asset: { _type: "reference"; _ref: string };
  alt?: string;
};
type MediaMapping = {
  field: string;
  sourceUrl: string;
  sanityAssetId: string | null;
  contentType?: string;
  width?: number;
  height?: number;
  status: "dry-run" | "uploaded" | "reused" | "skipped" | "failed";
  warning?: string;
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

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
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

function normaliseAuthor(author: string) {
  if (author === "hannes") return "Hannes Oosthuizen";
  return author;
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toIsoDate(value: string) {
  if (!value || Number.isNaN(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

function rewriteInternalUrl(href: string) {
  try {
    const url = new URL(href);
    if (url.hostname === "www.nexubis.io" || url.hostname === "nexubis.io") {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return href;
  }
  return href;
}

function safeHref(href: string) {
  const rewritten = rewriteInternalUrl(href.trim());
  if (!rewritten) return null;
  if (rewritten.startsWith("/")) return rewritten;

  try {
    const url = new URL(rewritten);
    if (["http:", "https:", "mailto:", "tel:"].includes(url.protocol)) return rewritten;
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
      return {
        width: 1 + buffer.readUIntLE(24, 3),
        height: 1 + buffer.readUIntLE(27, 3),
      };
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

function sanityImageAssetId(buffer: Buffer, contentType: string, width?: number, height?: number) {
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

  if (!extension) return null;

  const hash = createHash("sha1").update(buffer).digest("hex");
  return `image-${hash}-${width}x${height}-${extension}`;
}

async function fetchMedia(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type")?.split(";")[0] || "application/octet-stream";
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    buffer,
    contentType,
    ...parseImageDimensions(buffer, contentType),
  };
}

async function uploadImage(
  client: ReturnType<typeof getCliClient>,
  url: string,
  field: string,
  alt: string,
  mappings: MediaMapping[],
  execute: boolean,
): Promise<SanityImageValue | undefined> {
  const media = await fetchMedia(url);
  const filename = decodeURIComponent(new URL(url).pathname.split("/").pop() || `${field}.png`);
  const deterministicAssetId = sanityImageAssetId(
    media.buffer,
    media.contentType,
    media.width,
    media.height,
  );

  if (!execute) {
    if (deterministicAssetId) {
      const existingAsset = await client.getDocument(deterministicAssetId);
      if (existingAsset?._id) {
        mappings.push({
          field,
          sourceUrl: url,
          sanityAssetId: existingAsset._id,
          contentType: media.contentType,
          width: media.width,
          height: media.height,
          status: "reused",
        });
        return undefined;
      }
    }

    mappings.push({
      field,
      sourceUrl: url,
      sanityAssetId: null,
      contentType: media.contentType,
      width: media.width,
      height: media.height,
      status: "dry-run",
    });
    return undefined;
  }

  mkdirSync(TEMP_DIR, { recursive: true });
  if (deterministicAssetId) {
    const existingAsset = await client.getDocument(deterministicAssetId);
    if (existingAsset?._id) {
      mappings.push({
        field,
        sourceUrl: url,
        sanityAssetId: existingAsset._id,
        contentType: media.contentType,
        width: media.width,
        height: media.height,
        status: "reused",
      });

      return {
        _type: "image",
        asset: { _type: "reference", _ref: existingAsset._id },
        alt,
      };
    }
  }

  const asset = await client.assets.upload("image", media.buffer, {
    filename,
    contentType: media.contentType,
  });

  mappings.push({
    field,
    sourceUrl: url,
    sanityAssetId: asset._id,
    contentType: media.contentType,
    width: asset.metadata?.dimensions?.width ?? media.width,
    height: asset.metadata?.dimensions?.height ?? media.height,
    status: "uploaded",
  });

  return {
    _type: "image",
    asset: { _type: "reference", _ref: asset._id },
    alt,
  };
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

    if (tagName === "script" || tagName === "iframe") continue;

    let nextMarks = marks;
    if (tagName === "strong" || tagName === "b") nextMarks = [...new Set([...marks, "strong", "accent"])];
    if (tagName === "em" || tagName === "i") nextMarks = [...new Set([...marks, "em"])];

    if (tagName === "a") {
      const href = safeHref($(element).attr("href") || "");
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

  return {
    _type: "block",
    _key: key("b"),
    style,
    children,
    markDefs,
    ...(listItem ? { listItem, level } : {}),
  };
}

async function convertHtmlToPortableText(
  html: string,
  client: ReturnType<typeof getCliClient>,
  mappings: MediaMapping[],
  execute: boolean,
) {
  const $ = cheerio.load(`<main>${html}</main>`, null, false);
  const blocks: PortableTextValue = [];
  const stats = {
    headings: 0,
    paragraphs: 0,
    unorderedLists: 0,
    orderedLists: 0,
    links: 0,
    inlineImages: 0,
    blocks: 0,
  };

  async function visitList(list: Element, listItem: "bullet" | "number", level: number) {
    if (listItem === "bullet") stats.unorderedLists += 1;
    if (listItem === "number") stats.orderedLists += 1;

    for (const item of $(list).children("li").toArray()) {
      const block = textBlock($, item, "normal", listItem, level);
      if (block) blocks.push(block);

      for (const nested of $(item).children("ul,ol").toArray()) {
        await visitList(nested, nested.tagName.toLowerCase() === "ol" ? "number" : "bullet", level + 1);
      }
    }
  }

  for (const node of $("main").children().toArray()) {
    if (node.type !== "tag") continue;
    const tagName = node.tagName.toLowerCase();

    if (tagName === "script" || tagName === "iframe") continue;

    if (tagName === "p") {
      const block = textBlock($, node, "normal");
      if (block) {
        stats.paragraphs += 1;
        blocks.push(block);
      }
    } else if (["h2", "h3", "h4"].includes(tagName)) {
      const block = textBlock($, node, tagName);
      if (block) {
        stats.headings += 1;
        blocks.push(block);
      }
    } else if (tagName === "ul" || tagName === "ol") {
      await visitList(node, tagName === "ol" ? "number" : "bullet", 1);
    } else if (tagName === "figure" || tagName === "img") {
      const image = tagName === "img" ? $(node) : $(node).find("img").first();
      const src = image.attr("src");
      if (src) {
        stats.inlineImages += 1;
        const caption = tagName === "figure" ? $(node).find("figcaption").first().text().trim() : "";
        const uploaded = await uploadImage(client, src, "body.inlineImage", image.attr("alt") || "", mappings, execute);
        if (uploaded) blocks.push({ ...uploaded, _key: key("img"), caption });
      }
    }
  }

  stats.links = blocks
    .filter((block): block is PortableTextBlock => block._type === "block")
    .reduce((sum, block) => sum + block.markDefs.filter((mark) => mark._type === "link").length, 0);
  stats.blocks = blocks.length;

  return { body: blocks, stats };
}

function lottieAssetUrls(value: unknown) {
  const urls: string[] = [];

  function visit(node: unknown) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const record = node as Record<string, unknown>;
    if (typeof record.u === "string" && typeof record.p === "string" && /^https?:\/\//.test(`${record.u}${record.p}`)) {
      urls.push(`${record.u}${record.p}`);
    }
    Object.values(record).forEach(visit);
  }

  visit(value);
  return urls;
}

async function loadSource() {
  const posts = parseCsv(readFileSync(BLOG_CSV, "utf8"));
  const categories = parseCsv(readFileSync(CATEGORIES_CSV, "utf8"));
  const matches = posts.filter((record) => record.Slug === SLUG);

  if (matches.length !== 1) {
    throw new Error(`Expected one source row for ${SLUG}, got ${matches.length}.`);
  }

  const record = matches[0];
  const category = categories.find((item) => item.Slug === record.Category);
  if (!category) throw new Error(`Missing category source row for ${record.Category}.`);

  const lottieSource = record["Lottie Json Code"].trim();
  const lottieJson = lottieSource ? JSON.parse(lottieSource) : null;

  return { record, category, lottieJson };
}

async function main() {
  const execute = process.argv.includes("--execute");
  const dryRun = process.argv.includes("--dry-run") || !execute;

  if (execute && dryRun) {
    throw new Error("Use either --dry-run or --execute, not both.");
  }

  const client = getCliClient({ apiVersion: API_VERSION }).withConfig({
    useCdn: false,
    perspective: "raw",
  });
  const { record, category, lottieJson } = await loadSource();
  const normalisedExcerpt = normaliseBlogExcerpt(record.Excerpt);
  const mappings: MediaMapping[] = [];
  const warnings: string[] = [];

  const publishedAt = toIsoDate(record["Published On"]);
  const updatedAt = toIsoDate(record["Updated On"]);
  const requiredFields = [
    ["Name", record.Name],
    ["Slug", record.Slug],
    ["Excerpt", normalisedExcerpt],
    ["Author", record.Author],
    ["Category", record.Category],
    ["Published On", publishedAt],
    ["Content", record.Content],
    ["Thumbnail", record.Thumbnail],
  ].filter(([, value]) => !value);

  const existing = await client.fetch(
    `{
      "draftPost": *[_id == $draftId][0]{_id, _rev, title, slug},
      "publishedPost": *[_type == "post" && !(_id in path("drafts.**")) && slug.current == $slug][0]{_id, title},
      "sameSlug": *[_type == "post" && slug.current == $slug]._id,
      "author": *[_id == $authorId][0]{_id, name},
      "category": *[_id == $categoryId][0]{_id, title}
    }`,
    { draftId: POST_ID, slug: SLUG, authorId: AUTHOR_ID, categoryId: CATEGORY_ID },
  );

  const { body, stats } = await convertHtmlToPortableText(record.Content, client, mappings, execute);
  const thumbnail = await uploadImage(client, record.Thumbnail, "post.thumbnail", record.Name, mappings, execute);
  const lottieThumbnail =
    record["Lottie Thumbnail"] === "true" && record.Thumbnail
      ? await uploadImage(client, record.Thumbnail, "post.lottieThumbnail", `${record.Name} Lottie thumbnail`, mappings, execute)
      : undefined;
  const ogImage = record["SEO : Open Graph Image"]
    ? await uploadImage(client, record["SEO : Open Graph Image"], "post.seo.openGraphImage", `${record.Name} open graph image`, mappings, execute)
    : undefined;
  const categoryIcon = category.Icon
    ? await uploadImage(client, category.Icon, "category.icon", category.Name, mappings, execute).catch((error: Error) => {
          warnings.push(`Category icon upload skipped: ${error.message}`);
          mappings.push({
            field: "category.icon",
            sourceUrl: category.Icon,
            sanityAssetId: null,
            status: "failed",
            warning: error.message,
          });
          return undefined;
        })
    : undefined;

  const lottieUrls = lottieAssetUrls(lottieJson);
  if (lottieUrls.length) warnings.push(`Lottie JSON contains external asset URLs: ${lottieUrls.join(", ")}`);

  const authorDoc = {
    _id: AUTHOR_ID,
    _type: "author",
    name: normaliseAuthor(record.Author),
    slug: { _type: "slug", current: toSlug(normaliseAuthor(record.Author)) },
  };

  const categoryDoc = {
    _id: CATEGORY_ID,
    _type: "category",
    title: category.Name,
    slug: { _type: "slug", current: category.Slug },
    ...(categoryIcon ? { icon: categoryIcon } : {}),
  };

  const postDoc = {
    _id: POST_ID,
    _type: "post",
    title: record.Name,
    slug: { _type: "slug", current: record.Slug },
    excerpt: normalisedExcerpt,
    body,
    publishedAt,
    updatedAt: updatedAt ?? undefined,
    featured: record.Featured === "true",
    author: { _type: "reference", _ref: AUTHOR_ID },
    category: { _type: "reference", _ref: CATEGORY_ID },
    ...(thumbnail ? { thumbnail } : {}),
    ...(lottieThumbnail ? { lottieThumbnail } : {}),
    lottieJson: lottieJson ? JSON.stringify(lottieJson) : undefined,
    showreelEnabled: record["Showreel Toggle"] === "true",
    showreelUrl: record["Showreel Link"] || undefined,
    seo: {
      _type: "seo",
      title: record["SEO : Title"] || undefined,
      description: record["SEO : Description"] || undefined,
      ...(ogImage ? { openGraphImage: ogImage } : {}),
    },
  };

  const summary = {
    mode: execute ? "execute" : "dry-run",
    matchingSourceRecordFound: true,
    draftDocumentId: POST_ID,
    requiredAuthor: authorDoc.name,
    requiredCategory: categoryDoc.title,
    bodyHeadingCount: stats.headings,
    paragraphCount: stats.paragraphs,
    unorderedListCount: stats.unorderedLists,
    orderedListCount: stats.orderedLists,
    linkCount: stats.links,
    inlineImageCount: stats.inlineImages,
    portableTextBlockCount: stats.blocks,
    originalExcerptLength: record.Excerpt.length,
    finalExcerptLength: normalisedExcerpt.length,
    finalExcerpt: normalisedExcerpt,
    thumbnailUrl: record.Thumbnail,
    ogImageUrl: record["SEO : Open Graph Image"] || null,
    lottieAvailable: Boolean(lottieJson),
    lottieJsonParses: Boolean(lottieJson),
    lottieExternalAssetUrls: lottieUrls,
    showreelEnabled: record["Showreel Toggle"] === "true",
    showreelUrl: record["Showreel Link"] || null,
    missingRequiredFields: requiredFields.map(([field]) => field),
    existingSanityDocuments: existing,
    media: mappings,
    warnings,
  };

  if (requiredFields.length) {
    console.log(JSON.stringify(summary, null, 2));
    throw new Error(`Missing required fields: ${requiredFields.map(([field]) => field).join(", ")}`);
  }

  if (execute) {
    if (existing.publishedPost) {
      throw new Error(`Published post conflict found: ${existing.publishedPost._id}. Refusing to overwrite published content.`);
    }

    await client.transaction().createOrReplace(authorDoc).createOrReplace(categoryDoc).createOrReplace(postDoc).commit();

    const verification = await client.fetch(
      `{
        "draft": *[_id == $draftId][0]{
          _id, title, slug, author->{_id, name}, category->{_id, title}, publishedAt, updatedAt,
          "bodyBlocks": count(body), "thumbnailAsset": thumbnail.asset->_id,
          "ogAsset": seo.openGraphImage.asset->_id, "lottieThumbAsset": lottieThumbnail.asset->_id,
          lottieJson, showreelEnabled, showreelUrl
        },
        "published": *[_type == "post" && !(_id in path("drafts.**")) && slug.current == $slug]
      }`,
      { draftId: POST_ID, slug: SLUG },
    );

    mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    writeFileSync(MEDIA_MAPPING_PATH, `${JSON.stringify(mappings, null, 2)}\n`, "utf8");
    writeFileSync(
      REPORT_PATH,
      [
        "# Blog Circuit Sanity Import Report",
        "",
        `- Draft document ID: \`${POST_ID}\``,
        `- Author reference: \`${AUTHOR_ID}\` (${authorDoc.name})`,
        `- Category reference: \`${CATEGORY_ID}\` (${categoryDoc.title})`,
        `- Portable Text block count: ${stats.blocks}`,
        `- Heading count: ${stats.headings}`,
        `- List count: ${stats.unorderedLists + stats.orderedLists} (${stats.unorderedLists} unordered, ${stats.orderedLists} ordered)`,
        `- Link count: ${stats.links}`,
        `- Inline image count: ${stats.inlineImages}`,
        `- Sanity thumbnail asset ID: \`${verification.draft?.thumbnailAsset ?? "missing"}\``,
        `- Sanity OG asset ID: \`${verification.draft?.ogAsset ?? "missing"}\``,
        `- Lottie status: ${verification.draft?.lottieJson ? "valid JSON stored" : "missing"}`,
        `- Showreel status: ${verification.draft?.showreelEnabled ? `enabled (${verification.draft.showreelUrl})` : "disabled"}`,
        `- Published Circuit documents: ${verification.published.length}`,
        `- Original Webflow URLs replaced: ${mappings.length}`,
        `- Warnings: ${warnings.length ? warnings.join("; ") : "none"}`,
        "",
        "See docs/BLOG_CIRCUIT_MEDIA_MAPPING.json for old URL to Sanity asset mapping.",
      ].join("\n") + "\n",
      "utf8",
    );

    summary.existingSanityDocuments = verification;
  }

  console.log(JSON.stringify(summary, null, 2));

  try {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  } catch {
    // best-effort cleanup only
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
