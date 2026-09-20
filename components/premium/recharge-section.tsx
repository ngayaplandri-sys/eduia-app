"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/client";
import { RECHARGE_PACKAGES } from "@/lib/config/credits";
import { formatFcfa } from "@/lib/admin/constants";

/**
 * Achat ponctuel de crédits de recharge (indépendant du palier d'abonnement)
 * — paiement **simulé**, voir `POST /api/credits/recharge` /
 * `applyRecharge()` dans `lib/data/credits.ts`. Les crédits achetés vont dans
 * le compartiment `rechargeBalance`, jamais dans le quota mensuel.
 */
export function RechargeSection() {
  const router = useRouter();
  const { toast } = useToast();
  const { dict } = useI18n();
  const t = dict.credits;
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function handleBuy(packageId: string, credits: number) {
    if (pendingId) return;
    setPendingId(packageId);
    try {
      const res = await fetch("/api/credits/recharge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      if (!res.ok) throw new Error("recharge failed");
      toast(t.rechargeSuccess(credits), "success");
      router.refresh();
    } catch {
      toast(t.rechargeError, "default");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Card id="recharge" className="scroll-mt-24 p-5 sm:p-6">
      <CardHeader className="mb-1">
        <CardTitle>{t.rechargeTitle}</CardTitle>
      </CardHeader>
      <p className="text-sm text-ink-500">{t.rechargeSubtitle}</p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {RECHARGE_PACKAGES.map((pkg) => {
          const busy = pendingId === pkg.id;
          return (
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                block
                disabled={pendingId !== null}
                onClick={() => handleBuy(pkg.id, pkg.credits)}
              >
                {busy ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                ) : null}
                {busy ? t.rechargeBuying : t.rechargeBuy}
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
