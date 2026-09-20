"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  primaryNav,
  secondaryNav,
  adminNavLink,
  isNavLinkActive,
  type NavLink,
  type NavTone,
} from "@/lib/navigation";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";

const toneIconClass: Record<NavTone, string> = {
  primary: "text-primary-500",
  success: "text-success-600",
  warning: "text-warning-600",
  neutral: "text-ink-400",
};

/** Neutre retombe sur le violet de marque : ces liens (Documents, Paramètres…)
 * n'ont pas de couleur propre. Les autres gardent leur tonalité une fois actifs
 * au lieu d'être tous écrasés en violet. */
const toneActivePillClass: Record<NavTone, string> = {
  primary: "bg-primary-100 text-primary-700",
  success: "bg-success-100 text-success-700",
  warning: "bg-warning-100 text-warning-700",
  neutral: "bg-primary-100 text-primary-700",
};

const toneActiveIconClass: Record<NavTone, string> = {
  primary: "text-primary-600",
  success: "text-success-600",
  warning: "text-warning-600",
  neutral: "text-primary-600",
};

function NavItem({
  link,
  label,
  active,
  onNavigate,
}: {
  link: NavLink;
  label: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = link.icon;
  return (
    <li>
      <Link
        href={link.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-[background-color,color,transform] duration-200 ease-out motion-reduce:hover:translate-x-0",
          active
            ? cn("font-semibold", toneActivePillClass[link.tone])
            : "text-ink-500 hover:translate-x-0.5 hover:bg-primary-50 hover:text-ink-900",
        )}
      >
        <Icon
          className={cn(
            "size-[1.15rem] shrink-0 transition-colors",
            active ? toneActiveIconClass[link.tone] : toneIconClass[link.tone],
          )}
          strokeWidth={2}
          aria-hidden
        />
        <span className="truncate">{label}</span>
      </Link>
    </li>
  );
}

export function SidebarNav({
  isAdmin = false,
  onNavigate,
}: {
  /** Résolu côté serveur (`user.role === "admin"`) : contrôle le lien Administration. */
  isAdmin?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { dict } = useI18n();

  const secondaryLinks = isAdmin
    ? [...secondaryNav, adminNavLink]
    : secondaryNav;

  return (
    <nav aria-label={dict.nav.primaryLabel} className="flex flex-col gap-6">
      <ul className="flex flex-col gap-1">
        {primaryNav.map((link) => (
          <NavItem
            key={link.href}
            link={link}
            label={dict.nav[link.key]}
            active={isNavLinkActive(link.href, pathname)}
            onNavigate={onNavigate}
          />
        ))}
      </ul>

      <div className="h-px bg-line-soft" />

      <ul className="flex flex-col gap-1">
        {secondaryLinks.map((link) => (
          <NavItem
            key={link.href}
            link={link}
            label={dict.nav[link.key]}
            active={isNavLinkActive(link.href, pathname)}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </nav>
  );
}
