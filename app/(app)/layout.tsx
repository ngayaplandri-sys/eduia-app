import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireUser } from "@/lib/data/user";
import { getStudentProfile, hasCompletedOnboarding } from "@/lib/data/onboarding";
import { StudentProfileProvider } from "@/components/user/student-profile";
import { pendingCartIdsToConfirm } from "@/lib/data/maketou";
import { PendingPaymentSync } from "@/components/billing/pending-payment-sync";

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

  // Paiements Maketou restés en attente : confirmés dès le retour de l'élève.
  // Réponses de l'onboarding : utilisées tout de suite par les formulaires.
  const [pendingCartIds, profile] = await Promise.all([
    pendingCartIdsToConfirm(user.id).catch(() => []),
    getStudentProfile(user.id).catch(() => null),
  ]);

  return (
    <DashboardShell>
      <StudentProfileProvider
        profile={
          profile
            ? { firstName: profile.firstName, schoolLevel: profile.schoolLevel, subjects: profile.subjects }
            : null
        }
      >
        {children}
      </StudentProfileProvider>
      {pendingCartIds.length > 0 ? <PendingPaymentSync cartIds={pendingCartIds} /> : null}
    </DashboardShell>
  );
}
