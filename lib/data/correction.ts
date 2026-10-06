import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { examToReferenceText } from "@/lib/summary/exam-text";
import { layoutExam } from "@/lib/summary/exam-layout";
import type {
  CorrectionConfig,
  CorrectionRequest,
  ExamCorrection,
} from "@/types";
import { getCurrentUser } from "./user";

/**
 * Correction de copie de l'utilisateur connecté (+ configuration pour
 * pré-remplir le formulaire). Le déroulant « Épreuve concernée » liste les
 * épreuves que l'utilisateur a lui-même générées. Sans `id` : la DERNIÈRE
 * correction, comme avant. Avec `id` : cette correction précise — ouverte
 * depuis la recherche — reste affichée même si une correction plus récente
 * existe ; si `id` ne correspond à aucune correction du compte, `correction`
 * vaut `null` (état vide, pas de repli silencieux sur une autre correction).
 */
export async function getLatestCorrection(id?: string): Promise<{
  config: CorrectionConfig;
  correction: ExamCorrection | null;
}> {
  const user = await getCurrentUser();

  const emptyConfig: CorrectionConfig = {
    availableExams: [],
    selectedExamId: "",
    questionCount: 0,
    subject: "",
    level: "",
    answerFileName: "",
    answerFileSize: "",
  };

  if (!user) return { config: emptyConfig, correction: null };

  const [examRows, correctionRows] = await Promise.all([
    // Colonnes légères seulement — surtout PAS `sourceText` / `payload` (l'ancrage
    // documentaire peut peser plusieurs Ko par épreuve, inutile pour le déroulant).
    db
      .select({
        id: schema.exams.id,
        title: schema.exams.title,
        theme: schema.exams.theme,
        subject: schema.exams.subject,
        level: schema.exams.level,
        questionCount: schema.exams.questionCount,
      })
      .from(schema.exams)
      .where(eq(schema.exams.userId, user.id))
      .orderBy(desc(schema.exams.createdAt)),
    db
      .select()
      .from(schema.corrections)
      .where(
        id
          ? and(eq(schema.corrections.id, id), eq(schema.corrections.userId, user.id))
          : eq(schema.corrections.userId, user.id),
      )
      .orderBy(desc(schema.corrections.createdAt))
      .limit(1),
  ]);

  const availableExams = examRows.map((row) => ({
    id: row.id,
    label: examLabel(row),
  }));
  const row = correctionRows[0] ?? null;
  const correction = row?.payload ?? null;

  const config: CorrectionConfig = {
    availableExams,
    selectedExamId: availableExams[0]?.id ?? "",
    questionCount:
      correction?.questions.length ?? examRows[0]?.questionCount ?? 0,
    subject: row?.subject ?? examRows[0]?.subject ?? "",
    level: row?.level ?? examRows[0]?.level ?? "",
    answerFileName: "",
    answerFileSize: "",
  };

  return { config, correction };
}

/**
 * Résout l'épreuve de référence choisie dans le déroulant : renvoie son `id`
 * (validé : existe **et** appartient à l'utilisateur), son texte (énoncés +
 * corrigé) pour `examReferenceText`, et son ancrage documentaire (`sourceText` :
 * contenu du cours dont l'épreuve est issue) pour `documentContext` de
 * `gradeExam`. Toutes les valeurs sont `null` si aucune épreuve n'est
 * sélectionnée ou si le lien est invalide.
 */
export interface ExamReference {
  examId: string | null;
  referenceText: string | null;
  documentContext: string | null;
  /** Libellé affiché comme titre du corrigé (même format que le déroulant). */
  label: string | null;
  level: string | null;
  /** Barème exact de l'épreuve : points par question, dans l'ordre (A.1, A.2, B.1…). */
  points: number[] | null;
  totalPoints: number | null;
}

const EMPTY_REFERENCE: ExamReference = {
  examId: null,
  referenceText: null,
  documentContext: null,
  label: null,
  level: null,
  points: null,
  totalPoints: null,
};

function examLabel(row: { title: string; theme: string; questionCount: number }) {
  return `${row.title} — ${row.theme} (${row.questionCount} questions)`;
}

export async function resolveExamReference(
  userId: string,
  examId: string,
): Promise<ExamReference> {
  if (!examId) return EMPTY_REFERENCE;
  const [row] = await db
    .select({
      id: schema.exams.id,
      title: schema.exams.title,
      theme: schema.exams.theme,
      level: schema.exams.level,
      questionCount: schema.exams.questionCount,
      payload: schema.exams.payload,
      sourceText: schema.exams.sourceText,
    })
    .from(schema.exams)
    .where(and(eq(schema.exams.id, examId), eq(schema.exams.userId, userId)))
    .limit(1);
  if (!row) return EMPTY_REFERENCE;

  const points = layoutExam(row.payload).flatMap((part) =>
    part.questions.map((item) => item.question.points),
  );
  return {
    examId: row.id,
    referenceText: examToReferenceText(row.payload),
    documentContext: row.sourceText,
    label: examLabel(row),
    level: row.level || null,
    points: points.length > 0 ? points : null,
    totalPoints: row.payload.totalPoints > 0 ? row.payload.totalPoints : null,
  };
}

