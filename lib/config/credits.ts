import type {
  CreditFeature,
  RechargePackageId,
  UserPlan,
} from "@/types";

/**
 * Coût en crédits de chaque fonctionnalité IA — prélevé atomiquement avant
 * l'appel OpenAI (voir `lib/data/credits.ts` `consumeCredits()`), jamais côté
 * client. « Régénérer une épreuve » n'a pas de coût séparé : régénérer est un
 * nouvel appel à `POST /api/ai/generate-exam`, donc déjà facturé `generer`
 * (10) — aucun `kind` de grand livre dédié n'existe pour ça.
 */
export const CREDIT_COSTS: Record<CreditFeature, number> = {
  resumer: 5,
  generer: 10,
  corriger: 10,
  assistant: 1,
};

/**
 * Les DEUX seules offres d'EduIA : Gratuit (crédits une fois, à l'inscription)
 * et Premium (abonnement d'un mois, payé via Maketou). Source unique des prix
 * affichés et du catalogue de paiement (`lib/maketou/catalog.ts`).
 */
export const PLAN_CREDITS: {
  free: { signupGrant: number; priceFcfa: number };
  premium: { monthly: number; priceFcfa: number };
} = {
  free: { signupGrant: 10, priceFcfa: 0 },
  premium: { monthly: 500, priceFcfa: 2500 },
};

/**
 * Anciennes offres, RETIRÉES de la vente (15/10/2026) : ni affichées, ni
 * achetables (le serveur refuse leur clé, voir `resolvePurchasableItem`).
 * Conservées uniquement pour honorer un panier Maketou ouvert avant le retrait
 * et payé ensuite (on accorde exactement ce qui a été acheté, au prix payé), et
 * pour lire l'historique (anciennes commandes, comptes encore en Premium+).
 */
export const RETIRED_PLAN_CREDITS = {
  premium_plus: { monthly: 1000, priceFcfa: 4000 },
} as const;

export const RETIRED_RECHARGE_PACKAGES: readonly {
  id: RechargePackageId;
  credits: number;
  priceFcfa: number;
}[] = [
  { id: "recharge_100", credits: 100, priceFcfa: 500 },
  { id: "recharge_250", credits: 250, priceFcfa: 1000 },
  { id: "recharge_500", credits: 500, priceFcfa: 1800 },
  { id: "recharge_1000", credits: 1000, priceFcfa: 3000 },
];

/** Crédits mensuels d'un palier payant (y compris un ancien Premium+ encore actif). */
export function planMonthlyCredits(plan: UserPlan): number {
  if (plan === "premium") return PLAN_CREDITS.premium.monthly;
  if (plan === "premium_plus") return RETIRED_PLAN_CREDITS.premium_plus.monthly;
  return 0;
}
