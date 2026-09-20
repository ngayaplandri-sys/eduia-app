import "./_env";
import { chromium } from "playwright-core";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { db } from "../lib/db/client";
import * as schema from "../lib/db/schema";

const BASE = "http://localhost:3000";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PW = "Test1234!pw";

async function main() {
  // Compte valide pour tester le chemin succès
  const stamp = Date.now();
  const email = `login-ok-${stamp}@eduia.test`;
  const u = await auth.api.signUpEmail({ body: { email, password: PW, name: "Login OK" } });
  const uid = u.user.id;
  await db.update(schema.user).set({ emailVerified: true }).where(eq(schema.user.id, uid));
  await db.insert(schema.onboarding).values({
    userId: uid, firstName: "Login", schoolLevel: "Terminale", subjects: ["SVT"],
    goal: "reviser", improveSubjects: ["SVT"], learningStyle: "resume",
  });

  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));

  // ── 1. Mauvais identifiants ────────────────────────────────────────────
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#auth-email", "pas-un-compte@example.com");
  await page.fill("#auth-password", "mauvaispass123");
  await page.getByRole("button", { name: /^se connecter$/i }).click();
  await page.waitForTimeout(2500);

  const alert = page.locator("form [role='alert']");
  const alertVisible = await alert.isVisible().catch(() => false);
  const alertText = alertVisible ? (await alert.innerText()).trim() : "(absent)";
  const formStill = await page.locator("form").isVisible();
  const btnDisabled = await page.getByRole("button", { name: /^se connecter$/i }).isDisabled();
  const urlAfter = page.url();
  console.log("── 1. Mauvais identifiants");
  console.log("   alerte visible :", alertVisible);
  console.log("   texte          :", JSON.stringify(alertText));
  console.log("   form toujours là:", formStill);
  console.log("   bouton bloqué   :", btnDisabled);
  console.log("   url             :", urlAfter);
  await page.screenshot({ path: "scripts/_login-error.png" });

  // ── 2. Champ édité → l'utilisateur peut retenter ──────────────────────
  await page.fill("#auth-password", "autrepass456");
  await page.getByRole("button", { name: /^se connecter$/i }).click();
  await page.waitForTimeout(2000);
  console.log("\n── 2. Nouvel essai (toujours mauvais) : alerte encore visible :", await alert.isVisible());

  // ── 3. Bon identifiants → redirection ────────────────────────────────
  await page.fill("#auth-email", email);
  await page.fill("#auth-password", PW);
  await page.getByRole("button", { name: /^se connecter$/i }).click();
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);
  console.log("\n── 3. Bons identifiants");
  console.log("   url finale :", page.url());
  console.log("   succès     :", /\/(dashboard|onboarding)/.test(page.url()));

  console.log("\n=== pageerror ===");
  console.log(pageErrors.join("\n") || "(none)");

  await browser.close();

  await db.delete(schema.onboarding).where(eq(schema.onboarding.userId, uid));
  await db.delete(schema.session).where(eq(schema.session.userId, uid));
  await db.delete(schema.account).where(eq(schema.account.userId, uid));
  await db.delete(schema.user).where(eq(schema.user.id, uid));
}

main().catch((e) => { console.error("❌", e); process.exit(1); });
