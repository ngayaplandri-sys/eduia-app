import "./_env";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { db } from "../lib/db/client";
import * as schema from "../lib/db/schema";
import { chromium } from "playwright-core";

/**
 * Vérifie que « Télécharger » sur une épreuve générée produit un **vrai PDF**
 * (et non un bloc de texte `.txt`), exactement comme « Résumer mes cours ».
 *
 *   npx tsx scripts/_exam-pdf-verify.ts
 *
 * Nécessite : `npm run dev` + `OPENAI_API_KEY` + Chrome système.
 */

const BASE = "http://localhost:3000";
const SYS_CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const EMAIL = `exam-pdf-${Date.now()}@eduia.test`;
const PW = "Test1234!pw";

let passed = 0;
let failed = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) passed++;
  else failed++;
  console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const su = await auth.api.signUpEmail({
    body: { email: EMAIL, password: PW, name: "Exam PDF" },
  });
  const uid = su.user.id;
  await db
    .update(schema.user)
    .set({ plan: "premium", emailVerified: true })
    .where(eq(schema.user.id, uid));
  await db.insert(schema.onboarding).values({
    userId: uid,
    firstName: "Exam",
    schoolLevel: "Terminale",
    subjects: ["Histoire"],
    goal: "reviser",
    improveSubjects: ["Histoire"],
    learningStyle: "resume",
  });

  // Connexion + cookie de session.
  const signInRes = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE },
    body: JSON.stringify({ email: EMAIL, password: PW }),
  });
  const cookie = signInRes.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");

  // Génère une épreuve (persistée → visible sur /generer au chargement).
  const form = new FormData();
  form.set(
    "payload",
    JSON.stringify({
      fileName: null,
      sourceKind: null,
      sourceText: null,
      subject: "Histoire",
      level: "Terminale",
      theme: "La Guerre froide",
      examType: "Devoir surveillé",
      questionCount: 6,
      questionMix: "Mixte",
      durationLabel: "2h",
      pageCount: "3 pages",
      options: { bareme: true, explications: true },
    }),
  );
  const genRes = await fetch(`${BASE}/api/ai/generate-exam`, {
    method: "POST",
    headers: { cookie, origin: BASE },
    body: form,
  });
  check("épreuve générée (HTTP 200)", genRes.status === 200, `HTTP ${genRes.status}`);

  // ── Navigateur : /generer → clic « Télécharger » → PDF ───────────────────
  const fs = await import("node:fs");
  const browser = await chromium.launch({ executablePath: SYS_CHROME });
  const ctx = await browser.newContext({ baseURL: BASE, acceptDownloads: true });
  await ctx.addCookies([
    ...cookie.split("; ").map((pair) => {
      const eq = pair.indexOf("=");
      return {
        name: pair.slice(0, eq),
        value: pair.slice(eq + 1),
        url: BASE,
      };
    }),
  ]);

  const page = await ctx.newPage();
  await page.goto("/generer", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // L'épreuve persistée doit être rendue (pas l'état vide).
  const hasExam = await page
    .getByRole("button", { name: /télécharger|download/i })
    .first()
    .isVisible()
    .catch(() => false);
  check("panneau résultat affiché avec la barre d'actions", hasExam);

  const downloadPromise = page.waitForEvent("download", { timeout: 40000 });
  await page
    .getByRole("button", { name: /télécharger|download/i })
    .first()
    .click();

  let pdfPath = "";
  let downloadName = "";
  try {
    const dl = await downloadPromise;
    downloadName = dl.suggestedFilename();
    pdfPath = "scripts/_exam-download.pdf";
    await dl.saveAs(pdfPath);
  } catch (e) {
    check("téléchargement déclenché", false, String(e).slice(0, 120));
  }

  if (pdfPath) {
    check(
      "nom de fichier en .pdf (pas .txt)",
      downloadName.toLowerCase().endsWith(".pdf"),
      downloadName,
    );
    const buf = fs.readFileSync(pdfPath);
    const head = buf.subarray(0, 5).toString("latin1");
    const tail = buf.subarray(-1024).toString("latin1");
    check("entête %PDF valide", head === "%PDF-", `« ${head} »`);
    check("marqueur %%EOF présent", tail.includes("%%EOF"));
    check("taille plausible (> 3 Ko)", buf.length > 3000, `${buf.length} octets`);

    // Rendu visuel : Chrome affiche le PDF.
    const viewer = await ctx.newPage();
    await viewer.goto(
      `file:///${process.cwd().replace(/\\/g, "/")}/${pdfPath}`,
      { waitUntil: "load" },
    );
    await viewer.waitForTimeout(2500);
    await viewer.screenshot({ path: "scripts/_exam-download-page1.png" });
    console.log("     capture : scripts/_exam-download-page1.png");
  }

  await browser.close();

  // ── Nettoyage BDD ───────────────────────────────────────────────────────
  await db.delete(schema.activities).where(eq(schema.activities.userId, uid));
  await db.delete(schema.exams).where(eq(schema.exams.userId, uid));
  await db.delete(schema.aiUsage).where(eq(schema.aiUsage.userId, uid));
  await db.delete(schema.onboarding).where(eq(schema.onboarding.userId, uid));
  await db.delete(schema.session).where(eq(schema.session.userId, uid));
  await db.delete(schema.account).where(eq(schema.account.userId, uid));
  await db.delete(schema.user).where(eq(schema.user.id, uid));

  console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} réussis · ${failed} échoués`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("\n❌ Échec du script :", error);
  process.exit(1);
});
