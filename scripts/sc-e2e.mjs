// End-to-end happy path drill (mock mode): landing form -> scan -> teaser ->
// unlock -> shared report. Element-scoped screenshots into qa/scorecard/.
// Run: node scripts/sc-e2e.mjs
import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

console.log("1. landing");
await page.goto("http://localhost:3000/scorecard", { waitUntil: "networkidle", timeout: 60000 });
await page.locator("main.sc-report").first().screenshot({ path: "qa/scorecard/landing-1280.png" });

console.log("2. fill + submit step 1");
await page.fill('input[name="url"]', "veltkamp-dosing.nl");
await page.fill('input[name="productOneLiner"]', "Precision dosing equipment for food production lines");
await page.fill('input[aria-label="Competitor 1"]', "dosatech.de");
await page.fill('input[aria-label="Competitor 2"]', "flowserve-dosing.com");
await page.click('button:has-text("Check my brand\'s credibility")');

console.log("3. scan (or instant teaser in mock)");
try {
  await page.waitForSelector(".sc-scan", { timeout: 3000 });
  await page.locator("main.sc-report").first().screenshot({ path: "qa/scorecard/scan-1280.png" });
} catch {
  console.log("   scan too fast to capture (mock cache), fine");
}

console.log("4. teaser");
await page.waitForSelector(".sc-unlock", { timeout: 120000 });
await page.locator("main.sc-report").first().screenshot({ path: "qa/scorecard/flow-teaser-1280.png" });

console.log("5. unlock");
await page.fill('.sc-unlock input[name="firstName"]', "Mark");
await page.fill('.sc-unlock input[name="email"]', "mark@veltkamp-dosing.nl");
await page.selectOption(".sc-unlock select", "Marketing manager");
// The gate rejects sub-2s submissions; wait it out like a human would.
await page.waitForTimeout(2400);
await page.click(".sc-unlock button[type=submit]");
await page.waitForSelector(".sc-unlock-after", { timeout: 30000 });
await page.locator(".sc-unlock").screenshot({ path: "qa/scorecard/unlock-after-1280.png" });

console.log("6. shared report");
await page.waitForURL(/\/scorecard\/r\/[a-z2-9]{8}$/, { timeout: 30000 });
await page.waitForSelector(".sc-first-fix", { timeout: 30000 });
const url = page.url();
await page.locator("main.sc-report").first().screenshot({ path: "qa/scorecard/shared-report-1280.png" });
console.log("shared report at", url);

const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
if (errors.length) console.log("page errors:", errors);

await browser.close();
console.log("E2E HAPPY PATH COMPLETE");
