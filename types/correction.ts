/** Verdict d'une question corrigée — pilote la couleur du badge. */
export type CorrectionVerdict = "correct" | "partial" | "incorrect";

/**
 * Étape de la démarche détaillée d'une question (« Formule », « On remplace »,
 * « Calcul », « Analyse du document », « Conclusion »…), choisie par l'IA selon
 * la matière et le type de question.
 */
export interface CorrectionStep {
  label: string;
  content: string;
}

export interface CorrectionQuestion {
  /**
   * Numérotation d'origine de la question sur l'épreuve (« Exercice 2 — 1.a »),
   * quand elle diffère du simple rang. Absente sur les anciennes corrections.
   */
  ref?: string;
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
  /** Démarche détaillée (méthode, données, calculs, conclusion…). */
  steps?: CorrectionStep[];
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
 * Origine de l'épreuve corrigée :
 *  - `eduia` : épreuve générée par EduIA (choisie dans la liste, ou importée et
 *    reconnue automatiquement) — corrigée à partir de son cours d'origine ;
 *  - `external` : épreuve importée d'ailleurs (ancien sujet, photo, PDF…),
 *    corrigée à partir de son contenu et des connaissances générales du modèle.
 *
 * Absente sur les corrections antérieures (ou sans épreuve, copie seule).
 */
export type CorrectionExamSource = "eduia" | "external";

/**
 * Événements de progression de `POST /api/ai/grade` (flux NDJSON, une ligne
 * JSON par événement) : l'analyse de l'épreuve, puis la correction.
 */
export type CorrectionStreamEvent =
  | { type: "stage"; stage: "analyzing" | "correcting" }
  | {
      type: "analysis";
      subject: string;
      level: string | null;
      title: string;
      questionCount: number;
      /** L'épreuve importée a été reconnue comme une épreuve EduIA de l'élève. */
      matchedEduia: boolean;
    }
  | { type: "result"; correction: ExamCorrection }
  | { type: "error"; error: string; code?: string };

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
  /** Origine de l'épreuve (voir `CorrectionExamSource`). */
  examSource?: CorrectionExamSource;
  /**
   * Origine du barème : `exam` = barème indiqué sur l'épreuve (respecté tel
   * quel), `proposed` = aucun barème lisible, répartition proposée par EduIA.
   */
  pointsSource?: "exam" | "proposed";
  /** Avertissement de lecture (page partiellement lisible…), affiché en tête. */
  notice?: string;
  /** Notions importantes à revoir (« Points à retenir »). */
  keyPoints?: string[];
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
  /** Niveau saisi par l'élève ; `""` = détecté automatiquement sur l'épreuve. */
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
