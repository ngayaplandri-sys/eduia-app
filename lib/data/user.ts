import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { expireSubscriptionIfDue } from "@/lib/data/credits";
import type { User, UserPlan, UserRole } from "@/types";

/**
 * Session Better Auth de la requête courante (dédupliquée par `cache()` : le
 * shell et la page la lisent sans double appel).
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/**
 * Expiration du palier payant à la fin de la période payée (une fois par
 * requête de rendu) : un palier Premium n'est plus renouvelé gratuitement.
 */
const expirePaidPlanOnce = cache(expireSubscriptionIfDue);

/** Utilisateur connecté, ou `null`. */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;

  const account = session.user as typeof session.user & {
    locale?: string | null;
    theme?: string | null;
  };
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    avatarUrl: account.image ?? null,
    role: (account.role as UserRole | null) === "admin" ? "admin" : "student",
    plan: await currentPlan(account.id, (account.plan as UserPlan | null) ?? "free"),
    locale: account.locale ?? "fr",
    theme: account.theme ?? "system",
  };
}

/** Palier réel : un palier payant arrivé à échéance redevient gratuit. */
async function currentPlan(userId: string, plan: UserPlan): Promise<UserPlan> {
  if (plan === "free") return plan;
  return (await expirePaidPlanOnce(userId)) ? "free" : plan;
}

/**
 * Exige une session : renvoie l'utilisateur, ou redirige vers `/login`.
 * À utiliser en tête des pages `(app)` et dans `DashboardShell` (défense en
 * profondeur derrière `proxy.ts`).
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Exige une session ET le rôle `admin` (contrôle **serveur**).
 * - non connecté → `/login`
 * - connecté mais non-admin → `/dashboard` (un élève ne peut jamais atteindre
 *   l'espace admin, même en tapant `/admin` directement dans l'URL)
 *
 * À appeler en tête de `app/admin/layout.tsx` et de toute Server Action admin.
 * `lib/data/admin.ts` re-vérifie en plus le rôle avant chaque requête (défense
 * en profondeur).
 */
export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}

/**
 * Dérogation "crédits/quotas illimités" pour le rôle admin — désactivée par
 * défaut : un compte admin consomme ses crédits exactement comme un élève
 * quand il utilise Résumer/Générer/Corriger/Assistant (comportement demandé
 * pour que le solde affiché au dashboard reflète l'usage réel). Positionner
 * `ADMIN_UNLIMITED_CREDITS=true` (variable d'environnement **serveur**, jamais
 * exposée au client) pour réactiver explicitement l'accès illimité.
 */
const ADMIN_UNLIMITED_CREDITS = process.env.ADMIN_UNLIMITED_CREDITS === "true";

/**
 * Accès illimité aux fonctionnalités IA : n'est accordé au compte
 * propriétaire / administrateur que si `ADMIN_UNLIMITED_CREDITS` a été
 * explicitement activé (voir ci-dessus) — par défaut, un admin est soumis aux
 * mêmes quotas de crédits que n'importe quel utilisateur.
 *
 * Le rôle est résolu côté serveur par `getCurrentUser()` à partir de la session
 * Better Auth (colonne `user.role`, `input: false` dans `lib/auth.ts` → non
 * modifiable par le client ; attribué uniquement via `npm run set-admin`).
 *
 * Les utilisateurs normaux (`role: "student"`) conservent tous leurs quotas :
 * cette fonction ne fait qu'ajouter une dérogation optionnelle pour `"admin"`.
 */
export function hasUnlimitedAccess(user: Pick<User, "role">): boolean {
  return user.role === "admin" && ADMIN_UNLIMITED_CREDITS;
}
