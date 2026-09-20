import { neon } from "@neondatabase/serverless";
import { requireDbUrl } from "./_env";

/** Teste la connexion à Neon et liste les tables + leur nombre de lignes. */
async function main() {
  const sql = neon(requireDbUrl());

  const info = await sql`
    select current_database() as db, version() as version, now() as now`;
  console.log("✅ Connexion Neon établie");
  console.log("   base    :", info[0].db);
  console.log("   version :", String(info[0].version).split(" on ")[0]);
  console.log("   heure   :", info[0].now);

  const tables = await sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
    order by table_name`;
  const names = tables.map((row) => row.table_name as string);

  if (names.length === 0) {
    console.log("   tables  : (aucune) — lance `npm run db:push`");
    return;
  }

  console.log("   tables  :");
  for (const name of names) {
    const rows = await sql.query(`select count(*)::int as n from "${name}"`);
    console.log(`             • ${name.padEnd(14)} ${rows[0].n} ligne(s)`);
  }
}

main().catch((error) => {
  console.error("❌ Échec de la connexion Neon :", error);
  process.exit(1);
});
