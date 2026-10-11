/**
 * Moyens de paiement réellement proposés par la page de paiement Maketou de
 * la boutique EduIA (confirmés par le propriétaire) — affichés sur la landing
 * (bloc « Paiement ») et la page Premium. Ne pas ajouter un moyen que la page
 * Maketou ne propose pas réellement.
 *
 * Affichés en pastilles texte + icône génériques (pas de logos de marque).
 */
export interface PaymentMethod {
  id: string;
  kind: "mobile" | "card";
  /** Nom de marque, identique dans toutes les langues ; `null` = libellé traduit (carte). */
  name: string | null;
}

export const paymentMethods: PaymentMethod[] = [
  { id: "orange_money", kind: "mobile", name: "Orange Money" },
  { id: "mtn_momo", kind: "mobile", name: "MTN Mobile Money" },
  { id: "card", kind: "card", name: null },
];
