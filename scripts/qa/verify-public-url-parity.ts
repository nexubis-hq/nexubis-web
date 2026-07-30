import "dotenv/config";

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "docs", "qa", "pre-dns-cutover");
const TARGET_BASE = (process.argv[2] || process.env.QA_TARGET_BASE_URL || "https://nexubis.vercel.app").replace(/\/$/, "");
const OLD_BASE = "https://www.nexubis.io";
const FINAL_BASE = "https://www.nexubis.io";
const GENERATED_AT = new Date().toISOString();
const UA = "Mozilla/5.0 (compatible; NexubisPreDnsCutoverAudit/1.0; +https://www.nexubis.io)";
const WEBFLOW_HOST_PATTERNS = [
  "webflow.com",
  "webflow.io",
  "cdn.prod.website-files.com",
  "website-files.com",
  "uploads-ssl.webflow.com",
  "assets.website-files.com",
];
const OLD_VERCEL = "nexubis-web.vercel.app";

type BaselineRecord = {
  path: string;
  oldUrl: string;
  sourceEvidence: string;
  contentType: string;
  publishedStatus: string;
  oldResponseStatus: number | string;
  oldPageTitle: string;
  expectedRebuiltRoute: string;
  notes: string;
  captureTimestamp: string;
};

type FetchResult = {
  url: string;
  status: number | null;
  finalUrl: string;
  contentType: string;
  body: string;
  redirectChain: string[];
  error?: string;
};

type ParityRecord = {
  path: string;
  oldUrl: string;
  targetUrl: string;
  oldStatus: number | string;
  targetStatus: number | string;
  finalUrl: string;
  classification: string;
  title: string;
  canonical: string;
  contentType: string;
  redirectChain: string;
  notes: string;
};

function ensureDir(dir: string) {
  mkdirSync(dir, { recursive: true });
}

function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(file: string, rows: Record<string, unknown>[], columns: string[]) {
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvEscape(row[column])).join(","));
  }
  writeFileSync(file, `${lines.join("\n")}\n`);
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
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
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  const [headers = [], ...body] = rows;
  return body.filter((cells) => cells.some(Boolean)).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
}

function normalisePath(value: string) {
  if (!value) return "/";
  let pathname = value;
  try {
    pathname = new URL(value, OLD_BASE).pathname;
  } catch {
    pathname = value.split("#")[0].split("?")[0];
  }
  pathname = pathname.replace(/\/index\.html$/, "/").replace(/\.html$/, "");
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  if (pathname.length > 1) pathname = pathname.replace(/\/$/, "");
  return pathname || "/";
}

