"use client";

import Link from "next/link";
import { Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n/client";
import { isPaidPlan } from "@/lib/utils/plan";
import type { UserPlan } from "@/types";
import { SettingsSection } from "./settings-section";

export function SubscriptionSettings({ plan }: { plan: UserPlan }) {
  const paid = isPaidPlan(plan);
  const { dict } = useI18n();
  const t = dict.parametres;

  const planName =
    plan === "premium_plus" ? t.planPremiumPlus : plan === "premium" ? t.planPremium : t.planFree;
  const planBody =
    plan === "premium_plus" ? t.premiumPlusFullAccess : plan === "premium" ? t.premiumFullAccess : t.freeQuota;

  return (
    <SettingsSection
      icon={Crown}
      title={t.subscriptionTitle}
      description={t.subscriptionDescription}
    >
      <div className="flex flex-col gap-4 rounded-lg border border-line-soft p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
            <Crown className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-ink-900">{planName}</p>
              <Badge tone={paid ? "primary" : "neutral"} size="sm">
                {paid ? t.planActive : t.planFreeLabel}
              </Badge>
            </div>
            <p className="mt-0.5 text-fine text-ink-400">{planBody}</p>
          </div>
        </div>

        <Link
          href="/premium"
          className={cn(
            buttonVariants({
              variant: paid ? "outline" : "primary",
              size: "sm",
            }),
            "shrink-0",
          )}
        >
          {paid ? null : <Crown className="size-4" aria-hidden />}
          {paid ? t.manageSubscription : t.goPremium}
        </Link>
      </div>
    </SettingsSection>
  );
}
