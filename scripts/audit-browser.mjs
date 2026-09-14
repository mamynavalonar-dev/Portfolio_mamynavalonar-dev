import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const playwright = process.env.AUDIT_PLAYWRIGHT_PATH
  ? require(process.env.AUDIT_PLAYWRIGHT_PATH)
  : require("playwright");
const baseURL = process.env.AUDIT_BASE_URL ?? "https://portfolio-mamynavalonar-dev.vercel.app/";
const output = process.env.AUDIT_OUTPUT ?? "artifacts/audit";
await mkdir(output, { recursive: true });
const browser = await playwright.chromium.launch({ channel: "msedge", headless: true });
const results = [];
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 720 }]) {
    const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      const response = await page.goto(baseURL, { waitUntil: "networkidle", timeout: 45000 });
      await page.screenshot({ path: `${output}/portfolio-${viewport.width}.png` });
      for (const section of ["about", "portfolio", "contact"]) {
        const target = page.locator(`#${section}`);
        if (await target.count()) {
          await target.scrollIntoViewIfNeeded();
          await page.waitForTimeout(600);
          await page.screenshot({ path: `${output}/${section}-${viewport.width}.png` });
        }
      }
      results.push({ width: viewport.width, status: response?.status(), title: await page.title(), errors, dom: await page.evaluate(() => ({
        headings: [...document.querySelectorAll("h1,h2")].map((el) => ({ tag: el.tagName, text: el.textContent })),
        overflow: document.documentElement.scrollWidth > innerWidth,
        projectCards: document.querySelectorAll('#portfolio article').length,
      })) });
    } catch (error) { results.push({ width: viewport.width, error: error.message, errors }); }
    await writeFile(`${output}/browser-results.json`, JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results[results.length - 1]));
    await page.close();
  }
  if (new URL(baseURL).hostname === "localhost") {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    const runtimeErrors = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    await page.goto(baseURL, { waitUntil: "networkidle" });
    const headingCount = await page.locator("h1").count();
    if (headingCount !== 1) throw new Error(`Expected one h1, found ${headingCount}`);
    const details = page.getByRole("button", { name: "Détails", exact: true }).first();
    if (await details.count()) {
      await details.click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor({ state: "visible" });
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press("Tab");
        if (!await dialog.evaluate((element) => element.contains(document.activeElement))) throw new Error("Focus escaped project dialog");
      }
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
    }
    const invalidContact = await page.request.post(new URL("/api/contact", baseURL).href, { data: {} });
    if (invalidContact.status() !== 400) throw new Error("Invalid contact payload was not rejected");
    await page.goto(new URL("/admin/dashboard", baseURL).href);
    if (!page.url().includes("/admin/login")) throw new Error("Anonymous admin navigation was not redirected");
    if (runtimeErrors.length) throw new Error(runtimeErrors.join("\n"));
    console.log("Smoke checks passed: headings, project dialog keyboard, contact validation, admin redirect.");
    await page.close();
  }
} finally { await browser.close(); }
await writeFile(`${output}/browser-results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
