/**
 * Configuration du thème d'affichage d'EduIA.
 *
 * Trois préférences : `light`, `dark`, `system` (suit l'OS). La préférence vit
 * dans le cookie `eduia.theme` et, pour un compte connecté, dans `user.theme`.
 * L'attribut réellement appliqué sur `<html>` est toujours **résolu**
 * (`light` | `dark`) — voir `resolveTheme()`.
 */

export const THEME_PREFERENCES = ["light", "dark", "system"] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];

/** Valeur concrète appliquée sur `<html data-theme>`. */
export type ResolvedTheme = "light" | "dark";

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";

export const THEME_COOKIE = "eduia.theme";

export function isThemePreference(value: unknown): value is ThemePreference {
  return (
    typeof value === "string" &&
    (THEME_PREFERENCES as readonly string[]).includes(value)
  );
}

/** Résout la préférence en thème concret selon le réglage système. */
export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "light" || preference === "dark") return preference;
  return systemPrefersDark ? "dark" : "light";
}
