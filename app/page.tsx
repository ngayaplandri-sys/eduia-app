import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/data/user";
import { siteConfig } from "@/lib/config/site";
import { LANDING_BOTTOM_SENTINEL, LANDING_TOP_SENTINEL } from "@/lib/config/marketing";
import { LandingHeader } from "@/components/marketing/landing-header";
import { LandingHero } from "@/components/marketing/landing-hero";
import { LandingStats } from "@/components/marketing/landing-stats";
import { LandingHow } from "@/components/marketing/landing-how";
import { LandingDemo } from "@/components/marketing/landing-demo";
import { LandingFeatures } from "@/components/marketing/landing-features";
import { LandingSubjects } from "@/components/marketing/landing-subjects";
import { LandingWhy } from "@/components/marketing/landing-why";
import { LandingProof } from "@/components/marketing/landing-proof";
import { LandingPricing } from "@/components/marketing/landing-pricing";
import { LandingCta } from "@/components/marketing/landing-cta";
import { LandingFooter } from "@/components/marketing/landing-footer";

export const metadata: Metadata = {
  title: `${siteConfig.name} : apprends mieux, avance plus loin`,
  description: siteConfig.description,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

/** Sans JavaScript, aucun contenu ne doit rester masqué en attente de révélation. */
const NO_JS_REVEAL_FALLBACK =
  "[data-reveal]{opacity:1!important;transform:none!important;filter:none!important}.line-reveal>span,.draw-line-y{transform:none!important}";

/**
 * Landing publique — le scroll raconte EduIA dans l'ordre :
 * découverte (hero + indicateurs) → compréhension (comment ça marche) →
 * démonstration (vidéo) → fonctionnalités (le parcours) → matières →
 * avantages → preuves → tarifs et paiement → appel final.
 */
export default async function LandingPage() {
  // Landing publique : la session sert seulement à adapter les CTA.
  // Un échec de lecture (BDD indisponible…) ne doit jamais casser la page.
  let isAuthenticated = false;
  try {
    isAuthenticated = Boolean(await getCurrentUser());
  } catch {
    isAuthenticated = false;
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-canvas">
      <noscript>
        <style>{NO_JS_REVEAL_FALLBACK}</style>
      </noscript>
      <span
        id={LANDING_TOP_SENTINEL}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 h-px w-px"
      />
      <LandingHeader isAuthenticated={isAuthenticated} />
      <main className="flex-1">
        <LandingHero isAuthenticated={isAuthenticated} />
        <LandingStats />
        <LandingHow />
        <LandingDemo />
        <LandingFeatures />
        <LandingSubjects />
        <LandingWhy />
        <LandingProof />
        <LandingPricing isAuthenticated={isAuthenticated} />
        <LandingCta isAuthenticated={isAuthenticated} />
      </main>
      <LandingFooter />
      <span id={LANDING_BOTTOM_SENTINEL} aria-hidden className="block h-px w-full" />
    </div>
  );
}
