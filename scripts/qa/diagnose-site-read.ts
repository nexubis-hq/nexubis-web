// Fetch-only diagnosis. Run: npx tsx scripts/qa/diagnose-site-read.ts
// Does not load .env files or invoke detection, screenshots or paid APIs.
import { load } from "cheerio";
import { fetchSite, validateUrl } from "../../lib/scorecard/fetch-site";

const nativeFetch = globalThis.fetch;
const allowed = new Set(["euroboor.com", "jekashop.nl", "jekashop.com"]);
globalThis.fetch = async (input, init) => {
  let url = String(input);
  const chain: string[] = [];
  try {
    for (let hop = 0; hop <= 20; hop++) {
      const parsed = new URL(url);
      if (!validateUrl(url).ok || !allowed.has(parsed.hostname.replace(/^www\./, ""))) {
        throw new Error(`Fetch-only diagnostic refused host: ${parsed.hostname}`);
      }
      const res = await nativeFetch(url, { ...init, redirect: "manual" });
      const type = res.headers.get("content-type") || "(missing)";
      chain.push(`${res.status} ${url}`);
      if ([301, 302, 303, 307, 308].includes(res.status) && res.headers.has("location") && init?.redirect !== "manual") {
        url = new URL(res.headers.get("location")!, url).toString();
        await res.body?.cancel();
        continue;
      }
      const $ = load(type.includes("html") ? await res.clone().text() : "");
      $("script, style, noscript, svg, iframe, template, nav, header, footer").remove();
      const text = $("h1, h2, h3, p, li, a, button").toArray()
        .map((el) => $(el).text().replace(/\s+/g, " ").trim()).filter((s) => s.length >= 2).join("\n");
      console.log(JSON.stringify({ chain, finalUrl: url, redirectTo: res.headers.get("location"), contentType: type, readableChars: text.length }));
      return res;
    }
    throw new Error("Too many redirects");
  } catch (err) {
    console.log(JSON.stringify({ chain, finalUrl: url, error: String(err), cause: String((err as Error & { cause?: unknown }).cause ?? "") }));
    throw err;
  }
};

async function main() {
  if (process.env.SCORECARD_MOCK === "1") throw new Error("Run without mock mode");
  for (const url of ["https://Euroboor.com", "https://JekaShop.nl"]) {
    console.log(`\nINPUT ${url}`);
    const result = await fetchSite(url);
    console.log(JSON.stringify(result.ok
      ? { ok: true, finalUrl: result.finalUrl, readableChars: result.text.length }
      : result));
  }
}
main().catch((err) => { console.error(err); process.exitCode = 1; });
