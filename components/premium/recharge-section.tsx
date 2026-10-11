"use client";

import { Zap } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { MaketouPayButton } from "@/components/billing/maketou-pay-button";
import { useI18n } from "@/lib/i18n/client";
import { RECHARGE_PACKAGES } from "@/lib/config/credits";
import { formatFcfa } from "@/lib/admin/constants";

/**
 * Achat ponctuel de crédits de recharge (indépendant du palier
 * d'abonnement), payé via Maketou. Les crédits sont ajoutés au compartiment
 * `rechargeBalance` (qui n'expire jamais) une fois le paiement confirmé côté
 * serveur — jamais au clic.
 */
export function RechargeSection({ purchasable }: { purchasable: readonly string[] }) {
  const { dict } = useI18n();
  const t = dict.credits;

  return (
    <Card id="recharge" className="scroll-mt-24 p-5 sm:p-6">
      <CardHeader className="mb-1">
        <CardTitle>{t.rechargeTitle}</CardTitle>
      </CardHeader>
      <p className="text-sm text-ink-500">{t.rechargeSubtitle}</p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {RECHARGE_PACKAGES.map((pkg) => (
          <div
            key={pkg.id}
            className="flex flex-col items-center gap-3 rounded-xl border border-line bg-canvas/40 p-4 text-center"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
              <Zap className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-lg font-extrabold tracking-[-0.02em] text-ink-900">
                {t.rechargeCreditsLabel(pkg.credits)}
              </p>
              <p className="text-fine text-ink-400">{formatFcfa(pkg.priceFcfa)}</p>
            </div>
            <MaketouPayButton
              itemKey={pkg.id}
              label={t.rechargeBuy}
              available={purchasable.includes(pkg.id)}
              variant="outline"
              size="sm"
              block
              icon={false}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
