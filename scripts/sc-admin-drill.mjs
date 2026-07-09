import { chromium } from "playwright-core";
const PASSWORD = process.env.SCORECARD_ADMIN_PASSWORD;
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

console.log("1. auth gate: leads redirects to login");
await page.goto("http://localhost:3000/scorecard/admin/leads", { waitUntil: "networkidle" });
if (!page.url().endsWith("/scorecard/admin")) throw new Error(`expected redirect to login, got ${page.url()}`);

console.log("2. wrong password rejected");
await page.fill('input[name="password"]', "wrong-password");
await page.click('button:has-text("Sign in")');
await page.waitForSelector(".sc-form-error", { timeout: 10000 });

console.log("3. correct password signs in");
await page.fill('input[name="password"]', PASSWORD);
await page.click('button:has-text("Sign in")');
await page.waitForURL(/\/scorecard\/admin\/leads/, { timeout: 15000 });
await page.waitForSelector(".sc-admin-table", { timeout: 10000 });
await page.locator("main.sc-admin").screenshot({ path: "qa/scorecard/admin-leads-1280.png" });

console.log("4. open the lead's report view");
await page.click(".sc-admin-table tbody tr td a");
await page.waitForSelector(".sc-admin-facts", { timeout: 15000 });
const slugUrl = page.url();
await page.locator("main.sc-admin").screenshot({ path: "qa/scorecard/admin-slug-1280.png" });

console.log("5. attach a Loom");
await page.fill('input[name="loomUrl"]', "https://www.loom.com/share/abc123def456");
await page.click('button:has-text("Attach Loom")');
await page.waitForSelector('text=the walkthrough slot is live', { timeout: 15000 });

console.log("6. the Loom renders on the public report");
const publicUrl = slugUrl.replace("/scorecard/admin/", "/scorecard/r/");
await page.goto(publicUrl, { waitUntil: "networkidle" });
await page.waitForSelector(".sc-loom-frame iframe", { timeout: 15000 });
const src = await page.getAttribute(".sc-loom-frame iframe", "src");
if (!src.includes("loom.com/embed/abc123def456")) throw new Error(`bad embed src: ${src}`);
await page.locator(".sc-loom").screenshot({ path: "qa/scorecard/loom-slot-1280.png" });

console.log("7. loom status transition");
await page.goto(slugUrl, { waitUntil: "networkidle" });
const status = await page.inputValue('.sc-admin-card select[name="loomStatus"]');
if (status !== "recorded") throw new Error(`expected loomStatus recorded after attach, got ${status}`);

await browser.close();
console.log("ADMIN DRILL COMPLETE");
