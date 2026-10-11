/**
 * Type de fichier importé — pilote l'icône colorée et le libellé.
 * `image` : cours photographié, dont le texte est extrait par OCR
 * (voir `SummarySourceKind` dans `lib/data/summary.ts`).
 */
export type DocumentFileKind = "pdf" | "docx" | "txt" | "image";

/**
 * Fichier d'origine conservé dans le stockage privé (Vercel Blob). `pathname`
 * n'est jamais envoyé au navigateur : le téléchargement passe par
 * `/api/documents/[id]/files/[index]`, qui vérifie le propriétaire.
 */
export interface StoredDocumentFile {
  pathname: string;
  /** Nom affiché (celui du fichier importé par l'élève). */
  name: string;
  contentType: string;
  /** Taille en octets. */
  size: number;
}

export interface DocumentFile {
  id: string;
  name: string;
  fileKind: DocumentFileKind;
  subject: string;
  level: string;
  sizeLabel: string;
  pageCount: number;
  /** Date ISO 8601 d'import. */
  uploadedAt: string;
  /** `true` si au moins un résumé a déjà été généré depuis ce document. */
  hasSummary: boolean;
  /** Résumé associé à ouvrir (`/resumer?id=…`), ou `null` si aucun n'existe encore. */
  summaryId: string | null;
  /**
   * Fichiers d'origine téléchargeables, dans l'ordre d'import (l'index sert
   * d'identifiant dans l'URL de téléchargement). Vide pour un document importé
   * avant la mise en place du stockage, ou quand l'espace était plein.
   */
  files: { name: string; size: number }[];
}

/** Compteurs affichés au-dessus de la bibliothèque. */
export interface DocumentStats {
  totalCount: number;
  storageUsedLabel: string;
  storageTotalLabel: string;
  /** Ratio d'espace utilisé, entre 0 et 1. */
  storageUsedRatio: number;
  summariesGenerated: number;
}
