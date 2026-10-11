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

/**
 * Verrou des scripts qui EFFACENT la base (`db:reset`, `db:seed`).
 * `.env.local` pointe sur la même base Neon que le site en production :
 * lancés par erreur, ces scripts supprimeraient tous les comptes et données
 * des élèves. Ils ne s'exécutent donc qu'avec une confirmation explicite :
 *   EDUIA_CONFIRM_DB_WIPE=oui npm run db:seed
 * (à réserver à une base de développement séparée).
 */
export function requireDbWipeConfirmation(script: string): void {
  if (process.env.EDUIA_CONFIRM_DB_WIPE !== "oui") {
    console.error(
      `⛔ ${script} efface TOUTES les données de la base configurée dans .env.local\n` +
        "   (actuellement partagée avec le site en production). Opération bloquée.\n" +
        "   Si la base visée est bien une base de développement jetable, relancer avec :\n" +
        `   EDUIA_CONFIRM_DB_WIPE=oui npm run ${script}`,
    );
    process.exit(1);
  }
}
