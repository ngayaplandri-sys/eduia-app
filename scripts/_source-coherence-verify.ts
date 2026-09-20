import "./_env";
import { readFileSync } from "node:fs";
import { desc, eq } from "drizzle-orm";
import { auth } from "../lib/auth";
import { db } from "../lib/db/client";
import * as schema from "../lib/db/schema";
import type { CourseSummary, ExamCorrection, GeneratedExam } from "../types";

/**
 * Vérifie la chaîne document → résumé → épreuve → correction : les 3 outils
 * travaillent à partir du MÊME document source, l'IA respecte son contenu,
 * l'épreuve est réutilisable telle quelle pour la correction (sans copie).
 *
 *   npx tsx scripts/_source-coherence-verify.ts
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

// Cours source : termes précis et vérifiables (ancrage).
const COURSE = `LA PHOTOSYNTHÈSE (Terminale spécialité SVT)

1. Définition
La photosynthèse est le processus par lequel les végétaux chlorophylliens produisent
de la matière organique (glucose) à partir de dioxyde de carbone et d'eau, en utilisant
l'énergie lumineuse. Elle se déroule dans les chloroplastes.

2. La phase photochimique (dans les thylakoïdes)
Les photons excitent la chlorophylle des photosystèmes II et I. L'eau est oxydée
(photolyse de l'eau), ce qui libère du dioxygène. La chaîne de transporteurs d'électrons
permet la synthèse d'ATP (photophosphorylation) et la réduction du NADP+ en NADPH.

3. Le cycle de Calvin (dans le stroma)
Le cycle de Calvin fixe le CO2 sur le ribulose-1,5-bisphosphate grâce à l'enzyme RuBisCO.
L'ATP et le NADPH produits lors de la phase photochimique fournissent l'énergie et le
pouvoir réducteur nécessaires à la synthèse des trioses phosphate, précurseurs du glucose.

4. Bilan
6 CO2 + 12 H2O + énergie lumineuse -> C6H12O6 + 6 O2 + 6 H2O.
La photosynthèse est à la base de la quasi-totalité des chaînes alimentaires et de la
composition de l'atmosphère en dioxygène.`;

// Termes attendus (issus du cours) : mesure de fidélité au document.
const SOURCE_TERMS = [
  "photosynth",
  "chloroplaste",
  "thylako",
  "stroma",
  "calvin",
  "rubisco",
  "atp",
  "nadph",
  "chlorophyll",
  "photon",
  "co2",
  "dioxyg",
  "glucose",
  "photolyse",
  "photosyst",
];

function grounding(text: string): { hits: number; terms: string[] } {
  const low = text.toLowerCase();
  const terms = SOURCE_TERMS.filter((t) => low.includes(t));
  return { hits: terms.length, terms };
}

async function signIn(email: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE },
    body: JSON.stringify({ email, password: PW }),
  });
  if (!res.ok) throw new Error(`sign-in → HTTP ${res.status}`);
  return res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
}

async function postForm(
  path: string,
  cookie: string,
  payload: Record<string, unknown>,
  file?: { buf: Buffer; name: string; type: string },
) {
  const form = new FormData();
  form.set("payload", JSON.stringify(payload));
  if (file) {
    form.set(
      "file",
      new Blob([new Uint8Array(file.buf)], { type: file.type }),
      file.name,
    );
  }
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { cookie, origin: BASE },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json } as {
    status: number;
    json: {
      summary?: CourseSummary;
      exam?: GeneratedExam;
      correction?: ExamCorrection;
      error?: string;
      code?: string;
    };
  };
}

function summaryText(s: CourseSummary): string {
  return [
    s.title,
    ...s.sections.flatMap((sec) => [
      sec.heading,
      ...(sec.paragraphs ?? []),
      ...(sec.bullets ?? []).map((b) => `${b.lead ?? ""} ${b.text}`),
    ]),
    ...s.keyConcepts,
    ...s.definitions.flatMap((d) => [d.term, d.definition]),
    ...s.keyPoints,
  ].join(" \n");
}

function examText(e: GeneratedExam): string {
  return e.parts
    .flatMap((p) => [
      p.title,
      p.instructions ?? "",
      ...p.questions.flatMap((q) => [
        q.prompt,
        ...(q.choices ?? []).map((c) => c.text),
        ...(q.subQuestions ?? []),
        q.expectedAnswer ?? "",
        ...(q.statements ?? []).map((st) => st.text),
      ]),
    ])
    .join(" \n");
}

function correctionText(c: ExamCorrection): string {
  return [
    c.summary,
    ...c.questions.flatMap((q) => [q.prompt, q.expectedAnswer, q.feedback]),
    ...c.advice,
  ].join(" \n");
}

async function main() {
  const stamp = Date.now();
  const email = `coh-${stamp}@eduia.test`;
  const u = await auth.api.signUpEmail({
    body: { email, password: PW, name: "Coherence Test" },
  });
  const uid = u.user.id;
  await db
    .update(schema.user)
    .set({ plan: "premium", emailVerified: true })
    .where(eq(schema.user.id, uid));
  await db.insert(schema.onboarding).values({
    userId: uid, firstName: "Coh", schoolLevel: "Terminale", subjects: ["SVT"],
    goal: "reviser", improveSubjects: ["SVT"], learningStyle: "resume",
  });
  const cookie = await signIn(email);

  const baseParams = {
    fileName: "cours-photosynthese.txt",
    sourceKind: "txt",
    sourceText: COURSE,
    subject: "SVT",
    level: "Terminale",
  };

  // ── 1. Résumé à partir du document ─────────────────────────────────────
  console.log("\n── 1. Résumer le cours ──\n");
  const r = await postForm("/api/ai/summarize", cookie, {
    ...baseParams,
    chapter: "La photosynthèse",
    theme: "",
    style: "Résumé clair",
    pageCount: "2 pages",
    detailLevel: "Essentiel",
    options: { pointsEssentiels: true, definitions: true },
  });
  check("HTTP 200", r.status === 200, `HTTP ${r.status} ${r.json.error ?? ""}`);
  let summaryG = { hits: 0, terms: [] as string[] };
  if (r.json.summary) {
    summaryG = grounding(summaryText(r.json.summary));
    check(
      "résumé ancré dans le document (≥ 6 termes du cours)",
      summaryG.hits >= 6,
      `${summaryG.hits}/${SOURCE_TERMS.length} : ${summaryG.terms.join(", ")}`,
    );
    check("statut « Prêt »", r.json.summary.status === "Prêt");
  }

  // ── 2. Épreuve à partir du MÊME document ───────────────────────────────
  console.log("\n── 2. Générer une épreuve ──\n");
  const e = await postForm("/api/ai/generate-exam", cookie, {
    ...baseParams,
    theme: "La photosynthèse",
    examType: "Devoir surveillé",
    questionCount: 6,
    questionMix: "Mixte",
    durationLabel: "2h",
    pageCount: "2 pages",
    options: { bareme: true, explications: true },
  });
  check("HTTP 200", e.status === 200, `HTTP ${e.status} ${e.json.error ?? ""}`);
  let examG = { hits: 0, terms: [] as string[] };
  if (e.json.exam) {
    const qCount = e.json.exam.parts.reduce((s, p) => s + p.questions.length, 0);
    check("épreuve structurée (≥ 3 questions, barème > 0)", qCount >= 3 && e.json.exam.totalPoints > 0, `${qCount} q, ${e.json.exam.totalPoints} pts`);
    examG = grounding(examText(e.json.exam));
    check(
      "questions ancrées dans le document (≥ 5 termes du cours)",
      examG.hits >= 5,
      `${examG.hits} : ${examG.terms.join(", ")}`,
    );
  }
  const [examRow] = await db
    .select()
    .from(schema.exams)
    .where(eq(schema.exams.userId, uid))
    .orderBy(desc(schema.exams.createdAt))
    .limit(1);
  check(
    "`exams.sourceText` renseigné (ancrage documentaire persisté)",
    Boolean(examRow?.sourceText && examRow.sourceText.length > 100),
    examRow?.sourceText ? `${examRow.sourceText.length} car.` : "NULL",
  );
  if (examRow?.sourceText) {
    const g = grounding(examRow.sourceText);
    check("ancrage documentaire fidèle (≥ 6 termes du cours)", g.hits >= 6, `${g.hits} : ${g.terms.join(", ")}`);
  }
  const examId = examRow?.id ?? "";
  const examLabel = examRow
    ? `${examRow.title} — ${examRow.theme} (${examRow.questionCount} questions)`
    : "";

  // ── 3. Corrigé type : épreuve reprise telle quelle, AUCUNE copie ───────
  console.log("\n── 3. Corriger l'épreuve (sans copie) ──\n");
  const c = await postForm("/api/ai/grade", cookie, {
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
  check("HTTP 200", c.status === 200, `HTTP ${c.status} ${c.json.error ?? ""}`);
  let corrG = { hits: 0, terms: [] as string[] };
  if (c.json.correction) {
    const cor = c.json.correction;
    check("mode = answer-key (corrigé type)", cor.mode === "answer-key", String(cor.mode));
    check(
      "réponses attendues + explications pour chaque question",
      cor.questions.length >= 3 &&
        cor.questions.every((q) => q.expectedAnswer.trim() && q.feedback.trim()),
      `${cor.questions.length} questions`,
    );
    corrG = grounding(correctionText(cor));
    check(
      "corrigé ancré dans le document (≥ 6 termes du cours)",
      corrG.hits >= 6,
      `${corrG.hits} : ${corrG.terms.join(", ")}`,
    );
  }
  const [corrRow] = await db
    .select()
    .from(schema.corrections)
    .where(eq(schema.corrections.userId, uid))
    .orderBy(desc(schema.corrections.createdAt))
    .limit(1);
  check(
    "correction persistée + liée à l'épreuve (`examId`)",
    Boolean(corrRow && corrRow.examId === examId),
    corrRow ? `examId ${corrRow.examId ? "lié" : "NULL"}` : "absente",
  );

  // ── 4. Cohérence du vocabulaire document → résumé → épreuve → corrigé ──
  console.log("\n── 4. Cohérence de la chaîne ──\n");
  const shared = SOURCE_TERMS.filter(
    (t) =>
      summaryG.terms.includes(t) &&
      examG.terms.includes(t) &&
      corrG.terms.includes(t),
  );
  check(
    "≥ 4 notions du cours communes aux 3 productions",
    shared.length >= 4,
    shared.join(", "),
  );

  // ── 5. Source PDF → ancrage via condensé IA ───────────────────────────
  console.log("\n── 5. Épreuve à partir d'un PDF ──\n");
  let pdfBuf: Buffer | null = null;
  try {
    pdfBuf = readFileSync("scripts/_exam-download.pdf");
  } catch {
    console.log("  (ignoré : scripts/_exam-download.pdf absent)");
  }
  if (pdfBuf) {
    const ep = await postForm(
      "/api/ai/generate-exam",
      cookie,
      {
        fileName: "cours.pdf",
        sourceKind: null,
        sourceText: null,
        subject: "Histoire",
        level: "Terminale",
        theme: "",
        examType: "Devoir surveillé",
        questionCount: 5,
        questionMix: "Mixte",
        durationLabel: "1h",
        pageCount: "2 pages",
        options: {},
      },
      { buf: pdfBuf, name: "cours.pdf", type: "application/pdf" },
    );
    check("HTTP 200 (PDF)", ep.status === 200, `HTTP ${ep.status} ${ep.json.error ?? ""}`);
    const [pdfExam] = await db
      .select()
      .from(schema.exams)
      .where(eq(schema.exams.userId, uid))
      .orderBy(desc(schema.exams.createdAt))
      .limit(1);
    check(
      "`exams.sourceText` renseigné pour un PDF (condensé IA du document)",
      Boolean(pdfExam?.sourceText && pdfExam.sourceText.length > 100),
      pdfExam?.sourceText ? `${pdfExam.sourceText.length} car.` : "NULL",
    );
  }

  // ── Nettoyage ─────────────────────────────────────────────────────────
  await db.delete(schema.activities).where(eq(schema.activities.userId, uid));
  await db.delete(schema.corrections).where(eq(schema.corrections.userId, uid));
  await db.delete(schema.exams).where(eq(schema.exams.userId, uid));
  await db.delete(schema.summaries).where(eq(schema.summaries.userId, uid));
  await db.delete(schema.documents).where(eq(schema.documents.userId, uid));
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
