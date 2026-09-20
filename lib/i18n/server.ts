import "server-only";
import { cache } from "react";
import { resolvePreferences } from "@/lib/preferences/server";
import type { Locale } from "./config";
import { dictionaries, type Dictionary } from "./dictionaries";

/**
 * Langue de la requête courante : cookie `eduia.locale` d'abord, sinon
 * `user.locale` du compte connecté (via `resolvePreferences`, `cache()`d et
 * partagé avec `app/layout.tsx` — pas de double lecture ni d'incohérence
 * serveur/client sur un nouvel appareil sans cookie).
 */
export const getLocale = cache(async (): Promise<Locale> => {
  return (await resolvePreferences()).locale;
});

/** Dictionnaire de la langue courante (Server Components, Route Handlers). */
export const getDictionary = cache(async (): Promise<Dictionary> => {
  return dictionaries[await getLocale()];
});
