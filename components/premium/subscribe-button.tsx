"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";
import type { SubscriptionPlanId } from "@/types";

/**
 * CTA « S'abonner » — appelle réellement `POST /api/credits/subscribe`
 * (paiement simulé : validation immédiate, voir `applyPlanSubscription` dans
 * `lib/data/credits.ts`). Remplace l'ancien `UpgradeButton`, qui se
 * contentait d'un toast « bientôt disponible » sans rien changer.
 */
export function SubscribeButton({
  plan,
  planLabel,
  ...props
}: { plan: SubscriptionPlanId; planLabel: string } & Omit<
  ButtonProps,
  "onClick" | "children"
>) {
  const router = useRouter();
  const { toast } = useToast();
  const { dict } = useI18n();
  const t = dict.credits;
  const [pending, setPending] = React.useState(false);

  async function handleSubscribe() {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch("/api/credits/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) throw new Error("subscribe failed");
      toast(t.subscribeSuccess(planLabel), "success");
      router.refresh();
    } catch {
      toast(t.subscribeError, "default");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="primary"
      size="lg"
      block
      disabled={pending}
      onClick={handleSubscribe}
      {...props}
    >
      {pending ? (
        <LoaderCircle className="size-[1.1rem] animate-spin" aria-hidden />
      ) : (
        <Sparkles className="size-[1.1rem]" aria-hidden />
      )}
      {pending ? t.subscribing : t.subscribeCta}
    </Button>
  );
}