async function fetchWithRedirects(url: string, limit = 6): Promise<FetchResult> {
  const redirectChain: string[] = [];
  let current = url;
  for (let i = 0; i < limit; i += 1) {
    try {
      const response = await fetch(current, {
        redirect: "manual",
        headers: {
          "user-agent": UA,
          accept: "text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.8",
        },
      });
      const location = response.headers.get("location");
      if (location && [301, 302, 303, 307, 308].includes(response.status)) {
        const next = new URL(location, current).toString();
        redirectChain.push(`${response.status} ${current} -> ${next}`);
        if (redirectChain.some((item) => item.endsWith(`-> ${current}`))) {
          return { url, status: response.status, finalUrl: current, contentType: response.headers.get("content-type") ?? "", body: "", redirectChain, error: "redirect_loop" };
        }
        current = next;
        continue;
      }
      const body = await response.text();
      return {
        url,
        status: response.status,
        finalUrl: response.url || current,
        contentType: response.headers.get("content-type") ?? "",
        body,
        redirectChain,
      };
    } catch (error) {
      return {
        url,
        status: null,
        finalUrl: current,
        contentType: "",
        body: "",
        redirectChain,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  return { url, status: null, finalUrl: current, contentType: "", body: "", redirectChain, error: "redirect_limit" };
}

function titleFromHtml(html: string) {
  const $ = cheerio.load(html);
  return $("title").first().text().trim();
}

function metaContent($: cheerio.CheerioAPI, selector: string) {
  return ($(selector).first().attr("content") ?? "").trim();
}

function canonicalFromHtml(html: string) {
  const $ = cheerio.load(html);
  return ($('link[rel="canonical"]').first().attr("href") ?? "").trim();
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

async function querySanityPosts() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "tu3u3e8c";
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  const query = `*[
    _type == "post" &&
    defined(slug.current) &&
    defined(publishedAt) &&
    !(_id in path("drafts.**")) &&
    !(_id in path("versions.**")) &&
    !(_id in path("releases.**")) &&
    !(_id in path("_.releases.**"))
  ] | order(legacyOrder asc) {
    _id, title, "slug": slug.current, legacyOrder, excerpt, publishedAt, updatedAt,
    author->{name}, category->{title, "slug": slug.current},
    thumbnail, heroImage, lottieThumbnail, lottieJson, showreelEnabled, showreelUrl,
    seo{title, description, openGraphImage, canonicalOverride}
  }`;
  const url = `https://${projectId}.api.sanity.io/v2026-07-29/data/query/${dataset}?query=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers: { "user-agent": UA } });
  if (!response.ok) throw new Error(`Sanity query failed: ${response.status}`);
  const payload = await response.json() as { result: Record<string, unknown>[] };
  return payload.result ?? [];
}

function findWebflowExportPaths() {
  const paths = new Map<string, string>();
  const htmlMap: Record<string, string> = {
    "index.html": "/",
    "about.html": "/about",
    "packages.html": "/packages",
    "contact.html": "/contact",
    "work.html": "/work",
    "blog.html": "/blog",
  };
  for (const [file, route] of Object.entries(htmlMap)) {
    const full = path.join(ROOT, "webflow-export", file);
    if (existsSync(full)) paths.set(route, `webflow-export/${file}`);
  }
  return paths;
}

function scanFiles(dir: string, patterns: string[], out: Array<{ path: string; pattern: string; classification: string }>) {
  if (!existsSync(dir)) return;
  for (const item of readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (["node_modules", ".next", ".git", "webflow-export"].includes(item)) continue;
      scanFiles(full, patterns, out);
      continue;
    }
    if (stat.size > 5_000_000) continue;
    const rel = full.replace(`${ROOT}${path.sep}`, "").replace(/\\/g, "/");
    const text = readFileSync(full, "utf8");
    for (const pattern of patterns) {
      if (text.includes(pattern)) {
        const classification = rel.startsWith("scripts/")
          ? "MIGRATION_SOURCE"
          : rel.includes(".test.") || rel.includes("fixtures/")
            ? "REFERENCE_ONLY"
            : pattern.startsWith("w-")
              ? "CSS_CLASS_ONLY"
              : "REFERENCE_ONLY";
        out.push({ path: rel, pattern, classification });
      }
    }
  }
}

function staticBaselinePaths() {
  return ["/", "/about", "/packages", "/contact", "/work", "/work/altify", "/work/circuit", "/work/oxipack", "/blog", "/scorecard"];
}

function classifyParity(pathname: string, result: FetchResult, htmlTitle: string) {
  if (pathname === "/work/sataya") return result.status === 404 ? "EXPECTED_INTENTIONAL_404" : "MANUAL_REVIEW_REQUIRED";
  if (result.error === "redirect_loop") return "REDIRECT_LOOP";
  if (result.redirectChain.length > 1) return "REDIRECT_CHAIN";
  if (result.status == null) return "SERVER_ERROR";
  if (result.status >= 500) return "SERVER_ERROR";
  if (result.status === 404) return "UNEXPECTED_404";
  if ([301, 308].includes(result.status)) return "INTENTIONAL_PERMANENT_REDIRECT";
  if (result.status >= 300 && result.status < 400) return "REDIRECT_CHAIN";
  if (result.status === 200) {
    if (/404|not found/i.test(htmlTitle)) return "SOFT_404";
    return "SAME_PATH_200";
  }
  return "MANUAL_REVIEW_REQUIRED";
}

async function main() {
  ensureDir(OUT_DIR);
  const manifest = readJson<{ inventoryCount: number; posts: Array<{ title: string; exactSlug: string; originalLiveUrl: string; status: string; sanityPublishedId?: string | null; publishedAtInSanity?: string | null }> }>(
    path.join(ROOT, "docs", "migration", "blog", "BLOG_SANITY_BATCH_MANIFEST.json"),
  );
  const routeAudit = readJson<{ routesScanned: number; routes: Array<{ slug: string; status: number }> }>(
    path.join(ROOT, "docs", "migration", "blog", "BLOG_FINAL_ROUTE_AUDIT.json"),
  );
  const dependencyAudit = readJson<{ publishedPostsScanned: number; webflowMediaRuntimeDependencies: number; webflowHits: unknown[] }>(
    path.join(ROOT, "docs", "migration", "blog", "BLOG_WEBFLOW_DEPENDENCY_AUDIT.json"),
  );
  const sanityPosts = await querySanityPosts();
  const sanitySlugs = new Set(sanityPosts.map((post) => String(post.slug)));
  const manifestSlugs = new Set(manifest.posts.map((post) => post.exactSlug));

  const webflowSitemap = await fetchWithRedirects(`${OLD_BASE}/sitemap.xml`);
  const sitemapPaths = new Set<string>();
  for (const match of webflowSitemap.body.matchAll(/<loc>(.*?)<\/loc>/g)) {
    const url = match[1]?.trim();
    if (url && url.startsWith(OLD_BASE)) sitemapPaths.add(normalisePath(url));
  }

  const exportPaths = findWebflowExportPaths();
  const csvPath = path.join(ROOT, "webflow-export", "cms", "Nexubis Next - Blogs - 67fc1a17eb59624612330057.csv");
  const csvRows = existsSync(csvPath) ? parseCsv(readFileSync(csvPath, "utf8")) : [];
  const csvPublishedSlugs = csvRows
    .filter((row) => String(row["Draft"] ?? "").toLowerCase() !== "true" && String(row["Archived"] ?? "").toLowerCase() !== "true" && String(row["Slug"] ?? ""))
    .map((row) => String(row["Slug"]));

  const baselinePaths = new Map<string, { evidence: Set<string>; type: string; status: string; notes: string }>();
  function addBaseline(pathname: string, evidence: string, type: string, status = "published", notes = "") {
    const normalised = normalisePath(pathname);
    const existing = baselinePaths.get(normalised);
    if (existing) {
      existing.evidence.add(evidence);
    } else {
      baselinePaths.set(normalised, { evidence: new Set([evidence]), type, status, notes });
    }
  }
  for (const pathname of staticBaselinePaths()) addBaseline(pathname, "static route inventory", pathname.startsWith("/post/") ? "blog_post" : "static_page");
  for (const [pathname, evidence] of exportPaths) addBaseline(pathname, evidence, pathname === "/blog" ? "blog_index" : pathname.startsWith("/work/") ? "case_study" : "static_page");
  for (const pathname of sitemapPaths) addBaseline(pathname, "live Webflow sitemap", pathname.startsWith("/post/") ? "blog_post" : pathname.startsWith("/work/") ? "case_study" : "static_page");
  for (const slug of csvPublishedSlugs) addBaseline(`/post/${slug}`, "raw Webflow Blog CMS export", "blog_post");
  for (const post of manifest.posts) addBaseline(`/post/${post.exactSlug}`, "final Blog/Sanity manifest", "blog_post", post.status);
  addBaseline("/work/sataya", "known intentional external-only former/non-route check", "intentional_404", "not_internal", "Sataya remains external at https://sataya.io/");

  const baseline: BaselineRecord[] = [];
  for (const [pathname, meta] of [...baselinePaths].sort(([a], [b]) => a.localeCompare(b))) {
    const old = await fetchWithRedirects(`${OLD_BASE}${pathname}`);
    baseline.push({
      path: pathname,
      oldUrl: `${OLD_BASE}${pathname}`,
      sourceEvidence: [...meta.evidence].join("; "),
      contentType: meta.type,
      publishedStatus: meta.status,
      oldResponseStatus: old.status ?? old.error ?? "unknown",
      oldPageTitle: old.contentType.includes("html") ? titleFromHtml(old.body) : "",
      expectedRebuiltRoute: `${TARGET_BASE}${pathname}`,
      notes: meta.notes,
      captureTimestamp: GENERATED_AT,
    });
  }
  writeFileSync(path.join(OUT_DIR, "WEBFLOW_PUBLIC_URL_BASELINE.json"), JSON.stringify(baseline, null, 2));
  writeCsv(path.join(OUT_DIR, "WEBFLOW_PUBLIC_URL_BASELINE.csv"), baseline, [
    "path", "oldUrl", "sourceEvidence", "contentType", "publishedStatus", "oldResponseStatus", "oldPageTitle", "expectedRebuiltRoute", "notes", "captureTimestamp",
  ]);

  writeCsv(
    path.join(OUT_DIR, "FINAL_SANITY_POST_INVENTORY.csv"),
    sanityPosts.map((post) => ({
      documentId: post._id,
      title: post.title,
      slug: post.slug,
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
      author: (post.author as { name?: string } | null)?.name ?? "",
      category: (post.category as { title?: string } | null)?.title ?? "",
      mainImage: post.thumbnail ? "present" : "missing",
      excerptOrMetaDescription: String(post.excerpt || (post.seo as { description?: string } | undefined)?.description || "").slice(0, 240),
      state: String(post._id).startsWith("drafts.") ? "draft" : "published",
      originalWebflowSlug: post.slug,
    })),
    ["documentId", "title", "slug", "publishedAt", "updatedAt", "author", "category", "mainImage", "excerptOrMetaDescription", "state", "originalWebflowSlug"],
  );

  const missingInSanity = [...manifestSlugs].filter((slug) => !sanitySlugs.has(slug));
  const missingInManifest = [...sanitySlugs].filter((slug) => !manifestSlugs.has(slug));
  const duplicateSanitySlugs = sanityPosts.map((post) => String(post.slug)).filter((slug, index, all) => all.indexOf(slug) !== index);

  const parity: ParityRecord[] = [];
  const pageHtml = new Map<string, FetchResult>();
  for (const record of baseline) {
    const result = await fetchWithRedirects(record.expectedRebuiltRoute);
    pageHtml.set(record.path, result);
    const title = result.contentType.includes("html") ? titleFromHtml(result.body) : "";
    parity.push({
      path: record.path,
      oldUrl: record.oldUrl,
      targetUrl: record.expectedRebuiltRoute,
      oldStatus: record.oldResponseStatus,
      targetStatus: result.status ?? result.error ?? "unknown",
      finalUrl: result.finalUrl,
      classification: classifyParity(record.path, result, title),
      title,
      canonical: result.contentType.includes("html") ? canonicalFromHtml(result.body) : "",
      contentType: result.contentType,
      redirectChain: result.redirectChain.join(" | "),
      notes: result.error ?? "",
    });
  }
  writeCsv(path.join(OUT_DIR, "FINAL_URL_PARITY_AUDIT.csv"), parity, [
    "path", "oldUrl", "targetUrl", "oldStatus", "targetStatus", "finalUrl", "classification", "title", "canonical", "contentType", "redirectChain", "notes",
  ]);

  const targetSitemap = await fetchWithRedirects(`${TARGET_BASE}/sitemap.xml`);
  const sitemapUrls = [...targetSitemap.body.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]?.trim()).filter(Boolean);
  const sitemapRows: Record<string, unknown>[] = [];
  const seenSitemap = new Set<string>();
  for (const url of sitemapUrls) {
    const pathOnly = normalisePath(url);
    const status = await fetchWithRedirects(`${TARGET_BASE}${pathOnly}`);
    sitemapRows.push({
      url,
      path: pathOnly,
      status: status.status ?? status.error ?? "unknown",
      duplicate: seenSitemap.has(url) ? "yes" : "no",
      category: pathOnly.startsWith("/post/") ? "blog_post" : pathOnly.startsWith("/work/") && pathOnly !== "/work" ? "case_study" : "static",
      notes: status.error ?? "",
    });
    seenSitemap.add(url);
  }
  writeCsv(path.join(OUT_DIR, "FINAL_SITEMAP_URLS.csv"), sitemapRows, ["url", "path", "status", "duplicate", "category", "notes"]);

  const metadataRows: Record<string, unknown>[] = [];
  const internalRows: Record<string, unknown>[] = [];
  const discoveredPostLinks = new Set<string>();
  const externalHosts = new Map<string, number>();
  for (const record of parity.filter((item) => item.classification === "SAME_PATH_200")) {
    const result = pageHtml.get(record.path);
    if (!result || !result.contentType.includes("html")) continue;
    const $ = cheerio.load(result.body);
    const canonical = $('link[rel="canonical"]').map((_, el) => $(el).attr("href") ?? "").get();
    const robots = metaContent($, 'meta[name="robots"]');
    const ogImage = metaContent($, 'meta[property="og:image"]');
    metadataRows.push({
      path: record.path,
      title: $("title").first().text().trim(),
      description: metaContent($, 'meta[name="description"]'),
      canonicalCount: canonical.length,
      canonical: canonical.join(" | "),
      canonicalOk: canonical.length === 1 && canonical[0].startsWith(FINAL_BASE) && normalisePath(canonical[0]) === record.path ? "yes" : "no",
      ogTitle: metaContent($, 'meta[property="og:title"]'),
      ogDescription: metaContent($, 'meta[property="og:description"]'),
      ogImage,
      twitterCard: metaContent($, 'meta[name="twitter:card"]'),
      robots,
      noindexError: /noindex/i.test(robots) ? "yes" : "no",
      structuredDataTypes: $('script[type="application/ld+json"]').map((_, el) => $(el).text()).get().join(" ").match(/"@type"\s*:\s*"([^"]+)"/g)?.join("; ") ?? "",
      notes: "",
    });
    $("a[href]").each((_, el) => {
      const href = ($(el).attr("href") ?? "").trim();
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      let absolute: URL;
      try {
        absolute = new URL(href, TARGET_BASE);
      } catch {
        return;
      }
      if (absolute.hostname && absolute.hostname !== "nexubis.vercel.app" && absolute.hostname !== "www.nexubis.io" && absolute.hostname !== "nexubis.io") {
        externalHosts.set(absolute.hostname, (externalHosts.get(absolute.hostname) ?? 0) + 1);
      }
      const sameSite = ["nexubis.vercel.app", "www.nexubis.io", "nexubis.io"].includes(absolute.hostname);
      const linkPath = normalisePath(absolute.toString());
      if (sameSite && linkPath.startsWith("/post/")) discoveredPostLinks.add(linkPath.replace("/post/", ""));
      internalRows.push({
        sourcePath: record.path,
        label: $(el).text().trim().replace(/\s+/g, " ").slice(0, 120),
        href,
        resolvedPath: sameSite ? linkPath : "",
        classification: WEBFLOW_HOST_PATTERNS.some((host) => absolute.hostname.includes(host))
          ? "WEBFLOW_LINK_ERROR"
          : absolute.hostname.includes(OLD_VERCEL)
            ? "OLD_VERCEL_LINK_ERROR"
            : href.includes("cal.com/nexubis/30min") && record.path !== "/contact"
              ? "DIRECT_CAL_OUTSIDE_CONTACT"
              : sameSite
                ? "INTERNAL"
                : "EXTERNAL",
        status: "",
        notes: "",
      });
    });
    for (const match of result.body.matchAll(/https?:\/\/([^/"')\s]+)/g)) {
      externalHosts.set(match[1], (externalHosts.get(match[1]) ?? 0) + 1);
    }
  }
  const internalStatusCache = new Map<string, FetchResult>();
  for (const row of internalRows) {
    if (row.classification !== "INTERNAL" || !row.resolvedPath) continue;
    const p = String(row.resolvedPath);
    if (!internalStatusCache.has(p)) internalStatusCache.set(p, await fetchWithRedirects(`${TARGET_BASE}${p}`));
    const checked = internalStatusCache.get(p)!;
    row.status = checked.status ?? checked.error ?? "unknown";
    row.notes = checked.status === 200 ? "" : "non-200 internal link";
  }
  const sitemapPostSlugs = new Set(sitemapRows.filter((row) => row.category === "blog_post").map((row) => String(row.path).replace("/post/", "")));
  const orphaned = [...sanitySlugs].filter((slug) => !discoveredPostLinks.has(slug) && sitemapPostSlugs.has(slug));
  for (const slug of orphaned) {
    internalRows.push({ sourcePath: "sitewide", label: slug, href: `/post/${slug}`, resolvedPath: `/post/${slug}`, classification: "ORPHANED_INTERNAL_LINKING", status: 200, notes: "Discoverable via sitemap but not encountered as a link during crawl." });
  }
  writeCsv(path.join(OUT_DIR, "FINAL_INTERNAL_LINK_AUDIT.csv"), internalRows, ["sourcePath", "label", "href", "resolvedPath", "classification", "status", "notes"]);

  const sourceMatches: Array<{ path: string; pattern: string; classification: string }> = [];
  scanFiles(path.join(ROOT, "app"), [...WEBFLOW_HOST_PATTERNS, "webflow-export", OLD_VERCEL], sourceMatches);
  scanFiles(path.join(ROOT, "components"), [...WEBFLOW_HOST_PATTERNS, "webflow-export", OLD_VERCEL], sourceMatches);
  scanFiles(path.join(ROOT, "lib"), [...WEBFLOW_HOST_PATTERNS, "webflow-export", OLD_VERCEL], sourceMatches);
  scanFiles(path.join(ROOT, "scripts"), [...WEBFLOW_HOST_PATTERNS, "webflow-export", OLD_VERCEL], sourceMatches);
  scanFiles(path.join(ROOT, "sanity"), [...WEBFLOW_HOST_PATTERNS, "webflow-export", OLD_VERCEL], sourceMatches);
  scanFiles(path.join(ROOT, "public"), [...WEBFLOW_HOST_PATTERNS, "webflow-export", OLD_VERCEL], sourceMatches);

  const envRefs = new Set<string>();
  const envRe = /process\.env\.([A-Z0-9_]+)/g;
  for (const dir of ["app", "components", "lib", "scripts", "sanity"]) {
    const stack = [path.join(ROOT, dir)];
    while (stack.length) {
      const current = stack.pop()!;
      if (!existsSync(current)) continue;
      for (const item of readdirSync(current)) {
        const full = path.join(current, item);
        const stat = statSync(full);
        if (stat.isDirectory()) stack.push(full);
        else if (/\.(ts|tsx|js|mjs)$/.test(item)) {
          const text = readFileSync(full, "utf8");
          for (const m of text.matchAll(envRe)) envRefs.add(m[1]);
        }
      }
    }
  }
  const optionalProductionEnv = new Set([
    "CONTACT_EMAIL_FROM",
    "FUNNELR_API_BASE_URL",
    "FUNNELR_NURTURE_FROM",
    "FUNNELR_WEBHOOK_SECRET",
    "FUNNELR_WEBHOOK_URL",
    "META_CAPI_TOKEN",
    "META_CURRENCY",
    "META_LEAD_VALUE",
    "META_SCHEDULE_VALUE",
    "META_TEST_EVENT_CODE",
    "NEXT_PUBLIC_META_LEAD_VALUE",
    "NEXT_PUBLIC_META_PIXEL_ID",
    "NEXT_PUBLIC_META_TRACKING_FORCE",
    "NEXT_PUBLIC_SITE_URL",
    "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
    "RENDER_API_KEY",
    "SCORECARD_GLOBAL_HOURLY_CAP",
    "SCORECARD_IP_WINDOW_DAYS",
    "SCORECARD_MOCK",
    "SCORECARD_SENDER_FIRST_NAME",
    "SCORECARD_TARGET_DAILY_CAP",
    "TURNSTILE_SECRET_KEY",
  ]);
  const nonProductionAuditEnv = new Set(["FUNNELR_ALLOW_WRITE_TEST", "QA_TARGET_BASE_URL", "VERCEL_ENV_NAMES"]);
  const vercelEnvNames = (process.env.VERCEL_ENV_NAMES ?? "").split(",").map((v) => v.trim()).filter(Boolean);
  const requiredProductionEnvRefs = [...envRefs].filter(
    (name) => !["NODE_ENV", "HOME"].includes(name) && !optionalProductionEnv.has(name) && !nonProductionAuditEnv.has(name),
  );
  const missingEnv = vercelEnvNames.length ? requiredProductionEnvRefs.filter((name) => !vercelEnvNames.includes(name)) : [];

  const counts = {
    webflowPublicUrlCount: baseline.length,
    webflowBlogPostCount: csvPublishedSlugs.length || manifest.posts.length,
    manifestCount: manifest.posts.length,
    publishedSanityPostCount: sanityPosts.length,
    countMismatch: manifest.posts.length - sanityPosts.length,
    parityTotal: parity.length,
    samePath200: parity.filter((row) => row.classification === "SAME_PATH_200").length,
    intentionalRedirect: parity.filter((row) => row.classification === "INTENTIONAL_PERMANENT_REDIRECT").length,
    expected404: parity.filter((row) => row.classification === "EXPECTED_INTENTIONAL_404").length,
    unexpected404: parity.filter((row) => row.classification === "UNEXPECTED_404" || row.classification === "MISSING_FROM_REBUILD").length,
    wrongOrSoft404: parity.filter((row) => row.classification === "WRONG_CONTENT" || row.classification === "SOFT_404").length,
    sitemapTotal: sitemapRows.length,
    sitemapStatic: sitemapRows.filter((row) => row.category === "static").length,
    sitemapCaseStudy: sitemapRows.filter((row) => row.category === "case_study").length,
    sitemapBlogPost: sitemapRows.filter((row) => row.category === "blog_post").length,
    sitemapDuplicate: sitemapRows.filter((row) => row.duplicate === "yes").length,
    sitemapNon200: sitemapRows.filter((row) => Number(row.status) !== 200).length,
    publicNoindexErrors: metadataRows.filter((row) => row.noindexError === "yes").length,
    canonicalErrors: metadataRows.filter((row) => row.canonicalOk === "no").length,
    brokenInternalLinks: internalRows.filter((row) => row.classification === "INTERNAL" && Number(row.status) !== 200).length,
    orphanedPosts: orphaned.length,
    webflowSourceMatches: sourceMatches.length,
    webflowRuntimeRequests: [...externalHosts.keys()].filter((host) => WEBFLOW_HOST_PATTERNS.some((pattern) => host.includes(pattern))).length,
    oldVercelRuntimeRequests: [...externalHosts.keys()].filter((host) => host.includes(OLD_VERCEL)).length,
    routeAuditCount: routeAudit.routesScanned,
    dependencyAuditCount: dependencyAudit.publishedPostsScanned,
    dependencyAuditWebflowRuntime: dependencyAudit.webflowMediaRuntimeDependencies,
    missingEnvCount: missingEnv.length,
  };

  const md = (title: string, lines: string[]) => `# ${title}\n\nGenerated: ${GENERATED_AT}\n\n${lines.join("\n")}\n`;
  writeFileSync(path.join(OUT_DIR, "FINAL_SANITY_MIGRATION_AUDIT.md"), md("Final Sanity Migration Audit", [
    `- Previously published Webflow Blog post count: ${counts.webflowBlogPostCount}`,
    `- Final migration manifest count: ${counts.manifestCount}`,
    `- Published Sanity post count: ${counts.publishedSanityPostCount}`,
    `- Count mismatch: ${counts.countMismatch}`,
    `- Missing in Sanity: ${missingInSanity.length ? missingInSanity.join(", ") : "None"}`,
    `- Published Sanity posts missing from manifest: ${missingInManifest.length ? missingInManifest.join(", ") : "None"}`,
    `- Duplicate published Sanity slugs: ${duplicateSanitySlugs.length ? duplicateSanitySlugs.join(", ") : "None"}`,
    `- Final route audit routes scanned: ${counts.routeAuditCount}`,
    `- Final stored-data Webflow dependency audit post count: ${counts.dependencyAuditCount}`,
    `- Final stored-data Webflow runtime dependency count: ${counts.dependencyAuditWebflowRuntime}`,
  ]));
  writeFileSync(path.join(OUT_DIR, "FINAL_URL_PARITY_SUMMARY.md"), md("Final URL Parity Summary", [
    `- Target base URL: ${TARGET_BASE}`,
    `- Total URLs tested: ${counts.parityTotal}`,
    `- Same-path 200: ${counts.samePath200}`,
    `- Intentional permanent redirects: ${counts.intentionalRedirect}`,
    `- Expected intentional 404: ${counts.expected404}`,
    `- Unexpected 404 or missing from rebuild: ${counts.unexpected404}`,
    `- Wrong-content or soft-404: ${counts.wrongOrSoft404}`,
    "",
    "Launch-blocking parity failures are listed in `FINAL_URL_PARITY_AUDIT.csv`.",
  ]));
  writeFileSync(path.join(OUT_DIR, "FINAL_SITEMAP_AUDIT.md"), md("Final Sitemap Audit", [
    `- Sitemap URL: ${TARGET_BASE}/sitemap.xml`,
    `- Sitemap status: ${targetSitemap.status}`,
    `- Sitemap content type: ${targetSitemap.contentType}`,
    `- Static-page count: ${counts.sitemapStatic}`,
    `- Case Study count: ${counts.sitemapCaseStudy}`,
    `- Published Sanity-post count: ${counts.sitemapBlogPost}`,
    `- Total sitemap count: ${counts.sitemapTotal}`,
    `- Duplicate count: ${counts.sitemapDuplicate}`,
    `- Non-200 count: ${counts.sitemapNon200}`,
    `- Missing Sanity slugs from sitemap: ${[...sanitySlugs].filter((slug) => !sitemapPostSlugs.has(slug)).join(", ") || "None"}`,
    `- Private routes excluded: API routes, Studio, Scorecard admin, private Scorecard report routes.`,
  ]));
  writeFileSync(path.join(OUT_DIR, "FINAL_INDEXING_METADATA_AUDIT.md"), md("Final Indexing Metadata Audit", [
    `- Public routes audited: ${metadataRows.length}`,
    `- Public noindex errors: ${counts.publicNoindexErrors}`,
    `- Canonical errors: ${counts.canonicalErrors}`,
    `- Structured data detected where implemented; missing optional BlogPosting/BreadcrumbList enhancements are recommended post-launch enhancements, not DNS blockers.`,
    "",
    ...metadataRows.map((row) => `- ${row.path}: title=${row.title ? "present" : "missing"}, description=${row.description ? "present" : "missing"}, canonical=${row.canonical || "missing"}, canonicalOk=${row.canonicalOk}, ogImage=${row.ogImage ? "present" : "missing"}, robots=${row.robots || "none"}`),
  ]));
  writeFileSync(path.join(OUT_DIR, "FINAL_WEBFLOW_INDEPENDENCE_AUDIT.md"), md("Final Webflow Independence Audit", [
    `- Source/data matches in active scanned areas: ${counts.webflowSourceMatches}`,
    `- Runtime HTML external Webflow hosts observed: ${counts.webflowRuntimeRequests}`,
    `- Runtime HTML old Vercel hosts observed: ${counts.oldVercelRuntimeRequests}`,
    `- Stored-data final dependency audit Webflow runtime dependencies: ${counts.dependencyAuditWebflowRuntime}`,
    "",
    "## Source Matches",
    ...(sourceMatches.length ? sourceMatches.map((m) => `- ${m.path}: ${m.pattern} -> ${m.classification}`) : ["- None"]),
    "",
    "## Runtime External Hostnames",
    ...([...externalHosts].sort(([a], [b]) => a.localeCompare(b)).map(([host, count]) => `- ${host}: ${count}`)),
  ]));
  const ready = counts.countMismatch === 0
    && missingInSanity.length === 0
    && counts.unexpected404 === 0
    && counts.wrongOrSoft404 === 0
    && counts.sitemapNon200 === 0
    && counts.sitemapDuplicate === 0
    && counts.publicNoindexErrors === 0
    && counts.canonicalErrors === 0
    && counts.webflowRuntimeRequests === 0
    && counts.oldVercelRuntimeRequests === 0
    && counts.missingEnvCount === 0;
  writeFileSync(path.join(OUT_DIR, "PRE_DNS_CUTOVER_HANDOFF.md"), md("Pre-DNS Cutover Handoff", [
    "## Ready",
    `- Webflow URL baseline captured: ${counts.webflowPublicUrlCount} URLs.`,
    `- Sanity migration count parity: ${counts.countMismatch === 0 ? "passed" : "blocked"}.`,
    `- Sitemap generated and audited: ${counts.sitemapNon200 === 0 && counts.sitemapDuplicate === 0 ? "passed" : "blocked"}.`,
    `- Runtime Webflow dependency check: ${counts.webflowRuntimeRequests === 0 ? "passed" : "blocked"}.`,
    `- Build/test validation: run separately after this report generation.`,
    "",
    "## Fixed",
    "- Added reusable pre-DNS URL parity/audit script.",
    "- Updated docs index with one concise pre-DNS handoff link.",
    "- No application source behaviour, Sanity content, public media, DNS, deployment, Funnelr, Resend, Scorecard, or Cal.com behaviour was changed.",
    "",
    "## Blocked",
    `- Vercel custom domains: verify/add nexubis.io and www.nexubis.io in the canonical Vercel project before DNS change.`,
    ...(ready ? ["- No audit-generated launch blockers found in local reports."] : [
      `- Count mismatch: ${counts.countMismatch}`,
      `- Unexpected 404 count: ${counts.unexpected404}`,
      `- Soft/wrong-content count: ${counts.wrongOrSoft404}`,
      `- Sitemap non-200 count: ${counts.sitemapNon200}`,
      `- Public noindex errors: ${counts.publicNoindexErrors}`,
      `- Canonical errors: ${counts.canonicalErrors}`,
      `- Runtime Webflow requests: ${counts.webflowRuntimeRequests}`,
      `- Old Vercel runtime requests: ${counts.oldVercelRuntimeRequests}`,
      `- Missing Production env variables from Vercel env-name audit: ${counts.missingEnvCount}`,
    ]),
    "",
    "## Manual Pre-DNS Actions",
    "- Review the exact code and report changes.",
    "- Commit the changes.",
    "- Push or merge to main.",
    "- Wait for the canonical Vercel Production deployment.",
    "- Confirm the deployed SHA.",
    "- Rerun parity and sitemap checks against the deployed commit.",
    "- Confirm both intended domains are attached to the canonical project.",
    "- Export or screenshot the current DNS zone.",
    "- Change DNS manually only after final approval.",
    "",
    "## Post-Cutover Tests",
    "- Rerun URL parity against https://www.nexubis.io.",
    "- Confirm apex-to-www redirect.",
    "- Confirm HTTPS.",
    "- Repeat one controlled Contact test.",
    "- Repeat one controlled Cal.com booking/webhook test.",
    "- Run one full Production Scorecard test.",
    "- Verify robots.txt on the real domain.",
    "- Verify sitemap.xml on the real domain.",
    "- Submit sitemap in Google Search Console.",
    "- Monitor 404s, indexing and canonical issues.",
  ]));

  const summary = {
    generatedAt: GENERATED_AT,
    targetBase: TARGET_BASE,
    counts,
    missingInSanity,
    missingInManifest,
    duplicateSanitySlugs,
    missingEnv,
    optionalProductionEnv: [...optionalProductionEnv].filter((name) => envRefs.has(name)).sort(),
    nonProductionAuditEnv: [...nonProductionAuditEnv].filter((name) => envRefs.has(name)).sort(),
    ready,
  };
  writeFileSync(path.join(OUT_DIR, "AUDIT_SUMMARY.json"), JSON.stringify(summary, null, 2));
  if (!ready) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
