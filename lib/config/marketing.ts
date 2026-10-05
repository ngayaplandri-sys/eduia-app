/**
 * Métadonnées non textuelles de la page d'accueil publique (`app/page.tsx`) :
 * icônes, tons, ancres, médias. Tout le texte vit dans les dictionnaires i18n
 * (`dict.marketing`, voir `lib/i18n/dictionaries/{fr,en}.ts`) pour que la
 * landing bascule réellement de langue : ces tableaux sont associés par index
 * aux listes du dictionnaire dans les composants. Les CTA pointent uniquement
 * vers des routes qui existent : `/signup`, `/login`, `/dashboard`, `/premium`.
 */
import {
  Atom,
  BadgeCheck,
  BookOpenText,
  Brain,
  Calculator,
  ClipboardCheck,
  Clock,
  Earth,
  FilePenLine,
  FileText,
  FileUp,
  Gift,
  Landmark,
  Languages,
  Leaf,
  ListTree,
  MonitorSmartphone,
  Repeat,
  Scale,
  Shapes,
  Target,
  Timer,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Ancres de la nav principale, même ordre que `dict.marketing.nav`. */
export const marketingNavHrefs = [
  "#accueil",
  "#fonctionnalites",
  "#comment-ca-marche",
  "#tarifs",
  "#a-propos",
] as const;

/**
 * Repères invisibles posés dans la page, observés par l'en-tête pour changer
 * d'apparence sans écouteur de scroll (voir `landing-header.tsx`).
 */
export const LANDING_TOP_SENTINEL = "landing-top";
export const LANDING_HERO_END_SENTINEL = "landing-hero-end";
export const LANDING_BOTTOM_SENTINEL = "landing-bottom";

/** Tons sémantiques du design system réutilisés sur la landing. */
export type MarketingTone = "primary" | "success" | "warning" | "info" | "danger";

/**
 * Icônes de la bande d'indicateurs sous le hero, même ordre que
 * `dict.marketing.stats`. Valeurs qualitatives (aucun « nombre d'élèves »
 * inventé), voir le dictionnaire.
 */
export const marketingStatIcons: LucideIcon[] = [Target, Zap, Clock, Gift];

/** Étapes du parcours « Cours → … → Progression », même ordre que `features.steps`. */
export const marketingJourneyIcons: { icon: LucideIcon; tone: MarketingTone }[] = [
  { icon: FileUp, tone: "primary" },
  { icon: FileText, tone: "success" },
  { icon: FilePenLine, tone: "primary" },
  { icon: ClipboardCheck, tone: "warning" },
  { icon: TrendingUp, tone: "info" },
];

/** Matières, même ordre que `dict.marketing.subjects.items`. */
export const marketingSubjects: { icon: LucideIcon; tone: MarketingTone }[] = [
  { icon: Calculator, tone: "primary" },
  { icon: Atom, tone: "info" },
  { icon: Leaf, tone: "success" },
  { icon: Landmark, tone: "warning" },
  { icon: Earth, tone: "info" },
  { icon: Scale, tone: "primary" },
  { icon: BookOpenText, tone: "danger" },
  { icon: Brain, tone: "primary" },
  { icon: Languages, tone: "success" },
  { icon: Shapes, tone: "primary" },
];

/** Avantages « Pourquoi EduIA », même ordre que `dict.marketing.why.benefits`. */
export const marketingBenefitIcons: LucideIcon[] = [
  ListTree,
  Target,
  BadgeCheck,
  Timer,
  Repeat,
  MonitorSmartphone,
];

/**
 * Smartphone photographié de « Comment ça marche ? » (même appareil, version
 * miroir à droite). Dimensions des images détourées et coins de l'écran
 * mesurés au pixel près sur l'écran magenta d'origine (voir
 * `lib/marketing/screen-quad.ts`) : l'interface EduIA, dessinée en
 * `screen.width` × `screen.height`, est projetée exactement sur la vitre.
 */
export const marketingPhone = {
  width: 764,
  height: 1792,
  screen: { width: 390, height: 844, radius: 50 },
  quads: {
    left: { tl: [109, 47.2], tr: [713, 99.6], br: [713, 1720.1], bl: [109, 1739.4] },
    right: { tl: [51, 99.6], tr: [655, 47.2], br: [655, 1739.4], bl: [51, 1720.1] },
  },
} as const;

/**
 * Vidéo de démonstration existante (jamais remplacée) + image d'attente
 * extraite de cette même vidéo. Durée réelle du fichier : 27 s.
 */
export const marketingDemoVideo = {
  src: "/videos/demo-eduia.mp4",
  poster: "/videos/demo-eduia-poster.webp",
  durationLabel: "0:27",
} as const;
