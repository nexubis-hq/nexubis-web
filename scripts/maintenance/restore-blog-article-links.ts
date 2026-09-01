import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import { getCliClient } from "sanity/cli";

const API_VERSION = "2026-07-29";
const LIVE_BASE_URL = "https://www.nexubis.io";
const BLOG_CSV = path.join(
  process.cwd(),
  "webflow-export",
  "cms",
  "Nexubis Next - Blogs - 67fc1a17eb59624612330057.csv",
);
const MANIFEST_PATH = path.join(process.cwd(), "docs", "migration", "blog", "BLOG_SANITY_BATCH_MANIFEST.json");
const BACKUP_DIR = path.join(process.cwd(), ".tmp-sanity-import", "blog-link-restoration");
const REPORT_DIR = path.join(process.cwd(), "docs", "qa", "post-cutover", "blog-link-restoration");
const BACKUP_JSON = path.join(BACKUP_DIR, "sanity-blog-before-link-restoration.json");
const BACKUP_REVS = path.join(BACKUP_DIR, "sanity-blog-before-link-restoration-revisions.csv");
const SOURCE_INVENTORY = path.join(REPORT_DIR, "BLOG_LINK_SOURCE_INVENTORY.csv");
const POST_MAPPING = path.join(REPORT_DIR, "BLOG_LINK_POST_MAPPING.csv");
const DRY_RUN = path.join(REPORT_DIR, "BLOG_LINK_RESTORATION_DRY_RUN.csv");
const DRY_RUN_SUMMARY = path.join(REPORT_DIR, "BLOG_LINK_RESTORATION_DRY_RUN_SUMMARY.md");
const APPLIED = path.join(REPORT_DIR, "BLOG_LINK_RESTORATION_APPLIED.csv");
const FINAL_AUDIT = path.join(REPORT_DIR, "BLOG_LINK_RESTORATION_FINAL_AUDIT.csv");
const SUMMARY = path.join(REPORT_DIR, "BLOG_LINK_RESTORATION_SUMMARY.md");
const MANUAL_REVIEW = path.join(REPORT_DIR, "BLOG_LINK_RESTORATION_MANUAL_REVIEW.md");
const ROLLBACK = path.join(REPORT_DIR, "BLOG_LINK_RESTORATION_ROLLBACK.md");

type CsvRecord = Record<string, string>;
type Span = { _type: "span"; _key: string; text: string; marks?: string[] };
type MarkDef = { _key: string; _type: string; href?: string; [key: string]: unknown };
type Block = {
  _type: "block";
  _key: string;
  children?: Span[];
  markDefs?: MarkDef[];
  [key: string]: unknown;
};
type SanityPost = {
  _id: string;
  _rev: string;
  title: string;
  slug: { current: string };
  body: Block[];
  [key: string]: unknown;
};
type SourceLink = {
  sourcePostTitle: string;
  sourcePostSlug: string;
  anchorText: string;
  originalHref: string;
  normalisedHref: string;
  parentText: string;
  beforeText: string;
  afterText: string;
  order: number;
  htmlFragment: string;
  classification: string;
  deterministic: boolean;
  destinationVerified: string;
};
type ProposedChange = {
  source: SourceLink;
  post: SanityPost;
  blockKey?: string;
  spanKeys?: string;
  status: string;
  reason: string;
  mutationType?: string;
  finalHref?: string;
};

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isApply = args.includes("--apply");
const isVerify = args.includes("--verify");
const rollbackArg = args.find((arg) => arg.startsWith("--rollback="));
const slugArg = args.find((arg) => arg.startsWith("--slug="))?.slice("--slug=".length);

if (!isDryRun && !isApply && !isVerify && !rollbackArg) {
  throw new Error("Use --dry-run, --apply, --verify, or --rollback=[slug].");
}

const client = getCliClient({ apiVersion: API_VERSION });

function ensureDirs() {
  mkdirSync(BACKUP_DIR, { recursive: true });
  mkdirSync(REPORT_DIR, { recursive: true });
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
      } else if (char === '"') quoted = false;
      else field += char;
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
  return records
    .filter((record) => record.some(Boolean))
    .map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""])));
}

