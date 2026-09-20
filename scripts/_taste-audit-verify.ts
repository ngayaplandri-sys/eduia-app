import "./_env";
import { chromium } from "playwright-core";

const BASE = "http://localhost:3000";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  // ---- Desktop, clair ----
  const ctxLight = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const pageLight = await ctxLight.newPage();
  const errors: string[] = [];
  pageLight.on("pageerror", (e) => errors.push(String(e)));
  await pageLight.goto(`${BASE}/`, { waitUntil: "networkidle" });

  const title = await pageLight.title();
  console.log("title:", title);

  const bodyText = (await pageLight.evaluate(`document.body.innerText`)) as string;
  const hasEmDash = /[\u2014\u2013]/.test(bodyText);
  console.log("em-dash / en-dash still visible in body text:", hasEmDash);

  const signupLabels = await pageLight.evaluate(
    `Array.from(document.querySelectorAll('a[href="/signup"]')).map(a => a.textContent.trim().replace(/\\s+/g,' '))`,
  );
  console.log("labels of every /signup link:", signupLabels);

  await pageLight.screenshot({ path: "scripts/_taste-hero-top.png" });
  await pageLight.screenshot({ path: "scripts/_taste-full-light.png", fullPage: true });

  // ---- Mobile ----
  await pageLight.setViewportSize({ width: 390, height: 844 });
  await pageLight.waitForTimeout(300);
  const scrollW = await pageLight.evaluate(`document.documentElement.scrollWidth`);
  const clientW = await pageLight.evaluate(`document.documentElement.clientWidth`);
  console.log(`mobile overflow: scrollWidth=${scrollW} clientWidth=${clientW} overflow=${(scrollW as number) > (clientW as number)}`);
  await pageLight.screenshot({ path: "scripts/_taste-mobile.png", fullPage: true });

  console.log("pageerror:", errors.join("\n") || "(none)");
  await ctxLight.close();

  // ---- Desktop, sombre ----
  const ctxDark = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await ctxDark.addCookies([{ name: "eduia.theme", value: "dark", domain: "localhost", path: "/" }]);
  const pageDark = await ctxDark.newPage();
  await pageDark.goto(`${BASE}/`, { waitUntil: "networkidle" });
  console.log("dark theme:", await pageDark.evaluate(`document.documentElement.dataset.theme`));
  await pageDark.screenshot({ path: "scripts/_taste-hero-top-dark.png" });
  await ctxDark.close();

  await browser.close();
}

main().catch((e) => { console.error("❌", e); process.exit(1); });
