import "server-only";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { isPaidPlan } from "@/lib/utils/plan";
import {
  CREDIT_COSTS,
  PLAN_CREDITS,
  getRechargePackage,
} from "@/lib/config/credits";
import type {
  CreditBucket,
  CreditDebitResult,
  CreditFeature,
  CreditLedgerKind,
  CreditUsageSummary,
  CreditWallet,
  SubscriptionPlanId,
} from "@/types";
import type { UserPlan } from "@/types";

/**
 * Portefeuille + grand livre + historique d'achats de crédits.
 *
 * Deux compartiments par utilisateur (`credit_wallets`), gérés séparément :
 *  - `subscriptionBalance` : quota du palier payant en cours — réinitialisé
 *    (jamais cumulé) à chaque renouvellement mensuel ou changement de palier ;
 *  - `rechargeBalance` : les 20 crédits gratuits à l'inscription (une fois)
 *    + les crédits achetés en recharge — ne se réinitialisent jamais seuls.
 * La consommation pioche d'abord `subscriptionBalance`, puis `rechargeBalance`.
 *
 * Tout débit/crédit passe par une écriture atomique en base (jamais un
 * "lire puis réécrire" côté application) pour rester correct sous
 * concurrence, et écrit systématiquement une ligne `credit_ledger` (audit).
 * La protection anti-double-facturation vient de deux couches déjà en place
 * ailleurs : le débit atomique lui-même (aucun solde négatif / perte de mise
 * à jour possible sous concurrence) et la garde côté client de chaque panneau
 * (bouton désactivé + retour anticipé pendant une requête en cours). Une
 * garde serveur "doublon rapproché" (fenêtre de quelques secondes) a été
 * essayée puis retirée : elle bloquait à tort des actions légitimes
 * distinctes envoyées rapprochées (ex. deux questions Assistant IA
 * consécutives), sans bénéfice démontré au-delà des deux garanties
 * ci-dessus — testé en conditions réelles (`scripts/_credits-e2e-verify.ts`).
 */

type DbClient = typeof db;
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = DbClient | DbTransaction;

function monthlyAmountFor(plan: UserPlan): number {
  return plan === "premium" || plan === "premium_plus"
    ? PLAN_CREDITS[plan].monthly
    : 0;
}

