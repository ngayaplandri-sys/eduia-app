import "server-only";
import { randomUUID } from "node:crypto";
import { and, desc, eq, gt, ne, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { MaketouCheckoutRow } from "@/lib/db/schema";
import { expireDueSubscriptions, grantPaidPurchase } from "@/lib/data/credits";
import {
  MaketouError,
  createMaketouCart,
  isMaketouCartId,
  isMaketouOutage,
  retrieveMaketouCart,
  type MaketouCartStatus,
} from "@/lib/maketou/client";
import {
  MAKETOU_ITEMS,
  findMaketouItem,
  type MaketouCheckoutErrorCode,
  type MaketouConfirmStatus,
} from "@/lib/maketou/catalog";
import {
  apiKeyIssue,
  grantForItemKey,
  maketouConfigIssues,
  maketouCurrency,
  resolveAppUrl,
  resolvePurchasableItem,
} from "@/lib/maketou/config";
import type { User, UserPlan } from "@/types";

/**
 * Paiements Maketou de bout en bout (voir aussi `lib/maketou/*`).
 *
 * Maketou n'envoie aucun webhook : la seule preuve de paiement est une lecture
 * SERVEUR du panier qui répond `completed`. Deux « sondeurs » la déclenchent :
 *  - la page de retour (`/billing/maketou/return`, chemin rapide), qui appelle
 *    `confirmMaketouCheckout` toutes les quelques secondes ;
 *  - le rapprochement planifié (`runMaketouReconcile`, toutes les 5 minutes),
 *    filet de sécurité pour l'élève qui paie puis ferme l'onglet.
 *
 * Deux invariants : `syncCheckout` est le SEUL code qui lit le statut Maketou
 * et agit dessus ; `fulfillMaketouCheckout` est le SEUL code qui accorde un
 * droit, exactement une fois (réclamation conditionnelle en transaction).
 */

const PROVIDER = "maketou";
export const MAKETOU_RETURN_PATH = "/billing/maketou/return";

/** Au-delà, un panier encore en attente est clos (EXPIRED / FAILED). */
const PENDING_WINDOW_MS = 48 * 60 * 60 * 1000;
/** Au-delà, une erreur propre au panier (404, compte différent…) le clôt. */
const CART_ERROR_CLOSE_MS = 72 * 60 * 60 * 1000;
/** Paniers créés par acheteur et par heure. */
const CHECKOUTS_PER_HOUR = 5;
/** Délai minimal entre deux appels à Maketou pour un même acheteur / panier. */
const POLL_GAP_MS = 4_000;
/** Délai total d'une confirmation interactive (page de retour). */
const CONFIRM_TIMEOUT_MS = 8_000;
/** Délai d'un appel Maketou dans le rapprochement planifié. */
const JOB_CALL_TIMEOUT_MS = 15_000;

const PLAN_RANK: Record<UserPlan, number> = { free: 0, premium: 1, premium_plus: 2 };

function log(level: "info" | "warn" | "error", message: string, data: Record<string, unknown> = {}) {
  console[level](`[maketou] ${message}`, data);
}

function asMaketouError(error: unknown): MaketouError {
  return error instanceof MaketouError
    ? error
    : new MaketouError("NETWORK_ERROR", `unexpected ${(error as Error)?.name ?? "error"}`);
}

// ───────────────────────────── Limites atomiques ─────────────────────────────

/** Réserve un panier dans la fenêtre d'une heure de l'acheteur (une requête). */
async function takeCheckoutSlot(userId: string): Promise<boolean> {
  const result = await db.execute(sql`
    INSERT INTO maketou_buyer_limits (user_id, checkout_window_start, checkout_count)
    VALUES (${userId}, now(), 1)
    ON CONFLICT (user_id) DO UPDATE SET
      checkout_count = CASE
        WHEN maketou_buyer_limits.checkout_window_start <= now() - interval '1 hour' THEN 1
        ELSE maketou_buyer_limits.checkout_count + 1 END,
      checkout_window_start = CASE
        WHEN maketou_buyer_limits.checkout_window_start <= now() - interval '1 hour' THEN now()
        ELSE maketou_buyer_limits.checkout_window_start END
    WHERE maketou_buyer_limits.checkout_window_start <= now() - interval '1 hour'
       OR maketou_buyer_limits.checkout_count < ${CHECKOUTS_PER_HOUR}
    RETURNING user_id
  `);
  return result.rows.length > 0;
}

/** Rend la réservation quand Maketou est en panne : l'élève n'est pas bloqué une heure. */
async function releaseCheckoutSlot(userId: string): Promise<void> {
  await db.execute(sql`
    UPDATE maketou_buyer_limits
    SET checkout_count = GREATEST(checkout_count - 1, 0)
    WHERE user_id = ${userId}
  `);
}

/** Au plus un appel à Maketou toutes les 4 s par acheteur (clé API partagée). */
async function takeConfirmGate(userId: string): Promise<boolean> {
  const result = await db.execute(sql`
    INSERT INTO maketou_buyer_limits (user_id, last_confirm_call_at)
    VALUES (${userId}, now())
    ON CONFLICT (user_id) DO UPDATE SET last_confirm_call_at = now()
    WHERE maketou_buyer_limits.last_confirm_call_at IS NULL
       OR maketou_buyer_limits.last_confirm_call_at < now() - make_interval(secs => ${POLL_GAP_MS / 1000})
    RETURNING user_id
  `);
  return result.rows.length > 0;
}

/** Au plus une lecture du même panier toutes les 4 s (page de retour + tâche). */
async function claimCartSlot(checkoutId: string): Promise<boolean> {
  const rows = await db
    .update(schema.maketouCheckouts)
    .set({
      lastCheckedAt: sql`now()`,
      checkAttempts: sql`${schema.maketouCheckouts.checkAttempts} + 1`,
    })
    .where(
      and(
        eq(schema.maketouCheckouts.id, checkoutId),
        ne(schema.maketouCheckouts.status, "COMPLETED"),
        sql`(${schema.maketouCheckouts.lastCheckedAt} IS NULL OR ${schema.maketouCheckouts.lastCheckedAt} < now() - make_interval(secs => ${POLL_GAP_MS / 1000}))`,
      ),
    )
    .returning({ id: schema.maketouCheckouts.id });
  return rows.length > 0;
}

// ───────────────────────────── Création du panier ─────────────────────────────

export type MaketouCheckoutOutcome =
  | { ok: true; url: string; cartId: string }
  | { ok: false; status: number; code: MaketouCheckoutErrorCode };

/** Prénom / nom pour Maketou, tirés du profil (jamais inventés). */
function customerNames(name: string, email: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: email.split("@")[0] || "Client", lastName: "-" };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") || "-" };
}

