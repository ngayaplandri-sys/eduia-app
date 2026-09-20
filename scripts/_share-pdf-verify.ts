import "./_env";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { db } from "../lib/db/client";
import * as schema from "../lib/db/schema";
import { chromium } from "playwright-core";

/**
 * Vérifie que « Partager » sur un résumé / une épreuve partage bien un **fichier
 * PDF** (`navigator.share({ files: [File(application/pdf)] })`) et non un bloc de
 * texte.
 *
 *   npx tsx scripts/_share-pdf-verify.ts
 *
 * Nécessite : `npm run dev` + `OPENAI_API_KEY` + Chrome système.
 */

const BASE = "http://localhost:3000";
const SYS_CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const EMAIL = `pdftest-${Date.now()}@eduia.test`;
const PW = "Test1234!pw";
/** Nom sans « share »/« partager » : évite de matcher le bouton du menu profil. */
const NAME = "Pat Dubois";

let passed = 0;
let failed = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) passed++;
  else failed++;
  console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
}

interface ShareCall {
  hasFiles: boolean;
  name: string | null;
  type: string | null;
  size: number | null;
  title: string | null;
  hasText: boolean;
}

async function main() {
  const su = await auth.api.signUpEmail({
    body: { email: EMAIL, password: PW, name: NAME },
  });
  const uid = su.user.id;
  await db
    .update(schema.user)
    .set({ plan: "premium", emailVerified: true })
    .where(eq(schema.user.id, uid));
  await db.insert(schema.onboarding).values({
    userId: uid,
    firstName: "Share",
    schoolLevel: "Terminale",
    subjects: ["Histoire"],
    goal: "reviser",
    improveSubjects: ["Histoire"],
    learningStyle: "resume",
  });

  const signInRes = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE },
    body: JSON.stringify({ email: EMAIL, password: PW }),
  });
  const cookie = signInRes.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");

  const sumForm = new FormData();
  sumForm.set(
    "payload",
    JSON.stringify({
      fileName: null,
      sourceKind: null,
      sourceText:
        "La guerre froide (1947-1991) oppose le bloc de l'Ouest (États-Unis) au bloc " +
        "de l'Est (URSS) : doctrine Truman, plan Marshall, crise de Cuba (1962), chute du mur (1989).",
      subject: "Histoire",
      level: "Terminale",
      chapter: "La guerre froide",
      theme: "Les blocs Est / Ouest",
      style: "Résumé clair",
      pageCount: "1 page",
      detailLevel: "Essentiel",
      options: { pointsEssentiels: true },
    }),
  );
  check(
    "résumé généré",
    (await fetch(`${BASE}/api/ai/summarize`, { method: "POST", headers: { cookie, origin: BASE }, body: sumForm })).status === 200,
  );

  const examForm = new FormData();
  examForm.set(
    "payload",
    JSON.stringify({
      fileName: null,
      sourceKind: null,
      sourceText: null,
      subject: "Histoire",
      level: "Terminale",
      theme: "La guerre froide",
      examType: "Devoir surveillé",
      questionCount: 5,
      questionMix: "Mixte",
      durationLabel: "1h",
      pageCount: "2 pages",
      options: {},
    }),
  );
  check(
    "épreuve générée",
    (await fetch(`${BASE}/api/ai/generate-exam`, { method: "POST", headers: { cookie, origin: BASE }, body: examForm })).status === 200,
  );

  // ── Navigateur ──────────────────────────────────────────────────────────
  const browser = await chromium.launch({ executablePath: SYS_CHROME });
  const ctx = await browser.newContext({ baseURL: BASE });
  await ctx.addCookies(
    cookie.split("; ").map((pair) => {
      const i = pair.indexOf("=");
      return { name: pair.slice(0, i), value: pair.slice(i + 1), url: BASE };
    }),
  );

  // Mock passé en chaîne (tsx/esbuild injecterait sinon un helper `__name`).
  await ctx.addInitScript({
    content: `
      window.__shareCalls = [];
      var record = function (data) {
        var files = data.files;
        var f = files && files[0];
        window.__shareCalls.push({
          hasFiles: !!(files && files.length),
          name: f ? f.name : null,
          type: f ? f.type : null,
          size: f ? f.size : null,
          title: data && data.title ? data.title : null,
          hasText: !!(data && data.text),
        });
        return Promise.resolve();
      };
      Object.defineProperty(navigator, "share", { value: record, configurable: true });
      Object.defineProperty(navigator, "canShare", { value: function () { return true; }, configurable: true });
    `,
  });

  async function shareOn(route: string, label: string): Promise<ShareCall | null> {
    const page = await ctx.newPage();
    page.on("console", () => {});
    page.on("pageerror", (e) => console.log(`     [pageerror] ${e.message}`));
    await page.goto(route, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    // Le bouton d'actions du résultat : nom accessible exactement « Partager »
    // (`/partager|share/` matcherait aussi le menu profil selon le nom du compte).
    const btn = page
      .getByRole("button", { name: /^(partager|share)$/i })
      .first();
    const visible = await btn.isVisible().catch(() => false);
    check(`${label} : bouton « Partager » visible`, visible);
    if (!visible) {
      await page.close();
      return null;
    }
    await btn.click();
    await page.waitForTimeout(15000);

    const raw = await page.evaluate("JSON.stringify(window.__shareCalls || [])");
    const calls = JSON.parse(String(raw)) as ShareCall[];
    await page.close();

    if (calls.length === 0) {
      check(`${label} : navigator.share appelé`, false, "aucun appel en 15 s");
      return null;
    }
    return calls[0];
  }

  for (const [route, label] of [
    ["/resumer", "Résumé"],
    ["/generer", "Épreuve"],
  ] as const) {
    console.log(`\n── ${label} (${route}) ──\n`);
    const call = await shareOn(route, label);
    if (!call) continue;
    check(`${label} : partage d'un FICHIER (pas de texte brut)`, call.hasFiles && !call.hasText, JSON.stringify(call));
    check(`${label} : type application/pdf`, call.type === "application/pdf", call.type ?? "null");
    check(`${label} : nom de fichier .pdf`, (call.name ?? "").toLowerCase().endsWith(".pdf"), call.name ?? "null");
    check(`${label} : PDF non vide (> 3 Ko)`, (call.size ?? 0) > 3000, `${call.size} octets`);
    check(`${label} : titre de partage présent`, Boolean(call.title), call.title ?? "null");
  }

  await browser.close();

  // ── Nettoyage ───────────────────────────────────────────────────────────
  await db.delete(schema.activities).where(eq(schema.activities.userId, uid));
  await db.delete(schema.summaries).where(eq(schema.summaries.userId, uid));
  await db.delete(schema.documents).where(eq(schema.documents.userId, uid));
  await db.delete(schema.exams).where(eq(schema.exams.userId, uid));
  await db.delete(schema.aiUsage).where(eq(schema.aiUsage.userId, uid));
  await db.delete(schema.subscriptions).where(eq(schema.subscriptions.userId, uid));
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
