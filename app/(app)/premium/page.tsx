import type { Metadata } from "next";
import { Crown, FlaskConical, Gift, ShieldCheck } from "lucide-react";
import { Breadcrumb } from "@/components/common/breadcrumb";
import { PremiumHero } from "@/components/premium/premium-hero";
import { PlanCard, type PlanFeature } from "@/components/premium/plan-card";
import { MaketouPayButton } from "@/components/billing/maketou-pay-button";
import { PaymentMethodChips } from "@/components/billing/payment-method-chips";
import { ComparisonTable } from "@/components/premium/comparison-table";
import { requireUser } from "@/lib/data/user";
import { getCreditWallet } from "@/lib/data/credits";
import { purchasableItemKeys } from "@/lib/maketou/config";
import { MAKETOU_TEST_ITEM_KEY, MAKETOU_TEST_CREDITS, PREMIUM_ITEM_KEY } from "@/lib/maketou/catalog";
import { formatShortDate } from "@/lib/utils/format";
import { getLocale } from "@/lib/i18n/server";
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
  const [user, dict, locale] = await Promise.all([requireUser(), getDictionary(), getLocale()]);
  const t = dict.premium;
  const b = dict.billing;
  const row = (key: string) => t.comparisonRows[key] ?? key;
  const wallet = await getCreditWallet(user.id);
  const purchasable = purchasableItemKeys({ isAdmin: user.role === "admin" });
  const testPrice = Number.parseInt(process.env.MAKETOU_TEST_PRICE ?? "", 10);

  const currentPlanBadge = (
    <div className="rounded-lg bg-success-50 px-3 py-2.5 text-center text-fine font-semibold text-success-700">
      {t.currentPlan} ✨
    </div>
  );

  /**
   * Pied de la carte Premium : Premium actif → échéance + « Renouveler
   * (+1 mois) » ; ancien Premium+ encore actif (offre retirée) → Premium
   * disponible à son échéance, sans rien résilier ; sinon → « Payer avec Maketou ».
   */
  const premiumFooter = () => {
    const itemKey = PREMIUM_ITEM_KEY;
    const available = purchasable.includes(itemKey);
    if (user.plan === "premium") {
      return (
        <div className="space-y-2.5">
          {currentPlanBadge}
          {wallet.periodEnd ? (
            <p className="text-center text-meta font-medium text-ink-500">
              {b.activeUntil(formatShortDate(wallet.periodEnd, locale))}
            </p>
          ) : null}
          <MaketouPayButton itemKey={itemKey} label={b.renewCta} available={available} variant="outline" size="md" block />
        </div>
      );
    }
    if (user.plan === "premium_plus") {
      return (
        <div className="rounded-lg bg-canvas px-3 py-2.5 text-center text-fine font-medium text-ink-500">
          {b.downgradeLocked}
        </div>
      );
    }
    return <MaketouPayButton itemKey={itemKey} label={b.payWithMaketou} available={available} variant="primary" size="lg" block />;
  };

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

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: dict.common.home, href: "/dashboard" },
          { label: t.metaTitle },
        ]}
      />

      <PremiumHero plan={user.plan} />

      <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-5 md:grid-cols-2 lg:gap-6">
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
          footer={premiumFooter()}
        />
      </div>

      {/* Moyens de paiement réellement proposés par la page Maketou. */}
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-fine font-semibold text-ink-800">
          <ShieldCheck className="size-4 shrink-0 text-success-600" aria-hidden />
          {b.secureLine}
        </p>
        <PaymentMethodChips cardLabel={b.cardLabel} />
      </div>
      <p className="-mt-3 text-meta text-ink-400">{b.noAutoRenew}</p>

      {purchasable.includes(MAKETOU_TEST_ITEM_KEY) && Number.isInteger(testPrice) ? (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-warning-200 bg-warning-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-fine font-bold text-ink-900">
              <FlaskConical className="size-4 text-warning-600" aria-hidden />
              {b.testOfferTitle}
            </p>
            <p className="mt-0.5 text-meta text-ink-500">
              {b.testOfferBody(formatFcfa(testPrice), MAKETOU_TEST_CREDITS)}
            </p>
          </div>
          <MaketouPayButton itemKey={MAKETOU_TEST_ITEM_KEY} label={b.payWithMaketou} variant="outline" size="sm" />
        </div>
      ) : null}

      <ComparisonTable rows={PREMIUM_COMPARISON_ROWS} />
    </div>
  );
}
