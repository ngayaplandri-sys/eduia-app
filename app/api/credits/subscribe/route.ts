import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data/user";
import { applyPlanSubscription } from "@/lib/data/credits";
import { isSubscriptionPlanId } from "@/lib/config/credits";
import { getDictionary } from "@/lib/i18n/server";

/**
 * Abonnement (ou changement de palier) Premium/Premium+ — paiement **simulé**
 * (validation immédiate, aucun encaissement réel, voir `applyPlanSubscription`
 * dans `lib/data/credits.ts`). Toujours un solde de crédits plein neuf au
 * nouveau palier, sans proratisation (décision produit assumée pour ce
 * système simulé).
 */
export async function POST(request: Request) {
  const [user, dict] = await Promise.all([getCurrentUser(), getDictionary()]);

  if (!user) {
    return NextResponse.json({ error: dict.ai.notSignedIn }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: dict.ai.invalidRequest }, { status: 400 });
  }

  const plan =
    payload && typeof payload === "object" && "plan" in payload
      ? String((payload as { plan: unknown }).plan)
      : "";

  if (!isSubscriptionPlanId(plan)) {
    return NextResponse.json({ error: dict.ai.invalidRequest }, { status: 400 });
  }

  const wallet = await applyPlanSubscription(user.id, plan);
  return NextResponse.json({ wallet, plan });
}