/** Texte comparable : minuscules, sans accents ni ponctuation. */
function comparableWords(text: string): Set<string> {
  return new Set(
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((word) => word.length >= 3),
  );
}

/** Part des mots de la plus courte des deux phrases présents dans l'autre. */
function overlap(a: Set<string>, b: Set<string>): number {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  if (small.size === 0) return 0;
  let shared = 0;
  for (const word of small) if (large.has(word)) shared += 1;
  return shared / small.size;
}

/** Nombre d'épreuves récentes de l'élève comparées à une épreuve importée. */
const MATCH_CANDIDATES = 40;

/**
 * Reconnaît une épreuve importée (PDF téléchargé depuis EduIA, photo de
 * l'épreuve imprimée…) parmi les épreuves que l'élève a lui-même générées :
 * la majorité des énoncés détectés doivent correspondre aux questions d'une
 * même épreuve. Comparaison déterministe, limitée aux épreuves du compte
 * (`userId`) — jamais celles d'un autre utilisateur.
 *
 * Renvoie l'`id` de l'épreuve reconnue, ou `null` (épreuve externe).
 */
export async function findMatchingExam(
  userId: string,
  questions: { statement: string }[],
): Promise<string | null> {
  const imported = questions
    .map((question) => comparableWords(question.statement))
    .filter((words) => words.size >= 3);
  if (imported.length === 0) return null;

  const rows = await db
    .select({ id: schema.exams.id, payload: schema.exams.payload })
    .from(schema.exams)
    .where(eq(schema.exams.userId, userId))
    .orderBy(desc(schema.exams.createdAt))
    .limit(MATCH_CANDIDATES);

  let best: { id: string; ratio: number } | null = null;
  for (const row of rows) {
    const examQuestions = layoutExam(row.payload).flatMap((part) =>
      part.questions.map((item) => comparableWords(item.prompt)),
    );
    if (examQuestions.length === 0) continue;

    const matched = imported.filter((words) =>
      examQuestions.some((candidate) => overlap(words, candidate) >= 0.75),
    ).length;
    const ratio = matched / Math.max(imported.length, examQuestions.length);
    if (matched >= Math.min(2, imported.length) && ratio >= 0.6) {
      if (!best || ratio > best.ratio) best = { id: row.id, ratio };
    }
  }
  return best?.id ?? null;
}

function scoreTone(ratio: number): "success" | "info" | "warning" | "danger" {
  if (ratio >= 0.75) return "success";
  if (ratio >= 0.5) return "info";
  if (ratio >= 0.4) return "warning";
  return "danger";
}

/**
 * Persiste une correction fraîchement générée par OpenAI, de façon atomique :
 *  - `corrections` : le bilan + son `payload` (consommé tel quel par l'UI) ;
 *  - `activities` : la ligne « {score}/{max} » du dashboard / de l'historique.
 *
 * Appelée par `POST /api/ai/grade` après la génération, sur le modèle de
 * `saveGeneratedExam` / `saveCourseSummary`. `getLatestCorrection` relit ensuite
 * ces lignes sans transformation.
 */
export async function saveCorrection(input: {
  userId: string;
  request: CorrectionRequest;
  correction: ExamCorrection;
  examId: string | null;
}): Promise<{ correctionId: string }> {
  const { userId, correction, examId } = input;
  const questionCount = correction.questions.length;
  const isAnswerKey = correction.mode === "answer-key";
  const ratio = correction.maxScore > 0 ? correction.score / correction.maxScore : 0;

  // Le détail exact (demi-points possibles) vit dans `payload` ; les colonnes
  // plates `score` / `max_score` sont des `integer` → on arrondit pour elles.
  const flatScore = Math.round(correction.score);
  const flatMax = Math.round(correction.maxScore);

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(schema.corrections)
      .values({
        userId,
        examId,
        examTitle: correction.examTitle,
        subject: correction.subject,
        level: correction.level,
        status: correction.status,
        score: flatScore,
        maxScore: flatMax,
        payload: correction,
      })
      .returning({ id: schema.corrections.id });

    await tx.insert(schema.activities).values({
      userId,
      title: correction.examTitle,
      meta: [correction.subject, `${questionCount} questions`]
        .filter(Boolean)
        .join(" • "),
      fileKind: "correction",
      type: "Correction",
      // Corrigé type (sans copie) → libellé dédié plutôt qu'une note « 0/20 ».
      statusLabel: isAnswerKey ? "Corrigé type" : `${flatScore}/${flatMax}`,
      statusTone: isAnswerKey ? "info" : scoreTone(ratio),
      actionLabel: "Voir",
      actionHref: "/corriger",
      occurredAt: new Date(),
    });

    return { correctionId: row.id };
  });
}
