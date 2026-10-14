import {
  PLAN_CREDITS,
  RETIRED_PLAN_CREDITS,
  RETIRED_RECHARGE_PACKAGES,
} from "@/lib/config/credits";
import type { RechargePackageId, SubscriptionPlanId } from "@/types";

/**
 * Catalogue des offres vendues via Maketou — dérivé des prix réels de l'app
 * (`PLAN_CREDITS`), jamais de la requête du client. Une seule offre payante :
 * Premium, 2 500 FCFA pour un mois.
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

export const PREMIUM_ITEM_KEY = "plan_premium";

/** Offres EN VENTE — la seule liste que le serveur accepte à l'achat. */
export const MAKETOU_ITEMS: readonly MaketouItem[] = [
  {
    key: PREMIUM_ITEM_KEY,
    envVar: "MAKETOU_PRODUCT_PREMIUM",
    price: PLAN_CREDITS.premium.priceFcfa,
    grant: { kind: "plan", plan: "premium", credits: PLAN_CREDITS.premium.monthly },
  },
];

/**
 * Anciennes offres RETIRÉES de la vente (Premium+, recharges de crédits) :
 * jamais achetables (absentes de `MAKETOU_ITEMS`, refusées en 400
 * `UNKNOWN_ITEM`). Servent seulement à accorder ce qu'un panier ouvert avant
 * le retrait a réellement acheté, s'il est payé plus tard.
 */
const RETIRED_GRANTS: Readonly<Record<string, MaketouGrant>> = {
  plan_premium_plus: {
    kind: "plan",
    plan: "premium_plus" satisfies SubscriptionPlanId,
    credits: RETIRED_PLAN_CREDITS.premium_plus.monthly,
  },
  ...Object.fromEntries(
    RETIRED_RECHARGE_PACKAGES.map((pkg) => [
      pkg.id,
      { kind: "recharge" as const, packageId: pkg.id, credits: pkg.credits },
    ]),
  ),
};

/** Offre en vente (et seulement en vente) correspondant à une clé. */
export function findMaketouItem(key: string): MaketouItem | null {
  return MAKETOU_ITEMS.find((item) => item.key === key) ?? null;
}

/** Ce qu'accorde une ancienne offre retirée, pour un panier déjà ouvert. */
export function retiredGrantForKey(key: string): MaketouGrant | null {
  return Object.hasOwn(RETIRED_GRANTS, key) ? RETIRED_GRANTS[key] : null;
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
