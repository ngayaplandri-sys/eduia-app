import "./_env";
import { chromium } from "playwright-core";

const BASE = "http://localhost:3000";
const SYS_CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const WIDTHS = [320, 360, 375, 390, 414, 480, 640, 768, 834, 1024, 1180, 1280, 1440, 1920];

async function main() {
  const browser = await chromium.launch({ executablePath: SYS_CHROME });
  let bad = false;

  for (const theme of ["light", "dark"] as const) {
    const ctx = await browser.newContext({ baseURL: BASE });
    await ctx.addCookies([{ name: "eduia.theme", value: theme, url: BASE }]);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => console.log(`  [pageerror] ${e.message}`));
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    console.log(`\n── Débordement horizontal — landing (${theme}) ──\n`);
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.waitForTimeout(200);
      const sw = Number(await page.evaluate("document.documentElement.scrollWidth"));
      const cw = Number(await page.evaluate("document.documentElement.clientWidth"));
      const over = sw > cw + 1;
      bad = bad || over;
      console.log(`  ${over ? "❌" : "✅"} ${String(w).padStart(4)}px  scrollW=${sw} clientW=${cw}`);
    }
    await ctx.close();
  }

  const ctx = await browser.newContext({ baseURL: BASE });
  const page = await ctx.newPage();

  // Rendu hero + raccord vers la section suivante
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: "scripts/_hero-after-transition.png", clip: { x: 0, y: 0, width: 1440, height: 1100 } });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: "scripts/_hero-after-mobile-full.png", fullPage: false });

  await browser.close();
  console.log(`\n${bad ? "❌ débordement" : "✅ aucun débordement (320→1920)"}`);
  process.exit(bad ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
