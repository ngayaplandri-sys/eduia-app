/**
 * Options communes aux trois outils IA (Résumer / Générer / Corriger).
 * Centralisé ici pour éviter les listes dupliquées d'un panneau à l'autre.
 */

/**
 * Matières proposées à l'onboarding (nuage de pastilles) et dans le filtre de la
 * bibliothèque de documents. Les outils de génération (Résumer / Générer /
 * Corriger) laissent l'élève saisir librement sa matière — cette liste ne les
 * contraint pas.
 */
export const SUBJECTS = [
  "Histoire",
  "Géographie",
  "Français",
  "Philosophie",
  "Mathématiques",
  "Physique-Chimie",
  "SVT",
  "SES",
  "Anglais",
] as const;

export const EXAM_DURATIONS = ["45 min", "1h", "1h30", "2h", "3h"] as const;

export const EXAM_TYPES = [
  "Devoir surveillé",
  "Contrôle continu",
  "Bac blanc",
  "Entraînement",
] as const;

export const EXAM_QUESTION_MIX = [
  "QCM",
  "Questions ouvertes",
  "Vrai / Faux",
  "Mixte",
] as const;

export const EXAM_QUESTION_COUNTS = [10, 15, 20, 25, 30] as const;

export const SUMMARY_STYLES = [
  "Résumé clair",
  "Résumé détaillé",
  "Fiche de révision",
] as const;

export const SUMMARY_DETAIL_LEVELS = [
  "Essentiel",
  "Standard",
  "Approfondi",
] as const;

/**
 * Nombre de pages souhaité pour le document généré (résumé, épreuve, corrigé).
 * L'utilisateur choisit la longueur ; l'IA vise ce nombre de pages.
 */
export const PAGE_COUNTS = [
  "1 page",
  "2 pages",
  "3 pages",
  "4 pages",
  "5 pages",
  "6 pages",
  "8 pages",
  "10 pages",
] as const;

export const GRADING_SCALES = ["/20", "/10", "Barème de l'épreuve"] as const;

export const GRADING_STRICTNESS = ["Indulgent", "Standard", "Strict"] as const;
export type GradingStrictness = (typeof GRADING_STRICTNESS)[number];
