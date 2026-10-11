import {
  House,
  FileText,
  FilePenLine,
  ClipboardCheck,
  Bot,
  Folder,
  ClockArrowLeft,
  Settings,
  CircleQuestionMark,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

/** Couleur d'accent de l'icône dans la sidebar (groupe principal). */
export type NavTone = "primary" | "success" | "warning" | "neutral";

/** Clé de traduction du lien (résolue via `dict.nav[key]` au rendu). */
export type NavKey =
  | "dashboard"
  | "resumer"
  | "generer"
  | "corriger"
  | "assistant"
  | "documents"
  | "historique"
  | "parametres"
  | "aide"
  | "admin"
  | "premium";

export interface NavLink {
  key: NavKey;
  href: string;
  icon: LucideIcon;
  tone: NavTone;
}

/** Groupe principal — icônes colorées, comme sur la maquette. */
export const primaryNav: NavLink[] = [
  { key: "dashboard", href: "/dashboard", icon: House, tone: "primary" },
  { key: "resumer", href: "/resumer", icon: FileText, tone: "success" },
  { key: "generer", href: "/generer", icon: FilePenLine, tone: "primary" },
  { key: "corriger", href: "/corriger", icon: ClipboardCheck, tone: "warning" },
  { key: "assistant", href: "/assistant", icon: Bot, tone: "primary" },
];

/** Groupe secondaire — icônes neutres. */
export const secondaryNav: NavLink[] = [
  { key: "documents", href: "/documents", icon: Folder, tone: "neutral" },
  { key: "historique", href: "/historique", icon: ClockArrowLeft, tone: "neutral" },
  { key: "parametres", href: "/parametres", icon: Settings, tone: "neutral" },
  { key: "aide", href: "/aide", icon: CircleQuestionMark, tone: "neutral" },
];

/**
 * Lien réservé aux administrateurs. N'est rendu dans la sidebar que lorsque
 * `user.role === "admin"` (rôle résolu côté serveur dans `DashboardShell`).
 * La cible `/admin` est en plus protégée côté serveur (`requireAdmin()`).
 */
export const adminNavLink: NavLink = {
  key: "admin",
  href: "/admin",
  icon: ShieldCheck,
  tone: "neutral",
};

/** Route → clé de titre (`dict.nav[key]`), pour le header. */
const PAGE_TITLE_KEYS: Record<string, NavKey> = {
  "/dashboard": "dashboard",
  "/resumer": "resumer",
  "/generer": "generer",
  "/corriger": "corriger",
  "/assistant": "assistant",
  "/documents": "documents",
  "/historique": "historique",
  "/parametres": "parametres",
  "/aide": "aide",
  "/premium": "premium",
};

/** Résout la clé de titre d'une route (gère les sous-routes éventuelles). */
export function resolvePageTitleKey(pathname: string): NavKey | null {
  if (PAGE_TITLE_KEYS[pathname]) return PAGE_TITLE_KEYS[pathname];
  const match = Object.keys(PAGE_TITLE_KEYS)
    .filter((base) => base !== "/dashboard" && pathname.startsWith(`${base}/`))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_TITLE_KEYS[match] : null;
}

/** Détermine si un lien de nav est actif pour le chemin courant. */
export function isNavLinkActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
