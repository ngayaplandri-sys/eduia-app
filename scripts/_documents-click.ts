import "./_env";
import { chromium } from "playwright-core";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { db } from "../lib/db/client";
import * as schema from "../lib/db/schema";

const BASE = "http://localhost:3000";
const PW = "Test1234!pw";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function main() {
  const stamp = Date.now();
  const email = `docclick-${stamp}@eduia.test`;
  const u = await auth.api.signUpEmail({ body: { email, password: PW, name: "Doc Click" } });
  const uid = u.user.id;
  await db.update(schema.user).set({ plan: "premium", emailVerified: true }).where(eq(schema.user.id, uid));
  await db.insert(schema.onboarding).values({
    userId: uid, firstName: "Doc", schoolLevel: "Terminale", subjects: ["SVT"],
    goal: "reviser", improveSubjects: ["SVT"], learningStyle: "resume",
  });
  await db.insert(schema.documents).values([
    { userId: uid, name: "photo_cours.jpg", fileKind: "image", subject: "SVT", level: "Terminale", sizeLabel: "1,2 Mo", pageCount: 1, hasSummary: true },
    { userId: uid, name: "e-book.pdf", fileKind: "pdf", subject: "Histoire", level: "Terminale", sizeLabel: "4,3 Mo", pageCount: 9, hasSummary: true },
    { userId: uid, name: "notes.txt", fileKind: "txt", subject: "Maths", level: "Terminale", sizeLabel: "12 Ko", pageCount: 2, hasSummary: false },
  ]);

  const signRes = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE },
    body: JSON.stringify({ email, password: PW }),
  });
  const cookieStrings = signRes.headers.getSetCookie();
  const cookies = cookieStrings.map((c) => {
    const [pair] = c.split(";");
    const eq2 = pair.indexOf("=");
    return {
      name: pair.slice(0, eq2).trim(),
      value: pair.slice(eq2 + 1).trim(),
      domain: "localhost",
      path: "/",
    };
  });

  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies([
    ...cookies,
    { name: "eduia.theme", value: "dark", domain: "localhost", path: "/" },
  ]);
  const page = await ctx.newPage();

  const consoleMsgs: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (m) => consoleMsgs.push(`[${m.type()}] ${m.text()}`));
  page.on("pageerror", (e) => pageErrors.push(String(e)));

  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  console.log("start url:", page.url());

  const link = page.getByRole("link", { name: /^Documents$/ }).first();
  const count = await link.count();
  console.log("Documents link count:", count);
  if (count > 0) {
    console.log("href:", await link.getAttribute("href"));
    await link.click();
    await page.waitForTimeout(2500);
    console.log("after click url:", page.url());
    const bodyText = (await page.evaluate(`document.body.innerText`)) as string;
    console.log("---- visible text (first 600) ----");
    console.log(bodyText.slice(0, 600));
    console.log("----------------------------------");
    // detect error state
    const hasErr = bodyText.includes("Une erreur") || bodyText.includes("s'est produite") || bodyText.includes("réessay");
    console.log("shows error state:", hasErr);
  }

  console.log("\n=== pageerror ===");
  console.log(pageErrors.join("\n") || "(none)");
  console.log("\n=== console (errors/warnings) ===");
  console.log(consoleMsgs.filter((m) => m.startsWith("[error]") || m.startsWith("[warning]")).join("\n") || "(none)");

  const theme = await page.evaluate(`document.documentElement.dataset.theme`);
  console.log("html data-theme:", theme);
  await page.screenshot({ path: "scripts/_documents-dark.png", fullPage: true });

  // Mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  const scrollW = await page.evaluate(`document.documentElement.scrollWidth`);
  const clientW = await page.evaluate(`document.documentElement.clientWidth`);
  console.log(`mobile: scrollWidth=${scrollW} clientWidth=${clientW} overflow=${(scrollW as number) > (clientW as number)}`);
  await page.screenshot({ path: "scripts/_documents-mobile.png", fullPage: true });

  await browser.close();

  await db.delete(schema.documents).where(eq(schema.documents.userId, uid));
  await db.delete(schema.onboarding).where(eq(schema.onboarding.userId, uid));
  await db.delete(schema.session).where(eq(schema.session.userId, uid));
  await db.delete(schema.account).where(eq(schema.account.userId, uid));
  await db.delete(schema.user).where(eq(schema.user.id, uid));
}

main().catch((e) => { console.error("❌", e); process.exit(1); });
