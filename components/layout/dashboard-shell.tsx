import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { requireUser } from "@/lib/data/user";

export async function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-dvh">
      <Sidebar user={user} />
      <div className="flex min-h-dvh flex-col lg:pl-sidebar">
        <Header user={user} />
        <main className="mx-auto w-full max-w-[92rem] flex-1 px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
