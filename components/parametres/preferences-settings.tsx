"use client";

import { Palette } from "lucide-react";
import { Select, Field } from "@/components/ui/select";
import { SettingsSection } from "./settings-section";
import { useI18n } from "@/lib/i18n/client";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { useTheme } from "@/lib/theme/client";
import { THEME_PREFERENCES, type ThemePreference } from "@/lib/theme/config";

/**
 * Langue et thème d'affichage — réellement appliqués : `useI18n`/`useTheme`
 * basculent l'interface immédiatement, `setLocale`/`setTheme` persistent la
 * préférence (cookie + compte).
 */
export function PreferencesSettings() {
  const { locale, dict, setLocale } = useI18n();
  const { preference: themePreference, setTheme } = useTheme();
  const t = dict.preferences;

  const themeLabels: Record<ThemePreference, string> = {
    light: t.themeLight,
    dark: t.themeDark,
    system: t.themeSystem,
  };

  return (
    <SettingsSection icon={Palette} title={t.title} description={t.description}>
      <div className="space-y-4">
        <Field label={t.language} htmlFor="pref-language">
          <Select
            id="pref-language"
            value={locale}
            onChange={(event) => setLocale(event.target.value as Locale)}
          >
            {LOCALES.map((value) => (
              <option key={value} value={value}>
                {LOCALE_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t.theme} htmlFor="pref-theme">
          <Select
            id="pref-theme"
            value={themePreference}
            onChange={(event) =>
              setTheme(event.target.value as ThemePreference)
            }
          >
            {THEME_PREFERENCES.map((value) => (
              <option key={value} value={value}>
                {themeLabels[value]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </SettingsSection>
  );
}
