import { spawn } from "node:child_process";
import { cp, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";

const port = Number(process.env.CONSENT_TEST_PORT || 3137);
const baseUrl = process.env.CONSENT_TEST_BASE_URL || `http://localhost:${port}`;
const healthUrl = process.env.CONSENT_TEST_BASE_URL || `http://localhost:${port}`;
const temporaryProject = process.env.CONSENT_TEST_BASE_URL ? null : await mkdtemp(join(tmpdir(), "nexubis-consent-"));
if (temporaryProject) {
  await cp(process.cwd(), temporaryProject, {
    recursive: true,
    filter: (source) => !/[\\/]\.next([\\/]|$)/.test(source) && !/[\\/]node_modules([\\/]|$)/.test(source) && !/[\\/]\.git([\\/]|$)/.test(source) && !/[\\/]\.shipstudio([\\/]|$)/.test(source),
  });
  await symlink(join(process.cwd(), "node_modules"), join(temporaryProject, "node_modules"), "junction");
}
const server = process.env.CONSENT_TEST_BASE_URL
  ? null
  : spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--webpack", "-p", String(port)], {
      cwd: temporaryProject,
      env: { ...process.env, NEXT_PUBLIC_META_TRACKING_FORCE: "1" },
      stdio: ["ignore", "inherit", "inherit"],
      windowsHide: true,
    });

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${healthUrl}/`);
      if (response.ok) return;
    } catch {
      // The dev server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Consent test server did not start at ${healthUrl}`);
}

async function cookieValue(context) {
  const cookie = (await context.cookies()).find((item) => item.name === "nx_consent");
  return cookie ? JSON.parse(decodeURIComponent(cookie.value)) : null;
}

async function trackingScripts(page) {
  return {
    clarity: await page.locator('script[src*="clarity.ms"]').count(),
    meta: await page.locator('script[src*="connect.facebook.net"]').count(),
  };
}

async function waitForTrackers(page) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const scripts = await trackingScripts(page);
    if (scripts.clarity && scripts.meta) return scripts;
    await page.waitForTimeout(250);
  }
  return trackingScripts(page);
}

async function openPage(browser, savedConsent) {
  const context = await browser.newContext();
  if (savedConsent) {
    await context.addCookies([{ name: "nx_consent", value: encodeURIComponent(JSON.stringify(savedConsent)), url: baseUrl }]);
  }
  const page = await context.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.locator('aside[aria-label="Cookie consent"]').first().waitFor({ state: savedConsent?.decided ? "detached" : "visible" });
  return { context, page };
}

