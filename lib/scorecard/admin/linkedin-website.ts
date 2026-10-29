import { load } from "cheerio";
import { websiteUrl } from "./linkedin";

export interface WebsiteLinkedin {
  url: string;
  text: string;
  surrounding: string;
}
const MAX_BYTES = 1_500_000;
const PAGE_WORDS =
  /team|about|over-ons|ons-team|wie-zijn-wij|medewerkers|contact/i;

// Raw HTML only. Redirects are checked before following so no other host is fetched.
async function readHtml(url: URL, host: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    for (let redirects = 0; redirects <= 3; redirects++) {
      const response = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        },
      });
      if (response.status >= 300 && response.status < 400) {
        await response.body?.cancel();
        const location = response.headers.get("location");
        if (!location) return null;
        url = new URL(location, url);
        if (
          url.host !== host ||
          !/^https?:$/.test(url.protocol) ||
          url.username ||
          url.password
        )
          return null;
        continue;
      }
      if (
        !response.ok ||
        Number(response.headers.get("content-length")) > MAX_BYTES
      ) {
        await response.body?.cancel();
        return null;
      }
      const reader = response.body?.getReader();
      if (!reader) return null;
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_BYTES) {
          await reader.cancel();
          return null;
        }
        chunks.push(value);
      }
      const html = Buffer.concat(chunks).toString("utf8");
      return /cf-chl-|challenge-platform|<title>\s*(?:Just a moment|Attention Required)/i.test(
        html
      )
        ? null
        : html;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function readLinkedinWebsite(
  website: string
): Promise<WebsiteLinkedin[]> {
  try {
    const normalized = websiteUrl(website);
    if (!normalized) return [];
    const home = new URL("/", normalized);
    const html = await readHtml(home, home.host);
    if (!html) return [];
    const links: WebsiteLinkedin[] = [];
    const collect = (raw: string, page: URL) => {
      const $ = load(raw);
      $("script, style, noscript").remove();
      $("a[href]").each((_i, element) => {
        try {
          const url = new URL($(element).attr("href")!, page);
          if (!/^(?:[a-z]{2}\.|www\.)?linkedin\.com$/i.test(url.hostname))
            return;
          const text = $(element).text().replace(/\s+/g, " ").trim();
          let context = $(element).parent();
          // Social icons are often wrapped separately from the team member's name.
          while (
            context.parent().length &&
            context.text().trim() === $(element).text().trim()
          ) {
            context = context.parent();
          }
          const parent = context.text().replace(/\s+/g, " ").trim();
          const index = Math.max(0, parent.indexOf(text));
          links.push({
            url: url.href,
            text,
            surrounding: parent.slice(
              Math.max(0, index - 150),
              index + text.length + 150
            ),
          });
        } catch {
          /* Ignore malformed hrefs. */
        }
      });
      return $;
    };
    const $ = collect(html, home);
    const pages = new Map<string, URL>();
    $("a[href]").each((_i, element) => {
      try {
        const url = new URL($(element).attr("href")!, home);
        url.hash = "";
        if (
          url.host === home.host &&
          /^https?:$/.test(url.protocol) &&
          !url.username &&
          !url.password &&
          url.pathname !== "/" &&
          PAGE_WORDS.test(`${url.pathname} ${$(element).text()}`)
        )
          pages.set(url.href, url);
      } catch {
        /* Ignore malformed hrefs. */
      }
    });
    const extraPages = [...pages.values()].slice(0, 4);
    const extraHtml = await Promise.all(
      extraPages.map((page) => readHtml(page, home.host))
    );
    extraHtml.forEach((extra, i) => {
      if (extra) collect(extra, extraPages[i]);
    });
    return links;
  } catch {
    return [];
  }
}
