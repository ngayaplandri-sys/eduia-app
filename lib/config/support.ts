/**
 * Coordonnées du support.
 * Les textes affichés (FAQ, horaires, message pré-rempli…) vivent dans
 * `lib/i18n/dictionaries` (`aide.*`), pour être traduits FR/EN.
 */
export const supportConfig: {
  email: string;
  /**
   * Numéro WhatsApp au format international, sans « + » ni espaces
   * (ex. « 237612345678 »). `null` = carte WhatsApp masquée sur la page Aide :
   * on n'affiche jamais de numéro factice aux élèves.
   */
  whatsappNumber: string | null;
} = {
  email: "ngayaplandri@gmail.com",
  whatsappNumber: null,
};