async function activePlan(userId: string): Promise<UserPlan> {
  const result = await db.execute<{ plan: string; current_period_end: Date | null }>(sql`
    SELECT u.plan, s.current_period_end
    FROM "user" u LEFT JOIN subscriptions s ON s.user_id = u.id
    WHERE u.id = ${userId}
  `);
  const row = result.rows[0];
  if (!row || (row.plan !== "premium" && row.plan !== "premium_plus")) return "free";
  if (row.current_period_end && new Date(row.current_period_end).getTime() <= Date.now()) {
    return "free";
  }
  return row.plan;
}

/**
 * Crée un panier Maketou pour une offre du catalogue et enregistre l'achat
 * (instantané du prix) AVANT de renvoyer l'URL de paiement : on ne laisse
 * jamais payer un panier inconnu de la base. Prix et offre résolus côté
 * serveur uniquement.
 */
export async function startMaketouCheckout(
  user: User,
  itemKey: string,
): Promise<MaketouCheckoutOutcome> {
  const keyIssue = apiKeyIssue();
  const app = resolveAppUrl();
  if (keyIssue || "issue" in app) {
    log("error", "configuration incomplète", {
      variable: keyIssue?.variable ?? ("issue" in app ? app.issue.variable : ""),
      problem: keyIssue?.problem ?? ("issue" in app ? app.issue.problem : ""),
    });
    return { ok: false, status: 503, code: "MAKETOU_NOT_CONFIGURED" };
  }

  const item = resolvePurchasableItem(itemKey, { isAdmin: user.role === "admin" });
  if (!item) {
    const known = findMaketouItem(itemKey);
    if (known) {
      log("error", "produit non configuré", { variable: known.envVar });
      return { ok: false, status: 503, code: "MAKETOU_NOT_CONFIGURED" };
    }
    return { ok: false, status: 400, code: "UNKNOWN_ITEM" };
  }
  if (!Number.isInteger(item.price) || item.price <= 0) {
    return { ok: false, status: 400, code: "UNKNOWN_ITEM" };
  }

  // Pas de passage à un palier inférieur tant qu'un palier supérieur est actif.
  if (item.grant.kind === "plan") {
    const current = await activePlan(user.id);
    if (PLAN_RANK[item.grant.plan] < PLAN_RANK[current]) {
      return { ok: false, status: 409, code: "PLAN_DOWNGRADE_ACTIVE" };
    }
  }

  if (!(await takeCheckoutSlot(user.id))) {
    return { ok: false, status: 429, code: "TOO_MANY_CHECKOUTS" };
  }

  let cart: Awaited<ReturnType<typeof createMaketouCart>>;
  try {
    cart = await createMaketouCart({
      productDocumentId: item.productDocumentId,
      redirectUrl: `${app.url}${MAKETOU_RETURN_PATH}`,
      meta: { ownerId: user.id, buyerId: user.id, itemKey: item.key },
      customer: { email: user.email, ...customerNames(user.name, user.email) },
    });
  } catch (caught) {
    const error = asMaketouError(caught);
    log("error", "création du panier refusée", {
      code: error.code,
      status: error.httpStatus,
      message: error.message,
      item: item.key,
    });
    const configError =
      error.code === "INVALID_API_KEY" || error.code === "MAKETOU_NOT_CONFIGURED";
    if (configError || isMaketouOutage(error)) await releaseCheckoutSlot(user.id);
    if (configError) return { ok: false, status: 503, code: "MAKETOU_NOT_CONFIGURED" };
    if (error.code === "CUSTOMER_PRICE_BELOW_MINIMUM") {
      return { ok: false, status: 502, code: "MAKETOU_PRICE_BELOW_MINIMUM" };
    }
    return { ok: false, status: 502, code: "MAKETOU_CHECKOUT_FAILED" };
  }

  try {
    await db.insert(schema.maketouCheckouts).values({
      ownerId: user.id,
      buyerUserId: user.id,
      cartId: cart.cartId,
      itemKey: item.key,
      amount: item.price,
      currency: maketouCurrency,
      providerStatus: cart.status,
    });
  } catch (caught) {
    log("error", "enregistrement du panier impossible", {
      cartId: cart.cartId,
      message: (caught as Error)?.message,
    });
    return { ok: false, status: 500, code: "MAKETOU_CHECKOUT_FAILED" };
  }

  return { ok: true, url: cart.redirectUrl, cartId: cart.cartId };
}

