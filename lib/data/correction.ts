import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { examToReferenceText } from "@/lib/summary/exam-text";
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
    label: `${row.title} — ${row.theme} (${row.questionCount} questions)`,
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
export async function resolveExamReference(
  userId: string,
  examId: string,
): Promise<{
  examId: string | null;
  referenceText: string | null;
  documentContext: string | null;
}> {
  if (!examId)
    return { examId: null, referenceText: null, documentContext: null };
  const [row] = await db
    .select({
      id: schema.exams.id,
      payload: schema.exams.payload,
      sourceText: schema.exams.sourceText,
    })
    .from(schema.exams)
    .where(and(eq(schema.exams.id, examId), eq(schema.exams.userId, userId)))
    .limit(1);
  if (!row)
    return { examId: null, referenceText: null, documentContext: null };
  return {
    examId: row.id,
    referenceText: examToReferenceText(row.payload),
    documentContext: row.sourceText,
  };
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
