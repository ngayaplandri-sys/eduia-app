/** Compartiment débité/crédité par une écriture du grand livre de crédits. */
export type CreditBucket = "subscription" | "recharge";

/** Nature d'une écriture de `credit_ledger` — voir `lib/db/schema.ts` pour le détail. */
export type CreditLedgerKind =
  | "signup_grant"
  | "subscription_renewal"
  | "subscription_upgrade"
  | "recharge_purchase"
  | "consume_summary"
  | "consume_exam"
  | "consume_correction"
  | "consume_assistant"
  | "refund"
  | "admin_adjustment";

/** Fonctionnalités facturées en crédits — clé de `CREDIT_COSTS` (`lib/config/credits.ts`). */
export type CreditFeature = "resumer" | "generer" | "corriger" | "assistant";

/** Identifiant d'un palier payant d'abonnement. */
export type SubscriptionPlanId = "premium" | "premium_plus";

/** Identifiant d'un pack de recharge — clé de `RECHARGE_PACKAGES` (`lib/config/credits.ts`). */
export type RechargePackageId =
  | "recharge_100"
  | "recharge_250"
  | "recharge_500"
  | "recharge_1000";

/** Solde de crédits d'un utilisateur, tel que renvoyé par `getCreditWallet()`. */
export interface CreditWallet {
  subscriptionBalance: number;
  rechargeBalance: number;
  /** `subscriptionBalance + rechargeBalance`. */
  total: number;
  /** Quota plein du palier actuel (0 pour "free") — dénominateur de la barre de progression. */
  planMonthlyTotal: number;
  /** Date ISO 8601 de la prochaine échéance, `null` pour un compte gratuit. */
  periodEnd: string | null;
}

export interface CreditLedgerEntry {
  id: string;
  kind: CreditLedgerKind;
  amount: number;
  bucket: CreditBucket;
  balanceAfter: number;
  createdAt: string;
}

export type CreditOrderKind = `subscription_${SubscriptionPlanId}` | RechargePackageId;

export interface CreditOrder {
  id: string;
  userId: string;
  kind: CreditOrderKind;
  amountFcfa: number;
  creditsGranted: number;
  status: string;
  paymentProvider: string;
  paymentReference: string;
  createdAt: string;
}

/** Résultat d'un débit atomique — voir `consumeCredits()` (`lib/data/credits.ts`). */
export type CreditDebitResult =
  | { ok: true; drawnFromSubscription: number; drawnFromRecharge: number; wallet: CreditWallet }
  | { ok: false };

/** Compteurs d'utilisation réelle affichés au dashboard — voir `getUsageSummary()`. */
export interface CreditUsageSummary {
  summaries: number;
  exams: number;
  corrections: number;
  assistantQuestions: number;
}
