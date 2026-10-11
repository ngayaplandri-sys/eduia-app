import type { Metadata } from "next";
import { MaketouReturn } from "@/components/billing/maketou-return";
import { getDictionary } from "@/lib/i18n/server";

/**
 * Retour depuis la page de paiement Maketou (`APP_URL/billing/maketou/return`,
 * l'id du panier est ajouté par Maketou). Accessible sans session (`proxy.ts`)
 * pour que le retour aboutisse toujours ; la confirmation, elle, exige d'être
 * connecté au compte qui a payé. Le repère `maketou-return` sert à la commande
 * de contrôle.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    title: dict.billing.returnMetaTitle,
    robots: { index: false, follow: false },
    other: { "maketou-return": "1" },
  };
}

export default function MaketouReturnPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <MaketouReturn />
    </main>
  );
}
