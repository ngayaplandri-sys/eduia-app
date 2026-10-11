import { CircleCheck, Info } from "lucide-react";
import { purchasableItemKeys } from "@/lib/maketou/config";

/**
 * Bandeau d'état des paiements (espace admin). Les commandes (`credit_orders`)
 * ne sont écrites qu'une fois le paiement confirmé par une lecture serveur du
 * panier Maketou (`completed`). Les commandes `simulated` sont antérieures au
 * branchement de Maketou : aucun argent n'a été encaissé pour elles.
 */
export function PaymentNotice({ className }: { className?: string }) {
  const connected = purchasableItemKeys({ isAdmin: false }).length > 0;

  if (!connected) {
    return (
      <div
        className={`flex items-start gap-3 rounded-xl border border-warning-200 bg-warning-50 p-4 text-fine leading-relaxed text-warning-700 ${className ?? ""}`}
      >
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          <span className="font-semibold">Paiement Maketou non configuré.</span>{" "}
          Les boutons « Payer avec Maketou » restent désactivés tant que la clé
          API, l&apos;adresse publique et au moins un produit ne sont pas
          renseignés (voir <code>docs/PAIEMENT-MAKETOU.md</code>). Les
          commandes <code>simulated</code> plus anciennes n&apos;ont rien
          encaissé.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border border-success-200 bg-success-50 p-4 text-fine leading-relaxed text-success-700 ${className ?? ""}`}
    >
      <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>
        <span className="font-semibold">Paiements Maketou actifs.</span>{" "}
        Chaque commande <code>maketou</code> a été confirmée par Maketou
        (panier payé) avant d&apos;accorder les crédits ; sa référence est
        l&apos;identifiant du panier. Maketou prélève 5 % de frais sur les
        paniers créés via l&apos;API. Les commandes <code>simulated</code> sont
        antérieures et n&apos;ont rien encaissé.
      </p>
    </div>
  );
}
