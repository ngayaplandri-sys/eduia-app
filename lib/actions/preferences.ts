"use server";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/data/user";
import {
  LOCALE_COOKIE,
  PREFERENCE_COOKIE_MAX_AGE,
  isLocale,
} from "@/lib/i18n/config";
import { THEME_COOKIE, isThemePreference } from "@/lib/theme/config";

const COOKIE_OPTIONS = {
  path: "/",
  maxAge: PREFERENCE_COOKIE_MAX_AGE,
  sameSite: "lax",
  httpOnly: false,
} as const;

/**
 * Persiste la langue choisie : cookie (ce navigateur) + `user.locale` (le compte,
 * pour la retrouver sur un autre appareil). Appelée en « fire-and-forget » par le
 * provider client, qui a déjà basculé l'UI de son côté.
 */
export async function setLocalePreference(locale: string): Promise<void> {
  if (!isLocale(locale)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, COOKIE_OPTIONS);

  const user = await getCurrentUser();
  if (!user) return;

  try {
    await db
      .update(schema.user)
      .set({ locale, updatedAt: new Date() })
      .where(eq(schema.user.id, user.id));
  } catch (error) {
    console.error("[preferences] échec de la persistance de la langue :", error);
  }
}

/**
 * Persiste le thème choisi : cookie + `user.theme`. Même logique que la langue.
 */
export async function setThemePreference(preference: string): Promise<void> {
  if (!isThemePreference(preference)) return;

  const store = await cookies();
  store.set(THEME_COOKIE, preference, COOKIE_OPTIONS);

  const user = await getCurrentUser();
  if (!user) return;

  try {
    await db
      .update(schema.user)
      .set({ theme: preference, updatedAt: new Date() })
      .where(eq(schema.user.id, user.id));
  } catch (error) {
    console.error("[preferences] échec de la persistance du thème :", error);
  }
}
