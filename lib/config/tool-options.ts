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
  // Supérieur (licence, BTS, grandes écoles…).
  "Droit",
  "Économie",
  "Gestion",
  "Comptabilité",
  "Marketing",
  "Informatique",
  "Statistiques",
  "Médecine",
  "Psychologie",
  "Sociologie",
] as const;

/**
 * Matière ajoutée par l'utilisateur à l'onboarding (« + Ajouter une matière »)
 * quand elle n'est pas dans `SUBJECTS` : enregistrée telle quelle, à côté des
 * matières proposées. Mêmes règles côté navigateur et côté serveur.
 */
export const CUSTOM_SUBJECT_MIN_LENGTH = 2;
export const CUSTOM_SUBJECT_MAX_LENGTH = 40;
/** Nombre maximal de matières ajoutées par un même utilisateur. */
export const CUSTOM_SUBJECT_MAX_COUNT = 10;
/** Lettres (tous alphabets), chiffres, espaces et ponctuation courante. */
export const SUBJECT_NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{M}\p{N} '’&()+.,/-]*$/u;

/** Espaces superflus retirés : « Droit   des affaires » → « Droit des affaires ». */
export function normalizeSubjectName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

/** Clé de comparaison sans casse ni accents (« economie » = « Économie »). */
export function subjectKey(name: string): string {
  return normalizeSubjectName(name)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("fr");
}

export function isValidSubjectName(name: string): boolean {
  const value = normalizeSubjectName(name);
  return (
    value.length >= CUSTOM_SUBJECT_MIN_LENGTH &&
    value.length <= CUSTOM_SUBJECT_MAX_LENGTH &&
    SUBJECT_NAME_PATTERN.test(value)
  );
}

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

/**
 * Barème total de l'épreuve générée. 20 par défaut (`EXAM_DEFAULT_TOTAL_POINTS`) :
 * la somme des points de toutes les questions est ramenée EXACTEMENT à ce total
 * côté serveur (`balanceExamPoints`).
 */
export const EXAM_TOTAL_POINTS = [10, 20, 40, 50, 100] as const;
export const EXAM_DEFAULT_TOTAL_POINTS = 20;

/** Difficulté globale. « Progressive » : facile → moyen → difficile. */
export const EXAM_DIFFICULTIES = [
  "Progressive",
  "Facile",
  "Moyenne",
  "Difficile",
] as const;

/** Langue de rédaction de l'épreuve (par défaut, celle de l'application). */
export const EXAM_LANGUAGES = ["fr", "en"] as const;

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
