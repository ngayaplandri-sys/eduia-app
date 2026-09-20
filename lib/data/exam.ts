import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import {
  EXAM_TYPES,
  EXAM_DURATIONS,
  EXAM_QUESTION_MIX,
  EXAM_QUESTION_COUNTS,
} from "@/lib/config/tool-options";
import type { ExamConfig, ExamRequest, GeneratedExam } from "@/types";
import { getCurrentUser } from "./user";

/**
 * Configuration par défaut du panneau « Générer une épreuve » (compte vierge).
 * `subject` / `level` / `theme` restent vides : l'élève saisit lui-même la
 * matière, son niveau/classe et le chapitre/thème (aucune liste prédéfinie).
 */
const DEFAULT_EXAM_CONFIG: ExamConfig = {
  subject: "",
  level: "",
  theme: "",
  examType: EXAM_TYPES[0],
  questionCount: EXAM_QUESTION_COUNTS[1],
  questionMix: EXAM_QUESTION_MIX[3],
  durationLabel: EXAM_DURATIONS[2],
};

/**
 * Épreuve de l'utilisateur connecté (+ configuration pour pré-remplir le
 * formulaire). Sans `id` : la DERNIÈRE épreuve générée, comme avant. Avec
 * `id` : cette épreuve précise — ouverte depuis la recherche — reste affichée
 * même si une épreuve plus récente existe ; si `id` ne correspond à aucune
 * épreuve du compte, `exam` vaut `null` (état vide, pas de repli silencieux
 * sur une autre épreuve).
 */
export async function getLatestExam(id?: string): Promise<{
  config: ExamConfig;
  exam: GeneratedExam | null;
}> {
  const user = await getCurrentUser();
  if (!user) return { config: DEFAULT_EXAM_CONFIG, exam: null };

  const [row] = await db
    .select()
    .from(schema.exams)
    .where(
      id
        ? and(eq(schema.exams.id, id), eq(schema.exams.userId, user.id))
        : eq(schema.exams.userId, user.id),
    )
    .orderBy(desc(schema.exams.createdAt))
    .limit(1);

  if (!row) return { config: DEFAULT_EXAM_CONFIG, exam: null };

  const exam = row.payload;
  const allowedCounts = EXAM_QUESTION_COUNTS as readonly number[];
  const config: ExamConfig = {
    subject: row.subject,
    level: row.level,
    theme: row.theme,
    examType: row.examType,
    questionCount: allowedCounts.includes(row.questionCount)
      ? row.questionCount
      : EXAM_QUESTION_COUNTS[1],
    questionMix: EXAM_QUESTION_MIX[3],
    durationLabel: exam.durationLabel,
  };

  return { config, exam };
}

/**
 * Persiste une épreuve fraîchement générée par OpenAI, de façon atomique :
 *  - `exams` : l'épreuve + son `payload` (consommé tel quel par l'UI et repris
 *    par `/corriger` comme épreuve de référence) ;
 *  - `activities` : la ligne « Épreuve prête » du dashboard / de l'historique.
 *
 * Appelée par `POST /api/ai/generate-exam` après la génération, sur le modèle
 * de `saveCourseSummary` (« Résumer mes cours »). `getLatestExam` relit ensuite
 * ces lignes sans transformation.
 */
export async function saveGeneratedExam(input: {
  userId: string;
  request: ExamRequest;
  exam: GeneratedExam;
  /**
   * Ancrage documentaire (contenu du cours source, ou condensé fidèle de l'IA) —
   * réinjecté par « Corriger une épreuve ». `null` si aucun document source.
   */
  sourceText?: string | null;
}): Promise<{ examId: string }> {
  const { userId, request, exam, sourceText } = input;

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(schema.exams)
      .values({
        userId,
        title: exam.title,
        subject: request.subject,
        level: request.level,
        theme: request.theme,
        examType: request.examType,
        status: exam.status,
        questionCount: exam.questionCount,
        // Colonne `integer` : l'IA peut renvoyer des points fractionnaires
        // (demi-points), le détail exact reste dans `payload`.
        totalPoints: Math.round(exam.totalPoints),
        sourceText: sourceText?.trim() ? sourceText.trim() : null,
        payload: exam,
      })
      .returning({ id: schema.exams.id });

    await tx.insert(schema.activities).values({
      userId,
      title: exam.title,
      meta: [request.subject, `${exam.questionCount} questions`]
        .filter(Boolean)
        .join(" • "),
      fileKind: "exam",
      type: "Épreuve",
      statusLabel: "Prête",
      statusTone: "success",
      actionLabel: "Ouvrir",
      actionHref: "/generer",
      occurredAt: new Date(),
    });

    return { examId: row.id };
  });
}

// La version texte brut de l'épreuve (copie / export) vit dans
// `@/lib/summary/exam-text` : client-safe (pas de `server-only`) + i18n.
