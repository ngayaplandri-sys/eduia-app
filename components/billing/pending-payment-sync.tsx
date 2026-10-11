"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/client";

/** Délai entre deux vérifications d'un paiement encore en attente. */
const RETRY_MS = 60_000;
/** Nombre maximum de vérifications par visite (≈ 5 minutes). */
const MAX_ATTEMPTS = 6;

type Outcome = "completed" | "closed" | "pending";

async function confirmCart(cartId: string): Promise<Outcome> {
  try {
    const response = await fetch("/api/billing/maketou/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cartId }),
    });
    const data: { status?: string } | null = await response.json().catch(() => null);
    if (response.status === 502) return "pending";
    if (!response.ok) return "closed";
    if (data?.status === "completed") return "completed";
    if (data?.status === "payment_failed" || data?.status === "abandoned") return "closed";
    return "pending";
  } catch {
    return "pending";
  }
}

/**
 * Confirme, dès le retour de l'élève dans l'app, ses paiements Maketou restés
 * en attente (page de retour fermée trop tôt, Mobile Money confirmé en
 * différé…) — puis revérifie chaque minute pendant la visite. Invisible ;
 * affiche une notification et rafraîchit la page quand l'achat est accordé.
 * Le rapprochement quotidien (Vercel Cron) reste le filet de sécurité.
 */
export function PendingPaymentSync({ cartIds }: { cartIds: string[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const { dict } = useI18n();
  const message = dict.billing.confirmedOnVisit;
  const key = cartIds.join(",");

  React.useEffect(() => {
    let active = true;
    let timer: number | undefined;
    let pending = key ? key.split(",") : [];
    let attempts = 0;

    async function run() {
      attempts += 1;
      const outcomes = await Promise.all(pending.map(confirmCart));
      if (!active) return;
      if (outcomes.includes("completed")) {
        toast(message, "success");
        router.refresh();
      }
      pending = pending.filter((_, index) => outcomes[index] === "pending");
      if (pending.length > 0 && attempts < MAX_ATTEMPTS) {
        timer = window.setTimeout(run, RETRY_MS);
      }
    }

    if (pending.length > 0) void run();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [key, message, router, toast]);

  return null;
}
