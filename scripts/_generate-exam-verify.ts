import "./_env";
import { desc, eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { db } from "../lib/db/client";
import * as schema from "../lib/db/schema";
import type { GeneratedExam } from "../types";

/**
 * Vérifie « Générer une épreuve » branché sur OpenAI de bout en bout
 * (même intégration que « Résumer mes cours »).
 *
 *   npx tsx scripts/_generate-exam-verify.ts
 *
 * Nécessite : `npm run dev` sur http://localhost:3000 + `OPENAI_API_KEY` valide.
 */

const BASE = "http://localhost:3000";
const PW = "Test1234!pw";

let passed = 0;
let failed = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function signIn(email: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE },
    body: JSON.stringify({ email, password: PW }),
  });
  if (!res.ok) throw new Error(`sign-in ${email} → HTTP ${res.status}`);
  const jar = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  if (!jar) throw new Error(`sign-in ${email} : aucun cookie`);
  return jar;
}

function basePayload(overrides: Record<string, unknown> = {}) {
  return {
    fileName: null,
    sourceKind: null,
    sourceText: null,
    subject: "Histoire",
    level: "Terminale",
    theme: "La Première Guerre mondiale",
    examType: "Devoir surveillé",
    questionCount: 5,
    questionMix: "Mixte",
    durationLabel: "1h",
    pageCount: "2 pages",
    options: { bareme: true, explications: true },
    ...overrides,
  };
}

