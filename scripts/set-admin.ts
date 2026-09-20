import "./_env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db/client";
import * as schema from "../lib/db/schema";

/**
 * Attribue (ou retire) le rôle `admin` à un compte existant.
 *
 *   npm run set-admin -- adresse@exemple.com
 *   npm run set-admin -- adresse@exemple.com --revoke
 *
 * Seul moyen d'obtenir le rôle admin : il n'est jamais choisissable à
 * l'inscription (`lib/auth.ts` → `input: false`).
 */
async function main() {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith("--"))?.trim().toLowerCase();
  const revoke = args.includes("--revoke");

  if (!email) {
    console.error("Usage : npm run set-admin -- <email> [--revoke]");
    process.exit(1);
  }

  const nextRole = revoke ? "student" : "admin";

  const [updated] = await db
    .update(schema.user)
    .set({ role: nextRole, updatedAt: new Date() })
    .where(eq(schema.user.email, email))
    .returning({ email: schema.user.email, role: schema.user.role });

  if (!updated) {
    console.error(
      `❌ Aucun compte avec l'e-mail « ${email} ». Inscris-toi d'abord dans l'application.`,
    );
    process.exit(1);
  }

  console.log(`✅ ${updated.email} → rôle « ${updated.role} »`);
  console.log(
    "   Reconnecte-toi (déconnexion / connexion) pour rafraîchir ta session.",
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Échec :", error);
    process.exit(1);
  });
