import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data/user";
import { getCreditWallet, getUsageSummary } from "@/lib/data/credits";
import { getDictionary } from "@/lib/i18n/server";

/**
 * Portefeuille de crédits + résumé d'utilisation de l'utilisateur connecté —
 * pour l'affichage (dashboard, page Premium). Lecture seule : la déduction
 * réelle se fait exclusivement dans les 4 routes IA (`consumeCredits`).
 */
export async function GET() {
  const [user, dict] = await Promise.all([getCurrentUser(), getDictionary()]);

  if (!user) {
    return NextResponse.json({ error: dict.ai.notSignedIn }, { status: 401 });
  }

  const [wallet, usageSummary] = await Promise.all([
    getCreditWallet(user.id),
    getUsageSummary(user.id),
  ]);

  return NextResponse.json({ wallet, plan: user.plan, usageSummary });
}
