export type ExamQuestionKind = "qcm" | "open" | "truefalse";

/** Langue de rédaction d'une épreuve (contenu ET intitulés du document). */
export type ExamLanguage = "fr" | "en";

/** Palier de difficulté d'une question (progression facile → difficile). */
export type ExamQuestionDifficulty = "easy" | "medium" | "hard";

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
  /** Question ouverte — sous-questions (affichées a, b, c…). */
  subQuestions?: string[];
  /** Question ouverte — éléments de réponse attendus (corrigé). */
  expectedAnswer?: string;
  /** Vrai / Faux — affirmations à trancher. */
  statements?: ExamStatement[];
  /**
   * Nombre de lignes de l'espace réponse sur la copie (0 = aucun : QCM,
   * Vrai/Faux). Absent des épreuves générées avant la structure A/B/C/D.
   */
  answerLines?: number;
  difficulty?: ExamQuestionDifficulty;
}

/** Tableau de données d'un document à analyser. */
export interface ExamDocumentTable {
  columns: string[];
  rows: string[][];
}

/** Document / support à analyser (texte, données, situation…), tiré du cours. */
export interface ExamDocument {
  title?: string;
  /** Texte du document (extrait, situation, consigne de lecture…). */
  content?: string;
  table?: ExamDocumentTable;
  /** Provenance (« D'après le cours », référence citée dans le cours…). */
  source?: string;
}

export interface ExamPart {
  /**
   * Titre de la partie, sans sa lettre (« Connaissances et compréhension ») :
   * « PARTIE A », « PARTIE B »… sont ajoutés à l'affichage. Les épreuves plus
   * anciennes contiennent encore « PARTIE 1 : QCM », nettoyé au rendu.
   */
  title: string;
  points: number;
  instructions?: string;
  /** Documents / supports à exploiter dans cette partie (partie C surtout). */
  documents?: ExamDocument[];
  questions: ExamQuestion[];
}

/**
 * Épreuve générée — présentée comme un document imprimable.
 * Point de bascule : mock aujourd'hui, `lib/ai` (OpenAI) + Supabase demain.
 */
export interface GeneratedExam {
  /** Titre de l'évaluation (« Évaluation de SVT »). */
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
  /**
   * Langue de rédaction : les intitulés du document (« PARTIE A », « Durée »…)
   * la suivent. Absente des épreuves plus anciennes → langue de l'interface.
   */
  language?: ExamLanguage;
  /** Établissement, affiché dans l'en-tête s'il a été renseigné. */
  institution?: string;
  /** Consignes générales en tête de l'épreuve. */
  generalInstructions?: string[];
  /** Difficulté globale demandée (« Progressive »…). */
  difficulty?: string;
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
  /** Barème total de la dernière épreuve (20 par défaut). */
  totalPoints?: number;
  /** Établissement de la dernière épreuve, repris pour la suivante. */
  institution?: string;
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
  /** Barème total exact de l'épreuve (20 par défaut). */
  totalPoints: number;
  /** Difficulté globale (`EXAM_DIFFICULTIES`). */
  difficulty: string;
  /** Langue de rédaction de l'épreuve. */
  language: ExamLanguage;
  /** Établissement (facultatif, peut être vide). */
  institution: string;
}
