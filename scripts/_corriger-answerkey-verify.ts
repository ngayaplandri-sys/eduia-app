import "./_env";
import { desc, eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { db } from "../lib/db/client";
import * as schema from "../lib/db/schema";
import type { ExamCorrection } from "../types";

/**
 * Vérifie la correction 1 : une épreuve générée par l'application peut être
 * corrigée SANS copie d'élève → l'IA produit le corrigé type.
 *
 *   npx tsx scripts/_corriger-answerkey-verify.ts
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
    json: { correction?: ExamCorrection; error?: string; code?: string };
  };
}

async function main() {
  const stamp = Date.now();
  const email = `ak-${stamp}@eduia.test`;

  const u = await auth.api.signUpEmail({
    body: { email, password: PW, name: "Answer Key" },
  });
  const uid = u.user.id;
  await db
    .update(schema.user)
    .set({ plan: "premium", emailVerified: true })
    .where(eq(schema.user.id, uid));
  const cookie = await signIn(email);

  // ── Épreuve de référence ────────────────────────────────────────────────
  console.log("\n── Génération d'une épreuve de référence ──\n");
  const examRes = await postForm("/api/ai/generate-exam", cookie, {
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
  check("épreuve générée", examRes.status === 200, `HTTP ${examRes.status}`);
  const [examRow] = await db
    .select()
    .from(schema.exams)
    .where(eq(schema.exams.userId, uid))
    .orderBy(desc(schema.exams.createdAt))
    .limit(1);
  const examId = examRow?.id ?? "";
  const examLabel = examRow
    ? `${examRow.title} — ${examRow.theme} (${examRow.questionCount} questions)`
    : "";
  check("épreuve persistée", Boolean(examId), examId ? "ok" : "absente");

  // ── Corrigé type SANS copie ────────────────────────────────────────────
  console.log("\n── Corrigé type (aucune copie, épreuve sélectionnée) ──\n");
  const g = await postForm("/api/ai/grade", cookie, {
    selectedExam: examLabel,
    selectedExamId: examId,
    level: "Terminale",
    answerFileName: null,
    answerSourceKind: null,
    answerText: "",
    answerSourceText: null,
    scale: "/20",
    strictness: "Standard",
    pageCount: "3 pages",
    options: { conseils: true, explications: true },
  });
  check("HTTP 200", g.status === 200, `HTTP ${g.status} ${g.json.error ?? ""}`);

  const c = g.json.correction;
  if (c) {
    check("mode = answer-key", c.mode === "answer-key", String(c.mode));
    check("score = 0 (pas de copie notée)", c.score === 0, String(c.score));
    check("maxScore > 0", c.maxScore > 0, String(c.maxScore));
    check(
      "questions renvoyées (>= 3)",
      Array.isArray(c.questions) && c.questions.length >= 3,
      `${c.questions?.length ?? 0}`,
    );
    const allHaveKey = c.questions.every(
      (q) =>
        q.expectedAnswer.trim().length > 0 &&
        q.feedback.trim().length > 0 &&
        q.studentAnswer === "",
    );
    check(
      "chaque question : réponse attendue + explication, `studentAnswer` vide",
      allHaveKey,
      "",
    );
    check(
      "strengths / improvements vides (corrigé type)",
      c.strengths.length === 0 && c.improvements.length === 0,
      `${c.strengths.length}/${c.improvements.length}`,
    );
    check("status = Corrigée", c.status === "Corrigée", c.status);
    check("summary non vide", c.summary.trim().length > 0, "");
    console.log(
      `     → « ${c.examTitle} » · ${c.questions.length} questions · barème /${c.maxScore}`,
    );
  }

  // ── Persistance ────────────────────────────────────────────────────────
  const [corrRow] = await db
    .select()
    .from(schema.corrections)
    .where(eq(schema.corrections.userId, uid))
    .orderBy(desc(schema.corrections.createdAt))
    .limit(1);
  check(
    "ligne `corrections` (examId lié, score 0, payload.mode=answer-key)",
    Boolean(
      corrRow &&
        corrRow.examId === examId &&
        corrRow.score === 0 &&
        corrRow.maxScore > 0 &&
        corrRow.payload?.mode === "answer-key",
    ),
    corrRow
      ? `score ${corrRow.score}/${corrRow.maxScore}, mode ${corrRow.payload?.mode}`
      : "absente",
  );
  const [actRow] = await db
    .select()
    .from(schema.activities)
    .where(eq(schema.activities.userId, uid))
    .orderBy(desc(schema.activities.createdAt))
    .limit(1);
  check(
    "ligne `activities` (« Corrigé type », tone info, /corriger)",
    Boolean(
      actRow &&
        actRow.type === "Correction" &&
        actRow.statusLabel === "Corrigé type" &&
        actRow.statusTone === "info" &&
        actRow.actionHref === "/corriger",
    ),
    actRow ? `${actRow.statusLabel} · ${actRow.statusTone}` : "absente",
  );
  const [useRow] = await db
    .select()
    .from(schema.aiUsage)
    .where(eq(schema.aiUsage.userId, uid))
    .orderBy(desc(schema.aiUsage.createdAt))
    .limit(1);
  check(
    "ligne `ai_usage` (kind=correction, success)",
    Boolean(useRow && useRow.kind === "correction" && useRow.status === "success"),
    useRow ? `${useRow.kind}/${useRow.status}` : "absente",
  );

  // ── Régression : ni copie ni épreuve → 400 ─────────────────────────────
  console.log("\n── Ni copie ni épreuve → 400 (inchangé) ──\n");
  const g400 = await postForm("/api/ai/grade", cookie, {
    selectedExam: "",
    selectedExamId: "",
    level: "Terminale",
    answerFileName: null,
    answerSourceKind: null,
    answerText: "",
    answerSourceText: null,
    scale: "/20",
    strictness: "Standard",
    pageCount: "3 pages",
    options: {},
  });
  check("HTTP 400", g400.status === 400, `HTTP ${g400.status}`);

  // ── Nettoyage ──────────────────────────────────────────────────────────
  await db.delete(schema.activities).where(eq(schema.activities.userId, uid));
  await db.delete(schema.corrections).where(eq(schema.corrections.userId, uid));
  await db.delete(schema.exams).where(eq(schema.exams.userId, uid));
  await db.delete(schema.aiUsage).where(eq(schema.aiUsage.userId, uid));
  await db.delete(schema.subscriptions).where(eq(schema.subscriptions.userId, uid));
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
