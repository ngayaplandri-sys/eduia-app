"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  PREFERENCE_COOKIE_MAX_AGE,
  isLocale,
  type Locale,
} from "./config";
import type { Dictionary } from "./dictionaries";
import { fr } from "./dictionaries/fr";
import { getLoadedDictionary, loadDictionary } from "./registry";
import { setLocalePreference } from "@/lib/actions/preferences";

interface I18nContextValue {
  locale: Locale;
  dict: Dictionary;
  setLocale: (locale: Locale) => void;
  /** `true` pendant le chargement d'une langue ou le rafraîchissement des Server Components. */
  pending: boolean;
}

const I18nContext = React.createContext<I18nContextValue | null>(null);

function writeLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${PREFERENCE_COOKIE_MAX_AGE}; samesite=lax`;
}

/**
 * Promesse déjà tenue : `React.use()` la lit tout de suite, sans suspendre
 * (React reconnaît les champs `status` / `value` qu'il pose lui-même).
 */
function fulfilled(dictionary: Dictionary): Promise<Dictionary> {
  const promise = Promise.resolve(dictionary);
  Object.assign(promise, { status: "fulfilled", value: dictionary });
  return promise;
}

/**
 * Promesse STABLE par langue pour `React.use()`, appelé à chaque rendu (jamais
 * sous condition : React rejoue le rendu interrompu en comptant sur le même
 * appel). Déjà tenue si la langue est chargée ; repli sur le français si le
 * chargement échoue.
 */
const safeLoads = new Map<Locale, Promise<Dictionary>>();
function safeLoad(locale: Locale): Promise<Dictionary> {
  let promise = safeLoads.get(locale);
  if (!promise) {
    const ready = getLoadedDictionary(locale);
    promise = ready
      ? fulfilled(ready)
      : loadDictionary(locale).catch(() => {
          safeLoads.delete(locale);
          return fr;
        });
    safeLoads.set(locale, promise);
  }
  return promise;
}

/**
 * Langue de l'interface. Le dictionnaire d'une langue autre que le français
 * est chargé à la demande : au premier affichage, `React.use()` suspend le
 * rendu le temps de recevoir son fichier (côté navigateur, le HTML du serveur
 * reste affiché pendant ce temps : pas de clignotement). Monté sous un
 * `<Suspense>` (voir `components/providers.tsx`).
 */
export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = React.useState<Locale>(() =>
    isLocale(initialLocale) ? initialLocale : DEFAULT_LOCALE,
  );
  const [switching, setSwitching] = React.useState<Locale | null>(null);
  const [refreshing, startTransition] = React.useTransition();
  const dict = React.use(safeLoad(locale));

  // Le serveur a pu résoudre la langue depuis `user.locale` (aucun cookie) :
  // on sème le cookie pour les requêtes suivantes (système externe uniquement).
  React.useEffect(() => {
    if (isLocale(initialLocale)) writeLocaleCookie(initialLocale);
  }, [initialLocale]);

  const setLocale = React.useCallback(
    (next: Locale) => {
      if (!isLocale(next) || next === locale) return;
      writeLocaleCookie(next);
      void setLocalePreference(next);
      setSwitching(next);
      // La nouvelle langue s'affiche dès que son dictionnaire est arrivé.
      loadDictionary(next)
        .then(() => {
          document.documentElement.lang = next;
          startTransition(() => {
            setLocaleState(next);
            router.refresh();
          });
        })
        .catch(() => {
          // Hors ligne : la langue sera appliquée au prochain chargement (cookie posé).
        })
        .finally(() => setSwitching(null));
    },
    [locale, router],
  );

  const value = React.useMemo<I18nContextValue>(
    () => ({ locale, dict, setLocale, pending: refreshing || switching !== null }),
    [locale, dict, setLocale, refreshing, switching],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Langue courante + dictionnaire + `setLocale`. À utiliser dans les Client Components. */
export function useI18n(): I18nContextValue {
  const ctx = React.useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n doit être utilisé dans un <I18nProvider>.");
  }
  return ctx;
}
