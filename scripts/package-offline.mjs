// Packages an offline copy of the homepage (+ packages page) that opens by
// double-clicking index.html: mirrors the production server, downloads every
// referenced asset, and rewrites absolute paths to relative ones.
// Run: node scripts/package-offline.mjs  (expects `next start` on :3010)
import { mkdirSync, writeFileSync, cpSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const BASE = "http://localhost:3010";
const OUT = process.env.HOME + "/Desktop/nexubis-homepage-preview"; // outside the repo: Turbopack/Tailwind scan the project tree and choke on mirrored HTML
const PAGES = [
  { route: "/", file: "index.html", depth: 0 },
  { route: "/packages", file: "packages/index.html", depth: 1 },
];

const downloaded = new Set();

function normalise(path) {
  return path.split("?")[0].split("#")[0];
}

async function download(path) {
  const clean = normalise(path);
  if (!clean.startsWith("/") || clean === "/" || downloaded.has(clean)) return;
  // Assets only: page routes (no file extension) are mirrored explicitly in
  // PAGES, never as loose files.
  if (!/\.[a-z0-9]+$/i.test(clean)) return;
  downloaded.add(clean);
  const res = await fetch(BASE + clean).catch(() => null);
  if (!res || !res.ok) {
    console.warn(`  miss: ${clean} (${res?.status ?? "unreachable"})`);
    return;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const dest = join(OUT, clean.slice(1));
  mkdirSync(dirname(dest), { recursive: true });
  const type = res.headers.get("content-type") ?? "";
  if (type.includes("text/css")) {
    // CSS url(...) references resolve relative to the CSS file itself.
    let css = buf.toString("utf8");
    const depth = clean.split("/").length - 2; // segments below root
    const up = "../".repeat(depth);
    const refs = [...css.matchAll(/url\(\s*['"]?(\/[^'")]+)['"]?\s*\)/g)].map((m) => m[1]);
    for (const ref of refs) await download(ref);
    css = css.replace(/url\(\s*['"]?\/(?!\/)/g, `url(${up}`);
    writeFileSync(dest, css);
  } else {
    writeFileSync(dest, buf);
  }
}

// Every root-absolute reference in HTML attributes and inline code.
function collectRefs(html) {
  const refs = new Set();
  for (const m of html.matchAll(/(?:src|href)="(\/[^"]+)"/g)) refs.add(m[1]);
  for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
    for (const part of m[1].split(",")) {
      const url = part.trim().split(/\s+/)[0];
      if (url.startsWith("/")) refs.add(url);
    }
  }
  // Chunk paths inside inline scripts (hydration manifests).
  for (const m of html.matchAll(/["'](\/_next\/[^"'\\\s]+?\.(?:js|css|woff2?|json))["']/g)) refs.add(m[1]);
  // Escaped paths inside RSC payload strings (\"/assets/...\").
  for (const m of html.matchAll(/\\"(\/(?:assets|_next)\/[^"\\]+?)\\"/g)) refs.add(m[1]);
  for (const m of html.matchAll(/url\(\s*['"]?(\/[^'")]+)['"]?\s*\)/g)) refs.add(m[1]);
  return [...refs];
}

function rewriteHtml(html, depth) {
  const up = depth === 0 ? "./" : "../".repeat(depth);
  // Attribute references (poster covers the video preview frame).
  html = html.replace(/(src|href|poster)="\/(?!\/)/g, `$1="${up}`);
  html = html.replace(/srcset="([^"]+)"/g, (_, v) => `srcset="${v.replace(/(^|,\s*)\/(?!\/)/g, `$1${up}`)}"`);
  // Escaped paths inside the inline hydration payload: React re-applies these
  // as element attributes after load, so they must be relative too, or images
  // resolve against the filesystem root.
  html = html.replace(/\\"\/(assets|_next)\//g, `\\"${up}$1/`);
  // Inline-style background images, in both the HTML attribute form and the
  // payload's style-object form: url(/assets/...) -> relative.
  html = html.replace(/url\(\/(?!\/)/g, `url(${up}`);
  // Root links: "/" -> index.html, "/packages" -> packages page.
  html = html.replace(new RegExp(`href="${up}"`, "g"), `href="${up}index.html"`);
  html = html.replace(new RegExp(`href="${up}packages"`, "g"), `href="${up}packages/index.html"`);
  return html;
}

// Remote media (the R2-hosted showreel) rides along so the package works with
// no network at all. Each unique remote URL lands in remote/ and every plain
// or payload-escaped occurrence is rewritten to it.
async function localiseRemoteMedia(html, depth) {
  const up = depth === 0 ? "./" : "../".repeat(depth);
  const urls = [...new Set([...html.matchAll(/https:\/\/pub-[a-z0-9]+\.r2\.dev\/[^"'\\\s)]+/g)].map((m) => m[0]))];
  for (const url of urls) {
    const name = url.split("/").pop();
    const dest = join(OUT, "remote", name);
    if (!existsSync(dest)) {
      console.log(`  remote: ${url} -> remote/${name}`);
      const res = await fetch(url).catch(() => null);
      if (!res || !res.ok) {
        console.warn(`  remote miss: ${url}`);
        continue;
      }
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    }
    html = html.split(url).join(`${up}remote/${name}`);
  }
  return html;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  for (const page of PAGES) {
    console.log(`page ${page.route}`);
    const res = await fetch(BASE + page.route);
    if (!res.ok) throw new Error(`${page.route} -> ${res.status}`);
    let html = await res.text();
    const refs = collectRefs(html);
    console.log(`  ${refs.length} referenced paths`);
    for (const ref of refs) await download(ref);
    html = rewriteHtml(html, page.depth);
    html = await localiseRemoteMedia(html, page.depth);
    const dest = join(OUT, page.file);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, html);
  }
  // The whole public asset tree rides along: videos, lottie JSON and anything
  // loaded at runtime that the static scan cannot see.
  if (existsSync("public/assets")) {
    cpSync("public/assets", join(OUT, "assets"), { recursive: true });
    console.log("copied public/assets wholesale");
  }
  console.log(`done: ${downloaded.size} assets -> ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