async function writeLedgerEntry(
  executor: Executor,
  entry: {
    userId: string;
    kind: CreditLedgerKind;
    amount: number;
    bucket: CreditBucket;
    balanceAfter: number;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await executor.insert(schema.creditLedger).values({
    userId: entry.userId,
    kind: entry.kind,
    amount: entry.amount,
    bucket: entry.bucket,
    balanceAfter: entry.balanceAfter,
    metadata: entry.metadata ?? null,
  });
}

/**
 * Ajoute `amount` au compartiment `recharge` (additif — signup, recharge).
 * Upsert : crée le portefeuille s'il n'existe pas encore.
 */
async function addToRecharge(
  executor: Executor,
  userId: string,
  amount: number,
): Promise<{ subscriptionBalance: number; rechargeBalance: number }> {
  const [row] = await executor
    .insert(schema.creditWallets)
    .values({ userId, subscriptionBalance: 0, rechargeBalance: amount })
    .onConflictDoUpdate({
      target: schema.creditWallets.userId,
      set: {
        rechargeBalance: sql`${schema.creditWallets.rechargeBalance} + ${amount}`,
        updatedAt: new Date(),
      },
    })
    .returning({
      subscriptionBalance: schema.creditWallets.subscriptionBalance,
      rechargeBalance: schema.creditWallets.rechargeBalance,
    });
  return row;
}

/**
 * Fixe (pas additif) le compartiment `subscription` à `amount` — abonnement/
 * changement de palier/renouvellement : toujours un solde plein neuf, jamais
 * un cumul (décision produit : pas de proratisation ni de cumul de mois).
 * Upsert : crée le portefeuille s'il n'existe pas encore.
 */
async function setSubscriptionBalance(
  executor: Executor,
  userId: string,
  amount: number,
): Promise<{ subscriptionBalance: number; rechargeBalance: number }> {
  const [row] = await executor
    .insert(schema.creditWallets)
    .values({ userId, subscriptionBalance: amount, rechargeBalance: 0 })
    .onConflictDoUpdate({
      target: schema.creditWallets.userId,
      set: { subscriptionBalance: amount, updatedAt: new Date() },
    })
    .returning({
      subscriptionBalance: schema.creditWallets.subscriptionBalance,
      rechargeBalance: schema.creditWallets.rechargeBalance,
    });
  return row;
}

/**
 * Réclame atomiquement le droit de renouveler la période d'un compte payant :
 * une seule requête `INSERT ... ON CONFLICT DO UPDATE ... WHERE` — l'update
 * n'a lieu (et n'est renvoyé) que si la période est absente ou expirée, donc
 * si deux requêtes arrivent en même temps après expiration, une seule "gagne"
 * et a le droit de réinitialiser le solde ensuite. La période repart toujours
 * de `now()` (pas de cumul depuis l'ancienne échéance) : un compte resté
 * inactif plusieurs mois reçoit simplement UN mois frais à son retour, jamais
 * plusieurs mois cumulés.
 */
async function claimRenewalIfDue(
  userId: string,
): Promise<{ currentPeriodEnd: Date } | null> {
  const result = await db.execute<{ current_period_end: Date }>(sql`
    INSERT INTO subscriptions (user_id, current_period_start, current_period_end)
    VALUES (${userId}, now(), now() + interval '1 month')
    ON CONFLICT (user_id) DO UPDATE
      SET current_period_start = now(),
          current_period_end = now() + interval '1 month',
          updated_at = now()
      WHERE subscriptions.current_period_end IS NULL
         OR subscriptions.current_period_end <= now()
    RETURNING current_period_end
  `);
  const row = result.rows[0];
  return row ? { currentPeriodEnd: new Date(row.current_period_end) } : null;
}

/**
 * Portefeuille courant de l'utilisateur, avec renouvellement mensuel
 * auto-guéri si la période du palier payant est expirée (voir
 * `claimRenewalIfDue`). Ne crée JAMAIS les 20 crédits gratuits d'inscription
 * ici, même si aucun portefeuille n'existe encore (ex. compte créé avant
 * cette fonctionnalité) — l'octroi de bienvenue n'est écrit qu'une fois, par
 * le hook Better Auth `databaseHooks.user.create.after` (`grantSignupCredits`).
 * Un portefeuille manquant est simplement initialisé au solde correspondant
 * au plan ACTUEL de l'utilisateur (0 pour "free").
 */
export async function getCreditWallet(userId: string): Promise<CreditWallet> {
  const [userRow] = await db
    .select({ plan: schema.user.plan })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);
  const plan = (userRow?.plan as UserPlan | undefined) ?? "free";

  let [wallet] = await db
    .select({
      subscriptionBalance: schema.creditWallets.subscriptionBalance,
      rechargeBalance: schema.creditWallets.rechargeBalance,
    })
    .from(schema.creditWallets)
    .where(eq(schema.creditWallets.userId, userId))
    .limit(1);

  if (!wallet) {
    wallet = await setSubscriptionBalance(db, userId, monthlyAmountFor(plan));
    // `setSubscriptionBalance` vise `subscriptionBalance` mais crée aussi la
    // ligne avec `rechargeBalance: 0` par défaut — correct pour un premier
    // portefeuille (une vraie recharge ne passe jamais par cette fonction).
  }

  let periodEnd: Date | null = null;
  if (isPaidPlan(plan)) {
    const claimed = await claimRenewalIfDue(userId);
    if (claimed) {
      wallet = await setSubscriptionBalance(db, userId, monthlyAmountFor(plan));
      await writeLedgerEntry(db, {
        userId,
        kind: "subscription_renewal",
        amount: monthlyAmountFor(plan),
        bucket: "subscription",
        balanceAfter: wallet.subscriptionBalance + wallet.rechargeBalance,
      });
      periodEnd = claimed.currentPeriodEnd;
    } else {
      const [sub] = await db
        .select({ currentPeriodEnd: schema.subscriptions.currentPeriodEnd })
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.userId, userId))
        .limit(1);
      periodEnd = sub?.currentPeriodEnd ?? null;
    }
  }

  return {
    subscriptionBalance: wallet.subscriptionBalance,
    rechargeBalance: wallet.rechargeBalance,
    total: wallet.subscriptionBalance + wallet.rechargeBalance,
    planMonthlyTotal: monthlyAmountFor(plan),
    periodEnd: periodEnd ? periodEnd.toISOString() : null,
  };
}

const CONSUME_KIND_BY_FEATURE: Record<CreditFeature, CreditLedgerKind> = {
  resumer: "consume_summary",
  generer: "consume_exam",
  corriger: "consume_correction",
  assistant: "consume_assistant",
};