// ───────────────────────────── Accord (exactement une fois) ─────────────────────────────

/**
 * Accorde le droit d'un panier payé, une seule fois : verrou du compte, puis
 * réclamation conditionnelle (`status <> 'COMPLETED'`) — seule la transaction
 * qui bascule la ligne accorde, même avec deux onglets, un double clic, la page
 * de retour et la tâche planifiée en même temps. Réclame aussi un panier déjà
 * clos (FAILED/EXPIRED) : si Maketou dit `completed`, l'élève a vraiment payé.
 * Si l'accord échoue, tout est annulé et le panier reste à réessayer.
 */
export async function fulfillMaketouCheckout(
  checkoutId: string,
  paymentId: string | null,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(schema.maketouCheckouts)
      .where(eq(schema.maketouCheckouts.id, checkoutId))
      .limit(1);
    if (!row) throw new Error(`paiement Maketou introuvable : ${checkoutId}`);

    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`account:${row.ownerId}`}))`);
    const claimed = await tx
      .update(schema.maketouCheckouts)
      .set({
        status: "COMPLETED",
        providerStatus: "completed",
        completedAt: sql`now()`,
        paymentId: paymentId ?? row.paymentId,
      })
      .where(
        and(
          eq(schema.maketouCheckouts.id, checkoutId),
          ne(schema.maketouCheckouts.status, "COMPLETED"),
        ),
      )
      .returning({ id: schema.maketouCheckouts.id });
    if (claimed.length === 0) return false;

    const grant = grantForItemKey(row.itemKey);
    if (!grant) throw new Error(`offre inconnue pour le paiement ${checkoutId} : ${row.itemKey}`);

    const { note } = await grantPaidPurchase(tx, row.ownerId, grant, {
      provider: PROVIDER,
      reference: row.cartId,
      amountFcfa: row.amount,
    });
    if (note) {
      await tx
        .update(schema.maketouCheckouts)
        .set({ note })
        .where(eq(schema.maketouCheckouts.id, checkoutId));
      log("warn", "paiement à vérifier", { checkoutId, note });
    }
    log("info", "paiement confirmé et accordé", { checkoutId, item: row.itemKey });
    return true;
  });
}

// ───────────────────────────── Synchronisation d'un paiement ─────────────────────────────

export type SyncOutcome =
  | { kind: "already_completed" }
  | { kind: "granted" }
  | { kind: "pending"; status: MaketouCartStatus }
  | { kind: "closed"; status: MaketouCartStatus }
  | { kind: "rate_limited"; retryAfterSec: number | null }
  | { kind: "error"; code: string; outage: boolean };

/**
 * Lit le panier chez Maketou et agit : `completed` → accord (une fois) ;
 * sinon mise à jour du statut, et clôture après 48 h sans paiement. Ne clôt
 * JAMAIS un paiement sur une panne (réseau, 5xx, réponse illisible).
 */
export async function syncCheckout(
  row: MaketouCheckoutRow,
  timeoutMs: number,
): Promise<{ outcome: SyncOutcome; rateLimitRemaining: number | null; rateLimitLimit: number | null }> {
  const none = { rateLimitRemaining: null, rateLimitLimit: null };
  if (row.status === "COMPLETED") return { outcome: { kind: "already_completed" }, ...none };

  let cart: Awaited<ReturnType<typeof retrieveMaketouCart>>;
  try {
    cart = await retrieveMaketouCart(row.cartId, timeoutMs);
  } catch (caught) {
    const error = asMaketouError(caught);
    if (error.code === "RATE_LIMITED") {
      return { outcome: { kind: "rate_limited", retryAfterSec: error.retryAfterSec }, ...none };
    }
    return {
      outcome: { kind: "error", code: error.code, outage: isMaketouOutage(error) },
      ...none,
    };
  }
  const quota = { rateLimitRemaining: cart.rateLimitRemaining, rateLimitLimit: cart.rateLimitLimit };

  // Jamais accorder le panier d'un autre compte.
  if (cart.meta.ownerId && cart.meta.ownerId !== String(row.ownerId)) {
    log("error", "panier rattaché à un autre compte", { checkoutId: row.id });
    return { outcome: { kind: "error", code: "CART_USER_MISMATCH", outage: false }, ...quota };
  }
  if (cart.status === null) {
    return { outcome: { kind: "error", code: "UNKNOWN_CART_STATUS", outage: false }, ...quota };
  }

  if (cart.status === "completed") {
    const granted = await fulfillMaketouCheckout(row.id, cart.paymentId);
    return { outcome: { kind: granted ? "granted" : "already_completed" }, ...quota };
  }

  const windowOver = Date.now() - row.createdAt.getTime() > PENDING_WINDOW_MS;
  const providerStatus = cart.status;
  await db.transaction(async (tx) => {
    if (providerStatus === "payment_failed") {
      const notified = await tx
        .update(schema.maketouCheckouts)
        .set({ failureNotifiedAt: sql`now()` })
        .where(
          and(
            eq(schema.maketouCheckouts.id, row.id),
            ne(schema.maketouCheckouts.status, "COMPLETED"),
            sql`${schema.maketouCheckouts.failureNotifiedAt} IS NULL`,
          ),
        )
        .returning({ id: schema.maketouCheckouts.id });
      if (notified.length > 0) log("info", "paiement échoué", { checkoutId: row.id });
    }
    await tx
      .update(schema.maketouCheckouts)
      .set({
        providerStatus,
        ...(windowOver
          ? { status: providerStatus === "payment_failed" ? "FAILED" : "EXPIRED" }
          : {}),
      })
      .where(
        and(
          eq(schema.maketouCheckouts.id, row.id),
          ne(schema.maketouCheckouts.status, "COMPLETED"),
        ),
      );
  });

  return {
    outcome: windowOver
      ? { kind: "closed", status: providerStatus }
      : { kind: "pending", status: providerStatus },
    ...quota,
  };
}

// ───────────────────────────── Confirmation (page de retour) ─────────────────────────────

export type MaketouConfirmResponse =
  | { httpStatus: 200; body: { status: MaketouConfirmStatus; retryAfterMs?: number } }
  | { httpStatus: 404 | 502 | 503; body: { code: string } };

const checking = (retryAfterMs = POLL_GAP_MS): MaketouConfirmResponse => ({
  httpStatus: 200,
  body: { status: "checking", retryAfterMs },
});

/**
 * Confirmation demandée par la page de retour, limitée aux paiements de
 * l'acheteur connecté. Répond `checking` dès que Maketou n'a pas été
 * interrogé pendant CETTE requête (limites atteintes) — jamais un ancien
 * `payment_failed` stocké : l'élève a pu réessayer et payer entre-temps.
 */
export async function confirmMaketouCheckout(
  userId: string,
  cartId: string | null,
): Promise<MaketouConfirmResponse> {
  if (apiKeyIssue()) return { httpStatus: 503, body: { code: "MAKETOU_NOT_CONFIGURED" } };

  const scoped = isMaketouCartId(cartId)
    ? and(
        eq(schema.maketouCheckouts.buyerUserId, userId),
        sql`lower(${schema.maketouCheckouts.cartId}) = lower(${cartId})`,
        gt(schema.maketouCheckouts.createdAt, sql`now() - interval '72 hours'`),
      )
    : and(
        eq(schema.maketouCheckouts.buyerUserId, userId),
        gt(schema.maketouCheckouts.createdAt, sql`now() - interval '48 hours'`),
      );
  const [row] = await db
    .select()
    .from(schema.maketouCheckouts)
    .where(scoped)
    .orderBy(desc(schema.maketouCheckouts.createdAt))
    .limit(1);
  if (!row) return { httpStatus: 404, body: { code: "CHECKOUT_NOT_FOUND" } };

  if (row.status === "COMPLETED") return { httpStatus: 200, body: { status: "completed" } };
  if (row.status === "FAILED") return { httpStatus: 200, body: { status: "payment_failed" } };
  if (row.status === "EXPIRED") return { httpStatus: 200, body: { status: "abandoned" } };

  if (!(await takeConfirmGate(userId))) return checking();
  if (!(await claimCartSlot(row.id))) return checking();

  const { outcome } = await syncCheckout(row, CONFIRM_TIMEOUT_MS);
  switch (outcome.kind) {
    case "granted":
    case "already_completed":
      return { httpStatus: 200, body: { status: "completed" } };
    case "pending":
      return { httpStatus: 200, body: { status: outcome.status } };
    case "closed":
      return {
        httpStatus: 200,
        body: { status: outcome.status === "payment_failed" ? "payment_failed" : "abandoned" },
      };
    case "rate_limited":
      return checking(Math.max(POLL_GAP_MS, (outcome.retryAfterSec ?? 0) * 1000));
    case "error":
      log("warn", "confirmation impossible", { checkoutId: row.id, code: outcome.code });
      return { httpStatus: 502, body: { code: "MAKETOU_CONFIRM_FAILED" } };
  }
}

/**
 * Paiements récents de l'élève encore en attente (au plus 3), à confirmer dès
 * son retour dans l'app (`PendingPaymentSync`) : un élève qui a payé puis
 * fermé l'onglet avant la page de retour reçoit son achat à sa visite
 * suivante, sans attendre le rapprochement quotidien. Les appels à Maketou
 * restent bornés par les verrous de `confirmMaketouCheckout`.
 */
export async function pendingCartIdsToConfirm(userId: string): Promise<string[]> {
  if (apiKeyIssue()) return [];
  const rows = await db
    .select({ cartId: schema.maketouCheckouts.cartId })
    .from(schema.maketouCheckouts)
    .where(
      and(
        eq(schema.maketouCheckouts.buyerUserId, userId),
        eq(schema.maketouCheckouts.status, "PENDING"),
        gt(schema.maketouCheckouts.createdAt, sql`now() - interval '72 hours'`),
      ),
    )
    .orderBy(desc(schema.maketouCheckouts.createdAt))
    .limit(3);
  return rows.map((row) => row.cartId);
}

// ───────────────────────────── Rapprochement planifié ─────────────────────────────

const JOB_NAME = "maketou-reconcile";
/** Budget d'une exécution, sous la durée maximale de la route (60 s). */
const JOB_BUDGET_MS = 40_000;
/** Le bail dure toujours plus longtemps que la plus longue exécution possible. */
const JOB_LEASE_MS = JOB_BUDGET_MS + JOB_CALL_TIMEOUT_MS + 15_000;

export interface ReconcileReport {
  ran: boolean;
  stopReason: string;
  checked: number;
  granted: number;
  closed: number;
  expiredPlans: number;
}

const CART_LEVEL_ERRORS = new Set(["CART_NOT_FOUND", "CART_USER_MISMATCH", "UNKNOWN_CART_STATUS"]);

/**
 * Rapprochement (toutes les 5 minutes) : vérifie les paiements en attente —
 * les plus récents d'abord, avec des places réservées aux plus anciens — et
 * accorde ceux qui ont été payés, même si l'élève a fermé l'onglet. Expire
 * aussi les paliers payants arrivés à échéance. Ne se chevauche jamais avec
 * une autre exécution (bail en base).
 */
export async function runMaketouReconcile(): Promise<ReconcileReport> {
  const token = randomUUID();
  const report: ReconcileReport = {
    ran: false,
    stopReason: "done",
    checked: 0,
    granted: 0,
    closed: 0,
    expiredPlans: 0,
  };

  const lease = await db.execute(sql`
    INSERT INTO job_leases (name, holder, held_until)
    VALUES (${JOB_NAME}, ${token}, now() + make_interval(secs => ${JOB_LEASE_MS / 1000}))
    ON CONFLICT (name) DO UPDATE SET holder = EXCLUDED.holder, held_until = EXCLUDED.held_until
    WHERE job_leases.held_until < now()
    RETURNING name
  `);
  if (lease.rows.length === 0) return { ...report, stopReason: "lease_busy" };
  report.ran = true;

  const started = Date.now();
  try {
    report.expiredPlans = await expireDueSubscriptions();

    if (apiKeyIssue()) {
      report.stopReason = "not_configured";
      return report;
    }

    const fast = await db
      .select()
      .from(schema.maketouCheckouts)
      .where(
        sql`${schema.maketouCheckouts.status} = 'PENDING'
          AND ${schema.maketouCheckouts.createdAt} > now() - interval '1 hour'
          AND (${schema.maketouCheckouts.lastCheckedAt} IS NULL OR ${schema.maketouCheckouts.lastCheckedAt} < now() - interval '4 minutes')`,
      )
      .orderBy(sql`${schema.maketouCheckouts.lastCheckedAt} NULLS FIRST`, schema.maketouCheckouts.createdAt)
      .limit(30);
    const slow = await db
      .select()
      .from(schema.maketouCheckouts)
      .where(
        sql`${schema.maketouCheckouts.status} = 'PENDING'
          AND ${schema.maketouCheckouts.createdAt} <= now() - interval '1 hour'
          AND (${schema.maketouCheckouts.lastCheckedAt} IS NULL OR ${schema.maketouCheckouts.lastCheckedAt} < now() - interval '55 minutes')`,
      )
      .orderBy(sql`${schema.maketouCheckouts.lastCheckedAt} NULLS FIRST`, schema.maketouCheckouts.createdAt)
      .limit(Math.max(0, 40 - fast.length));
    // Paiement tardif : quelques paniers clos depuis moins de 30 jours, une fois par jour.
    const late = await db
      .select()
      .from(schema.maketouCheckouts)
      .where(
        sql`${schema.maketouCheckouts.status} IN ('FAILED', 'EXPIRED')
          AND ${schema.maketouCheckouts.createdAt} > now() - interval '30 days'
          AND (${schema.maketouCheckouts.lastCheckedAt} IS NULL OR ${schema.maketouCheckouts.lastCheckedAt} < now() - interval '24 hours')`,
      )
      .orderBy(sql`${schema.maketouCheckouts.lastCheckedAt} NULLS FIRST`)
      .limit(5);

    let outagesInARow = 0;
    for (const row of [...fast, ...slow, ...late]) {
      if (Date.now() - started + JOB_CALL_TIMEOUT_MS > JOB_BUDGET_MS) {
        report.stopReason = "budget";
        break;
      }
      if (!(await claimCartSlot(row.id))) continue;

      let result: Awaited<ReturnType<typeof syncCheckout>>;
      try {
        result = await syncCheckout(row, JOB_CALL_TIMEOUT_MS);
      } catch (error) {
        log("error", "rapprochement : erreur sur un paiement", {
          checkoutId: row.id,
          message: (error as Error)?.message,
        });
        outagesInARow += 1;
        if (outagesInARow >= 3) {
          report.stopReason = "outage";
          break;
        }
        continue;
      }
      report.checked += 1;
      const { outcome } = result;

      if (outcome.kind === "granted") report.granted += 1;
      if (outcome.kind === "closed") report.closed += 1;
      if (outcome.kind === "rate_limited") {
        report.stopReason = "rate_limited";
        break;
      }
      if (outcome.kind === "error") {
        if (outcome.code === "INVALID_API_KEY" || outcome.code === "MAKETOU_NOT_CONFIGURED") {
          report.stopReason = "not_configured";
          break;
        }
        if (outcome.outage) {
          outagesInARow += 1;
          if (outagesInARow >= 3) {
            report.stopReason = "outage";
            break;
          }
          continue;
        }
        if (
          CART_LEVEL_ERRORS.has(outcome.code) &&
          Date.now() - row.createdAt.getTime() > CART_ERROR_CLOSE_MS
        ) {
          await db
            .update(schema.maketouCheckouts)
            .set({ status: "EXPIRED", note: `clos : ${outcome.code}` })
            .where(
              and(
                eq(schema.maketouCheckouts.id, row.id),
                ne(schema.maketouCheckouts.status, "COMPLETED"),
              ),
            );
          log("error", "paiement clos sur une erreur du panier", { checkoutId: row.id, code: outcome.code });
          report.closed += 1;
        }
      }
      outagesInARow = 0;

      // Laisse du quota aux pages de retour des élèves.
      if (
        result.rateLimitRemaining !== null &&
        result.rateLimitLimit !== null &&
        result.rateLimitRemaining < result.rateLimitLimit * 0.1
      ) {
        report.stopReason = "low_quota";
        break;
      }
    }
    return report;
  } catch (error) {
    report.stopReason = "error";
    log("error", "rapprochement interrompu", { message: (error as Error)?.message });
    return report;
  } finally {
    await db.execute(sql`
      UPDATE job_leases
      SET held_until = now(), last_run_at = now(), last_stop_reason = ${report.stopReason}
      WHERE name = ${JOB_NAME} AND holder = ${token}
    `);
  }
}

// ───────────────────────────── Contrôle de la configuration ─────────────────────────────

export interface MaketouCheck {
  name: string;
  ok: boolean;
  detail: string;
}

/**
 * Commande de contrôle (route protégée par `CRON_SECRET`) : variables,
 * sonde clé + forme de la requête SANS créer de panier (e-mail volontairement
 * invalide), page de retour, dernière exécution du rapprochement. Ne renvoie
 * jamais la valeur d'une variable.
 */
export async function checkMaketouSetup(): Promise<MaketouCheck[]> {
  const checks: MaketouCheck[] = [];
  const issues = maketouConfigIssues();
  checks.push({
    name: "variables",
    ok: issues.every((issue) => issue.problem.includes("avertissement")),
    detail:
      issues.length === 0
        ? "toutes les variables sont renseignées"
        : issues.map((issue) => `${issue.variable} : ${issue.problem}`).join(" ; "),
  });

  const app = resolveAppUrl();
  const firstProduct = MAKETOU_ITEMS.map((item) => process.env[item.envVar]?.trim()).find(Boolean);
  if (!apiKeyIssue() && !("issue" in app) && firstProduct) {
    try {
      await createMaketouCart({
        productDocumentId: firstProduct,
        redirectUrl: `${app.url}${MAKETOU_RETURN_PATH}`,
        meta: {},
        customer: { email: "not-an-email", firstName: "Test", lastName: "-" },
      });
      checks.push({ name: "clé API", ok: false, detail: "réponse inattendue : un panier a été accepté avec un e-mail invalide" });
    } catch (caught) {
      const error = asMaketouError(caught);
      const rejectsReturnUrl = error.message.includes("redirectURL");
      checks.push({
        name: "clé API et adresse de retour",
        ok:
          (error.code === "VALIDATION_ERROR" || error.httpStatus === 422) &&
          error.message.includes("email") &&
          !rejectsReturnUrl,
        detail:
          error.code === "INVALID_API_KEY"
            ? "clé API refusée par Maketou (401)"
            : rejectsReturnUrl
              ? "Maketou refuse l'adresse de retour (APP_URL)"
              : `${error.code} (${error.httpStatus ?? "réseau"}) — attendu : 422 sur le seul champ email`,
      });
    }
  } else {
    checks.push({ name: "clé API et adresse de retour", ok: false, detail: "non testé : configuration incomplète" });
  }

  if (!("issue" in app)) {
    try {
      const response = await fetch(`${app.url}${MAKETOU_RETURN_PATH}`, {
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
      const html = response.status === 200 ? await response.text() : "";
      checks.push({
        name: "page de retour",
        ok: response.status === 200 && html.includes("maketou-return"),
        detail: `HTTP ${response.status}${response.status === 200 && !html.includes("maketou-return") ? " sans le repère maketou-return" : ""}`,
      });
    } catch (error) {
      checks.push({ name: "page de retour", ok: false, detail: `injoignable (${(error as Error)?.name})` });
    }
  }

  const [lease] = await db
    .select()
    .from(schema.jobLeases)
    .where(eq(schema.jobLeases.name, JOB_NAME))
    .limit(1);
  // Vercel Cron (offre Hobby) : une exécution par jour, à une minute
  // quelconque de l'heure prévue — au plus ~25 h entre deux passages.
  const lastRun = lease?.lastRunAt ?? null;
  checks.push({
    name: "rapprochement planifié",
    ok: Boolean(lastRun) && Date.now() - (lastRun as Date).getTime() < 26 * 60 * 60 * 1000,
    detail: lastRun
      ? `dernière exécution ${lastRun.toISOString()} (${lease?.lastStopReason ?? "?"})`
      : "jamais exécuté",
  });

  return checks;
}
