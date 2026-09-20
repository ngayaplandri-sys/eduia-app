/**
 * Type de fichier importé — pilote l'icône colorée et le libellé.
 * `image` : cours photographié, dont le texte est extrait par OCR
 * (voir `SummarySourceKind` dans `lib/data/summary.ts`).
 */
export type DocumentFileKind = "pdf" | "docx" | "txt" | "image";

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
