import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireUser } from "@/lib/data/user";
import { hasCompletedOnboarding } from "@/lib/data/onboarding";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Point d'entrée unique des pages protégées : un compte qui n'a pas encore
  // répondu à l'onboarding y est renvoyé avant de voir quoi que ce soit d'autre.
  const user = await requireUser();
  if (!(await hasCompletedOnboarding(user.id))) {
    redirect("/onboarding");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
