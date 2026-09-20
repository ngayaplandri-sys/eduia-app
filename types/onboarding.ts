/** Réponses collectées par le parcours d'accueil (`/onboarding`). */
export interface OnboardingAnswers {
  firstName: string;
  schoolLevel: string;
  /** Matières principales de l'utilisateur (sélection multiple). */
  subjects: string[];
  /** Identifiant d'objectif — voir `ONBOARDING_GOAL_IDS` dans `lib/config/onboarding.ts`. */
  goal: string;
  /** Matières dans lesquelles l'utilisateur veut progresser en priorité. */
  improveSubjects: string[];
  /** Identifiant de préférence d'apprentissage — voir `LEARNING_STYLE_IDS`. */
  learningStyle: string;
}
