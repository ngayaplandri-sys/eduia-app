import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/data/user";
import { siteConfig } from "@/lib/config/site";
import { LandingHeader } from "@/components/marketing/landing-header";
import { LandingHero } from "@/components/marketing/landing-hero";
import { LandingSocialProof } from "@/components/marketing/landing-social-proof";
import { LandingFeatures } from "@/components/marketing/landing-features";
import { LandingStats } from "@/components/marketing/landing-stats";
import { LandingHow } from "@/components/marketing/landing-how";
import { LandingPricing } from "@/components/marketing/landing-pricing";
import { LandingCta } from "@/components/marketing/landing-cta";
import { LandingFooter } from "@/components/marketing/landing-footer";

export const metadata: Metadata = {
  title: `${siteConfig.name} : apprends mieux, avance plus loin`,
  description: siteConfig.description,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export default async function LandingPage() {
  // Landing publique : la session sert seulement à adapter le bouton du header.
  // Un échec de lecture (BDD indisponible…) ne doit jamais casser la page.
  let isAuthenticated = false;
  try {
    isAuthenticated = Boolean(await getCurrentUser());
  } catch {
    isAuthenticated = false;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <LandingHeader isAuthenticated={isAuthenticated} />
      <main className="flex-1">
        <LandingHero />
        <LandingSocialProof />
        <LandingFeatures />
        <LandingStats />
        <LandingHow />
        <LandingPricing />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
