import "./_env";
import { neon } from "@neondatabase/serverless";
import { requireDbUrl, requireDbWipeConfirmation } from "./_env";

/**
 * Vide entièrement la base Neon (schéma `public` + journal des migrations).
 * Pré-lancement uniquement : détruit toutes les données. Enchaîner avec
 * `npm run db:migrate` puis `npm run db:seed`.
 */
const sql = neon(requireDbUrl());

async function main() {
  requireDbWipeConfirmation("db:reset");
  await sql`drop schema if exists drizzle cascade`;
  await sql`drop schema if exists public cascade`;
  await sql`create schema public`;
  await sql`grant all on schema public to public`;
  console.log("✅ Base Neon réinitialisée (schéma public recréé, vide).");
}

main().catch((error) => {
  console.error("❌ Échec de la réinitialisation :", error);
  process.exit(1);
});
