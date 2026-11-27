/**
 * Schéma d'authentification Better Auth (v1.7) — tables `user` / `session` /
 * `account` / `verification` / `rateLimit`.
 *
 * Écrit à la main d'après `@better-auth/core` `getAuthTables()`. Les noms de
 * colonnes sont en camelCase ici et convertis en snake_case dans la base
 * (`casing: "snake_case"`), comme le reste du schéma. `role` et `plan` sont les
 * champs additionnels déclarés dans `lib/auth.ts`.
 *
 * Better Auth génère lui-même les `id` (chaînes) → `text().primaryKey()` sans
 * valeur par défaut côté base.
 */
import {
  pgTable,
  text,
  boolean,
  integer,
  bigint,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  role: text().default("student"),
  plan: text().default("free"),
  /** Préférences d'affichage (champs additionnels Better Auth, voir `lib/auth.ts`). */
  locale: text().default("fr"),
  theme: text().default("system"),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text().primaryKey(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text().primaryKey(),
    /**
     * Colonne des versions 1.7.0 à 1.7.2 de Better Auth, qui ne l'écrit plus
     * depuis la 1.7.3 (un compte est identifié par `providerId` + `accountId`,
     * comme en 1.6). Gardée facultative pour conserver les valeurs existantes :
     * obligatoire, elle ferait échouer chaque création de compte.
     */
    issuer: text(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("account_provider_id_account_id_idx").on(t.providerId, t.accountId),
    index("account_user_id_idx").on(t.userId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/**
 * Compteurs de la limite de requêtes de Better Auth (`rateLimit.storage:
 * "database"` dans `lib/auth.ts`) : partagés par toutes les instances Vercel,
 * contrairement au stockage en mémoire propre à chaque instance. Une ligne par
 * couple adresse IP + chemin (`key`), supprimée quand sa fenêtre est passée.
 */
export const rateLimit = pgTable("rate_limit", {
  id: text().primaryKey(),
  key: text().notNull().unique(),
  count: integer().notNull(),
  /** Dernière requête, en millisecondes depuis 1970. */
  lastRequest: bigint({ mode: "number" }).notNull(),
});
