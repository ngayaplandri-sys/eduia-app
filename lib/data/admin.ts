import "server-only";
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "./user";
import { DEMO_EMAIL, PAYMENT_PROVIDER_CONNECTED } from "@/lib/admin/constants";
import { PLAN_CREDITS } from "@/lib/config/credits";
import { estimateOpenAiCostUsd } from "@/lib/ai/pricing";
import type {
  AdminActivityFeedData,
  AdminActivityItem,
  AdminAiUsageByKind,
  AdminAiUsageData,
  AdminContentData,
  AdminContentItem,
  AdminOverviewStats,
  AdminPaymentsData,
  AdminReport,
  AdminStatsData,
  AdminSubscriptionsData,
  AdminUserDetail,
  AdminUserListItem,
  AiUsageKind,
  ReportStatus,
  UserPlan,
} from "@/types";

/** Prix mensuel FCFA d'un palier — 0 pour "free". */
function planPriceFcfa(plan: UserPlan): number {
  return plan === "premium" || plan === "premium_plus"
    ? PLAN_CREDITS[plan].priceFcfa
    : 0;
}

/**
 * Défense en profondeur : chaque lecture admin re-vérifie le rôle, en plus du
 * `requireAdmin()` du layout `app/admin/`. Un élève qui atteindrait ces
 * fonctions (import direct, action mal câblée) reçoit une erreur, jamais des
 * données.
 */
async function assertAdmin(): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    throw new Error("Accès administrateur requis.");
  }
}

const NOT_DEMO = ne(schema.user.email, DEMO_EMAIL);
const PAGE_SIZE = 20;
const TOKENS_SUM = sql<number>`coalesce(sum(coalesce(${schema.aiUsage.inputTokens}, 0) + coalesce(${schema.aiUsage.outputTokens}, 0)), 0)`;

function n(value: unknown): number {
  return Number(value ?? 0);
}

// ───────────────────────────── Vue d'ensemble ─────────────────────────────

export async function getAdminOverviewStats(): Promise<AdminOverviewStats> {
  await assertAdmin();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalRows,
    freeRows,
    premiumRows,
    premiumPlusRows,
    recentRows,
    generationRows,
    tokenRows,
    pendingRows,
  ] = await Promise.all([
    db.select({ v: count() }).from(schema.user).where(NOT_DEMO),
    db
      .select({ v: count() })
      .from(schema.user)
      .where(and(NOT_DEMO, eq(schema.user.plan, "free"))),
    db
      .select({ v: count() })
      .from(schema.user)
      .where(and(NOT_DEMO, eq(schema.user.plan, "premium"))),
    db
      .select({ v: count() })
      .from(schema.user)
      .where(and(NOT_DEMO, eq(schema.user.plan, "premium_plus"))),
    db
      .select({ v: count() })
      .from(schema.user)
      .where(and(NOT_DEMO, gte(schema.user.createdAt, sevenDaysAgo))),
    db
      .select({ v: count() })
      .from(schema.aiUsage)
      .innerJoin(schema.user, eq(schema.aiUsage.userId, schema.user.id))
      .where(and(NOT_DEMO, eq(schema.aiUsage.status, "success"))),
    db
      .select({ v: TOKENS_SUM })
      .from(schema.aiUsage)
      .innerJoin(schema.user, eq(schema.aiUsage.userId, schema.user.id))
      .where(NOT_DEMO),
    db
      .select({ v: count() })
      .from(schema.reports)
      .where(ne(schema.reports.status, "resolved")),
  ]);

  const premiumCount = n(premiumRows[0]?.v);
  const premiumPlusCount = n(premiumPlusRows[0]?.v);

  return {
    totalUsers: n(totalRows[0]?.v),
    freeUsers: n(freeRows[0]?.v),
    premiumUsers: premiumCount + premiumPlusCount,
    newUsers7d: n(recentRows[0]?.v),
    estimatedMonthlyRevenueFcfa:
      premiumCount * PLAN_CREDITS.premium.priceFcfa +
      premiumPlusCount * PLAN_CREDITS.premium_plus.priceFcfa,
    aiGenerations: n(generationRows[0]?.v),
    openAiTokens: n(tokenRows[0]?.v),
    pendingReports: n(pendingRows[0]?.v),
  };
}

