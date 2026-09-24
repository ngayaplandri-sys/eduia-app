/** Types de l'espace d'administration (`/admin`). */

import type { UserPlan } from "./user";

export type ReportStatus = "new" | "in_progress" | "resolved";
export type ReportType = "bug" | "suggestion" | "question" | "autre";
export type AiUsageKind = "summary" | "exam" | "correction" | "assistant" | "ocr";

export interface AdminOverviewStats {
  totalUsers: number;
  freeUsers: number;
  /** Premium + Premium+ confondus. */
  premiumUsers: number;
  newUsers7d: number;
  /** Somme des paliers payants actifs × leur prix (`PLAN_CREDITS`) — revenu THÉORIQUE (paiement simulé, aucun encaissement réel). */
  estimatedMonthlyRevenueFcfa: number;
  aiGenerations: number;
  openAiTokens: number;
  pendingReports: number;
}

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  role: "student" | "admin";
  plan: UserPlan;
  emailVerified: boolean;
  schoolLevel: string | null;
  createdAt: string;
  isDemo: boolean;
}

export interface AdminUserDetail {
  id: string;
  name: string;
  email: string;
  role: "student" | "admin";
  plan: UserPlan;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  onboarding: {
    firstName: string;
    schoolLevel: string;
    subjects: string[];
    goal: string;
    improveSubjects: string[];
    learningStyle: string;
    completedAt: string;
  } | null;
  counts: {
    activities: number;
    documents: number;
    summaries: number;
    exams: number;
    corrections: number;
    aiGenerations: number;
  };
  subscription: {
    freeGenerationUsedAt: string | null;
    premiumActivatedAt: string | null;
    paymentProvider: string | null;
    paymentReference: string | null;
  } | null;
  recentActivity: {
    id: string;
    title: string;
    type: string;
    occurredAt: string;
  }[];
}

export interface AdminSubscriptionRow {
  userId: string;
  name: string;
  email: string;
  plan: UserPlan;
  signedUpAt: string;
  premiumActivatedAt: string | null;
  paymentProvider: string | null;
  paymentReference: string | null;
  monthlyPriceFcfa: number;
}

export interface AdminSubscriptionsData {
  premiumRows: AdminSubscriptionRow[];
  freeCount: number;
  /** Premium + Premium+ confondus. */
  premiumCount: number;
  estimatedMrrFcfa: number;
  paymentConnected: boolean;
}

export interface AdminAiUsageByKind {
  kind: AiUsageKind;
  total: number;
  success: number;
  errors: number;
  tokens: number;
}

export interface AdminAiUsageUser {
  userId: string;
  name: string;
  email: string;
  total: number;
  tokens: number;
}

export interface AdminAiUsageData {
  totalRequests: number;
  totalSuccess: number;
  totalErrors: number;
  totalTokens: number;
  estimatedCostUsd: number;
  byKind: AdminAiUsageByKind[];
  topUsers: AdminAiUsageUser[];
  recent: {
    id: string;
    userName: string;
    userEmail: string;
    kind: AiUsageKind;
    model: string;
    status: string;
    tokens: number | null;
    createdAt: string;
  }[];
}

export interface AdminReport {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  type: ReportType;
  description: string;
  status: ReportStatus;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}

// ───────────────────────────── Paiements ─────────────────────────────

export interface AdminPaymentRow {
  userId: string;
  name: string;
  email: string;
  kind: string;
  provider: string;
  reference: string | null;
  paidAt: string | null;
  amountFcfa: number;
  creditsGranted: number;
}

export interface AdminPaymentsData {
  /** Lignes `credit_orders` (abonnements + recharges) — paiement simulé. */
  rows: AdminPaymentRow[];
  transactionCount: number;
  /** Somme simulée encaissée (`credit_orders.amountFcfa`) — aucun encaissement réel. */
  totalCollectedFcfa: number;
  /** Comptes payants (Premium/Premium+) sans aucune commande `credit_orders` — plan changé directement en base. */
  manualPremiumCount: number;
  paymentConnected: boolean;
}

// ───────────────────────────── Statistiques ─────────────────────────────

export interface AdminStatPoint {
  label: string;
  value: number;
}

export interface AdminStatsData {
  totalUsers: number;
  /** Inscriptions réelles par semaine, 8 semaines glissantes (ancienne → récente). */
  signupsByWeek: AdminStatPoint[];
  planSplit: { free: number; premium: number; premium_plus: number };
  aiByKind: AdminStatPoint[];
  contentTotals: {
    summaries: number;
    exams: number;
    corrections: number;
    documents: number;
  };
  reportsByStatus: { new: number; in_progress: number; resolved: number };
}

// ───────────────────────────── Activité ─────────────────────────────

export type AdminActivityKind = "activity" | "signup" | "ai" | "report";

export interface AdminActivityItem {
  id: string;
  kind: AdminActivityKind;
  title: string;
  detail: string | null;
  userLabel: string | null;
  occurredAt: string;
}

export interface AdminActivityFeedData {
  items: AdminActivityItem[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ───────────────────────── Gestion des contenus ─────────────────────────

export type AdminContentKind = "summary" | "exam" | "correction" | "document";

export interface AdminContentItem {
  id: string;
  kind: AdminContentKind;
  title: string;
  detail: string | null;
  ownerId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  createdAt: string;
}

export interface AdminContentData {
  totals: {
    summaries: number;
    exams: number;
    corrections: number;
    documents: number;
  };
  recent: AdminContentItem[];
}
