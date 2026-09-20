import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/data/user";
import { hasCompletedOnboarding } from "@/lib/data/onboarding";
import { getDictionary } from "@/lib/i18n/server";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.onboarding.header };
}

export default async function OnboardingPage() {
  const user = await requireUser();

  // Déjà fait : pas de nouveau passage, direction le tableau de bord.
  if (await hasCompletedOnboarding(user.id)) {
    redirect("/dashboard");
  }

  return <OnboardingFlow userName={user.name} />;
}
