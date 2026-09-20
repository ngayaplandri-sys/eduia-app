import { config } from "dotenv";

// Charge les secrets Next (`.env.local`) pour les scripts hors runtime Next.
config({ path: ".env.local" });

/**
 * Renvoie l'URL de connexion Neon.
 * @param preferUnpooled `true` pour la connexion directe (migrations),
 *   `false` (défaut) pour la connexion « pooled » (usage courant).
 */
export function requireDbUrl(preferUnpooled = false): string {
  const pooled = process.env.DATABASE_URL;
  const unpooled = process.env.DATABASE_URL_UNPOOLED;
  const url = preferUnpooled ? (unpooled ?? pooled) : (pooled ?? unpooled);
  if (!url) {
    throw new Error(
      "DATABASE_URL manquant dans .env.local (voir .env.example).",
    );
  }
  return url;
}
