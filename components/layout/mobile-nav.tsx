"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetClose,
} from "@/components/ui/sheet";
import { IconButton } from "@/components/ui/icon-button";
import { SidebarInner } from "./sidebar-inner";
import { useI18n } from "@/lib/i18n/client";
import type { User } from "@/types";

export function MobileNav({ user }: { user: User }) {
  const pathname = usePathname();
  // Le tiroir est « ouvert sur une page » : dès que la page change (lien du
  // tiroir, bouton retour, redirection…), il se referme de lui-même. Les liens
  // vers la page courante le ferment via `onNavigate`.
  const [openOn, setOpenOn] = React.useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = React.useCallback(
    (next: boolean) => setOpenOn(next ? pathname : null),
    [pathname],
  );
  const { dict } = useI18n();
  const t = dict.layout;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <IconButton label={t.openMenu} className="lg:hidden">
          <Menu />
        </IconButton>
      </SheetTrigger>
      <SheetContent title={t.menuTitle} description={t.menuDescription}>
        <SheetClose asChild>
          <IconButton
            label={t.closeMenu}
            className="absolute right-3 top-4 z-10 bg-surface/80"
          >
            <X />
          </IconButton>
        </SheetClose>
        <SidebarInner
          user={user}
          tagline={t.tagline}
          onNavigate={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
