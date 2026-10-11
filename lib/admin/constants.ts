/**
 * E-mail du compte de démonstration utilisé pendant le développement.
 * Il est **exclu de toutes les statistiques et listes** de l'espace admin :
 * ce n'est pas un vrai utilisateur (voir `scripts/db-seed.ts`).
 */
export const DEMO_EMAIL = process.env.DEMO_USER_EMAIL ?? "demo@eduia.app";


export function formatFcfa(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(amount))} FCFA`;
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}
