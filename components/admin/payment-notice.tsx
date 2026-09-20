import { Info } from "lucide-react";

/**
 * Bandeau rappelant que le paiement est SIMULÉ : les abonnements/recharges
 * fonctionnent réellement de bout en bout (crédits ajoutés, commandes
 * enregistrées dans `credit_orders`), mais aucun fournisseur de paiement réel
 * n'encaisse d'argent — validation immédiate, sans transaction bancaire.
 */
export function PaymentNotice({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border border-info-200 bg-info-50 p-4 text-fine leading-relaxed text-info-700 ${className ?? ""}`}
    >
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>
        <span className="font-semibold">Paiement simulé.</span>{" "}
        Les abonnements et recharges fonctionnent réellement (crédits ajoutés,
        commandes enregistrées dans <code>credit_orders</code>), mais aucun
        fournisseur de paiement réel n&apos;est branché — validation
        immédiate, sans encaissement. Les montants affichés reflètent ces
        commandes simulées, pas de revenu réellement perçu. La structure est
        prête à recevoir un vrai webhook de paiement sans changement de
        schéma.
      </p>
    </div>
  );
}
