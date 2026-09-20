import type {
  CreditFeature,
  RechargePackageId,
  SubscriptionPlanId,
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

/** Crédits octroyés par palier — gratuit = une fois à l'inscription, payants = par mois. */
export const PLAN_CREDITS: {
  free: { signupGrant: number; priceFcfa: number };
  premium: { monthly: number; priceFcfa: number };
  premium_plus: { monthly: number; priceFcfa: number };
} = {
  free: { signupGrant: 20, priceFcfa: 0 },
  premium: { monthly: 500, priceFcfa: 2500 },
  premium_plus: { monthly: 1000, priceFcfa: 4000 },
};

export interface RechargePackage {
  id: RechargePackageId;
  credits: number;
  priceFcfa: number;
}

export const RECHARGE_PACKAGES: RechargePackage[] = [
  { id: "recharge_100", credits: 100, priceFcfa: 500 },
  { id: "recharge_250", credits: 250, priceFcfa: 1000 },
  { id: "recharge_500", credits: 500, priceFcfa: 1800 },
  { id: "recharge_1000", credits: 1000, priceFcfa: 3000 },
];

export function getRechargePackage(id: string): RechargePackage | null {
  return RECHARGE_PACKAGES.find((pkg) => pkg.id === id) ?? null;
}

export function isSubscriptionPlanId(value: string): value is SubscriptionPlanId {
  return value === "premium" || value === "premium_plus";
}
