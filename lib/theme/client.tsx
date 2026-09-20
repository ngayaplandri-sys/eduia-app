"use client";

import * as React from "react";
import {
  DEFAULT_THEME_PREFERENCE,
  THEME_COOKIE,
  isThemePreference,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from "./config";
import { PREFERENCE_COOKIE_MAX_AGE } from "@/lib/i18n/config";
import { setThemePreference } from "@/lib/actions/preferences";

interface ThemeContextValue {
  /** Préférence brute choisie par l'utilisateur. */
  preference: ThemePreference;
  /** Thème réellement appliqué sur `<html>`. */
  resolved: ResolvedTheme;
  setTheme: (preference: ThemePreference) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

const DARK_QUERY = "(prefers-color-scheme: dark)";

function systemPrefersDark() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(DARK_QUERY).matches
  );
}

function applyResolvedTheme(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

function writeThemeCookie(preference: ThemePreference) {
  document.cookie = `${THEME_COOKIE}=${preference}; path=/; max-age=${PREFERENCE_COOKIE_MAX_AGE}; samesite=lax`;
}

export function ThemeProvider({
  initialPreference,
  children,
}: {
  initialPreference: ThemePreference;
  children: React.ReactNode;
}) {
  const [preference, setPreference] = React.useState<ThemePreference>(() =>
    isThemePreference(initialPreference)
      ? initialPreference
      : DEFAULT_THEME_PREFERENCE,
  );
  const [prefersDark, setPrefersDark] = React.useState<boolean>(systemPrefersDark);

  // Le serveur a pu résoudre la préférence depuis `user.theme` (aucun cookie) :
  // on sème le cookie pour les requêtes suivantes (mise à jour d'un système
  // externe uniquement — pas de setState ici).
  React.useEffect(() => {
    if (isThemePreference(initialPreference)) writeThemeCookie(initialPreference);
  }, [initialPreference]);

  // Suit le réglage système tant que la préférence est « système ».
  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => setPrefersDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolved = resolveTheme(preference, prefersDark);

  React.useEffect(() => {
    applyResolvedTheme(resolved);
  }, [resolved]);

  const setTheme = React.useCallback((next: ThemePreference) => {
    if (!isThemePreference(next)) return;
    setPreference(next);
    writeThemeCookie(next);
    applyResolvedTheme(resolveTheme(next, systemPrefersDark()));
    void setThemePreference(next);
  }, []);

  const value = React.useMemo<ThemeContextValue>(
    () => ({ preference, resolved, setTheme }),
    [preference, resolved, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme doit être utilisé dans un <ThemeProvider>.");
  }
  return ctx;
}
