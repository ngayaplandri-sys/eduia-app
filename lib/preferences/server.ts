import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  type Locale,
} from "@/lib/i18n/config";
import {
  DEFAULT_THEME_PREFERENCE,
  THEME_COOKIE,
  isThemePreference,
  type ThemePreference,
} from "@/lib/theme/config";
import { getCurrentUser } from "@/lib/data/user";

export interface ResolvedPreferences {
  locale: Locale;
  themePreference: ThemePreference;
}

/**
 * Résout la langue et le thème pour le rendu SSR : **cookie d'abord** (ce
 * navigateur), sinon `user.locale` / `user.theme` du compte connecté (utile
 * juste après une connexion sur un nouvel appareil), sinon valeurs par défaut.
 *
 * Appelée une seule fois dans `app/layout.tsx`. Le provider client réécrit
 * ensuite le cookie pour accélérer les requêtes suivantes.
 */
export const resolvePreferences = cache(
  async (): Promise<ResolvedPreferences> => {
    return resolvePreferencesUncached();
  },
);

async function resolvePreferencesUncached(): Promise<ResolvedPreferences> {
  const store = await cookies();
  const localeCookie = store.get(LOCALE_COOKIE)?.value;
  const themeCookie = store.get(THEME_COOKIE)?.value;

  let locale: Locale | null = isLocale(localeCookie) ? localeCookie : null;
  let themePreference: ThemePreference | null = isThemePreference(themeCookie)
    ? themeCookie
    : null;

  if (!locale || !themePreference) {
    try {
      const user = await getCurrentUser();
      if (user) {
        if (!locale && isLocale(user.locale)) locale = user.locale;
        if (!themePreference && isThemePreference(user.theme)) {
          themePreference = user.theme;
        }
      }
    } catch {
      // BDD indisponible : on retombe sur les valeurs par défaut ci-dessous.
    }
  }

  return {
    locale: locale ?? DEFAULT_LOCALE,
    themePreference: themePreference ?? DEFAULT_THEME_PREFERENCE,
  };
}
