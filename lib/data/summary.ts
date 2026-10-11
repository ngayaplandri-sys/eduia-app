import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { CourseDocument, CourseSummary, SummaryRequest } from "@/types";
import { getCurrentUser } from "./user";

/**
 * Valeurs par défaut du panneau « Importer ton cours » pour un compte vierge.
 * `subject` / `level` / `chapter` / `theme` restent vides : l'élève saisit
 * lui-même la matière, son niveau/classe et le chapitre/thème de son propre
 * cours (aucune liste prédéfinie).
 */
const DEFAULT_COURSE_DOCUMENT: CourseDocument = {
  fileName: "",
  sizeLabel: "",
  fileKind: "pdf",
  subject: "",
  level: "",
  chapter: "",
  theme: "",
  pageCount: 0,
};

/**
 * Résumé de cours de l'utilisateur connecté (+ document source pour
 * pré-remplir le formulaire). Sans `id` : le DERNIER résumé généré, comme
 * avant. Avec `id` : ce résumé précis — ouvert depuis la recherche — reste
 * affiché même si un résumé plus récent existe ; si `id` ne correspond à
 * aucun résumé du compte, `summary` vaut `null` (état vide, pas de repli
 * silencieux sur un autre résumé).
 *
 * Point de bascule : `lib/ai.summarizeCourse()` (OpenAI) écrira une ligne
 * `summaries` sans changer cette forme.
 */
export async function getLatestCourseSummary(id?: string): Promise<{
  document: CourseDocument;
  summary: CourseSummary | null;
}> {
  const user = await getCurrentUser();
  if (!user) return { document: DEFAULT_COURSE_DOCUMENT, summary: null };

  const [row] = await db
    .select()
    .from(schema.summaries)
    .where(
      id
        ? and(eq(schema.summaries.id, id), eq(schema.summaries.userId, user.id))
        : eq(schema.summaries.userId, user.id),
    )
    .orderBy(desc(schema.summaries.createdAt))
    .limit(1);

  if (!row) return { document: DEFAULT_COURSE_DOCUMENT, summary: null };

  const summary = row.payload;
  const chapter = summary.chapter ?? "";
  let document: CourseDocument = {
    fileName: summary.title ? `${summary.title}.pdf` : "",
    sizeLabel: "",
    fileKind: "pdf",
    subject: row.subject,
    level: row.level,
    chapter,
    theme: row.theme,
    pageCount: summary.pagesSummarized ?? 0,
  };

  if (row.documentId) {
    const [doc] = await db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.id, row.documentId))
      .limit(1);
    if (doc && doc.userId === user.id) {
      document = {
        fileName: doc.name,
        sizeLabel: doc.sizeLabel,
        fileKind: doc.fileKind as CourseDocument["fileKind"],
        subject: doc.subject,
        level: doc.level,
        chapter,
        theme: row.theme,
        pageCount: doc.pageCount,
      };
    }
  }

  return { document, summary };
}

/** Type de fichier importé pour un résumé (colonne `documents.fileKind`). */
export type SummarySourceKind = "pdf" | "docx" | "txt" | "image";

export interface SaveCourseSummaryInput {
  userId: string;
  request: SummaryRequest;
  summary: CourseSummary;
  /** Métadonnées du cours importé, ou `null` si le résumé part du seul thème. */
  source: {
    fileName: string;
    fileKind: SummarySourceKind;
    sizeLabel: string;
    pageCount: number;
  } | null;
}

/** `documents.fileKind` (pdf|docx|txt|image) → `activities.fileKind` (pdf|doc). */
function toActivityFileKind(kind: SummarySourceKind | null): "pdf" | "doc" {
  return kind === "pdf" ? "pdf" : "doc";
}

/**
 * Persiste un résumé fraîchement généré par OpenAI, de façon atomique :
 *  - `documents` : le cours importé (si un fichier a servi de source) ;
 *  - `summaries` : le résumé + son `payload` (consommé tel quel par l'UI) ;
 *  - `activities` : la ligne « Résumé prêt » du dashboard / de l'historique.
 *
 * Appelée par `POST /api/ai/summarize` après la génération. `getLatestCourseSummary`
 * relira ensuite ces lignes sans transformation.
 */
export async function saveCourseSummary(
  input: SaveCourseSummaryInput,
): Promise<{ summaryId: string; documentId: string | null }> {
  const { userId, request, summary, source } = input;

  return db.transaction(async (tx) => {
    let documentId: string | null = null;

    if (source) {
      const [doc] = await tx
        .insert(schema.documents)
        .values({
          userId,
          name: source.fileName,
          fileKind: source.fileKind,
          subject: request.subject,
          level: request.level,
          sizeLabel: source.sizeLabel || "—",
          pageCount: source.pageCount,
          hasSummary: true,
        })
        .returning({ id: schema.documents.id });
      documentId = doc?.id ?? null;
    }

    const [row] = await tx
      .insert(schema.summaries)
      .values({
        userId,
        documentId,
        title: summary.title,
        subject: request.subject,
        level: request.level,
        theme: request.theme,
        status: summary.status,
        payload: summary,
      })
      .returning({ id: schema.summaries.id });

    const metaParts = [
      source ? source.fileKind.toUpperCase() : request.subject,
      source && source.pageCount > 0
        ? `${source.pageCount} page${source.pageCount > 1 ? "s" : ""}`
        : summary.pageCountLabel,
    ];

    await tx.insert(schema.activities).values({
      userId,
      title: summary.title,
      meta: metaParts.join(" • "),
      fileKind: toActivityFileKind(source?.fileKind ?? null),
      type: "Résumé",
      statusLabel: "Résumé prêt",
      statusTone: "success",
      actionLabel: "Voir",
      actionHref: "/resumer",
      occurredAt: new Date(),
    });

    return { summaryId: row.id, documentId };
  });
}
