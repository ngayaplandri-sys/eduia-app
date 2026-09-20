"use client";

import * as React from "react";
import { Menu, X } from "lucide-react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetClose,
} from "@/components/ui/sheet";
import { IconButton } from "@/components/ui/icon-button";
import { AdminSidebarInner } from "./admin-sidebar";
import type { User } from "@/types";

export function AdminMobileNav({ user }: { user: User }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <IconButton label="Ouvrir le menu" className="lg:hidden">
          <Menu />
        </IconButton>
      </SheetTrigger>
      <SheetContent
        title="Menu administration"
        description="Navigation de l'espace d'administration EduIA"
      >
        <SheetClose asChild>
          <IconButton
            label="Fermer le menu"
            className="absolute right-3 top-4 z-10 bg-surface/80"
          >
            <X />
          </IconButton>
        </SheetClose>
        <AdminSidebarInner user={user} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