/**
 * Débite `CREDIT_COSTS[feature]` crédits, atomiquement, AVANT tout appel IA :
 * une seule requête conditionnelle (`UPDATE ... WHERE (solde) >= coût
 * RETURNING`) — zéro ligne renvoyée = crédits insuffisants, aucune écriture
 * n'a lieu (voir `{ok:false}`). Pioche d'abord `subscriptionBalance`, puis
 * `rechargeBalance` pour le reste. Écrit une ligne `credit_ledger` en cas de
 * succès. Doit être appelée dans une transaction (`db.transaction`) créée par
 * l'appelant, pour que l'appel puisse être annulé proprement si besoin.
 */
export async function consumeCredits(
  tx: DbTransaction,
  userId: string,
  feature: CreditFeature,
): Promise<CreditDebitResult> {
  const cost = CREDIT_COSTS[feature];
  const kind = CONSUME_KIND_BY_FEATURE[feature];

  const result = await tx.execute<{
    subscription_balance: number;
    recharge_balance: number;
    drawn_from_subscription: number;
    drawn_from_recharge: number;
  }>(sql`
    WITH old AS (
      SELECT subscription_balance, recharge_balance
      FROM credit_wallets
      WHERE user_id = ${userId}
      FOR UPDATE
    )
    UPDATE credit_wallets w
    SET subscription_balance = old.subscription_balance - LEAST(old.subscription_balance, ${cost}),
        recharge_balance = old.recharge_balance - GREATEST(${cost} - old.subscription_balance, 0),
        updated_at = now()
    FROM old
    WHERE w.user_id = ${userId}
      AND (old.subscription_balance + old.recharge_balance) >= ${cost}
    RETURNING w.subscription_balance, w.recharge_balance,
      LEAST(old.subscription_balance, ${cost}) AS drawn_from_subscription,
      GREATEST(${cost} - old.subscription_balance, 0) AS drawn_from_recharge
  `);

  const row = result.rows[0];
  if (!row) return { ok: false };

  const balanceAfter = row.subscription_balance + row.recharge_balance;
  await writeLedgerEntry(tx, {
    userId,
    kind,
    amount: -cost,
    bucket: row.drawn_from_subscription > 0 ? "subscription" : "recharge",
    balanceAfter,
    metadata: {
      drawnFromSubscription: row.drawn_from_subscription,
      drawnFromRecharge: row.drawn_from_recharge,
    },
  });

  return {
    ok: true,
    drawnFromSubscription: row.drawn_from_subscription,
    drawnFromRecharge: row.drawn_from_recharge,
    wallet: {
      subscriptionBalance: row.subscription_balance,
      rechargeBalance: row.recharge_balance,
      total: balanceAfter,
      planMonthlyTotal: 0, // non pertinent ici — le caller a déjà cette info si besoin
      periodEnd: null,
    },
  };
}

/**
 * Rembourse exactement ce qu'une consommation a prélevé (échec de l'appel IA
 * ou de la sauvegarde du résultat après un débit réussi) — même répartition
 * entre compartiments, pour ne jamais "recréer" des crédits d'un compartiment
 * qui n'a pas été touché.
 */
export async function refundCredits(
  tx: DbTransaction,
  userId: string,
  drawnFromSubscription: number,
  drawnFromRecharge: number,
  feature: CreditFeature,
): Promise<void> {
  if (drawnFromSubscription <= 0 && drawnFromRecharge <= 0) return;

  const result = await tx.execute<{
    subscription_balance: number;
    recharge_balance: number;
  }>(sql`
    UPDATE credit_wallets
    SET subscription_balance = subscription_balance + ${drawnFromSubscription},
        recharge_balance = recharge_balance + ${drawnFromRecharge},
        updated_at = now()
    WHERE user_id = ${userId}
    RETURNING subscription_balance, recharge_balance
  `);
  const row = result.rows[0];
  if (!row) return;

  await writeLedgerEntry(tx, {
    userId,
    kind: "refund",
    amount: drawnFromSubscription + drawnFromRecharge,
    bucket: drawnFromSubscription > 0 ? "subscription" : "recharge",
    balanceAfter: row.subscription_balance + row.recharge_balance,
    metadata: { feature },
  });
}

/**
 * Octroie les 20 crédits gratuits de bienvenue — implémentation dans
 * `lib/db/credit-grants.ts` (sans `server-only`, car appelée par le hook
 * Better Auth `databaseHooks.user.create.after` dans `lib/auth.ts`, lui-même
 * chargé par la CLI Better Auth et les scripts de vérification, hors contexte
 * React). Réexportée ici pour que le reste de l'appli n'ait qu'un seul point
 * d'entrée crédits (`@/lib/data/credits`). Exactement une fois par compte, à
 * la création réelle — ne jamais appeler ce chemin depuis `getCreditWallet()`
 * ou un autre repli paresseux (voir sa docstring).
 */
