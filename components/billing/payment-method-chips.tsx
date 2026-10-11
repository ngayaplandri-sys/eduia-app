import { CreditCard, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { paymentMethods } from "@/lib/config/payment-methods";

/**
 * Pastilles des moyens de paiement acceptés (via Maketou). Composant sans
 * état, utilisable côté serveur comme côté client.
 */
export function PaymentMethodChips({
  cardLabel,
  tone = "light",
  className,
}: {
  /** Libellé traduit de la carte bancaire. */
  cardLabel: string;
  /** `dark` : sur fond sombre (bloc paiement de la landing). */
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-2", className)}>
      {paymentMethods.map((method) => {
        const Icon = method.kind === "card" ? CreditCard : Smartphone;
        return (
          <li
            key={method.id}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-fine font-semibold",
              tone === "dark"
                ? "bg-white/10 text-white/90 ring-1 ring-white/15"
                : "bg-canvas text-ink-700 ring-1 ring-line",
            )}
          >
            <Icon
              className={cn("size-3.5", tone === "dark" ? "text-[#cbb6f3]" : "text-primary-600")}
              aria-hidden
            />
            {method.name ?? cardLabel}
          </li>
        );
      })}
    </ul>
  );
}
