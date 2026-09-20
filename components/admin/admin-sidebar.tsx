import { BrandLogo } from "@/components/layout/brand-logo";
import { Avatar } from "@/components/ui/avatar";
import { roleLabel } from "@/lib/roles";
import type { User } from "@/types";
import { AdminNav } from "./admin-nav";

export function AdminSidebarInner({
  user,
  onNavigate,
}: {
  user: User;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="shrink-0 px-5 pb-5 pt-6">
        <BrandLogo href="/admin" withTagline={false} />
        <span className="mt-2 inline-flex items-center rounded-full bg-ink-900 px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-white">
          Espace admin
        </span>
      </div>

      <div className="mx-5 h-px shrink-0 bg-line-soft" />

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
        <AdminNav onNavigate={onNavigate} />
      </div>

      <div className="shrink-0 px-4 pb-5 pt-2">
        <div className="flex items-center gap-3 rounded-xl border border-line-soft bg-surface p-2.5">
          <Avatar src={user.avatarUrl} name={user.name} size={38} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-ink-900">
              {user.name}
            </span>
            <span className="block text-[0.75rem] text-ink-400">
              {roleLabel(user.role)}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

/** Rail latéral fixe de l'espace admin — visible à partir de `lg`. */
export function AdminSidebar({ user }: { user: User }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-sidebar border-r border-line-soft lg:block">
      <AdminSidebarInner user={user} />
    </aside>
  );
}
