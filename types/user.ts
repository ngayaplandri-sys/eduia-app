/**
 * Rôle = contrôle d'accès (jamais choisi à l'inscription, voir `lib/auth.ts`
 * `input: false`). Le libellé affiché est dérivé via `roleLabel()` (`lib/roles.ts`).
 */
export type UserRole = "student" | "admin";

export type UserPlan = "free" | "premium" | "premium_plus";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  avatarUrl: string | null;
  plan: UserPlan;
  /** Langue d'interface préférée (`fr` | `en`). Voir `lib/i18n`. */
  locale: string;
  /** Thème d'affichage préféré (`light` | `dark` | `system`). Voir `lib/theme`. */
  theme: string;
}
