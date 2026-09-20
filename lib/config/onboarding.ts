import {
  BookOpen,
  RotateCcw,
  TrendingUp,
  GraduationCap,
  PenLine,
  FileText,
  MessageSquareText,
  Dumbbell,
  ListChecks,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

/**
 * Options du parcours d'accueil (`/onboarding`). Seuls l'`id` (stable, stocké en
 * base) et l'icône vivent ici ; les libellés / descriptions sont traduits dans
 * `lib/i18n/dictionaries` (`onboarding.goals` / `onboarding.styles`), clés par `id`.
 */
export interface OnboardingChoice<TId extends string = string> {
  id: TId;
  icon: LucideIcon;
}

export const ONBOARDING_GOAL_IDS = [
  "comprendre",
  "reviser",
  "notes",
  "examen",
  "devoirs",
] as const;
export type OnboardingGoalId = (typeof ONBOARDING_GOAL_IDS)[number];

export const ONBOARDING_GOALS: OnboardingChoice<OnboardingGoalId>[] = [
  { id: "comprendre", icon: BookOpen },
  { id: "reviser", icon: RotateCcw },
  { id: "notes", icon: TrendingUp },
  { id: "examen", icon: GraduationCap },
  { id: "devoirs", icon: PenLine },
];

export const LEARNING_STYLE_IDS = [
  "resume",
  "explications",
  "exercices",
  "qcm",
  "quiz",
] as const;
export type LearningStyleId = (typeof LEARNING_STYLE_IDS)[number];

export const LEARNING_STYLES: OnboardingChoice<LearningStyleId>[] = [
  { id: "resume", icon: FileText },
  { id: "explications", icon: MessageSquareText },
  { id: "exercices", icon: Dumbbell },
  { id: "qcm", icon: ListChecks },
  { id: "quiz", icon: HelpCircle },
];

/**
 * Libellés français des `id` d'onboarding — pour l'espace admin (`/admin`), qui
 * reste en français. L'app élève passe par `lib/i18n/dictionaries` (`onboarding`).
 */
export const ONBOARDING_GOAL_LABELS_FR: Record<OnboardingGoalId, string> = {
  comprendre: "Comprendre mes cours",
  reviser: "Réviser efficacement",
  notes: "Améliorer mes notes",
  examen: "Préparer un examen",
  devoirs: "Faire mes devoirs",
};

export const LEARNING_STYLE_LABELS_FR: Record<LearningStyleId, string> = {
  resume: "Des résumés",
  explications: "Des explications détaillées",
  exercices: "Des exercices",
  qcm: "Des QCM",
  quiz: "Des quiz interactifs",
};
