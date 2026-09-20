import "./_env";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { db } from "../lib/db/client";
import * as schema from "../lib/db/schema";
import type { ExamCorrection } from "../types";
import { chromium, type Page } from "playwright-core";

/**
 * Vérifie les corrections 2 et 3 de « Corriger une épreuve » :
 *  2. le bouton « Télécharger » produit un vrai PDF (pas un bloc de texte) et
 *     « Partager » partage ce PDF ;
 *  3. aucun débordement horizontal, même avec du texte très long / non sécable,
 *     sur mobile (375 px) comme sur ordinateur (1280 px).
 *
 *   npx tsx scripts/_corriger-ui-verify.ts
 *
 * Nécessite : `npm run dev` + Chrome système.
 */

const BASE = "http://localhost:3000";
const SYS_CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PW = "Test1234!pw";
const NAME = "Pat Dubois";

let passed = 0;
let failed = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) passed++;
  else failed++;
  console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
}

// Texte piège : mot de 92 caractères sans espace + URL longue + formule.
const LONG_TOKEN = "Laaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaz";
const LONG_URL =
  "https://example.com/tres/longue/adresse/vers/une/ressource/pedagogique/pour-tester-le-debordement?section=1&sous-section=42&ancre=conclusion";
const FORMULA = "f(x)=a*x^2+b*x+c=(x-x1)(x-x2)avec_discriminant=b^2-4*a*c>0donc_deux_racines_distinctes";

function question(prompt: string) {
  return {
    prompt,
    studentAnswer: `Réponse de l'élève : ${LONG_TOKEN} — voir ${LONG_URL}`,
    expectedAnswer: `Réponse attendue : ${FORMULA}. Détail complet ici ${LONG_URL}`,
    pointsEarned: 1,
    pointsMax: 2,
    verdict: "partial" as const,
    feedback: `Bonne intuition mais ${LONG_TOKEN}. Revois la méthode : ${LONG_URL}`,
  };
}

function gradedPayload(): ExamCorrection {
  return {
    examTitle: `Devoir surveillé ${LONG_TOKEN}`,
    subject: "Histoire",
    level: "Terminale",
    theme: `La Guerre froide ${LONG_TOKEN}`,
    dateLabel: "8 septembre 2026",
    mode: "graded",
    pageCountLabel: "4 pages",
    score: 8,
    maxScore: 20,
    appreciation: "Assez bien",
    summary: `Copie honnête. ${LONG_TOKEN}. Références : ${LONG_URL}`,
    status: "Corrigée",
    questions: [
      question(`1. Expliquez ${LONG_TOKEN} dans le contexte de la Guerre froide.`),
      question("2. Quelles sont les causes de la crise de Cuba (1962) ?"),
      question(`3. ${FORMULA} — commentez cette relation.`),
    ],
    strengths: [`Chronologie maîtrisée ${LONG_TOKEN}`, "Vocabulaire précis"],
    improvements: [`Développer davantage ${LONG_URL}`, "Conclure chaque réponse"],
    advice: [`Réviser avec une frise ${LONG_TOKEN}`, `Fiche méthode : ${LONG_URL}`],
    correctedBy: "EduIA",
    correctedAt: "2026-09-08T09:15:00.000Z",
  };
}

function answerKeyPayload(): ExamCorrection {
  const p = gradedPayload();
  return {
    ...p,
    mode: "answer-key",
    score: 0,
    appreciation: "Corrigé type",
    questions: p.questions.map((q) => ({
      ...q,
      studentAnswer: "",
      pointsEarned: 0,
      verdict: "correct" as const,
    })),
    strengths: [],
    improvements: [],
  };
}

async function insertCorrection(userId: string, payload: ExamCorrection) {
  await db.delete(schema.corrections).where(eq(schema.corrections.userId, userId));
  await db.insert(schema.corrections).values({
    userId,
    examId: null,
    examTitle: payload.examTitle,
    subject: payload.subject,
    level: payload.level,
    status: payload.status,
    score: Math.round(payload.score),
    maxScore: Math.round(payload.maxScore),
    payload,
  });
}

