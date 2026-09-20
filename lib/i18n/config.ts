/**
 * Configuration i18n d'EduIA — langues supportées et cookie de persistance.
 *
 * Approche « cookie + contexte React » (pas de routing `app/[lang]`) : la langue
 * choisie vit dans le cookie `eduia.locale` (lu côté serveur pour un rendu SSR
 * sans clignotement) et, pour un compte connecté, dans `user.locale`.
 */

export const LOCALES = ["fr", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";

/** Nom du cookie (non httpOnly : le provider client le lit pour basculer sans rechargement). */
export const LOCALE_COOKIE = "eduia.locale";

/** Durée de vie du cookie de préférence : 1 an. */
export const PREFERENCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Étiquette native d'une langue (pour le sélecteur de préférences). */
export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
};
