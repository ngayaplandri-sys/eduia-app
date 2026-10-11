"use client";

import * as React from "react";
import { LoaderCircle, Smartphone } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";
import type { MaketouCheckoutErrorCode } from "@/lib/maketou/catalog";

/** Panier en cours, relu par la page de retour si Maketou n'ajoute pas son id. */
export const MAKETOU_CART_STORAGE_KEY = "eduia.maketou.cartId";

/**
 * « Payer avec Maketou » : crée le panier côté serveur
 * (`POST /api/billing/maketou/checkout`), puis envoie l'élève sur la page de
 * paiement hébergée par Maketou (redirection pleine page — jamais d'iframe,
 * qui casse le passage par l'application Mobile Money et la 3-D Secure).
 * L'accès n'est accordé qu'après confirmation serveur, au retour.
 */
export function MaketouPayButton({
  itemKey,
  label,
  available = true,
  unavailableLabel,
  icon = true,
  ...props
}: {
  itemKey: string;
  label: string;
  /** `false` : offre non configurée côté serveur, bouton désactivé. */
  available?: boolean;
  unavailableLabel?: string;
  icon?: boolean;
} & Omit<ButtonProps, "onClick" | "children">) {
  const { toast } = useToast();
  const { dict } = useI18n();
  const t = dict.billing;
  const [pending, setPending] = React.useState(false);

  const errorMessage = (code: string | undefined) => {
    switch (code as MaketouCheckoutErrorCode | undefined) {
      case "MAKETOU_NOT_CONFIGURED":
        return t.errorNotConfigured;
      case "TOO_MANY_CHECKOUTS":
        return t.errorTooMany;
      case "PLAN_DOWNGRADE_ACTIVE":
        return t.errorDowngrade;
      default:
        return t.errorGeneric;
    }
  };

  async function pay() {
    if (pending || !available) return;
    setPending(true);
    try {
      const response = await fetch("/api/billing/maketou/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemKey }),
      });
      const data = (await response.json().catch(() => null)) as
        | { url?: string; cartId?: string; code?: string }
        | null;
      if (!response.ok || !data?.url) {
        toast(errorMessage(data?.code), "default");
        setPending(false);
        return;
      }
      try {
        if (data.cartId) sessionStorage.setItem(MAKETOU_CART_STORAGE_KEY, data.cartId);
      } catch {
        // Stockage indisponible (navigation privée) : l'id ajouté au retour suffit.
      }
      // Le bouton reste en attente jusqu'au départ vers Maketou.
      window.location.href = data.url;
    } catch {
      toast(t.errorGeneric, "default");
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={pay}
      disabled={pending || !available}
      {...props}
    >
      {pending ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
      ) : icon ? (
        <Smartphone className="size-4" aria-hidden />
      ) : null}
      {pending ? t.redirecting : available ? label : (unavailableLabel ?? t.unavailable)}
    </Button>
  );
}