async function noHorizontalOverflow(page: Page, width: number): Promise<string> {
  await page.setViewportSize({ width, height: 900 });
  await page.waitForTimeout(400);
  return page.evaluate(() => {
    const de = document.documentElement;
    const vw = de.clientWidth;
    const problems: string[] = [];
    if (de.scrollWidth > vw + 1) {
      problems.push(`page ${de.scrollWidth}>${vw}`);
    }
    // Tous les éléments dont le bord droit dépasse le viewport.
    const offenders: { s: string; right: number }[] = [];
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1) {
        offenders.push({
          right: r.right,
          s: `<${el.tagName.toLowerCase()} class="${(el.getAttribute("class") || "").slice(0, 70)}"> right=${Math.round(r.right)} w=${Math.round(r.width)}`,
        });
      }
    }
    offenders.sort((a, b) => b.right - a.right);
    if (offenders.length) problems.push(...offenders.slice(0, 5).map((o) => o.s));
    return problems.join("  ||  ");
  });
}

async function main() {
  const email = `cui-${Date.now()}@eduia.test`;
  const su = await auth.api.signUpEmail({
    body: { email, password: PW, name: NAME },
  });
  const uid = su.user.id;
  await db
    .update(schema.user)
    .set({ plan: "premium", emailVerified: true })
    .where(eq(schema.user.id, uid));
  await db.insert(schema.onboarding).values({
    userId: uid,
    firstName: "Pat",
    schoolLevel: "Terminale",
    subjects: ["Histoire"],
    goal: "reviser",
    improveSubjects: ["Histoire"],
    learningStyle: "resume",
  });

  const si = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE },
    body: JSON.stringify({ email, password: PW }),
  });
  const cookie = si.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");

  const browser = await chromium.launch({ executablePath: SYS_CHROME });
  const ctx = await browser.newContext({ baseURL: BASE, acceptDownloads: true });
  await ctx.addCookies(
    cookie.split("; ").map((pair) => {
      const i = pair.indexOf("=");
      return { name: pair.slice(0, i), value: pair.slice(i + 1), url: BASE };
    }),
  );
  await ctx.addInitScript({
    content: `
      window.__shareCalls = [];
      Object.defineProperty(navigator, "share", {
        value: function (data) {
          var f = data && data.files && data.files[0];
          window.__shareCalls.push({
            hasFiles: !!(data && data.files && data.files.length),
            name: f ? f.name : null, type: f ? f.type : null, size: f ? f.size : null,
            title: data && data.title ? data.title : null,
            hasText: !!(data && data.text),
          });
          return Promise.resolve();
        },
        configurable: true,
      });
      Object.defineProperty(navigator, "canShare", {
        value: function () { return true; }, configurable: true,
      });
    `,
  });

  async function run(label: string, payload: ExamCorrection, isAnswerKey: boolean) {
    console.log(`\n── ${label} ──\n`);
    await insertCorrection(uid, payload);

    const page = await ctx.newPage();
    page.on("pageerror", (e) => console.log(`     [pageerror] ${e.message}`));
    await page.goto("/corriger", { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);

    // Le bon panneau s'affiche ?
    const headingRe = isAnswerKey
      ? /corrig(é|e) par question|answer key/i
      : /d(é|e)tail par question|per-question/i;
    check(
      `${label} : panneau de résultat rendu`,
      await page.getByText(headingRe).first().isVisible().catch(() => false),
    );
    if (isAnswerKey) {
      const scoreBar = await page
        .getByRole("progressbar")
        .count()
        .catch(() => 0);
      check(`${label} : pas de barre de note (corrigé type)`, scoreBar === 0);
    }

    // 3. Débordement horizontal
    for (const w of [375, 1280]) {
      const problem = await noHorizontalOverflow(page, w);
      check(`${label} : aucun débordement à ${w}px`, problem === "", problem);
    }
    await page.setViewportSize({ width: 1280, height: 900 });

    // 2a. Partager → PDF
    await page.evaluate("window.__shareCalls = []");
    await page
      .getByRole("button", { name: /^(partager|share)$/i })
      .first()
      .click();
    await page.waitForTimeout(6000);
    const calls = JSON.parse(
      String(await page.evaluate("JSON.stringify(window.__shareCalls || [])")),
    ) as Array<{ type: string | null; name: string | null; size: number | null; hasText: boolean; hasFiles: boolean }>;
    const shared = calls[0];
    check(
      `${label} : « Partager » partage un fichier PDF (pas de texte)`,
      Boolean(shared && shared.hasFiles && !shared.hasText && shared.type === "application/pdf"),
      shared ? JSON.stringify(shared) : "aucun appel",
    );
    check(
      `${label} : PDF partagé non vide (> 3 Ko) et .pdf`,
      Boolean(shared && (shared.size ?? 0) > 3000 && (shared.name ?? "").endsWith(".pdf")),
      shared ? `${shared.name} ${shared.size}o` : "",
    );

    // 2b. Télécharger → vrai PDF
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 20000 }),
      page.getByRole("button", { name: /^(t(é|e)l(é|e)charger|download)$/i }).first().click(),
    ]).catch(() => [null] as const);
    if (!download) {
      check(`${label} : « Télécharger » déclenche un téléchargement`, false, "timeout");
    } else {
      const fname = download.suggestedFilename();
      const path = `scripts/_corriger-dl-${isAnswerKey ? "ak" : "graded"}.pdf`;
      await download.saveAs(path);
      const { readFileSync } = await import("node:fs");
      const buf = readFileSync(path);
      check(
        `${label} : fichier téléchargé = PDF (${fname})`,
        fname.endsWith(".pdf") && buf.subarray(0, 5).toString("latin1") === "%PDF-",
        `${buf.length} o, entête « ${buf.subarray(0, 5).toString("latin1")} »`,
      );
      check(
        `${label} : PDF téléchargé structuré (> 3 Ko)`,
        buf.length > 3000,
        `${buf.length} o`,
      );
    }

    await page.close();
  }

  await run("Copie notée", gradedPayload(), false);
  await run("Corrigé type", answerKeyPayload(), true);

  // ── Panneau de config : épreuve générée réutilisable sans copie ─────────
  console.log("\n── Formulaire : épreuve sélectionnable, corrigé sans copie ──\n");
  await db.delete(schema.corrections).where(eq(schema.corrections.userId, uid));
  await db.insert(schema.exams).values({
    userId: uid,
    title: "Devoir surveillé d'Histoire",
    subject: "Histoire",
    level: "Terminale",
    theme: "La Guerre froide",
    examType: "Devoir surveillé",
    status: "Prête",
    questionCount: 5,
    totalPoints: 20,
    payload: {
      title: "Devoir surveillé d'Histoire",
      subject: "Histoire",
      level: "Terminale",
      theme: "La Guerre froide",
      examType: "Devoir surveillé",
      durationLabel: "2h",
      pageCountLabel: "2 pages",
      questionCount: 5,
      dateLabel: "8 septembre 2026",
      parts: [
        {
          title: "Partie 1",
          points: 20,
          questions: [
            {
              kind: "open",
              prompt: "Expliquez les origines de la Guerre froide.",
              points: 20,
              expectedAnswer: "Rivalité USA/URSS, doctrine Truman, rideau de fer.",
            },
          ],
        },
      ],
      totalPoints: 20,
      status: "Prête",
      generatedBy: "EduIA",
      generatedAt: "2026-09-08T09:00:00.000Z",
    },
  });

  const fp = await ctx.newPage();
  await fp.goto("/corriger", { waitUntil: "networkidle" });
  await fp.waitForTimeout(1200);
  const optionCount = await fp.locator("#ref-exam option").count();
  check("formulaire : déroulant « Épreuve concernée » peuplé", optionCount >= 1, `${optionCount} option(s)`);
  check(
    "formulaire : indice « sans copie → corrigé type » visible",
    await fp.getByText(/sans copie|no paper submitted/i).first().isVisible().catch(() => false),
  );
  const btnText = ((await fp.getByRole("button", { name: /corrig|g(é|e)n(é|e)rer le corrig|grade|generate the answer key/i }).first().textContent().catch(() => "")) || "").trim();
  check(
    "formulaire : bouton = « Générer le corrigé » (aucune copie)",
    /g(é|e)n(é|e)rer le corrig|generate the answer key/i.test(btnText),
    btnText,
  );
  for (const w of [375, 1280]) {
    const problem = await noHorizontalOverflow(fp, w);
    check(`formulaire : aucun débordement à ${w}px`, problem === "", problem);
  }
  await fp.close();

  await browser.close();

  await db.delete(schema.activities).where(eq(schema.activities.userId, uid));
  await db.delete(schema.corrections).where(eq(schema.corrections.userId, uid));
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