// ───────────────────────────── Utilisateurs ─────────────────────────────

export interface AdminUsersQuery {
  query?: string;
  plan?: UserPlan;
  role?: "student" | "admin";
  page?: number;
}

export async function getAdminUsers(params: AdminUsersQuery): Promise<{
  items: AdminUserListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}> {
  await assertAdmin();

  const page = Math.max(1, Math.trunc(params.page ?? 1));
  const filters = [NOT_DEMO];

  const q = params.query?.trim();
  if (q) {
    const like = `%${q}%`;
    const search = or(
      ilike(schema.user.name, like),
      ilike(schema.user.email, like),
    );
    if (search) filters.push(search);
  }
  if (params.plan) filters.push(eq(schema.user.plan, params.plan));
  if (params.role) filters.push(eq(schema.user.role, params.role));

  const where = and(...filters);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        role: schema.user.role,
        plan: schema.user.plan,
        emailVerified: schema.user.emailVerified,
        createdAt: schema.user.createdAt,
        schoolLevel: schema.onboarding.schoolLevel,
      })
      .from(schema.user)
      .leftJoin(
        schema.onboarding,
        eq(schema.onboarding.userId, schema.user.id),
      )
      .where(where)
      .orderBy(desc(schema.user.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ v: count() }).from(schema.user).where(where),
  ]);

  const total = n(totalRows[0]?.v);

  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role === "admin" ? "admin" : "student",
      plan: (row.plan as UserPlan) ?? "free",
      emailVerified: row.emailVerified,
      schoolLevel: row.schoolLevel ?? null,
      createdAt: row.createdAt.toISOString(),
      isDemo: false,
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getAdminUserDetail(
  userId: string,
): Promise<AdminUserDetail | null> {
  await assertAdmin();

  const [u] = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);
  if (!u || u.email === DEMO_EMAIL) return null;

  const [onboardingRow, subscriptionRow, activitiesCount, documentsCount, summariesCount, examsCount, correctionsCount, aiCount, recent] =
    await Promise.all([
      db
        .select()
        .from(schema.onboarding)
        .where(eq(schema.onboarding.userId, userId))
        .limit(1),
      db
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.userId, userId))
        .limit(1),
      db
        .select({ v: count() })
        .from(schema.activities)
        .where(eq(schema.activities.userId, userId)),
      db
        .select({ v: count() })
        .from(schema.documents)
        .where(eq(schema.documents.userId, userId)),
      db
        .select({ v: count() })
        .from(schema.summaries)
        .where(eq(schema.summaries.userId, userId)),
      db
        .select({ v: count() })
        .from(schema.exams)
        .where(eq(schema.exams.userId, userId)),
      db
        .select({ v: count() })
        .from(schema.corrections)
        .where(eq(schema.corrections.userId, userId)),
      db
        .select({ v: count() })
        .from(schema.aiUsage)
        .where(eq(schema.aiUsage.userId, userId)),
      db
        .select({
          id: schema.activities.id,
          title: schema.activities.title,
          type: schema.activities.type,
          occurredAt: schema.activities.occurredAt,
        })
        .from(schema.activities)
        .where(eq(schema.activities.userId, userId))
        .orderBy(desc(schema.activities.occurredAt))
        .limit(8),
    ]);

  const onb = onboardingRow[0];
  const sub = subscriptionRow[0];

  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role === "admin" ? "admin" : "student",
    plan: (u.plan as UserPlan) ?? "free",
    emailVerified: u.emailVerified,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
    onboarding: onb
      ? {
          firstName: onb.firstName,
          schoolLevel: onb.schoolLevel,
          subjects: onb.subjects,
          goal: onb.goal,
          improveSubjects: onb.improveSubjects,
          learningStyle: onb.learningStyle,
          completedAt: onb.completedAt.toISOString(),
        }
      : null,
    counts: {
      activities: n(activitiesCount[0]?.v),
      documents: n(documentsCount[0]?.v),
      summaries: n(summariesCount[0]?.v),
      exams: n(examsCount[0]?.v),
      corrections: n(correctionsCount[0]?.v),
      aiGenerations: n(aiCount[0]?.v),
    },
    subscription: sub
      ? {
          freeGenerationUsedAt: sub.freeGenerationUsedAt?.toISOString() ?? null,
          premiumActivatedAt: sub.premiumActivatedAt?.toISOString() ?? null,
          paymentProvider: sub.paymentProvider,
          paymentReference: sub.paymentReference,
        }
      : null,
    recentActivity: recent.map((row) => ({
      id: row.id,
      title: row.title,
      type: row.type,
      occurredAt: row.occurredAt.toISOString(),
    })),
  };
}