async function generateExam(
  cookie: string,
  payload: Record<string, unknown>,
): Promise<{ status: number; json: { exam?: GeneratedExam; error?: string; code?: string } }> {
  const form = new FormData();
  form.set("payload", JSON.stringify(payload));
  const res = await fetch(`${BASE}/api/ai/generate-exam`, {
    method: "POST",
    headers: { cookie, origin: BASE },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function looksLikeExam(exam: GeneratedExam | undefined): string {
  if (!exam) return "pas d'objet exam";
  const problems: string[] = [];
  if (!exam.title) problems.push("title vide");
  if (!Array.isArray(exam.parts) || exam.parts.length === 0)
    problems.push("aucune partie");
  const qCount = (exam.parts ?? []).reduce(
    (n, p) => n + (p.questions?.length ?? 0),
    0,
  );
  if (qCount === 0) problems.push("aucune question");
  if (exam.questionCount !== qCount)
    problems.push(`questionCount ${exam.questionCount} ≠ ${qCount}`);
  if (!(exam.totalPoints > 0)) problems.push("totalPoints ≤ 0");
  if (!exam.dateLabel) problems.push("dateLabel vide");
  if (exam.status !== "Prête") problems.push(`status "${exam.status}"`);
  return problems.join(", ");
}

const FRENCH_WORDS =
  /\b(?:quelle?s?|pourquoi|expliquez|citez|donnez|justifiez|présentez|rédigez|réponse|questions?|suivantes?|parmi|lesquelles|affirmations?)\b/i;

async function main() {
  const stamp = Date.now();
  const premiumEmail = `exam-premium-${stamp}@eduia.test`;
  const freeEmail = `exam-free-${stamp}@eduia.test`;

  const premiumSignUp = await auth.api.signUpEmail({
    body: { email: premiumEmail, password: PW, name: "Exam Premium" },
  });
  const freeSignUp = await auth.api.signUpEmail({
    body: { email: freeEmail, password: PW, name: "Exam Free" },
  });
  const premiumId = premiumSignUp.user.id;
  const freeId = freeSignUp.user.id;

  await db
    .update(schema.user)
    .set({ plan: "premium", emailVerified: true })
    .where(eq(schema.user.id, premiumId));
  await db
    .update(schema.user)
    .set({ plan: "free", role: "student", emailVerified: true })
    .where(eq(schema.user.id, freeId));

  const premiumCookie = await signIn(premiumEmail);
  const freeCookie = await signIn(freeEmail);

  // ── 1. Génération à partir des seuls paramètres (FR) ─────────────────────
  console.log("\n── Épreuve à partir des paramètres saisis (premium, FR) ──\n");
  const g1 = await generateExam(premiumCookie, basePayload());
  check("HTTP 200", g1.status === 200, `HTTP ${g1.status} ${g1.json.error ?? ""}`);
  check(
    "épreuve structurée renvoyée",
    g1.status === 200 && looksLikeExam(g1.json.exam) === "",
    looksLikeExam(g1.json.exam),
  );
  if (g1.json.exam) {
    const e = g1.json.exam;
    check(
      "paramètres repris (matière / niveau / thème / type / durée)",
      e.subject === "Histoire" &&
        e.level === "Terminale" &&
        e.theme === "La Première Guerre mondiale" &&
        e.examType === "Devoir surveillé" &&
        e.durationLabel === "1h" &&
        e.pageCountLabel === "2 pages",
      `${e.subject} / ${e.level} / ${e.theme} / ${e.examType}`,
    );
    console.log(
      `     → « ${e.title} » · ${e.parts.length} partie(s) · ${e.questionCount} questions · ${e.totalPoints} pts`,
    );
  }

  // Persistance
  const [examRow] = await db
    .select()
    .from(schema.exams)
    .where(eq(schema.exams.userId, premiumId))
    .orderBy(desc(schema.exams.createdAt))
    .limit(1);
  check(
    "ligne `exams` persistée (payload + colonnes plates)",
    Boolean(
      examRow &&
        examRow.subject === "Histoire" &&
        examRow.level === "Terminale" &&
        examRow.theme === "La Première Guerre mondiale" &&
        examRow.questionCount > 0 &&
        examRow.totalPoints > 0 &&
        examRow.payload,
    ),
    examRow ? `#${examRow.id.slice(0, 8)} "${examRow.title}"` : "absente",
  );

  const [activityRow] = await db
    .select()
    .from(schema.activities)
    .where(eq(schema.activities.userId, premiumId))
    .orderBy(desc(schema.activities.createdAt))
    .limit(1);
  check(
    "ligne `activities` créée (« Épreuve » / « Prête » / /generer)",
    Boolean(
      activityRow &&
        activityRow.type === "Épreuve" &&
        activityRow.statusLabel === "Prête" &&
        activityRow.fileKind === "exam" &&
        activityRow.actionHref === "/generer",
    ),
    activityRow ? `${activityRow.statusLabel} · ${activityRow.meta}` : "absente",
  );

  const [usageRow] = await db
    .select()
    .from(schema.aiUsage)
    .where(eq(schema.aiUsage.userId, premiumId))
    .orderBy(desc(schema.aiUsage.createdAt))
    .limit(1);
  check(
    "ligne `ai_usage` (kind=exam, success, tokens)",
    Boolean(
      usageRow &&
        usageRow.kind === "exam" &&
        usageRow.status === "success" &&
        (usageRow.outputTokens ?? 0) > 0,
    ),
    usageRow
      ? `${usageRow.model} · in ${usageRow.inputTokens} / out ${usageRow.outputTokens}`
      : "absente",
  );

  // ── 2. Génération à partir d'un contenu de cours fourni ──────────────────
  console.log("\n── Épreuve à partir d'un contenu de cours (premium) ──\n");
  const g2 = await generateExam(
    premiumCookie,
    basePayload({
      subject: "SVT",
      theme: "La photosynthèse",
      sourceText:
        "La photosynthèse se déroule dans les chloroplastes. Elle utilise l'énergie " +
        "lumineuse pour convertir le CO2 et l'eau en glucose et en dioxygène. La phase " +
        "photochimique (thylakoïdes) produit ATP et NADPH ; le cycle de Calvin (stroma) " +
        "fixe le carbone. Les facteurs limitants sont la lumière, le CO2 et la température.",
      questionCount: 4,
    }),
  );
  check("HTTP 200", g2.status === 200, `HTTP ${g2.status} ${g2.json.error ?? ""}`);
  check(
    "épreuve structurée renvoyée",
    g2.status === 200 && looksLikeExam(g2.json.exam) === "",
    looksLikeExam(g2.json.exam),
  );
  if (g2.json.exam) {
    const blob = JSON.stringify(g2.json.exam).toLowerCase();
    check(
      "contenu ancré sur le cours fourni (photosynthèse / chloroplaste / Calvin…)",
      /photosynth|chloroplaste|calvin|thylako|glucose|nadph|co2|dioxyg/.test(blob),
      "",
    );
  }
  const examCount = await db
    .select({ id: schema.exams.id })
    .from(schema.exams)
    .where(eq(schema.exams.userId, premiumId));
  check("2 épreuves persistées pour ce compte", examCount.length === 2, `${examCount.length}`);

  // ── 3. Sortie en anglais quand l'app est en anglais ─────────────────────
  console.log("\n── Épreuve générée en anglais (cookie eduia.locale=en) ──\n");
  const g3 = await generateExam(
    `${premiumCookie}; eduia.locale=en`,
    basePayload({ subject: "History", theme: "World War I", questionCount: 4 }),
  );
  check("HTTP 200", g3.status === 200, `HTTP ${g3.status} ${g3.json.error ?? ""}`);
  if (g3.json.exam) {
    const prompts = g3.json.exam.parts
      .flatMap((p) => p.questions.map((q) => q.prompt))
      .join(" ");
    check(
      "intitulés de questions en anglais (pas de français résiduel)",
      prompts.length > 0 && !FRENCH_WORDS.test(prompts),
      prompts.slice(0, 90),
    );
  }

  // ── 4. L'utilisateur gratuit reste bloqué (quota inchangé) ──────────────
  console.log("\n── Utilisateur gratuit : restriction Premium maintenue ──\n");
  const gFree = await generateExam(freeCookie, basePayload());
  check(
    "generate-exam → 402 PREMIUM_REQUIRED",
    gFree.status === 402 && gFree.json.code === "PREMIUM_REQUIRED",
    `HTTP ${gFree.status}`,
  );
  const freeExams = await db
    .select({ id: schema.exams.id })
    .from(schema.exams)
    .where(eq(schema.exams.userId, freeId));
  check("aucune épreuve persistée pour le compte gratuit", freeExams.length === 0, `${freeExams.length}`);

  // ── Nettoyage ───────────────────────────────────────────────────────────
  for (const id of [premiumId, freeId]) {
    await db.delete(schema.activities).where(eq(schema.activities.userId, id));
    await db.delete(schema.exams).where(eq(schema.exams.userId, id));
    await db.delete(schema.aiUsage).where(eq(schema.aiUsage.userId, id));
    await db.delete(schema.subscriptions).where(eq(schema.subscriptions.userId, id));
    await db.delete(schema.session).where(eq(schema.session.userId, id));
    await db.delete(schema.account).where(eq(schema.account.userId, id));
    await db.delete(schema.user).where(eq(schema.user.id, id));
  }

  console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} réussis · ${failed} échoués`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("\n❌ Échec du script :", error);
  process.exit(1);
});
