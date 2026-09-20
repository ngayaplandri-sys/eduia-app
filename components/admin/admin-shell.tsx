import { AdminSidebar } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";
import type { User } from "@/types";

export function AdminShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <AdminSidebar user={user} />
      <div className="flex min-h-dvh flex-col lg:pl-sidebar">
        <AdminHeader user={user} />
        <main className="mx-auto w-full max-w-[84rem] flex-1 px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
