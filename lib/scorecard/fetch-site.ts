import { load, type CheerioAPI } from "cheerio";
import { isMockMode } from "./env";
import { mockSiteText, mockSiteFacts } from "./mock";

/** Deterministic facts read straight from the HTML, no model involved. These
 *  power the buyer-path checks and the code-side competitor comparison, so
 *  they must stay strictly observational: counts and names of what IS there.
 *  Absence of a fact means "not seen on the pages crawled", never "does not
 *  exist"; phrasing that distinction is the consumers' job. */
export interface SitePageFacts {
  /** Distinct language codes reachable from the landing page (hreflang
   *  alternates plus clear language-switcher links), own language included
   *  when declared. Empty when nothing was declared or detected. */
  languages: string[];
  /** Where the language evidence came from; "none" = no alternates and no
   *  switcher were visible on the landing page. */
  languageSource: "hreflang" | "switcher" | "none";
  /** Most recent copyright year in the footer, when one is printed. */
  copyrightYear: number | null;
  /** PDF links seen across the crawled pages. */
  pdfLinkCount: number;
  /** Sample link texts pointing at technical buyer material (datasheets, CAD
   *  files, configurators, product selectors). Positive proof only. */
  techDocLinks: string[];
  /** Video embeds seen across the crawled pages. */
  videoCount: number;
  /** The largest form found on a contact or enquiry page, when one was
   *  visible in the HTML. Null when no form was seen (it may be JS-rendered,
   *  so null must never be read as "has no form"). */
  contactForm: { fieldCount: number; fields: string[] } | null;
}

export function emptySiteFacts(): SitePageFacts {
  return {
    languages: [],
    languageSource: "none",
    copyrightYear: null,
    pdfLinkCount: 0,
    techDocLinks: [],
    videoCount: 0,
    contactForm: null,
  };
}

export type FetchSiteResult =
  | { ok: true; text: string; title: string; finalUrl: string; facts: SitePageFacts }
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

// Evidence the text extraction cannot see, emitted as bracketed signal lines
// AND as structured counts for the code-side competitor comparison. Images
// carry no text and PDFs sit behind links, so without these signals the AI
// would false-negate visuals and documents that clearly exist. Must run
// BEFORE nav/footer/iframe stripping.
interface PageSignalRead {
  text: string;
  pdfCount: number;
  videoCount: number;
  techDocLinks: string[];
}

// Vocabulary that marks a link as technical buyer material: datasheets, CAD
// files, configurators, product selectors. Word-bounded so "cascade" never
// matches "cad". Positive proof only; consumers never infer absence from an
// empty list.
const TECH_DOC_RE =
  /\bdata ?sheets?\b|\bspec ?sheets?\b|\btechnical (?:data|specifications?|documentation)\b|\bcad\b|\.stp\b|\.step\b|\.dwg\b|\.igs\b|\bconfigurators?\b|\bproduct (?:selector|finder)\b|\bselector tool\b/i;

function pageSignals($: CheerioAPI): PageSignalRead {
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
  // Technical buyer material: datasheet/CAD/configurator links are direct
  // evidence for the spec-sheets and quote-path checks.
  const techDocLinks = Array.from(
    new Set(
      $("a[href]")
        .toArray()
        .map((el) => {
          const text = $(el).text().replace(/\s+/g, " ").trim();
          const href = $(el).attr("href") ?? "";
          return TECH_DOC_RE.test(text) || TECH_DOC_RE.test(href) ? text || href : "";
        })
        .filter((t) => t.length > 0 && t.length < 80),
    ),
  ).slice(0, 6);
  if (techDocLinks.length > 0) {
    signals.push(`[page signal] This page links to technical buyer material (datasheets, CAD or a product selector): ${techDocLinks.join("; ")}.`);
  }
  return { text: signals.join("\n"), pdfCount: pdfs.length, videoCount: videos.length, techDocLinks };
}

