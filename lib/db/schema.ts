/**
 * Schéma de la base Neon (PostgreSQL) — source de vérité des tables.
 *
 * Les colonnes sont nommées en camelCase ici et converties en snake_case dans
 * la base (`casing: "snake_case"` dans `drizzle.config.ts` et `lib/db`).
 *
 * L'identité vient de Better Auth (`./auth-schema` : `user` / `session` /
 * `account` / `verification`, ré-exporté ci-dessous). Chaque table de données
 * pointe vers `user.id` (chaîne) et sera filtrée par cet id une fois les
 * lectures branchées.
 *
 * Les artefacts générés par l'IA (résumé, épreuve, correction) sont stockés en
 * `jsonb` (`payload`) + quelques colonnes plates pour les requêtes.
 */
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import type {
  CourseSummary,
  GeneratedExam,
  ExamCorrection,
  AssistantMessage,
  StoredDocumentFile,
} from "../../types";
import { user } from "./auth-schema";

export * from "./auth-schema";

/** Bibliothèque de fichiers importés (`/documents`). */
export const documents = pgTable("documents", {
  id: uuid().primaryKey().defaultRandom(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text().notNull(),
  /** pdf | docx | txt | image */
  fileKind: text().notNull(),
  subject: text().notNull(),
  level: text().notNull(),
  sizeLabel: text().notNull(),
  pageCount: integer().notNull().default(0),
  hasSummary: boolean().notNull().default(false),
  /** Inutilisée (remplacée par `files`), conservée pour ne supprimer aucune donnée. */
  storagePath: text(),
  /** Fichiers d'origine conservés dans le stockage privé (Vercel Blob). */
  files: jsonb().$type<StoredDocumentFile[]>().notNull().default([]),
  uploadedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** Journal d'activité (dashboard + `/historique`). */
export const activities = pgTable("activities", {
  id: uuid().primaryKey().defaultRandom(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text().notNull(),
  meta: text().notNull(),
  /** pdf | doc | exam | correction */
  fileKind: text().notNull(),
  /** Résumé | Épreuve | Correction */
  type: text().notNull(),
  statusLabel: text().notNull(),
  statusTone: text().notNull(),
  actionLabel: text().notNull(),
  actionHref: text().notNull(),
  occurredAt: timestamp({ withTimezone: true }).notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** Résumés de cours générés. */
export const summaries = pgTable("summaries", {
  id: uuid().primaryKey().defaultRandom(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  documentId: uuid().references(() => documents.id, { onDelete: "set null" }),
  title: text().notNull(),
  subject: text().notNull(),
  level: text().notNull(),
  theme: text().notNull(),
  status: text().notNull().default("Prêt"),
  payload: jsonb().$type<CourseSummary>().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** Épreuves générées. */
export const exams = pgTable("exams", {
  id: uuid().primaryKey().defaultRandom(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text().notNull(),
  subject: text().notNull(),
  level: text().notNull(),
  theme: text().notNull(),
  examType: text().notNull(),
  status: text().notNull().default("Prête"),
  questionCount: integer().notNull().default(0),
  totalPoints: integer().notNull().default(20),
  /**
   * Ancrage documentaire de l'épreuve : contenu du cours source (texte fourni,
   * tronqué) ou, à défaut, condensé fidèle des notions examinables produit par
   * l'IA depuis le document. Réinjecté par « Corriger une épreuve » pour que le
   * corrigé reste strictement fidèle au document → épreuve → correction.
   * `null` si l'épreuve a été générée sans document source.
   */
  sourceText: text(),
  payload: jsonb().$type<GeneratedExam>().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** Corrections de copies. */
export const corrections = pgTable("corrections", {
  id: uuid().primaryKey().defaultRandom(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  examId: uuid().references(() => exams.id, { onDelete: "set null" }),
  examTitle: text().notNull(),
  subject: text().notNull(),
  level: text().notNull(),
  status: text().notNull().default("Corrigée"),
  score: integer().notNull().default(0),
  maxScore: integer().notNull().default(20),
  payload: jsonb().$type<ExamCorrection>().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/**
 * Réponses au parcours d'accueil (une ligne = un compte a terminé l'onboarding ;
 * `userId` unique → sa seule présence pilote l'affichage de `/onboarding`).
 */
export const onboarding = pgTable("onboarding", {
  id: uuid().primaryKey().defaultRandom(),
  userId: text()
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  firstName: text().notNull(),
  schoolLevel: text().notNull(),
  subjects: jsonb().$type<string[]>().notNull(),
  goal: text().notNull(),
  improveSubjects: jsonb().$type<string[]>().notNull(),
  learningStyle: text().notNull(),
  completedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/**
 * Statut d'abonnement (`/premium`). Une ligne par utilisateur. `user.plan`
 * reste l'unique source de vérité du plan actif (free/premium/premium_plus).
 * `currentPeriodStart`/`currentPeriodEnd` pilotent le renouvellement mensuel
 * du solde de crédits (voir `lib/data/credits.ts` `getCreditWallet()`), posés
 * à l'abonnement (`applyPlanSubscription`) et avancés paresseusement à chaque
 * lecture du portefeuille une fois la période expirée.
 * `freeGenerationUsedAt` est un vestige de l'ancien quota "1 résumé gratuit à
 * vie", remplacé par le système de crédits — conservé en base (inutilisé)
 * plutôt que supprimé par migration. `paymentProvider`/`paymentReference`/
 * `premiumActivatedAt` restent pour compatibilité mais les véritables
 * événements de paiement (simulés) vivent désormais dans `credit_orders`.
 */
export const subscriptions = pgTable("subscriptions", {
  id: uuid().primaryKey().defaultRandom(),
  userId: text()
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  freeGenerationUsedAt: timestamp({ withTimezone: true }),
  paymentProvider: text(),
  paymentReference: text(),
  premiumActivatedAt: timestamp({ withTimezone: true }),
  currentPeriodStart: timestamp({ withTimezone: true }),
  currentPeriodEnd: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/**
 * Portefeuille de crédits — une ligne par utilisateur. Deux compartiments
 * gérés séparément (voir `lib/data/credits.ts`) :
 *  - `subscriptionBalance` : quota du palier payant en cours, réinitialisé
 *    (pas cumulé) à chaque renouvellement mensuel ou changement de palier ;
 *  - `rechargeBalance` : crédits gratuits à l'inscription (20, une fois) +
 *    crédits achetés en recharge — ne se réinitialisent jamais tout seuls.
 * La consommation pioche d'abord `subscriptionBalance`, puis `rechargeBalance`.
 */
export const creditWallets = pgTable("credit_wallets", {
  id: uuid().primaryKey().defaultRandom(),
  userId: text()
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  subscriptionBalance: integer().notNull().default(0),
  rechargeBalance: integer().notNull().default(0),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/**
 * Journal d'écritures de crédits, en ajout seul — trace chaque mouvement
 * (octroi, renouvellement, achat, consommation, remboursement) pour l'audit
 * et l'historique.
 */
export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /**
     * signup_grant | subscription_renewal | subscription_upgrade |
     * recharge_purchase | consume_summary | consume_exam |
     * consume_correction | consume_assistant | refund | admin_adjustment
     */
    kind: text().notNull(),
    /** Signé : positif = crédit, négatif = débit. */
    amount: integer().notNull(),
    /** subscription | recharge — compartiment affecté par cette écriture. */
    bucket: text().notNull(),
    /** Solde combiné (subscription + recharge) juste après cette écriture. */
    balanceAfter: integer().notNull(),
    metadata: jsonb(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("credit_ledger_user_created_idx").on(t.userId, t.createdAt)],
);

/**
 * Historique des achats (abonnement ou recharge) — remplace
 * `subscriptions.paymentProvider`, qui n'a jamais été peuplé (rien ne
 * l'écrivait). Paiement simulé pour l'instant (`status`/`paymentProvider`
 * toujours "paid"/"simulated") : un futur vrai prestataire écrirait ici de la
 * même façon, sans changer la forme de la table.
 */
export const creditOrders = pgTable(
  "credit_orders",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /**
     * subscription_premium | subscription_premium_plus | recharge_100 |
     * recharge_250 | recharge_500 | recharge_1000
     */
    kind: text().notNull(),
    amountFcfa: integer().notNull(),
    creditsGranted: integer().notNull(),
    status: text().notNull().default("paid"),
    paymentProvider: text().notNull().default("simulated"),
    paymentReference: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("credit_orders_user_created_idx").on(t.userId, t.createdAt)],
);

/**
 * Journal des appels IA (OpenAI) — une ligne par appel des routes `/api/ai/*`.
 * Alimente l'espace admin (`/admin/ai`) : nombre de générations, tokens
 * consommés, répartition par type et par utilisateur. Aucune clé ni contenu
 * n'est stocké, seulement des compteurs.
 */
/**
 * Conversation en cours de l'élève avec l'Assistant IA (`/assistant`) — une
 * seule conversation active par compte (`userId` unique), sauvegardée après
 * chaque échange réussi et restaurée telle quelle à la prochaine visite.
 * Effacée uniquement par « Nouvelle conversation » (suppression de la ligne).
 */
export const assistantConversations = pgTable("assistant_conversations", {
  id: uuid().primaryKey().defaultRandom(),
  userId: text()
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  messages: jsonb().$type<AssistantMessage[]>().notNull().default([]),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const aiUsage = pgTable("ai_usage", {
  id: uuid().primaryKey().defaultRandom(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  /** summary | exam | correction */
  kind: text().notNull(),
  model: text().notNull(),
  /** success | error */
  status: text().notNull(),
  inputTokens: integer(),
  outputTokens: integer(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/**
 * Problèmes signalés par les élèves (`/aide` → `/admin/reports`).
 * `userId` en `set null` : on garde le signalement même si le compte est
 * supprimé (`userEmail`/`userName` = instantané au moment de l'envoi).
 */
export const reports = pgTable("reports", {
  id: uuid().primaryKey().defaultRandom(),
  userId: text().references(() => user.id, { onDelete: "set null" }),
  userEmail: text(),
  userName: text(),
  /** bug | suggestion | question | autre */
  type: text().notNull(),
  description: text().notNull(),
  /** new | in_progress | resolved */
  status: text().notNull().default("new"),
  adminNote: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/**
 * Paiements Maketou — une ligne par panier créé (voir `lib/data/maketou.ts`).
 * Maketou n'envoie aucun webhook et le panier ne contient jamais le montant :
 * cette ligne est le seul enregistrement de CE qui a été acheté et À QUEL
 * PRIX (instantané pris à la création du panier). Le droit (crédits, palier)
 * n'est accordé qu'une fois, quand Maketou répond `completed` à une lecture
 * serveur du panier — jamais sur le simple retour du navigateur.
 *
 * `status` (le nôtre) : PENDING | COMPLETED | FAILED | EXPIRED.
 * `providerStatus` (Maketou) : waiting_payment | completed | payment_failed | abandoned.
 * Jamais lisible ni modifiable par le client : uniquement via les routes serveur.
 */
export const maketouCheckouts = pgTable(
  "maketou_checkouts",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Compte qui reçoit le droit (ici, l'acheteur lui-même). */
    ownerId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Compte qui a cliqué « Payer ». */
    buyerUserId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Identifiant du panier Maketou, tel que renvoyé. */
    cartId: text().notNull().unique(),
    status: text().notNull().default("PENDING"),
    providerStatus: text().notNull().default("waiting_payment"),
    /** Clé du catalogue (`lib/maketou/catalog.ts`) : ce qui a été acheté. */
    itemKey: text().notNull(),
    /** Montant facturé (instantané), plus petite unité de la devise. */
    amount: integer().notNull(),
    currency: text().notNull(),
    paymentId: text(),
    checkAttempts: integer().notNull().default(0),
    lastCheckedAt: timestamp({ withTimezone: true }),
    /** Posé une seule fois, jamais réinitialisé (un seul événement d'échec). */
    failureNotifiedAt: timestamp({ withTimezone: true }),
    completedAt: timestamp({ withTimezone: true }),
    /** Remarque d'exploitation (ex. paiement en double à rembourser à la main). */
    note: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("maketou_checkouts_status_created_idx").on(t.status, t.createdAt),
    index("maketou_checkouts_buyer_created_idx").on(t.buyerUserId, t.createdAt),
  ],
);

/**
 * Limites par acheteur, mises à jour par une seule requête conditionnelle
 * (jamais « compter puis insérer », qui laisserait passer des requêtes
 * simultanées) : nombre de paniers créés dans l'heure, et dernier appel à
 * Maketou déclenché par la page de retour (la clé API est partagée par tous).
 */
export const maketouBuyerLimits = pgTable("maketou_buyer_limits", {
  userId: text()
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  checkoutWindowStart: timestamp({ withTimezone: true }).notNull().defaultNow(),
  checkoutCount: integer().notNull().default(0),
  lastConfirmCallAt: timestamp({ withTimezone: true }),
});

/**
 * Bail d'exécution des tâches planifiées (une ligne par tâche) : empêche deux
 * exécutions simultanées du rapprochement Maketou, même lancées par plusieurs
 * planificateurs. Garde aussi la trace de la dernière exécution (contrôle).
 */
export const jobLeases = pgTable("job_leases", {
  name: text().primaryKey(),
  holder: text(),
  heldUntil: timestamp({ withTimezone: true }).notNull().defaultNow(),
  lastRunAt: timestamp({ withTimezone: true }),
  lastStopReason: text(),
});

export type DocumentRow = typeof documents.$inferSelect;
export type ActivityRow = typeof activities.$inferSelect;
export type SummaryRow = typeof summaries.$inferSelect;
export type ExamRow = typeof exams.$inferSelect;
export type CorrectionRow = typeof corrections.$inferSelect;
export type OnboardingRow = typeof onboarding.$inferSelect;
export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type AiUsageRow = typeof aiUsage.$inferSelect;
export type ReportRow = typeof reports.$inferSelect;
export type CreditWalletRow = typeof creditWallets.$inferSelect;
export type CreditLedgerRow = typeof creditLedger.$inferSelect;
export type CreditOrderRow = typeof creditOrders.$inferSelect;
export type AssistantConversationRow = typeof assistantConversations.$inferSelect;
export type MaketouCheckoutRow = typeof maketouCheckouts.$inferSelect;
