import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

/**
 * Client Drizzle vers Neon (PostgreSQL) via `neon-serverless` (WebSocket) :
 * remplaçant compatible `pg` qui gère les **transactions interactives**,
 * requises par Better Auth (création atomique `user` + `account`).
 * Node 24 fournit `WebSocket` nativement.
 *
 * Ce module n'a PAS `server-only` : il est importé par `lib/auth.ts` (chargé
 * aussi par la CLI Better Auth, hors contexte React). Le code applicatif passe
 * plutôt par `@/lib/db` (ré-export protégé par `server-only`).
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL manquant : copie .env.example vers .env.local et renseigne l'URL Neon.",
  );
}

// Un seul pool réutilisé entre les rechargements à chaud du serveur de dev.
const globalForDb = globalThis as unknown as { __eduiaPool?: Pool };
const pool = globalForDb.__eduiaPool ?? new Pool({ connectionString });
if (process.env.NODE_ENV !== "production") {
  globalForDb.__eduiaPool = pool;
}

export const db = drizzle(pool, { schema, casing: "snake_case" });

export { schema };
