import type { Locale } from "./config";
import { fr, type Dictionary } from "./dictionaries/fr";

/**
 * Dictionnaires côté navigateur. Seul le français (langue par défaut) est
 * embarqué ; chaque autre langue est un fichier JavaScript séparé, chargé à la
 * demande (`import()`) : un visiteur ne télécharge que la langue qu'il lit.
 */
const loaded: Partial<Record<Locale, Dictionary>> = { fr };
const pending: Partial<Record<Locale, Promise<Dictionary>>> = {};

const LOADERS: Record<Exclude<Locale, "fr">, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en").then((m) => m.en),
  tr: () => import("./dictionaries/tr").then((m) => m.tr),
  uz: () => import("./dictionaries/uz").then((m) => m.uz),
  de: () => import("./dictionaries/de").then((m) => m.de),
  es: () => import("./dictionaries/es").then((m) => m.es),
  ar: () => import("./dictionaries/ar").then((m) => m.ar),
  pt: () => import("./dictionaries/pt").then((m) => m.pt),
  it: () => import("./dictionaries/it").then((m) => m.it),
  nl: () => import("./dictionaries/nl").then((m) => m.nl),
  pl: () => import("./dictionaries/pl").then((m) => m.pl),
  ru: () => import("./dictionaries/ru").then((m) => m.ru),
  zh: () => import("./dictionaries/zh").then((m) => m.zh),
  ja: () => import("./dictionaries/ja").then((m) => m.ja),
  ko: () => import("./dictionaries/ko").then((m) => m.ko),
  hi: () => import("./dictionaries/hi").then((m) => m.hi),
  sw: () => import("./dictionaries/sw").then((m) => m.sw),
  vi: () => import("./dictionaries/vi").then((m) => m.vi),
};

/** Dictionnaire déjà chargé, ou `undefined`. */
export function getLoadedDictionary(locale: Locale): Dictionary | undefined {
  return loaded[locale];
}

/**
 * Charge une langue (une seule fois). Renvoie toujours la MÊME promesse pour
 * une langue donnée, comme l'exige `React.use()`.
 */
export function loadDictionary(locale: Locale): Promise<Dictionary> {
  const ready = loaded[locale];
  if (ready) return Promise.resolve(ready);
  const existing = pending[locale];
  if (existing) return existing;
  const promise = LOADERS[locale as Exclude<Locale, "fr">]().then(
    (dictionary) => {
      loaded[locale] = dictionary;
      return dictionary;
    },
    (error: unknown) => {
      // Réseau coupé : on pourra réessayer plus tard.
      delete pending[locale];
      throw error;
    },
  );
  pending[locale] = promise;
  return promise;
}