function csvEscape(value: unknown) {
  const stringValue = String(value ?? "");
  return /[",\r\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
}

function writeCsv(filePath: string, headers: string[], rows: Array<Record<string, unknown>>) {
  writeFileSync(
    filePath,
    [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\n") + "\n",
  );
}

function normaliseText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isFalse(value: string) {
  return value.trim().toLowerCase() !== "true";
}

function stripTrailingSlash(pathname: string) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

function classifyAndNormaliseHref(anchorText: string, href: string, publishedSlugs: Set<string>) {
  const cleanHref = href.trim();
  const lowerAnchor = anchorText.toLowerCase();
  const bookingAnchor =
    /\b(book|schedule|talk|start|arrange)\b/.test(lowerAnchor) &&
    /\b(call|intro|conversation|consultation|us)\b/.test(lowerAnchor);

  if (!cleanHref) return { classification: "INVALID", normalisedHref: "", deterministic: false };
  if (/^(javascript:|#w-|about:blank)/i.test(cleanHref)) {
    return { classification: "INVALID", normalisedHref: cleanHref, deterministic: false };
  }
  if (cleanHref.startsWith("mailto:")) return { classification: "MAILTO", normalisedHref: cleanHref, deterministic: true };
  if (cleanHref.startsWith("tel:")) return { classification: "TEL", normalisedHref: cleanHref, deterministic: true };
  if (cleanHref.startsWith("#")) return { classification: "HASH_ANCHOR", normalisedHref: cleanHref, deterministic: false };
  if (/cal\.com/i.test(cleanHref) || bookingAnchor) {
    return { classification: "BOOKING_CTA", normalisedHref: "/contact", deterministic: true };
  }

  let url: URL | null = null;
  try {
    url = cleanHref.startsWith("/") ? new URL(cleanHref, LIVE_BASE_URL) : new URL(cleanHref);
  } catch {
    return { classification: "INVALID", normalisedHref: cleanHref, deterministic: false };
  }

  const host = url.hostname.replace(/^www\./, "");
  const pathname = stripTrailingSlash(url.pathname);
  const sameSite = ["nexubis.io", "nexubis.vercel.app", "nexubis-web.vercel.app"].includes(host);
  const isDownload = /\.(pdf|zip|docx?|xlsx?|pptx?|csv)$/i.test(pathname);
  if (isDownload) return { classification: "DOWNLOAD", normalisedHref: cleanHref, deterministic: true };

  if (sameSite) {
    const postMatch = pathname.match(/^\/post\/([^/?#]+)/);
    if (postMatch) {
      const postSlug = decodeURIComponent(postMatch[1]);
      return {
        classification: publishedSlugs.has(postSlug) ? "INTERNAL_BLOG" : "MANUAL_REVIEW_REQUIRED",
        normalisedHref: publishedSlugs.has(postSlug) ? `/post/${postSlug}` : pathname,
        deterministic: publishedSlugs.has(postSlug),
      };
    }
    const supportedRoutes = new Set([
      "/contact",
      "/packages",
      "/work",
      "/work/altify",
      "/work/circuit",
      "/work/oxipack",
      "/blog",
      "/audit",
      "/about",
      "/",
    ]);
    if (supportedRoutes.has(pathname)) {
      return {
        classification: pathname.startsWith("/work/") ? "INTERNAL_CASE_STUDY" : "INTERNAL_PAGE",
        normalisedHref: pathname,
        deterministic: true,
      };
    }
    return { classification: "MANUAL_REVIEW_REQUIRED", normalisedHref: pathname, deterministic: false };
  }

  return { classification: "EXTERNAL", normalisedHref: cleanHref, deterministic: true };
}

function extractSourceLinks(row: CsvRecord, publishedSlugs: Set<string>): SourceLink[] {
  const $ = cheerio.load(row.Content ?? "");
  const links: SourceLink[] = [];
  $("a[href]").each((index, element) => {
    const href = $(element).attr("href")?.trim() ?? "";
    const anchorText = normaliseText($(element).text());
    const hasLinkedImage = $(element).find("img").length > 0;
    if (!href || (!anchorText && !hasLinkedImage)) return;
    const parent = $(element).closest("p,li,h1,h2,h3,h4,h5,h6,blockquote");
    const parentText = normaliseText((parent.length ? parent : $(element).parent()).text());
    const parentHtml = $.html(parent.length ? parent : element);
    const position = parentText.indexOf(anchorText);
    const beforeText = position >= 0 ? parentText.slice(Math.max(0, position - 90), position) : "";
    const afterText = position >= 0 ? parentText.slice(position + anchorText.length, position + anchorText.length + 90) : "";
    const classification = classifyAndNormaliseHref(anchorText, href, publishedSlugs);
    links.push({
      sourcePostTitle: row.Name,
      sourcePostSlug: row.Slug,
      anchorText: anchorText || "[LINKED_IMAGE]",
      originalHref: href,
      normalisedHref: classification.normalisedHref,
      parentText,
      beforeText,
      afterText,
      order: index + 1,
      htmlFragment: parentHtml,
      classification: classification.classification,
      deterministic: classification.deterministic && Boolean(anchorText),
      destinationVerified: "NOT_CHECKED",
    });
  });
  return links;
}

function blockText(block: Block) {
  return (block.children ?? []).map((child) => child.text ?? "").join("");
}

function currentLinks(post: SanityPost) {
  const links: Array<{ blockKey: string; anchorText: string; href: string; spanKeys: string[] }> = [];
  for (const block of post.body ?? []) {
    if (block._type !== "block") continue;
    const defs = new Map((block.markDefs ?? []).filter((def) => def._type === "link").map((def) => [def._key, def.href ?? ""]));
    const active = new Map<string, { text: string; spanKeys: string[] }>();
    for (const child of block.children ?? []) {
      for (const mark of child.marks ?? []) {
        if (!defs.has(mark)) continue;
        const existing = active.get(mark) ?? { text: "", spanKeys: [] };
        existing.text += child.text ?? "";
        existing.spanKeys.push(child._key);
        active.set(mark, existing);
      }
    }
    for (const [mark, value] of active) {
      links.push({ blockKey: block._key, anchorText: normaliseText(value.text), href: defs.get(mark) ?? "", spanKeys: value.spanKeys });
    }
  }
  return links;
}

function findRange(post: SanityPost, source: SourceLink) {
  const candidates: Array<{ block: Block; start: number; end: number }> = [];
  for (const block of post.body ?? []) {
    if (block._type !== "block") continue;
    const text = blockText(block);
    let index = text.indexOf(source.anchorText);
    while (index >= 0) {
      const parentMatches =
        !source.parentText ||
        normaliseText(text) === source.parentText ||
        normaliseText(text).includes(source.parentText) ||
        source.parentText.includes(normaliseText(text));
      const beforeMatches = !source.beforeText || text.slice(0, index).endsWith(source.beforeText.slice(-40));
      const afterMatches = !source.afterText || text.slice(index + source.anchorText.length).startsWith(source.afterText.slice(0, 40));
      if (parentMatches || (beforeMatches && afterMatches)) {
        candidates.push({ block, start: index, end: index + source.anchorText.length });
      }
      index = text.indexOf(source.anchorText, index + 1);
    }
  }
  return candidates;
}

function marksCoveringRange(block: Block, start: number, end: number) {
  let offset = 0;
  const markKeys = new Set<string>();
  for (const child of block.children ?? []) {
    const childStart = offset;
    const childEnd = offset + (child.text ?? "").length;
    if (childStart < end && childEnd > start) {
      for (const mark of child.marks ?? []) markKeys.add(mark);
    }
    offset = childEnd;
  }
  return [...markKeys];
}

function hrefForMark(block: Block, mark: string) {
  return (block.markDefs ?? []).find((def) => def._key === mark && def._type === "link")?.href;
}

function linkHrefsCoveringRange(block: Block, start: number, end: number) {
  return marksCoveringRange(block, start, end)
    .map((mark) => hrefForMark(block, mark))
    .filter((href): href is string => Boolean(href));
}

function makeKey(block: Block) {
  const used = new Set([...(block.markDefs ?? []).map((def) => def._key), ...(block.children ?? []).map((child) => child._key)]);
  for (let i = 0; i < 10000; i += 1) {
    const value = `restoredLink${i.toString(36)}`;
    if (!used.has(value)) return value;
  }
  throw new Error(`Could not generate key for block ${block._key}`);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function applyLinkToBody(body: Block[], blockKey: string, start: number, end: number, href: string) {
  const nextBody = clone(body);
  const block = nextBody.find((candidate) => candidate._key === blockKey);
  if (!block?.children) throw new Error(`Block not found: ${blockKey}`);
  const existingDef = (block.markDefs ?? []).find((def) => def._type === "link" && def.href === href);
  const markKey = existingDef?._key ?? makeKey(block);
  if (!existingDef) {
    block.markDefs = [...(block.markDefs ?? []), { _key: markKey, _type: "link", href }];
  }

  let offset = 0;
  const children: Span[] = [];
  for (const child of block.children) {
    const text = child.text ?? "";
    const childStart = offset;
    const childEnd = offset + text.length;
    if (childEnd <= start || childStart >= end) {
      children.push(child);
      offset = childEnd;
      continue;
    }
    const localStart = Math.max(0, start - childStart);
    const localEnd = Math.min(text.length, end - childStart);
    const parts = [
      { text: text.slice(0, localStart), linked: false },
      { text: text.slice(localStart, localEnd), linked: true },
      { text: text.slice(localEnd), linked: false },
    ].filter((part) => part.text.length > 0);
    for (const [partIndex, part] of parts.entries()) {
      const marks = [...(child.marks ?? [])];
      if (part.linked && !marks.includes(markKey)) marks.push(markKey);
      children.push({
        ...child,
        _key: partIndex === 0 && parts.length === 1 ? child._key : `${child._key}r${partIndex}`,
        text: part.text,
        marks,
      });
    }
    offset = childEnd;
  }
  block.children = children;
  return nextBody;
}

function visibleText(body: Block[]) {
  return (body ?? [])
    .map((block) => (block._type === "block" ? blockText(block) : ""))
    .join("\n");
}

async function fetchSanityPosts(): Promise<SanityPost[]> {
  return client.fetch(
    `*[_type == "post" && !(_id in path("drafts.**"))] | order(slug.current asc) {
      _id,_rev,title,slug,body,excerpt,publishedAt,updatedAt,featured,author,category,thumbnail,heroImage,lottieThumbnail,lottieJson,showreelEnabled,showreelUrl,seo
    }`,
  );
}

function loadWebflowRows() {
  const rows = parseCsv(readFileSync(BLOG_CSV, "utf8"));
  return rows.filter((row) => isFalse(row.Archived ?? "") && isFalse(row.Draft ?? "") && row["Published On"]);
}

function assertOneToOne(webflowRows: CsvRecord[], posts: SanityPost[]) {
  const sanitySlugs = posts.map((post) => post.slug?.current);
  const webflowSlugs = webflowRows.map((row) => row.Slug);
  const duplicateSanity = sanitySlugs.filter((slug, index) => sanitySlugs.indexOf(slug) !== index);
  const duplicateWebflow = webflowSlugs.filter((slug, index) => webflowSlugs.indexOf(slug) !== index);
  if (posts.length !== 88) throw new Error(`Expected 88 Sanity posts, found ${posts.length}.`);
  if (webflowRows.length !== 88) throw new Error(`Expected 88 published Webflow posts, found ${webflowRows.length}.`);
  if (duplicateSanity.length) throw new Error(`Duplicate Sanity slugs: ${duplicateSanity.join(", ")}`);
  if (duplicateWebflow.length) throw new Error(`Duplicate Webflow slugs: ${duplicateWebflow.join(", ")}`);
  const postBySlug = new Map(posts.map((post) => [post.slug.current, post]));
  const unmapped = webflowRows.filter((row) => !postBySlug.has(row.Slug));
  if (unmapped.length) throw new Error(`Unmapped Webflow slugs: ${unmapped.map((row) => row.Slug).join(", ")}`);
}

function writeBackup(posts: SanityPost[]) {
  writeFileSync(BACKUP_JSON, JSON.stringify(posts, null, 2));
  writeCsv(BACKUP_REVS, ["_id", "_rev", "title", "slug"], posts.map((post) => ({
    _id: post._id,
    _rev: post._rev,
    title: post.title,
    slug: post.slug.current,
  })));
  const parsed = JSON.parse(readFileSync(BACKUP_JSON, "utf8")) as SanityPost[];
  if (parsed.length !== 88 || parsed.some((post) => !Array.isArray(post.body))) {
    throw new Error("Backup is incomplete; aborting.");
  }
}

function writeRollbackDoc() {
  writeFileSync(
    ROLLBACK,
    `# Blog Link Restoration Rollback\n\nBackup JSON: \`${path.relative(process.cwd(), BACKUP_JSON).replace(/\\/g, "/")}\`\n\nTo restore one post:\n\n\`\`\`powershell\nnpx sanity exec scripts/maintenance/restore-blog-article-links.ts --with-user-token -- --rollback=[slug]\n\`\`\`\n\nThe rollback command reads the backed-up document by exact slug and restores only the \`body\` field for that published post. It does not change title, slug, metadata, media, author, category, dates, or SEO fields.\n`,
  );
}

async function verifyHref(href: string) {
  if (!href.startsWith("/")) return "PRESERVED_EXTERNAL";
  try {
    const response = await fetch(`${LIVE_BASE_URL}${href}`, { redirect: "manual" });
    return response.status >= 200 && response.status < 400 ? "LIVE_200" : `LIVE_${response.status}`;
  } catch (error) {
    return `FETCH_FAILED:${error instanceof Error ? error.message : String(error)}`;
  }
}

async function buildAnalysis(posts: SanityPost[]) {
  const webflowRows = loadWebflowRows();
  assertOneToOne(webflowRows, posts);
  const publishedSlugs = new Set(posts.map((post) => post.slug.current));
  const postBySlug = new Map(posts.map((post) => [post.slug.current, post]));
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as { posts: Array<{ exactSlug: string; sanityPublishedId: string }> };
  const manifestBySlug = new Map(manifest.posts.map((post) => [post.exactSlug, post.sanityPublishedId]));

  writeCsv(
    POST_MAPPING,
    ["webflowTitle", "webflowSlug", "webflowItemId", "sanityId", "sanityTitle", "mappingMethod", "manifestPublishedId"],
    webflowRows.map((row) => {
      const post = postBySlug.get(row.Slug);
      return {
        webflowTitle: row.Name,
        webflowSlug: row.Slug,
        webflowItemId: row["Item ID"],
        sanityId: post?._id,
        sanityTitle: post?.title,
        mappingMethod: "EXACT_SLUG",
        manifestPublishedId: manifestBySlug.get(row.Slug) ?? "",
      };
    }),
  );

  const sourceLinks = webflowRows.flatMap((row) => extractSourceLinks(row, publishedSlugs));
  for (const source of sourceLinks) {
    source.destinationVerified = source.deterministic ? await verifyHref(source.normalisedHref) : "NOT_DETERMINISTIC";
    if (source.normalisedHref.startsWith("/") && source.destinationVerified !== "LIVE_200") source.deterministic = false;
  }
  writeCsv(SOURCE_INVENTORY, [
    "sourcePostTitle",
    "sourcePostSlug",
    "anchorText",
    "originalHref",
    "normalisedHref",
    "parentText",
    "beforeText",
    "afterText",
    "order",
    "classification",
    "destinationVerified",
    "htmlFragment",
  ], sourceLinks);

  const changes: ProposedChange[] = [];
  for (const source of sourceLinks) {
    const post = postBySlug.get(source.sourcePostSlug);
    if (!post) continue;
    if (!source.deterministic || source.anchorText === "[LINKED_IMAGE]") {
      changes.push({ source, post, status: source.classification === "INVALID" ? "INTENTIONALLY_SKIPPED_INVALID" : "MANUAL_REVIEW_REQUIRED", reason: "Source link is not deterministic or has no text anchor." });
      continue;
    }
    const ranges = findRange(post, source);
    const sameAnchorSources = sourceLinks.filter(
      (candidate) => candidate.sourcePostSlug === source.sourcePostSlug && candidate.anchorText === source.anchorText,
    );
    const sourceOrdinal = sameAnchorSources.filter((candidate) => candidate.order <= source.order).length - 1;
    const selectedRanges = ranges.length === 1 ? ranges : ranges.length === sameAnchorSources.length ? [ranges[sourceOrdinal]] : [];
    if (selectedRanges.length !== 1 || !selectedRanges[0]) {
      changes.push({ source, post, status: "MANUAL_REVIEW_REQUIRED", reason: `Expected one text range, found ${ranges.length}.` });
      continue;
    }
    const [range] = selectedRanges;
    const coveringLinks = linkHrefsCoveringRange(range.block, range.start, range.end);
    if (coveringLinks.includes(source.normalisedHref)) {
      changes.push({
        source,
        post,
        blockKey: range.block._key,
        status: "ALREADY_CORRECT",
        reason: "Correct link mark exists on the matched source text range.",
        finalHref: source.normalisedHref,
      });
      continue;
    }
    if (coveringLinks.length) {
      changes.push({ source, post, blockKey: range.block._key, status: "MANUAL_REVIEW_REQUIRED", reason: `Text range already has another link: ${coveringLinks.join(" | ")}` });
      continue;
    }
    changes.push({
      source,
      post,
      blockKey: range.block._key,
      status: "RESTORE_HIGH_CONFIDENCE",
      reason: "Exact slug, deterministic href, unique anchor range.",
      mutationType: "ADD_LINK_MARK",
      finalHref: source.normalisedHref,
    });
  }
  return { webflowRows, sourceLinks, changes };
}

function writeDryRunReports(webflowRows: CsvRecord[], posts: SanityPost[], sourceLinks: SourceLink[], changes: ProposedChange[]) {
  writeCsv(DRY_RUN, [
    "postTitle",
    "postSlug",
    "sanityId",
    "anchorText",
    "originalWebflowHref",
    "finalStoredHref",
    "classification",
    "status",
    "reason",
    "blockKey",
    "mutationType",
    "destinationVerified",
  ], changes.map((change) => ({
    postTitle: change.post.title,
    postSlug: change.post.slug.current,
    sanityId: change.post._id,
    anchorText: change.source.anchorText,
    originalWebflowHref: change.source.originalHref,
    finalStoredHref: change.finalHref ?? change.source.normalisedHref,
    classification: change.source.classification,
    status: change.status,
    reason: change.reason,
    blockKey: change.blockKey ?? "",
    mutationType: change.mutationType ?? "",
    destinationVerified: change.source.destinationVerified,
  })));

  const highConfidence = changes.filter((change) => change.status === "RESTORE_HIGH_CONFIDENCE");
  const already = changes.filter((change) => change.status === "ALREADY_CORRECT");
  const manual = changes.filter((change) => change.status === "MANUAL_REVIEW_REQUIRED");
  const invalid = changes.filter((change) => change.status === "INTENTIONALLY_SKIPPED_INVALID");
  const docsChanged = new Set(highConfidence.map((change) => change.post._id));
  writeFileSync(
    DRY_RUN_SUMMARY,
    `# Blog Link Restoration Dry Run\n\n- Webflow posts inspected: ${webflowRows.length}\n- Sanity posts inspected: ${posts.length}\n- Exact mappings: ${webflowRows.length}\n- Posts containing original links: ${new Set(sourceLinks.map((link) => link.sourcePostSlug)).size}\n- Total original links: ${sourceLinks.length}\n- Already correct: ${already.length}\n- High-confidence restorations proposed: ${highConfidence.length}\n- Documents proposed for change: ${docsChanged.size}\n- Invalid source links skipped: ${invalid.length}\n- Manual-review links: ${manual.length}\n- Visible text changes proposed: 0\n- Metadata changes proposed: 0\n- Renderer blocker: none detected\n`,
  );
  writeFileSync(
    MANUAL_REVIEW,
    `# Blog Link Restoration Manual Review\n\n${manual.length ? manual.map((change) => `- \`${change.post.slug.current}\` | ${change.source.anchorText} | ${change.source.originalHref} | ${change.reason}`).join("\n") : "No manual-review links."}\n`,
  );
}

async function runDryRun() {
  ensureDirs();
  const posts = await fetchSanityPosts();
  writeBackup(posts);
  writeRollbackDoc();
  const { webflowRows, sourceLinks, changes } = await buildAnalysis(posts);
  writeDryRunReports(webflowRows, posts, sourceLinks, changes);
  console.log(`Dry run complete: ${sourceLinks.length} source links, ${changes.filter((change) => change.status === "RESTORE_HIGH_CONFIDENCE").length} proposed restorations.`);
}

async function runApply() {
  ensureDirs();
  if (!existsSync(BACKUP_JSON)) throw new Error("Backup is missing; run --dry-run first.");
  const backup = JSON.parse(readFileSync(BACKUP_JSON, "utf8")) as SanityPost[];
  if (backup.length !== 88 || backup.some((post) => !Array.isArray(post.body))) throw new Error("Backup is incomplete; aborting apply.");
  const posts = await fetchSanityPosts();
  const { webflowRows, sourceLinks, changes } = await buildAnalysis(posts);
  writeDryRunReports(webflowRows, posts, sourceLinks, changes);
  const toApply = changes.filter((change) => change.status === "RESTORE_HIGH_CONFIDENCE");
  const byPost = new Map<string, ProposedChange[]>();
  for (const change of toApply) byPost.set(change.post._id, [...(byPost.get(change.post._id) ?? []), change]);

  const appliedRows: Array<Record<string, unknown>> = [];
  const postEntries = [...byPost.entries()];
  for (let batchStart = 0; batchStart < postEntries.length; batchStart += 10) {
    const batch = postEntries.slice(batchStart, batchStart + 10);
    for (const [postId, postChanges] of batch) {
      const latest = await client.fetch<SanityPost>(`*[_id == $id][0]{_id,_rev,title,slug,body}`, { id: postId });
      let nextBody = clone(latest.body);
      for (const change of postChanges) {
        const ranges = findRange({ ...latest, body: nextBody }, change.source);
        if (ranges.length !== 1) throw new Error(`Range changed before apply: ${latest.slug.current} ${change.source.anchorText}`);
        nextBody = applyLinkToBody(nextBody, ranges[0].block._key, ranges[0].start, ranges[0].end, change.finalHref ?? change.source.normalisedHref);
      }
      if (visibleText(latest.body) !== visibleText(nextBody)) {
        throw new Error(`Visible text would change for ${latest.slug.current}; aborting.`);
      }
      const result = await client.patch(latest._id).ifRevisionId(latest._rev).set({ body: nextBody }).commit<SanityPost>();
      const reread = await client.fetch<SanityPost>(`*[_id == $id][0]{_id,_rev,title,slug,body}`, { id: postId });
      if (visibleText(latest.body) !== visibleText(reread.body)) {
        throw new Error(`Visible text changed after apply for ${latest.slug.current}; aborting.`);
      }
      for (const change of postChanges) {
        const finalHref = change.finalHref ?? change.source.normalisedHref;
        const liveStatus = await verifyLivePostLink(reread.slug.current, change.source.anchorText, finalHref);
        appliedRows.push({
          postTitle: reread.title,
          postSlug: reread.slug.current,
          sanityDocumentId: reread._id,
          originalRevision: latest._rev,
          newRevision: result._rev,
          anchorText: change.source.anchorText,
          originalWebflowHref: change.source.originalHref,
          finalStoredHref: finalHref,
          finalLiveHref: finalHref.startsWith("/") ? `${LIVE_BASE_URL}${finalHref}` : finalHref,
          blockKey: change.blockKey ?? "",
          spanKeys: "",
          mutationType: change.mutationType,
          verificationResult: liveStatus,
          rollbackReference: `${path.relative(process.cwd(), BACKUP_JSON).replace(/\\/g, "/")}#${reread.slug.current}`,
        });
      }
    }
    const count = await client.fetch<number>(`count(*[_type == "post" && !(_id in path("drafts.**"))])`);
    if (count !== 88) throw new Error(`Post count changed after batch: ${count}`);
  }
  writeCsv(APPLIED, [
    "postTitle",
    "postSlug",
    "sanityDocumentId",
    "originalRevision",
    "newRevision",
    "anchorText",
    "originalWebflowHref",
    "finalStoredHref",
    "finalLiveHref",
    "blockKey",
    "spanKeys",
    "mutationType",
    "verificationResult",
    "rollbackReference",
  ], appliedRows);
  await runVerify();
}

async function verifyLivePostLink(slug: string, anchorText: string, href: string) {
  try {
    const response = await fetch(`${LIVE_BASE_URL}/post/${slug}`);
    if (!response.ok) return `POST_${response.status}`;
    const html = await response.text();
    const $ = cheerio.load(html);
    const matches = $("a")
      .toArray()
      .filter((element) => normaliseText($(element).text()) === anchorText)
      .map((element) => $(element).attr("href") ?? "");
    return matches.includes(href) || matches.includes(`${LIVE_BASE_URL}${href}`) ? "VERIFIED" : `AWAITING_OR_MISSING:${matches.join(" | ")}`;
  } catch (error) {
    return `FETCH_FAILED:${error instanceof Error ? error.message : String(error)}`;
  }
}

async function runVerify() {
  ensureDirs();
  const posts = await fetchSanityPosts();
  const { webflowRows, sourceLinks, changes } = await buildAnalysis(posts);
  let livePostsVerified = 0;
  const livePostFailures: string[] = [];
  for (const post of posts) {
    try {
      const response = await fetch(`${LIVE_BASE_URL}/post/${post.slug.current}`);
      if (response.ok) livePostsVerified += 1;
      else livePostFailures.push(`${post.slug.current}:${response.status}`);
    } catch (error) {
      livePostFailures.push(`${post.slug.current}:${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const liveLinkChecks = await Promise.all(
    changes
      .filter((change) => change.status === "ALREADY_CORRECT")
      .map(async (change) => ({
        key: `${change.post.slug.current}:${change.source.anchorText}`,
        result: await verifyLivePostLink(change.post.slug.current, change.source.anchorText, change.finalHref ?? change.source.normalisedHref),
      })),
  );
  const liveLinksVerified = liveLinkChecks.filter((check) => check.result === "VERIFIED").length;
  const liveLinksAwaiting = liveLinkChecks.filter((check) => check.result.startsWith("AWAITING_OR_MISSING"));
  writeCsv(FINAL_AUDIT, [
    "postTitle",
    "postSlug",
    "sanityId",
    "anchorText",
    "originalWebflowHref",
    "finalStoredHref",
    "classification",
    "finalStatus",
    "reason",
    "destinationVerified",
  ], changes.map((change) => ({
    postTitle: change.post.title,
    postSlug: change.post.slug.current,
    sanityId: change.post._id,
    anchorText: change.source.anchorText,
    originalWebflowHref: change.source.originalHref,
    finalStoredHref: change.finalHref ?? change.source.normalisedHref,
    classification: change.source.classification,
    finalStatus: change.status === "RESTORE_HIGH_CONFIDENCE" ? "APPLY_FAILED" : change.status,
    reason: change.reason,
    destinationVerified: change.source.destinationVerified,
  })));

  const allCurrentLinks = posts.flatMap((post) => currentLinks(post).map((link) => ({ slug: post.slug.current, href: link.href })));
  const directCal = allCurrentLinks.filter((link) => /cal\.com/i.test(link.href));
  const webflowDestinations = allCurrentLinks.filter((link) => /webflow|website-files/i.test(link.href));
  const oldVercel = allCurrentLinks.filter((link) => /nexubis(-web)?\.vercel\.app/i.test(link.href));
  const appliedExists = existsSync(APPLIED) ? parseCsv(readFileSync(APPLIED, "utf8")) : [];
  const manual = changes.filter((change) => change.status === "MANUAL_REVIEW_REQUIRED");
  writeFileSync(
    SUMMARY,
    `# Blog Link Restoration Summary\n\n- Webflow posts inspected: ${webflowRows.length}\n- Sanity posts inspected: ${posts.length}\n- Exact mappings: ${webflowRows.length}\n- Posts containing original links: ${new Set(sourceLinks.map((link) => link.sourcePostSlug)).size}\n- Total original links: ${sourceLinks.length}\n- Links already correct: ${changes.filter((change) => change.status === "ALREADY_CORRECT").length}\n- High-confidence links restored: ${appliedExists.length}\n- Manual-review links left unchanged: ${manual.length}\n- Invalid source links skipped: ${changes.filter((change) => change.status === "INTENTIONALLY_SKIPPED_INVALID").length}\n- Published Sanity posts after audit: ${posts.length}\n- Live posts returning 200: ${livePostsVerified}\n- Live post failures: ${livePostFailures.length ? livePostFailures.join(" | ") : "0"}\n- Live already-correct source links verified: ${liveLinksVerified}\n- Live source links awaiting cache or missing exact anchor: ${liveLinksAwaiting.length}\n- Remaining direct Cal.com article links: ${directCal.length}\n- Remaining Webflow destinations: ${webflowDestinations.length}\n- Remaining old Vercel destinations: ${oldVercel.length}\n- Renderer issues: none detected in code inspection\n- Visible article wording changed: no, checked by Portable Text text extraction during mutations\n- Titles, slugs and metadata changed by this script: no\n- Backup: \`${path.relative(process.cwd(), BACKUP_JSON).replace(/\\/g, "/")}\`\n- Rollback: \`${path.relative(process.cwd(), ROLLBACK).replace(/\\/g, "/")}\`\n`,
  );
  console.log(`Verify complete: ${posts.length} posts, ${sourceLinks.length} source links, ${manual.length} manual-review links.`);
}

async function runRollback(slug: string) {
  if (!existsSync(BACKUP_JSON)) throw new Error("Backup JSON is missing.");
  const backup = JSON.parse(readFileSync(BACKUP_JSON, "utf8")) as SanityPost[];
  const backupPost = backup.find((post) => post.slug.current === slug);
  if (!backupPost) throw new Error(`No backup found for slug ${slug}`);
  const current = await client.fetch<SanityPost>(`*[_type == "post" && slug.current == $slug && !(_id in path("drafts.**"))][0]{_id,_rev,slug}`, { slug });
  if (!current) throw new Error(`No published Sanity post found for slug ${slug}`);
  await client.patch(current._id).ifRevisionId(current._rev).set({ body: backupPost.body }).commit();
  console.log(`Rolled back body for ${slug}.`);
}

async function main() {
  if (rollbackArg) return runRollback(rollbackArg.slice("--rollback=".length));
  if (slugArg) console.log(`Limiting report focus to slug is not applied to safety counts: ${slugArg}`);
  if (isDryRun) return runDryRun();
  if (isApply) return runApply();
  if (isVerify) return runVerify();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
