/** Verdict d'une question corrigée — pilote la couleur du badge. */
export type CorrectionVerdict = "correct" | "partial" | "incorrect";

export interface CorrectionQuestion {
  prompt: string;
  /** Réponse fournie par l'élève. */
  studentAnswer: string;
  /** Correction attendue / réponse de référence. */
  expectedAnswer: string;
  pointsEarned: number;
  pointsMax: number;
  verdict: CorrectionVerdict;
  /** Explication pédagogique de l'IA sur la réponse. */
  feedback: string;
}

/**
 * Type de rapport :
 *  - `graded` : une copie d'élève a été notée (note, verdict par question) ;
 *  - `answer-key` : corrigé type d'une épreuve générée, produit sans copie
 *    (l'élève sélectionne juste l'épreuve). Pas de note ni de « ta réponse ».
 *
 * Absent sur les corrections enregistrées avant l'introduction du champ → à
 * traiter comme `graded`.
 */
export type CorrectionMode = "graded" | "answer-key";

/**
 * Rapport de correction — présenté comme un véritable bilan pédagogique.
 * Point de bascule : mock aujourd'hui, `lib/ai` (OpenAI) + Supabase demain.
 */
export interface ExamCorrection {
  examTitle: string;
  subject: string;
  level: string;
  theme: string;
  dateLabel: string;
  /** Corrigé type sans copie (`answer-key`) ou copie notée (`graded`, défaut). */
  mode?: CorrectionMode;
  /** Longueur générée du corrigé, en pages (« 4 pages »). */
  pageCountLabel: string;
  /** Note obtenue et barème (ex. 15 / 20). En mode `answer-key`, `score` vaut 0. */
  score: number;
  maxScore: number;
  /** Appréciation courte affichée en badge (« Bien », « Assez bien »…). */
  appreciation: string;
  /** Synthèse d'une phrase sur la copie. */
  summary: string;
  status: "Corrigée" | "En cours";
  questions: CorrectionQuestion[];
  strengths: string[];
  improvements: string[];
  advice: string[];
  correctedBy: string;
  correctedAt: string;
}

/** Une épreuve générée par l'élève, proposée comme référence de correction. */
export interface CorrectionExamOption {
  id: string;
  label: string;
}

export interface CorrectionConfig {
  /** Épreuves de référence disponibles (déroulant). */
  availableExams: CorrectionExamOption[];
  /** `id` de l'épreuve pré-sélectionnée (la plus récente), `""` si aucune. */
  selectedExamId: string;
  questionCount: number;
  subject: string;
  level: string;
  /** Copie pré-jointe (exemple). */
  answerFileName: string;
  answerFileSize: string;
}

/**
 * Requête de correction envoyée au moteur IA. Construite par le panneau de
 * config ; consommée plus tard par `lib/ai/gradeExam()`.
 */
export interface CorrectionRequest {
  /** Libellé de l'épreuve de référence (affichage + titre du corrigé). */
  selectedExam: string;
  /** `id` de l'épreuve de référence en base — sert à charger son corrigé. `""` si aucune. */
  selectedExamId: string;
  level: string;
  answerFileName: string | null;
  /** Nature de la copie importée (« image », « pdf », « txt »…). */
  answerSourceKind: string | null;
  /** Réponses saisies manuellement dans la zone de texte. */
  answerText: string;
  /**
   * Contenu de la copie exploitable par l'IA : extrait par OCR pour une image,
   * lu directement pour un TXT, `null` pour un PDF/DOCX (extraction à venir).
   */
  answerSourceText: string | null;
  scale: string;
  strictness: string;
  /** Nombre de pages souhaité pour le corrigé (« 4 pages »). */
  pageCount: string;
  options: Record<string, boolean>;
}
