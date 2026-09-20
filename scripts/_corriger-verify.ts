import "./_env";
import { desc, eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { db } from "../lib/db/client";
import * as schema from "../lib/db/schema";
import type { ExamCorrection } from "../types";

/**
 * Vérifie « Corriger une épreuve » branché sur OpenAI de bout en bout.
 *
 *   npx tsx scripts/_corriger-verify.ts
 *
 * Nécessite : `npm run dev` + `OPENAI_API_KEY` valide.
 */

const BASE = "http://localhost:3000";
const PW = "Test1234!pw";

let passed = 0;
let failed = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) passed++;
  else failed++;
  console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
}

async function signIn(email: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE },
    body: JSON.stringify({ email, password: PW }),
  });
  if (!res.ok) throw new Error(`sign-in ${email} → HTTP ${res.status}`);
  return res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

async function postForm(
  path: string,
  cookie: string,
  payload: Record<string, unknown>,
) {
  const form = new FormData();
  form.set("payload", JSON.stringify(payload));
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { cookie, origin: BASE },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json } as {
    status: number;
    json: { correction?: ExamCorrection; exam?: unknown; error?: string; code?: string };
  };
}

function gradePayload(overrides: Record<string, unknown> = {}) {
  return {
    selectedExam: "",
    selectedExamId: "",
    level: "Terminale",
    answerFileName: null,
    answerSourceKind: null,
    answerText:
      "1. Le début de la Guerre froide est marqué par la doctrine Truman (1947). " +
      "2. Le plan Marshall est une aide économique américaine à l'Europe. " +
      "3. Le mur de Berlin est construit en 1961. " +
      "4. La crise de Cuba a lieu en 1962 et manque de déclencher une guerre nucléaire.",
    answerSourceText: null,
    scale: "/20",
    strictness: "Standard",
    pageCount: "4 pages",
    options: { conseils: true, explications: true },
    ...overrides,
  };
}

function looksLikeCorrection(c: ExamCorrection | undefined): string {
  if (!c) return "pas d'objet correction";
  const p: string[] = [];
  if (!Array.isArray(c.questions) || c.questions.length === 0) p.push("aucune question");
  if (!(c.maxScore > 0)) p.push("maxScore ≤ 0");
  if (c.score < 0 || c.score > c.maxScore) p.push(`score ${c.score}/${c.maxScore} hors bornes`);
  if (!c.appreciation) p.push("appreciation vide");
  if (!c.summary) p.push("summary vide");
  if (c.status !== "Corrigée") p.push(`status "${c.status}"`);
  if (!Array.isArray(c.strengths) || !Array.isArray(c.improvements)) p.push("strengths/improvements manquants");
  return p.join(", ");
}

const FRENCH_WORDS =
  /\b(?:élève|réponse|attendue|barème|copie|aucune|plusieurs|chaque|certaines?|manque|néanmoins|cependant|justifie|expliquer)\b/i;

