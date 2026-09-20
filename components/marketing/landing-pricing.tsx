import Link from "next/link";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils/cn";
import { PLAN_CREDITS } from "@/lib/config/credits";
import { formatFcfa } from "@/lib/admin/constants";
import { getDictionary } from "@/lib/i18n/server";

function PriceCard({
  name,
  price,
  period,
  points,
  featured,
  ctaLabel,
  recommendedLabel,
}: {
  name: string;
  price: string;
  period?: string;
  points: string[];
  featured?: boolean;
  ctaLabel: string;
  recommendedLabel: string;
}) {
  return (
    <Card
      variant={featured ? "elevated" : "content"}
      className={cn(
        "hover-lift relative flex h-full flex-col p-6 sm:p-7",
        featured && "ring-1 ring-accent-200",
      )}
    >
      {featured ? (
        <span className="absolute -top-3 left-6 rounded-full bg-accent-400 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-ink-900">
          {recommendedLabel}
        </span>
      ) : null}

      <h3 className="text-title-sm font-bold text-ink-900">{name}</h3>
      <p className="mt-2 flex items-baseline gap-1">
        <span className="text-[1.75rem] font-extrabold tracking-[-0.02em] text-ink-900">
          {price}
        </span>
        {period ? (
          <span className="text-sm font-medium text-ink-400">{period}</span>
        ) : null}
      </p>

      <ul className="mt-5 flex-1 space-y-2.5">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-2.5 text-sm text-ink-600">
            <Check
              className={cn(
                "mt-0.5 size-4 shrink-0",
                featured ? "text-accent-600" : "text-success-600",
              )}
              aria-hidden
            />
            {point}
          </li>
        ))}
      </ul>

      <Link
        href="/signup"
        className={cn(
          buttonVariants({
            variant: featured ? "accent" : "outline",
            size: "md",
            block: true,
          }),
          "mt-6",
        )}
      >
        {ctaLabel}
      </Link>
    </Card>
  );
}

export async function LandingPricing() {
  const dict = await getDictionary();
  const t = dict.marketing.pricing;

  return (
    <section
      id="tarifs"
      className="scroll-mt-20 bg-canvas py-20 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-[1.75rem] font-extrabold tracking-[-0.02em] text-ink-900 sm:text-[2.25rem]">
          {t.heading} <span className="text-primary-600">{t.headingAccent}</span>
          {t.headingSuffix ? ` ${t.headingSuffix}` : ""}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-[0.95rem] text-ink-500">
          {t.subtitle}
        </p>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          <Reveal className="h-full">
            <PriceCard
              name={t.free.name}
              price="0 FCFA"
              points={t.free.points(PLAN_CREDITS.free.signupGrant)}
              ctaLabel={t.free.cta}
              recommendedLabel={t.recommended}
            />
          </Reveal>
          <Reveal delayMs={90} className="h-full">
            <PriceCard
              name={t.premium.name}
              price={formatFcfa(PLAN_CREDITS.premium.priceFcfa)}
              period={t.period}
              points={t.premium.points(PLAN_CREDITS.premium.monthly)}
              featured
              ctaLabel={t.premium.cta}
              recommendedLabel={t.recommended}
            />
          </Reveal>
          <Reveal delayMs={180} className="h-full">
            <PriceCard
              name={t.premiumPlus.name}
              price={formatFcfa(PLAN_CREDITS.premium_plus.priceFcfa)}
              period={t.period}
              points={t.premiumPlus.points(PLAN_CREDITS.premium_plus.monthly)}
              ctaLabel={t.premiumPlus.cta}
              recommendedLabel={t.recommended}
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
