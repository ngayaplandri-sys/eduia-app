/**
 * Pays proposés à l'élève (question « Dans quel pays étudies-tu ? » de
 * l'onboarding) — codes ISO 3166-1 alpha-2, ceux que Vercel renvoie aussi dans
 * l'en-tête `x-vercel-ip-country`. Noms affichés : table FR/EN ci-dessous.
 *
 * Client-safe : aucune dépendance serveur.
 */

/** Les 54 pays d'Afrique. */
export const AFRICAN_COUNTRY_CODES = [
  "DZ", "AO", "BJ", "BW", "BF", "BI", "CV", "CM", "CF", "TD", "KM", "CG", "CD",
  "CI", "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE",
  "LS", "LR", "LY", "MG", "MW", "ML", "MR", "MU", "MA", "MZ", "NA", "NE", "NG",
  "RW", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD", "TZ", "TG", "TN", "UG",
  "ZM", "ZW",
] as const;

/** Pays hors d'Afrique où étudient le plus souvent les élèves de la diaspora. */
export const OTHER_COUNTRY_CODES = [
  "FR", "BE", "CH", "CA", "US", "GB", "DE", "IT", "ES", "PT", "TR", "CN", "RU",
  "AE", "SA", "LB", "HT",
] as const;

/** Réponse « Autre pays » (code réservé ISO « ZZ » = région inconnue). */
export const OTHER_COUNTRY = "ZZ";

const DECLARABLE = new Set<string>([
  ...AFRICAN_COUNTRY_CODES,
  ...OTHER_COUNTRY_CODES,
  OTHER_COUNTRY,
]);

/** `true` si l'élève peut choisir ce code dans la liste. */
export function isDeclarableCountry(code: unknown): code is string {
  return typeof code === "string" && DECLARABLE.has(code);
}

/** Code pays ISO alpha-2 bien formé (ex. détection automatique). */
export function isCountryCode(code: unknown): code is string {
  return typeof code === "string" && /^[A-Z]{2}$/.test(code);
}

/**
 * Noms FR/EN écrits en dur : identiques sur le serveur et sur tous les
 * téléphones (les anciens navigateurs Android ne connaissent pas toujours
 * `Intl.DisplayNames`). Un code détecté hors de cette liste retombe sur
 * `Intl.DisplayNames` (espace admin), puis sur le code lui-même.
 */
