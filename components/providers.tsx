"use client";

import * as React from "react";
import { ToastProvider } from "@/components/ui/toast";
import { I18nProvider } from "@/lib/i18n/client";
import { ThemeProvider } from "@/lib/theme/client";
import type { Locale } from "@/lib/i18n/config";
import type { ThemePreference } from "@/lib/theme/config";

/** Fournisseurs client globaux, montés une seule fois dans le layout racine. */
export function Providers({
  locale,
  themePreference,
  children,
}: {
  locale: Locale;
  themePreference: ThemePreference;
  children: React.ReactNode;
}) {
  // `Suspense` : le temps que le dictionnaire de la langue arrive (premier
  // affichage d'une langue autre que le français), le HTML du serveur reste
  // affiché tel quel pendant l'hydratation.
  return (
    <React.Suspense fallback={null}>
      <I18nProvider initialLocale={locale}>
        <ThemeProvider initialPreference={themePreference}>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </I18nProvider>
    </React.Suspense>
  );
}
