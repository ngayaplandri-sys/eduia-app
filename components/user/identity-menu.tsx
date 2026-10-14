"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Settings, Crown, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
import { firstName } from "@/lib/utils/format";
import { useI18n } from "@/lib/i18n/client";
import { localizeRole } from "@/lib/i18n/labels";
import { cn } from "@/lib/utils/cn";
import type { User } from "@/types";

/**
 * Menu d'identité unique (Paramètres / Premium / Déconnexion), utilisé aux
 * deux endroits de la coquille où l'utilisateur peut agir sur son compte —
 * avant : `UserProfileMenu` (header) et `SidebarUserCard` (pied de sidebar)
 * étaient deux composants quasi dupliqués, chacun avec la même incohérence
 * ("Mon profil" et "Paramètres" pointaient tous les deux vers `/parametres`).
 * Une seule entrée "Paramètres" ici.
 *
 * - `variant="compact"` (header) : pastille avatar + nom (nom masqué en
 *   mobile) — l'identité complète est donc répétée en tête du menu déroulant.
 * - `variant="full"` (pied de sidebar) : carte bordée avatar + nom + rôle
 *   déjà visible dans le déclencheur, pas besoin de la répéter dans le menu.
 */
export function IdentityMenu({
  user,
  variant,
  align = "end",
  side = "bottom",
  onNavigate,
}: {
  user: User;
  variant: "compact" | "full";
  align?: "start" | "end";
  side?: "top" | "bottom";
  /** Tiroir mobile : le referme quand un lien du menu est choisi. */
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.layout;

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "full" ? (
          <button
            type="button"
            aria-label={dict.layout.profileMenu}
            className="hover-lift flex w-full items-center gap-3 rounded-xl border border-line-soft bg-surface p-2.5 text-left hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <Avatar src={user.avatarUrl} name={user.name} size={38} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-ink-900">
                {firstName(user.name)}
              </span>
              <span className="block text-badge text-ink-400">
                {localizeRole(user.role, dict)}
              </span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-ink-400" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            aria-label={dict.layout.profileMenu}
            className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-1 transition-[background-color,transform] duration-200 ease-out hover:-translate-y-px hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:hover:translate-y-0 sm:pr-2"
          >
            <Avatar src={user.avatarUrl} name={user.name} size={40} />
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-bold text-ink-900">
                {firstName(user.name)}
              </span>
              <span className="block text-badge text-ink-400">
                {localizeRole(user.role, dict)}
              </span>
            </span>
            <ChevronDown
              className="hidden size-4 text-ink-400 sm:block"
              aria-hidden
            />
          </button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={align}
        side={side}
        className={cn(variant === "full" ? "w-[13.5rem]" : "w-[15rem]")}
      >
        {variant === "compact" ? (
          <>
            <div className="flex items-center gap-3 px-2.5 py-2">
              <Avatar src={user.avatarUrl} name={user.name} size={36} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink-900">
                  {user.name}
                </p>
                <p className="truncate text-badge text-ink-400">{user.email}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
          </>
        ) : null}

        <DropdownMenuItem asChild>
          <Link href="/parametres" onClick={onNavigate}>
            <Settings />
            {t.settings}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/premium" onClick={onNavigate}>
            <Crown />
            {t.goPremium}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            signOut();
          }}
          className="text-danger-600 focus:bg-danger-50 focus:text-danger-600 [&_svg]:text-danger-600"
        >
          <LogOut />
          {t.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
