/**
 * Liste unique des niveaux / classes proposés par le champ « Niveau / Classe ».
 *
 * Source de vérité partagée par les trois outils (Résumer un cours, Générer une
 * épreuve, Corriger une épreuve) pour garantir une interface cohérente.
 */
export const SCHOOL_LEVELS = [
  "4e",
  "3e",
  "Seconde",
  "Première",
  "Terminale",
  "Licence",
] as const;

export type SchoolLevel = (typeof SCHOOL_LEVELS)[number];

/** Niveau retenu par défaut dans les sélecteurs et les données de démonstration. */
export const DEFAULT_SCHOOL_LEVEL: SchoolLevel = "Terminale";
