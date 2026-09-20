import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { requireDbUrl } from "./_env";

/**
 * Applique les migrations SQL versionnées de `drizzle/` à la base Neon.
 * Génère-les d'abord avec `npm run db:generate` après chaque modif du schéma.
 */
const db = drizzle(neon(requireDbUrl()));

async function main() {
  console.log("→ Application des migrations Drizzle (dossier drizzle/)…");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✅ Migrations appliquées.");
}

main().catch((error) => {
  console.error("❌ Échec des migrations :", error);
  process.exit(1);
});
