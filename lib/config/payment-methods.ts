/**
 * Moyens de paiement réellement acceptés, affichés sur la landing (bloc
 * « Paiement »).
 *
 * VIDE VOLONTAIREMENT : aucun fournisseur de paiement n'est encore branché
 * (les abonnements et recharges passent par un paiement simulé, voir
 * `lib/data/credits.ts`). La landing n'affiche donc aucun logo de paiement.
 * Quand un vrai fournisseur sera connecté (Mobile Money, carte…), ajoute ici
 * chaque moyen réellement accepté avec son logo officiel (fichier sous
 * `public/payments/`) : la rangée de logos apparaît automatiquement.
 */
export interface PaymentMethod {
  id: string;
  /** Nom affiché et texte alternatif du logo (« Orange Money »…). */
  label: string;
  /** Logo officiel, chemin sous `public/` (SVG ou PNG transparent). */
  logo: string;
}

export const paymentMethods: PaymentMethod[] = [];
