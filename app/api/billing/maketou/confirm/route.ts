import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data/user";
import { confirmMaketouCheckout } from "@/lib/data/maketou";
import { isSameOriginRequest } from "@/lib/http/guards";

/**
 * Confirmation d'un paiement, appelée en boucle par la page de retour
 * (`{ cartId? }`, sinon le dernier paiement de l'acheteur). Interroge Maketou
 * côté serveur — jamais depuis le navigateur — et accorde l'achat une seule
 * fois quand le panier est `completed`.
 */
export const maxDuration = 30;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ code: "FORBIDDEN" }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: "NOT_SIGNED_IN" }, { status: 401 });

  let cartId: string | null = null;
  try {
    const body = (await request.json()) as { cartId?: unknown };
    cartId = typeof body?.cartId === "string" ? body.cartId : null;
  } catch {
    cartId = null;
  }

  try {
    const result = await confirmMaketouCheckout(user.id, cartId);
    return NextResponse.json(result.body, {
      status: result.httpStatus,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[maketou] confirmation : erreur inattendue", { message: (error as Error)?.message });
    return NextResponse.json({ code: "MAKETOU_CONFIRM_FAILED" }, { status: 502 });
  }
}
