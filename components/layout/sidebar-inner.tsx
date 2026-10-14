import { BrandLogo } from "./brand-logo";
import { SidebarNav } from "./sidebar-nav";
import { PremiumCard } from "./premium-card";
import { IdentityMenu } from "@/components/user/identity-menu";
import type { User } from "@/types";

/**
 * Contenu de la sidebar, partagé entre le rail fixe (desktop, `Sidebar`) et le
 * tiroir mobile (`MobileNav`, client). `tagline` est fourni par l'appelant —
 * serveur via `getDictionary()`, client via `useI18n()` — pour rester utilisable
 * dans les deux contextes sans hook ni import `server-only`.
 */
export function SidebarInner({
  user,
  tagline,
  onNavigate,
}: {
  user: User;
  tagline: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="shrink-0 px-5 pb-5 pt-6">
        <BrandLogo tagline={tagline} />
      </div>

      <div
        aria-hidden
        className="mx-5 h-px shrink-0 bg-gradient-to-r from-primary-200/70 via-line-soft to-transparent"
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
        <SidebarNav isAdmin={user.role === "admin"} onNavigate={onNavigate} />
      </div>

      <div className="shrink-0 space-y-3 px-4 pb-5 pt-2">
        <PremiumCard onNavigate={onNavigate} />
        <IdentityMenu
          user={user}
          variant="full"
          side="top"
          align="start"
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}
