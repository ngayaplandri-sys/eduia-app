import "server-only";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { SearchResultItem } from "@/types";
import { getCurrentUser } from "./user";

/** Résultats max par catégorie (documents / résumés / épreuves / corrections). */
const LIMIT_PER_TYPE = 6;

/**
 * Recherche dans tout ce que l'utilisateur connecté a importé ou généré :
 * documents importés, résumés, épreuves et corrections. Chaque catégorie est
 * filtrée sur ses propres colonnes texte (titre/nom, matière, niveau,
 * thème), scopée au compte (`userId`), et limitée pour rester rapide même
 * avec un historique volumineux. `[]` si personne n'est connecté ou si la
 * requête est trop courte pour être pertinente.
 */
export async function searchLibrary(query: string): Promise<SearchResultItem[]> {
  const user = await getCurrentUser();
  const q = query.trim();
  if (!user || q.length < 2) return [];

  const like = `%${q}%`;

  const [documentRows, summaryRows, examRows, correctionRows] = await Promise.all([
    db
      .select({
        id: schema.documents.id,
        name: schema.documents.name,
        subject: schema.documents.subject,
        level: schema.documents.level,
        uploadedAt: schema.documents.uploadedAt,
      })
      .from(schema.documents)
      .where(
        and(
          eq(schema.documents.userId, user.id),
          or(
            ilike(schema.documents.name, like),
            ilike(schema.documents.subject, like),
            ilike(schema.documents.level, like),
          ),
        ),
      )
      .orderBy(desc(schema.documents.uploadedAt))
      .limit(LIMIT_PER_TYPE),
    db
      .select({
        id: schema.summaries.id,
        title: schema.summaries.title,
        subject: schema.summaries.subject,
        level: schema.summaries.level,
        theme: schema.summaries.theme,
        createdAt: schema.summaries.createdAt,
      })
      .from(schema.summaries)
      .where(
        and(
          eq(schema.summaries.userId, user.id),
          or(
            ilike(schema.summaries.title, like),
            ilike(schema.summaries.subject, like),
            ilike(schema.summaries.level, like),
            ilike(schema.summaries.theme, like),
          ),
        ),
      )
      .orderBy(desc(schema.summaries.createdAt))
      .limit(LIMIT_PER_TYPE),
    db
      .select({
        id: schema.exams.id,
        title: schema.exams.title,
        subject: schema.exams.subject,
        level: schema.exams.level,
        theme: schema.exams.theme,
        createdAt: schema.exams.createdAt,
      })
      .from(schema.exams)
      .where(
        and(
          eq(schema.exams.userId, user.id),
          or(
            ilike(schema.exams.title, like),
            ilike(schema.exams.subject, like),
            ilike(schema.exams.level, like),
            ilike(schema.exams.theme, like),
          ),
        ),
      )
      .orderBy(desc(schema.exams.createdAt))
      .limit(LIMIT_PER_TYPE),
    db
      .select({
        id: schema.corrections.id,
        examTitle: schema.corrections.examTitle,
        subject: schema.corrections.subject,
        level: schema.corrections.level,
        createdAt: schema.corrections.createdAt,
      })
      .from(schema.corrections)
      .where(
        and(
          eq(schema.corrections.userId, user.id),
          or(
            ilike(schema.corrections.examTitle, like),
            ilike(schema.corrections.subject, like),
            ilike(schema.corrections.level, like),
          ),
        ),
      )
      .orderBy(desc(schema.corrections.createdAt))
      .limit(LIMIT_PER_TYPE),
  ]);

  const results: SearchResultItem[] = [
    ...documentRows.map((row): SearchResultItem => ({
      id: row.id,
      type: "document",
      title: row.name,
      subject: row.subject,
      level: row.level,
      date: row.uploadedAt.toISOString(),
      href: `/documents?q=${encodeURIComponent(row.name)}`,
    })),
    ...summaryRows.map((row): SearchResultItem => ({
      id: row.id,
      type: "summary",
      title: row.title,
      subject: row.subject,
      level: row.level,
      date: row.createdAt.toISOString(),
      href: `/resumer?id=${row.id}`,
    })),
    ...examRows.map((row): SearchResultItem => ({
      id: row.id,
      type: "exam",
      title: row.title,
      subject: row.subject,
      level: row.level,
      date: row.createdAt.toISOString(),
      href: `/generer?id=${row.id}`,
    })),
    ...correctionRows.map((row): SearchResultItem => ({
      id: row.id,
      type: "correction",
      title: row.examTitle,
      subject: row.subject,
      level: row.level,
      date: row.createdAt.toISOString(),
      href: `/corriger?id=${row.id}`,
    })),
  ];

  results.sort((a, b) => b.date.localeCompare(a.date));
  return results;
}