// ───────────────────────────── Abonnements ─────────────────────────────

export async function getAdminSubscriptions(): Promise<AdminSubscriptionsData> {
  await assertAdmin();

  const paidPlan = or(
    eq(schema.user.plan, "premium"),
    eq(schema.user.plan, "premium_plus"),
  );

  const [premiumRows, freeRows, premiumCountRows, subscriptionOrders] =
    await Promise.all([
      db
        .select({
          userId: schema.user.id,
          name: schema.user.name,
          email: schema.user.email,
          plan: schema.user.plan,
          signedUpAt: schema.user.createdAt,
          premiumActivatedAt: schema.subscriptions.premiumActivatedAt,
        })
        .from(schema.user)
        .leftJoin(
          schema.subscriptions,
          eq(schema.subscriptions.userId, schema.user.id),
        )
        .where(and(NOT_DEMO, paidPlan))
        .orderBy(desc(schema.user.createdAt)),
      db
        .select({ v: count() })
        .from(schema.user)
        .where(and(NOT_DEMO, eq(schema.user.plan, "free"))),
      db
        .select({ v: count() })
        .from(schema.user)
        .where(and(NOT_DEMO, paidPlan)),
      // Dernière commande d'abonnement (simulée) par utilisateur — source de
      // paiement réelle, `subscriptions.paymentProvider` n'est plus écrit.
      db
        .select({
          userId: schema.creditOrders.userId,
          paymentProvider: schema.creditOrders.paymentProvider,
          paymentReference: schema.creditOrders.paymentReference,
        })
        .from(schema.creditOrders)
        .where(
          or(
            eq(schema.creditOrders.kind, "subscription_premium"),
            eq(schema.creditOrders.kind, "subscription_premium_plus"),
          ),
        )
        .orderBy(desc(schema.creditOrders.createdAt)),
    ]);

  const premiumCount = n(premiumCountRows[0]?.v);
  const latestOrderByUser = new Map<
    string,
    { paymentProvider: string; paymentReference: string }
  >();
  for (const order of subscriptionOrders) {
    if (!latestOrderByUser.has(order.userId)) {
      latestOrderByUser.set(order.userId, order);
    }
  }

  return {
    premiumRows: premiumRows.map((row) => {
      const plan = (row.plan as UserPlan) ?? "free";
      const order = latestOrderByUser.get(row.userId);
      return {
        userId: row.userId,
        name: row.name,
        email: row.email,
        plan,
        signedUpAt: row.signedUpAt.toISOString(),
        premiumActivatedAt: row.premiumActivatedAt?.toISOString() ?? null,
        paymentProvider: order?.paymentProvider ?? null,
        paymentReference: order?.paymentReference ?? null,
        monthlyPriceFcfa: planPriceFcfa(plan),
      };
    }),
    freeCount: n(freeRows[0]?.v),
    premiumCount,
    estimatedMrrFcfa: premiumRows.reduce(
      (sum, row) => sum + planPriceFcfa((row.plan as UserPlan) ?? "free"),
      0,
    ),
    paymentConnected: PAYMENT_PROVIDER_CONNECTED,
  };
}

// ───────────────────────────── Utilisation IA ─────────────────────────────

