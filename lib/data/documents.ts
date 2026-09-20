import "server-only";
import { desc, eq, isNotNull, and } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { DocumentRow } from "@/lib/db/schema";
import type { DocumentFile, DocumentFileKind, DocumentStats } from "@/types";
import { getCurrentUser } from "./user";

/** Quota de stockage affiché tant qu'un vrai stockage de blobs n'est pas branché. */
const STORAGE_TOTAL_MO = 200;

/** « 12.4 Mo », « 60,9 Mo », « 0.3 Mo » → valeur en Mo. */
function parseSizeToMo(label: string): number {
  const match = label.trim().match(/([\d.,]+)\s*(Ko|Mo|Go)/i);
  if (!match) return 0;
  const value = Number.parseFloat(match[1].replace(",", "."));
  if (!Number.isFinite(value)) return 0;
  const unit = match[2].toLowerCase();
  if (unit === "ko") return value / 1024;
  if (unit === "go") return value * 1024;
  return value;
}

function formatMo(value: number): string {
  return `${value.toFixed(1).replace(".", ",")} Mo`;
}

function toDocumentFile(
  row: DocumentRow,
  summaryIdByDocument: Map<string, string>,
): DocumentFile {
  return {
    id: row.id,
    name: row.name,
    fileKind: row.fileKind as DocumentFileKind,
    subject: row.subject,
    level: row.level,
    sizeLabel: row.sizeLabel,
    pageCount: row.pageCount,
    uploadedAt: row.uploadedAt.toISOString(),
    // Dérivé du lien réel vers `summaries`, pas de la colonne `hasSummary`
    // (déclarative, peut se désynchroniser — ex. données de seed/démo) :
    // le badge et le bouton « Ouvrir » ne doivent jamais promettre un
    // contenu qui n'existe pas réellement.
    hasSummary: summaryIdByDocument.has(row.id),
    summaryId: summaryIdByDocument.get(row.id) ?? null,
  };
}

function computeStats(
  documents: DocumentFile[],
  summariesGenerated: number,
): DocumentStats {
  const usedMo = documents.reduce(
    (total, doc) => total + parseSizeToMo(doc.sizeLabel),
    0,
  );

  return {
    totalCount: documents.length,
    storageUsedLabel: formatMo(usedMo),
    storageTotalLabel: `${STORAGE_TOTAL_MO} Mo`,
    storageUsedRatio: Math.min(1, usedMo / STORAGE_TOTAL_MO),
    summariesGenerated,
  };
}

/**
 * Bibliothèque de documents de l'utilisateur connecté (+ compteurs), triée par
 * date d'import décroissante. Vide si personne n'est connecté ou si le compte
 * n'a encore rien importé.
 */
export async function getDocuments(): Promise<{
  documents: DocumentFile[];
  stats: DocumentStats;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return { documents: [], stats: computeStats([], 0) };
  }

  const [rows, summaries, linkedSummaries] = await Promise.all([
    db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.userId, user.id))
      .orderBy(desc(schema.documents.uploadedAt)),
    db
      .select({ id: schema.summaries.id })
      .from(schema.summaries)
      .where(eq(schema.summaries.userId, user.id)),
    db
      .select({
        id: schema.summaries.id,
        documentId: schema.summaries.documentId,
      })
      .from(schema.summaries)
      .where(
        and(
          eq(schema.summaries.userId, user.id),
          isNotNull(schema.summaries.documentId),
        ),
      )
      .orderBy(desc(schema.summaries.createdAt)),
  ]);

  // En cas de doublon (plusieurs résumés liés au même document), le plus
  // récent gagne : `linkedSummaries` est déjà trié par date décroissante.
  const summaryIdByDocument = new Map<string, string>();
  for (const row of linkedSummaries) {
    if (row.documentId && !summaryIdByDocument.has(row.documentId)) {
      summaryIdByDocument.set(row.documentId, row.id);
    }
  }

  const documents = rows.map((row) => toDocumentFile(row, summaryIdByDocument));
  return { documents, stats: computeStats(documents, summaries.length) };
}
