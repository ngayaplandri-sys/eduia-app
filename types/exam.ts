export type ExamQuestionKind = "qcm" | "open" | "truefalse";

export interface ExamChoice {
  letter: string;
  text: string;
  /** Bonne réponse — utilisé par le corrigé / la correction, jamais affiché sur la copie vierge. */
  correct: boolean;
}

export interface ExamStatement {
  text: string;
  isTrue: boolean;
}

export interface ExamQuestion {
  kind: ExamQuestionKind;
  prompt: string;
  points: number;
  /** QCM uniquement. */
  choices?: ExamChoice[];
  /** Question ouverte — sous-questions numérotées. */
  subQuestions?: string[];
  /** Question ouverte — éléments de réponse attendus (corrigé). */
  expectedAnswer?: string;
  /** Vrai / Faux — affirmations à trancher. */
  statements?: ExamStatement[];
}

export interface ExamPart {
  /** « PARTIE 1 : QCM ». */
  title: string;
  points: number;
  instructions?: string;
  questions: ExamQuestion[];
}

/**
 * Épreuve générée — présentée comme un document imprimable.
 * Point de bascule : mock aujourd'hui, `lib/ai` (OpenAI) + Supabase demain.
 */
export interface GeneratedExam {
  /** Titre du document (« ÉPREUVE D'HISTOIRE »). */
  title: string;
  subject: string;
  level: string;
  /** Chapitre / thème. */
  theme: string;
  /** Type d'épreuve (« Devoir surveillé »…). */
  examType: string;
  durationLabel: string;
  /** Longueur générée, en pages (« 3 pages »). */
  pageCountLabel: string;
  questionCount: number;
  /** Date affichée sur l'épreuve (« 27 mai 2026 »). */
  dateLabel: string;
  parts: ExamPart[];
  totalPoints: number;
  status: "Prête" | "En cours";
  generatedBy: string;
  generatedAt: string;
}

export interface ExamConfig {
  subject: string;
  level: string;
  /** Chapitre / thème, saisi librement par l'élève (peut être vide). */
  theme: string;
  examType: string;
  questionCount: number;
  questionMix: string;
  durationLabel: string;
}

/**
 * Requête de génération d'épreuve envoyée au moteur IA. Construite par le panneau
 * de config ; consommée plus tard par `lib/ai/generateExam()`.
 */
export interface ExamRequest {
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
  theme: string;
  examType: string;
  questionCount: number;
  questionMix: string;
  durationLabel: string;
  /** Nombre de pages souhaité pour l'épreuve (« 3 pages »). */
  pageCount: string;
  options: Record<string, boolean>;
}
