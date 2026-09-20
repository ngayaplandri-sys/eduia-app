export interface SummaryBullet {
  /** Préfixe mis en gras (ex. « 1939 : »). */
  lead?: string;
  text: string;
}

export interface SummarySection {
  heading: string;
  paragraphs?: string[];
  bullets?: SummaryBullet[];
}

export interface SummaryDefinition {
  term: string;
  definition: string;
}

/**
 * Résumé de cours structuré — présenté comme une véritable fiche pédagogique.
 * Point de bascule : renvoyé aujourd'hui par un mock, demain par `lib/ai` (OpenAI)
 * + persistance Supabase, sans changer cette forme.
 */
export interface CourseSummary {
  /** Titre affiché en tête du document. */
  title: string;
  subject: string;
  level: string;
  /**
   * Chapitre du cours, saisi librement par l'élève (« La digestion »).
   * Optionnel : absent des résumés générés avant l'ajout du champ.
   */
  chapter?: string;
  /** Thème du cours, saisi librement par l'élève (« L'absorption des nutriments »). */
  theme: string;
  /** Libellé du style choisi (« Résumé clair »…). */
  styleLabel: string;
  /** Longueur générée, en pages (« 3 pages »). */
  pageCountLabel: string;
  status: "Prêt" | "En cours";
  sections: SummarySection[];
  /** Notions / formules clés à retenir. */
  keyConcepts: string[];
  /** Définitions importantes. */
  definitions: SummaryDefinition[];
  /** Points clés à retenir. */
  keyPoints: string[];
  generatedBy: string;
  generatedAt: string;
  pagesSummarized: number;
}

export interface CourseDocument {
  fileName: string;
  sizeLabel: string;
  /** Aligné sur `DocumentFileKind` (`documents.fileKind`), OCR d'image compris. */
  fileKind: "pdf" | "docx" | "txt" | "image";
  subject: string;
  level: string;
  /** Chapitre saisi lors du dernier résumé (vide pour un compte neuf). */
  chapter: string;
  /** Thème saisi lors du dernier résumé (vide pour un compte neuf). */
  theme: string;
  pageCount: number;
}

/**
 * Requête de résumé envoyée au moteur IA. Construite par le panneau de config ;
 * consommée plus tard par `lib/ai/summarizeCourse()`.
 */
export interface SummaryRequest {
  fileName: string | null;
  /** Nature du fichier importé (« image », « pdf », « txt »…). */
  sourceKind: string | null;
  /**
   * Contenu texte exploitable par l'IA : extrait par OCR pour une image, lu
   * directement pour un TXT, `null` pour un PDF/DOCX (extraction à venir).
   */
  sourceText: string | null;
  subject: string;
  level: string;
  /** Chapitre du cours, saisi librement (peut être vide). */
  chapter: string;
  /** Thème du cours, saisi librement (peut être vide). */
  theme: string;
  style: string;
  /** Nombre de pages souhaité pour le résumé (« 3 pages »). */
  pageCount: string;
  detailLevel: string;
  options: Record<string, boolean>;
}
