/**
 * Coordonnées du support.
 * Les textes affichés (FAQ, horaires, message pré-rempli…) vivent dans
 * `lib/i18n/dictionaries` (`aide.*`), pour être traduits FR/EN.
 */
export const supportConfig = {
  email: "ngayaplandri@gmail.com",
  /** Format international sans « + » ni espaces — PLACEHOLDER à remplacer. */
  whatsappNumber: "33612345678",
} as const;
