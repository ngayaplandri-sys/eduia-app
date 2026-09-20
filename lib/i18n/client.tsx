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
import { dictionaries, type Dictionary } from "./dictionaries";
import { setLocalePreference } from "@/lib/actions/preferences";

interface I18nContextValue {
  locale: Locale;
  dict: Dictionary;
  setLocale: (locale: Locale) => void;
  /** `true` pendant le rafraîchissement des Server Components. */
  pending: boolean;
}

const I18nContext = React.createContext<I18nContextValue | null>(null);

function writeLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${PREFERENCE_COOKIE_MAX_AGE}; samesite=lax`;
}

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
  const [pending, startTransition] = React.useTransition();

  // Le serveur a pu résoudre la langue depuis `user.locale` (aucun cookie) :
  // on sème le cookie pour les requêtes suivantes (système externe uniquement).
  React.useEffect(() => {
    if (isLocale(initialLocale)) writeLocaleCookie(initialLocale);
  }, [initialLocale]);

  const setLocale = React.useCallback(
    (next: Locale) => {
      if (!isLocale(next) || next === locale) return;
      setLocaleState(next);
      writeLocaleCookie(next);
      if (typeof document !== "undefined") {
        document.documentElement.lang = next;
      }
      void setLocalePreference(next);
      startTransition(() => router.refresh());
    },
    [locale, router],
  );

  const value = React.useMemo<I18nContextValue>(
    () => ({ locale, dict: dictionaries[locale], setLocale, pending }),
    [locale, setLocale, pending],
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