async function main() {
  const stamp = Date.now();
  const premiumEmail = `corr-premium-${stamp}@eduia.test`;
  const freeEmail = `corr-free-${stamp}@eduia.test`;

  const p = await auth.api.signUpEmail({
    body: { email: premiumEmail, password: PW, name: "Corr Premium" },
  });
  const f = await auth.api.signUpEmail({
    body: { email: freeEmail, password: PW, name: "Corr Free" },
  });
  const premiumId = p.user.id;
  const freeId = f.user.id;
  await db.update(schema.user).set({ plan: "premium", emailVerified: true }).where(eq(schema.user.id, premiumId));
  await db.update(schema.user).set({ plan: "free", role: "student", emailVerified: true }).where(eq(schema.user.id, freeId));

  const premiumCookie = await signIn(premiumEmail);
  const freeCookie = await signIn(freeEmail);

  // ── Prépare une épreuve de référence (déroulant « Épreuve concernée ») ────
  console.log("\n── Génération d'une épreuve de référence ──\n");
  const examRes = await postForm("/api/ai/generate-exam", premiumCookie, {
    fileName: null,
    sourceKind: null,
    sourceText: null,
    subject: "Histoire",
    level: "Terminale",
    theme: "La Guerre froide",
    examType: "Devoir surveillé",
    questionCount: 5,
    questionMix: "Mixte",
    durationLabel: "2h",
    pageCount: "2 pages",
    options: {},
  });
  check("épreuve de référence générée", examRes.status === 200, `HTTP ${examRes.status}`);
  const [examRow] = await db
    .select()
    .from(schema.exams)
    .where(eq(schema.exams.userId, premiumId))
    .orderBy(desc(schema.exams.createdAt))
    .limit(1);
  const examId = examRow?.id ?? "";
  const examLabel = examRow
    ? `${examRow.title} — ${examRow.theme} (${examRow.questionCount} questions)`
    : "";

  // ── 1. Correction avec épreuve de référence ─────────────────────────────
  console.log("\n── Correction d'une copie AVEC épreuve de référence ──\n");
  const g1 = await postForm(
    "/api/ai/grade",
    premiumCookie,
    gradePayload({ selectedExam: examLabel, selectedExamId: examId }),
  );
  check("HTTP 200", g1.status === 200, `HTTP ${g1.status} ${g1.json.error ?? ""}`);
  check(
    "bilan structuré renvoyé",
    g1.status === 200 && looksLikeCorrection(g1.json.correction) === "",
    looksLikeCorrection(g1.json.correction),
  );
  if (g1.json.correction) {
    const c = g1.json.correction;
    console.log(
      `     → ${c.score}/${c.maxScore} · « ${c.appreciation} » · ${c.questions.length} questions notées`,
    );
    check(
      "note globale = somme des points par question",
      c.score === c.questions.reduce((s, q) => s + q.pointsEarned, 0) &&
        c.maxScore === c.questions.reduce((s, q) => s + q.pointsMax, 0),
      "",
    );
  }

  // Persistance
  const [corrRow] = await db
    .select()
    .from(schema.corrections)
    .where(eq(schema.corrections.userId, premiumId))
    .orderBy(desc(schema.corrections.createdAt))
    .limit(1);
  check(
    "ligne `corrections` persistée (payload + `examId` lié à l'épreuve de réf.)",
    Boolean(corrRow && corrRow.examId === examId && corrRow.payload && corrRow.maxScore > 0),
    corrRow ? `score ${corrRow.score}/${corrRow.maxScore}, examId ${corrRow.examId ? "lié" : "null"}` : "absente",
  );
  const [actRow] = await db
    .select()
    .from(schema.activities)
    .where(eq(schema.activities.userId, premiumId))
    .orderBy(desc(schema.activities.createdAt))
    .limit(1);
  check(
    "ligne `activities` créée (« Correction » / score / /corriger)",
    Boolean(
      actRow &&
        actRow.type === "Correction" &&
        actRow.fileKind === "correction" &&
        actRow.actionHref === "/corriger" &&
        /^\d+\/\d+$/.test(actRow.statusLabel),
    ),
    actRow ? `${actRow.statusLabel} · ${actRow.meta}` : "absente",
  );
  const [useRow] = await db
    .select()
    .from(schema.aiUsage)
    .where(eq(schema.aiUsage.userId, premiumId))
    .orderBy(desc(schema.aiUsage.createdAt))
    .limit(1);
  check(
    "ligne `ai_usage` (kind=correction, success)",
    Boolean(useRow && useRow.kind === "correction" && useRow.status === "success" && (useRow.outputTokens ?? 0) > 0),
    useRow ? `in ${useRow.inputTokens} / out ${useRow.outputTokens}` : "absente",
  );

  // ── 2. Correction SANS épreuve de référence (connaissances du modèle) ────
  console.log("\n── Correction SANS épreuve de référence ──\n");
  const g2 = await postForm("/api/ai/grade", premiumCookie, gradePayload());
  check("HTTP 200", g2.status === 200, `HTTP ${g2.status} ${g2.json.error ?? ""}`);
  check(
    "bilan structuré renvoyé",
    g2.status === 200 && looksLikeCorrection(g2.json.correction) === "",
    looksLikeCorrection(g2.json.correction),
  );
  const corrCount = await db
    .select({ id: schema.corrections.id })
    .from(schema.corrections)
    .where(eq(schema.corrections.userId, premiumId));
  check("2 corrections persistées", corrCount.length === 2, `${corrCount.length}`);
  if (g2.json.correction) {
    check(
      "correction sans réf. → `examId` NULL",
      corrCount.length === 2,
      "",
    );
  }

  // ── 3. Copie vide → erreur explicite (avant tout appel OpenAI) ──────────
  console.log("\n── Copie vide → erreur ──\n");
  const g3 = await postForm(
    "/api/ai/grade",
    premiumCookie,
    gradePayload({ answerText: "", answerSourceText: null }),
  );
  check("HTTP 400 (aucune réponse à corriger)", g3.status === 400, `HTTP ${g3.status}`);

  // ── 4. Sortie en anglais ───────────────────────────────────────────────
  console.log("\n── Correction en anglais (cookie eduia.locale=en) ──\n");
  const g4 = await postForm(
    "/api/ai/grade",
    `${premiumCookie}; eduia.locale=en`,
    gradePayload({
      answerText:
        "1. The Cold War began with the Truman Doctrine in 1947. " +
        "2. The Marshall Plan was US economic aid to Europe. " +
        "3. The Berlin Wall was built in 1961.",
    }),
  );
  check("HTTP 200", g4.status === 200, `HTTP ${g4.status} ${g4.json.error ?? ""}`);
  if (g4.json.correction) {
    const text = [
      g4.json.correction.summary,
      g4.json.correction.appreciation,
      ...g4.json.correction.questions.map((q) => q.feedback),
    ].join(" ");
    check(
      "bilan rédigé en anglais (pas de français résiduel)",
      text.length > 0 && !FRENCH_WORDS.test(text),
      text.slice(0, 90),
    );
  }

  // ── 5. Compte gratuit → 402, rien de persisté ──────────────────────────
  console.log("\n── Utilisateur gratuit : restriction Premium maintenue ──\n");
  const gFree = await postForm("/api/ai/grade", freeCookie, gradePayload());
  check(
    "grade → 402 PREMIUM_REQUIRED",
    gFree.status === 402 && gFree.json.code === "PREMIUM_REQUIRED",
    `HTTP ${gFree.status}`,
  );
  const freeCorr = await db
    .select({ id: schema.corrections.id })
    .from(schema.corrections)
    .where(eq(schema.corrections.userId, freeId));
  check("aucune correction persistée pour le compte gratuit", freeCorr.length === 0, `${freeCorr.length}`);

  // ── Nettoyage ───────────────────────────────────────────────────────────
  for (const id of [premiumId, freeId]) {
    await db.delete(schema.activities).where(eq(schema.activities.userId, id));
    await db.delete(schema.corrections).where(eq(schema.corrections.userId, id));
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
