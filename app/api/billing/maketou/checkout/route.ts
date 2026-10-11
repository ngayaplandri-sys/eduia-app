import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data/user";
import { startMaketouCheckout } from "@/lib/data/maketou";
import { isSameOriginRequest } from "@/lib/http/guards";

/**
 * « Payer avec Maketou » : crée le panier pour une offre du catalogue
 * (`{ itemKey }`) et renvoie l'URL de la page de paiement hébergée par
 * Maketou. Le prix et l'offre sont résolus côté serveur ; le paiement est
 * enregistré avant de renvoyer l'URL. Réponses d'erreur : `{ code }` stable,
 * détails dans les journaux serveur uniquement.
 */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ code: "FORBIDDEN" }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: "NOT_SIGNED_IN" }, { status: 401 });

  let itemKey = "";
  try {
    const body = (await request.json()) as { itemKey?: unknown };
    itemKey = typeof body?.itemKey === "string" ? body.itemKey : "";
  } catch {
    itemKey = "";
  }
  if (!itemKey) return NextResponse.json({ code: "UNKNOWN_ITEM" }, { status: 400 });

  try {
    const outcome = await startMaketouCheckout(user, itemKey);
    if (!outcome.ok) {
      return NextResponse.json({ code: outcome.code }, { status: outcome.status });
    }
    return NextResponse.json({ url: outcome.url, cartId: outcome.cartId });
  } catch (error) {
    console.error("[maketou] checkout : erreur inattendue", { message: (error as Error)?.message });
    return NextResponse.json({ code: "MAKETOU_CHECKOUT_FAILED" }, { status: 500 });
  }
}
