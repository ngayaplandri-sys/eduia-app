import type { Metadata } from "next";
import { requireAdmin } from "@/lib/data/user";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s · Admin EduIA" },
  description: "Espace d'administration EduIA.",
  robots: { index: false, follow: false },
};

/**
 * Barrière de l'espace admin (contrôle **serveur**) : `requireAdmin()` redirige
 * un visiteur non connecté vers `/login` et tout compte non `admin` vers
 * `/dashboard` — un élève ne peut pas atteindre `/admin`, même en tapant l'URL.
 * `lib/data/admin.ts` re-vérifie le rôle avant chaque requête (défense en
 * profondeur).
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  return <AdminShell user={admin}>{children}</AdminShell>;
}
