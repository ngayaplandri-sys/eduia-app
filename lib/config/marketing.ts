/**
 * Métadonnées non textuelles de la page d'accueil publique (`app/page.tsx`) :
 * icônes, tons, ancres. Tout le texte vit dans les dictionnaires i18n
 * (`dict.marketing`, voir `lib/i18n/dictionaries/{fr,en}.ts`) pour que la
 * landing bascule réellement de langue — zippé par index avec ces tableaux
 * dans les composants. Les CTA pointent uniquement vers des routes qui
 * existent : `/signup`, `/login`, `/dashboard`.
 */
import {
  FileText,
  FilePenLine,
  ClipboardCheck,
  Target,
  Zap,
  Clock,
  Gift,
  type LucideIcon,
} from "lucide-react";

/** Ancres de la nav principale — même ordre que `dict.marketing.nav`. */
export const marketingNavHrefs = [
  "#accueil",
  "#fonctionnalites",
  "#comment-ca-marche",
  "#tarifs",
  "#a-propos",
] as const;

export type MarketingTone = "success" | "primary" | "warning";

/** Icône + ton des 3 cartes fonctionnalité — même ordre que `dict.marketing.features.items`. */
export const marketingFeatureIcons: { icon: LucideIcon; tone: MarketingTone }[] = [
  { icon: FileText, tone: "success" },
  { icon: FilePenLine, tone: "primary" },
  { icon: ClipboardCheck, tone: "warning" },
];

/**
 * Icônes de la bande d'indicateurs du hero — même ordre que
 * `dict.marketing.stats`. ⚠️ Valeurs qualitatives (pas de « nombre d'élèves »
 * inventé), voir le dictionnaire.
 */
export const marketingStatIcons: LucideIcon[] = [Target, Zap, Clock, Gift];
