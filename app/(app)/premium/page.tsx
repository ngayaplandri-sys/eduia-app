import type { Metadata } from "next";
import { Crown, Gift, Rocket } from "lucide-react";
import { Breadcrumb } from "@/components/common/breadcrumb";
import { PremiumHero } from "@/components/premium/premium-hero";
import { PlanCard, type PlanFeature } from "@/components/premium/plan-card";
import { SubscribeButton } from "@/components/premium/subscribe-button";
import { RechargeSection } from "@/components/premium/recharge-section";
import { ComparisonTable } from "@/components/premium/comparison-table";
import { requireUser } from "@/lib/data/user";
import { PREMIUM_COMPARISON_ROWS } from "@/lib/config/premium";
import { PLAN_CREDITS } from "@/lib/config/credits";
import { formatFcfa } from "@/lib/admin/constants";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    title: dict.premium.metaTitle,
    description: dict.premium.metaDescription,
  };
}

export default async function PremiumPage() {
  const [user, dict] = await Promise.all([requireUser(), getDictionary()]);
  const t = dict.premium;
  const row = (key: string) => t.comparisonRows[key] ?? key;

  const currentPlanBadge = (
    <div className="rounded-lg bg-success-50 px-3 py-2.5 text-center text-fine font-semibold text-success-700">
      {t.currentPlan} ✨
    </div>
  );

  const freeFeatures: PlanFeature[] = [
    { label: dict.credits.signupCreditsLabel(PLAN_CREDITS.free.signupGrant), included: true },
    { label: row("Résumer mes cours"), included: true },
    { label: row("Générer une épreuve"), included: true },
    { label: row("Corriger une épreuve"), included: true },
    { label: row("Assistance IA"), included: true },
  ];

  const premiumFeatures: PlanFeature[] = [
    { label: t.creditsPerMonth(PLAN_CREDITS.premium.monthly), included: true },
    { label: row("Résumer mes cours"), included: true },
    { label: row("Générer une épreuve"), included: true },
    { label: row("Corriger une épreuve"), included: true },
    { label: row("Assistance IA"), included: true },
    { label: row("Historique complet"), included: true },
  ];

  const premiumPlusFeatures: PlanFeature[] = [
    { label: t.creditsPerMonth(PLAN_CREDITS.premium_plus.monthly), included: true },
    { label: row("Résumer mes cours"), included: true },
    { label: row("Générer une épreuve"), included: true },
    { label: row("Corriger une épreuve"), included: true },
    { label: row("Assistance IA"), included: true },
    { label: row("Historique complet"), included: true },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: dict.common.home, href: "/dashboard" },
          { label: t.metaTitle },
        ]}
      />

      <PremiumHero plan={user.plan} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
        <PlanCard
          icon={Gift}
          title={t.planFreeTitle}
          description={t.planFreeDesc}
          price={t.priceFree}
          features={freeFeatures}
          footer={
            user.plan === "free" ? (
              currentPlanBadge
            ) : (
              <div className="rounded-lg bg-canvas px-3 py-2.5 text-center text-fine font-semibold text-ink-500">
                {t.planFreeTitle}
              </div>
            )
          }
        />

        <PlanCard
          icon={Crown}
          title={t.planPremiumTitle}
          description={t.planPremiumDesc}
          price={formatFcfa(PLAN_CREDITS.premium.priceFcfa)}
          period={t.pricePeriod}
          badge={t.planPremiumBadge}
          highlighted
          features={premiumFeatures}
          footer={
            user.plan === "premium" ? (
              currentPlanBadge
            ) : (
              <SubscribeButton plan="premium" planLabel={t.planPremiumTitle} />
            )
          }
        />

        <PlanCard
          icon={Rocket}
          title={t.planPremiumPlusTitle}
          description={t.planPremiumPlusDesc}
          price={formatFcfa(PLAN_CREDITS.premium_plus.priceFcfa)}
          period={t.pricePeriod}
          features={premiumPlusFeatures}
          footer={
            user.plan === "premium_plus" ? (
              currentPlanBadge
            ) : (
              <SubscribeButton plan="premium_plus" planLabel={t.planPremiumPlusTitle} />
            )
          }
        />
      </div>

      <RechargeSection />

      <ComparisonTable rows={PREMIUM_COMPARISON_ROWS} />
    </div>
  );
}
