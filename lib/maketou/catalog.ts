import { PLAN_CREDITS, RECHARGE_PACKAGES } from "@/lib/config/credits";
import type { RechargePackageId, SubscriptionPlanId } from "@/types";

/**
 * Catalogue des offres vendues via Maketou — dérivé des prix réels de l'app
 * (`PLAN_CREDITS`, `RECHARGE_PACKAGES`), jamais de la requête du client.
 *
 * Un produit Maketou à PRIX FIXE par offre (choix validé avec le
 * propriétaire) : Maketou facture le prix du tableau de bord, on n'envoie
 * jamais `customerPrice`. `price` n'est que l'instantané enregistré en base ;
 * il doit être égal au prix du produit chez Maketou.
 *
 * Client-safe : aucune variable d'environnement ici (les identifiants de
 * produits sont lus côté serveur, `lib/maketou/config.ts`).
 */

/** Devise des produits Maketou (boutique en FCFA d'Afrique centrale). */
export const MAKETOU_CURRENCY = "XAF";

export type MaketouGrant =
  | { kind: "plan"; plan: SubscriptionPlanId; credits: number }
  | { kind: "recharge"; packageId: RechargePackageId; credits: number }
  /** Offre de test à petit prix (admins uniquement) : quelques crédits de recharge. */
  | { kind: "test"; credits: number };

export interface MaketouItem {
  key: string;
  /** Variable d'environnement qui porte l'identifiant public du produit. */
  envVar: string;
  /** Prix facturé (XAF, entier) — instantané ; égal au prix Maketou. */
  price: number;
  grant: MaketouGrant;
}

export const MAKETOU_TEST_ITEM_KEY = "test_offer";

/** Crédits de recharge accordés par l'offre de test. */
export const MAKETOU_TEST_CREDITS = 10;

export const MAKETOU_ITEMS: readonly MaketouItem[] = [
  {
    key: "plan_premium",
    envVar: "MAKETOU_PRODUCT_PREMIUM",
    price: PLAN_CREDITS.premium.priceFcfa,
    grant: { kind: "plan", plan: "premium", credits: PLAN_CREDITS.premium.monthly },
  },
  {
    key: "plan_premium_plus",
    envVar: "MAKETOU_PRODUCT_PREMIUM_PLUS",
    price: PLAN_CREDITS.premium_plus.priceFcfa,
    grant: {
      kind: "plan",
      plan: "premium_plus",
      credits: PLAN_CREDITS.premium_plus.monthly,
    },
  },
  ...RECHARGE_PACKAGES.map((pkg) => ({
    key: pkg.id,
    envVar: `MAKETOU_PRODUCT_${pkg.id.toUpperCase()}`,
    price: pkg.priceFcfa,
    grant: { kind: "recharge" as const, packageId: pkg.id, credits: pkg.credits },
  })),
];

export function planItemKey(plan: SubscriptionPlanId): string {
  return plan === "premium_plus" ? "plan_premium_plus" : "plan_premium";
}

export function findMaketouItem(key: string): MaketouItem | null {
  return MAKETOU_ITEMS.find((item) => item.key === key) ?? null;
}

/** Codes d'erreur stables renvoyés par les routes Maketou, traduits par l'UI. */
export type MaketouCheckoutErrorCode =
  | "MAKETOU_NOT_CONFIGURED"
  | "UNKNOWN_ITEM"
  | "PLAN_DOWNGRADE_ACTIVE"
  | "TOO_MANY_CHECKOUTS"
  | "MAKETOU_PRICE_BELOW_MINIMUM"
  | "MAKETOU_CHECKOUT_FAILED";

/** Réponse de `POST /api/billing/maketou/confirm`. */
export type MaketouConfirmStatus =
  | "completed"
  | "waiting_payment"
  | "payment_failed"
  | "abandoned"
  | "checking";
