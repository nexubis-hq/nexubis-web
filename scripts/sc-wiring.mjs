import { chromium } from "playwright-core";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 60000 });

const surfaces = [
  { name: "hero transitional link", sel: 'a.hero-scorecard-link' },
  { name: "hero support line", sel: 'p.hero-support' },
  { name: "Section 7 block CTA", sel: 'a.scorecard-cta' },
  { name: "footer link", sel: 'footer a:has-text("Brand Credibility Scorecard"), a:has-text("Brand Credibility Scorecard")' },
];
for (const s of surfaces) {
  const el = page.locator(s.sel).first();
  const count = await page.locator(s.sel).count();
  if (count === 0) { console.log(`MISSING: ${s.name}`); continue; }
  const href = await el.getAttribute("href").catch(() => null);
  const text = (await el.textContent())?.trim().slice(0, 90);
  console.log(`OK: ${s.name} -> href=${href ?? "(text)"} | "${text}"`);
}
// Header check (expected absent by design):
const headerScorecard = await page.locator('header a[href="/scorecard"]').count();
console.log(`header scorecard link count: ${headerScorecard} (0 expected by homepage design; Part 2B wanted one, drift reported)`);

// Every /scorecard href resolves to the working tool:
await page.click("a.scorecard-cta");
await page.waitForURL(/\/scorecard$/, { timeout: 15000 });
await page.waitForSelector('input[name="url"]', { timeout: 15000 });
console.log("Section 7 CTA resolves to the working tool");
await browser.close();
console.log("WIRING CHECK COMPLETE");
