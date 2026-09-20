import type { UserRole } from "@/types";

/**
 * Libellé français d'un rôle, pour l'affichage. Le rôle lui-même
 * (`"student"` / `"admin"`) sert uniquement au contrôle d'accès.
 * Utilisable côté client comme côté serveur (pas de `server-only`).
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  student: "Élève",
  admin: "Administrateur",
};

export function roleLabel(role: string | null | undefined): string {
  return role === "admin" ? ROLE_LABELS.admin : ROLE_LABELS.student;
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin";
}
