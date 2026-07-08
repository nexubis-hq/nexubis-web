import { load, type CheerioAPI } from "cheerio";
import { isMockMode } from "./env";
import { mockSiteText } from "./mock";

export type FetchSiteResult =
  | { ok: true; text: string; title: string; finalUrl: string }
  | { ok: false; reason: string };

const TIMEOUT_MS = 8000;
const INNER_TIMEOUT_MS = 5000;
const MAX_CHARS = 12000;
// Up to 5 key internal pages per company (about, products, downloads/brochures,
// contact, plus the primary CTA destination).
const MAX_INNER_PAGES = 5;
const INNER_PAGE_CHARS = 2500;
const USER_AGENT = "Mozilla/5.0 (compatible; NexubisScorecard/1.0; +https://www.nexubis.io)";

// Categories worth walking when their link is on the landing page. Order is
// the priority order if we can only afford a few inner fetches. These are the
// pages the rubric scores from: what they make (products), who they are
// (about), what buyers can download (brochures/spec sheets), and how to reach
// them (contact). "next-step" catches primary CTA labels whose destination is
// usually the enquiry flow.
const PAGE_CATEGORIES: ReadonlyArray<{ key: string; patterns: RegExp[] }> = [
  { key: "products", patterns: [/\bproducts?\b/i, /\bmachines?\b/i, /\bsystems?\b/i, /\bsolutions?\b/i, /\bequipment\b/i, /\btechnolog/i, /\bapplications?\b/i] },
  { key: "about", patterns: [/\babout\b/i, /\bcompany\b/i, /\bwho we are\b/i, /\bover ons\b/i, /\bveber uns\b/i, /\bunternehmen\b/i, /\bhistory\b/i] },
  { key: "downloads", patterns: [/\bdownloads?\b/i, /\bbrochures?\b/i, /\bspec ?sheets?\b/i, /\bdatasheets?\b/i, /\bcatalog(?:ue)?s?\b/i, /\bdocumentation\b/i, /\bresources?\b/i] },
  { key: "contact", patterns: [/\bcontact\b/i, /\bget in touch\b/i, /\bkontakt\b/i, /\benquir/i, /\brequest (?:a )?quote\b/i] },
  { key: "next-step", patterns: [/\bget[-\s]?started\b/i, /\bget (?:a )?quote\b/i, /\brequest (?:a )?(?:quote|demo|call)/i, /\b(?:book|request|schedule) (?:a )?demo\b/i, /\bconsultation\b/i] },
];

// A primary CTA is often a prominent button ("Request a quote", "Book a demo")
// that sits in the hero or body, NOT the nav. We detect these across the whole
// page (by action-y text or an enquiry-flavoured class) and walk their
// destination, so an enquiry flow reached only through a CTA is seen.
const CTA_TEXT = /\b(get[-\s]?started|get (?:a )?quote|request (?:a )?(?:quote|demo|call ?back|consultation)|book (?:a )?(?:demo|call|consultation|appointment|now)|start (?:now|today|free|your)|sign[-\s]?up|schedule (?:a )?(?:call|demo|meeting|consultation)|enquir(?:e|y)|get in touch|contact us)\b/i;
const CTA_CLASS = /\b(book|enquir|contact|get-?started|quote|consult|demo)\b/i;

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "0.0.0.0" || host === "::1" || host === "[::1]") return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  if (host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) return true;
  return false;
}

export function normaliseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function validateUrl(raw: string): { ok: true; url: URL } | { ok: false; reason: string } {
  let url: URL;
  try {
    url = new URL(normaliseUrl(raw));
  } catch {
    return { ok: false, reason: "That does not look like a valid web address." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "Only http and https addresses are supported." };
  }
  if (isBlockedHost(url.hostname)) {
    return { ok: false, reason: "That address is not reachable from here." };
  }
  return { ok: true, url };
}

