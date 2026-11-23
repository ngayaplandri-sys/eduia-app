import "server-only";
import type { Locale } from "../config";
import { fr, type Dictionary } from "./fr";
import { en } from "./en";
import { tr } from "./tr";
import { uz } from "./uz";
import { de } from "./de";
import { es } from "./es";
import { ar } from "./ar";
import { pt } from "./pt";
import { it } from "./it";
import { nl } from "./nl";
import { pl } from "./pl";
import { ru } from "./ru";
import { zh } from "./zh";
import { ja } from "./ja";
import { ko } from "./ko";
import { hi } from "./hi";
import { sw } from "./sw";
import { vi } from "./vi";

/**
 * Tous les dictionnaires, côté SERVEUR uniquement (Server Components, routes).
 * Le navigateur, lui, ne reçoit que la langue de la page (`lib/i18n/registry.ts`).
 */
export const dictionaries: Record<Locale, Dictionary> = {
  fr,
  en,
  tr,
  uz,
  de,
  es,
  ar,
  pt,
  it,
  nl,
  pl,
  ru,
  zh,
  ja,
  ko,
  hi,
  sw,
  vi,
};

export type { Dictionary };
