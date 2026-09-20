/**
 * Contenu du comparatif de la page `/premium` (3 paliers). Les prix/crédits
 * eux-mêmes vivent dans `lib/config/credits.ts` (`PLAN_CREDITS`,
 * `RECHARGE_PACKAGES`) — source unique, partagée avec la couche crédits
 * serveur (`lib/data/credits.ts`) et l'admin (`lib/data/admin.ts`).
 */

export interface ComparisonRow {
  label: string;
  free: string;
  freeIncluded: boolean;
  premium: string;
  premiumPlus: string;
}

export const PREMIUM_COMPARISON_ROWS: ComparisonRow[] = [
  {
    label: "Résumer mes cours",
    free: "5 crédits/résumé",
    freeIncluded: true,
    premium: "5 crédits/résumé",
    premiumPlus: "5 crédits/résumé",
  },
  {
    label: "Générer une épreuve",
    free: "10 crédits/épreuve",
    freeIncluded: true,
    premium: "10 crédits/épreuve",
    premiumPlus: "10 crédits/épreuve",
  },
  {
    label: "Corriger une épreuve",
    free: "10 crédits/copie",
    freeIncluded: true,
    premium: "10 crédits/copie",
    premiumPlus: "10 crédits/copie",
  },
  {
    label: "Assistance IA",
    free: "1 crédit/question",
    freeIncluded: true,
    premium: "1 crédit/question",
    premiumPlus: "1 crédit/question",
  },
  {
    label: "Import et analyse des documents",
    free: "Incluse",
    freeIncluded: true,
    premium: "Incluse",
    premiumPlus: "Incluse",
  },
  {
    label: "Historique complet",
    free: "Incluse",
    freeIncluded: true,
    premium: "Incluse",
    premiumPlus: "Incluse",
  },
  {
    label: "Renouvellement des crédits",
    free: "Non disponible",
    freeIncluded: false,
    premium: "500 crédits chaque mois",
    premiumPlus: "1 000 crédits chaque mois",
  },
];
