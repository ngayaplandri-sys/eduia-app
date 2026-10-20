import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  BarChart3,
  Activity,
  Bot,
  Flag,
  Globe2,
  Library,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavLink {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const adminNav: AdminNavLink[] = [
  { label: "Vue d'ensemble", href: "/admin", icon: LayoutDashboard },
  { label: "Utilisateurs", href: "/admin/users", icon: Users },
  { label: "Abonnements Premium", href: "/admin/subscriptions", icon: CreditCard },
  { label: "Paiements", href: "/admin/payments", icon: Receipt },
  { label: "Pays", href: "/admin/countries", icon: Globe2 },
  { label: "Statistiques", href: "/admin/stats", icon: BarChart3 },
  { label: "Activité", href: "/admin/activity", icon: Activity },
  { label: "Utilisation IA", href: "/admin/ai", icon: Bot },
  { label: "Signalements", href: "/admin/reports", icon: Flag },
  { label: "Gestion des contenus", href: "/admin/content", icon: Library },
  { label: "Paramètres", href: "/admin/settings", icon: Settings },
];

const ADMIN_PAGE_TITLES: Record<string, string> = {
  "/admin": "Vue d'ensemble",
  "/admin/users": "Utilisateurs",
  "/admin/subscriptions": "Abonnements Premium",
  "/admin/payments": "Paiements",
  "/admin/countries": "Pays",
  "/admin/stats": "Statistiques",
  "/admin/activity": "Activité",
  "/admin/ai": "Utilisation IA",
  "/admin/reports": "Signalements",
  "/admin/content": "Gestion des contenus",
  "/admin/settings": "Paramètres",
};

export function resolveAdminTitle(pathname: string): string {
  if (ADMIN_PAGE_TITLES[pathname]) return ADMIN_PAGE_TITLES[pathname];
  const base = Object.keys(ADMIN_PAGE_TITLES)
    .filter((key) => key !== "/admin" && pathname.startsWith(`${key}/`))
    .sort((a, b) => b.length - a.length)[0];
  return base ? ADMIN_PAGE_TITLES[base] : "Administration";
}

export function isAdminNavActive(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
