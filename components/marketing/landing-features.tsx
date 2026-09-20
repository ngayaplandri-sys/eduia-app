import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils/cn";
import { marketingFeatureIcons, type MarketingTone } from "@/lib/config/marketing";
import { getDictionary } from "@/lib/i18n/server";

const ICON_CLASSES: Record<MarketingTone, string> = {
  success: "bg-success-100 text-success-700",
  primary: "bg-primary-100 text-primary-600",
  warning: "bg-warning-100 text-warning-700",
};

const LINK_CLASSES: Record<MarketingTone, string> = {
  success: "text-success-600 hover:text-success-700",
  primary: "text-primary-600 hover:text-primary-700",
  warning: "text-warning-600 hover:text-warning-700",
};

interface Feature {
  icon: LucideIcon;
  tone: MarketingTone;
  title: string;
  description: string;
}

/**
 * Une carte fonctionnalité. `featured` bascule la carte en bandeau horizontal
 * à partir de `sm:` (icône | texte | lien sur une ligne) — sous `sm:` elle
 * retombe sur le même empilement vertical que les cartes normales.
 */
function FeatureCard({
  feature,
  learnMoreLabel,
  featured = false,
}: {
  feature: Feature;
  learnMoreLabel: string;
  featured?: boolean;
}) {
  const Icon = feature.icon;
  return (
    <Card
      className={cn(
        "hover-lift flex h-full flex-col p-6",
        featured && "sm:flex-row sm:items-center sm:gap-6 sm:p-7",
      )}
    >
      <span
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-xl",
          ICON_CLASSES[feature.tone],
        )}
      >
        <Icon className="size-6" strokeWidth={2} aria-hidden />
      </span>

      <div className="flex min-w-0 flex-1 flex-col">
        <h3
          className={cn(
            "mt-4 text-title-sm font-bold text-ink-900",
            featured && "sm:mt-0",
          )}
        >
          {feature.title}
        </h3>
        <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-500">
          {feature.description}
        </p>
      </div>

      <Link
        href="/signup"
        className={cn(
          "mt-4 inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold transition-colors",
          LINK_CLASSES[feature.tone],
          featured && "sm:mt-0",
        )}
      >
        {learnMoreLabel}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </Card>
  );
}

export async function LandingFeatures() {
  const dict = await getDictionary();
  const t = dict.marketing.features;

  const features: Feature[] = t.items.map((item, i) => ({
    ...item,
    icon: marketingFeatureIcons[i].icon,
    tone: marketingFeatureIcons[i].tone,
  }));
  const [primary, ...rest] = features;

  return (
    <section
      id="fonctionnalites"
      className="scroll-mt-20 bg-canvas py-20 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-[1.75rem] font-extrabold tracking-[-0.02em] text-ink-900 sm:text-[2.25rem]">
          {t.heading} <span className="text-primary-600">{t.headingAccent}</span>
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-[0.95rem] text-ink-500">
          {t.subtitle}
        </p>

        <div className="mt-12 space-y-5 lg:space-y-6">
          {primary ? (
            <Reveal>
              <FeatureCard feature={primary} learnMoreLabel={t.learnMore} featured />
            </Reveal>
          ) : null}
          <div className="grid gap-5 sm:grid-cols-2 lg:gap-6">
            {rest.map((feature, index) => (
              <Reveal
                key={feature.title}
                delayMs={(index + 1) * 90}
                className="h-full"
              >
                <FeatureCard feature={feature} learnMoreLabel={t.learnMore} />
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
