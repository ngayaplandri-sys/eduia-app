import "server-only";
import { desc, eq, isNotNull, and, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { DocumentRow } from "@/lib/db/schema";
import type {
  DocumentFile,
  DocumentFileKind,
  DocumentStats,
  StoredDocumentFile,
} from "@/types";
import { storageFileName } from "@/lib/uploads/shared";
import {
  deleteStoredFiles,
  isBlobConfigured,
  putPrivateFile,
} from "@/lib/uploads/server";
import { getCurrentUser } from "./user";

/** Espace de stockage des fichiers d'origine, par élève. */
const STORAGE_TOTAL_MO = 200;
const STORAGE_QUOTA_BYTES = STORAGE_TOTAL_MO * 1024 * 1024;

/** Longueur maximale d'un nom de document (renommage). */
const MAX_NAME_LENGTH = 160;

function formatMo(value: number): string {
  return `${value.toFixed(1).replace(".", ",")} Mo`;
}

function storedBytes(files: StoredDocumentFile[]): number {
  return files.reduce((total, file) => total + file.size, 0);
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
    files: row.files.map((file) => ({ name: file.name, size: file.size })),
  };
}

/** Compteurs de la bibliothèque : l'espace utilisé est celui réellement occupé par les fichiers conservés. */
function computeStats(
  rows: DocumentRow[],
  summariesGenerated: number,
): DocumentStats {
  const usedMo =
    rows.reduce((total, row) => total + storedBytes(row.files), 0) / (1024 * 1024);

  return {
    totalCount: rows.length,
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
  return { documents, stats: computeStats(rows, summaries.length) };
}

/** Fichier d'origine à conserver avec un document (contenu déjà en mémoire). */
export interface DocumentOriginal {
  name: string;
  contentType: string;
  bytes: Buffer;
}

/**
 * Conserve les fichiers d'origine d'un document dans le stockage privé
 * (`documents/<userId>/<documentId>/<n°>/<nom>`) et les enregistre dans `files`.
 * Au mieux : sans stockage configuré, au-delà du quota de l'élève ou en cas
 * d'échec, le document reste simplement sans fichier téléchargeable — le
 * résumé, lui, est déjà enregistré. Ne lève jamais.
 */
export async function storeDocumentOriginals(
  userId: string,
  documentId: string,
  originals: DocumentOriginal[],
): Promise<void> {
  if (originals.length === 0 || !isBlobConfigured()) return;

  const stored: StoredDocumentFile[] = [];
  try {
    const usage = await db.execute(sql`
      SELECT coalesce(sum((f->>'size')::bigint), 0) AS bytes
      FROM documents d, jsonb_array_elements(d.files) f
      WHERE d.user_id = ${userId}
    `);
    const usedBytes = Number((usage.rows[0] as { bytes?: unknown } | undefined)?.bytes ?? 0);
    const incoming = originals.reduce((total, file) => total + file.bytes.length, 0);
    if (usedBytes + incoming > STORAGE_QUOTA_BYTES) {
      console.warn("[documents] espace plein : fichier d'origine non conservé", { userId });
      return;
    }

    for (const [index, original] of originals.entries()) {
      const pathname = `documents/${userId}/${documentId}/${index + 1}/${storageFileName(original.name)}`;
      await putPrivateFile(pathname, original.bytes, original.contentType);
      stored.push({
        pathname,
        name: original.name,
        contentType: original.contentType,
        size: original.bytes.length,
      });
    }

    await db
      .update(schema.documents)
      .set({ files: stored })
      .where(and(eq(schema.documents.id, documentId), eq(schema.documents.userId, userId)));
  } catch (error) {
    console.error("[documents] conservation du fichier d'origine impossible :", (error as Error)?.message);
    await deleteStoredFiles(stored.map((file) => file.pathname));
  }
}

/** Fichier d'origine `index` d'un document de `userId`, ou `null` (absent ou d'un autre compte). */
export async function getStoredDocumentFile(
  userId: string,
  documentId: string,
  index: number,
): Promise<StoredDocumentFile | null> {
  const [row] = await db
    .select({ files: schema.documents.files })
    .from(schema.documents)
    .where(and(eq(schema.documents.id, documentId), eq(schema.documents.userId, userId)))
    .limit(1);
  return row?.files[index] ?? null;
}

/** Renomme un document de `userId`. `false` si le nom est vide ou le document introuvable. */
export async function renameUserDocument(
  userId: string,
  documentId: string,
  name: string,
): Promise<boolean> {
  const next = name.trim().slice(0, MAX_NAME_LENGTH);
  if (!next) return false;
  const updated = await db
    .update(schema.documents)
    .set({ name: next })
    .where(and(eq(schema.documents.id, documentId), eq(schema.documents.userId, userId)))
    .returning({ id: schema.documents.id });
  return updated.length > 0;
}

/**
 * Supprime un document de `userId` et ses fichiers d'origine. Les résumés
 * générés depuis ce document sont conservés (`documentId` passe à `null`).
 */
export async function deleteUserDocument(
  userId: string,
  documentId: string,
): Promise<boolean> {
  const deleted = await db
    .delete(schema.documents)
    .where(and(eq(schema.documents.id, documentId), eq(schema.documents.userId, userId)))
    .returning({ files: schema.documents.files });
  if (deleted.length === 0) return false;
  await deleteStoredFiles(deleted.flatMap((row) => row.files.map((file) => file.pathname)));
  return true;
}
