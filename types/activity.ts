/** Nature d'une activité — pilote la couleur du badge « Type ». */
export type ActivityType = "Résumé" | "Épreuve" | "Correction";

/** Type de fichier source — pilote l'icône colorée dans la colonne « Élément ». */
export type ActivityFileKind = "pdf" | "doc" | "exam" | "correction";

/**
 * Statut d'une activité.
 * - `label` : texte affiché dans le badge (« Résumé prêt », « 16/20 »…)
 * - `tone`  : couleur du badge
 */
export interface ActivityStatus {
  label: string;
  tone: "success" | "info" | "warning" | "neutral" | "primary";
}

/** Action disponible sur une ligne d'activité (bouton principal du tableau). */
export interface ActivityAction {
  label: string;
  href: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  /** Sous-ligne grise : « PDF • 12 pages », « Terminale S • Histoire »… */
  meta: string;
  fileKind: ActivityFileKind;
  type: ActivityType;
  /** Date ISO 8601. */
  date: string;
  status: ActivityStatus;
  action: ActivityAction;
}
