"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/data/user";
import { isDeclarableCountry } from "@/lib/config/countries";
import { detectCountry } from "@/lib/http/geo";

/**
 * Enregistre le pays déclaré par l'élève connecté (comptes créés avant la
 * question du pays). Seuls les codes de la liste sont acceptés ; le pays de
 * connexion est noté en même temps s'il manquait.
 */
export async function saveCountry(country: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (!isDeclarableCountry(country)) return { ok: false };

  const detected = detectCountry(await headers());
  try {
    const [row] = await db
      .select({ detectedCountry: schema.onboarding.detectedCountry })
      .from(schema.onboarding)
      .where(eq(schema.onboarding.userId, user.id))
      .limit(1);
    if (!row) return { ok: false };

    await db
      .update(schema.onboarding)
      .set({ country, detectedCountry: row.detectedCountry ?? detected })
      .where(eq(schema.onboarding.userId, user.id));
  } catch (error) {
    console.error("[country] enregistrement du pays impossible :", (error as Error)?.message);
    return { ok: false };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