export { grantSignupCredits } from "@/lib/db/credit-grants";

/**
 * Abonnement (ou changement de palier) — toujours un solde `subscription`
 * plein neuf au nouveau palier, période repartant de `now()`, sans
 * proratisation (simplification assumée pour ce système de paiement simulé).
 * `rechargeBalance` n'est jamais touché ici.
 */
export async function applyPlanSubscription(
  userId: string,
  plan: SubscriptionPlanId,
): Promise<CreditWallet> {
  const monthly = PLAN_CREDITS[plan].monthly;
  const priceFcfa = PLAN_CREDITS[plan].priceFcfa;
  const now = new Date();
  const periodEnd = new Date(now.getTime());
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await db
    .update(schema.user)
    .set({ plan })
    .where(eq(schema.user.id, userId));

  await db
    .insert(schema.subscriptions)
    .values({
      userId,
      premiumActivatedAt: now,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    })
    .onConflictDoUpdate({
      target: schema.subscriptions.userId,
      set: {
        premiumActivatedAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        updatedAt: now,
      },
    });

  const wallet = await setSubscriptionBalance(db, userId, monthly);

  await writeLedgerEntry(db, {
    userId,
    kind: "subscription_upgrade",
    amount: monthly,
    bucket: "subscription",
    balanceAfter: wallet.subscriptionBalance + wallet.rechargeBalance,
    metadata: { plan },
  });

  await db.insert(schema.creditOrders).values({
    userId,
    kind: `subscription_${plan}`,
    amountFcfa: priceFcfa,
    creditsGranted: monthly,
    paymentReference: `SIM-SUB-${Date.now()}-${userId.slice(0, 8)}`,
  });

  return {
    subscriptionBalance: wallet.subscriptionBalance,
    rechargeBalance: wallet.rechargeBalance,
    total: wallet.subscriptionBalance + wallet.rechargeBalance,
    planMonthlyTotal: monthly,
    periodEnd: periodEnd.toISOString(),
  };
}

/** Achat de crédits de recharge — ajoutés à `rechargeBalance`, jamais au compartiment `subscription`. */
export async function applyRecharge(
  userId: string,
  packageId: string,
): Promise<CreditWallet> {
  const pkg = getRechargePackage(packageId);
  if (!pkg) throw new Error(`Pack de recharge inconnu : ${packageId}`);

  const wallet = await addToRecharge(db, userId, pkg.credits);

  await writeLedgerEntry(db, {
    userId,
    kind: "recharge_purchase",
    amount: pkg.credits,
    bucket: "recharge",
    balanceAfter: wallet.subscriptionBalance + wallet.rechargeBalance,
    metadata: { packageId },
  });

  await db.insert(schema.creditOrders).values({
    userId,
    kind: pkg.id,
    amountFcfa: pkg.priceFcfa,
    creditsGranted: pkg.credits,
    paymentReference: `SIM-RCH-${Date.now()}-${userId.slice(0, 8)}`,
  });

  const [userRow] = await db
    .select({ plan: schema.user.plan })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);

  return {
    subscriptionBalance: wallet.subscriptionBalance,
    rechargeBalance: wallet.rechargeBalance,
    total: wallet.subscriptionBalance + wallet.rechargeBalance,
    planMonthlyTotal: monthlyAmountFor((userRow?.plan as UserPlan | undefined) ?? "free"),
    periodEnd: null,
  };
}

/**
 * Compteurs d'utilisation réelle pour le dashboard — réutilise les tables
 * existantes (même patron que `computeStats()` dans `lib/data/documents.ts`),
 * aucune nouvelle table de comptage nécessaire.
 */
export async function getUsageSummary(userId: string): Promise<CreditUsageSummary> {
  const [[summaries], [exams], [corrections], [assistant]] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.summaries)
      .where(eq(schema.summaries.userId, userId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.exams)
      .where(eq(schema.exams.userId, userId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.corrections)
      .where(eq(schema.corrections.userId, userId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.aiUsage)
      .where(
        sql`${schema.aiUsage.userId} = ${userId} AND ${schema.aiUsage.kind} = 'assistant' AND ${schema.aiUsage.status} = 'success'`,
      ),
  ]);

  return {
    summaries: summaries?.count ?? 0,
    exams: exams?.count ?? 0,
    corrections: corrections?.count ?? 0,
    assistantQuestions: assistant?.count ?? 0,
  };
}