// ── Language coverage ────────────────────────────────────────────────────────
// hreflang alternates are the strong signal; a nav link whose entire text is a
// language name or code is the fallback. Both are exact-match by design: a
// false "your site speaks German" would be worse than missing one. Exported
// for tests.
const LANGUAGE_NAMES: Record<string, string> = {
  english: "en", deutsch: "de", "français": "fr", francais: "fr", nederlands: "nl",
  "español": "es", espanol: "es", italiano: "it", "português": "pt", portugues: "pt",
  polski: "pl", svenska: "sv", dansk: "da", norsk: "no", suomi: "fi",
  "türkçe": "tr", turkce: "tr", "čeština": "cs", cestina: "cs", "русский": "ru",
  "中文": "zh", "日本語": "ja", "한국어": "ko",
};
const LANGUAGE_CODES = new Set(["en", "de", "fr", "nl", "es", "it", "pt", "pl", "sv", "da", "no", "fi", "tr", "cs", "ru", "zh", "ja", "ko"]);

export function extractLanguages($: CheerioAPI): { languages: string[]; source: "hreflang" | "switcher" | "none" } {
  const fromHreflang = new Set<string>();
  $('link[rel="alternate"][hreflang]').each((_, el) => {
    const raw = ($(el).attr("hreflang") ?? "").trim().toLowerCase();
    if (!raw || raw === "x-default") return;
    const code = raw.split(/[-_]/)[0];
    if (code.length === 2) fromHreflang.add(code);
  });
  if (fromHreflang.size > 0) return { languages: Array.from(fromHreflang).sort(), source: "hreflang" };

  const fromSwitcher = new Set<string>();
  const ownLang = ($("html").attr("lang") ?? "").trim().toLowerCase().split(/[-_]/)[0];
  if (ownLang.length === 2) fromSwitcher.add(ownLang);
  $("a[href]").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim().toLowerCase();
    if (!text || text.length > 12) return;
    if (LANGUAGE_CODES.has(text)) {
      // A bare code like "IT" or "NO" is ambiguous (an IT-services page, the
      // word "no"); only count it when the destination also looks like a
      // language variant (/it/ path segment or a lang/locale query).
      const href = ($(el).attr("href") ?? "").toLowerCase();
      const languageShaped = new RegExp(`(?:^|/)${text}(?:/|$)|[?&](?:lang|locale|language)=${text}\\b`).test(href);
      if (languageShaped) fromSwitcher.add(text);
    } else if (LANGUAGE_NAMES[text]) {
      fromSwitcher.add(LANGUAGE_NAMES[text]);
    }
  });
  // The own <html lang> alone is not a switcher; only count a real choice.
  if (fromSwitcher.size > 1) return { languages: Array.from(fromSwitcher).sort(), source: "switcher" };
  return { languages: ownLang.length === 2 ? [ownLang] : [], source: "none" };
}

// Most recent copyright year printed in the footer, or null. Handles ranges
// ("© 2010-2019") by taking the latest year. Exported for tests.
export function extractCopyrightYear($: CheerioAPI): number | null {
  const footerText = $("footer").text().replace(/\s+/g, " ");
  if (!footerText) return null;
  const years: number[] = [];
  const re = /(?:©|\(c\)|copyright)[^0-9]{0,30}((?:19|20)\d{2})(?:\s*[-\u2013\u2014]\s*((?:19|20)\d{2}))?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(footerText)) !== null) {
    years.push(Number(m[1]));
    if (m[2]) years.push(Number(m[2]));
  }
  return years.length ? Math.max(...years) : null;
}

