import { AdminMobileNav } from "./admin-mobile-nav";
import { AdminHeaderTitle } from "./admin-header-title";
import { AdminUserMenu } from "./admin-user-menu";
import type { User } from "@/types";

export function AdminHeader({ user }: { user: User }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line-soft bg-canvas/85 backdrop-blur-md">
      <div className="flex h-header items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <AdminMobileNav user={user} />
          <AdminHeaderTitle />
          <span className="hidden shrink-0 rounded-full bg-ink-900 px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-white sm:inline-flex">
            Admin
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <AdminUserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
