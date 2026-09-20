import "./_env";
import { chromium } from "playwright-core";

const BASE = "http://localhost:3000";
const SYS_CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function main() {
  const browser = await chromium.launch({ executablePath: SYS_CHROME });
  const ctx = await browser.newContext({
    baseURL: BASE,
    colorScheme: "dark",
    viewport: { width: 1440, height: 900 },
  });
  await ctx.addCookies([{ name: "eduia.theme", value: "dark", url: BASE }]);
  const page = await ctx.newPage();
  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "scripts/_hero-dark.png", clip: { x: 0, y: 0, width: 1440, height: 760 } });
  console.log("scripts/_hero-dark.png");
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
