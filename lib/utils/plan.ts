import type { UserPlan } from "@/types";

/**
 * `true` pour tout palier payant (Premium ou Premium+), `false` seulement
 * pour "free". Pas de `server-only` : utilisé aussi bien par les routes/
 * fonctions serveur que par les composants client affichant le badge de plan
 * (ex. `subscription-settings.tsx`, `premium-hero.tsx`).
 */
export function isPaidPlan(plan: UserPlan): boolean {
  return plan !== "free";
}
