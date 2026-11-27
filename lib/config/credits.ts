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
 *
 * Premium = 30 $ par mois, encaissé en FCFA par Maketou :
 *  - `priceFcfa` (17 650) : prix du produit Premium chez Maketou — doit lui
 *    être EXACTEMENT égal ; enregistré à chaque achat et compté dans les
 *    revenus de l'admin ;
 *  - `paidFcfa` (18 000, ≈ 30,20 $ au taux du 23/11/2026) : ce que l'élève
 *    paie réellement, la page de paiement (Moneroo) ajoutant 2 % de frais
 *    (17 650 × 1,02 = 18 003, arrondi à 18 000) — le prix AFFICHÉ aux élèves.
 *    Le prix Maketou doit être un multiple de 50 : avec les 2 %, tout autre
 *    prix donne des centimes que Moneroo refuse en XAF (17 647 × 1,02 =
 *    17 999,94 → aucun panier ne pouvait être créé).
 * Ailleurs qu'en zone FCFA, le prix est affiché dans la monnaie de l'élève à
 * titre indicatif (`lib/pricing/local-price.ts`).
 */
export const PLAN_CREDITS: {
  free: { signupGrant: number; priceFcfa: number };
  premium: { monthly: number; priceFcfa: number; paidFcfa: number };
} = {
  free: { signupGrant: 10, priceFcfa: 0 },
  premium: { monthly: 500, priceFcfa: 17_650, paidFcfa: 18_000 },
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

/**
 * Plafonds quotidiens (journée UTC) des appels IA qui ne prélèvent aucun
 * crédit : la lecture des photos de cours et des pages scannées (préparation
 * d'un cours) et la voix du professeur (qu'on peut réécouter). Sans eux, un
 * seul compte, même gratuit, pourrait vider le solde OpenAI en boucle. Les
 * comptes admin aux crédits illimités n'ont pas de plafond.
 */
export const DAILY_AI_LIMITS = {
  /** Images lues par la vision OpenAI (1 photo ou 1 page scannée = 1). */
  ocrImages: { free: 60, paid: 400 },
  /** Caractères prononcés par la voix du professeur (≈ 900 par minute). */
  speechChars: { free: 40_000, paid: 300_000 },
  /**
   * Questions orales transcrites (Professeur vocal) : la transcription est
   * payée à OpenAI même quand la question ne coûte aucun crédit (rien
   * d'audible, simple « oui » glissé pendant la voix, crédits épuisés).
   */
  transcriptions: { free: 20, paid: 400 },
} as const;

export function dailyAiLimit(
  kind: keyof typeof DAILY_AI_LIMITS,
  plan: UserPlan,
): number {
  return plan === "free" ? DAILY_AI_LIMITS[kind].free : DAILY_AI_LIMITS[kind].paid;
}