const COUNTRY_NAMES: Record<string, { fr: string; en: string }> = {
  DZ: { fr: "Algérie", en: "Algeria" },
  AO: { fr: "Angola", en: "Angola" },
  BJ: { fr: "Bénin", en: "Benin" },
  BW: { fr: "Botswana", en: "Botswana" },
  BF: { fr: "Burkina Faso", en: "Burkina Faso" },
  BI: { fr: "Burundi", en: "Burundi" },
  CV: { fr: "Cap-Vert", en: "Cape Verde" },
  CM: { fr: "Cameroun", en: "Cameroon" },
  CF: { fr: "République centrafricaine", en: "Central African Republic" },
  TD: { fr: "Tchad", en: "Chad" },
  KM: { fr: "Comores", en: "Comoros" },
  CG: { fr: "Congo-Brazzaville", en: "Republic of the Congo" },
  CD: { fr: "RD Congo", en: "DR Congo" },
  CI: { fr: "Côte d'Ivoire", en: "Côte d'Ivoire" },
  DJ: { fr: "Djibouti", en: "Djibouti" },
  EG: { fr: "Égypte", en: "Egypt" },
  GQ: { fr: "Guinée équatoriale", en: "Equatorial Guinea" },
  ER: { fr: "Érythrée", en: "Eritrea" },
  SZ: { fr: "Eswatini", en: "Eswatini" },
  ET: { fr: "Éthiopie", en: "Ethiopia" },
  GA: { fr: "Gabon", en: "Gabon" },
  GM: { fr: "Gambie", en: "Gambia" },
  GH: { fr: "Ghana", en: "Ghana" },
  GN: { fr: "Guinée", en: "Guinea" },
  GW: { fr: "Guinée-Bissau", en: "Guinea-Bissau" },
  KE: { fr: "Kenya", en: "Kenya" },
  LS: { fr: "Lesotho", en: "Lesotho" },
  LR: { fr: "Liberia", en: "Liberia" },
  LY: { fr: "Libye", en: "Libya" },
  MG: { fr: "Madagascar", en: "Madagascar" },
  MW: { fr: "Malawi", en: "Malawi" },
  ML: { fr: "Mali", en: "Mali" },
  MR: { fr: "Mauritanie", en: "Mauritania" },
  MU: { fr: "Maurice", en: "Mauritius" },
  MA: { fr: "Maroc", en: "Morocco" },
  MZ: { fr: "Mozambique", en: "Mozambique" },
  NA: { fr: "Namibie", en: "Namibia" },
  NE: { fr: "Niger", en: "Niger" },
  NG: { fr: "Nigeria", en: "Nigeria" },
  RW: { fr: "Rwanda", en: "Rwanda" },
  ST: { fr: "Sao Tomé-et-Principe", en: "São Tomé & Príncipe" },
  SN: { fr: "Sénégal", en: "Senegal" },
  SC: { fr: "Seychelles", en: "Seychelles" },
  SL: { fr: "Sierra Leone", en: "Sierra Leone" },
  SO: { fr: "Somalie", en: "Somalia" },
  ZA: { fr: "Afrique du Sud", en: "South Africa" },
  SS: { fr: "Soudan du Sud", en: "South Sudan" },
  SD: { fr: "Soudan", en: "Sudan" },
  TZ: { fr: "Tanzanie", en: "Tanzania" },
  TG: { fr: "Togo", en: "Togo" },
  TN: { fr: "Tunisie", en: "Tunisia" },
  UG: { fr: "Ouganda", en: "Uganda" },
  ZM: { fr: "Zambie", en: "Zambia" },
  ZW: { fr: "Zimbabwe", en: "Zimbabwe" },
  FR: { fr: "France", en: "France" },
  BE: { fr: "Belgique", en: "Belgium" },
  CH: { fr: "Suisse", en: "Switzerland" },
  CA: { fr: "Canada", en: "Canada" },
  US: { fr: "États-Unis", en: "United States" },
  GB: { fr: "Royaume-Uni", en: "United Kingdom" },
  DE: { fr: "Allemagne", en: "Germany" },
  IT: { fr: "Italie", en: "Italy" },
  ES: { fr: "Espagne", en: "Spain" },
  PT: { fr: "Portugal", en: "Portugal" },
  TR: { fr: "Turquie", en: "Türkiye" },
  CN: { fr: "Chine", en: "China" },
  RU: { fr: "Russie", en: "Russia" },
  AE: { fr: "Émirats arabes unis", en: "United Arab Emirates" },
  SA: { fr: "Arabie saoudite", en: "Saudi Arabia" },
  LB: { fr: "Liban", en: "Lebanon" },
  HT: { fr: "Haïti", en: "Haiti" },
};

/** Nom du pays dans la langue demandée (« Cameroun », « Cameroon »…). */
export function countryName(
  code: string | null | undefined,
  locale: string,
  labels: { unknown: string; other: string },
): string {
  if (!code) return labels.unknown;
  if (code === OTHER_COUNTRY) return labels.other;
  const known = COUNTRY_NAMES[code];
  if (known) return locale.startsWith("en") ? known.en : known.fr;
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Codes triés par nom affiché (ordre alphabétique de la langue). */
export function sortCountryCodes(
  codes: readonly string[],
  locale: string,
): string[] {
  const labels = { unknown: "", other: "" };
  const collator = new Intl.Collator(locale, { sensitivity: "base" });
  return [...codes].sort((a, b) =>
    collator.compare(countryName(a, locale, labels), countryName(b, locale, labels)),
  );
}
