import { LOCALE_INTL, isLocale } from "@/lib/i18n/config";

/** Langue de formatage (une des langues de l'interface ; inconnue → français). */
type FormatLocale = string;
const intlLocale = (locale: FormatLocale) => LOCALE_INTL[isLocale(locale) ? locale : "fr"];
/** Liaison date / heure : « à » (fr), « at » (en), virgule ailleurs. */
const atWord = (locale: FormatLocale) => (locale === "fr" ? " à " : locale === "en" ? " at " : ", ");

/**
 * Formatte une date ISO : « 12/05/2024 à 14:30 » (fr) / « 12/05/2024 at 14:30 » (en).
 */
export function formatActivityDate(
  iso: string,
  locale: FormatLocale = "fr",
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  const intl = intlLocale(locale);
  const date = new Intl.DateTimeFormat(intl, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);

  const time = new Intl.DateTimeFormat(intl, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);

  return `${date}${atWord(locale)}${time}`;
}

/** Date seule au format « 12/05/2024 ». */
export function formatShortDate(iso: string, locale: FormatLocale = "fr"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/** Retourne le prénom à partir d'un nom complet. */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

/** Initiales pour l'avatar de repli (max 2 lettres). */
export function initials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Transforme un libellé en fragment de nom de fichier sûr. */
export function slugify(input: string): string {
  // NFD sépare les accents en marques combinantes (\p{M}) que l'on retire.
  const slug = input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "eduia";
}

/** Formatte une taille de fichier en octets : 1536 -> « 1,5 Ko » (fr) / « 1.5 KB » (en). */
export function formatBytes(bytes: number, locale: FormatLocale = "fr"): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  // Octets en français (o, Ko…), bytes ailleurs (B, KB…).
  const french = locale === "fr";
  const byteUnit = french ? "o" : "B";
  if (bytes < 1024) return `${bytes} ${byteUnit}`;
  const units = french ? ["Ko", "Mo", "Go"] : ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const num = new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
  return `${num} ${units[unit]}`;
}