// The largest visible form on the page: field count plus field names, so the
// quote-path check can judge how seriously an enquiry is taken. Only forms
// with 2+ visible fields count (a single field is search or newsletter). A
// null result means no form was VISIBLE in the HTML; it may be JS-rendered,
// so callers must never turn null into "has no form". Exported for tests.
export function extractLargestForm($: CheerioAPI): { fieldCount: number; fields: string[] } | null {
  let best: { fieldCount: number; fields: string[] } | null = null;
  $("form").each((_, formEl) => {
    const $form = $(formEl);
    const fields: string[] = [];
    $form.find("input, select, textarea").each((_, el) => {
      const $el = $(el);
      const type = ($el.attr("type") ?? "").toLowerCase();
      if (["hidden", "submit", "button", "reset", "image"].includes(type)) return;
      const name = ($el.attr("name") || $el.attr("placeholder") || $el.attr("aria-label") || $el.attr("id") || "")
        .replace(/[_\-[\]]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
      fields.push(name || (el as { tagName?: string }).tagName?.toLowerCase() || "field");
    });
    if (fields.length >= 2 && (!best || fields.length > best.fieldCount)) {
      best = { fieldCount: fields.length, fields: fields.slice(0, 12) };
    }
  });
  return best;
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
    return {
      ok: true,
      text: mockSiteText(validated.url.toString(), host),
      title: host,
      finalUrl: validated.url.toString(),
      facts: mockSiteFacts(host),
    };
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
  const landingRead = pageSignals($);
  const langRead = extractLanguages($);
  const copyrightYear = extractCopyrightYear($);
  const facts: SitePageFacts = {
    languages: langRead.languages,
    languageSource: langRead.source,
    copyrightYear,
    pdfLinkCount: landingRead.pdfCount,
    techDocLinks: [...landingRead.techDocLinks],
    videoCount: landingRead.videoCount,
    contactForm: null,
  };
  // Language and footer-year lines are deterministic facts, worded so the
  // scorer can only ever repeat what was observed. The single-language line
  // says what a buyer reaching this page can see, not that no other version
  // exists anywhere.
  const extraSignals: string[] = [];
  if (langRead.languages.length > 1) {
    extraSignals.push(`[page signal] The site offers ${langRead.languages.length} language versions (${langRead.languages.join(", ")}).`);
  } else if (langRead.source === "none") {
    extraSignals.push(
      `[page signal] No language switcher or alternate-language versions are visible on this page${langRead.languages[0] ? ` (page language: ${langRead.languages[0]})` : ""}.`,
    );
  }
  if (copyrightYear !== null) {
    extraSignals.push(`[page signal] Footer copyright year: ${copyrightYear} (current year: ${new Date().getFullYear()}).`);
  }
  const landingSignals = [landingRead.text, ...extraSignals].filter(Boolean).join("\n");

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
        const innerRead = pageSignals(inner$);
        const signalLines: string[] = innerRead.text ? [innerRead.text] : [];
        // Enquiry pages: read the form itself, so the quote-path check judges
        // real fields, not guesses. Only a form VISIBLE in the HTML is
        // reported; a JS-rendered form simply yields no signal.
        let form: { fieldCount: number; fields: string[] } | null = null;
        if (target.category === "contact" || target.category === "next-step") {
          form = extractLargestForm(inner$);
          if (form) {
            signalLines.push(
              `[page signal] The enquiry form on this page has ${form.fieldCount} visible fields (${form.fields.join(", ")}).`,
            );
          }
        }
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
        const signals = signalLines.join("\n");
        return {
          section: `\n\n## [from ${path}, reached via "${target.text}"]\n${text}${signals ? `\n${signals}` : ""}`,
          read: innerRead,
          form,
        };
      }),
    );
    for (const item of fetched) {
      if (!item) continue;
      innerSections.push(item.section);
      facts.pdfLinkCount += item.read.pdfCount;
      facts.videoCount += item.read.videoCount;
      for (const link of item.read.techDocLinks) {
        if (!facts.techDocLinks.includes(link) && facts.techDocLinks.length < 10) facts.techDocLinks.push(link);
      }
      if (item.form && (!facts.contactForm || item.form.fieldCount > facts.contactForm.fieldCount)) {
        facts.contactForm = item.form;
      }
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
  return { ok: true, text: combined, title, finalUrl, facts };
}