export async function getAdminAiUsage(): Promise<AdminAiUsageData> {
  await assertAdmin();

  const [byKindRows, topUsersRows, recentRows] = await Promise.all([
    db
      .select({
        kind: schema.aiUsage.kind,
        total: count(),
        success: sql<number>`count(*) filter (where ${schema.aiUsage.status} = 'success')`,
        tokens: TOKENS_SUM,
      })
      .from(schema.aiUsage)
      .innerJoin(schema.user, eq(schema.aiUsage.userId, schema.user.id))
      .where(NOT_DEMO)
      .groupBy(schema.aiUsage.kind),
    db
      .select({
        userId: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        total: count(),
        tokens: TOKENS_SUM,
      })
      .from(schema.aiUsage)
      .innerJoin(schema.user, eq(schema.aiUsage.userId, schema.user.id))
      .where(NOT_DEMO)
      .groupBy(schema.user.id, schema.user.name, schema.user.email)
      .orderBy(desc(count()))
      .limit(10),
    db
      .select({
        id: schema.aiUsage.id,
        userName: schema.user.name,
        userEmail: schema.user.email,
        kind: schema.aiUsage.kind,
        model: schema.aiUsage.model,
        status: schema.aiUsage.status,
        inputTokens: schema.aiUsage.inputTokens,
        outputTokens: schema.aiUsage.outputTokens,
        createdAt: schema.aiUsage.createdAt,
      })
      .from(schema.aiUsage)
      .innerJoin(schema.user, eq(schema.aiUsage.userId, schema.user.id))
      .where(NOT_DEMO)
      .orderBy(desc(schema.aiUsage.createdAt))
      .limit(20),
  ]);

  const kinds: AiUsageKind[] = ["summary", "exam", "correction", "assistant", "ocr"];
  const byKind: AdminAiUsageByKind[] = kinds.map((kind) => {
    const row = byKindRows.find((r) => r.kind === kind);
    const total = n(row?.total);
    const success = n(row?.success);
    return {
      kind,
      total,
      success,
      errors: total - success,
      tokens: n(row?.tokens),
    };
  });

  const totalRequests = byKind.reduce((sum, k) => sum + k.total, 0);
  const totalSuccess = byKind.reduce((sum, k) => sum + k.success, 0);
  const totalTokens = byKind.reduce((sum, k) => sum + k.tokens, 0);

  // Répartition input/output inconnue à l'agrégat → hypothèse 40 % / 60 %.
  const estimatedCostUsd = estimateOpenAiCostUsd(
    Math.round(totalTokens * 0.4),
    Math.round(totalTokens * 0.6),
  );

  return {
    totalRequests,
    totalSuccess,
    totalErrors: totalRequests - totalSuccess,
    totalTokens,
    estimatedCostUsd,
    byKind,
    topUsers: topUsersRows.map((row) => ({
      userId: row.userId,
      name: row.name,
      email: row.email,
      total: n(row.total),
      tokens: n(row.tokens),
    })),
    recent: recentRows.map((row) => ({
      id: row.id,
      userName: row.userName,
      userEmail: row.userEmail,
      kind: (row.kind as AiUsageKind) ?? "summary",
      model: row.model,
      status: row.status,
      tokens:
        row.inputTokens === null && row.outputTokens === null
          ? null
          : (row.inputTokens ?? 0) + (row.outputTokens ?? 0),
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

// ───────────────────────────── Signalements ─────────────────────────────

export async function getAdminReports(filter?: {
  status?: ReportStatus;
}): Promise<AdminReport[]> {
  await assertAdmin();

  const rows = await db
    .select()
    .from(schema.reports)
    .where(filter?.status ? eq(schema.reports.status, filter.status) : undefined)
    .orderBy(desc(schema.reports.createdAt))
    .limit(200);

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    userEmail: row.userEmail,
    userName: row.userName,
    type: (row.type as AdminReport["type"]) ?? "autre",
    description: row.description,
    status: (row.status as ReportStatus) ?? "new",
    adminNote: row.adminNote,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function getAdminReportCounts(): Promise<
  Record<ReportStatus | "total", number>
> {
  await assertAdmin();
  const rows = await db
    .select({ status: schema.reports.status, v: count() })
    .from(schema.reports)
    .groupBy(schema.reports.status);

  const byStatus = (status: ReportStatus) =>
    n(rows.find((r) => r.status === status)?.v);

  return {
    new: byStatus("new"),
    in_progress: byStatus("in_progress"),
    resolved: byStatus("resolved"),
    total: rows.reduce((sum, r) => sum + n(r.v), 0),
  };
}

// ───────────────────────────── Paiements ─────────────────────────────

/**
 * Historique des commandes (abonnements + recharges) : lignes `credit_orders`
 * — paiement **simulé** (`paymentProvider: "simulated"`, validation
 * immédiate), voir `applyPlanSubscription`/`applyRecharge` dans
 * `lib/data/credits.ts`. Remplace l'ancienne lecture de
 * `subscriptions.paymentProvider`, qui n'a jamais été peuplée (rien ne
 * l'écrivait) — `credit_orders` est désormais la seule source réelle
 * d'événements de paiement.
 */
export async function getAdminPayments(): Promise<AdminPaymentsData> {
  await assertAdmin();

  const paidPlan = or(
    eq(schema.user.plan, "premium"),
    eq(schema.user.plan, "premium_plus"),
  );

  const [orderRows, premiumCountRows] = await Promise.all([
    db
      .select({
        userId: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        kind: schema.creditOrders.kind,
        provider: schema.creditOrders.paymentProvider,
        reference: schema.creditOrders.paymentReference,
        paidAt: schema.creditOrders.createdAt,
        amountFcfa: schema.creditOrders.amountFcfa,
        creditsGranted: schema.creditOrders.creditsGranted,
      })
      .from(schema.creditOrders)
      .innerJoin(schema.user, eq(schema.creditOrders.userId, schema.user.id))
      .where(NOT_DEMO)
      .orderBy(desc(schema.creditOrders.createdAt)),
    db
      .select({ v: count() })
      .from(schema.user)
      .where(and(NOT_DEMO, paidPlan)),
  ]);

  const rows = orderRows.map((r) => ({
    userId: r.userId,
    name: r.name,
    email: r.email,
    kind: r.kind,
    provider: r.provider,
    reference: r.reference,
    paidAt: r.paidAt.toISOString(),
    amountFcfa: r.amountFcfa,
    creditsGranted: r.creditsGranted,
  }));

  // Comptes payants sans aucune commande enregistrée (plan changé directement
  // en base, hors du flux `/api/credits/subscribe`).
  const payingUserIds = new Set(rows.map((r) => r.userId));
  const manualPremiumCount = Math.max(
    0,
    n(premiumCountRows[0]?.v) - payingUserIds.size,
  );

  return {
    rows,
    transactionCount: rows.length,
    totalCollectedFcfa: rows.reduce((sum, r) => sum + r.amountFcfa, 0),
    manualPremiumCount,
    paymentConnected: PAYMENT_PROVIDER_CONNECTED,
  };
}

// ───────────────────────────── Statistiques ─────────────────────────────

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function getAdminStats(): Promise<AdminStatsData> {
  await assertAdmin();

  const now = Date.now();
  const weekQueries = Array.from({ length: 8 }, (_, i) => {
    const start = new Date(now - (8 - i) * WEEK_MS);
    const end = new Date(now - (7 - i) * WEEK_MS);
    return db
      .select({ v: count() })
      .from(schema.user)
      .where(
        and(
          NOT_DEMO,
          gte(schema.user.createdAt, start),
          lt(schema.user.createdAt, end),
        ),
      );
  });

  const [
    weekResults,
    freeRows,
    premiumRows,
    premiumPlusRows,
    aiKindRows,
    summariesRows,
    examsRows,
    correctionsRows,
    documentsRows,
    reportRows,
  ] = await Promise.all([
    Promise.all(weekQueries),
    db
      .select({ v: count() })
      .from(schema.user)
      .where(and(NOT_DEMO, eq(schema.user.plan, "free"))),
    db
      .select({ v: count() })
      .from(schema.user)
      .where(and(NOT_DEMO, eq(schema.user.plan, "premium"))),
    db
      .select({ v: count() })
      .from(schema.user)
      .where(and(NOT_DEMO, eq(schema.user.plan, "premium_plus"))),
    db
      .select({ kind: schema.aiUsage.kind, v: count() })
      .from(schema.aiUsage)
      .innerJoin(schema.user, eq(schema.aiUsage.userId, schema.user.id))
      .where(NOT_DEMO)
      .groupBy(schema.aiUsage.kind),
    db
      .select({ v: count() })
      .from(schema.summaries)
      .innerJoin(schema.user, eq(schema.summaries.userId, schema.user.id))
      .where(NOT_DEMO),
    db
      .select({ v: count() })
      .from(schema.exams)
      .innerJoin(schema.user, eq(schema.exams.userId, schema.user.id))
      .where(NOT_DEMO),
    db
      .select({ v: count() })
      .from(schema.corrections)
      .innerJoin(schema.user, eq(schema.corrections.userId, schema.user.id))
      .where(NOT_DEMO),
    db
      .select({ v: count() })
      .from(schema.documents)
      .innerJoin(schema.user, eq(schema.documents.userId, schema.user.id))
      .where(NOT_DEMO),
    db
      .select({ status: schema.reports.status, v: count() })
      .from(schema.reports)
      .groupBy(schema.reports.status),
  ]);

  const dateFmt = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });
  const signupsByWeek = weekResults.map((res, i) => ({
    label: dateFmt.format(new Date(now - (8 - i) * WEEK_MS)),
    value: n(res[0]?.v),
  }));

  const aiKinds: AiUsageKind[] = ["summary", "exam", "correction", "assistant", "ocr"];
  const aiKindLabel: Record<AiUsageKind, string> = {
    summary: "Résumés",
    exam: "Épreuves",
    correction: "Corrections",
    assistant: "Assistant IA",
    ocr: "Lecture de photos",
  };
  const aiByKind = aiKinds.map((kind) => ({
    label: aiKindLabel[kind],
    value: n(aiKindRows.find((r) => r.kind === kind)?.v),
  }));

  const reportBy = (status: ReportStatus) =>
    n(reportRows.find((r) => r.status === status)?.v);

  return {
    totalUsers: n(freeRows[0]?.v) + n(premiumRows[0]?.v) + n(premiumPlusRows[0]?.v),
    signupsByWeek,
    planSplit: {
      free: n(freeRows[0]?.v),
      premium: n(premiumRows[0]?.v),
      premium_plus: n(premiumPlusRows[0]?.v),
    },
    aiByKind,
    contentTotals: {
      summaries: n(summariesRows[0]?.v),
      exams: n(examsRows[0]?.v),
      corrections: n(correctionsRows[0]?.v),
      documents: n(documentsRows[0]?.v),
    },
    reportsByStatus: {
      new: reportBy("new"),
      in_progress: reportBy("in_progress"),
      resolved: reportBy("resolved"),
    },
  };
}

// ───────────────────────────── Activité ─────────────────────────────

const FEED_PAGE_SIZE = 25;
const AI_KIND_LABEL: Record<string, string> = {
  summary: "Résumé",
  exam: "Épreuve",
  correction: "Correction",
};

export async function getAdminActivityFeed(params: {
  page?: number;
}): Promise<AdminActivityFeedData> {
  await assertAdmin();

  const page = Math.max(1, Math.trunc(params.page ?? 1));
  const take = page * FEED_PAGE_SIZE + 1;

  const [activityRows, signupRows, aiRows, reportRows] = await Promise.all([
    db
      .select({
        id: schema.activities.id,
        title: schema.activities.title,
        type: schema.activities.type,
        meta: schema.activities.meta,
        occurredAt: schema.activities.occurredAt,
        userName: schema.user.name,
        userEmail: schema.user.email,
      })
      .from(schema.activities)
      .innerJoin(schema.user, eq(schema.activities.userId, schema.user.id))
      .where(NOT_DEMO)
      .orderBy(desc(schema.activities.occurredAt))
      .limit(take),
    db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        createdAt: schema.user.createdAt,
      })
      .from(schema.user)
      .where(NOT_DEMO)
      .orderBy(desc(schema.user.createdAt))
      .limit(take),
    db
      .select({
        id: schema.aiUsage.id,
        kind: schema.aiUsage.kind,
        status: schema.aiUsage.status,
        createdAt: schema.aiUsage.createdAt,
        userName: schema.user.name,
        userEmail: schema.user.email,
      })
      .from(schema.aiUsage)
      .innerJoin(schema.user, eq(schema.aiUsage.userId, schema.user.id))
      .where(NOT_DEMO)
      .orderBy(desc(schema.aiUsage.createdAt))
      .limit(take),
    db
      .select({
        id: schema.reports.id,
        type: schema.reports.type,
        status: schema.reports.status,
        createdAt: schema.reports.createdAt,
        userName: schema.reports.userName,
        userEmail: schema.reports.userEmail,
      })
      .from(schema.reports)
      .orderBy(desc(schema.reports.createdAt))
      .limit(take),
  ]);

  const merged: AdminActivityItem[] = [
    ...activityRows.map((r) => ({
      id: `activity:${r.id}`,
      kind: "activity" as const,
      title: `${r.type} — ${r.title}`,
      detail: r.meta || null,
      userLabel: r.userName || r.userEmail,
      occurredAt: r.occurredAt.toISOString(),
    })),
    ...signupRows.map((r) => ({
      id: `signup:${r.id}`,
      kind: "signup" as const,
      title: "Nouvelle inscription",
      detail: null,
      userLabel: r.name || r.email,
      occurredAt: r.createdAt.toISOString(),
    })),
    ...aiRows.map((r) => ({
      id: `ai:${r.id}`,
      kind: "ai" as const,
      title: `Génération IA · ${AI_KIND_LABEL[r.kind] ?? r.kind}`,
      detail: r.status === "success" ? "Réussie" : "En erreur",
      userLabel: r.userName || r.userEmail,
      occurredAt: r.createdAt.toISOString(),
    })),
    ...reportRows.map((r) => ({
      id: `report:${r.id}`,
      kind: "report" as const,
      title: "Signalement reçu",
      detail: r.type,
      userLabel: r.userName || r.userEmail || "Utilisateur supprimé",
      occurredAt: r.createdAt.toISOString(),
    })),
  ].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  const start = (page - 1) * FEED_PAGE_SIZE;
  const items = merged.slice(start, start + FEED_PAGE_SIZE);

  return {
    items,
    page,
    pageSize: FEED_PAGE_SIZE,
    hasMore: merged.length > start + FEED_PAGE_SIZE,
  };
}

// ───────────────────────── Gestion des contenus ─────────────────────────

export async function getAdminContentOverview(): Promise<AdminContentData> {
  await assertAdmin();

  const RECENT = 12;

  const [
    summariesCount,
    examsCount,
    correctionsCount,
    documentsCount,
    recentSummaries,
    recentExams,
    recentCorrections,
    recentDocuments,
  ] = await Promise.all([
    db
      .select({ v: count() })
      .from(schema.summaries)
      .innerJoin(schema.user, eq(schema.summaries.userId, schema.user.id))
      .where(NOT_DEMO),
    db
      .select({ v: count() })
      .from(schema.exams)
      .innerJoin(schema.user, eq(schema.exams.userId, schema.user.id))
      .where(NOT_DEMO),
    db
      .select({ v: count() })
      .from(schema.corrections)
      .innerJoin(schema.user, eq(schema.corrections.userId, schema.user.id))
      .where(NOT_DEMO),
    db
      .select({ v: count() })
      .from(schema.documents)
      .innerJoin(schema.user, eq(schema.documents.userId, schema.user.id))
      .where(NOT_DEMO),
    db
      .select({
        id: schema.summaries.id,
        title: schema.summaries.title,
        subject: schema.summaries.subject,
        level: schema.summaries.level,
        createdAt: schema.summaries.createdAt,
        ownerId: schema.user.id,
        ownerName: schema.user.name,
        ownerEmail: schema.user.email,
      })
      .from(schema.summaries)
      .innerJoin(schema.user, eq(schema.summaries.userId, schema.user.id))
      .where(NOT_DEMO)
      .orderBy(desc(schema.summaries.createdAt))
      .limit(RECENT),
    db
      .select({
        id: schema.exams.id,
        title: schema.exams.title,
        examType: schema.exams.examType,
        level: schema.exams.level,
        createdAt: schema.exams.createdAt,
        ownerId: schema.user.id,
        ownerName: schema.user.name,
        ownerEmail: schema.user.email,
      })
      .from(schema.exams)
      .innerJoin(schema.user, eq(schema.exams.userId, schema.user.id))
      .where(NOT_DEMO)
      .orderBy(desc(schema.exams.createdAt))
      .limit(RECENT),
    db
      .select({
        id: schema.corrections.id,
        examTitle: schema.corrections.examTitle,
        score: schema.corrections.score,
        maxScore: schema.corrections.maxScore,
        createdAt: schema.corrections.createdAt,
        ownerId: schema.user.id,
        ownerName: schema.user.name,
        ownerEmail: schema.user.email,
      })
      .from(schema.corrections)
      .innerJoin(schema.user, eq(schema.corrections.userId, schema.user.id))
      .where(NOT_DEMO)
      .orderBy(desc(schema.corrections.createdAt))
      .limit(RECENT),
    db
      .select({
        id: schema.documents.id,
        name: schema.documents.name,
        fileKind: schema.documents.fileKind,
        subject: schema.documents.subject,
        uploadedAt: schema.documents.uploadedAt,
        ownerId: schema.user.id,
        ownerName: schema.user.name,
        ownerEmail: schema.user.email,
      })
      .from(schema.documents)
      .innerJoin(schema.user, eq(schema.documents.userId, schema.user.id))
      .where(NOT_DEMO)
      .orderBy(desc(schema.documents.uploadedAt))
      .limit(RECENT),
  ]);

  const recent: AdminContentItem[] = [
    ...recentSummaries.map((r) => ({
      id: `summary:${r.id}`,
      kind: "summary" as const,
      title: r.title,
      detail: `${r.subject} · ${r.level}`,
      ownerId: r.ownerId,
      ownerName: r.ownerName,
      ownerEmail: r.ownerEmail,
      createdAt: r.createdAt.toISOString(),
    })),
    ...recentExams.map((r) => ({
      id: `exam:${r.id}`,
      kind: "exam" as const,
      title: r.title,
      detail: `${r.examType} · ${r.level}`,
      ownerId: r.ownerId,
      ownerName: r.ownerName,
      ownerEmail: r.ownerEmail,
      createdAt: r.createdAt.toISOString(),
    })),
    ...recentCorrections.map((r) => ({
      id: `correction:${r.id}`,
      kind: "correction" as const,
      title: r.examTitle,
      detail: `${r.score}/${r.maxScore}`,
      ownerId: r.ownerId,
      ownerName: r.ownerName,
      ownerEmail: r.ownerEmail,
      createdAt: r.createdAt.toISOString(),
    })),
    ...recentDocuments.map((r) => ({
      id: `document:${r.id}`,
      kind: "document" as const,
      title: r.name,
      detail: `${r.fileKind.toUpperCase()} · ${r.subject}`,
      ownerId: r.ownerId,
      ownerName: r.ownerName,
      ownerEmail: r.ownerEmail,
      createdAt: r.uploadedAt.toISOString(),
    })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20);

  return {
    totals: {
      summaries: n(summariesCount[0]?.v),
      exams: n(examsCount[0]?.v),
      corrections: n(correctionsCount[0]?.v),
      documents: n(documentsCount[0]?.v),
    },
    recent,
  };
}
