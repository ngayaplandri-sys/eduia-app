import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/**
 * `true` dès qu'une ligne `onboarding` existe pour ce compte — c'est le seul
 * signal utilisé pour décider d'afficher `/onboarding` (voir `app/(app)/layout.tsx`
 * et `app/onboarding/page.tsx`).
 */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.onboarding.id })
    .from(schema.onboarding)
    .where(eq(schema.onboarding.userId, userId))
    .limit(1);

  return Boolean(row);
}
