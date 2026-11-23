/**
 * Configuration i18n d'EduIA — langues supportées et cookie de persistance.
 *
 * Approche « cookie + contexte React » (pas de routing `app/[lang]`) : la langue
 * choisie vit dans le cookie `eduia.locale` (lu côté serveur pour un rendu SSR
 * sans clignotement) et, pour un compte connecté, dans `user.locale`.
 *
 * Les mêmes langues que le Professeur vocal (`lib/config/voice-tutor.ts`).
 */

export const LOCALES = [
  "fr",
  "en",
  "tr",
  "uz",
  "de",
  "es",
  "ar",
  "pt",
  "it",
  "nl",
  "pl",
  "ru",
  "zh",
  "ja",
  "ko",
  "hi",
  "sw",
  "vi",
] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";

/** Nom du cookie (non httpOnly : le provider client le lit pour basculer sans rechargement). */
export const LOCALE_COOKIE = "eduia.locale";

/** Durée de vie du cookie de préférence : 1 an. */
export const PREFERENCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Étiquette native d'une langue (pour les sélecteurs de langue). */
export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  tr: "Türkçe",
  uz: "Oʻzbekcha",
  de: "Deutsch",
  es: "Español",
  ar: "العربية",
  pt: "Português",
  it: "Italiano",
  nl: "Nederlands",
  pl: "Polski",
  ru: "Русский",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
  hi: "हिन्दी",
  sw: "Kiswahili",
  vi: "Tiếng Việt",
};

/** Nom anglais de la langue (consignes de langue données à l'IA). */
export const LOCALE_ENGLISH_NAMES: Record<Locale, string> = {
  fr: "French",
  en: "English",
  tr: "Turkish",
  uz: "Uzbek (Latin script)",
  de: "German",
  es: "Spanish",
  ar: "Arabic",
  pt: "Portuguese",
  it: "Italian",
  nl: "Dutch",
  pl: "Polish",
  ru: "Russian",
  zh: "Simplified Chinese",
  ja: "Japanese",
  ko: "Korean",
  hi: "Hindi",
  sw: "Swahili",
  vi: "Vietnamese",
};

/** Locale `Intl` (BCP 47) de chaque langue : dates, nombres, tri. */
export const LOCALE_INTL: Record<Locale, string> = {
  fr: "fr-FR",
  en: "en-GB",
  tr: "tr-TR",
  uz: "uz-Latn-UZ",
  de: "de-DE",
  es: "es-ES",
  ar: "ar",
  pt: "pt-PT",
  it: "it-IT",
  nl: "nl-NL",
  pl: "pl-PL",
  ru: "ru-RU",
  zh: "zh-CN",
  ja: "ja-JP",
  ko: "ko-KR",
  hi: "hi-IN",
  sw: "sw-KE",
  vi: "vi-VN",
};

/**
 * Langue « de repli » pour ce qui n'existe qu'en français et en anglais
 * (modèles d'épreuve, symboles des PDF, e-mails) : le français reste français,
 * toutes les autres langues passent par l'anglais.
 */
export function frOrEn(locale: string): "fr" | "en" {
  return locale === "fr" ? "fr" : "en";
}
