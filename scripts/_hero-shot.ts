import "./_env";
import { chromium } from "playwright-core";

const BASE = "http://localhost:3000";
const SYS_CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const tag = process.argv[2] ?? "cur";

async function main() {
  const browser = await chromium.launch({ executablePath: SYS_CHROME });
  const ctx = await browser.newContext({ baseURL: BASE });
  const page = await ctx.newPage();

  for (const [w, h, name] of [
    [1440, 900, "desktop"],
    [1024, 800, "lg"],
    [390, 844, "mobile"],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    // Hero seul (crop haut de page)
    await page.screenshot({ path: `scripts/_hero-${tag}-${name}.png` });
    console.log(`scripts/_hero-${tag}-${name}.png`);
  }
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
