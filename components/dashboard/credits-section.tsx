import { BookOpen, FilePenLine, ClipboardCheck, MessageCircle } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { formatShortDate } from "@/lib/utils/format";
import { PLAN_CREDITS } from "@/lib/config/credits";
import type { CreditUsageSummary, CreditWallet } from "@/types";

/**
 * Dénominateur affiché à côté du solde disponible ("X / Y") : le quota plein
 * du palier payant, ou les 20 crédits offerts pour un compte gratuit. Si le
 * solde réel dépasse ce quota (recharge achetée en plus), le dénominateur
 * suit — la barre ne dépasse jamais 100 % et n'affiche jamais un total plus
 * petit que ce que l'utilisateur peut réellement dépenser. Simplification
 * assumée pour un indicateur de tableau de bord : le grand livre
 * (`credit_ledger`) reste la source d'audit exacte si un jour nécessaire,
 * cet indicateur n'a pas vocation à reconstituer un historique précis.
 */
function computeDisplay(wallet: CreditWallet) {
  const baseline =
    wallet.planMonthlyTotal > 0 ? wallet.planMonthlyTotal : PLAN_CREDITS.free.signupGrant;
  const total = Math.max(baseline, wallet.total);
  const used = Math.max(0, total - wallet.total);
  const percent = total > 0 ? Math.round((wallet.total / total) * 100) : 0;
  return { available: wallet.total, total, used, percent };
}

export async function CreditsSection({
  wallet,
  usage,
}: {
  wallet: CreditWallet;
  usage: CreditUsageSummary;
}) {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  const t = dict.credits;
  const { available, total, used, percent } = computeDisplay(wallet);

  const usageTiles = [
    { icon: BookOpen, label: t.usageSummaries(usage.summaries) },
    { icon: FilePenLine, label: t.usageExams(usage.exams) },
    { icon: ClipboardCheck, label: t.usageCorrections(usage.corrections) },
    { icon: MessageCircle, label: t.usageAssistant(usage.assistantQuestions) },
  ];

  return (
    <Card className="p-5 sm:p-6">
      <CardHeader className="mb-1">
        <CardTitle>{t.sectionTitle}</CardTitle>
      </CardHeader>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-fine font-medium text-ink-500">{t.availableLabel}</p>
          <p className="text-3xl font-extrabold tracking-[-0.02em] text-ink-900">
            {t.availableOf(available, total)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-fine font-medium text-ink-500">{t.usedLabel}</p>
          <p className="text-xl font-bold text-ink-700">{used}</p>
        </div>
      </div>

      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-primary-100"
        role="progressbar"
        aria-valuenow={available}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={t.availableLabel}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-[width] duration-500 ease-out"
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>

      <p className="mt-2 text-meta text-ink-400">
        {wallet.periodEnd ? t.renewsOn(formatShortDate(wallet.periodEnd, locale)) : t.noSubscriptionHint}
      </p>

      <div className="mt-5 border-t border-line-soft pt-4">
        <p className="text-fine font-semibold text-ink-700">{t.usageSummaryTitle}</p>
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {usageTiles.map((tile) => (
            <div key={tile.label} className="flex items-center gap-2.5 rounded-lg bg-canvas/60 px-3 py-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                <tile.icon className="size-4" aria-hidden />
              </span>
              <p className="min-w-0 truncate text-fine font-medium text-ink-700">{tile.label}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
