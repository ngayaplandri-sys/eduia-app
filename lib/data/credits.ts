import "server-only";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { isPaidPlan } from "@/lib/utils/plan";
import { CREDIT_COSTS, PLAN_CREDITS } from "@/lib/config/credits";
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
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
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
 * Verrou transactionnel par compte : sérialise tout ce qui modifie le palier
 * ou le portefeuille d'un même élève en plusieurs étapes (paiement accordé,
 * expiration), pour qu'aucune lecture-modification-écriture ne se croise.
 * Libéré automatiquement à la fin de la transaction.
 */
async function lockAccount(tx: DbTransaction, userId: string): Promise<void> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`account:${userId}`}))`);
}

/**
 * Fin de la période payée : un palier payant n'est plus renouvelé
 * gratuitement (les paiements Maketou sont ponctuels, sans prélèvement
 * automatique). Le compte revient au palier gratuit et les crédits du palier
 * expirent ; les crédits de recharge, eux, sont conservés.
 *
 * Atomique et idempotente (verrou du compte + conditions sur l'échéance) :
 * deux appels simultanés n'écrivent qu'une seule expiration. Un palier posé à
 * la main en base, sans période (`subscriptions.current_period_end` vide),
 * n'expire jamais.
 *
 * @returns `true` si le compte vient d'être ramené au palier gratuit.
 */
export async function expireSubscriptionIfDue(userId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    await lockAccount(tx, userId);
    const due = await tx.execute<{ plan: string }>(sql`
      SELECT u.plan
      FROM "user" u
      JOIN subscriptions s ON s.user_id = u.id
      WHERE u.id = ${userId}
        AND u.plan IN ('premium', 'premium_plus')
        AND s.current_period_end IS NOT NULL
        AND s.current_period_end <= now()
    `);
    if (due.rows.length === 0) return false;

    await tx.update(schema.user).set({ plan: "free" }).where(eq(schema.user.id, userId));
    const expired = await tx.execute<{
      expired: number;
      subscription_balance: number;
      recharge_balance: number;
    }>(sql`
      WITH old AS (
        SELECT subscription_balance FROM credit_wallets WHERE user_id = ${userId} FOR UPDATE
      )
      UPDATE credit_wallets w
      SET subscription_balance = 0, updated_at = now()
      FROM old
      WHERE w.user_id = ${userId}
      RETURNING old.subscription_balance AS expired, w.subscription_balance, w.recharge_balance
    `);
    const row = expired.rows[0];
    if (row && row.expired > 0) {
      await writeLedgerEntry(tx, {
        userId,
        kind: "subscription_expired",
        amount: -row.expired,
        bucket: "subscription",
        balanceAfter: row.subscription_balance + row.recharge_balance,
        metadata: { plan: due.rows[0].plan },
      });
    }
    return true;
  });
}

/**
 * Expire tous les paliers arrivés à échéance (rapprochement planifié) : sans
 * cela, un élève qui ne revient pas garderait son badge Premium en base.
 */
export async function expireDueSubscriptions(limit = 200): Promise<number> {
  const due = await db.execute<{ user_id: string }>(sql`
    SELECT s.user_id
    FROM subscriptions s
    JOIN "user" u ON u.id = s.user_id
    WHERE u.plan IN ('premium', 'premium_plus')
      AND s.current_period_end IS NOT NULL
      AND s.current_period_end <= now()
    LIMIT ${limit}
  `);
  let expired = 0;
  for (const { user_id } of due.rows) {
    if (await expireSubscriptionIfDue(user_id)) expired += 1;
  }
  return expired;
}

/**
 * Portefeuille courant de l'utilisateur. Expire d'abord le palier payant si
 * sa période payée est terminée (`expireSubscriptionIfDue`) — il n'y a plus
 * de renouvellement automatique gratuit. Ne crée JAMAIS les 20 crédits
 * gratuits d'inscription ici, même si aucun portefeuille n'existe encore (ex.
 * compte créé avant cette fonctionnalité) — l'octroi de bienvenue n'est écrit
 * qu'une fois, par le hook Better Auth `databaseHooks.user.create.after`
 * (`grantSignupCredits`). Un portefeuille manquant est simplement initialisé
 * au solde correspondant au plan ACTUEL de l'utilisateur (0 pour "free").
 *
 * `periodEnd` : fin de la période payée du palier en cours (accès actif
 * jusqu'à cette date), `null` sans palier payant.
 */
export async function getCreditWallet(userId: string): Promise<CreditWallet> {
  await expireSubscriptionIfDue(userId);

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
    const [sub] = await db
      .select({ currentPeriodEnd: schema.subscriptions.currentPeriodEnd })
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.userId, userId))
      .limit(1);
    periodEnd = sub?.currentPeriodEnd ?? null;
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

const PLAN_RANK: Record<UserPlan, number> = { free: 0, premium: 1, premium_plus: 2 };

/** Ce qu'un paiement confirmé accorde (voir `lib/maketou/catalog.ts`). */
export type PaidGrant =
  | { kind: "plan"; plan: SubscriptionPlanId; credits: number }
  | { kind: "recharge"; packageId: string; credits: number }
  | { kind: "test"; credits: number };

export interface PaidPurchaseRef {
  /** Fournisseur de paiement (`credit_orders.payment_provider`). */
  provider: string;
  /** Référence unique du paiement (identifiant du panier Maketou). */
  reference: string;
  /** Montant réellement facturé (instantané pris à la création du panier). */
  amountFcfa: number;
}

/**
 * Accorde un achat PAYÉ, dans la transaction de l'appelant (qui a déjà
 * réclamé le paiement une seule fois, voir `fulfillMaketouCheckout`).
 * Verrouille le compte, puis :
 *  - recharge (ou offre de test) : crédits ajoutés au compartiment
 *    `recharge`, qui n'expire jamais ;
 *  - palier, sans palier actif : le palier démarre maintenant pour un mois,
 *    avec ses crédits ;
 *  - même palier déjà actif (renouvellement, même anticipé) : un mois de plus
 *    à la suite de l'échéance, crédits du mois ajoutés — rien n'est perdu ;
 *  - palier supérieur (passage à Premium+) : bascule immédiate pour un mois,
 *    crédits ajoutés à ceux qui restent ;
 *  - palier inférieur payé pendant un palier supérieur actif (cas de course,
 *    la page Premium l'empêche) : crédits ajoutés et un mois de plus au palier
 *    actuel, avec une remarque pour l'admin.
 * Écrit toujours une ligne `credit_ledger` et une ligne `credit_orders`.
 *
 * @returns une remarque d'exploitation éventuelle (à garder sur le paiement).
 */
export async function grantPaidPurchase(
  tx: DbTransaction,
  userId: string,
  grant: PaidGrant,
  ref: PaidPurchaseRef,
): Promise<{ note: string | null }> {
  await lockAccount(tx, userId);

  if (grant.kind !== "plan") {
    const wallet = await addToRecharge(tx, userId, grant.credits);
    await writeLedgerEntry(tx, {
      userId,
      kind: "recharge_purchase",
      amount: grant.credits,
      bucket: "recharge",
      balanceAfter: wallet.subscriptionBalance + wallet.rechargeBalance,
      metadata: {
        packageId: grant.kind === "recharge" ? grant.packageId : "test",
        provider: ref.provider,
        reference: ref.reference,
      },
    });
    await tx.insert(schema.creditOrders).values({
      userId,
      kind: grant.kind === "recharge" ? grant.packageId : "test_offer",
      amountFcfa: ref.amountFcfa,
      creditsGranted: grant.credits,
      paymentProvider: ref.provider,
      paymentReference: ref.reference,
    });
    return { note: null };
  }

  const state = await tx.execute<{ plan: string; current_period_end: Date | null }>(sql`
    SELECT u.plan, s.current_period_end
    FROM "user" u
    LEFT JOIN subscriptions s ON s.user_id = u.id
    WHERE u.id = ${userId}
  `);
  const current = state.rows[0];
  if (!current) throw new Error("grantPaidPurchase: compte introuvable");
  const currentPlan = (current.plan as UserPlan) ?? "free";
  const active =
    isPaidPlan(currentPlan) &&
    current.current_period_end !== null &&
    new Date(current.current_period_end).getTime() > Date.now();

  let note: string | null = null;
  let ledgerKind: CreditLedgerKind = "subscription_upgrade";
  let newPlan: SubscriptionPlanId = grant.plan;
  let extendFromCurrentEnd = false;
  let resetBalance = !active;

  if (active && currentPlan === grant.plan) {
    ledgerKind = "subscription_renewal";
    extendFromCurrentEnd = true;
  } else if (active && PLAN_RANK[grant.plan] < PLAN_RANK[currentPlan]) {
    newPlan = currentPlan as SubscriptionPlanId;
    ledgerKind = "subscription_renewal";
    extendFromCurrentEnd = true;
    note = `palier ${grant.plan} payé pendant un palier ${currentPlan} actif : crédits ajoutés, un mois de plus au palier actuel`;
  } else if (active) {
    // Passage au palier supérieur : nouveau mois immédiat, crédits cumulés.
    resetBalance = false;
  }

  await tx.update(schema.user).set({ plan: newPlan }).where(eq(schema.user.id, userId));

  const periodEnd = extendFromCurrentEnd
    ? sql`GREATEST(now(), subscriptions.current_period_end) + interval '1 month'`
    : sql`now() + interval '1 month'`;
  await tx.execute(sql`
    INSERT INTO subscriptions (user_id, premium_activated_at, current_period_start, current_period_end, payment_provider, payment_reference)
    VALUES (${userId}, now(), now(), now() + interval '1 month', ${ref.provider}, ${ref.reference})
    ON CONFLICT (user_id) DO UPDATE SET
      premium_activated_at = COALESCE(subscriptions.premium_activated_at, now()),
      current_period_start = ${extendFromCurrentEnd ? sql`COALESCE(subscriptions.current_period_start, now())` : sql`now()`},
      current_period_end = ${periodEnd},
      payment_provider = ${ref.provider},
      payment_reference = ${ref.reference},
      updated_at = now()
  `);

  const wallet = resetBalance
    ? await setSubscriptionBalance(tx, userId, grant.credits)
    : await addToSubscription(tx, userId, grant.credits);

  await writeLedgerEntry(tx, {
    userId,
    kind: ledgerKind,
    amount: grant.credits,
    bucket: "subscription",
    balanceAfter: wallet.subscriptionBalance + wallet.rechargeBalance,
    metadata: { plan: grant.plan, provider: ref.provider, reference: ref.reference },
  });
  await tx.insert(schema.creditOrders).values({
    userId,
    kind: `subscription_${grant.plan}`,
    amountFcfa: ref.amountFcfa,
    creditsGranted: grant.credits,
    paymentProvider: ref.provider,
    paymentReference: ref.reference,
  });

  return { note };
}

/** Ajoute `amount` au compartiment `subscription` (renouvellement, passage supérieur). */
async function addToSubscription(
  executor: Executor,
  userId: string,
  amount: number,
): Promise<{ subscriptionBalance: number; rechargeBalance: number }> {
  const [row] = await executor
    .insert(schema.creditWallets)
    .values({ userId, subscriptionBalance: amount, rechargeBalance: 0 })
    .onConflictDoUpdate({
      target: schema.creditWallets.userId,
      set: {
        subscriptionBalance: sql`${schema.creditWallets.subscriptionBalance} + ${amount}`,
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