async function run() {
  await waitForServer();
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: [],
  });
  try {
    // 1. First visit: banner is visible and neither optional script is present.
    {
      console.log("1. first visit");
      const { context, page } = await openPage(browser);
      assert(await page.locator('aside[aria-label="Cookie consent"]').isVisible(), "first-visit banner is not visible");
      assert(JSON.stringify(await trackingScripts(page)) === JSON.stringify({ clarity: 0, meta: 0 }), "optional scripts loaded before consent");
      await context.close();
    }

    // 2. Accept All sets both categories and mounts both scripts.
    {
      console.log("2. accept all");
      const { context, page } = await openPage(browser);
      await page.getByRole("button", { name: "Accept All", exact: true }).click();
      await waitForTrackers(page);
      assert(!(await page.locator('aside[aria-label="Cookie consent"]').count()), "banner stayed visible after Accept All");
      assert(JSON.stringify(await cookieValue(context)) === JSON.stringify({ analytics: true, marketing: true, decided: true, ts: (await cookieValue(context)).ts }), "Accept All cookie flags are wrong");
      assert(JSON.stringify(await trackingScripts(page)) === JSON.stringify({ clarity: 1, meta: 1 }), "Accept All did not mount both trackers");
      await context.close();
    }

    // 3. Reject Non-Essential sets both categories false and mounts neither.
    {
      console.log("3. reject non-essential");
      const { context, page } = await openPage(browser);
      await page.getByRole("button", { name: "Reject Non-Essential", exact: true }).click();
      assert(!(await page.locator('aside[aria-label="Cookie consent"]').count()), "banner stayed visible after rejection");
      const consent = await cookieValue(context);
      assert(consent?.analytics === false && consent?.marketing === false && consent?.decided === true, "rejection cookie flags are wrong");
      assert(JSON.stringify(await trackingScripts(page)) === JSON.stringify({ clarity: 0, meta: 0 }), "rejection mounted an optional tracker");
      await context.close();
    }

    // 4. A fresh load with either saved choice does not show the banner again.
    for (const savedConsent of [
      { analytics: true, marketing: true, decided: true, ts: Date.now() },
      { analytics: false, marketing: false, decided: true, ts: Date.now() },
    ]) {
      console.log("4. saved decision reload");
      const { context, page } = await openPage(browser, savedConsent);
      assert(!(await page.locator('aside[aria-label="Cookie consent"]').count()), "banner reappeared with a saved decision");
      await context.close();
    }

    // 5. Manage Preferences and the footer Cookie Settings link reflect saved state.
    {
      console.log("5. saved preferences");
      const savedConsent = { analytics: true, marketing: false, decided: true, ts: Date.now() };
      const { context, page } = await openPage(browser, savedConsent);
      await page.waitForTimeout(1000);
      await page.evaluate(() => {
        const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.trim() === "Cookie Settings");
        button?.click();
      });
      console.log("5. Cookie Settings opened");
      await page.waitForTimeout(2000);
      assert(await page.getByRole("switch").nth(0).isChecked(), "saved analytics preference was reset");
      assert(!(await page.getByRole("switch").nth(1).isChecked()), "saved marketing preference was reset");
      await context.close();
    }

    // 6. Saving Analytics only mounts Clarity and leaves Meta absent.
    {
      console.log("6. analytics only");
      const { context, page } = await openPage(browser);
      await page.getByRole("button", { name: "Manage Preferences", exact: true }).click();
      await page.getByRole("switch").nth(0).check();
      await page.getByRole("button", { name: "Save Preferences", exact: true }).click();
      for (let attempt = 0; attempt < 30 && !(await page.locator('script[src*="clarity.ms"]').count()); attempt += 1) await page.waitForTimeout(250);
      assert(JSON.stringify(await cookieValue(context)).includes('"analytics":true'), "analytics-only choice was not saved");
      const consent = await cookieValue(context);
      assert(consent.marketing === false && consent.decided === true, "analytics-only marketing flag is wrong");
      assert(JSON.stringify(await trackingScripts(page)) === JSON.stringify({ clarity: 1, meta: 0 }), "analytics-only mounted the wrong trackers");
      await context.close();
    }

    // 7. Clearing the consent cookie restores the first-visit banner.
    {
      console.log("7. cleared cookie");
      const { context, page } = await openPage(browser, { analytics: true, marketing: true, decided: true, ts: Date.now() });
      await context.clearCookies({ name: "nx_consent" });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.locator('aside[aria-label="Cookie consent"]').waitFor({ state: "visible" });
      assert(await page.locator('aside[aria-label="Cookie consent"]').isVisible(), "banner did not return after clearing consent");
      await context.close();
    }

    console.log("Consent E2E passed: 7 scenarios (first visit, accept, reject, reload persistence, saved preferences, analytics-only, cleared cookie).");
  } finally {
    await browser.close();
    server?.kill();
    if (temporaryProject) {
      await rm(join(temporaryProject, "node_modules"), { force: true }).catch(() => {});
      await rm(temporaryProject, { recursive: true, force: true }).catch(() => {});
    }
  }
}

run().catch(async (error) => {
  console.error(error);
  server?.kill();
  if (temporaryProject) {
    await rm(join(temporaryProject, "node_modules"), { force: true }).catch(() => {});
    await rm(temporaryProject, { recursive: true, force: true }).catch(() => {});
  }
  process.exitCode = 1;
});
