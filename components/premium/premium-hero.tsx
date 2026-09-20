import { Crown } from "lucide-react";
import { getDictionary } from "@/lib/i18n/server";
import type { UserPlan } from "@/types";

export async function PremiumHero({ plan }: { plan: UserPlan }) {
  const dict = await getDictionary();
  const t = dict.premium;

  const badge =
    plan === "premium_plus"
      ? t.heroBadgePremiumPlus
      : plan === "premium"
        ? t.heroBadgePremium
        : t.heroBadgeFree;

  const title =
    plan === "premium_plus" ? (
      <>
        {t.heroTitlePremiumPlusBefore}
        <span className="italic text-primary-600">{t.heroTitlePremiumPlusAccent}</span>
        {t.heroTitlePremiumPlusAfter}
      </>
    ) : plan === "premium" ? (
      <>
        {t.heroTitlePremiumBefore}
        <span className="italic text-primary-600">{t.heroTitlePremiumAccent}</span>
        {t.heroTitlePremiumAfter}
      </>
    ) : (
      <>
        {t.heroTitleFreeBefore}
        <span className="italic text-primary-600">{t.heroTitleFreeAccent}</span>
      </>
    );

  const body =
    plan === "premium_plus"
      ? t.heroBodyPremiumPlus
      : plan === "premium"
        ? t.heroBodyPremium
        : t.heroBodyFree;

  return (
    <section className="overflow-hidden rounded-3xl bg-scene-premium p-6 shadow-[var(--shadow-elevated)] sm:p-8 lg:p-10">
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface/70 px-3 py-1 text-fine font-semibold text-primary-700 shadow-sm ring-1 ring-line">
          <Crown className="size-3.5" aria-hidden />
          {badge}
        </span>

        <h1 className="mt-4 font-display font-medium tracking-[-0.01em] text-ink-900 text-display-sm sm:text-display-lg">
          {title}
        </h1>

        <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-500">
          {body}
        </p>
      </div>
    </section>
  );
}