// Evidence the text extraction cannot see, emitted as bracketed signal lines.
// Images carry no text and PDFs sit behind links, so without these signals the
// AI would false-negate visuals and downloadable documents that clearly exist.
// Must run BEFORE nav/footer/iframe stripping.
function pageSignals($: CheerioAPI): string {
  const signals: string[] = [];
  const isChrome = (s: string) => /logo|icon|favicon|sprite|badge/i.test(s);
  const imgs = $("img")
    .toArray()
    .map((el) => ({
      src: $(el).attr("src") || $(el).attr("data-src") || "",
      alt: ($(el).attr("alt") || "").replace(/\s+/g, " ").trim(),
    }))
    .filter((i) => i.src.length > 0 && !i.src.endsWith(".svg") && !isChrome(i.src) && !isChrome(i.alt));
  if (imgs.length >= 3) {
    const alts = imgs.map((i) => i.alt).filter((a) => a.length > 2).slice(0, 6);
    signals.push(`[page signal] This page shows ${imgs.length} photos/images${alts.length ? ` (alt text samples: ${alts.join("; ")})` : ""}.`);
  }
  // Video presence matters to the product-visuals category. Detect embeds and
  // native video elements.
  const videos = $(
    ['video', 'iframe[src*="youtube.com"]', 'iframe[src*="youtu.be"]', 'iframe[src*="vimeo.com"]', 'iframe[src*="wistia"]'].join(", "),
  );
  if (videos.length > 0) signals.push(`[page signal] This page embeds ${videos.length} video(s).`);
  // Downloadable documents: brochure and spec-sheet links are direct rubric
  // evidence for the trade show and print category.
  const pdfs = $('a[href$=".pdf" i], a[href*=".pdf?" i]')
    .toArray()
    .map((el) => ($(el).text() || $(el).attr("href") || "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (pdfs.length > 0) {
    signals.push(`[page signal] This page links to ${pdfs.length} PDF document(s)${pdfs.length ? ` (e.g. ${pdfs.slice(0, 4).join("; ")})` : ""}.`);
  }
  return signals.join("\n");
}

function extractReadableText($: CheerioAPI, limit: number): string {
  $("script, style, noscript, svg, iframe, template").remove();
  const parts: string[] = [];
  $("h1, h2, h3, p, li, a, button").each((_, el) => {
    const tag = (el as { tagName?: string }).tagName?.toLowerCase();
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (!t || t.length < 2) return;
    if (tag === "h1") parts.push(`# ${t}`);
    else if (tag === "h2") parts.push(`## ${t}`);
    else if (tag === "h3") parts.push(`### ${t}`);
    else if (tag === "a" || tag === "button") parts.push(`[link] ${t}`);
    else parts.push(t);
  });
  return parts.join("\n").replace(/\n{3,}/g, "\n\n").slice(0, limit).trim();
}

// Collect <a> links, resolve hrefs against the page URL, and keep only
// same-origin internal links. Scoped by selector: nav/header first, with an
// all-anchors fallback for div-based headers (see collectNavLinks).
function collectLinks($: CheerioAPI, baseUrl: URL, selector: string): Array<{ text: string; href: string }> {
  const seen = new Map<string, { text: string; href: string }>();
  $(selector).each((_, el) => {
    const $el = $(el);
    const rawHref = $el.attr("href")?.trim();
    const text = $el.text().replace(/\s+/g, " ").trim();
    if (!rawHref || !text) return;
    if (rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:") || rawHref.startsWith("javascript:")) return;
    let resolved: URL;
    try {
      resolved = new URL(rawHref, baseUrl);
    } catch {
      return;
    }
    if (resolved.hostname.replace(/^www\./, "") !== baseUrl.hostname.replace(/^www\./, "")) return;
    // Strip fragment when keying so /products and /products#range dedupe.
    resolved.hash = "";
    const key = resolved.toString();
    if (seen.has(key) || key === baseUrl.toString()) return;
    seen.set(key, { text, href: key });
  });
  return Array.from(seen.values());
}

// Nav vocabulary. Semantic nav/header first; many modern sites build their
// menu from plain divs, which would leave the vocabulary empty and the
// inner-page walk blind. When the semantic scope finds too little, fall back
// to every internal link on the page, capped so footer/legal noise cannot
// flood the prompt.
const MAX_FALLBACK_LINKS = 25;
function collectNavLinks($: CheerioAPI, baseUrl: URL): Array<{ text: string; href: string }> {
  const semantic = collectLinks($, baseUrl, "nav a[href], header a[href]");
  if (semantic.length >= 3) return semantic;
  const all = collectLinks($, baseUrl, "a[href]").filter((l) => l.text.length > 0 && l.text.length < 40);
  const seen = new Set(semantic.map((l) => l.href));
  return [...semantic, ...all.filter((l) => !seen.has(l.href))].slice(0, MAX_FALLBACK_LINKS);
}

// Collect primary call-to-action links from ANYWHERE on the page (not just the
// nav), resolved and same-origin.
function collectCtaLinks($: CheerioAPI, baseUrl: URL): Array<{ text: string; href: string }> {
  const seen = new Map<string, { text: string; href: string }>();
  $("a[href]").each((_, el) => {
    const $el = $(el);
    const rawHref = $el.attr("href")?.trim();
    const text = $el.text().replace(/\s+/g, " ").trim();
    if (!rawHref) return;
    if (rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:") || rawHref.startsWith("javascript:")) return;
    const cls = $el.attr("class") ?? "";
    // Text is the strong signal; an enquiry-flavoured class on a short link is
    // a weaker secondary signal. Ignore long link text (paragraph links).
    const looksCta = CTA_TEXT.test(text) || (text.length > 0 && text.length < 32 && CTA_CLASS.test(cls));
    if (!looksCta) return;
    let resolved: URL;
    try {
      resolved = new URL(rawHref, baseUrl);
    } catch {
      return;
    }
    if (resolved.hostname.replace(/^www\./, "") !== baseUrl.hostname.replace(/^www\./, "")) return;
    resolved.hash = "";
    const key = resolved.toString();
    if (seen.has(key) || key === baseUrl.toString()) return;
    seen.set(key, { text, href: key });
  });
  return Array.from(seen.values());
}

export function pickInnerPages(links: Array<{ text: string; href: string }>): Array<{ category: string; href: string; text: string }> {
  const picked: Array<{ category: string; href: string; text: string }> = [];
  const usedHrefs = new Set<string>();
  for (const cat of PAGE_CATEGORIES) {
    if (picked.length >= MAX_INNER_PAGES) break;
    const match = links.find(
      (l) => !usedHrefs.has(l.href) && cat.patterns.some((re) => re.test(l.text) || re.test(l.href)),
    );
    if (match) {
      picked.push({ category: cat.key, href: match.href, text: match.text });
      usedHrefs.add(match.href);
    }
  }
  return picked;
}

async function fetchHtml(target: string, timeoutMs: number): Promise<string | null> {
  const validated = validateUrl(target);
  if (!validated.ok) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(validated.url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
    });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") || "").includes("html")) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Headless render for JavaScript-heavy sites. Many modern sites ship a
// near-empty HTML shell to a plain fetch, so the crawler sees no nav and no
// content and would wrongly conclude pages are missing. When the plain fetch
// looks thin, we re-fetch the FULLY RENDERED HTML through a rendering API so
// the real nav and content are visible. Gated to thin sites, so a normal
// server-rendered site never triggers it (and never pays). No-op (null) until
// RENDER_API_KEY is set, so the crawler degrades gracefully.
const RENDER_TIMEOUT_MS = 22_000;
export async function fetchRenderedHtml(targetUrl: string): Promise<string | null> {
  const key = process.env.RENDER_API_KEY;
  if (!key) return null;
  const validated = validateUrl(targetUrl);
  if (!validated.ok) return null;
  const endpoint = `https://app.scrapingbee.com/api/v1/?api_key=${encodeURIComponent(key)}&url=${encodeURIComponent(validated.url.toString())}&render_js=true`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RENDER_TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, { signal: controller.signal });
    if (!res.ok) return null;
    const html = await res.text();
    return html && html.length > 200 ? html : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// True when the raw HTML looks like a client-rendered shell: little readable
// text or no server-rendered links at all.
function looksClientRendered(html: string): boolean {
  const $ = load(html);
  const text = $("h1, h2, h3, p, li").text().replace(/\s+/g, " ").trim();
  const anchors = $("a[href]").length;
  return text.length < 600 || anchors === 0;
}

// Extract readable content, preserving heading/paragraph/link structure so the
// AI gets a sense of the page hierarchy, not just a wall of text. Also walks
// up to MAX_INNER_PAGES nav links matching the rubric's page categories
// (products, about, downloads, contact) so conclusions about missing content
// cannot be drawn from landing-page absence alone. JS-rendered shells are
// re-fetched fully rendered first (see fetchRenderedHtml).
export async function fetchSite(rawUrl: string): Promise<FetchSiteResult> {
  const validated = validateUrl(rawUrl);
  if (!validated.ok) return { ok: false, reason: validated.reason };
  if (isMockMode()) {
    const host = validated.url.hostname.replace(/^www\./, "");
    return { ok: true, text: mockSiteText(validated.url.toString(), host), title: host, finalUrl: validated.url.toString() };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let landingHtml: string;
  let finalUrl: string;
  try {
    const res = await fetch(validated.url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
    });
    if (!res.ok) return { ok: false, reason: `Site responded with status ${res.status}.` };
    if (!(res.headers.get("content-type") || "").includes("html")) {
      return { ok: false, reason: "That address did not return a web page." };
    }
    landingHtml = await res.text();
    finalUrl = res.url || validated.url.toString();
  } catch (err) {
    const reason =
      err instanceof Error && err.name === "AbortError"
        ? "The site took too long to respond."
        : "Could not reach that site.";
    return { ok: false, reason };
  } finally {
    clearTimeout(timer);
  }

  // SPA fallback: if the plain HTML is a thin client-rendered shell, re-fetch it
  // fully rendered so the crawler sees the real nav and content. Only thin sites
  // trigger this, and it no-ops without a key.
  let siteIsSpa = false;
  if (looksClientRendered(landingHtml)) {
    const rendered = await fetchRenderedHtml(finalUrl);
    if (rendered && rendered.length > landingHtml.length) {
      landingHtml = rendered;
      siteIsSpa = true;
      console.log(`[scorecard-fetch] used rendered HTML for ${finalUrl} (SPA shell)`);
    }
  }

  const $ = load(landingHtml);
  const title =
    $("title").first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    "";

  // Capture nav links BEFORE we strip the nav element away in extractReadableText.
  const baseUrl = new URL(finalUrl);
  const navLinks = collectNavLinks($, baseUrl);
  const ctaLinks = collectCtaLinks($, baseUrl);
  // Candidates for walking: nav vocabulary plus the CTA buttons found in the
  // body. pickInnerPages dedupes by href and honours category priority.
  const innerTargets = pickInnerPages([...navLinks, ...ctaLinks]);
  // Guarantee at least one CTA destination is walked even when its label/href
  // matched no named category, since that page most likely holds the enquiry
  // flow the CTA promises.
  if (
    ctaLinks.length > 0 &&
    innerTargets.length < MAX_INNER_PAGES &&
    !innerTargets.some((t) => ctaLinks.some((c) => c.href === t.href))
  ) {
    innerTargets.push({ category: "next-step", href: ctaLinks[0].href, text: ctaLinks[0].text });
  }

  // Capture no-text evidence (photos, videos, PDFs) before stripping chrome:
  // download links often sit in the footer we are about to remove.
  const landingSignals = pageSignals($);

  // Strip layout chrome from the landing page before reading its text. Nav
  // links are already in our navLinks list at this point, so dropping them is
  // safe.
  $("nav, footer, header").remove();
  const landingText = extractReadableText($, MAX_CHARS);
  if (!landingText) return { ok: false, reason: "No readable text found on that page." };

  // Walk relevant inner pages in parallel. Each is best-effort: a failure on a
  // single inner page never fails the overall fetch.
  const innerSections: string[] = [];
  if (innerTargets.length > 0) {
    const fetched = await Promise.all(
      innerTargets.map(async (target) => {
        // On a SPA the inner pages are client-rendered too, so render them; a
        // server-rendered site uses the cheap plain fetch.
        const html = siteIsSpa ? await fetchRenderedHtml(target.href) : await fetchHtml(target.href, INNER_TIMEOUT_MS);
        if (!html) return null;
        const inner$ = load(html);
        const signals = pageSignals(inner$);
        inner$("nav, footer, header").remove();
        const text = extractReadableText(inner$, INNER_PAGE_CHARS);
        if (!text) return null;
        const path = (() => {
          try {
            return new URL(target.href).pathname || "/";
          } catch {
            return target.href;
          }
        })();
        return `\n\n## [from ${path}, reached via "${target.text}"]\n${text}${signals ? `\n${signals}` : ""}`;
      }),
    );
    for (const section of fetched) {
      if (section) innerSections.push(section);
    }
  }

  // Always advertise the nav vocabulary so the AI knows what pages exist even
  // when the inner fetch fell through.
  const navSummary =
    navLinks.length > 0
      ? `\n\n## [navigation links observed on the site]\n${navLinks.map((l) => `- ${l.text} (${l.href})`).join("\n")}`
      : "";

  const combined = `${landingText}${landingSignals ? `\n${landingSignals}` : ""}${navSummary}${innerSections.join("")}`.slice(
    0,
    MAX_CHARS + INNER_PAGE_CHARS * MAX_INNER_PAGES + 600,
  );
  return { ok: true, text: combined, title, finalUrl };
}
