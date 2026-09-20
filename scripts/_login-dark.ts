import "./_env";
import { chromium } from "playwright-core";

const BASE = "http://localhost:3000";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 420, height: 760 } });
  await ctx.addCookies([{ name: "eduia.theme", value: "dark", domain: "localhost", path: "/" }]);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#auth-email", "x@example.com");
  await page.fill("#auth-password", "wrongwrong1");
  await page.getByRole("button", { name: /^se connecter$/i }).click();
  await page.waitForTimeout(2500);
  console.log("theme:", await page.evaluate(`document.documentElement.dataset.theme`));
  console.log("alert:", (await page.locator("form [role='alert']").innerText()).trim());
  await page.screenshot({ path: "scripts/_login-dark.png" });
  await browser.close();
}
main().catch((e) => { console.error("❌", e); process.exit(1); });
